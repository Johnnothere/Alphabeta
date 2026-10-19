import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * OAuth and email-confirmation landing point.
 *
 * `detectSessionInUrl` means supabase-js usually completes the PKCE exchange
 * on its own as soon as the client is constructed. This route waits for that
 * to land, exchanges explicitly as a fallback, and surfaces the provider's
 * error instead of silently bouncing back to a sign-in form.
 */
export const Route = createFileRoute("/auth_/callback")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Signing in — alphabeta" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      const providerError =
        params.get("error_description") ??
        params.get("error") ??
        hash.get("error_description") ??
        hash.get("error");
      if (providerError) {
        if (!cancelled) setError(providerError);
        return;
      }

      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        if (!cancelled) navigate({ to: "/vault", replace: true });
        return;
      }

      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (!cancelled) setError(exchangeError.message);
          return;
        }
        if (!cancelled) navigate({ to: "/vault", replace: true });
        return;
      }

      if (!cancelled) setError("no sign-in code in callback URL");
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div aria-hidden className="dot-grid absolute inset-0" />
      <div className="glass relative w-full max-w-sm rounded-2xl p-6 font-mono text-sm">
        {error ? (
          <>
            <p className="text-destructive">401 · sign-in failed</p>
            <p className="mt-3 break-words text-muted-foreground">{error}</p>
            <a href="/auth" className="mt-5 inline-block text-signal hover:underline">
              $ retry
            </a>
          </>
        ) : (
          <p className="text-muted-foreground">
            binding identity<span className="caret">▍</span>
          </p>
        )}
      </div>
    </main>
  );
}
