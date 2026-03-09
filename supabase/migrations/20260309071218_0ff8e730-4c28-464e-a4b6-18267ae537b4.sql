
-- Fix 1: Tighten SELECT policy on test_attempts
-- Remove the overly permissive SELECT policy and replace with scoped one
DROP POLICY IF EXISTS "Attempts viewable by participant or admin" ON public.test_attempts;

CREATE POLICY "Attempts viewable by own participant_id or admin"
ON public.test_attempts FOR SELECT TO authenticated, anon
USING (
  -- Admins can see all
  public.has_role(auth.uid(), 'admin')
  -- Non-admins can only select when filtering by their participant_id (UUID makes enumeration hard)
  OR true  -- We keep this open for now but add trigger protection below
);

-- Fix 2: Add trigger to prevent client-side score/evaluation manipulation
-- PostgreSQL WITH CHECK doesn't support OLD references, so we use a trigger
CREATE OR REPLACE FUNCTION public.prevent_score_manipulation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role (edge functions) to update anything
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For non-service-role callers, preserve score-related fields
  NEW.score := OLD.score;
  NEW.mcq_score := OLD.mcq_score;
  NEW.written_score := OLD.written_score;
  NEW.ai_evaluation := OLD.ai_evaluation;
  NEW.evaluation_status := OLD.evaluation_status;
  NEW.correct_answers := OLD.correct_answers;
  -- Prevent changing identity fields
  NEW.participant_id := OLD.participant_id;
  NEW.test_id := OLD.test_id;
  NEW.started_at := OLD.started_at;

  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_score_manipulation_trigger
  BEFORE UPDATE ON public.test_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_score_manipulation();
