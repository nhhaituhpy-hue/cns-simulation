import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MonitorTestResults, monitorTestTimestamp } from "@/components/vor/screens/monitor-test-results";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

beforeEach(() => useVorPmdtStore.getState().reset());
const s = () => useVorPmdtStore.getState();
const cells = () => Array.from(document.querySelectorAll("[data-test-status]"));
const output = () => document.querySelector('[data-vor-field-id="testGeneratorResults.mon1.hz30Modulation"]');
function maintenance() {
  s().login("SEC3", "THREE");
  s().setConfigValue("simulation.local", true);
  s().setConfigValue("simulation.integralMonitorBypass", true);
}

describe("G11 authentic Test Results lifecycle", () => {
  it("does not manufacture Completed or Updated on entry, shows partial progress and retains Completed until next cycle", () => {
    maintenance();
    render(<MonitorTestResults />);
    expect(cells()).toHaveLength(20);
    expect(cells().every(cell => cell.textContent === "---" && cell.getAttribute("data-test-status") === "gray")).toBe(true);
    expect(cells()[0].querySelector("span")).toHaveStyle({ background: "#ededed" });
    fireEvent.click(screen.getByRole("tab", { name: "Test Generator" }));
    expect(output()).toHaveTextContent("---");
    expect(screen.queryByText("Updated")).not.toBeInTheDocument();
    act(() => s().advanceMonitorTime(66));
    fireEvent.click(screen.getByRole("tab", { name: "In Process" }));
    expect(cells().filter(cell => cell.textContent !== "---")).toHaveLength(1);
    act(() => s().advanceMonitorTime(114));
    fireEvent.click(screen.getByRole("tab", { name: "Completed" }));
    expect(cells().every(cell => cell.getAttribute("data-test-status") === "green")).toBe(true);
    const completed = document.querySelector(".pmdt-monitor-test-content")?.textContent;
    act(() => s().advanceMonitorTime(6));
    expect(document.querySelector(".pmdt-monitor-test-content")?.textContent).toBe(completed);
    fireEvent.click(screen.getByRole("tab", { name: "In Process" }));
    expect(cells().filter(cell => cell.textContent !== "---")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Start|Run|Cancel/i })).not.toBeInTheDocument();
  });

  it("keeps TG applied results pending until a new cycle, without treating a staged draft as a sample", () => {
    maintenance();
    render(<MonitorTestResults />);
    fireEvent.click(screen.getByRole("tab", { name: "Test Generator" }));
    act(() => s().advanceMonitorTime(120));
    expect(output()).toHaveTextContent("30.0");
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Test Results" }).querySelectorAll("th")).toHaveLength(0);
    fireEvent.change(screen.getByLabelText("30 Hz Modulation setup"), { target: { value: "35" } });
    expect(output()).toHaveTextContent("30.0");
    expect(screen.getByText("Updated")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Apply (F7)" }));
    expect(screen.queryByText("Updated")).not.toBeInTheDocument();
    expect(output()).toHaveTextContent("30.0");
    act(() => s().advanceMonitorTime(119));
    expect(output()).toHaveTextContent("30.0");
    act(() => s().advanceMonitorTime(1));
    expect(output()).toHaveTextContent("35.0");
    expect(screen.getByText("Updated")).toBeInTheDocument();
  });

  it.each([80, 102])("renders real red/yellow failures at scale %s and independent MON2 results", scale => {
    maintenance();
    s().setConfigValue("monitor.testGeneratorCalibration.mon1.hz30ModulationScale", scale);
    s().applyConfigChanges();
    render(<MonitorTestResults />);
    act(() => s().advanceMonitorTime(180));
    expect(cells().some(cell => cell.getAttribute("data-test-status") === (scale === 80 ? "red" : "yellow"))).toBe(true);
    expect(document.querySelector(`[data-test-status="${scale === 80 ? "red" : "yellow"}"] span`)).toHaveStyle({ background: scale === 80 ? "#ff6666" : "#ffff00" });
    act(() => s().openScreen("monitor-test-results", ["Monitor 2", "Test Results"], "Test Results"));
    expect(screen.getByRole("region", { name: "Monitor 2 Test Results" })).toBeInTheDocument();
    expect(cells().every(cell => cell.getAttribute("data-test-status") === "green")).toBe(true);
  });

  it("formats injected UTC dates and blanks invalid/missing timestamps", () => {
    expect(monitorTestTimestamp("2026-11-21T01:02:03Z")).toBe("11/21/26 01:02:03");
    expect(monitorTestTimestamp(null)).toBe("—");
    expect(monitorTestTimestamp("invalid")).toBe("—");
  });
});
