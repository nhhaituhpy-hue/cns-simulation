"use client";

import { NotePencil } from "@phosphor-icons/react/dist/csr/NotePencil";
import Link from "next/link";
import {
  ScenarioListFrame,
  ScenarioSectionHeader,
} from "@/components/ui/exam-workspace";
import { ScenarioDataTable } from "@/components/ui/scenario-data-table";

type ReviewModuleId = "dvor-220" | "dme-320";

const moduleCopy: Record<
  ReviewModuleId,
  { shortName: string; title: string; description: string }
> = {
  "dvor-220": {
    shortName: "DVOR 220",
    title: "Thực hành xử lý sự cố DVOR 220",
    description:
      "Chọn một tình huống đã được giám khảo đưa vào danh sách ôn tập để thực hành trên PMDT/LMI MOPIENS 220.",
  },
  "dme-320": {
    shortName: "DME 320",
    title: "Thực hành xử lý sự cố DME 320",
    description:
      "Chọn một tình huống đã được giám khảo đưa vào danh sách ôn tập để thực hành trên PMDT/LMI MOPIENS 320.",
  },
};

const difficultyDetails = {
  basic: {
    label: "Cơ bản",
    className: "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]",
  },
  intermediate: {
    label: "Trung bình",
    className: "border-[#fde68a] bg-[#fffbeb] text-[#92400e]",
  },
  advanced: {
    label: "Nâng cao",
    className: "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]",
  },
} as const;

const scenarioColumns = [
  { id: "number", label: "STT", className: "w-16" },
  { id: "title", label: "Tiêu đề" },
  { id: "difficulty", label: "Mức độ", className: "w-28" },
  { id: "actions", label: "Thao tác", className: "w-24 text-right" },
];

export type OperationsReviewScenarioRow = {
  id: string;
  title: string;
  description: string;
  difficulty: keyof typeof difficultyDetails;
  href: string;
};

export function OperationsReviewDashboard({
  moduleId,
  scenarios = [],
}: {
  moduleId: ReviewModuleId;
  scenarios?: OperationsReviewScenarioRow[];
}) {
  const copy = moduleCopy[moduleId];

  return (
    <div className="w-full max-w-none px-4 py-3 sm:px-6 lg:px-8 lg:py-4 xl:px-10 2xl:px-12">
      <section aria-labelledby={`${moduleId}-practice-title`} className="mt-0">
        <ScenarioSectionHeader
          id={`${moduleId}-practice-title`}
          title={copy.title}
          description={copy.description}
          count={scenarios.length}
          countLabel="bài"
        />

        <ScenarioListFrame>
          <ScenarioDataTable
            items={scenarios}
            caption={`Danh sách tình huống ${copy.shortName} dành cho học viên`}
            columns={scenarioColumns}
            emptySearchMessage={`Chưa có tình huống ${copy.shortName} nào được gắn vào ôn tập.`}
            renderCells={(scenario, rowIndex) => {
              const difficulty = difficultyDetails[scenario.difficulty];
              return (
                <>
                  <td className="px-4 py-4 align-top">
                    <span className="inline-flex size-8 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface-muted)] text-xs font-bold tabular-nums text-[var(--text-secondary)]">
                      {String(rowIndex + 1).padStart(2, "0")}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                      {scenario.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[var(--text-secondary)]">
                      {scenario.description}
                    </p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${difficulty.className}`}>
                      {difficulty.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right align-top">
                    <Link
                      href={scenario.href}
                      aria-label={`Bắt đầu bài ${copy.shortName}: ${scenario.title}`}
                      title="Bắt đầu bài thực hành"
                      className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--accent-border)] bg-[var(--surface)] text-[var(--accent)] transition-[background-color,border-color,transform] duration-150 hover:bg-[var(--accent-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      <NotePencil aria-hidden size={19} weight="regular" />
                    </Link>
                  </td>
                </>
              );
            }}
          />
        </ScenarioListFrame>
      </section>
    </div>
  );
}
