import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/vault/meetup")({ component: Meetup });

function Meetup() {
  const { data, isLoading } = useQuery({
    queryKey: ["meetups"],
    queryFn: async () =>
      (
        await supabase
          .from("meetups")
          .select("*")
          .gte("starts_at", new Date().toISOString())
          .order("starts_at")
      ).data ?? [],
  });
  if (isLoading) return <p className="font-mono text-sm text-muted-foreground">decrypting…</p>;
  if (!data?.length) {
    return (
      <div className="glass mx-auto max-w-lg rounded-2xl p-8 text-center">
        <p className="font-mono text-xs text-muted-foreground">-----BEGIN PGP MESSAGE-----</p>
        <p className="mt-4 break-all font-mono text-xs leading-6 text-muted-foreground/60">
          hQEMA8x2qR7kLm9fAQf/T3x0Zq8yW1nVb2Kp4rH6sJ0cQe9uY5aMd7FgXt2LwBn3Rk8VhEp1oUz6CiIy4Jm0NsGa
        </p>
        <p className="font-mono text-xs text-muted-foreground">-----END PGP MESSAGE-----</p>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">The quiet room is locked.</h1>
        <p className="mt-3 text-muted-foreground">
          Attend 3 hackathons in a row, get 3 vouches from members, or help 10 members. Any one is
          enough.
        </p>
        <Link to="/vault" className="mt-5 inline-block font-mono text-sm text-signal">
          → check your progress
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <p className="font-mono text-xs text-muted-foreground">
        // gpg --decrypt quiet-room.asc · signature good
      </p>
      {data.map((m) => (
        <article key={m.id} className="glass rounded-2xl p-8">
          <h1 className="text-4xl font-semibold tracking-tight">{m.title}</h1>
          <p className="mt-2 font-mono text-sm text-signal">
            {new Date(m.starts_at).toUTCString()}
          </p>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{m.location}</p>
          <p className="mt-6 max-w-2xl text-lg">{m.details}</p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <p className="font-mono text-xs text-muted-foreground">// in the room</p>
              <ul className="mt-3 space-y-2">
                {m.leaders.map((l) => (
                  <li key={l} className="text-sm">
                    <span className="text-signal">›</span> {l}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">// founders' network</p>
              <p className="mt-3 text-sm text-muted-foreground">{m.connections}</p>
            </div>
          </div>
          <p className="mt-8 font-mono text-[11px] text-muted-foreground">
            Do not forward. Do not screenshot. Bring one problem and one intro.
          </p>
        </article>
      ))}
    </div>
  );
}
