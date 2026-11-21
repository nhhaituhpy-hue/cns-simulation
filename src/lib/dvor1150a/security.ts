import { SELEX_DVOR1150A_TRAINING_ACCOUNTS } from "@/lib/simulator-training-accounts";

export type SecurityUser = { userId: string; securityLevel: 1 | 2 | 3 | 4 };
export type SecurityField = "userId" | "password" | "securityLevel";
type Account = SecurityUser & { password: string };
type Draft = Account & { originalUserId: string };
export const DVOR_SECURITY_ROWS = 10;
export const DVOR_LOGIN_LOCK_SECONDS = 300;
export const DVOR_IDLE_SECONDS = 900;

/** Training credentials live only in this closure, never in serializable store state. */
export function createDvorSecuritySession() {
  let accounts: Account[] = [];
  let backup: Account[] = [];
  let draft: Draft[] = [];
  let elapsed = 0, lastActivity = 0, failed = 0, blockedUntil = 0;
  const copy = (items: Account[]) => items.map(item => ({ ...item }));
  const discard = () => {
    draft = Array.from({ length: DVOR_SECURITY_ROWS }, (_, i) => ({
      userId: accounts[i]?.userId ?? "", password: "", securityLevel: accounts[i]?.securityLevel ?? 1,
      originalUserId: accounts[i]?.userId ?? "",
    }));
  };
  const reset = () => {
    accounts = SELEX_DVOR1150A_TRAINING_ACCOUNTS.filter(item => item.userId !== "GUEST")
      .map(item => ({ ...item })).sort((a, b) => b.securityLevel - a.securityLevel);
    backup = copy(accounts); elapsed = 0; lastActivity = 0; failed = 0; blockedUntil = 0; discard();
  };
  reset();
  const publicUser = (item?: Account) => item ? { userId: item.userId, securityLevel: item.securityLevel } : null;
  return {
    reset, discard,
    rows: (): SecurityUser[] => draft.map(({ userId, securityLevel }) => ({ userId, securityLevel })),
    identity: (id: string | null) => publicUser(accounts.find(item => item.userId === id)),
    activity: () => { lastActivity = elapsed; },
    remaining: () => Math.max(0, blockedUntil - elapsed),
    advance(seconds: number, loggedIn: boolean, local: boolean) {
      if (!Number.isFinite(seconds) || seconds <= 0) return false;
      elapsed += seconds;
      if (elapsed >= blockedUntil && blockedUntil > 0) { blockedUntil = 0; failed = 0; }
      if (!loggedIn || local) lastActivity = elapsed;
      return loggedIn && !local && elapsed - lastActivity >= DVOR_IDLE_SECONDS;
    },
    login(userId: string, password: string): SecurityUser | null {
      if (blockedUntil > elapsed) return null;
      const account = userId === "GUEST" && password === "" ? { userId: "GUEST", securityLevel: 1 as const }
        : publicUser(accounts.find(item => item.userId === userId && item.password === password));
      if (account) { failed = 0; lastActivity = elapsed; return account; }
      failed++;
      if (failed >= 3) blockedUntil = elapsed + DVOR_LOGIN_LOCK_SECONDS;
      return null;
    },
    edit(index: number, field: SecurityField, value: string | number) {
      if (!Number.isInteger(index) || !draft[index]) return false;
      if (field === "securityLevel") {
        if (![1, 2, 3, 4].includes(Number(value)) || (index === 0 && Number(value) !== 4)) return false;
        draft[index].securityLevel = Number(value) as SecurityUser["securityLevel"];
      } else if ((field === "userId" || field === "password") && typeof value === "string") draft[index][field] = value;
      else return false;
      return true;
    },
    apply(currentId: string | null): { error?: string; identity: SecurityUser | null } {
      const next: Account[] = [];
      if (!draft[0].userId || draft[0].securityLevel !== 4) return { error: "The first account must remain Level 4.", identity: null };
      for (const row of draft) {
        if (!row.userId) continue;
        const previous = accounts.find(item => item.userId === row.originalUserId);
        const password = row.password || previous?.password || "";
        if (!/^[A-Za-z0-9]{4,32}$/.test(row.userId) || !/^[A-Za-z0-9]{4,32}$/.test(password)) {
          return { error: "User ID and Password must be 4–32 alphanumeric characters (case-sensitive).", identity: null };
        }
        if (row.userId === "GUEST" || next.some(item => item.userId === row.userId)) return { error: "User IDs must be unique; GUEST is reserved.", identity: null };
        next.push({ userId: row.userId, password, securityLevel: row.securityLevel });
      }
      const renamed = draft.find(row => row.originalUserId === currentId)?.userId;
      accounts = next; discard();
      return { identity: publicUser(accounts.find(item => item.userId === renamed)) };
    },
    changePassword(id: string, current: string, password: string, confirmation: string): string | null {
      const account = accounts.find(item => item.userId === id);
      if (!account || account.password !== current) return "Current Password is incorrect.";
      if (!/^[A-Za-z0-9]{4,32}$/.test(password)) return "Password must be 4–32 alphanumeric characters (case-sensitive).";
      if (password !== confirmation) return "New Password and confirmation do not match.";
      account.password = password;
      return null;
    },
    backup: () => { backup = copy(accounts); },
    restore: () => { accounts = copy(backup); discard(); },
  };
}
