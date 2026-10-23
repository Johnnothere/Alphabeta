import { useCallback, useEffect, useRef, useState } from "react";

// Binary scramble: the "enigma" decodes through 0s and 1s before landing on
// the real text. Narrow glyphs keep the scramble overlay close to the final
// width so nothing reflows.
const GLYPHS = "01";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useInView<T extends Element>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

function useScramble(text: string, speed: number) {
  const [out, setOut] = useState(text);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const run = useCallback(() => {
    if (prefersReducedMotion()) return;
    clearInterval(timer.current);
    let frame = 0;
    timer.current = setInterval(() => {
      frame++;
      const locked = Math.floor(frame / 2);
      setOut(
        text
          .split("")
          .map((c, i) =>
            c === " " || i < locked ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0],
          )
          .join(""),
      );
      if (locked >= text.length) {
        clearInterval(timer.current);
        // Land on the exact text: the last frame can otherwise leave a glyph in
        // place when `locked` overshoots on the same tick.
        setOut(text);
      }
    }, speed);
  }, [text, speed]);
  useEffect(() => () => clearInterval(timer.current), []);
  return [out, run] as const;
}

/**
 * Enigma-style decode. The real text renders first (readable with no JS), then
 * scrambles and locks left to right when scrolled into view. An invisible copy
 * reserves the width so the layout never jumps.
 */
export function Decode({
  text,
  className = "",
  delay = 0,
  speed = 28,
  hover = true,
}: {
  text: string;
  className?: string;
  delay?: number;
  speed?: number;
  hover?: boolean;
}) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const [out, run] = useScramble(text, speed);
  useEffect(() => {
    if (!seen) return;
    const t = setTimeout(run, delay);
    return () => clearTimeout(t);
  }, [seen, delay, run]);
  return (
    <span
      ref={ref}
      className={`relative inline-block ${className}`}
      onMouseEnter={hover ? run : undefined}
    >
      {/* The in-flow copy reserves the final width so nothing reflows while
          scrambling. `opacity-0` rather than `invisible`: visibility:hidden is
          skipped by screen readers, which is why this previously needed a
          third sr-only copy — putting each heading in the DOM three times over
          for anything reading textContent. Transparent text stays in the
          accessibility tree, so one copy does both jobs. */}
      <span className="opacity-0">{text}</span>
      {/* Clipped to that reserved box: a scrambled frame that still runs wide
          gets cut off rather than spilling over adjacent content. */}
      <span className="absolute inset-0 overflow-hidden" aria-hidden>
        {out}
      </span>
    </span>
  );
}

/** Enigma rotor: steps a letter at a time, then settles on target. Click to re-spin. */
export function Rotor({ target, delay = 0 }: { target: string; delay?: number }) {
  const [ref, seen] = useInView<HTMLButtonElement>();
  const idx = LETTERS.indexOf(target);
  const [pos, setPos] = useState(idx);
  const [snap, setSnap] = useState(false);
  const [settle, setSettle] = useState(false);
  const busy = useRef(false);
  // The spin drives both an interval and a trailing timeout. Neither was
  // cleared on unmount, so navigating away mid-spin left them running and
  // calling setState on a dead component.
  const interval = useRef<ReturnType<typeof setInterval>>(undefined);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const spin = useCallback(() => {
    if (busy.current || prefersReducedMotion()) return;
    busy.current = true;
    setSettle(false);
    const steps = 52;
    let i = 0;
    clearInterval(interval.current);
    interval.current = setInterval(
      () => {
        i++;
        setSnap(false);
        setPos(idx + i);
        if (i >= steps) {
          clearInterval(interval.current);
          setSettle(true);
          timeout.current = setTimeout(() => {
            setSnap(true);
            setPos(idx);
            busy.current = false;
          }, 320);
        }
      },
      28 + delay / 60,
    );
  }, [idx, delay]);

  useEffect(() => {
    if (!seen) return;
    const t = setTimeout(spin, delay);
    return () => clearTimeout(t);
  }, [seen, delay, spin]);

  useEffect(
    () => () => {
      clearInterval(interval.current);
      clearTimeout(timeout.current);
    },
    [],
  );

  // 52 steps from `idx` must stay inside the strip, so three alphabets is the
  // minimum: idx(25) + 52 = 77, the last index of 78.
  const strip = [...LETTERS, ...LETTERS, ...LETTERS];
  return (
    <button
      ref={ref}
      onClick={spin}
      aria-label={`Rotor showing ${target}. Activate to re-spin.`}
      className="glass relative h-[var(--cell)] w-[calc(var(--cell)*0.7)] overflow-hidden rounded-xl font-mono text-2xl [--cell:3.5rem] sm:text-3xl sm:[--cell:5rem]"
    >
      <div
        className={`flex flex-col items-center ${settle ? "rotor-settle" : ""}`}
        style={{
          transform: `translateY(calc(var(--cell) * ${-pos}))`,
          transition: snap ? "none" : "transform 60ms cubic-bezier(.3,1.6,.6,1)",
        }}
      >
        {strip.map((l, i) => (
          <span key={i} className="flex h-[var(--cell)] items-center">
            {l}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-transparent to-background opacity-80" />
      <div className="pointer-events-none absolute inset-x-1 top-1/2 h-px bg-signal/20" />
    </button>
  );
}

export function GlowCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`glass glow-card rounded-2xl ${className}`}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}

export function UtcClock() {
  // Rendered as a placeholder on the server: formatting the real time during
  // SSR guarantees a hydration mismatch, because the clock has moved on by the
  // time the client renders.
  const [t, setT] = useState("--:--:--");
  useEffect(() => {
    const f = () => setT(new Date().toISOString().slice(11, 19));
    f();
    const id = setInterval(f, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{t} UTC</span>;
}

export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  // Starts at the final value so the number is correct without JS and for
  // anyone with reduced motion on.
  const [n, setN] = useState(to);
  useEffect(() => {
    if (!seen || prefersReducedMotion()) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1400);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setN(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to]);
  return (
    <span ref={ref} className="tabular-nums">
      {n.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

/**
 * Traps Tab inside a dialog and restores focus to the opener on close.
 *
 * Both overlays here were marked `aria-modal="true"` while leaving focus loose
 * in the page behind them, which is the one thing that attribute promises is
 * not happening.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement as HTMLElement | null;
    const node = ref.current;

    const focusable = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    focusable()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      opener?.focus?.();
    };
  }, [active, onClose]);
  return ref;
}
