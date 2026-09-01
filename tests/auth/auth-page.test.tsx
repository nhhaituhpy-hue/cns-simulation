import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loginAction: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

vi.mock("@/app/login/actions", () => ({
  loginAction: mocks.loginAction,
}));

import { AuthPage } from "@/components/auth/auth-page";

async function submitLogin() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Tên đăng nhập"), "admin");
  await user.type(screen.getByLabelText("Mật khẩu"), "ValidPass2026");
  await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
}

describe("AuthPage redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loginAction.mockResolvedValue({
      ok: true,
      code: "SUCCESS",
      message: "Đăng nhập thành công.",
      role: "admin",
      mustChangePassword: false,
    });
  });

  it("redirects a normal login to the home page", async () => {
    render(<AuthPage />);
    await submitLogin();

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
  });

  it("keeps an explicit internal next path", async () => {
    render(<AuthPage nextPath="/simulator" />);
    await submitLogin();

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/simulator"));
  });

  it("still requires the first password change before opening the home page", async () => {
    mocks.loginAction.mockResolvedValueOnce({
      ok: true,
      code: "SUCCESS",
      message: "Đăng nhập thành công.",
      role: "admin",
      mustChangePassword: true,
    });
    render(<AuthPage />);
    await submitLogin();

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/change-password"));
  });
});
