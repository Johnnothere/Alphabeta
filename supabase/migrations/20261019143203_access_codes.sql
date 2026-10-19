-- ============================================================================
-- Access codes: hashed at rest, rate-limited, redeemed atomically.
-- ============================================================================

create table public.access_codes (
  id          uuid primary key default gen_random_uuid(),
  code_hash   text not null unique,
  label       text not null,
  grants_role public.app_role not null default 'member',
  max_uses    int,
  uses        int not null default 0,
  expires_at  timestamptz,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint uses_within_max check (max_uses is null or uses <= max_uses)
);
alter table public.access_codes enable row level security;
-- Deliberately no grant to `authenticated` on code_hash-bearing rows beyond
-- what founders need; the admin UI reads via these policies.
grant select, update on public.access_codes to authenticated;
grant all            on public.access_codes to service_role;

create policy "founders read codes"   on public.access_codes for select to authenticated using (public.has_role(auth.uid(), 'founder'));
create policy "founders update codes" on public.access_codes for update to authenticated using (public.has_role(auth.uid(), 'founder')) with check (public.has_role(auth.uid(), 'founder'));

create table public.code_redemptions (
  id         uuid primary key default gen_random_uuid(),
  code_id    uuid not null references public.access_codes(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- One redemption per (user, code): a user may legitimately redeem a member
  -- code and later a founder code, but not the same code twice.
  unique (user_id, code_id)
);
alter table public.code_redemptions enable row level security;
grant select on public.code_redemptions to authenticated;
grant all    on public.code_redemptions to service_role;

create policy "read own redemptions or founder" on public.code_redemptions
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'founder'));

-- ----------------------------------------------------------------------------
-- Brute-force throttling. Keyed on the resolved client IP (see src/lib/client-ip.ts).

create table public.code_attempts (
  id         bigint generated always as identity primary key,
  ip         text not null,
  created_at timestamptz not null default now()
);
create index code_attempts_ip_time on public.code_attempts (ip, created_at desc);
alter table public.code_attempts enable row level security;
grant all on public.code_attempts to service_role;
-- No policies and no grants to anon/authenticated: reachable only via the
-- service-role client inside server functions.

-- Unbounded append-only tables are an outage waiting to happen. Attempts older
-- than the throttle window carry no information.
create or replace function public.prune_code_attempts()
returns void language sql security definer set search_path = public as $$
  delete from public.code_attempts where created_at < now() - interval '24 hours'
$$;
revoke execute on function public.prune_code_attempts() from public;
grant  execute on function public.prune_code_attempts() to service_role;

-- ----------------------------------------------------------------------------
-- Redemption tickets.
--
-- The public terminal validates a code *before* the visitor has an account.
-- Keeping the plaintext code in sessionStorage across that sign-up round-trip
-- would leave a live secret readable by any script on the origin. Instead the
-- server hands back an opaque, single-use, short-lived ticket id.

create table public.access_tickets (
  id         uuid primary key default gen_random_uuid(),
  code_id    uuid not null references public.access_codes(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '30 minutes',
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index access_tickets_expiry on public.access_tickets (expires_at);
alter table public.access_tickets enable row level security;
grant all on public.access_tickets to service_role;

create or replace function public.prune_access_tickets()
returns void language sql security definer set search_path = public as $$
  delete from public.access_tickets where expires_at < now() - interval '1 day'
$$;
revoke execute on function public.prune_access_tickets() from public;
grant  execute on function public.prune_access_tickets() to service_role;

-- ----------------------------------------------------------------------------
-- Atomic redemption.
--
-- The original did read-modify-write from application code
-- (`update access_codes set uses = <value read earlier> + 1`), which silently
-- loses increments under concurrency and lets a capped code be over-redeemed.
-- `for update` serialises contenders on the row instead.

create or replace function public.redeem_code(_code_id uuid, _user_id uuid)
returns public.app_role language plpgsql security definer set search_path = public as $$
declare
  code public.access_codes;
  already boolean;
begin
  select * into code from public.access_codes where id = _code_id for update;
  if not found then raise exception 'invalid code' using errcode = 'P0002'; end if;

  if not code.active then raise exception 'code revoked' using errcode = 'P0002'; end if;
  if code.expires_at is not null and code.expires_at <= now() then
    raise exception 'code expired' using errcode = 'P0002';
  end if;

  select exists (select 1 from public.code_redemptions where user_id = _user_id and code_id = _code_id)
    into already;

  -- Only consume a use for a first-time redemption, but still (re-)grant the
  -- role so a retried request converges on the same end state.
  if not already then
    if code.max_uses is not null and code.uses >= code.max_uses then
      raise exception 'code exhausted' using errcode = 'P0002';
    end if;
    insert into public.code_redemptions (code_id, user_id) values (_code_id, _user_id);
    update public.access_codes set uses = uses + 1 where id = _code_id;
  end if;

  insert into public.user_roles (user_id, role) values (_user_id, code.grants_role)
    on conflict (user_id, role) do nothing;

  return code.grants_role;
end $$;
revoke execute on function public.redeem_code(uuid, uuid) from public;
grant  execute on function public.redeem_code(uuid, uuid) to service_role;
