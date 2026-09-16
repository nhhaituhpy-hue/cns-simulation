import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createLowCarrierAnd9960Scenario as createDvor1150LowCarrier,
  createReferenceModulationScenario as createDvor1150Reference,
  createSidebandVswrScenario as createDvor1150Vswr,
  parseDvor1150ScenarioDefinition,
} from "@/lib/dvor1150/scenario";
import {
  createLowCarrierAnd9960Scenario as createDvor1150aLowCarrier,
  createReferenceModulationScenario as createDvor1150aReference,
  createSidebandVswrScenario as createDvor1150aVswr,
  parseDvor1150aScenarioDefinition,
} from "@/lib/dvor1150a/scenario";
import {
  createDelayDriftDme1119aScenario,
  createLowOutputDme1119aScenario,
  createPrfOverloadDme1119aScenario,
  parseDme1119aScenarioDefinition,
} from "@/lib/dme1119a/scenario";
import {
  createCarrierAnd9960DegradationScenario,
  createDefaultDvor220ScenarioDefinition,
  parseDvor220ScenarioDefinition,
} from "@/modules/operations/dvor-220/domain/scenario";
import {
  createHardwareDme320Scenario,
  createLowPowerDme320Scenario,
  createPulseSpacingDme320Scenario,
  parseDme320ScenarioDefinition,
} from "@/modules/operations/dme-320/domain/scenario";

const outputDir = join(process.cwd(), "output", "qa-scenarios-20260916");

function withQaMetadata<T extends { id: string; name: string; description: string }>(
  scenario: T,
  id: string,
  name: string,
  description: string,
) {
  scenario.id = id;
  scenario.name = name;
  scenario.description = description;
  return scenario;
}

const fixtures = {
  "dvor-1150": [
    withQaMetadata(createDvor1150LowCarrier(), "qa-dvor1150-low-carrier", "QA DVOR 1150 - Suy giảm Carrier", "Khôi phục công suất Carrier và điều chế 9960 Hz."),
    withQaMetadata(createDvor1150Reference(), "qa-dvor1150-reference", "QA DVOR 1150 - Lệch Reference", "Khôi phục tham số điều chế tham chiếu về giới hạn bình thường."),
    withQaMetadata(createDvor1150Vswr(), "qa-dvor1150-vswr", "QA DVOR 1150 - VSWR Sideband", "Chẩn đoán và xử lý cảnh báo VSWR nhánh Sideband."),
  ],
  "dvor-1150a": [
    withQaMetadata(createDvor1150aLowCarrier(), "qa-dvor1150a-low-carrier", "QA DVOR 1150A - Suy giảm Carrier", "Khôi phục công suất Carrier và điều chế 9960 Hz."),
    withQaMetadata(createDvor1150aReference(), "qa-dvor1150a-reference", "QA DVOR 1150A - Lệch Reference", "Khôi phục tham số điều chế tham chiếu về giới hạn bình thường."),
    withQaMetadata(createDvor1150aVswr(), "qa-dvor1150a-vswr", "QA DVOR 1150A - VSWR Sideband", "Chẩn đoán và xử lý cảnh báo VSWR nhánh Sideband."),
  ],
  "dme-1119a": [
    withQaMetadata(createLowOutputDme1119aScenario(), "qa-dme1119a-low-output", "QA DME 1119A - Công suất thấp", "Khôi phục công suất phát đáp về giới hạn khai thác."),
    withQaMetadata(createDelayDriftDme1119aScenario(), "qa-dme1119a-delay-drift", "QA DME 1119A - Trôi Reply Delay", "Chẩn đoán và hiệu chỉnh sai lệch Reply Delay."),
    withQaMetadata(createPrfOverloadDme1119aScenario(), "qa-dme1119a-prf", "QA DME 1119A - Quá tải PRF", "Xử lý tình huống tải PRF vượt giới hạn."),
  ],
  "dvor-220": [
    withQaMetadata(createCarrierAnd9960DegradationScenario(), "qa-dvor220-carrier", "QA DVOR 220 - Suy giảm Carrier", "Khôi phục Carrier và điều chế 9960 Hz trên TX1."),
    withQaMetadata(createDefaultDvor220ScenarioDefinition(), "qa-dvor220-baseline", "QA DVOR 220 - Kiểm tra baseline", "Kiểm tra trạng thái vận hành chuẩn của đài DVOR 220."),
    withQaMetadata(createDefaultDvor220ScenarioDefinition(), "qa-dvor220-monitor", "QA DVOR 220 - Kiểm tra Monitor", "Kiểm tra chuỗi giám sát và trạng thái service bình thường."),
  ],
  "dme-320": [
    withQaMetadata(createLowPowerDme320Scenario(), "qa-dme320-low-power", "QA DME 320 - Công suất thấp", "Khôi phục công suất TX1 và ERP về giới hạn bình thường."),
    withQaMetadata(createPulseSpacingDme320Scenario(), "qa-dme320-spacing", "QA DME 320 - Sai lệch Pulse Spacing", "Chẩn đoán và đưa Pulse Spacing Offset về giá trị danh định."),
    withQaMetadata(createHardwareDme320Scenario(), "qa-dme320-hpa", "QA DME 320 - Lỗi HPA", "Chẩn đoán và xử lý lỗi HPA Low Output trên TX1."),
  ],
} as const;

const parsers = {
  "dvor-1150": parseDvor1150ScenarioDefinition,
  "dvor-1150a": parseDvor1150aScenarioDefinition,
  "dme-1119a": parseDme1119aScenarioDefinition,
  "dvor-220": parseDvor220ScenarioDefinition,
  "dme-320": parseDme320ScenarioDefinition,
} as const;

describe("QA scenario fixtures", () => {
  it("writes three schema-valid scenarios for every supported device", () => {
    mkdirSync(outputDir, { recursive: true });
    for (const [moduleId, scenarios] of Object.entries(fixtures)) {
      expect(scenarios).toHaveLength(3);
      for (const scenario of scenarios) {
        expect(parsers[moduleId as keyof typeof parsers](scenario as never)).not.toBeNull();
        writeFileSync(
          join(outputDir, `${moduleId}__${scenario.id}.json`),
          `${JSON.stringify(scenario, null, 2)}\n`,
          "utf8",
        );
      }
    }
  });
});
