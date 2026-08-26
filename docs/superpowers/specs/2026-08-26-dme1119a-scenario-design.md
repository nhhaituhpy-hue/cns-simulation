# Thiết kế lấp gap Scenario cho DME 1119A Simulator

**Ngày:** 2026-08-26
**Trạng thái:** Đã được phê duyệt
**Phạm vi:** DME 1119A PMDT Simulator tại `/simulator/dme-1119a`

## 1. Mục tiêu

Xây dựng cho DME 1119A một bộ Scenario độc lập, cùng triết lý vận hành với DVOR 1150/1150A:

- Giám khảo tạo tình huống từ cấu hình TST, xem trước tác động, nhập/xuất file JSON và nạp tình huống vào Simulator.
- Học viên xử lý trực tiếp trên các màn hình PMDT thật của DME 1119A.
- Simulator tự đánh giá liên tục và hiển thị `IN PROGRESS` hoặc `SOLVED` dựa trên trạng thái Monitor, máy phát, alarm và các thay đổi cấu hình được phép.
- Mọi thay đổi trong Scenario chỉ tồn tại trong phiên, không làm bẩn cấu hình vận hành đã lưu.
- `Restore Scenario` trả về đúng trạng thái lỗi ban đầu; `End Scenario` trả về cấu hình Đài TEST/TST.

## 2. Quyết định đã phê duyệt

1. Thay thế luồng DME author/exam cũ bằng `Scenario Parameters` độc lập.
2. Không đưa điểm số, checkpoint và nhật ký thao tác cũ vào phiên bản đầu.
3. Dữ liệu scenario/submission cũ và các bảng CSDL liên quan được giữ nguyên để dự phòng; không xóa dữ liệu.
4. Luồng giao diện author/student cũ bị loại khỏi điều hướng vận hành sau khi bộ mới đạt nghiệm thu.
5. Cấu hình mặc định và trạng thái sau `End Scenario` là Đài TEST, mã hiệu `TST`.
6. Đánh giá trực tiếp theo mô hình `IN PROGRESS / SOLVED`.
7. Giám khảo có thể tạo JSON tùy ý trong phạm vi schema đã xác thực; các preset chỉ là mẫu khởi đầu.

## 3. Hiện trạng và gap

### 3.1 Nền tảng có thể tái sử dụng

- `src/lib/dme1119a/config.ts` đã có catalog 236 trường, đọc/ghi theo field ID, validation và metadata Config → Monitor.
- `src/lib/dme1119a/derived-data.ts` đã tính lại các giá trị Delay, Spacing, Tx Power, ERP, Efficiency, PRF, Frequency, VSWR, trạng thái monitor, PA/RTC và yêu cầu chuyển máy phát.
- `src/stores/dme-pmdt-store.ts` đã có cấu hình running/draft/backup, quyền PMDT, Local, Apply/Reset, chuyển máy phát, Bypass và RMS command.
- `src/lib/simulator-config/dme-1119a.ts` đã định nghĩa lớp cấu hình bền vững `Dme1119aPersistedConfig` và có hàm hydrate/extract.
- `doc/DME1119A/dme1119a_parameter_correlation.md` đã mô tả ma trận tương quan kỹ thuật hiện hành.

### 3.2 Gap cần lấp

- Chưa có schema và runtime Scenario độc lập cho DME 1119A.
- Route `/simulator/dme-1119a` chưa truyền quyền giám khảo.
- `PmdtLayout` chưa có thanh Simulator Tools, panel Scenario Parameters hoặc Training HUD.
- Store chưa có `scenario`, `scenarioDraft`, `applyScenario`, `restoreScenario`, `endScenario` và phát hiện thay đổi trường được bảo vệ.
- `DmeConfigPanel` và `DmeConfigControl` chưa khóa trường ngoài whitelist khi Scenario hoạt động.
- DME persistence chưa chặn hydrate/persist trong phiên Scenario.
- Các nguồn lỗi vật lý như VSWR anten, suy hao công suất, lỗi HPA/RTC, nhiệt độ hoặc nguồn AC chưa được tách rõ khỏi calibration/monitor limits.
- Luồng author/exam cũ dùng `overrides`, checkpoint, submission và CSDL riêng; không thể dùng làm baseline vật lý có thể hiệu chỉnh như Scenario DVOR.

