import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { StrictMode } from "react";
import { Dme320BlockDiagram } from "@/modules/operations/dme-320/dme320-block-diagram";
import { DME_320_BLOCKS, DME_320_BLOCK_BY_ID } from "@/modules/operations/dme-320/block-diagram-data";

// JSDOM lacks the native modal lifecycle; this shim belongs only to this suite.
// Real-browser verification must cover native focus trapping and inert background.
const dialogDescriptors = {
  showModal: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal"),
  close: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close"),
};
beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } },
    close: { configurable: true, value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    } },
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.style.overflow = "";
  for (const key of ["showModal", "close"] as const) {
    const descriptor = dialogDescriptors[key];
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }
});

describe("DME 320 source-backed measurement references", () => {
  it.each(DME_320_BLOCKS.filter((block) => block.testPoints.length && block.cabinetHotspots.length))("$id opens every catalog point from its own list", (block) => {
    render(<StrictMode><Dme320BlockDiagram /></StrictMode>);
    const hotspot = block.cabinetHotspots[0];
    if (hotspot.surface === "rear") fireEvent.click(screen.getByRole("tab", { name: "Rear Cabinet Rev. A" }));
    fireEvent.click(screen.getAllByRole("button", { name: `${hotspot.shortLabel}, ${hotspot.assemblyId}` })[0]);
    for (const point of block.testPoints) {
      fireEvent.click(screen.getByRole("button", { name: `Xem tín hiệu ${point.id} ${point.label}` }));
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByRole("heading", { name: `${point.id} · ${point.label}` })).toBeInTheDocument();
      for (const value of [point.instrument, point.signalType, point.nominal, point.tolerance, point.source ?? block.manualReference, ...(point.conditions ?? [])].filter((item): item is string => !!item)) {
        expect(within(dialog).getAllByText(value).length).toBeGreaterThan(0);
      }
      if (!point.waveforms?.length) expect(within(dialog).queryByRole("img")).not.toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole("button", { name: "Đóng ×" }));
    }
  });

  it("keeps waveform selection in the same native dialog and separates capture data from limits", () => {
    const block = DME_320_BLOCK_BY_ID.get("rxu")!;
    const first = { src: "/fixture-first.webp", width: 100, height: 100, alt: "Ảnh fixture thứ nhất", caption: "Điều kiện thử thứ nhất", source: "Nguồn ảnh fixture thứ nhất", scopeSettings: ["Cài đặt fixture thứ nhất"], observedReadings: ["Số đọc fixture thứ nhất"] };
    const second = { ...first, src: "/fixture-second.webp", alt: "Ảnh fixture thứ hai", caption: "Điều kiện thử thứ hai", source: "Nguồn ảnh fixture thứ hai", scopeSettings: ["Cài đặt fixture thứ hai"], observedReadings: ["Số đọc fixture thứ hai"] };
    const point = { id: "LOG VIDEO WIDE", label: "Điểm thử nhiều waveform", description: "Fixture chỉ kiểm tra chuyển ảnh.", waveforms: [first, second] };
    const get = DME_320_BLOCK_BY_ID.get.bind(DME_320_BLOCK_BY_ID);
    vi.spyOn(DME_320_BLOCK_BY_ID, "get").mockImplementation((id) => id === "rxu" ? { ...block, testPoints: [point] } : get(id));
    render(<StrictMode><Dme320BlockDiagram /></StrictMode>);
    fireEvent.click(screen.getAllByRole("button", { name: "RXU 1, 1A2A2" })[0]);
    fireEvent.click(screen.getByRole("button", { name: `Xem tín hiệu ${point.id} ${point.label}` }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: first.caption })).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).getByRole("heading", { name: "Số đọc trên ảnh · không phải giới hạn hãng" })).toBeInTheDocument();
    for (const value of [...first.scopeSettings, ...first.observedReadings]) expect(within(dialog).getByText(value)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: second.caption }));
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(dialog).toHaveAttribute("open");
    expect(within(dialog).getByRole("img")).toHaveAttribute("alt", second.alt);
    for (const value of [...second.scopeSettings, ...second.observedReadings]) expect(within(dialog).getByText(value)).toBeInTheDocument();
    for (const value of [...first.scopeSettings, ...first.observedReadings]) expect(within(dialog).queryByText(value)).not.toBeInTheDocument();
    expect(within(dialog).getByText("Chưa có dung sai được xác minh; không suy ra giới hạn từ ảnh chụp.")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Đóng ×" }));
    fireEvent.click(screen.getByRole("button", { name: `Phóng lớn ${second.caption}` }));
    expect(within(screen.getByRole("dialog")).getByRole("img")).toHaveAttribute("alt", second.alt);
  });

  it("renders reference-only adjustment procedures without operable trim controls", () => {
    const block = DME_320_BLOCK_BY_ID.get("dcdc")!;
    // Synthetic catalog fixture tests optional rendering, never manufacturer facts.
    const adjustment = {
      id: "fixture-procedure", label: "Quy trình thử giao diện", control: "Điều khiển tham chiếu thử nghiệm",
      instrument: "Thiết bị đo thử nghiệm", target: "Mục tiêu thử nghiệm",
      conditions: ["Bước thử nghiệm thứ nhất", "Bước thử nghiệm thứ hai"], source: "Nguồn fixture · không phải manual",
    };
    const get = DME_320_BLOCK_BY_ID.get.bind(DME_320_BLOCK_BY_ID);
    vi.spyOn(DME_320_BLOCK_BY_ID, "get").mockImplementation((id) => id === "dcdc" ? { ...block, adjustments: [adjustment] } : get(id));
    render(<Dme320BlockDiagram />);
    fireEvent.click(screen.getAllByRole("button", { name: "DC/DC 1, 1A2A5" })[0]);
    const region = screen.getByRole("region", { name: "Tham chiếu hiệu chỉnh" });
    expect(region).toHaveTextContent("Không mô phỏng thao tác hiệu chỉnh");
    for (const value of [adjustment.label, adjustment.control, adjustment.instrument, adjustment.target, adjustment.source, ...adjustment.conditions]) expect(within(region).getByText(value)).toBeInTheDocument();
    expect(within(region).queryByRole("button")).not.toBeInTheDocument();
    expect(region.querySelector("input, select, textarea, meter")).toBeNull();
    expect([...region.querySelectorAll("ol li")].map((item) => item.textContent)).toEqual(adjustment.conditions);
  });

  it("explicitly marks unknown signal and conditions instead of guessing", () => {
    const block = DME_320_BLOCK_BY_ID.get("rxu")!;
    const point = { id: "LOG VIDEO WIDE", label: "Điểm thử thiếu nguồn", description: "Fixture kiểm tra fallback." };
    const get = DME_320_BLOCK_BY_ID.get.bind(DME_320_BLOCK_BY_ID);
    vi.spyOn(DME_320_BLOCK_BY_ID, "get").mockImplementation((id) => id === "rxu" ? { ...block, testPoints: [point] } : get(id));
    render(<Dme320BlockDiagram />);
    fireEvent.click(screen.getAllByRole("button", { name: "RXU 1, 1A2A2" })[0]);
    fireEvent.click(screen.getByRole("button", { name: `Xem tín hiệu ${point.id} ${point.label}` }));
    const dialog = screen.getByRole("dialog");
    for (const text of [
      "Chưa có thông tin thiết bị đo trong dữ liệu tham chiếu.",
      "Chưa có loại tín hiệu được xác minh cho điểm này.",
      "Chưa có giá trị danh định được xác minh cho điểm này.",
      "Chưa có dung sai được xác minh; không suy ra giới hạn từ ảnh chụp.",
      "Chưa có điều kiện đo được xác minh cho điểm này.",
      block.manualReference,
    ]) expect(within(dialog).getByText(text)).toBeInTheDocument();
  });

  it("has no engine, store, scenario or exam mutation dependencies", () => {
    for (const file of ["dme320-block-diagram.tsx", "dme320-module-faceplates.tsx"]) {
      const source = readFileSync(`src/modules/operations/dme-320/${file}`, "utf8");
      expect(source).not.toMatch(/from\s+["'][^"']*(?:store|engine|scenario|exam)[^"']*["']/i);
      expect(source).not.toMatch(/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage)\b/);
    }
  });

  it("dismisses actual backdrop clicks, not dialog padding", () => {
    render(<StrictMode><Dme320BlockDiagram /></StrictMode>);
    fireEvent.click(screen.getAllByRole("button", { name: "RXU 1, 1A2A2" })[0]);
    const trigger = screen.getByRole("button", { name: "Xem tín hiệu LOG VIDEO WIDE Log Video Wide" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    dialog.getBoundingClientRect = () => ({ left: 10, right: 110, top: 10, bottom: 110, width: 100, height: 100, x: 10, y: 10, toJSON: () => ({}) });
    fireEvent.click(dialog, { clientX: 50, clientY: 50 });
    expect(dialog).toHaveAttribute("open");
    fireEvent.click(dialog, { clientX: 0, clientY: 0 });
    expect(document.querySelector("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("clears the reference when switching the same module's cabinet occurrence", () => {
    document.body.style.overflow = "auto";
    const view = render(<StrictMode><Dme320BlockDiagram /></StrictMode>);
    fireEvent.click(screen.getAllByRole("button", { name: "RXU 1, 1A2A2" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Xem tín hiệu LOG VIDEO WIDE Log Video Wide" }));
    expect(document.body.style.overflow).toBe("hidden");
    // Programmatic navigation: native dialog prevents background user input.
    fireEvent.click(screen.getAllByRole("button", { name: "RXU 2, 1A3A2" })[0]);
    expect(document.querySelector("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("auto");
    fireEvent.click(screen.getByRole("button", { name: "Xem tín hiệu LOG VIDEO WIDE Log Video Wide" }));
    view.unmount();
    expect(document.body.style.overflow).toBe("auto");
    document.body.style.overflow = "";
  });

  it("opens the same reference via a keyboard panel BNC and restores SVG focus", () => {
    render(<StrictMode><Dme320BlockDiagram /></StrictMode>);
    fireEvent.click(screen.getAllByRole("button", { name: "RXU 1, 1A2A2" })[0]);
    const panel = screen.getByRole("group", { name: "Mặt panel RXU" });
    const bnc = within(panel).getByRole("button", { name: "Xem tín hiệu LOG VIDEO WIDE Log Video Wide trên panel" });
    bnc.focus();
    fireEvent.keyDown(bnc, { key: "Enter" });
    expect(within(screen.getByRole("dialog")).getByRole("heading", { name: "LOG VIDEO WIDE · Log Video Wide" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Đóng ×" }));
    expect(bnc).toHaveFocus();
    fireEvent.keyDown(bnc, { key: " " });
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
  });

  it("opens a rail without a waveform as an honest reference instead of fabricating readings", () => {
    render(<StrictMode><Dme320BlockDiagram /></StrictMode>);
    fireEvent.click(screen.getAllByRole("button", { name: "DC/DC 1, 1A2A5" })[0]);
    const point = DME_320_BLOCK_BY_ID.get("dcdc")!.testPoints.find((item) => item.id === "-15V_TP")!;
    const trigger = screen.getByRole("button", { name: `Xem tín hiệu ${point.id} ${point.label}` });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).toHaveAttribute("open");
    expect(within(dialog).getByRole("button", { name: "Đóng ×" })).toHaveFocus();
    expect(within(dialog).getByText(/Tham chiếu từ manual.*không phải số đo trực tiếp/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Chưa có ảnh waveform tham chiếu/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("img")).not.toBeInTheDocument();
    expect(dialog.querySelector("meter, input, select, textarea, canvas")).toBeNull();
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(document.querySelector("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });
});
