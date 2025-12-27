-- Drop existing policies on profiles to recreate with stricter rules
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- Recreate with stricter, non-overlapping policies
-- Users can ONLY view their own profile (strict enforcement)
CREATE POLICY "Users can view own profile only"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all profiles (using security definer function)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can update ONLY their own profile
CREATE POLICY "Users can update own profile only"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only system (via trigger) can insert profiles - no direct user inserts
CREATE POLICY "System inserts profiles via trigger"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- No one can delete profiles except admins
CREATE POLICY "Only admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also strengthen emergency_contacts policies
DROP POLICY IF EXISTS "Users can manage own emergency contacts" ON public.emergency_contacts;
DROP POLICY IF EXISTS "Deny anonymous access to emergency_contacts" ON public.emergency_contacts;

CREATE POLICY "Users can view own emergency contacts"
ON public.emergency_contacts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emergency contacts"
ON public.emergency_contacts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emergency contacts"
ON public.emergency_contacts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own emergency contacts"
ON public.emergency_contacts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Strengthen transactions table - restrict provider/driver access to only their transactions
DROP POLICY IF EXISTS "Drivers can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Providers can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;

CREATE POLICY "Users view own transactions only"
ON public.transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Drivers view their assigned transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers view their transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  provider_id IN (
    SELECT id FROM providers WHERE user_id = auth.uid()
  )
);