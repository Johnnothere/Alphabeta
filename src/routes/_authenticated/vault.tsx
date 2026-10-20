import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { redeemAccessCode } from "@/lib/access.functions";
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
  const redeem = useServerFn(redeemAccessCode);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const tried = useRef(false);

  async function tryRedeem(payload: { code?: string; ticket?: string }) {
    if (payload.code !== undefined) {
      const len = payload.code.trim().length;
      if (len < 4 || len > 64) {
        setMsg("Sorry, try again.");
        return;
      }
    }
    setMsg("verifying…");
    try {
      const r = await redeem({ data: payload });
      if (r.ok) {
        setMsg(null);
        await qc.invalidateQueries({ queryKey: ["me"] });
      } else {
        setMsg(r.reason === "throttled" ? "too many attempts · try later" : "Sorry, try again.");
      }
    } catch {
      // A thrown serverFn (401, network) left the old code showing
      // "verifying…" forever with no way to tell what happened.
      setMsg("could not reach the server · try again");
    }
  }

  // Redeem the ticket the public terminal parked, if there is one. The ticket
  // is single-use server-side, so clearing it here is just tidiness.
  useEffect(() => {
    if (tried.current || !me.data || me.data.isMember) return;
    let ticket: string | null = null;
    try {
      ticket = sessionStorage.getItem(TICKET_KEY);
      if (ticket) sessionStorage.removeItem(TICKET_KEY);
    } catch {
      /* storage blocked */
    }
    if (ticket) {
      tried.current = true;
      void tryRedeem({ ticket });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data]);

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
        <div className="glass mx-auto mt-24 max-w-md rounded-2xl p-6 font-mono text-sm">
          <p className="text-destructive">403 · EACCES: permission denied, open '/vault'</p>
          <p className="mt-3 text-muted-foreground">
            Your account isn't bound to an access code yet.
          </p>
          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (code) void tryRedeem({ code });
            }}
          >
            <label className="sr-only" htmlFor="vault-code">
              Access code
            </label>
            <input
              id="vault-code"
              type="password"
              autoComplete="one-time-code"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="passphrase"
              className="flex-1 rounded-lg border border-input bg-transparent px-3 py-2 outline-none focus:border-signal"
            />
            <button className="rounded-lg bg-primary px-4 text-primary-foreground">bind</button>
          </form>
          <p className="mt-3 min-h-5 text-xs text-signal" role="status" aria-live="polite">
            {msg && <>&gt; {msg}</>}
          </p>
          <button
            onClick={signOut}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            logout
          </button>
        </div>
      </Shell>
    );
  }

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
          {me.data.isFounder && (
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
            @{me.data.profile?.handle}
            {me.data.isFounder ? " #" : " $"}
          </span>
          <button onClick={signOut} className="hover:text-foreground">
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
