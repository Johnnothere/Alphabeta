import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { UtcClock, useFocusTrap } from "@/components/alphabeta/effects";
import { Terminal } from "@/components/alphabeta/terminal";
import {
  Builds,
  CommitGraph,
  Footer,
  Hero,
  HowItWorks,
  Join,
  Manifesto,
  ManPage,
  Rotors,
  RulesCode,
  Stats,
} from "@/components/alphabeta/sections";
import { siteDataQuery } from "@/lib/site-data";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";

const SITE_DATA_TIMEOUT_MS = 4_000;

export const Route = createFileRoute("/")({
  // The landing page must render even when Supabase is unreachable: the
  // numbers and feed simply stay empty and React Query retries on the client.
  // Letting the loader throw here would turn a stats outage into a 500 for
  // the whole public site.
  //
  // Bounded, too: Railway health-checks this route, so a Supabase call that
  // hangs would otherwise stall SSR, fail the check and restart the service.
  loader: async ({ context }) => {
    try {
      await Promise.race([
        context.queryClient.ensureQueryData(siteDataQuery),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("site data timed out")), SITE_DATA_TIMEOUT_MS),
        ),
      ]);
    } catch (error) {
      console.error(error);
    }
  },
  head: () => ({
    meta: [
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:image", content: `${SITE_URL}/og.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Build. Ship. Help others ship. — alphabeta" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { name: "twitter:image", content: `${SITE_URL}/og.png` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
  }),
  component: Index,
});

const SECTIONS = [
  { id: "manifesto", label: "Manifesto" },
  { id: "process", label: "Process" },
  { id: "builds", label: "Builds" },
  { id: "rules", label: "Rules" },
  { id: "man", label: "FAQ" },
  { id: "join", label: "Join" },
];

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const BOOT = [
  "POST ok · 64 cores · mem 0x7ffe",
  "mounting /builders … ok",
  "loading rotors I II III … ok",
  "handshake established",
];

/** Boot overlay: one line every 160ms, then a 400ms fade. */
const BOOT_STEP_MS = 160;
const BOOT_FADE_MS = 400;

