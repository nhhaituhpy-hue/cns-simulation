import type { ScenarioExamAvailability } from "./types";

export const scenarioExamAvailabilityLabel: Record<ScenarioExamAvailability, string> = {
  draft: "Bản nháp",
  upcoming: "Chưa đến giờ",
  available: "Đang nhận thí sinh",
  ended: "Đã hết giờ",
  locked: "Đã khóa",
  closed: "Đã đóng",
  archived: "Đã lưu trữ",
};

const examDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Explicit exam timezone keeps server rendering and browsers in other zones identical.
export function formatScenarioExamDate(value: string | null, emptyLabel = "Không giới hạn"): string {
  if (!value) return emptyLabel;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Thời gian không hợp lệ" : examDateFormatter.format(date);
}
