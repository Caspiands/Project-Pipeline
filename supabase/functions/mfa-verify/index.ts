// mfa-verify: checks the 6-digit code and, if correct, marks the caller's login session as verified.
// Every table policy in the database requires a verified session, so nothing is readable before this succeeds.
import { codeHash, getCaller, HttpError, json, MFA, safeEqual, serve } from "../_shared/common.ts";

serve(async (req) => {
  const c = await getCaller(req);
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) throw new HttpError(400, "Enter the 6-digit code from the email.");

  const { data: ch, error } = await c.admin
    .from("mfa_challenges")
    .select("id, code_hash, attempts, expires_at")
    .eq("user_id", c.user.id)
    .eq("session_id", c.sessionId)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!ch || new Date(ch.expires_at) < new Date()) {
    throw new HttpError(400, "This code has expired. Ask for a new one.", { expired: true });
  }
  if (ch.attempts >= MFA.maxAttempts) {
    await c.admin.from("mfa_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", ch.id);
    throw new HttpError(429, "Too many wrong codes. Ask for a new one.", { expired: true });
  }

  await c.admin.from("mfa_challenges").update({ attempts: ch.attempts + 1 }).eq("id", ch.id);

  const ok = safeEqual(await codeHash(c.user.id, c.sessionId, code), ch.code_hash);
  if (!ok) {
    const remaining = MFA.maxAttempts - (ch.attempts + 1);
    throw new HttpError(400, remaining > 0 ? `That code is not right. ${remaining} tries left.` : "Too many wrong codes. Ask for a new one.", {
      remaining,
      expired: remaining <= 0,
    });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + MFA.sessionHours * 3_600_000).toISOString();
  await c.admin.from("mfa_challenges").update({ consumed_at: now.toISOString() }).eq("id", ch.id);
  const { error: upErr } = await c.admin.from("mfa_verified_sessions").upsert({
    session_id: c.sessionId,
    user_id: c.user.id,
    verified_at: now.toISOString(),
    expires_at: expiresAt,
  });
  if (upErr) throw upErr;

  return json({ verified: true, expires_at: expiresAt, role: c.role });
});
