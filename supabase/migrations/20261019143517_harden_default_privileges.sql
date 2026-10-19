-- ============================================================================
-- Close Supabase's blanket default privileges.
--
-- Supabase ships `alter default privileges in schema public grant all on
-- tables/functions to anon, authenticated`. That grant lands on every new
-- object *directly*, so the `revoke execute ... from public` in the earlier
-- migrations never touched it — PUBLIC and anon are different grantees. A
-- plain Postgres instance has no such default, which is why this only shows
-- up against a real Supabase project.
--
-- For tables it was largely masked by row-level security. FUNCTIONS have no
-- RLS, so every SECURITY DEFINER function was reachable on the REST API by an
-- anonymous caller, including:
--   * redeem_code()  — grants roles, and trusts its arguments, because it was
--                      only ever meant to be reachable by the service-role
--                      client inside a server function
--   * prune_*()      — would let anyone wipe the rate-limit tables and so
--                      disable code and join throttling entirely
--   * has_role() / is_member() — membership enumeration for any user id
--
-- Start from nothing and re-grant only what each role actually needs.
-- ============================================================================

-- ---------------------------------------------------------------- functions
revoke all on all functions in schema public from anon, authenticated;

-- has_role, is_member and is_meetup_eligible are called from RLS policy
-- expressions, which are evaluated with the querying role's privileges —
-- revoking them from `authenticated` would break every policy that uses them.
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_member(uuid)                 to authenticated;
grant execute on function public.is_meetup_eligible(uuid)        to authenticated;

-- Called directly over RPC by the vault UI; both guard themselves internally.
grant execute on function public.member_progress(uuid)           to authenticated;
grant execute on function public.all_member_progress()           to authenticated;

-- The only function the public landing page needs.
grant execute on function public.public_site_data() to anon, authenticated;

-- Everything else — redeem_code, the prune_* helpers, and the trigger
-- functions — stays service-role only.
grant execute on all functions in schema public to service_role;

-- ------------------------------------------------------------------- tables
revoke all on all tables in schema public from anon, authenticated;

-- Public landing page, read-only.
grant select on public.community_stats   to anon, authenticated;
grant select on public.ships             to anon, authenticated;
grant select on public.contribution_days to anon, authenticated;

-- Members' area. RLS still decides which rows; these are the verbs the UI uses.
grant select                         on public.user_roles           to authenticated;
grant select, update                 on public.profiles             to authenticated;
grant select, update                 on public.access_codes         to authenticated;
grant select                         on public.code_redemptions     to authenticated;
grant select, insert, update, delete on public.hackathons           to authenticated;
grant select, insert, delete         on public.hackathon_attendance to authenticated;
grant select, insert                 on public.vouches              to authenticated;
grant select, insert                 on public.help_records         to authenticated;
grant update (confirmed)             on public.help_records         to authenticated;
grant select, insert, update, delete on public.gallery_items        to authenticated;
grant select, insert, update, delete on public.projects             to authenticated;
grant select, insert, update, delete on public.meetups              to authenticated;
grant select                         on public.join_requests        to authenticated;
grant update                         on public.community_stats      to authenticated;
grant insert, update, delete         on public.ships                to authenticated;
grant insert, update, delete         on public.contribution_days    to authenticated;

-- access_tickets, code_attempts and join_attempts stay service-role only:
-- RLS is enabled on them with no policies, and now no grants either. The
-- Supabase linter reports those three as "RLS enabled, no policy" — that is
-- the intended state, not an oversight.
grant all on all tables in schema public to service_role;

-- Stop the same thing happening to objects added later.
alter default privileges in schema public revoke all on functions from anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
