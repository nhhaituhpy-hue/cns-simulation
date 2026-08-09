"use client";

import { Broadcast } from "@phosphor-icons/react/dist/csr/Broadcast";
import { Minus } from "@phosphor-icons/react/dist/csr/Minus";
import { Square } from "@phosphor-icons/react/dist/csr/Square";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

export function Dvor1150TitleBar() {
  const config = useDvor1150PmdtStore((state) => state.config);
  const mode = config.station.transmitterConfig === "Dual Transmitters" ? "Dual" : "Single";
  return (
    <header className="pmdt-titlebar">
      <span aria-hidden className="pmdt-titlebar-icon"><Broadcast size={13} weight="bold" /></span>
      <h1 className="pmdt-titlebar-heading">
        {config.station.stationDescription} {config.station.frequencyMHz.toFixed(1)} MHz - Model 1150 {mode} DVOR - AMS (ASI) PMDT
      </h1>
      <div className="pmdt-window-buttons" aria-label="Điều khiển cửa sổ mô phỏng">
        <button type="button" className="pmdt-window-button" aria-label="Thu nhỏ" title="Chỉ mang tính mô phỏng"><Minus size={13} /></button>
        <button type="button" className="pmdt-window-button" aria-label="Phóng to" title="Chỉ mang tính mô phỏng"><Square size={13} /></button>
        <button type="button" className="pmdt-window-button pmdt-window-button--close" aria-label="Đóng" title="Chỉ mang tính mô phỏng"><X size={13} /></button>
      </div>
    </header>
  );
}
