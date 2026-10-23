import { BUILDS, EVENTS, PEOPLE, SOCIALS, type Build, type Person } from "@/content";
import { HASH, SITE_REPO, VERSION } from "@/lib/site";
import { socialHref, SocialIcon, socialLabel } from "./icons";
import { Decode, GlowCard } from "./effects";

export function Label({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="mb-4 font-mono text-xs text-muted-foreground">
      // {n} {children}
    </p>
  );
}

export function Hero() {
  const next = EVENTS.find((e) => e.status === "upcoming");
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
        <span className="pulse-dot text-signal">●</span> a society of builders · London · Greenwich
      </p>
      <h1 className="relative max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-7xl md:text-8xl">
        <Decode text="Build. Ship." />
        <br />
        <span className="text-muted-foreground">
          <Decode text="Help others ship." delay={500} />
        </span>
      </h1>
      <p className="relative mt-8 max-w-lg text-lg text-muted-foreground">
        A cross-disciplinary community of builders — open to every institution. No fuss, no hype: we
        make things, in the same room, and help each other finish.
      </p>
      <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3">
        <a
          href="#registry"
          className="glass rounded-full px-6 py-3 font-mono text-sm transition-transform hover:scale-[1.03]"
        >
          <span className="text-signal">$</span> ./see --what-we-built
        </a>
        <a
          href="#join"
          className="rounded-full border border-glass-border px-6 py-3 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          join us
        </a>
        <span className="font-mono text-[11px] text-dim">
          or press <kbd className="rounded border border-glass-border px-1">/</kbd>
        </span>
      </div>
      {next && (
        <a
          href="#events"
          className="relative mt-8 inline-flex items-center gap-2 font-mono text-[11px] text-dim hover:text-signal"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" />
          next: {next.name} · {next.date}
        </a>
      )}
      <p aria-hidden className="absolute bottom-8 font-mono text-[10px] text-faint">
        scroll ↓ · 0x00ff
      </p>
    </header>
  );
}

