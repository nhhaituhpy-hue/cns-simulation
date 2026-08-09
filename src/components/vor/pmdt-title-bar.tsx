"use client";

import { Minus } from "@phosphor-icons/react/dist/csr/Minus";
import { Broadcast } from "@phosphor-icons/react/dist/csr/Broadcast";
import { Square } from "@phosphor-icons/react/dist/csr/Square";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

const windowButtons = [
  { label: "Thu nhỏ cửa sổ mô phỏng", icon: Minus },
  { label: "Phóng to cửa sổ mô phỏng", icon: Square },
  { label: "Đóng cửa sổ mô phỏng", icon: X },
] as const;

export function PmdtTitleBar() {
  const stationDescription = useVorPmdtStore((state) => state.data.rmsConfigStation.stationDescription);
  const frequencyMHz = useVorPmdtStore((state) => state.config.station.frequencyMHz);
  const stationName = stationDescription.replace(/\s+\d+(?:\.\d+)?\s*MHz\s*$/i, "").trim() || stationDescription;
  const titleStation = `${stationName} ${frequencyMHz.toFixed(1)} MHz`;

  return (
    <header className="pmdt-titlebar">
      <span
        aria-hidden
        className="pmdt-titlebar-icon"
      >
        <Broadcast aria-hidden size={13} weight="bold" />
      </span>
      <h1 className="pmdt-titlebar-heading">
        {titleStation} - Dual DVOR - SELEX ES Inc. PMDT
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
