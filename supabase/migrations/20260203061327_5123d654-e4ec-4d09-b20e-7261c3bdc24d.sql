-- Add question_type enum to support MCQ and written questions
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'written';

-- Add new columns to questions table for written questions
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS model_answer_uz TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS model_answer_ru TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS model_answer_en TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS rubric_uz TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS rubric_ru TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS max_points INTEGER DEFAULT 1;

-- Update the points column to support 0-2 for written questions
COMMENT ON COLUMN public.questions.max_points IS 'Maximum points for written questions (0-2 typically)';

-- Add columns to test_attempts for written answers and AI evaluation
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS written_answers JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS ai_evaluation JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS mcq_score INTEGER DEFAULT 0;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS written_score NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS evaluation_status TEXT DEFAULT 'pending';

COMMENT ON COLUMN public.test_attempts.written_answers IS 'Stores written answers as {questionId: {answer_a: string, answer_b: string}}';
COMMENT ON COLUMN public.test_attempts.ai_evaluation IS 'Stores AI evaluation as {questionId: {score: number, feedback: string}}';
COMMENT ON COLUMN public.test_attempts.evaluation_status IS 'pending, evaluating, completed';

-- Add enabled field to subjects for admin control
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;

-- Insert default Milliy Sertifikat subjects
INSERT INTO public.subjects (name_uz, name_ru, name_en, enabled) VALUES
  ('Matematika', 'Математика', 'Mathematics', true),
  ('Ona tili va adabiyot', 'Родной язык и литература', 'Uzbek Language and Literature', true),
  ('Ingliz tili', 'Английский язык', 'English', true),
  ('Tarix', 'История', 'History', true),
  ('Fizika', 'Физика', 'Physics', true)
ON CONFLICT DO NOTHING;

-- Create index for faster queries on test_attempts evaluation status
CREATE INDEX IF NOT EXISTS idx_test_attempts_evaluation_status ON public.test_attempts(evaluation_status);

-- Add test format field to tests table for Milliy Sertifikat specific format
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS test_format TEXT DEFAULT 'standard';
COMMENT ON COLUMN public.tests.test_format IS 'standard or milliy_sertifikat (45 questions: 35 MCQ + 10 written)';
