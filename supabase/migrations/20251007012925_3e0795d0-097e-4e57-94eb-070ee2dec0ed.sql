-- 1) Add maintenance intelligence columns to tickets
ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS asset_id uuid,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS actual_cost numeric,
  ADD COLUMN IF NOT EXISTS satisfaction_rating smallint check (satisfaction_rating between 1 and 5);

-- 2) Create assets table for tracking equipment
CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text,
  location text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on assets
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for assets
CREATE POLICY "Authenticated users can view assets"
  ON public.assets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage assets"
  ON public.assets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- 3) Create buildings table with geolocation
CREATE TABLE IF NOT EXISTS public.buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  address text,
  lat double precision,
  lng double precision,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on buildings
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

-- RLS policies for buildings
CREATE POLICY "Authenticated users can view buildings"
  ON public.buildings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage buildings"
  ON public.buildings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- 4) Add foreign keys
ALTER TABLE public.maintenance_tickets
  ADD CONSTRAINT fk_ticket_asset 
  FOREIGN KEY (asset_id) 
  REFERENCES public.assets(id) 
  ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL;

-- 5) Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_unit ON public.maintenance_tickets(unit);
CREATE INDEX IF NOT EXISTS idx_tickets_asset ON public.maintenance_tickets(asset_id);
CREATE INDEX IF NOT EXISTS idx_tickets_resolved ON public.maintenance_tickets(resolved_at);
CREATE INDEX IF NOT EXISTS idx_profiles_building ON public.profiles(building_id);