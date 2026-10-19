-- ============================================================================
-- LOCAL DEVELOPMENT SEED ONLY.
--
-- The Supabase CLI applies this on `supabase db reset`, which runs against the
-- local stack. It is NOT applied by `supabase db push`, so none of this reaches
-- the hosted project. Keep it that way: the original project shipped demo
-- members, demo projects and two known access-code hashes inside the
-- migrations, which meant production came up pre-populated with fiction and
-- with credentials whose hashes were committed to the repo.
-- ============================================================================

insert into public.hackathons (name, held_on) values
  ('hack/01 — 3-hour web app build', '2026-10-01');

-- Demo rows so the members area is not empty while developing locally.
insert into public.projects (title, builder, description, stage, stack, started_on, target_date) values
  ('[demo] example project', '@demo', 'Local seed row. Delete before launch.', 'building', 'ts', current_date - 10, current_date + 20);

insert into public.ships (kind, summary, happened_on) values
  ('shipped', '[demo] seed row — replace with real activity', current_date - 1);

update public.community_stats
   set members = 12, ships_this_year = 1, people_helped = 3, measured_at = now();
