export type MenuItemNumber = number;

export interface MenuHeader {
  sensorName: string;
  version: string;
  mode: string;
  userLabel: string;
  tag: string;
}

export interface ToggleOption {
  number: number;
  label: string;
  value: string;
}

export type WorkflowValidation = "ipv4" | "integer" | "text";

export interface WorkflowStep {
  key: string;
  prompt: string;
  kind?: "input" | "choice";
  options?: readonly ToggleOption[];
  validation?: WorkflowValidation;
  min?: number;
  max?: number;
  when?: {
    key: string;
    value: string;
  };
}

export type MenuAction =
  | { type: "navigate"; targetMenuId: string }
  | { type: "display"; content: string; templateId?: string }
  | {
      type: "workflow";
      workflowId: string;
      steps: readonly WorkflowStep[];
    }
  | {
      type: "toggle";
      settingId: string;
      prompt: string;
      options: readonly ToggleOption[];
    }
  | {
      type: "input";
      settingId: string;
      prompt: string;
      successMessage: string;
      sensitive?: boolean;
    }
  | { type: "return" }
  | { type: "exit" };

export interface MenuItem {
  number: MenuItemNumber;
  label: string;
  action: MenuAction;
}

export interface MenuNode {
  id: string;
  title: string;
  header: MenuHeader;
  items: readonly MenuItem[];
}

export type MenuTree = Readonly<Record<string, MenuNode>>;

