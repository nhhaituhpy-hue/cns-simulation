"use client";

import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

export function Dvor1150StatusBar() {
  const capsLock = useDvor1150PmdtStore((state) => state.capsLock);
  const securityLevel = useDvor1150PmdtStore((state) => state.securityLevel);
  const userId = useDvor1150PmdtStore((state) => state.authenticatedUserId);
  const timestamp = useDvor1150PmdtStore((state) => state.derived.data.timestamp);
  return (
    <footer className="pmdt-statusbar">
      <span className="pmdt-statusbar-path pmdt-status-ok">Ready</span>
      <span className="pmdt-statusbar-segment" data-active={capsLock} title={capsLock ? "Caps Lock on" : "Caps Lock off"}>CAP</span>
      <span className="pmdt-statusbar-segment" aria-hidden />
      <span className="pmdt-statusbar-segment">{securityLevel ? `Level ${securityLevel}` : ""}</span>
      <span className="pmdt-statusbar-segment">{userId ?? ""}</span>
      <time className="pmdt-statusbar-segment font-mono tabular-nums">{timestamp}</time>
    </footer>
  );
}