## 4. Ranh giới phiên bản đầu

### Bao gồm

- Tạo/import/export JSON.
- Preview cấu hình, fault và kết quả monitor trước khi Apply.
- Apply, Restore và End Scenario.
- Khóa cấu hình ngoài whitelist.
- HUD thời gian thực cho giám khảo và học viên.
- Đánh giá `SOLVED` theo danh sách tiêu chí có kiểu dữ liệu rõ ràng.
- Fault injection cần thiết cho các tình huống công suất, delay, PRF, HPA, Ident, VSWR, calibration và nhiệt độ/nguồn.
- Tám preset chuẩn cùng automated test chứng minh đường xử lý.
- Ẩn luồng author/student DME cũ khỏi điều hướng sau khi bộ mới đạt parity đã định nghĩa.

### Không bao gồm

- Phân phối Scenario từ server tới nhiều máy trạm.
- Chấm điểm, checkpoint, nhật ký bài làm hoặc submission mới.
- Tự động chuyển đổi mọi scenario cũ sang schema mới.
- Xóa bảng CSDL hoặc dữ liệu legacy.
- Mô phỏng ngẫu nhiên; mọi kết quả phải xác định được và lặp lại được.

Phiên bản đầu giả định giám khảo nạp Scenario trên chính máy trạm đào tạo rồi bàn giao giao diện PMDT cho học viên. JSON là phương tiện trao đổi giữa các máy trạm.

## 5. Kiến trúc đích

```text
Scenario JSON
    │ parse + structural validation
    ▼
Dme1119aScenarioDefinition
    │ preview/apply
    ├── configuration ──► hydrateDme1119aData(TST)
    ├── faultInjections ─► applyDmeScenarioFaults(...)
    └── startPolicy ─────► Local/Bypass/Tx routing/Ident
                           │
                           ▼
                 recomputeDmeDerivedData(...)
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
      PMDT Monitor/UI           evaluateDme1119aScenario
                                           │
                                           ▼
                                  IN PROGRESS / SOLVED
```

### 5.1 Module domain mới

Tạo `src/lib/dme1119a/scenario.ts` làm nguồn sự thật duy nhất cho:

- Types và schema version.
- Default Scenario từ TST.
- Built-in presets.
- Clone, parse và validation.
- Preview và apply fault injections.
- Đánh giá các tiêu chí thành công.
- Phát hiện thay đổi cấu hình được bảo vệ.
- Kiểm tra sơ bộ Scenario có đường xử lý hợp lệ hay không.

Không đặt logic nghiệp vụ Scenario trong component React.

### 5.2 Dữ liệu cấu hình

`configuration` sử dụng `Dme1119aPersistedConfig`, không sử dụng toàn bộ `DmePmdtData`.

Lý do:

- Bao gồm các tham số cấu hình cần thiết đang được lưu bởi Simulator.
- Không đưa timestamp, tài khoản, log, dialog, trạng thái đăng nhập hoặc các số liệu derived vào JSON.
- Runtime luôn được dựng lại từ TST bằng `hydrateDme1119aData`, tránh JSON chứa snapshot lỗi thời.

### 5.3 Fault injection

Fault được biểu diễn bằng discriminated union, không dùng đường dẫn tùy ý vào object runtime:

```ts
type Dme1119aScenarioFault =
  | { id: string; kind: "tx-power-loss"; transmitter: "tx1" | "tx2"; lossDb: number }
  | { id: string; kind: "reply-delay-drift"; transmitter: "tx1" | "tx2"; driftUs: number }
  | { id: string; kind: "pulse-spacing-drift"; transmitter: "tx1" | "tx2"; driftUs: number }
  | { id: string; kind: "tx-frequency-error"; transmitter: "tx1" | "tx2"; ppm: number }
  | { id: string; kind: "hpa-fault"; transmitter: "tx1" | "tx2"; active: boolean }
  | { id: string; kind: "rtc-comm-fault"; transmitter: "tx1" | "tx2"; active: boolean }
  | { id: string; kind: "antenna-vswr"; transmitter: "tx1" | "tx2"; ratio: number }
  | { id: string; kind: "monitor-offset"; monitor: 1 | 2; measurement: "integral" | "standby"; parameter: string; value: number }
  | { id: string; kind: "ident-signal"; state: "normal" | "missing" | "continuous" }
  | { id: string; kind: "temperature"; sensor: string; celsius: number }
  | { id: string; kind: "ac-power"; failed: boolean };
```

