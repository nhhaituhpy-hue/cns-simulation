import type {
  ScenarioDifficulty,
  SensorStatus,
  SiteState,
} from "@/lib/types";

export const MAX_VISUALIZED_SENSORS = 4;
export const GROUND_STATION_SLOT_COUNT = 64;
export const PROCESSING_SITE_SLOT_COUNT = 4;
export const SNMP_STALE_AFTER_SECONDS = 60;

export type SensorStatusDetails = {
  label: string;
  description: string;
  textColor: string;
  borderColor: string;
  backgroundColor: string;
  signalColor: string;
};

export const SENSOR_STATUS_DETAILS: Record<
  SensorStatus,
  SensorStatusDetails
> = {
  green: {
    label: "Hoạt động",
    description: "Dữ liệu và SNMP bình thường",
    textColor: "#166534",
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
    signalColor: "#22e33f",
  },
  orange: {
    label: "Suy giảm",
    description: "Dữ liệu còn nhưng SNMP hoặc trap có vấn đề",
    textColor: "#9a3412",
    borderColor: "#fdba74",
    backgroundColor: "#fff7ed",
    signalColor: "#f29b24",
  },
  yellow: {
    label: "Một phần",
    description: "Không có dữ liệu nhưng SNMP còn phản hồi",
    textColor: "#854d0e",
    borderColor: "#fde047",
    backgroundColor: "#fefce8",
    signalColor: "#f2df22",
  },
  red: {
    label: "Lỗi",
    description: "Mất dữ liệu và SNMP",
    textColor: "#991b1b",
    borderColor: "#fca5a5",
    backgroundColor: "#fef2f2",
    signalColor: "#ef3340",
  },
  turquoise: {
    label: "Dự phòng tốt",
    description: "Chế độ dự phòng và vẫn có dữ liệu",
    textColor: "#155e75",
    borderColor: "#67e8f9",
    backgroundColor: "#ecfeff",
    signalColor: "#24d7cf",
  },
  magenta: {
    label: "Dự phòng lỗi",
    description: "Chế độ dự phòng và không có dữ liệu",
    textColor: "#86198f",
    borderColor: "#f0abfc",
    backgroundColor: "#fdf4ff",
    signalColor: "#e82bd5",
  },
  grey: {
    label: "Đã tắt",
    description: "Cảm biến không hoạt động",
    textColor: "#3f3f46",
    borderColor: "#d4d4d8",
    backgroundColor: "#f4f4f5",
    signalColor: "#9da1a3",
  },
};

export type GroundStationSlot = {
  slotNumber: number;
  group: "processing" | "redundant";
  site: SiteState | null;
};

export function createGroundStationSlots(
  sites: readonly SiteState[],
): GroundStationSlot[] {
  return Array.from({ length: GROUND_STATION_SLOT_COUNT }, (_, index) => ({
    slotNumber: index + 1,
    group:
      index < PROCESSING_SITE_SLOT_COUNT ? "processing" : "redundant",
    site: sites[index] ?? null,
  }));
}

export const DIFFICULTY_DETAILS: Record<
  ScenarioDifficulty,
  { label: string; className: string }
> = {
  easy: {
    label: "Cơ bản",
    className: "border-[#86efac] bg-[#f0fdf4] text-[#166534]",
  },
  medium: {
    label: "Trung bình",
    className: "border-[#fde047] bg-[#fefce8] text-[#854d0e]",
  },
  hard: {
    label: "Nâng cao",
    className: "border-[#fca5a5] bg-[#fef2f2] text-[#991b1b]",
  },
};

export type VisualizationToggleResult = {
  sensorIds: Set<string>;
  outcome: "shown" | "hidden" | "limit-reached";
};

export function toggleSensorVisualization(
  currentSensorIds: ReadonlySet<string>,
  sensorId: string,
  limit = MAX_VISUALIZED_SENSORS,
): VisualizationToggleResult {
  const sensorIds = new Set(currentSensorIds);

  if (sensorIds.has(sensorId)) {
    sensorIds.delete(sensorId);
    return { sensorIds, outcome: "hidden" };
  }

  if (sensorIds.size >= limit) {
    return { sensorIds, outcome: "limit-reached" };
  }

  sensorIds.add(sensorId);
  return { sensorIds, outcome: "shown" };
}

export function siteHasVisualizedSensor(
  site: SiteState,
  visualizedSensorIds: ReadonlySet<string>,
): boolean {
  return [site.sensorA, site.sensorB].some(
    (sensor) => sensor !== null && visualizedSensorIds.has(sensor.id),
  );
}

export function getSnmpAgeSeconds(
  lastResponseAt: string,
  now = Date.now(),
): number | null {
  const responseTime = Date.parse(lastResponseAt);

  if (Number.isNaN(responseTime)) {
    return null;
  }

  return Math.max(0, Math.floor((now - responseTime) / 1000));
}

export function isSnmpStale(
  lastResponseAt: string,
  now = Date.now(),
  thresholdSeconds = SNMP_STALE_AFTER_SECONDS,
): boolean {
  const ageSeconds = getSnmpAgeSeconds(lastResponseAt, now);
  return ageSeconds !== null && ageSeconds > thresholdSeconds;
}

export function formatSnmpAge(ageSeconds: number | null): string {
  if (ageSeconds === null) {
    return "Không xác định";
  }

  if (ageSeconds < 60) {
    return `${ageSeconds} giây trước`;
  }

  const minutes = Math.floor(ageSeconds / 60);
  if (minutes < 60) {
    return `${minutes} phút trước`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} giờ trước`;
  }

  return `${Math.floor(hours / 24)} ngày trước`;
}

export function countScenarioSensors(sites: readonly SiteState[]): number {
  return sites.reduce(
    (count, site) =>
      count + Number(site.sensorA !== null) + Number(site.sensorB !== null),
    0,
  );
}

export function formatElapsedTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  return [minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}
