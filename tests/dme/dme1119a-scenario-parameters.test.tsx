import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PmdtLayout } from "@/components/dme/pmdt-layout";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

describe("DME 1119A Scenario Parameters panel", () => {
  beforeEach(() => {
    useDmePmdtStore.getState().reset();
  });

  it("loads a preset, edits scenario metadata, and applies it without opening the legacy author flow", async () => {
    act(() => {
      expect(useDmePmdtStore.getState().login("SEC3", "THREE")).toBe(true);
      expect(useDmePmdtStore.getState().setLocalMode(true)).toBe(true);
    });
    render(<PmdtLayout mode="preview" scenarioAuthoringEnabled />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Scenario Parameters" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Scenario Parameters" }));

    const panel = screen.getByRole("complementary", { name: "DME 1119A scenario parameters" });
    fireEvent.change(within(panel).getByRole("combobox", { name: "Preset" }), { target: { value: "tx1-low-output" } });
    fireEvent.change(within(panel).getByRole("textbox", { name: "Name" }), { target: { value: "Low output practical" } });

    expect(useDmePmdtStore.getState().scenarioDraft.name).toBe("Low output practical");
    fireEvent.click(within(panel).getByRole("button", { name: "Apply Scenario" }));

    expect(useDmePmdtStore.getState().scenario.active).toBe(true);
    expect(useDmePmdtStore.getState().scenario.definition?.name).toBe("Low output practical");
    expect(screen.getAllByRole("status").some((node) => node.textContent?.includes("IN PROGRESS"))).toBe(true);
  }, 30000);

  it("exposes fault and success-criterion editors and rejects an already-solved default", async () => {
    act(() => {
      expect(useDmePmdtStore.getState().login("SEC3", "THREE")).toBe(true);
      expect(useDmePmdtStore.getState().setLocalMode(true)).toBe(true);
    });
    render(<PmdtLayout mode="preview" scenarioAuthoringEnabled />);
    fireEvent.click(screen.getByRole("button", { name: "Scenario Parameters" }));
    const panel = screen.getByRole("complementary", { name: "DME 1119A scenario parameters" });

    expect(within(panel).getByText("No physical fault injected. Use the configuration editor for baseline changes.")).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "Add fault" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Add criterion" }));
    expect(useDmePmdtStore.getState().scenarioDraft.faultInjections).toHaveLength(1);
    expect(useDmePmdtStore.getState().scenarioDraft.successCriteria).toHaveLength(6);

    fireEvent.change(within(panel).getByRole("combobox", { name: "Preset" }), { target: { value: "default" } });
    expect(within(panel).getByRole("button", { name: "Apply Scenario" })).toBeDisabled();
  }, 30000);
});

