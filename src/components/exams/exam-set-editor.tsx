"use client";

import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { FloppyDisk } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveExamSetAction } from "@/lib/exams/actions";
import { ActionFeedback } from "./action-feedback";
import {
  Field,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  selectClassName,
  textareaClassName,
} from "./shared";

export type ExamModuleCode = "vor" | "dme" | "ads-b";

export interface ExamSubjectOption {
  id: string;
  code: string;
  name: string;
  modules: ExamModuleCode[];
}

export interface ExamScenarioOption {
  moduleCode: ExamModuleCode;
  scenarioId: string;
  title: string;
  description?: string;
}

interface EditableScenario {
  key: string;
  moduleCode: ExamModuleCode;
  scenarioId: string;
}

interface EditablePaper {
  key: string;
  id?: string;
  paperNumber: number;
  title: string;
  scenarios: EditableScenario[];
  saved: boolean;
}

interface EditableSubject {
  subjectId: string;
  papers: EditablePaper[];
}

export interface ExamSetEditorValue {
  id?: string;
  name: string;
  description: string;
  subjects: Array<{
    subjectId: string;
    papers: Array<{
      id?: string;
      paperNumber: number;
      title: string;
      scenarios: Array<{
        moduleCode: ExamModuleCode;
        scenarioId: string;
      }>;
    }>;
  }>;
}

function createKey() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function newPaper(paperNumber: number): EditablePaper {
  return {
    key: createKey(),
    paperNumber,
    title: `Đề số ${paperNumber}`,
    scenarios: [],
    saved: false,
  };
}

function toEditableSubjects(value?: ExamSetEditorValue): EditableSubject[] {
  return (
    value?.subjects.map((subject) => ({
      subjectId: subject.subjectId,
      papers: subject.papers.map((paper) => ({
        ...paper,
        key: paper.id ?? createKey(),
        saved: true,
        scenarios: paper.scenarios.map((scenario) => ({
          ...scenario,
          key: createKey(),
        })),
      })),
    })) ?? []
  );
}

function moduleLabel(moduleCode: ExamModuleCode) {
  if (moduleCode === "ads-b") return "ADS-B";
  return moduleCode.toUpperCase();
}

