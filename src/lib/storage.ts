import {
  SENSOR_STATUSES,
  type QcmsEvent,
  type RecordedAction,
  type Scenario,
  type SensorDataProfile,
  type SensorMonitoringData,
  type SensorState,
  type SiteState,
} from "./types";

export const SCENARIO_STORAGE_KEY = "adsb-training-simulator:scenarios";
export const SCENARIO_STORAGE_VERSION = 1 as const;

export interface ScenarioStorageEnvelope {
  version: typeof SCENARIO_STORAGE_VERSION;
  scenarios: Scenario[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type ScenarioStorageErrorCode =
  | "invalid-json"
  | "unsupported-version"
  | "invalid-schema";

export class ScenarioStorageError extends Error {
  constructor(
    readonly code: ScenarioStorageErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ScenarioStorageError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isDateString(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isMonitoringData(value: unknown): value is SensorMonitoringData {
  if (!isRecord(value) || !isRecord(value.voltages)) {
    return false;
  }

  return (
    isDateString(value.lastSnmpResponseAt) &&
    isFiniteNumber(value.temperatureC) &&
    isFiniteNumber(value.cpuLoadPercent) &&
    isFiniteNumber(value.voltages.v3_3) &&
    isFiniteNumber(value.voltages.v5) &&
    isFiniteNumber(value.voltages.v12) &&
    isFiniteNumber(value.receiverConfidencePercent) &&
    isFiniteNumber(value.crcErrorCount) &&
    ["synchronized", "unsynchronized", "unavailable"].includes(
      String(value.gpsStatus),
    )
  );
}

function isSensorDataProfile(value: unknown): value is SensorDataProfile {
  if (
    !isRecord(value) ||
    !isRecord(value.network) ||
    !isRecord(value.receiverStats) ||
    !isRecord(value.receiverStats.shortSquitter) ||
    !isRecord(value.receiverStats.extendedSquitter) ||
    !isRecord(value.gps) ||
    !isRecord(value.filters) ||
    !isRecord(value.asterix) ||
    !isRecord(value.general) ||
    !isRecord(value.syslog) ||
    !Array.isArray(value.clients) ||
    !Array.isArray(value.snmpUsers) ||
    !Array.isArray(value.snmpTraps) ||
    !Array.isArray(value.siteMonitors)
  ) {
    return false;
  }

  const squitterStatsValid = [
    value.receiverStats.shortSquitter,
    value.receiverStats.extendedSquitter,
  ].every(
    (stats) =>
      isFiniteNumber(stats.total) &&
      isFiniteNumber(stats.passed) &&
      isFiniteNumber(stats.failed),
  );

  const clientsValid = value.clients.every(
    (client) =>
      isRecord(client) &&
      isFiniteNumber(client.id) &&
      isNonEmptyString(client.name) &&
      isNonEmptyString(client.ip) &&
      isFiniteNumber(client.port) &&
      ["UDP", "TCP"].includes(String(client.protocol)) &&
      isNonEmptyString(client.messageType) &&
      typeof client.enabled === "boolean" &&
      isFiniteNumber(client.messagesSent),
  );

  const snmpUsersValid = value.snmpUsers.every(
    (user) =>
      isRecord(user) &&
      isNonEmptyString(user.name) &&
      ["noAuth", "authNoPriv", "authPriv"].includes(String(user.authType)),
  );

  const snmpTrapsValid = value.snmpTraps.every(
    (trap) =>
      isRecord(trap) &&
      isNonEmptyString(trap.ip) &&
      isFiniteNumber(trap.port) &&
      typeof trap.enabled === "boolean",
  );

  const siteMonitorsValid = value.siteMonitors.every(
    (monitor) =>
      isRecord(monitor) &&
      typeof monitor.enabled === "boolean" &&
      isNonEmptyString(monitor.ip) &&
      isFiniteNumber(monitor.port) &&
      isNonEmptyString(monitor.name),
  );

  return (
    isNonEmptyString(value.sensorVersion) &&
    isNonEmptyString(value.configVersion) &&
    isNonEmptyString(value.sensorName) &&
    isNonEmptyString(value.network.ip) &&
    isNonEmptyString(value.network.subnet) &&
    isNonEmptyString(value.network.gateway) &&
    typeof value.network.dhcp === "boolean" &&
    isNonEmptyString(value.network.macAddress) &&
    isNonEmptyString(value.network.ntpServer) &&
    isNonEmptyString(value.network.bitRate) &&
    squitterStatsValid &&
    isFiniteNumber(value.receiverStats.totalTargetsDetected) &&
    isFiniteNumber(value.receiverStats.currentTargets) &&
    clientsValid &&
    snmpUsersValid &&
    snmpTrapsValid &&
    isFiniteNumber(value.snmpHeartbeatPeriod) &&
    isFiniteNumber(value.snmpAlarmPeriod) &&
    typeof value.gps.enabled === "boolean" &&
    typeof value.gps.ntpEnabled === "boolean" &&
    isNonEmptyString(value.gps.ntpServer) &&
    isString(value.gps.latitude) &&
    isString(value.gps.longitude) &&
    isString(value.gps.altitude) &&
    isString(value.gps.deviation) &&
    typeof value.filters.altitudeEnabled === "boolean" &&
    isFiniteNumber(value.filters.altitudeMin) &&
    isFiniteNumber(value.filters.altitudeMax) &&
    typeof value.filters.addressFilterEnabled === "boolean" &&
    isString(value.filters.addressFilter) &&
    typeof value.filters.positionFilterEnabled === "boolean" &&
    isFiniteNumber(value.filters.positionFilterRadius) &&
    isFiniteNumber(value.asterix.sac) &&
    isFiniteNumber(value.asterix.sic) &&
    isNonEmptyString(value.asterix.cat21Version) &&
    typeof value.asterix.cat21Enabled === "boolean" &&
    typeof value.asterix.nonOpEnabled === "boolean" &&
    typeof value.asterix.mlatEnabled === "boolean" &&
    typeof value.asterix.rawEnabled === "boolean" &&
    isFiniteNumber(value.asterix.dataBlockSize) &&
    isFiniteNumber(value.asterix.ttl) &&
    typeof value.general.crcCorrection === "boolean" &&
    typeof value.general.groundTargets === "boolean" &&
    isFiniteNumber(value.general.targetOverloadLimit) &&
    isNonEmptyString(value.syslog.localDestination) &&
    typeof value.syslog.remoteEnabled === "boolean" &&
    isString(value.syslog.remoteServerIp) &&
    siteMonitorsValid
  );
}

function isSensorState(value: unknown, expectedLabel: "A" | "B"): value is SensorState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.id) &&
    value.sensorLabel === expectedLabel &&
    SENSOR_STATUSES.includes(value.status as (typeof SENSOR_STATUSES)[number]) &&
    isNonEmptyString(value.ipAddress) &&
    isNonEmptyString(value.name) &&
    (value.monitoring === undefined || isMonitoringData(value.monitoring)) &&
    (value.dataProfile === undefined ||
      isSensorDataProfile(value.dataProfile))
  );
}

function isSiteState(value: unknown): value is SiteState {
  if (!isRecord(value)) {
    return false;
  }

  const sensorA = value.sensorA;
  const sensorB = value.sensorB;

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    (sensorA === null || isSensorState(sensorA, "A")) &&
    (sensorB === null || isSensorState(sensorB, "B")) &&
    (sensorA !== null || sensorB !== null)
  );
}

function isRecordedAction(value: unknown): value is RecordedAction {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Number.isInteger(value.step) &&
    Number(value.step) > 0 &&
    ["menu-selection", "value-input", "authentication"].includes(
      String(value.kind),
    ) &&
    isNonEmptyString(value.menuId) &&
    isNonEmptyString(value.menuTitle) &&
    typeof value.input === "string" &&
    isNonEmptyString(value.resultLabel) &&
    isFiniteNumber(value.timestamp)
  );
}

