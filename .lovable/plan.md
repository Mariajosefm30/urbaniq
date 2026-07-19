# Building setup, roster & Starter data foundations

Scope: Starter tier only. Build the schema + admin/roster UI now. Feed/tickets/guests/payments/analytics screens come in the next prompt — this pass creates the tables, RLS, and gating hooks so those screens can plug in.

## 1. Schema (single migration)

New per-building app tables, all with `building_id` FK, RLS on, and `service_role` + scoped `authenticated` grants.

- **posts** — `building_id, author_id (auth.users), body, pinned bool, created_at`
- **tickets** — `building_id, unit_id, created_by, title, description, status (open|closed), created_at, updated_at`
- **visits** — `building_id, unit_id, host_id, guest_name, expected_at, status (expected|arrived|left), created_at`
- **charges** — `building_id, unit_id, concept, amount numeric, due_date date, period text, status (pending|paid), created_at, updated_at`

Enums added: `post_visibility` not needed; reuse existing `ticket_status` (extend to include `closed` if missing — currently open/in_progress/resolved, add `closed`), add `visit_status`, keep existing `payment_status`.

RLS pattern per table:
- `admin_board`/`platform_admin`/`manager` of that building: full read/write via `is_board_or_admin`.
- `resident`: read building-wide for posts; own-unit only for tickets/visits/charges (`unit_id = membership.unit_id`), insert with `created_by/host_id = auth.uid()` and unit matching their membership.

Helper: `current_user_unit(_building_id)` security-definer returning the resident's unit_id for that building — used in resident RLS.

Feature gating enforcement stays in code (tier check) — RLS enforces role/scope only. Add `building_has_feature(_building_id, _feature text)` security-definer that reads `buildings.tier` and matches against the Starter feature list, for future server-side gating. Not wired into the Starter policies (Starter allows everything below).

## 2. Building creation & seat handover (Platform Admin)

`src/pages/PlatformAdmin.tsx` gets:
- **Create Building** form: name, tier (default starter), address.
- Buildings list with tier badge, unit count, admin_board seat status (filled/pending/empty vs cap).
- **Invite admin_board** action per building → calls existing `create-invite` (already enforces seat cap).
- **Reassign admin_board seat**: opens a dialog to (a) revoke current admin_board membership (delete row — building data untouched, all FKs point to `building_id`) and (b) create a new invite. Confirms with a warning listing what stays.
- Copy activation link for any pending invite.

Seat cap logic already in `create-invite`; extend it to also count invites for reassignment properly (revoke pending invites when reassigning).

## 3. Units & Residents roster (Admin Board / Platform Admin)

New page `src/pages/BuildingRoster.tsx` at `/board/:buildingId/roster`, linked from `BoardHome`.

Two tabs:
- **Units** — list, add single unit (code), edit code, delete. Delete blocked with warning if any active resident membership references that unit; must reassign/remove first.
- **Residents** — list of resident memberships + pending resident invites. Columns: name (from auth metadata if activated, else invite email), email, unit, status (active|pending), phone (stored on invite/membership metadata — see below), type (owner|tenant).
  - Edit: unit reassignment, name, phone, type.
  - Delete: revokes membership (or pending invite). Keeps building history intact (tickets/visits/charges keep `unit_id`; `created_by` remains as auth user id).
  - Add single resident: email, unit (create if missing), name, phone, type → creates invite.

### Schema additions for roster
- `invites` gets: `resident_name text`, `phone text`, `resident_type text` (owner|tenant, nullable).
- `memberships` gets: `resident_name text`, `phone text`, `resident_type text` (nullable, only meaningful for residents).
- `handle_new_user_v2` copies these fields from invite → membership on activation.

### Bulk import (CSV + XLSX)
- New component `src/components/roster/BulkImport.tsx`.
- Template download button generates a CSV with headers `unit, resident_name, email, phone, type` and one example row. Same headers accepted in `.xlsx`.
- Parse client-side: `papaparse` for CSV, `xlsx` (SheetJS) for Excel. Add both to package.json.
- Preview table with per-row status: ok / error (missing required field, invalid email, duplicate unit within file, unit already exists with different resident conflict). Row errors do NOT block the whole import — user can uncheck bad rows and commit the good ones.
- Commit → calls new edge function `roster-bulk-import` which, in a single transactional loop per row:
  1. upsert unit by (building_id, code)
  2. insert an invite (role=resident, building_id, unit_id, email, resident_name, phone, resident_type) — skip if an active membership or pending invite already exists for that email in this building.
  3. return per-row result.
- UI shows final report (created / skipped / failed with reason) and offers "Copy all activation links" for the created invites.

## 4. Tier gating scaffolding

- `src/components/FeatureGate.tsx` — hides children unless the current building's tier includes the feature (uses `tierHasFeature` from existing `src/lib/tiers.ts`).
- `src/hooks/useBuilding.ts` — fetches building row (tier) + caches; used by gates and headers.
- Seat cap constants stay in `src/lib/tiers.ts`; `create-invite` already reads them.

## 5. Files

**New**
- `supabase/migrations/<ts>_starter_foundations.sql` — schema, enums, RLS, helpers, invite/membership column additions.
- `supabase/functions/roster-bulk-import/index.ts` + config.toml entry (`verify_jwt = true`).
- `src/pages/BuildingRoster.tsx`
- `src/components/roster/UnitsTable.tsx`
- `src/components/roster/ResidentsTable.tsx`
- `src/components/roster/BulkImport.tsx`
- `src/components/roster/InviteResidentDialog.tsx`
- `src/components/platform/CreateBuildingDialog.tsx`
- `src/components/platform/ReassignSeatDialog.tsx`
- `src/components/FeatureGate.tsx`
- `src/hooks/useBuilding.ts`

**Edited**
- `src/pages/PlatformAdmin.tsx` — building creation, seat status, reassignment.
- `src/pages/BoardHome.tsx` — link to `/board/:buildingId/roster`, tier badge.
- `src/App.tsx` — add `/board/:buildingId/roster` route.
- `supabase/functions/create-invite/index.ts` — accept `resident_name`, `phone`, `resident_type`; on reassignment path revoke prior pending invites.
- `package.json` — add `papaparse`, `@types/papaparse`, `xlsx`.

## 6. Deferrals / assumptions to confirm after build

- Feed/tickets/visits/charges/analytics **UI screens** are next prompt — this pass only creates their tables + policies.
- No email sending; activation is still copy-link (matches current setup).
- Phone/type live on `memberships` and `invites` directly (no separate `resident_profiles` table) to keep Starter simple.
- "Manager" role has no seats in Starter but policies already grant it building access if one exists — Starter UI won't expose creating them.
- Delete = hard delete for units (blocked while residents attached) and for resident memberships/invites; building-level history rows keep raw `unit_id`/`created_by` even if those are later deleted (FKs use `ON DELETE SET NULL` for `unit_id` on tickets/visits/charges).
