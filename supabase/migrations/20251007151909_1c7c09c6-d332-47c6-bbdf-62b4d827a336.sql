
-- Fix security warnings from previous migration

-- Fix function search path
CREATE OR REPLACE FUNCTION public.refresh_recurring_alerts()
RETURNS VOID 
LANGUAGE SQL 
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.maintenance_alerts (issue_key, title, details, severity)
  SELECT
    issue_key,
    CASE WHEN asset_id IS NOT NULL
      THEN 'Recurring asset issue'
      ELSE 'Recurring category/unit issue'
    END AS title,
    jsonb_build_object(
      'asset_id', asset_id,
      'category', category,
      'unit', unit,
      'incidents', incidents,
      'window_days', 60,
      'first_seen', first_seen,
      'last_seen', last_seen
    ),
    'high'
  FROM public.recurring_issues_60d
  ON CONFLICT (issue_key) DO UPDATE SET
    details = EXCLUDED.details,
    severity = EXCLUDED.severity;
$$;

-- Revoke public access to materialized view
REVOKE ALL ON public.recurring_issues_60d FROM PUBLIC;
REVOKE ALL ON public.recurring_issues_60d FROM anon;
REVOKE ALL ON public.recurring_issues_60d FROM authenticated;
