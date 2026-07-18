import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { ArrowDown } from "@phosphor-icons/react/dist/csr/ArrowDown";
import { ArrowUp } from "@phosphor-icons/react/dist/csr/ArrowUp";
import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { SignOut } from "@phosphor-icons/react/dist/csr/SignOut";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { useState } from "react";
import { TerminalEngine, type TerminalProcessResult } from "@/lib/terminal-engine";
import type { MenuItem } from "@/lib/menu-data";
import type { LoginUser, RecordedAction } from "@/lib/types";
import { renumberActions } from "./scenario-form-utils";

type ActionBuilderProps = {
  loginUser: LoginUser;
  sensorName: string;
  actions: RecordedAction[];
  error?: string;
  onChange: (actions: RecordedAction[]) => void;
};

type PendingUiInteraction = {
  item: MenuItem;
  type: "display" | "input" | "toggle";
};

function createInitialEngineSession(
  loginUser: LoginUser,
  sensorName: string,
  actions: readonly RecordedAction[],
) {
  const engine = new TerminalEngine({
    targetLoginUser: loginUser,
    header: sensorName.trim() ? { sensorName: sensorName.trim() } : undefined,
  });
  let output = engine.renderCurrentMenu();
  let pendingInteraction: PendingUiInteraction | null = null;

  for (const action of actions) {
    if (action.kind === "authentication") {
      continue;
    }

    const wasPending = engine.getState().pendingInteraction !== null;
    const menuBeforeInput = engine.getCurrentMenu();
    if (menuBeforeInput.id !== action.menuId) {
      engine.reset();
      output = engine.renderCurrentMenu();
      pendingInteraction = null;
      break;
    }

    const selectedItem = wasPending
      ? undefined
      : menuBeforeInput.items.find(
          (item) => String(item.number) === action.input,
        );
    const result = engine.processInput(action.input);
    output = result.output;

    if (
      result.accepted &&
      selectedItem &&
      (selectedItem.action.type === "display" ||
        selectedItem.action.type === "input" ||
        selectedItem.action.type === "toggle")
    ) {
      pendingInteraction = {
        item: selectedItem,
        type: selectedItem.action.type,
      };
    } else if (result.accepted) {
      pendingInteraction = null;
    }
  }

  return { engine, output, pendingInteraction };
}

function toRecordedAction(
  result: TerminalProcessResult,
  step: number,
): RecordedAction | null {
  if (!result.accepted || !result.recordableAction) {
    return null;
  }

  return {
    ...result.recordableAction,
    step,
    timestamp: Date.now(),
  };
}

