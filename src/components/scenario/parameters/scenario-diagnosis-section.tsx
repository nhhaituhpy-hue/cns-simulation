import type { ScenarioTaskTarget } from "@/lib/scenario-policy";
import { ScenarioParametersSection } from "./scenario-parameters-section";

interface DiagnosisSummary {
  disposition: "replace-module" | "software-adjustment";
  diagnosticRun: "full" | "on-air" | "not-required";
  diagnosticSubsystem: string;
  diagnosticResult: string;
  faultSummary: string;
  pmdtCheckpoints: readonly { id: string; label: string }[];
  requiredActionControlIds: readonly string[];
  manualReferences: readonly string[];
}

const actionLabels: Record<string, string> = {
  "config-apply": "Áp dụng cấu hình (Apply)",
  "diagnostics-run-full": "Chạy diagnostics đầy đủ (Full)",
  "diagnostics-run-on-air": "Chạy diagnostics On-air",
  "tx-transfer-tx1": "Chuyển máy phát sang TX1",
  "tx-transfer-tx2": "Chuyển máy phát sang TX2",
};

/** Authoring-only presenter; hardware identities are supplied by each model. */
export function ScenarioDiagnosisSection({ diagnosis, hardwareAnswers = [], taskTargets, fields, className }: {
  diagnosis?: DiagnosisSummary;
  hardwareAnswers?: readonly string[];
  taskTargets?: readonly ScenarioTaskTarget[];
  fields?: readonly { id: string; label: string }[];
  className?: string;
}) {
  return <ScenarioParametersSection number={4} title="Chẩn đoán hai bước" englishTitle="Diagnostic workflow"
    ariaLabel="Two-stage diagnostic workflow" className={className}
    help="Yêu cầu kiểm tra PMDT và xác định phần cứng. Kết luận mong đợi dưới đây là đáp án của người soạn.">
    {diagnosis ? <div className="selex-scenario-diagnosis">
      <p>{diagnosis.faultSummary}</p>
      <p><b>Kết luận PMDT mong đợi:</b> {diagnosis.diagnosticResult}</p>
      <p><b>Phân hệ:</b> {diagnosis.diagnosticSubsystem}</p>
      <p><b>Hướng xử lý:</b> {diagnosis.disposition === "replace-module" ? "Thay module/card" : "Hiệu chỉnh phần mềm; không thay phần cứng"}</p>
      <p><b>Chạy diagnostics:</b> {diagnosis.diagnosticRun === "full" ? "Full — đầy đủ" : diagnosis.diagnosticRun === "on-air" ? "On-air" : "Không yêu cầu"}</p>
      <strong>Bước 1 — Màn hình PMDT phải kiểm tra</strong>
      <ol>{diagnosis.pmdtCheckpoints.map((checkpoint) => <li key={checkpoint.id}>{checkpoint.label}</li>)}</ol>
      <strong>Thao tác phải thực hiện</strong>
      {diagnosis.requiredActionControlIds.length ? <ul>{diagnosis.requiredActionControlIds.map((id) => <li key={id}>{actionLabels[id] ?? id}</li>)}</ul> : <p>Không có lệnh PMDT bắt buộc bổ sung.</p>}
      <strong>Bước 2 — Đáp án phần cứng</strong>
      {hardwareAnswers.length ? <ul>{hardwareAnswers.map((answer) => <li key={answer}>{answer}</li>)}</ul> : <p>Xác nhận không cần thay phần cứng.</p>}
      <p className="selex-scenario-help">Đối chiếu đúng block và vị trí card của thiết bị, gồm TX/Monitor tương ứng.</p>
      <p><b>Căn cứ manual:</b> {diagnosis.manualReferences.join(" · ") || "Chưa có tham chiếu"}</p>
    </div> : <p className="pmdt-config-empty">Kịch bản này chưa cấu hình chẩn đoán hai bước.</p>}
    {taskTargets?.length ? <div className="selex-scenario-diagnosis">
      <strong>Mục tiêu thao tác đã cấu hình</strong>
      <ul>{taskTargets.map((target) => <li key={target.fieldId}>
        {fields?.find((field) => field.id === target.fieldId)?.label ?? target.fieldId}: {target.requirement === "inspect" ? "Kiểm tra" : "Thay đổi và Apply"}
      </li>)}</ul>
    </div> : null}
  </ScenarioParametersSection>;
}
