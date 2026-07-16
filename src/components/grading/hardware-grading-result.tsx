import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import type { HardwareComponent } from "@/lib/hardware-model";
import type {
  CombinedGradingResult as CombinedResult,
  ScenarioHardwareFault,
} from "@/lib/types";

type HardwareGradingResultProps = {
  result: CombinedResult;
  expectedComponents: HardwareComponent[];
  hardwareFault: ScenarioHardwareFault;
  onRetry: () => void;
};

function ResultLine({
  passed,
  children,
}: {
  passed: boolean;
  children: React.ReactNode;
}) {
  const Icon = passed ? CheckCircle : XCircle;
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon
        aria-hidden
        size={19}
        weight="fill"
        className={passed ? "text-green-600" : "text-red-600"}
      />
      <span className="text-[#334155]">{children}</span>
    </li>
  );
}

function componentNames(
  ids: readonly string[],
  components: readonly HardwareComponent[],
): string {
  return ids
    .map((id) => {
      const component = components.find((candidate) => candidate.id === id);
      return component ? `${component.name} (${component.eplId})` : id;
    })
    .join(", ");
}

export function HardwareGradingResult({
  result,
  expectedComponents,
  hardwareFault,
  onRetry,
}: HardwareGradingResultProps) {
  const hardware = result.hardwareResult;

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="hardware-result-title"
      className="w-full max-w-3xl overflow-hidden rounded-lg border border-[#40566b] bg-white shadow-[0_22px_65px_rgb(15_23_42/0.38)]"
    >
      <header className="border-b border-[#172033] bg-[#263746] px-5 py-4 text-white">
        <p className="text-xs text-[#cbd5e1]">Kết quả bài thực hành</p>
        <h2 id="hardware-result-title" className="mt-1 text-xl font-bold">
          {result.passed ? "Đạt yêu cầu" : "Chưa đạt yêu cầu"}
        </h2>
      </header>

      <div className="p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded border border-[#b8c4ce] bg-[#edf2f5] p-4">
            <p className="text-xs font-bold uppercase text-[#475569]">Tổng điểm</p>
            <p className="mt-1 font-mono text-3xl font-bold text-[#172033]">
              {result.score}/100
            </p>
          </div>
          <div className="rounded border border-[#b8c4ce] bg-white p-4">
            <p className="text-xs font-bold uppercase text-[#475569]">Terminal</p>
            <p className="mt-1 font-mono text-2xl font-bold text-[#172033]">
              {result.terminalScore}/70
            </p>
          </div>
          <div className="rounded border border-[#b8c4ce] bg-white p-4">
            <p className="text-xs font-bold uppercase text-[#475569]">Phần cứng</p>
            <p className="mt-1 font-mono text-2xl font-bold text-[#172033]">
              {hardware.score}/30
            </p>
          </div>
        </div>

        <ul className="mt-5 space-y-3">
          <ResultLine passed={result.authenticatedCorrectly}>
            Đăng nhập đúng tài khoản và địa chỉ IP thiết bị
          </ResultLine>
          <ResultLine passed={result.terminalResult.passed}>
            Chuỗi thao tác Terminal: đúng {result.terminalResult.correctSteps}/
            {result.terminalResult.totalExpected} bước
          </ResultLine>
          <ResultLine passed={hardware.exactMatch}>
            Danh sách phần cứng nghi ngờ:{" "}
            {hardware.exactMatch ? "chính xác" : "chưa chính xác"}
          </ResultLine>
          {hardware.missedComponentIds.length > 0 ? (
            <li className="flex items-start gap-2 text-sm text-amber-800">
              <Warning aria-hidden size={19} weight="fill" />
              Bỏ sót:{" "}
              {componentNames(hardware.missedComponentIds, expectedComponents)}
            </li>
          ) : null}
          {hardware.extraComponentIds.length > 0 ? (
            <li className="flex items-start gap-2 text-sm text-amber-800">
              <Warning aria-hidden size={19} weight="fill" />
              Đánh dấu thừa:{" "}
              {componentNames(hardware.extraComponentIds, expectedComponents)}
            </li>
          ) : null}
        </ul>

        <section className="mt-5 rounded border border-[#bfdbfe] bg-[#eff6ff] p-4">
          <h3 className="text-sm font-bold text-[#1e3a5f]">Đáp án phần cứng</h3>
          <p className="mt-2 text-sm leading-6 text-[#334155]">
            {componentNames(
              hardware.expectedComponentIds,
              hardwareFault.hardwareLayout,
            )}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#334155]">
            {hardwareFault.faultDescription}
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs leading-5 text-[#475569]">
            {hardwareFault.diagnosticSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <footer className="mt-5 flex flex-col-reverse gap-2 border-t border-[#e2e8f0] pt-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[#94a3b8] bg-white px-4 text-sm font-bold text-[#334155] hover:bg-[#f8fafc]"
          >
            <ArrowLeft aria-hidden size={17} />
            Làm lại
          </button>
          <Link
            href="/student"
            className="inline-flex min-h-10 items-center justify-center rounded bg-[#2563eb] px-4 text-sm font-bold text-white hover:bg-[#1d4ed8]"
          >
            Về danh sách bài
          </Link>
        </footer>
      </div>
    </section>
  );
}