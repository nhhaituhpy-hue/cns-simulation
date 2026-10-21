import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AiAuthoringWizard } from "@/components/scenario/ai-authoring-wizard";
import { AiAuthoringField, initialValue } from "@/components/scenario/ai-authoring-field";
import { useState } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import type { JsonValue, ValueSchema } from "@/lib/ai/scenario-authoring/types";
import { authoringAdapterFor } from "@/lib/ai/scenario-authoring/forms/registry";
import { readPath } from "@/lib/ai/scenario-authoring/forms/helpers";
import { AuthoringError } from "@/lib/ai/scenario-authoring/errors";
import { authoringStateDto, createAuthoringState, mutateAuthoringState } from "@/lib/ai/scenario-authoring/state";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { AdsbScenarioDefinition } from "@/modules/devices/adsb/scenario-parameters";
import { compileAdsbActions } from "@/lib/ai/scenario-authoring/forms/adsb-actions";
import type { AuthoringMutation, AuthoringSession } from "@/lib/ai/scenario-authoring/types";

// Only transport/storage are doubled: native forms, wizard, state and adapters run unchanged.
function nativeServer(moduleId: ScenarioParametersModuleId, sectionId: string) {
  let session: AuthoringSession = {
    id: "native-field-session", actorId: "test-admin", moduleId, revision: 1,
    state: createAuthoringState(moduleId, "native-field-scenario"), documents: [], status: "editing",
    scenarioRowId: null, scenarioId: null, createdAt: "2026-10-21T00:00:00Z", updatedAt: "2026-10-21T00:00:00Z",
  };
  session.state = mutateAuthoringState(session.state, { action: "navigate", sectionId });
  const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("?moduleId=")) return reply({ sessions: [{ id: session.id, name: "Bản nháp native", status: "editing" }] });
    if (init?.method === "PATCH") {
      const { mutation, expectedRevision } = JSON.parse(init.body as string) as { mutation: AuthoringMutation; expectedRevision: number };
      expect(expectedRevision).toBe(session.revision);
      try {
        session = { ...session, state: mutateAuthoringState(session.state, mutation), revision: session.revision + 1 };
      } catch (error) {
        if (!(error instanceof AuthoringError)) throw error;
        return reply({ code: error.code, error: error.message, issues: error.issues }, 422);
      }
    }
    return reply({ session: authoringStateDto(session, null) });
  });
  vi.stubGlobal("fetch", fetcher);
  return { fetcher, get: () => session };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function environmentSchema() {
  const adapter = authoringAdapterFor("dvor-220");
  return adapter.form(adapter.createDefault()).fields.find(field => field.id === "runtime.faults")!.schema.variants!.find(variant => variant.value === "environment")!.schema;
}

it("initializes new nested object variants from cloned native payloads instead of mismatched base properties", () => {
  const schema = environmentSchema();
  const defaults = initialValue(schema);
  expect(defaults).toEqual(schema.variants![0].initial);
  (defaults as Record<string, JsonValue>).value = false;
  expect(schema.variants![0].initial).toMatchObject({ value: true });
  function OptionalEnvironment() {
    const [value, setValue] = useState<JsonValue>(null);
    return <AiAuthoringField schema={{ ...schema, nullable: true }} value={value} onChange={setValue} />;
  }
  render(<OptionalEnvironment />);
  fireEvent.click(screen.getByLabelText("Sử dụng environment"));
  expect(screen.getByLabelText("Fault ID")).toHaveValue("fault-environment-smoke");
  expect(screen.getByLabelText("Sensor state")).toBeChecked();
});

