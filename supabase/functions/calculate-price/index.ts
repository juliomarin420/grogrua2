import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PriceCalculationRequest {
  vehicleType: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  scheduledAt?: string;
  addons?: string[];
}

interface PriceBreakdown {
  basePrice: number;
  distancePrice: number;
  distanceKm: number;
  timeMultiplier: number;
  demandMultiplier: number;
  zoneMultiplier: number;
  addonsTotal: number;
  addonsBreakdown: { name: string; price: number }[];
  subtotal: number;
  platformFee: number;
  total: number;
  estimatedDurationMinutes: number;
  surge: boolean;
  surgeMultiplier: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: PriceCalculationRequest = await req.json();
    const { vehicleType, originLat, originLng, destinationLat, destinationLng, scheduledAt, addons } = body;

    console.log("Calculating price for:", { vehicleType, originLat, originLng, destinationLat, destinationLng });

    // 1. Get base rate for vehicle type
    const { data: rateData } = await supabase
      .from("rates")
      .select("*")
      .eq("vehicle_type", vehicleType)
      .eq("is_active", true)
      .maybeSingle();

    const basePrice = rateData?.base_price || 35000;
    const pricePerKm = rateData?.price_per_km || 500;
    const minimumPrice = rateData?.minimum_price || 25000;

    // 2. Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (destinationLat - originLat) * Math.PI / 180;
    const dLon = (destinationLng - originLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(originLat * Math.PI / 180) * Math.cos(destinationLat * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = Math.max(R * c * 1.3, 1); // 1.3 factor for road distance approximation, min 1km

    const distancePrice = distanceKm * pricePerKm;

    // 3. Get time-based multiplier
    const now = scheduledAt ? new Date(scheduledAt) : new Date();
    const dayOfWeek = now.getDay();
    const currentHour = now.getHours();

    const { data: timeRules } = await supabase
      .from("pricing_time_rules")
      .select("*")
      .eq("is_active", true);

    let timeMultiplier = 1.0;
    for (const rule of timeRules || []) {
      const dayMatch = rule.day_of_week?.includes(dayOfWeek);
      const hourMatch = rule.start_hour <= rule.end_hour
        ? currentHour >= rule.start_hour && currentHour <= rule.end_hour
        : currentHour >= rule.start_hour || currentHour <= rule.end_hour;
      
      if (dayMatch && hourMatch) {
        timeMultiplier = Math.max(timeMultiplier, rule.multiplier);
      }
    }

    // 4. Check demand/surge pricing
    const { data: activeServices } = await supabase
      .from("services")
      .select("id")
      .eq("status", "pending")
      .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());

    const demandLevel = (activeServices?.length || 0);
    let demandMultiplier = 1.0;
    let surge = false;
    let surgeMultiplier = 1.0;

    if (demandLevel > 10) {
      surge = true;
      surgeMultiplier = Math.min(1.5, 1 + (demandLevel - 10) * 0.05);
      demandMultiplier = surgeMultiplier;
    }

    // 5. Zone multiplier (simplified - could use PostGIS for real zones)
    let zoneMultiplier = 1.0;
    // Central Santiago zone check (simplified)
    if (originLat > -33.5 && originLat < -33.4 && originLng > -70.7 && originLng < -70.6) {
      zoneMultiplier = 1.1;
    }

    // 6. Calculate add-ons
    let addonsTotal = 0;
    const addonsBreakdown: { name: string; price: number }[] = [];

    if (addons && addons.length > 0) {
      const { data: addonData } = await supabase
        .from("service_addons")
        .select("*")
        .in("id", addons)
        .eq("is_active", true);

      for (const addon of addonData || []) {
        let addonPrice = 0;
        if (addon.price_type === "fixed") {
          addonPrice = addon.base_price;
        } else if (addon.price_type === "percentage") {
          addonPrice = (basePrice + distancePrice) * (addon.base_price / 100);
        } else if (addon.price_type === "per_km") {
          addonPrice = distanceKm * addon.base_price;
        }
        addonsTotal += addonPrice;
        addonsBreakdown.push({ name: addon.name, price: Math.round(addonPrice) });
      }
    }

    // 7. Calculate final price
    const subtotal = (basePrice + distancePrice) * timeMultiplier * demandMultiplier * zoneMultiplier;
    const platformFee = Math.round(subtotal * 0.05); // 5% platform fee
    const total = Math.max(Math.round(subtotal + addonsTotal + platformFee), minimumPrice);

    // 8. Estimate duration (average 40 km/h in city)
    const estimatedDurationMinutes = Math.round((distanceKm / 40) * 60 + 15); // +15 min for loading

    const breakdown: PriceBreakdown = {
      basePrice: Math.round(basePrice),
      distancePrice: Math.round(distancePrice),
      distanceKm: Math.round(distanceKm * 10) / 10,
      timeMultiplier,
      demandMultiplier,
      zoneMultiplier,
      addonsTotal: Math.round(addonsTotal),
      addonsBreakdown,
      subtotal: Math.round(subtotal),
      platformFee,
      total,
      estimatedDurationMinutes,
      surge,
      surgeMultiplier,
    };

    console.log("Price calculated:", breakdown);

    return new Response(JSON.stringify(breakdown), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error calculating price:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
