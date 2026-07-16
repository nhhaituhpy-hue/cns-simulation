import { getMenuDefinition } from "./menu-data";
import type {
  MenuAction,
  MenuHeader,
  MenuItem,
  MenuNode,
  MenuTree,
  ToggleOption,
} from "./menu-data/menu-types";
import { normalizeTerminalInput } from "./normalization";
import { renderTemplate } from "./terminal-templates";
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

export type PendingInteractionType = "display" | "input" | "toggle";

export interface TerminalEngineOptions {
  targetLoginUser: LoginUser;
  menus?: MenuTree;
  rootMenuId?: string;
  header?: Partial<MenuHeader>;
  sensorDataProfile?: SensorDataProfile;
  sensorMonitoring?: SensorMonitoringData;
}

export interface TerminalEngineState {
  currentMenuId: string;
  navigationStack: readonly string[];
  exited: boolean;
  pendingInteraction: PendingInteractionType | null;
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
  | { type: "toggle"; item: MenuItem; action: Extract<MenuAction, { type: "toggle" }> };

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

function formatMenuNumber(number: number | "0" | "X"): string {
  return String(number).padStart(3, " ");
}

function formatMenuItem(number: number | "0" | "X", label: string): string {
  return `(${formatMenuNumber(number)})    ${label}`;
}

/** Renders a deterministic, fixed-width ASCII maintenance menu. */
export function renderMenu(
  node: MenuNode,
  headerOverrides: Partial<MenuHeader> = {},
): string {
  const header = { ...node.header, ...headerOverrides };
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

  private readonly menus: MenuTree;
  private readonly rootMenuId: string;
  private readonly headerOverrides: Partial<MenuHeader>;
  private readonly sensorDataProfile: SensorDataProfile | undefined;
  private readonly sensorMonitoring: SensorMonitoringData | undefined;
  private currentMenuId: string;
  private navigationStack: string[] = [];
  private exited = false;
  private pendingInteraction: PendingInteraction | null = null;
  private settings: Record<string, string> = {};

  constructor(options: TerminalEngineOptions) {
    const builtInDefinition = getMenuDefinition(options.targetLoginUser);
    this.targetLoginUser = options.targetLoginUser;
    this.menus = options.menus ?? builtInDefinition.menus;
    this.rootMenuId = options.rootMenuId ?? builtInDefinition.rootMenuId;
    this.headerOverrides = options.header ?? {};
    this.sensorDataProfile = options.sensorDataProfile;
    this.sensorMonitoring = options.sensorMonitoring;
    this.currentMenuId = this.rootMenuId;

    assertValidMenuTree(this.menus, this.rootMenuId);
  }

  authenticate(username: string): boolean {
    return authenticateLoginUser(username, this.targetLoginUser);
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
      pendingSensitive:
        this.pendingInteraction?.type === "input" &&
        this.pendingInteraction.action.sensitive === true,
      settings: { ...this.settings },
    };
  }

  renderCurrentMenu(): string {
    return renderMenu(this.getCurrentMenu(), this.headerOverrides);
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
              : action.content + "\n\nPress RETURN to continue:",
          recordableAction: selectedAction,
        });

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
      this.pendingInteraction = null;
      return this.buildResult({
        accepted: true,
        event: "setting-updated",
        normalizedInput,
        previousMenuId,
        output: `${pending.item.label}: ${selectedOption.label}\n\n${this.renderCurrentMenu()}`,
        recordableAction: this.createAction(
          "value-input",
          normalizedInput,
          `Set ${pending.item.label} to ${selectedOption.label}`,
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
    this.pendingInteraction = null;
    return this.buildResult({
      accepted: true,
      event: "setting-updated",
      normalizedInput: pending.action.sensitive ? "[REDACTED]" : normalizedInput,
      previousMenuId,
      output: `${pending.action.successMessage}\n\n${this.renderCurrentMenu()}`,
      recordableAction: pending.action.sensitive
        ? null
        : this.createAction(
            "value-input",
            normalizedInput,
            `Set ${pending.item.label}`,
          ),
    });
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
