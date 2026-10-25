import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { DmePmdtLoginDialog } from "@/components/dme/pmdt-login-dialog";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

beforeEach(() => useDmePmdtStore.getState().reset());

function LoginHost() {
  const open = useDmePmdtStore((state) => state.loginDialogOpen);
  return open ? <DmePmdtLoginDialog /> : null;
}

function invalidCredentials() {
  fireEvent.change(screen.getByLabelText("User ID"), { target: { value: "privacy-invalid-user" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "privacy-invalid-input" } });
}

function expectEmpty() {
  expect(screen.getByLabelText("User ID")).toHaveValue("");
  expect(screen.getByLabelText("Password")).toHaveValue("");
}

describe("DME native login privacy", () => {
  it("starts empty and does not request saved website credentials", () => {
    render(<LoginHost />);
    expectEmpty();
    expect(screen.getByRole("form", { name: "Login" })).toHaveAttribute("autocomplete", "off");
    expect(screen.getByLabelText("User ID")).toHaveAttribute("autocomplete", "off");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("clears a rejected attempt but preserves the failure count and error", () => {
    render(<LoginHost />);
    invalidCredentials();
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid User ID or Password.");
    expect(useDmePmdtStore.getState().failedLoginAttempts).toBe(1);
    expectEmpty();
  });

  it.each(["Cancel", "Cancel login"])("discards input using %s without authenticating or recording a failed attempt", (name) => {
    render(<LoginHost />);
    invalidCredentials();
    fireEvent.click(screen.getByRole("button", { name }));
    expectEmpty();
    expect(useDmePmdtStore.getState().securityLevel).toBe(0);
    expect(useDmePmdtStore.getState().failedLoginAttempts).toBe(0);
  });

  it("submits with Enter and retains the three-attempt lockout after clearing", async () => {
    const user = userEvent.setup();
    render(<LoginHost />);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      invalidCredentials();
      screen.getByLabelText("Password").focus();
      await user.keyboard("{Enter}");
      expectEmpty();
    }
    expect(screen.getByRole("alert")).toHaveTextContent("Logon blocked for 5 minutes after 3 failed attempts.");
    expect(useDmePmdtStore.getState().loginBlockedUntil).not.toBeNull();
    const account = useDmePmdtStore.getState().data.securityAccounts.find((item) => item.securityLevel === 3)!;
    fireEvent.change(screen.getByLabelText("User ID"), { target: { value: account.userId } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: account.password } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expectEmpty();
    expect(useDmePmdtStore.getState().securityLevel).toBe(0);
    expect(screen.getByRole("alert")).toHaveTextContent("Logon blocked.");
  });

  it("opens empty after native login/logout without persisting the input draft", () => {
    const account = useDmePmdtStore.getState().data.securityAccounts.find((item) => item.securityLevel === 3)!;
    render(<LoginHost />);
    fireEvent.change(screen.getByLabelText("User ID"), { target: { value: account.userId } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: account.password } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(useDmePmdtStore.getState().securityLevel).toBe(3);
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    act(() => useDmePmdtStore.getState().logout());
    expectEmpty();
    expect(useDmePmdtStore.getState().securityLevel).toBe(0);
  });

  it("does not restore unfinished input when the dialog remounts", () => {
    const mounted = render(<LoginHost />);
    invalidCredentials();
    mounted.unmount();
    render(<LoginHost />);
    expectEmpty();
  });
});
