import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { push, redirect, notFound } = vi.hoisted(() => ({
  push: vi.fn(),
  redirect: vi.fn((path: string): never => { throw new Error(`redirect:${path}`); }),
  notFound: vi.fn((): never => { throw new Error("not found"); }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  redirect,
  notFound,
}));

import SimulatorSoftwarePage, { generateStaticParams } from "@/app/simulator/software/[moduleId]/page";
import { getSimulatorModule, TRAINING_MODULES } from "@/modules/core/registry";
import { SimulatorCatalog } from "@/modules/simulator/simulator-catalog";
import { TrainingWorkspaceCatalog } from "@/modules/training/training-workspace";

function cardForHeading(name: string) {
  const card = screen.getByRole("heading", { name }).closest("article");
  if (!card) throw new Error(`Card not found for ${name}`);
  return within(card);
}

describe("operations software availability", () => {
  it("opens the DVOR 1150 PMDT alias without replacing the device card or duplicating training", () => {
    render(<SimulatorCatalog />);

    const device = cardForHeading("DVOR 1150");
    const operations = cardForHeading("Phần mềm khai thác DVOR 1150");
    expect(device.getByRole("button", { name: "Mở simulator" })).toBeEnabled();
    fireEvent.click(operations.getByRole("button", { name: "Mở simulator" }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/simulator/software/dvor-1150");
    expect(operations.getByRole("button", { name: "Đang mở…" })).toBeDisabled();
    expect(device.getByRole("button", { name: "Mở simulator" })).toBeDisabled();
    expect(getSimulatorModule("dvor-1150")).toMatchObject({ category: "device", routes: { simulator: "/simulator/dvor-1150" } });
    expect(TRAINING_MODULES.filter(({ id }) => id === "dvor-1150")).toHaveLength(1);
  });

  it("redirects the Operations URL to the native PMDT and preserves the query", async () => {
    expect(generateStaticParams()).toContainEqual({ moduleId: "dvor-1150" });
    const params = Promise.resolve({ moduleId: "dvor-1150" });
    await expect(SimulatorSoftwarePage({ params, searchParams: Promise.resolve({}) }))
      .rejects.toThrow("redirect:/simulator/dvor-1150");
    await expect(SimulatorSoftwarePage({ params, searchParams: Promise.resolve({ review: "1", scenarioId: "a/b", item: ["x", "y"] }) }))
      .rejects.toThrow("redirect:/simulator/dvor-1150?review=1&scenarioId=a%2Fb&item=x&item=y");
  });

  it.each(["dvor-1150a", "dme-1119a"])("does not add an Operations alias for %s", async (moduleId) => {
    await expect(SimulatorSoftwarePage({ params: Promise.resolve({ moduleId }), searchParams: Promise.resolve({}) }))
      .rejects.toThrow("not found");
  });

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
