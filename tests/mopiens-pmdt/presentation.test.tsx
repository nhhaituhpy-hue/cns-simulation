import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MopiensGauge,
  MopiensLoginDialog,
  MopiensLmiShell,
  MopiensMenuBar,
  MopiensModal,
  MopiensPmdtShell,
  MopiensSlideSwitch,
} from "@/modules/operations/mopiens-pmdt";

afterEach(() => cleanup());

describe("MOPIENS presentation primitives", () => {
  it("always prevents native modal form submission", () => {
    render(
      <MopiensModal
        open
        title="Safe form"
        onClose={vi.fn()}
        actions={[{ id: "save", label: "Save", type: "submit" }]}
      >
        <label>
          Station name
          <input defaultValue="LAB DVOR" />
        </label>
      </MopiensModal>,
    );

    const form = screen.getByRole("dialog", { name: "Safe form" }).querySelector("form");
    const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
    form?.dispatchEvent(submitEvent);

    expect(submitEvent.defaultPrevented).toBe(true);
  });

  it("closes a login dialog with Escape and exposes labelled fields", () => {
    const onClose = vi.fn();

    render(
      <MopiensLoginDialog
        open
        userName="Administrator"
        password="training"
        onUserNameChange={vi.fn()}
        onPasswordChange={vi.fn()}
        onLogin={vi.fn()}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByLabelText("User Name")).toHaveValue("Administrator");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each(["ArrowDown", "Enter", " "])(
    "focuses the first enabled menu command when opened with %s",
    (key) => {
      render(
        <MopiensMenuBar
          menus={[
            {
              id: "file",
              label: "File",
              commands: [
                { id: "disabled", label: "Unavailable", disabled: true },
                { id: "connect", label: "Connect" },
              ],
            },
          ]}
        />,
      );

      const trigger = screen.getByRole("menuitem", { name: "File" });
      trigger.focus();
      fireEvent.keyDown(trigger, { key });

      expect(screen.getByRole("menuitem", { name: "Connect" })).toHaveFocus();
      fireEvent.keyDown(screen.getByRole("menuitem", { name: "Connect" }), {
        key: "Escape",
      });
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    },
  );

  it("moves focus into an enabled child command with ArrowRight", () => {
    render(
      <MopiensMenuBar
        menus={[
          {
            id: "tools",
            label: "Tools",
            commands: [
              {
                id: "diagnostics",
                label: "Diagnostics",
                children: [
                  { id: "disabled-child", label: "Unavailable", disabled: true },
                  { id: "self-test", label: "Self Test" },
                ],
              },
            ],
          },
        ]}
      />,
    );

    const trigger = screen.getByRole("menuitem", { name: "Tools" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const diagnostics = screen.getByRole("menuitem", { name: /Diagnostics/ });
    expect(diagnostics).toHaveFocus();

    fireEvent.keyDown(diagnostics, { key: "ArrowRight" });
    expect(screen.getByRole("menuitem", { name: "Self Test" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Self Test" }), {
      key: "Escape",
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("routes controlled shell commands without owning equipment state", () => {
    const onToolbarAction = vi.fn();
    const onNavigationItemSelect = vi.fn();
    const onTabChange = vi.fn();
    const onOutputFilterChange = vi.fn();

    render(
      <MopiensPmdtShell
        ariaLabel="DVOR 220 PMDT"
        title="LAB DVOR - PMDT"
        connection={{ label: "Connected", tone: "normal" }}
        user={{ name: "Administrator", mode: "LOCAL", securityLevel: 3 }}
        menus={[
          { id: "file", label: "File", commands: [{ id: "connect", label: "Connect" }] },
        ]}
        toolbarActions={[{ id: "refresh", label: "Refresh" }]}
        navigationSections={[
          {
            id: "main",
            label: "Main",
            items: [{ id: "home", label: "Home" }],
          },
          {
            id: "maintenance",
            label: "Maintenance",
            items: [{ id: "diagnostics", label: "Diagnostics" }],
          },
        ]}
        activeNavigationSectionId="main"
        activeNavigationItemId="home"
        tabs={[
          { id: "home", label: "Home" },
          { id: "readings", label: "Readings" },
        ]}
        activeTabId="home"
        output={<p>Connection established</p>}
        outputFilters={[
          { id: "all", label: "All" },
          { id: "alarm", label: "Alarm", tone: "alarm" },
        ]}
        activeOutputFilterId="all"
        statusItems={[{ id: "tx", label: "TxD", value: "Ready", tone: "normal" }]}
        onToolbarAction={onToolbarAction}
        onNavigationItemSelect={onNavigationItemSelect}
        onTabChange={onTabChange}
        onOutputFilterChange={onOutputFilterChange}
      >
        <h1>Equipment overview</h1>
      </MopiensPmdtShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    fireEvent.click(screen.getByRole("tab", { name: "Readings" }));
    fireEvent.click(screen.getByRole("button", { name: "Alarm" }));

    expect(onToolbarAction).toHaveBeenCalledWith("refresh");
    expect(onNavigationItemSelect).toHaveBeenCalledWith("home");
    expect(onTabChange).toHaveBeenCalledWith("readings");
    expect(onOutputFilterChange).toHaveBeenCalledWith("alarm");
  });

  it("provides meter, switch and LMI soft-key semantics", () => {
    const onCheckedChange = vi.fn();
    const onSoftKey = vi.fn();

    render(
      <>
        <MopiensGauge label="RF Level" value={98.4} min={0} max={150} unit="W" />
        <MopiensSlideSwitch
          label="Transmitter 1"
          checked
          onCheckedChange={onCheckedChange}
        />
        <MopiensLmiShell
          ariaLabel="DME 320 LMI"
          title="DME 320"
          screenTitle="Equipment status"
          softKeys={[{ id: "next", label: "NEXT" }]}
          onSoftKey={onSoftKey}
        >
          <p>Normal operation</p>
        </MopiensLmiShell>
      </>,
    );

    expect(screen.getByRole("meter", { name: "RF Level" })).toHaveAttribute(
      "aria-valuenow",
      "98.4",
    );
    fireEvent.click(screen.getByRole("switch", { name: "Transmitter 1" }));
    fireEvent.click(screen.getByRole("button", { name: "NEXT" }));

    expect(onCheckedChange).toHaveBeenCalledWith(false);
    expect(onSoftKey).toHaveBeenCalledWith("next");
  });
});
