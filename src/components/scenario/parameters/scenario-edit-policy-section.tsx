import type { ScenarioEditPolicy } from "@/lib/scenario-policy";
import { ScenarioParametersSection } from "./scenario-parameters-section";

type PolicyField = { id: string; label: string; section: string; groupPath?: readonly string[] };
type PolicyGroup = { path: string[]; fields: PolicyField[]; children: Map<string, PolicyGroup> };

export function ScenarioEditPolicySection({ mode, fields, isAllowed, isOperable, onModeChange, onFieldChange, className }: {
  mode: ScenarioEditPolicy["mode"];
  fields: readonly PolicyField[];
  isAllowed: (fieldId: string) => boolean;
  isOperable: (fieldId: string) => boolean;
  onModeChange: (mode: ScenarioEditPolicy["mode"]) => void;
  onFieldChange: (fieldId: string, checked: boolean) => void;
  className?: string;
}) {
  const groups = new Map<string, PolicyGroup>();
  for (const field of fields) {
    let children = groups;
    let group: PolicyGroup | undefined;
    const path = field.groupPath?.length ? field.groupPath : [field.section];
    for (const [index, label] of path.entries()) {
      group = children.get(label);
      if (!group) {
        group = { path: path.slice(0, index + 1), fields: [], children: new Map() };
        children.set(label, group);
      }
      children = group.children;
    }
    group!.fields.push(field);
  }

  function renderGroup(group: PolicyGroup) {
    return <details key={group.path.join(" → ")} className="pmdt-config-section" aria-label={group.path.join(" → ")}>
      <summary>{group.path.at(-1)}</summary>
      <div className="pmdt-config-section-body selex-scenario-permissions">
        {group.fields.map((field) => <label key={field.id} title={!isOperable(field.id) ? "Trường được hệ thống bảo vệ; không cấp quyền sửa cho thí sinh." : undefined}>
          <input type="checkbox" data-scenario-policy-field-id={field.id} checked={isAllowed(field.id)} disabled={mode === "open" || !isOperable(field.id)} onChange={(event) => onFieldChange(field.id, event.target.checked)} />
          {field.label}{!isOperable(field.id) ? <small> — được bảo vệ</small> : null}
        </label>)}
        {[...group.children.values()].map(renderGroup)}
      </div>
    </details>;
  }
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
    {[...groups.values()].map(renderGroup)}
  </ScenarioParametersSection>;
}
