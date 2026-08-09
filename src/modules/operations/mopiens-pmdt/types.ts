import type {
  ButtonHTMLAttributes,
  CSSProperties,
  FormEventHandler,
  ReactNode,
} from "react";

export type MopiensVisualTone =
  | "normal"
  | "info"
  | "warning"
  | "alarm"
  | "pending"
  | "inactive";

export type MopiensControlTone = "default" | "primary" | "warning" | "danger";

export interface MopiensConnectionState {
  label: string;
  tone?: MopiensVisualTone;
}

export interface MopiensUserState {
  name: string;
  mode?: string;
  securityLevel?: string | number;
  tone?: MopiensVisualTone;
}

export interface MopiensMenuCommand {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;
  dividerBefore?: boolean;
  tone?: MopiensControlTone;
  children?: readonly MopiensMenuCommand[];
}

export interface MopiensMenuGroup {
  id: string;
  label: string;
  disabled?: boolean;
  commands: readonly MopiensMenuCommand[];
}

export interface MopiensToolbarAction {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  pressed?: boolean;
  showLabel?: boolean;
  tone?: MopiensControlTone;
}

export interface MopiensNavigationItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
  selectable?: boolean;
  expandedByDefault?: boolean;
  children?: readonly MopiensNavigationItem[];
}

export interface MopiensNavigationSection {
  id: string;
  label: string;
  icon?: ReactNode;
  items: readonly MopiensNavigationItem[];
}

export interface MopiensTabDefinition {
  id: string;
  label: string;
  disabled?: boolean;
  closeLabel?: string;
}

export interface MopiensOutputFilter {
  id: string;
  label: string;
  count?: number;
  tone?: MopiensVisualTone;
}

export interface MopiensStatusItem {
  id: string;
  label: string;
  value?: ReactNode;
  tone?: MopiensVisualTone;
  grow?: boolean;
}

export interface MopiensIndicatorDefinition {
  id: string;
  label: string;
  tone: MopiensVisualTone;
  detail?: string;
}

export interface MopiensSoftKeyDefinition {
  id: string;
  label: string;
  disabled?: boolean;
  pressed?: boolean;
}

export interface MopiensDesktopViewportProps {
  "aria-label": string;
  children: ReactNode;
  designWidth?: number;
  designHeight?: number;
  minimumScale?: number;
  className?: string;
  style?: CSSProperties;
}

