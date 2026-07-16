import type {
  LoginUser,
  RecordedAction,
  Scenario,
  ScenarioHardwareFault,
  ScenarioDifficulty,
  SensorState,
  SiteState,
} from "@/lib/types";

export type ScenarioDraft = {
  title: string;
  description: string;
  difficulty: ScenarioDifficulty;
  sites: SiteState[];
  targetSensorId: string;
  targetLoginUser: LoginUser;
  hardwareFault?: ScenarioHardwareFault;
  expectedActions: RecordedAction[];
};

export type ValidationErrors = Record<string, string>;

function createSensor(
  siteId: string,
  label: "A" | "B",
  siteNumber: number,
): SensorState {
  return {
    id: `${siteId}-${label}`,
    sensorLabel: label,
    status: "green",
    ipAddress: `10.10.${siteNumber}.${label === "A" ? 3 : 4}`,
    name: `Quadrant ADS-B sensor ${label}`,
  };
}

export function createSite(siteNumber: number, id?: string): SiteState {
  const siteId = id ?? `site-${siteNumber}-${Date.now()}`;

  return {
    id: siteId,
    name: `Site ${siteNumber}`,
    sensorA: createSensor(siteId, "A", siteNumber),
    sensorB: createSensor(siteId, "B", siteNumber),
  };
}

export function createInitialScenarioDraft(): ScenarioDraft {
  const firstSite = createSite(1, "site-1");

  return {
    title: "",
    description: "",
    difficulty: "medium",
    sites: [firstSite],
    targetSensorId: firstSite.sensorA?.id ?? "",
    targetLoginUser: "sysadmin",
    expectedActions: [],
    hardwareFault: undefined,
  };
}

export function scenarioToDraft(scenario: Scenario): ScenarioDraft {
  return {
    title: scenario.title,
    description: scenario.description,
    difficulty: scenario.difficulty,
    sites: structuredClone(scenario.sites),
    targetSensorId: scenario.targetSensorId,
    targetLoginUser: scenario.targetLoginUser,
    expectedActions: scenario.expectedActions.map((action) => ({ ...action })),
    hardwareFault: scenario.hardwareFault
      ? structuredClone(scenario.hardwareFault)
      : undefined,
  };
}

export function renumberActions(
  actions: readonly RecordedAction[],
): RecordedAction[] {
  return actions.map((action, index) => ({ ...action, step: index + 1 }));
}

export function isValidIpv4(value: string): boolean {
  const parts = value.trim().split(".");

  if (parts.length !== 4) {
    return false;
  }

  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) {
      return false;
    }

    const number = Number(part);
    return number >= 0 && number <= 255;
  });
}

function allSensors(sites: readonly SiteState[]): SensorState[] {
  return sites.flatMap((site) =>
    [site.sensorA, site.sensorB].filter(
      (sensor): sensor is SensorState => sensor !== null,
    ),
  );
}

export function validateScenarioStep(
  draft: ScenarioDraft,
  step: number,
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (step === 1) {
    if (draft.title.trim().length < 3) {
      errors.title = "Tiêu đề cần ít nhất 3 ký tự.";
    } else if (draft.title.trim().length > 100) {
      errors.title = "Tiêu đề không được vượt quá 100 ký tự.";
    }

    if (!draft.description.trim()) {
      errors.description = "Hãy nhập mô tả cho kịch bản.";
    } else if (draft.description.trim().length > 500) {
      errors.description = "Mô tả không được vượt quá 500 ký tự.";
    }
  }

  if (step === 2) {
    if (draft.sites.length < 1 || draft.sites.length > 8) {
      errors.sites = "Kịch bản cần từ 1 đến 8 site.";
    }

    const normalizedNames = new Set<string>();

    draft.sites.forEach((site) => {
      const siteName = site.name.trim();
      const normalizedName = siteName.toLocaleLowerCase("vi-VN");

      if (!siteName) {
        errors[`site.${site.id}.name`] = "Tên site không được để trống.";
      } else if (normalizedNames.has(normalizedName)) {
        errors[`site.${site.id}.name`] = "Tên site cần khác nhau.";
      } else {
        normalizedNames.add(normalizedName);
      }

      [site.sensorA, site.sensorB].forEach((sensor) => {
        if (!sensor) {
          return;
        }

        if (!sensor.name.trim()) {
          errors[`sensor.${sensor.id}.name`] =
            "Tên cảm biến không được để trống.";
        }

        if (!isValidIpv4(sensor.ipAddress)) {
          errors[`sensor.${sensor.id}.ipAddress`] =
            "Địa chỉ IPv4 không hợp lệ.";
        }
      });
    });

    if (!allSensors(draft.sites).some((sensor) => sensor.id === draft.targetSensorId)) {
      errors.targetSensorId = "Hãy chọn cảm biến mục tiêu còn tồn tại.";
    }
  }

  if (step === 3 && !["sysadmin", "maintenance"].includes(draft.targetLoginUser)) {
    errors.targetLoginUser = "Hãy chọn vai trò đăng nhập.";
  }

  if (step === 4 && draft.expectedActions.length === 0) {
    errors.expectedActions = "Hãy thêm ít nhất một thao tác chuẩn.";
  }

  if (
    step === 5 &&
    draft.hardwareFault &&
    (draft.hardwareFault.faultyComponentIds.length === 0 ||
      draft.hardwareFault.faultyComponentIds.some(
        (componentId) =>
          !draft.hardwareFault?.hardwareLayout.some(
            (component) => component.id === componentId,
          ),
      ))
  ) {
    errors.hardwareFault =
      "Hãy đánh dấu ít nhất một phần cứng sự cố hợp lệ.";
  }

  return errors;
}


export function validateScenarioDraft(draft: ScenarioDraft): ValidationErrors {
  return [1, 2, 3, 4, 5].reduce<ValidationErrors>(
    (errors, step) => ({
      ...errors,
      ...validateScenarioStep(draft, step),
    }),
    {},
  );
}
