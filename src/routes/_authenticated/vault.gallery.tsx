import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFocusTrap } from "@/components/alphabeta/effects";

export const Route = createFileRoute("/_authenticated/vault/gallery")({ component: Gallery });

function Gallery() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["gallery"],
    queryFn: async () =>
      (await supabase.from("gallery_items").select("*").order("taken_on", { ascending: false }))
        .data ?? [],
  });
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const lightboxRef = useFocusTrap<HTMLDivElement>(open !== null, close);

  useEffect(() => {
    if (open === null || !data.length) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setOpen((i) => ((i ?? 0) + 1) % data.length);
      if (e.key === "ArrowLeft") setOpen((i) => ((i ?? 0) - 1 + data.length) % data.length);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, data.length]);

  // An index can outlive the row it pointed at when the query refetches.
  const cur = open !== null ? (data[open] ?? null) : null;

  return (
    <div>
      <p className="font-mono text-xs text-muted-foreground">
        // ls -la ~/gallery · {data.length} objects
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">From the floor.</h1>
      {isLoading && <p className="mt-8 font-mono text-sm text-muted-foreground">loading…</p>}
      <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {data.map((g, i) => (
          <button
            key={g.id}
            onClick={() => setOpen(i)}
            className="glass group mb-4 block w-full overflow-hidden rounded-2xl text-left break-inside-avoid"
          >
            {g.kind === "video" ? (
              <video
                src={g.url}
                poster={g.poster ?? undefined}
                muted
                playsInline
                preload="metadata"
                className="w-full"
              />
            ) : (
              <img
                src={g.url}
                alt={g.title}
                loading="lazy"
                className="w-full transition-transform duration-500 group-hover:scale-[1.02]"
              />
            )}
            <div className="flex items-center justify-between p-3 font-mono text-xs">
              <span>
                {g.kind === "video" ? "▶ " : ""}
                {g.title}
              </span>
              <span className="text-muted-foreground">{g.taken_on}</span>
            </div>
          </button>
        ))}
      </div>
      {cur && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={cur.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-6 backdrop-blur-md"
          onClick={close}
        >
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {cur.kind === "video" ? (
              <video
                src={cur.url}
                poster={cur.poster ?? undefined}
                controls
                autoPlay
                className="max-h-[80vh] rounded-xl"
              />
            ) : (
              <img src={cur.url} alt={cur.title} className="max-h-[80vh] rounded-xl" />
            )}
            <figcaption className="mt-3 flex justify-between gap-4 font-mono text-xs text-muted-foreground">
              <span>{cur.caption}</span>
              <button onClick={close} className="shrink-0 hover:text-foreground">
                ← → · esc
              </button>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
