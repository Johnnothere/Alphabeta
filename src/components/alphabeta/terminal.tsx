import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkAccessCode } from "@/lib/access.functions";
import { HASH, SITE_REPO, VERSION } from "@/lib/site";
import { useFocusTrap } from "./effects";

type Line = { k: "in" | "out" | "err" | "ok"; s: string };
type Section = { id: string; label: string };

/** Key the ticket is parked under between the terminal and /vault. */
export const TICKET_KEY = "ab_ticket";

const HELP = [
  "help              this list",
  "ls [-a]           list sections",
  "cd <section>      jump to a section",
  "cat <file>        read a file",
  "whoami            identify",
  "date              system time",
  "uname -a          system info",
  "history           what you typed",
  "clear             clear screen",
  "exit              close terminal",
  "",
  "tab completes. ↑↓ recall. some commands aren't listed.",
];

const COMMANDS = [
  "help",
  "ls",
  "cd",
  "cat",
  "echo",
  "pwd",
  "whoami",
  "id",
  "date",
  "uname",
  "history",
  "clear",
  "exit",
  "sudo",
  "man",
  "neofetch",
  "version",
  "ping",
  "ssh",
  "vim",
  "git",
  "npm",
  "make",
  "open",
];

const FILES: Record<string, string[]> = {
  "humans.txt": [
    "/* TEAM */",
    "  Founders: Tej Gohil, Mehedi",
    "  Built by: the alphabeta community",
    "  Where: London — home base at the University of Greenwich,",
    "         open to builders from every institution",
    "  Motto: build. ship. help others ship.",
  ],
  "rules.ts": [
    "export const member = {",
    '  ships: "weekly",',
    '  talks: "only with code",',
    '  helps: unblock("anyone"),',
    "  ego: null,",
    "} satisfies Builder;",
  ],
  motd: ["build. ship. help others ship.", "— there is no step four."],
  "/etc/motd": ["build. ship. help others ship.", "— there is no step four."],
  readme: [
    "ALPHABETA — a cross-disciplinary society of builders, London.",
    "Three rules: no fuss · only building · help others build.",
    "Apply with something you made. Get vouched. You're in.",
  ],
  "readme.md": [
    "ALPHABETA — a cross-disciplinary society of builders, London.",
    "Three rules: no fuss · only building · help others build.",
    "Apply with something you made. Get vouched. You're in.",
  ],
  ".bash_history": ["sudo access", "cd .vault", "git push --force", "rm -rf hype/"],
};

