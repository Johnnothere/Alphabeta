-- ============================================================================
-- Roles, profiles, and the access-code gate.
-- ============================================================================

create type public.app_role as enum ('founder', 'member');

create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;
grant select on public.user_roles to authenticated;
grant all    on public.user_roles to service_role;

-- SECURITY DEFINER so policies can call them without recursing into the very
-- table being filtered. `search_path` is pinned so a caller cannot shadow
-- `user_roles` with a temp table of their own.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_member(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

-- Postgres grants EXECUTE on new functions to PUBLIC by default. Left as-is,
-- an anonymous visitor could probe `has_role(<uuid>, 'founder')` and enumerate
-- who the founders are. Only the roles that need these may call them.
revoke execute on function public.has_role(uuid, public.app_role) from public;
revoke execute on function public.is_member(uuid) from public;
grant  execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant  execute on function public.is_member(uuid) to authenticated, service_role;

create policy "read own roles or founder reads all" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'founder'));

-- ----------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  handle       text not null unique,
  display_name text,
  created_at   timestamptz not null default now(),
  constraint handle_shape check (handle ~ '^[a-z0-9_]{1,30}$')
);
alter table public.profiles enable row level security;
grant select, update on public.profiles to authenticated;
grant all            on public.profiles to service_role;

create policy "members read profiles" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_member(auth.uid()));

-- Column-level grants stop a member rewriting someone else's primary key even
-- if a policy were ever loosened; the policy restricts it to their own row.
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

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

  -- Retry on unique violation rather than pre-checking with a SELECT: two
  -- concurrent sign-ups can both pass a `not exists` check and then collide.
  loop
    begin
      insert into public.profiles (id, handle, display_name)
      values (new.id, candidate, coalesce(new.raw_user_meta_data->>'name', candidate));
      return new;
    exception when unique_violation then
      n := n + 1;
      if n > 50 then
        candidate := base || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      else
        candidate := base || n::text;
      end if;
    end;
  end loop;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
