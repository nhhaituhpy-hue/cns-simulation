"use client";

import { useEffect } from "react";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

export function AboutPmdtDialog() {
  const setAboutDialogOpen = useDmePmdtStore((state) => state.setAboutDialogOpen);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setAboutDialogOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [setAboutDialogOpen]);

  return (
    <div className="pmdt-about-overlay" role="presentation">
      <section className="pmdt-about-dialog" role="dialog" aria-modal="true" aria-labelledby="dme-pmdt-about-title">
        <header className="pmdt-about-titlebar">
          <strong id="dme-pmdt-about-title">About</strong>
          <button type="button" aria-label="Close About" onClick={() => setAboutDialogOpen(false)}>×</button>
        </header>
        <div className="pmdt-about-body">
          <div>Portable Maintenance Data Terminal</div>
          <div>978178-0080</div>
          <div>Version 8.7.2.0</div>
          <div>(Library Version 79)</div>
          <p>Build: 05/22/14 01:23 PM</p>
          <div className="pmdt-about-copyright">Copyright © 1998 - 2014<br />SELEX ES, Inc.</div>
          <p>IP Addresses:<br />192.168.0.49</p>
          <button type="button" className="pmdt-about-ok" autoFocus onClick={() => setAboutDialogOpen(false)}>OK</button>
        </div>
      </section>
    </div>
  );
}
