# Tài liệu kỹ thuật chi tiết: SELEX DVOR 1150A Simulator

## 1. Thông tin tổng quan
- **Dòng thiết bị:** Đài dẫn đường đa hướng sóng cực ngắn DVOR Model 1150A (SELEX / Wilcox).
- **Tài liệu tham chiếu:** `doc/DVOR1150A/571150A-0002E.pdf` và các ảnh chụp màn hình PMDT thực tế.
- **Route ứng dụng:** `/simulator/dvor-1150a` (giao diện PMDT) và `/simulator/dvor-1150a/block-diagram` (sơ đồ khối phần cứng).
- **Tệp mã nguồn cốt lõi:**
  - `src/lib/dvor1150a/engine.ts`: Toàn bộ logic tính toán dẫn xuất, phân loại cảnh báo, voting và chuyển máy.
  - `src/lib/dvor1150a/config-types.ts`: Định nghĩa kiểu dữ liệu cấu hình và snapshot.
  - `src/lib/dvor1150a/defaults.ts`: Cấu hình mặc định của Đài TEST/TST.
  - `src/stores/vor-pmdt-store.ts`: Zustand store điều phối trạng thái, draft, lệnh F5–F8 và phiên làm việc.

---

## 2. Ma trận ảnh hưởng tham số (CONFIG → DERIVED)

Mọi tính toán được thực thi tập trung trong hàm `buildDvor1150aSnapshot()` (`engine.ts:908`).

### 2.1. Transmitter Configuration ↔ Transmitter Data & Live RF
Chỉ máy phát đang phát sóng (`onAir === true`) mới cung cấp tín hiệu đo lường thực tế cho các cột Monitor và Sidebar. Máy phát ở trạng thái `Load` hoặc `Off` không đưa công suất lên anten.

| Tham số cấu hình nguồn (`config`) | Công thức mã nguồn thực tế (`engine.ts`) | Dữ liệu dẫn xuất trực tiếp | Trạng thái cảnh báo & Tác động |
|---|---|---|---|
| `station.frequencyMHz`<br>`transmitters.<tx>.frequencyErrorPpm` | `carrierFrequencyMHz = station.frequencyMHz * (1 + tx.frequencyErrorPpm / 1_000_000)` (`line 223`) | `txFrequency.carrierFrequency`<br>`txFrequency.lowerSideband` (-0.0099 MHz)<br>`txFrequency.upperSideband` (+0.0100 MHz)<br>`txFrequencyError` | Lệch tần số quá ngưỡng `alarmLimits.txFrequencyError` bật cảnh báo Alarm đỏ. Nếu bật cờ lỗi `faults.frequencyError` sẽ làm `identStatus` chuyển thành `No Ident`. |
| `nominal.outputPower`<br>`offsets.outputPowerScale` | `effectiveOutputPower = enabled ? nominal.outputPower * offsets.outputPowerScale / 100 : 0` (`line 197`) | `txPower.carrier`<br>`sidebarParams.txPower`<br>`sourceMeasurement.txPower` | So sánh với `alarmLimits.txPower`. Vượt ngưỡng `alarmHigh` kích hoạt cờ cảnh báo `Carrier Overpower` đỏ trên panel cảnh báo máy phát (`line 683`). |
| `nominal.sboRfLevel`<br>`nominal.outputPower`<br>`offsets.outputPowerScale`<br>`offsets.txSidebandRfLevelScale` | `effectiveSboRfLevel = enabled ? nominal.sboRfLevel * (nominal.outputPower / 70) * (offsets.outputPowerScale / refScale) * offsets.txSidebandRfLevelScale / 100 : 0` (`line 201-206`) | `effectiveSboRfLevel`<br>Nguồn cấp công suất cho 4 nhánh Sideband | Cung cấp mức RF SBO chuẩn (baseline 62.075 mV). Kéo theo công suất sóng hài và độ lệch tần số 9960 Hz. |
| `offsets.sideband1..4RfLevelScale` (4 nhánh riêng biệt) | `voltageScale = scale / 100`<br>`sidebandPower[i] = effectiveSboRfLevel * (voltageScale ** 2) / 41` (`line 218-220`) | `txPower.sideband#1..#4` | 4 nhánh công suất Sideband độc lập (chuẩn ~1.5 W/nhánh). Công suất tính theo bình phương điện áp (ví dụ 70.7% điện áp sinh ra ~50% công suất). |
| `offsets.carrierSidebandPhaseOffsetCoarse`<br>`offsets.carrierSidebandPhaseOffsetFine` | `phaseError = wrapPhaseDegrees(Coarse - refCoarse + Fine - refFine)`<br>`phaseEfficiency = Math.cos(phaseError * Math.PI / 180)` (`line 288-294`) | `phaseEfficiency` tác động trực tiếp lên độ sâu điều chế 9960 Hz | Coarse nhận 4 mức: 0°, 90°, 180°, 270°. Fine nhận dải liên tục -45.0° … +45.0°. Lệch pha làm giảm hiệu suất thu thập sóng mang phụ. |
| Biên độ 4 nhánh Sideband & Lệch pha | `amplitudeRatio = Σ(sqrt(max(0, Pi) / Pref)) / 4`<br>`hz9960Mod = max(0, baseline + phaseAdj) * amplitudeRatio` (`line 296-303`) | `integralData.hz9960Modulation`<br>`sidebarParams.hz9960Mod` | Mô hình 4 nhánh RF: Mất 1 nhánh làm 9960 Hz giảm từ 30.0% xuống 22.5% (-25%); mất cả 4 nhánh giảm về 0%. |
| Công suất Carrier & Suy hao Anten | `carrierPowerRatio = effectiveOutputPower / P_ref`<br>`carrierRfDeltaDb = 10 * Math.log10(max(carrierPowerRatio, 1e-6))` (`line 326-333`)<br>`rfSourceLevel = raw.rfLevel + deltaDb + (14 - inputAttenuation)` | `integralData.rfLevel`<br>`sidebarParams.rfLevel` | RF Level đo bằng đơn vị dB. Áp dụng sàn tương đối -60 dB khi mất hoàn toàn tín hiệu phát để chống lỗi `log10(0)`. |
| `nominal.referenceModulation`<br>`offsets.referenceModulationScale` | `referenceDelta = (nominal * scale / 100) - 27.72` (`line 315`) | `integralData.hz30Modulation`<br>`integralData.hz9960Modulation` | Bù trừ trực tiếp vào độ sâu điều chế 30 Hz và 9960 Hz trước khi qua bộ hiệu chuẩn Monitor. |
| `nominal.voiceModulation`<br>`offsets.voiceModulationScale` | `voiceDeviationDelta = (nominal * scale / 100) * 0.12` (`line 318-320`) | `integralData.deviation` | Độ lệch tần số FM 9960 Hz (chuẩn 16.0 Ratio). Tăng Voice Modulation làm tăng trực tiếp giá trị Deviation. |
| `transmitters.<tx>.vswr.carrier`<br>`offsets.sideband1..4VswrOffset` | `carrierVswr = tx.faults.carrierVswr ? 3.0 : max(1.0, tx.vswr.carrier)` (`line 247`)<br>`antennaProfile[i] = clamp(raw + delta + offset, 1, 10)` (`line 372-376`) | `txVswr.carrier`<br>`data.vswrData` (48 anten) | Giữ sàn vật lý VSWR ≥ 1.0:1. Khi số anten vượt ngưỡng `sidebandVswr.alarm` ≥ `numberAntennasInAlarm` (mặc định 3 anten), kích hoạt Alarm Sideband VSWR (`line 136-140`). |

