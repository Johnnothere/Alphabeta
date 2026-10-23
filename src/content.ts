/**
 * ============================================================================
 * ALPHABETA — site content.  EDIT THIS FILE to change what the site shows.
 * ============================================================================
 *
 * There is no database and no login. Everything the public site displays lives
 * here, in plain data. Add a build, announce an event, add a person, change a
 * social link — edit the arrays below and redeploy. Empty / omitted fields hide
 * themselves, so you can leave anything blank until you have it.
 *
 * Images live in `public/` and are referenced by path, e.g. "/builds/foo.png".
 * ============================================================================
 */

export type Social = {
  /** One of: github, x, linkedin, instagram, discord, youtube, web, email. */
  kind: "github" | "x" | "linkedin" | "instagram" | "discord" | "youtube" | "web" | "email";
  /** Full URL (or an email address for kind "email"). */
  href: string;
};

export type Build = {
  /** url-safe id, also the anchor. */
  slug: string;
  title: string;
  /** One short line — what it is. */
  blurb: string;
  /** Who made it. Each builder can carry their own social link. */
  builders: { name: string; social?: string }[];
  /** Tech used — short tokens, e.g. ["TypeScript", "React", "Postgres"]. */
  stack: string[];
  /** When it shipped — any readable string, e.g. "Oct 2026". */
  when: string;
  /** Cover image in /public, e.g. "/builds/site.png". Omit for a generated tile. */
  image?: string;
  /** Optional link to the live thing or its repo. */
  link?: string;
  /** Stage badge. */
  stage?: "shipped" | "building" | "prototype";
};

export type CommunityEvent = {
  slug: string;
  name: string;
  /** e.g. "1 Oct 2026" or "Late November 2026". */
  date: string;
  place: string;
  blurb: string;
  status: "upcoming" | "past";
  /** Optional link (sign-up, recap, photos). */
  link?: string;
};

export type Person = {
  name: string;
  /** Short, generic role — a few words. */
  role: string;
  blurb?: string;
  socials?: Social[];
};

// ---------------------------------------------------------------------------
// SOCIALS — the community's channels. Fill in the real URLs; delete the rest.
// (Leave an href empty string to hide that one.)
// ---------------------------------------------------------------------------
const SOCIALS_RAW: Social[] = [
  { kind: "github", href: "https://github.com/Johnnothere/Alphabeta" },
  // { kind: "instagram", href: "https://instagram.com/…" },
  // { kind: "discord", href: "https://discord.gg/…" },
  // { kind: "linkedin", href: "https://linkedin.com/company/…" },
  // { kind: "email", href: "team@alphabeta.dev" },
];
export const SOCIALS = SOCIALS_RAW.filter((s) => s.href);

// ---------------------------------------------------------------------------
// BUILDS — the registry. Who built what, when, with what. Add yours.
// The newest goes first.
// ---------------------------------------------------------------------------
export const BUILDS: Build[] = [
  {
    slug: "alphabeta-site",
    title: "alphabeta.site",
    blurb:
      "This site. A fast, backend-free home for the community and a public log of what we build.",
    builders: [{ name: "Tej", social: "https://github.com/Johnnothere" }],
    stack: ["TypeScript", "React", "TanStack Start", "Tailwind", "Railway"],
    when: "Oct 2026",
    image: "/builds/alphabeta-site.png",
    link: "https://github.com/Johnnothere/Alphabeta",
    stage: "shipped",
  },
  // Add a build:
  // {
  //   slug: "your-thing",
  //   title: "Your thing",
  //   blurb: "One line on what it does.",
  //   builders: [{ name: "You", social: "https://github.com/you" }],
  //   stack: ["TypeScript", "…"],
  //   when: "Nov 2026",
  //   image: "/builds/your-thing.png", // optional
  //   link: "https://…",               // optional
  //   stage: "shipped",
  // },
];

// ---------------------------------------------------------------------------
// EVENTS — upcoming first, then past.
// ---------------------------------------------------------------------------
export const EVENTS: CommunityEvent[] = [
  {
    slug: "launch",
    name: "The Launch",
    date: "Late November 2026",
    place: "University of Greenwich, London",
    blurb:
      "Our flagship night: a short talk, then we build. Open to builders from every institution. Date and sign-up announced soon.",
    status: "upcoming",
  },
  {
    slug: "hack-01",
    name: "hack/01",
    date: "1 Oct 2026",
    place: "King William 216, University of Greenwich",
    blurb: "A three-hour student web-app build. Entry by application. The first one out the door.",
    status: "past",
  },
];

// ---------------------------------------------------------------------------
// PEOPLE — who's behind it.
// ---------------------------------------------------------------------------
export const PEOPLE: Person[] = [
  {
    name: "Tej",
    role: "Co-founder",
    blurb: "Builder. Cyber security student at Greenwich.",
    socials: [{ kind: "github", href: "https://github.com/Johnnothere" }],
  },
  {
    name: "Mehedi",
    role: "Co-founder",
    blurb: "Builder.",
    // socials: [{ kind: "github", href: "https://github.com/…" }],
  },
  // The founding team (4–6) is forming — add people as they take a role.
];
