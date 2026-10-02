// admin-invite: lets a verified admin invite a colleague by email and set their role.
// Public sign-up stays switched off; this is the only way new logins are created.
import { getCaller, HttpError, isSessionVerified, json, serve } from "../_shared/common.ts";

const ROLES = ["admin", "editor", "viewer"] as const;

serve(async (req) => {
  const c = await getCaller(req);
  if (c.role !== "admin") throw new HttpError(403, "Only admins can invite people.");
  if (!(await isSessionVerified(c))) throw new HttpError(403, "Confirm your sign-in code first.");

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const fullName = String(body?.full_name ?? "").trim();
  const role = String(body?.role ?? "viewer");
  const personName = String(body?.person_name ?? fullName).trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Enter a valid email address.");
  if (!ROLES.includes(role as typeof ROLES[number])) throw new HttpError(400, "Role must be admin, editor or viewer.");

  const allowed = (Deno.env.get("ALLOWED_EMAIL_DOMAINS") ?? "").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (allowed.length && !allowed.includes(email.split("@")[1])) {
    throw new HttpError(400, `Only these email domains can be invited: ${allowed.join(", ")}.`);
  }

  const redirectTo = Deno.env.get("SITE_URL") ?? undefined;
  const { data, error } = await c.admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName }, redirectTo });
  if (error) {
    const already = /already/i.test(error.message);
    throw new HttpError(already ? 409 : 400, already ? "This person already has a login." : error.message);
  }
  const userId = data.user.id;

  // The new-user trigger has created the profile; set the role and name.
  const { error: pErr } = await c.admin.from("profiles").update({ role, full_name: fullName || null }).eq("id", userId);
  if (pErr) throw pErr;

  // Link (or create) the matching owner record so deals can be assigned to them.
  if (personName) {
    const { data: person } = await c.admin.from("people").select("id").ilike("name", personName).maybeSingle();
    if (person) {
      await c.admin.from("people").update({ email, profile_id: userId }).eq("id", person.id);
    } else {
      await c.admin.from("people").insert({ name: personName, email, profile_id: userId });
    }
  }

  return json({ invited: true, user_id: userId, email, role });
});
