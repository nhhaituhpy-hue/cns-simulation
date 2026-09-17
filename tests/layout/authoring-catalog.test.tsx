import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AuthoringPage from "@/app/authoring/page";

function cardForHeading(name: string) {
  const card = screen.getByRole("heading", { name }).closest("article");
  if (!card) throw new Error(`Card not found for ${name}`);
  return within(card);
}

describe("AuthoringPage", () => {
  it("shows Scenario Parameters devices plus the legacy ADS-B authoring workflow", () => {
    render(<AuthoringPage />);

    const expectedModules = [
      ["DVOR 1150", "/authoring/dvor-1150"],
      ["DVOR 1150A", "/authoring/dvor-1150a"],
      ["DME 1119A", "/authoring/dme-1119a"],
      ["DVOR 220", "/authoring/dvor-220"],
      ["DME 320", "/authoring/dme-320"],
      ["ADS-B", "/authoring/ads-b"],
    ] as const;

    for (const [name, href] of expectedModules) {
      const card = cardForHeading(name);
      expect(card.getByText("Sẵn sàng")).toBeInTheDocument();
      expect(
        card.getByRole("link", { name: "Quản lý kịch bản" }),
      ).toHaveAttribute("href", href);
    }

    expect(screen.queryByRole("heading", { name: "VHF" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "VSAT" })).not.toBeInTheDocument();
  });
});
