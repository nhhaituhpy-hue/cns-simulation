"use client";

import { useState } from "react";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function PmdtLoginDialog() {
  const login = useVorPmdtStore((state) => state.login);
  const loginError = useVorPmdtStore((state) => state.loginError);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");

  function submit() {
    if (login(userId, password)) {
      setUserId("");
      setPassword("");
    }
  }

  function cancel() {
    setUserId("");
    setPassword("");
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
          <button type="button" aria-label="Cancel login" onClick={cancel}>×</button>
        </header>
        <div className="pmdt-login-dialog-body">
          <label>
            <span>User ID</span>
            <input
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
          <button type="button" onClick={cancel}>Cancel</button>
        </footer>
      </form>
    </div>
  );
}