### 2.2. Monitor Configuration & Calibration ↔ Monitor Data
Mỗi Monitor (Monitor 1 và Monitor 2) sở hữu 12 trường hiệu chuẩn riêng biệt (`calibration`), áp dụng độc lập trong hàm `calibratedMeasurement()` (`line 381-401`):

```typescript
calibrated = {
  azimuth: source.azimuth + calibration.azimuthOffset,
  hz30Modulation: source.hz30Modulation * calibration.hz30ModulationScale / 100,
  hz9960Modulation: source.hz9960Modulation * calibration.hz9960ModulationScale / 100,
  deviation: source.deviation * calibration.deviationScale / 100,
  rfLevel: source.rfLevel + calibration.rfLevelOffset,
  identModulation: source.identModulation * calibration.identModulationScale / 100,
  txPower: source.txPower * calibration.txPowerScale / 100 + calibration.txPowerOffset,
  txFrequencyError: source.txFrequencyError + calibration.txFrequencyErrorOffset,
  notchMonitor: source.notchMonitor * calibration.notchScale / 100,
};
```

- **Phân loại ngưỡng cảnh báo:** Từng tham số số đo sau hiệu chuẩn được so sánh với dải ngưỡng 5 mức trong `config.monitor.alarmLimits[param]`:
  - `Normal`: `preAlarmLow < value < preAlarmHigh` (Đèn xanh).
  - `Warning / PreAlarm`: `alarmLow < value <= preAlarmLow` hoặc `preAlarmHigh <= value < alarmHigh` (Đèn vàng, bật chỉ báo Alert hệ thống).
  - `Alarm`: `value <= alarmLow` hoặc `value >= alarmHigh` (Đèn đỏ, kích hoạt đánh giá Voting bảo vệ).
