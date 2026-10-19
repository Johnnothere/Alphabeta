#!/usr/bin/env node
/**
 * Mints an access code and stores only its hash.
 *
 * Use this once to bootstrap the first founder, before any founder account
 * exists to use the admin UI. Prints the code to stdout exactly once — it is
 * not recoverable afterwards, by design.
 *
 *   SUPABASE_DB_URL=postgres://... node scripts/new-access-code.mjs \
 *     --label "founder bootstrap" --role founder --max-uses 1 --expires-days 7
 */
import { createHash, randomInt } from "node:crypto";
import postgres from "postgres";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const label = flag("label", "untitled");
const role = flag("role", "member");
const maxUses = flag("max-uses", "1");
const expiresDays = flag("expires-days", "7");

if (!["member", "founder"].includes(role)) {
  console.error(`--role must be "member" or "founder"`);
  process.exit(1);
}

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error(
    "SUPABASE_DB_URL is required (Supabase dashboard → Project Settings → Database → Connection string).",
  );
  process.exit(1);
}

// Crockford-ish alphabet: no I, O, 0 or 1, so a code read aloud or copied off a
// screen cannot be mistyped into a different valid code.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
// randomInt is rejection-sampled, so unlike `byte % 32` every symbol is
// equally likely. 12 symbols over a 32-symbol alphabet is 60 bits.
const body = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const code = `AB-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8)}`;

const hash = createHash("sha256").update(code.trim().toUpperCase(), "utf8").digest("hex");

const sql = postgres(dbUrl, { max: 1, ssl: "require" });
try {
  await sql`
    insert into public.access_codes (code_hash, label, grants_role, max_uses, expires_at)
    values (
      ${hash}, ${label}, ${role}::public.app_role,
      ${maxUses === "null" ? null : Number(maxUses)},
      ${expiresDays === "null" ? null : new Date(Date.now() + Number(expiresDays) * 86_400_000)}
    )
  `;
  console.log(`\n  ${code}\n`);
  console.log(`  role=${role} label="${label}" max_uses=${maxUses} expires_in_days=${expiresDays}`);
  console.log("  Copy it now. Only the hash is stored.\n");
} finally {
  await sql.end();
}
