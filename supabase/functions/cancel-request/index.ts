import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuración de reversos según estado
const REFUND_RULES: Record<string, number> = {
  'NEW': 1.0,           // 100% reverso
  'QUOTED': 1.0,        // 100% reverso
  'PAYMENT_PENDING': 1.0, // 100% reverso
  'PAID': 1.0,          // 100% reverso (aún no asignado)
  'DISPATCHING': 1.0,   // 100% reverso
  'EN_ROUTE': 0.5,      // 50% reverso (configurable)
  'ARRIVED': 0,         // Sin reverso automático
  'IN_SERVICE': 0,      // Sin reverso automático
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { requestId, reason, cancelledBy } = await req.json();

    if (!requestId) {
      throw new Error("requestId es requerido");
    }

    console.log(`[cancel-request] Cancelando servicio: ${requestId}`);

    // Obtener servicio actual
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', requestId)
      .single();

    if (serviceError || !service) {
      throw new Error(`Servicio no encontrado: ${serviceError?.message}`);
    }

    const currentStatus = service.request_status || 'NEW';

    // Verificar si se puede cancelar
    const nonCancellableStatuses = ['COMPLETED', 'CANCELLED', 'EXPIRED'];
    if (nonCancellableStatuses.includes(currentStatus)) {
      throw new Error(`No se puede cancelar un servicio en estado: ${currentStatus}`);
    }

    // Calcular porcentaje de reverso
    const refundPercentage = REFUND_RULES[currentStatus] ?? 0;
    
    // Obtener pago asociado
    const { data: payment } = await supabase
      .from('transactions')
      .select('*')
      .eq('service_id', requestId)
      .eq('payment_status', 'PAID')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let refundInfo = null;

    if (payment && refundPercentage > 0) {
      const refundAmount = Math.round(payment.amount * refundPercentage);
      
      // Actualizar pago a REFUND_PENDING
      await supabase
        .from('transactions')
        .update({
          payment_status: 'REFUND_PENDING',
          refund_amount: refundAmount,
        })
        .eq('id', payment.id);

      refundInfo = {
        paymentId: payment.id,
        originalAmount: payment.amount,
        refundAmount,
        refundPercentage: refundPercentage * 100,
      };

      // Log del evento de reverso pendiente
      await supabase.from('event_log').insert({
        request_id: requestId,
        payment_id: payment.id,
        event_type: 'REFUND_PENDING',
        actor_type: cancelledBy || 'customer',
        payload: refundInfo
      });

      // Disparar webhook para procesar reverso
      await triggerN8nWebhook(supabase, 'refund_pending', {
        requestId,
        ...refundInfo,
        customerPhone: service.client_phone,
        customerName: service.client_name,
      });
    } else if (payment && refundPercentage === 0) {
      // Log que no hay reverso automático
      await supabase.from('event_log').insert({
        request_id: requestId,
        payment_id: payment.id,
        event_type: 'REFUND_NOT_APPLICABLE',
        actor_type: cancelledBy || 'customer',
        payload: { 
          reason: 'Estado avanzado del servicio',
          currentStatus,
          message: 'Reverso sujeto a revisión de soporte'
        }
      });
    }

    // Cancelar dispatch activo si existe
    const { data: dispatch } = await supabase
      .from('dispatch')
      .select('*')
      .eq('request_id', requestId)
      .neq('status', 'CANCELLED')
      .neq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (dispatch) {
      await supabase
        .from('dispatch')
        .update({
          status: 'CANCELLED',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
        })
        .eq('id', dispatch.id);
    }

    // Actualizar servicio a CANCELLED
    await supabase
      .from('services')
      .update({
        request_status: 'CANCELLED',
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    // Log del evento de cancelación
    await supabase.from('event_log').insert({
      request_id: requestId,
      event_type: 'SERVICE_CANCELLED',
      actor_type: cancelledBy || 'customer',
      payload: {
        reason,
        previousStatus: currentStatus,
        refundApplicable: refundPercentage > 0,
        refundInfo,
      }
    });

    // Notificar a n8n
    await triggerN8nWebhook(supabase, 'service_cancelled', {
      requestId,
      reason,
      cancelledBy,
      previousStatus: currentStatus,
      refundInfo,
      customerPhone: service.client_phone,
      customerName: service.client_name,
      providerNotify: dispatch ? true : false,
    });

    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        status: 'CANCELLED',
        previousStatus: currentStatus,
        refundInfo,
        message: refundPercentage > 0 
          ? `Cancelación procesada. Reverso del ${refundPercentage * 100}% en proceso.`
          : refundPercentage === 0 && payment
            ? 'Cancelación procesada. Reverso sujeto a revisión de soporte.'
            : 'Cancelación procesada.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[cancel-request] Error:", error);
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
