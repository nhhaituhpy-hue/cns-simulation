"use client";

import { useState } from "react";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

/** Password change command from RMS >> Commands in the 1119A manual. */
export function DmePmdtPasswordDialog() {
  const setOpen = useDmePmdtStore((state) => state.setPasswordDialogOpen);
  const changePassword = useDmePmdtStore((state) => state.changePassword);
  const loginError = useDmePmdtStore((state) => state.loginError);
  const userId = useDmePmdtStore((state) => state.authenticatedUserId);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  function submit() {
    if (changePassword(currentPassword, nextPassword, confirmation)) {
      setCurrentPassword("");
      setNextPassword("");
      setConfirmation("");
    }
  }

  return (
    <div className="pmdt-login-overlay" role="presentation">
      <form
        className="pmdt-login-dialog"
        aria-label="Change Password"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <header className="pmdt-login-dialog-titlebar">
          <span>Change Password</span>
          <button type="button" aria-label="Cancel password change" onClick={() => setOpen(false)}>×</button>
        </header>
        <div className="pmdt-login-dialog-body">
          <p className="mb-2 text-[11px] text-[#94a3b8]">User ID: {userId ?? ""}</p>
          <label>
            <span>Current Password</span>
            <input
              id="dme-pmdt-current-password"
              name="currentPassword"
              autoFocus
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.currentTarget.value)}
              autoComplete="current-password"
            />
          </label>
          <label>
            <span>New Password</span>
            <input
              id="dme-pmdt-new-password"
              name="newPassword"
              type="password"
              value={nextPassword}
              onChange={(event) => setNextPassword(event.currentTarget.value)}
              autoComplete="new-password"
            />
          </label>
          <label>
            <span>Re-enter New Password</span>
            <input
              id="dme-pmdt-password-confirmation"
              name="confirmation"
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.currentTarget.value)}
              autoComplete="new-password"
            />
          </label>
          {loginError ? <p className="pmdt-login-error" role="alert">{loginError}</p> : null}
          <p className="pmdt-login-hint">4–32 characters; Local mode is required.</p>
        </div>
        <footer className="pmdt-login-dialog-actions">
          <button type="submit" className="pmdt-login-primary">OK</button>
          <button type="button" onClick={() => setOpen(false)}>Cancel</button>
        </footer>
      </form>
    </div>
  );
}
