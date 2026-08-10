"use client";

import { useEffect, useRef, useState } from "react";
import {
  applySimulatorConfig,
  initializeSimulatorConfig,
  loadSimulatorConfig,
} from "@/lib/simulator-config/client";
import { collectChangedConfigFields } from "@/lib/simulator-config/diff";
import {
  extractDme1119aConfig,
  dme1119aConfigAdapter,
} from "@/lib/simulator-config/dme-1119a";
import {
  dvor1150aConfigAdapter,
  extractDvor1150aConfig,
} from "@/lib/simulator-config/dvor-1150a";
import {
  dvor1150ConfigAdapter,
  extractDvor1150Config,
} from "@/lib/simulator-config/dvor-1150";
import {
  dvor220ConfigAdapter,
  extractDvor220Config,
} from "@/lib/simulator-config/dvor-220";
import {
  dme320ConfigAdapter,
  extractDme320Config,
} from "@/lib/simulator-config/dme-320";
import type { SupportedSimulatorConfigId } from "@/lib/simulator-config/types";
import type { Dme320StoreApi } from "@/modules/operations/dme-320/store/dme320-store";
import type { Dvor220StoreApi } from "@/modules/operations/dvor-220/store/dvor220-store";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

type SyncStatus = "" | "loading" | "saved" | "error";

function createSessionId(): string | null {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : null;
}

function areJsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function Dvor1150aConfigPersistence() {
  const replaceConfig = useVorPmdtStore((state) => state.replaceConfig);
  const revisionRef = useRef(0);
  const readyRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const persistChainRef = useRef(Promise.resolve());
  const [status, setStatus] = useState<SyncStatus>("");

  useEffect(() => {
    sessionIdRef.current = createSessionId();
    readyRef.current = false;
    let cancelled = false;

    async function hydrate() {
      setStatus("loading");
      try {
        let response = await loadSimulatorConfig("dvor-1150a");
        if (!response.persisted) response = await initializeSimulatorConfig("dvor-1150a");
        const config = dvor1150aConfigAdapter.parseConfig(response.appliedConfig);
        if (!config) throw new Error("Cấu hình DVOR 1150A từ server không hợp lệ.");
        if (cancelled) return;
        replaceConfig(config);
        revisionRef.current = response.revision;
        readyRef.current = true;
        setStatus("saved");
      } catch (error) {
        if (cancelled) return;
        console.error("DVOR 1150A configuration hydration failed:", error);
        setStatus("error");
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
      readyRef.current = false;
    };
  }, [replaceConfig]);

  useEffect(() => {
    return useVorPmdtStore.subscribe((state, previousState) => {
      if (
        !readyRef.current ||
        !previousState.configDirty ||
        state.configDirty ||
        JSON.stringify(state.config) === JSON.stringify(previousState.config)
      ) {
        return;
      }

      const nextConfig = extractDvor1150aConfig(state.config);
      const previousConfig = extractDvor1150aConfig(previousState.config);
      persistChainRef.current = persistChainRef.current
        .then(async () => {
          const response = await applySimulatorConfig({
            simulatorId: "dvor-1150a",
            config: nextConfig,
            expectedRevision: revisionRef.current,
            changedFields: collectChangedConfigFields(previousConfig, nextConfig),
            operatorUserId: state.authenticatedUserId,
            sessionId: sessionIdRef.current,
          });
          revisionRef.current = response.revision;
          setStatus("saved");
        })
        .catch((error) => {
          console.error("DVOR 1150A configuration persistence failed:", error);
          setStatus("error");
        });
    });
  }, []);

  return <span className="sr-only" role="status" aria-live="polite">{status}</span>;
}

function Dme1119aConfigPersistence() {
  const replaceConfig = useDmePmdtStore((state) => state.replaceConfig);
  const revisionRef = useRef(0);
  const readyRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const persistChainRef = useRef(Promise.resolve());
  const [status, setStatus] = useState<SyncStatus>("");

  useEffect(() => {
    sessionIdRef.current = createSessionId();
    readyRef.current = false;
    let cancelled = false;

    async function hydrate() {
      setStatus("loading");
      try {
        let response = await loadSimulatorConfig("dme-1119a");
        if (!response.persisted) response = await initializeSimulatorConfig("dme-1119a");
        const config = dme1119aConfigAdapter.parseConfig(response.appliedConfig);
        if (!config) throw new Error("Cấu hình DME 1119A từ server không hợp lệ.");
        if (cancelled) return;
        replaceConfig(config);
        revisionRef.current = response.revision;
        readyRef.current = true;
        setStatus("saved");
      } catch (error) {
        if (cancelled) return;
        console.error("DME 1119A configuration hydration failed:", error);
        setStatus("error");
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
      readyRef.current = false;
    };
  }, [replaceConfig]);

  useEffect(() => {
    return useDmePmdtStore.subscribe((state, previousState) => {
      if (
        !readyRef.current ||
        !previousState.configDirty ||
        state.configDirty ||
        JSON.stringify(state.data) === JSON.stringify(previousState.data)
      ) {
        return;
      }

      const nextConfig = extractDme1119aConfig(state.data);
      const previousConfig = extractDme1119aConfig(previousState.data);
      persistChainRef.current = persistChainRef.current
        .then(async () => {
          const response = await applySimulatorConfig({
            simulatorId: "dme-1119a",
            config: nextConfig,
            expectedRevision: revisionRef.current,
            changedFields: collectChangedConfigFields(previousConfig, nextConfig),
            operatorUserId: state.authenticatedUserId,
            sessionId: sessionIdRef.current,
          });
          revisionRef.current = response.revision;
          setStatus("saved");
        })
        .catch((error) => {
          console.error("DME 1119A configuration persistence failed:", error);
          setStatus("error");
        });
    });
  }, []);

  return <span className="sr-only" role="status" aria-live="polite">{status}</span>;
}

function Dvor1150ConfigPersistence() {
  const replaceConfig = useDvor1150PmdtStore((state) => state.replaceConfig);
  const revisionRef = useRef(0);
  const readyRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const persistChainRef = useRef(Promise.resolve());
  const [status, setStatus] = useState<SyncStatus>("");

  useEffect(() => {
    sessionIdRef.current = createSessionId();
    readyRef.current = false;
    let cancelled = false;

    async function hydrate() {
      setStatus("loading");
      try {
        let response = await loadSimulatorConfig("dvor-1150");
        if (!response.persisted) response = await initializeSimulatorConfig("dvor-1150");
        const config = dvor1150ConfigAdapter.parseConfig(response.appliedConfig);
        const backupConfig = dvor1150ConfigAdapter.parseConfig(
          response.backupConfig ?? response.appliedConfig,
        );
        if (!config || !backupConfig) throw new Error("Cấu hình DVOR 1150 từ server không hợp lệ.");
        if (cancelled) return;
        replaceConfig(config, backupConfig);
        revisionRef.current = response.revision;
        readyRef.current = true;
        setStatus("saved");
      } catch (error) {
        if (cancelled) return;
        console.error("DVOR 1150 configuration hydration failed:", error);
        setStatus("error");
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
      readyRef.current = false;
    };
  }, [replaceConfig]);

  useEffect(() => {
    return useDvor1150PmdtStore.subscribe((state, previousState) => {
      if (!readyRef.current) return;

      const currentConfig = extractDvor1150Config(state.config);
      const previousConfig = extractDvor1150Config(previousState.config);
      const configChanged = !areJsonEqual(currentConfig, previousConfig);
      const backupChanged = !areJsonEqual(
        state.configurationBackup,
        previousState.configurationBackup,
      );
      let action: "apply" | "restore" | "backup" | null = null;
      if (state.lastCommand === "Apply (F7)" && previousState.configDirty && !state.configDirty && configChanged) {
        action = "apply";
      } else if (state.lastCommand === "RMS Config Restore" && configChanged) {
        action = "restore";
      } else if (state.lastCommand === "RMS Config Backup" && backupChanged) {
        action = "backup";
      }
      if (!action) return;

      const backupConfig = state.configurationBackup
        ? extractDvor1150Config(state.configurationBackup)
        : undefined;
      persistChainRef.current = persistChainRef.current
        .then(async () => {
          const response = await applySimulatorConfig({
            simulatorId: "dvor-1150",
            action,
            config: currentConfig,
            backupConfig: action === "backup" || action === "restore" ? backupConfig : undefined,
            expectedRevision: revisionRef.current,
            changedFields: collectChangedConfigFields(previousConfig, currentConfig),
            operatorUserId: state.authenticatedUserId,
            sessionId: sessionIdRef.current,
          });
          revisionRef.current = response.revision;
          setStatus("saved");
        })
        .catch((error) => {
          console.error("DVOR 1150 configuration persistence failed:", error);
          setStatus("error");
        });
    });
  }, []);

  return <span className="sr-only" role="status" aria-live="polite">{status}</span>;
}

function Dvor220ConfigPersistence({ store }: { store: Dvor220StoreApi }) {
  const revisionRef = useRef(0);
  const readyRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const persistChainRef = useRef(Promise.resolve());
  const [status, setStatus] = useState<SyncStatus>("");

  useEffect(() => {
    sessionIdRef.current = createSessionId();
    readyRef.current = false;
    let cancelled = false;

    async function hydrate() {
      setStatus("loading");
      try {
        let response = await loadSimulatorConfig("dvor-220");
        if (!response.persisted) response = await initializeSimulatorConfig("dvor-220");
        const running = dvor220ConfigAdapter.parseConfig(response.appliedConfig);
        const flash = dvor220ConfigAdapter.parseConfig(response.backupConfig ?? response.appliedConfig);
        if (!running || !flash) throw new Error("Cấu hình DVOR 220 từ server không hợp lệ.");
        if (cancelled) return;
        store.getState().replaceConfigurationLayers(running, flash);
        revisionRef.current = response.revision;
        readyRef.current = true;
        setStatus("saved");
      } catch (error) {
        if (cancelled) return;
        console.error("DVOR 220 configuration hydration failed:", error);
        setStatus("error");
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
      readyRef.current = false;
    };
  }, [store]);

  useEffect(() => {
    return store.subscribe((state, previousState) => {
      if (!readyRef.current) return;
      const current = state.device.configuration;
      const previous = previousState.device.configuration;
      const runningChanged = !areJsonEqual(current.running, previous.running);
      const flashChanged = !areJsonEqual(current.flash, previous.flash);
      if (!runningChanged && !flashChanged) return;

      let action: "apply" | "restore" | "flash-save" | null = null;
      if (previous.draftDirty && !current.draftDirty && runningChanged) {
        action = "apply";
      } else if (previous.flashDirty && !current.flashDirty && flashChanged) {
        action = "flash-save";
      } else if (!current.draftDirty && !current.flashDirty && runningChanged && areJsonEqual(current.running, current.flash)) {
        action = "restore";
      } else if (!current.draftDirty && runningChanged) {
        action = "apply";
      }
      if (!action) return;

      const running = extractDvor220Config(current.running);
      const previousRunning = extractDvor220Config(previous.running);
      const flash = action === "flash-save" || action === "restore"
        ? extractDvor220Config(current.flash)
        : undefined;
      persistChainRef.current = persistChainRef.current
        .then(async () => {
          const response = await applySimulatorConfig({
            simulatorId: "dvor-220",
            action,
            config: running,
            backupConfig: flash,
            expectedRevision: revisionRef.current,
            changedFields: collectChangedConfigFields(previousRunning, running),
            operatorUserId: state.device.session.username,
            sessionId: sessionIdRef.current,
          });
          revisionRef.current = response.revision;
          setStatus("saved");
        })
        .catch((error) => {
          console.error("DVOR 220 configuration persistence failed:", error);
          setStatus("error");
        });
    });
  }, [store]);

  return <span className="sr-only" role="status" aria-live="polite">{status}</span>;
}

function Dme320ConfigPersistence({ store }: { store: Dme320StoreApi }) {
  const revisionRef = useRef(0);
  const readyRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const persistChainRef = useRef(Promise.resolve());
  const [status, setStatus] = useState<SyncStatus>("");

  useEffect(() => {
    sessionIdRef.current = createSessionId();
    readyRef.current = false;
    let cancelled = false;

    async function hydrate() {
      setStatus("loading");
      try {
        let response = await loadSimulatorConfig("dme-320");
        if (!response.persisted) response = await initializeSimulatorConfig("dme-320");
        const running = dme320ConfigAdapter.parseConfig(response.appliedConfig);
        const flash = dme320ConfigAdapter.parseConfig(response.backupConfig ?? response.appliedConfig);
        if (!running || !flash) throw new Error("Cấu hình DME 320 từ server không hợp lệ.");
        if (cancelled) return;
        store.getState().replaceConfigurationProfiles(running, flash);
        revisionRef.current = response.revision;
        readyRef.current = true;
        setStatus("saved");
      } catch (error) {
        if (cancelled) return;
        console.error("DME 320 configuration hydration failed:", error);
        setStatus("error");
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
      readyRef.current = false;
    };
  }, [store]);

  useEffect(() => {
    return store.subscribe((state, previousState) => {
      if (!readyRef.current) return;
      const current = state.simulation.config;
      const previous = previousState.simulation.config;
      const runningChanged = !areJsonEqual(current.running, previous.running);
      const flashChanged = !areJsonEqual(current.flash, previous.flash);
      if (!runningChanged && !flashChanged) return;

      let action: "apply" | "restore" | "flash-save" | null = null;
      if (previous.draftDirty && !current.draftDirty && runningChanged) {
        action = "apply";
      } else if (previous.flashDirty && !current.flashDirty && flashChanged) {
        action = "flash-save";
      } else if (!current.draftDirty && !current.flashDirty && runningChanged && areJsonEqual(current.running, current.flash)) {
        action = "restore";
      } else if (!current.draftDirty && runningChanged) {
        action = "apply";
      }
      if (!action) return;

      const running = extractDme320Config(current.running);
      const previousRunning = extractDme320Config(previous.running);
      const flash = action === "flash-save" || action === "restore"
        ? extractDme320Config(current.flash)
        : undefined;
      persistChainRef.current = persistChainRef.current
        .then(async () => {
          const response = await applySimulatorConfig({
            simulatorId: "dme-320",
            action,
            config: running,
            backupConfig: flash,
            expectedRevision: revisionRef.current,
            changedFields: collectChangedConfigFields(previousRunning, running),
            operatorUserId: state.simulation.session.userId,
            sessionId: sessionIdRef.current,
          });
          revisionRef.current = response.revision;
          setStatus("saved");
        })
        .catch((error) => {
          console.error("DME 320 configuration persistence failed:", error);
          setStatus("error");
        });
    });
  }, [store]);

  return <span className="sr-only" role="status" aria-live="polite">{status}</span>;
}

export function SimulatorConfigPersistence({
  simulatorId,
}: {
  simulatorId: SupportedSimulatorConfigId;
}) {
  if (simulatorId === "dvor-1150a") return <Dvor1150aConfigPersistence />;
  if (simulatorId === "dme-1119a") return <Dme1119aConfigPersistence />;
  return null;
}

export function Dvor1150ConfigPersistenceBoundary() {
  return <Dvor1150ConfigPersistence />;
}

export function Dvor220ConfigPersistenceBoundary({ store }: { store: Dvor220StoreApi }) {
  return <Dvor220ConfigPersistence store={store} />;
}

export function Dme320ConfigPersistenceBoundary({ store }: { store: Dme320StoreApi }) {
  return <Dme320ConfigPersistence store={store} />;
}
