DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
CREATE POLICY "Anyone can create bookings"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'confirmed'
  AND length(btrim(client_name)) BETWEEN 2 AND 100
  AND length(btrim(client_phone)) BETWEEN 5 AND 20
  AND booking_date >= CURRENT_DATE
  AND end_time > start_time
);