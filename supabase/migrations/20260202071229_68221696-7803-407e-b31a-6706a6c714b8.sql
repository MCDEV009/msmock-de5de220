-- Fix function search paths
CREATE OR REPLACE FUNCTION public.generate_participant_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_test_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..5 LOOP
        result := result || floor(random() * 10)::integer::text;
    END LOOP;
    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_test_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NEW.visibility = 'private' AND NEW.test_code IS NULL THEN
        NEW.test_code := public.generate_test_code();
    END IF;
    RETURN NEW;
END;
$$;