export function ActionBuilder({
  loginUser,
  sensorName,
  actions,
  error,
  onChange,
}: ActionBuilderProps) {
  const [initialSession] = useState(() =>
    createInitialEngineSession(loginUser, sensorName, actions),
  );
  const engine = initialSession.engine;
  const [terminalOutput, setTerminalOutput] = useState(initialSession.output);
  const [pendingInteraction, setPendingInteraction] =
    useState<PendingUiInteraction | null>(initialSession.pendingInteraction);
  const [inputValue, setInputValue] = useState("");

  const engineState = engine.getState();
  const currentMenu = engine.getCurrentMenu();

  function applyInput(input: string) {
    const result = engine.processInput(input);
    const recordedAction = toRecordedAction(result, actions.length + 1);

    setTerminalOutput(result.output);

    if (recordedAction) {
      onChange([...actions, recordedAction]);
    }

    return result;
  }

  function selectMenuItem(item: MenuItem) {
    const result = applyInput(String(item.number));

    if (!result.accepted) {
      return;
    }

    if (
      item.action.type === "display" ||
      item.action.type === "input" ||
      item.action.type === "toggle"
    ) {
      setPendingInteraction({ item, type: item.action.type });
      setInputValue("");
    } else {
      setPendingInteraction(null);
    }
  }

  function completePending(input: string) {
    const result = applyInput(input);
    if (result.accepted) {
      setPendingInteraction(null);
      setInputValue("");
    }
  }

  function resetExplorer() {
    engine.reset();
    setPendingInteraction(null);
    setInputValue("");
    setTerminalOutput(engine.renderCurrentMenu());
  }

  function moveAction(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= actions.length) {
      return;
    }

    const nextActions = [...actions];
    [nextActions[index], nextActions[targetIndex]] = [
      nextActions[targetIndex],
      nextActions[index],
    ];
    onChange(renumberActions(nextActions));
  }

  function removeAction(index: number) {
    onChange(renumberActions(actions.filter((_, actionIndex) => actionIndex !== index)));
  }

  return (
    <div className="grid gap-6">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Chuỗi thao tác chuẩn
        </h3>
        <p className="mt-1 max-w-[70ch] text-sm leading-6 text-[var(--text-secondary)]">
          Chọn trực tiếp trên cây menu. Mỗi thao tác hợp lệ được ghi lại cùng ngữ cảnh terminal hiện tại.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)]">
        <section
          aria-labelledby="menu-explorer-title"
          className="rounded-lg border border-[var(--border)] bg-white p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)]">
                Menu hiện tại
              </p>
              <h4
                id="menu-explorer-title"
                className="mt-1 text-base font-semibold text-[var(--text-primary)]"
              >
                {currentMenu.title}
              </h4>
            </div>
            <button
              type="button"
              onClick={resetExplorer}
              className="inline-flex h-9 items-center gap-2 rounded border border-[var(--border-strong)] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <ArrowCounterClockwise aria-hidden size={16} weight="regular" />
              Đặt lại menu
            </button>
          </div>

          {engineState.exited ? (
            <div className="mt-5 rounded border border-[var(--border)] bg-[var(--background)] p-5 text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Ứng dụng bảo trì đã kết thúc
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Đặt lại menu để tiếp tục thêm thao tác.
              </p>
            </div>
          ) : pendingInteraction ? (
            <div className="mt-5 rounded border border-[var(--accent)] bg-[var(--accent-muted)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {pendingInteraction.item.label}
              </p>

              {pendingInteraction.type === "display" ? (
                <button
                  type="button"
                  onClick={() => completePending("")}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                >
                  <Check aria-hidden size={17} weight="regular" />
                  Tiếp tục bằng RETURN
                </button>
              ) : null}

              {pendingInteraction.type === "toggle" &&
              pendingInteraction.item.action.type === "toggle" ? (
                <div className="mt-4 grid gap-2">
                  <p className="text-xs font-medium text-[var(--text-secondary)]">
                    {pendingInteraction.item.action.prompt}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {pendingInteraction.item.action.options.map((option) => (
                      <button
                        key={option.number}
                        type="button"
                        onClick={() => completePending(String(option.number))}
                        className="flex min-h-10 items-center gap-3 rounded border border-[var(--border-strong)] bg-white px-3 text-left text-sm text-[var(--text-primary)] hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      >
                        <code className="font-mono text-xs font-semibold text-[var(--accent)]">
                          {option.number}
                        </code>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {pendingInteraction.type === "input" &&
              pendingInteraction.item.action.type === "input" ? (
                <div className="mt-4 grid gap-2">
                  <label
                    htmlFor="expected-terminal-input"
                    className="text-xs font-medium text-[var(--text-secondary)]"
                  >
                    {pendingInteraction.item.action.prompt}
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="expected-terminal-input"
                      type={
                        pendingInteraction.item.action.sensitive
                          ? "password"
                          : "text"
                      }
                      value={inputValue}
                      onChange={(event) => setInputValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          completePending(inputValue);
                        }
                      }}
                      autoComplete="off"
                      className="h-10 min-w-0 flex-1 rounded border border-[var(--border-strong)] bg-white px-3 font-mono text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                    <button
                      type="button"
                      onClick={() => completePending(inputValue)}
                      disabled={!inputValue.trim()}
                      className="h-10 shrink-0 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Ghi giá trị
                    </button>
                  </div>
                  {pendingInteraction.item.action.sensitive ? (
                    <p className="text-xs leading-5 text-[var(--text-secondary)]">
                      Giá trị nhạy cảm được engine xử lý nhưng không lưu trong đáp án.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 grid gap-2">
              {currentMenu.items.map((item) => (
                <button
                  key={item.number}
                  type="button"
                  onClick={() => selectMenuItem(item)}
                  className="grid min-h-11 grid-cols-[2.5rem_1fr] items-center rounded border border-[var(--border)] px-3 text-left text-sm text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--accent-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <code className="font-mono text-xs font-semibold text-[var(--accent)]">
                    {item.number}
                  </code>
                  <span>{item.label}</span>
                </button>
              ))}

              <div className="mt-2 grid gap-2 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => applyInput("0")}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[var(--border-strong)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <CaretLeft aria-hidden size={17} weight="regular" />
                  Menu trước
                </button>
                <button
                  type="button"
                  onClick={() => applyInput("X")}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[var(--border-strong)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <SignOut aria-hidden size={17} weight="regular" />
                  Kết thúc ứng dụng
                </button>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="terminal-preview-title" className="min-w-0">
          <div className="flex h-full min-h-96 flex-col overflow-hidden rounded-lg border border-[#262626] bg-black shadow-[var(--shadow-panel)]">
            <div className="flex h-10 shrink-0 items-center border-b border-[#262626] bg-[#171717] px-4">
              <h4
                id="terminal-preview-title"
                className="font-mono text-xs font-semibold text-[#d4d4d4]"
              >
                Xem trước terminal
              </h4>
            </div>
            <pre
              role="log"
              aria-live="polite"
              className="min-h-0 flex-1 overflow-auto whitespace-pre p-4 font-mono text-xs leading-5 text-[#e4e4e7]"
            >
              {terminalOutput}
            </pre>
          </div>
        </section>
      </div>

      <section aria-labelledby="expected-actions-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h4
              id="expected-actions-title"
              className="text-sm font-semibold text-[var(--text-primary)]"
            >
              Thao tác đã ghi
            </h4>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Dùng nút lên và xuống để thay đổi thứ tự chấm điểm.
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">
            {actions.length} thao tác
          </span>
        </div>

        {actions.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-[var(--border-strong)] bg-white px-4 py-8 text-center">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Chưa có thao tác chuẩn
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Chọn một mục trong cây menu để bắt đầu ghi.
            </p>
          </div>
        ) : (
          <ol className="mt-4 grid gap-2">
            {actions.map((action, index) => (
              <li
                key={`${action.timestamp}-${index}`}
                className="grid gap-3 rounded border border-[var(--border)] bg-white p-3 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center"
              >
                <span className="flex size-8 items-center justify-center rounded bg-[var(--surface-muted)] font-mono text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {action.resultLabel}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-[var(--text-secondary)]">
                    {action.menuTitle} | input: {action.input}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveAction(index, -1)}
                    disabled={index === 0}
                    className="inline-flex size-9 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`Đưa thao tác ${index + 1} lên`}
                  >
                    <ArrowUp aria-hidden size={17} weight="regular" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveAction(index, 1)}
                    disabled={index === actions.length - 1}
                    className="inline-flex size-9 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`Đưa thao tác ${index + 1} xuống`}
                  >
                    <ArrowDown aria-hidden size={17} weight="regular" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAction(index)}
                    className="inline-flex size-9 items-center justify-center rounded text-[#b91c1c] hover:bg-[#fef2f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c]"
                    aria-label={`Xóa thao tác ${index + 1}`}
                  >
                    <Trash aria-hidden size={17} weight="regular" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}

        {error ? (
          <p role="alert" className="mt-3 text-sm text-[#b91c1c]">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
