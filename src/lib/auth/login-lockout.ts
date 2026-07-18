import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_FAILURES = 5;

export interface LoginLockStatus {
  failedCount: number;
  lockedUntil: string | null;
  isLocked: boolean;
}

function emailDigest(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function statusFromRow(row: { failed_count?: unknown; locked_until?: unknown } | null): LoginLockStatus {
  const failedCount = typeof row?.failed_count === "number" ? row.failed_count : 0;
  const lockedUntil = typeof row?.locked_until === "string" ? row.locked_until : null;
  return {
    failedCount,
    lockedUntil,
    isLocked: Boolean(lockedUntil && new Date(lockedUntil).getTime() > Date.now()),
  };
}

export async function getLoginLockStatus(email: string): Promise<LoginLockStatus> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("auth_login_attempts")
    .select("failed_count,locked_until")
    .eq("email_hash", emailDigest(email))
    .maybeSingle();

  if (error) throw error;
  return statusFromRow(data);
}

export async function recordFailedLogin(email: string): Promise<LoginLockStatus> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("record_failed_login", {
    p_email_hash: emailDigest(email),
  });

  if (error) throw error;
  const result = data && typeof data === "object" ? data as Record<string, unknown> : {};
  return statusFromRow({
    failed_count: result.failed_count,
    locked_until: result.locked_until,
  });
}

export async function clearFailedLogins(email: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("auth_login_attempts")
    .delete()
    .eq("email_hash", emailDigest(email));

  if (error) throw error;
}

export function attemptsRemaining(status: LoginLockStatus) {
  return Math.max(0, MAX_FAILURES - status.failedCount);
}
