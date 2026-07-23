import { TerminalEngine } from "@/lib/terminal-engine";
import {
  CON_SON_SENSOR_1,
  NOI_BAI_TRAINING_SENSOR,
} from "@/lib/sensor-data-presets";
import type {
  LoginUser,
  RecordedAction,
  Scenario,
  SensorDataProfile,
  SensorMonitoringData,
  SensorStatus,
} from "@/lib/types";

const SEED_TIMESTAMP = Date.parse("2026-01-01T00:00:00.000Z");

function buildExpectedActions(
  loginUser: LoginUser,
  inputs: readonly string[],
  dataProfile?: SensorDataProfile,
): RecordedAction[] {
  const engine = new TerminalEngine({
    targetLoginUser: loginUser,
    sensorDataProfile: dataProfile ? structuredClone(dataProfile) : undefined,
  });

  return inputs.flatMap((input) => {
    const action = engine.processInput(input).recordableAction;

    if (!action) {
      return [];
    }

    return [
      {
        ...action,
        step: 0,
        timestamp: 0,
      },
    ];
  }).map((action, index) => ({
    ...action,
    step: index + 1,
    timestamp: SEED_TIMESTAMP + index,
  }));
}

function monitoring(
  gpsStatus: SensorMonitoringData["gpsStatus"] = "synchronized",
): SensorMonitoringData {
  return {
    lastSnmpResponseAt: "2026-01-01T00:00:00.000Z",
    temperatureC: 42.5,
    cpuLoadPercent: 31,
    voltages: { v3_3: 3.3, v5: 5.02, v12: 12.08 },
    receiverConfidencePercent: 97,
    crcErrorCount: 3,
    gpsStatus,
  };
}

function singleSite(
  siteId: string,
  siteName: string,
  sensorId: string,
  sensorLabel: "A" | "B",
  status: SensorStatus,
  gpsStatus: SensorMonitoringData["gpsStatus"] = "synchronized",
  dataProfile?: SensorDataProfile,
): Scenario["sites"] {
  const sensor = {
    id: sensorId,
    sensorLabel,
    status,
    ipAddress: "10.10.10.3",
    name: "Quadrant ADS-B sensor",
    monitoring: monitoring(gpsStatus),
    dataProfile,
  };

  return [
    {
      id: siteId,
      name: siteName,
      sensorA: sensorLabel === "A" ? sensor : null,
      sensorB: sensorLabel === "B" ? sensor : null,
    },
  ];
}

function buildExpectedActionsAcrossLogins(
  segments: readonly {
    loginUser: LoginUser;
    inputs: readonly string[];
  }[],
  dataProfile?: SensorDataProfile,
): RecordedAction[] {
  let persistentState: ReturnType<TerminalEngine["getPersistentState"]> | null =
    null;
  const actions: Omit<RecordedAction, "step" | "timestamp">[] = [];

  for (const segment of segments) {
    const engine = new TerminalEngine({
      targetLoginUser: segment.loginUser,
      sensorDataProfile: dataProfile ? structuredClone(dataProfile) : undefined,
    });
    if (persistentState) {
      engine.restorePersistentState(persistentState);
    }

    for (const input of segment.inputs) {
      const action = engine.processInput(input).recordableAction;
      if (action) actions.push(action);
    }
    persistentState = engine.getPersistentState();
  }

  return actions.map((action, index) => ({
    ...action,
    step: index + 1,
    timestamp: SEED_TIMESTAMP + index,
  }));
}

function noiBaiTrainingSite(sensorId: string): Scenario["sites"] {
  return [
    {
      id: "noi-bai-adsb-training",
      name: "ADS-B Nội Bài",
      sensorA: {
        id: sensorId,
        sensorLabel: "A",
        status: "green",
        ipAddress: NOI_BAI_TRAINING_SENSOR.network.ip,
        name: NOI_BAI_TRAINING_SENSOR.sensorName,
        monitoring: {
          ...monitoring(),
          temperatureC: 41,
          cpuLoadPercent: 20,
          receiverConfidencePercent: 99,
          crcErrorCount: 0,
        },
        dataProfile: structuredClone(NOI_BAI_TRAINING_SENSOR),
      },
      sensorB: null,
    },
  ];
}