const NEOFETCH = [
  "   ___   ___     guest@alphabeta",
  "  / _ | / _ )    ----------------",
  " / __ |/ _  |    OS: alphabeta v" + VERSION,
  "/_/ |_/____/     Kernel: build " + HASH,
  "                 Shell: zsh (pretend)",
  "                 Location: London · Greenwich",
  "                 Uptime: since the first hackathon",
  "                 Packages: 3 rules",
  "                 Theme: glass [dark]",
  "                 Members: real · Hype: 0",
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
    { k: "out", s: `alphabeta shell ${VERSION} — type 'help'` },
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
  const out = (...s: string[]) => print(...s.map((x) => ({ k: "out" as const, s: x })));
  const err = (s: string) => print({ k: "err", s });

  async function submitPass(code: string) {
    // The server schema requires 4–64 characters; a shorter or empty entry is
    // a wrong passphrase, not an outage, and should read as one.
    if (code.trim().length < 4 || code.trim().length > 64) {
      err("Sorry, try again.");
      return;
    }
    setBusy(true);
    let r: Awaited<ReturnType<typeof check>> | { ok: false; reason: "network" };
    try {
      r = await check({ data: { code } });
    } catch {
      r = { ok: false, reason: "network" };
    }
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
    if (r.reason === "network") {
      // A thrown server function (500, CSRF, offline) is not a wrong code and
      // must not count toward the three strikes.
      err("sudo: could not reach the server. try again in a moment.");
      setMode("cmd");
      return;
    }
    if (r.reason === "throttled") {
      err("sudo: too many attempts. locked for 15m.");
      setMode("cmd");
      return;
    }
    const f = fails + 1;
    setFails(f);
    if (f >= 3) {
      err("sudo: 3 incorrect password attempts");
      setMode("cmd");
      setFails(0);
    } else {
      err("Sorry, try again.");
    }
  }

  function complete() {
    const raw = val.replace(/^\s+/, "");
    const parts = raw.split(/\s+/);
    const isFirst = parts.length <= 1;
    const word = (parts[parts.length - 1] ?? "").toLowerCase();
    const head = (parts[0] ?? "").toLowerCase();
    const pool = isFirst
      ? COMMANDS
      : head === "cd"
        ? sections.map((s) => s.id)
        : head === "cat" || head === "less" || head === "more"
          ? Object.keys(FILES)
          : [];
    const matches = pool.filter((p) => p.startsWith(word));
    if (!matches.length) return;
    if (matches.length === 1) {
      setVal([...parts.slice(0, -1), matches[0]].join(" ") + (isFirst ? " " : ""));
      return;
    }
    // Several: extend to the common prefix and show the options, like a shell.
    let prefix = matches[0]!;
    for (const m of matches) {
      while (!m.startsWith(prefix)) prefix = prefix.slice(0, -1);
    }
    setVal([...parts.slice(0, -1), prefix].join(" "));
    out(matches.join("  "));
  }

  function run(raw: string) {
    const cmd = raw.trim();
    print({ k: "in", s: `guest@alphabeta:~$ ${cmd}` });
    if (!cmd) return;
    setHist((h) => [cmd, ...h].slice(0, 50));
    const [c0 = "", ...args] = cmd.split(/\s+/);
    const c = c0.toLowerCase();
    const arg = args.join(" ").toLowerCase();

    const goto = (id: string) => {
      onGoto(id);
    };

    switch (c) {
      case "help":
      case "?":
        return out(...HELP);
      case "ls":
      case "dir": {
        const list = sections.map((s) => s.id + "/");
        if (arg.includes("-a") || arg.includes("-la")) list.unshift("./", "../", ".vault/");
        return out(list.join("  "));
      }
      case "cd":
      case "goto": {
        if (!arg || arg === "~" || arg === ".." || arg === "/") {
          onGoto("top");
          return;
        }
        if (arg === ".vault" || arg === ".vault/") return err("cd: .vault: Permission denied");
        const t = sections.find(
          (s) => s.id === arg.replace(/\/$/, "") || s.label.toLowerCase() === arg,
        );
        if (!t) return err(`cd: no such file or directory: ${arg}`);
        return goto(t.id);
      }
      case "pwd":
        return out("/home/guest");
      case "cat":
      case "less":
      case "more": {
        if (!arg) return err(`${c}: missing file operand`);
        if (arg.startsWith(".vault")) return err(`${c}: ${arg}: Permission denied`);
        // hasOwn: a plain object would otherwise answer `cat constructor` with
        // Object.prototype's property and crash on the spread.
        const key = Object.hasOwn(FILES, arg) ? arg : arg.replace(/^\.\//, "");
        const f = Object.hasOwn(FILES, key) ? FILES[key] : undefined;
        if (!f) return err(`${c}: ${arg}: No such file or directory`);
        return out(...f);
      }
      case "echo":
        return out(args.join(" "));
      case "whoami":
      case "id":
        return out("guest (uid=1000 gid=1000 groups=builders-pending)");
      case "date":
        return out(new Date().toUTCString());
      case "uname":
        return out(
          arg.includes("-a")
            ? `alphabeta ${VERSION}-${HASH} #1 SMP london/greenwich x86_64 builders/${VERSION}`
            : "alphabeta",
        );
      case "history":
        return out(...[cmd, ...hist].reverse().map((h, i) => `${String(i + 1).padStart(4)}  ${h}`));
      case "clear":
      case "cls":
        return setLines([]);
      case "exit":
      case "quit":
      case "logout":
        return close();
      case "version":
      case "--version":
      case "-v":
        return out(`alphabeta v${VERSION}-${HASH}`);
      case "man":
        if (!arg || arg === "alphabeta") return goto("man");
        return err(`No manual entry for ${arg}`);
      case "neofetch":
      case "fetch":
      case "screenfetch":
        return out(...NEOFETCH);
      case "rm":
        return err("nice try.");
      case "sudo":
        if (arg === "access") {
          setMode("pass");
          return out("[sudo] passphrase for member:");
        }
        if (arg === "rm -rf /" || arg.startsWith("rm")) return err("nice try. with sudo.");
        return err("guest is not in the sudoers file. This incident will be reported.");
      case "su":
        return err("su: Authentication failure");
      case "open":
      case "vault":
      case "./vault":
        if (c === "open" && !arg.includes("vault")) return err(`open: ${arg}: not here`);
        return err("vault: Permission denied. hint: sudo access");
      case "ssh":
        return err("ssh: connect to host vault port 22: Connection refused (bring a code)");
      case "ping":
        return out(
          `PING ${arg || "greenwich.london"}: 56 data bytes`,
          "64 bytes: icmp_seq=0 ttl=64 time=0.8 ms",
          "64 bytes: icmp_seq=1 ttl=64 time=0.7 ms",
          "--- 2 packets transmitted, 2 received, 0% packet loss ---",
        );
      case "vim":
      case "vi":
      case "nano":
      case "emacs":
        return out(
          "there is no editor here. you ship with what you've got.",
          ...(c === "vim" || c === "vi" ? ["(:q! — you're free. for now.)"] : []),
        );
      case "git":
        if (arg.startsWith("push")) return out("Everything up-to-date. (ship it.)");
        if (arg === "status")
          return out("On branch you", "nothing to commit — go build something.");
        if (arg === "log") return out(`${HASH} (HEAD -> main) ship`);
        if (arg.startsWith("clone") || arg === "remote -v") return out(SITE_REPO);
        return out("usage: git <ship|push|status|log>");
      case "npm":
      case "pnpm":
      case "yarn":
      case "bun":
        if (arg.startsWith("run ship") || arg === "ship") return out("> ship", "✓ shipped.");
        return out(`${c}: 0 packages installed. you don't need a framework to ship.`);
      case "make":
        return out("make: *** No rule to make target 'excuses'. Stop.");
      case "sl":
        return out("🚂💨  (you meant ls)");
      case "hack":
      case "hackathon":
        return goto("process");
      case "join":
      case "apply":
        return goto("join");
      default: {
        const t = sections.find((s) => s.id === c);
        if (t) return goto(t.id);
        return err(`command not found: ${c0}`);
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
                className={`whitespace-pre-wrap ${
                  l.k === "err"
                    ? "text-destructive"
                    : l.k === "ok"
                      ? "text-signal"
                      : l.k === "in"
                        ? "text-foreground"
                        : "text-muted-foreground"
                }`}
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
                if (e.key === "Tab") {
                  e.preventDefault();
                  if (mode === "cmd") complete();
                  return;
                }
                // ctrl+c abandons the line — and a passphrase prompt.
                if (e.ctrlKey && e.key.toLowerCase() === "c") {
                  e.preventDefault();
                  setVal("");
                  setHi(-1);
                  print({ k: "in", s: mode === "pass" ? "^C" : `guest@alphabeta:~$ ${val}^C` });
                  setMode("cmd");
                  return;
                }
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
                if (e.ctrlKey && e.key.toLowerCase() === "l") {
                  e.preventDefault();
                  setLines([]);
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
