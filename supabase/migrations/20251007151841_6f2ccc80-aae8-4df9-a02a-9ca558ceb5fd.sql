
-- Step 2: Predictive maintenance - recurring issues view + alerts

-- Group by asset first; if null, fall back to category + unit
CREATE MATERIALIZED VIEW IF NOT EXISTS public.recurring_issues_60d AS
WITH base AS (
  SELECT
    COALESCE(
      CAST(asset_id AS text),
      CONCAT_WS(':', category, COALESCE(unit,''))
    ) AS issue_key,
    asset_id, category, unit,
    COUNT(*) AS incidents,
    MIN(created_at) AS first_seen,
    MAX(created_at) AS last_seen
  FROM public.maintenance_tickets
  WHERE created_at >= NOW() - INTERVAL '60 days'
  GROUP BY 1,2,3,4
)
SELECT * FROM base WHERE incidents >= 3;

-- Simple alerts table the UI can read
CREATE TABLE IF NOT EXISTS public.maintenance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  details JSONB,
  severity TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ NULL
);

-- Enable RLS
ALTER TABLE public.maintenance_alerts ENABLE ROW LEVEL SECURITY;

-- Managers can view all alerts
CREATE POLICY "Managers can view alerts" 
ON public.maintenance_alerts 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'manager'));

-- Managers can acknowledge alerts
CREATE POLICY "Managers can acknowledge alerts" 
ON public.maintenance_alerts 
FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- Upsert alerts from the view (run daily or on demand)
CREATE OR REPLACE FUNCTION public.refresh_recurring_alerts()
RETURNS VOID LANGUAGE SQL AS $$
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

-- Add priority column to tickets
ALTER TABLE public.maintenance_tickets 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.maintenance_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON public.maintenance_alerts(acknowledged_at) WHERE acknowledged_at IS NULL;
