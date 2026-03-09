
DROP VIEW IF EXISTS public.questions_public;

ALTER TABLE public.questions ALTER COLUMN points TYPE numeric USING points::numeric;
ALTER TABLE public.questions ALTER COLUMN max_points TYPE numeric USING max_points::numeric;
ALTER TABLE public.questions ALTER COLUMN points SET DEFAULT 1;
ALTER TABLE public.questions ALTER COLUMN max_points SET DEFAULT 1;

CREATE OR REPLACE VIEW public.questions_public AS
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
