import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("internal password hashing", () => {
  it("uses a unique salt and verifies only the original password", async () => {
    const first = await hashPassword("ValidPass2026");
    const second = await hashPassword("ValidPass2026");

    expect(first).not.toBe(second);
    await expect(verifyPassword("ValidPass2026", first)).resolves.toBe(true);
    await expect(verifyPassword("WrongPass2026", first)).resolves.toBe(false);
  });
});
