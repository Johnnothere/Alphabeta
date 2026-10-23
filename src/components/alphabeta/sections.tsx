import { useState } from "react";
import {
  BUILDS,
  EVENTS,
  PEOPLE,
  SOCIALS,
  type Build,
  type CommunityEvent,
  type Person,
  type Shot,
} from "@/content";
import { socialHref, SocialIcon, socialLabel } from "./icons";
import { Decode, GlowCard, useFocusTrap } from "./effects";

export function Label({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="mb-4 font-mono text-xs text-muted-foreground">
      // {n} {children}
    </p>
  );
}

/**
 * A faint line illustration of the Old Royal Naval College, Greenwich — the
 * twin baroque domes over the Chapel and the Painted Hall, with the colonnades.
 * Drawn, not photographed: no licensing, and it sits quietly behind the hero.
 */
function OrncBackdrop() {
  const dome = (cx: number) => (
    <g>
      {/* colonnade base under the dome */}
      {Array.from({ length: 9 }, (_, i) => cx - 64 + i * 16).map((x) => (
        <line key={x} x1={x} y1={168} x2={x} y2={210} />
      ))}
      <line x1={cx - 72} y1={168} x2={cx + 72} y2={168} />
      <line x1={cx - 76} y1={210} x2={cx + 76} y2={210} />
      {/* tower drum */}
      <rect x={cx - 26} y={96} width={52} height={72} rx={2} />
      {/* dome */}
      <path d={`M ${cx - 30} 96 Q ${cx} 34 ${cx + 30} 96`} />
      {/* lantern + finial */}
      <rect x={cx - 8} y={56} width={16} height={18} rx={1} />
      <path d={`M ${cx - 10} 56 Q ${cx} 40 ${cx + 10} 56`} />
      <line x1={cx} y1={40} x2={cx} y2={26} />
      <circle cx={cx} cy={22} r={3} />
    </g>
  );
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 230"
      preserveAspectRatio="xMidYMax meet"
      className="pointer-events-none absolute bottom-0 left-1/2 w-[160%] max-w-[1400px] -translate-x-1/2 text-foreground/[0.09] [mask-image:linear-gradient(to_top,black,transparent)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      {/* long riverfront ranges */}
      <line x1="60" y1="210" x2="1140" y2="210" />
      <rect x="150" y="150" width="340" height="60" />
      <rect x="710" y="150" width="340" height="60" />
      {/* lower colonnade ticks across the ranges */}
      {Array.from({ length: 20 }, (_, i) => 160 + i * 16).map((x) => (
        <line key={`l${x}`} x1={x} y1={162} x2={x} y2={210} />
      ))}
      {Array.from({ length: 20 }, (_, i) => 720 + i * 16).map((x) => (
        <line key={`r${x}`} x1={x} y1={162} x2={x} y2={210} />
      ))}
      {dome(400)}
      {dome(800)}
    </svg>
  );
}

export function Hero() {
  const next = EVENTS.find((e) => e.status === "upcoming");
  return (
    <header
      id="top"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      <div aria-hidden className="dot-grid absolute inset-0" />
      <div
        aria-hidden
        className="orb absolute left-[15%] top-[18%] h-72 w-72 rounded-full bg-signal/10 blur-3xl"
      />
      <div
        aria-hidden
        className="orb absolute bottom-[22%] right-[15%] h-80 w-80 rounded-full bg-syn-fn/10 blur-3xl [animation-delay:-9s]"
      />
      <OrncBackdrop />
      <p className="relative mb-6 font-mono text-xs text-muted-foreground">
        <span className="pulse-dot text-signal">●</span> a society of builders · London · Greenwich
      </p>
      <h1 className="relative max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-7xl md:text-8xl">
        <Decode text="Build. Ship." />
        <br />
        <span className="text-muted-foreground">
          <Decode text="Help others ship." />
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
    </header>
  );
}

export function Manifesto() {
  return (
    <section id="manifesto" className="relative mx-auto max-w-6xl scroll-mt-24 px-6 py-28">
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
        ).map(([k, t, d]) => (
          <GlowCard key={k} className="p-8">
            <span className="font-mono text-xs text-signal">{k}</span>
            <h3 className="mt-10 text-2xl font-semibold tracking-tight">{t}</h3>
            <p className="mt-3 text-muted-foreground">{d}</p>
          </GlowCard>
        ))}
      </div>
    </section>
  );
}

// --- shared modal ----------------------------------------------------------

