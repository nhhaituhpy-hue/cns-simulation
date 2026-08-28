"use client";

import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { NotePencil } from "@phosphor-icons/react/dist/csr/NotePencil";
import Link from "next/link";
import {
  EmptyState,
  ScenarioListFrame,
  ScenarioSectionHeader,
} from "@/components/ui/exam-workspace";
import { ScenarioDataTable } from "@/components/ui/scenario-data-table";
import {
  DVOR1150_STUDENT_SCENARIOS,
  type Dvor1150ScenarioDifficulty,
} from "@/lib/dvor1150";

export interface Dvor1150StudentScenarioRow {
  id: string;
  title: string;
  description: string;
  difficulty: Dvor1150ScenarioDifficulty;
}

const difficultyDetails: Record<
  Dvor1150ScenarioDifficulty,
  { label: string; className: string }
> = {
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
};

const defaultScenarioRows: Dvor1150StudentScenarioRow[] = DVOR1150_STUDENT_SCENARIOS.map((scenario) => {
  const definition = scenario.create();
  return {
    id: scenario.id,
    title: definition.name,
    description: definition.description,
    difficulty: definition.difficulty,
  };
});

const scenarioColumns = [
  { id: "number", label: "STT", className: "w-16" },
  { id: "title", label: "Tiêu đề" },
  { id: "difficulty", label: "Mức độ", className: "w-28" },
  { id: "actions", label: "Thao tác", className: "w-24 text-right" },
];

export function Dvor1150StudentDashboard({
  scenarios = defaultScenarioRows,
}: {
  scenarios?: Dvor1150StudentScenarioRow[];
} = {}) {
  return (
    <section aria-labelledby="dvor1150-practice-title" className="mt-0">
      <ScenarioSectionHeader
        id="dvor1150-practice-title"
        title="Thực hành xử lý sự cố DVOR 1150"
        description="Chọn một kịch bản trước, sau đó kiểm tra PMDT, ghi nhận thao tác và hoàn thiện kết luận sự cố."
        count={scenarios.length}
        countLabel="bài"
      />

      <ScenarioListFrame>
        {scenarios.length === 0 ? (
          <EmptyState
            icon={<FolderOpen aria-hidden size={23} weight="duotone" />}
            title="Chưa có kịch bản DVOR 1150"
            description="Chưa có kịch bản được cung cấp cho học viên. Vui lòng quay lại sau khi giám khảo bổ sung bài thực hành."
          />
        ) : (
          <ScenarioDataTable
            items={scenarios}
            caption="Danh sách kịch bản DVOR 1150 dành cho học viên"
            columns={scenarioColumns}
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
                      href={`/student/dvor-1150/session?id=${encodeURIComponent(scenario.id)}`}
                      aria-label={`Bắt đầu bài DVOR 1150: ${scenario.title}`}
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
        )}
      </ScenarioListFrame>
    </section>
  );
}
