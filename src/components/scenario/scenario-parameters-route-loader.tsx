"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useScenarioExamSnapshot } from "@/components/scenario-exams/scenario-exam-snapshot-context";
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
    context: { review: boolean; revisionKey: string; sessionKey?: string },
  ) => boolean | void;
}

/** Loads a row opened from the Kịch bản table into the simulator's draft. */
export function ScenarioParametersRouteLoader<
  TModuleId extends ScenarioParametersModuleId,
>({ moduleId, enabled, onLoaded }: ScenarioParametersRouteLoaderProps<TModuleId>) {
  const searchParams = useSearchParams();
  const examSnapshot = useScenarioExamSnapshot();
  const scenarioId = searchParams?.get("scenarioId")?.trim() ?? "";
  const review = searchParams?.get("review") === "1";
  const requestedSessionKey = searchParams?.get("sessionKey")?.trim() || undefined;
  const [message, setMessage] = useState<string | null>(null);
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    // Assigned exams are hydrated directly from the authorized server snapshot.
    // Query strings must not replace it with a source row or another revision.
    if (examSnapshot) {
      if (!enabled || examSnapshot.moduleId !== moduleId) return;
      const requestKey = `${moduleId}:${examSnapshot.sessionKey}:${examSnapshot.revisionKey}`;
      if (loadedRef.current === requestKey) return;
      const definition = parseScenarioParameters(moduleId, examSnapshot.definition);
      if (!definition) return;
      loadedRef.current = requestKey;
      try {
        const loaded = onLoaded(definition, { review: true, sessionKey: examSnapshot.sessionKey, revisionKey: examSnapshot.revisionKey });
        if (loaded === false) setMessage("Không thể khởi tạo Scenario đã cấp. Hãy quay lại phiên thi và liên hệ giám khảo.");
      } catch {
        setMessage("Không thể khởi tạo Scenario đã cấp. Hãy quay lại phiên thi và liên hệ giám khảo.");
      }
      return;
    }
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
        const storedRevision = row && typeof row === "object" && "revision" in row && typeof row.revision === "number" && Number.isInteger(row.revision) && row.revision > 0
          ? row.revision
          : 1;
        if (cancelled) return;
        onLoaded(definition, {
          review,
          revisionKey: `${review ? "published" : "source"}:${storedRevision}`,
          ...(requestedSessionKey ? { sessionKey: requestedSessionKey } : {}),
        });
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
  }, [enabled, examSnapshot, moduleId, onLoaded, requestedSessionKey, review, scenarioId]);

  return message ? examSnapshot
    ? <p role="alert" className="m-4 rounded border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">{message}</p>
    : <span role="status" className="sr-only">{message}</span>
    : null;
}