Nguyên tắc:

- `configuration` mô tả thiết lập của thiết bị.
- `faultInjections` mô tả tác nhân hoặc hư hỏng vật lý.
- Fault được áp dụng sau khi hydrate cấu hình và trước khi tính derived data.
- Fault phải không làm thay đổi monitor limits để tạo ra alarm giả.
- Fault của máy phát không hoạt động vẫn có thể còn xuất hiện trong maintenance data, nhưng tiêu chí “đường phát đang hoạt động bình thường” chỉ đánh giá máy phát đang trên anten.

## 6. Schema JSON

```ts
interface Dme1119aScenarioDefinition {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  difficulty: "basic" | "intermediate" | "advanced";
  configuration: Dme1119aPersistedConfig;
  faultInjections: Dme1119aScenarioFault[];
  startPolicy: {
    mainTransmitterId: "tx1" | "tx2";
    startLocal: boolean;
    integralMonitorBypassed: boolean;
    standbyMonitorBypassed: boolean;
    identMode: "normal" | "off" | "continuous";
  };
  successCriteria: Dme1119aScenarioCriterion[];
  studentEditableFieldIds: string[];
}
```

Tiêu chí thành công là một discriminated union thay vì một tập boolean cố định:

```ts
type Dme1119aScenarioCriterion =
  | { id: string; kind: "monitor-normal"; monitor: "integral" | "standby" }
  | { id: string; kind: "monitor-alarm-clear"; severity: "primary" | "secondary" | "both" }
  | { id: string; kind: "active-transmitter"; expected: "any" | "tx1" | "tx2" }
  | { id: string; kind: "active-path-healthy" }
  | { id: string; kind: "parameter-status"; monitor: "integral" | "standby"; parameter: string; expected: "normal" | "warning" | "alarm" }
  | { id: string; kind: "rtc-overload-clear"; transmitter: "active" | "tx1" | "tx2" | "both" }
  | { id: string; kind: "bypass-cleared"; monitor: "integral" | "standby" | "both" }
  | { id: string; kind: "ident-normal" }
  | { id: string; kind: "fan-control"; expected: "Automatic" | "On" | "Off" }
  | { id: string; kind: "ac-power-normal" };
```

Mỗi check trả về `{ id, label, passed, detail }`. `SOLVED` khi:

1. Scenario đang active.
2. Có ít nhất một success criterion.
3. Tất cả criteria đều passed.
4. Không có thay đổi nào trên trường được bảo vệ.

## 7. Validation và tính sửa được

`validateDme1119aScenarioDefinition()` phải kiểm tra:

- `schemaVersion`, ID, tên, mô tả và difficulty.
- Shape đầy đủ của `Dme1119aPersistedConfig` bằng adapter hiện có.
- Field ID trong whitelist tồn tại, editable và không trùng.
- Không cho whitelist các trường session như timestamp, connected hoặc security account.
- Fault ID không trùng; loại fault và miền giá trị hợp lệ.
- Main transmitter tồn tại trong cấu hình single/dual transmitter.
- Không bắt đầu với một main transmitter bị buộc Off nếu không có mục đích changeover hợp lệ.
- Có ít nhất một criterion.
- Mọi criterion tham chiếu monitor/transmitter/parameter hợp lệ.
- Preview khởi đầu phải `IN PROGRESS`; Scenario khởi đầu đã `SOLVED` chỉ được cảnh báo và không Apply.
- Nếu không có editable field và cũng không có hành động vận hành có thể đáp ứng criteria, báo `Scenario may be uncorrectable`.

Không xây solver tổng quát. Tính sửa được của preset được chứng minh bằng automated test; custom Scenario dùng static validation và preview warning.

## 8. Ma trận Config → Monitor → Alarm → xử lý

