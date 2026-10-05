// mfa-send: emails a 6-digit one-time code for the caller's current login session.
// Called by the app right after a successful email + password sign-in.
import { codeHash, getCaller, HttpError, json, maskEmail, MFA, serve, sixDigitCode } from "../_shared/common.ts";

serve(async (req) => {
  const c = await getCaller(req);
  const email = c.user.email;
  if (!email) throw new HttpError(400, "This account has no email address.");

  const since15 = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: recent, error: recentErr } = await c.admin
    .from("mfa_challenges")
    .select("created_at, session_id")
    .eq("user_id", c.user.id)
    .gte("created_at", since15)
    .order("created_at", { ascending: false });
  if (recentErr) throw recentErr;

  if ((recent?.length ?? 0) >= MFA.maxSendsPer15Min) {
    throw new HttpError(429, "Too many codes requested. Wait 15 minutes and try again.");
  }
  const last = recent?.find((r) => r.session_id === c.sessionId);
  if (last) {
    const waited = (Date.now() - new Date(last.created_at).getTime()) / 1000;
    if (waited < MFA.resendCooldownSeconds) {
      const retry = Math.ceil(MFA.resendCooldownSeconds - waited);
      throw new HttpError(429, `Wait ${retry} seconds before asking for another code.`, { retry_after: retry });
    }
  }

  // Only the newest code for a session is valid.
  await c.admin.from("mfa_challenges").update({ consumed_at: new Date().toISOString() })
    .eq("user_id", c.user.id).eq("session_id", c.sessionId).is("consumed_at", null);

  const code = sixDigitCode();
  const expires = new Date(Date.now() + MFA.codeMinutes * 60_000);
  const { data: row, error: insErr } = await c.admin.from("mfa_challenges").insert({
    user_id: c.user.id,
    session_id: c.sessionId,
    code_hash: await codeHash(c.user.id, c.sessionId, code),
    expires_at: expires.toISOString(),
  }).select("id").single();
  if (insErr) throw insErr;

  const sent = await sendEmail(email, code, MFA.codeMinutes);
  if (!sent) {
    await c.admin.from("mfa_challenges").delete().eq("id", row.id);
    throw new HttpError(502, "We could not send the email. Try again, or contact the board admin.");
  }

  return json({ sent: true, email_hint: maskEmail(email), expires_in_seconds: MFA.codeMinutes * 60 });
});

function parseSender(from: string): { name: string; email: string } {
  const m = from.match(/^(.+?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: "CDS Pipeline", email: from.trim() };
}

async function sendEmail(to: string, code: string, minutes: number): Promise<boolean> {
  const fromRaw = Deno.env.get("MFA_FROM_EMAIL") ?? "CDS Pipeline <no-reply@caspiands.com>";
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  const text =
    `Your CDS Pipeline Board sign-in code is ${spaced}.\n\n` +
    `It expires in ${minutes} minutes and works once.\n\n` +
    `If you did not try to sign in, ignore this email and tell the board admin; someone may know your password.`;
  const html = `
  <div style="font-family:Arial,sans-serif;font-size:15px;color:#16201b;max-width:480px">
    <p>Your CDS Pipeline Board sign-in code is:</p>
    <p style="font-size:30px;letter-spacing:6px;font-weight:bold;margin:18px 0">${spaced}</p>
    <p>It expires in ${minutes} minutes and works once.</p>
    <p style="color:#56645d;font-size:13px">If you did not try to sign in, ignore this email and tell the board admin; someone may know your password.</p>
  </div>`;
  const subject = "Your CDS Pipeline sign-in code";

  const brevoKey = Deno.env.get("BREVO_API_KEY");
  if (brevoKey) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevoKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: parseSender(fromRaw),
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
    });
    if (!res.ok) console.error("Brevo error", res.status, await res.text());
    return res.ok;
  }

  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    if (Deno.env.get("MFA_DEV_LOG_CODES") === "true") {
      // Local development only: never set MFA_DEV_LOG_CODES in production.
      console.log(`[dev] sign-in code for ${to}: ${code}`);
      return true;
    }
    console.error("RESEND_API_KEY is not set");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromRaw, to: [to], subject, text, html }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
  return res.ok;
}
