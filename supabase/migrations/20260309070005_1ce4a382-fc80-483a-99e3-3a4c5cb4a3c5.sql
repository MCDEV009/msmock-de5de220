
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS points_a numeric DEFAULT 1.5;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS points_b numeric DEFAULT 1.7;
