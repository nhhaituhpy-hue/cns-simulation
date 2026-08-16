# Hệ thống kiểm tra mô phỏng CNS

Ứng dụng web phục vụ xây dựng kịch bản, thực hành chẩn đoán và đánh giá kỹ thuật viên trên ba nhóm thiết bị CNS: **VOR**, **DME** và **ADS-B**.

Hệ thống mô phỏng giao diện PMDT, QCMS, terminal bảo trì và sơ đồ phần cứng trong một môi trường đào tạo xác định trước. Giám khảo có thể cấu hình tình trạng thiết bị và đáp án tham chiếu; học viên thực hiện quy trình kiểm tra, ghi lại bằng chứng và nộp kết quả để chấm điểm.

> Đây là hệ thống đào tạo, không kết nối thiết bị thật và không mở phiên SSH thật. Tài khoản ứng dụng sử dụng Supabase Auth; tài khoản terminal bên trong bài mô phỏng vẫn chỉ là dữ liệu của kịch bản đào tạo.

## Trạng thái hiện tại

Dự án đang ở giai đoạn **MVP hoạt động đầy đủ cho đào tạo nội bộ**. Ba module đã có route riêng cho giám khảo và học viên, xác thực email công vụ qua Supabase, dữ liệu cloud trên Supabase và lớp fallback cục bộ khi không thể đồng bộ.

| Module | Phạm vi đã triển khai | Cách đánh giá |
| --- | --- | --- |
| VOR | PMDT DVOR 1150A, DVOR 1150 và simulator MOPIENS 220 DVOR; cấu hình kịch bản, checkpoint, alarm/changeover, Local/Bypass và chẩn đoán phần cứng | Giám khảo xem bằng chứng, đối chiếu checkpoint và nhập điểm thủ công |
| DME | PMDT Model 1118A/1119A và simulator MOPIENS 320 DME; cấu hình, monitor voting, alarm/changeover, bảo trì và sơ đồ Dual High Power | Giám khảo xem bằng chứng, đối chiếu checkpoint và nhập điểm thủ công |
| ADS-B | QCMS, terminal SA/MA, trạng thái site/sensor, sự cố phần cứng, ghi nhận và sắp xếp thao tác | Chấm tự động theo ngữ cảnh menu, thứ tự thao tác và dữ liệu nhập |

### Nhật ký phát triển PMDT DVOR 1150A

Bản redesigner DVOR 1150A được triển khai theo giao diện PMDT cổ điển trong ảnh mẫu và các quy luật vận hành từ manual `doc/DVOR1150A/571150A-0002E.pdf`:

- Route mô phỏng độc lập: `/simulator/dvor-1150a`, cửa sổ PMDT có title bar, menu nhiều tầng, sidebar trạng thái, toolbar F5–F8 và status bar thời gian thực.
- Trước khi đăng nhập, vùng dữ liệu/Connected/đèn trạng thái bị khóa và để trống. `GUEST` (mật khẩu rỗng) chỉ xem; `SEC3/THREE` và `SEC4/FOUR` được phép thao tác bảo trì.
- Local phải bật trước Bypass; Local hiển thị màu vàng, Need Backup hiển thị màu đỏ và thay thế LOCAL. Chuyển Main TX1 ↔ TX2 không yêu cầu Local/Bypass; Load và Off loại trừ lẫn nhau.
- Engine DVOR 1150A cho phép chỉnh tham số cấu hình, giữ draft khi nhập, áp dụng bằng Apply (F7), khôi phục bằng Reset (F8)/RMS > Config Restore, sao lưu bằng RMS > Config Backup và tính lại công suất, tần số, điều chế, monitor, alarm, voting và VSWR.
- VSWR được giữ ở miền vật lý hợp lệ (≥ 1), đi theo transmitter đang phát và anten/monitor tương ứng; dữ liệu Monitor 2 không bị gán nhầm vào cột phát chính.
- Trạng thái mô phỏng và bài thực hành được cô lập trong Zustand store của từng phiên trình duyệt; scenario/submission có lớp lưu cục bộ và API/Supabase khi cấu hình cloud. Quy trình chi tiết được lưu trong skill `dvor-1150a-pmdt-simulator` của Codex.

Quality gate cho bản DVOR này: **9 file test, 45/45 test đạt**. Phần DME có quality gate và phạm vi kiểm thử riêng ở mục dưới; các derived engine được giữ tách biệt để hai simulator chạy song song.

### DVOR 1150 — PMDT đơn giản theo mục 3.4

Bản DVOR 1150 được xây dựng độc lập từ mục 3.4 của `doc/DVOR1150/DVOR 1150.pdf`, dùng lại ngôn ngữ PMDT cổ điển nhưng không dùng engine/state của DVOR 1150A:

- Route mô phỏng: `/simulator/dvor-1150`. Phạm vi lõi gồm title/menu/sidebar/status bar, login, RMS Status/Data/Logs/Configuration, Monitor Data/Configuration, Transmitter Data/Configuration và Diagnostics.
- Tài khoản PMDT: `GUEST` không mật khẩu và chỉ xem; `SEC3/THREE`, `SEC4/FOUR` được phép chuyển máy và thao tác bảo trì. Model 1150 không có nút Local riêng trên sidebar; chỉnh Configuration và Apply yêu cầu Security Level 3/4 cùng Integral Monitor Bypass. Trước login, Connected, tham số và các đèn G/Y/R được che trống.
- Chuyển TX1 ↔ TX2 sang Main không cần Local/Bypass. Load và Off của cùng máy phát là hai trạng thái loại trừ; các lệnh transmitter vẫn bị giới hạn bởi Security Level.
- Config nhập vào `configDraft`, cho phép xóa rồi nhập lại, Apply (F7) mới cập nhật engine. Apply đặt Need Backup màu đỏ; RMS > Config Backup lưu snapshot EEPROM mô phỏng và xóa cảnh báo; RMS > Config Restore khôi phục snapshot đã backup; Reset (F8) hủy draft hiện tại.
- Derived engine liên kết Output Power/Scale, SBO, modulation, frequency, monitor alarm/voting, 48 anten Sideband VSWR và cột transmitter đang phát. Nominal Output Power làm thay đổi Carrier, SBO/sideband và RF Level; Voice/Reference Modulation tác động các giá trị điều chế tương ứng. VSWR luôn được giới hạn trong miền vật lý `>= 1` và cảnh báo khi vượt `1.25:1`.
- Trạng thái runtime DVOR 1150 chỉ nằm trong Zustand store của tab trình duyệt; snapshot cấu hình và lịch sử Backup được lưu theo application user qua API/Supabase. Vì vậy nhiều người hoặc nhiều tab có cấu hình riêng, còn reload khởi tạo lại runtime từ cấu hình đã lưu.

Quality gate trực tiếp cho module: `tests/vor/dvor1150-engine.test.ts`, `tests/layout/app-shell.test.tsx`, `tests/layout/module-routing.test.tsx` và `tests/vor/vor-integration.test.tsx` đạt **15/15 test**; `npm run typecheck` và `npm run build` đạt.

### DME 1119A — CONFIG → MONITOR derivation

Engine DME nằm riêng trong `src/lib/dme1119a/` và được gọi bởi store DME, không sửa engine DVOR 1150A. Bảng truy vết đầy đủ từ từng trường cấu hình đến màn hình/row bị ảnh hưởng được export bởi `dmeConfigDerivationMap` trong `src/lib/dme1119a/config.ts` và hiển thị trong panel **System → Simulation Parameters…**.

- Table 9-5 là nguồn cho channel X/Y: RX/INT `1024+n`, RX LO `899+n`, TX theo dải X/Y, spacing và reply delay 50/56 us. Đổi channel rebases monitor, decoder, calibration và Delay/Spacing nominal/alarm.
- `Power Output` là target RTC chung; `TX1 Power Output Scale` và `TX2 Power Output Scale` là hai hệ số độc lập. Target từng máy = baseline trạm × RTC dB ratio × scale máy / scale factory. Monitor Tx Power tiếp tục áp dụng scale/offset của monitor; ERP theo active-TX path và VSWR luôn được clamp ≥ 1. Sửa TX1 không đổi TX2 và ngược lại; relay transfer đổi đúng Integral/Standby/sidebar.
- PRF dùng Minimum Squitter, Maximum PRF, dead-time và trần phần cứng 5500 ppps; gain reduction bắt đầu tại 90% capacity và target 95%. SDES/LDES, traffic bands, Total/Monitor Replies và LDES Triggers được tính lại xác định.
- Delay/Spacing dùng limits dạng offset so với nominal. Integrity test dùng Low Low/Low High/High Low/High High theo bốn công thức §3.6.9.2.1. Tắt integrity không xóa lỗi: row chuyển cảnh báo vàng và station alert vẫn quan sát được.
- Decoder giữ usable range Rx Sensitivity −94…−72 dBm và limits ±3 dB. Baseline mặc định của bản training là −94 dBm để khớp capture PMDT; manual §6.4.5.1 nêu thêm default site −82/−87 dBm theo mức công suất, có thể nhập trong cùng range.
- LDES manual formulas được export (`SRE×12.36+10`, `−0.385×FUD−20`). Bản PMDT này không có input SRE/FUD, nên Window/Threshold do operator cấu hình là assumption huấn luyện được ghi rõ trong `DME_LDES_TRAINING_MODEL`; không giả lập giá trị site ngẫu nhiên.
- Apply (F7) recompute toàn bộ derived data, có thể thực hiện transfer dual hot-standby theo alarm và đặt **Need Backup**; RMS → Config Backup xóa Need Backup; Restore/Reset xóa trạng thái này. Transfer TX1↔TX2 yêu cầu SEC2+ nhưng không yêu cầu Local/Bypass, còn chỉnh cấu hình vẫn yêu cầu Local + SEC3/4.

Quality gate DME hiện tại: `tests/dme/dme1119a-derivation.test.ts`, `tests/dme/dme1119a-channel.test.ts`, `tests/dme/pmdt-shell.test.tsx` và `tests/state/dme-pmdt-store.test.ts` đạt **56/56 test**; `npm run typecheck` và `npm run build` đã pass. Đây là mô hình đào tạo xác định, không thay thế phép đo RF/hiệu chuẩn phần cứng thật.

### MOPIENS 220 DVOR và 320 DME

Hai simulator phần mềm khai thác được xây dựng độc lập từ `doc/DVOR220/220 DVOR Tech Manual 20240320.pdf`, các ảnh tham chiếu DVOR và `doc/DME320/310320_DME_Tech_Manual 2022-12-19.pdf`. Chúng không dùng engine, security level hoặc phím tắt F7/F8 của thiết bị SELEX:

