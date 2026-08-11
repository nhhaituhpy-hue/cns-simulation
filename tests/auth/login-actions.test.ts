import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearFailedLogins: vi.fn(),
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  getLoginLockStatus: vi.fn(),
  recordFailedLogin: vi.fn(),
}));

vi.mock("@/lib/auth/login-lockout", () => ({
  attemptsRemaining: vi.fn(() => 4),
  clearFailedLogins: mocks.clearFailedLogins,
  getLoginLockStatus: mocks.getLoginLockStatus,
  recordFailedLogin: mocks.recordFailedLogin,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  RedirectType: { replace: "replace" },
}));

import { checkSignupEmailAction, loginAction, signUpAction } from "@/app/login/actions";

describe("loginAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLoginLockStatus.mockResolvedValue({ isLocked: false });
    mocks.clearFailedLogins.mockResolvedValue(undefined);
  });

  it("loads only the authenticated admin profile by user id", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: { id: "admin-user-id" } },
      error: null,
    });

    mocks.createClient.mockResolvedValue({
      auth: {
        signInWithPassword,
        signOut: vi.fn(),
      },
      from,
    });

    const result = await loginAction({
      username: "tuh",
      password: "ValidPass2026",
    });

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "tuh@attech.com.vn",
      password: "ValidPass2026",
    });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith("role");
    expect(eq).toHaveBeenCalledWith("id", "admin-user-id");
    expect(single).toHaveBeenCalledOnce();
    expect(result).toEqual({
      ok: true,
      code: "SUCCESS",
      message: "Đăng nhập thành công.",
      role: "admin",
    });
  });
});

describe("signup email validation", () => {
  function mockRegisteredEmail() {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "existing-user-id" },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    mocks.createAdminClient.mockReturnValue({ from });
    return { from, select, eq, maybeSingle };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects an email that is already registered before sign-up", async () => {
    const query = mockRegisteredEmail();

    const result = await checkSignupEmailAction("existing@attech.com.vn");

    expect(query.from).toHaveBeenCalledWith("profiles");
    expect(query.select).toHaveBeenCalledWith("id");
    expect(query.eq).toHaveBeenCalledWith("email", "existing@attech.com.vn");
    expect(result).toMatchObject({
      ok: false,
      code: "EMAIL_ALREADY_REGISTERED",
    });
  });

  it("blocks a duplicate email when the registration form is submitted", async () => {
    mockRegisteredEmail();

    const result = await signUpAction({
      fullName: "Nguyễn Văn A",
      email: "existing@attech.com.vn",
      password: "ValidPass2026",
      workUnit: "Đài DVOR/DME",
    });

    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      code: "EMAIL_ALREADY_REGISTERED",
    });
  });
});
