import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { UtcClock } from "@/components/alphabeta/effects";
import {
  Events,
  Faq,
  Footer,
  Hero,
  Join,
  Manifesto,
  People,
  Registry,
} from "@/components/alphabeta/sections";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/")({
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
      { property: "og:image:alt", content: "alphabeta — a society of builders" },
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
  { id: "registry", label: "Registry" },
  { id: "events", label: "Events" },
  { id: "people", label: "People" },
  { id: "faq", label: "FAQ" },
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

const BOOT_STEP_MS = 160;
const BOOT_FADE_MS = 400;

function Index() {
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState("");
  const [root, setRoot] = useState(false);
  const [bootStep, setBootStep] = useState(0);
  const [bootDone, setBootDone] = useState(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // --- boot overlay -------------------------------------------------------
  useEffect(() => {
    let booted = true;
    try {
      booted = Boolean(sessionStorage.getItem("ab_booted"));
      if (!booted) sessionStorage.setItem("ab_booted", "1");
    } catch {
      /* private mode — treat as booted so the overlay never sticks */
    }
    if (booted || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setBootDone(false);
    setBootStep(1);
    for (let i = 2; i <= BOOT.length; i++) {
      timers.current.push(setTimeout(() => setBootStep(i), BOOT_STEP_MS * (i - 1)));
    }
    timers.current.push(
      setTimeout(() => setBootDone(true), BOOT_STEP_MS * BOOT.length + BOOT_FADE_MS),
    );
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    [],
  );

  // --- console greeting, tab title, section observer, hidden konami --------
  useEffect(() => {
    console.log("%calphabeta", "font:700 28px monospace;color:#3f6");
    console.log("we're looking for builders, not talkers.");

    const original = document.title;
    const onVis = () => {
      document.title = document.hidden ? "// come back, keep shipping" : original;
    };
    document.addEventListener("visibilitychange", onVis);

    const typing = (t: EventTarget | null) =>
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      (t as HTMLElement)?.isContentEditable;

    let seq: string[] = [];
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      seq = [...seq, e.key].slice(-KONAMI.length);
      if (seq.join() === KONAMI.join()) setRoot((r) => !r);
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
    setMenu(false);
    document.getElementById(id)?.scrollIntoView();
  }, []);

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

      <nav
        aria-label="Primary"
        className="glass fixed left-1/2 top-4 z-40 w-[min(980px,92vw)] -translate-x-1/2 rounded-3xl px-5 py-2.5"
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
        <Manifesto />
        <Registry />
        <Events />
        <People />
        <Faq />
        <Join />
      </main>
      <Footer />
    </div>
  );
}