/** Built-in exercises used only when a browser has no scenario storage yet. */
export const DEFAULT_SCENARIOS: readonly Scenario[] = [
  {
    id: "seed-sa-enable-cat21",
    title: "Khôi phục đầu ra ADS-B CAT21",
    description:
      "Quản trị viên hệ thống cần bật lại đầu ra CAT21 trên cảm biến bị ảnh hưởng.",
    difficulty: "easy",
    createdAt: "2026-01-01T00:00:00.000Z",
    sites: singleSite(
      "da-nang",
      "Đà Nẵng",
      "da-nang-a",
      "A",
      "yellow",
    ),
    targetSensorId: "da-nang-a",
    targetLoginUser: "sysadmin",
    expectedActions: buildExpectedActions("sysadmin", ["1", "1", "1"]),
  },
  {
    id: "seed-ma-restore-gps",
    title: "Khôi phục xử lý GPS",
    description:
      "Nhân viên bảo trì cần bật lại GPS sau khi cảm biến mất đồng bộ.",
    difficulty: "medium",
    createdAt: "2026-01-02T00:00:00.000Z",
    sites: singleSite(
      "noi-bai",
      "Nội Bài",
      "noi-bai-b",
      "B",
      "orange",
      "unsynchronized",
    ),
    targetSensorId: "noi-bai-b",
    targetLoginUser: "maintenance",
    expectedActions: buildExpectedActions("maintenance", ["6", "2", "1"]),
  },
  {
    id: "seed-ma-check-version",
    title: "Kiểm tra phiên bản phần mềm",
    description:
      "Mở màn hình thông tin phần mềm, kiểm tra phiên bản rồi quay lại menu trước.",
    difficulty: "easy",
    createdAt: "2026-01-03T00:00:00.000Z",
    sites: singleSite(
      "tan-son-nhat",
      "Tân Sơn Nhất",
      "tan-son-nhat-a",
      "A",
      "green",
    ),
    targetSensorId: "tan-son-nhat-a",
    targetLoginUser: "maintenance",
    expectedActions: buildExpectedActions("maintenance", ["7", "1", ""]),
  },
  {
    id: "seed-con-son-network",
    title: "Ki\u1ec3m tra c\u1ea5u h\u00ecnh m\u1ea1ng C\u00f4n S\u01a1n",
    description:
      "Ki\u1ec3m tra c\u1ea5u h\u00ecnh m\u1ea1ng c\u1ee7a Sensor 1 t\u1ea1i tr\u1ea1m ADS-B C\u00f4n S\u01a1n.",
    difficulty: "easy",
    createdAt: "2026-01-04T00:00:00.000Z",
    sites: [
      {
        id: "con-son",
        name: "C\u00f4n S\u01a1n",
        sensorA: {
          id: "con-son-a",
          sensorLabel: "A",
          status: "green",
          ipAddress: "192.168.201.1",
          name: "ConSon Sensor 1",
          monitoring: monitoring(),
          dataProfile: CON_SON_SENSOR_1,
        },
        sensorB: null,
      },
    ],
    targetSensorId: "con-son-a",
    targetLoginUser: "sysadmin",
    expectedActions: buildExpectedActions("sysadmin", ["2", "1", "", "0"]),
  },
  {
    id: "adsb-01-display-system-configuration",
    title: "ADS-B 01 — Hiển thị cấu hình hệ thống",
    description:
      "Đăng nhập bằng tài khoản maintenance, mở Display System Stats và hiển thị đầy đủ System Configuration.",
    difficulty: "easy",
    createdAt: "2026-07-01T00:00:00.000Z",
    sites: noiBaiTrainingSite("noi-bai-training-01"),
    targetSensorId: "noi-bai-training-01",
    targetLoginUser: "maintenance",
    expectedActions: buildExpectedActions(
      "maintenance",
      ["8", "1"],
      NOI_BAI_TRAINING_SENSOR,
    ),
  },
  {
    id: "adsb-02-display-system-status",
    title: "ADS-B 02 — Kiểm tra trạng thái hệ thống",
    description:
      "Mở màn hình System Status để kiểm tra CPU, nhiệt độ, điện áp, GPS, mạng và kết quả RF End-to-End.",
    difficulty: "easy",
    createdAt: "2026-07-02T00:00:00.000Z",
    sites: noiBaiTrainingSite("noi-bai-training-02"),
    targetSensorId: "noi-bai-training-02",
    targetLoginUser: "maintenance",
    expectedActions: buildExpectedActions(
      "maintenance",
      ["8", "2"],
      NOI_BAI_TRAINING_SENSOR,
    ),
  },
  {
    id: "adsb-03-display-clients",
    title: "ADS-B 03 — Kiểm tra client giám sát",
    description:
      "Hiển thị cấu hình các Surveillance Client, quay lại rồi kiểm tra thống kê bản tin của từng client.",
    difficulty: "easy",
    createdAt: "2026-07-03T00:00:00.000Z",
    sites: noiBaiTrainingSite("noi-bai-training-03"),
    targetSensorId: "noi-bai-training-03",
    targetLoginUser: "sysadmin",
    expectedActions: buildExpectedActions(
      "sysadmin",
      ["3", "1", "", "2"],
      NOI_BAI_TRAINING_SENSOR,
    ),
  },
  {
    id: "adsb-04-display-e2e-thresholds",
    title: "ADS-B 04 — Kiểm tra ngưỡng RF End-to-End",
    description:
      "Mở Customisation và hiển thị Alert Power Level, Failure Power Level cùng kết quả End-to-End hiện tại.",
    difficulty: "easy",
    createdAt: "2026-07-04T00:00:00.000Z",
    sites: noiBaiTrainingSite("noi-bai-training-04"),
    targetSensorId: "noi-bai-training-04",
    targetLoginUser: "sysadmin",
    expectedActions: buildExpectedActions(
      "sysadmin",
      ["7", "7"],
      NOI_BAI_TRAINING_SENSOR,
    ),
  },
  {
    id: "adsb-05-change-operation-mode",
    title: "ADS-B 05 — Chuyển chế độ vận hành",
    description:
      "Chuyển Actual Sensor Operating Mode từ OPERATIONAL sang MAINTENANCE và kiểm tra màn hình xác nhận kết quả.",
    difficulty: "easy",
    createdAt: "2026-07-05T00:00:00.000Z",
    sites: noiBaiTrainingSite("noi-bai-training-05"),
    targetSensorId: "noi-bai-training-05",
    targetLoginUser: "sysadmin",
    expectedActions: buildExpectedActions(
      "sysadmin",
      ["9", "1"],
      NOI_BAI_TRAINING_SENSOR,
    ),
  },
  {
    id: "adsb-06-configure-network",
    title: "ADS-B 06 — Cấu hình địa chỉ IP cho máy thu",
    description:
      "Chuyển sang MAINTENANCE, nhập IP 192.168.10.20, subnet và gateway; đăng nhập lại bằng sysadmin@192.168.10.20 để xác nhận, sau đó chuyển về OPERATIONAL.",
    difficulty: "hard",
    createdAt: "2026-07-06T00:00:00.000Z",
    updatedAt: "2026-07-23T07:30:00.000Z",
    sites: noiBaiTrainingSite("noi-bai-training-06"),
    targetSensorId: "noi-bai-training-06",
    targetLoginUser: "sysadmin",
    expectedActions: buildExpectedActions(
      "sysadmin",
      [
        "9",
        "1",
        "",
        "2",
        "2",
        "1",
        "192.168.10.20",
        "255.255.255.0",
        "192.168.10.252",
        "",
        "3",
        "1",
        "",
        "0",
        "9",
        "1",
      ],
      NOI_BAI_TRAINING_SENSOR,
    ),
  },
  {
    id: "adsb-07-configure-sensor-name",
    title: "ADS-B 07 — Cấu hình tên máy thu",
    description:
      "Chuyển sang MAINTENANCE, đặt Sensor Name thành NoiBai-Training, kiểm tra kết quả rồi chuyển máy thu về OPERATIONAL.",
    difficulty: "medium",
    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-23T08:00:00.000Z",
    sites: noiBaiTrainingSite("noi-bai-training-07"),
    targetSensorId: "noi-bai-training-07",
    targetLoginUser: "sysadmin",
    expectedActions: buildExpectedActions(
      "sysadmin",
      [
        "9",
        "1",
        "",
        "7",
        "1",
        "1",
        "NoiBai-Training",
        "",
        "0",
        "9",
        "1",
      ],
      NOI_BAI_TRAINING_SENSOR,
    ),
  },
  {
    id: "adsb-08-configure-sac-sic",
    title: "ADS-B 08 — Cấu hình ASTERIX SAC/SIC",
    description:
      "Dùng sysadmin chuyển máy thu sang MAINTENANCE, đăng nhập maintenance để đổi SAC thành 95 và SIC thành 164, sau đó đăng nhập lại sysadmin và chuyển về OPERATIONAL.",
    difficulty: "medium",
    createdAt: "2026-07-08T00:00:00.000Z",
    updatedAt: "2026-07-23T09:00:00.000Z",
    sites: noiBaiTrainingSite("noi-bai-training-08"),
    targetSensorId: "noi-bai-training-08",
    targetLoginUser: "sysadmin",
    expectedActions: buildExpectedActionsAcrossLogins(
      [
        {
          loginUser: "sysadmin",
          inputs: ["9", "1", "", "X"],
        },
        {
          loginUser: "maintenance",
          inputs: ["1", "1", "2", "95", "", "3", "164", "", "X"],
        },
        {
          loginUser: "sysadmin",
          inputs: ["9", "1"],
        },
      ],
      NOI_BAI_TRAINING_SENSOR,
    ),
  },
  {
    id: "adsb-09-configure-client",
    title: "ADS-B 09 — Thêm Surveillance Client",
    description:
      "Chuyển sang MAINTENANCE và cấu hình client số 5: UDP, ADS-B + Non-OP, tên TRAIN-QCMS, IP 192.168.80.50, cổng 20550.",
    difficulty: "hard",
    createdAt: "2026-07-09T00:00:00.000Z",
    sites: noiBaiTrainingSite("noi-bai-training-09"),
    targetSensorId: "noi-bai-training-09",
    targetLoginUser: "sysadmin",
    expectedActions: buildExpectedActions(
      "sysadmin",
      [
        "9",
        "1",
        "",
        "3",
        "4",
        "5",
        "1",
        "1",
        "TRAIN-QCMS",
        "192.168.80.50",
        "20550",
      ],
      NOI_BAI_TRAINING_SENSOR,
    ),
  },
  {
    id: "adsb-10-export-configuration",
    title: "ADS-B 10 — Xuất cấu hình hiện tại",
    description:
      "Chuyển sang MAINTENANCE và xuất cấu hình tới máy chủ 192.168.10.8 với tên NoiBai_backup.cfg.",
    difficulty: "medium",
    createdAt: "2026-07-10T00:00:00.000Z",
    sites: noiBaiTrainingSite("noi-bai-training-10"),
    targetSensorId: "noi-bai-training-10",
    targetLoginUser: "sysadmin",
    expectedActions: buildExpectedActions(
      "sysadmin",
      [
        "9",
        "1",
        "",
        "8",
        "1",
        "1",
        "NoiBai_backup.cfg",
        "192.168.10.8",
        "/home/qcms/config",
      ],
      NOI_BAI_TRAINING_SENSOR,
    ),
  },
  {
    id: "adsb-11-configure-e2e-thresholds",
    title: "ADS-B 11 — Thay đổi ngưỡng cảnh báo RF",
    description:
      "Chuyển sang MAINTENANCE, đặt Alert Power Level = 170 và Failure Power Level = 145 rồi kiểm tra màn hình kết quả.",
    difficulty: "medium",
    createdAt: "2026-07-11T00:00:00.000Z",
    sites: noiBaiTrainingSite("noi-bai-training-11"),
    targetSensorId: "noi-bai-training-11",
    targetLoginUser: "sysadmin",
    expectedActions: buildExpectedActions(
      "sysadmin",
      ["9", "1", "", "7", "10", "2", "1", "170", "145"],
      NOI_BAI_TRAINING_SENSOR,
    ),
  },
  {
    id: "adsb-12-configure-position-from-gps",
    title: "ADS-B 12 — Cấu hình vị trí từ GPS",
    description:
      "Chọn Obtain Position from GPS, dùng Actual GPS Position và kiểm tra tọa độ Nội Bài trên màn hình kết quả.",
    difficulty: "medium",
    createdAt: "2026-07-12T00:00:00.000Z",
    sites: noiBaiTrainingSite("noi-bai-training-12"),
    targetSensorId: "noi-bai-training-12",
    targetLoginUser: "maintenance",
    expectedActions: buildExpectedActions(
      "maintenance",
      ["1", "2", "2", "1"],
      NOI_BAI_TRAINING_SENSOR,
    ),
  },
];

