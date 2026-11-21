"use client";

import { useEffect, useRef } from "react";
import { AC_REFERENCE, COMMON_AC_INPUT_BCPS, HARDWARE_TRIMS, indicatedAc, type HardwareAssembly } from "@/lib/dvor1150a/hardware-calibration";
import { readDvorTransmitterRfPower } from "@/lib/dvor1150a/engine";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import styles from "./sideband-adjustment.module.css";

export function HardwareCalibrationDialog({ assembly, onClose }: { assembly: HardwareAssembly; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const state = useVorPmdtStore();
  const calibration = state.config.hardwareCalibration!;
  const ac = assembly === "rf" ? null : indicatedAc(assembly, calibration);
  const installed = assembly !== "bcps2" || state.config.station.transmitterConfig === "Dual Transmitters";
  const ready = installed && state.config.simulation.local && state.config.simulation.integralMonitorBypass;
  useEffect(() => { if (!ref.current?.open) ref.current?.showModal(); }, []);
  return <dialog ref={ref} className={styles.dialog} aria-label={`Hiệu chỉnh detector ${assembly.toUpperCase()}`}
    onClose={onClose} onCancel={() => ref.current?.close()}>
    <div className={styles.content}>
      <header className={styles.header}><h3>Hiệu chỉnh detector {assembly.toUpperCase()} · mô phỏng phần cứng</h3>
        <button type="button" aria-label="Đóng hiệu chỉnh detector" onClick={() => ref.current?.close()}>×</button></header>
      <p className={styles.note}>Không phải màn PMDT. Trim chỉ hiệu chỉnh chỉ thị, không sửa công suất RF, phối hợp trở kháng hay nguồn AC vật lý.</p>
      {assembly === "rf" ? <section aria-label="Wattmeter RF độc lập">
        {(["tx1", "tx2"] as const).map((id, index) => {
          const tx = state.derived.effectiveTransmitters[id];
          const power = readDvorTransmitterRfPower(tx).carrier;
          return <p key={id}>TX{index + 1} · {tx.load ? "Load / R3" : tx.onAir ? "Antenna / R1–R2" : "Off"} ·
            Wattmeter mô phỏng: <output aria-label={`RF thực TX${index + 1}`}>{power.forward.toFixed(2)} W</output> ·
            Phản xạ: {power.reflected.toFixed(3)} W · VSWR thực: {tx.onAir || tx.load ? tx.carrierVswr.toFixed(3) : "—"} ·
            PMDT: <output aria-label={`RF chỉ thị TX${index + 1}`}>{state.data.txPower[0][id].toFixed(2)} W</output> ·
            VSWR chỉ thị: {(index === 0 ? state.data.txVswr[0].value1 : state.data.txVswr[0].value2)?.toFixed(3) ?? "—"}</p>;
        })}
        <p className={styles.note}>HC: R1/R3 so số ghi khi hoạt động tốt; không có hồ sơ reference được duyệt. Wattmeter độc lập là dụng cụ mô phỏng, không thay số lịch sử thực. R2: chỉ thị &lt;1,25 không chứng nhận anten tốt.</p>
      </section> : <section aria-label="DVM và ampe kìm AC độc lập">
        <p>DVM AC · 1A6 TB3-1/2 (Line–Neutral): <output aria-label="DVM AC">{AC_REFERENCE.volts.toFixed(1)} VAC</output></p>
        <p>Ampe kìm AC · dây Line 1A6 TB3-1: <output aria-label="Ampe kìm AC">{AC_REFERENCE.amps.toFixed(2)} A</output></p>
        <p>Chỉ thị {assembly.toUpperCase()}: <output aria-label="Chỉ thị AC">{ac!.volts.toFixed(1)} VAC / {ac!.amps.toFixed(2)} A</output></p>
        <p>Sai số HC: ≤1 VAC · ≤0,3 A. <output aria-label="Kết quả so sánh AC">{Math.abs(ac!.volts - AC_REFERENCE.volts) <= 1 + 1e-9 && Math.abs(ac!.amps - AC_REFERENCE.amps) <= 0.3 + 1e-9 ? "Trong dung sai" : "Ngoài dung sai"}</output></p>
        <p className={styles.note}>AC Input chung trên PMDT tạm lấy {COMMON_AC_INPUT_BCPS.toUpperCase()}: quy tắc simulator chưa xác minh tại trạm. Hai BCPS lưu trim riêng. Reference AC giữ baseline 232,3 V / 2,3 A; chưa có mô hình tải điện.</p>
      </section>}
      {HARDWARE_TRIMS[assembly].map(trim => {
        const angle = Number((calibration[assembly] as Record<string, number>)[trim]);
        return <fieldset key={trim}><legend>{trim} · {trim === "R1" ? "CSB FWD ADJ" : trim === "R2" ? "CSB RFL ADJ" : trim === "R3" ? "STANDBY ADJ" : trim === "R30" ? "AC Voltage" : "AC Current"}</legend>
          <output aria-label={`Góc ${trim}`}>{angle}°</output>
          <div className={styles.controls}>
            <button type="button" aria-label={`Giảm ${trim}`} disabled={!ready || angle <= -180} onClick={() => state.turnHardwareTrim(assembly, trim, -15)}>↶ −15°</button>
            <button type="button" aria-label={`Tăng ${trim}`} disabled={!ready || angle >= 180} onClick={() => state.turnHardwareTrim(assembly, trim, 15)}>↷ +15°</button>
          </div></fieldset>;
      })}
      {!ready ? <p role="status">{installed ? "Cần Local và Monitor Bypass để hiệu chỉnh." : "BCPS2 chưa được lắp trong cấu hình Single Transmitter."}</p> : null}
      <p className={styles.note}>Quy ước đào tạo, không phải đặc tính hãng: ±180°; RF gain 0–2×, AC gain 0,8–1,2×, 0° trung tính. Không mô phỏng tháo card, thao tác điện sống hay chứng nhận an toàn; làm thực theo HDCV và người hướng dẫn.</p>
    </div>
  </dialog>;
}
