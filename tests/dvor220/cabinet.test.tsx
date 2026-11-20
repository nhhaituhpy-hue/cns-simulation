import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Dvor220BlockDiagram } from "@/modules/operations/dvor-220/dvor220-block-diagram";

afterEach(cleanup);

it("identifies the simulated ASU as the manual variant with a Power Monitor", () => {
  render(<Dvor220BlockDiagram />);
  const surfaces = within(screen.getByRole("tablist", { name: "Chọn cabinet hoặc ASU" }));
  fireEvent.click(surfaces.getByRole("tab", { name: "ASU" }));
  const cabinet = screen.getByRole("img", { name: /Bên trong Antenna Switching Unit/ });
  expect(within(cabinet).getByRole("button", { name: /2A1A7/ })).toBeInTheDocument();
  fireEvent.click(within(cabinet).getByRole("button", { name: "ASU, 2A1" }));
  const detail = within(screen.getByRole("region", { name: "Antenna Switching Unit" }));
  expect(detail.getByText("P/N 0233-7211")).toBeInTheDocument();
  expect(detail.getByText(/không xác nhận P\/N của tủ Cam Ranh/)).toBeInTheDocument();
});

it("shows the three Cam Ranh AC/DC converters, with blanks between them", () => {
  render(<Dvor220BlockDiagram />);
  const cabinet = screen.getByRole("img", { name: /Mặt trước cabinet/ });
  const converters = within(cabinet).getAllByRole("button", { name: /^AC\/DC \d,/ });
  expect(converters.map((slot) => slot.getAttribute("aria-label"))).toEqual([
    "AC/DC 1, 1A5A1", "AC/DC 3, 1A5A3", "AC/DC 5, 1A5A5",
  ]);
  expect(Array.from(cabinet.querySelectorAll('[data-slot-state="blank"][data-assembly-id^="1A5"]'), (slot) =>
    slot.getAttribute("data-assembly-id"))).toEqual(["1A5A2", "1A5A4"]);
  fireEvent.click(converters[1]);
  expect(converters[1]).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("group", { name: "Mặt panel AC/DC CONVERTER" })).toBeInTheDocument();
});

it("shows only the photographed AUX cards and keeps absent cards available from the diagram", () => {
  render(<Dvor220BlockDiagram />);
  const cabinet = screen.getByRole("img", { name: /Mặt trước cabinet/ });
  expect(within(cabinet).getAllByRole("button", { name: /^NIU \d,/ })).toHaveLength(1);
  expect(within(cabinet).queryByRole("button", { name: /^(EMU|MODEM|VAU)[ ,]/ })).not.toBeInTheDocument();
  const upper = within(cabinet).getByRole("button", { name: "DC/DC-A 1, 1A1A8" }).querySelector("rect")!;
  const lower = within(cabinet).getByRole("button", { name: "DC/DC-A 2, 1A1A9" }).querySelector("rect")!;
  expect(upper.getAttribute("x")).toBe(lower.getAttribute("x"));
  expect(Number(upper.getAttribute("y")) + Number(upper.getAttribute("height"))).toBeLessThan(Number(lower.getAttribute("y")));
  fireEvent.click(screen.getByRole("button", { name: "EMU, 1A1A5" }));
  expect(screen.getByRole("group", { name: "Mặt panel EMU" })).toBeInTheDocument();
  expect(within(cabinet).queryByRole("button", { pressed: true })).not.toBeInTheDocument();
});

it("shows the rear IFB connector groups in the photographed layout", () => {
  render(<Dvor220BlockDiagram />);
  fireEvent.click(screen.getByRole("tab", { name: "Rear Cabinet" }));
  const cabinet = screen.getByRole("img", { name: /Mặt sau cabinet/ });
  const ports = cabinet.querySelectorAll('[data-board="ifb"] [data-connector-kind]');
  expect(Array.from(ports, (port) => port.getAttribute("data-connector-kind"))).toEqual([
    "d-sub", "d-sub", "d-sub", "d-sub", "ribbon", "ribbon", "lan", "usb", "terminal-block", "terminal-block",
  ]);
  const y = (port: Element) => Number(port.querySelector("rect")?.getAttribute("y"));
  expect(y(ports[0]!)).toBeLessThan(y(ports[6]!));
  const terminals = Array.from(cabinet.querySelectorAll('[data-connector-kind="terminal-block"]'));
  for (const terminal of terminals) {
    expect(terminal).not.toHaveAttribute("aria-label");
    expect(terminal.textContent).toBe("");
  }
  const hotspot = within(cabinet).getByRole("button", { name: "IFB, 1A7" });
  fireEvent.click(hotspot);
  expect(screen.getByRole("heading", { name: "Interface Board" })).toBeInTheDocument();
});

it("locates the 1PD1 divider vertically on the left rail without naming its BNCs", () => {
  render(<Dvor220BlockDiagram />);
  fireEvent.click(screen.getByRole("button", { name: /QUINT 3-WAY DIVIDER, 1PD1/ }));
  const cabinet = screen.getByRole("img", { name: /Mặt sau cabinet/ });
  const divider = within(cabinet).getByRole("button", { name: "QUINT 3-WAY, 1PD1" });
  expect(divider).toHaveAttribute("aria-pressed", "true");
  const bounds = divider.querySelector("rect")!;
  expect(Number(bounds.getAttribute("x"))).toBeLessThan(150);
  expect(Number(bounds.getAttribute("height"))).toBeGreaterThan(Number(bounds.getAttribute("width")));
  const bncs = Array.from(cabinet.querySelectorAll('[data-board="1pd1"] [data-connector-kind="bnc"]'));
  expect(bncs).toHaveLength(5);
  expect(new Set(bncs.map((bnc) => bnc.firstElementChild?.getAttribute("x"))).size).toBe(1);
  for (const bnc of bncs) {
    expect(bnc).not.toHaveAttribute("aria-label");
    expect(bnc.textContent).toBe("");
  }
  expect(screen.getByRole("group", { name: "Mặt panel QUINT 3-WAY RF DIVIDER" })).toBeInTheDocument();
});
