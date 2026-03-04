
-- Add condition fields for Milliy Sertifikat written question format (a-shart, b-shart)
ALTER TABLE public.questions
ADD COLUMN condition_a_uz text,
ADD COLUMN condition_a_ru text,
ADD COLUMN condition_b_uz text,
ADD COLUMN condition_b_ru text;

-- Update the public view to include new columns
DROP VIEW IF EXISTS public.questions_public;
CREATE VIEW public.questions_public AS
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
