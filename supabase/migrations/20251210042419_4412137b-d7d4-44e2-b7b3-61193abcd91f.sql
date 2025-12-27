-- Crear enum para roles de usuario
CREATE TYPE public.app_role AS ENUM ('admin', 'dispatcher', 'provider', 'driver', 'user');

-- Crear enum para estados de servicio
CREATE TYPE public.service_status AS ENUM (
  'pending', 
  'assigned', 
  'en_route', 
  'at_origin', 
  'loading', 
  'in_transit', 
  'at_destination', 
  'completed', 
  'cancelled'
);

-- Crear enum para tipos de vehículo
CREATE TYPE public.vehicle_type AS ENUM (
  'car', 
  'pickup', 
  'truck_light', 
  'truck_heavy', 
  'machinery_light', 
  'machinery_heavy'
);

-- Crear enum para tipo de reserva
CREATE TYPE public.booking_type AS ENUM ('immediate', 'scheduled');

-- Tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  rut TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabla de roles de usuario (separada por seguridad)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Tabla de proveedores (empresas de grúa)
CREATE TABLE public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  company_rut TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabla de conductores
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  license_number TEXT,
  license_expiry DATE,
  is_approved BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT false,
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  rating DECIMAL(2, 1) DEFAULT 5.0,
  total_trips INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabla de vehículos de grúa
CREATE TABLE public.tow_trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  plate_number TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  year INTEGER,
  capacity_tons DECIMAL(5, 2),
  vehicle_type vehicle_type NOT NULL DEFAULT 'car',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabla de zonas
CREATE TABLE public.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  polygon JSONB, -- GeoJSON polygon
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabla de tarifas
CREATE TABLE public.rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  vehicle_type vehicle_type NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL,
  price_per_km DECIMAL(10, 2) DEFAULT 0,
  price_per_minute DECIMAL(10, 2) DEFAULT 0,
  minimum_price DECIMAL(10, 2),
  currency TEXT DEFAULT 'CLP',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabla de servicios/reservas
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  tow_truck_id UUID REFERENCES public.tow_trucks(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  
  -- Tipo de reserva
  booking_type booking_type NOT NULL DEFAULT 'immediate',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  
  -- Información del vehículo a remolcar
  client_vehicle_type vehicle_type NOT NULL,
  client_vehicle_brand TEXT,
  client_vehicle_model TEXT,
  client_vehicle_plate TEXT,
  client_vehicle_color TEXT,
  
  -- Ubicaciones
  origin_address TEXT NOT NULL,
  origin_lat DECIMAL(10, 8),
  origin_lng DECIMAL(11, 8),
  destination_address TEXT NOT NULL,
  destination_lat DECIMAL(10, 8),
  destination_lng DECIMAL(11, 8),
  
  -- Detalles
  description TEXT,
  distance_km DECIMAL(10, 2),
  estimated_duration_minutes INTEGER,
  
  -- Precios
  estimated_price DECIMAL(10, 2),
  final_price DECIMAL(10, 2),
  currency TEXT DEFAULT 'CLP',
  
  -- Estado y tiempos
  status service_status NOT NULL DEFAULT 'pending',
  eta_minutes INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  
  -- Contacto
  client_name TEXT,
  client_phone TEXT,
  
  -- Calificación
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  rating_comment TEXT,
  driver_tip DECIMAL(10, 2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabla de historial de estados
CREATE TABLE public.service_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  status service_status NOT NULL,
  notes TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabla de códigos promocionales
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
  discount_value DECIMAL(10, 2) NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  min_order_value DECIMAL(10, 2),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabla de contactos de emergencia
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabla de conductores favoritos
CREATE TABLE public.favorite_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, driver_id)
);

-- Tabla de transacciones/pagos
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'CLP',
  payment_method TEXT,
  status TEXT DEFAULT 'pending',
  transaction_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Función para verificar roles (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Función para obtener el rol del usuario
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Trigger para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  -- Asignar rol por defecto
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rates_updated_at BEFORE UPDATE ON public.rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tow_trucks_updated_at BEFORE UPDATE ON public.tow_trucks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tow_trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para user_roles (solo lectura para el usuario, admin puede todo)
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para providers
CREATE POLICY "Providers can view own data" ON public.providers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Providers can update own data" ON public.providers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert provider application" ON public.providers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all providers" ON public.providers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para drivers
CREATE POLICY "Drivers can view own data" ON public.drivers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Drivers can update own data" ON public.drivers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert driver application" ON public.drivers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all drivers" ON public.drivers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Dispatchers can view all drivers" ON public.drivers
  FOR SELECT USING (public.has_role(auth.uid(), 'dispatcher'));

-- Políticas RLS para tow_trucks (visible para usuarios autenticados)
CREATE POLICY "Authenticated users can view tow trucks" ON public.tow_trucks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Providers can manage own trucks" ON public.tow_trucks
  FOR ALL USING (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all trucks" ON public.tow_trucks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para zones (públicas para lectura)
CREATE POLICY "Anyone can view active zones" ON public.zones
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage zones" ON public.zones
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para rates (públicas para lectura)
CREATE POLICY "Anyone can view active rates" ON public.rates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage rates" ON public.rates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para services
CREATE POLICY "Users can view own services" ON public.services
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create services" ON public.services
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own services" ON public.services
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Drivers can view assigned services" ON public.services
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "Drivers can update assigned services" ON public.services
  FOR UPDATE USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "Providers can view their services" ON public.services
  FOR SELECT USING (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all services" ON public.services
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Dispatchers can manage all services" ON public.services
  FOR ALL USING (public.has_role(auth.uid(), 'dispatcher'));

-- Políticas RLS para service_status_history
CREATE POLICY "Users can view own service history" ON public.service_status_history
  FOR SELECT USING (
    service_id IN (SELECT id FROM public.services WHERE user_id = auth.uid())
  );

CREATE POLICY "Drivers can manage service history" ON public.service_status_history
  FOR ALL USING (
    service_id IN (
      SELECT s.id FROM public.services s
      JOIN public.drivers d ON s.driver_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all history" ON public.service_status_history
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para promo_codes (públicas para lectura de activos)
CREATE POLICY "Anyone can view active promo codes" ON public.promo_codes
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para emergency_contacts
CREATE POLICY "Users can manage own emergency contacts" ON public.emergency_contacts
  FOR ALL USING (auth.uid() = user_id);

-- Políticas RLS para favorite_drivers
CREATE POLICY "Users can manage own favorites" ON public.favorite_drivers
  FOR ALL USING (auth.uid() = user_id);

-- Políticas RLS para transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Drivers can view own transactions" ON public.transactions
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "Providers can view own transactions" ON public.transactions
  FOR SELECT USING (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all transactions" ON public.transactions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Habilitar realtime para services
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;

-- Insertar tarifas base por defecto
INSERT INTO public.rates (vehicle_type, base_price, price_per_km, minimum_price, currency) VALUES
  ('car', 35000, 1500, 35000, 'CLP'),
  ('pickup', 45000, 1800, 45000, 'CLP'),
  ('truck_light', 85000, 2500, 85000, 'CLP'),
  ('truck_heavy', 150000, 3500, 150000, 'CLP'),
  ('machinery_light', 120000, 3000, 120000, 'CLP'),
  ('machinery_heavy', 250000, 5000, 250000, 'CLP');