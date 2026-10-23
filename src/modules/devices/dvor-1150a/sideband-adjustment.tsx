"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./sideband-adjustment.module.css";
import { readSidebandTrim, SIDEBAND_TRIMS, SIDEBAND_TRAINING, SIDEBAND_SCALES, type SidebandAngles, type SidebandTrimId, type SidebandTransmitterData } from "./sideband-adjustment-model";

interface AdjustmentDialogProps {
  trimId: SidebandTrimId;
  angles: SidebandAngles;
  occurrenceId: string;
  transmitterData: SidebandTransmitterData | null;
  onTurn: (delta: number) => void;
  onClose: () => void;
}

export function SidebandAdjustmentDialog({ trimId, angles, occurrenceId, transmitterData, onTurn, onClose }: AdjustmentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const metalId = useId();
  const handleId = useId();
  const trim = SIDEBAND_TRIMS[trimId];
  const scale = SIDEBAND_SCALES[trim.kind];
  const [powerStep, setPowerStep] = useState<number>(SIDEBAND_TRAINING.step);
  const step = trim.kind === "power" ? powerStep : SIDEBAND_TRAINING.step;
  const { angle, power, controlVoltage } = readSidebandTrim(angles, trimId);
  const activeSideband = transmitterData ? transmitterData.upper + (trim.powerTrim === "R6" ? 1 : 0) : null;
  useEffect(() => {
    // Removing the dialog removes it from the native top layer. Do not close
    // in cleanup: StrictMode replays effects and close would dismiss the UI.
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }, []);

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); dialogRef.current?.close(); }}
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h3 id={titleId}>{occurrenceId.replace("sideband-", "").toUpperCase()} · {trimId} · {trim.label}</h3>
          <button type="button" aria-label="Đóng" onClick={() => dialogRef.current?.close()}>×</button>
        </header>
        {trim.kind === "calibration" ? <section className={styles.pmdt} aria-label="PMDT Transmitter Data">
          <div className={styles.pmdtTitle}>Transmitter Data</div>
          {transmitterData ? <>
            <div className={styles.pmdtTab}>PMDT · Tx #{transmitterData.tx} · SB{activeSideband} CAL</div>
            <fieldset><legend>Power</legend>
              <table aria-label={`Công suất PMDT Tx #${transmitterData.tx}`}>
                <thead><tr><th scope="col">Sideband</th><th scope="col">Tx #{transmitterData.tx}</th></tr></thead>
                <tbody>{transmitterData.readings.map((reading) => <tr key={reading.sideband} aria-current={reading.sideband === activeSideband ? "true" : undefined}>
                  <th scope="row">SB{reading.sideband}</th>
                  <td><output aria-label={`PMDT Tx #${transmitterData.tx} SB${reading.sideband}`}>{reading.indicatedPower.toFixed(2)} W</output></td>
                </tr>)}</tbody>
              </table>
            </fieldset>
            <div className={styles.reference} aria-label="Công suất tham chiếu">Wattmeter SB{activeSideband}: {power.toFixed(2)} W</div>
          </> : <p>Không xác định được module Sideband.</p>}
        </section> : <div className={styles.meter}>
          <strong>{trim.kind === "power" ? "WATTMETER" : "MEAN PHASE CONTROL"}</strong>
          {trim.kind === "power" ? <>
            <output aria-label="Công suất mô phỏng">{power.toFixed(2)} W</output>
            <meter aria-label="Thang công suất đào tạo" min={SIDEBAND_TRAINING.minPower} max={SIDEBAND_TRAINING.maxPower} value={power} />
            <div className={styles.ticks} aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((tick) => <span key={tick}>{tick}</span>)}</div>
          </> : <output aria-label="Điện áp điều khiển pha">{trim.point} · {controlVoltage.toFixed(2)} VDC</output>}
        </div>}
        <svg viewBox="0 0 200 200" className={styles.tool} aria-hidden="true">
          <defs>
            <radialGradient id={metalId} cx="32%" cy="25%"><stop stopColor="#fff" /><stop offset="0.55" stopColor="#c1ccd1" /><stop offset="1" stopColor="#52636c" /></radialGradient>
            <linearGradient id={handleId}><stop stopColor="#783611" /><stop offset="0.45" stopColor="#fb923c" /><stop offset="0.65" stopColor="#fdba74" /><stop offset="1" stopColor="#9a3412" /></linearGradient>
          </defs>
          <circle cx="100" cy="103" r="43" fill="#080f16" opacity="0.5" />
          <circle cx="100" cy="100" r="40" fill={`url(#${metalId})`} stroke="#647580" strokeWidth="3" />
          <circle cx="100" cy="100" r="33" fill="none" stroke="#edf4f7" opacity="0.6" />
          <g className={styles.rotation} data-testid="screwdriver-rotation" transform={`rotate(${angle} 100 100)`}>
            <path d="M73 100h54" stroke="#182226" strokeWidth="8" strokeLinecap="round" />
            <path d="M75 97h50" stroke="#fff" strokeWidth="1.5" opacity="0.7" />
            <path d="M96 101L95 90L97 49H103L105 90L104 101Z" fill={`url(#${metalId})`} stroke="#52636c" />
            <rect x="88" y="13" width="24" height="44" rx="8" fill={`url(#${handleId})`} stroke="#783611" strokeWidth="2" />
            <path d="M93 21v26M100 19v29M107 21v26" stroke="#783611" opacity="0.65" strokeWidth="2" />
          </g>
        </svg>
        <output className={styles.angle} aria-label="Góc xoay">{angle}°</output>
        {trim.kind === "power" ? <div className={styles.step}>
          <output aria-label="Số vòng từ vị trí chuẩn">{(angle / 360).toFixed(2)} vòng</output>
          <label>Bước xoay <select value={powerStep} onChange={(event) => setPowerStep(Number(event.target.value))}>
            <option value={SIDEBAND_TRAINING.step}>Tinh · 15°</option>
            <option value={SIDEBAND_SCALES.power.coarseStep}>Thô · 1 vòng</option>
          </select></label>
        </div> : null}
        <div className={styles.controls}>
          <button type="button" aria-label="Ngược chiều kim đồng hồ" disabled={angle <= scale.minAngle} onClick={() => onTurn(-step)}><span aria-hidden="true">↶</span> Ngược chiều</button>
          <button type="button" aria-label="Thuận chiều kim đồng hồ" disabled={angle >= scale.maxAngle} onClick={() => onTurn(step)}><span aria-hidden="true">↷</span> Thuận chiều</button>
        </div>
        <p className={styles.note}>Quy ước đào tạo · {trim.kind === "power" ? "0–5 W qua 10 vòng; 0,5 W/vòng, 0° = 2,5 W. Không phải đặc tính hãng." : trim.kind === "calibration" ? "CAL chỉ đổi số đọc PMDT, không đổi công suất thực. Chiều xoay và tỷ lệ không phải đặc tính hãng." : "Chiều xoay và tỷ lệ số đo không phải đặc tính hãng."}</p>
      </div>
    </dialog>
  );
}
