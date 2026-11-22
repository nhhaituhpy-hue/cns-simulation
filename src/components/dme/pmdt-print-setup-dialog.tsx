"use client";

import { useEffect } from "react";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

/**
 * System >> Print Setup... (Stage 4 G20). Stores the paper size and
 * orientation in the PMDT store; the layout turns them into an @page rule
 * so the existing Print / Configuration Print actions honour them as far
 * as the browser's print pipeline allows.
 */
export function PmdtPrintSetupDialog() {
  const printSetup = useDmePmdtStore((state) => state.printSetup);
  const setPrintSetup = useDmePmdtStore((state) => state.setPrintSetup);
  const setPrintSetupDialogOpen = useDmePmdtStore((state) => state.setPrintSetupDialogOpen);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPrintSetupDialogOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [setPrintSetupDialogOpen]);

  return (
    <div className="pmdt-about-overlay" role="presentation">
      <section className="pmdt-about-dialog" role="dialog" aria-modal="true" aria-labelledby="dme-pmdt-print-setup-title">
        <header className="pmdt-about-titlebar">
          <strong id="dme-pmdt-print-setup-title">Print Setup</strong>
          <button type="button" aria-label="Close Print Setup" onClick={() => setPrintSetupDialogOpen(false)}>×</button>
        </header>
        <div className="pmdt-about-body">
          <label>
            Paper size{" "}
            <select
              aria-label="Paper size"
              value={printSetup.paperSize}
              onChange={(event) => setPrintSetup({ ...printSetup, paperSize: event.target.value as "A4" | "Letter" })}
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
            </select>
          </label>
          <label>
            Orientation{" "}
            <select
              aria-label="Orientation"
              value={printSetup.orientation}
              onChange={(event) => setPrintSetup({ ...printSetup, orientation: event.target.value as "portrait" | "landscape" })}
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </label>
          <p>Áp dụng cho Print và Configuration Print qua cỡ giấy của trình duyệt.</p>
          <button type="button" className="pmdt-about-ok" autoFocus onClick={() => setPrintSetupDialogOpen(false)}>OK</button>
        </div>
      </section>
    </div>
  );
}
