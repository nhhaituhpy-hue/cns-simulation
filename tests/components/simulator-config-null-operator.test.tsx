import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SimulatorConfigPersistence, Dvor1150ConfigPersistenceBoundary, Dvor220ConfigPersistenceBoundary, Dme320ConfigPersistenceBoundary } from "@/components/simulator/simulator-config-persistence";
import { PUT } from "@/app/api/simulator-config/[simulatorId]/route";
import { getSimulatorConfigAdapter } from "@/lib/simulator-config/registry";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import { createDvor220Store } from "@/modules/operations/dvor-220/store/dvor220-store";
import { createDme320Store } from "@/modules/operations/dme-320/store/dme320-store";
import { DEFAULT_DME320_ACCOUNTS } from "@/modules/operations/dme-320/domain/defaults";
import type { SupportedSimulatorConfigId } from "@/lib/simulator-config/types";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: async () => ({ id: "owner" }) }));
vi.mock("@/lib/db", () => ({
  queryDatabase: mocks.query,
  withDatabaseTransaction: async (work: (client: { query: typeof mocks.query }) => unknown) => work({ query: mocks.query }),
}));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it.each(["dvor-1150a", "dme-1119a", "dvor-1150", "dvor-220", "dme-320"] as const)(
  "%s omits null operator metadata and passes real PUT validation", async (simulatorId: SupportedSimulatorConfigId) => {
    const adapter = getSimulatorConfigAdapter(simulatorId)!;
    const config = adapter.getDefaultConfig();
    const record = { schema_version: 1, initial_config: config, applied_config: config, backup_config: config, revision: 1 };
    mocks.query.mockImplementation(async (sql: string, values: unknown[]) => ({ rows: [
      sql.includes("save_user_simulator_config") ? { ...record, applied_config: values[3], revision: 2 } : record,
    ] }));
    const bodies: Record<string, unknown>[] = [];
    const statuses: number[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
      if (options.method === "GET") return Response.json({ simulatorId, schemaVersion: 1, initialConfig: config,
        appliedConfig: config, backupConfig: config, preferences: {}, revision: 1, persisted: true, history: [] });
      bodies.push(JSON.parse(options.body as string));
      const response = await PUT(new Request(`http://localhost${url}`, options), { params: Promise.resolve({ simulatorId }) });
      statuses.push(response.status);
      return response;
    }));

    useVorPmdtStore.getState().reset();
    useDmePmdtStore.getState().reset();
    useDvor1150PmdtStore.getState().reset();
    const dvor = createDvor220Store();
    const dme = createDme320Store();
    const surface = simulatorId === "dvor-1150" ? <Dvor1150ConfigPersistenceBoundary />
      : simulatorId === "dvor-220" ? <Dvor220ConfigPersistenceBoundary store={dvor} />
      : simulatorId === "dme-320" ? <Dme320ConfigPersistenceBoundary store={dme} />
      : <SimulatorConfigPersistence simulatorId={simulatorId} />;
    render(surface);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("saved"));

    await act(async () => {
      if (simulatorId === "dvor-1150a") {
        expect(useVorPmdtStore.getState().applyConfigChanges()).toBe(false);
        expect(useVorPmdtStore.getState().restoreDefaultConfig()).toBe(false);
        expect(useVorPmdtStore.getState().backupConfig()).toBe(false);
        useVorPmdtStore.getState().logout();
        useVorPmdtStore.getState().reset();
      } else if (simulatorId === "dme-1119a") {
        expect(useDmePmdtStore.getState().applyConfigChanges()).toBe(false);
        expect(useDmePmdtStore.getState().restoreConfig()).toBe(false);
        expect(useDmePmdtStore.getState().backupConfig()).toBe(false);
        useDmePmdtStore.getState().logout();
        useDmePmdtStore.getState().reset();
      } else if (simulatorId === "dvor-1150") {
        expect(useDvor1150PmdtStore.getState().applyConfigChanges()).toBe(false);
        expect(useDvor1150PmdtStore.getState().resetConfigDraft()).toBe(false);
        expect(useDvor1150PmdtStore.getState().restoreConfig()).toBe(false);
        expect(useDvor1150PmdtStore.getState().backupConfig()).toBe(false);
        useDvor1150PmdtStore.getState().logout();
        useDvor1150PmdtStore.getState().reset();
      } else if (simulatorId === "dvor-220") {
        expect(dvor.getState().dispatch({ type: "apply-draft" }).ok).toBe(false);
        expect(dvor.getState().dispatch({ type: "reset" }).ok).toBe(false);
        dvor.getState().dispatch({ type: "logout" });
      }
    });
    expect(bodies).toEqual([]);

    if (simulatorId === "dme-320") {
      const account = DEFAULT_DME320_ACCOUNTS.find((item) => item.level === 2)!;
      await act(async () => {
        expect(dme.getState().dispatch({ type: "login", userId: account.userId, password: account.password, origin: "local" }).accepted).toBe(true);
        const draft = structuredClone(dme.getState().simulation.config.running);
        draft.station.stationName = "Unsaved running station";
        expect(dme.getState().dispatch({ type: "set-draft-config", config: draft }).accepted).toBe(true);
        expect(dme.getState().dispatch({ type: "apply-draft" }).accepted).toBe(true);
      });
      await waitFor(() => expect(statuses).toEqual([200]));
      bodies.length = 0;
      statuses.length = 0;
      await act(async () => { expect(dme.getState().dispatch({ type: "reboot" }).accepted).toBe(true); });
      expect(dme.getState().simulation.session.userId).toBeNull();
    } else if (simulatorId === "dvor-220") {
      await act(async () => {
        const device = structuredClone(dvor.getState().device);
        device.configuration.running.station.stationName = "Null operator";
        dvor.setState({ device });
      });
    } else if (simulatorId === "dvor-1150a") {
      await act(async () => {
        useVorPmdtStore.setState({ configDirty: true });
        const next = structuredClone(useVorPmdtStore.getState().config);
        next.station.stationDescription = "Focused null-operator transition";
        useVorPmdtStore.setState({ config: next, configDirty: false, lastCommand: "Configuration Apply" });
      });
    } else if (simulatorId === "dme-1119a") {
      await act(async () => {
        useDmePmdtStore.setState({ configDirty: true });
        const next = structuredClone(useDmePmdtStore.getState().data);
        next.rmsConfigStation.stationDescription = "Focused null-operator transition";
        useDmePmdtStore.setState({ data: next, configDirty: false, lastCommand: "Configuration Apply" });
      });
    } else {
      await act(async () => {
        const next = structuredClone(useDvor1150PmdtStore.getState().config);
        next.station.stationDescription = "Focused null-operator transition";
        useDvor1150PmdtStore.setState({ config: next, configurationCommit: { action: "apply" } });
      });
    }
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).not.toHaveProperty("operatorUserId");
    await waitFor(() => expect(statuses).toEqual([200]));
    expect(mocks.query.mock.calls.filter(([sql]) => sql.includes("save_user_simulator_config")).at(-1)![1][7]).toBeNull();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("saved"));
  },
);

