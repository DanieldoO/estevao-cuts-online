DROP POLICY IF EXISTS "Bookings are publicly readable" ON public.bookings;
REVOKE SELECT ON public.bookings FROM anon, authenticated;