export function cloneScenarios(
  scenarios: readonly Scenario[],
  monitoringTimestamp?: string,
): Scenario[] {
  return scenarios.map((scenario) => ({
    ...scenario,
    sites: scenario.sites.map((site) => ({
      ...site,
      sensorA: site.sensorA
        ? {
            ...site.sensorA,
            dataProfile: site.sensorA.dataProfile
              ? structuredClone(site.sensorA.dataProfile)
              : undefined,
            monitoring: site.sensorA.monitoring
              ? {
                  ...site.sensorA.monitoring,
                  lastSnmpResponseAt:
                    monitoringTimestamp ??
                    site.sensorA.monitoring.lastSnmpResponseAt,
                  voltages: { ...site.sensorA.monitoring.voltages },
                }
              : undefined,
          }
        : null,
      sensorB: site.sensorB
        ? {
            ...site.sensorB,
            dataProfile: site.sensorB.dataProfile
              ? structuredClone(site.sensorB.dataProfile)
              : undefined,
            monitoring: site.sensorB.monitoring
              ? {
                  ...site.sensorB.monitoring,
                  lastSnmpResponseAt:
                    monitoringTimestamp ??
                    site.sensorB.monitoring.lastSnmpResponseAt,
                  voltages: { ...site.sensorB.monitoring.voltages },
                }
              : undefined,
          }
        : null,
    })),
    hardwareFault: scenario.hardwareFault
      ? structuredClone(scenario.hardwareFault)
      : undefined,
    eventLog: scenario.eventLog?.map((event) => ({
      ...event,
    })),
    expectedActions: scenario.expectedActions.map((action) => ({ ...action })),
  }));
}
