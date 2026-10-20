# alphabeta

The public site and members' area for ALPHABETA — a cross-disciplinary society
of builders in London, co-founded by Tej Gohil and Mehedi. Home base is the
University of Greenwich; members come from every institution.

Ported off Lovable Cloud. Runs on **GitHub → Railway → Supabase**.

- **Public site** (`/`) — manifesto, process, FAQ, join form, and a terminal
  easter egg (`/` or `⌘K`).
- **Members' vault** (`/vault`) — gated on an access code. Hackathon
  attendance, vouches, help records, and a meetup that unlocks on merit.

---

## Stack

| | |
|---|---|
| Framework | TanStack Start 1.168 (SSR) + TanStack Router |
| Build | Vite 8 + Nitro 3 (`node-server` preset) |
| UI | React 19, Tailwind 4, shadcn/ui |
| Data & auth | Supabase (Postgres + Auth + row-level security) |
| Host | Railway (Railpack builder) |
| Node | 22.x, npm pinned to 11.21.1 |

> **Why npm is pinned.** npm 10, which ships with Node 22, crashes during peer
> resolution on vitest 4's optional-peer set (`Cannot read properties of null
> (reading 'edgesOut')`). npm 11 resolves it. `packageManager` in
> `package.json` pins it; CI and the Railway build activate it via Corepack.

---

## Local development

```bash
cp .env.example .env          # then fill in your Supabase values
npm install
npm run dev                   # http://localhost:3000
```

With the Supabase CLI and Docker, for a full local stack:

```bash
supabase start                # applies supabase/migrations + supabase/seed.sql
npm run db:types              # regenerate src/integrations/supabase/types.ts
```

| Script | |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build into `.output/` |
| `npm start` | run the built server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | eslint + prettier |
| `npm test` | vitest |
| `npm run db:push` | apply migrations to the linked project |
| `npm run db:reset` | rebuild the local database from migrations + seed |
| `npm run code:new` | mint an access code (see below) |

---

## Deploying

### 1. Supabase — already done

Project **Alphabeta** (`flrjcieggmooekkwgeqs`, London / eu-west-2) exists and
all seven migrations are applied. Nothing to run.

To work against it locally:

```bash
supabase link --project-ref flrjcieggmooekkwgeqs
supabase migration list     # should show all seven as applied both sides
```

> **A Supabase-specific trap, already fixed here.** Supabase ships
> `alter default privileges in schema public grant all on tables/functions to
> anon, authenticated`. That grant lands on every new object directly, so a
> `revoke execute ... from public` in a migration does not remove it — PUBLIC
> and `anon` are different grantees. Tables were mostly covered by RLS, but
> functions have no RLS, so every `security definer` function was callable by
> anonymous users over the REST API — including `redeem_code`, which grants
> roles and trusts its arguments. `20261019143517_harden_default_privileges.sql`
> revokes everything and re-grants only what each role needs. A plain Postgres
> instance has no such default privileges, so this cannot be caught locally —
> run `get_advisors` (or the dashboard's Security Advisor) after any migration
> that adds a function.

Then, in the dashboard:

- **Authentication → URL Configuration**
  - *Site URL*: your production origin (Railway gives you
    `https://<service>.up.railway.app` until you attach a domain).
  - *Redirect URLs*: `https://<your-domain>/**` and `http://localhost:3000/**`.
    The globstar matters — `/*` does not match `/auth/callback`.
- **Authentication → Providers → Google** (only if you want Google sign-in).
  In the Google Cloud console, the *authorised redirect URI* is Supabase's
  callback, `https://<project-ref>.supabase.co/auth/v1/callback` — not your own
  domain.
- **JWT signing keys**: switch to asymmetric keys if the project is still on the
  legacy symmetric secret. Server-side token verification then happens locally
  against a cached JWKS instead of a network round trip on every call.

### 2. Railway

Connect the repo. `railway.json` already sets the builder, build command and
start command. Add these service variables:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | publishable / anon key |
| `SUPABASE_URL` | same URL |
| `SUPABASE_ANON_KEY` | same key |
| `SUPABASE_SERVICE_ROLE_KEY` | **service role key — never prefix with `VITE_`** |
| `HOST` | `0.0.0.0` |
| `RAILPACK_NO_SPA` | `1` |
| `TRUSTED_PROXY_HOPS` | `1` |
| `TRUSTED_IP_HEADER` | leave unset on Railway (see below) |

`VITE_SITE_URL` and `VITE_BUILD_SHA` are **not** needed on Railway — the build
reads Railway's own `RAILWAY_PUBLIC_DOMAIN` and `RAILWAY_GIT_COMMIT_SHA`. Set
`VITE_SITE_URL` only if you attach a custom domain. Don't try
`${{RAILWAY_GIT_COMMIT_SHA}}`: Railway's reference syntax resolves your own
variables only, so it silently produces nothing.

Two of those are load-bearing and easy to miss:

- **`RAILPACK_NO_SPA=1`** — Railpack detects a Vite project and, by default,
  serves it as a *static* site from `dist`. That would publish the client bundle
  and never start the SSR server. The explicit `startCommand` in `railway.json`
  is the other half of this belt and braces.
- **`VITE_*` variables are read at build time.** Vite inlines them into the
  browser bundle, so changing one only takes effect on the next build. Railway
  also *stages* variable edits — you have to deploy for them to apply.

### 3. GitHub

Two workflows:

- `.github/workflows/ci.yml` — lint, typecheck, test, build on every PR.
- `.github/workflows/migrate.yml` — applies `supabase/migrations/**` on push to
  `main`. Needs repository secrets `SUPABASE_ACCESS_TOKEN`,
  `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`.

