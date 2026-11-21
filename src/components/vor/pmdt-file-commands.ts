import { serializeDvorConfiguration, DVOR_CONFIGURATION_FILE_LIMIT } from "@/lib/dvor1150a/configuration-file";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function savePmdtConfiguration() {
  const state = useVorPmdtStore.getState();
  if (state.securityLevel < 1 || state.scenario.active) return;
  const url = URL.createObjectURL(new Blob([serializeDvorConfiguration(state.config)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "DVOR1150A-training-config-v1.json";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function loadPmdtConfiguration(file?: File) {
  if (!file) return;
  try {
    if (file.size > DVOR_CONFIGURATION_FILE_LIMIT) throw new Error("File vượt quá 1 MiB.");
    if (!useVorPmdtStore.getState().loadConfigurationFile(await file.text())) {
      window.alert(useVorPmdtStore.getState().lastCommand ?? "Không thể nạp cấu hình.");
      return;
    }
    window.alert("Đã nạp cấu hình training. Máy phát vẫn Off; dùng RMS > Config Backup để lưu backup.");
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "Không đọc được file cấu hình.");
  }
}

export function choosePmdtConfiguration() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.hidden = true;
  input.setAttribute("aria-label", "Configuration Load file (training JSON)");
  input.addEventListener("change", () => { void loadPmdtConfiguration(input.files?.[0]).finally(() => input.remove()); }, { once: true });
  input.addEventListener("cancel", () => input.remove(), { once: true });
  document.body.append(input);
  input.click();
}

export function printPmdtText(title: string, text: string) {
  const popup = window.open("", "_blank");
  if (!popup) { window.alert("Trình duyệt chặn cửa sổ in. Cho phép popup rồi thử lại."); return; }
  popup.opener = null;
  popup.document.title = title;
  const heading = popup.document.createElement("h1");
  heading.textContent = title;
  const content = popup.document.createElement("pre");
  content.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;font:11px monospace";
  content.textContent = text;
  popup.document.body.append(heading, content);
  popup.addEventListener("afterprint", () => popup.close(), { once: true });
  popup.focus();
  popup.print();
}

export function printPmdtConfiguration() {
  const state = useVorPmdtStore.getState();
  if (state.securityLevel < 1 || state.scenario.active) return;
  printPmdtText("DVOR 1150A — Simulator training configuration (not SELEX format)", serializeDvorConfiguration(state.config));
}

function screenText(element: Element | null) {
  return element instanceof HTMLElement ? element.innerText || element.textContent || "" : "";
}

export function printPmdtScreen(button: HTMLElement) {
  const root = button.closest(".pmdt-classic-window");
  printPmdtText("DVOR 1150A — PMDT screen (simulator text print)",
    [screenText(root?.querySelector(".pmdt-sidebar") ?? null), screenText(root?.querySelector(".pmdt-classic-main") ?? null)].join("\n\n"));
}

export async function copyPmdtLog(button: HTMLElement) {
  const text = screenText(button.closest("section")?.querySelector(".pmdt-rms-log-screen table") ?? null);
  if (!text.trim()) { window.alert("Không có dữ liệu log để copy."); return; }
  try { await navigator.clipboard.writeText(text); }
  catch { window.alert("Không truy cập được clipboard. Cho phép quyền clipboard rồi thử lại."); }
}
