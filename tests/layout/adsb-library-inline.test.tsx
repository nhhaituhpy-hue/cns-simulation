import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { AdsbAdminDashboard } from "@/modules/devices/adsb/admin-dashboard";
import { DEFAULT_SCENARIOS, useScenarioStore } from "@/stores/scenario-store";

const original = useScenarioStore.getState();
afterEach(() => { cleanup(); vi.unstubAllGlobals(); useScenarioStore.setState(original); });

it("puts ADS-B library auto-save in the same row and writes the canonical ID, not the legacy scenario ID", async () => {
  const scenario = { ...DEFAULT_SCENARIOS[0], id: "legacy-training-id", title: "ADS-B inline QA" };
  const canonicalId = "11111111-1111-4111-8111-111111111111";
  let exam: Array<{ id: string }> = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      const body = JSON.parse(String(init.body));
      expect(body).toEqual({ moduleId: "ads-b", libraryKind: "exam", scenarioIds: [canonicalId], selected: true, expectedRevision: 4 });
      exam = [{ id: canonicalId }];
      return new Response(JSON.stringify({ libraryRevision: 5 }));
    }
    if (url.includes("scenario-libraries")) return new Response(JSON.stringify({ practice: [], exam, libraryRevisions: { practice: 2, exam: exam.length ? 5 : 4 } }));
    return new Response(JSON.stringify([{ id: canonicalId, scenarioId: scenario.id, moduleId: "ads-b", name: scenario.title }]));
  });
  vi.stubGlobal("fetch", fetchMock);
  useScenarioStore.setState({ scenarios: [scenario], isHydrated: true, storageError: null, hydrate: vi.fn() });
  render(<AdsbAdminDashboard />);
  const row = screen.getByRole("heading", { name: scenario.title }).closest("tr")!;
  const examCheckbox = within(row).getByRole("checkbox", { name: /Thư viện Kiểm tra/ });
  await waitFor(() => expect(examCheckbox).toBeEnabled());
  expect(screen.getAllByRole("table")).toHaveLength(1);
  expect(screen.queryByText("Cài đặt thư viện")).not.toBeInTheDocument();
  expect(screen.getAllByRole("columnheader")).toHaveLength(7);
  await userEvent.setup().click(examCheckbox);
  await waitFor(() => expect(examCheckbox).toBeEnabled());
  expect(examCheckbox).toBeChecked();
  expect(fetchMock.mock.calls.filter(([, i]) => i?.method === "PATCH")).toHaveLength(1);
});
