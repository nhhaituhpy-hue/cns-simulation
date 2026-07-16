"use client";

import { ArrowLeft, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useScenarioStore } from "@/stores/scenario-store";
import type { ScenarioDraft } from "./scenario-form-utils";
import { ScenarioWizardForm } from "./scenario-wizard-form";

type ScenarioWizardProps = {
  scenarioId?: string;
};

function WizardLoadingState() {
  return (
    <div aria-busy="true" aria-label="Đang tải trình tạo kịch bản" className="grid gap-6">
      <div className="h-12 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
      <div className="rounded-lg border border-[var(--border)] bg-white p-6">
        <div className="h-6 w-2/5 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
        <div className="mt-7 grid gap-4">
          <div className="h-11 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
          <div className="h-32 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}

export function ScenarioWizard({ scenarioId }: ScenarioWizardProps) {
  const router = useRouter();
  const isHydrated = useScenarioStore((state) => state.isHydrated);
  const hydrate = useScenarioStore((state) => state.hydrate);
  const getScenarioById = useScenarioStore((state) => state.getScenarioById);
  const createScenario = useScenarioStore((state) => state.createScenario);
  const updateScenario = useScenarioStore((state) => state.updateScenario);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const scenario = scenarioId ? getScenarioById(scenarioId) : undefined;
  const editing = Boolean(scenarioId);

  async function saveScenario(draft: ScenarioDraft) {
    if (scenarioId) {
      const updated = updateScenario(scenarioId, draft);
      if (!updated) {
        throw new Error("Scenario not found.");
      }
    } else {
      createScenario(draft);
    }

    router.push("/admin/ads-b");
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <header className="mb-7">
        <Link
          href="/admin/ads-b"
          className="inline-flex items-center gap-2 rounded text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          <ArrowLeft aria-hidden size={17} weight="regular" />
          Quay về danh sách
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          {editing ? "Chỉnh sửa kịch bản" : "Tạo kịch bản mới"}
        </h1>
        <p className="mt-2 max-w-[65ch] text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
          Hoàn thành năm phần để tạo trạng thái ban đầu, đáp án và sự cố phần cứng tùy chọn.
        </p>
      </header>

      {!isHydrated ? <WizardLoadingState /> : null}

      {isHydrated && editing && !scenario ? (
        <div className="rounded-lg border border-[var(--border)] bg-white px-5 py-12 text-center">
          <span className="mx-auto inline-flex size-12 items-center justify-center rounded bg-[#fffbeb] text-[#92400e]">
            <WarningCircle aria-hidden size={25} weight="regular" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
            Không tìm thấy kịch bản
          </h2>
          <p className="mx-auto mt-2 max-w-[48ch] text-sm leading-6 text-[var(--text-secondary)]">
            Kịch bản có thể đã bị xóa hoặc đường dẫn không còn hợp lệ.
          </p>
          <Link
            href="/admin/ads-b"
            className="mt-5 inline-flex h-10 items-center rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            Mở danh sách kịch bản
          </Link>
        </div>
      ) : null}

      {isHydrated && (!editing || scenario) ? (
        <ScenarioWizardForm
          key={scenario?.id ?? "create"}
          initialScenario={scenario}
          onSave={saveScenario}
        />
      ) : null}
    </div>
  );
}
