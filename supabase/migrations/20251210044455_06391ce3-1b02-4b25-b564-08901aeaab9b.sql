-- ============================================
-- GOGRÚA MONETIZATION & VALUE-ADDED SYSTEM
-- ============================================

-- 1. DYNAMIC PRICING SYSTEM
-- ============================================

-- Dynamic pricing coefficients table
CREATE TABLE public.pricing_coefficients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  coefficient_type TEXT NOT NULL CHECK (coefficient_type IN ('demand', 'distance', 'time', 'zone', 'vehicle')),
  base_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  min_multiplier NUMERIC NOT NULL DEFAULT 0.8,
  max_multiplier NUMERIC NOT NULL DEFAULT 3.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Time-based pricing rules (peak hours, weekends, holidays)
CREATE TABLE public.pricing_time_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  day_of_week INTEGER[], -- 0=Sunday, 6=Saturday
  start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour INTEGER NOT NULL CHECK (end_hour >= 0 AND end_hour <= 23),
  multiplier NUMERIC NOT NULL DEFAULT 1.0,
  is_holiday BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Zone-based pricing multipliers
CREATE TABLE public.pricing_zone_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE,
  multiplier NUMERIC NOT NULL DEFAULT 1.0,
  surge_threshold INTEGER DEFAULT 5, -- Number of active requests to trigger surge
  surge_multiplier NUMERIC NOT NULL DEFAULT 1.5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. PREMIUM ADD-ONS SYSTEM
-- ============================================

CREATE TYPE addon_category AS ENUM ('insurance', 'priority', 'operator', 'assistance', 'documentation');

CREATE TABLE public.service_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category addon_category NOT NULL,
  base_price NUMERIC NOT NULL,
  price_type TEXT NOT NULL CHECK (price_type IN ('fixed', 'percentage', 'per_km')),
  percentage_value NUMERIC, -- If price_type is percentage
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Selected addons per service
CREATE TABLE public.service_addon_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.service_addons(id),
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. SUBSCRIPTION PLANS
-- ============================================

CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise', 'constructor');

CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tier subscription_tier NOT NULL UNIQUE,
  description TEXT,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  annual_price NUMERIC,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_services_per_month INTEGER,
  commission_discount_percent NUMERIC DEFAULT 0,
  priority_support BOOLEAN DEFAULT false,
  advanced_analytics BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User/Provider subscriptions
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. REPUTATION & LOYALTY SYSTEM
-- ============================================

CREATE TABLE public.reputation_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  user_type TEXT NOT NULL CHECK (user_type IN ('client', 'driver', 'provider')),
  total_score NUMERIC NOT NULL DEFAULT 5.0,
  total_ratings INTEGER NOT NULL DEFAULT 0,
  total_services INTEGER NOT NULL DEFAULT 0,
  on_time_percentage NUMERIC DEFAULT 100,
  cancellation_rate NUMERIC DEFAULT 0,
  badges JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points_balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_redeemed INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'expire', 'bonus')),
  description TEXT,
  service_id UUID REFERENCES public.services(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. INSURANCE INTEGRATION
-- ============================================

CREATE TABLE public.insurance_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  api_endpoint TEXT,
  api_key_secret_name TEXT,
  commission_percent NUMERIC DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.insurance_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.insurance_partners(id),
  name TEXT NOT NULL,
  description TEXT,
  coverage_type TEXT NOT NULL,
  base_premium NUMERIC NOT NULL,
  coverage_limit NUMERIC NOT NULL,
  deductible NUMERIC DEFAULT 0,
  vehicle_types TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.service_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.insurance_policies(id),
  premium_paid NUMERIC NOT NULL,
  policy_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'claimed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. OPERATOR MARKETPLACE
-- ============================================

CREATE TABLE public.operator_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  expires_at DATE,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.operator_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES public.providers(id),
  vehicle_type TEXT NOT NULL,
  commission_percent NUMERIC NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. ANALYTICS & REPORTING
-- ============================================

CREATE TABLE public.analytics_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  zone_id UUID REFERENCES public.zones(id),
  total_requests INTEGER DEFAULT 0,
  completed_services INTEGER DEFAULT 0,
  cancelled_services INTEGER DEFAULT 0,
  avg_response_time_minutes NUMERIC,
  avg_price NUMERIC,
  total_revenue NUMERIC DEFAULT 0,
  demand_heatmap JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_analytics_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_level TEXT NOT NULL CHECK (access_level IN ('basic', 'advanced', 'enterprise')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- ENABLE RLS ON ALL NEW TABLES
-- ============================================

ALTER TABLE public.pricing_coefficients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_time_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_zone_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_addon_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics_access ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Pricing - Admin only for management, everyone can read active
CREATE POLICY "Anyone can view active pricing coefficients" ON public.pricing_coefficients FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage pricing coefficients" ON public.pricing_coefficients FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active time rules" ON public.pricing_time_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage time rules" ON public.pricing_time_rules FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active zone rules" ON public.pricing_zone_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage zone rules" ON public.pricing_zone_rules FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Addons
CREATE POLICY "Anyone can view active addons" ON public.service_addons FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage addons" ON public.service_addons FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own addon selections" ON public.service_addon_selections FOR SELECT 
  USING (service_id IN (SELECT id FROM services WHERE user_id = auth.uid()));
CREATE POLICY "Users can create addon selections" ON public.service_addon_selections FOR INSERT 
  WITH CHECK (service_id IN (SELECT id FROM services WHERE user_id = auth.uid()));

-- Subscriptions
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage plans" ON public.subscription_plans FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Reputation
CREATE POLICY "Anyone can view reputation scores" ON public.reputation_scores FOR SELECT USING (true);
CREATE POLICY "System can update reputation" ON public.reputation_scores FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Loyalty
CREATE POLICY "Users can view own loyalty points" ON public.loyalty_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage loyalty points" ON public.loyalty_points FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own loyalty transactions" ON public.loyalty_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create loyalty transactions" ON public.loyalty_transactions FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insurance
CREATE POLICY "Anyone can view active insurance partners" ON public.insurance_partners FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage insurance partners" ON public.insurance_partners FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active policies" ON public.insurance_policies FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage policies" ON public.insurance_policies FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own service insurance" ON public.service_insurance FOR SELECT 
  USING (service_id IN (SELECT id FROM services WHERE user_id = auth.uid()));
CREATE POLICY "Users can create service insurance" ON public.service_insurance FOR INSERT 
  WITH CHECK (service_id IN (SELECT id FROM services WHERE user_id = auth.uid()));

-- Operator Documents
CREATE POLICY "Providers can manage own documents" ON public.operator_documents FOR ALL 
  USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all documents" ON public.operator_documents FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Commissions
CREATE POLICY "Anyone can view active commissions" ON public.operator_commissions FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage commissions" ON public.operator_commissions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Analytics
CREATE POLICY "Users with access can view analytics" ON public.analytics_snapshots FOR SELECT 
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'dispatcher') OR
    EXISTS (SELECT 1 FROM user_analytics_access WHERE user_id = auth.uid() AND (expires_at IS NULL OR expires_at > now()))
  );
