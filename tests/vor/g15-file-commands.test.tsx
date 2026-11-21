import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PmdtMenuBar } from "@/components/vor/pmdt-menu-bar";
import { PmdtToolbar } from "@/components/vor/pmdt-toolbar";
import { RmsLogsLayout } from "@/components/vor/screens/rms-logs-layout";
import { copyPmdtLog, loadPmdtConfiguration, printPmdtConfiguration, savePmdtConfiguration } from "@/components/vor/pmdt-file-commands";
import { serializeDvorConfiguration } from "@/lib/dvor1150a/configuration-file";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

beforeEach(() => {
  useVorPmdtStore.getState().reset();
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); useVorPmdtStore.getState().reset(); });

function system() { fireEvent.click(screen.getByRole("button", { name: "System" })); }
function maintenance() {
  const state = useVorPmdtStore.getState();
  state.login("SEC3", "THREE");
  state.setConfigValue("simulation.local", true);
  state.setConfigValue("simulation.integralMonitorBypass", true);
  state.setTransmitterMode("tx1", "off");
  state.setTransmitterMode("tx2", "off");
}

it("enables documented file commands after logon and reports the HC maintenance load guards", () => {
  useVorPmdtStore.getState().login("SEC3", "THREE");
  render(<PmdtMenuBar />);
  system();
  expect(screen.getByRole("menuitem", { name: "Configuration Save" })).not.toHaveAttribute("aria-disabled");
  expect(screen.getByRole("menuitem", { name: "Configuration Print" })).not.toHaveAttribute("aria-disabled");
  expect(screen.getByRole("menuitem", { name: "Configuration Load" })).toHaveAttribute("aria-disabled", "true");
  act(maintenance);
  fireEvent.click(screen.getByRole("menuitem", { name: "Configuration Load" }));
  expect(screen.getByLabelText("Configuration Load file (training JSON)")).toHaveAttribute("accept", ".json,application/json");
  fireEvent(screen.getByLabelText("Configuration Load file (training JSON)"), new Event("cancel"));
  expect(screen.queryByLabelText("Configuration Load file (training JSON)")).toBeNull();
});

it("downloads two independent applied-only files, excludes draft and credentials, and honors Cancel", async () => {
  useVorPmdtStore.getState().login("SEC3", "THREE");
  const create = vi.fn().mockReturnValue("blob:training");
  vi.stubGlobal("URL", class extends URL { static createObjectURL = create; static revokeObjectURL = vi.fn(); });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  render(<PmdtMenuBar />);
  act(() => { useVorPmdtStore.getState().setConfigValue("simulation.local", true); useVorPmdtStore.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 90); });
  for (let n = 0; n < 2; n++) { system(); fireEvent.click(screen.getByRole("menuitem", { name: "Configuration Save" })); }
  expect(click).toHaveBeenCalledTimes(2);
  expect(create).toHaveBeenCalledTimes(2);
  const blob = create.mock.calls[0][0] as Blob;
  const text = await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(blob); });
  expect(JSON.parse(text).configuration.transmitters.tx1.nominal.outputPower).toBe(70);
  expect(text).not.toMatch(/THREE|password|authenticatedUserId/);
  vi.mocked(window.confirm).mockReturnValue(false);
  system(); fireEvent.click(screen.getByRole("menuitem", { name: "Configuration Save" }));
  expect(create).toHaveBeenCalledTimes(2);
});

it("loads a selected file after the menu closes without losing the native file-input callback", async () => {
  maintenance();
  const config = structuredClone(useVorPmdtStore.getState().config);
  config.transmitters.tx1.nominal.outputPower = 80;
  const text = serializeDvorConfiguration(config);
  const file = new File([text], "training.json", { type: "application/json" });
  Object.defineProperty(file, "text", { value: async () => text });
  render(<PmdtMenuBar />);
  system();
  fireEvent.click(screen.getByRole("menuitem", { name: "Configuration Load" }));
  expect(screen.queryByRole("menu", { name: "System" })).toBeNull();
  fireEvent.change(screen.getByLabelText("Configuration Load file (training JSON)"), { target: { files: [file] } });
  await waitFor(() => expect(useVorPmdtStore.getState().config.transmitters.tx1.nominal.outputPower).toBe(80));
  await waitFor(() => expect(screen.queryByLabelText("Configuration Load file (training JSON)")).toBeNull());
});

