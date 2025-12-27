import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { dispatchId, status, etaMinutes, lat, lng } = await req.json();

    if (!dispatchId || !status) {
      throw new Error("dispatchId y status son requeridos");
    }

    console.log(`[dispatch-status] Actualizando dispatch: ${dispatchId} -> ${status}`);

    // Validar estado
    const validStatuses = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Estado inválido: ${status}`);
    }

    // Obtener dispatch actual
    const { data: dispatch, error: dispatchError } = await supabase
      .from('dispatch')
      .select('*, services(*)')
      .eq('id', dispatchId)
      .single();

    if (dispatchError || !dispatch) {
      throw new Error(`Dispatch no encontrado: ${dispatchError?.message}`);
    }

    // Preparar actualizaciones
    const dispatchUpdates: any = { status };
    const serviceUpdates: any = {};

    switch (status) {
      case 'EN_ROUTE':
        serviceUpdates.request_status = 'EN_ROUTE';
        serviceUpdates.started_at = new Date().toISOString();
        if (etaMinutes) {
          dispatchUpdates.eta_minutes = etaMinutes;
          serviceUpdates.eta_minutes = etaMinutes;
        }
        break;
      
      case 'ARRIVED':
        dispatchUpdates.arrived_at = new Date().toISOString();
        serviceUpdates.request_status = 'ARRIVED';
        break;
      
      case 'COMPLETED':
        dispatchUpdates.completed_at = new Date().toISOString();
        serviceUpdates.request_status = 'COMPLETED';
        serviceUpdates.completed_at = new Date().toISOString();
        serviceUpdates.status = 'completed';
        break;
      
      case 'CANCELLED':
        dispatchUpdates.cancelled_at = new Date().toISOString();
        break;
    }

    // Actualizar dispatch
    await supabase
      .from('dispatch')
      .update(dispatchUpdates)
      .eq('id', dispatchId);

    // Actualizar servicio
    if (Object.keys(serviceUpdates).length > 0) {
      await supabase
        .from('services')
        .update(serviceUpdates)
        .eq('id', dispatch.request_id);
    }

    // Actualizar ubicación del conductor si se proporciona
    if (lat && lng && dispatch.driver_id) {
      await supabase
        .from('drivers')
        .update({
          current_lat: lat,
          current_lng: lng,
        })
        .eq('id', dispatch.driver_id);
    }

    // Log con ubicación
    await supabase.from('event_log').insert({
      request_id: dispatch.request_id,
      dispatch_id: dispatchId,
      event_type: `DISPATCH_${status}`,
      actor_type: 'driver',
      payload: { 
        status, 
        etaMinutes, 
        lat, 
        lng,
        previousStatus: dispatch.status 
      }
    });

    // Disparar webhook a n8n para notificaciones
    await triggerN8nWebhook(supabase, 'dispatch_status_updated', {
      requestId: dispatch.request_id,
      dispatchId,
      status,
      etaMinutes,
      customerPhone: dispatch.services?.client_phone,
      customerName: dispatch.services?.client_name,
    });

    return new Response(
      JSON.stringify({
        success: true,
        dispatchId,
        status,
        requestId: dispatch.request_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[dispatch-status] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function triggerN8nWebhook(supabase: any, webhookName: string, payload: any) {
  try {
    const { data: config } = await supabase
      .from('n8n_webhook_config')
      .select('webhook_url')
      .eq('webhook_name', webhookName)
      .eq('is_active', true)
      .single();

    if (config?.webhook_url) {
      console.log(`[n8n] Disparando webhook: ${webhookName}`);
      
      await fetch(config.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: webhookName,
          timestamp: new Date().toISOString(),
          ...payload
        }),
      });

      await supabase
        .from('n8n_webhook_config')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('webhook_name', webhookName);
    }
  } catch (error) {
    console.error(`[n8n] Error disparando webhook ${webhookName}:`, error);
  }
}
