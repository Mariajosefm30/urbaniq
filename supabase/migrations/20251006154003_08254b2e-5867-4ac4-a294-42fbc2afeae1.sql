-- Create technicians table
CREATE TABLE public.technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  phone TEXT NOT NULL,
  rating NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5),
  distance NUMERIC(4,1),
  maps_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on technicians
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

-- Managers and residents can view all technicians
CREATE POLICY "Anyone can view technicians"
  ON public.technicians
  FOR SELECT
  USING (true);

-- Add technician_id to maintenance_tickets
ALTER TABLE public.maintenance_tickets
ADD COLUMN technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL;

-- Insert mock technician data
INSERT INTO public.technicians (name, category, phone, rating, distance, maps_url) VALUES
  ('QuickFix Plumbing', 'plumbing', '+1-555-0101', 4.8, 0.5, 'https://maps.google.com/?q=QuickFix+Plumbing'),
  ('Pipe Masters', 'plumbing', '+1-555-0102', 4.5, 1.2, 'https://maps.google.com/?q=Pipe+Masters'),
  ('Spark Electric Co', 'electrical', '+1-555-0201', 4.9, 0.8, 'https://maps.google.com/?q=Spark+Electric'),
  ('Bright Lights Electrical', 'electrical', '+1-555-0202', 4.6, 1.5, 'https://maps.google.com/?q=Bright+Lights'),
  ('Cool Air HVAC', 'hvac', '+1-555-0301', 4.7, 0.6, 'https://maps.google.com/?q=Cool+Air+HVAC'),
  ('Climate Control Pro', 'hvac', '+1-555-0302', 4.8, 1.0, 'https://maps.google.com/?q=Climate+Control'),
  ('Appliance Repair Express', 'appliance', '+1-555-0401', 4.6, 0.9, 'https://maps.google.com/?q=Appliance+Repair'),
  ('Fix-It Appliances', 'appliance', '+1-555-0402', 4.4, 1.3, 'https://maps.google.com/?q=Fix-It+Appliances'),
  ('Handyman Express', 'other', '+1-555-0501', 4.9, 0.4, 'https://maps.google.com/?q=Handyman+Express'),
  ('All-in-One Services', 'other', '+1-555-0502', 4.7, 1.1, 'https://maps.google.com/?q=All-in-One+Services');