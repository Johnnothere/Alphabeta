import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { clientIp } from "@/lib/client-ip";

const codeInput = z.object({ code: z.string().trim().min(4).max(64) });

async function sha256(code: string) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(code.trim().toUpperCase()),
  );
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const WINDOW_MINUTES = 15;
const MAX_TRIES = 8;

type Throttled = { throttled: true };
type Looked = { throttled: false; codeId: string | null };

/**
 * Records an attempt and returns the matching usable code, if any.
 *
 * Attempts are counted before the lookup so a burst of wrong guesses is paid
 * for whether or not any of them hit.
 */
async function lookupCode(code: string): Promise<Throttled | Looked> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ip = clientIp();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const { count } = await supabaseAdmin
    .from("code_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_TRIES) return { throttled: true };

  await supabaseAdmin.from("code_attempts").insert({ ip });

  const { data } = await supabaseAdmin
    .from("access_codes")
    .select("id, active, expires_at, max_uses, uses")
    .eq("code_hash", await sha256(code))
    .maybeSingle();

  const usable =
    data &&
    data.active &&
    (!data.expires_at || new Date(data.expires_at) > new Date()) &&
    (data.max_uses == null || data.uses < data.max_uses);

  return { throttled: false, codeId: usable ? data.id : null };
}

/**
 * Validates a code typed in the public terminal, before the visitor has an
 * account. Returns an opaque single-use ticket rather than echoing the code
 * back, so the browser never has to hold the plaintext secret across the
 * sign-up round trip.
 */
export const checkAccessCode = createServerFn({ method: "POST" })
  .inputValidator((d) => codeInput.parse(d))
  .handler(async ({ data }) => {
    const result = await lookupCode(data.code);
    if (result.throttled) return { ok: false as const, reason: "throttled" as const };
    if (!result.codeId) return { ok: false as const, reason: "invalid" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ticket, error } = await supabaseAdmin
      .from("access_tickets")
      .insert({ code_id: result.codeId })
      .select("id")
      .single();
    if (error || !ticket) return { ok: false as const, reason: "invalid" as const };

    return { ok: true as const, ticket: ticket.id };
  });

const redeemInput = z
  .object({
    code: z.string().trim().min(4).max(64).optional(),
    ticket: z.string().uuid().optional(),
  })
  .refine((v) => Boolean(v.code || v.ticket), { message: "code or ticket required" });

/** Binds a role to the signed-in account, from either a ticket or a raw code. */
export const redeemAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => redeemInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let codeId: string | null = null;

    if (data.ticket) {
      // Claim the ticket by flipping used_at under a filter that only matches
      // an unused, unexpired row — so two concurrent requests cannot both win.
      const { data: claimed } = await supabaseAdmin
        .from("access_tickets")
        .update({ used_at: new Date().toISOString() })
        .eq("id", data.ticket)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .select("code_id")
        .maybeSingle();
      codeId = claimed?.code_id ?? null;
      if (!codeId) return { ok: false as const, reason: "invalid" as const };
    } else if (data.code) {
      const result = await lookupCode(data.code);
      if (result.throttled) return { ok: false as const, reason: "throttled" as const };
      codeId = result.codeId;
      if (!codeId) return { ok: false as const, reason: "invalid" as const };
    }

    // All the accounting — use counting, redemption record, role grant — happens
    // inside one transaction with the code row locked. Doing it from here with
    // separate reads and writes loses increments when two people redeem at once.
    const { data: role, error } = await supabaseAdmin.rpc("redeem_code", {
      _code_id: codeId!,
      _user_id: context.userId,
    });
    if (error) return { ok: false as const, reason: "invalid" as const };

    return { ok: true as const, role };
  });

export const createAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        label: z.string().trim().min(1).max(80),
        role: z.enum(["member", "founder"]),
        maxUses: z.number().int().min(1).max(10_000).nullable(),
        expiresInDays: z.number().int().min(1).max(365).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isFounder } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "founder",
    });
    if (!isFounder) throw new Error("Forbidden");

    // Rejection-sampled so every symbol is equally likely. The original used
    // `byte % 32` over 256 byte values, which is a clean multiple here and so
    // happened to be unbiased — but it breaks silently the moment the alphabet
    // length changes, so sample properly instead of relying on that.
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const pick = () => {
      const limit = 256 - (256 % alphabet.length);
      const buf = new Uint8Array(1);
      let byte: number;
      do {
        crypto.getRandomValues(buf);
        byte = buf[0]!;
      } while (byte >= limit);
      return alphabet[byte % alphabet.length]!;
    };
    const body = Array.from({ length: 12 }, pick).join("");
    const code = `AB-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8)}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("access_codes").insert({
      code_hash: await sha256(code),
      label: data.label,
      grants_role: data.role,
      max_uses: data.maxUses,
      expires_at: data.expiresInDays
        ? new Date(Date.now() + data.expiresInDays * 86_400_000).toISOString()
        : null,
    });
    if (error) throw new Error("could not create code");

    return { code };
  });
