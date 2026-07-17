import { describe, expect, it } from "vitest";
import {
  deserializeVorScenarios,
  mapRowToVorScenario,
  serializeVorScenarios,
} from "@/lib/vor-scenario-storage";
import type { VorScenario } from "@/lib/vor-types";
import { createVorScenarioStore } from "@/stores/vor-scenario-store";

const fixedScenario: VorScenario = {
  id: "vor-power-loss",
  title: "Mất công suất phát",
  description: "Kiểm tra PMDT khi công suất Tx #1 giảm về 0.",
  difficulty: "medium",
  prompt: "Xác định vị trí sự cố và đề xuất hướng khắc phục.",
  createdAt: "2026-07-16T10:00:00.000Z",
  overrides: [{ fieldId: "txPower.0.tx1", value: 0, status: "red" }],
  expectedCheckpoints: [
    {
      id: "checkpoint-1",
      order: 1,
      viewId: "tx-data-main",
      menuPath: ["Transmitters", "Data", "Transmitter Data"],
      title: "Transmitter Data",
      guidance: "Kiểm tra công suất phát.",
      required: true,
      points: 20,
    },
  ],
  hardwareTask: {
    expectedComponentIds: ["vor-carrier-amp-1"],
    faultType: "Mất tín hiệu",
    adminNote: "Kiểm tra PA TX1.",
  },
};

describe("VOR scenario persistence", () => {
  it("round-trips local storage and maps JSONB database rows", () => {
    expect(deserializeVorScenarios(serializeVorScenarios([fixedScenario]))).toEqual([
      fixedScenario,
    ]);
    expect(
      mapRowToVorScenario({
        id: fixedScenario.id,
        title: fixedScenario.title,
        description: fixedScenario.description,
        difficulty: fixedScenario.difficulty,
        prompt: fixedScenario.prompt,
        overrides: fixedScenario.overrides,
        expected_checkpoints: fixedScenario.expectedCheckpoints,
        hardware_task: fixedScenario.hardwareTask,
        created_at: fixedScenario.createdAt,
        updated_at: null,
      }),
    ).toEqual(fixedScenario);
  });

  it("normalizes legacy aggregate hardware IDs while loading saved scenarios", () => {
    const legacyScenario: VorScenario = {
      ...fixedScenario,
      hardwareTask: {
        ...fixedScenario.hardwareTask!,
        expectedComponentIds: ["vor-sideband-amp-1", "vor-sideband-switch"],
      },
    };

    expect(deserializeVorScenarios(serializeVorScenarios([legacyScenario]))[0].hardwareTask)
      .toEqual(expect.objectContaining({
        expectedComponentIds: [
          "vor-tx1-sideband-1",
          "vor-tx1-sideband-2",
          "vor-tx1-sideband-3",
          "vor-tx1-sideband-4",
          "vor-sideband-switch-1",
          "vor-sideband-switch-2",
          "vor-sideband-switch-3",
          "vor-sideband-switch-4",
        ],
      }));
  });

  it("creates, updates, and deletes VOR scenarios independently", async () => {
    const store = createVorScenarioStore({
      storage: window.localStorage,
      request: null,
      now: () => new Date("2026-07-16T10:00:00.000Z"),
      generateId: () => "vor-generated",
    });
    await store.getState().hydrate();
    const created = await store.getState().createScenario({
      title: fixedScenario.title,
      description: fixedScenario.description,
      difficulty: fixedScenario.difficulty,
      prompt: fixedScenario.prompt,
      overrides: fixedScenario.overrides,
      expectedCheckpoints: fixedScenario.expectedCheckpoints,
      hardwareTask: fixedScenario.hardwareTask,
    });
    expect(created.id).toBe("vor-generated");
    expect(store.getState().getScenarioById(created.id)).toEqual(created);

    const updated = await store.getState().updateScenario(created.id, {
      difficulty: "hard",
    });
    expect(updated?.difficulty).toBe("hard");
    expect(await store.getState().deleteScenario(created.id)).toBe(true);
    expect(store.getState().scenarios).toEqual([]);
  });
});