export interface MopiensTitleBarProps {
  title: string;
  brandLabel?: string;
  connection?: MopiensConnectionState;
  user?: MopiensUserState;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export interface MopiensMenuBarProps {
  menus: readonly MopiensMenuGroup[];
  onCommand?: (commandId: string) => void;
  ariaLabel?: string;
}

export interface MopiensToolbarProps {
  actions: readonly MopiensToolbarAction[];
  onAction?: (actionId: string) => void;
  ariaLabel?: string;
}

export interface MopiensNavigationProps {
  title?: string;
  sections: readonly MopiensNavigationSection[];
  activeSectionId: string;
  activeItemId?: string;
  onSectionChange?: (sectionId: string) => void;
  onItemSelect?: (itemId: string) => void;
  ariaLabel?: string;
}

export interface MopiensTabHostProps {
  tabs: readonly MopiensTabDefinition[];
  activeTabId: string;
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  children: ReactNode;
  ariaLabel?: string;
}

export interface MopiensOutputPaneProps {
  title?: string;
  filters?: readonly MopiensOutputFilter[];
  activeFilterId?: string;
  onFilterChange?: (filterId: string) => void;
  onClear?: () => void;
  clearLabel?: string;
  children?: ReactNode;
  emptyLabel?: string;
}

export interface MopiensStatusBarProps {
  items: readonly MopiensStatusItem[];
  ariaLabel?: string;
}

export interface MopiensPmdtShellProps {
  ariaLabel: string;
  title: string;
  brandLabel?: string;
  connection?: MopiensConnectionState;
  user?: MopiensUserState;
  menus: readonly MopiensMenuGroup[];
  toolbarActions: readonly MopiensToolbarAction[];
  navigationTitle?: string;
  navigationSections: readonly MopiensNavigationSection[];
  activeNavigationSectionId: string;
  activeNavigationItemId?: string;
  tabs: readonly MopiensTabDefinition[];
  activeTabId: string;
  children: ReactNode;
  output?: ReactNode;
  outputTitle?: string;
  outputFilters?: readonly MopiensOutputFilter[];
  activeOutputFilterId?: string;
  outputEmptyLabel?: string;
  statusItems: readonly MopiensStatusItem[];
  designWidth?: number;
  designHeight?: number;
  minimumScale?: number;
  outputHeight?: number;
  onMenuCommand?: (commandId: string) => void;
  onToolbarAction?: (actionId: string) => void;
  onNavigationSectionChange?: (sectionId: string) => void;
  onNavigationItemSelect?: (itemId: string) => void;
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onOutputFilterChange?: (filterId: string) => void;
  onOutputClear?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export interface MopiensLmiShellProps {
  ariaLabel: string;
  title: string;
  unitLabel?: string;
  screenTitle?: string;
  indicators?: readonly MopiensIndicatorDefinition[];
  softKeys?: readonly MopiensSoftKeyDefinition[];
  statusItems?: readonly MopiensStatusItem[];
  children: ReactNode;
  designWidth?: number;
  designHeight?: number;
  minimumScale?: number;
  onSoftKey?: (keyId: string) => void;
}

export interface MopiensDialogAction {
  id: string;
  label: string;
  tone?: MopiensControlTone;
  disabled?: boolean;
  autoFocus?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}

export interface MopiensModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions?: readonly MopiensDialogAction[];
  ariaLabel?: string;
  role?: "dialog" | "alertdialog";
  size?: "small" | "medium" | "large";
  brandLabel?: string;
  closeLabel?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  onSubmit?: FormEventHandler<HTMLFormElement>;
}

export interface MopiensConnectionProfileOption {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface MopiensConnectionDetail {
  id: string;
  label: string;
  value: ReactNode;
}

export interface MopiensConnectionFieldOption {
  value: string;
  label: string;
}

export interface MopiensConnectionField {
  id: string;
  label: string;
  value: string;
  type?: "text" | "password" | "number" | "select";
  options?: readonly MopiensConnectionFieldOption[];
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email" | "url";
}

export interface MopiensConnectionDialogProps {
  open: boolean;
  title?: string;
  brandLabel?: string;
  profiles: readonly MopiensConnectionProfileOption[];
  selectedProfileId: string;
  details?: readonly MopiensConnectionDetail[];
  fields?: readonly MopiensConnectionField[];
  busy?: boolean;
  error?: string | null;
  connectLabel?: string;
  closeLabel?: string;
  onProfileChange: (profileId: string) => void;
  onFieldChange?: (fieldId: string, value: string) => void;
  onConnect: () => void;
  onClose: () => void;
}

export interface MopiensLoginDialogProps {
  open: boolean;
  title?: string;
  brandLabel?: string;
  userName: string;
  password: string;
  busy?: boolean;
  error?: string | null;
  userNameLabel?: string;
  passwordLabel?: string;
  loginLabel?: string;
  closeLabel?: string;
  onUserNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onLogin: () => void;
  onClose: () => void;
}

export interface MopiensConfirmationModalProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "warning" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface MopiensGaugeSegment {
  from: number;
  to: number;
  tone: MopiensVisualTone;
}

export interface MopiensGaugeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  secondaryValue?: number;
  formatValue?: (value: number) => string;
  segments?: readonly MopiensGaugeSegment[];
  tone?: MopiensVisualTone;
  size?: "small" | "medium" | "large";
}

export interface MopiensSlideSwitchProps {
  label: string;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  onLabel?: string;
  offLabel?: string;
  orientation?: "horizontal" | "vertical";
  tone?: MopiensVisualTone;
}

export interface MopiensStatusIndicatorProps {
  label: string;
  tone: MopiensVisualTone;
  detail?: ReactNode;
  appearance?: "lamp" | "badge" | "ring";
  compact?: boolean;
}

export interface MopiensBeveledButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  tone?: MopiensControlTone;
  pressed?: boolean;
  icon?: ReactNode;
}

export interface MopiensPropertyRow {
  id: string;
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  tone?: MopiensVisualTone;
  disabled?: boolean;
}

export interface MopiensPropertySection {
  id: string;
  title?: string;
  rows: readonly MopiensPropertyRow[];
}

export interface MopiensPropertyGridProps {
  sections: readonly MopiensPropertySection[];
  ariaLabel: string;
  labelWidth?: string;
  emptyLabel?: string;
}

export interface MopiensTableColumn<TRow> {
  id: string;
  label: ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  render: (row: TRow, rowIndex: number) => ReactNode;
}

export interface MopiensTableProps<TRow> {
  caption: string;
  columns: readonly MopiensTableColumn<TRow>[];
  rows: readonly TRow[];
  getRowId: (row: TRow, rowIndex: number) => string;
  emptyLabel?: string;
  dense?: boolean;
  rowTone?: (row: TRow, rowIndex: number) => MopiensVisualTone | undefined;
}

export interface MopiensLimitGridRow {
  id: string;
  label: ReactNode;
  alarmLow?: ReactNode;
  warningLow?: ReactNode;
  nominal?: ReactNode;
  value: ReactNode;
  warningHigh?: ReactNode;
  alarmHigh?: ReactNode;
  unit?: ReactNode;
  tone?: MopiensVisualTone;
}

export interface MopiensLimitGridProps {
  caption: string;
  rows: readonly MopiensLimitGridRow[];
  emptyLabel?: string;
}
