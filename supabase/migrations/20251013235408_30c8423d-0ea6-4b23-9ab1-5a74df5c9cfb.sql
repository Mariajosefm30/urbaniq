-- Organizations (property management companies)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Buildings (belong to an org) - we'll link existing buildings table
create table if not exists public.buildings_new (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  created_at timestamptz default now()
);

-- Units (belong to a building)
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null,
  code text not null,
  resident_user_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  unique (building_id, code)
);

-- Add org_id to profiles
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'org_id'
  ) then
    alter table public.profiles add column org_id uuid references public.organizations(id);
  end if;
end $$;

-- Enable RLS
alter table public.organizations enable row level security;
alter table public.buildings_new enable row level security;
alter table public.units enable row level security;

-- RLS Policies for organizations
drop policy if exists "Users can view their own organization" on public.organizations;
create policy "Users can view their own organization"
  on public.organizations for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and org_id = organizations.id)
  );

drop policy if exists "Managers can insert organizations" on public.organizations;
create policy "Managers can insert organizations"
  on public.organizations for insert
  with check (public.has_role(auth.uid(), 'manager'));

drop policy if exists "Managers can update their organization" on public.organizations;
create policy "Managers can update their organization"
  on public.organizations for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and org_id = organizations.id)
    and public.has_role(auth.uid(), 'manager')
  );

-- RLS Policies for buildings_new
create policy "Users can view buildings in their org"
  on public.buildings_new for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and org_id = buildings_new.org_id)
  );

create policy "Managers can manage buildings in their org"
  on public.buildings_new for all
  using (
    public.has_role(auth.uid(), 'manager')
    and exists (select 1 from public.profiles where id = auth.uid() and org_id = buildings_new.org_id)
  )
  with check (
    public.has_role(auth.uid(), 'manager')
    and exists (select 1 from public.profiles where id = auth.uid() and org_id = buildings_new.org_id)
  );

-- RLS Policies for units
create policy "Users can view units in their org's buildings"
  on public.units for select
  using (
    exists (
      select 1 from public.buildings_new b
      inner join public.profiles p on p.org_id = b.org_id
      where p.id = auth.uid() and b.id = units.building_id
    )
  );

create policy "Managers can manage units in their org's buildings"
  on public.units for all
  using (
    public.has_role(auth.uid(), 'manager')
    and exists (
      select 1 from public.buildings_new b
      inner join public.profiles p on p.org_id = b.org_id
      where p.id = auth.uid() and b.id = units.building_id
    )
  )
  with check (
    public.has_role(auth.uid(), 'manager')
    and exists (
      select 1 from public.buildings_new b
      inner join public.profiles p on p.org_id = b.org_id
      where p.id = auth.uid() and b.id = units.building_id
    )
  );