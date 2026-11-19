import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AdsbSimulatorLab } from "@/components/admin/adsb-simulator-lab";
import { PUT } from "@/app/api/simulator-config/[simulatorId]/route";
import { getDefaultAdsbConfig } from "@/lib/simulator-config/ads-b";
import type { TerminalWindowProps } from "@/components/terminal/terminal-window";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: async () => ({ id: "owner" }) }));
vi.mock("@/lib/db", () => ({ queryDatabase: mocks.query, withDatabaseTransaction: vi.fn() }));
vi.mock("@/components/terminal/terminal-window", () => ({
  TerminalWindow: ({ onSubmit, pendingPrompt }: TerminalWindowProps) => (
    <button onClick={() => onSubmit(pendingPrompt === "login" ? "sysadmin" : "password")}>Login</button>
  ),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("saves Restart from a nondefault profile without a null operator", async () => {
  const savedConfig = getDefaultAdsbConfig();
  savedConfig.sensorDataProfile!.sensorName = "Saved station";
  const savedResponse = {
    simulatorId: "ads-b", schemaVersion: 1, initialConfig: savedConfig,
    appliedConfig: savedConfig, backupConfig: savedConfig,
    preferences: {}, revision: 1, persisted: true, history: [],
  };
  mocks.query.mockImplementation(async (_sql: string, values: unknown[]) => ({
    rows: [{ schema_version: 1, initial_config: savedConfig,
      applied_config: values[3], backup_config: savedConfig, revision: 2 }],
  }));
  let putBody: Record<string, unknown> | undefined;
  let putStatus: number | undefined;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
    if (options.method === "GET") return Response.json(savedResponse);
    expect(options.method).toBe("PUT");
    putBody = JSON.parse(options.body as string);
    const response = await PUT(new Request(`http://localhost${url}`, options), {
      params: Promise.resolve({ simulatorId: "ads-b" }),
    });
    putStatus = response.status;
    return response;
  }));

  render(<AdsbSimulatorLab />);
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("saved"));
  expect(mocks.query).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Login" }));
  fireEvent.click(screen.getByRole("button", { name: "Login" }));

  fireEvent.click(screen.getByRole("button", { name: "Khởi động lại" }));

  await waitFor(() => expect(putBody).toBeDefined());
  expect(putBody).not.toHaveProperty("operatorUserId");
  expect(putBody).toMatchObject({
    action: "apply", expectedRevision: 1,
    changedFields: ["sensorDataProfile.sensorName"], config: getDefaultAdsbConfig(),
  });
  await waitFor(() => expect(mocks.query).toHaveBeenCalledOnce());
  expect(mocks.query.mock.calls[0][1][7]).toBeNull();
  expect(putStatus).toBe(200);
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("saved"));
});
