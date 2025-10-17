-- Create units table with proper constraints
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings_new(id) on delete cascade,
  code text not null,
  resident_user_id uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add unique constraint for unit code per building (drop first if exists)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'unique_unit_per_building'
  ) then
    alter table public.units
      add constraint unique_unit_per_building
      unique (building_id, code);
  end if;
end $$;

-- Enable RLS
alter table public.units enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Managers can view units in their buildings" on public.units;
drop policy if exists "Managers can insert units in their buildings" on public.units;
drop policy if exists "Managers can update units in their buildings" on public.units;
drop policy if exists "Managers can delete units in their buildings" on public.units;

-- Create policies for units
create policy "Managers can view units in their buildings"
  on public.units for select
  using (
    exists (
      select 1 from public.manager_buildings
      where manager_buildings.building_id = units.building_id
        and manager_buildings.user_id = auth.uid()
    )
  );

create policy "Managers can insert units in their buildings"
  on public.units for insert
  with check (
    exists (
      select 1 from public.manager_buildings
      where manager_buildings.building_id = units.building_id
        and manager_buildings.user_id = auth.uid()
    )
  );

create policy "Managers can update units in their buildings"
  on public.units for update
  using (
    exists (
      select 1 from public.manager_buildings
      where manager_buildings.building_id = units.building_id
        and manager_buildings.user_id = auth.uid()
    )
  );

create policy "Managers can delete units in their buildings"
  on public.units for delete
  using (
    exists (
      select 1 from public.manager_buildings
      where manager_buildings.building_id = units.building_id
        and manager_buildings.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
create or replace function public.update_units_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_units_updated_at on public.units;

create trigger update_units_updated_at
  before update on public.units
  for each row
  execute function public.update_units_updated_at();