it("handles missing, unreadable, oversized and corrupt files without applying anything", async () => {
  maintenance();
  const before = useVorPmdtStore.getState().config;
  await loadPmdtConfiguration();
  expect(window.alert).not.toHaveBeenCalled();
  for (const file of [
    { size: 0, text: async () => "" },
    { size: 1, text: async () => { throw new Error("Read failed"); } },
    { size: 1024 * 1024 + 1, text: vi.fn() },
    { size: 1, text: async () => "{" },
  ]) await loadPmdtConfiguration(file as unknown as File);
  expect(window.alert).toHaveBeenCalledTimes(4);
  expect(useVorPmdtStore.getState().config).toBe(before);
});

it("rechecks permissions after an asynchronous file read, and keeps the backup explicit on success", async () => {
  maintenance();
  const text = serializeDvorConfiguration(useVorPmdtStore.getState().config);
  let finish!: (text: string) => void;
  const loading = loadPmdtConfiguration({ size: text.length, text: () => new Promise<string>(resolve => { finish = resolve; }) } as File);
  useVorPmdtStore.getState().logout();
  finish(text);
  await loading;
  expect(useVorPmdtStore.getState().lastCommand).toMatch(/SEC3/);
  maintenance();
  await loadPmdtConfiguration({ size: text.length, text: async () => text } as File);
  expect(window.alert).toHaveBeenLastCalledWith(expect.stringContaining("Config Backup"));
  expect(useVorPmdtStore.getState().hasConfigurationBackup).toBe(false);
});

it("prints the applied configuration using textContent, without exporting HTML or passwords", () => {
  maintenance();
  const doc = document.implementation.createHTMLDocument();
  const print = vi.fn();
  vi.spyOn(window, "open").mockReturnValue({ document: doc, focus: vi.fn(), print, addEventListener: vi.fn() } as unknown as Window);
  render(<PmdtMenuBar />);
  system();
  fireEvent.click(screen.getByRole("menuitem", { name: "Configuration Print" }));
  expect(print).toHaveBeenCalledOnce();
  expect(doc.body.textContent).toContain("not SELEX format");
  expect(doc.querySelector("pre")?.textContent).toContain('"version": 1');
  expect(doc.body.textContent).not.toMatch(/THREE|password/);
  vi.mocked(window.open).mockReturnValue(null);
  printPmdtConfiguration();
  expect(window.alert).toHaveBeenLastCalledWith(expect.stringContaining("chặn cửa sổ in"));
});

it("prints the current PMDT content with Sidebar, not app chrome or login credentials", () => {
  const doc = document.implementation.createHTMLDocument();
  vi.spyOn(window, "open").mockReturnValue({ document: doc, focus: vi.fn(), print: vi.fn(), addEventListener: vi.fn() } as unknown as Window);
  render(<><div>PRIVATE APP CHROME</div><div className="pmdt-classic-window"><aside className="pmdt-sidebar">Main TX1</aside><main className="pmdt-classic-main"><PmdtToolbar title="Transmitter Data" /><p>Power 70 W</p></main><input type="password" defaultValue="not-exported" /></div></>);
  expect(screen.getByRole("button", { name: "Copy" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Print" }));
  expect(doc.body.textContent).toContain("Main TX1");
  expect(doc.body.textContent).toContain("Power 70 W");
  expect(doc.body.textContent).not.toMatch(/PRIVATE APP CHROME|not-exported/);
});

it("copies only the displayed log text and handles clipboard denial and empty content", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  useVorPmdtStore.getState().openView("rms-logs", "rms-logs-commands", ["RMS", "Logs"], "Command Activity");
  render(<RmsLogsLayout />);
  fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
  expect(writeText.mock.calls[0][0]).toContain("Time Tag");
  expect(writeText.mock.calls[0][0]).not.toContain("Update");
  writeText.mockRejectedValue(new Error("Denied"));
  fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("clipboard")));
  await copyPmdtLog(document.createElement("button"));
  expect(window.alert).toHaveBeenLastCalledWith("Không có dữ liệu log để copy.");
});

it("keeps Set Time and Date unavailable for the owner's RCSU station, with the manual reason", () => {
  render(<PmdtMenuBar />);
  fireEvent.click(screen.getByRole("button", { name: "RMS" }));
  const item = screen.getByRole("menuitem", { name: "Set Time and Date" });
  expect(item).toHaveAttribute("aria-disabled", "true");
  expect(item.title).toContain("RCSU 2240");
  const before = useVorPmdtStore.getState();
  fireEvent.click(item);
  expect(useVorPmdtStore.getState()).toBe(before);
});

it("never exports a scenario configuration even if a caller bypasses the menu", () => {
  useVorPmdtStore.setState({ scenario: { ...useVorPmdtStore.getState().scenario, active: true } });
  const open = vi.spyOn(window, "open");
  savePmdtConfiguration();
  printPmdtConfiguration();
  expect(open).not.toHaveBeenCalled();
});
