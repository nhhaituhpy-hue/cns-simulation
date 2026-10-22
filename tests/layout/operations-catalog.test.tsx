import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

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

    expect(cardForHeading("Phần mềm khai thác DVOR 220").getByRole("button", { name: "Mở simulator" })).toBeEnabled();
    expect(cardForHeading("Phần mềm khai thác DME 320").getByRole("button", { name: "Mở simulator" })).toBeEnabled();
  });

  it("marks DVOR 220 and DME 320 authoring workspaces as available", () => {
    render(<TrainingWorkspaceCatalog mode="authoring" />);

    expect(cardForHeading("DVOR 220").getByRole("link", { name: "Mở kịch bản" })).toHaveAttribute(
      "href",
      "/authoring/dvor-220",
    );
    expect(cardForHeading("DME 320").getByRole("link", { name: "Mở kịch bản" })).toHaveAttribute(
      "href",
      "/authoring/dme-320",
    );
  });

  it("marks the DVOR 220 and DME 320 review workspaces as available", () => {
    render(<TrainingWorkspaceCatalog mode="review" />);

    expect(cardForHeading("DVOR 220").getByRole("link", { name: "Vào ôn tập" })).toHaveAttribute(
      "href",
      "/review/dvor-220",
    );
    expect(cardForHeading("DME 320").getByRole("link", { name: "Vào ôn tập" })).toHaveAttribute(
      "href",
      "/review/dme-320",
    );
  });
});