function isQcmsEvent(value: unknown): value is QcmsEvent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.timestamp) &&
    ["snmp", "qcms", "selfmon", "error", "line"].includes(
      String(value.type),
    ) &&
    isNonEmptyString(value.message)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isHardwareFault(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !Array.isArray(value.hardwareLayout) ||
    !Array.isArray(value.signalPaths)
  ) {
    return false;
  }

  const componentsValid = value.hardwareLayout.every(
    (component) =>
      isRecord(component) &&
      isNonEmptyString(component.id) &&
      isNonEmptyString(component.type) &&
      isNonEmptyString(component.eplId) &&
      isNonEmptyString(component.name) &&
      isNonEmptyString(component.manufacturer) &&
      isRecord(component.specs) &&
      Object.values(component.specs).every(isString) &&
      isRecord(component.position) &&
      isFiniteNumber(component.position.x) &&
      isFiniteNumber(component.position.y) &&
      isStringArray(component.connectedTo) &&
      ["ok", "degraded", "failed"].includes(String(component.status)) &&
      (component.installationNotes === undefined ||
        isStringArray(component.installationNotes)),
  );
  const componentIds = new Set(
    value.hardwareLayout
      .filter(isRecord)
      .map((component) => String(component.id)),
  );
  const pathsValid = value.signalPaths.every(
    (path) =>
      isRecord(path) &&
      isNonEmptyString(path.id) &&
      isNonEmptyString(path.name) &&
      isNonEmptyString(path.description) &&
      isStringArray(path.componentIds) &&
      path.componentIds.every((id) => componentIds.has(id)),
  );

  return (
    componentsValid &&
    pathsValid &&
    isNonEmptyString(value.faultyComponentId) &&
    componentIds.has(value.faultyComponentId) &&
    ["open", "short", "degraded", "disconnected", "overheated"].includes(
      String(value.faultType),
    ) &&
    isNonEmptyString(value.faultDescription) &&
    SENSOR_STATUSES.includes(value.expectedSensorStatus as never) &&
    isStringArray(value.terminalSymptoms) &&
    isStringArray(value.qcmsSymptoms) &&
    isStringArray(value.diagnosticSteps)
  );
}

