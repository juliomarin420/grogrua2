import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-n8n-signature',
};

// Shared secret para verificar webhooks de n8n
const N8N_SHARED_SECRET = Deno.env.get('N8N_SHARED_SECRET') || 'gogrua-n8n-secret-dev';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar firma del webhook (opcional pero recomendado)
    const signature = req.headers.get('x-n8n-signature');
    // En producción, verificar la firma aquí

    const body = await req.json();
    const { action, data } = body;

    console.log(`[n8n-webhook] Recibido action: ${action}`);

    switch (action) {
      case 'update_quote': {
        // n8n envía cotización calculada
        const { requestId, quoteMin, quoteMax, quoteFinal } = data;
        
        await supabase
          .from('services')
          .update({
            quote_min: quoteMin,
            quote_max: quoteMax,
            quote_final: quoteFinal,
            request_status: 'QUOTED',
          })
          .eq('id', requestId);

        await supabase.from('event_log').insert({
          request_id: requestId,
          event_type: 'QUOTE_RECEIVED',
          actor_type: 'system',
          payload: { quoteMin, quoteMax, quoteFinal }
        });

        return new Response(
          JSON.stringify({ success: true, action: 'quote_updated' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'assign_provider': {
        // n8n asigna proveedor
        const { requestId, providerId, driverId, etaMinutes } = data;

        // Crear dispatch
        const { data: dispatch, error } = await supabase
          .from('dispatch')
          .insert({
            request_id: requestId,
            provider_id: providerId,
            driver_id: driverId,
            eta_minutes: etaMinutes,
            status: 'ASSIGNED',
          })
          .select()
          .single();

        if (error) throw error;

        // Actualizar servicio
        await supabase
          .from('services')
          .update({
            request_status: 'DISPATCHING',
            provider_id: providerId,
            driver_id: driverId,
            eta_minutes: etaMinutes,
          })
          .eq('id', requestId);

        return new Response(
          JSON.stringify({ success: true, dispatchId: dispatch.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_dispatch_status': {
        // Actualizar estado del dispatch
        const { dispatchId, status, etaMinutes } = data;

        const updates: any = { status };
        
        if (status === 'EN_ROUTE') {
          // También actualizar el servicio
        } else if (status === 'ARRIVED') {
          updates.arrived_at = new Date().toISOString();
        } else if (status === 'COMPLETED') {
          updates.completed_at = new Date().toISOString();
        }

        if (etaMinutes !== undefined) {
          updates.eta_minutes = etaMinutes;
        }

        const { data: dispatch, error } = await supabase
          .from('dispatch')
          .update(updates)
          .eq('id', dispatchId)
          .select()
          .single();

        if (error) throw error;

        // Mapear estado de dispatch a servicio
        const statusMap: Record<string, string> = {
          'EN_ROUTE': 'EN_ROUTE',
          'ARRIVED': 'ARRIVED',
          'COMPLETED': 'COMPLETED',
        };

        if (statusMap[status]) {
          await supabase
            .from('services')
            .update({ 
              request_status: statusMap[status],
              eta_minutes: etaMinutes,
            })
            .eq('id', dispatch.request_id);
        }

        return new Response(
          JSON.stringify({ success: true, dispatch }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'escalate_no_provider': {
        // Escalar cuando no hay proveedores disponibles
        const { requestId, attempts, reason } = data;

        await supabase.from('event_log').insert({
          request_id: requestId,
          event_type: 'ESCALATION_NO_PROVIDER',
          actor_type: 'system',
          payload: { attempts, reason }
        });

        await supabase
          .from('services')
          .update({ request_status: 'DISPATCHING' }) // Mantener en dispatching
          .eq('id', requestId);

        return new Response(
          JSON.stringify({ success: true, escalated: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'log_communication': {
        // Registrar comunicación enviada
        const { requestId, channel, recipient, messageType, success } = data;

        await supabase.from('event_log').insert({
          request_id: requestId,
          event_type: 'COMMUNICATION_SENT',
          actor_type: 'system',
          payload: { channel, recipient, messageType, success }
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_available_providers': {
        // Obtener proveedores disponibles para asignación
        const { zone, vehicleType } = data;

        let query = supabase
          .from('providers')
          .select('*, drivers(*)')
          .eq('is_active', true)
          .eq('is_approved', true);

        if (zone) {
          query = query.eq('zone', zone);
        }

        const { data: providers, error } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, providers }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_service_details': {
        // Obtener detalles del servicio
        const { requestId } = data;

        const { data: service, error } = await supabase
          .from('services')
          .select('*, dispatch(*), transactions(*)')
          .eq('id', requestId)
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, service }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Acción no reconocida: ${action}`);
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[n8n-webhook] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
