"use client";

import { useState } from "react";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

export function Dvor1150LoginDialog() {
  const login = useDvor1150PmdtStore((state) => state.login);
  const error = useDvor1150PmdtStore((state) => state.loginError);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div className="pmdt-login-overlay" role="presentation">
      <form className="pmdt-login-dialog" aria-label="Login" onSubmit={(event) => {
        event.preventDefault();
        if (login(userId, password)) {
          setUserId("");
          setPassword("");
        }
      }}>
        <header className="pmdt-login-dialog-titlebar"><span>PMDT Login</span><button type="button" aria-label="Cancel login">×</button></header>
        <div className="pmdt-login-dialog-body">
          <label><span>User ID</span><input autoFocus value={userId} onChange={(event) => setUserId(event.currentTarget.value)} autoComplete="username" /></label>
          <label><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} autoComplete="current-password" /></label>
          {error ? <p className="pmdt-login-error" role="alert">{error}</p> : null}
        </div>
        <footer className="pmdt-login-dialog-actions"><button type="submit" className="pmdt-login-primary">OK</button><button type="button">Cancel</button></footer>
      </form>
    </div>
  );
}