- Route độc lập: `/simulator/software/dvor-220` và `/simulator/software/dme-320`. PMDT và LMI cùng đọc/ghi một store thiết bị trong mỗi simulator.
- Tài khoản nhà máy: `Administrator` / `1234`, Security Level 3. `Guest` với mật khẩu trống mở phiên Level 0 chỉ đọc. Quyền Local/REM/MAINT được đánh giá độc lập với security level.
- Cấu hình đi qua ba lớp Draft → Running bằng **Apply** → Flash/Profile bằng **Profile Save**; power cycle/reboot khôi phục profile không mất điện mô phỏng.
- DVOR 220 bao phủ dual transmitter, antenna/dummy load routing, CMA/SMA/SYN/PDC, 48 antenna, monitor voting, bypass, timed changeover/shutdown, calibration, ground check, flight inspection, fault injection và history.
- DME 320 bao phủ channel 1–126 X/Y, dual transponder, executive/standby monitor, SCU/TCU/RXU/TXU/HPA/RFG/PMU, power/battery/EMU, calibration/certification, BITE self-test, squitter, IDENT, RF loopback, spacing offset, fault propagation và history.
- Cả hai simulator có menu **System → Simulation Parameters...** để chọn Monitor/Channel, nhập raw measurement overrides, Apply hoặc Reset về giá trị engine mặc định. Các raw measurement overrides này chỉ nằm trong bộ nhớ phiên mô phỏng, tách khỏi Setup/Profile Save/Flash; snapshot cấu hình Setup/Profile được persistence theo application user.
- Engine hai thiết bị là deterministic và tách biệt; phần dùng chung trong `src/modules/operations/mopiens-pmdt/` chỉ là presentation shell/component.

Quality gate ngày **10/08/2026**: **21 file, 103/103 test đạt**, targeted ESLint đạt không warning, `npm run typecheck` và `npm run build` thành công. Smoke check HTTP trả 200 và đúng marker cho cả hai route cùng fallback VHF. Browser backend không khả dụng trong phiên xác minh, vì vậy kiểm tra tương tác dùng component workflow tests; cần kiểm tra trực quan desktop/narrow ở phiên có Browser trước khi phát hành UI ra người dùng cuối.

### Lưu cấu hình và lịch sử Parameter Change

- Cấu hình simulator được lưu theo từng tài khoản ứng dụng trong `user_simulator_configs`, tách riêng snapshot khởi tạo, cấu hình đã Apply/Restore và bản Backup/Profile Save.
- Mỗi thao tác ghi cấu hình tạo một dòng trong `user_simulator_config_history` với action, danh sách `changed_fields`, revision, session và `operator_user_id` của tài khoản đăng nhập bên trong simulator.
- DVOR 1150A, DVOR 1150, DVOR 220, DME 1119A và DME 320 hiển thị các thay đổi sau Backup/Profile Save trong màn hình **Parameter Change**; lịch sử được nạp lại theo đúng application user sau khi reload.
- ADS-B vẫn dùng persistence cấu hình chung nhưng không hiển thị màn hình Parameter Change theo phạm vi thiết kế.

Quality gate cho phần này ngày **10/08/2026**: **33 file, 188/188 test đạt**; `npm run typecheck` và `npm run build` đều thành công.

## Kiến trúc tạo simulator và ma trận ảnh hưởng CONFIG

### Nguyên tắc tổng quát

Repository không tạo simulator hoàn toàn bằng một factory chung. Mỗi simulator được ghép từ các lớp sau:

```text
Manifest/Registry
    ↓
Next.js route
    ↓
React simulator component
    ↓
Zustand store
    ↓
Domain engine / command reducer
    ↓
Derived snapshot
    ↓
PMDT, LMI, QCMS hoặc terminal screens
```

Registry chịu trách nhiệm tạo danh sách module và route metadata; nó không tự tạo ra hành vi thiết bị. Manifest được gom trong `src/modules/core/registry.ts`, trang `/simulator` hiển thị catalog từ `SIMULATOR_MODULES`, còn route động `/simulator/software/[moduleId]` chọn implementation DVOR 220, DME 320 hoặc placeholder bằng module ID.

Route `/simulator/*` được bảo vệ bởi `src/app/simulator/layout.tsx`. Khi simulator được mở, phần hiển thị và state chạy ở client; API/ Supabase chủ yếu cung cấp cấu hình đã lưu, backup và lịch sử thay đổi. Repository không mở kết nối serial/TCP/SSH tới thiết bị thật trong luồng mô phỏng.

### Hai thế hệ kiến trúc

Nhóm thiết bị PMDT legacy gồm DVOR 1150, DVOR 1150A và DME 1119A. Layout tại `src/components/vor` hoặc `src/components/dme` dựng shell cổ điển; Zustand store giữ session, config, draft, màn hình và derived data; engine nằm trong `src/lib/dvor1150`, `src/lib/dvor1150a` hoặc `src/lib/dme1119a`.

Nhóm phần mềm vận hành mới gồm DVOR 220 và DME 320. Mỗi module tách rõ:

- `domain/types.ts`: kiểu dữ liệu thiết bị.
- `domain/defaults.ts`: trạng thái khởi tạo.
- `domain/commands.ts`: command, quyền và reducer.
- `domain/engine.ts`: alarm, fault, thời gian, changeover và snapshot.
- `store/*-store.ts`: adapter Zustand mỏng.
- `ui/*`: màn hình PMDT/LMI.

DVOR 220 và DME 320 dùng chung vỏ `src/modules/operations/mopiens-pmdt/`. Vỏ này chỉ cung cấp title bar, menu, toolbar, navigation, tabs, output log và status bar; luật của từng thiết bị vẫn nằm trong domain engine riêng.

ADS-B là nhánh khác: `/simulator/ads-b` dùng `createTerminalStore` và `TerminalWindow`, không dùng PMDT shell.

### Luồng DVOR 1150A

```text
/simulator/dvor-1150a
    → Dvor1150aPmdtLayout
    → useVorPmdtStore
    → setConfigValue / Apply / transmitter commands
    → buildDvor1150aSnapshot(config)
    → derived.data và derived measurements
    → PmdtScreenRouter
```

`buildDvor1150aSnapshot()` tính transmitter active, công suất, tần số, điều chế, monitor, VSWR, alarm, voting, yêu cầu transfer (`transferRequested`) và dữ liệu sidebar. Khi maintenance Bypass được nhả, Zustand store đánh giá yêu cầu này một lần và tự chuyển sang TX dự phòng hợp lệ của cấu hình dual; alarm vẫn hiển thị trong khi Bypass đang bật. Màn hình chỉ đọc snapshot, không tự hardcode giá trị phụ thuộc thiết bị.

### Luồng DVOR 1150

DVOR 1150 có engine đơn giản hơn tại `src/lib/dvor1150/engine.ts`. Khi TX2 được chọn làm Main và `outputPowerScale = 70`, snapshot hiện tại cho TX2 output power bằng 70, TX1 bằng 0 và RF Level của monitor đi theo TX2. Cấu hình transmitter, monitor limits và active path được tính lại qua `buildDvor1150Snapshot()`.

DVOR 1150 là model rút gọn: nó không khai báo `frequencyErrorPpm`; carrier và sideband chủ ý chỉ lấy `station.frequencyMHz`. Ma trận dependency và test regression vẫn phải phát hiện các field có control nhưng chưa có tác động thực tế.

### Luồng DME 1119A

```text
setDmeParameterValue(fieldId, value)
    → cập nhật config/draft
    → synchronizeDmeChannelData() nếu đổi channel
    → recomputeDmeDerivedData()
    → Monitor, Decoder, RTC, PA, Sidebar, Alert và Transfer
```

DME 1119A đã có `dmeDerivationRules`, `dmeConfigDerivationMap` và metadata `affects/formula/alarmStatus` trong `src/lib/dme1119a/config.ts`. Metadata giúp audit và kiểm thử từng control; công thức thực tế nằm trong `recomputeDmeDerivedData()`.

### Ma trận CONFIG → DERIVED theo code hiện tại

Đây là ma trận **as-built** của source hiện tại, không phải danh sách hành vi lý tưởng suy ra từ manual. Một dependency chỉ được xem là đã triển khai khi field nguồn thật sự được engine/reducer đọc và làm thay đổi output. Field chỉ xuất hiện trên form, được lưu hoặc được validation nhưng chưa tham gia phép tính phải được ghi rõ là **control/display-only** hoặc **chưa nối engine**.

Mỗi quan hệ cần truy được đủ chuỗi:

```text
source config/runtime field
    → công thức hoặc invariant
    → derived measurement
    → alarm/voting/status
    → routing hoặc automatic action (nếu đã triển khai)
```

| Simulator | Nguồn live | Điểm tái tính chính | Nguồn audit |
| --- | --- | --- | --- |
| DVOR 1150A | `config` sau Apply | `buildDvor1150aSnapshot()` | `src/lib/dvor1150a/engine.ts`; chưa có metadata map riêng |
| DVOR 1150 | `config` sau Apply | `buildDvor1150Snapshot()` | `src/lib/dvor1150/engine.ts`; chưa có metadata map riêng |
| DME 1119A | `data`/`configDraft` | `recomputeDmeDerivedData()` | `dmeConfigDerivationMap` bao phủ toàn bộ catalog và được test đối chiếu |
| DVOR 220 | `configuration.running` | `deriveDvor220Snapshot()` và executive state machine | Draft chỉ có hiệu lực sau Apply; Flash chỉ đổi sau Profile Save |
| DME 320 | `config.running` | `refreshDme320Simulation()` → `evaluateMonitors()` | Draft chỉ có hiệu lực sau Apply; Flash chỉ đổi sau Profile Save |

ADS-B không có mô hình RF CONFIG → DERIVED tương đương nên nằm ngoài ma trận này. Persistence của ADS-B vẫn hoạt động độc lập.

Không ghi ngược hàng loạt giá trị dẫn xuất vào config. Config giữ giá trị nguồn; Tx Power, RF Level, Delay, ERP, VSWR và alarm status phải được tái tính xác định. Chỉ invariant cấu trúc mới được sửa các field nguồn liên quan, ví dụ:

- DVOR chọn một TX On-Air/Antenna thì đường TX còn lại phải rời antenna; On-Air và Load của cùng một TX loại trừ nhau.
- DVOR 1150/1150A tắt Local thì Bypass bị tắt.
- DME 1119A đổi channel thì rebase channel allocation, Delay/Spacing nominal và calibration delta.
- DME 1119A chọn Single Transmitter thì TX còn lại cùng Standby data trở thành không khả dụng.
- MOPIENS giữ ba lớp Draft → Running → Flash; Apply chỉ cập nhật Running, Profile Save mới cập nhật Flash.

Với DVOR 1150/1150A và DME 1119A, thay đổi bền vững đi qua draft → Apply (F7) → Need Backup → Config Backup. Với DVOR 220/DME 320, luồng tương ứng là Draft → Apply → Running → Profile Save → Flash. Simulation measurement override của hai MOPIENS là runtime-only, không đi vào Profile Save và bị xóa khi reboot/power-cycle.

#### Ma trận DVOR 1150A

Ký hiệu `<tx>` là `tx1` hoặc `tx2`; `<mon>` là `mon1` hoặc `mon2`. Chỉ TX đang `onAir` cấp dữ liệu live cho các cột TX/monitor.

