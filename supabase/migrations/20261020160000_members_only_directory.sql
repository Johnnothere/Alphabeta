-- ============================================================================
-- The member directory lists members, not every account that ever signed up.
--
-- `handle_new_user` creates a profile for every auth.users row, so anyone who
-- signs up and never redeems a code still has a profile. Two things read the
-- profile list as if it were the member list:
--
--   * `profiles` select policy — members could read *all* profiles, so the
--     vouch/help dropdowns offered non-members, and picking one failed with an
--     opaque RLS error from the insert policy's `is_member(helped_id)` check.
--   * `all_member_progress()` — the founders' eligibility table iterated every
--     profile, so sign-ups with no role showed up as 0/3 members.
--
-- Both now stop at the membership boundary. A user can always read their own
-- profile (the bind screen needs the handle), and founders are members, so
-- they see the same directory everyone else does.
-- ============================================================================

drop policy if exists "members read profiles" on public.profiles;
drop policy if exists "members read member profiles" on public.profiles;
create policy "members read member profiles" on public.profiles
  for select to authenticated
  using (id = auth.uid() or (public.is_member(auth.uid()) and public.is_member(id)));

create or replace function public.all_member_progress()
returns table (user_id uuid, handle text, streak int, vouches int, helped int, eligible boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'founder') then raise exception 'forbidden'; end if;

  return query
  with members as (
    select p.id, p.handle
    from public.profiles p
    where public.is_member(p.id)
  ),
  recent as (
    select h.id, row_number() over (order by h.held_on desc) as rn
    from public.hackathons h
    where h.held_on <= current_date
    order by h.held_on desc
    limit 3
  ),
  attendance as (
    select m.id as uid,
           r.rn,
           exists (
             select 1 from public.hackathon_attendance a
             where a.hackathon_id = r.id and a.user_id = m.id
           ) as attended
    from members m
    cross join recent r
  ),
  streaks as (
    -- The streak is the run of attendance from the most recent hackathon
    -- backwards, so it ends one short of the first one they missed.
    select uid,
           (coalesce(min(rn) filter (where not attended), count(*) + 1) - 1)::int as run
    from attendance
    group by uid
  )
  select m.id,
         m.handle,
         coalesce(s.run, 0),
         (select count(*)::int from public.vouches v
            where v.vouchee_id = m.id and not public.has_role(v.voucher_id, 'founder')),
         (select count(distinct hr.helped_id)::int from public.help_records hr
            where hr.helper_id = m.id and hr.confirmed),
         public.is_meetup_eligible(m.id)
  from members m
  left join streaks s on s.uid = m.id
  order by m.handle;
end $$;

-- `create or replace` keeps existing grants, but the default-privilege revoke
-- from the hardening migration means a *new* function would get none; stating
-- them here keeps this file correct even if it is ever applied to a fresh DB.
revoke execute on function public.all_member_progress() from public, anon;
grant  execute on function public.all_member_progress() to authenticated, service_role;
