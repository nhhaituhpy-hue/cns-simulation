"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ButtonLink } from "@/components/ui/button";
import { useScenarioStore } from "@/stores/scenario-store";
import type { ScenarioDraft } from "./scenario-form-utils";
import { ScenarioWizardForm } from "./scenario-wizard-form";

type ScenarioWizardProps = {
  scenarioId?: string;
};

function WizardLoadingState() {
  return (
    <div aria-busy="true" aria-label="Đang tải trình tạo kịch bản" className="grid gap-6">
      <div className="h-12 animate-pulse rounded-[8px] bg-white/[0.05] motion-reduce:animate-none" />
      <div className="rounded-[12px] border border-white/[0.08] bg-[#141f2a] p-6 shadow-sm">
        <div className="h-6 w-2/5 animate-pulse rounded bg-white/[0.05] motion-reduce:animate-none" />
        <div className="mt-7 grid gap-4">
          <div className="h-11 animate-pulse rounded bg-white/[0.05] motion-reduce:animate-none" />
          <div className="h-32 animate-pulse rounded bg-white/[0.05] motion-reduce:animate-none" />
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

    router.push("/authoring/ads-b");
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/authoring/ads-b"
          className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[13px] font-medium text-[#38a3dc] transition-colors hover:bg-white/[0.04] hover:text-[#7dd3fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7]"
        >
          <ArrowLeft aria-hidden size={15} />
          <span>Quay về danh sách</span>
        </Link>
      </div>

      {/* Main Header */}
      <header className="border-b border-white/[0.08] pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#38a3dc]">
          Kịch bản / ADS-B
        </p>
        <h1 className="mt-1.5 text-[28px] sm:text-[32px] font-semibold tracking-tight text-[#E6EDF5] leading-tight">
          {editing ? "Chỉnh sửa kịch bản" : "Tạo kịch bản mới"}
        </h1>
        <p className="mt-2 max-w-[640px] text-[13px] sm:text-[14px] leading-relaxed text-[#9AA9BC]">
          Hoàn thành năm phần để tạo trạng thái ban đầu, đáp án và sự cố phần cứng tùy chọn.
        </p>
      </header>

      {!isHydrated ? <WizardLoadingState /> : null}

      {isHydrated && editing && !scenario ? (
        <div className="rounded-[12px] border border-white/[0.08] bg-[#141f2a] px-5 py-12 text-center shadow-sm">
          <span className="mx-auto inline-flex size-12 items-center justify-center rounded-[10px] border border-amber-500/25 bg-amber-500/10 text-amber-400">
            <WarningCircle aria-hidden size={24} weight="regular" />
          </span>
          <h2 className="mt-4 text-[17px] font-semibold text-[#E6EDF5]">
            Không tìm thấy kịch bản
          </h2>
          <p className="mx-auto mt-2 max-w-[48ch] text-[13px] leading-relaxed text-[#9AA9BC]">
            Kịch bản có thể đã bị xóa hoặc đường dẫn không còn hợp lệ.
          </p>
          <div className="mt-5">
            <ButtonLink
              href="/authoring/ads-b"
              variant="primary"
              size="md"
            >
              Mở danh sách kịch bản
            </ButtonLink>
          </div>
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
