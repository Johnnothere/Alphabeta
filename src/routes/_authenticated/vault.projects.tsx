import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/vault/projects")({ component: Projects });

function shortHash(id: string) {
  return id.replace(/-/g, "").slice(0, 7);
}

function Projects() {
  const { data = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () =>
      (await supabase.from("projects").select("*").order("target_date")).data ?? [],
  });
  return (
    <div>
      <p className="font-mono text-xs text-muted-foreground">// git log --all --oneline --graph</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Who's building what.</h1>
      <div className="glass mt-8 overflow-hidden rounded-2xl font-mono text-sm">
        {data.map((p, i) => {
          const days = p.target_date
            ? Math.ceil((new Date(p.target_date).getTime() - Date.now()) / 86400000)
            : null;
          return (
            <div key={p.id} className="flex gap-4 border-b border-border px-5 py-4 last:border-0">
              <span className="select-none text-signal">{i === 0 ? "*" : "|"}</span>
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-syn-key">{shortHash(p.id)}</span>
                  <span className="font-sans text-base font-medium text-foreground">{p.title}</span>
                  <span className="rounded border border-glass-border px-1.5 text-[11px] text-muted-foreground">
                    {p.stage}
                  </span>
                </div>
                <p className="mt-1 font-sans text-muted-foreground">{p.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Author: <span className="text-syn-fn">{p.builder}</span> · {p.stack} · started{" "}
                  {p.started_on}
                  {days !== null && (
                    <>
                      {" "}
                      · <span className="text-signal">ETA {days <= 0 ? "now" : `${days}d`}</span> (
                      {p.target_date})
                    </>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
