import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { queryDatabase, withDatabaseTransaction } from "@/lib/db";

const DEFAULT_COOKIE_NAME = "cns_session";
const DEFAULT_TTL_HOURS = 12;

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function sessionCookieName() {
  return process.env.SESSION_COOKIE_NAME?.trim() || DEFAULT_COOKIE_NAME;
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createUserSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const ttlHours = positiveInteger(process.env.SESSION_TTL_HOURS, DEFAULT_TTL_HOURS);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  await queryDatabase(
    `insert into public.user_sessions (user_id, token_hash, expires_at)
     values ($1, $2, $3)`,
    [userId, hashSessionToken(token), expiresAt],
  );

  (await cookies()).set(sessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
    priority: "high",
  });
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;
  if (token) {
    await queryDatabase(
      `update public.user_sessions
       set revoked_at = coalesce(revoked_at, now())
       where token_hash = $1`,
      [hashSessionToken(token)],
    );
  }
  cookieStore.delete(sessionCookieName());
}

export async function replaceSessionsAfterPasswordChange(userId: string, passwordHash: string) {
  await withDatabaseTransaction(async (client) => {
    await client.query(
      `update public.users
       set password_hash = $2,
           must_change_password = false,
           temporary_password_expires_at = null,
           password_changed_at = now(),
           failed_login_count = 0,
           locked_until = null
       where id = $1 and is_active`,
      [userId, passwordHash],
    );
    await client.query(
      `update public.user_sessions
       set revoked_at = coalesce(revoked_at, now())
       where user_id = $1 and revoked_at is null`,
      [userId],
    );
  });
}
