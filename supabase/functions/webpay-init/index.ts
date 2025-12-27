import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Webpay Plus Integration Environment (Test Credentials)
const WEBPAY_API_URL = "https://webpay3gintegration.transbank.cl";
const COMMERCE_CODE = "597055555532";
const API_KEY = "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C";

// Simulation mode for development (Edge Functions have DNS limitations)
const SIMULATION_MODE = true;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { serviceId, amount, returnUrl } = await req.json();

    if (!serviceId || !amount || !returnUrl) {
      throw new Error("Faltan parámetros requeridos: serviceId, amount, returnUrl");
    }

    console.log(`Iniciando transacción Webpay - Service: ${serviceId}, Amount: ${amount}`);

    // Generate unique buy order and session ID
    const buyOrder = `GO-${serviceId.substring(0, 8)}-${Date.now()}`.substring(0, 26);
    const sessionId = `SES-${Date.now()}`;

    // Simulation mode for development/testing
    if (SIMULATION_MODE) {
      console.log("Modo simulación activo - Generando transacción simulada");
      
      // Generate a simulated token
      const simulatedToken = `SIM-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Return simulated response that redirects to our confirmation page
      return new Response(
        JSON.stringify({
          success: true,
          token: simulatedToken,
          url: returnUrl, // Redirect directly to our result page
          buyOrder,
          sessionId,
          simulated: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Real Webpay integration (for production)
    const response = await fetch(`${WEBPAY_API_URL}/rswebpaytransaction/api/webpay/v1.2/transactions`, {
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error de Webpay:", errorText);
      throw new Error(`Error al crear transacción: ${response.status}`);
    }

    const data = await response.json();
    console.log("Transacción creada:", { token: data.token, url: data.url });

    return new Response(
      JSON.stringify({
        success: true,
        token: data.token,
        url: data.url,
        buyOrder,
        sessionId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error en webpay-init:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
