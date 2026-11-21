import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVorPmdtStore as store } from "@/stores/vor-pmdt-store";
import { RmsConfigLayout } from "@/components/vor/screens/rms-config-layout";
import { PmdtMenuBar } from "@/components/vor/pmdt-menu-bar";
import { PmdtLoginDialog } from "@/components/vor/pmdt-login-dialog";
import { ChangePasswordDialog } from "@/components/vor/change-password-dialog";
import { Dvor1150aSecurityClock } from "@/components/vor/dvor1150a-security-clock";
import { serializeDvorConfiguration } from "@/lib/dvor1150a/configuration-file";

beforeEach(() => store.getState().reset());
afterEach(() => { cleanup();store.getState().reset();vi.useRealTimers();vi.restoreAllMocks(); });
function login(id = "SEC4", password = "FOUR", local = true) {
  store.getState().login(id, password);
  store.getState().setConfigValue("simulation.local", local);
  store.getState().openView("rms-config", "rms-config-general", [], "RMS Configuration");
}
function security() { fireEvent.click(screen.getByRole("tab", { name: "Security Codes" })); }
function change(label: string, value: string) { fireEvent.change(screen.getByLabelText(label), { target: { value } }); }

describe("G18 authentic security controls and session clock", () => {
  it("keeps staged and applied credentials out of G15 files and Security Codes screen prints", () => {
    login();
    const doc = document.implementation.createHTMLDocument();
    const popup = { document: doc, opener: window, addEventListener: vi.fn(), focus: vi.fn(), print: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    render(<div className="pmdt-classic-window"><aside className="pmdt-sidebar">Main TX1</aside><main className="pmdt-classic-main"><RmsConfigLayout /></main></div>);
    security();change("User ID row 4", "TECH");change("Password row 4", "NeverExport987");change("Level row 4", "2");
    for (const applied of [false, true]) {
      if (applied) fireEvent.click(screen.getByRole("button", { name: "Apply (F7)" }));
      fireEvent.click(screen.getByRole("button", { name: "Print" }));
      expect(popup.print).toHaveBeenCalled();
      expect(doc.body.textContent).toContain("Main TX1");
      expect(doc.body.textContent).toContain("User ID");
      expect(doc.body.textContent).not.toContain("NeverExport987");
      expect(serializeDvorConfiguration(store.getState().config)).not.toContain("NeverExport987");
      expect(JSON.stringify(store.getState())).not.toContain("NeverExport987");
    }
  });

  it("excludes Security Codes for SEC3 and enforces Local for Level4 editing", () => {
    login("SEC3", "THREE");const view = render(<RmsConfigLayout />);
    expect(screen.queryByRole("tab", { name: "Security Codes" })).not.toBeInTheDocument();
    act(() => login("SEC4", "FOUR", false));view.rerender(<RmsConfigLayout />);security();
    expect(screen.getByLabelText("User ID row 1")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Apply (F7)" })).toBeDisabled();
    act(() => store.getState().setConfigValue("simulation.local", true));
    expect(screen.getByLabelText("User ID row 1")).toBeEnabled();
    expect(screen.getByLabelText("Level row 1")).toBeDisabled();
    expect(screen.getAllByLabelText(/^Password row/)).toHaveLength(10);
  });

  it("uses the existing toolbar Apply/Reset, adds/deletes accounts, and clears password masks after Apply", () => {
    login();render(<RmsConfigLayout />);security();
    change("User ID row 4", "TECH");change("Password row 4", "DemoPass991");change("Level row 4", "2");
    expect(screen.getByRole("button", { name: "Apply (F7)" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Reset (F8)" }));
    expect(screen.getByLabelText("User ID row 4")).toHaveValue("");expect(screen.getByLabelText("Password row 4")).toHaveValue("");
    change("User ID row 4", "TECH");change("Password row 4", "DemoPass991");change("Level row 4", "2");
    fireEvent.click(screen.getByRole("button", { name: "Apply (F7)" }));
    expect(screen.getByLabelText("Password row 4")).toHaveValue("");
    expect(store.getState().securityNeedsBackup).toBe(true);
    expect(JSON.stringify(store.getState())).not.toContain("DemoPass991");
    change("User ID row 4", "");fireEvent.click(screen.getByRole("button", { name: "Apply (F7)" }));
    expect(screen.getByLabelText("User ID row 4")).toHaveValue("");
    act(() => expect(store.getState().login("TECH", "DemoPass991")).toBe(false));
  });

  it("reports invalid/empty account data without echoing passwords", () => {
    login();render(<RmsConfigLayout />);security();
    change("User ID row 4", "TECH");
    fireEvent.click(screen.getByRole("button", { name: "Apply (F7)" }));
    expect(screen.getByRole("alert")).toHaveTextContent("4–32");
    change("Password row 4", "Demo Pass991");
    fireEvent.click(screen.getByRole("button", { name: "Apply (F7)" }));
    expect(screen.getByRole("alert")).not.toHaveTextContent("Demo Pass991");
  });

  it("dispatches Change Password from RMS, gates Remote/GUEST and allows backup for security-only changes", () => {
    login("SEC3", "THREE", false);render(<PmdtMenuBar />);
    fireEvent.click(screen.getByRole("button", { name: "RMS" }));
    expect(screen.getByRole("menuitem", { name: "Change Password..." })).toHaveAttribute("aria-disabled", "true");
    act(() => store.getState().setConfigValue("simulation.local", true));
    fireEvent.click(screen.getByRole("menuitem", { name: "Change Password..." }));
    expect(store.getState().changePasswordDialogOpen).toBe(true);
    act(() => { store.getState().backupConfig();store.getState().changeOwnPassword("THREE", "DemoPass991", "DemoPass991"); });
    fireEvent.click(screen.getByRole("button", { name: "RMS" }));
    expect(screen.getByRole("menuitem", { name: "Config Backup" })).not.toHaveAttribute("aria-disabled");
    fireEvent.click(screen.getByRole("menuitem", { name: "Config Backup" }));
    expect(store.getState().securityNeedsBackup).toBe(false);
    act(() => login("GUEST", ""));
    fireEvent.click(screen.getByRole("button", { name: "RMS" }));
    expect(screen.getByRole("menuitem", { name: "Change Password..." })).toHaveAttribute("aria-disabled", "true");
  });

  it("validates the documented three-password dialog and Cancel does not change credentials", () => {
    login("SEC3", "THREE");store.getState().setChangePasswordDialogOpen(true);
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    render(<ChangePasswordDialog />);
    change("Current Password", "bad");change("New Password", "DemoPass991");change("Re-enter New Password", "different");
    fireEvent.submit(screen.getByRole("dialog", { name: "Change Password" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Current Password");
    change("Current Password", "THREE");
    fireEvent.submit(screen.getByRole("dialog", { name: "Change Password" }));
    expect(screen.getByRole("alert")).toHaveTextContent("do not match");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(store.getState().changePasswordDialogOpen).toBe(false);
    act(() => expect(store.getState().login("SEC3", "THREE")).toBe(true));
    change("Re-enter New Password", "DemoPass991");
    fireEvent.submit(screen.getByRole("dialog", { name: "Change Password" }));
    expect(alert).toHaveBeenCalledWith("Password has been changed.");
    expect(store.getState().changePasswordDialogOpen).toBe(false);
  });

  it("displays the five-minute lockout and enables OK only when it expires", () => {
    for (let i = 0; i < 3; i++) store.getState().login("bad", "bad");
    render(<PmdtLoginDialog />);
    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("300 s");
    act(() => store.getState().advanceSecurityTime(300));
    expect(screen.getByRole("button", { name: "OK" })).toBeEnabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("captures keyboard/mouse activity, catches elapsed idle time, and cleans its timer/listeners", () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
    login("SEC3", "THREE", false);const view = render(<Dvor1150aSecurityClock />);
    act(() => vi.advanceTimersByTime(899000));
    fireEvent.keyDown(document, { key: "a" });
    act(() => vi.advanceTimersByTime(899000));expect(store.getState().securityLevel).toBe(3);
    fireEvent.pointerMove(document);
    act(() => vi.advanceTimersByTime(899000));expect(store.getState().securityLevel).toBe(3);
    act(() => vi.advanceTimersByTime(1000));expect(store.getState().securityLevel).toBe(0);
    view.unmount();expect(vi.getTimerCount()).toBe(0);
  });
});
