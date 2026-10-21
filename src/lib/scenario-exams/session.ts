import "server-only";

import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";

const COOKIE_NAME = "cns_scenario_exam_session";

export function hashScenarioExamSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createScenarioExamSessionToken(): { value: string; hash: string } {
  const value = randomBytes(32).toString("base64url");
  return { value, hash: hashScenarioExamSessionToken(value) };
}

export async function getScenarioExamSessionToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE_NAME)?.value ?? null;
}

export async function setScenarioExamSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // Retain the same code-scoped token only for post-deadline review. Every
    // mutation still checks the immutable database deadline and current owner.
    expires: new Date(expiresAt.getTime() + 24 * 60 * 60_000),
    path: "/student/scenario-exams",
    priority: "high",
  });
}

export async function clearScenarioExamSessionCookie() {
  (await cookies()).delete(COOKIE_NAME);
}