| Nhóm nguồn | Tham số chính | Monitor/derived bị ảnh hưởng | Alarm/logic | Đường xử lý hợp lệ |
|---|---|---|---|---|
| Kênh | `channelType`, `channelNumber` | RX/TX/INT/RX LO, spacing, delay | Rebase nominal và giới hạn offset | Chỉ mở trong bài cấu hình kênh chuyên biệt |
| Công suất | `powerOutput`, `Power Output Scale`, HPA, power loss fault | Tx Power, ERP, PA status | Low-power alarm, maintenance alert, transfer | Hiệu chỉnh output/scale hoặc changeover |
| Delay | `replyDelayOffset`, Base Offset, delay drift fault | Delay Integral/Standby, delay control | Warning/alarm theo nominal ± limits | Hiệu chỉnh reply/base offset rồi Apply |
| Spacing | Channel spacing, spacing drift, monitor offset | Spacing Integral/Standby | Warning/alarm theo nominal ± limits | Hiệu chỉnh nguồn hoặc calibration được cho phép |
| PRF | Minimum Squitter, Maximum PRF, Dead Time | PRF, traffic load, RTC overload | Gain reduction/overload, monitor alarm | Khôi phục capacity/requested PRF |
| Frequency | Channel allocation, TX/RX offsets, frequency fault | Tx/Rx Frequency và Error | Pre-alarm/alarm frequency | Hiệu chỉnh oscillator/offset được whitelist |
| VSWR | Antenna VSWR fault hoặc Return Loss calibration | VSWR Integral/Standby | Pre-alarm/alarm, transfer | Changeover hoặc bài calibration chuyên biệt |
| Ident | Keyer source, self-key, code, ident signal fault | Ident Status/Code | Warning/alarm, có thể shutdown theo config | Chuyển internal/self key, sửa Ident config |
| Monitor | Enabled monitors, primary/secondary, voting | Normal/Pri/Sec, station alert | Quyết định transfer | Bị bảo vệ mặc định; chỉ mở cho bài monitor config |
| Bypass | Integral/Standby Bypass | Alarm vẫn hiển thị, loại khỏi voting | Không transfer khi bypass | Nhả bypass sau khi tín hiệu đã normal |
| Nhiệt độ | Temperature fault, fan control | RMS temperature, PA/maintenance | Pre-high/high alert/alarm | Bật fan hoặc changeover theo preset |
| Nguồn | AC fault, battery state | RMS status, power supply | Maintenance/station alert | Khôi phục AC theo bài hoặc thao tác được mô phỏng |

### Quy tắc chống “chữa alarm bằng nới ngưỡng”

- Alarm limits, monitor enable, voting, transfer, calibration và offsets bị khóa mặc định.
- Giám khảo có thể mở một trường bảo vệ chỉ trong bài chuyên biệt; UI phải hiển thị cảnh báo rõ.
- `evaluateDme1119aScenario()` so sánh mọi trường không whitelist với baseline Scenario.
- Nếu học viên thay đổi trường bảo vệ qua bất kỳ màn hình PMDT nào, HUD thêm blocker và không cho `SOLVED`.
- Validation của preset không được whitelist alarm limits để xử lý lỗi vật lý.

## 9. Runtime và lifecycle

```ts
interface Dme1119aScenarioRuntime {
  active: boolean;
  definition: Dme1119aScenarioDefinition | null;
  startedAt: string | null;
}
```

### Apply Scenario

1. Validate draft.
2. Tạo data mới từ TST + `configuration`.
3. Áp fault injections.
4. Áp start policy.
5. Recompute derived data.
6. Đặt `data` và `configDraft` cùng baseline; `configDirty=false`, `needBackup=false`.
7. Không sử dụng configuration backup đã lưu của người dùng.
8. Đánh dấu Scenario active và ghi `startedAt`.

### Restore Scenario

- Dựng lại hoàn toàn từ `scenario.definition`, không clone trạng thái đã bị học viên sửa.
- Giữ nguyên trạng thái đăng nhập PMDT hiện tại nếu không trái với security model.
- Xóa config dirty, backup flag và log tạm của lần xử lý trước.

### End Scenario