| Nguồn | Công thức/quan hệ đã triển khai | Output trực tiếp | Alarm/status/action |
| --- | --- | --- | --- |
| `station.frequencyMHz`; `transmitters.<tx>.frequencyErrorPpm` | `carrier = station × (1 + ppm / 1_000_000)`; sideband lấy carrier −0.0099/+0.0100 MHz | Carrier/sideband frequency và monitor Tx Frequency Error của TX active | Calibration/limits của Tx Frequency Error đổi status; fault frequency làm Ident Status và các TX alert liên quan chuyển lỗi |
| `nominal.outputPower`; `offsets.outputPowerScale` | `effectiveOutput = nominal × scale / 100`; riêng nominal power còn làm scale SBO theo mốc 70 W | Carrier Tx Power và monitor Tx Power sau `txPowerScale/txPowerOffset` | Tx Power limits → monitor health → voting/system alert; `outputPowerScale` không trực tiếp scale SBO |
| `nominal.sboRfLevel`; `nominal.outputPower`; `offsets.txSidebandRfLevelScale` | `effectiveSBO = nominalSBO × (nominalPower / 70) × scale / 100` | SBO, 9960 Hz adjustment, Deviation, RF Level và nguồn tính sideband power | Các limits tương ứng phân loại warning/alarm và có thể tạo `transferRequested` |
| `offsets.sideband1..4RfLevelScale` | Mỗi sideband dùng voltage scale: `power = effectiveSBO × (scale / 100)^2 / 41` | Công suất Sideband #1…#4 đúng TX | Forward-power alert khi TX On-Air mà power về 0; hiện không trực tiếp đổi 9960 Hz measurement |
| `nominal.referenceModulation` + `referenceModulationScale`; `nominal.identModulation` + `identModulationScale` | Reference delta cộng vào 30 Hz/9960 Hz; Ident delta đi qua hệ số 0.9 rồi calibration monitor | 30 Hz, 9960 Hz và Ident Modulation | Limit từng parameter → indicator/health/voting theo routing |
| `nominal.azimuthIndex`; `offsets.azimuthAngleOffset`; `monitor.antennas.<mon>.*` | Azimuth lấy TX delta và trung bình hai antenna nếu antenna 2 bật; RF Level cộng attenuation delta của đường antenna | Azimuth/RF riêng từng monitor | Azimuth limits/RF limits → status; antenna disabled làm monitor không healthy |
| `monitor.rawMeasurements.<mon>.*`; `monitor.calibration.<mon>.*` | Raw → scale/offset của đúng monitor; không lan sang monitor còn lại | Toàn bộ measurement của `<mon>`, notch và 48 giá trị sideband VSWR | Classify sau calibration; routing quyết định measurement nào tham gia health |
| Carrier-sideband coarse/fine; sideband #1…#4 phase; `carrierPllControl`; azimuth offset | Coarse/fine đổi hiệu suất pha của 9960 Hz; phase từng sideband tạo quadrantal/octantal; PLL/azimuth tạo ground-check bias | 9960 Hz và 16 điểm Ground Check/error spread | Phase sai có thể bật TX phase/sideband alerts; Ground Check hiện là kết quả đo, không tự transfer |
| `transmitters.<tx>.vswr.*`; sideband VSWR offsets; raw VSWR monitor; odd/even return-loss calibration | Carrier/sideband VSWR luôn clamp `>= 1`; TX active tạo delta lên profile monitor | TX VSWR và profile 48 antenna; màn hình tổng dùng Monitor 1 | Pre-alarm/alarm theo số antenna vượt ngưỡng; carrier/sideband faults cập nhật TX alerts |
| `monitor.alarmLimits.*`; `azimuthLimits`; `routing`; `votingLogic`; `transfer` | Limits chỉ classify, không sửa measurement; health chỉ xét parameter được route; AND/OR tổng hợp monitor | Indicator, primary/secondary health, system health | Sinh `transferRequested` theo rule, nhưng engine DVOR 1150A hiện chưa tự đổi relay/Main TX |
| `transmitters.<tx>.enabled/onAir/load/faults.*` | Chọn active path, khóa TX fault/disabled và xóa dữ liệu live ở cột Off | TX Data, Monitor Data, sidebar, power/frequency/VSWR | Cập nhật validation, maintenance/TX alerts và voting source |

Ví dụ mặc định: nominal output 70 W, output scale 84%. Đổi nominal thành 100 W tạo effective output `100 × 84% = 84 W`; sau hệ số tham chiếu và calibration Monitor 1, Tx Power hiển thị khoảng 101.14 W. Đây là một chuỗi tính dẫn xuất, không phải thao tác sửa đồng thời nhiều field config.

#### Ma trận DVOR 1150

| Nguồn | Công thức/quan hệ đã triển khai | Output trực tiếp | Alarm/status/action |
| --- | --- | --- | --- |
| `nominal.outputPower`; `offsets.outputPowerScale` | `output = nominal × scale / 100` | Carrier power của TX và RF Level monitor khi TX đó active | RF/monitor limits → health/voting/maintenance alert |
| `nominal.outputPower`; `nominal.sboRfLevel`; `sideband1..4RfLevelScale` | SBO scale theo `nominalPower / referencePower`; sideband power dùng bình phương RF scale | SBO và Sideband #1…#4 | VSWR synthetic cũng phản ứng với RF scale/phase; không có RF power alarm state machine riêng |
| `nominal.referenceModulation`; `nominal.voiceModulation`; các modulation scale | Reference → 30 Hz/9960 Hz; Voice → Deviation | Monitor measurement của cả hai monitor, cộng offset riêng | Alarm bands phân loại normal/warning/alarm |
| `station.frequencyMHz` | Carrier = station; lower/upper = station ±0.00996 MHz | TX frequency của cột active | Model không có `frequencyErrorPpm`; tần số chỉ theo station |
| `monitor.offsets.<mon>.*` | Cộng offset độc lập sau giá trị nguồn | Azimuth, modulation, deviation, RF của đúng monitor | Status được tính lại sau offset; không làm đổi monitor còn lại |
| `monitor.alarmLimits.*`; `votingLogic` | Limits chỉ classify; AND/OR tổng hợp health | Indicator, sidebar, monitor integral | Maintenance alert thay đổi; chưa có automatic transfer |
| `station.transmitterConfig`; `transmitters.*.enabled/onAir/load` | Single Transmitter vô hiệu TX2; active path quyết định cột live | Main/Load/Off, TX data, monitor path, 48 VSWR | Không có TX active thì monitor unhealthy và validation cảnh báo |

DVOR 1150 là model rút gọn. Các field có control nhưng chưa nối engine phải nằm trong bảng khoảng trống bên dưới thay vì được suy diễn từ manual.

#### Ma trận DME 1119A

`dmeConfigDerivationMap` trong `src/lib/dme1119a/config.ts` là bản kê canonical theo từng field. Bảng dưới gom theo nhóm để README dễ đọc; metadata chi tiết vẫn là nguồn dùng cho audit/test tự động.

| Nguồn | Công thức/quan hệ đã triển khai | Output trực tiếp | Alarm/status/action |
| --- | --- | --- | --- |
| `rmsConfigStation.channelType/channelNumber` | Table 9-5: INT/RX `1024+n`, RX LO `899+n`, TX theo dải X/Y; Delay 50/56 µs và spacing theo type | Channel allocation, Monitor, Decoder, RTC, calibration baseline, sidebar | Rebase Delay/Spacing nominal và limits nhưng giữ calibration delta |
| `transmitterConfig/monitorConfig/hotStandby`; relay selectors | Single/dual gate availability; TX antenna là Integral, TX còn lại là Standby/Load trong dual hot-standby | TX state, Integral/Standby rows, RTC traffic | Disabled path chuyển gray; automatic transfer chỉ có khi dual path khả dụng |
| `rtcParameters.powerOutput`; `txOffsets.0.*`; HPA enable/low-output limit | Target theo station baseline × RTC dB ratio × scale riêng TX; HPA disabled làm giảm đúng TX | RTC/PA output, Monitor Tx Power, ERP, sidebar | PA/Tx Power/ERP status và maintenance alert; TX1/TX2 không dùng chung scale |
| `replyDelayOffset`; propagation/base/standby offsets | Delay = channel nominal + reply offset + TX base + monitor offset | Monitor Delay và RTC Prop Delay | Delay alarm có thể tạo yêu cầu transfer khi Apply |
| `minimumSquitter`; `maximumPrf`; `deadTime`; SDES/LDES | Effective PRF bị chặn bởi max, `1_000_000/deadTime` và 5500 ppps; echo suppression giảm traffic xác định | PRF, capacity, traffic bands, replies, gain reduction | Overload/RTC status và maintenance alert |
| `monitorOffsets.*`; reply attenuation; directional-coupler loss | Offset/scale riêng monitor cho Delay, Spacing, Power, Efficiency, PRF, frequency, ERP; Return Loss đổi sang VSWR và clamp `>=1` | Integral/Standby/calibration/sidebar | Classify từng cột monitor sau calibration |
| `alarmLimits.*`; integrity enable/config | Delay/Spacing limits là offset quanh nominal; integrity dùng bốn công thức 1/10 của §3.6.9.2.1 | Limit rows và Integrity Results | Alarm/warning, primary/secondary state và station alert |
| `rmsConfigGeneral.votingLogic/transfer`; `monitorConfigGeneral.*` | AND/OR tổng hợp monitor; routing xác định Primary/Secondary | Monitor Normal/Pri/Sec | Apply (F7) thực hiện transfer dual hot-standby khi rule thỏa |
| `txConfigNominal.ident.*`; `identMode` | Chọn primary/secondary/standby ident; Off/Continuous/keyer-loss đổi status | Ident Code/Status và RTC data | Ident maintenance/station alert |
| Security, Local, timestamp và các field metadata `controlOnly` | Chỉ điều khiển session/status/presentation | Login, RMS status, clock | Không tạo measurement RF giả |

Ví dụ đổi 117X sang 117Y làm nominal Delay 50 → 56 µs, reply spacing 12 → 30 µs, interrogation spacing 12 → 36 µs và TX reply frequency 1204 → 1078 MHz. Engine giữ calibration delta rồi tái tính toàn bộ data thay vì ghi đè mù các giá trị đã hiệu chuẩn.

#### Ma trận MOPIENS DVOR 220

Với monitor reading, thứ tự ưu tiên là `measurement override > injected monitor fault > engine baseline`, sau đó mới classify theo limits. Vì vậy Simulation Parameters có thể cố ý che giá trị của một fault cùng ô; Reset override sẽ làm fault/baseline hiện lại.

| Nguồn | Công thức/quan hệ đã triển khai | Output trực tiếp | Alarm/status/action |
| --- | --- | --- | --- |
| `station.frequencyMHz` | Carrier = station; USB/LSB = station ±0.00996 MHz; band Carrier Frequency được shift cùng station | TX frequencies và monitor Carrier Frequency | Giữ nguyên khoảng tolerance tương đối khi đổi tần số |
| `station.carrierPowerW`; `transmitters.<tx>.carrierScalePercent`; calibration factors | Forward carrier = setpoint × setpoint factor × reading factor | Carrier forward power từng TX đang bật RF | Hiện transmitter power limit bands chưa tham gia classify engine |
| `transmitters.<tx>.sidebandPowerW.*`; calibration factors | Sideband forward power lấy setpoint riêng từng nhánh × calibration | USB/LSB Cos/Sin power | RF output Off đưa power về 0 và làm FM/9960/distortion monitor báo lỗi theo limits |
| `useStationModulation/useStationAzimuth/useStationIdent` và giá trị station/TX tương ứng | Chọn nguồn cho AM 30 Hz, bearing error và Ident 1020 Hz | Monitor baseline theo active hoặc standby path | Channel limits phân loại; `identCodeAlarmSeverity` đổi Primary/Secondary của Ident |
| `monitor.channels.<channel>.type/limits/executiveAction` | Disabled channel bị loại; reading được classify theo band; chỉ primary alarm của channel có `executiveAction` mới vote | Channel status, primary/secondary alarms | Vote đi vào executive alarm nếu monitor không bypass |
| `monitor.votingLogic`; executive delay; power-on/post-changeover holdoff | AND cần cả hai monitor vote, OR cần một; state machine dùng các timer | Executive phase/service status | Alarm đầu tiên changeover; alarm tiếp theo có thể shutdown/lock reset theo state hiện tại |
| `transmitterLimits.vswrUpperWarning/vswrUpperAlarm`; antenna fault | Worst USB/LSB của 48 antenna so với hai ngưỡng | PDC antenna profile/status | PDC alarm tham gia executive/service status |
| `thermal.<tx>.*`; `battery.*`; configured communication shutdown | Fan hysteresis, thermal trip/restart, battery warning/alarm/cutoff và delay link fault | Unit/power status, battery runtime | Có thể shutdown TX/system hoặc đổi service status |
| `measurementOverrides`; typed faults; Local/REM/MAINT và bypass | Override thay đúng Monitor/Channel/Parameter; fault/status vẫn đi theo engine; MAINT tạo effective bypass | PMDT/LMI monitor readings và equipment status | Reclassify ngay; bypass giữ indication nhưng chặn executive vote |

