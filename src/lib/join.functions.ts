import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { clientIp } from "@/lib/client-ip";

const WINDOW_MINUTES = 60;
const MAX_PER_WINDOW = 5;

const joinInput = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  link: z.string().trim().max(500).optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  // Honeypot: a field positioned off-screen that a person never sees and so
  // never fills in. Most form bots fill every input they can find.
  confirmUrl: z.string().max(0).optional(),
});

/**
 * Public join request.
 *
 * The original inserted straight from the browser under an
 * `insert ... with check (true)` policy, so a loop in a console could add rows
 * to the table indefinitely. Submissions now land here, where they can be
 * rate-limited by IP and deduplicated, and the anon role has no insert grant
 * on the table at all.
 */
export const submitJoinRequest = createServerFn({ method: "POST" })
  .inputValidator((d) => joinInput.parse(d))
  .handler(async ({ data }) => {
    if (data.confirmUrl) return { ok: false as const, reason: "invalid" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip = clientIp();
    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

    const { count } = await supabaseAdmin
      .from("join_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_PER_WINDOW) return { ok: false as const, reason: "throttled" as const };

    await supabaseAdmin.from("join_attempts").insert({ ip });

    const { error } = await supabaseAdmin.from("join_requests").insert({
      email: data.email,
      link: data.link || null,
      note: data.note || null,
      source_ip: ip,
    });

    // 23505 = unique_violation. A repeat submission is already queued, which is
    // the same outcome the sender wants; reporting it as an error would just
    // invite them to retry.
    if (error && error.code !== "23505") return { ok: false as const, reason: "error" as const };

    return { ok: true as const, duplicate: error?.code === "23505" };
  });
