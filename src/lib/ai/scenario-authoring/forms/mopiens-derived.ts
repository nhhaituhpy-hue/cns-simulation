import type { AuthoringField, JsonValue } from "../types";
import { previewDvor220Scenario } from "@/modules/operations/dvor-220/domain/scenario";
import type { Dvor220ScenarioDefinition } from "@/modules/operations/dvor-220/domain/types";
import type { Dme320ScenarioDefinition } from "@/modules/operations/dme-320/domain/types";
import { previewDme320Scenario } from "@/modules/operations/dme-320/domain/engine";
import { getDme320ChannelAllocation } from "@/modules/operations/dme-320/domain/channel-allocation";
import type { MopiensModule } from "./mopiens-schema";
export function mopiensDerivedFields(moduleId: MopiensModule, definition: Dvor220ScenarioDefinition | Dme320ScenarioDefinition): AuthoringField[] {
  const fields: AuthoringField[] = [];
  const add = (id: string, value: JsonValue, unit: string, sectionId = "rf") => fields.push({id: `derived.${id}`, sectionId, group: "Engine preview · chỉ đọc", value, baselineEligible: false, schema: {type: typeof value === "number" ? "number" : "text", nullable: true, label: id, help: "Số đo dẫn xuất từ preview engine native trên bản sao riêng; không sửa trực tiếp và không phải chứng minh khôi phục.", readOnly: true, unit}});
  if (moduleId === "dvor-220") {
    const {snapshot} = previewDvor220Scenario(definition as Dvor220ScenarioDefinition);
    for (const [tx, data] of Object.entries(snapshot.transmitters)) for (const [output, value] of Object.entries(data.forwardPowerW)) add(`${tx}.${output}.power`, value, "W");
    for (const [mon, monitor] of Object.entries(snapshot.monitors)) for (const [ch, channel] of Object.entries(monitor.channels)) for (const [parameter, reading] of Object.entries(channel.readings)) add(`${mon}.${ch}.${parameter}`, reading.value, reading.unit, "monitors");
  } else {
    const input = definition as Dme320ScenarioDefinition;
    const allocation = getDme320ChannelAllocation(input.configuration.station.channel);
    for (const [key, value] of Object.entries(allocation)) if (typeof value === "number") add(`channel.${key}`, value, key.endsWith("Mhz") ? "MHz" : "µs");
    const state = previewDme320Scenario(input);
    for (const [mon, monitor] of Object.entries(state.monitors)) for (const [ch, channel] of Object.entries(monitor.channels)) for (const [parameter, reading] of Object.entries(channel.readings)) add(`${mon}.${ch}.${parameter}`, reading.masked || !reading.valid ? null : reading.value, input.configuration.monitor.limits[parameter as keyof typeof input.configuration.monitor.limits].unit, "monitors");
  }
  return fields;
}
