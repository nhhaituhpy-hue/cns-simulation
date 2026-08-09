"use client";

import { AirplaneInFlight } from "@phosphor-icons/react/dist/csr/AirplaneInFlight";
import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { MopiensBeveledButton } from "./instruments";
import type {
  MopiensConfirmationModalProps,
  MopiensConnectionDialogProps,
  MopiensConnectionField,
  MopiensLoginDialogProps,
  MopiensModalProps,
} from "./types";
import styles from "./mopiens-pmdt.module.css";

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function MopiensModal({
  open,
  title,
  children,
  onClose,
  actions = [],
  ariaLabel,
  role = "dialog",
  size = "medium",
  brandLabel,
  closeLabel = "Close dialog",
  closeOnBackdrop = false,
  closeOnEscape = true,
  onSubmit,
}: MopiensModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const preferred = dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]");
    const first = dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
    (preferred ?? first ?? dialogRef.current)?.focus();

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown);
      previousFocus?.focus();
    };
  }, [closeOnEscape, onClose, open]);

  if (!open) return null;

  function keepFocusInside(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    );
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : titleId}
        tabIndex={-1}
        className={`${styles.modalWindow} ${styles[`modalSize${size[0].toUpperCase()}${size.slice(1)}`]}`}
        onKeyDown={keepFocusInside}
      >
        <header className={styles.modalTitleBar}>
          <span className={styles.modalBrandMark} aria-hidden>
            M
          </span>
          <h2 id={titleId}>{title}</h2>
          <button type="button" onClick={onClose} aria-label={closeLabel}>
            <span aria-hidden>×</span>
          </button>
        </header>

        {brandLabel ? (
          <div className={styles.modalBrandBanner} aria-label={brandLabel}>
            <span className={styles.modalBrandFlight} aria-hidden>
              <AirplaneInFlight size={34} weight="fill" />
            </span>
            <strong>{brandLabel}</strong>
          </div>
        ) : null}

        <form
          className={styles.modalForm}
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit?.(event);
          }}
        >
          <div className={styles.modalBody}>{children}</div>
          {actions.length ? (
            <footer className={styles.modalActions}>
              {actions.map((action) => (
                <MopiensBeveledButton
                  key={action.id}
                  type={action.type ?? "button"}
                  tone={action.tone}
                  disabled={action.disabled}
                  data-autofocus={action.autoFocus ? "true" : undefined}
                  onClick={action.onClick}
                >
                  {action.label}
                </MopiensBeveledButton>
              ))}
            </footer>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function ConnectionField({
  field,
  inputId,
  onChange,
}: {
  field: MopiensConnectionField;
  inputId: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className={styles.dialogField}>
      <label htmlFor={inputId}>{field.label}</label>
      {field.type === "select" ? (
        <select
          id={inputId}
          value={field.value}
          disabled={field.disabled}
          required={field.required}
          onChange={(event) => onChange?.(event.target.value)}
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={inputId}
          type={field.type ?? "text"}
          value={field.value}
          disabled={field.disabled}
          required={field.required}
          autoComplete={field.autoComplete}
          inputMode={field.inputMode}
          onChange={(event) => onChange?.(event.target.value)}
        />
      )}
    </div>
  );
}

export function MopiensConnectionDialog({
  open,
  title = "Connection List",
  brandLabel = "MOPIENS",
  profiles,
  selectedProfileId,
  details = [],
  fields = [],
  busy = false,
  error,
  connectLabel = "Connect",
  closeLabel = "Close",
  onProfileChange,
  onFieldChange,
  onConnect,
  onClose,
}: MopiensConnectionDialogProps) {
  const idBase = useId().replaceAll(":", "");
  return (
    <MopiensModal
      open={open}
      title={title}
      brandLabel={brandLabel}
      size="large"
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy) onConnect();
      }}
      actions={[
        { id: "connect", label: busy ? "Connecting..." : connectLabel, tone: "primary", type: "submit", disabled: busy },
        { id: "close", label: closeLabel, onClick: onClose, disabled: busy },
      ]}
    >
      <div className={styles.connectionLayout}>
        <div className={styles.connectionProfiles}>
          <label htmlFor={`${idBase}-profiles`}>Saved connections</label>
          <select
            id={`${idBase}-profiles`}
            size={Math.min(10, Math.max(4, profiles.length))}
            value={selectedProfileId}
            disabled={busy}
            onChange={(event) => onProfileChange(event.target.value)}
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id} disabled={profile.disabled}>
                {profile.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.connectionDetails}>
          <h3>{profiles.find((profile) => profile.id === selectedProfileId)?.label ?? "Connection"}</h3>
          {details.length ? (
            <dl>
              {details.map((detail) => (
                <div key={detail.id}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {fields.length ? (
            <div className={styles.connectionFields}>
              {fields.map((field) => (
                <ConnectionField
                  key={field.id}
                  field={field}
                  inputId={`${idBase}-${field.id}`}
                  onChange={(value) => onFieldChange?.(field.id, value)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {error ? <p role="alert" className={styles.dialogError}>{error}</p> : null}
    </MopiensModal>
  );
}

export function MopiensLoginDialog({
  open,
  title = "Login",
  brandLabel = "MOPIENS",
  userName,
  password,
  busy = false,
  error,
  userNameLabel = "User Name",
  passwordLabel = "Password",
  loginLabel = "Login",
  closeLabel = "Close",
  onUserNameChange,
  onPasswordChange,
  onLogin,
  onClose,
}: MopiensLoginDialogProps) {
  const idBase = useId().replaceAll(":", "");
  return (
    <MopiensModal
      open={open}
      title={title}
      brandLabel={brandLabel}
      size="medium"
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy) onLogin();
      }}
      actions={[
        { id: "login", label: busy ? "Logging in..." : loginLabel, tone: "primary", type: "submit", disabled: busy },
        { id: "close", label: closeLabel, onClick: onClose, disabled: busy },
      ]}
    >
      <div className={styles.loginFields}>
        <div className={styles.dialogField}>
          <label htmlFor={`${idBase}-username`}>{userNameLabel}</label>
          <input
            id={`${idBase}-username`}
            data-autofocus
            value={userName}
            autoComplete="username"
            disabled={busy}
            onChange={(event) => onUserNameChange(event.target.value)}
          />
        </div>
        <div className={styles.dialogField}>
          <label htmlFor={`${idBase}-password`}>{passwordLabel}</label>
          <input
            id={`${idBase}-password`}
            type="password"
            value={password}
            autoComplete="current-password"
            disabled={busy}
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </div>
      </div>
      {error ? <p role="alert" className={styles.dialogError}>{error}</p> : null}
    </MopiensModal>
  );
}

export function MopiensConfirmationModal({
  open,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  tone = "warning",
  busy = false,
  onConfirm,
  onCancel,
}: MopiensConfirmationModalProps) {
  return (
    <MopiensModal
      open={open}
      role="alertdialog"
      title={title}
      size="small"
      onClose={onCancel}
      closeOnBackdrop={false}
      actions={[
        {
          id: "confirm",
          label: busy ? "Working..." : confirmLabel,
          tone: tone === "danger" ? "danger" : "warning",
          disabled: busy,
          autoFocus: true,
          onClick: onConfirm,
        },
        { id: "cancel", label: cancelLabel, disabled: busy, onClick: onCancel },
      ]}
    >
      <div className={`${styles.confirmationMessage} ${tone === "danger" ? styles.confirmationDanger : styles.confirmationWarning}`}>
        <span className={styles.confirmationSymbol} aria-hidden>
          {tone === "danger" ? "!" : "?"}
        </span>
        <div>{message}</div>
      </div>
    </MopiensModal>
  );
}
