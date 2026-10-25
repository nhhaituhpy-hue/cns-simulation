import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { SELEX_DVOR_TRAINING_ACCOUNTS } from "@/lib/simulator-training-accounts";
import { PmdtLoginDialog } from "@/components/vor/pmdt-login-dialog";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

beforeEach(() => useVorPmdtStore.getState().reset());

function LoginHost() {
  const open = useVorPmdtStore((state) => state.loginDialogOpen);
  return open ? <PmdtLoginDialog /> : null;
}

function enterInvalidCredentials() {
  fireEvent.change(screen.getByLabelText("User ID"), { target: { value: "privacy-test-operator" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "privacy-test-invalid" } });
}

function expectEmptyFields() {
  expect(screen.getByLabelText("User ID")).toHaveValue("");
  expect(screen.getByLabelText("Password")).toHaveValue("");
}

describe("native PMDT login credential privacy", () => {
  it("starts blank and opts the native dialog out of web credential autofill", () => {
    render(<LoginHost />);
    expectEmptyFields();
    expect(screen.getByRole("form", { name: "Login" })).toHaveAttribute("autocomplete", "off");
    expect(screen.getByLabelText("User ID")).toHaveAttribute("autocomplete", "off");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("clears both fields even after a rejected login without hiding the error", () => {
    render(<LoginHost />);
    enterInvalidCredentials();
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid User ID or Password.");
    expectEmptyFields();
    expect(useVorPmdtStore.getState().securityLevel).toBe(0);
    expect(useVorPmdtStore.getState().loginDialogOpen).toBe(true);
  });

  it.each(["Cancel", "Cancel login"])("clears both fields using %s without granting access", (name) => {
    render(<LoginHost />);
    enterInvalidCredentials();
    fireEvent.click(screen.getByRole("button", { name }));
    expectEmptyFields();
    expect(useVorPmdtStore.getState().securityLevel).toBe(0);
  });

  it("opens empty again after a successful native login and logout", () => {
    const account = SELEX_DVOR_TRAINING_ACCOUNTS.find((item) => item.securityLevel === 3)!;
    render(<LoginHost />);
    fireEvent.change(screen.getByLabelText("User ID"), { target: { value: account.userId } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: account.password } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(useVorPmdtStore.getState().securityLevel).toBe(3);
    act(() => useVorPmdtStore.getState().logout());
    expectEmptyFields();
    expect(useVorPmdtStore.getState().securityLevel).toBe(0);
  });

  it("does not repopulate prior input when the login dialog is remounted", () => {
    const mounted = render(<LoginHost />);
    enterInvalidCredentials();
    mounted.unmount();
    render(<LoginHost />);
    expectEmptyFields();
  });
});