#### Ma trận MOPIENS DME 320

Measurement override cũng có ưu tiên cuối cùng so với baseline và fault-derived value. Sau đó engine classify, chạy alarm delay, voting và monitor action.

| Nguồn | Công thức/quan hệ đã triển khai | Output trực tiếp | Alarm/status/action |
| --- | --- | --- | --- |
| `station.channel` | Allocation đủ 1X–126Y: interrogation `1024+n`; reply ±63 MHz; X/Y quyết định spacing và Delay 50/56 µs | Frequency, Delay, pulse spacing và self-test nominal | Apply tự rebase limits Time Delay, Pulse Spacing và Frequency theo channel mới, đồng thời giữ calibration delta của người dùng |
| `station.powerOutputWatts`; `transmitters.<tx>.outputPowerPercent` | `peakPower = stationPower × percent / 100` theo source transponder của channel | Peak Power của Executive/Standby | HPA-low-output fault giảm còn 40%, kéo Efficiency/ERP và alarm liên quan |
| `station.delayOffsetUs`; runtime `spacingOffsetUs` | Delay = channel nominal + station offset; spacing = channel reply spacing + offset của TX nguồn | Time Delay và Pulse Spacing | Classify theo limits; RXU fault cộng 1.2 µs vào Delay |
| `station.minimumPulseRatePps`; runtime Squitter/Ident Keying | Continuous Ident = 1350 pps; Squitter On = `max(700, minimumPulseRate)`; Off = 0 | Transmission Rate, Efficiency, Ident Code | Runtime state/fault có thể đưa value về 0 và sinh alarm |
| `station.identCode`; runtime `identKeying` | Ident Off trả chuỗi rỗng; trạng thái khác trả station code | Ident reading | `identFaultDelayMs` áp dụng riêng Ident alarm |
| TX route/power/RF/shutdown/interlock; active/standby mapping | Executive channel đọc TX trên antenna, Standby channel đọc TX còn lại; unavailable path trả 0 hoặc invalid | Toàn bộ monitor readings của path | Invalid/fault → alarm; severe TX fault chặn changeover |
| `monitor.limits.*` và per-limit `alarmDelayMs` | Classify normal/warning/alarm; alarm đi pending → active sau delay | Alarm state và overall monitor status | ERP active mask mọi reading trừ ERP; primary active mới tạo vote |
| `monitor.votingLogic`; `monitorActionDelayMs`; holdoffs; monitor mode | AND/OR tổng hợp primary vote của Executive channel; Bypass vẫn hiện alarm nhưng không vote | Monitor action state | Khi delay đủ: changeover nếu standby khả dụng, nếu không thì shutdown; lần action tiếp theo không hồi sinh TX đã latched fault |
| Battery/system/environment config và runtime fault | Battery thresholds/cutoff, configured link-fault delay, EMU enable và environmental inputs | Power/environment/service status | Có thể warning/alarm hoặc shutdown hệ thống |
| `measurementOverrides`; fault injection | Override đúng Monitor/Channel/Parameter được áp sau fault transformation | Reading được chọn | Alarm, ERP masking, voting và action được tính lại ngay; override bị xóa khi reboot |

#### Khoảng trống dependency phát hiện khi audit

Các mục này đã có field/control nhưng chưa tạo đủ quan hệ dẫn xuất. README ghi rõ để không nhầm “đã lưu được” với “đã mô phỏng được”.

| Module | Field/control chưa nối đủ | Hệ quả hiện tại |
| --- | --- | --- |
| DVOR 1150A | `monitor.integrity.maxConsecutiveFailures`; keyer mode | Voice đã tác động Deviation, timer được chốt display-only và relay transfer đã có; hai field này vẫn control-only cho đến khi có rule training cụ thể |
| DVOR 1150 | Ident modulation không có Ident monitor; automatic transfer | Model rút gọn chỉ hiển thị health/voting, không mô phỏng hai feature này |
| DVOR 220 | Voice modulation, IDENT code/keyer/sync, RF phase, channel reference azimuth, RF gain, average count, warning-range %, IDENT delay và carrier/sideband power limit bands | Các field này hiện chủ yếu validation/display/persistence; chưa làm đổi measurement/alarm tương ứng trong engine |
| DME 320 | Auto Delay Calibration, SDES/LDES/dead-time/equalizer, `useStation*`, station IDENT keyer/sync | Các field này hiện chủ yếu validation/display/persistence; channel-dependent limits đã tự rebase nhưng các model RF/calibration còn lại cần rule training xác nhận |
| DME 1119A | Không có field catalog bị bỏ trống metadata | Mỗi field đều có derivation metadata hoặc được đánh dấu `controlOnly`; công thức thực tế vẫn phải được regression test khi sửa engine |

### Nguyên tắc mở rộng ma trận

Khi thêm tham số mới:

1. Thêm field có kiểu và default trong domain model.
2. Thêm catalog metadata, parse, min/max/step và validation.
3. Ghi một dependency entry gồm: source path, lifecycle Draft/Running/Flash, công thức, output, alarm/action, phạm vi TX/Monitor và trạng thái `implemented`/`controlOnly`/`planned`.
4. Đặt quan hệ vật lý trong engine, không đặt trong JSX; khai báo rõ thứ tự ưu tiên nếu có baseline, calibration, fault và override.
5. Tính lại snapshot sau Apply và kiểm tra cả active/inactive transmitter, Integral/Standby hoặc Monitor 1/2.
6. Thêm test dương cho output phải đổi, test âm cho output không được đổi và test downstream cho alarm/voting/transfer khi có.
7. Chỉ xóa một mục khỏi bảng khoảng trống sau khi công thức, UI projection và regression test đều đã có.

Các quan hệ vật lý phải xác định, giải thích được và ưu tiên theo thứ tự: hành vi đã xác nhận cùng ảnh tham chiếu; manual thiết bị; sau đó mới đến quy ước của source/test hiện tại. Một số giá trị trong engine là training approximation đã hiệu chuẩn theo ảnh PMDT, không phải mô hình RF đầy đủ của thiết bị thật.

## Chức năng chính

### Dành cho giám khảo

- Quản lý kịch bản độc lập cho VOR, DME và ADS-B.
- Tạo bộ đề theo môn, trong đó mỗi đề có thể chứa nhiều kịch bản; môn VOR-DME có thể kết hợp kịch bản của cả hai module.
- Tạo, khóa và lưu trữ kỳ thi; quản lý giám khảo, danh sách thí sinh, phân môn, phân đề và kết quả chính thức.
- Mở bài thi chính thức theo từng môn để đối chiếu nhật ký PMDT, câu trả lời, checkpoint, chuỗi terminal và chẩn đoán phần cứng trước khi nhập điểm.
- Cấu hình giá trị, trạng thái cảnh báo và checkpoint trực tiếp trên giao diện PMDT VOR/DME.
- Tạo quy trình thao tác tham chiếu cho terminal ADS-B.
- Bổ sung bài chẩn đoán phần cứng tùy chọn bằng sơ đồ tín hiệu tương tác.
- Theo dõi bài nộp VOR/DME, so sánh bằng chứng và ghi điểm nhận xét.
- Tạo, sửa, xóa và đồng bộ kịch bản với Supabase khi môi trường cloud khả dụng.

### Dành cho học viên

- Chọn bài thực hành theo từng module thiết bị.
- Thao tác trên PMDT VOR/DME hoặc QCMS và terminal ADS-B mô phỏng.
- Ghi nhật ký màn hình, trạng thái và thao tác đã thực hiện.
- Chọn component nghi ngờ trên sơ đồ phần cứng và trình bày phương án xử lý.
- Nộp kết quả để giám khảo đánh giá hoặc nhận điểm tự động tùy module.
- Tên thí sinh và đơn vị công tác được lấy từ hồ sơ đã xác thực, không nhập lại khi bắt đầu bài VOR/DME.
- Vào kỳ thi đang mở bằng email công vụ đã đăng ký, chọn môn được phân và thực hiện lần lượt các kịch bản trong đề thi.

### Tài khoản và phân quyền

- Đăng ký bằng email đúng miền `@attech.com.vn`, mật khẩu tối thiểu 8 ký tự có chữ và số.
- Xác thực đăng ký và quên mật khẩu bằng mã OTP 6 số gửi qua Supabase Auth/Resend SMTP.
- Tài khoản mới luôn có vai trò ứng dụng `student`; vai trò được lưu trong `public.profiles`, không chỉnh trường hệ thống `auth.users.role`.
- Route `/student/*`, `/admin/*` và các API kịch bản/bài nộp được kiểm tra phiên và vai trò ở phía server; RLS tiếp tục là lớp bảo vệ dữ liệu cuối cùng.
- Sau 5 lần nhập sai thông tin đăng nhập qua ứng dụng, email bị khóa 5 phút. Khi hết thời gian, bộ đếm bắt đầu lại và có thể khóa tiếp sau 5 lần sai mới.

### Giao diện và khả năng sử dụng

- Giao diện tiếng Việt theo hướng Windows 11/Fluent, tối ưu cho dashboard nghiệp vụ mật độ cao.
- Điều hướng riêng cho vai trò giám khảo và học viên, với các section VOR, DME và ADS-B.
- Hỗ trợ desktop, mobile, điều hướng bàn phím, reduced motion và độ tương phản hướng tới WCAG AA.
- Video và thuyết minh trên trang chủ được phân phối qua Supabase Storage/CDN.

## Kiến trúc dữ liệu

```text
Trình duyệt
  ├─ Zustand stores
  ├─ localStorage (cache/fallback)
  └─ Next.js API routes
       └─ Supabase
            ├─ Auth + profiles (student/admin)
            ├─ scenarios / vor_scenarios / dme_scenarios
            ├─ vor_submissions / dme_submissions
            ├─ exam_sets / exam_papers / exam_paper_scenarios
            ├─ exams / exam_examiners / exam_candidates
            ├─ exam_candidate_subjects / exam_attempts / exam_attempt_items
            ├─ auth_login_attempts
            ├─ user_simulator_configs / user_simulator_config_history
            └─ training media storage
```