function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const ref = useFocusTrap<HTMLDivElement>(true, onClose);
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 px-4 py-[8vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className="glass relative w-full max-w-2xl rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-md px-2 py-0.5 font-mono text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          esc
        </button>
        {children}
      </div>
    </div>
  );
}

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

function Gallery({ shots, label }: { shots: Shot[]; label: string }) {
  if (!shots.length) {
    return (
      <div className="dot-grid flex h-28 items-center justify-center rounded-xl border border-dashed border-glass-border font-mono text-xs text-dim">
        {label} — photos coming soon
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {shots.map((s) => (
        <figure key={s.src} className="overflow-hidden rounded-xl border border-glass-border">
          <img
            src={s.src}
            alt={s.caption ?? ""}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
          {s.caption && (
            <figcaption className="px-2 py-1 font-mono text-[10px] text-muted-foreground">
              {s.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

function DetailBlock({ n, title, body }: { n: string; title: string; body: string | undefined }) {
  if (!body) return null;
  return (
    <div>
      <p className="font-mono text-[11px] text-signal">
        {n} {title}
      </p>
      <p className="mt-2 text-muted-foreground">{body}</p>
    </div>
  );
}

// --- registry --------------------------------------------------------------

function BuildCard({ build, onOpen }: { build: Build; onOpen: () => void }) {
  const stageColor =
    build.stage === "building"
      ? "text-syn-fn"
      : build.stage === "prototype"
        ? "text-muted-foreground"
        : "text-signal";
  return (
    <button onClick={onOpen} className="group block text-left">
      <GlowCard className="flex h-full flex-col overflow-hidden">
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
          <span className="absolute bottom-3 right-3 rounded-full border border-glass-border bg-background/70 px-2 py-0.5 font-mono text-[10px] text-muted-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
            open →
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight">{build.title}</h3>
            <span className="shrink-0 font-mono text-[11px] text-dim">{build.when}</span>
          </div>
          <p className="mt-2 flex-1 text-sm text-muted-foreground">{build.blurb}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {build.stack.slice(0, 4).map((s) => (
              <span
                key={s}
                className="rounded border border-glass-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {s}
              </span>
            ))}
            {build.stack.length > 4 && (
              <span className="font-mono text-[10px] text-dim">+{build.stack.length - 4}</span>
            )}
          </div>
          <div className="mt-4 border-t border-glass-border pt-3 font-mono text-[11px] text-muted-foreground">
            {build.builders.map((b) => `@${b.name}`).join(", ")}
          </div>
        </div>
      </GlowCard>
    </button>
  );
}

function BuildSheet({ build, onClose }: { build: Build; onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-2xl border-b border-glass-border">
        {build.image ? (
          <img src={build.image} alt={build.title} className="h-full w-full object-cover" />
        ) : (
          <CoverTile title={build.title} />
        )}
      </div>
      <div className="space-y-6 p-6 sm:p-8">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-3xl font-semibold tracking-tight">{build.title}</h2>
            <span className="font-mono text-xs text-dim">{build.when}</span>
          </div>
          <p className="mt-2 text-muted-foreground">{build.blurb}</p>
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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px]">
            <div className="flex flex-wrap gap-x-3 text-muted-foreground">
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
                className="text-signal hover:underline"
              >
                open it ↗
              </a>
            )}
          </div>
        </div>
        <DetailBlock n="01" title="how it started" body={build.origin} />
        <DetailBlock n="02" title="the problem" body={build.problem} />
        <DetailBlock n="03" title="the app" body={build.about} />
        {build.about !== undefined && (
          <div className="space-y-5">
            <div>
              <p className="font-mono text-[11px] text-signal">04 screens</p>
              <div className="mt-2">
                <Gallery shots={build.gallery ?? []} label="screens" />
              </div>
            </div>
            <div>
              <p className="font-mono text-[11px] text-signal">05 behind the scenes</p>
              <div className="mt-2">
                <Gallery shots={build.behindScenes ?? []} label="build nights" />
              </div>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

export function Registry() {
  const [open, setOpen] = useState<string | null>(null);
  const current = BUILDS.find((b) => b.slug === open);
  return (
    <section id="registry" className="relative mx-auto max-w-6xl scroll-mt-24 px-6 py-28">
      <Label n="02">registry</Label>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
          <Decode text="What we've built." />
        </h2>
        <p className="max-w-sm font-mono text-xs text-muted-foreground">
          A public log of what members ship. Click one to read how it came together.
        </p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {BUILDS.map((b) => (
          <div key={b.slug} id={b.slug} className="scroll-mt-24">
            <BuildCard build={b} onOpen={() => setOpen(b.slug)} />
          </div>
        ))}
        <a
          href="#join"
          className="glass flex min-h-[18rem] flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="text-2xl text-signal">+</span>
          <span className="mt-3">$ git commit -m &apos;your build&apos;</span>
          <span className="mt-1 text-xs text-dim">build something · it goes here</span>
        </a>
      </div>
      {current && <BuildSheet build={current} onClose={() => setOpen(null)} />}
    </section>
  );
}

// --- events ----------------------------------------------------------------

function EventSheet({ event, onClose }: { event: CommunityEvent; onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <div className="space-y-6 p-6 sm:p-8">
        <div>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] ${
              event.status === "upcoming"
                ? "border-signal/30 bg-signal/10 text-signal"
                : "border-glass-border text-muted-foreground"
            }`}
          >
            {event.status === "upcoming" ? (
              <>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" /> upcoming
              </>
            ) : (
              "shipped"
            )}
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">{event.name}</h2>
          <p className="mt-1 font-mono text-sm text-signal">{event.date}</p>
          <p className="font-mono text-xs text-muted-foreground">{event.place}</p>
        </div>
        <p className="text-muted-foreground">{event.recap ?? event.blurb}</p>
        <Gallery shots={event.gallery ?? []} label="from the night" />
        {event.link && (
          <a
            href={event.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-mono text-sm text-signal hover:underline"
          >
            → details &amp; sign-up
          </a>
        )}
      </div>
    </Sheet>
  );
}

export function Events() {
  const [open, setOpen] = useState<string | null>(null);
  const current = EVENTS.find((e) => e.slug === open);
  const upcoming = EVENTS.filter((e) => e.status === "upcoming");
  const past = EVENTS.filter((e) => e.status === "past");
  return (
    <section id="events" className="relative mx-auto max-w-6xl scroll-mt-24 px-6 py-28">
      <Label n="03">events</Label>
      <h2 className="mb-12 text-4xl font-semibold tracking-tight md:text-5xl">
        <Decode text="We build in the room." />
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        {upcoming.map((e) => (
          <button key={e.slug} onClick={() => setOpen(e.slug)} className="block text-left">
            <GlowCard className="flex h-full flex-col p-7">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-3 py-1 font-mono text-[11px] text-signal">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" /> upcoming
              </span>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight">{e.name}</h3>
              <p className="mt-1 font-mono text-sm text-signal">{e.date}</p>
              <p className="font-mono text-xs text-muted-foreground">{e.place}</p>
              <p className="mt-4 flex-1 text-muted-foreground">{e.blurb}</p>
              <span className="mt-5 font-mono text-sm text-signal">read more →</span>
            </GlowCard>
          </button>
        ))}
      </div>
      {past.length > 0 && (
        <>
          <p className="mb-5 mt-14 font-mono text-xs text-muted-foreground">// shipped</p>
          <div className="glass overflow-hidden rounded-2xl">
            {past.map((e) => (
              <button
                key={e.slug}
                onClick={() => setOpen(e.slug)}
                className="flex w-full flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-glass-border px-6 py-4 text-left transition-colors last:border-0 hover:bg-accent/40"
              >
                <span className="font-mono text-sm text-signal">{e.date}</span>
                <span className="font-semibold tracking-tight">{e.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{e.place}</span>
                <span className="ml-auto font-mono text-[11px] text-dim">read →</span>
              </button>
            ))}
          </div>
        </>
      )}
      {current && <EventSheet event={current} onClose={() => setOpen(null)} />}
    </section>
  );
}

// --- people ----------------------------------------------------------------

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
    <section id="people" className="relative mx-auto max-w-6xl scroll-mt-24 px-6 py-28">
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
    <section id="faq" className="relative mx-auto max-w-4xl scroll-mt-24 px-6 py-28">
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
    <section id="join" className="relative mx-auto max-w-4xl scroll-mt-24 px-6 py-28 text-center">
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

export function Footer() {
  return (
    <footer className="border-t border-glass-border px-6 py-8 font-mono text-[11px] text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <span>
          alpha<span className="text-signal">β</span>eta · London · a society of builders
        </span>
        {SOCIALS.length > 0 && (
          <span className="flex items-center gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.kind}
                href={socialHref(s)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={socialLabel(s.kind)}
                className="hover:text-foreground"
              >
                <SocialIcon kind={s.kind} className="h-3.5 w-3.5" />
              </a>
            ))}
          </span>
        )}
      </div>
    </footer>
  );
}