export function isScenario(value: unknown): value is Scenario {
  if (!isRecord(value) || !Array.isArray(value.sites)) {
    return false;
  }

  if (value.sites.length < 1 || value.sites.length > 8) {
    return false;
  }

  if (!value.sites.every(isSiteState)) {
    return false;
  }

  const sites = value.sites as SiteState[];
  const siteIds = sites.map((site) => site.id);
  const sensors = sites.flatMap((site) =>
    [site.sensorA, site.sensorB].filter(
      (sensor): sensor is SensorState => sensor !== null,
    ),
  );
  const sensorIds = sensors.map((sensor) => sensor.id);

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.title) &&
    typeof value.description === "string" &&
    ["easy", "medium", "hard"].includes(String(value.difficulty)) &&
    isDateString(value.createdAt) &&
    (value.updatedAt === undefined || isDateString(value.updatedAt)) &&
    new Set(siteIds).size === siteIds.length &&
    (value.hardwareFault === undefined ||
      isHardwareFault(value.hardwareFault)) &&
    new Set(sensorIds).size === sensorIds.length &&
    isNonEmptyString(value.targetSensorId) &&
    sensorIds.includes(value.targetSensorId) &&
    ["sysadmin", "maintenance"].includes(String(value.targetLoginUser)) &&
    (value.eventLog === undefined ||
      (Array.isArray(value.eventLog) &&
        value.eventLog.every(isQcmsEvent))) &&
    Array.isArray(value.expectedActions) &&
    value.expectedActions.every(isRecordedAction)
  );
}

export function assertValidScenario(
  value: unknown,
  context = "scenario",
): asserts value is Scenario {
  if (!isScenario(value)) {
    throw new ScenarioStorageError(
      "invalid-schema",
      `Invalid ${context}: required fields or relationships are missing.`,
    );
  }
}

export function createEmptyScenarioStorage(): ScenarioStorageEnvelope {
  return { version: SCENARIO_STORAGE_VERSION, scenarios: [] };
}

export function deserializeScenarioStorage(
  rawValue: string | null,
): ScenarioStorageEnvelope {
  if (rawValue === null || rawValue.trim() === "") {
    return createEmptyScenarioStorage();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch (error) {
    throw new ScenarioStorageError(
      "invalid-json",
      "Scenario storage contains invalid JSON.",
      { cause: error },
    );
  }

  if (!isRecord(parsed) || parsed.version !== SCENARIO_STORAGE_VERSION) {
    throw new ScenarioStorageError(
      "unsupported-version",
      "Scenario storage version is not supported.",
    );
  }

  if (!Array.isArray(parsed.scenarios)) {
    throw new ScenarioStorageError(
      "invalid-schema",
      "Scenario storage must contain a scenarios array.",
    );
  }

  parsed.scenarios.forEach((scenario, index) =>
    assertValidScenario(scenario, `scenario at index ${index}`),
  );

  const scenarioIds = parsed.scenarios.map((scenario) =>
    String((scenario as Record<string, unknown>).id),
  );
  if (new Set(scenarioIds).size !== scenarioIds.length) {
    throw new ScenarioStorageError(
      "invalid-schema",
      "Scenario storage contains duplicate scenario IDs.",
    );
  }

  return parsed as unknown as ScenarioStorageEnvelope;
}

export function serializeScenarioStorage(
  scenarios: readonly Scenario[],
): string {
  scenarios.forEach((scenario, index) =>
    assertValidScenario(scenario, `scenario at index ${index}`),
  );

  const scenarioIds = scenarios.map((scenario) => scenario.id);
  if (new Set(scenarioIds).size !== scenarioIds.length) {
    throw new ScenarioStorageError(
      "invalid-schema",
      "Cannot store scenarios with duplicate IDs.",
    );
  }

  const envelope: ScenarioStorageEnvelope = {
    version: SCENARIO_STORAGE_VERSION,
    scenarios: [...scenarios],
  };
  return JSON.stringify(envelope);
}

export function loadScenarios(
  storage: Pick<StorageLike, "getItem">,
  key = SCENARIO_STORAGE_KEY,
): Scenario[] {
  return deserializeScenarioStorage(storage.getItem(key)).scenarios;
}

export function saveScenarios(
  storage: Pick<StorageLike, "setItem">,
  scenarios: readonly Scenario[],
  key = SCENARIO_STORAGE_KEY,
): void {
  storage.setItem(key, serializeScenarioStorage(scenarios));
}

export function clearScenarios(
  storage: Pick<StorageLike, "removeItem">,
  key = SCENARIO_STORAGE_KEY,
): void {
  storage.removeItem(key);
}

export function upsertScenario(
  scenarios: readonly Scenario[],
  scenario: Scenario,
): Scenario[] {
  assertValidScenario(scenario);
  const existingIndex = scenarios.findIndex((item) => item.id === scenario.id);

  if (existingIndex === -1) {
    return [...scenarios, scenario];
  }

  return scenarios.map((item, index) =>
    index === existingIndex ? scenario : item,
  );
}

export function removeScenario(
  scenarios: readonly Scenario[],
  scenarioId: string,
): Scenario[] {
  return scenarios.filter((scenario) => scenario.id !== scenarioId);
}

