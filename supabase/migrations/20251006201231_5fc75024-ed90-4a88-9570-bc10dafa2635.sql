-- Create user_roles table (NEVER store roles on profiles!)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz default now(),
  unique (user_id, role)
);

-- Enable RLS on user_roles
alter table public.user_roles enable row level security;

-- Users can read their own roles
create policy "Users can view own roles"
on public.user_roles for select
to authenticated
using (user_id = auth.uid());

-- Only managers can assign roles (we'll grant the first manager manually)
create policy "Managers can manage roles"
on public.user_roles for all
to authenticated
using (
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'manager'
  )
);

-- Security definer function to check roles (prevents RLS recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Enable RLS on guests table
alter table public.guests enable row level security;

-- Drop existing policies if any
drop policy if exists guests_insert_own on public.guests;
drop policy if exists guests_select_own_or_manager on public.guests;
drop policy if exists guests_update_manager on public.guests;

-- Residents insert their own guests
create policy guests_insert_own
on public.guests for insert
to authenticated
with check (host_id = auth.uid());

-- Residents read only their guests; managers read all
create policy guests_select_own_or_manager
on public.guests for select
to authenticated
using (
  host_id = auth.uid()
  or public.has_role(auth.uid(), 'manager')
);

-- Managers can update (revoke, etc.)
create policy guests_update_manager
on public.guests for update
to authenticated
using (public.has_role(auth.uid(), 'manager'));