CREATE POLICY "Admins can manage analytics" ON public.analytics_snapshots FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own analytics access" ON public.user_analytics_access FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage analytics access" ON public.user_analytics_access FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_pricing_coefficients_updated_at BEFORE UPDATE ON public.pricing_coefficients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_addons_updated_at BEFORE UPDATE ON public.service_addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reputation_scores_updated_at BEFORE UPDATE ON public.reputation_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_points_updated_at BEFORE UPDATE ON public.loyalty_points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Default Pricing Coefficients
INSERT INTO public.pricing_coefficients (name, description, coefficient_type, base_multiplier, min_multiplier, max_multiplier) VALUES
  ('Demanda Alta', 'Multiplicador cuando hay alta demanda en la zona', 'demand', 1.0, 1.0, 2.5),
  ('Distancia Base', 'Costo por kilómetro recorrido', 'distance', 1.0, 0.8, 1.5),
  ('Horario Nocturno', 'Recargo por servicios nocturnos', 'time', 1.3, 1.0, 1.5),
  ('Zona Urbana', 'Tarifa para zona urbana central', 'zone', 1.0, 0.9, 1.2),
  ('Vehículo Pesado', 'Multiplicador para maquinaria pesada', 'vehicle', 1.5, 1.2, 2.0);

-- Default Time Rules
INSERT INTO public.pricing_time_rules (name, day_of_week, start_hour, end_hour, multiplier) VALUES
  ('Horario Nocturno', ARRAY[0,1,2,3,4,5,6], 22, 6, 1.3),
  ('Fin de Semana', ARRAY[0,6], 0, 23, 1.2),
  ('Hora Punta Mañana', ARRAY[1,2,3,4,5], 7, 9, 1.15),
  ('Hora Punta Tarde', ARRAY[1,2,3,4,5], 17, 20, 1.15);

-- Default Add-ons
INSERT INTO public.service_addons (name, description, category, base_price, price_type, icon) VALUES
  ('Seguro de Carga', 'Cobertura completa para tu vehículo durante el traslado', 'insurance', 15000, 'fixed', 'shield'),
  ('Traslado Prioritario', 'Asignación inmediata del conductor más cercano', 'priority', 10000, 'fixed', 'zap'),
  ('Operador Especializado', 'Conductor certificado para vehículos de lujo o maquinaria', 'operator', 25000, 'fixed', 'award'),
  ('Asistencia Nocturna 24/7', 'Soporte telefónico y seguimiento durante toda la noche', 'assistance', 8000, 'fixed', 'moon'),
  ('Reporte Fotográfico', 'Documentación visual del estado del vehículo', 'documentation', 5000, 'fixed', 'camera'),
  ('Seguro Premium', 'Cobertura total sin deducible', 'insurance', 5, 'percentage', 'shield-check');

-- Default Subscription Plans
INSERT INTO public.subscription_plans (name, tier, description, monthly_price, annual_price, features, max_services_per_month, commission_discount_percent, priority_support, advanced_analytics) VALUES
  ('Plan Gratuito', 'free', 'Acceso básico a la plataforma', 0, 0, '["Solicitud de servicios", "Tracking básico", "Historial 30 días"]', 5, 0, false, false),
  ('GoGrúa PRO', 'pro', 'Para usuarios frecuentes', 29990, 299900, '["Servicios ilimitados", "Tracking avanzado", "Historial completo", "Soporte prioritario", "Descuentos exclusivos"]', NULL, 5, true, false),
  ('Plan Empresa', 'enterprise', 'Para flotas y empresas', 149990, 1499900, '["Todo lo de PRO", "Analytics avanzados", "Centro de costos", "API access", "Account manager"]', NULL, 10, true, true),
  ('Plan Constructoras', 'constructor', 'Para constructoras y grandes operaciones', 299990, 2999900, '["Todo lo de Empresa", "Integración ERP", "Reportes personalizados", "SLA garantizado", "Facturación consolidada"]', NULL, 15, true, true);

-- Default Commission Structure
INSERT INTO public.operator_commissions (vehicle_type, commission_percent) VALUES
  ('car', 12),
  ('pickup', 12),
  ('truck_light', 10),
  ('truck_heavy', 8),
  ('machinery_light', 8),
  ('machinery_heavy', 6);