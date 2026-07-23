import { getMenuDefinition } from "./menu-data";
import type {
  MenuAction,
  MenuHeader,
  MenuItem,
  MenuNode,
  MenuTree,
  ToggleOption,
  WorkflowStep,
} from "./menu-data/menu-types";
import { normalizeTerminalInput } from "./normalization";
import { renderTemplate } from "./terminal-templates";
import {
  completeWorkflow,
  renderDynamicTerminalContent,
  renderGenericSettingResult,
  renderWorkflowStep,
  validateWorkflowValue,
  workflowValue,
  type TerminalWorkflowRuntime,
} from "./terminal-workflows";
import type {
  LoginUser,
  RecordableAction,
  SensorDataProfile,
  SensorMonitoringData,
} from "./types";

const TERMINAL_WIDTH = 74;
const INNER_WIDTH = TERMINAL_WIDTH - 2;

export type TerminalEventType =
  | "navigate"
  | "display"
  | "continue"
  | "prompt"
  | "setting-updated"
  | "return"
  | "exit"
  | "invalid"
  | "already-exited";

export type PendingInteractionType = "display" | "input" | "toggle" | "workflow";

export interface TerminalEngineOptions {
  targetLoginUser: LoginUser;
  targetIpAddress?: string;
  menus?: MenuTree;
  rootMenuId?: string;
  header?: Partial<MenuHeader>;
  sensorDataProfile?: SensorDataProfile;
  sensorMonitoring?: SensorMonitoringData;
}

export const TERMINAL_ENGINE_STATE_VERSION = 1 as const;

export interface TerminalEnginePersistentState {
  version: typeof TERMINAL_ENGINE_STATE_VERSION;
  targetLoginUser: LoginUser;
  sensorDataProfile?: SensorDataProfile;
  runtime: TerminalWorkflowRuntime;
  settings: Record<string, string>;
}

export interface TerminalEngineState {
  currentMenuId: string;
  navigationStack: readonly string[];
  exited: boolean;
  pendingInteraction: PendingInteractionType | null;
  pendingWorkflowStep: WorkflowStep | null;
  pendingSensitive: boolean;
  settings: Readonly<Record<string, string>>;
}

export interface TerminalProcessResult {
  accepted: boolean;
  event: TerminalEventType;
  normalizedInput: string;
  previousMenuId: string;
  currentMenuId: string;
  exited: boolean;
  output: string;
  recordableAction: RecordableAction | null;
}

type PendingInteraction =
  | { type: "display"; item: MenuItem }
  | { type: "input"; item: MenuItem; action: Extract<MenuAction, { type: "input" }> }
  | { type: "toggle"; item: MenuItem; action: Extract<MenuAction, { type: "toggle" }> }
  | {
      type: "workflow";
      item: MenuItem;
      action: Extract<MenuAction, { type: "workflow" }>;
      stepIndex: number;
      values: Record<string, string>;
    };

function clampLine(content: string): string {
  if (content.length <= INNER_WIDTH) {
    return content;
  }

  return `${content.slice(0, INNER_WIDTH - 3)}...`;
}

function boxLine(content = ""): string {
  const safeContent = clampLine(content);
  return `*${safeContent.padEnd(INNER_WIDTH, " ")}*`;
}

function centeredBoxLine(content: string): string {
  const safeContent = clampLine(content);
  const totalPadding = INNER_WIDTH - safeContent.length;
  const leftPadding = Math.floor(totalPadding / 2);
  return boxLine(`${" ".repeat(leftPadding)}${safeContent}`);
}

function centeredLine(content: string): string {
  const safeContent = clampLine(content);
  const totalPadding = TERMINAL_WIDTH - safeContent.length;
  return `${" ".repeat(Math.max(0, Math.floor(totalPadding / 2)))}${safeContent}`;
}

function formatMenuNumber(number: number | "0" | "X"): string {
  return String(number).padStart(3, " ");
}

