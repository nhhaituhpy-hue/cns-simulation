import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumePasswordVerificationTime: vi.fn(),
  createUserSession: vi.fn(),
  getCurrentProfile: vi.fn(),
  getCurrentProfileForPasswordChange: vi.fn(),
  hashPassword: vi.fn(),
  query: vi.fn(),
  queryDatabase: vi.fn(),
  recordFailedLogin: vi.fn(),
  replaceSessionsAfterPasswordChange: vi.fn(),
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
  hashPassword: mocks.hashPassword,
  validPassword: vi.fn(() => true),
  verifyPassword: mocks.verifyPassword,
}));

vi.mock("@/lib/auth/profile", () => ({
  getCurrentProfile: mocks.getCurrentProfile,
  getCurrentProfileForPasswordChange: mocks.getCurrentProfileForPasswordChange,
}));

vi.mock("@/lib/auth/session", () => ({
  createUserSession: mocks.createUserSession,
  replaceSessionsAfterPasswordChange: mocks.replaceSessionsAfterPasswordChange,
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

import { changeOwnPasswordAction, loginAction } from "@/app/login/actions";

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

describe("changeOwnPasswordAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentProfile.mockResolvedValue({
      id: "10000000-0000-4000-8000-000000000001",
      email: "admin@attech.com.vn",
      fullName: "Quản trị viên",
      workUnit: "Trung tâm CNS",
      role: "admin",
      mustChangePassword: false,
    });
    mocks.queryDatabase.mockResolvedValue({ rows: [{ password_hash: "stored-hash" }] });
    mocks.hashPassword.mockResolvedValue("next-hash");
  });

  it("rejects an incorrect current password without changing sessions", async () => {
    mocks.verifyPassword.mockResolvedValueOnce(false);

    const result = await changeOwnPasswordAction({
      currentPassword: "WrongPass2026",
      password: "NextPass2026",
      confirmPassword: "NextPass2026",
    });

    expect(result).toMatchObject({ ok: false, message: "Mật khẩu hiện tại không đúng." });
    expect(mocks.replaceSessionsAfterPasswordChange).not.toHaveBeenCalled();
    expect(mocks.createUserSession).not.toHaveBeenCalled();
  });

  it("changes the password, revokes old sessions, and creates a fresh session", async () => {
    mocks.verifyPassword.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const result = await changeOwnPasswordAction({
      currentPassword: "CurrentPass2026",
      password: "NextPass2026",
      confirmPassword: "NextPass2026",
    });

    expect(mocks.hashPassword).toHaveBeenCalledWith("NextPass2026");
    expect(mocks.replaceSessionsAfterPasswordChange).toHaveBeenCalledWith(
      "10000000-0000-4000-8000-000000000001",
      "next-hash",
    );
    expect(mocks.createUserSession).toHaveBeenCalledWith("10000000-0000-4000-8000-000000000001");
    expect(result).toMatchObject({ ok: true, code: "SUCCESS", role: "admin" });
  });
});
