import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { completeOnboarding } from "@/lib/access.functions";
import { meQuery } from "@/lib/vault";
import { TICKET_KEY } from "@/components/alphabeta/terminal";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [
      { title: "vault — alphabeta" },
      { name: "description", content: "Members only." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "vault — alphabeta" },
      { property: "og:description", content: "Members only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VaultLayout,
});

const NAV = [
  { to: "/vault", label: "~/status" },
  { to: "/vault/gallery", label: "gallery" },
  { to: "/vault/projects", label: "projects" },
  { to: "/vault/meetup", label: "meetup" },
] as const;

function VaultLayout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const me = useQuery(meQuery);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  if (me.isLoading)
    return (
      <Shell>
        <p className="font-mono text-sm text-muted-foreground">
          mounting /vault<span className="caret">▍</span>
        </p>
      </Shell>
    );

  if (!me.data?.isMember) {
    return (
      <Shell>
        <Onboarding
          defaultName={me.data?.profile?.display_name ?? ""}
          onDone={() => qc.invalidateQueries({ queryKey: ["me"] })}
          onSignOut={signOut}
        />
      </Shell>
    );
  }

  return <Member me={me.data} onSignOut={signOut} />;
}

/**
 * Shown once, to a signed-in account with no role yet. Collects name + phone +
 * access code (or uses a ticket the terminal parked) and redeems in one call.
 */
function Onboarding({
  defaultName,
  onDone,
  onSignOut,
}: {
  defaultName: string;
  onDone: () => void;
  onSignOut: () => void;
}) {
  const onboard = useServerFn(completeOnboarding);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setTicket(sessionStorage.getItem(TICKET_KEY));
    } catch {
      /* storage blocked */
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (name.trim().length < 1) return setMsg("your name, please");
    if (phone.trim().length < 5) return setMsg("a reachable phone number, please");
    if (!ticket && code.trim().length < 4) return setMsg("your access code, please");
    setBusy(true);
    setMsg("verifying…");
    try {
      const payload = ticket
        ? { name: name.trim(), phone: phone.trim(), ticket }
        : { name: name.trim(), phone: phone.trim(), code: code.trim() };
      const r = await onboard({ data: payload });
      if (r.ok) {
        try {
          sessionStorage.removeItem(TICKET_KEY);
        } catch {
          /* ignore */
        }
        setMsg(null);
        onDone();
      } else if (r.reason === "throttled") {
        setMsg("too many attempts · try again in a few minutes");
        setBusy(false);
      } else {
        // A parked ticket can expire (30 min); fall back to asking for the code.
        if (ticket) setTicket(null);
        setMsg("that code didn't work — check it and try again");
        setBusy(false);
      }
    } catch {
      setMsg("could not reach the server · try again");
      setBusy(false);
    }
  }

  return (
    <div className="glass mx-auto mt-24 max-w-md rounded-2xl p-6">
      <p className="font-mono text-xs text-muted-foreground">// 01 bind your access</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Almost in.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You're signed in. Add your details and the access code a founder gave you, and you're a
        member. Your number stays private — only founders can see it.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <Field label="name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoComplete="name"
            placeholder="how you're known"
            className={inputCls}
          />
        </Field>
        <Field label="phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={32}
            type="tel"
            autoComplete="tel"
            placeholder="+44 …"
            className={inputCls}
          />
        </Field>
        {!ticket && (
          <Field label="access code">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={64}
              autoComplete="one-time-code"
              spellCheck={false}
              placeholder="AB-XXXX-XXXX-XXXX"
              className={`${inputCls} font-mono`}
            />
          </Field>
        )}
        {ticket && (
          <p className="font-mono text-[11px] text-signal">code accepted — just your details</p>
        )}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "…" : "Enter the vault"}
        </button>
      </form>
      <p className="mt-3 min-h-5 font-mono text-xs text-signal" role="status" aria-live="polite">
        {msg && <>&gt; {msg}</>}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        No code yet? Ask a founder, or request one from the{" "}
        <Link to="/" hash="join" className="text-signal hover:underline">
          join form
        </Link>
        .
      </p>
      <button
        onClick={onSignOut}
        className="mt-3 font-mono text-xs text-muted-foreground hover:text-foreground"
      >
        logout
      </button>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm outline-none focus:border-signal";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

type MeData = { profile: { handle: string } | null; isFounder: boolean };

function Member({ me, onSignOut }: { me: MeData; onSignOut: () => void }) {
  return (
    <Shell>
      <nav className="glass sticky top-4 z-30 mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-full px-5 py-2.5 font-mono text-xs">
        <Link to="/" className="font-sans text-sm font-semibold tracking-tight">
          alpha<span className="text-signal">β</span>eta
          <span className="ml-2 text-muted-foreground">/vault</span>
        </Link>
        <div className="flex flex-wrap gap-4 text-muted-foreground">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-signal" }}
              className="hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
          {me.isFounder && (
            <Link
              to="/vault/admin"
              activeProps={{ className: "text-signal" }}
              className="hover:text-foreground"
            >
              root
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <span>
            @{me.profile?.handle}
            {me.isFounder ? " #" : " $"}
          </span>
          <button onClick={onSignOut} className="hover:text-foreground">
            logout
          </button>
        </div>
      </nav>
      <div className="mx-auto max-w-5xl py-12">
        <Outlet />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen px-4 pt-4">
      <div aria-hidden className="dot-grid pointer-events-none fixed inset-0" />
      <div className="relative">{children}</div>
    </div>
  );
}
