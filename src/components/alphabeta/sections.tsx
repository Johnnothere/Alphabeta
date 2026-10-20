import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { submitJoinRequest } from "@/lib/join.functions";
import { EMPTY_SITE_DATA, siteDataQuery, type SiteData } from "@/lib/site-data";
import { HASH, SITE_REPO, VERSION } from "@/lib/site";
import { CountUp, Decode, GlowCard, Rotor } from "./effects";

export function useSiteData(): SiteData {
  const { data } = useQuery(siteDataQuery);
  return data ?? EMPTY_SITE_DATA;
}

export function Label({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="mb-4 font-mono text-xs text-muted-foreground">
      // {n} {children}
    </p>
  );
}

export function Hero() {
  return (
    <header
      id="top"
      className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center"
    >
      <div aria-hidden className="dot-grid absolute inset-0" />
      <div
        aria-hidden
        className="orb absolute left-[15%] top-[20%] h-72 w-72 rounded-full bg-signal/10 blur-3xl"
      />
      <div
        aria-hidden
        className="orb absolute bottom-[15%] right-[15%] h-80 w-80 rounded-full bg-syn-fn/10 blur-3xl [animation-delay:-9s]"
      />
      <p className="relative mb-6 font-mono text-xs text-muted-foreground">
        <span className="pulse-dot text-signal">●</span> build {HASH} · status: shipping
      </p>
      <h1 className="relative max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-7xl md:text-8xl">
        <Decode text="Build. Ship." />
        <br />
        <span className="text-muted-foreground">
          <Decode text="Help others ship." delay={500} />
        </span>
      </h1>
      <p className="relative mt-8 max-w-lg text-lg text-muted-foreground">
        Alphabeta is a society of builders in London — home base at the University of Greenwich,
        open to every institution. No fuss, no hype — only building things and helping people build
        theirs.
      </p>
      <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3">
        <a
          href="#join"
          className="glass rounded-full px-6 py-3 font-mono text-sm transition-transform hover:scale-[1.03]"
        >
          <span className="text-signal">$</span> ./join --no-fuss
          <span className="caret ml-1" aria-hidden>
            ▍
          </span>
        </a>
        <span className="font-mono text-[11px] text-dim">
          or press <kbd className="rounded border border-glass-border px-1">/</kbd>
        </span>
      </div>
      <p aria-hidden className="absolute bottom-8 font-mono text-[10px] text-faint">
        scroll ↓ · 0x00ff
      </p>
    </header>
  );
}

