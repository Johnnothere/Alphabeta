import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { clientIp } from "@/lib/client-ip";
import { recordAttempt } from "@/lib/access.functions";

const WINDOW_MINUTES = 60;
const MAX_PER_WINDOW = 5;

const joinInput = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  link: z.string().trim().max(500).optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  // Honeypot: a field positioned off-screen that a person never sees and so
  // never fills in. Most form bots fill every input they can find. Any length
  // is accepted at the schema so a filled trap reaches the handler, which then
  // answers "accepted" without storing anything — a bot told it was rejected
  // just adjusts and retries.
  confirmUrl: z.string().max(2000).optional(),
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
  .validator((d) => joinInput.parse(d))
  .handler(async ({ data }) => {
    if (data.confirmUrl) return { ok: true as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip = clientIp();

    // Count-and-record in one locked database call, so concurrent submissions
    // from one address cannot all pass the check together. Fails closed.
    const allowed = await recordAttempt(supabaseAdmin, "record_join_attempt", "join_attempts", {
      ip,
      windowMinutes: WINDOW_MINUTES,
      max: MAX_PER_WINDOW,
    });
    if (!allowed) return { ok: false as const, reason: "throttled" as const };

    // The table requires a link of at least 4 characters; anything shorter is
    // not a usable link, so store nothing rather than fail the whole request.
    const link = data.link && data.link.length >= 4 ? data.link : null;

    const { error } = await supabaseAdmin.from("join_requests").insert({
      email: data.email,
      link,
      note: data.note || null,
      source_ip: ip,
    });

    // 23505 = unique_violation. A repeat submission is already queued, which is
    // the same outcome the sender wants. It is deliberately not reported back:
    // distinguishing "queued" from "already queued" would let anyone test
    // whether a given address has applied.
    if (error && error.code !== "23505") return { ok: false as const, reason: "error" as const };

    return { ok: true as const };
  });
