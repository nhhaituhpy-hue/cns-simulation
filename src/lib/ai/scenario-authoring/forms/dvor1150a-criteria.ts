import { dvor1150aConfigurationTargetFields } from "@/lib/dvor1150a/scenario";
import { getDvorConfigValue } from "@/lib/dvor1150a/config-utils";
import type { Dvor1150aConfig } from "@/lib/dvor1150a/config-types";
import type { ValueSchema } from "../types";

/** One catalog-owned variant per scalar keeps field identity and value type coupled. */
export function dvor1150aConfigurationValuesSchema(configuration: Dvor1150aConfig): ValueSchema {
  const fields = dvor1150aConfigurationTargetFields();
  return {
    type: "array", label: "Giá trị cấu hình bắt buộc", required: true,
    help: "Đối chiếu đúng cấu hình đã Apply. Không thay bằng alarm Normal hoặc tự chứng minh quy trình; đơn vị/giới hạn lấy từ catalog simulator, không phải giới hạn hãng mới.",
    maxItems: fields.length, discriminator: "fieldId",
    variants: fields.map(field => ({
      value: field.id, label: `${field.section} · ${field.label}`,
      initial: { fieldId: field.id, value: getDvorConfigValue(configuration, field.id) },
      schema: {
        type: "object", label: `${field.section} · ${field.label}`, help: field.description, required: true,
        properties: {
          fieldId: { type: "select", label: "Trường cấu hình", help: field.description, required: true, options: [{ value: field.id, label: `${field.section} · ${field.label}` }] },
          value: { type: field.type, label: "Giá trị đích", help: field.description+(field.effectNotice?` ${field.effectNotice}`:"")+(field.type==="number"&&field.min===undefined?" Hàng rào số biểu diễn phần mềm, không phải giới hạn hãng.":""), required: true, unit: field.unit,
            min: field.min??(field.type==="number"?-Number.MAX_SAFE_INTEGER:undefined), max: field.max??(field.type==="number"?Number.MAX_SAFE_INTEGER:undefined),
            options: field.options?.map(value => ({ value, label: value })) },
        },
      },
    })),
  };
}