export function Stats() {
  const { stats } = useSiteData();
  // Nothing published: the grid would be four empty boxes, so skip it entirely
  // rather than print zeros that read as measurements.
  if (!stats.length) return null;

  // The column count follows how many numbers are actually published, so a
  // partial set stays balanced instead of leaving stretched empty cells.
  const cols =
    stats.length >= 4
      ? "grid-cols-2 md:grid-cols-4"
      : stats.length === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : stats.length === 2
          ? "grid-cols-2"
          : "grid-cols-1";

  return (
    <section aria-label="Community numbers" className="mx-auto max-w-6xl px-6">
      <div
        className={`glass mx-auto grid divide-x divide-y divide-glass-border overflow-hidden rounded-2xl md:divide-y-0 ${cols} ${
          stats.length === 1 ? "max-w-xs text-center" : ""
        }`}
      >
        {stats.map((s) => (
          <div key={s.label} className="p-6">
            <div className="font-mono text-3xl font-medium tracking-tight md:text-4xl">
              <CountUp to={s.value ?? 0} />
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Manifesto() {
  return (
    <section id="manifesto" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-32">
      <Label n="01">manifesto</Label>
      <h2 className="mb-14 text-4xl font-semibold tracking-tight md:text-5xl">
        <Decode text="Three rules. That's it." />
      </h2>
      <div className="grid gap-5 md:grid-cols-3">
        {(
          [
            ["0x01", "No fuss", "No politics, no gatekeeping, no endless talk. Show the code."],
            [
              "0x02",
              "Only building",
              "Every member ships. Demos beat decks. Commits beat opinions.",
            ],
            [
              "0x03",
              "Help others build",
              "Unblock someone every week. Knowledge compiled, not hoarded.",
            ],
          ] as const
        ).map(([k, t, d], i) => (
          <GlowCard key={k} className="p-8">
            <span className="font-mono text-xs text-signal">{k}</span>
            <h3 className="mt-10 text-2xl font-semibold tracking-tight">
              <Decode text={t} delay={i * 200} />
            </h3>
            <p className="mt-3 text-muted-foreground">{d}</p>
          </GlowCard>
        ))}
      </div>
    </section>
  );
}

export function Rotors() {
  return (
    <section aria-label="Rotors" className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-col items-center gap-6">
        <p className="font-mono text-xs text-muted-foreground">
          // rotors I · II · III · reflector B — ringstellung ALPHA
        </p>
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
          {"ALPHABETA".split("").map((c, i) => (
            <Rotor key={i} target={c} delay={i * 160} />
          ))}
        </div>
        <p className="font-mono text-[10px] text-dim">click a rotor to step it</p>
      </div>
    </section>
  );
}

const SHADES = [
  "bg-muted/60",
  "bg-signal/20",
  "bg-signal/40",
  "bg-signal/65",
  "bg-signal",
] as const;

/** Buckets a day's contribution count onto the five-step colour ramp. */
function shade(count: number) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

export function CommitGraph() {
  const { contributions, contributionTotal } = useSiteData();

  // 53 columns ending on the current week, so the right-hand edge is today —
  // the same shape GitHub uses.
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 364 - start.getUTCDay());

  const cells = Array.from({ length: 53 * 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const future = d > today;
    return { iso, count: future ? -1 : (contributions[iso] ?? 0), future };
  });

  if (!contributionTotal) return null;

  return (
    <section aria-label="Community activity" className="mx-auto max-w-6xl px-6 py-16">
      <div className="glass overflow-hidden rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 font-mono text-xs text-muted-foreground">
          <span>
            {contributionTotal.toLocaleString("en-US")} contributions across the community in the
            last year
          </span>
          <span className="flex items-center gap-1">
            less
            {SHADES.map((s) => (
              <span key={s} className={`h-2.5 w-2.5 rounded-[2px] ${s}`} />
            ))}
            more
          </span>
        </div>
        {/* Columns share the card width; below ~760px it scrolls rather than squashing. */}
        <div className="overflow-x-auto">
          <div className="grid min-w-[740px] auto-cols-fr grid-flow-col grid-rows-7 gap-[3px]">
            {cells.map((c) => (
              <span
                key={c.iso}
                title={c.future ? undefined : `${c.count} on ${c.iso}`}
                className={`aspect-square rounded-[2px] ${
                  c.future ? "bg-transparent" : SHADES[shade(c.count)]
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    ["git checkout -b you", "Apply", "Send what you've built. Links, repos, demos. No CVs."],
    [
      "git commit -m 'ship'",
      "Ship something",
      "Build in public with the community. Show up to hackathons.",
    ],
    ["git merge --no-ff", "Get vouched", "Members who've seen your work vouch for you. You're in."],
  ] as const;
  return (
    <section id="process" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-32">
      <Label n="02">process</Label>
      <h2 className="mb-14 text-4xl font-semibold tracking-tight md:text-5xl">
        <Decode text="How you get merged." />
      </h2>
      <div className="relative">
        <svg
          aria-hidden
          viewBox="0 0 1000 60"
          preserveAspectRatio="none"
          className="mb-6 hidden h-14 w-full md:block"
        >
          <path
            d="M0 45 H1000"
            className="stroke-muted-foreground/30"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M120 45 C200 45 200 12 280 12 H720 C800 12 800 45 880 45"
            className="draw-path stroke-signal"
            strokeWidth="2"
            fill="none"
          />
          {[120, 500, 880].map((x, i) => (
            <circle
              key={x}
              cx={x}
              cy={i === 1 ? 12 : 45}
              r="6"
              className="fill-background stroke-signal"
              strokeWidth="2"
            />
          ))}
        </svg>
        <ol className="grid gap-5 md:grid-cols-3">
          {steps.map(([cmd, t, d]) => (
            <li key={t} className="glass rounded-2xl p-6">
              <p className="font-mono text-xs text-signal">$ {cmd}</p>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{t}</h3>
              <p className="mt-2 text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Builds() {
  const { ships } = useSiteData();
  // The marquee needs the list twice to loop seamlessly, so one entry would
  // scroll past itself; below three it reads better as a static list.
  const loop = ships.length >= 3;
  const rows = loop ? [...ships, ...ships] : ships;

  return (
    <section
      id="builds"
      className="mx-auto grid max-w-6xl scroll-mt-24 gap-12 px-6 py-32 md:grid-cols-2 md:items-center"
    >
      <div>
        <Label n="03">builds</Label>
        <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
          <Decode text="tail -f /var/log/ships" />
        </h2>
        <p className="mt-6 max-w-md text-muted-foreground">
          A feed of what members ship, merge and unblock. Quiet. Constant. Real.
        </p>
      </div>
      <div className="glass flex h-80 flex-col overflow-hidden rounded-2xl font-mono text-sm">
        <div className="flex shrink-0 items-center gap-1.5 border-b border-glass-border px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-muted" />
          <span className="h-3 w-3 rounded-full bg-muted" />
          <span className="h-3 w-3 rounded-full bg-muted" />
          <span className="ml-3 text-[11px] text-muted-foreground">ships.log</span>
        </div>
        {/* The marquee needs its own clipping context. Clipping only on the
            outer card let the scrolling rows travel up over the title bar. */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {rows.length ? (
            <div
              className={`px-5 py-3 ${loop ? "log-scroll hover:[animation-play-state:paused]" : ""}`}
            >
              {rows.map((s, i) => (
                <div key={i} className="py-1.5 text-muted-foreground">
                  <span className="text-faint">
                    {String(i % (ships.length || 1)).padStart(3, "0")}{" "}
                  </span>
                  <span className="text-signal" aria-hidden>
                    ✓
                  </span>{" "}
                  <span className="inline-block w-[4.75rem] text-dim">{s.kind}</span>
                  {s.summary}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-4 text-muted-foreground">
              <p>$ tail -f /var/log/ships</p>
              <p className="mt-2 text-dim">no ships logged yet.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function RulesCode() {
  const lines = [
    <>
      <span className="text-syn-key">export const</span> member = {"{"}
    </>,
    <>
      {"  "}ships: <span className="text-syn-str">"weekly"</span>,
    </>,
    <>
      {"  "}talks: <span className="text-syn-str">"only with code"</span>,
    </>,
    <>
      {"  "}helps: <span className="text-syn-fn">unblock</span>(
      <span className="text-syn-str">"anyone"</span>),
    </>,
    <>
      {"  "}ego: <span className="text-syn-key">null</span>,
    </>,
    <>
      {"}"} <span className="text-syn-key">satisfies</span> Builder;
    </>,
    <> </>,
    <>
      <span className="text-muted-foreground">// if (hype &gt; output) process.exit(1);</span>
    </>,
  ];
  return (
    <section id="rules" className="mx-auto max-w-4xl scroll-mt-24 px-6 py-32">
      <Label n="04">rules.ts</Label>
      <div className="glass overflow-hidden rounded-2xl">
        <div className="flex justify-between border-b border-glass-border px-4 py-3 font-mono text-xs text-muted-foreground">
          <span>alphabeta/rules.ts</span>
          <span>TypeScript · UTF-8 · LF</span>
        </div>
        <pre className="overflow-x-auto p-6 font-mono text-sm leading-7">
          {lines.map((l, i) => (
            <div key={i} className="rounded px-1 hover:bg-accent/50">
              <span className="mr-6 inline-block w-4 select-none text-right text-faint" aria-hidden>
                {i + 1}
              </span>
              {l}
            </div>
          ))}
        </pre>
      </div>
    </section>
  );
}

export function ManPage() {
  const faq = [
    ["Is it free?", "Yes. You pay in shipped work and in time spent helping others."],
    [
      "Who can join?",
      "Anyone who builds, from any university or none. Show us something you made: a repo, a demo, a product.",
    ],
    [
      "Where are you?",
      "London. Home base is the University of Greenwich, where the hackathons run — the first one was a three-hour web-app build in the King William lab. Members come from across institutions.",
    ],
    [
      "Is it remote?",
      "No. We build in the same room. The ships log and the vault are online so you can keep up between sessions, but the work happens in person.",
    ],
    [
      "What's cross-disciplinary about it?",
      "Code is the common language, not the only one. Design, hardware, security, data, writing — if you make things, you fit.",
    ],
    [
      "What gets you removed?",
      "Hype with no output, gatekeeping, or treating help as a transaction.",
    ],
  ] as const;
  return (
    <section id="man" className="mx-auto max-w-4xl scroll-mt-24 px-6 py-32">
      <Label n="05">man alphabeta</Label>
      <div className="glass rounded-2xl p-6 font-mono text-sm leading-7 md:p-8">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>ALPHABETA(7)</span>
          <span>Builder's Manual</span>
          <span className="hidden sm:inline">ALPHABETA(7)</span>
        </div>
        <p className="mt-6 font-semibold">NAME</p>
        <p className="pl-8 text-muted-foreground">
          alphabeta — a cross-disciplinary society of people who build, London
        </p>
        <p className="mt-4 font-semibold">SYNOPSIS</p>
        <p className="pl-8 text-muted-foreground">
          alphabeta [<span className="text-signal">--ship</span>] [
          <span className="text-signal">--help-others</span>] [--no-fuss]
        </p>
        <p className="mt-4 font-semibold">FAQ</p>
        {faq.map(([q, a]) => (
          <details key={q} className="group pl-8">
            {/* `list-none` alone leaves Safari's disclosure triangle in place;
                the ::-webkit-details-marker rule in styles.css removes it. */}
            <summary className="cursor-pointer list-none py-1 text-foreground hover:text-signal">
              <span className="text-muted-foreground group-open:text-signal" aria-hidden>
                {"> "}
              </span>
              {q}
            </summary>
            <p className="pb-2 pl-4 font-sans text-muted-foreground">{a}</p>
          </details>
        ))}
        <p className="mt-4 font-semibold">SEE ALSO</p>
        <p className="pl-8 text-muted-foreground">
          git(1), ship(1),{" "}
          <a href="/humans.txt" className="underline decoration-dotted hover:text-signal">
            humans.txt
          </a>
          ,{" "}
          <a
            href={SITE_REPO}
            rel="noopener noreferrer"
            className="underline decoration-dotted hover:text-signal"
          >
            source
          </a>
        </p>
      </div>
    </section>
  );
}

export function Join() {
  const submit = useServerFn(submitJoinRequest);
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [res, setRes] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setRes({ tone: "err", text: "400 · invalid address" });
      return;
    }
    setBusy(true);
    try {
      const r = await submit({
        data: { email: email.trim(), link: link.trim(), confirmUrl: honeypot },
      });
      if (!r.ok) {
        setRes({
          tone: "err",
          text:
            r.reason === "throttled"
              ? "429 · too many requests, try later"
              : "503 · try again in a moment",
        });
        return;
      }
      setRes({ tone: "ok", text: `202 Accepted · ${email.trim()} queued` });
      setEmail("");
      setLink("");
    } catch {
      setRes({ tone: "err", text: "503 · try again in a moment" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="join" className="mx-auto max-w-2xl scroll-mt-24 px-6 py-32 text-center">
      <Label n="06">join</Label>
      <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
        <Decode text="Request access." />
      </h2>
      <p className="mt-5 text-muted-foreground">
        Tell us where to send the handshake. Bring something you built.
      </p>
      <GlowCard className="mt-10 p-4">
        <form className="space-y-2 text-left" onSubmit={onSubmit}>
          <div className="flex gap-2">
            <label htmlFor="join-email" className="sr-only">
              Email address
            </label>
            <input
              id="join-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.dev"
              className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3 font-mono text-sm outline-none placeholder:text-dim focus:bg-accent/30"
            />
            <button
              disabled={busy}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "…" : "Request"}
            </button>
          </div>
          {/* The page asks applicants to bring something they built, but the
              original form collected an address and nothing else — leaving
              founders a list of emails with nothing to review. */}
          <label htmlFor="join-link" className="sr-only">
            Link to something you built
          </label>
          <input
            id="join-link"
            name="link"
            type="text"
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="github.com/you/thing · or a live demo"
            className="w-full rounded-xl bg-transparent px-4 py-2.5 font-mono text-sm outline-none placeholder:text-dim focus:bg-accent/30"
          />
          {/* Honeypot: off-screen and aria-hidden, so no person ever fills it. */}
          <div className="absolute left-[-9999px]" aria-hidden>
            <label htmlFor="confirm-url">Leave this empty</label>
            <input
              id="confirm-url"
              name="confirmUrl"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>
        </form>
      </GlowCard>
      <p
        className={`mt-4 min-h-5 font-mono text-xs ${res?.tone === "err" ? "text-destructive" : "text-signal"}`}
        role="status"
        aria-live="polite"
      >
        {res && <>&gt; {res.text}</>}
      </p>
    </section>
  );
}

const BIN = "alphabeta"
  .split("")
  .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
  .join(" ");

export function Footer() {
  return (
    <footer className="border-t border-glass-border px-6 py-10 font-mono text-[11px] text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4">
        <span>
          alphabeta v{VERSION}-{HASH} ·{" "}
          <a href="/humans.txt" className="hover:text-foreground">
            humans.txt
          </a>
        </span>
        <span className="hidden text-faint md:inline" title="ascii → binary" aria-hidden>
          {BIN}
        </span>
        <span>
          press <kbd>/</kbd> for shell · <kbd>?</kbd> for keys
        </span>
      </div>
    </footer>
  );
}
