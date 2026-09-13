# Tài liệu Kỹ thuật Mô phỏng MOPIENS MARU 220 DVOR

## 1. Giới thiệu tổng quan
MOPIENS MARU 220 DVOR là hệ thống đài dẫn đường vô tuyến đa hướng sóng cực ngắn kỹ thuật số của hãng MOPIENS (Hàn Quốc). Thiết bị bao gồm 2 máy phát hoàn chỉnh (TX1, TX2), 2 máy thu giám sát số đa kênh (Mon 1, Mon 2), bộ ghép phân phối công suất PDC (Power Distribution Coupler), hệ thống chuyển mạch ăng-ten 48 chấn tử và giao diện điều khiển LMI (Local Maintenance Interface) / PMDT.

Mã nguồn triển khai lõi:
- Engine mô phỏng tín hiệu & trạng thái: [`src/modules/operations/dvor-220/domain/engine.ts`](file:///c:/Test/cns-simulator/src/modules/operations/dvor-220/domain/engine.ts)
- Bộ lệnh xử lý & quản lý cấu hình: [`src/modules/operations/dvor-220/domain/commands.ts`](file:///c:/Test/cns-simulator/src/modules/operations/dvor-220/domain/commands.ts)
- Quản lý kịch bản huấn luyện: [`src/modules/operations/dvor-220/domain/scenario.ts`](file:///c:/Test/cns-simulator/src/modules/operations/dvor-220/domain/scenario.ts)
- Khai báo kiểu dữ liệu: [`src/modules/operations/dvor-220/domain/types.ts`](file:///c:/Test/cns-simulator/src/modules/operations/dvor-220/domain/types.ts)
- Giá trị mặc định: [`src/modules/operations/dvor-220/domain/defaults.ts`](file:///c:/Test/cns-simulator/src/modules/operations/dvor-220/domain/defaults.ts)

---

## 2. Kiến trúc 3 Tầng Cấu hình (3-Tier Configuration Architecture)
MOPIENS 220 quản lý dữ liệu cấu hình theo cơ chế 3 tầng tách biệt chặt chẽ:
1. **Draft Configuration (`state.configuration.draft`):**
   - Vùng đệm tạm thời cho kỹ thuật viên hiệu chỉnh trên màn hình PMDT/LMI mà chưa tác động ngay đến luồng sóng phát.
   - Trạng thái `draftDirty = true` khi dữ liệu Draft khác với dữ liệu đang chạy.
2. **Running Configuration (`state.configuration.running`):**
   - Cấu hình đang điều khiển phần cứng thực tế trong RAM.
   - Được cập nhật khi thực hiện lệnh **Apply Draft** (`apply-draft`) hoặc **Transmitter Helper Apply**.
3. **Flash Configuration (`state.configuration.flash`):**
   - Bộ nhớ flash bất biến (Non-volatile Flash). Khi khởi động lại hoặc bấm **Reset**, thiết bị sẽ khôi phục cấu hình từ Flash.
   - Để lưu cấu hình từ Running vào Flash, kỹ thuật viên phải chọn **Save Profile** (`save-profile`) hoặc **Transmitter Helper Save**. Cờ `flashDirty` sẽ báo động nếu RAM và Flash chưa đồng bộ.

---

## 3. Ma trận Ảnh hưởng Tham số (Config ↔ Data)

### 3.1. Transmitter Config ↔ Transmitter Data (TX1 / TX2)
Hàm tính toán: `transmitterOutputPower` (dòng 186–195 trong `engine.ts`):

1. **Công suất sóng mang Carrier ($P_{\text{carrier}}$):**
   $$P_{\text{carrier, true}} = P_{\text{station, carrier}} \times \left(\frac{\text{carrierScalePercent}}{100}\right) \times \text{factor}_{\text{setpoint}}$$
   $$P_{\text{carrier, display}} = P_{\text{carrier, true}} \times \text{factor}_{\text{reading}}$$
   - Tham chiếu chuẩn danh định: $100\text{ W}$.
2. **Công suất 4 nhánh Sideband ($P_{\text{sideband}}$):**
   Gồm 4 kênh độc lập: USB Cos, USB Sin, LSB Cos, LSB Sin:
   $$P_{\text{output, true}} = \text{sidebandPowerW}[\text{output}] \times \text{factor}_{\text{setpoint}}[\text{output}]$$
   - Giá trị danh định: $1.0\text{ W}$ cho mỗi nhánh (tổng công suất sideband $= 4.0\text{ W}$).
3. **Tần số sóng mang và biên tần:**
   - Carrier: $f_0 = \text{station.frequencyMHz}$.
   - USB: $f_0 + 0.00996\text{ MHz}$ ($+9960\text{ Hz}$).
   - LSB: $f_0 - 0.00996\text{ MHz}$ ($-9960\text{ Hz}$).
4. **Bộ bảo vệ nhiệt và Trip quá tải:**
   - Cảm biến nhiệt trên các khối CMA (Carrier Power Amp), SMA USB, SMA LSB.
   - Quạt làm mát tự động bật khi nhiệt độ $\ge 40^\circ\text{C}$.
   - Nếu nhiệt độ vượt $95^\circ\text{C}$: ngắt bảo vệ khẩn cấp (`thermalTrips = true`), cắt RF để bảo vệ transitor công suất; chỉ cho phép bật lại khi hạ dưới $80^\circ\text{C}$.

---

### 3.2. Monitor Config ↔ Monitor Data (Mon 1 / Mon 2)
Hàm tính toán: `baseMonitorValues` (dòng 236–317 trong `engine.ts`):

1. **Độ sâu điều chế Subcarrier AM 9960 Hz:**
   Được tổng hợp từ căn bậc hai tỷ số công suất giữa toàn bộ 4 nhánh sideband và sóng mang carrier:
   $$\text{am9960Percent} = 150 \times \sqrt{\frac{P_{\text{usbCos}} + P_{\text{usbSin}} + P_{\text{lsbCos}} + P_{\text{lsbSin}}}{P_{\text{carrier}}}}$$
   - *Quy tắc vận hành*: Nếu công suất carrier $= 100\text{ W}$ và mỗi nhánh sideband $= 1\text{ W}$ (tổng $4\text{ W}$), thì $\text{am9960Percent} = 150 \times \sqrt{4 / 100} = 150 \times 0.2 = 30.0\%$.
   - Nếu tỷ lệ carrier/sideband thay đổi, độ sâu điều chế sẽ trôi tương ứng.
2. **Mức RF Level (dB):**
   $$\text{rfLevelDb} = 10 \cdot \log_{10}\left(\frac{P_{\text{carrier}}}{P_{\text{ref}}}\right) + \text{rfLevelOffset}$$
   - Sàn tín hiệu khi ngắt sóng: $-50\text{ dB}$.
3. **Độ sâu điều chế 30 Hz (AM 30 Hz):**
   $$\text{am30Hz} = (\text{am30HzPercent}) \times \text{factor}_{\text{setpoint}} \times \text{factor}_{\text{calibration}}$$
4. **Sai số góc phương vị (Bearing Error $^\circ$):**
   $$\text{bearingError} = \Delta\theta_{\text{azimuth}} + \text{bias}_{\text{monitor}} + \text{bias}_{\text{channel}}$$
5. **Mã nhận dạng Ident 1020 Hz:**
   $$\text{ident1020Hz} = (\text{identModulationPercent}) \times \text{factor}_{\text{setpoint}}$$

---

### 3.3. Bộ đệm Lấy mẫu Trung bình (Rolling Average Buffer)
Nhằm mô phỏng bộ lọc chống chập chờn thực tế trên máy thu số:
- Tham số `monitor.measurementAverageCount`: cấu hình từ $2$ đến $10$ mẫu.
- Chu kỳ trích mẫu: $100\text{ ms}$ (`MONITOR_SAMPLE_INTERVAL_MS`).
- Khi mới đổi kênh hoặc thay đổi trạng thái máy phát, trạng thái giám sát sẽ rơi vào `stabilizing` (chờ làm đầy bộ đệm mẫu). Khi đủ số lượng mẫu quy định, giá trị trung bình $\frac{1}{N}\sum V_i$ mới được đưa vào khối so sánh ngưỡng (Normal/Warning/Alarm).

---

## 4. Khối Ghép Ăng-ten PDC & Báo động Hệ thống

### 4.1. Giám sát Sóng đứng Ăng-ten (PDC & Antenna VSWR)
- Bảng giám sát 48 ăng-ten sideband: mỗi ăng-ten tính toán hệ số sóng đứng độc lập cho nhánh USB và LSB (`usbVswr`, `lsbVswr`).
- Ngưỡng so sánh: `vswrUpperWarning` (mặc định 1.5) và `vswrUpperAlarm` (mặc định 2.0).
- Hệ số sóng đứng phản xạ sóng mang chính: $1.38$ danh định, được chuẩn hóa qua `pdcFactors.carrierVswr` (chặn dưới $\ge 1.00:1$).

### 4.2. Logic Chuyển đổi và Executive Voting
- **Keylock Switch:** Gồm 3 nấc vật lý:
  - `LOCAL`: Cho phép điều khiển cục bộ tại trạm.
  - `REMOTE`: Chỉ cho phép giám sát, điều khiển từ trung tâm quản lý bay.
  - `MAINT`: Chế độ bảo dưỡng — hệ thống **tự động đưa toàn bộ Monitor sang trạng thái Bypass** (`effectiveBypass = true`), ngăn việc cắt sóng trạm khi nhân viên kỹ thuật thao tác đo kiểm.
- **Executive Vote:**
  - Logic kết hợp giữa Mon 1 và Mon 2: cấu hình `AND` (cả 2 cùng báo lỗi) hoặc `OR` (1 trong 2 báo lỗi).
  - Tự động kích hoạt chuyển máy phát (`Changeover`) hoặc ngắt trạm (`Shutdown`).
  - Khóa khởi động lại 20 giây (`RESET_LOCK_MS = 20_000` ms) sau khi xảy ra Shutdown khẩn cấp để đảm bảo an toàn phần cứng.

---

## 5. Công cụ Transmitter Helper & Bám đuổi Công suất (Tracking)
- Tiện ích **Transmitter Helper** trên giao diện LMI cho phép kỹ thuật viên điều chỉnh nhanh công suất sóng mang (`carrierScalePercent`) và đồng bộ 4 nhánh sideband.
- Chế độ **Sideband Tracking** (`trackingEnabled = true`): khi kỹ thuật viên tăng hoặc giảm công suất sóng mang, tỷ lệ công suất 4 nhánh sideband sẽ tự động co giãn tương ứng:
  $$P_{\text{sideband, new}} = P_{\text{sideband, old}} \times \left(\frac{P_{\text{carrier, new}}}{P_{\text{carrier, old}}}\right)$$
  nhờ đó giữ nguyên vẹn độ sâu điều chế $30.0\%$ AM 9960 Hz mà không cần phải tính toán thủ công từng nhánh.

---

## 6. Cấu trúc Kịch bản Huấn luyện (Scenario Architecture)
Định nghĩa tại [`src/modules/operations/dvor-220/domain/scenario.ts`](file:///c:/Test/cns-simulator/src/modules/operations/dvor-220/domain/scenario.ts) với `schemaVersion: 1`:

```typescript
export interface Dvor220ScenarioDefinition {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  difficulty: "basic" | "intermediate" | "advanced";
  configuration: Dvor220Configuration;
  runtime: {
    mainTransmitterId: "tx1" | "tx2";
    startMonitorBypassed: boolean;
    acAvailable: boolean;
    batteryRemainingMinutes: number;
    temperaturesC: Record<"tx1" | "tx2", { cma: number; usb: number; lsb: number }>;
    environment: { temperatureC: number; smoke: boolean; intrusion: boolean };
    antennaVswr: Array<{ antenna: number; usbVswr: number; lsbVswr: number }>;
    faults: Dvor220InjectedFault[];
    measurementOverrides: Dvor220MeasurementOverride[];
  };
  successCriteria: {
    requireServiceNormal: boolean;
    requireEnabledMonitorChannelsNormal: boolean;
    requireNoPrimaryAlarm: boolean;
  };
}
```

### Kịch bản tiêu biểu: `tx1-carrier-9960-degradation`
- **Mô tả tình huống:** Máy phát TX1 bị sụt giảm công suất sóng mang xuống còn $50\%$ ($50\text{ W}$) và 4 nhánh sideband bị giảm xuống còn $0.32\text{ W}$, dẫn đến mức RF Level và độ sâu điều chế AM 9960 Hz rơi ra khỏi ngưỡng cho phép của máy thu giám sát.
- **Yêu cầu xử lý:** Học viên đăng nhập PMDT, vào mục Setup hoặc Transmitter Helper để căn chỉnh lại tỷ lệ công suất sóng mang và sideband về chuẩn danh định, thực hiện Apply và nhả Monitor Bypass để xác thực trạm đạt trạng thái Normal.
