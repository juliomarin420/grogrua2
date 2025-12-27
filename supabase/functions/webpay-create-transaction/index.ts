import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Webpay Plus Integration (Test Credentials)
const WEBPAY_API_URL = Deno.env.get('WEBPAY_ENV') === 'production' 
  ? "https://webpay3g.transbank.cl"
  : "https://webpay3gintegration.transbank.cl";

const COMMERCE_CODE = Deno.env.get('WEBPAY_COMMERCE_CODE') || "597055555532";
const API_KEY = Deno.env.get('WEBPAY_API_KEY') || "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C";

// Simulation mode for development
const SIMULATION_MODE = Deno.env.get('WEBPAY_ENV') !== 'production';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { requestId, returnUrl } = await req.json();

    if (!requestId || !returnUrl) {
      throw new Error("Faltan parámetros: requestId, returnUrl");
    }

    console.log(`[webpay-create] Iniciando para request: ${requestId}`);

    // Obtener servicio y validar estado
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', requestId)
      .single();

    if (serviceError || !service) {
      throw new Error(`Servicio no encontrado: ${serviceError?.message}`);
    }

    // Validar que el servicio esté en estado correcto para pago
    const validStatuses = ['NEW', 'QUOTED', 'PAYMENT_PENDING'];
    if (!validStatuses.includes(service.request_status || 'NEW')) {
      throw new Error(`Estado inválido para pago: ${service.request_status}`);
    }

    const amount = service.quote_final || service.estimated_price;
    if (!amount || amount <= 0) {
      throw new Error("Monto inválido para transacción");
    }

    // Generar identificadores únicos
    const buyOrder = `GO-${requestId.substring(0, 8)}-${Date.now()}`.substring(0, 26);
    const sessionId = `SES-${Date.now()}`;

    // Crear registro de pago
    const { data: payment, error: paymentError } = await supabase
      .from('transactions')
      .insert({
        service_id: requestId,
        user_id: service.user_id,
        amount: Math.round(amount),
        currency: 'CLP',
        payment_status: 'PENDING',
        status: 'pending',
        payment_method: 'webpay',
        transaction_ref: buyOrder,
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Error creando pago: ${paymentError.message}`);
    }

    // Actualizar estado del servicio
    await supabase
      .from('services')
      .update({ request_status: 'PAYMENT_PENDING' })
      .eq('id', requestId);

    // Log del evento
    await supabase.from('event_log').insert({
      request_id: requestId,
      payment_id: payment.id,
      event_type: 'PAYMENT_INITIATED',
      actor_type: 'system',
      payload: { amount, buyOrder, sessionId }
    });

    // Modo simulación para desarrollo
    if (SIMULATION_MODE) {
      console.log("[webpay-create] Modo simulación activo");
      
      const simulatedToken = `SIM-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      await supabase
        .from('transactions')
        .update({ webpay_token: simulatedToken })
        .eq('id', payment.id);

      return new Response(
        JSON.stringify({
          success: true,
          token: simulatedToken,
          url: `${returnUrl}?token_ws=${simulatedToken}&request_id=${requestId}`,
          buyOrder,
          sessionId,
          paymentId: payment.id,
          simulated: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Integración real con Webpay
    const webpayResponse = await fetch(
      `${WEBPAY_API_URL}/rswebpaytransaction/api/webpay/v1.2/transactions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Tbk-Api-Key-Id': COMMERCE_CODE,
          'Tbk-Api-Key-Secret': API_KEY,
        },
        body: JSON.stringify({
          buy_order: buyOrder,
          session_id: sessionId,
          amount: Math.round(amount),
          return_url: returnUrl,
        }),
      }
    );

    if (!webpayResponse.ok) {
      const errorText = await webpayResponse.text();
      console.error("[webpay-create] Error Webpay:", errorText);
      throw new Error(`Error Webpay: ${webpayResponse.status}`);
    }

    const webpayData = await webpayResponse.json();
    console.log("[webpay-create] Transacción creada:", { token: webpayData.token });

    // Guardar token de Webpay
    await supabase
      .from('transactions')
      .update({ webpay_token: webpayData.token })
      .eq('id', payment.id);

    return new Response(
      JSON.stringify({
        success: true,
        token: webpayData.token,
        url: `${webpayData.url}?token_ws=${webpayData.token}`,
        buyOrder,
        sessionId,
        paymentId: payment.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[webpay-create] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
