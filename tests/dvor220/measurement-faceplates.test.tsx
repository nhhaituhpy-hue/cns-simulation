import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DVOR_220_BLOCK_BY_ID } from "@/modules/operations/dvor-220/block-diagram-data";
import { Dvor220ModuleFaceplate } from "@/modules/operations/dvor-220/dvor220-module-faceplates";
import { Dvor220BlockDiagram } from "@/modules/operations/dvor-220/dvor220-block-diagram";

afterEach(cleanup);

describe("DVOR 220 source-aligned measurement connectors", () => {
  it("places the four LMI indicator windows and keylock beside the landscape display (Fig. 4-1)", () => {
    render(<Dvor220ModuleFaceplate kind="lmi" blockId="lmi" onSelectPoint={vi.fn()} />);
    const panel = screen.getByRole("group", { name: "Mặt panel LOCAL MAINTENANCE INTERFACE" });
    expect(panel).toHaveAttribute("viewBox", "0 0 900 485");
    const display = panel.querySelector('rect[width="602"]')!;
    const windows = ["NORMAL", "WARNING", "ALARM", "MAINT"].map(
      (label) => within(panel).getAllByText(label)[0].previousElementSibling!,
    );
    const keylock = panel.querySelector('[data-control-kind="keylock"] circle')!;
    expect(windows.map((window) => Number(window.getAttribute("y")))).toEqual([71, 137, 203, 269]);
    expect(windows.every((window) => Number(window.getAttribute("x")) > Number(display.getAttribute("x")) + Number(display.getAttribute("width")))).toBe(true);
    expect(keylock).toHaveAttribute("cx", "799.5");
    expect(Number(keylock.getAttribute("cy"))).toBeGreaterThan(269 + 38);
    expect(within(panel).getByText("REM")).toHaveAttribute("x", "799");
    expect(within(panel).queryByRole("button")).not.toBeInTheDocument();
    expect(within(panel).queryByText("220 DVOR")).not.toBeInTheDocument();
  });

  it("lays out the CSP transmitter, monitor and local controls in the figure's three sections (Fig. 4-2)", () => {
    render(<Dvor220ModuleFaceplate kind="csp" blockId="csp" onSelectPoint={vi.fn()} />);
    const panel = screen.getByRole("group", { name: "Mặt panel CSP" });
    const coords = (label: string) => within(panel).getAllByText(label).map((element) =>
      [Number(element.getAttribute("x")), Number(element.getAttribute("y"))],
    );
    expect(coords("1")).toEqual([[74, 66], [74, 343]]);
    expect(coords("2")).toEqual([[226, 66], [226, 343]]);
    expect(coords("CMA")).toEqual([[74, 309], [226, 309]]);
    expect(coords("SMA")).toEqual([[37, 309], [263, 309]]);
    expect(coords("EXEC")).toEqual([[54, 371], [246, 371]]);
    expect(coords("STBY")).toEqual([[94, 371], [206, 371]]);
    expect(coords("BYPASS")).toEqual([[150, 514]]);
    expect(coords("TxD")).toEqual([[78, 749]]);
    expect(coords("RxD")).toEqual([[78, 778]]);
    const rightColumn = ["RESET", "LAMP TEST", "SILENCE", "VOLUME"].map((label) => coords(label)[0]);
    expect(rightColumn).toEqual([[232, 606], [232, 671], [232, 736], [232, 792]]);
    expect(within(panel).queryByRole("button")).not.toBeInTheDocument();
  });

  it("places the TSG RF test output below its two service headers and reset (Fig. 7-1)", () => {
    render(<Dvor220ModuleFaceplate kind="card" blockId="tsg" onSelectPoint={vi.fn()} />);
    const panel = screen.getByRole("group", { name: "Mặt panel TSG" });
    const labels = ["POWER", "FAULT", "PLL FAULT", "MCU JTAG", "RESET", "CPLD JTAG", "VOR RF SIGNAL"];
    expect(labels.map((label) => Number(within(panel).getByText(label).getAttribute("y"))))
      .toEqual([142, 175, 209, 322, 384, 488, 558]);
    const rf = within(panel).getByRole("button", { name: /VOR RF Signal/ });
    expect(rf).toHaveAttribute("data-point-id", "BNC");
    expect(rf.querySelector("circle")).toHaveAttribute("cy", "554");
    expect(within(panel).getByText("MCU JTAG").parentElement?.querySelectorAll("circle")).toHaveLength(14);
    expect(within(panel).getByText("CPLD JTAG").parentElement?.querySelectorAll("circle")).toHaveLength(10);
  });

  it("places the SCU CAN TxD and RxD test pins above MCU JTAG in that order (Fig. 7-2)", () => {
    render(<Dvor220ModuleFaceplate kind="card" blockId="scu" onSelectPoint={vi.fn()} />);
    const panel = screen.getByRole("group", { name: "Mặt panel SCU" });
    const labels = ["POWER", "FAULT", "MASTER/SLAVE", "CAN TxD TTL", "CAN RxD TTL", "MCU JTAG", "RESET", "CPLD JTAG"];
    expect(labels.map((label) => Number(within(panel).getByText(label).getAttribute("y"))))
      .toEqual([142, 175, 211, 240, 265, 322, 384, 488]);
    const [tx, rx] = within(panel).getAllByRole("button");
    expect(tx).toHaveAttribute("data-point-id", "CAN TxD");
    expect(rx).toHaveAttribute("data-point-id", "CAN RxD");
    for (const pin of [tx, rx]) expect(pin).toHaveAttribute("data-connector-kind", "test-pin");
    expect(panel.querySelector('[data-connector-kind="test-jack"]')).toBeNull();
  });

  it("positions the DC/DC-A jacks directly after its status lamps on one axis (Fig. 7-3)", () => {
    render(<Dvor220ModuleFaceplate kind="dcdc-aux" blockId="dcdc-aux" onSelectPoint={vi.fn()} />);
    const panel = screen.getByRole("group", { name: "Mặt panel DC/DC-A" });
    const jacks = within(panel).getAllByRole("button");
    expect(jacks.map((jack) => jack.getAttribute("data-point-id"))).toEqual(["+5 V", "+15 V", "-15 V", "GND"]);
    expect(jacks.map((jack) => Number(jack.querySelector("circle")!.getAttribute("cy")))).toEqual([371, 405, 437, 472]);
    expect(jacks.map((jack) => jack.querySelector("[data-color]")!.getAttribute("data-color"))).toEqual(["red", "red", "red", "black"]);
    expect(jacks.every((jack) => jack.querySelector("circle")?.getAttribute("cx") === "58")).toBe(true);
    expect(within(panel).getByText("OUTPUT VOLTAGE FAULT")).toHaveAttribute("y", "330");
  });

  it.each(["sma-lsb", "sma-usb"] as const)("positions the two %s ENV BNCs low on the right (Fig. 7-4)", (blockId) => {
    render(<Dvor220ModuleFaceplate kind="sma" blockId={blockId} onSelectPoint={vi.fn()} />);
    const panel = screen.getByRole("group", { name: "Mặt panel SMA" });
    expect(panel).toHaveAttribute("viewBox", "0 0 140 720");
    const ports = within(panel).getAllByRole("button");
    expect(ports.map((port) => port.getAttribute("data-point-id"))).toEqual(["J5", "J6"]);
    expect(ports.map((port) => port.querySelector("circle")?.getAttribute("cy"))).toEqual(["533", "587"]);
    expect(ports.every((port) => port.querySelector("circle")?.getAttribute("cx") === "96")).toBe(true);
    expect(within(panel).getAllByText("COS")).toHaveLength(3);
    expect(within(panel).getAllByText("SIN")).toHaveLength(3);
  });

  it("places the CMA J2 ENV BNC low on the right-hand face (Fig. 7-7)", () => {
    render(<Dvor220ModuleFaceplate kind="cma" blockId="cma" onSelectPoint={vi.fn()} />);
    const panel = screen.getByRole("group", { name: "Mặt panel CMA" });
    const port = within(panel).getByRole("button", { name: /J2/ });
    expect(port.querySelector("circle")).toHaveAttribute("cx", "153");
    expect(port.querySelector("circle")).toHaveAttribute("cy", "588");
    expect(within(port).getByText("ENV")).toHaveAttribute("text-anchor", "middle");
    expect(within(panel).getByText("FAULT")).toHaveAttribute("y", "219");
  });

  it("retains the seven transmitter DC/DC test jacks on the column beside the handle (Fig. 7-10)", () => {
    render(<Dvor220ModuleFaceplate kind="dcdc-tx" blockId="dcdc-tx" onSelectPoint={vi.fn()} />);
    const panel = screen.getByRole("group", { name: "Mặt panel DC/DC" });
    const jacks = within(panel).getAllByRole("button");
    expect(jacks.map((jack) => jack.getAttribute("data-point-id")))
      .toEqual(["+5 V", "+8 V", "+15 V", "-15 V", "+28 V", "+50 V", "GND"]);
    expect(jacks.map((jack) => jack.querySelector("circle")?.getAttribute("cy")))
      .toEqual(["279", "333", "376", "419", "463", "506", "563"]);
    expect(jacks.every((jack) => jack.querySelector("circle")?.getAttribute("cx") === "92")).toBe(true);
    expect(jacks.map((jack) => jack.querySelector("[data-color]")?.getAttribute("data-color")))
      .toEqual(["red", "red", "red", "red", "red", "red", "black"]);
  });

  it.each(["tsg", "scu", "dcdc-aux", "dcdc-tx", "sma-lsb", "sma-usb", "cma", "msg", "syn", "mon", "pdc", "pmu"] as const)("%s maps each physical connector to its exact catalog point", (blockId) => {
    const block = DVOR_220_BLOCK_BY_ID.get(blockId)!;
    const select = vi.fn();
    render(<Dvor220ModuleFaceplate kind={block.faceplate!} blockId={blockId} onSelectPoint={select} />);
    const panel = screen.getByRole("group");
    const buttons = within(panel).getAllByRole("button");
    expect(buttons).toHaveLength(block.testPoints.length);
    for (const point of block.testPoints) {
      const pin = within(panel).getByRole("button", { name: `Xem tín hiệu ${point.id} ${point.label} trên panel` });
      expect(pin).toHaveAttribute("data-point-id", point.id);
      fireEvent.click(pin);
      expect(select).toHaveBeenLastCalledWith(point);
      const kind = blockId === "scu" || (blockId === "msg" && point.id !== "sync-30hz") || blockId === "mon" || (blockId === "syn" && point.id.startsWith("TP"))
        ? "test-pin"
        : ["tsg", "sma-lsb", "sma-usb", "cma", "msg", "syn", "pdc"].includes(blockId) ? "bnc" : "test-jack";
      expect(pin).toHaveAttribute("data-connector-kind", kind);
    }
  });

  it("opens the unnumbered MSG 30 Hz Sync BNC by semantic ID, without invented electrical limits", () => {
    const block = DVOR_220_BLOCK_BY_ID.get("msg")!;
    const point = block.testPoints.find((item) => item.id === "sync-30hz");
    expect(point).toBeDefined();
    expect(point?.label).toBe("30 Hz Sync");
    expect(point?.nominal).toBe("30 Hz");
    expect(point?.tolerance).toBeUndefined();
    expect(point?.source).toContain("Figure 7-11, PDF 477");
    expect(point?.conditions?.join(" ")).toMatch(/không ghi số hiệu J\/TP/i);
    const select = vi.fn();
    render(<Dvor220ModuleFaceplate kind="msg" blockId="msg" onSelectPoint={select} />);
    const connector = within(screen.getByRole("group")).getByRole("button", { name: "Xem tín hiệu sync-30hz 30 Hz Sync trên panel" });
    expect(within(screen.getByRole("group")).getAllByRole("button").map((point) => point.getAttribute("data-point-id")))
      .toEqual(["sync-30hz", "TP49", "TP61", "TP62", "TP63", "TP64"]);
    expect(connector.querySelector("circle")).toHaveAttribute("cy", "445");
    expect(within(screen.getByRole("group")).getByText("TP49 · CARRIER MOD")).toHaveAttribute("y", "486");
    expect(within(screen.getByRole("group")).getByText("TP64 · LSB SIN")).toHaveAttribute("y", "606");
    expect(connector).toHaveAttribute("data-connector-kind", "bnc");
    expect(connector).toHaveAttribute("data-point-id", "sync-30hz");
    fireEvent.click(connector);
    expect(select).toHaveBeenLastCalledWith(point);
    fireEvent.keyDown(connector, { key: "Enter" });
    fireEvent.keyDown(connector, { key: " " });
    expect(select).toHaveBeenCalledTimes(3);
    expect(select).toHaveBeenLastCalledWith(point);
  });

  it("depicts SW2–SW6 as five non-operable rotary frequency switches", () => {
    render(<Dvor220ModuleFaceplate kind="syn" blockId="syn" onSelectPoint={vi.fn()} />);
    const panel = screen.getByRole("group", { name: "Mặt panel SYN" });
    for (const [index, id] of ["SW2", "SW3", "SW4", "SW5", "SW6"].entries()) {
      const label = within(panel).getByText(id);
      const rotary = label.closest("[data-control-kind='rotary-switch']");
      expect(rotary).toBeInTheDocument();
      expect(rotary?.querySelector("circle")).toHaveAttribute("cx", "58");
      expect(rotary?.querySelector("circle")).toHaveAttribute("cy", ["364", "389", "414", "441", "466"][index]);
      expect(label.closest("[role='button']")).toBeNull();
    }
    expect(panel).toHaveAttribute("width", "210");
    expect(panel).toHaveAttribute("height", "720");
    const points = within(panel).getAllByRole("button");
    expect(points.map((point) => point.getAttribute("data-point-id"))).toEqual(["J1", "TP33", "TP34", "TP35", "TP36", "J6"]);
    expect(points[0]!.querySelector("circle")).toHaveAttribute("cy", "138");
    expect(points[5]!.querySelector("circle")).toHaveAttribute("cy", "582");
    expect(within(panel).queryByText("RESET")).not.toBeInTheDocument();
  });

  it("renders the PDC standby AM9960 physical trim as an ordered read-only reference", () => {
    render(<Dvor220BlockDiagram />);
    fireEvent.click(screen.getAllByRole("button", { name: "PDC, 1A8A1" })[0]);
    const region = screen.getByRole("region", { name: "Tham chiếu hiệu chỉnh" });
    const adjustment = DVOR_220_BLOCK_BY_ID.get("pdc")!.adjustments?.find((item) => item.id === "standby-am9960");
    expect(adjustment).toBeDefined();
    expect(adjustment?.control).toBe("1A8A1A1VR1");
    expect(adjustment?.target).toBe("TX1: 30%; kiểm tra TX2: 30 ±0.5%");
    expect(adjustment?.instrument).toContain("Standby MON của MON1");
    expect(adjustment?.source).toContain("§9.6.4, Figure 9-8, PDF 548 (9-22)");
    const steps = adjustment!.conditions;
    expect(steps[0]).toMatch(/TX1.*On Dummy Load/);
    expect(steps[1]).toMatch(/USB SIN.*USB COS.*CARRIER.*LSB.*tắt.*USB Phasing COS to SIN.*cực đại/);
    expect(steps[2]).toMatch(/LSB SIN.*LSB COS.*CARRIER.*USB.*tắt.*LSB Phasing COS to SIN.*cực đại/);
    expect(steps[3]).toMatch(/Tất cả RF ON.*carrier to sideband.*cực đại/);
    expect(steps[4]).toMatch(/1A8A1A1VR1.*Standby MON của MON1.*30%/);
    expect(steps[5]).toMatch(/TX2.*On Dummy Load.*30 ±0.5%/);
    expect(steps.join(" ")).not.toMatch(/clockwise|°|W\/vòng/i);
    expect(region).toHaveTextContent("Không mô phỏng thao tác hiệu chỉnh");
    expect(region).toHaveTextContent(adjustment!.control);
    expect(region).toHaveTextContent(adjustment!.target);
    expect(region).toHaveTextContent(adjustment!.source);
    for (const step of steps) expect(within(region).getByText(step)).toBeInTheDocument();
    expect(within(region).queryByRole("button")).not.toBeInTheDocument();
    expect(region.querySelector("input, select, textarea")).toBeNull();
    const panel = screen.getByRole("group", { name: "Mặt panel PDC · POWER DETECTOR / CHANGEOVER" });
    const ports = within(panel).getAllByRole("button");
    expect(ports.map((port) => port.getAttribute("data-point-id"))).toEqual(["J20", "J21", "J22", "J23", "J24"]);
    expect(ports.map((port) => port.querySelector("circle")!.getAttribute("cx"))).toEqual(["125", "297", "501", "672", "769"]);
    expect(ports.every((port) => port.querySelector("circle")!.getAttribute("cy") === "181")).toBe(true);
    expect(panel.querySelector('g[transform="rotate(-90 300 210)"]')).toBeInTheDocument();
    expect(within(panel).queryByText("POWER")).not.toBeInTheDocument();
  });

  it("does not show an unsourced fixed port correction or a fake live PMU reading", () => {
    const view = render(<Dvor220ModuleFaceplate kind="pdc" blockId="pdc" />);
    expect(screen.queryByText(/-30 dB COUPLED SAMPLE/)).not.toBeInTheDocument();
    expect(screen.getByText(/PORT-SPECIFIC LOSS/)).toBeInTheDocument();
    view.rerender(<Dvor220ModuleFaceplate kind="pmu" blockId="pmu" />);
    expect(screen.queryByText("28.0")).not.toBeInTheDocument();
    expect(screen.getByText("----")).toBeInTheDocument();
  });

  it("shows the 1A4 double AC breaker, then both battery breakers below AC AVAILABLE (Fig. 7-24)", () => {
    render(<Dvor220ModuleFaceplate kind="power-switch" blockId="power-switch-panel" />);
    const panel = screen.getByRole("img", { name: "Mặt panel POWER SWITCH PANEL" });
    const breakers = Array.from(panel.querySelectorAll("[data-breaker]"));
    expect(breakers.map((breaker) => breaker.getAttribute("data-breaker"))).toEqual(["AC MAIN", "BATT 1", "BATT 2"]);
    expect(breakers.map((breaker) => breaker.querySelector("rect")?.getAttribute("width"))).toEqual(["176", "128", "128"]);
    expect(within(panel).getByText("AC AVAILABLE")).toHaveAttribute("y", "122");
    expect(breakers.every((breaker) => breaker.querySelector("rect")?.getAttribute("y") === "211")).toBe(true);
  });

  it("places PMU service and voltage points on the upper row and orders the five display selectors below (Fig. 7-24)", () => {
    render(<Dvor220ModuleFaceplate kind="pmu" blockId="pmu" onSelectPoint={vi.fn()} />);
    const panel = screen.getByRole("group", { name: "Mặt panel PMU · POWER MANAGEMENT UNIT" });
    const jacks = within(panel).getAllByRole("button");
    expect(jacks.map((jack) => jack.getAttribute("data-point-id"))).toEqual(["GND", "Battery Voltage", "AC/DC Voltage"]);
    expect(jacks.map((jack) => jack.querySelector("circle")?.getAttribute("cx"))).toEqual(["437", "463", "489"]);
    expect(jacks.every((jack) => jack.querySelector("circle")?.getAttribute("cy") === "143")).toBe(true);
    const selectors = ["PMU TEMP", "AC/DC V", "AC/DC I", "BAT V", "BAT I"].map((label) => within(panel).getAllByText(label).find((element) => element.getAttribute("y") === "331"));
    expect(selectors.map((selector) => selector?.getAttribute("x"))).toEqual(["387", "435", "483", "531", "579"]);
    expect(panel.querySelector('g[transform="rotate(-90 97 52)"]')).toBeInTheDocument();
    expect(within(panel).getByText("----")).toBeInTheDocument();
  });

  it("places the AC/DC release below the grille, followed by the AC and DC lamps (Fig. 7-25)", () => {
    render(<Dvor220ModuleFaceplate kind="acdc" blockId="acdc" />);
    const panel = screen.getByRole("img", { name: "Mặt panel AC/DC CONVERTER" });
    expect(panel).toHaveAttribute("viewBox", "0 0 480 225");
    expect(within(panel).getByText("RELEASE")).toHaveAttribute("x", "174");
    const lamps = ["AC OK/FAIL", "DC OK/FAIL"].map((label) => within(panel).getByText(label).previousElementSibling!);
    expect(lamps.map((lamp) => lamp.getAttribute("cx"))).toEqual(["215", "269"]);
    expect(lamps.every((lamp) => lamp.getAttribute("cy") === "193")).toBe(true);
  });

  it("places NIU Ethernet above USB Type-C without adding generic service controls (Figs. 3-26/27)", () => {
    render(<Dvor220ModuleFaceplate kind="card" blockId="niu" />);
    const panel = screen.getByRole("img", { name: "Mặt panel NIU" });
    expect(within(panel).getByText("RJ1 LAN")).toHaveAttribute("y", "334");
    expect(within(panel).getByText("USB2 TYPE-C")).toHaveAttribute("y", "419");
    expect(within(panel).queryByText(/JTAG|RESET|I\/O/)).not.toBeInTheDocument();
  });

  it("shows the VAU microphone below center without a front line input (Figs. 3-32/33)", () => {
    render(<Dvor220ModuleFaceplate kind="card" blockId="vau" />);
    const panel = screen.getByRole("img", { name: "Mặt panel VAU" });
    expect(within(panel).getByText("MIC")).toHaveAttribute("y", "410");
    expect(within(panel).queryByText(/LINE|JTAG|RESET|I\/O/)).not.toBeInTheDocument();
  });

  it("shows all five unlabeled PIR BNCs across the divider (Figs. 3-14/15)", () => {
    render(<Dvor220ModuleFaceplate kind="quint-divider" blockId="rf-divider" onSelectPoint={vi.fn()} />);
    const panel = screen.getByRole("group", { name: "Mặt panel QUINT 3-WAY RF DIVIDER" });
    const ports = Array.from(panel.querySelectorAll('[data-connector-kind="bnc"]'));
    expect(ports.map((port) => port.querySelector("circle")?.getAttribute("cx"))).toEqual(["116", "252", "391", "531", "669"]);
    expect(ports.every((port) => port.querySelector("circle")?.getAttribute("cy") === "74")).toBe(true);
    expect(ports.every((port) => !port.hasAttribute("data-point-id"))).toBe(true);
    expect(within(panel).queryByRole("button")).not.toBeInTheDocument();
  });

  it("distinguishes the closed ASU door from the separate interior view (Figs. 1-6 and 3-68)", () => {
    render(<Dvor220ModuleFaceplate kind="asu" blockId="asu" />);
    const panel = screen.getByRole("img", { name: "Mặt panel ANTENNA SWITCHING UNIT" });
    expect(panel).toHaveAttribute("viewBox", "0 0 600 800");
    expect(within(panel).getByText("ASU")).toBeInTheDocument();
    expect(within(panel).queryByText(/TOGGLE MODULE|SM COS/)).not.toBeInTheDocument();
    expect(panel.querySelector("[data-connector-kind]")).toBeNull();
  });

  it("preserves the nine MON indicators including the source's duplicate Secondary Alarm label", () => {
    render(<Dvor220ModuleFaceplate kind="mon" blockId="mon" onSelectPoint={vi.fn()} />);
    const panel = screen.getByRole("group", { name: "Mặt panel MON" });
    expect(within(panel).getAllByText("SECONDARY ALARM")).toHaveLength(2);
    expect(Array.from(panel.querySelectorAll("[data-color] text"), (indicator) => indicator.textContent))
      .toEqual(["POWER", "FAULT", "INTEGRAL ALARM", "INTEGRAL WARNING", "SECONDARY ALARM", "STANDBY ALARM", "STANDBY WARNING", "SECONDARY ALARM", "IDENTITY CODE"]);
    const pins = within(panel).getAllByRole("button");
    expect(pins.map((pin) => pin.getAttribute("data-point-id"))).toEqual(["TP47", "TP48", "TP49", "TP51"]);
    expect(pins.map((pin) => pin.querySelector("path")?.getAttribute("d"))).toEqual(["M58 533v18", "M58 553v18", "M58 573v18", "M58 593v18"]);
  });

  it("shows the cooling fan indicators in a horizontal row to the left of the six-pin Molex (Fig. 7-22)", () => {
    render(<Dvor220ModuleFaceplate kind="fan" blockId="fan" />);
    const panel = screen.getByRole("img", { name: "Mặt panel FAN" });
    expect(panel).toHaveAttribute("viewBox", "0 0 820 112");
    const lights = ["POWER", "FAN 1 FAULT", "FAN 2 FAULT", "FAN 3 FAULT", "FAN 4 FAULT"];
    expect(lights.map((label) => within(panel).getByText(label).parentElement!.querySelector("circle")?.getAttribute("cx")))
      .toEqual(["553", "573", "593", "613", "633"]);
    expect(lights.every((label) => within(panel).getByText(label).parentElement!.querySelector("circle")?.getAttribute("cy") === "36")).toBe(true);
    const molex = panel.querySelector('[data-connector-kind="molex"]')!;
    expect(molex.querySelectorAll("rect")).toHaveLength(7);
    expect(molex.querySelector("rect")).toHaveAttribute("x", "683");
  });
});
