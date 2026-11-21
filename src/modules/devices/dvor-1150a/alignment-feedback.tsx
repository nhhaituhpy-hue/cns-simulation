"use client";

import { readMonitorAlignment, readSidebandAlignment, readSynthesizerAlignment, type DvorAlignmentReading } from "@/lib/dvor1150a/alignment";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

const labels = { pass: "Trong dải HC", fail: "Ngoài dải HC", unavailable: "Không có tín hiệu đo" };

export function AlignmentReadings({ readings }: { readings: DvorAlignmentReading[] }) {
  return <dl className="grid gap-2 text-sm" aria-label="Số đo DMM mô phỏng">
    {readings.map(reading => <div key={reading.id} className="rounded border border-slate-500 p-2">
      <dt className="font-bold">{reading.id}</dt>
      <dd>
        <output aria-label={`${reading.id} đo mô phỏng`} data-status={reading.status} className={reading.status === "fail" ? "text-red-800" : reading.status === "pass" ? "text-emerald-800" : "text-slate-700"}>
          {reading.value === null ? "—" : `${reading.value.toFixed(reading.unit === "MHz" ? 6 : 3)} ${reading.unit}`} · {labels[reading.status]}
        </output>
        <span className="block">HC: {reading.min.toFixed(reading.unit === "MHz" ? 6 : 3)}…{reading.max.toFixed(reading.unit === "MHz" ? 6 : 3)} {reading.unit}</span>
      </dd>
    </div>)}
  </dl>;
}

export function DvorAlignmentFeedback({ blockId, occurrenceId }: { blockId: string; occurrenceId?: string }) {
  const config = useVorPmdtStore(state => state.config);
  const snapshot = useVorPmdtStore(state => state.derived);
  if (!occurrenceId) return null;
  const readings = blockId === "sideband" ? readSidebandAlignment(config, snapshot, occurrenceId)
    : blockId === "synthesizer" ? readSynthesizerAlignment(config, snapshot, occurrenceId) : [];
  const monitor = blockId === "monitor-cca" ? occurrenceId === "monitor-1a3a3" ? "mon1" : occurrenceId === "monitor-1a3a10" ? "mon2" : null : null;
  if (!readings.length && !monitor) return null;
  return <section aria-label={`Hiệu chỉnh mô phỏng ${occurrenceId}`} className="my-4 grid gap-3 rounded border border-slate-500 p-3">
    <h3 className="font-bold">Đo kiểm mô phỏng · {occurrenceId.toUpperCase()}</h3>
    {readings.length > 0 ? <>
      <p>Đọc state đã Apply, không đọc nháp. Off/mất RF: không kết luận đạt. Kiểm từng điểm; không coi một số đo là nghiệm thu cả card.</p>
      <AlignmentReadings readings={readings} />
      <p>Quy ước đào tạo: trung tính/gain tuyến tính, không phải đặc tính điện hãng hay DMM độc lập ngoài hiện trường. Dải HC là tiêu chí, không chặn số đo ngoài dải.</p>
      {blockId === "sideband" ? <p>R1/R4: TP1/4/5 và TP7/10/11; PMDT Sideband Phase Offset: TP6 (±50 mV theo HC IV.3.1, không dùng ±0,1 V của TM). TP2/TP8 bên dưới là ảnh Proper/Improper tham khảo, không phải trace trực tiếp hoặc kết quả tự chứng nhận.</p>
        : <p>Carrier PLL Control: hội tụ TP1 và TP2 đồng thời (HC IV.1). J2 ±0,002% độc lập PLL; chưa mô phỏng counter/cáp/attenuator hay chỉnh R27.</p>}
    </> : null}
    {monitor ? <>
      <p>{monitor.toUpperCase()} · đầu vào mô hình trước hiệu chỉnh và chỉ thị Integral sau hiệu chỉnh. Đây không phải nguồn chuẩn/flight check độc lập.</p>
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr><th>Tham số</th><th>Đầu vào mô hình</th><th>PMDT Integral</th></tr></thead><tbody>
        {readMonitorAlignment(config, snapshot, monitor).map(row => <tr key={row.parameter}><th>{row.parameter} ({row.unit})</th><td><output aria-label={`${monitor} ${row.parameter} đầu vào`}>{row.input === null ? "—" : row.input.toFixed(3)}</output></td><td><output aria-label={`${monitor} ${row.parameter} chỉ thị`}>{typeof row.indicated === "number" ? row.indicated.toFixed(3) : "—"}</output></td></tr>)}
      </tbody></table></div>
      <p>HC IV.5/Q4: chỉnh một MON, rồi lặp đúng quy trình cho MON còn lại; không chép calibration sang card kia. 30 Hz: 30,0 / Current Reading × Current Offset; RF Level đích 0,0 dB. Không tự đặt tử số deviation hay biến MON kia thành chuẩn cố định. Q6: 9960 mod 28–32% khi bay hiệu chuẩn, không dùng bảng này để chứng nhận bay.</p>
    </> : null}
  </section>;
}
