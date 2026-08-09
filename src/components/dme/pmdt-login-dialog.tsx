"use client";

import { useState } from "react";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

/** Login surface documented in Section 3.6.6 of the 1118A/1119A manual. */
export function DmePmdtLoginDialog() {
  const login = useDmePmdtStore((state) => state.login);
  const loginError = useDmePmdtStore((state) => state.loginError);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");

  function submit() {
    if (login(userId, password)) {
      setUserId("");
      setPassword("");
    }
  }

  return (
    <div className="pmdt-login-overlay" role="presentation">
      <form
        className="pmdt-login-dialog"
        aria-label="Login"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <header className="pmdt-login-dialog-titlebar">
          <span>Login</span>
          <button type="button" aria-label="Cancel login" onClick={() => undefined}>×</button>
        </header>
        <div className="pmdt-login-dialog-body">
          <label>
            <span>User ID</span>
            <input
              id="dme-pmdt-login-user-id"
              name="userId"
              autoFocus
              type="text"
              value={userId}
              onChange={(event) => setUserId(event.currentTarget.value)}
              autoComplete="username"
            />
          </label>
          <label>
            <span>Password</span>
            <input
              id="dme-pmdt-login-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              autoComplete="current-password"
            />
          </label>
          {loginError ? <p className="pmdt-login-error" role="alert">{loginError}</p> : null}
        </div>
        <footer className="pmdt-login-dialog-actions">
          <button type="submit" className="pmdt-login-primary">OK</button>
          <button type="button" onClick={() => undefined}>Cancel</button>
        </footer>
      </form>
    </div>
  );
}
