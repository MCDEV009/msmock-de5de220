
-- Remove the overly permissive policy we just added
DROP POLICY IF EXISTS "Anyone can select via questions_public view" ON public.questions;

-- Drop the view entirely - we'll use an RPC function instead
DROP VIEW IF EXISTS public.questions_public;

-- Create a SECURITY DEFINER function that returns only non-sensitive question fields
CREATE OR REPLACE FUNCTION public.get_public_questions(p_test_id uuid)
RETURNS TABLE (
  id uuid,
  test_id uuid,
  question_text_uz text,
  question_text_ru text,
  question_text_en text,
  image_url text,
  question_type public.question_type,
  options jsonb,
  order_index integer,
  points numeric,
  max_points numeric,
  condition_a_uz text,
  condition_a_ru text,
  condition_b_uz text,
  condition_b_ru text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    q.id, q.test_id, q.question_text_uz, q.question_text_ru, q.question_text_en,
    q.image_url, q.question_type, q.options, q.order_index, q.points, q.max_points,
    q.condition_a_uz, q.condition_a_ru, q.condition_b_uz, q.condition_b_ru, q.created_at
  FROM public.questions q
  WHERE q.test_id = p_test_id
  ORDER BY q.order_index;
$$;
