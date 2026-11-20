import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dvor1150ModuleFaceplate } from "@/modules/devices/dvor-1150/dvor-1150-module-faceplates";

describe("DVOR 1150 status panel — Table 3-6 DEMO layout", () => {
  it("replaces SYSTEM A/B with two monitors and exactly one shared bypass switch and lamp", () => {
    render(<Dvor1150ModuleFaceplate blockId="status-display" />);
    expect(screen.getByText("MON1")).toBeInTheDocument();
    expect(screen.getByText("MON2")).toBeInTheDocument();
    expect(screen.queryByText(/SYSTEM [AB]/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("img").map((node) => node.getAttribute("aria-label"))).toEqual([
      "Integral Normal 1 indicator", "Integral Alarm 1 indicator",
      "Integral Normal 2 indicator", "Integral Alarm 2 indicator", "Integral Bypass indicator off",
    ]);
    expect(screen.getAllByRole("switch")).toHaveLength(1);
    expect(screen.getByRole("switch", { name: "Integral Bypass" })).toHaveAttribute("aria-checked", "false");
  });

  it("toggles only the bypass lamp with mouse, Enter and Space", () => {
    render(<Dvor1150ModuleFaceplate blockId="status-display" />);
    const toggle = screen.getByRole("switch", { name: "Integral Bypass" });
    const monitorLamps = screen.getAllByRole("img", { name: /Integral (Normal|Alarm)/ });
    const before = monitorLamps.map((node) => node.innerHTML);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("img", { name: "Integral Bypass indicator on" }).querySelector('[data-color="amber"]'))
      .toHaveAttribute("data-active", "true");
    fireEvent.keyDown(toggle, { key: "Enter" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("img", { name: "Integral Bypass indicator off" }).querySelector('[data-color="amber"]'))
      .toHaveAttribute("data-active", "false");
    fireEvent.keyDown(toggle, { key: " " });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(toggle, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(monitorLamps.map((node) => node.innerHTML)).toEqual(before);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("preserves the monitor columns and rightmost bypass position in table order", () => {
    render(<Dvor1150ModuleFaceplate blockId="status-display" />);
    for (const monitor of [1, 2]) {
      for (const [label, x] of [["Normal", "150"], ["Alarm", "245"]]) {
        const lamp = screen.getByRole("img", { name: `Integral ${label} ${monitor} indicator` });
        expect(lamp.parentElement).toHaveAttribute("transform", `translate(${(monitor - 1) * 360} 0)`);
        expect(lamp.querySelector("circle")).toHaveAttribute("cx", x);
        expect(lamp.querySelector("circle")).toHaveAttribute("cy", "170");
      }
    }
    expect(screen.getByRole("img", { name: /Integral Bypass indicator/ }).querySelector("circle"))
      .toHaveAttribute("cx", "700");
  });
});
