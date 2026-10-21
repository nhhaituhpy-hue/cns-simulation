import type { AuthoringIssue } from "./types";
export class AuthoringError extends Error {
  constructor(public readonly code: string, message: string, public readonly issues: AuthoringIssue[] = []) { super(message); this.name="AuthoringError"; }
}
