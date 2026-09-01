import "server-only";

import type { PoolClient } from "pg";

export const MAX_LOGIN_FAILURES = 5;
const LOCK_MINUTES = 5;

export interface LoginLockStatus {
  failedCount: number;
  lockedUntil: string | null;
  isLocked: boolean;
}

export function statusFromUser(row: { failed_login_count: number; locked_until: Date | string | null }): LoginLockStatus {
  const lockedUntil = row.locked_until ? new Date(row.locked_until).toISOString() : null;
  return {
    failedCount: row.failed_login_count,
    lockedUntil,
    isLocked: Boolean(lockedUntil && new Date(lockedUntil).getTime() > Date.now()),
  };
}

export async function recordFailedLogin(client: PoolClient, userId: string) {
  const result = await client.query<{ failed_login_count: number; locked_until: Date | string | null }>(
    `update public.users
     set failed_login_count = failed_login_count + 1,
         locked_until = case
           when failed_login_count + 1 >= $2 then now() + make_interval(mins => $3)
           else locked_until
         end
     where id = $1
     returning failed_login_count, locked_until`,
    [userId, MAX_LOGIN_FAILURES, LOCK_MINUTES],
  );
  return statusFromUser(result.rows[0]);
}

export function attemptsRemaining(status: LoginLockStatus) {
  return Math.max(0, MAX_LOGIN_FAILURES - status.failedCount);
}