it("uses the same object discriminator inside ordinary lists instead of adding a second union selector", () => {
  const schema = environmentSchema();
  const onChange = vi.fn();
  render(<AiAuthoringField schema={{ type: "array", label: "Environments", help: "", item: schema }} value={[schema.variants![0].initial]} onChange={onChange} />);
  expect(screen.getByLabelText("Sensor")).toBeEnabled();
  expect(screen.queryByLabelText("Loại Environments 1")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Sensor"), { target: { value: "temperature" } });
  expect(onChange).toHaveBeenLastCalledWith([schema.variants!.find(variant => variant.value === "temperature")!.initial]);
});

it("keeps nested lookup IDs unique and stable across SSR hydration and rerenders", async () => {
  const adapter = authoringAdapterFor("ads-b");
  const action = adapter.form(adapter.createDefault()).fields.find(field => field.id === "actionPlan")!;
  const value = [{ loginUser: "sysadmin", inputs: ["1", "183"] }, { loginUser: "maintenance", inputs: ["2"] }];
  const onChange = vi.fn();
  const Fields = ({ disabled = false }) => <><AiAuthoringField schema={action.schema} value={value} onChange={onChange} disabled={disabled} /><AiAuthoringField schema={action.schema} value={value} onChange={onChange} disabled={disabled} /></>;
  const html = renderToString(<Fields />);
  expect(renderToString(<Fields />)).toBe(html);
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  const ids = Array.from(container.querySelectorAll("[id]"), element => element.id);
  expect(new Set(ids).size).toBe(ids.length);
  const inputs = within(container).getAllByRole("combobox", { name: "Input" }) as HTMLInputElement[];
  expect(inputs).toHaveLength(6);
  expect(new Set(inputs.map(input => input.list!.id)).size).toBe(inputs.length);
  for (const input of inputs) {
    expect(input.list).toBeInTheDocument();
    expect(input.list).toHaveAttribute("aria-label", "Gợi ý Input");
    expect(input).toHaveAccessibleDescription("Không chỉnh nhãn đáp án; engine tự tạo nhãn.");
  }
  const onRecoverableError = vi.fn();
  const onError = vi.spyOn(console, "error");
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => { root = hydrateRoot(container, <Fields />, { onRecoverableError }); });
    expect(Array.from(container.querySelectorAll("[id]"), element => element.id)).toEqual(ids);
    await act(async () => { root!.render(<Fields disabled />); });
    expect(Array.from(container.querySelectorAll("[id]"), element => element.id)).toEqual(ids);
    for (const input of inputs) expect(input).toBeDisabled();
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  } finally {
    if (root) await act(async () => { root!.unmount(); });
    container.remove();
    onError.mockRestore();
  }
});

it.each(["disabled", "readOnly"] as const)("locks recursive selectors, values and add/remove controls when %s", (mode) => {
  const schema = environmentSchema();
  const onChange = vi.fn();
  const view = render(<AiAuthoringField schema={{ type: "array", label: "Environments", help: "", item: schema, readOnly: mode === "readOnly" }} value={[schema.variants![0].initial]} disabled={mode === "disabled"} onChange={onChange} />);
  for (const control of view.container.querySelectorAll("input,select,button")) expect(control).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Thêm Environments" }));
  fireEvent.click(screen.getByRole("button", { name: "Xóa Environments 1" }));
  expect(onChange).not.toHaveBeenCalled();
  view.rerender(<AiAuthoringField schema={{ ...schema, properties: { ...schema.properties, sensor: { ...schema.properties!.sensor, readOnly: true } } }} value={schema.variants![0].initial} onChange={onChange} />);
  expect(screen.getByLabelText("Sensor")).toBeDisabled();
  expect(screen.getByLabelText("Sensor state")).toBeEnabled();
});

it("keeps the native scalar types and treats text suggestions as optional rather than enum validation", () => {
  const options = [{ value: "1", label: "Menu item" }];
  const properties: Record<string, ValueSchema> = {
    text: { type: "text", label: "Text", help: "", options },
    number: { type: "number", label: "Number", help: "" },
    boolean: { type: "boolean", label: "Boolean", help: "" },
    select: { type: "select", label: "Select", help: "", options },
    locked: { type: "text", label: "Locked input", help: "", options, readOnly: true },
  };
  const onChange = vi.fn();
  const value = { text: "1", number: 1, boolean: false, select: "1", locked: "1" };
  render(<AiAuthoringField schema={{ type: "object", label: "Scalars", help: "", properties }} value={value} onChange={onChange} />);
  fireEvent.change(screen.getByLabelText("Text"), { target: { value: "10.41.8.3" } });
  expect(onChange).toHaveBeenLastCalledWith({ ...value, text: "10.41.8.3" });
  fireEvent.change(screen.getByLabelText("Text"), { target: { value: "" } });
  expect(onChange).toHaveBeenLastCalledWith({ ...value, text: "" });
  fireEvent.change(screen.getByLabelText("Number"), { target: { value: "50" } });
  expect(onChange).toHaveBeenLastCalledWith({ ...value, number: 50 });
  fireEvent.click(screen.getByLabelText("Boolean"));
  expect(onChange).toHaveBeenLastCalledWith({ ...value, boolean: true });
  expect(screen.getByLabelText("Select").tagName).toBe("SELECT");
  expect(screen.getByLabelText("Select")).not.toHaveAttribute("list");
  expect(screen.getByLabelText("Locked input")).toBeDisabled();
  expect(screen.getByLabelText("Locked input")).toHaveAttribute("list");
});

