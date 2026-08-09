import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SimulatorCatalog } from "@/modules/simulator/simulator-catalog";
import { TrainingWorkspaceCatalog } from "@/modules/training/training-workspace";

function cardForHeading(name: string) {
  const card = screen.getByRole("heading", { name }).closest("article");
  if (!card) throw new Error(`Card not found for ${name}`);
  return within(card);
}

describe("operations software availability", () => {
  it("marks the completed MOPIENS simulator workspaces as available", () => {
    render(<SimulatorCatalog />);

    expect(cardForHeading("Phần mềm khai thác DVOR 220").getByText("Sẵn sàng")).toBeInTheDocument();
    expect(cardForHeading("Phần mềm khai thác DME 320").getByText("Sẵn sàng")).toBeInTheDocument();
  });

  it("keeps authoring and review planned until their workflows exist", () => {
    render(<TrainingWorkspaceCatalog mode="authoring" />);

    expect(cardForHeading("DVOR 220").getByText("Chuẩn bị")).toBeInTheDocument();
    expect(cardForHeading("DME 320").getByText("Chuẩn bị")).toBeInTheDocument();
  });
});
