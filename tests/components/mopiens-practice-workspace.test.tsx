import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dvor220Simulator } from "@/modules/operations/dvor-220/dvor220-simulator";
import { Dme320Simulator } from "@/modules/operations/dme-320/dme320-simulator";
import { createDvor220Store } from "@/modules/operations/dvor-220/store/dvor220-store";
import { createDme320Store } from "@/modules/operations/dme-320/store/dme320-store";
import { nativeBlueprintFixture } from "../helpers/native-blueprint";
const route = vi.hoisted(() => ({ query: "" }));
const scenarioId = "11111111-1111-4111-8111-111111111111";
beforeEach(() => { route.query = `review=1&scenarioId=${scenarioId}&sessionKey=first`; });
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), forward: vi.fn(), prefetch: vi.fn(), push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }), useSearchParams: () => new URLSearchParams(route.query) }));
vi.mock("@/components/scenario/practice-ai-hints", () => ({ PracticeAiHints: () => <section aria-label="Gợi ý từ AI">Gợi ý</section> }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("native MOPIENS practice workspace", () => {
  it.each(["dvor-220", "dme-320"] as const)("invalidates %s readiness for same-scenario session changes and failed or stale loads", async moduleId => {
    const definition = nativeBlueprintFixture(moduleId).definition;
    const pending: Array<{ resolve: (response: Response) => void; reject: (error: Error) => void }> = [];
    const response = (description = definition.description) => new Response(JSON.stringify({
      id: scenarioId, moduleId, revision: 1, definition: { ...definition, description },
    }));
    let requests = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(url => {
      if (String(url).includes("practice-scenarios")) {
        requests += 1;
        return requests === 1 ? Promise.resolve(response()) : new Promise<Response>((resolve, reject) => pending.push({ resolve, reject }));
      }
      return Promise.resolve(new Response(JSON.stringify({ persisted: false }), { status: 404 }));
    });
    const dvorStore = createDvor220Store({ initialNowMs: 1 });
    const dmeStore = createDme320Store({ initialNowMs: 1 });
    const simulator = moduleId === "dvor-220" ? <Dvor220Simulator store={dvorStore} /> : <Dme320Simulator store={dmeStore} />;
    const view = render(simulator);
    expect(await screen.findByRole("button", { name: /Nộp bài/ })).toBeEnabled();
    const expectInert = () => {
      expect(view.container.querySelector("[data-practice-center]")).toHaveAttribute("inert");
      expect(screen.queryByRole("region", { name: "Gợi ý từ AI" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Nộp bài/ })).not.toBeInTheDocument();
    };
    const navigate = async (sessionKey: string) => {
      route.query = `review=1&scenarioId=${scenarioId}&sessionKey=${sessionKey}`;
      await act(async () => view.rerender(moduleId === "dvor-220" ? <Dvor220Simulator store={dvorStore} /> : <Dme320Simulator store={dmeStore} />));
    };
    await navigate("second");
    expect(pending).toHaveLength(1);
    expectInert();
    await navigate("third");
    expect(pending).toHaveLength(2);
    await act(async () => pending[0].resolve(response("Stale second session")));
    expectInert();
    await act(async () => pending[1].reject(new Error("New session load failed")));
    expectInert();
    await navigate("fourth");
    expectInert();
    await act(async () => pending[2].resolve(response("Matching fourth session")));
    expect(screen.getByRole("region", { name: "Mô tả tình huống" })).toHaveTextContent("Matching fourth session");
    expect(view.container.querySelector("[data-practice-center]")).not.toHaveAttribute("inert");
    expect(screen.getByRole("region", { name: "Gợi ý từ AI" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nộp bài/ })).toBeEnabled();
  });
  it.each(["dvor-220", "dme-320"] as const)("places %s native simulator in three columns with one submit", async moduleId => {
    const definition = nativeBlueprintFixture(moduleId).definition;
    vi.spyOn(globalThis, "fetch").mockImplementation(async url => {
      if (String(url).includes("practice-scenarios") || String(url).includes("scenario-parameters")) {
        const row = { id: "11111111-1111-4111-8111-111111111111", moduleId, revision: 1, definition };
        return new Response(JSON.stringify(String(url).includes("practice-scenarios") ? row : [row]));
      }
      return new Response(JSON.stringify({ persisted: false }), { status: 404 });
    });
    await act(async () => render(moduleId === "dvor-220" ? <Dvor220Simulator store={createDvor220Store({ initialNowMs: 1 })} /> : <Dme320Simulator store={createDme320Store({ initialNowMs: 1 })} />));
    expect(await screen.findByRole("region", { name: "Mô tả tình huống" })).toHaveTextContent(definition.description);
    expect(screen.getByRole("region", { name: "Simulator thao tác" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Trợ giúp và nộp bài" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bước 2.*Xác định phần cứng/ })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: /Nộp bài/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "AI nhận xét bài làm" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Connection List" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog", { name: "Connection List" })).getByRole("button", { name: "Connect" }));
    expect(screen.getByRole("dialog", { name: "Login" })).toBeInTheDocument();
  });
});