Migrations run here rather than in the Railway build on purpose: Railway builds
can run concurrently per deploy, which is not safe for `db push`, and the web
service has no reason to hold the database password.

> **This workflow has never succeeded yet**: the three secrets above are not
> set on the repository, so every run fails at `supabase link`. Until they are
> set, apply new migrations by hand (Supabase SQL editor, the MCP, or
> `supabase db push` from a linked local checkout). Migrations here are
> written to be idempotent so a later `db push` re-applying them is harmless.

### 4. Bootstrap the first founder

No founder exists yet, so the admin UI cannot mint the first code. Do it once
from the command line:

```bash
SUPABASE_DB_URL='postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres' \
  npm run code:new -- --label "founder bootstrap" --role founder --max-uses 1 --expires-days 7
```

It prints the code once; only the SHA-256 hash is stored. Sign up on the site,
then enter the code on the bind screen. From then on, mint codes in
`/vault/admin`.

---

## How access works

1. A visitor opens the terminal (`/` or `⌘K`) and runs `sudo access`.
2. `checkAccessCode` hashes the input, rate-limits by IP (8 tries per 15
   minutes, counted and recorded in one locked database call —
   `record_code_attempt` — so a burst of parallel requests cannot slip under
   the limit together), and on a match issues a **single-use ticket** that
   expires in 30 minutes. The passphrase itself never goes into browser
   storage. If the limiter itself cannot run, the guess is refused. The
   attempt and ticket tables prune themselves probabilistically on each call,
   so nothing needs a scheduler.
3. They sign up or sign in. `/vault` redeems the ticket through
   `redeem_code`, which does the use-counting, the redemption record, and the
   role grant in one transaction with the code row locked.
4. Row-level security — not the UI — decides what they can read from then on.

Member-facing dropdowns and the founders' eligibility table list **members**
only — accounts that signed up but never redeemed a code are invisible to
everyone but themselves (`20261020160000_members_only_directory.sql`).

The quiet-room meetup unlocks on **any one** of: three consecutive hackathons,
three vouches from members (founders cannot vouch), or ten distinct members
helped and confirmed. The rule lives in `public.is_meetup_eligible` and is
enforced by an RLS policy; `src/lib/eligibility.ts` mirrors it for the UI.
**Change both together.**

---

## Things worth knowing

**The landing page numbers are real or absent.** The member count, ships feed
and contribution calendar read from `community_stats`, `ships` and
`contribution_days`. A `null` stat drops its tile, an empty ships table shows
"no ships logged yet", and an empty calendar hides the section. The page labels
these "live" and describes them as sampled, so inventing them would make the
page a claim the community cannot support. Fill the tables from
`/vault/admin` or SQL; do not hardcode figures back into the components.

**Client IP for rate limiting.** `X-Forwarded-For` is client-appendable — its
left-most entry is whatever the caller claimed. `src/lib/client-ip.ts` counts
back from the right by `TRUSTED_PROXY_HOPS` instead. Railway's edge *appends*
to the chain (measured on Railway's community forum, and its staff name the
right-most value as the trustworthy one), so `1` is correct there.

Single-value headers (`CF-Connecting-IP`, `True-Client-IP`, `X-Real-IP`) are
**not** trusted by default: Railway does not set the first two at all — they
pass through from the caller — and has had a bug where a caller's `X-Real-IP`
survived next to the edge's copy. An earlier version of this file preferred
them, which let anyone bypass the access-code limiter with one spoofed header.
If you put a proxy in front that genuinely overwrites one (Cloudflare does for
`cf-connecting-ip`), set `TRUSTED_IP_HEADER` to its name and bump
`TRUSTED_PROXY_HOPS` to `2`. A chain *shorter* than the hop count is treated
as an unknown caller (shared bucket) rather than falling back to the
left-most, spoofable entry — so a hop count set too high fails closed.

**`robots.txt` and `sitemap.xml` are routes**, not files in `public/`, so the
sitemap line carries the real absolute origin. **`og.png`** is generated from
`scripts/og-card.html` (open it in a browser at 1200×630 and screenshot, or use
headless Chromium) — regenerate it if the headline changes.

**`public/.well-known/security.txt`** points reports at this repo's GitHub
security advisories, with `SECURITY.md` as the policy. Keep `Expires` in the
future.

**Security headers** (`nosniff`, `X-Frame-Options`, HSTS, referrer and
permissions policies) are added to every response in `src/start.ts`. There is
no Content-Security-Policy yet: Start's SSR emits inline scripts, so a useful
CSP needs per-request nonces threaded through the framework.

---

## Layout

```
src/
  components/alphabeta/   public landing page: effects, sections, terminal
  routes/
    index.tsx             landing page (composes the sections)
    robots[.]txt.ts       robots.txt with an absolute sitemap URL
    sitemap[.]xml.ts      sitemap.xml for the public page
    auth.tsx              sign in / sign up
    auth_.callback.tsx    OAuth + email confirmation landing
    _authenticated/       members' vault (route guard + pages)
  lib/
    access.functions.ts   server functions: check / redeem / create codes
    join.functions.ts     rate-limited public join requests
    eligibility.ts        meetup rules, mirrored from SQL
    client-ip.ts          trusted client IP resolution
    site.ts               site name, origin, build id, description
    site-data.ts          landing page data query
  integrations/supabase/  clients, auth middleware, generated types
supabase/migrations/      schema, policies, functions
scripts/new-access-code.mjs
```

See `AGENTS.md` for the architectural rules that are easy to break.
