// Shared helpers for the CDS Pipeline Edge Functions (Deno runtime on Supabase).
import { createClient, type SupabaseClient, type User } from "jsr:@supabase/supabase-js@2";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export class HttpError extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Wraps a handler with CORS, method check and uniform error responses. */
export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Use POST" }, 405);
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, ...e.extra }, e.status);
      console.error(e);
      return json({ error: "Something went wrong. Try again in a minute." }, 500);
    }
  });
}

/** Service-role client: bypasses RLS. Never expose this key to the browser. */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split(".")[1] ?? "";
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
  return JSON.parse(atob(b64));
}

export interface Caller {
  user: User;
  sessionId: string;
  role: "admin" | "editor" | "viewer";
  admin: SupabaseClient;
}

/** Validates the caller's access token and returns who they are and which login session they are in. */
export async function getCaller(req: Request): Promise<Caller> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Sign in first.");
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token); // verifies signature and expiry
  if (error || !data.user) throw new HttpError(401, "Your sign-in has expired. Sign in again.");
  const claims = decodeJwtPayload(token);
  const sessionId = String(claims.session_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) throw new HttpError(401, "Sign in again to start a new session.");

  const { data: profile } = await admin.from("profiles").select("role, is_active").eq("id", data.user.id).maybeSingle();
  if (!profile || !profile.is_active) throw new HttpError(403, "Your access has been switched off. Contact the board admin.");
  return { user: data.user, sessionId, role: profile.role, admin };
}

export async function isSessionVerified(c: Caller): Promise<boolean> {
  const { data } = await c.admin
    .from("mfa_verified_sessions")
    .select("expires_at")
    .eq("session_id", c.sessionId)
    .eq("user_id", c.user.id)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return !!data;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison so response timing does not leak how much of a code matched. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Uniform 6-digit code (rejection sampling avoids modulo bias). */
export function sixDigitCode(): string {
  const max = Math.floor(0xffffffff / 1_000_000) * 1_000_000;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0] >= max);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

export function codeHash(userId: string, sessionId: string, code: string): Promise<string> {
  const pepper = Deno.env.get("MFA_PEPPER");
  if (!pepper || pepper.length < 32) throw new Error("MFA_PEPPER secret is missing or shorter than 32 characters");
  return sha256Hex(`${pepper}:${userId}:${sessionId}:${code}`);
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

export const MFA = {
  codeMinutes: Number(Deno.env.get("MFA_CODE_MINUTES") ?? 10),
  sessionHours: Number(Deno.env.get("MFA_SESSION_HOURS") ?? 12),
  maxAttempts: 5,
  maxSendsPer15Min: 5,
  resendCooldownSeconds: 60,
};
