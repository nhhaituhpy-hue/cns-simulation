"use client";

import { useEffect } from "react";
import { Dvor1150MenuBar } from "./pmdt-menu-bar";
import { Dvor1150LoginDialog } from "./pmdt-login-dialog";
import { Dvor1150ScreenRouter } from "./pmdt-screens";
import { Dvor1150Sidebar } from "./pmdt-sidebar";
import { Dvor1150StatusBar } from "./pmdt-status-bar";
import { Dvor1150TitleBar } from "./pmdt-title-bar";
import { Dvor1150SimulationParametersPanel } from "./pmdt-simulation-parameters";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import type { Dvor1150PmdtMode } from "@/lib/dvor1150";

export function Dvor1150PmdtLayout({ mode = "preview" }: { mode?: Dvor1150PmdtMode }) {
  const setMode = useDvor1150PmdtStore((state) => state.setMode);
  const loginOpen = useDvor1150PmdtStore((state) => state.loginDialogOpen);
  const apply = useDvor1150PmdtStore((state) => state.applyConfigChanges);
  const reset = useDvor1150PmdtStore((state) => state.resetConfigDraft);
  const next = useDvor1150PmdtStore((state) => state.nextView);
  const close = useDvor1150PmdtStore((state) => state.closeScreen);
  const refreshClock = useDvor1150PmdtStore((state) => state.refreshClock);
  const simulationParametersOpen = useDvor1150PmdtStore((state) => state.simulationParametersOpen);

  useEffect(() => { setMode(mode); }, [mode, setMode]);
  useEffect(() => {
    refreshClock();
    const timer = window.setInterval(refreshClock, 1000);
    return () => window.clearInterval(timer);
  }, [refreshClock]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "F5") { event.preventDefault(); next(); }
      if (event.key === "F6") { event.preventDefault(); close(); }
      if (event.key === "F7") { event.preventDefault(); apply(); }
      if (event.key === "F8") { event.preventDefault(); reset(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [apply, close, next, reset]);

  return <div className="pmdt-classic-viewport">
    <section className="pmdt-classic-window pmdt-classic-window--standard dvor1150-pmdt-window" aria-label="DVOR 1150 PMDT Simulator">
      <div className="pmdt-titlebar-row"><Dvor1150TitleBar /></div>
      <div className="pmdt-menubar-row"><Dvor1150MenuBar /></div>
      <Dvor1150Sidebar />
      <main className="pmdt-classic-main">{loginOpen ? <div className="pmdt-prelogin-workspace" aria-hidden /> : <Dvor1150ScreenRouter />}</main>
      <div className="pmdt-statusbar-row"><Dvor1150StatusBar /></div>
      {simulationParametersOpen ? <Dvor1150SimulationParametersPanel /> : null}
      {loginOpen ? <Dvor1150LoginDialog /> : null}
    </section>
  </div>;
}
