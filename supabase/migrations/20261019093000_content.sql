-- ============================================================================
-- Gallery, projects, meetups.
-- ============================================================================

create table public.gallery_items (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  kind       text not null default 'image' check (kind in ('image', 'video')),
  url        text not null,
  poster     text,
  caption    text,
  taken_on   date,
  created_at timestamptz not null default now()
);
alter table public.gallery_items enable row level security;
grant select, insert, update, delete on public.gallery_items to authenticated;
grant all on public.gallery_items to service_role;
create policy "members read gallery"    on public.gallery_items for select to authenticated using (public.is_member(auth.uid()));
create policy "founders manage gallery" on public.gallery_items for all    to authenticated using (public.has_role(auth.uid(), 'founder')) with check (public.has_role(auth.uid(), 'founder'));

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  builder     text not null,
  description text not null,
  stage       text not null default 'building' check (stage in ('research', 'building', 'beta', 'shipping', 'shipped')),
  stack       text,
  started_on  date not null default current_date,
  target_date date,
  created_at  timestamptz not null default now()
);
alter table public.projects enable row level security;
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
create policy "members read projects"    on public.projects for select to authenticated using (public.is_member(auth.uid()));
create policy "founders manage projects" on public.projects for all    to authenticated using (public.has_role(auth.uid(), 'founder')) with check (public.has_role(auth.uid(), 'founder'));

create table public.meetups (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  starts_at   timestamptz not null,
  location    text not null,
  details     text not null,
  leaders     text[] not null default '{}',
  connections text,
  created_at  timestamptz not null default now()
);
alter table public.meetups enable row level security;
grant select, insert, update, delete on public.meetups to authenticated;
grant all on public.meetups to service_role;
create policy "eligible members read meetups" on public.meetups
  for select to authenticated
  using (public.has_role(auth.uid(), 'founder')
         or (public.is_member(auth.uid()) and public.is_meetup_eligible(auth.uid())));
create policy "founders manage meetups" on public.meetups for all to authenticated
  using (public.has_role(auth.uid(), 'founder')) with check (public.has_role(auth.uid(), 'founder'));
