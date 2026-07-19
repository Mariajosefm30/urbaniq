# Rebuild: Roles, Access & Tiers (Starter only)

## 1. Database — new clean schema (wipe old)

New tables in `public`:

- **buildings** — `id, name, tier (starter|growth|pro|developer, default starter), address, created_at, updated_at`
- **units** — `id, building_id → buildings, code (e.g. "4B"), created_at`, unique(building_id, code)
- **memberships** — `id, user_id → auth.users, building_id → buildings, role (platform_admin|admin_board|manager|resident), unit_id → units (nullable, required for resident), created_at`, unique(user_id, building_id, role)
- **invites** — `id, email, building_id (nullable for platform_admin), role, unit_id (nullable), token (unique), expires_at, accepted_at, invited_by, created_at`

Enum `app_role_v2`: platform_admin, admin_board, manager, resident.

Security-definer helpers:
- `has_platform_admin(uid)` — true if user has platform_admin membership (no building scope needed).
- `has_building_role(uid, building_id, role)` — checks memberships.
- `user_buildings(uid)` — set of building_ids the user belongs to.
- Feature-gate helper `building_has_feature(building_id, feature_key)` — maps tier → allowed features.

RLS: every table locked; policies use the helpers. Residents only see their own unit's data (tickets, payments, guests filed under their unit_id).

Wipe: drop old role tables/data (`user_roles`, `building_memberships`, `pending_admins`, `pending_residents`, `manager_buildings`, `buildings_new`, `units`, `profiles` role/org columns). Truncate app data (tickets, guests, payments, amenities, bookings, feed_posts, messages) since we're starting clean. `auth.users` is truncated too so no orphan accounts remain.

Seed: insert one **invite** row for `mfernandezmelgar@gmail.com` role=platform_admin, no building. On first login the user opens the activation link, sets a password, and the trigger promotes them.

Trigger `handle_new_user_v2` on `auth.users`: match by email in `invites` where `accepted_at is null` → create membership(s), mark accepted. If no invite exists → block (delete the auth user or leave orphan with no membership so route guards send them nowhere).

## 2. Auth & routing

- **Remove public sign-up.** `/auth` shows Login only. Signup form is gone.
- New page `/activate?token=…` — validates invite token, asks for password, calls `supabase.auth.signUp` (or admin API via edge fn) using the invite email, then routes by role.
- Route guards rewritten around memberships (not the old `profiles.role`):
  - `platform_admin` → `/platform` (list buildings, invite admin_board, view everything)
  - `admin_board` → `/board` (their building's dashboard; invite residents, manage units, see tickets/payments/guests/feed, basic analytics)
  - `manager` → `/manager` (hidden in Starter — no seats)
  - `resident` → `/app` (feed, own tickets, own guests, own payments)
- Every route checks: user is authenticated AND has a membership that grants access AND (for building-scoped routes) the building's tier includes the feature.

## 3. Tier / seat / feature gating

- `TIER_FEATURES` map in `src/lib/tiers.ts`: starter = `['feed','tickets_basic','guests','payments_tracking','analytics_basic']`. Higher tiers listed but empty in UI.
- `TIER_SEATS` map: starter = 1 admin_board seat, growth=3, pro=10, developer=null.
- `<FeatureGate feature="…">` wrapper hides UI; server-side policies double-check.
- Invite flow for admin_board enforces seat cap per building.

## 4. UI cleanup for Starter-only

Keep code for amenities, bookings, advanced messaging, manager screens, but:
- Hide from nav via `FeatureGate`.
- Block routes via guard when tier < required.
- Existing MCP tools stay but each checks membership + feature gate per call.

## 5. Files

**New**
- `supabase/migrations/<ts>_rebuild_roles.sql` — schema wipe + new tables + RLS + trigger + seed invite.
- `src/pages/Activate.tsx` — token → set password → login.
- `src/pages/PlatformAdmin.tsx` — replaces `Superadmin.tsx`.
- `src/pages/BoardHome.tsx` — replaces admin hub.
- `src/pages/ResidentHome.tsx` — replaces `Feed.tsx` as entry.
- `src/lib/tiers.ts`, `src/components/FeatureGate.tsx`.
- `src/hooks/useMemberships.ts`.

**Edited**
- `src/App.tsx` — new routes, drop `/onboarding`, `/admin/setup`, `/admin/onboarding`.
- `src/pages/Auth.tsx` — login only, no signup toggle.
- `src/components/ProtectedRoute.tsx` — membership-based guards.
- `src/contexts/AuthContext.tsx` + `SessionContext.tsx` — load memberships instead of single role.
- `supabase/functions/whoami/index.ts` — return memberships array + tier per building.
- `supabase/functions/invite-*` — one unified `create-invite` edge function returning copyable link.
- Nav components — filter by tier.

**Deleted / disabled**
- `Onboarding.tsx`, `AdminSetup.tsx`, `AdminOnboarding.tsx` route registrations.
- Old `pending_admins`/`pending_residents` tables and their edge functions.

## 6. Seed activation

After migration runs, I'll print the activation URL for `mfernandezmelgar@gmail.com` in the migration output (or you can grab it from the `invites` table). You open it, set a password, and you're in as platform_admin.

## Open question
The activation link needs a password chosen by you — no password required upfront. Confirm and I'll ship.
