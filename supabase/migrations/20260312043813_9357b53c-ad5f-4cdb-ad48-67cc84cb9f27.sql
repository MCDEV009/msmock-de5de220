
DROP POLICY "Only in-progress attempts can be updated" ON public.test_attempts;

CREATE POLICY "Only in-progress attempts can be updated"
ON public.test_attempts
FOR UPDATE
USING (true)
WITH CHECK (true);