- Supabase Auth quản lý thông tin đăng nhập; `public.profiles` quản lý họ tên, đơn vị và vai trò ứng dụng.
- Supabase Database lưu kịch bản ADS-B, VOR, DME và bài nộp VOR/DME.
- Supabase Database lưu snapshot cấu hình theo application user và audit history thay đổi parameter của simulator.
- `localStorage` giữ bản dữ liệu cục bộ có phiên bản và đóng vai trò fallback khi API hoặc Supabase không khả dụng.
- Luồng **thi chính thức** là ngoại lệ: kỳ thi, phân đề, tiến độ và kịch bản đang thi luôn được đọc/ghi trực tiếp từ Supabase; hệ thống không dùng dữ liệu `localStorage` thay thế khi Supabase lỗi. Điểm chính thức chỉ được giám khảo nhập sau khi thí sinh nộp môn thi.
- Các migration và seed data được quản lý trong `supabase/migrations/`.
- Media phát hành không được commit trong `public/media/`; frontend sử dụng URL Supabase Storage.

### Giới hạn bảo mật cần lưu ý

- Supabase Free không cung cấp Password Verification Hook. Cơ chế khóa 5 phút hiện nằm trong Server Action của ứng dụng nên ngăn đăng nhập qua giao diện này, nhưng không thể khóa tuyệt đối một người gọi trực tiếp Supabase Auth endpoint bằng publishable key.
- `SUPABASE_SECRET_KEY` chỉ được dùng ở server để ghi bộ đếm đăng nhập sai. Tuyệt đối không thêm tiền tố `NEXT_PUBLIC_`, log giá trị hoặc commit vào Git.
- Quota/rate limit email của Supabase và Resend vẫn áp dụng. Giao diện có cooldown gửi lại nhưng production nên tiếp tục theo dõi abuse và cân nhắc CAPTCHA.
- Tài khoản terminal mô phỏng không phải tài khoản Supabase và không được dùng làm thông tin xác thực thật.
- Chưa có màn hình quản trị người dùng và audit log thay đổi vai trò; lần cấp quyền admin đầu tiên cần thực hiện trong SQL Editor.

## Công nghệ

- Next.js 16 App Router, React 19 và TypeScript
- Tailwind CSS 4, Geist, Motion và Phosphor Icons
- Zustand cho trạng thái phía client
- Supabase Database và Storage
- Vitest, Testing Library, Playwright và axe-core
- Vercel cho hosting và GitHub Actions cho quality gate

## Chạy trên máy cục bộ

### Yêu cầu

- Node.js 20.9 trở lên; dự án gần nhất được xác minh với Node.js 24.
- npm.
- Một Supabase project nếu cần đồng bộ dữ liệu cloud. Có thể chạy giao diện bằng fallback cục bộ khi chưa cấu hình Supabase.

### Cài đặt

```bash
npm ci
```

Sao chép `.env.example` thành `.env.local` và điền hai khóa public/client cùng một khóa server-only của Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_SECRET_KEY=sb_secret_your_key
```

Lấy secret key tại **Supabase Dashboard → Project Settings → API Keys → Secret keys**. Không đưa database password, secret key hoặc secret khác vào biến môi trường public có tiền tố `NEXT_PUBLIC_`. Resend API key đã được cấu hình trong Supabase Custom SMTP thì không cần và không nên lưu thêm trong frontend.

### Thiết lập Supabase Auth

1. Áp dụng migration `supabase/migrations/202607180001_add_auth_profiles_and_security.sql` bằng Supabase CLI hoặc SQL Editor. Migration này chủ động xóa toàn bộ bài nộp thử nghiệm cũ trong `vor_submissions` và `dme_submissions`; cache bài nộp định dạng cũ trong trình duyệt cũng bị loại ở lần tải tiếp theo.
2. Áp dụng migration `supabase/migrations/202607180002_create_exam_management.sql` để tạo danh mục môn, bộ đề, kỳ thi, phân công thí sinh, lượt thi và toàn bộ policy RLS/RPC liên quan.
3. Trong **Authentication → Providers → Email**, bật Email/Password và yêu cầu xác nhận email.
4. Trong **Authentication → Email Templates → Confirm signup**, thay liên kết xác nhận bằng mã OTP, ví dụ:

   ```html
   <h2>Mã xác thực đăng ký</h2>
   <p>Nhập mã sau vào THỰC HÀNH MÔ PHỎNG CNS:</p>
   <p style="font-size: 28px; font-weight: 700; letter-spacing: 8px;">{{ .Token }}</p>
   <p>Nếu bạn không đăng ký, hãy bỏ qua email này.</p>
   ```

5. Trong **Authentication → Email Templates → Reset password**, cũng dùng `{{ .Token }}` thay cho `{{ .ConfirmationURL }}`:

   ```html
   <h2>Mã đặt lại mật khẩu</h2>
   <p>Nhập mã sau vào màn hình Quên mật khẩu:</p>
   <p style="font-size: 28px; font-weight: 700; letter-spacing: 8px;">{{ .Token }}</p>
   <p>Nếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này.</p>
   ```

6. Trong **Authentication → Hooks → Before User Created**, chọn Postgres function `public.hook_restrict_attech_signup`. Hook này chặn đăng ký ngoài miền `@attech.com.vn` ở phía server và có trên Supabase Free.
7. Kiểm tra **Authentication → URL Configuration**: đặt Site URL cho production và thêm `http://localhost:3000/**` vào Redirect URLs khi phát triển.

Frontend đã dùng `verifyOtp` với loại `signup` cho đăng ký và `recovery` cho quên mật khẩu. Không giữ `{{ .ConfirmationURL }}` trong hai template trên nếu muốn người dùng luôn nhập mã 6 số thay vì bấm liên kết.

### Cấp tài khoản quản trị đầu tiên

Mọi tài khoản mới mặc định là `student`. Sau khi tài khoản đã đăng ký và xác thực OTP, chạy trong Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where email = 'ten-quan-tri@attech.com.vn';
```

Đăng xuất rồi đăng nhập lại để giao diện nhận quyền mới. Chỉ đổi `public.profiles.role`; không đổi `auth.users.role` và không gán `service_role` cho người dùng.

Khởi động môi trường phát triển:

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

Nếu cache Turbopack tăng bất thường, dừng dev server rồi khởi động lại với cache sạch:

```bash
npm run dev:clean
```

Chỉ dọn cache mà không khởi động dev server:

```bash
npm run clean:cache
```

## Các route chính

| Vai trò | VOR | DME | ADS-B |
| --- | --- | --- | --- |
| Giám khảo | `/admin/vor` | `/admin/dme` | `/admin/ads-b` |
| Học viên | `/student/vor` | `/student/dme` | `/student/ads-b` |

Các route con xử lý tạo/sửa kịch bản, phiên thực hành, danh sách bài nộp và đánh giá kết quả.

Simulator phần mềm khai thác độc lập:

| Thiết bị | Route | Trạng thái |
| --- | --- | --- |
| MOPIENS 220 DVOR | `/simulator/software/dvor-220` | Simulator sẵn sàng; Authoring/Review đang lập kế hoạch |
| MOPIENS 320 DME | `/simulator/software/dme-320` | Simulator sẵn sàng; Authoring/Review đang lập kế hoạch |

Các route quản lý và vào thi chính thức:

| Chức năng | Route |
| --- | --- |
| Admin quản lý kỳ thi | `/admin/exams` |
| Admin quản lý bộ đề | `/admin/exam-sets` |
| Thí sinh vào thi | `/student/exams` |

Route thi chính thức kiểm tra lại email, phân công môn, đề và thứ tự kịch bản ở phía server. Route luyện tập VOR, DME và ADS-B vẫn hoạt động độc lập như trước.

## Kiểm tra chất lượng

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run test:e2e
```

Chạy bốn quality gate chính:

```bash
npm run check
```

Playwright cần Chromium trong lần thiết lập đầu tiên:

```bash
npx playwright install chromium
```

Theo workflow của dự án, sau khi sửa giao diện hoặc logic hãy kiểm tra trực tiếp trên môi trường dev trước. Chỉ chạy test/build khi thay đổi đã được xác nhận.

## Triển khai

Repository được liên kết với Vercel và tự động triển khai khi nhánh `main` được cập nhật. `vercel.json` đặt vùng chạy Functions/SSR tại Singapore (`sin1`); tài nguyên tĩnh vẫn được phân phối qua CDN toàn cầu.

Trước khi triển khai:

1. Xác nhận các biến môi trường Supabase trên Vercel.
2. Áp dụng migration cần thiết trong `supabase/migrations/`.
3. Chạy các quality gate của dự án.
4. Kiểm tra policy RLS nếu schema hoặc quyền truy cập dữ liệu thay đổi.

### Cập nhật media

Media trang chủ được lưu trên Supabase Storage với đường dẫn có phiên bản. Khi thay video, poster hoặc thuyết minh, hãy phát hành vào một thư mục phiên bản mới và cập nhật URL trong frontend để tránh trình duyệt/CDN tiếp tục dùng nội dung cache cũ.

## Cấu trúc dự án

```text
src/
  app/                  Route, layout và API của Next.js
    admin/              Không gian giám khảo
    student/            Không gian học viên
    api/                API cho kịch bản và bài nộp
  components/
    vor/                PMDT và workflow VOR
    dme/                PMDT và workflow DME
    qcms/               Dashboard QCMS ADS-B
    terminal/           Terminal SA/MA mô phỏng
    hardware/           Sơ đồ và bài chẩn đoán phần cứng
    grading/            So sánh thao tác và kết quả chấm điểm
  lib/                  Domain model, engine, storage và Supabase mapping
  stores/               Zustand stores theo từng module
supabase/
  migrations/           Schema, policy, migration và seed data
tests/                  Unit, component, integration và E2E tests
public/                 Tài nguyên tĩnh được commit
doc/                    Manual, kế hoạch và tài liệu kỹ thuật cục bộ (gitignored)
```

## Quy tắc mô phỏng

- VOR và DME ghi lại các màn hình/checkpoint học viên đã truy cập nhưng không tự quyết định điểm cuối cùng.
- ADS-B chấm điểm theo số bước đúng, đúng thứ tự và không có thao tác thừa.
- Phiên terminal ADS-B chấp nhận `sysadmin` và `maintenance`; thí sinh có thể đăng xuất rồi đổi tài khoản trong cùng một phiên mà không làm mất mode hoặc cấu hình máy thu.
- Đăng nhập không phải là một phần của đáp án chấm điểm.
- `RETURN`, phím Enter rỗng và `0` được chuẩn hóa thành cùng một hành động; `x`/`X` đăng xuất tài khoản hiện tại và đưa terminal trở lại dấu nhắc `login:`.
- Working copy ADS-B của từng thí sinh được lưu theo phiên trong cache trình duyệt; dữ liệu chuẩn của trình giả lập Admin chỉ thay đổi trong bộ nhớ và được khôi phục khi khởi động lại phiên.
- Các sơ đồ phần cứng là mô hình tương tác do dự án xây dựng từ tài liệu tham chiếu, không phải ảnh sao chép từ manual nhà sản xuất.

## Tài liệu tham chiếu

Manual nhà sản xuất, sơ đồ hệ thống và tài liệu triển khai nội bộ nằm trong thư mục `doc/`. Thư mục này được Git bỏ qua để tránh đưa tài liệu có thể bị giới hạn bản quyền hoặc dữ liệu nội bộ lên repository.

