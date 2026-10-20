import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createAccessCode } from "@/lib/access.functions";
import { RULES } from "@/lib/eligibility";
import { meQuery, profilesQuery } from "@/lib/vault";
import { MemberSelect } from "./vault.index";

export const Route = createFileRoute("/_authenticated/vault/admin")({ component: Admin });

const box = "glass rounded-2xl p-6";
const label = "font-mono text-xs text-muted-foreground";
const input =
  "rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:border-signal";

function Admin() {
  const me = useQuery(meQuery).data!;
  if (!me.isFounder)
    return <p className="font-mono text-sm text-destructive">EPERM: operation not permitted</p>;
  return (
    <div className="space-y-6">
      <div>
        <p className={label}>// sudo -i</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Root console.</h1>
      </div>
      <Codes />
      <Attendance />
      <HelpQueue />
      <Members />
      <Requests />
    </div>
  );
}

function Codes() {
  const qc = useQueryClient();
  const create = useServerFn(createAccessCode);
  const codes = useQuery({
    queryKey: ["codes"],
    queryFn: async () =>
      (
        await supabase
          .from("access_codes")
          .select("id,label,grants_role,uses,max_uses,expires_at,active")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const [lbl, setLbl] = useState("");
  const [role, setRole] = useState<"member" | "founder">("member");
  const [max, setMax] = useState("25");
  const [days, setDays] = useState("30");
  const [fresh, setFresh] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function make() {
    setErr(null);
    // Mirror the server schema so a bad value is reported here, not swallowed
    // as an unhandled rejection with nothing on screen.
    const maxUses = max ? Number(max) : null;
    const expiresInDays = days ? Number(days) : null;
    if (maxUses !== null && (maxUses < 1 || maxUses > 10_000))
      return setErr("max uses must be 1–10000, or blank for unlimited");
    if (expiresInDays !== null && (expiresInDays < 1 || expiresInDays > 365))
      return setErr("expiry must be 1–365 days, or blank for never");
    if (lbl.length > 80) return setErr("label is too long (80 max)");
    try {
      const r = await create({
        data: { label: lbl || "untitled", role, maxUses, expiresInDays },
      });
      setFresh(r.code);
      setLbl("");
      qc.invalidateQueries({ queryKey: ["codes"] });
    } catch {
      setErr("could not create code");
    }
  }
  async function toggle(id: string, active: boolean) {
    await supabase.from("access_codes").update({ active: !active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["codes"] });
  }
  return (
    <section className={box}>
      <p className={label}>// access codes · only hashes are stored</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          aria-label="Label"
          className={`${input} flex-1`}
          placeholder="label (e.g. hack/02 cohort)"
          maxLength={80}
          value={lbl}
          onChange={(e) => setLbl(e.target.value)}
        />
        <select
          aria-label="Role"
          className={input}
          value={role}
          onChange={(e) => setRole(e.target.value as "member" | "founder")}
        >
          <option value="member">member</option>
          <option value="founder">founder</option>
        </select>
        <input
          aria-label="Max uses"
          className={`${input} w-24`}
          placeholder="max"
          value={max}
          onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
        />
        <input
          aria-label="Expires in days"
          className={`${input} w-24`}
          placeholder="days"
          value={days}
          onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))}
        />
        <button
          onClick={make}
          className="rounded-lg bg-primary px-4 text-sm text-primary-foreground"
        >
          generate
        </button>
      </div>
      {fresh && (
        <p className="mt-3 font-mono text-sm text-signal">
          &gt; {fresh}{" "}
          <span className="text-muted-foreground">— copy it now, it won't be shown again</span>
        </p>
      )}
      <p
        className="mt-2 min-h-4 font-mono text-xs text-destructive"
        role="status"
        aria-live="polite"
      >
        {err}
      </p>
      <table className="mt-5 w-full font-mono text-xs">
        <tbody>
          {codes.data?.map((c) => (
            <tr key={c.id} className="border-t border-border">
              <td className="py-2">{c.label}</td>
              <td className="text-muted-foreground">{c.grants_role}</td>
              <td className="tabular-nums">
                {c.uses}/{c.max_uses ?? "∞"}
              </td>
              <td className="text-muted-foreground">
                {c.expires_at ? c.expires_at.slice(0, 10) : "never"}
              </td>
              <td className="text-right">
                <button
                  onClick={() => toggle(c.id, c.active)}
                  className={c.active ? "text-signal" : "text-muted-foreground"}
                >
                  {c.active ? "● active" : "○ revoked"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Attendance() {
  const qc = useQueryClient();
  const profiles = useQuery(profilesQuery);
  const hacks = useQuery({
    queryKey: ["hackathons"],
    queryFn: async () =>
      (await supabase.from("hackathons").select("*").order("held_on", { ascending: false })).data ??
      [],
  });
  const att = useQuery({
    queryKey: ["attendance"],
    queryFn: async () => (await supabase.from("hackathon_attendance").select("*")).data ?? [],
  });
  const [hack, setHack] = useState("");
  const [who, setWho] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [err, setErr] = useState<string | null>(null);
  async function add() {
    // Every one of these writes can fail (duplicate attendance, RLS denial).
    // The original ignored the result, so a rejected insert looked identical
    // to a successful one.
    const { error } = await supabase
      .from("hackathon_attendance")
      .insert({ hackathon_id: hack, user_id: who });
    setErr(error ? (error.code === "23505" ? "already marked attended" : error.message) : null);
    if (!error) {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      // Attendance feeds the streak column of the eligibility table.
      qc.invalidateQueries({ queryKey: ["member-overview"] });
    }
  }
  async function addHack() {
    if (!name || !date) return;
    const { error } = await supabase.from("hackathons").insert({ name, held_on: date });
    setErr(error ? error.message : null);
    if (error) return;
    setName("");
    setDate("");
    qc.invalidateQueries({ queryKey: ["hackathons"] });
    qc.invalidateQueries({ queryKey: ["member-overview"] });
  }
  return (
    <section className={box}>
      <p className={label}>// hackathons & attendance</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          aria-label="Hackathon name"
          className={`${input} flex-1`}
          placeholder="hack/06 — name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          aria-label="Date"
          type="date"
          className={input}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button
          onClick={addHack}
          className="rounded-lg border border-glass-border px-4 text-sm hover:bg-accent"
        >
          add hackathon
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <select
          aria-label="Hackathon"
          className={`${input} flex-1`}
          value={hack}
          onChange={(e) => setHack(e.target.value)}
        >
          <option value="">hackathon…</option>
          {hacks.data?.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} · {h.held_on}
            </option>
          ))}
        </select>
        <MemberSelect value={who} onChange={setWho} options={profiles.data ?? []} />
        <button
          disabled={!hack || !who}
          onClick={add}
          className="rounded-lg bg-primary px-4 text-sm text-primary-foreground disabled:opacity-40"
        >
          mark attended
        </button>
      </div>
      <p
        className="mt-3 min-h-4 font-mono text-xs text-destructive"
        role="status"
        aria-live="polite"
      >
        {err}
      </p>
      <ul className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
        {hacks.data?.map((h) => (
          <li key={h.id}>
            {h.held_on} {h.name} — {att.data?.filter((a) => a.hackathon_id === h.id).length ?? 0}{" "}
            attended
          </li>
        ))}
      </ul>
    </section>
  );
}

function HelpQueue() {
  const qc = useQueryClient();
  const profiles = useQuery(profilesQuery);
  const q = useQuery({
    queryKey: ["help-queue"],
    queryFn: async () =>
      (await supabase.from("help_records").select("*").eq("confirmed", false).order("created_at"))
        .data ?? [],
  });
  const h = (id: string) => profiles.data?.find((p) => p.id === id)?.handle ?? "?";
  async function confirm(id: string) {
    const { error } = await supabase.from("help_records").update({ confirmed: true }).eq("id", id);
    if (error) return;
    qc.invalidateQueries({ queryKey: ["help-queue"] });
    qc.invalidateQueries({ queryKey: ["member-overview"] });
  }
  return (
    <section className={box}>
      <p className={label}>// unconfirmed help reports</p>
      {!q.data?.length && <p className="mt-3 text-sm text-muted-foreground">Queue empty.</p>}
      <ul className="mt-3 divide-y divide-border">
        {q.data?.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>
              <span className="font-mono text-signal">@{h(r.helper_id)}</span> → @{h(r.helped_id)}:{" "}
              {r.note}
            </span>
            <button onClick={() => confirm(r.id)} className="font-mono text-xs text-signal">
              confirm
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Members() {
  // One RPC for the whole table. The original fanned out `member_progress`
  // once per profile from the browser, so a 400-member community meant 400
  // sequential round trips before this section rendered.
  const rows = useQuery({
    queryKey: ["member-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("all_member_progress");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (rows.isLoading)
    return (
      <section className={box}>
        <p className={label}>// members · eligibility</p>
        <p className="mt-3 text-sm text-muted-foreground">loading…</p>
      </section>
    );
  if (rows.error)
    return (
      <section className={box}>
        <p className={label}>// members · eligibility</p>
        <p className="mt-3 text-sm text-destructive">could not load members</p>
      </section>
    );

  return (
    <section className={box}>
      <p className={label}>// members · eligibility</p>
      <div className="overflow-x-auto">
        <table className="mt-4 w-full font-mono text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="text-left font-normal">handle</th>
              <th className="text-left font-normal">streak</th>
              <th className="text-left font-normal">vouches</th>
              <th className="text-left font-normal">helped</th>
              <th className="text-right font-normal">quiet room</th>
            </tr>
          </thead>
          <tbody>
            {rows.data?.map((r) => (
              <tr key={r.user_id} className="border-t border-border">
                <td className="py-2">@{r.handle}</td>
                <td>
                  {r.streak}/{RULES.streak}
                </td>
                <td>
                  {r.vouches}/{RULES.vouches}
                </td>
                <td>
                  {r.helped}/{RULES.helped}
                </td>
                <td
                  className={`text-right ${r.eligible ? "text-signal" : "text-muted-foreground"}`}
                >
                  {r.eligible ? "eligible" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Applicants type the link freehand, so it is only rendered as an anchor when
 * it parses as http(s); anything else (including `javascript:`) is shown as
 * inert text. The page asks them to "bring something you built", so the link
 * is the thing founders actually review — the original list showed emails only.
 */
function safeHref(raw: string | null): string | null {
  if (!raw) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(candidate);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

function Requests() {
  const q = useQuery({
    queryKey: ["join-requests"],
    queryFn: async () =>
      (
        await supabase
          .from("join_requests")
          .select("id, email, link, note, created_at")
          .order("created_at", { ascending: false })
          .limit(50)
      ).data ?? [],
  });
  return (
    <section className={box}>
      <p className={label}>// public access requests · newest first</p>
      {!q.data?.length && <p className="mt-3 text-sm text-muted-foreground">None yet.</p>}
      <ul className="mt-3 divide-y divide-border font-mono text-xs">
        {q.data?.map((r) => {
          const href = safeHref(r.link);
          return (
            <li key={r.id} className="py-2">
              <div className="flex flex-wrap gap-x-3">
                <span className="text-muted-foreground">
                  {r.created_at.slice(0, 16).replace("T", " ")}
                </span>
                <span>{r.email}</span>
              </div>
              {r.link &&
                (href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-1 block break-all text-signal hover:underline"
                  >
                    {r.link}
                  </a>
                ) : (
                  <span className="mt-1 block break-all text-muted-foreground">{r.link}</span>
                ))}
              {r.note && <p className="mt-1 font-sans text-muted-foreground">{r.note}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
