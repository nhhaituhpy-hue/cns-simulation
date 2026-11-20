"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

function AccessDialog({ title, onClose, onSubmit, children }: {
  title: string;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) {
      if (element.showModal) element.showModal();
      else element.open = true;
    }
  }, []);
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  }
  return <dialog ref={dialog} className="pmdt-login-dialog dvor1150-access-dialog" aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <form onSubmit={handleSubmit} autoComplete="off">
      <header className="pmdt-login-dialog-titlebar"><span id={titleId}>{title}</span><button type="button" aria-label="Close dialog" onClick={onClose}>×</button></header>
      <div className="pmdt-login-dialog-body">{children}</div>
      <footer className="pmdt-login-dialog-actions"><button type="submit" className="pmdt-login-primary">OK</button><button type="button" onClick={onClose}>Cancel</button></footer>
    </form>
  </dialog>;
}

function LoginDialog() {
  const login = useDvor1150PmdtStore((state) => state.login);
  const cancelLogin = useDvor1150PmdtStore((state) => state.cancelLogin);
  const error = useDvor1150PmdtStore((state) => state.loginError);
  return <AccessDialog title="PMDT Login" onClose={cancelLogin} onSubmit={(data) => {
    login(String(data.get("userId") ?? ""), String(data.get("password") ?? ""));
  }}>
    <label><span>User ID</span><input name="userId" autoFocus /></label>
    <label><span>Password</span><input name="password" type="password" autoComplete="new-password" /></label>
    {error ? <p className="pmdt-login-error" role="alert">{error}</p> : null}
  </AccessDialog>;
}

function ModemDialog() {
  const openLogin = useDvor1150PmdtStore((state) => state.openLogin);
  const close = useDvor1150PmdtStore((state) => state.closeAccessDialog);
  return <AccessDialog title="System Directory" onClose={close} onSubmit={() => openLogin("modem")}>
    <label><span>Station Identifier</span><input name="station" autoFocus /></label>
    <label><span>Phone Number</span><input name="phone" type="tel" /></label>
    <label><span>Dial Mode</span><select name="dialMode"><option>Tone</option><option>Pulse</option></select></label>
    <small>Simulated modem; no call is placed. Leave the number blank for a leased line.</small>
  </AccessDialog>;
}

function PasswordDialog() {
  const changePassword = useDvor1150PmdtStore((state) => state.changePassword);
  const close = useDvor1150PmdtStore((state) => state.closeAccessDialog);
  const [error, setError] = useState<string | null>(null);
  return <AccessDialog title="Change Password" onClose={close} onSubmit={(data) => setError(changePassword(
    String(data.get("current") ?? ""), String(data.get("next") ?? ""), String(data.get("confirmation") ?? ""),
  ))}>
    <label><span>Current Password</span><input name="current" type="password" autoComplete="new-password" autoFocus /></label>
    <label><span>New Password</span><input name="next" type="password" autoComplete="new-password" /></label>
    <label><span>Confirm Password</span><input name="confirmation" type="password" autoComplete="new-password" /></label>
    {error ? <p className="pmdt-login-error" role="alert">{error}</p> : null}
  </AccessDialog>;
}

export function Dvor1150LoginDialog() {
  const loginOpen = useDvor1150PmdtStore((state) => state.loginDialogOpen);
  const accessDialog = useDvor1150PmdtStore((state) => state.accessDialog);
  const close = useDvor1150PmdtStore((state) => state.closeAccessDialog);
  if (loginOpen) return <LoginDialog />;
  if (accessDialog === "modem") return <ModemDialog />;
  if (accessDialog === "password") return <PasswordDialog />;
  if (accessDialog === "about") return <AccessDialog title="About PMDT" onClose={close} onSubmit={close}>
    <p>Model 1150 DVOR PMDT training simulator</p>
    <p>Reference: Rev. K, January 2008</p>
  </AccessDialog>;
  return null;
}
