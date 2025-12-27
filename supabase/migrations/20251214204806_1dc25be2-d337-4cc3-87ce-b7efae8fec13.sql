-- =====================================================
-- GoGrúa Backend Migration - Adaptar esquema existente
-- =====================================================

-- 1. Crear enum para estados de servicio extendidos
DO $$ BEGIN
  CREATE TYPE public.request_status AS ENUM (
    'NEW', 'QUOTED', 'PAYMENT_PENDING', 'PAID', 
    'DISPATCHING', 'EN_ROUTE', 'ARRIVED', 
    'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'EXPIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM (
    'PENDING', 'PAID', 'REFUND_PENDING', 'REFUNDED', 'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.dispatch_status AS ENUM (
    'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Crear tabla dispatch (nueva)
CREATE TABLE IF NOT EXISTS public.dispatch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.providers(id),
  driver_id uuid REFERENCES public.drivers(id),
  status text NOT NULL DEFAULT 'ASSIGNED',
  eta_minutes integer,
  assigned_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Crear tabla event_log para trazabilidad
CREATE TABLE IF NOT EXISTS public.event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  dispatch_id uuid REFERENCES public.dispatch(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  actor_id uuid,
  actor_type text, -- 'customer', 'provider', 'driver', 'admin', 'system'
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 4. Crear tabla n8n_webhook_config para configuración de webhooks
CREATE TABLE IF NOT EXISTS public.n8n_webhook_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_name text UNIQUE NOT NULL,
  webhook_url text NOT NULL,
  is_active boolean DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Agregar columnas faltantes a services para compatibilidad con service_request
ALTER TABLE public.services 
  ADD COLUMN IF NOT EXISTS quote_min numeric,
  ADD COLUMN IF NOT EXISTS quote_max numeric,
  ADD COLUMN IF NOT EXISTS quote_final numeric,
  ADD COLUMN IF NOT EXISTS request_status text DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS issue_type text,
  ADD COLUMN IF NOT EXISTS pickup_lat numeric,
  ADD COLUMN IF NOT EXISTS pickup_lng numeric,
  ADD COLUMN IF NOT EXISTS dropoff_lat numeric,
  ADD COLUMN IF NOT EXISTS dropoff_lng numeric;

-- 6. Agregar columnas faltantes a transactions para compatibilidad con payment
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS webpay_tx_id text,
  ADD COLUMN IF NOT EXISTS webpay_token text,
  ADD COLUMN IF NOT EXISTS refund_amount numeric,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'PENDING';

-- 7. Agregar columnas a providers para tracking de ubicación
ALTER TABLE public.providers 
  ADD COLUMN IF NOT EXISTS last_lat numeric,
  ADD COLUMN IF NOT EXISTS last_lng numeric,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS zone text,
  ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 5.0;

-- 8. Índices para optimización
CREATE INDEX IF NOT EXISTS idx_dispatch_request_id ON public.dispatch(request_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_provider_id ON public.dispatch(provider_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_status ON public.dispatch(status);
CREATE INDEX IF NOT EXISTS idx_event_log_request_id ON public.event_log(request_id);
CREATE INDEX IF NOT EXISTS idx_event_log_type ON public.event_log(event_type);
CREATE INDEX IF NOT EXISTS idx_event_log_created_at ON public.event_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_request_status ON public.services(request_status);
CREATE INDEX IF NOT EXISTS idx_providers_zone_active ON public.providers(zone, is_active);

-- 9. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 10. Triggers para updated_at
DROP TRIGGER IF EXISTS update_dispatch_updated_at ON public.dispatch;
CREATE TRIGGER update_dispatch_updated_at
  BEFORE UPDATE ON public.dispatch
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_n8n_webhook_config_updated_at ON public.n8n_webhook_config;
CREATE TRIGGER update_n8n_webhook_config_updated_at
  BEFORE UPDATE ON public.n8n_webhook_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Función para registrar eventos automáticamente
CREATE OR REPLACE FUNCTION public.log_service_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.event_log (request_id, event_type, actor_type, payload)
    VALUES (NEW.id, 'SERVICE_CREATED', 'system', jsonb_build_object(
      'status', NEW.status,
      'request_status', NEW.request_status,
      'origin', NEW.origin_address,
      'destination', NEW.destination_address
    ));
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.request_status IS DISTINCT FROM NEW.request_status THEN
      INSERT INTO public.event_log (request_id, event_type, actor_type, payload)
      VALUES (NEW.id, 'STATUS_CHANGED', 'system', jsonb_build_object(
        'old_status', OLD.request_status,
        'new_status', NEW.request_status
      ));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS log_service_changes ON public.services;
CREATE TRIGGER log_service_changes
  AFTER INSERT OR UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.log_service_event();

-- 12. Función para registrar eventos de dispatch
CREATE OR REPLACE FUNCTION public.log_dispatch_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.event_log (request_id, dispatch_id, event_type, actor_type, payload)
    VALUES (NEW.request_id, NEW.id, 'DISPATCH_CREATED', 'system', jsonb_build_object(
      'provider_id', NEW.provider_id,
      'driver_id', NEW.driver_id,
      'status', NEW.status
    ));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.event_log (request_id, dispatch_id, event_type, actor_type, payload)
      VALUES (NEW.request_id, NEW.id, 'DISPATCH_STATUS_CHANGED', 'system', jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'eta_minutes', NEW.eta_minutes
      ));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS log_dispatch_changes ON public.dispatch;
CREATE TRIGGER log_dispatch_changes
  AFTER INSERT OR UPDATE ON public.dispatch
  FOR EACH ROW
  EXECUTE FUNCTION public.log_dispatch_event();

-- 13. Función para registrar eventos de pago
CREATE OR REPLACE FUNCTION public.log_payment_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.event_log (request_id, payment_id, event_type, actor_type, payload)
    VALUES (NEW.service_id, NEW.id, 'PAYMENT_CREATED', 'system', jsonb_build_object(
      'amount', NEW.amount,
      'status', NEW.payment_status
    ));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
      INSERT INTO public.event_log (request_id, payment_id, event_type, actor_type, payload)
      VALUES (NEW.service_id, NEW.id, 'PAYMENT_STATUS_CHANGED', 'system', jsonb_build_object(
        'old_status', OLD.payment_status,
        'new_status', NEW.payment_status,
        'amount', NEW.amount,
        'refund_amount', NEW.refund_amount
      ));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS log_payment_changes ON public.transactions;
CREATE TRIGGER log_payment_changes
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_payment_event();

-- 14. Habilitar RLS en nuevas tablas
ALTER TABLE public.dispatch ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_webhook_config ENABLE ROW LEVEL SECURITY;

-- 15. RLS Policies para dispatch
CREATE POLICY "Admins can manage all dispatches"
  ON public.dispatch FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Dispatchers can manage all dispatches"
  ON public.dispatch FOR ALL
  USING (has_role(auth.uid(), 'dispatcher'));

CREATE POLICY "Customers can view own dispatches"
  ON public.dispatch FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM public.services WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view and update assigned dispatches"
  ON public.dispatch FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update assigned dispatches"
  ON public.dispatch FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can view and update assigned dispatches"
  ON public.dispatch FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update assigned dispatches"
  ON public.dispatch FOR UPDATE
  USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

-- 16. RLS Policies para event_log
CREATE POLICY "Admins can view all events"
  ON public.event_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Dispatchers can view all events"
  ON public.event_log FOR SELECT
  USING (has_role(auth.uid(), 'dispatcher'));

CREATE POLICY "Customers can view own service events"
  ON public.event_log FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM public.services WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert events"
  ON public.event_log FOR INSERT
  WITH CHECK (true);

-- 17. RLS Policies para n8n_webhook_config (solo admin)
CREATE POLICY "Admins can manage webhook config"
  ON public.n8n_webhook_config FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- 18. Habilitar Realtime en tablas clave
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_log;