it.each(["unsupported", "constructor", 1, null])("does not render a fallback object payload for invalid discriminator %s", (sensor) => {
  render(<AiAuthoringField schema={environmentSchema()} value={{ id: "bad", kind: "environment", sensor, value: true }} onChange={vi.fn()} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Không thể chỉnh an toàn");
  expect(screen.queryByLabelText("Sensor state")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Temperature")).not.toBeInTheDocument();
});

it("connects all ADS-B menu suggestions to native inputs without restricting free-typed workflow values", async () => {
  const api = nativeServer("ads-b", "actions");
  const adapter = authoringAdapterFor("ads-b");
  const action = adapter.form(api.get().state.definition).fields.find(field => field.id === "actionPlan")!;
  const options = action.schema.item!.properties!.inputs.item!.options!;
  expect(options).toHaveLength(149);
  const plan = [
    { loginUser: "sysadmin", inputs: ["9", "1", "0", "7", "10", "2", "1", "183", "127", "0", "X"] },
    { loginUser: "maintenance", inputs: ["1", "1", "2", "71", "0", "3", "209", "0"] },
  ];
  expect(options.some(option => option.value === "183")).toBe(false);
  render(<AiAuthoringWizard moduleId="ads-b" />);
  fireEvent.click(await screen.findByRole("button", { name: "Tiếp tục: Bản nháp native" }));
  const addSession = await screen.findByRole("button", { name: "Thêm Phiên terminal / chuỗi input" });
  for (const [index, segment] of plan.entries()) {
    fireEvent.click(addSession);
    fireEvent.change(screen.getAllByLabelText("Vai trò")[index], { target: { value: segment.loginUser } });
    const addInput = screen.getAllByText("Thêm Input native", { selector: "button" })[index];
    for (const value of segment.inputs) {
      fireEvent.click(addInput);
      const input = screen.getAllByLabelText("Input").at(-1)! as HTMLInputElement;
      expect(input.tagName).toBe("INPUT");
      expect(input.type).toBe("text");
      expect(input).toHaveAttribute("list");
      const list = document.getElementById(input.getAttribute("list")!)!;
      expect(list.tagName).toBe("DATALIST");
      expect(Array.from(list.querySelectorAll("option"), option => ({ value: option.value, label: option.label }))).toEqual(options);
      fireEvent.change(input, { target: { value } });
      expect(input).toHaveValue(value);
    }
  }
  fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
  await waitFor(() => expect(adapter.form(api.get().state.definition).fields.find(field => field.id === "actionPlan")!.value).toEqual(plan));
  expect(adapter.validate(api.get().state.definition, "final")).toEqual([]);
  const compiled = compileAdsbActions(api.get().state.definition as AdsbScenarioDefinition, plan);
  expect(compiled.state?.sensorDataProfile).toMatchObject({ endToEnd: { alertPower: 183, failurePower: 127 }, asterix: { sac: 71, sic: 209 } });
}, 30000);

it("saves DVOR220 temperature 50 and boolean variants through native form → wizard → state → native validation", async () => {
  const api = nativeServer("dvor-220", "faults");
  const adapter = authoringAdapterFor("dvor-220");
  render(<AiAuthoringWizard moduleId="dvor-220" />);
  fireEvent.click(await screen.findByRole("button", { name: "Tiếp tục: Bản nháp native" }));
  fireEvent.click(await screen.findByRole("button", { name: "Thêm Typed Faults" }));
  fireEvent.change(screen.getByLabelText("Loại Typed Faults 1"), { target: { value: "environment" } });
  expect(screen.getByLabelText("Sensor state")).toBeChecked();
  fireEvent.change(screen.getByLabelText("Sensor"), { target: { value: "temperature" } });
  expect(screen.getByRole("spinbutton", { name: "Temperature" })).toHaveValue(50);
  expect(screen.queryByLabelText("Sensor state")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Temperature"), { target: { value: "51" } });
  fireEvent.change(screen.getByLabelText("Temperature"), { target: { value: "50" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
  await waitFor(() => expect(readPath(api.get().state.definition, "runtime.faults")).toEqual([
    { id: "fault-environment-temperature", kind: "environment", sensor: "temperature", value: 50 },
  ]));
  expect(adapter.validate(api.get().state.definition, "final").filter(i => i.severity === "error")).toEqual([]);

  for (const sensor of ["smoke", "intrusion"]) {
    await waitFor(() => expect(screen.getByLabelText("Sensor")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Sensor"), { target: { value: sensor } });
    expect(screen.queryByLabelText("Temperature")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Sensor state")).toBeChecked();
    fireEvent.click(screen.getByLabelText("Sensor state"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
    await waitFor(() => expect(readPath(api.get().state.definition, "runtime.faults")).toEqual([
      { id: `fault-environment-${sensor}`, kind: "environment", sensor, value: false },
    ]));
    expect(adapter.validate(api.get().state.definition, "final").filter(i => i.severity === "error")).toEqual([]);
  }
  await waitFor(() => expect(screen.getByLabelText("Sensor")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Loại Typed Faults 1"), { target: { value: "pdc" } });
  expect(screen.queryByLabelText("Sensor")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Loại Typed Faults 1"), { target: { value: "environment" } });
  expect(screen.getByLabelText("Sensor")).toHaveValue("smoke");
  expect(screen.getByLabelText("Sensor state")).toBeChecked();
});