- Hủy runtime Scenario.
- Dựng lại TST default.
- Đóng Scenario Parameters.
- Không ghi baseline hoặc bài làm vào persistent simulator config.

### F7/F8 và menu Config

- F7 vẫn Apply thay đổi được whitelist.
- F8/Reset Defaults/Config Restore khi Scenario active phải gọi `restoreScenario`, không trả về persistent profile.
- Save/Load/Backup bị vô hiệu hóa hoặc trả thông báo session-only khi Scenario active.
- Khi không có Scenario, hành vi cũ giữ nguyên.

## 10. Phân quyền và UI

### Route

`src/app/simulator/dme-1119a/page.tsx` trở thành Server Component có `getCurrentProfile()` và truyền:

```tsx
scenarioAuthoringEnabled={profile?.role === "admin"}
```

### Thanh Simulator Tools

- Độ rộng bằng đúng cửa sổ PMDT bên dưới.
- Admin thấy nút `Scenario Parameters` và badge `EXAMINER`.
- Khi Scenario active, mọi vai trò thấy HUD.
- Học viên không thấy import/export/editor hoặc tên các fault ẩn; chỉ thấy tên bài, trạng thái và tiêu chí công khai.
- Examiner HUD có thể hiển thị thêm blocker và protected field changes.

### Scenario Parameters panel

Các vùng:

1. Template, Import JSON, Export JSON.
2. Metadata.
3. Starting policy.
4. Fault injection editor.
5. Success criteria editor.
6. Student recovery field whitelist, nhóm theo section của catalog.
7. Configuration editor.
8. Preview: active TX, monitor values/status, alarm, validation và correctability warning.
9. Footer: Restore Scenario, End/Restore TST, Apply Scenario, Close.

## 11. Khóa trường cấu hình

Một helper dùng chung quyết định khả năng sửa:

```ts
canEditDmeScenarioField({
  scenario,
  scenarioAuthoringEnabled,
  fieldId,
  field,
  securityLevel,
  local,
  loginDialogOpen,
})
```

Helper được dùng tại cả:

- `DmeConfigPanel` tổng hợp.
- `DmeConfigControl` nhúng trong từng màn hình PMDT.

Như vậy học viên không thể đi vòng qua panel tổng để sửa trường bị khóa.

## 12. Persistence isolation

`Dme1119aConfigPersistence` phải áp dụng cùng quy tắc như DVOR:

- Nếu Scenario active lúc hydrate hoàn tất, không gọi `replaceConfig`.
- Trong subscription, nếu state hiện tại hoặc state trước đó đang active thì không persist.
- Apply/Restore/Backup trong Scenario không gọi API simulator-config.
- End Scenario không ghi TST vào persistent profile; cấu hình TST chỉ là runtime của phiên.

Các trường hợp race hydrate/apply phải có test riêng.

## 13. Preset chuẩn

| ID | Tình huống ban đầu | Xử lý mong đợi | Tiêu chí chính |
|---|---|---|---|
| `tx1-low-output` | TX1 giảm công suất | Hiệu chỉnh output/scale | TX1 active, Tx Power normal, bypass clear |
| `tx1-delay-drift` | Reply Delay TX1 vượt alarm | Hiệu chỉnh reply/base offset | Delay normal, monitor normal |
| `rtc-prf-overload` | Capacity PRF thấp hơn requested | Sửa Maximum PRF/Dead Time/Squitter | PRF normal, RTC overload clear |
| `tx1-hpa-changeover` | HPA TX1 fault | Chuyển anten sang TX2 | TX2 active path healthy, bypass clear |
| `ident-keying-loss` | External keying mất, không self-key | Bật self-key hoặc internal keying | Ident normal |
| `tx1-high-vswr` | VSWR anten TX1 cao | Chuyển sang TX2 | TX2 active, active-path VSWR clear |
| `monitor-calibration-error` | Offset/scale monitor sai | Hiệu chỉnh đúng trường được whitelist | Hai monitor normal, protected fields intact |
| `cabinet-overtemperature` | Nhiệt độ cao | Bật fan/changeover theo cấu hình bài | Fan state đúng, active path healthy |

Mỗi preset phải bắt đầu `IN PROGRESS`, có đường xử lý tự động kiểm chứng được và không thay đổi alarm limits.