Các tài liệu chính gồm:

- QCMS User Manual.
- Sensor SA/MA User Manual.
- VOR và DME PMDT User Manual.
- MOPIENS 220 DVOR Technical Manual và bộ ảnh PMDT tham chiếu.
- MOPIENS 320 DME Technical Manual.
- Sơ đồ hệ thống, sơ đồ khối và kế hoạch triển khai mô phỏng.

Khi kế hoạch nội bộ và manual nhà sản xuất khác nhau, manual là nguồn tham chiếu ưu tiên.

## Roadmap

### Ưu tiên 1 — Hoàn thiện quản trị và bảo mật

- Bổ sung màn hình quản trị hồ sơ, cấp/thu hồi vai trò và vô hiệu hóa tài khoản.
- Thêm audit log cho đăng nhập, đổi vai trò, thay đổi kịch bản và chấm điểm.
- Bổ sung CAPTCHA/rate limiting theo IP cho đăng ký, đăng nhập và quên mật khẩu.
- Đánh giá nâng cấp Supabase để dùng Password Verification Hook nếu cần khóa đăng nhập ở cấp Auth thay vì chỉ tại ứng dụng.

### Ưu tiên 2 — Quản lý đào tạo và báo cáo

- Lưu lịch sử phiên học và trạng thái tiến độ thống nhất cho cả ba module.
- Bổ sung dashboard thống kê theo học viên, thiết bị, kịch bản và thời gian.
- Xuất báo cáo kết quả và lưu vết thao tác của giám khảo.
- Quản lý lớp học, nhóm học viên và lịch tổ chức bài kiểm tra.

### Ưu tiên 3 — Độ tin cậy dữ liệu

- Chuẩn hóa cơ chế đồng bộ Supabase/`localStorage` giữa các module.
- Xử lý xung đột, retry, trạng thái offline và thông báo lỗi đồng bộ rõ ràng.
- Thêm versioning, import/export và sao lưu/khôi phục kịch bản.
- Bổ sung audit log cho các thay đổi quan trọng.

### Ưu tiên 4 — Mở rộng mô phỏng

- Mở rộng các màn hình và luồng menu VOR, DME, ADS-B theo manual đã đối chiếu.
- Bổ sung fault preset, topology và tiêu chí chẩn đoán cho nhiều cấu hình thiết bị/site.
- Chuẩn hóa tiêu chí chấm điểm giữa phần thao tác PMDT, phần cứng và câu trả lời kỹ thuật.
- Mở rộng kiểm thử E2E, accessibility, hiệu năng và quan sát lỗi production.

