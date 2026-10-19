-- ============================================================================
-- Everything the public landing page reads or writes.
--
-- The original hardcoded its headline numbers (412 members, 1,337 ships,
-- 2,890 unblocks) and its "ships.log — live" feed into the React bundle. They
-- are presented as measurements — "sampled at build time", "live" — so leaving
-- them invented makes the page a claim the community cannot support. These
-- tables let the same design render real figures, and degrade to showing
-- nothing rather than to showing fiction.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Join requests.

create table public.join_requests (
  id         uuid primary key default gen_random_uuid(),
  email      text not null check (char_length(email) between 5 and 254),
  link       text check (link is null or char_length(link) between 4 and 500),
  note       text check (note is null or char_length(note) <= 1000),
  source_ip  text,
  created_at timestamptz not null default now()
);

-- The page says "bring something you built", so the same email arriving twice
-- is a duplicate, not a second applicant.
create unique index join_requests_email_key on public.join_requests (lower(email));
create index join_requests_ip_time on public.join_requests (source_ip, created_at desc);

alter table public.join_requests enable row level security;
grant select on public.join_requests to authenticated;
grant all    on public.join_requests to service_role;
-- Note: no direct INSERT grant to anon. The original allowed
-- `insert ... with check (true)` straight from the browser, so anyone could
-- append rows to this table forever with a loop. Submissions now go through a
-- rate-limited server function using the service-role client.

create policy "founders read requests" on public.join_requests
  for select to authenticated
  using (public.has_role(auth.uid(), 'founder'));

create table public.join_attempts (
  id         bigint generated always as identity primary key,
  ip         text not null,
  created_at timestamptz not null default now()
);
create index join_attempts_ip_time on public.join_attempts (ip, created_at desc);
alter table public.join_attempts enable row level security;
grant all on public.join_attempts to service_role;

create or replace function public.prune_join_attempts()
returns void language sql security definer set search_path = public as $$
  delete from public.join_attempts where created_at < now() - interval '24 hours'
$$;
revoke execute on function public.prune_join_attempts() from public;
grant  execute on function public.prune_join_attempts() to service_role;

-- ----------------------------------------------------------------------------
-- Headline counters.
--
-- Single row, founder-editable, world-readable. Null means "we do not publish
-- this number", and the UI omits the tile entirely rather than printing a zero
-- that reads as a measurement.

create table public.community_stats (
  id              int primary key generated always as identity,
  members         int check (members is null or members >= 0),
  ships_this_year int check (ships_this_year is null or ships_this_year >= 0),
  people_helped   int check (people_helped is null or people_helped >= 0),
  pitch_decks     int not null default 0,
  measured_at     timestamptz not null default now(),
  singleton       boolean not null default true,
  constraint one_row_only unique (singleton)
);
alter table public.community_stats enable row level security;
grant select on public.community_stats to anon, authenticated;
grant all    on public.community_stats to service_role;
create policy "stats are public"        on public.community_stats for select using (true);
create policy "founders update stats"   on public.community_stats for update to authenticated
  using (public.has_role(auth.uid(), 'founder')) with check (public.has_role(auth.uid(), 'founder'));

insert into public.community_stats (members, ships_this_year, people_helped, pitch_decks)
values (null, null, null, 0);

-- ----------------------------------------------------------------------------
-- The ships feed.
--
-- Rows here are what the marquee renders. An empty table renders an empty
-- terminal with an honest "no ships logged yet" line, not placeholder traffic.

create table public.ships (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('shipped', 'merged', 'deployed', 'helped')),
  summary    text not null check (char_length(trim(summary)) between 1 and 160),
  happened_on date not null default current_date,
  published  boolean not null default true,
  created_at timestamptz not null default now()
);
create index ships_public on public.ships (happened_on desc) where published;
alter table public.ships enable row level security;
grant select on public.ships to anon, authenticated;
grant all    on public.ships to service_role;
create policy "published ships are public" on public.ships for select using (published);
create policy "founders manage ships"      on public.ships for all to authenticated
  using (public.has_role(auth.uid(), 'founder')) with check (public.has_role(auth.uid(), 'founder'));

-- ----------------------------------------------------------------------------
-- Contribution calendar.
--
-- The original synthesised 364 cells from a hash of the cell index and summed
-- them into "1,524 contributions across the community in the last year". This
-- table holds one row per day that actually had activity; days with no row
-- render as empty cells.

create table public.contribution_days (
  day   date primary key,
  count int not null default 0 check (count >= 0)
);
alter table public.contribution_days enable row level security;
grant select on public.contribution_days to anon, authenticated;
grant all    on public.contribution_days to service_role;
create policy "contributions are public" on public.contribution_days for select using (true);
create policy "founders manage contributions" on public.contribution_days for all to authenticated
  using (public.has_role(auth.uid(), 'founder')) with check (public.has_role(auth.uid(), 'founder'));

-- One call for the whole landing page, so the page costs a single round trip
-- instead of four.
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
      where day > current_date - interval '366 days'
    )
  )
$$;
grant execute on function public.public_site_data() to anon, authenticated, service_role;
