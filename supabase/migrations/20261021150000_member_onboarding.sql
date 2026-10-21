-- ============================================================================
-- Member onboarding: private contact details, collected once when a code is
-- redeemed.
--
-- Google sign-in gives us a name and a verified email; it does not give a phone
-- number, so the join flow collects name + phone + access code in one step.
-- The phone number is private: only the member themselves and founders may read
-- it. Postgres grants are per-role (all members share `authenticated`), so a
-- column grant cannot say "founders yes, members no" — row-level security can,
-- which is why contact details live in their own table rather than a column on
-- `profiles` that every member could select.
-- ============================================================================

create table public.member_private (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  phone      text not null check (char_length(trim(phone)) between 5 and 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.member_private enable row level security;
grant select, insert, update on public.member_private to authenticated;
grant all on public.member_private to service_role;

-- Owner reads their own row; founders read everyone's. No other member can see
-- another member's number.
create policy "self or founder reads contact" on public.member_private
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'founder'));

-- A member may write only their own row (the onboarding form also writes it
-- server-side via the service role, which bypasses this, but keeping the
-- self-write policy means a member can later fix their own number from the UI).
create policy "self writes own contact" on public.member_private
  for insert to authenticated
  with check (user_id = auth.uid());
create policy "self updates own contact" on public.member_private
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.touch_member_private()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.touch_member_private() from public, anon, authenticated;
grant execute on function public.touch_member_private() to service_role;
create trigger member_private_touch before update on public.member_private
  for each row execute function public.touch_member_private();
