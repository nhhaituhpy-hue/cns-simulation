/** PMDT Time Sync and every DVOR 220 clock use Vietnam time (no DST). */
export const DVOR220_TIME_ZONE = "Asia/Ho_Chi_Minh";
export const DVOR220_TIME_ZONE_LABEL = "UTC+7";
const VIETNAM_OFFSET_MS = 7 * 60 * 60_000;

export function formatDvor220DateTime(timestamp: number | Date): string {
  return new Date(timestamp).toLocaleString("en-GB", { hour12: false, timeZone: DVOR220_TIME_ZONE });
}

export function formatDvor220Time(timestampMs: number): string {
  return new Date(timestampMs).toLocaleTimeString("en-GB", { hour12: false, timeZone: DVOR220_TIME_ZONE });
}

/** `datetime-local` value (YYYY-MM-DDTHH:mm:ss.sss) in Vietnam time. */
export function toDvor220TimeInput(timestampMs: number): string {
  return new Date(timestampMs + VIETNAM_OFFSET_MS).toISOString().slice(0, 23);
}

export function parseDvor220TimeInput(value: string): number {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(value)
    ? Date.parse(`${value}+07:00`)
    : Number.NaN;
}
