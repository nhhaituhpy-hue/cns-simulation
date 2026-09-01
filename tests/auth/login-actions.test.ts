import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumePasswordVerificationTime: vi.fn(),
  createUserSession: vi.fn(),
  query: vi.fn(),
  queryDatabase: vi.fn(),
  recordFailedLogin: vi.fn(),
  verifyPassword: vi.fn(),
  withDatabaseTransaction: vi.fn(),
}));

vi.mock("@/lib/auth/login-lockout", () => ({
  attemptsRemaining: vi.fn(() => 4),
  recordFailedLogin: mocks.recordFailedLogin,
  statusFromUser: vi.fn(() => ({ failedCount: 0, lockedUntil: null, isLocked: false })),
}));

vi.mock("@/lib/auth/password", () => ({
  consumePasswordVerificationTime: mocks.consumePasswordVerificationTime,
  hashPassword: vi.fn(),
  validPassword: vi.fn(() => true),
  verifyPassword: mocks.verifyPassword,
}));

vi.mock("@/lib/auth/profile", () => ({
  getCurrentProfileForPasswordChange: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  createUserSession: mocks.createUserSession,
  replaceSessionsAfterPasswordChange: vi.fn(),
  revokeCurrentSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  queryDatabase: mocks.queryDatabase,
  withDatabaseTransaction: mocks.withDatabaseTransaction,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  RedirectType: { replace: "replace" },
}));

import { loginAction } from "@/app/login/actions";

describe("loginAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withDatabaseTransaction.mockImplementation(
      async (work: (client: { query: typeof mocks.query }) => Promise<unknown>) => work({ query: mocks.query }),
    );
  });

  it("loads the internal account by normalized username and creates an opaque session", async () => {
    mocks.query
      .mockResolvedValueOnce({
        rows: [{
          id: "10000000-0000-4000-8000-000000000001",
          password_hash: "stored-hash",
          role: "admin",
          is_active: true,
          must_change_password: false,
          temporary_password_expires_at: null,
          failed_login_count: 0,
          locked_until: null,
        }],
      })
      .mockResolvedValueOnce({ rows: [] });
    mocks.verifyPassword.mockResolvedValue(true);

    const result = await loginAction({
      username: "  TUH@attech.com.vn ",
      password: "ValidPass2026",
    });

    expect(mocks.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("where username = $1"),
      ["tuh"],
    );
    expect(mocks.verifyPassword).toHaveBeenCalledWith("ValidPass2026", "stored-hash");
    expect(mocks.createUserSession).toHaveBeenCalledWith("10000000-0000-4000-8000-000000000001");
    expect(result).toEqual({
      ok: true,
      code: "SUCCESS",
      message: "Đăng nhập thành công.",
      role: "admin",
      mustChangePassword: false,
    });
  });

  it("uses a dummy password check when the username does not exist", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [] });

    const result = await loginAction({ username: "missing", password: "InvalidPass2026" });

    expect(mocks.consumePasswordVerificationTime).toHaveBeenCalledWith("InvalidPass2026");
    expect(mocks.createUserSession).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, code: "INVALID_CREDENTIALS" });
  });
});
