import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBPAY_API_URL = Deno.env.get('WEBPAY_ENV') === 'production' 
  ? "https://webpay3g.transbank.cl"
  : "https://webpay3gintegration.transbank.cl";

const COMMERCE_CODE = Deno.env.get('WEBPAY_COMMERCE_CODE') || "597055555532";
const API_KEY = Deno.env.get('WEBPAY_API_KEY') || "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C";
const SIMULATION_MODE = Deno.env.get('WEBPAY_ENV') !== 'production';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { paymentId, refundAmount: requestedRefundAmount } = await req.json();

    if (!paymentId) {
      throw new Error("paymentId es requerido");
    }

    console.log(`[webpay-refund] Procesando reverso para pago: ${paymentId}`);

    // Obtener pago
    const { data: payment, error: paymentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error(`Pago no encontrado: ${paymentError?.message}`);
    }

    // Validar que el pago esté en estado correcto para reverso
    const validStatuses = ['PAID', 'REFUND_PENDING'];
    if (!validStatuses.includes(payment.payment_status)) {
      throw new Error(`Estado inválido para reverso: ${payment.payment_status}`);
    }

    const refundAmount = requestedRefundAmount || payment.refund_amount || payment.amount;

    if (refundAmount <= 0) {
      throw new Error("Monto de reverso inválido");
    }

    if (refundAmount > payment.amount) {
      throw new Error("Monto de reverso excede el monto original");
    }

    // Modo simulación
    if (SIMULATION_MODE || payment.webpay_tx_id?.startsWith('SIM-')) {
      console.log("[webpay-refund] Procesando reverso simulado");

      await supabase
        .from('transactions')
        .update({
          payment_status: 'REFUNDED',
          status: 'refunded',
          refund_amount: refundAmount,
          refunded_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      await supabase.from('event_log').insert({
        request_id: payment.service_id,
        payment_id: paymentId,
        event_type: 'REFUND_COMPLETED',
        actor_type: 'system',
        payload: {
          originalAmount: payment.amount,
          refundAmount,
          simulated: true,
        }
      });

      // Notificar a n8n
      await triggerN8nWebhook(supabase, 'refund_completed', {
        requestId: payment.service_id,
        paymentId,
        originalAmount: payment.amount,
        refundAmount,
      });

      return new Response(
        JSON.stringify({
          success: true,
          paymentId,
          refundAmount,
          status: 'REFUNDED',
          simulated: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reverso real con Webpay
    // Nota: Webpay Plus utiliza el endpoint de nullify/refund
    const token = payment.webpay_token;
    
    if (!token) {
      throw new Error("Token de transacción no disponible para reverso");
    }

    const refundResponse = await fetch(
      `${WEBPAY_API_URL}/rswebpaytransaction/api/webpay/v1.2/transactions/${token}/refunds`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Tbk-Api-Key-Id': COMMERCE_CODE,
          'Tbk-Api-Key-Secret': API_KEY,
        },
        body: JSON.stringify({
          amount: refundAmount,
        }),
      }
    );

    if (!refundResponse.ok) {
      const errorText = await refundResponse.text();
      console.error("[webpay-refund] Error Webpay:", errorText);
      
      await supabase.from('event_log').insert({
        request_id: payment.service_id,
        payment_id: paymentId,
        event_type: 'REFUND_FAILED',
        actor_type: 'system',
        payload: { error: errorText }
      });

      throw new Error(`Error en reverso Webpay: ${refundResponse.status}`);
    }

    const refundResult = await refundResponse.json();
    console.log("[webpay-refund] Resultado reverso:", refundResult);

    // Verificar resultado del reverso
    if (refundResult.type === 'NULLIFIED' || refundResult.type === 'REVERSED') {
      await supabase
        .from('transactions')
        .update({
          payment_status: 'REFUNDED',
          status: 'refunded',
          refund_amount: refundAmount,
          refunded_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      await supabase.from('event_log').insert({
        request_id: payment.service_id,
        payment_id: paymentId,
        event_type: 'REFUND_COMPLETED',
        actor_type: 'system',
        payload: {
          originalAmount: payment.amount,
          refundAmount,
          refundType: refundResult.type,
          authCode: refundResult.authorization_code,
        }
      });

      await triggerN8nWebhook(supabase, 'refund_completed', {
        requestId: payment.service_id,
        paymentId,
        originalAmount: payment.amount,
        refundAmount,
      });

      return new Response(
        JSON.stringify({
          success: true,
          paymentId,
          refundAmount,
          status: 'REFUNDED',
          refundType: refundResult.type,
          authCode: refundResult.authorization_code,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      await supabase.from('event_log').insert({
        request_id: payment.service_id,
        payment_id: paymentId,
        event_type: 'REFUND_REJECTED',
        actor_type: 'system',
        payload: refundResult
      });

      throw new Error(`Reverso rechazado: ${JSON.stringify(refundResult)}`);
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[webpay-refund] Error:", error);
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
