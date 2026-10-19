-- ============================================================================
-- Hackathons, vouches, help records, and quiet-room eligibility.
-- ============================================================================

create table public.hackathons (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  held_on    date not null,
  created_at timestamptz not null default now()
);
alter table public.hackathons enable row level security;
grant select, insert, update, delete on public.hackathons to authenticated;
grant all on public.hackathons to service_role;
create policy "members read hackathons"    on public.hackathons for select to authenticated using (public.is_member(auth.uid()));
create policy "founders manage hackathons" on public.hackathons for all    to authenticated using (public.has_role(auth.uid(), 'founder')) with check (public.has_role(auth.uid(), 'founder'));

create table public.hackathon_attendance (
  hackathon_id uuid not null references public.hackathons(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (hackathon_id, user_id)
);
alter table public.hackathon_attendance enable row level security;
grant select, insert, delete on public.hackathon_attendance to authenticated;
grant all on public.hackathon_attendance to service_role;
create policy "read own attendance or founder" on public.hackathon_attendance for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'founder'));
create policy "founders add attendance"        on public.hackathon_attendance for insert to authenticated with check (public.has_role(auth.uid(), 'founder'));
create policy "founders remove attendance"     on public.hackathon_attendance for delete to authenticated using (public.has_role(auth.uid(), 'founder'));

-- ----------------------------------------------------------------------------

create table public.vouches (
  id         uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references auth.users(id) on delete cascade,
  vouchee_id uuid not null references auth.users(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now(),
  unique (voucher_id, vouchee_id),
  check (voucher_id <> vouchee_id)
);
alter table public.vouches enable row level security;
grant select, insert on public.vouches to authenticated;
grant all on public.vouches to service_role;
create policy "members read vouches"  on public.vouches for select to authenticated using (public.is_member(auth.uid()));
create policy "vouch as self only"    on public.vouches for insert to authenticated with check (voucher_id = auth.uid());

-- The founders-cannot-vouch rule is enforced here, not only in the UI: a member
-- can call the REST API directly, so a client-side check is decoration.
create or replace function public.validate_vouch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.has_role(new.voucher_id, 'founder') then
    raise exception 'founders cannot vouch; vouches must come from the community';
  end if;
  if not public.is_member(new.voucher_id) then raise exception 'only members can vouch'; end if;
  if not public.is_member(new.vouchee_id) then raise exception 'vouchee must be a member'; end if;
  return new;
end $$;
create trigger vouches_validate before insert on public.vouches
  for each row execute function public.validate_vouch();

-- ----------------------------------------------------------------------------

create table public.help_records (
  id         uuid primary key default gen_random_uuid(),
  helper_id  uuid not null references auth.users(id) on delete cascade,
  helped_id  uuid not null references auth.users(id) on delete cascade,
  note       text not null check (char_length(trim(note)) between 1 and 500),
  confirmed  boolean not null default false,
  created_at timestamptz not null default now(),
  check (helper_id <> helped_id)
);
create index help_records_helper on public.help_records (helper_id) where confirmed;
create index help_records_helped on public.help_records (helped_id) where not confirmed;
alter table public.help_records enable row level security;
grant select, insert on public.help_records to authenticated;
grant update (confirmed) on public.help_records to authenticated;
grant all on public.help_records to service_role;

create policy "read help you are part of" on public.help_records
  for select to authenticated
  using (helper_id = auth.uid() or helped_id = auth.uid() or public.has_role(auth.uid(), 'founder'));

create policy "log help as self" on public.help_records
  for insert to authenticated
  with check (helper_id = auth.uid() and confirmed = false and public.is_member(auth.uid()) and public.is_member(helped_id));

-- `with check` matters as much as `using` here: without it the person being
-- helped could flip `confirmed` back and forth, or (with a wider column grant)
-- edit the note while confirming.
create policy "helped party confirms" on public.help_records
  for update to authenticated
  using (helped_id = auth.uid() or public.has_role(auth.uid(), 'founder'))
  with check (helped_id = auth.uid() or public.has_role(auth.uid(), 'founder'));

-- ----------------------------------------------------------------------------
-- Eligibility. Mirrored in src/lib/eligibility.ts for the UI — change both.

create or replace function public.member_progress(_uid uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  recent jsonb;
  vouch_count int;
  helped_count int;
begin
  if _uid <> auth.uid() and not public.has_role(auth.uid(), 'founder') then
    raise exception 'forbidden';
  end if;

  select coalesce(jsonb_agg(att order by held_on desc), '[]'::jsonb) into recent
  from (
    select h.held_on,
           exists (select 1 from public.hackathon_attendance a where a.hackathon_id = h.id and a.user_id = _uid) as att
    from public.hackathons h
    where h.held_on <= current_date
    order by h.held_on desc
    limit 3
  ) s;

  select count(*) into vouch_count
    from public.vouches where vouchee_id = _uid and not public.has_role(voucher_id, 'founder');
  select count(distinct helped_id) into helped_count
    from public.help_records where helper_id = _uid and confirmed;

  return jsonb_build_object('recent', recent, 'vouches', vouch_count, 'helped', helped_count);
end $$;
revoke execute on function public.member_progress(uuid) from public;
grant  execute on function public.member_progress(uuid) to authenticated, service_role;

create or replace function public.is_meetup_eligible(_uid uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  run int := 0;
  r record;
  vouch_count int;
  helped_count int;
begin
  for r in
    select exists (select 1 from public.hackathon_attendance a where a.hackathon_id = h.id and a.user_id = _uid) as att
    from public.hackathons h
    where h.held_on <= current_date
    order by h.held_on desc
    limit 3
  loop
    exit when not r.att;
    run := run + 1;
  end loop;

  select count(*) into vouch_count
    from public.vouches where vouchee_id = _uid and not public.has_role(voucher_id, 'founder');
  select count(distinct helped_id) into helped_count
    from public.help_records where helper_id = _uid and confirmed;

  return run >= 3 or vouch_count >= 3 or helped_count >= 10;
end $$;
revoke execute on function public.is_meetup_eligible(uuid) from public;
grant  execute on function public.is_meetup_eligible(uuid) to authenticated, service_role;

-- Founder dashboards need every member's progress at once. Without this the
-- admin page issued one RPC per member from the browser (N+1 over the network).
create or replace function public.all_member_progress()
returns table (user_id uuid, handle text, streak int, vouches int, helped int, eligible boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'founder') then raise exception 'forbidden'; end if;

  return query
  with recent as (
    select h.id, row_number() over (order by h.held_on desc) as rn
    from public.hackathons h
    where h.held_on <= current_date
    order by h.held_on desc
    limit 3
  ),
  attendance as (
    select p.id as uid,
           r.rn,
           exists (
             select 1 from public.hackathon_attendance a
             where a.hackathon_id = r.id and a.user_id = p.id
           ) as attended
    from public.profiles p
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
  select p.id,
         p.handle,
         coalesce(s.run, 0),
         (select count(*)::int from public.vouches v
            where v.vouchee_id = p.id and not public.has_role(v.voucher_id, 'founder')),
         (select count(distinct hr.helped_id)::int from public.help_records hr
            where hr.helper_id = p.id and hr.confirmed),
         public.is_meetup_eligible(p.id)
  from public.profiles p
  left join streaks s on s.uid = p.id
  order by p.handle;
end $$;
revoke execute on function public.all_member_progress() from public;
grant  execute on function public.all_member_progress() to authenticated, service_role;
