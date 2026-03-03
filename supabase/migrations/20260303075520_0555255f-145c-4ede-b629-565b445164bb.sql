
-- 1. Create public view for questions excluding sensitive answer data
CREATE VIEW public.questions_public AS
SELECT id, test_id, question_type, options, points, order_index,
  created_at, max_points, question_text_uz, question_text_ru,
  question_text_en, image_url
FROM public.questions;

-- Grant access to the view for anon and authenticated users
GRANT SELECT ON public.questions_public TO anon, authenticated;

-- 2. Restrict base questions table SELECT to admins only
DROP POLICY IF EXISTS "Questions viewable for accessible tests" ON public.questions;
CREATE POLICY "Only admins can view full questions"
ON public.questions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Restrict test_attempts UPDATE to in_progress attempts only
DROP POLICY IF EXISTS "Anyone can update their attempt" ON public.test_attempts;
CREATE POLICY "Only in-progress attempts can be updated"
ON public.test_attempts FOR UPDATE
USING (status = 'in_progress');
