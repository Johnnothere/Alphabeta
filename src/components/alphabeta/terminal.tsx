import { useCallback, useEffect, useRef, useState } from "react";
import { SOCIALS } from "@/content";
import { HASH, SITE_REPO, VERSION } from "@/lib/site";
import { socialHref } from "./icons";
import { useFocusTrap } from "./effects";

type Line = { k: "in" | "out" | "err" | "ok"; s: string };
type Section = { id: string; label: string };

const HELP = [
  "help              this list",
  "ls [-a]           list sections",
  "cd <section>      jump to a section",
  "cat <file>        read a file",
  "open <name>       open a social link",
  "socials           list our channels",
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
  "open",
  "socials",
  "echo",
  "pwd",
  "whoami",
  "id",
  "date",
  "uname",
  "history",
  "clear",
  "exit",
  "man",
  "neofetch",
  "version",
  "ping",
  "vim",
  "git",
  "npm",
  "make",
];

const FILES: Record<string, string[]> = {
  "humans.txt": [
    "/* TEAM */",
    "  Founders: Tej, Mehedi",
    "  Built by: the alphabeta community",
    "  Where: London — University of Greenwich, open to every institution",
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
    "Turn up to a build night. Make something. It goes in the registry.",
  ],
  "readme.md": [
    "ALPHABETA — a cross-disciplinary society of builders, London.",
    "Three rules: no fuss · only building · help others build.",
    "Turn up to a build night. Make something. It goes in the registry.",
  ],
  ".bash_history": ["cd registry", "git commit -m 'ship'", "make", "open github"],
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
  const [lines, setLines] = useState<Line[]>([
    { k: "out", s: `alphabeta shell ${VERSION} — type 'help'` },
  ]);
  const [val, setVal] = useState("");
  const [hist, setHist] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => onClose(), [onClose]);
  const dialogRef = useFocusTrap<HTMLDivElement>(true, close);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  const print = (...l: Line[]) => setLines((p) => [...p, ...l]);
  const out = (...s: string[]) => print(...s.map((x) => ({ k: "out" as const, s: x })));
  const err = (s: string) => print({ k: "err", s });

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
        : head === "cat"
          ? Object.keys(FILES)
          : head === "open"
            ? SOCIALS.map((s) => s.kind)
            : [];
    const matches = pool.filter((p) => p.startsWith(word));
    if (!matches.length) return;
    if (matches.length === 1) {
      setVal([...parts.slice(0, -1), matches[0]].join(" ") + (isFirst ? " " : ""));
      return;
    }
    let prefix = matches[0]!;
    for (const m of matches) while (!m.startsWith(prefix)) prefix = prefix.slice(0, -1);
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

    const goto = (id: string) => onGoto(id);
    const openUrl = (url: string) => {
      try {
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        /* popup blocked */
      }
    };

    switch (c) {
      case "help":
      case "?":
        return out(...HELP);
      case "ls":
      case "dir": {
        const list = sections.map((s) => s.id + "/");
        if (arg.includes("-a")) list.unshift("./", "../", ".git/");
        return out(list.join("  "));
      }
      case "cd":
      case "goto": {
        if (!arg || arg === "~" || arg === ".." || arg === "/") {
          onGoto("top");
          return;
        }
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
        const key = Object.hasOwn(FILES, arg) ? arg : arg.replace(/^\.\//, "");
        const f = Object.hasOwn(FILES, key) ? FILES[key] : undefined;
        if (!f) return err(`${c}: ${arg}: No such file or directory`);
        return out(...f);
      }
      case "socials": {
        if (!SOCIALS.length) return out("no channels listed yet.");
        return out(...SOCIALS.map((s) => `${s.kind.padEnd(12)} ${socialHref(s)}`));
      }
      case "open": {
        const s = SOCIALS.find((x) => x.kind === arg);
        if (s) {
          out(`opening ${s.kind}…`);
          openUrl(socialHref(s));
          return;
        }
        if (arg === "source" || arg === "github" || arg === "repo") {
          out("opening source…");
          openUrl(SITE_REPO);
          return;
        }
        return err(`open: ${arg || "what?"}: not found. try 'socials'`);
      }
      case "echo":
        return out(args.join(" "));
      case "whoami":
      case "id":
        return out("guest (uid=1000 gid=1000 groups=builders)");
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
        if (!arg || arg === "alphabeta") return goto("faq");
        return err(`No manual entry for ${arg}`);
      case "neofetch":
      case "fetch":
      case "screenfetch":
        return out(...NEOFETCH);
      case "rm":
        return err("nice try.");
      case "sudo":
        return err("guest is not in the sudoers file. This incident will be reported.");
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
      case "build":
        return goto("registry");
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
        aria-label="Command palette"
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
          <button onClick={close} aria-label="Close" className="hover:text-foreground">
            esc
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-4 py-3 font-mono text-[13px] leading-6">
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
              const v = val;
              setVal("");
              setHi(-1);
              run(v);
            }}
          >
            <span className="text-signal" aria-hidden>
              $
            </span>
            <label htmlFor="term-in" className="sr-only">
              Command
            </label>
            <input
              id="term-in"
              ref={inputRef}
              type="text"
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="off"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  complete();
                  return;
                }
                if (e.ctrlKey && e.key.toLowerCase() === "c") {
                  e.preventDefault();
                  print({ k: "in", s: `guest@alphabeta:~$ ${val}^C` });
                  setVal("");
                  setHi(-1);
                  return;
                }
                if (e.ctrlKey && e.key.toLowerCase() === "l") {
                  e.preventDefault();
                  setLines([]);
                  return;
                }
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
