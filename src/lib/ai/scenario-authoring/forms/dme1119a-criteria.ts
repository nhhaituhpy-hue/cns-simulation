import { dme1119aConfigurationTargetFields } from "@/lib/dme1119a/scenario";
import { getDmeParameterValue } from "@/lib/dme1119a/config";
import { getDefaultDme1119aConfig, hydrateDme1119aData } from "@/lib/simulator-config/dme-1119a";
import type { Dme1119aPersistedConfig } from "@/lib/simulator-config/types";
import type { ValueSchema } from "../types";

export function dme1119aConfigurationValuesSchema(configuration: Dme1119aPersistedConfig = getDefaultDme1119aConfig()): ValueSchema {
  const fields = dme1119aConfigurationTargetFields();
  const data = hydrateDme1119aData(configuration);
  return {
    type: "array", label: "Giá trị cấu hình bắt buộc", required: true,
    help: "Đối chiếu giá trị cấu hình đã Apply; không thay bằng trạng thái alarm Normal hoặc bằng chứng thao tác.",
    maxItems: fields.length, discriminator: "fieldId",
    variants: fields.map(field => ({
      value: field.id, label: `${field.section} · ${field.label}`,
      initial: { fieldId: field.id, value: getDmeParameterValue(data, field.id) },
      schema: {
        type: "object", label: `${field.section} · ${field.label}`, help: field.description, required: true,
        properties: {
          fieldId: { type: "select", label: "Trường cấu hình", help: field.description, required: true, options: [{ value: field.id, label: `${field.section} · ${field.label}` }] },
          value: { type: field.type, label: "Giá trị đích", required: true, help: field.description, unit: field.unit,
            min: field.min, max: field.max, options: field.options?.map(value => ({ value, label: value })) },
        },
      },
    })),
  };
}
