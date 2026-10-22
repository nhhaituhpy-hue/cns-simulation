import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ScenarioLibraryControls,
  ScenarioLibraryColumnHeaders,
  ScenarioLibraryCells,
  ScenarioLibraryStatus,
} from "@/components/scenario/scenario-library-controls";
import type { StoredScenarioParameters } from "@/lib/scenario-parameters-storage";

const scenarios = [
  { id: "scenario-1", moduleId: "dme-320", name: "Suy giảm công suất" },
  { id: "scenario-2", moduleId: "dme-320", name: "Sai lệch khoảng cách xung" },
] as StoredScenarioParameters[];

type LibraryPayload = { practice: Array<{ id: string }>; exam: Array<{ id: string }>; libraryRevisions: { practice: number; exam: number } };
const initial = (): LibraryPayload => ({ practice: [{ id: "scenario-1" }], exam: [], libraryRevisions: { practice: 1, exam: 2 } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function Controls() {
  return <ScenarioLibraryControls moduleId="dme-320" scenarios={scenarios}>
    <table><thead><tr><th>Kịch bản</th><ScenarioLibraryColumnHeaders /></tr></thead>
      <tbody>{scenarios.map(s => <tr key={s.id}><th>{s.name}</th><ScenarioLibraryCells scenario={s} /></tr>)}</tbody>
    </table><ScenarioLibraryStatus />
  </ScenarioLibraryControls>;
}

function server() {
  let payload = initial();
  const fetchMock = vi.fn(async (_: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      const b = JSON.parse(String(init.body));
      const kind = b.libraryKind as "practice" | "exam";
      expect(b.expectedRevision).toBe(payload.libraryRevisions[kind]);
      const ids = new Set(payload[kind].map(item => item.id));
      for (const id of b.scenarioIds) { if (b.selected) ids.add(id); else ids.delete(id); }
      payload = { ...payload, [kind]: [...ids].map(id => ({ id })), libraryRevisions: { ...payload.libraryRevisions, [kind]: payload.libraryRevisions[kind] + 1 } };
      return json({ libraryRevision: payload.libraryRevisions[kind] });
    }
    return json(payload);
  });
  return { fetchMock, read: () => payload };
}

async function ready() {
  const checkbox = screen.getByRole("checkbox", { name: "Nạp “Suy giảm công suất” vào Thư viện Ôn tập" });
  await waitFor(() => expect(checkbox).toBeEnabled());
  return checkbox;
}

describe("inline library auto-save", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("automatically saves a row to either or both libraries and restores it on remount", async () => {
    const user = userEvent.setup();
    const { fetchMock, read } = server();
    vi.stubGlobal("fetch", fetchMock);
    const view = render(<Controls />);
    const practice = await ready();
    const exam = screen.getByRole("checkbox", { name: "Nạp “Suy giảm công suất” vào Thư viện Kiểm tra" });
    expect(practice).toBeChecked();
    expect(exam).not.toBeChecked();
    expect(fetchMock.mock.calls.filter(([, i]) => i?.method === "PATCH")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /Apply|Lưu thư viện/ })).not.toBeInTheDocument();
    await user.click(exam);
    await waitFor(() => expect(read().exam).toEqual([{ id: "scenario-1" }]));
    await waitFor(() => expect(exam).toBeEnabled());
    expect(practice).toBeChecked();
    expect(exam).toBeChecked();
    view.unmount();
    render(<Controls />);
    const restoredPractice = await ready();
    expect(screen.getByRole("checkbox", { name: "Nạp “Suy giảm công suất” vào Thư viện Kiểm tra" })).toBeChecked();
    await user.click(restoredPractice);
    await waitFor(() => expect(read().practice).toEqual([]));
    expect(read().exam).toEqual([{ id: "scenario-1" }]);
    expect(fetchMock.mock.calls.filter(([, i]) => i?.method === "PATCH")).toHaveLength(2);
  });

  it("sends only the clicked row as a delta, never resubmits retained published IDs", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(initial()))
      .mockResolvedValueOnce(json({ libraryRevision: 2 }))
      .mockResolvedValue(json({ ...initial(), practice: [{ id: "scenario-1" }, { id: "scenario-2" }], libraryRevisions: { practice: 2, exam: 2 } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Controls />);
    await ready();
    await userEvent.setup().click(screen.getByRole("checkbox", { name: "Nạp “Sai lệch khoảng cách xung” vào Thư viện Ôn tập" }));
    await ready();
    const writes = fetchMock.mock.calls.filter(([, i]) => i?.method && i.method !== "GET");
    expect(writes).toHaveLength(1);
    expect(writes[0][1]?.method).toBe("PATCH");
    expect(JSON.parse(String(writes[0][1]?.body))).toEqual({ moduleId: "dme-320", libraryKind: "practice", scenarioIds: ["scenario-2"], selected: true, expectedRevision: 1 });
  });

  it("auto-saves select-all with indeterminate and preserves the other library", async () => {
    const user = userEvent.setup();
    const { fetchMock, read } = server();
    vi.stubGlobal("fetch", fetchMock);
    render(<Controls />);
    await ready();
    const all = screen.getByRole("checkbox", { name: "Chọn tất cả Thư viện Ôn tập" });
    expect(all).toHaveProperty("indeterminate", true);
    await user.click(all);
    await waitFor(() => expect(read().practice.map(x => x.id)).toEqual(["scenario-1", "scenario-2"]));
    await waitFor(() => expect(all).toBeEnabled());
    expect(all).toBeChecked();
    expect(read().exam).toEqual([]);
    await user.click(all);
    await waitFor(() => expect(read().practice).toEqual([]));
  });

  it("locks controls while loading and saving, then verifies state by GET", async () => {
    let resolveLoad!: (r: Response) => void;
    let resolveWrite!: (r: Response) => void;
    const fetchMock = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { resolveLoad = resolve; }))
      .mockImplementationOnce(() => new Promise<Response>(resolve => { resolveWrite = resolve; }))
      .mockResolvedValue(json({ ...initial(), exam: [{ id: "scenario-1" }], libraryRevisions: { practice: 1, exam: 3 } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Controls />);
    expect(screen.getAllByRole("checkbox").every(e => (e as HTMLInputElement).disabled)).toBe(true);
    await act(async () => resolveLoad(json(initial())));
    await ready();
    await userEvent.setup().click(screen.getByRole("checkbox", { name: "Nạp “Suy giảm công suất” vào Thư viện Kiểm tra" }));
    expect(screen.getAllByRole("checkbox").every(e => (e as HTMLInputElement).disabled)).toBe(true);
    expect(screen.getByRole("status")).toHaveTextContent("Đang lưu");
    await act(async () => resolveWrite(json({ libraryRevision: 3 })));
    await ready();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][1]?.method).not.toBe("PATCH");
  });

  it("rolls back a failed save and shows the server error without retrying the write", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(initial()));
    vi.stubGlobal("fetch", fetchMock);
    render(<Controls />);
    await ready();
    fetchMock.mockResolvedValueOnce(json({ error: "Không có quyền công bố." }, 403));
    const exam = screen.getByRole("checkbox", { name: "Nạp “Suy giảm công suất” vào Thư viện Kiểm tra" });
    await userEvent.setup().click(exam);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không có quyền công bố.");
    expect(exam).not.toBeChecked();
    expect(fetchMock.mock.calls.filter(([, i]) => i?.method === "PATCH")).toHaveLength(1);
  });

  it("refreshes on revision conflict and uses the new revision for the next explicit click", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(initial()));
    vi.stubGlobal("fetch", fetchMock);
    render(<Controls />);
    await ready();
    fetchMock.mockResolvedValueOnce(json({ error: "Thư viện đã thay đổi ở phiên khác." }, 409))
      .mockResolvedValueOnce(json({ ...initial(), libraryRevisions: { practice: 1, exam: 9 } }));
    const exam = screen.getByRole("checkbox", { name: "Nạp “Suy giảm công suất” vào Thư viện Kiểm tra" });
    await userEvent.setup().click(exam);
    await screen.findByRole("alert");
    await waitFor(() => expect(exam).toBeEnabled());
    expect(exam).not.toBeChecked();
    fetchMock.mockResolvedValueOnce(json({ libraryRevision: 10 }))
      .mockResolvedValueOnce(json({ ...initial(), exam: [{ id: "scenario-1" }], libraryRevisions: { practice: 1, exam: 10 } }));
    await userEvent.setup().click(exam);
    await waitFor(() => expect(exam).toBeEnabled());
    const writes = fetchMock.mock.calls.filter(([, i]) => i?.method === "PATCH");
    expect(writes).toHaveLength(2);
    expect(JSON.parse(String(writes[1][1]?.body)).expectedRevision).toBe(9);
  });

  it("keeps controls disabled after an initial load failure instead of publishing an empty baseline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: "Unavailable" }, 503)));
    render(<Controls />);
    await screen.findByRole("alert");
    expect(screen.getAllByRole("checkbox").every(e => (e as HTMLInputElement).disabled)).toBe(true);
  });

  it("reconciles a committed write whose network response was lost without sending it twice", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(initial()))
      .mockRejectedValueOnce(new TypeError("Network disconnected"))
      .mockResolvedValue(json({ ...initial(), exam: [{ id: "scenario-1" }], libraryRevisions: { practice: 1, exam: 3 } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Controls />);
    await ready();
    const exam = screen.getByRole("checkbox", { name: "Nạp “Suy giảm công suất” vào Thư viện Kiểm tra" });
    await userEvent.setup().click(exam);
    await waitFor(() => expect(exam).toBeEnabled());
    expect(exam).toBeChecked();
    expect(screen.getByRole("alert")).toHaveTextContent("Network disconnected");
    expect(fetchMock.mock.calls.filter(([, i]) => i?.method === "PATCH")).toHaveLength(1);
  });

  it("preserves selected IDs outside the visible rows when using select-all", async () => {
    const outside = { ...initial(), practice: [{ id: "scenario-1" }, { id: "outside-visible" }] };
    const fetchMock = vi.fn().mockResolvedValueOnce(json(outside))
      .mockResolvedValueOnce(json({ libraryRevision: 2 }))
      .mockResolvedValue(json({ ...outside, practice: [{ id: "scenario-1" }, { id: "outside-visible" }, { id: "scenario-2" }], libraryRevisions: { practice: 2, exam: 2 } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Controls />);
    await ready();
    await userEvent.setup().click(screen.getByRole("checkbox", { name: "Chọn tất cả Thư viện Ôn tập" }));
    await ready();
    const write = fetchMock.mock.calls.find(([, i]) => i?.method === "PATCH");
    expect(JSON.parse(String(write?.[1]?.body)).scenarioIds).toEqual(["scenario-1", "scenario-2"]);
    expect(JSON.parse(String(write?.[1]?.body)).selected).toBe(true);
  });
});
