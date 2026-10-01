import type { ScenarioEditPolicy } from "@/lib/scenario-policy";
import { ScenarioParametersSection } from "./scenario-parameters-section";

export function ScenarioEditPolicySection({ mode, fields, isAllowed, isOperable, onModeChange, onFieldChange, className }: {
  mode: ScenarioEditPolicy["mode"];
  fields: readonly { id: string; label: string; section: string }[];
  isAllowed: (fieldId: string) => boolean;
  isOperable: (fieldId: string) => boolean;
  onModeChange: (mode: ScenarioEditPolicy["mode"]) => void;
  onFieldChange: (fieldId: string, checked: boolean) => void;
  className?: string;
}) {
  const sections = [...new Set(fields.map((field) => field.section))];
  return <ScenarioParametersSection number={5} title="Quyền chỉnh sửa của thí sinh" englishTitle="Student edit policy"
    ariaLabel="Student recovery controls" className={className}
    help="Quyền sửa độc lập với điều kiện đạt và thao tác bắt buộc. Các khóa bảo mật và điều kiện vận hành PMDT vẫn áp dụng.">
    <label><span>Chế độ / Edit policy</span><select value={mode} onChange={(event) => onModeChange(event.target.value as ScenarioEditPolicy["mode"])}>
      <option value="open">Open — các trường nghiệp vụ an toàn</option>
      <option value="restricted">Restricted — chỉ các trường đã chọn</option>
    </select></label>
    <p className="selex-scenario-help">{mode === "open"
      ? "Các trường được phép cho thí sinh thao tác đã được đánh dấu. Trường chỉ đọc, bảo mật, runtime và trường riêng của người soạn vẫn được bảo vệ."
      : "Tích những trường thí sinh được phép sửa. Danh sách rỗng nghĩa là không cho sửa cấu hình; bài chẩn đoán vẫn có thể sử dụng các lệnh được PMDT cho phép."}</p>
    {sections.map((section) => <details key={section} className="pmdt-config-section">
      <summary>{section}</summary>
      <div className="pmdt-config-section-body selex-scenario-permissions">
        {fields.filter((field) => field.section === section).map((field) => <label key={field.id} title={!isOperable(field.id) ? "Trường được hệ thống bảo vệ; không cấp quyền sửa cho thí sinh." : undefined}>
          <input type="checkbox" checked={isAllowed(field.id)} disabled={mode === "open" || !isOperable(field.id)} onChange={(event) => onFieldChange(field.id, event.target.checked)} />
          {field.label}{!isOperable(field.id) ? <small> — được bảo vệ</small> : null}
        </label>)}
      </div>
    </details>)}
  </ScenarioParametersSection>;
}