- **Cơ chế Voting và Automatic Transfer:**
  - `primaryHealthy`: Monitor 1 không có tham số nào được định tuyến (routed) bị Alarm (`line 486`).
  - `secondaryHealthy`: Monitor 2 không có tham số nào bị Alarm (nếu lắp Dual Monitors).
  - `systemHealthy`: Kết hợp theo `votingLogic` (AND: cả hai cùng healthy; OR: một trong hai healthy).
  - **Yêu cầu chuyển máy (`transferRequested`):**
    ```typescript
    const alarmRequestsTransfer = config.monitor.transfer === "on Any Alarm"
      ? !primaryHealthy || (hasSecondaryMonitor && !monitors.mon2.healthy)
      : config.monitor.transfer === "on Primary Alarm" && !primaryHealthy;

    const transferRequested = !config.simulation.integralMonitorBypass && alarmRequestsTransfer;
    ```
  - Khi `transferRequested === true`, Zustand store tại `src/stores/vor-pmdt-store.ts` sẽ kích hoạt relay chuyển kênh phát On-Air sang máy phát Standby hợp lệ. Nếu sau khi chuyển sang máy Standby mà hệ thống Monitor vẫn tiếp tục Alarm, engine sẽ thực hiện lệnh **Shutdown cả hai máy phát** để đảm bảo an toàn dẫn đường.
  - Bật **Integral Monitor Bypass** (`bypass === true`) sẽ chặn lệnh automatic transfer nhưng vẫn hiển thị chỉ báo Alarm đỏ trên màn hình PMDT.

---

## 3. Cấu trúc Scenario, Save/Load & Lưu vết bài làm

### 3.1. Cấu trúc JSON Scenario (`schemaVersion: 1`)
Kịch bản sự cố được định nghĩa dưới dạng đối tượng JSON chuẩn hóa:
```json
{
  "schemaVersion": 1,
  "id": "dvor-carrier-degradation",
  "name": "Suy giảm công suất sóng mang TX1",
  "description": "Khắc phục hiện tượng sụt công suất và đưa monitor về Normal.",
  "difficulty": "intermediate",
  "startPolicy": {
    "mainTransmitterId": "tx1",
    "startLocal": true,
    "integralMonitorBypassed": true
  },
  "faultInjections": [
    { "type": "tx-output-scale", "transmitterId": "tx1", "value": 50 }
  ],
  "studentEditableFieldIds": [
    "transmitters.tx1.offsets.outputPowerScale",
    "transmitters.tx1.nominal.outputPower"
  ],
  "successCriteria": [
    { "parameter": "txPower", "expectedStatus": "normal" },
    { "parameter": "rfLevel", "expectedStatus": "normal" }
  ]
}
```

### 3.2. Cơ chế cách ly Save/Load
- **Phân quyền Authoring:** Chỉ tài khoản vai trò `admin` (Giám khảo) mới có quyền mở panel Scenario Parameters tại `/authoring` hoặc trên thanh toolbar PMDT để nạp, chỉnh sửa, Import/Export JSON kịch bản.
- **Cách ly phiên học viên:** Khi kích hoạt bài tập, kịch bản tạo ra một bản sao trạng thái runtime độc lập trong Zustand store. Học viên chỉ được phép chỉnh sửa các trường nằm trong mảng `studentEditableFieldIds`. Mọi trường giới hạn cảnh báo (`alarmLimits`), định tuyến (`routing`), hiệu chuẩn (`calibration`) đều bị khóa cứng phía client và server.
- Thao tác Reset (F8) đưa bài tập về cấu hình khởi tạo ban đầu của bài; nút **End Scenario** hủy phiên thực hành và trả simulator về Đài TEST/TST chuẩn.

### 3.3. Cơ chế ghi nhận bằng chứng thao tác (`actionHistory`) và chấm điểm
Khi học viên thực hành, mọi thao tác đều được hệ thống ghi vết tự động vào mảng sự kiện:
```typescript
interface ActionEvidenceEvent {
  timestamp: string;
  actor: "student" | "system";
  actionType: "LOGIN" | "LOCAL_TOGGLE" | "BYPASS_TOGGLE" | "DRAFT_EDIT" | "APPLY_CONFIG" | "CHANGEOVER" | "RESET";
  menuPath?: string;
  fieldId?: string;
  previousValue?: unknown;
  newValue?: unknown;
  snapshotSummary: {
    activeTx: "tx1" | "tx2";
    mon1Status: "normal" | "warning" | "alarm";
    systemAlert: boolean;
  };
}
```
Khi nộp bài thi, toàn bộ `actionHistory` cùng kết luận `resolution` (trạng thái `SOLVED` / `IN PROGRESS`, thời gian hoàn thành, số lần Apply lỗi) được gửi về API và lưu vào cột JSONB trong bảng `vor_submissions` (luyện tập) hoặc `exam_attempt_items` (thi chính thức) của cơ sở dữ liệu PostgreSQL 17 để phục vụ Giám khảo chấm điểm minh bạch.
