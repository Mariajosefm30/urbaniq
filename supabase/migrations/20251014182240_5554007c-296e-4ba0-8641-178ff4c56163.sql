-- Add last_building_id to profiles table
alter table public.profiles
  add column if not exists last_building_id uuid references public.buildings_new(id) on delete set null;