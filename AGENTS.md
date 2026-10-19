## Architecture rules

- Public landing sections live in `src/components/alphabeta/` (effects, sections, terminal);
  `src/routes/index.tsx` only composes them.
- Members area lives under `src/routes/_authenticated/vault*`. Access requires a row in
  `user_roles`, granted only by redeeming a hashed access code through
  `src/lib/access.functions.ts`. Codes never reach the browser, and the public terminal
  parks a single-use ticket rather than the passphrase.
- Meetup eligibility exists twice: `public.is_meetup_eligible` (enforced by RLS) and
  `src/lib/eligibility.ts` (UI + tests). **Change both together.**
- Founders-cannot-vouch is enforced by a database trigger on `vouches`, not just the UI.
- Anything the landing page presents as a measurement — member counts, the ships feed, the
  contribution calendar — reads from the database and renders nothing when empty. Do not
  reintroduce hardcoded figures: the page labels them "live" and "sampled", so inventing
  them makes the page a claim the community cannot support.
- Row-level security is the real authorisation boundary. Client-side role checks are there
  to shape the UI, never to protect data; every new table needs explicit policies and
  grants, and new `security definer` functions need `revoke execute ... from public`.
