import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import type { HardwareGradingResult as HardwareResult } from "@/lib/grading";
import type { HardwareComponent } from "@/lib/hardware-model";
import type { ScenarioHardwareFault } from "@/lib/types";

type HardwareGradingResultProps = {
  result: HardwareResult;
  expectedComponent: HardwareComponent;
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

export function HardwareGradingResult({
  result,
  expectedComponent,
  hardwareFault,
  onRetry,
}: HardwareGradingResultProps) {
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="hardware-result-title"
      className="w-full max-w-2xl overflow-hidden rounded-lg border border-[#40566b] bg-white shadow-[0_22px_65px_rgb(15_23_42/0.38)]"
    >
      <header className="border-b border-[#172033] bg-[#263746] px-5 py-4 text-white">
        <p className="text-xs text-[#cbd5e1]">Hardware diagnosis</p>
        <h2 id="hardware-result-title" className="mt-1 text-xl font-bold">
          Ket qua chan doan phan cung
        </h2>
      </header>

      <div className="p-5">
        <ul className="space-y-3">
          <ResultLine passed={result.correctComponent}>
            Correct faulty component: {expectedComponent.name} ({expectedComponent.eplId})
          </ResultLine>
          <ResultLine passed={result.terminalInspected}>
            Terminal inspected
          </ResultLine>
          <ResultLine passed={result.monitoringInspected}>
            QCMS monitoring inspected
          </ResultLine>
          <li className="flex items-start gap-2 text-sm">
            <Warning aria-hidden size={19} weight="fill" className={result.componentInspectionScore === 20 ? "text-green-600" : "text-amber-600"} />
            <span className="text-[#334155]">
              Inspected {result.inspectedComponentCount} component(s)
              ({result.componentInspectionScore}/20 points)
            </span>
          </li>
        </ul>

        <div className="mt-5 rounded border border-[#b8c4ce] bg-[#edf2f5] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#475569]">Score</p>
          <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-[#172033]">
            {result.score}/100
          </p>
        </div>

        <section className="mt-5 rounded border border-[#bfdbfe] bg-[#eff6ff] p-4">
          <h3 className="text-sm font-bold text-[#1e3a5f]">Explanation</h3>
          <p className="mt-2 text-sm leading-6 text-[#334155]">
            {expectedComponent.name} ({expectedComponent.eplId}): {hardwareFault.faultDescription}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#334155]">
            This fault drives the target sensor to{" "}
            <strong className="uppercase">{hardwareFault.expectedSensorStatus}</strong>.
            {hardwareFault.qcmsSymptoms[0]
              ? " " + hardwareFault.qcmsSymptoms[0] + "."
              : ""}
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs leading-5 text-[#475569]">
            {hardwareFault.diagnosticSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <footer className="mt-5 flex flex-col-reverse gap-2 border-t border-[#e2e8f0] pt-4 sm:flex-row sm:justify-between">
          <button type="button" onClick={onRetry} className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[#94a3b8] bg-white px-4 text-sm font-bold text-[#334155] hover:bg-[#f8fafc]">
            <ArrowLeft aria-hidden size={17} />
            Retry
          </button>
          <Link href="/student" className="inline-flex min-h-10 items-center justify-center rounded bg-[#2563eb] px-4 text-sm font-bold text-white hover:bg-[#1d4ed8]">
            Back to scenario list
          </Link>
        </footer>
      </div>
    </section>
  );
}