## Session Log
- [2026-08-16] Hoàn thiện logic PMDT cho DVOR 1150, DVOR 1150A và DME 1119A: bật Local là chỉnh/Apply cấu hình trực tiếp, còn Bypass chỉ ngăn automatic transfer nhưng vẫn giữ Alarm; automatic transfer chỉ thực hiện một lần, nếu máy dự phòng cũng Alarm thì tắt cả hai để tránh vòng lặp TX1↔TX2. Đồng bộ Sidebar theo Main logic và đường Antenna thực tế (kịch bản failover hiển thị Main TX1 xanh, OFF TX1 đỏ, Antenna TX2 xanh), đồng thời cải thiện nền sáng cho checkbox/radio. Bổ sung targeted tests cho Local/Bypass, transfer, shutdown và no-loop; 7 file đạt 98/98, production build Next.js 16.2.11 thành công với 68 route, CodeGraph đã sync và `git diff --check` đạt.
- [2026-08-16] Dọn dữ liệu cấu hình PMDT đã lưu theo `user_id` trong Supabase: cập nhật 4 snapshot user của DVOR 1150A/DME 1119A và 18 bản ghi history, thay toàn bộ chuỗi nhận diện Tuy Hòa/`TUH`/`117X` cũ bằng `TST`; DVOR 1150 không có bản ghi legacy. Thêm migration `202608160001_cleanup_user_pmdt_station_defaults.sql` để các môi trường khác áp dụng cùng quy tắc, giữ nguyên channel/frequency dạng số.
- [2026-08-16] Chuẩn hóa dữ liệu mặc định nhận diện trạm của PMDT DVOR 1150A và DME 1119A từ Tuy Hòa/`TUH`/`117X` sang `TST`; cập nhật tên trạm, mã Ident, snapshot/fallback giao diện và bỏ logic tự sinh lại tên Tuy Hòa khi đổi kênh. DVOR 1150 đã dùng default tổng quát nên không cần đổi. Quality gate: 6 file test liên quan đạt 67/67; production build Next.js 16.2.11 thành công với 68 route.
- [2026-08-13] Hiệu chỉnh trang khám phá sơ đồ khối DME 1119A tại `/simulator/dme-1119a/block-diagram` theo manual 571118A-0001 Rev. M: chỉ giữ cấu hình Dual High Power và cabinet Front/Rear; bổ sung Preselector trước LNA trên tuyến thu, tách nhãn Circulator và tinh chỉnh đường tín hiệu/mũi tên để không còn chồng lấn. Dựng lại hai cabinet theo Figure 1-3/Figure 1-4 với đúng tỷ lệ, vị trí LCU, HPA, tám assembly low-power, 1A24/1A25, AC Monitor 1A22, RF/backplane, BCPS và status display 1A26; LCU mặt trước bám Figure 3-54 và toàn bộ hotspot được hiệu chỉnh theo cùng hệ tọa độ SVG. Bổ sung regression test cho topology tuyến thu, hai bề mặt cabinet, mapping assembly/hotspot và thao tác chọn Preselector/LNA. Quality gate: `tests/hardware-diagrams.test.tsx`, `tests/dme/dme1119a-block-diagram-data.test.ts` và `tests/dme/dme1119a-block-diagram.test.tsx` đạt 14/14; production build Next.js 16.2.11 thành công với 68 trang static được tạo.
- [2026-08-13] Bổ sung trang khám phá sơ đồ khối ADS-B ngoài trời tại `/simulator/ads-b/block-diagram` theo COMSOFT Quadrant Hardware and Installation Guide V1.5: dựng SVG tương tác cho mô hình lắp đặt mast/shelter Figure 20 và topology dẫn xuất từ Figure 2, phân biệt rõ luồng RF, GPS/NMEA timing, LAN/data, AC/DC power và protective ground. Catalog chuẩn hóa tám thiết bị hoặc điểm kết nối gồm antenna 1090 MHz, antenna amplifier tùy chọn, lightning protector được khuyến nghị, GPS Receiver có điều kiện, Quadrant Sensor, nguồn AC tại site, bộ nguồn 24 VDC tùy chọn và LAN switch/router; chọn block hoặc hotspot sẽ đồng bộ highlight và mở hình thiết bị, đúng thứ tự năm connector Sensor, giới hạn chiều dài cáp, ghi chú kỹ thuật cùng nguồn manual. Giữ riêng cấu hình outdoor tổng quát với cấu hình rack indoor Con Son, không công khai ảnh/manual proprietary; bổ sung CTA từ card ADS-B, thao tác chuột/bàn phím, thông báo selection cho assistive technology và reduced-motion. Quality gate: `tests/adsb/block-diagram-data.test.ts`, `tests/adsb/block-diagram.test.tsx` và `tests/layout/home-page.test.tsx` đạt 13/13; production build Next.js 16.2.11 thành công và nhận route mới.
- [2026-08-13] Bổ sung trang khám phá sơ đồ khối DME 320 tại `/simulator/software/dme-320/block-diagram` theo Technical Manual 320 DME (2022-12-19): dựng cabinet Front/Rear Rev. A có hotspot đồng bộ, giữ đúng hai AC/DC được lắp, và năm sơ đồ tương tác Tổng thể, TX/RF, Monitor, Control, Power. Catalog ánh xạ đầy đủ 78 occurrence cabinet/schematic cho hai transponder, MON1/MON2, nguồn và chuỗi RF; chọn block sẽ mở đúng bề mặt, vị trí LRU, dữ liệu manual và một trong 17 loại faceplate, gồm các assembly RF phía sau. Bổ sung waveform Figure 6-4 dạng WebP local, CTA từ card DME 320, thao tác chuột/bàn phím và ghi chú rõ các xung đột nhãn/part number giữa ảnh cabinet, hình kỹ thuật và phần mô tả của manual. Quality gate: `tests/dme320/block-diagram-data.test.ts` cùng `tests/layout/home-page.test.tsx` đạt 7/7; production build Next.js 16.2.11 thành công và nhận route mới.
- [2026-08-12] Bổ sung trang khám phá sơ đồ khối DVOR 220 tại `/simulator/software/dvor-220/block-diagram` theo Technical Manual 220 DVOR (2024-03-20): dựng SVG tương tác cho cabinet Front/Rear, ASU và năm sơ đồ Tổng thể, Máy phát & RF, Monitor, ASU, Nguồn & điều khiển; chọn trực tiếp occurrence TX1/TX2 trên sơ đồ sẽ tự chuyển bề mặt và làm sáng đúng LRU, còn chọn cabinet mở faceplate cùng dữ liệu manual. Hoàn thiện catalog các khối LMI/CSP/control, CMA/SMA/SYN/MON/MSG, PDC/PMU/AC-DC, RF/antenna/field monitor; dựng faceplate đúng tỷ lệ theo từng loại và bổ sung 12 waveform gốc từ manual dưới dạng WebP local. Card DVOR 220 có CTA mở trang sơ đồ khối; không công khai manual hoặc tải media lên storage từ xa. Quality gate: targeted tests đạt 6/6, `npm run typecheck` và production build Next.js 16.2.11 thành công với 66/66 route.
- [2026-08-12] Bổ sung trang khám phá sơ đồ khối DME 1119A tại `/simulator/dme-1119a/block-diagram` theo manual 571118A-0001 Rev. M: dựng SVG cabinet Front/Rear/Side và hai chế độ Figure 1-10/Figure 2-4 từ topology DME dùng chung; chọn trực tiếp block để tự chuyển mặt cabinet và làm sáng đúng LRU riêng cho TX1/TX2. Dựng faceplate tĩnh đúng tỷ lệ cho LCU, HPA, LPA/Synthesizer, RTC, Monitor/Interrogator, RMS, Facilities cùng các assembly nguồn/RF/interface; bổ sung mô tả, chỉ thị, connector, test point và sáu waveform Figure 7-7 đến 7-12. Card DME 1119A có CTA mở trang sơ đồ khối; media dẫn xuất được giữ local, không công khai manual. Đã kiểm tra trực quan desktop/mobile và các ánh xạ HPA1→Front/1A3, LNA→Side/1A8A2, Interface/Ethernet→Rear/1A19; targeted tests đạt 9/9 và production build Next.js 16.2.11 thành công với 65/65 route.
- [2026-08-12] Bổ sung trang khám phá sơ đồ khối DVOR 1150 tại `/simulator/dvor-1150/block-diagram` theo Figure 1-4, Figure 1-5 và Figure 2-2 của manual Rev. F: cabinet điện tử và commutator rack dựng bằng SVG có hotspot, chọn trực tiếp block để làm sáng đúng vị trí module, hiển thị faceplate/dữ liệu bảo dưỡng và waveform Chapter 7. Hoàn thiện chuỗi Field Monitor Antenna → Field Detector → Monitor A8/A24 → SCIP/RMS; sửa active top navigation để chỉ Simulator sáng; bỏ hàng điều hướng thiết bị khỏi trang để giao diện gọn; mở rộng cột sơ đồ, tăng cỡ chữ và dời nhãn khỏi đường tín hiệu/mũi tên. Media đang dùng asset local có provenance manual; chưa tải manual hoặc media lên storage công khai. Đã kiểm tra trực quan desktop/breakpoint hẹp, console không lỗi; `tests/layout/app-shell.test.tsx` đạt 9/9 và production build Next.js 16.2.11 thành công với 64/64 route.
- [2026-08-12] Hoàn thiện phần chi tiết phần cứng của trang sơ đồ khối DVOR 1150A: dựng lại bằng SVG/React các faceplate BCPS, Carrier Amplifier, Monitor CCA, RMS, Synthesizer, Audio Generator, RF Monitor và Sideband theo Figure 3-64 đến Figure 3-73, giữ tỷ lệ riêng của từng card, nhãn/điểm đo/connector/part number và loại bỏ callout ngoài panel của RMS. Thay thanh VOLUME trên LCU bằng núm vặn kim loại nhưng giữ nguyên input range và hành vi. Bổ sung skill tái sử dụng `skills/build-simulator-block-diagrams` gồm workflow, tài liệu tham chiếu và script render manual/kiểm kê ảnh. Đã kiểm tra trực quan desktop/mobile, console không lỗi, skill qua `quick_validate` và production build Next.js 16.2.11 thành công với 63/63 route.
- [2026-08-12] Bổ sung trang khám phá sơ đồ khối DVOR 1150A tại `/simulator/dvor-1150a/block-diagram`: liên kết từ thẻ simulator, cabinet trước/sau có hotspot đồng bộ với Figure 2-2/2-3, hiển thị vị trí cụm đang chọn và chi tiết module theo manual. Dựng lại LCU dạng HTML/CSS với logic MAIN/ANTENNA/OFF đã xác nhận; rà lại điện áp Synthesizer và Sideband; bổ sung waveform đo thực tế cho Sideband TP2/TP8, Monitor J3/TEST và Carrier Amplifier P1 CSB Sample dưới dạng thumbnail/lightbox. Chuẩn hóa bề rộng rear cabinet theo front cabinet bằng phép biến đổi hình học dùng chung cho ảnh và hotspot, giữ nguyên topology kỹ thuật. Đã kiểm tra trực tiếp desktop/mobile, chuyển tab, hotspot, lightbox/Escape và console; bỏ qua test/build vì đây là thay đổi UI tĩnh theo pipeline dự án.
- [2026-08-11] Bổ sung CTA nhỏ **Mở simulator** ở giữa mỗi thẻ khả dụng trong carousel trang chủ; thẻ chưa sẵn sàng hiển thị trạng thái **Đang hoàn thiện** và không tạo liên kết rỗng. Tách vùng chọn thẻ và CTA để giữ HTML/accessibility hợp lệ, đồng thời bảo toàn thao tác kéo/xoay carousel. Khắc phục lỗi `Unexpected token '<'` khi mở simulator bằng cách loại `/api/*` khỏi Proxy, giúp Route Handler trả JSON trực tiếp thay vì trang 404 HTML. Cập nhật `tests/layout/home-page.test.tsx` theo carousel và CTA hiện tại; targeted test đạt 2/2, production build Next.js 16.2.11 đạt (62/62 route).
- [2026-08-11] Đồng bộ trang `/login` với nhận diện tối của CNS Simulation Lab: logo ATTECH, nền CNS, panel kính gọn và các form Đăng nhập, Đăng ký, Quên mật khẩu, OTP, Đặt mật khẩu mới theo phong cách tối giản. Form đăng ký kiểm tra email ATTECH phía server khi rời ô nhập và kiểm tra lại khi gửi form; email đã tồn tại hiển thị liên kết trực tiếp đến Quên mật khẩu. Bổ sung test cho email trùng. Quality gate: `tests/auth/login-actions.test.ts` 3/3 đạt, production build Next.js 16.2.11 đạt (62/62 route).
- [2026-08-11] Thiết kế lại trang chủ **CNS Simulation Lab** theo hướng landing page tối, nhận diện ATTECH: menu ngang được căn giữa trên header, dark mode là mặc định, hero CBTA rút gọn và thêm trang `/about`. Thay danh sách thiết bị bằng carousel 360° cho 8 simulator, hỗ trợ kéo/lăn chuột/phím mũi tên mà không cuộn trang; thẻ đang chọn nổi bật và đồng bộ ảnh catalogue xuống phần mô tả chi tiết. Dùng cùng bộ icon cho tab Simulator và Ôn tập. Sáu ảnh catalogue được import tĩnh để Next.js tạo URL content-hash, giúp thay ảnh cùng tên nhận bản mới sau HMR/refresh thay vì giữ cache optimizer cũ. Production build Next.js 16.2.11 đạt (62/62 route).
- [2026-08-10] Tối ưu correlation engine 5 simulator: DVOR 1150A nối Voice Modulation → Deviation, Single/Dual TX/monitor, automatic transfer khi nhả Bypass và giữ station IDENT khi TX2 takeover; DVOR 1150 giữ invariant On-Air/Load và loại Monitor 2 khỏi voting trong Single Monitor; DME 1119A loại monitor bypass khỏi transfer vote; DVOR 220 khởi tạo/cô lập đúng Single Equipment và standby monitor; DME 320 tự rebase giới hạn phụ thuộc channel. Ghi backlog RF/calibration chưa có specification vào `TODO.md`. Quality gate: 62/62 targeted tests, `npm run typecheck` và `npm run build` đạt.
- [2026-08-10] Rà soát và bổ sung chương kiến trúc/ma trận CONFIG → DERIVED theo code as-built: registry/route/component/store/engine/snapshot, lifecycle legacy và MOPIENS, ma trận bốn tầng source → formula → measurement → alarm/action cho DVOR 1150A, DVOR 1150, DME 1119A, DVOR 220 và DME 320; ghi rõ thứ tự override/fault, invariant, phạm vi từng TX/Monitor và các field hiện mới validation/display hoặc chưa nối automatic action.
- [2026-08-10] Bổ sung Parameter Change history cho DVOR 1150A, DVOR 1150, DVOR 220, DME 1119A và DME 320: ghi từng field thay đổi sau Apply rồi Backup/Profile Save, hydrate lại theo application user từ `user_simulator_config_history`, bổ sung màn hình Parameter Change cho MOPIENS và sửa layout bảng 5 cột của DVOR 1150A. ADS-B không hiển thị màn hình này. Quality gate: 188/188 test, `npm run typecheck` và `npm run build` đạt.
- [2026-08-10] Mở rộng persistence cấu hình theo user ID cho các simulator DVOR 1150, DVOR 220, DME 320 và ADS-B. Supabase bổ sung `backup_config`, RPC ghi `apply`/`restore`/`backup`/`flash-save`, revision/history; frontend hydrate khi mở simulator và lưu sau Apply, Backup/Restore, Profile Save hoặc Power-cycle. Migration `202608100002_extend_simulator_config_backup.sql` đã được áp dụng lên remote Supabase. Đồng thời sửa route recovery password để POST Server Action `/login` không bị proxy redirect thành `307`.
- [2026-08-10] Bổ sung **System → Simulation Parameters...** cho MOPIENS 220 DVOR và 320 DME: chọn Monitor/Channel, chỉnh raw measurement values, Apply và Reset to Defaults. DVOR 220 thêm measurement override vào engine; DME 320 tái sử dụng override hiện có và xóa override khi reboot. Tính năng chưa lưu persistence theo yêu cầu để chờ triển khai đồng bộ toàn bộ simulator. Test ảnh hưởng trực tiếp: **27/27 đạt**; `npm run build` thành công.
- [2026-08-10] Căn giữa lại các trang PMDT `/simulator/dvor-1150a` và `/simulator/dme-1119a` theo DVOR 1150; tách `/simulator/ads-b` khỏi AppShell, đặt terminal trong trang độc lập có khung căn giữa và điều chỉnh chiều cao khi không còn navigation chung. Test `tests/layout/app-shell.test.tsx`: **9/9 đạt**; `npm run build` thành công.
- [2026-08-10] Tinh chỉnh trang chủ và tab `Simulator`: đưa `CNS Simulation Lab` lên header, rút gọn mô tả, thay khu vực mô phỏng trên trang chủ bằng 8 thẻ icon nhỏ có liên kết trực tiếp đến simulator tương ứng, đồng thời dùng ảnh trong `public/images/simulator-icons` cho cả thẻ trang chủ và catalog Simulator với kích thước phù hợp. Giữ nguyên registry, trạng thái và route của từng module. Cập nhật test layout theo dashboard mới; `npm run typecheck`, production build và targeted layout tests đạt `13/13`.
- [2026-08-10] Khắc phục các lỗi hiển thị chung của shell MOPIENS PMDT trên `/simulator/software/dvor-220` và `/simulator/software/dme-320`: giữ focus đúng ô Password khi nhập, hiển thị brand/title bar không bị bóp, sửa cột icon rỗng để label sidebar không còn thành `H...`/`E...`, và tách selector icon của các section đáy để `Maintenance`, `History Log`, `Administrator Logout` không bị cắt. Test trực tiếp `tests/mopiens-pmdt/presentation.test.tsx`: **8/8 đạt**; không chạy build vì đây là thay đổi UI/CSS nhỏ.
- [2026-08-10] Hoàn thiện hai simulator MOPIENS 220 DVOR và 320 DME tại `/simulator/software/dvor-220` và `/simulator/software/dme-320`: PMDT/LMI dùng chung state thiết bị, security Level 0–3, Local/REM/MAINT, Draft/Running/Profile, dual transmitter/transponder routing, monitor voting, timed alarm/changeover/shutdown, power/environment, calibration/certification, fault injection và history. DME bổ sung BITE Monitor Self-Test cùng Figure 4-114 Squitter/IDENT/RF Loopback/Spacing; sửa shutdown cause để thermal restart không hồi sinh TX bị monitor khóa. Hai engine MOPIENS tách hoàn toàn khỏi SELEX. Quality gate: 21 file, 103/103 test, targeted ESLint, typecheck và production build đạt; HTTP smoke check hai route trả 200. Browser backend không khả dụng nên visual QA desktop/narrow được ghi là bước xác nhận thủ công còn lại.
- [2026-08-09] Xây dựng DVOR 1150 Simulator độc lập theo mục 3.4 của `doc/DVOR1150/DVOR 1150.pdf`: bổ sung route `/simulator/dvor-1150`, PMDT shell/sidebar/menu/login, RMS/Monitor/Transmitter/Diagnostics core, state/config engine riêng, derived CONFIG → MONITOR, chuyển TX1/TX2, Integral Monitor Bypass, Apply/Need Backup/Config Backup/Restore và Reset (F8). Đồng hồ chạy theo thời gian thực; pre-login che Connected/tham số/đèn trạng thái; menu nhiều cấp mở sang phải. Quality gate trực tiếp: 15/15 test, `npm run typecheck`, `npm run build` đạt.
- [2026-08-09] Rà soát QA theo các mục 3.4.2.3.1, 3.4.2.7, 3.4.2.10 và 3.4.2.16 của manual Model 1150: khóa mọi control cấu hình và Apply khi chưa bật Integral Monitor Bypass; hiển thị lỗi Apply; cho phép Output Power mô phỏng đến 250 W để phục vụ kịch bản huấn luyện; nối Nominal Output Power với Carrier, SBO/sideband, RF Level và nối Azimuth/Voice/Reference với monitor. Kiểm tra lại đạt 15/15 test, `npm run typecheck` và `npm run build`.
- [2026-08-09] Hoàn thiện luồng chỉnh sửa CONFIG trực tiếp trên các màn hình DME 1119A: giá trị có thể xoá/nhập lại, stage vào `configDraft`, Apply (F7) áp dụng và phát sinh Need Backup. Bổ sung Reset (F8) khôi phục factory default tương tự DVOR, còn RMS > Config Restore khôi phục bản Config Backup; cả hai thao tác khôi phục đều xoá Need Backup.
- [2026-08-09] Hoàn thiện mapping CONFIG → MONITOR cho DME 1119A theo `doc/DME1119A/1119A-0001M.pdf`: channel Table 9-5, delay/spacing integrity, PRF/dead-time/SDES-LDES, propagation, PA/ident, monitor offsets/ERP/VSWR và voting/transfer. Tách độc lập `TX1 Power Output Scale`/`TX2 Power Output Scale`, kiểm tra Apply/Need Backup/Config Backup và transfer sau khi đổi từng máy; giữ nguyên engine DVOR 1150A.
- [2026-07-20] Hoàn thành tích hợp toàn bộ các màn hình PMDT của VOR và DME còn thiếu theo tài liệu `PMDT Capture.docx`.
- [2026-07-20] Khắc phục lỗi crash runtime trên trình duyệt khi giám khảo nhấn "Áp dụng" (Apply) ghi đè trị đo lường bằng cách bổ sung metadata data attributes và lập trình phòng thủ `Number(value).toFixed(...)`.
- [2026-07-20] Tinh gọn lựa chọn màu/trạng thái sự cố trong Author Panel của VOR và DME chỉ còn: Giữ nguyên, Màu xanh, Màu vàng, Màu đỏ, Màu xám. Tích hợp bộ map tự động thông minh trong Store giúp tương thích ngược hoàn toàn và loại bỏ khả năng lỗi crash.
- [2026-07-20] Xử lý triệt để lỗi hiển thị checkbox bị mờ xám đè màu (General Alerts, Config Layout...) bằng cách dùng `readOnly` + `pointer-events-none` thay thế cho `disabled` và áp dụng CSS dynamic accent color / text color đồng bộ theo trạng thái sự cố.
- [2026-07-20] Cập nhật giao diện danh sách kịch bản VOR và DME trên Dashboard Giám khảo: Loại bỏ thông tin số lượng cảnh báo PMDT và thay thế bằng hiển thị số lượng bước kiểm tra PMDT, số lượng khối phần cứng gặp sự cố, cùng ngày tạo kịch bản được định dạng (`vi-VN`).
- [2026-07-20] Phát triển tính năng "In kết quả" bằng biểu tượng máy in tại danh sách thí sinh: Tích hợp Server Action phân tích bài làm (checkpoint VOR/DME, lệnh terminal ADS-B, phần cứng bị sự cố), thiết kế giao diện in ấn biểu mẫu hành chính A4 chuẩn có khu vực ký tên và dùng CSS `@media print` để ẩn phần mềm, xuất bản trang in vật lý đẹp mắt.
- [2026-07-20] Tối ưu hóa in ấn kết quả thi: Ẩn hoàn toàn tiêu đề trang (`ExamPageHeader`), thanh sidebar và thanh top-header của ứng dụng bằng các quy tắc `@media print` trong `app-shell.tsx` và `shared.tsx`. Khắc phục lỗi nhảy trang trắng thứ hai bằng cách loại bỏ các thuộc tính chiều cao cứng (`min-h-[297mm]`) và hạn chế đệm padding dư thừa. Loại bỏ các đường kẻ viền phân tách không cần thiết, thu gọn khoảng cách dòng kẻ quốc hiệu sát lên 50%, thiết lập font chữ Times New Roman (size 12) và lùi lề trái phần thân kết quả thêm 1cm. Đồng thời, tinh chỉnh cỡ chữ phần tên công ty (`11pt`) và tên nước (`11.5pt`) kết hợp `whitespace-nowrap` giúp tiêu đề nằm gọn gàng trên một dòng, không bị ngắt dòng. Bổ sung mục hiển thị văn bản trả lời chẩn đoán của thí sinh (Vị trí / sự cố nghi ngờ, Căn cứ chẩn đoán, Hướng khắc phục) trực tiếp từ database nộp bài. Khắc phục triệt để lỗi in lọt chữ "Chuyển đến nội dung chính" và cấu hình `break-inside: avoid` cho khu vực chữ ký để không bị cắt rời trang.
- [2026-07-20] Tinh chỉnh Custom Developer Workflow trong `AGENTS.md`: Cho phép bỏ qua chạy toàn bộ bộ test hoặc build đối với các chỉnh sửa giao diện/CSS tĩnh nhỏ nhằm tiết kiệm tài nguyên và thời gian, chỉ tập trung chạy các file test bị ảnh hưởng trực tiếp khi thay đổi logic.
- [2026-07-20] Mọi kiểm tra TypeScript, Linting và Production Build đều vượt qua thành công 100%. Đã commit và push code lên repository.
- [2026-07-21] Tinh chỉnh hiệu ứng đăng nhập thành công: Chỉnh thời gian xuất hiện (fade-in 0.5s), thời gian hiển thị (1.5s), loại bỏ fade-out để tránh lộ trang đăng nhập cũ. Tích hợp `router.prefetch` để tải ngầm trang chủ. Đồng thời sửa lỗi chữ nhảy bị đứng yên ở môi trường production bằng cách khai báo rõ `initial={{ y: 0 }}` cho Framer Motion.
- [2026-07-23] Bổ sung trình giả lập ADS-B chuẩn tại `/admin/ads-b/simulator`, hỗ trợ đăng nhập `sysadmin`/`maintenance`, tái sử dụng chung terminal engine với bài thi và giữ bộ dữ liệu chuẩn của Admin độc lập với working copy lưu trong cache trình duyệt của từng thí sinh.
- [2026-07-23] Tích hợp 12 kịch bản thực hành ADS-B Nội Bài; mở rộng workflow terminal, dữ liệu cảm biến, menu SA/MA và các màn hình kết quả theo tài liệu tham chiếu, gồm cấu hình hệ thống đầy đủ, trạng thái thiết bị, Surveillance Clients 20 dòng, thống kê client và Customisation ở Operational Mode.
- [2026-07-23] Chuẩn hóa giao diện terminal một màu, sửa luồng khôi phục Action Builder và cập nhật kiểm thử theo đặc tả mới. Kết quả xác nhận: 54 test liên quan vượt qua và `npm run build` thành công với Next.js 16.2.10.
- [2026-07-23] Hoàn thiện engine ADS-B theo mode: bổ sung menu System Statistics, Surveillance Clients, Customisation và End-to-End Test theo dữ liệu mẫu; tách rõ giao diện Operational/Maintenance và giữ kết quả thay đổi trong working copy của phiên thí sinh.
- [2026-07-23] Hoàn thiện bài 6-8: cấu hình IP có bước đăng nhập lại bằng IP mới và xác nhận; đổi tên máy thu; cấu hình SAC/SIC với toàn bộ danh sách UAP CAT21 trước dấu nhắc nhập.
- [2026-07-23] Cho phép chuyển `sysadmin` ↔ `maintenance` trong cùng phiên terminal. Lệnh `X` lưu trạng thái thiết bị rồi trở về `login:`, trong khi mode, IP, tên máy thu và SAC/SIC tiếp tục được giữ đến khi khởi động lại hoặc nộp bài.
- [2026-07-23] Kiểm tra phiên bản ổn định ADS-B: 58 test trực tiếp vượt qua và production build hoàn tất thành công với Next.js 16.2.10.
- [2026-07-23] Hoàn thiện bài 9-12 theo menu Quadrant thực tế: cấu hình Surveillance Client 20 dòng với UDP/TCP và loại bản tin; xuất cấu hình qua SCP; đặt ngưỡng RF End-to-End; lấy tọa độ Actual Position từ GPS Nội Bài (`21.212983`, `105.831922`, `29.900000`). Các bài đều kết thúc bằng việc đưa máy thu từ Maintenance về Operational.
- [2026-07-23] Bổ sung bài 13 xử lý lỗi xuất/nhập cấu hình bằng `Reset SSH Known Hosts`; mở rộng quy tắc seed để tự đồng bộ đủ 13 bài ADS-B vào dữ liệu hiện có mà không ghi đè kịch bản tự tạo.
- [2026-07-23] Chuẩn hóa menu `sysadmin` theo Operational/Maintenance, menu Configuration Import/Export, Configure End-to-End và General Settings của tài khoản `maintenance`; mọi thay đổi cấu hình tiếp tục được cô lập trong cache phiên thí sinh.
- [2026-07-23] Xác minh mốc bài 9-13: 57 test liên quan trực tiếp ở terminal engine, terminal templates và scenario store vượt qua; `npm run build` hoàn tất thành công với 40 route trên Next.js 16.2.10.
- [2026-07-23] Gỡ bỏ tích hợp Understand Anything khỏi dự án: xóa dữ liệu phân tích `.ua` và loại bỏ workflow liên quan khỏi `AGENTS.md` để giảm thời gian xử lý và mức sử dụng token.
- [2026-07-23] Khởi tạo CodeGraph cho 332 file nguồn, nâng cấp CLI lên `1.5.0` và bổ sung workflow `status → explore/impact → kiểm tra source → affected → sync` trong `AGENTS.md`. Database index được giữ cục bộ và loại khỏi Git.
- [2026-07-24] Đồng bộ bước 4/5 của trình tạo kịch bản ADS-B với engine mới: phiên đầu mặc định ở Operational Mode, cho phép `0/RETURN` quay lại menu sau khi đổi mode, cho phép `X` đăng xuất và chuyển `sysadmin` ↔ `maintenance` mà vẫn giữ trạng thái máy thu, đồng thời replay được đáp án qua nhiều tài khoản.
- [2026-07-24] Action Builder sử dụng đúng data profile của sensor mục tiêu nên terminal hiển thị chính xác version Nội Bài `1-14-1` hoặc version tùy chỉnh ở bước 2. Kết quả xác nhận cuối: toàn bộ 235 test vượt qua, production build thành công với 40 route trên Next.js 16.2.11 và `npm audit --omit=dev` không còn lỗ hổng; PostCSS/sharp được khóa ở phiên bản đã vá trong phạm vi dependency của Next.
- [2026-08-04] Nâng cấp hệ thống theme (Theme Switcher, Inline Script chống FOUC), tinh chỉnh App Shell layout, tối ưu giao diện Dashboard/QCMS/Exam và tái cấu trúc các module phần mềm (`src/modules/`, `/software/`). Kiểm tra TypeScript và build tĩnh 63/63 trang thành công 100%.
- [2026-08-04] Thiết lập cấu hình SSH Key độc lập (`id_ed25519_hainokinguyen`) cho repository `hainokinguyen-coder/cns-simulator.git`, kiểm tra kết nối SSH thành công và đã push toàn bộ mã nguồn lên branch `main` của GitHub.
