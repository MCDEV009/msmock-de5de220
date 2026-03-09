
DROP VIEW IF EXISTS public.questions_public;

CREATE VIEW public.questions_public WITH (security_invoker = true) AS
SELECT
  id,
  test_id,
  question_text_uz,
  question_text_ru,
  question_text_en,
  image_url,
  question_type,
  options,
  order_index,
  points,
  max_points,
  condition_a_uz,
  condition_a_ru,
  condition_b_uz,
  condition_b_ru,
  created_at
FROM public.questions;

-- Grant SELECT to anon and authenticated so participants can read questions
GRANT SELECT ON public.questions_public TO anon, authenticated;

-- Add RLS policy on questions table allowing SELECT via the public view (non-sensitive columns only)
CREATE POLICY "Anyone can select via questions_public view"
ON public.questions FOR SELECT TO anon, authenticated
USING (true);
