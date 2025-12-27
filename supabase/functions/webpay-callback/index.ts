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

    const { token, requestId } = await req.json();

    if (!token) {
      throw new Error("Token no proporcionado");
    }

    console.log(`[webpay-callback] Procesando token: ${token}`);

    // Buscar pago por token
    const { data: payment, error: paymentError } = await supabase
      .from('transactions')
      .select('*, services(*)')
      .eq('webpay_token', token)
      .single();

    if (paymentError || !payment) {
      // Si no encontramos por token, buscar por request_id en modo simulación
      if (SIMULATION_MODE && requestId) {
        const { data: paymentByRequest } = await supabase
          .from('transactions')
          .select('*, services(*)')
          .eq('service_id', requestId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (paymentByRequest) {
          return await processPayment(supabase, paymentByRequest, token, true);
        }
      }
      throw new Error(`Pago no encontrado para token: ${token}`);
    }

    // Verificar si es token simulado
    const isSimulated = token.startsWith('SIM-') || SIMULATION_MODE;
    
    return await processPayment(supabase, payment, token, isSimulated);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[webpay-callback] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processPayment(supabase: any, payment: any, token: string, isSimulated: boolean) {
  const serviceId = payment.service_id;

  if (isSimulated) {
    console.log("[webpay-callback] Procesando pago simulado");
    
    // Actualizar pago como completado
    await supabase
      .from('transactions')
      .update({
        payment_status: 'PAID',
        status: 'completed',
        webpay_tx_id: `SIM-TX-${Date.now()}`,
      })
      .eq('id', payment.id);

    // Actualizar servicio
    await supabase
      .from('services')
      .update({ 
        request_status: 'PAID',
        status: 'pending' // Listo para despacho
      })
      .eq('id', serviceId);

    // Log del evento
    await supabase.from('event_log').insert({
      request_id: serviceId,
      payment_id: payment.id,
      event_type: 'PAYMENT_COMPLETED',
      actor_type: 'system',
      payload: { 
        amount: payment.amount, 
        simulated: true,
        token 
      }
    });

    // Disparar webhook a n8n si está configurado
    await triggerN8nWebhook(supabase, 'payment_completed', {
      requestId: serviceId,
      paymentId: payment.id,
      amount: payment.amount,
      customerPhone: payment.services?.client_phone,
      customerName: payment.services?.client_name,
    });

    return new Response(
      JSON.stringify({
        success: true,
        status: 'PAID',
        requestId: serviceId,
        paymentId: payment.id,
        amount: payment.amount,
        simulated: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Confirmar con Webpay real
  const confirmResponse = await fetch(
    `${WEBPAY_API_URL}/rswebpaytransaction/api/webpay/v1.2/transactions/${token}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Tbk-Api-Key-Id': COMMERCE_CODE,
        'Tbk-Api-Key-Secret': API_KEY,
      },
    }
  );

  if (!confirmResponse.ok) {
    const errorText = await confirmResponse.text();
    console.error("[webpay-callback] Error confirmación:", errorText);
    
    await supabase
      .from('transactions')
      .update({ payment_status: 'FAILED', status: 'failed' })
      .eq('id', payment.id);

    await supabase
      .from('services')
      .update({ request_status: 'PAYMENT_PENDING' })
      .eq('id', serviceId);

    await supabase.from('event_log').insert({
      request_id: serviceId,
      payment_id: payment.id,
      event_type: 'PAYMENT_FAILED',
      actor_type: 'system',
      payload: { error: errorText }
    });

    throw new Error(`Error confirmación Webpay: ${confirmResponse.status}`);
  }

  const webpayResult = await confirmResponse.json();
  console.log("[webpay-callback] Resultado Webpay:", webpayResult);

  if (webpayResult.response_code === 0) {
    // Pago exitoso
    await supabase
      .from('transactions')
      .update({
        payment_status: 'PAID',
        status: 'completed',
        webpay_tx_id: webpayResult.authorization_code,
      })
      .eq('id', payment.id);

    await supabase
      .from('services')
      .update({ 
        request_status: 'PAID',
        status: 'pending'
      })
      .eq('id', serviceId);

    await supabase.from('event_log').insert({
      request_id: serviceId,
      payment_id: payment.id,
      event_type: 'PAYMENT_COMPLETED',
      actor_type: 'system',
      payload: { 
        amount: payment.amount,
        authCode: webpayResult.authorization_code,
        cardNumber: webpayResult.card_detail?.card_number
      }
    });

    await triggerN8nWebhook(supabase, 'payment_completed', {
      requestId: serviceId,
      paymentId: payment.id,
      amount: payment.amount,
      customerPhone: payment.services?.client_phone,
      customerName: payment.services?.client_name,
    });

    return new Response(
      JSON.stringify({
        success: true,
        status: 'PAID',
        requestId: serviceId,
        paymentId: payment.id,
        amount: payment.amount,
        authCode: webpayResult.authorization_code,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } else {
    // Pago rechazado
    await supabase
      .from('transactions')
      .update({ payment_status: 'FAILED', status: 'failed' })
      .eq('id', payment.id);

    await supabase.from('event_log').insert({
      request_id: serviceId,
      payment_id: payment.id,
      event_type: 'PAYMENT_REJECTED',
      actor_type: 'system',
      payload: { responseCode: webpayResult.response_code }
    });

    return new Response(
      JSON.stringify({
        success: false,
        status: 'FAILED',
        requestId: serviceId,
        responseCode: webpayResult.response_code,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

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
