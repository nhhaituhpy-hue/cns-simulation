"use client";

import { Minus } from "@phosphor-icons/react/dist/csr/Minus";
import { Square } from "@phosphor-icons/react/dist/csr/Square";
import { Wrench } from "@phosphor-icons/react/dist/csr/Wrench";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

const windowButtons = [
  { label: "Thu nhỏ cửa sổ mô phỏng", icon: Minus },
  { label: "Phóng to cửa sổ mô phỏng", icon: Square },
  { label: "Đóng cửa sổ mô phỏng", icon: X },
] as const;

export function PmdtTitleBar() {
  const station = useDmePmdtStore((state) => state.data.rmsConfigStation);
  const equipmentLabel = station.transmitterConfig === "Dual Transmitters" ? "Dual DME" : "Single DME";
  const stationLabel = station.stationDescription.trim() || "TST";

  return (
    <header className="pmdt-titlebar">
      <span aria-hidden className="pmdt-titlebar-icon">
        <Wrench aria-hidden size={14} weight="bold" />
      </span>
      <h1 className="pmdt-titlebar-heading">
        {stationLabel} - {equipmentLabel} - SELEX ES Inc. PMDT
      </h1>
      <div className="pmdt-window-buttons" aria-label="Điều khiển cửa sổ mô phỏng">
        {windowButtons.map(({ label, icon: WindowIcon }, index) => (
          <button
            key={label}
            type="button"
            title="Chỉ mang tính mô phỏng"
            aria-label={label}
            className={`pmdt-window-button ${index === windowButtons.length - 1 ? "pmdt-window-button--close" : ""}`}
          >
            <WindowIcon aria-hidden size={13} weight="bold" />
          </button>
        ))}
      </div>
    </header>
  );
}