export function Manifesto() {
  return (
    <section id="manifesto" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-28">
      <Label n="01">manifesto</Label>
      <h2 className="mb-14 text-4xl font-semibold tracking-tight md:text-5xl">
        <Decode text="Three rules. That's it." />
      </h2>
      <div className="grid gap-5 md:grid-cols-3">
        {(
          [
            ["0x01", "No fuss", "No politics, no gatekeeping, no endless talk. Show the work."],
            [
              "0x02",
              "Only building",
              "Everyone makes something. Demos beat decks. Commits beat opinions.",
            ],
            ["0x03", "Help others build", "Unblock someone. Knowledge compiled, not hoarded."],
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

/** A generated cover for a build with no photo: a calm gradient + its initials. */
function CoverTile({ title }: { title: string }) {
  const initials =
    title
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase() || "AB";
  return (
    <div className="dot-grid relative flex h-full w-full items-center justify-center bg-gradient-to-br from-signal/15 via-transparent to-syn-fn/15">
      <span className="font-mono text-4xl font-semibold text-foreground/70">{initials}</span>
    </div>
  );
}

function BuildCard({ build }: { build: Build }) {
  const stageColor =
    build.stage === "building"
      ? "text-syn-fn"
      : build.stage === "prototype"
        ? "text-muted-foreground"
        : "text-signal";
  return (
    <GlowCard className="group flex flex-col overflow-hidden">
      <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-glass-border">
        {build.image ? (
          <img
            src={build.image}
            alt={build.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <CoverTile title={build.title} />
        )}
        {build.stage && (
          <span
            className={`absolute left-3 top-3 rounded-full border border-glass-border bg-background/70 px-2 py-0.5 font-mono text-[10px] ${stageColor} backdrop-blur`}
          >
            ● {build.stage}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-tight">{build.title}</h3>
          <span className="shrink-0 font-mono text-[11px] text-dim">{build.when}</span>
        </div>
        <p className="mt-2 flex-1 text-sm text-muted-foreground">{build.blurb}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {build.stack.map((s) => (
            <span
              key={s}
              className="rounded border border-glass-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            >
              {s}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-glass-border pt-3">
          <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
            {build.builders.map((b) =>
              b.social ? (
                <a
                  key={b.name}
                  href={b.social}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-signal"
                >
                  @{b.name}
                </a>
              ) : (
                <span key={b.name}>@{b.name}</span>
              ),
            )}
          </div>
          {build.link && (
            <a
              href={build.link}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 font-mono text-[11px] text-signal hover:underline"
            >
              open ↗
            </a>
          )}
        </div>
      </div>
    </GlowCard>
  );
}

export function Registry() {
  return (
    <section id="registry" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-28">
      <Label n="02">registry</Label>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
          <Decode text="What we've built." />
        </h2>
        <p className="max-w-sm font-mono text-xs text-muted-foreground">
          A public log of what members ship — who made it, when, and with what. The newest first.
        </p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {BUILDS.map((b) => (
          <div key={b.slug} id={b.slug} className="scroll-mt-24">
            <BuildCard build={b} />
          </div>
        ))}
        {/* Honest, on-brand invitation rather than filler projects. */}
        <a
          href="#join"
          className="glass flex min-h-[18rem] flex-col items-center justify-center rounded-2xl border-dashed p-6 text-center font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
          style={{ borderStyle: "dashed" }}
        >
          <span className="text-2xl text-signal">+</span>
          <span className="mt-3">$ git commit -m &apos;your build&apos;</span>
          <span className="mt-1 text-xs text-dim">build something · it goes here</span>
        </a>
      </div>
    </section>
  );
}

export function Events() {
  const upcoming = EVENTS.filter((e) => e.status === "upcoming");
  const past = EVENTS.filter((e) => e.status === "past");
  return (
    <section id="events" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-28">
      <Label n="03">events</Label>
      <h2 className="mb-12 text-4xl font-semibold tracking-tight md:text-5xl">
        <Decode text="We build in the room." />
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        {upcoming.map((e) => (
          <GlowCard key={e.slug} className="flex flex-col p-7">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-3 py-1 font-mono text-[11px] text-signal">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" /> upcoming
            </span>
            <h3 className="mt-5 text-2xl font-semibold tracking-tight">{e.name}</h3>
            <p className="mt-1 font-mono text-sm text-signal">{e.date}</p>
            <p className="font-mono text-xs text-muted-foreground">{e.place}</p>
            <p className="mt-4 flex-1 text-muted-foreground">{e.blurb}</p>
            {e.link && (
              <a
                href={e.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 font-mono text-sm text-signal hover:underline"
              >
                → details &amp; sign-up
              </a>
            )}
          </GlowCard>
        ))}
      </div>
      {past.length > 0 && (
        <>
          <p className="mb-5 mt-14 font-mono text-xs text-muted-foreground">// shipped</p>
          <div className="glass overflow-hidden rounded-2xl">
            {past.map((e) => (
              <div
                key={e.slug}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-glass-border px-6 py-4 last:border-0"
              >
                <span className="font-mono text-sm text-signal">{e.date}</span>
                <span className="font-semibold tracking-tight">{e.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{e.place}</span>
                <p className="w-full text-sm text-muted-foreground sm:w-auto sm:flex-1">
                  {e.blurb}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function PersonCard({ p }: { p: Person }) {
  const initials = p.name.slice(0, 2).toUpperCase();
  return (
    <GlowCard className="flex items-start gap-4 p-6">
      <div className="dot-grid flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-signal/20 to-syn-fn/20 font-mono text-sm font-semibold text-foreground/80">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold tracking-tight">{p.name}</h3>
          <span className="shrink-0 font-mono text-[11px] text-signal">{p.role}</span>
        </div>
        {p.blurb && <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>}
        {p.socials && p.socials.length > 0 && (
          <div className="mt-3 flex gap-3 text-muted-foreground">
            {p.socials.map((s) => (
              <a
                key={s.kind}
                href={socialHref(s)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={socialLabel(s.kind)}
                className="hover:text-signal"
              >
                <SocialIcon kind={s.kind} />
              </a>
            ))}
          </div>
        )}
      </div>
    </GlowCard>
  );
}

export function People() {
  return (
    <section id="people" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-28">
      <Label n="04">people</Label>
      <h2 className="mb-12 text-4xl font-semibold tracking-tight md:text-5xl">
        <Decode text="Who's behind it." />
      </h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PEOPLE.map((p) => (
          <PersonCard key={p.name} p={p} />
        ))}
      </div>
      <p className="mt-6 font-mono text-xs text-dim">
        // the founding team is forming — a handful of builders, each owning a part.
      </p>
    </section>
  );
}

export function Faq() {
  const faq = [
    ["Is it free?", "Yes. You pay in shipped work and in time spent helping others."],
    [
      "Who can join?",
      "Anyone who builds, from any university or none. Show us something you made: a repo, a demo, a product.",
    ],
    [
      "Is it remote?",
      "No. We build in the same room. This site keeps you up to date between sessions; the work happens in person.",
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
    <section id="faq" className="mx-auto max-w-4xl scroll-mt-24 px-6 py-28">
      <Label n="05">man alphabeta</Label>
      <div className="glass rounded-2xl p-6 font-mono text-sm leading-7 md:p-8">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>ALPHABETA(7)</span>
          <span>Builder&apos;s Manual</span>
          <span className="hidden sm:inline">ALPHABETA(7)</span>
        </div>
        <p className="mt-6 font-semibold">NAME</p>
        <p className="pl-8 text-muted-foreground">
          alphabeta — a cross-disciplinary society of people who build, London
        </p>
        <p className="mt-4 font-semibold">FAQ</p>
        {faq.map(([q, a]) => (
          <details key={q} className="group pl-8">
            <summary className="cursor-pointer list-none py-1 text-foreground hover:text-signal">
              <span className="text-muted-foreground group-open:text-signal" aria-hidden>
                {"> "}
              </span>
              {q}
            </summary>
            <p className="pb-2 pl-4 font-sans text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Join() {
  const next = EVENTS.find((e) => e.status === "upcoming");
  return (
    <section id="join" className="mx-auto max-w-4xl scroll-mt-24 px-6 py-28 text-center">
      <Label n="06">join</Label>
      <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
        <Decode text="Come build with us." />
      </h2>
      <p className="mx-auto mt-5 max-w-lg text-muted-foreground">
        Bring something you&apos;re making, or something you want to make. Turn up to the next build
        night, or find us online.
      </p>
      {next && (
        <a
          href="#events"
          className="glass mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 font-mono text-sm transition-transform hover:scale-[1.03]"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" />
          next: {next.name} · {next.date}
        </a>
      )}
      {SOCIALS.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {SOCIALS.map((s) => (
            <a
              key={s.kind}
              href={socialHref(s)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-glass-border px-4 py-2 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <SocialIcon kind={s.kind} className="h-3.5 w-3.5" />
              {socialLabel(s.kind)}
            </a>
          ))}
        </div>
      )}
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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <span>
          alphabeta v{VERSION}-{HASH} ·{" "}
          <a href="/humans.txt" className="hover:text-foreground">
            humans.txt
          </a>{" "}
          ·{" "}
          <a href={SITE_REPO} className="hover:text-foreground" rel="noopener noreferrer">
            source
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
