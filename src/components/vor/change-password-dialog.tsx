"use client";

import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function ChangePasswordDialog() {
  const error = useVorPmdtStore(state => state.securityError);
  const change = useVorPmdtStore(state => state.changeOwnPassword);
  const close = useVorPmdtStore(state => state.setChangePasswordDialogOpen);
  return <div className="pmdt-login-overlay" role="presentation">
    <form className="pmdt-login-dialog" role="dialog" aria-label="Change Password" autoComplete="off" onSubmit={event => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      if (change(String(values.get("current")), String(values.get("password")), String(values.get("confirmation")))) window.alert("Password has been changed.");
    }}>
      <header className="pmdt-login-dialog-titlebar"><span>Change Password</span><button type="button" aria-label="Close Change Password" onClick={() => close(false)}>×</button></header>
      <div className="pmdt-login-dialog-body">
        <label><span>Current Password</span><input name="current" type="password" autoComplete="off" maxLength={32} /></label>
        <label><span>New Password</span><input name="password" type="password" autoComplete="new-password" maxLength={32} /></label>
        <label><span>Re-enter New Password</span><input name="confirmation" type="password" autoComplete="new-password" maxLength={32} /></label>
        {error && <p className="pmdt-login-error" role="alert">{error}</p>}
      </div>
      <footer className="pmdt-login-dialog-actions"><button type="submit" className="pmdt-login-primary">OK</button><button type="button" onClick={() => close(false)}>Cancel</button></footer>
    </form>
  </div>;
}
