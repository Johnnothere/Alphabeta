/**
 * ============================================================================
 * ALPHABETA — site content.  EDIT THIS FILE to change what the site shows.
 * ============================================================================
 *
 * There is no database and no login. Everything the public site displays lives
 * here, in plain data. Add a build, write up an event, add a person, change a
 * social link — edit the arrays below and redeploy. Empty / omitted fields hide
 * themselves, so you can leave anything blank until you have it.
 *
 * Images live in `public/` and are referenced by path, e.g. "/builds/foo.png".
 * ============================================================================
 */

export type Social = {
  kind: "github" | "x" | "linkedin" | "instagram" | "discord" | "youtube" | "web" | "email";
  href: string;
};

/** A photo with an optional caption. Put the file in /public and point here. */
export type Shot = { src: string; caption?: string };

export type Build = {
  /** url-safe id, also the anchor. */
  slug: string;
  title: string;
  /** One short line for the card — what it is. */
  blurb: string;
  builders: { name: string; social?: string }[];
  stack: string[];
  when: string;
  /** Card cover in /public, e.g. "/builds/site.png". Omit for a generated tile. */
  image?: string;
  /** Optional link to the live thing or its repo (shown inside the detail view). */
  link?: string;
  stage?: "shipped" | "building" | "prototype";

  // --- the detail view (opens like a page when you click the card) ---------
  /** How we came to the problem. */
  origin?: string;
  /** What problem it solves. */
  problem?: string;
  /** Describe the app — what it does, how it works. */
  about?: string;
  /** Screens / product shots. */
  gallery?: Shot[];
  /** Behind the scenes — the team building it. */
  behindScenes?: Shot[];
};

export type CommunityEvent = {
  slug: string;
  name: string;
  date: string;
  place: string;
  blurb: string;
  status: "upcoming" | "past";
  link?: string;
  /** Longer write-up, shown when the event is opened. */
  recap?: string;
  gallery?: Shot[];
};

export type Person = {
  name: string;
  role: string;
  blurb?: string;
  socials?: Social[];
};

// ---------------------------------------------------------------------------
// SOCIALS — the community's channels. Fill in the real URLs; delete the rest.
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
// BUILDS — the registry. Click a card to open its story. Newest first.
// ---------------------------------------------------------------------------
export const BUILDS: Build[] = [
  {
    slug: "alphabeta-site",
    title: "alphabeta.site",
    blurb: "This site. A backend-free home for the community and a public log of what we build.",
    builders: [{ name: "Tej", social: "https://github.com/Johnnothere" }],
    stack: ["TypeScript", "React", "TanStack Start", "Tailwind", "Railway"],
    when: "Oct 2026",
    image: "/builds/alphabeta-site.png",
    link: "https://github.com/Johnnothere/Alphabeta",
    stage: "shipped",
    origin:
      "We kept describing ALPHABETA in DMs and slides. We wanted one honest place to point people to — not a pitch, but a living log of what the community actually makes.",
    problem:
      "Most society sites are templates that say a lot and show nothing. Ours had to be the opposite: a thing we shipped, that proves the point by existing, and that anyone can keep up with between build nights.",
    about:
      "A fully static site — no login, no database, nothing to break. A public registry of builds, a running record of events, and the people behind it. It loads instantly and costs almost nothing to run. Everything on it is edited as plain data and redeployed.",
    gallery: [],
    behindScenes: [],
  },
  // Add a build — see the comment block at the bottom of this file for a template.
];

// ---------------------------------------------------------------------------
// EVENTS — upcoming first, then past. Click to open the full write-up.
// ---------------------------------------------------------------------------
export const EVENTS: CommunityEvent[] = [
  {
    slug: "launch",
    name: "The Launch",
    date: "Late November 2026",
    place: "University of Greenwich, London",
    blurb: "Our flagship night: a short talk, then we build. Open to every institution.",
    status: "upcoming",
    recap:
      "The relaunch proper. A short talk to open the room, then we build together — bring something you're making or start something new. Cross-institution, no fuss. Exact date, room and sign-up go here the moment they're set.",
    gallery: [],
  },
  {
    slug: "hack-01",
    name: "hack/01",
    date: "1 Oct 2026",
    place: "King William 216, University of Greenwich",
    blurb: "A three-hour student web-app build. Entry by application. The first one out the door.",
    status: "past",
    recap:
      "Our first event out the door: a three-hour web-app build in the King William 216 lab at Greenwich, entry by application, students only. People turned up, scoped something small, and shipped it inside the window — the format the community is built around.",
    gallery: [],
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

// ---------------------------------------------------------------------------
// Template — copy into BUILDS above and fill in.
// ---------------------------------------------------------------------------
// {
//   slug: "your-thing",
//   title: "Your thing",
//   blurb: "One line for the card.",
//   builders: [{ name: "You", social: "https://github.com/you" }],
//   stack: ["TypeScript", "…"],
//   when: "Nov 2026",
//   image: "/builds/your-thing.png",
//   link: "https://…",
//   stage: "shipped",
//   origin: "How you hit the problem.",
//   problem: "What it solves.",
//   about: "What it does and how it works.",
//   gallery: [{ src: "/builds/your-thing-1.png", caption: "the main screen" }],
//   behindScenes: [{ src: "/builds/your-thing-bts.jpg", caption: "build night" }],
// },
