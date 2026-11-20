import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dvor1150ModuleFaceplate } from "@/modules/devices/dvor-1150/dvor-1150-module-faceplates";

describe("DVOR 1150 sideband front panel — TM Figure 3-41", () => {
  it("places the lower measurement column to the right, below Q201, in documented order", () => {
    render(<Dvor1150ModuleFaceplate blockId="sideband-generator" />);
    const panel = screen.getByRole("img", { name: /Sideband Generator front panel/ });
    const ids = ["TP6", "A3R18", "GND", "A3R100", "TP7", "TP8", "TP9", "TP10"];
    const labels = ids.map((id) => within(panel).getByText(id));
    const column = labels[0].parentElement!.parentElement!;
    expect(Array.from(column.querySelectorAll("text"), (node) => node.textContent)).toEqual(ids);
    expect(labels.map((node) => Number(node.getAttribute("y")) - 6)).toEqual([
      1340, 1372, 1404, 1436, 1468, 1500, 1532, 1564,
    ]);
    labels.forEach((label) => {
      expect(label).toHaveAttribute("x", "258");
      const socket = label.parentElement!.querySelector("circle")!;
      expect(socket).toHaveAttribute("cx", "280");
      expect(Number(socket.getAttribute("cy")) - Number(socket.getAttribute("r"))).toBeGreaterThan(1308);
      expect(Number(socket.getAttribute("cy")) + Number(socket.getAttribute("r"))).toBeLessThan(1630);
    });
    expect(within(panel).queryByText("TP11")).not.toBeInTheDocument();
    expect(within(panel).getAllByText("GND")).toHaveLength(1);
  });

  it("keeps the upper measurement column and both power transistors unchanged", () => {
    render(<Dvor1150ModuleFaceplate blockId="sideband-generator" />);
    const ids = ["TP1", "TP2", "TP3", "TP4", "A1R100", "A1R18", "TP5"];
    expect(ids.map((id) => Number(screen.getByText(id).getAttribute("y")) - 6))
      .toEqual([210, 250, 290, 330, 376, 420, 464]);
    ids.forEach((id) => expect(screen.getByText(id).parentElement!.querySelector("circle"))
      .toHaveAttribute("cx", "164"));
    expect(screen.getByText("Q101")).toHaveAttribute("y", "580");
    expect(screen.getByText("Q201")).toHaveAttribute("y", "1246");
  });

  it("retains the separate SYN panel and its GND label from Figure 3-40", () => {
    render(<Dvor1150ModuleFaceplate blockId="frequency-synthesizer" />);
    expect(screen.getByRole("img", { name: /Synthesizer front panel/ })).toBeInTheDocument();
    expect(screen.getByText("1A4 / A20")).toBeInTheDocument();
    expect(screen.getByText("GND")).toHaveAttribute("y", "757");
    expect(screen.queryByText("Q201")).not.toBeInTheDocument();
  });
});