## 14. Xử lý legacy

Sau khi Scenario mới đạt nghiệm thu:

- Loại các entry point `/admin/dme`, `/admin/dme/create`, `/admin/dme/edit`, `/admin/dme/submissions`, `/student/dme` và `/student/dme/session` khỏi điều hướng chủ động.
- Chuyển các route đó sang trang thông báo legacy/read-only hoặc redirect đến `/simulator/dme-1119a` tùy loại route.
- Giữ nguyên migration/table Supabase và dữ liệu.
- Giữ một đường đọc/export có quyền admin cho dữ liệu cũ; không tạo thêm submission mới.
- Chỉ xóa component/store legacy khỏi bundle sau khi chứng minh không còn import và có phương án export dữ liệu.

Không chạy lệnh DELETE, không drop table và không sửa dữ liệu legacy trong đợt này.

## 15. Error handling

- Import JSON sai schema: không thay đổi draft hiện tại, hiển thị lý do đầu tiên và danh sách lỗi đầy đủ.
- Apply Scenario invalid: không thay đổi runtime.
- Scenario khởi đầu đã solved: chặn Apply và yêu cầu sửa baseline/criteria.
- Protected field changed: giữ trạng thái để giảng viên quan sát, nhưng thêm blocker; Restore Scenario khôi phục sạch.
- Fault không hỗ trợ: parse thất bại, không silently ignore.
- Persistence/API lỗi ngoài Scenario: giữ hành vi offline hiện tại.

## 16. Nghiệm thu

### Domain

- JSON round-trip không mất dữ liệu.
- JSON sai shape/version/reference bị từ chối.
- TST default preview là deterministic.
- Mọi preset bắt đầu unsolved và đạt solved sau đúng chuỗi xử lý.
- Protected changes ngăn solved.
- Fault chỉ tác động các monitor/flags đã khai báo trong ma trận.

### Store

- Apply/Restore/End đúng lifecycle.
- F7/F8 và Config Restore tuân theo Scenario baseline.
- Backup/Save/Load không làm bẩn cấu hình persistent trong Scenario.
- Chuyển máy phát, Bypass, Local và RMS commands vẫn tuân thủ security level hiện có.

### UI

- Admin thấy editor; student không thấy editor.
- HUD hiển thị đúng `IN PROGRESS/SOLVED` và chi tiết criteria.
- Config controls ngoài whitelist disabled ở cả panel tổng và màn hình PMDT.
- Toolbar cùng độ rộng cửa sổ PMDT ở desktop và không phá responsive.
- Import/export JSON hoạt động bằng thao tác trình duyệt thật.

### Regression

- Khi không có Scenario, DME PMDT hoạt động như hiện tại.
- Derivation, channel allocation, security, transfer và persistence tests hiện có vẫn pass.
- Dữ liệu legacy không bị xóa hoặc ghi đè.

## 17. Rủi ro và biện pháp

| Rủi ro | Biện pháp |
|---|---|
| Hydrate cấu hình server ghi đè Scenario | Guard trước `replaceConfig` và test race |
| Học viên sửa trường qua màn hình khác | Helper khóa dùng chung cho mọi config control |
| Scenario không thể solved | Preview warning + automated solve test cho preset |
| Fault dùng calibration để giả lỗi vật lý | Tách `faultInjections` khỏi `configuration` |
| Auto-transfer làm mất trạng thái lỗi ngay khi Apply | Preset dùng Bypass/start policy phù hợp; test từng bước |
| End Scenario ghi TST lên server | Chặn persistence khi current/previous state active |
| Xóa nhầm dữ liệu exam cũ | Không drop table; giữ read/export path; thay route theo phase cuối |
| Schema thay đổi về sau | `schemaVersion` bắt buộc và parser fail-closed |

## 18. Nguồn kỹ thuật

- `doc/DME1119A/1119A-0001M.pdf`
- `doc/DME1119A/dme1119a_parameter_correlation.md`
- `src/lib/dme1119a/config.ts`
- `src/lib/dme1119a/derived-data.ts`
- `src/stores/dme-pmdt-store.ts`
- Mô hình Scenario hiện hành của DVOR 1150/1150A.
