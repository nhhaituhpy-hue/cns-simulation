"use client";

import { useEffect, useState } from "react";
import { ScenarioLibraryControls } from "@/components/scenario/scenario-library-controls";
import type { StoredScenarioParameters } from "@/lib/scenario-parameters-storage";

export function AdsbScenarioLibraryPanel() {
  const [scenarios, setScenarios] = useState<StoredScenarioParameters[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/scenario-parameters", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Không thể tải Scenario Parameters ADS-B.");
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        if (cancelled) return;
        if (!Array.isArray(payload)) throw new Error("Danh sách Scenario Parameters không hợp lệ.");
        setScenarios(payload as StoredScenarioParameters[]);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Không thể tải Scenario Parameters ADS-B.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="Phân chia thư viện Scenario ADS-B" className="mt-7">
      {error ? (
        <p role="alert" className="mb-3 rounded border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">
          {error}
        </p>
      ) : null}
      <ScenarioLibraryControls moduleId="ads-b" scenarios={scenarios} />
    </section>
  );
}
