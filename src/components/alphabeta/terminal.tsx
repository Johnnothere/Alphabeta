import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkAccessCode } from "@/lib/access.functions";
import { useFocusTrap } from "./effects";

type Line = { k: "in" | "out" | "err" | "ok"; s: string };
type Section = { id: string; label: string };

/** Key the ticket is parked under between the terminal and /vault. */
export const TICKET_KEY = "ab_ticket";

const HELP = [
  "help              this list",
  "ls [-a]           list sections",
  "cd <section>      jump to a section",
  "whoami            identify",
  "date              system time",
  "clear             clear screen",
  "exit              close terminal",
];

export function Terminal({
  sections,
  onGoto,
  onClose,
}: {
  sections: Section[];
  onGoto: (id: string) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const check = useServerFn(checkAccessCode);
  const [lines, setLines] = useState<Line[]>([
    { k: "out", s: "alphabeta shell 0.2 — type 'help'" },
  ]);
  const [val, setVal] = useState("");
  const [mode, setMode] = useState<"cmd" | "pass">("cmd");
  const [fails, setFails] = useState(0);
  const [hist, setHist] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => onClose(), [onClose]);
  const dialogRef = useFocusTrap<HTMLDivElement>(true, close);

  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  const print = (...l: Line[]) => setLines((p) => [...p, ...l]);

  async function submitPass(code: string) {
    setBusy(true);
    const r = await check({ data: { code } }).catch(() => ({
      ok: false as const,
      reason: "invalid" as const,
    }));
    setBusy(false);

    if (r.ok) {
      // Park the server-issued ticket, never the passphrase. The original kept
      // the plaintext code in sessionStorage across the whole sign-up flow,
      // where any script on the origin could read a live credential.
      try {
        sessionStorage.setItem(TICKET_KEY, r.ticket);
      } catch {
        /* storage blocked — the code can still be entered on the bind screen */
      }
      print({ k: "ok", s: "access granted. binding identity…" });
      setTimeout(() => navigate({ to: "/auth" }), 700);
      return;
    }
    if (r.reason === "throttled") {
      print({ k: "err", s: "sudo: too many attempts. locked for 15m." });
      setMode("cmd");
      return;
    }
    const f = fails + 1;
    setFails(f);
    if (f >= 3) {
      print({ k: "err", s: "sudo: 3 incorrect password attempts" });
      setMode("cmd");
      setFails(0);
    } else {
      print({ k: "err", s: "Sorry, try again." });
    }
  }

  function run(raw: string) {
    const cmd = raw.trim();
    print({ k: "in", s: `guest@alphabeta:~$ ${cmd}` });
    if (!cmd) return;
    setHist((h) => [cmd, ...h].slice(0, 50));
    const [c = "", ...args] = cmd.split(/\s+/);
    const arg = args.join(" ").toLowerCase();

    switch (c) {
      case "help":
        return print(...HELP.map((s) => ({ k: "out" as const, s })));
      case "ls": {
        const out = sections.map((s) => s.id + "/");
        if (arg.includes("-a")) out.unshift("./", "../", ".vault/");
        return print({ k: "out", s: out.join("  ") });
      }
      case "cd":
      case "goto": {
        if (arg === ".vault" || arg === ".vault/")
          return print({ k: "err", s: "cd: .vault: Permission denied" });
        const t = sections.find(
          (s) => s.id === arg.replace(/\/$/, "") || s.label.toLowerCase() === arg,
        );
        if (!t) return print({ k: "err", s: `cd: no such file or directory: ${arg}` });
        onGoto(t.id);
        return;
      }
      case "whoami":
        return print({ k: "out", s: "guest (uid=1000 gid=1000 groups=builders-pending)" });
      case "date":
        return print({ k: "out", s: new Date().toUTCString() });
      case "clear":
        return setLines([]);
      case "exit":
        return close();
      case "rm":
        return print({ k: "err", s: "nice try." });
      case "sudo":
        if (arg === "access") {
          setMode("pass");
          return print({ k: "out", s: "[sudo] passphrase for member:" });
        }
        return print({
          k: "err",
          s: "guest is not in the sudoers file. This incident will be reported.",
        });
      default: {
        const t = sections.find((s) => s.id === c.toLowerCase());
        if (t) {
          onGoto(t.id);
          return;
        }
        return print({ k: "err", s: `command not found: ${c}` });
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 pt-[16vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Terminal"
        className="glass w-[min(620px,92vw)] overflow-hidden rounded-2xl"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.focus();
        }}
      >
        <div className="flex items-center justify-between border-b border-glass-border px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-muted" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted" />
          </span>
          <span>guest@alphabeta — zsh — 80×24</span>
          <button onClick={close} aria-label="Close terminal" className="hover:text-foreground">
            esc
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-4 py-3 font-mono text-[13px] leading-6">
          {/* The log is its own live region. The original wrapped the log *and*
              the text input in one `aria-live` container, so screen readers
              re-announced the whole transcript on every keystroke. */}
          <div role="log" aria-live="polite" aria-atomic="false">
            {lines.map((l, i) => (
              <div
                key={i}
                className={
                  l.k === "err"
                    ? "text-destructive"
                    : l.k === "ok"
                      ? "text-signal"
                      : l.k === "in"
                        ? "text-foreground"
                        : "text-muted-foreground"
                }
              >
                {l.s}
              </div>
            ))}
          </div>

          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (busy) return;
              const v = val;
              setVal("");
              setHi(-1);
              if (mode === "pass") void submitPass(v);
              else run(v);
            }}
          >
            <span className="text-signal" aria-hidden>
              {mode === "pass" ? "🔑" : "$"}
            </span>
            <label htmlFor="term-in" className="sr-only">
              {mode === "pass" ? "Passphrase" : "Command"}
            </label>
            <input
              id="term-in"
              ref={inputRef}
              type={mode === "pass" ? "password" : "text"}
              autoComplete={mode === "pass" ? "one-time-code" : "off"}
              spellCheck={false}
              autoCapitalize="off"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab") e.preventDefault();
                if (mode !== "cmd") return;
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const n = Math.min(hi + 1, hist.length - 1);
                  setHi(n);
                  setVal(hist[n] ?? "");
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const n = Math.max(hi - 1, -1);
                  setHi(n);
                  setVal(n < 0 ? "" : (hist[n] ?? ""));
                }
              }}
              className="flex-1 bg-transparent outline-none"
            />
            {busy && (
              <span className="text-muted-foreground" aria-hidden>
                …
              </span>
            )}
          </form>
          <div ref={endRef} />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-glass-border px-3 py-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => onGoto(s.id)}
              className="rounded-md px-2 py-1 font-mono text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              cd {s.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
