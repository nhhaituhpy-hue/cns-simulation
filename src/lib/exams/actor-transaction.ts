import "server-only";

import type { PoolClient } from "pg";
import { getCurrentProfile } from "@/lib/auth/profile";
import { withDatabaseTransaction } from "@/lib/db";
import { ExamValidationError } from "./validation";

/** Never obtain actor identity from action arguments or a session-wide SET. */
export async function withExamActorTransaction<Result>(
  work: (client: PoolClient) => Promise<Result>,
): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!profile) throw new ExamValidationError("Bạn chưa đăng nhập.");
  return withDatabaseTransaction(async (client) => {
    // The transaction-local setting is reset on COMMIT and ROLLBACK, before
    // this connection returns to the shared pool. SQL rechecks current role.
    await client.query("select set_config('app.actor_user_id', $1, true)", [profile.id]);
    return work(client);
  });
}
