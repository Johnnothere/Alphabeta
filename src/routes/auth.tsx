import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TICKET_KEY } from "@/components/alphabeta/terminal";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Enter — alphabeta" },
      { name: "description", content: "Member sign-in for alphabeta." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);

  // Temporary email/password fallback, kept only until Google sign-in is
  // confirmed working against the founder account — so a linking hiccup can't
  // lock anyone out of their own admin. Remove with the flag once verified.
  const [showFallback, setShowFallback] = useState(false);

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

  async function google() {
    setMsg(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser has already left for Google; only an error returns.
    if (error) {
      setBusy(false);
      setMsg(`err: ${error.message.toLowerCase()}`);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div aria-hidden className="dot-grid absolute inset-0" />
      <div className="glass relative w-full max-w-sm rounded-2xl p-6">
        <p className="font-mono text-xs text-muted-foreground">
          <span className="text-signal">●</span>{" "}
          {hasTicket ? "code accepted · sign in to bind it" : "member entrance"}
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Enter the vault</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with Google. New here? You'll add your details and access code on the next screen.
        </p>

        <button
          onClick={google}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <GoogleGlyph />
          {busy ? "redirecting…" : "Continue with Google"}
        </button>

        <p
          className="mt-3 min-h-5 font-mono text-xs text-destructive"
          role="status"
          aria-live="polite"
        >
          {msg && <>&gt; {msg}</>}
        </p>

        <div className="mt-4 flex justify-between font-mono text-[11px] text-muted-foreground">
          <button onClick={() => setShowFallback((v) => !v)} className="hover:text-foreground">
            trouble signing in?
          </button>
          <Link to="/" className="hover:text-foreground">
            cd ~
          </Link>
        </div>

        {showFallback && <EmailFallback onError={setMsg} />}
      </div>
    </main>
  );
}

/** Email/password sign-in — a temporary escape hatch, sign-in only (no signup). */
function EmailFallback({ onError }: { onError: (m: string | null) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    onError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) onError(`err: ${error.message.toLowerCase()}`);
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-2 border-t border-glass-border pt-4">
      <p className="font-mono text-[11px] text-muted-foreground">
        // existing account · email sign-in
      </p>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        placeholder="email"
        className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-signal"
      />
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        placeholder="password"
        className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-signal"
      />
      <button
        disabled={busy}
        className="w-full rounded-lg border border-glass-border py-2 text-sm hover:bg-accent disabled:opacity-50"
      >
        {busy ? "…" : "Sign in"}
      </button>
    </form>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5c-2 1.5-4.7 2.5-7.6 2.5-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.5l6.5 5.5c-.5.4 7.3-5.3 7.3-15 0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
