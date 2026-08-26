import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Dme1119aTrainingHud } from "@/components/dme/dme1119a-training-hud";
import { createLowOutputDme1119aScenario, previewDme1119aScenario } from "@/lib/dme1119a";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

describe("DME 1119A training HUD", () => {
  beforeEach(() => {
    useDmePmdtStore.getState().reset();
  });

  it("stays hidden when no scenario is active", () => {
    render(<Dme1119aTrainingHud examinerView />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows examiner progress and check count without exposing the fault editor", () => {
    const definition = createLowOutputDme1119aScenario();
    const preview = previewDme1119aScenario(definition);
    act(() => {
      useDmePmdtStore.setState({
        scenario: { active: true, definition, startedAt: "2026-08-26T00:00:00.000Z" },
        data: preview.data,
      });
    });
    render(<Dme1119aTrainingHud examinerView />);
    expect(screen.getByRole("status")).toHaveTextContent("IN PROGRESS");
    expect(screen.getByRole("status")).toHaveTextContent(/\d+\/\d+/);
    expect(screen.getByRole("status")).not.toHaveTextContent("powerLossDb");
  });
});