export function ExamSetEditor({
  subjects,
  scenarios,
  initialValue,
  readOnly = false,
}: {
  subjects: ExamSubjectOption[];
  scenarios: ExamScenarioOption[];
  initialValue?: ExamSetEditorValue;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialValue?.name ?? "");
  const [examSetId, setExamSetId] = useState(initialValue?.id);
  const [description, setDescription] = useState(initialValue?.description ?? "");
  const [selectedSubjects, setSelectedSubjects] = useState<EditableSubject[]>(() =>
    toEditableSubjects(initialValue),
  );
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [subjectToAdd, setSubjectToAdd] = useState("");
  const dirtyPaperKey = selectedSubjects
    .flatMap((subject) => subject.papers)
    .find((paper) => !paper.saved)?.key ?? null;

  const availableSubjects = useMemo(
    () => subjects.filter((subject) => !selectedSubjects.some((item) => item.subjectId === subject.id)),
    [selectedSubjects, subjects],
  );

  function addSubject() {
    if (!subjectToAdd || dirtyPaperKey) return;
    setSelectedSubjects((current) => [
      ...current,
      { subjectId: subjectToAdd, papers: [newPaper(1)] },
    ]);
    setSubjectToAdd("");
    setFeedback(null);
  }

  function updatePaper(subjectId: string, paperKey: string, update: (paper: EditablePaper) => EditablePaper) {
    if (dirtyPaperKey && dirtyPaperKey !== paperKey) {
      setFeedback({ tone: "error", message: "Hãy lưu đề đang chỉnh sửa trước khi chuyển sang đề khác." });
      return;
    }
    setSelectedSubjects((current) =>
      current.map((subject) =>
        subject.subjectId === subjectId
          ? {
              ...subject,
              papers: subject.papers.map((paper) =>
                paper.key === paperKey ? update({ ...paper, saved: false }) : paper,
              ),
            }
          : subject,
      ),
    );
    setFeedback(null);
  }

  function removePaper(subjectId: string, paperKey: string) {
    if (dirtyPaperKey && dirtyPaperKey !== paperKey) return;
    setSelectedSubjects((current) =>
      current.map((subject) => {
        if (subject.subjectId !== subjectId) return subject;
        return {
          ...subject,
          // Keep the remaining paper numbers stable. Renumbering would turn
          // already-saved papers into implicit edits before persistence.
          papers: subject.papers.filter((paper) => paper.key !== paperKey),
        };
      }),
    );
    setFeedback(null);
  }

  function validate(targetPaper?: { subjectId: string; paperKey: string }) {
    if (!name.trim()) return "Vui lòng nhập tên bộ đề thi.";
    if (selectedSubjects.length === 0) return "Bộ đề phải có ít nhất một môn thi.";
    for (const subject of selectedSubjects) {
      if (subject.papers.length === 0) return "Mỗi môn phải có ít nhất một đề thi.";
      for (const paper of subject.papers) {
        if (targetPaper && (targetPaper.subjectId !== subject.subjectId || targetPaper.paperKey !== paper.key)) {
          continue;
        }
        if (!paper.title.trim()) return `Vui lòng nhập tên cho Đề số ${paper.paperNumber}.`;
        if (paper.scenarios.length === 0) return `${paper.title} phải có ít nhất một kịch bản.`;
        if (paper.scenarios.some((scenario) => !scenario.scenarioId)) {
          return `Vui lòng chọn đầy đủ kịch bản trong ${paper.title}.`;
        }
      }
    }
    return null;
  }

  function payload(targetPaper?: { subjectId: string; paperKey: string }) {
    return {
      id: examSetId,
      name: name.trim(),
      description: description.trim(),
      subjects: selectedSubjects
        .map((subject) => ({
          subjectId: subject.subjectId,
          // A per-paper save includes the selected paper and all previously
          // confirmed papers. Incomplete browser drafts remain local.
          papers: subject.papers
            .filter((paper) => !targetPaper || paper.saved || (
              targetPaper.subjectId === subject.subjectId && targetPaper.paperKey === paper.key
            ))
            .map((paper) => ({
              id: paper.id,
              paperNumber: paper.paperNumber,
              title: paper.title.trim(),
              scenarios: paper.scenarios.map((scenario, position) => ({
                moduleCode: scenario.moduleCode,
                scenarioId: scenario.scenarioId,
                position: position + 1,
              })),
            })),
        }))
        .filter((subject) => subject.papers.length > 0),
    };
  }

  function save(targetPaper?: { subjectId: string; paperKey: string }) {
    if (targetPaper && dirtyPaperKey && dirtyPaperKey !== targetPaper.paperKey) {
      setFeedback({ tone: "error", message: "Hãy lưu đề đang chỉnh sửa trước khi chuyển sang đề khác." });
      return;
    }
    const validationError = validate(targetPaper);
    if (validationError) {
      setFeedback({ tone: "error", message: validationError });
      return;
    }

    startTransition(async () => {
      const result = await saveExamSetAction(payload(targetPaper), !targetPaper);
      if (!result.ok) {
        setFeedback({ tone: "error", message: result.message });
        return;
      }

      const savedId = result.data?.id ?? examSetId;
      if (savedId && savedId !== examSetId) {
        setExamSetId(savedId);
        router.replace(`/admin/exam-sets/${savedId}/edit`);
      }

      if (targetPaper) {
        setSelectedSubjects((current) =>
          current.map((subject) =>
            subject.subjectId === targetPaper.subjectId
              ? {
                  ...subject,
                  papers: subject.papers.map((paper) =>
                    paper.key === targetPaper.paperKey ? { ...paper, saved: true } : paper,
                  ),
                }
              : subject,
          ),
        );
        setFeedback({ tone: "success", message: "Đề thi đã được lưu. Bạn có thể tạo đề tiếp theo." });
      } else {
        router.push("/admin/exam-sets");
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-6 grid gap-5">
      {readOnly ? (
        <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm leading-6 text-[#78350f]">
          Bộ đề đã được sử dụng trong kỳ thi nên nội dung được giữ nguyên. Hãy nhân bản thành bộ đề mới nếu cần thay đổi.
        </div>
      ) : null}

      <section className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Thông tin bộ đề</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Field label="Tên bộ đề thi" htmlFor="exam-set-name" required>
            <input
              id="exam-set-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
              placeholder="Ví dụ: Bộ đề kiểm tra năng định CNS 2026"
              disabled={readOnly || isPending}
              required
            />
          </Field>
          <Field label="Mô tả" htmlFor="exam-set-description">
            <textarea
              id="exam-set-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={`${textareaClassName} min-h-10`}
              rows={1}
              placeholder="Phạm vi áp dụng hoặc ghi chú nội bộ"
              disabled={readOnly || isPending}
            />
          </Field>
        </div>
      </section>

      {!readOnly ? (
        <section className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Thêm môn thi vào bộ đề" htmlFor="exam-set-subject">
              <div className="relative">
                <select
                  id="exam-set-subject"
                  value={subjectToAdd}
                  onChange={(event) => setSubjectToAdd(event.target.value)}
                  className={`${selectClassName} min-w-64 appearance-none pr-9`}
                  disabled={availableSubjects.length === 0 || Boolean(dirtyPaperKey) || isPending}
                >
                  <option value="">Chọn môn thi</option>
                  {availableSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
                <CaretDown aria-hidden size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              </div>
            </Field>
            <button type="button" onClick={addSubject} disabled={!subjectToAdd || Boolean(dirtyPaperKey) || isPending} className={secondaryButtonClassName}>
              <Plus aria-hidden size={17} /> Thêm môn
            </button>
          </div>
        </section>
      ) : null}

      {selectedSubjects.map((selectedSubject) => {
        const subject = subjects.find((item) => item.id === selectedSubject.subjectId);
        if (!subject) return null;
        const availableScenarios = scenarios.filter((scenario) => subject.modules.includes(scenario.moduleCode));

        return (
          <section key={selectedSubject.subjectId} className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">{subject.name}</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Nguồn kịch bản: {subject.modules.map(moduleLabel).join(", ")}
                </p>
              </div>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={() => setSelectedSubjects((current) => current.filter((item) => item.subjectId !== selectedSubject.subjectId))}
                  disabled={Boolean(dirtyPaperKey) && !selectedSubject.papers.some((paper) => paper.key === dirtyPaperKey)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger-muted)]"
                >
                  <Trash aria-hidden size={16} /> Xóa môn
                </button>
              ) : null}
            </div>

            <div className="grid gap-4 p-4 sm:p-5">
              {selectedSubject.papers.map((paper) => (
                <article key={paper.key} className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent-muted)] font-mono text-xs font-bold text-[var(--accent)]">
                        {paper.paperNumber}
                      </span>
                      <input
                        aria-label={`Tên đề số ${paper.paperNumber}`}
                        value={paper.title}
                        onChange={(event) => updatePaper(selectedSubject.subjectId, paper.key, (current) => ({ ...current, title: event.target.value }))}
                        className={`${inputClassName} max-w-md font-semibold`}
                        disabled={readOnly || isPending || Boolean(dirtyPaperKey && dirtyPaperKey !== paper.key)}
                      />
                      {paper.saved ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#166534]">
                          <CheckCircle aria-hidden size={16} weight="fill" /> Đã lưu
                        </span>
                      ) : null}
                    </div>
                    {!readOnly && selectedSubject.papers.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removePaper(selectedSubject.subjectId, paper.key)}
                        disabled={Boolean(dirtyPaperKey && dirtyPaperKey !== paper.key)}
                        className="inline-flex size-9 items-center justify-center self-end rounded-md text-[var(--danger)] hover:bg-[var(--danger-muted)] sm:self-auto"
                        aria-label={`Xóa ${paper.title}`}
                      >
                        <Trash aria-hidden size={17} />
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-md border border-[var(--border)] bg-white">
                    <table className="w-full min-w-[720px] border-collapse text-left">
                      <caption className="sr-only">Danh sách kịch bản của {paper.title}</caption>
                      <thead className="bg-[var(--surface-muted)] text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-secondary)]">
                        <tr>
                          <th className="w-16 border-b border-[var(--border)] px-3 py-2.5">STT</th>
                          <th className="w-28 border-b border-[var(--border)] px-3 py-2.5">Module</th>
                          <th className="border-b border-[var(--border)] px-3 py-2.5">Kịch bản</th>
                          <th className="w-16 border-b border-[var(--border)] px-3 py-2.5"><span className="sr-only">Xóa</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {paper.scenarios.map((selectedScenario, scenarioIndex) => (
                          <tr key={selectedScenario.key}>
                            <td className="px-3 py-2.5 font-mono text-xs text-[var(--text-secondary)]">{scenarioIndex + 1}</td>
                            <td className="px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)]">{moduleLabel(selectedScenario.moduleCode)}</td>
                            <td className="px-3 py-2.5">
                              <select
                                aria-label={`Kịch bản thứ ${scenarioIndex + 1} trong ${paper.title}`}
                                value={selectedScenario.scenarioId ? `${selectedScenario.moduleCode}:${selectedScenario.scenarioId}` : ""}
                                onChange={(event) => {
                                  const [moduleCode, ...scenarioParts] = event.target.value.split(":");
                                  updatePaper(selectedSubject.subjectId, paper.key, (current) => ({
                                    ...current,
                                    scenarios: current.scenarios.map((item) =>
                                      item.key === selectedScenario.key
                                        ? {
                                            ...item,
                                            moduleCode: (moduleCode || subject.modules[0]) as ExamModuleCode,
                                            scenarioId: scenarioParts.join(":"),
                                          }
                                        : item,
                                    ),
                                  }));
                                }}
                                className={selectClassName}
                                disabled={readOnly || isPending || Boolean(dirtyPaperKey && dirtyPaperKey !== paper.key)}
                              >
                                <option value="">Chọn kịch bản</option>
                                {subject.modules.map((moduleCode) => (
                                  <optgroup key={moduleCode} label={moduleLabel(moduleCode)}>
                                    {availableScenarios
                                      .filter((scenario) => scenario.moduleCode === moduleCode)
                                      .map((scenario) => (
                                        <option key={`${moduleCode}:${scenario.scenarioId}`} value={`${moduleCode}:${scenario.scenarioId}`}>
                                          {scenario.title}
                                        </option>
                                      ))}
                                  </optgroup>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {!readOnly ? (
                                <button
                                  type="button"
                                  onClick={() => updatePaper(selectedSubject.subjectId, paper.key, (current) => ({
                                    ...current,
                                    scenarios: current.scenarios.filter((item) => item.key !== selectedScenario.key),
                                  }))}
                                  disabled={Boolean(dirtyPaperKey && dirtyPaperKey !== paper.key)}
                                  className="inline-flex size-8 items-center justify-center rounded-md text-[var(--danger)] hover:bg-[var(--danger-muted)]"
                                  aria-label={`Xóa kịch bản thứ ${scenarioIndex + 1}`}
                                >
                                  <Trash aria-hidden size={16} />
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                        {paper.scenarios.length === 0 ? (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">Chưa có kịch bản trong đề này.</td></tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  {!readOnly ? (
                    <div className="mt-3 flex flex-wrap justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => updatePaper(selectedSubject.subjectId, paper.key, (current) => ({
                          ...current,
                          scenarios: [
                            ...current.scenarios,
                            { key: createKey(), moduleCode: subject.modules[0], scenarioId: "" },
                          ],
                        }))}
                        disabled={Boolean(dirtyPaperKey && dirtyPaperKey !== paper.key)}
                        className={secondaryButtonClassName}
                      >
                        <Plus aria-hidden size={17} /> Thêm kịch bản
                      </button>
                      <button
                        type="button"
                        onClick={() => save({ subjectId: selectedSubject.subjectId, paperKey: paper.key })}
                        disabled={paper.saved || isPending || Boolean(dirtyPaperKey && dirtyPaperKey !== paper.key)}
                        className={primaryButtonClassName}
                      >
                        <FloppyDisk aria-hidden size={17} /> {isPending ? "Đang lưu..." : "Lưu đề này"}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}

              {!readOnly ? (
                <button
                  type="button"
                  onClick={() => setSelectedSubjects((current) =>
                    current.map((item) =>
                      item.subjectId === selectedSubject.subjectId
                        ? {
                            ...item,
                            papers: [
                              ...item.papers,
                              newPaper(Math.max(0, ...item.papers.map((paper) => paper.paperNumber)) + 1),
                            ],
                          }
                        : item,
                    ),
                  )}
                  disabled={Boolean(dirtyPaperKey) || isPending}
                  className={`${secondaryButtonClassName} justify-self-start`}
                  title={dirtyPaperKey ? "Hãy lưu đề hiện tại trước khi thêm đề mới" : undefined}
                >
                  <Plus aria-hidden size={17} /> Thêm đề tiếp theo
                </button>
              ) : null}
            </div>
          </section>
        );
      })}

      {feedback ? <ActionFeedback tone={feedback.tone} message={feedback.message} /> : null}

      {!readOnly ? (
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-5">
          <button type="button" onClick={() => router.push("/admin/exam-sets")} className={secondaryButtonClassName}>Hủy</button>
          <button type="button" onClick={() => save()} disabled={isPending} className={primaryButtonClassName}>
            <FloppyDisk aria-hidden size={18} /> {isPending ? "Đang lưu..." : "Lưu bộ đề thi"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
