import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isEligible, RULES, streak, vouchError } from "@/lib/eligibility";
import { meQuery, profilesQuery, progressQuery } from "@/lib/vault";

export const Route = createFileRoute("/_authenticated/vault/")({ component: VaultHome });

export function Bar({ label, n, max }: { label: string; n: number; max: number }) {
  const v = Math.min(n, max);
  return (
    <div className="flex items-center justify-between gap-4 font-mono text-sm">
      <span className="w-24 text-muted-foreground">{label}</span>
      <span className="flex-1 tracking-[0.2em] text-signal">
        {"▮".repeat(v)}
        <span className="text-muted-foreground/40">{"▯".repeat(max - v)}</span>
      </span>
      <span className="tabular-nums">
        {n}/{max}
      </span>
    </div>
  );
}

function VaultHome() {
  const qc = useQueryClient();
  const me = useQuery(meQuery).data!;
  const progress = useQuery(progressQuery(me.id));
  const profiles = useQuery(profilesQuery);
  const pending = useQuery({
    queryKey: ["pending-help", me.id],
    queryFn: async () =>
      (
        await supabase
          .from("help_records")
          .select("id, helper_id, note, created_at")
          .eq("helped_id", me.id)
          .eq("confirmed", false)
      ).data ?? [],
  });
  const others = (profiles.data ?? []).filter((p) => p.id !== me.id);
  const handleOf = (id: string) => profiles.data?.find((p) => p.id === id)?.handle ?? "unknown";

  const [vouchFor, setVouchFor] = useState("");
  const [helpFor, setHelpFor] = useState("");
  const [helpNote, setHelpNote] = useState("");
  const [out, setOut] = useState<string | null>(null);

  async function vouch() {
    const err = vouchError(me.id, vouchFor, me.isFounder);
    if (err) return setOut(`err: ${err}`);
    const { error } = await supabase
      .from("vouches")
      .insert({ voucher_id: me.id, vouchee_id: vouchFor });
    setOut(
      error
        ? `err: ${error.code === "23505" ? "you already vouched for this member" : error.message}`
        : `vouched for @${handleOf(vouchFor)}`,
    );
    qc.invalidateQueries({ queryKey: ["progress"] });
  }
  async function logHelp() {
    if (!helpNote.trim()) return setOut("err: describe what you helped with");
    const { error } = await supabase
      .from("help_records")
      .insert({ helper_id: me.id, helped_id: helpFor, note: helpNote.trim() });
    if (error) return setOut(`err: ${error.message}`);
    setOut(`logged · waiting for @${handleOf(helpFor)} to confirm`);
    setHelpNote("");
  }
  async function confirm(id: string) {
    const { error } = await supabase.from("help_records").update({ confirmed: true }).eq("id", id);
    if (error) return setOut(`err: ${error.message}`);
    // Confirming help moves the "helped" counter, so the progress bars have to
    // be refetched — the original only invalidated the pending list, leaving
    // the bars stale until a reload.
    qc.invalidateQueries({ queryKey: ["pending-help"] });
    qc.invalidateQueries({ queryKey: ["progress"] });
  }

  const p = progress.data;
  const ok = p ? isEligible(p) : false;

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-xs text-muted-foreground">// whoami</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Welcome back, @{me.profile?.handle}.
        </h1>
      </header>

      <section className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-muted-foreground">
            quiet-room eligibility · any one rule unlocks
          </p>
          <span className={`font-mono text-xs ${ok ? "text-signal" : "text-muted-foreground"}`}>
            {ok ? "● unlocked" : "○ locked"}
          </span>
        </div>
        {p ? (
          <div className="mt-5 space-y-3">
            <Bar label="hackathons" n={streak(p.recent)} max={RULES.streak} />
            <Bar label="vouches" n={p.vouches} max={RULES.vouches} />
            <Bar label="helped" n={p.helped} max={RULES.helped} />
          </div>
        ) : (
          <p className="mt-4 font-mono text-sm text-muted-foreground">computing…</p>
        )}
        <p className="mt-5 text-sm text-muted-foreground">
          Hackathons must be the most recent ones, back to back. Vouches must come from members —
          founders can't vouch. Help counts each person once, after they confirm it.
        </p>
        {ok && (
          <Link to="/vault/meetup" className="mt-4 inline-block font-mono text-sm text-signal">
            → open /vault/meetup
          </Link>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="glass rounded-2xl p-6">
          <p className="font-mono text-xs text-muted-foreground">$ vouch @member</p>
          {me.isFounder ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Founders can't vouch. Vouches have to come from the community.
            </p>
          ) : (
            <div className="mt-4 flex gap-2">
              <MemberSelect value={vouchFor} onChange={setVouchFor} options={others} />
              <button
                disabled={!vouchFor}
                onClick={vouch}
                className="rounded-lg bg-primary px-4 text-sm text-primary-foreground disabled:opacity-40"
              >
                vouch
              </button>
            </div>
          )}
        </section>
        <section className="glass rounded-2xl p-6">
          <p className="font-mono text-xs text-muted-foreground">$ helped @member --note</p>
          <div className="mt-4 space-y-2">
            <MemberSelect value={helpFor} onChange={setHelpFor} options={others} />
            <div className="flex gap-2">
              <input
                aria-label="What you helped with"
                value={helpNote}
                onChange={(e) => setHelpNote(e.target.value)}
                placeholder="debugged their race condition"
                className="flex-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-signal"
              />
              <button
                disabled={!helpFor}
                onClick={logHelp}
                className="rounded-lg bg-primary px-4 text-sm text-primary-foreground disabled:opacity-40"
              >
                log
              </button>
            </div>
          </div>
        </section>
      </div>
      <p className="min-h-5 font-mono text-xs text-signal" role="status" aria-live="polite">
        {out && <>&gt; {out}</>}
      </p>

      {!!pending.data?.length && (
        <section className="glass rounded-2xl p-6">
          <p className="font-mono text-xs text-muted-foreground">
            // pending confirmations — did they help you?
          </p>
          <ul className="mt-4 divide-y divide-border">
            {pending.data.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span>
                  <span className="font-mono text-signal">@{handleOf(h.helper_id)}</span> — {h.note}
                </span>
                <button
                  onClick={() => confirm(h.id)}
                  className="rounded-md border border-glass-border px-3 py-1 font-mono text-xs hover:bg-accent"
                >
                  confirm
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function MemberSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; handle: string }[];
}) {
  return (
    <select
      aria-label="Member"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:border-signal"
    >
      <option value="">select member…</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          @{o.handle}
        </option>
      ))}
    </select>
  );
}