function formatMenuItem(number: number | "0" | "X", label: string): string {
  return `(${formatMenuNumber(number)})    ${label}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSensorDataProfileSnapshot(
  value: unknown,
): value is SensorDataProfile {
  if (!isRecord(value)) return false;

  return (
    typeof value.sensorVersion === "string" &&
    typeof value.configVersion === "string" &&
    typeof value.sensorName === "string" &&
    isRecord(value.network) &&
    isRecord(value.receiverStats) &&
    Array.isArray(value.clients) &&
    Array.isArray(value.snmpUsers) &&
    Array.isArray(value.snmpTraps) &&
    isRecord(value.gps) &&
    isRecord(value.filters) &&
    isRecord(value.asterix) &&
    isRecord(value.general) &&
    isRecord(value.syslog) &&
    Array.isArray(value.siteMonitors)
  );
}

function isTerminalWorkflowRuntime(
  value: unknown,
): value is TerminalWorkflowRuntime {
  if (!isRecord(value)) return false;
  const pendingNetwork = value.pendingNetwork;
  const hasValidPendingNetwork =
    pendingNetwork === null ||
    (isRecord(pendingNetwork) &&
      typeof pendingNetwork.ip === "string" &&
      typeof pendingNetwork.subnet === "string" &&
      typeof pendingNetwork.gateway === "string");

  return (
    (value.operationMode === "OPERATIONAL" ||
      value.operationMode === "MAINTENANCE") &&
    typeof value.alertPower === "number" &&
    Number.isFinite(value.alertPower) &&
    typeof value.failurePower === "number" &&
    Number.isFinite(value.failurePower) &&
    hasValidPendingNetwork
  );
}

function bannerLine(left: string, right: string): string {
  const remainingWidth = TERMINAL_WIDTH - left.length - right.length - 2;
  return `${left} ${"*".repeat(Math.max(1, remainingWidth))} ${right}`;
}

function renderSystemStatisticsMenu(
  node: MenuNode,
  header: MenuHeader,
): string {
  const lines: string[] = [
    bannerLine(
      `***** ${header.sensorName}`,
      `VERSION: ${header.version} *****`,
    ),
    boxLine(),
    centeredBoxLine("QUADRANT ADS-B MAINTENANCE APPLICATION"),
    centeredBoxLine(`- ${header.mode.toLocaleUpperCase("en-US")} -`),
    boxLine(),
  ];

  for (const item of node.items) {
    lines.push(
      boxLine(
        ` ${formatMenuItem(
          item.number,
          item.label.toLocaleUpperCase("en-US"),
        )}`,
      ),
      boxLine(),
    );
  }

  lines.push(
    boxLine(` ${formatMenuItem("0", "RETURN TO PREVIOUS MENU")}`),
    boxLine(),
    boxLine(` ${formatMenuItem("X", "EXIT MAINTENANCE APPLICATION")}`),
    boxLine(),
    bannerLine(
      `***** USER: ${header.userLabel.toLocaleUpperCase("en-US")}`,
      `TAG: ${header.tag} *****`,
    ),
    "",
    "Please type the item number you want to select:",
  );

  return lines.join("\n");
}

/** Renders a deterministic, fixed-width ASCII maintenance menu. */
export function renderMenu(
  node: MenuNode,
  headerOverrides: Partial<MenuHeader> = {},
): string {
  const header = { ...node.header, ...headerOverrides };

  if (node.id.endsWith(".root")) {
    const lines = [
      centeredLine("QUADRANT ADS-B MAINTENANCE APPLICATION"),
      centeredLine(`- ${header.mode.toLocaleUpperCase("en-US")} -`),
      "",
    ];

    for (const item of node.items) {
      lines.push(
        formatMenuItem(
          item.number,
          item.label.toLocaleUpperCase("en-US"),
        ),
        "",
      );
    }

    lines.push(
      formatMenuItem("0", "RETURN TO PREVIOUS MENU"),
      "",
      formatMenuItem("X", "EXIT MAINTENANCE APPLICATION"),
    );

    return lines.join("\n");
  }

  if (node.id === "ma.system-stats") {
    return renderSystemStatisticsMenu(node, header);
  }

  const lines: string[] = [
    "*".repeat(TERMINAL_WIDTH),
    boxLine(`${header.sensorName}    Version: ${header.version}`),
    boxLine(),
    centeredBoxLine("Quadrant ADS-B Maintenance Application"),
    centeredBoxLine(`- ${header.mode} -`),
    centeredBoxLine(node.title),
    boxLine(),
  ];

  for (const item of node.items) {
    lines.push(boxLine(formatMenuItem(item.number, item.label)), boxLine());
  }

  lines.push(
    boxLine(formatMenuItem("0", "Return to Previous Menu")),
    boxLine(),
    boxLine(formatMenuItem("X", "Exit Maintenance Application")),
    boxLine(),
    boxLine(`User: ${header.userLabel}    Tag: ${header.tag}`),
    "*".repeat(TERMINAL_WIDTH),
    "",
    "Please type the item number you want to select:",
  );

  return lines.join("\n");
}

function renderTogglePrompt(
  prompt: string,
  options: readonly ToggleOption[],
): string {
  return [
    prompt,
    ...options.map((option) => formatMenuItem(option.number, option.label)),
    formatMenuItem("0", "Cancel"),
  ].join("\n");
}

export function authenticateLoginUser(
  username: string,
  targetLoginUser: LoginUser,
): boolean {
  return username.trim().toLocaleLowerCase("en-US") === targetLoginUser;
}

export function authenticateTerminalLogin(
  login: string,
  targetLoginUser: LoginUser,
  targetIpAddress?: string,
): boolean {
  if (!targetIpAddress) {
    return authenticateLoginUser(login, targetLoginUser);
  }

  const separatorIndex = login.lastIndexOf("@");
  if (separatorIndex <= 0) {
    return false;
  }

  const username = login.slice(0, separatorIndex);
  const ipAddress = login.slice(separatorIndex + 1).trim();

  return (
    authenticateLoginUser(username, targetLoginUser) &&
    ipAddress === targetIpAddress
  );
}

function assertValidMenuTree(menus: MenuTree, rootMenuId: string): void {
  if (!menus[rootMenuId]) {
    throw new Error(`Root menu "${rootMenuId}" does not exist.`);
  }

  for (const [menuId, menu] of Object.entries(menus)) {
    if (menu.id !== menuId) {
      throw new Error(`Menu key "${menuId}" does not match node id "${menu.id}".`);
    }

    const itemNumbers = new Set<number>();
    for (const item of menu.items) {
      if (!Number.isInteger(item.number) || item.number <= 0) {
        throw new Error(`Menu "${menuId}" has an invalid item number.`);
      }

      if (itemNumbers.has(item.number)) {
        throw new Error(`Menu "${menuId}" has duplicate item number ${item.number}.`);
      }
      itemNumbers.add(item.number);

      if (item.action.type === "navigate" && !menus[item.action.targetMenuId]) {
        throw new Error(
          `Menu "${menuId}" points to missing menu "${item.action.targetMenuId}".`,
        );
      }
    }
  }
}

export class TerminalEngine {
  readonly targetLoginUser: LoginUser;
  readonly targetIpAddress: string | undefined;

  private readonly menus: MenuTree;
  private readonly rootMenuId: string;
  private readonly headerOverrides: Partial<MenuHeader>;
  private sensorDataProfile: SensorDataProfile | undefined;
  private readonly sensorMonitoring: SensorMonitoringData | undefined;
  private readonly workflowRuntime: TerminalWorkflowRuntime;
  private currentMenuId: string;
  private navigationStack: string[] = [];
  private exited = false;
  private pendingInteraction: PendingInteraction | null = null;
  private settings: Record<string, string> = {};

  constructor(options: TerminalEngineOptions) {
    const builtInDefinition = getMenuDefinition(options.targetLoginUser);
    this.targetLoginUser = options.targetLoginUser;
    this.targetIpAddress = options.targetIpAddress;
    this.menus = options.menus ?? builtInDefinition.menus;
    this.rootMenuId = options.rootMenuId ?? builtInDefinition.rootMenuId;
    this.headerOverrides = options.header ?? {};
    this.sensorDataProfile = options.sensorDataProfile
      ? structuredClone(options.sensorDataProfile)
      : undefined;
    this.sensorMonitoring = options.sensorMonitoring;
    this.workflowRuntime = {
      operationMode:
        this.sensorDataProfile?.operationMode ??
        (this.menus[this.rootMenuId]?.header.mode
          .toLocaleUpperCase("en-US")
          .includes("MAINTENANCE")
          ? "MAINTENANCE"
          : "OPERATIONAL"),
      alertPower: this.sensorDataProfile?.endToEnd?.alertPower ?? 164,
      failurePower: this.sensorDataProfile?.endToEnd?.failurePower ?? 140,
      pendingNetwork: null,
    };
    this.currentMenuId = this.rootMenuId;

    assertValidMenuTree(this.menus, this.rootMenuId);
  }

  authenticate(username: string): boolean {
    return authenticateTerminalLogin(
      username,
      this.targetLoginUser,
      this.targetIpAddress,
    );
  }

  getCurrentMenu(): MenuNode {
    const menu = this.menus[this.currentMenuId];
    if (!menu) {
      throw new Error(`Current menu "${this.currentMenuId}" does not exist.`);
    }
    return menu;
  }

  getState(): TerminalEngineState {
    return {
      currentMenuId: this.currentMenuId,
      navigationStack: [...this.navigationStack],
      exited: this.exited,
      pendingInteraction: this.pendingInteraction?.type ?? null,
      pendingWorkflowStep:
        this.pendingInteraction?.type === "workflow"
          ? this.pendingInteraction.action.steps[
              this.pendingInteraction.stepIndex
            ] ?? null
          : null,
      pendingSensitive:
        this.pendingInteraction?.type === "input" &&
        this.pendingInteraction.action.sensitive === true,
      settings: { ...this.settings },
    };
  }

  renderCurrentMenu(): string {
    return renderMenu(this.getCurrentMenu(), {
      sensorName:
        this.sensorDataProfile?.sensorName ??
        this.getCurrentMenu().header.sensorName,
      version:
        this.sensorDataProfile?.sensorVersion ??
        this.getCurrentMenu().header.version,
      mode:
        this.workflowRuntime.operationMode === "MAINTENANCE"
          ? "Maintenance Mode"
          : "Operational Mode",
      ...this.headerOverrides,
    });
  }

  reset(): void {
    this.currentMenuId = this.rootMenuId;
    this.navigationStack = [];
    this.exited = false;
    this.pendingInteraction = null;
    this.settings = {};
  }

  processInput(rawInput: string): TerminalProcessResult {
    const normalizedInput = normalizeTerminalInput(rawInput);
    const previousMenuId = this.currentMenuId;

    if (this.exited) {
      return this.buildResult({
        accepted: false,
        event: "already-exited",
        normalizedInput,
        previousMenuId,
        output: "Maintenance application has already exited.",
        recordableAction: null,
      });
    }

    if (normalizedInput === "X") {
      this.exited = true;
      this.pendingInteraction = null;
      return this.buildResult({
        accepted: true,
        event: "exit",
        normalizedInput,
        previousMenuId,
        output: "Connection to sensor closed.",
        recordableAction: this.createAction(
          "menu-selection",
          normalizedInput,
          "Exit Maintenance Application",
        ),
      });
    }

    if (this.pendingInteraction) {
      return this.processPendingInput(rawInput, normalizedInput, previousMenuId);
    }

    if (normalizedInput === "0") {
      return this.returnToPreviousMenu(normalizedInput, previousMenuId);
    }

    const menu = this.getCurrentMenu();
    const item = menu.items.find(
      (candidate) => String(candidate.number) === normalizedInput,
    );

    if (!item) {
      return this.buildResult({
        accepted: false,
        event: "invalid",
        normalizedInput,
        previousMenuId,
        output: `Invalid selection "${rawInput}".\n\n${this.renderCurrentMenu()}`,
        recordableAction: this.createAction(
          "menu-selection",
          normalizedInput,
          "Invalid menu selection",
        ),
      });
    }

    return this.executeMenuItem(item, normalizedInput, previousMenuId);
  }

  private executeMenuItem(
    item: MenuItem,
    normalizedInput: string,
    previousMenuId: string,
  ): TerminalProcessResult {
    const action = item.action;
    const selectedAction = this.createAction(
      "menu-selection",
      normalizedInput,
      item.label,
    );

    switch (action.type) {
      case "navigate":
        this.navigationStack.push(this.currentMenuId);
        this.currentMenuId = action.targetMenuId;
        return this.buildResult({
          accepted: true,
          event: "navigate",
          normalizedInput,
          previousMenuId,
          output: this.renderCurrentMenu(),
          recordableAction: selectedAction,
        });

      case "display":
        this.pendingInteraction = { type: "display", item };
        return this.buildResult({
          accepted: true,
          event: "display",
          normalizedInput,
          previousMenuId,
          output:
            action.templateId && this.sensorDataProfile
              ? renderTemplate(
                  action.templateId,
                  this.sensorDataProfile,
                  this.sensorMonitoring,
                )
              : `${renderDynamicTerminalContent(
                  action.content,
                  this.sensorDataProfile,
                  this.workflowRuntime,
                )}\n\nPress RETURN to continue:`,
          recordableAction: selectedAction,
        });

      case "workflow": {
        const values: Record<string, string> = {};
        const firstStep = this.findNextWorkflowStep(action.steps, 0, values);
        if (!firstStep) {
          this.pendingInteraction = { type: "display", item };
          return this.buildResult({
            accepted: true,
            event: "setting-updated",
            normalizedInput,
            previousMenuId,
            output: completeWorkflow(
              action.workflowId,
              values,
              this.sensorDataProfile,
              this.workflowRuntime,
            ),
            recordableAction: selectedAction,
          });
        }

        this.pendingInteraction = {
          type: "workflow",
          item,
          action,
          stepIndex: firstStep.index,
          values,
        };
        return this.buildResult({
          accepted: true,
          event: "prompt",
          normalizedInput,
          previousMenuId,
          output: renderWorkflowStep(firstStep.step),
          recordableAction: selectedAction,
        });
      }

      case "toggle":
        this.pendingInteraction = { type: "toggle", item, action };
        return this.buildResult({
          accepted: true,
          event: "prompt",
          normalizedInput,
          previousMenuId,
          output: renderTogglePrompt(action.prompt, action.options),
          recordableAction: selectedAction,
        });

      case "input":
        this.pendingInteraction = { type: "input", item, action };
        return this.buildResult({
          accepted: true,
          event: "prompt",
          normalizedInput,
          previousMenuId,
          output: action.prompt,
          recordableAction: selectedAction,
        });

      case "return":
        return this.returnToPreviousMenu(normalizedInput, previousMenuId);

      case "exit":
        this.exited = true;
        return this.buildResult({
          accepted: true,
          event: "exit",
          normalizedInput,
          previousMenuId,
          output: "Connection to sensor closed.",
          recordableAction: selectedAction,
        });
    }
  }

  private processPendingInput(
    rawInput: string,
    normalizedInput: string,
    previousMenuId: string,
  ): TerminalProcessResult {
    const pending = this.pendingInteraction;
    if (!pending) {
      throw new Error("Pending interaction unexpectedly disappeared.");
    }

    if (pending.type === "display") {
      if (normalizedInput !== "0") {
        return this.buildResult({
          accepted: false,
          event: "invalid",
          normalizedInput,
          previousMenuId,
          output: "Press RETURN to continue:",
          recordableAction: this.createAction(
            "menu-selection",
            normalizedInput,
            "Invalid display continuation",
          ),
        });
      }

      this.pendingInteraction = null;
      return this.buildResult({
        accepted: true,
        event: "continue",
        normalizedInput,
        previousMenuId,
        output: this.renderCurrentMenu(),
        recordableAction: this.createAction(
          "menu-selection",
          normalizedInput,
          `Continue from ${pending.item.label}`,
        ),
      });
    }

    if (pending.type === "toggle") {
      if (normalizedInput === "0") {
        this.pendingInteraction = null;
        return this.buildResult({
          accepted: true,
          event: "return",
          normalizedInput,
          previousMenuId,
          output: this.renderCurrentMenu(),
          recordableAction: this.createAction(
            "value-input",
            normalizedInput,
            `Cancel ${pending.item.label}`,
          ),
        });
      }

      const selectedOption = pending.action.options.find(
        (option) => String(option.number) === normalizedInput,
      );
      if (!selectedOption) {
        return this.buildResult({
          accepted: false,
          event: "invalid",
          normalizedInput,
          previousMenuId,
          output: `Invalid setting selection.\n\n${renderTogglePrompt(
            pending.action.prompt,
            pending.action.options,
          )}`,
          recordableAction: this.createAction(
            "value-input",
            normalizedInput,
            `Invalid value for ${pending.item.label}`,
          ),
        });
      }

      this.settings[pending.action.settingId] = selectedOption.value;
      this.pendingInteraction = { type: "display", item: pending.item };
      return this.buildResult({
        accepted: true,
        event: "setting-updated",
        normalizedInput,
        previousMenuId,
        output: renderGenericSettingResult(
          pending.item.label,
          selectedOption.label,
        ),
        recordableAction: this.createAction(
          "value-input",
          normalizedInput,
          `Set ${pending.item.label} to ${selectedOption.label}`,
        ),
      });
    }

    if (pending.type === "workflow") {
      const step = pending.action.steps[pending.stepIndex];
      if (!step) {
        throw new Error("Workflow step unexpectedly disappeared.");
      }

      if (step.kind === "choice" && normalizedInput === "0") {
        this.pendingInteraction = null;
        return this.buildResult({
          accepted: true,
          event: "return",
          normalizedInput,
          previousMenuId,
          output: this.renderCurrentMenu(),
          recordableAction: this.createAction(
            "value-input",
            normalizedInput,
            `Cancel ${pending.item.label}`,
          ),
        });
      }

      const candidate = step.kind === "choice" ? normalizedInput : rawInput.trim();
      const validation = validateWorkflowValue(step, candidate);
      if (!validation.valid) {
        return this.buildResult({
          accepted: false,
          event: "invalid",
          normalizedInput,
          previousMenuId,
          output: `${validation.message}\n\n${renderWorkflowStep(step)}`,
          recordableAction: this.createAction(
            "value-input",
            normalizedInput,
            `Invalid value for ${pending.item.label}`,
          ),
        });
      }

      const resolvedValue = workflowValue(step, candidate);
      if (
        pending.action.workflowId === "sa.e2e-thresholds" &&
        step.key === "failure" &&
        Number(resolvedValue) >= Number(pending.values.alert)
      ) {
        return this.buildResult({
          accepted: false,
          event: "invalid",
          normalizedInput,
          previousMenuId,
          output:
            "Failure Power Level must be lower than Alert Power Level.\n\n" +
            renderWorkflowStep(step),
          recordableAction: this.createAction(
            "value-input",
            normalizedInput,
            `Invalid value for ${pending.item.label}`,
          ),
        });
      }

      pending.values[step.key] = resolvedValue;
      this.settings[`${pending.action.workflowId}.${step.key}`] =
        pending.values[step.key];

      const nextStep = this.findNextWorkflowStep(
        pending.action.steps,
        pending.stepIndex + 1,
        pending.values,
      );
      if (nextStep) {
        pending.stepIndex = nextStep.index;
        return this.buildResult({
          accepted: true,
          event: "prompt",
          normalizedInput,
          previousMenuId,
          output: renderWorkflowStep(nextStep.step),
          recordableAction: this.createAction(
            "value-input",
            normalizedInput,
            `Set ${step.key} for ${pending.item.label}`,
          ),
        });
      }

      const resultScreen = completeWorkflow(
        pending.action.workflowId,
        pending.values,
        this.sensorDataProfile,
        this.workflowRuntime,
      );
      this.pendingInteraction = { type: "display", item: pending.item };
      return this.buildResult({
        accepted: true,
        event: "setting-updated",
        normalizedInput,
        previousMenuId,
        output: resultScreen,
        recordableAction: this.createAction(
          "value-input",
          normalizedInput,
          `Complete ${pending.item.label}`,
        ),
      });
    }

    const value = rawInput.trim();
    if (value === "" || /^return$/i.test(value)) {
      return this.buildResult({
        accepted: false,
        event: "invalid",
        normalizedInput,
        previousMenuId,
        output: `A value is required.\n\n${pending.action.prompt}`,
        recordableAction: pending.action.sensitive
          ? null
          : this.createAction(
              "value-input",
              normalizedInput,
              `Invalid value for ${pending.item.label}`,
            ),
      });
    }

    if (!pending.action.sensitive) {
      this.settings[pending.action.settingId] = value;
    }
    this.pendingInteraction = { type: "display", item: pending.item };
    return this.buildResult({
      accepted: true,
      event: "setting-updated",
      normalizedInput: pending.action.sensitive ? "[REDACTED]" : normalizedInput,
      previousMenuId,
      output: renderGenericSettingResult(
        pending.item.label,
        pending.action.sensitive ? undefined : value,
      ),
      recordableAction: pending.action.sensitive
        ? null
        : this.createAction(
            "value-input",
            normalizedInput,
            `Set ${pending.item.label}`,
          ),
    });
  }

  /** Returns only mutable device data. Login credentials are never included. */
  getPersistentState(): TerminalEnginePersistentState {
    return {
      version: TERMINAL_ENGINE_STATE_VERSION,
      targetLoginUser: this.targetLoginUser,
      ...(this.sensorDataProfile
        ? { sensorDataProfile: structuredClone(this.sensorDataProfile) }
        : {}),
      runtime: structuredClone(this.workflowRuntime),
      settings: { ...this.settings },
    };
  }

  /** Restores a candidate working copy while keeping menus/templates immutable. */
  restorePersistentState(snapshot: unknown): void {
    if (!isRecord(snapshot)) {
      throw new Error("Stored terminal state must be an object.");
    }
    if (snapshot.version !== TERMINAL_ENGINE_STATE_VERSION) {
      throw new Error("Stored terminal state uses an unsupported version.");
    }
    if (snapshot.targetLoginUser !== this.targetLoginUser) {
      throw new Error("Stored terminal state belongs to another login role.");
    }
    if (!isTerminalWorkflowRuntime(snapshot.runtime)) {
      throw new Error("Stored terminal runtime is invalid.");
    }
    if (!isRecord(snapshot.settings)) {
      throw new Error("Stored terminal settings are invalid.");
    }

    const settings = Object.entries(snapshot.settings);
    if (!settings.every(([, value]) => typeof value === "string")) {
      throw new Error("Stored terminal settings contain invalid values.");
    }

    if (
      snapshot.sensorDataProfile !== undefined &&
      !isSensorDataProfileSnapshot(snapshot.sensorDataProfile)
    ) {
      throw new Error("Stored sensor data profile is invalid.");
    }

    this.sensorDataProfile = snapshot.sensorDataProfile
      ? structuredClone(snapshot.sensorDataProfile)
      : undefined;
    Object.assign(this.workflowRuntime, structuredClone(snapshot.runtime));
    this.settings = Object.fromEntries(settings) as Record<string, string>;
  }

  private findNextWorkflowStep(
    steps: readonly WorkflowStep[],
    startIndex: number,
    values: Readonly<Record<string, string>>,
  ): { step: WorkflowStep; index: number } | null {
    for (let index = startIndex; index < steps.length; index += 1) {
      const step = steps[index];
      if (!step.when || values[step.when.key] === step.when.value) {
        return { step, index };
      }
    }
    return null;
  }

  private returnToPreviousMenu(
    normalizedInput: string,
    previousMenuId: string,
  ): TerminalProcessResult {
    const parentMenuId = this.navigationStack.pop();

    if (!parentMenuId) {
      return this.buildResult({
        accepted: true,
        event: "return",
        normalizedInput,
        previousMenuId,
        output: `Already at top-level menu.\n\n${this.renderCurrentMenu()}`,
        recordableAction: this.createAction(
          "menu-selection",
          normalizedInput,
          "Remain at top-level menu",
        ),
      });
    }

    this.currentMenuId = parentMenuId;
    return this.buildResult({
      accepted: true,
      event: "return",
      normalizedInput,
      previousMenuId,
      output: this.renderCurrentMenu(),
      recordableAction: this.createAction(
        "menu-selection",
        normalizedInput,
        "Return to Previous Menu",
        previousMenuId,
      ),
    });
  }

  private createAction(
    kind: RecordableAction["kind"],
    input: string,
    resultLabel: string,
    menuId = this.currentMenuId,
  ): RecordableAction {
    const menu = this.menus[menuId];
    if (!menu) {
      throw new Error(`Cannot record action for missing menu "${menuId}".`);
    }

    return {
      kind,
      menuId: menu.id,
      menuTitle: menu.title,
      input,
      resultLabel,
    };
  }

  private buildResult(
    result: Omit<
      TerminalProcessResult,
      "currentMenuId" | "exited"
    >,
  ): TerminalProcessResult {
    return {
      ...result,
      currentMenuId: this.currentMenuId,
      exited: this.exited,
    };
  }
}