function Index() {
  const [term, setTerm] = useState(false);
  const [keys, setKeys] = useState(false);
  const [root, setRoot] = useState(false);
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState("");
  const [bootStep, setBootStep] = useState(0);
  const [bootDone, setBootDone] = useState(true);
  // Rendered as ⌘ on the server and corrected after mount: the platform is
  // not knowable during SSR, and a mismatch here would be a hydration error.
  const [modKey, setModKey] = useState("⌘");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!/Mac|iPhone|iPad|iPod/.test(navigator.platform)) setModKey("Ctrl+");
  }, []);

  // --- boot overlay -------------------------------------------------------
  useEffect(() => {
    let booted = true;
    try {
      booted = Boolean(sessionStorage.getItem("ab_booted"));
      if (!booted) sessionStorage.setItem("ab_booted", "1");
    } catch {
      // Storage can throw in private modes; treat it as already booted so the
      // overlay never becomes a permanent splash screen.
    }
    if (booted || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setBootDone(false);
    setBootStep(1);

    // Driven by discrete timeouts rather than one interval: the original
    // cleared the interval on a wall-clock timeout that did not line up with
    // the 1.2s CSS fade, so the overlay unmounted mid-fade and blinked out.
    for (let i = 2; i <= BOOT.length; i++) {
      timers.current.push(setTimeout(() => setBootStep(i), BOOT_STEP_MS * (i - 1)));
    }
    timers.current.push(
      setTimeout(() => setBootDone(true), BOOT_STEP_MS * BOOT.length + BOOT_FADE_MS),
    );
  }, []);

  // Every timer this component starts is cleared here, so unmounting mid-boot
  // does not leave callbacks writing to a dead component.
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    [],
  );

  // --- console greeting, tab title, shortcuts, section observer -----------
  useEffect(() => {
    console.log("%calphabeta", "font:700 28px monospace;color:#3f6");
    console.log("we're looking for builders, not talkers.\ntry: press / and type 'help'");

    const original = document.title;
    const onVis = () => {
      document.title = document.hidden ? "// come back, keep shipping" : original;
    };
    document.addEventListener("visibilitychange", onVis);

    let seq: string[] = [];
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      (t as HTMLElement)?.isContentEditable;

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setTerm((p) => !p);
      } else if (e.key === "/" && !typing(e.target)) {
        e.preventDefault();
        setTerm(true);
      } else if (e.key === "?" && !typing(e.target)) {
        setKeys((k) => !k);
      } else if (e.key === "Escape") {
        setKeys(false);
      }
      // Only track the konami sequence outside text fields, so typing "ba"
      // into the join form cannot trip it.
      if (!typing(e.target)) {
        seq = [...seq, e.key].slice(-KONAMI.length);
        if (seq.join() === KONAMI.join()) setRoot((r) => !r);
      }
    };
    window.addEventListener("keydown", onKey);

    const io = new IntersectionObserver(
      (es) => es.forEach((en) => en.isIntersecting && setActive(en.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });

    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      document.title = original;
      io.disconnect();
    };
  }, []);

  const go = useCallback((id: string) => {
    setTerm(false);
    setMenu(false);
    document.getElementById(id)?.scrollIntoView();
  }, []);

  const closeKeys = useCallback(() => setKeys(false), []);
  // Stable identity matters: Terminal feeds this into its focus trap, whose
  // effect re-runs — and yanks focus off the input — whenever the callback
  // changes, which an inline arrow would do on every re-render of this page.
  const closeTerm = useCallback(() => setTerm(false), []);
  const keysRef = useFocusTrap<HTMLDivElement>(keys, closeKeys);

  return (
    <div className={`relative min-h-screen overflow-x-hidden ${root ? "root-mode" : ""}`}>
      <a
        href="#manifesto"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {!bootDone && (
        <div
          aria-hidden
          className="boot fixed inset-0 z-[60] flex items-center justify-center bg-background font-mono text-xs text-muted-foreground"
        >
          <div className="w-72">
            {BOOT.slice(0, bootStep).map((l) => (
              <p key={l}>
                <span className="text-signal">[ ok ]</span> {l}
              </p>
            ))}
          </div>
        </div>
      )}

      <div
        aria-hidden
        className="pointer-events-none fixed left-3 top-0 hidden h-full flex-col justify-around font-mono text-[10px] text-faint lg:flex"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i}>0x{(i * 256).toString(16).padStart(4, "0")}</span>
        ))}
      </div>

      <nav
        aria-label="Primary"
        className="glass fixed left-1/2 top-4 z-40 w-[min(960px,92vw)] -translate-x-1/2 rounded-3xl px-5 py-2.5"
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.scrollTo({ top: 0 })}
            className="font-semibold tracking-tight"
            aria-label="Back to top"
          >
            alpha<span className="text-signal">β</span>eta
          </button>
          <div className="hidden gap-5 text-sm md:flex">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => go(s.id)}
                aria-current={active === s.id ? "true" : undefined}
                className={`transition-colors hover:text-foreground ${
                  active === s.id ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
            <span className="hidden sm:inline">
              <UtcClock />
            </span>
            <Link
              to="/vault"
              className="rounded-md border border-glass-border px-2 py-0.5 text-foreground hover:bg-accent"
            >
              vault ↗
            </Link>
            <button
              onClick={() => setTerm(true)}
              aria-label="Open terminal"
              className="rounded-md border border-glass-border px-1.5 py-0.5 hover:text-foreground"
            >
              {modKey}K
            </button>
            <button
              onClick={() => setMenu((m) => !m)}
              aria-label={menu ? "Close menu" : "Open menu"}
              aria-expanded={menu}
              className="hover:text-foreground md:hidden"
            >
              {menu ? "✕" : "≡"}
            </button>
          </div>
        </div>
        {menu && (
          <div className="mt-3 grid gap-1 border-t border-glass-border pt-3 md:hidden">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => go(s.id)}
                className="py-1.5 text-left text-sm text-muted-foreground hover:text-foreground"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      <main>
        <Hero />
        <Stats />
        <Manifesto />
        <Rotors />
        <HowItWorks />
        <CommitGraph />
        <Builds />
        <RulesCode />
        <ManPage />
        <Join />
      </main>
      <Footer />

      {keys && (
        <div
          ref={keysRef}
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          className="glass fixed bottom-6 right-6 z-50 w-64 rounded-2xl p-4 font-mono text-xs"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-muted-foreground">// keys</p>
            <button
              onClick={closeKeys}
              aria-label="Close shortcuts"
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          {(
            [
              [`/ or ${modKey}K`, "shell"],
              ["?", "this panel"],
              ["esc", "close"],
              ["↑↑↓↓←→←→ba", "???"],
            ] as const
          ).map(([k, v]) => (
            <p key={k} className="flex justify-between py-0.5">
              <kbd className="text-signal">{k}</kbd>
              <span className="text-muted-foreground">{v}</span>
            </p>
          ))}
        </div>
      )}

      {term && <Terminal sections={SECTIONS} onGoto={go} onClose={closeTerm} />}
    </div>
  );
}
