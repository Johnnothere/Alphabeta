import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TICKET_KEY } from "@/components/alphabeta/terminal";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Authenticate — alphabeta" },
      { name: "description", content: "Member sign-in for alphabeta." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);

  useEffect(() => {
    try {
      setHasTicket(Boolean(sessionStorage.getItem(TICKET_KEY)));
    } catch {
      /* storage blocked */
    }
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/vault", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) navigate({ to: "/vault", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMsg(`err: ${error.message.toLowerCase()}`);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) setMsg(`err: ${error.message.toLowerCase()}`);
        else if (!data.session) setMsg("201 created · check your inbox to confirm, then sign in");
      }
    } finally {
      setBusy(false);
    }
  }

  /**
   * Stock Supabase OAuth. Lovable brokered this through its own service and
   * handed back tokens to `setSession`; off that platform the redirect goes
   * straight to Supabase, which bounces back to /auth/callback with a PKCE
   * code for the client to exchange.
   */
  async function google() {
    setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setMsg("err: google sign-in failed");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div aria-hidden className="dot-grid absolute inset-0" />
      <div className="glass relative w-full max-w-sm rounded-2xl p-6">
        <p className="font-mono text-xs text-muted-foreground">
          <span className="text-signal">●</span>{" "}
          {hasTicket ? "passphrase accepted · bind identity" : "member authentication"}
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          {mode === "in" ? "Sign in" : "Create your account"}
        </h1>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block">
            <span className="font-mono text-[11px] text-muted-foreground">email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2.5 font-mono text-sm outline-none focus:border-signal"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[11px] text-muted-foreground">password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2.5 font-mono text-sm outline-none focus:border-signal"
            />
          </label>
          <button
            disabled={busy}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          onClick={google}
          className="mt-3 w-full rounded-lg border border-glass-border py-2.5 text-sm hover:bg-accent"
        >
          Continue with Google
        </button>
        <p className="mt-3 min-h-5 font-mono text-xs text-signal" role="status" aria-live="polite">
          {msg && <>&gt; {msg}</>}
        </p>
        <div className="mt-2 flex justify-between font-mono text-[11px] text-muted-foreground">
          <button
            onClick={() => setMode(mode === "in" ? "up" : "in")}
            className="hover:text-foreground"
          >
            {mode === "in" ? "no account? --signup" : "have one? --signin"}
          </button>
          <Link to="/" className="hover:text-foreground">
            cd ~
          </Link>
        </div>
      </div>
    </main>
  );
}
