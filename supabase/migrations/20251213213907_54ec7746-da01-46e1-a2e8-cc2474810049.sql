-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can create services" ON public.services;

-- Create new policy that allows both authenticated users and guests
CREATE POLICY "Anyone can create services"
ON public.services
FOR INSERT
WITH CHECK (
  -- Authenticated users must use their own user_id
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  -- Guests can create services with null user_id
  (auth.uid() IS NULL AND user_id IS NULL)
);