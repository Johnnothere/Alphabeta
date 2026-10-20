-- ============================================================================
-- Atomic rate limiting, self-pruning attempt tables, and three small fixes
-- surfaced by review.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Rate limits were check-then-insert from application code: count the
--    attempts, then insert one, then look the code up — three round trips with
--    no lock, so N requests that arrived together all saw count < max. This
--    does the count and the insert under a per-IP advisory lock inside one
--    transaction, so concurrent attempts from one address are serialised and
--    the limit is exact.
--
--    The prune_* functions existed but nothing ever called them, so the
--    attempt tables grew forever. Each call now prunes with a small
--    probability, which keeps the tables bounded with no scheduler to run.

create or replace function public.record_code_attempt(_ip text, _window_minutes int, _max int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  perform pg_advisory_xact_lock(hashtext('code_attempts:' || _ip));
  select count(*) into n
    from public.code_attempts
   where ip = _ip and created_at >= now() - make_interval(mins => _window_minutes);
  if n >= _max then return false; end if;
  insert into public.code_attempts (ip) values (_ip);
  if random() < 0.02 then
    perform public.prune_code_attempts();
    perform public.prune_access_tickets();
  end if;
  return true;
end $$;
revoke execute on function public.record_code_attempt(text, int, int) from public, anon, authenticated;
grant  execute on function public.record_code_attempt(text, int, int) to service_role;

create or replace function public.record_join_attempt(_ip text, _window_minutes int, _max int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  perform pg_advisory_xact_lock(hashtext('join_attempts:' || _ip));
  select count(*) into n
    from public.join_attempts
   where ip = _ip and created_at >= now() - make_interval(mins => _window_minutes);
  if n >= _max then return false; end if;
  insert into public.join_attempts (ip) values (_ip);
  if random() < 0.02 then perform public.prune_join_attempts(); end if;
  return true;
end $$;
revoke execute on function public.record_join_attempt(text, int, int) from public, anon, authenticated;
grant  execute on function public.record_join_attempt(text, int, int) to service_role;

-- ----------------------------------------------------------------------------
-- 2. The contribution calendar draws 53 Sunday-aligned columns, which reaches
--    up to 370 days back; the RPC only returned 365, so the first few cells of
--    the grid could show "0" over days that had activity.

create or replace function public.public_site_data()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'stats', (select to_jsonb(s) from public.community_stats s limit 1),
    'ships', (
      select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'summary', summary) order by happened_on desc), '[]'::jsonb)
      from (select kind, summary, happened_on from public.ships where published order by happened_on desc limit 20) t
    ),
    'contributions', (
      select coalesce(jsonb_object_agg(day::text, count), '{}'::jsonb)
      from public.contribution_days
      where day > current_date - interval '371 days'
    )
  )
$$;
revoke execute on function public.public_site_data() from public;
grant  execute on function public.public_site_data() to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. Profiles: bound the member-settable display name, and fix the handle
--    generator's last-resort branch, which could build 24 + 1 + 8 = 33
--    characters against a 30-character check and so fail the sign-up instead
--    of resolving the collision.

alter table public.profiles
  drop constraint if exists display_name_length,
  add  constraint display_name_length
       check (display_name is null or char_length(display_name) between 1 and 60);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(regexp_replace(split_part(coalesce(new.email, 'builder'), '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  if base = '' then base := 'builder'; end if;
  base := left(base, 24);
  candidate := base;

  loop
    begin
      insert into public.profiles (id, handle, display_name)
      values (new.id, candidate, left(coalesce(new.raw_user_meta_data->>'name', candidate), 60));
      return new;
    exception when unique_violation then
      n := n + 1;
      if n > 50 then
        -- 21 + 1 + 8 = 30, the handle_shape limit.
        candidate := left(base, 21) || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      else
        candidate := left(base, 30 - char_length(n::text)) || n::text;
      end if;
    end;
  end loop;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
