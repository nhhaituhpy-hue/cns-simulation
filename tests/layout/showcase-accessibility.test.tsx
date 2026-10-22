import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, expect, it } from "vitest";
import { SimulatorShowcase } from "@/components/home/simulator-showcase";
import { createSimulatorShowcaseItem } from "@/components/home/simulator-showcase-data";
import { SIMULATOR_MODULES } from "@/modules/core/registry";

afterEach(cleanup);

it("keeps mixed card actions out of the required-child tablist pattern", async () => {
  const { container } = render(
    <SimulatorShowcase simulators={SIMULATOR_MODULES.map(createSimulatorShowcaseItem)} />,
  );
  await act(async () => {
    const result = await axe.run(container, {
      runOnly: { type: "rule", values: ["aria-required-children", "aria-required-parent"] },
    });
    expect(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]);
  });
});

it("keeps one pressed selector and stable valid detail relationships after keyboard and wheel navigation", () => {
  const { container } = render(
    <SimulatorShowcase simulators={SIMULATOR_MODULES.map(createSimulatorShowcaseItem)} />,
  );
  const group = screen.getByRole("group", { name: "Danh sách simulator CNS" });
  const selectors = within(group).getAllByRole("button", { name: /^Chọn mô phỏng / });
  const detailId = selectors[0].getAttribute("aria-controls");
  expect(detailId).toBeTruthy();
  function expectSelection(name: string) {
    expect(selectors.filter(button => button.getAttribute("aria-pressed") === "true")).toHaveLength(1);
    expect(screen.getByRole("button", { name })).toHaveAttribute("aria-pressed", "true");
    const detail = screen.getByRole("region", { name });
    expect(detail.id).toBe(detailId);
    expect(document.getElementById(detail.getAttribute("aria-labelledby")!)).toBe(screen.getByRole("button", { name }));
    for (const button of selectors) expect(document.getElementById(button.getAttribute("aria-controls")!)).toBe(detail);
  }
  expectSelection("Chọn mô phỏng DVOR 1150");
  fireEvent.keyDown(selectors[0], { key: "ArrowRight" });
  expectSelection("Chọn mô phỏng DVOR 1150A");
  fireEvent.keyDown(selectors[1], { key: "End" });
  expectSelection("Chọn mô phỏng VSAT");
  fireEvent.keyDown(selectors[7], { key: "Home" });
  expectSelection("Chọn mô phỏng DVOR 1150");
  fireEvent.wheel(container.querySelector(".cns-showcase__orbit")!, { deltaY: 50 });
  expectSelection("Chọn mô phỏng DVOR 1150A");
  expect(within(group).getAllByRole("link", { name: /^Mở simulator / })).toHaveLength(6);
});
