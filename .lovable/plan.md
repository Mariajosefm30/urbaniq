
## Goal

Restructure the role model into **Superadmin → Admin → Manager → Resident**, where:

- **You (mariajosefm)** are the only Superadmin — you can see and manage everything across all organizations.
- **Admins** are assigned by you (after contract signing). Admins manage their organization's buildings, managers, units, and residents.
- **Managers** keep their current per-building role.
- **Residents** are pre-created by Admins (email + unit). When a resident signs up with that email, the system auto-links them to their building and unit. No manual building selection on their side.

## What changes

### 1. Database

- Add `'superadmin'` to the `app_role` enum.
- Seed your user with the `superadmin` role in `user_roles` (lookup by email `mariajosefm`).
- New table `pending_residents` — pre-created resident invitations:
  - `email`, `building_id`, `unit_id` (nullable), `org_id`, `invited_by`, `claimed_at`, `claimed_by_user_id`.
  - Unique on (`email`, `building_id`).
- Update `handle_new_user()` trigger: on signup, if the new user's email matches a `pending_residents` row, auto-assign their `profiles.org_id`, `building_id`, `last_building_id`, `unit`, set role = `resident`, mark the pending row as claimed, and insert into `building_memberships` + `units.resident_user_id`.
- New helper `is_superadmin(_user_id)` security-definer function.
- Update RLS so superadmin sees/manages everything (orgs, buildings_new, profiles, user_roles, pending_residents).
- GRANTs on the new table per the public-schema rule.

### 2. Role assignment UI

- **Remove** the existing self-serve "Role Promoter" (`src/components/admin/RolePromoter.tsx`) from the regular Admin Setup tab — admins should not be able to promote themselves or others to admin.
- **New Superadmin page** `/superadmin`:
  - Lists all organizations + their admins.
  - "Assign Admin" form: email → promotes that user to admin and links them to the chosen organization. Creates the org if needed.
  - Visible only to users with `superadmin` role; guarded route.
- The previous Role Promoter logic stays available **inside the superadmin page only**, scoped to admin/manager assignments.

### 3. Admin resident provisioning

- New section `ResidentsSection` inside the building People page (`/buildings/:buildingId/people`):
  - "Add resident" form: email + unit (dropdown of building units).
  - Creates row in `pending_residents`.
  - Lists pending (not yet claimed) and active residents.
- Existing manager/admin invitation flows untouched.

### 4. Resident signup flow

- `/auth` signup unchanged on the surface — they enter email + password.
- After signup, the trigger fires and they land directly on their building's resident dashboard (no onboarding, no building picker) because the trigger fills in `last_building_id`.
- Add a friendly error if a user signs up with an email that has no matching `pending_residents` row AND no admin/manager role — explain they need an invite from their building admin.

### 5. Routing / guards

- Add `superadmin` checks in `AuthContext` / `SessionContext` and `ProtectedRoute`.
- Superadmin can access `/admin`, `/manager`, `/superadmin`, and every building route regardless of org.

## Technical details

- `pending_residents` policies:
  - INSERT: admins of the org (or superadmin)
  - SELECT: admins of the org, managers of the building, superadmin
  - DELETE: admins of the org, superadmin
- `handle_new_user` becomes the single source of truth for resident auto-linking — runs with `security definer`.
- Superadmin RLS additions are added as new policies (no removal of existing ones) to avoid breaking current admin/manager flows.
- All new UI strings in Spanish (per project memory).

## Out of scope (will not do now)

- CSV bulk import (you chose manual only).
- Automatic email invites (residents are told the link out-of-band).
- Removing the Manager role.
- Refactoring existing admin/manager onboarding screens beyond removing the Role Promoter.

## Files touched (estimate)

- New: `supabase/migrations/*` (enum + table + trigger + policies), `src/pages/Superadmin.tsx`, `src/components/admin/ResidentsSection.tsx`.
- Edit: `src/App.tsx` (route), `src/components/admin/SetupTab.tsx` (remove RolePromoter), `src/pages/BuildingPeople.tsx` (add residents section), `src/contexts/AuthContext.tsx` + `SessionContext.tsx` (superadmin flag), `src/components/ProtectedRoute.tsx`, `supabase/functions/whoami/index.ts` (return `is_superadmin`).

Approve to proceed, or tell me what to change.
