import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MonitorTestResults } from "@/components/vor/screens/monitor-test-results";
import { dvorConfigFieldCatalog, getDvorConfigValue } from "@/lib/dvor1150a";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

beforeEach(() => useVorPmdtStore.getState().reset());

function openGenerator(monitor: 1 | 2) {
  const store = useVorPmdtStore;
  expect(store.getState().login("SEC3", "THREE")).toBe(true);
  store.getState().setConfigValue("simulation.local", true);
  store.getState().setConfigValue("simulation.integralMonitorBypass", true);
  store.getState().openScreen("monitor-test-results", [`Monitor ${monitor}`, "Test Results"], "Test Results");
  const view = render(<MonitorTestResults />);
  fireEvent.click(screen.getByRole("tab", { name: "Test Generator" }));
  return { store, ...view };
}

// Figure 3-41 exposes these as setup, not measured outcomes. The disclosure
// deliberately proves applied configuration read-back, NOT a detector effect.
describe("1150A unsupported Test Generator measurement disclosure", () => {
  it.each(([1, 2] as const).flatMap(monitor => [
    { monitor, key: "audioModulation", label: "Audio Modulation", value: 17.5, previous: "10" },
    { monitor, key: "audioFrequency", label: "Audio Frequency", value: 1200, previous: "300" },
  ] as const))("MON$monitor $label reads back only the applied setup and preserves all measured outputs", ({ monitor, key, label, value, previous }) => {
    const { store } = openGenerator(monitor);
    const before = store.getState();
    const control = screen.getByRole("textbox", { name: `${label} setup` });
    expect(control).toHaveAttribute("data-vor-effect", "stored-only");
    const applied = () => document.querySelector(`[data-vor-field-id="testGeneratorApplied.mon${monitor}.${key}"]`);
    expect(applied()).toHaveTextContent(previous);
    fireEvent.focus(control);
    fireEvent.change(control, { target: { value: String(value) } });
    fireEvent.blur(control);
    expect(applied()).toHaveTextContent(previous);
    expect(store.getState().derived).toBe(before.derived);
    fireEvent.click(screen.getByRole("button", { name: "Apply (F7)" }));
    expect(store.getState().configDirty).toBe(false);
    expect(getDvorConfigValue(store.getState().config, `monitor.testGenerator.${key}`)).toBe(value);
    expect(applied()).toHaveTextContent(String(value));
    expect(store.getState().derived.testGeneratorResults).toEqual(before.derived.testGeneratorResults);
    expect(store.getState().derived.monitors).toEqual(before.derived.monitors);
    expect(store.getState().derived.effectiveTransmitters).toEqual(before.derived.effectiveTransmitters);
    expect(document.querySelector(`[data-vor-field-id="testGeneratorResults.mon${monitor}.${key}"]`)).toBeNull();
  });

  it.each([1, 2] as const)("MON%s identifies stored Ident Control and reads the applied setting, not a fabricated measurement", (monitor) => {
    const { store, unmount } = openGenerator(monitor);
    const before = store.getState();
    const control = screen.getByRole("combobox", { name: "Ident Control setup" });
    expect(control).toHaveAttribute("data-vor-effect", "stored-only");
    const disclosure = screen.getByRole("note", { name: "Unsupported Test Generator measurements" });
    expect(disclosure).toBeVisible();
    expect(disclosure).toHaveTextContent(/Chỉ lưu cấu hình/);
    expect(disclosure).toHaveTextContent(/không phải số đo/);
    const applied = () => document.querySelector(`[data-vor-field-id="testGeneratorApplied.mon${monitor}.identStatus"]`);
    expect(applied()).toHaveTextContent("Normal");
    fireEvent.change(control, { target: { value: "No Ident" } });
    expect(applied()).toHaveTextContent("Normal");
    expect(store.getState().derived).toBe(before.derived);
    expect(screen.getByRole("button", { name: "Apply (F7)" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Apply (F7)" }));
    expect(getDvorConfigValue(store.getState().config, "monitor.testGenerator.identStatus")).toBe("No Ident");
    expect(applied()).toHaveTextContent("No Ident");
    expect(store.getState().derived.testGeneratorResults).toEqual(before.derived.testGeneratorResults);
    expect(store.getState().derived.monitors).toEqual(before.derived.monitors);
    expect(store.getState().derived.effectiveTransmitters).toEqual(before.derived.effectiveTransmitters);
    const results = screen.getByRole("group", { name: "Test Results" });
    expect(within(results).getAllByRole("row")).toHaveLength(5);
    expect(Array.from(results.querySelectorAll("td[data-vor-field-id]")).map(cell => cell.textContent)).toEqual(["359.97", "30.0", "30.1", "15.97", "9.4"]);
    expect(dvorConfigFieldCatalog.filter(field => field.id.startsWith(`monitor.testGeneratorCalibration.mon${monitor}.`))).toHaveLength(5);
    expect(dvorConfigFieldCatalog.some(field => /^monitor\.testGenerator(?:Calibration)?\..*(?:[Pp]ower|[Ff]requencyError)/.test(field.id))).toBe(false);
    unmount();
    act(() => store.getState().openScreen("monitor-test-results", [`Monitor ${monitor === 1 ? 2 : 1}`, "Test Results"], "Test Results"));
    render(<MonitorTestResults />);
    fireEvent.click(screen.getByRole("tab", { name: "Test Generator" }));
    expect(screen.getByRole("combobox", { name: "Ident Control setup" })).toHaveValue("No Ident");
    expect(document.querySelector(`[data-vor-field-id="testGeneratorApplied.mon${monitor === 1 ? 2 : 1}.identStatus"]`)).toHaveTextContent("No Ident");
  });
});
