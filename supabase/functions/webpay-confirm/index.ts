import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Webpay Plus Integration Environment (Test Credentials)
const WEBPAY_API_URL = "https://webpay3gintegration.transbank.cl";
const COMMERCE_CODE = "597055555532";
const API_KEY = "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C";

// Simulation mode for development
const SIMULATION_MODE = true;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let token_ws: string | null = null;
    let serviceId: string | null = null;
    let amount: number | null = null;

    // Token can come from query params (GET) or body (POST)
    if (req.method === 'GET') {
      token_ws = url.searchParams.get('token_ws');
      serviceId = url.searchParams.get('serviceId');
      amount = url.searchParams.get('amount') ? parseInt(url.searchParams.get('amount')!) : null;
    } else {
      const body = await req.json().catch(() => ({}));
      token_ws = body.token_ws || url.searchParams.get('token_ws');
      serviceId = body.serviceId || url.searchParams.get('serviceId');
      amount = body.amount || (url.searchParams.get('amount') ? parseInt(url.searchParams.get('amount')!) : null);
    }

    if (!token_ws) {
      throw new Error("Token de transacción no proporcionado");
    }

    console.log(`Confirmando transacción Webpay - Token: ${token_ws}`);

    // Check if this is a simulated token
    const isSimulated = token_ws.startsWith('SIM-');

    if (SIMULATION_MODE || isSimulated) {
      console.log("Modo simulación - Confirmando pago simulado");
      
      // Simulate a successful payment
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Record simulated transaction if we have serviceId
      if (serviceId) {
        await supabase.from('transactions').insert({
          service_id: serviceId,
          amount: amount || 0,
          currency: 'CLP',
          status: 'completed',
          payment_method: 'webpay_simulated',
          transaction_ref: `AUTH-${Date.now()}`,
        });
        console.log(`Transacción simulada registrada para servicio: ${serviceId}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "AUTHORIZED",
          responseCode: 0,
          amount: amount || 0,
          buyOrder: `GO-SIM-${Date.now()}`,
          authorizationCode: `SIM${Math.floor(Math.random() * 1000000)}`,
          cardDetail: { card_number: "6623" },
          transactionDate: new Date().toISOString(),
          message: "Pago simulado aprobado",
          simulated: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Real Webpay confirmation (for production)
    const response = await fetch(`${WEBPAY_API_URL}/rswebpaytransaction/api/webpay/v1.2/transactions/${token_ws}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Tbk-Api-Key-Id': COMMERCE_CODE,
        'Tbk-Api-Key-Secret': API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error de confirmación Webpay:", errorText);
      throw new Error(`Error al confirmar transacción: ${response.status}`);
    }

    const data = await response.json();
    console.log("Respuesta de confirmación:", JSON.stringify(data));

    // Check transaction status
    const isApproved = data.response_code === 0 && data.status === "AUTHORIZED";
    
    if (isApproved) {
      // Extract service ID from buy_order (format: GO-{serviceId}-{timestamp})
      const buyOrderParts = data.buy_order.split('-');
      const serviceIdPrefix = buyOrderParts[1];

      // Update service payment status in database
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Find and update the service
      const { data: services, error: fetchError } = await supabase
        .from('services')
        .select('id')
        .ilike('id', `${serviceIdPrefix}%`)
        .limit(1);

      if (services && services.length > 0) {
        // Record transaction
        await supabase.from('transactions').insert({
          service_id: services[0].id,
          amount: data.amount,
          currency: 'CLP',
          status: 'completed',
          payment_method: 'webpay',
          transaction_ref: data.authorization_code,
        });

        console.log(`Transacción registrada para servicio: ${services[0].id}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: isApproved,
        status: data.status,
        responseCode: data.response_code,
        amount: data.amount,
        buyOrder: data.buy_order,
        authorizationCode: data.authorization_code,
        cardDetail: data.card_detail,
        transactionDate: data.transaction_date,
        message: isApproved ? "Pago aprobado" : "Pago rechazado",
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error en webpay-confirm:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
