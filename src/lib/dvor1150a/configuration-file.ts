import type { Dvor1150aConfig } from "./config-types";
import { validateDvorConfig } from "./config-utils";
import { applyDvorConfigPatches } from "./config-service";
import { extractDvor1150aConfig, parseDvor1150aConfig } from "@/lib/simulator-config/dvor-1150a";

export const DVOR_CONFIGURATION_FILE_LIMIT = 1024 * 1024;
const format = "cns-dvor1150a-training-configuration";

export function serializeDvorConfiguration(config: Dvor1150aConfig): string {
  return JSON.stringify({ format, version: 1, configuration: extractDvor1150aConfig(config) }, null, 2);
}

export function parseDvorConfigurationFile(text: string): Dvor1150aConfig {
  if (!text.trim()) throw new Error("File cấu hình rỗng.");
  if (new TextEncoder().encode(text).length > DVOR_CONFIGURATION_FILE_LIMIT) throw new Error("File vượt quá 1 MiB.");
  let value;
  try { value = JSON.parse(text); } catch { throw new Error("File không phải JSON hợp lệ."); }
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join() !== "configuration,format,version"
    || value.format !== format || value.version !== 1) {
    throw new Error("Không hỗ trợ định dạng/phiên bản này. Chỉ nhận file training DVOR 1150A, không phải file SELEX.");
  }
  const config = parseDvor1150aConfig(value.configuration);
  if (!config || validateDvorConfig(config).length) throw new Error("Cấu hình thiếu trường, sai kiểu hoặc ngoài giới hạn.");
  if (!applyDvorConfigPatches(config).ok) throw new Error("Các tham số cấu hình không nhất quán.");
  return config;
}

export function dvorConfigurationLoadBlock(state: {
  securityLevel: number; config: Dvor1150aConfig; configDirty: boolean;
  scenario: { active: boolean }; protectionState: { phase: string };
}): string | undefined {
  if (state.scenario.active) return "Không nạp file cấu hình ngoài trong scenario.";
  if (state.securityLevel < 3) return "Yêu cầu đăng nhập SEC3 hoặc SEC4.";
  if (!state.config.simulation.local || !state.config.simulation.integralMonitorBypass) return "Đặt Local và Integral Monitor Bypass trước khi nạp (HC IV.8).";
  if (Object.values(state.config.transmitters).some(tx => tx.onAir || tx.load)) return "Tắt cả hai máy phát trước khi nạp (HC IV.8).";
  if (state.configDirty) return "Apply hoặc Reset nháp hiện tại trước khi nạp file.";
  if (state.protectionState.phase !== "monitoring") return "Chờ kết thúc bảo vệ/khởi tạo trước khi nạp file.";
  return undefined;
}