it("persists DVOR 1150 Apply, accepts Backup only on success, and restores the acknowledged backup", async () => {
  const store = useDvor1150PmdtStore;
  store.getState().reset();
  const base = getSimulatorConfigAdapter("dvor-1150")!.getDefaultConfig();
  let applied = base;
  let backup = base;
  let revision = 5;
  let failBackup = true;
  const puts: { action: string; expectedRevision: number }[] = [];
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
    if (options.method === "PUT") {
      const payload = JSON.parse(options.body as string);
      puts.push(payload);
      if (payload.action === "backup" && failBackup) return Response.json({ error: "Save failed" }, { status: 500 });
      applied = payload.config;
      backup = payload.backupConfig ?? backup;
      revision++;
    }
    return Response.json({ simulatorId: "dvor-1150", persisted: true, appliedConfig: applied, backupConfig: backup, revision, history: [] });
  }));

  try {
    const surface = render(<Dvor1150ConfigPersistenceBoundary />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("saved"));
    const state = store.getState();
    act(() => {
      state.login("SEC3", "THREE");
      state.setLocalMode(true);
      state.setConfigValue("monitor.monitorStartupDelay", 0);
      state.setConfigValue("monitor.monitorShutdownDelay", 0);
      state.setConfigValue("transmitters.tx1.nominal.outputPower", 60);
      expect(state.applyConfigChanges()).toBe(true);
      expect(store.getState().lastCommand).toMatch(/^Automatic monitor/);
      state.setConfigValue("station.stationDescription", "Unapplied");
      expect(state.resetConfigDraft()).toBe(true);
      expect(state.backupConfig()).toBe(true);
      expect(state.restoreConfig()).toBe(false);
    });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("could not be saved"));
    expect(puts.map(({ action }) => action)).toEqual(["apply", "backup"]);
    expect(store.getState().needBackup).toBe(true);
    expect(store.getState().configurationBackup?.transmitters.tx1.nominal.outputPower).toBe(100);

    failBackup = false;
    act(() => { expect(state.backupConfig()).toBe(true); });
    await waitFor(() => expect(store.getState().needBackup).toBe(false));
    act(() => {
      state.setMonitorBypass("mon1", true);
      state.setConfigValue("transmitters.tx1.nominal.outputPower", 105);
      expect(state.applyConfigChanges()).toBe(true);
      expect(state.restoreConfig()).toBe(true);
    });
    await waitFor(() => expect(puts.map(({ expectedRevision }) => expectedRevision)).toEqual([5, 6, 6, 7, 8]));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("saved"));
    expect(store.getState().config.transmitters.tx1.nominal.outputPower).toBe(60);
    expect(store.getState().config.simulation).toMatchObject({ connected: true, local: true, integralMonitorBypass: true });
    expect(store.getState().connectionType).toBe("direct");

    surface.unmount();
    store.getState().reset();
    render(<Dvor1150ConfigPersistenceBoundary />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("saved"));
    expect(store.getState().config.transmitters.tx1.nominal.outputPower).toBe(60);
    expect(store.getState().config.simulation).toMatchObject({ connected: false, local: false, integralMonitorBypass: false });
    expect(store.getState().needBackup).toBe(false);
  } finally {
    errorLog.mockRestore();
  }
});
