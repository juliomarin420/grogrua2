-- Fix security: Add explicit policies to deny anonymous access to profiles
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Fix security: Add explicit policy to deny anonymous access to emergency_contacts  
CREATE POLICY "Deny anonymous access to emergency_contacts"
ON public.emergency_contacts
FOR ALL
USING (auth.uid() IS NOT NULL);