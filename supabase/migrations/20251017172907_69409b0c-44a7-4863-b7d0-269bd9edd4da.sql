-- Add contact fields to organizations table
alter table public.organizations
  add column if not exists primary_contact_email text,
  add column if not exists primary_contact_phone text,
  add column if not exists secondary_contact_email text,
  add column if not exists secondary_contact_phone text;