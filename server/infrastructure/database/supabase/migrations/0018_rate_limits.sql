-- ============================================================
-- Migration: 0018_rate_limits.sql
-- Rate limits shared by every API instance (Vercel runs several): one counter per key (a hash of the client or
-- account and the action) in a time window. rate_limit_hit() counts a hit atomically and returns the hits of the
-- current window; old counters are cleaned up as it runs. Used only by the API server (service_role).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  hits INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_key TEXT, p_window_seconds INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hits INTEGER;
BEGIN
  INSERT INTO public.rate_limits AS rl (key, window_start, hits)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    hits = CASE WHEN rl.window_start < now() - make_interval(secs => p_window_seconds) THEN 1 ELSE rl.hits + 1 END,
    window_start = CASE WHEN rl.window_start < now() - make_interval(secs => p_window_seconds) THEN now() ELSE rl.window_start END
  RETURNING hits INTO v_hits;

  -- Now and then, forget counters older than a day
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
  END IF;

  RETURN v_hits;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INTEGER) TO service_role;
