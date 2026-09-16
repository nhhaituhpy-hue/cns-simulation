"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  parseScenarioParameters,
  type ScenarioParametersDefinitionFor,
  type ScenarioParametersModuleId,
} from "@/lib/scenario-parameters";

interface ScenarioParametersRouteLoaderProps<
  TModuleId extends ScenarioParametersModuleId,
> {
  moduleId: TModuleId;
  enabled: boolean;
  onLoaded: (
    definition: ScenarioParametersDefinitionFor<TModuleId>,
    context: { review: boolean },
  ) => void;
}

/** Loads a row opened from the Kịch bản table into the simulator's draft. */
export function ScenarioParametersRouteLoader<
  TModuleId extends ScenarioParametersModuleId,
>({ moduleId, enabled, onLoaded }: ScenarioParametersRouteLoaderProps<TModuleId>) {
  const searchParams = useSearchParams();
  const scenarioId = searchParams?.get("scenarioId")?.trim() ?? "";
  const review = searchParams?.get("review") === "1";
  const [message, setMessage] = useState<string | null>(null);
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !scenarioId || loadedRef.current === `${moduleId}:${scenarioId}`) return;
    let cancelled = false;
    const requestKey = `${moduleId}:${scenarioId}`;
    loadedRef.current = requestKey;

    async function load() {
      try {
        const response = await fetch(`/api/scenario-parameters?id=${encodeURIComponent(scenarioId)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Không thể tải Scenario Parameters từ kho kịch bản.");
        const payload = await response.json() as unknown;
        const row = Array.isArray(payload) ? payload[0] : null;
        const storedModuleId = row && typeof row === "object" && "moduleId" in row && typeof row.moduleId === "string"
          ? row.moduleId
          : null;
        const definition = storedModuleId === moduleId && row && typeof row === "object" && "definition" in row
          ? parseScenarioParameters(moduleId, row.definition)
          : null;
        if (!definition) throw new Error("Scenario Parameters không khớp với simulation đang mở.");
        if (cancelled) return;
        onLoaded(definition, { review });
        setMessage(review
          ? "Đã nạp kịch bản ôn tập vào simulator."
          : "Đã nạp Scenario Parameters từ kho quản lý. Hãy mở panel và Apply để chạy tình huống.");
      } catch (error) {
        if (cancelled) return;
        loadedRef.current = null;
        setMessage(error instanceof Error ? error.message : "Không thể nạp Scenario Parameters.");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [enabled, moduleId, onLoaded, review, scenarioId]);

  return message ? <span role="status" className="sr-only">{message}</span> : null;
}
