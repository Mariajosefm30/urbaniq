# Fix cross-tenant email leak on profiles

## Problem (confirmed)
`public.profiles` has a single SELECT policy, `profiles readable by authenticated`, with the condition `true` for the `authenticated` role. Any signed-in user can read every profile email across all buildings.

## Fix
One migration, scoped to `profiles` only:

1. Add a security-definer helper `public.shares_building_with(_other_user uuid)` that returns true when the current user and the target user share at least one building via non-revoked memberships. Security definer avoids RLS recursion on `memberships`.
2. Drop the permissive `profiles readable by authenticated` policy.
3. Create three replacement SELECT policies for `authenticated`:
   - `profiles_self_read` — own profile (`id = auth.uid()`)
   - `profiles_shared_building_read` — profiles of people in a shared building
   - `profiles_platform_read` — everything, for platform admins via the existing `public.is_platform_admin`

Policies are OR-ed, so the three together give exactly the intended visibility.

## Not touched
No other table, policy, grant, function, or app code changes. Existing app reads of `profiles` (resident/board rosters) stay within the shared-building rule, so they continue to work.
