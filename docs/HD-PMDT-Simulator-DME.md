# Hướng dẫn duy trì PMDT Simulator DME

> Cập nhật: 17/07/2026  
> Thiết bị tham chiếu: SELEX Model 1118A/1119A DME, Rev. M, July 2014  
> Phạm vi: simulator, authoring, student workflow, examiner review và persistence riêng cho DME.

## 1. Nguồn tham chiếu

Nguồn chính là `DME.pdf` gồm 64 trang trích từ phần 3.5-3.7 của tài liệu thiết bị. Nội dung được đọc bằng text extraction và render toàn bộ trang để kiểm tra bố cục. Mười lăm ảnh người dùng cung cấp được dùng làm ưu tiên cho phạm vi màn hình đầu tiên:

1. Sidebar Status Panel.
2. Initial PMDT Screen.
3. RMS Status.
4. Monitor/Transmitter Status.
5. Alarms Log.
6. Maintenance Alerts Log.
7. Integral All Monitor Data.
8. Standby All Monitor Data.
9. Monitor Alarm Limits Configuration.
10. Decoder Test Results.
11. Monitor Offsets and Scale Factors.
12. Transmitter Data.
13. RTC Data.
14. Transmitter Nominal Configuration.
15. Transmitter Offsets and Scale Factors.

Tài liệu vendor không được sao chép vào source control. Giá trị mặc định đã được chuyển thành dữ liệu có kiểu trong `src/lib/dme-pmdt-defaults.ts`.

## 2. Nguyên tắc kiến trúc

DME là bounded module riêng. Không import types, defaults, store hoặc persistence của VOR/ADS-B.

```text
dme-pmdt-defaults.ts
        |
        v
dme-pmdt-store.ts -> overrides -> DME shell + screens
        |                              |
        +-> author -> scenario --------+
        +-> student -> events/answer --+
        +-> preview                    |
                                       v
                 localStorage + DME API + Supabase
                                       |
                                       v
                             examiner manual review
```

Các namespace chính:

- `src/lib/dme-*.ts`
- `src/stores/dme-*.ts`
- `src/components/dme/`
- `src/app/api/dme/`
- `public.dme_scenarios`
- `public.dme_submissions`

Không trích generic training engine cho tới khi hành vi VOR và DME được so sánh qua sử dụng thực tế.

## 3. Screen và view đang hoạt động

| Menu path | View |
|---|---|
| Home | `home` |
| RMS > Status > RMS Status | `rms-status-main` |
| RMS > Status > Monitor/Transmitter Status | `rms-status-monitor-tx` |
| RMS > Logs > Alarms | `rms-logs-alarms` |
| RMS > Logs > Maintenance Alerts | `rms-logs-maintenance` |
| Monitors > Data > Integral | `monitor-integral` |
| Monitors > Data > Standby | `monitor-standby` |
| Monitors > Configuration > Alarm Limits | `monitor-alarm-limits` |
| Monitor 1 > Test Results > Decoder | `monitor-1-decoder-results` |
| Monitor 2 > Test Results > Decoder | `monitor-2-decoder-results` |
| Monitor 1 > Offsets & Scale Factors | `monitor-1-offsets` |
| Monitor 2 > Offsets & Scale Factors | `monitor-2-offsets` |
| Transmitters > Data > Transmitter Data | `tx-data-main` |
| Transmitters > Data > RTC Data | `tx-rtc-data` |
| Transmitters > Configuration > Nominal | `tx-config-nominal` |
| Transmitters > Configuration > Offsets & Scale Factors | `tx-config-offsets` |

Các menu chưa có ảnh tham chiếu đủ rõ vẫn hiển thị disabled với `aria-disabled`, tooltip `Chưa khả dụng`, opacity và cursor phù hợp.

## 4. Quy tắc giao diện

- Shell dùng cùng mật độ và cấu trúc dark PMDT của VOR, tối thiểu 1024 x 720 px.
- Trong author mode, toàn bộ panel xây dựng kịch bản bên phải có vùng cuộn dọc riêng; danh sách checkpoint dài không được làm tăng chiều cao hoặc kéo theo nội dung simulator.
- Sidebar DME có hai transmitter, Integral/Standby monitor, và sáu tham số Delay, Spacing, Tx Power, ERP, Efficiency, PRF.
- Local, Integral Bypass và Standby Bypass là thao tác học viên có ghi event.
- Không hiển thị nhóm điều khiển Next (F5), Close (F6), Apply (F7), Reset (F8), Save hoặc Print trên toolbar chung.
- Update và Reset trong RMS Logs được giữ vì thuộc đúng màn hình log, không phải toolbar function-key.
- Mọi ô có thể inject sự cố phải có `data-dme-field-id`; nên kèm label, value, type và status.
- Indicator luôn có accessible text, không dùng màu làm tín hiệu duy nhất.

## 5. Field ID và override

Field ID là hợp đồng lưu trữ lâu dài. Ví dụ:

- `local`
- `monitors.integral.bypass`
- `sidebarParams.delay.value`
- `integralData.2.mon1Value`
- `alarmLimits.0.alarmHigh`
- `delayControl.rtc1.propagationDelay`
- `txConfigNominal.rtcParameters.powerOutput`

Không đổi ID hoặc thứ tự array đang lưu nếu chưa có migration/normalizer tương thích.

Các trạng thái:

- Indicator: `green`, `yellow`, `red`, `gray`.
- Parameter: `normal`, `warning`, `alarm`.

## 6. Workflow đào tạo

- Author chọn field trực tiếp trên PMDT, đặt value/status và đánh dấu checkpoint.
- Student mở view, thao tác sidebar, ghi chú từng event và nộp ba phần kết luận.
- Examiner xem thứ tự event, checkpoint, sidebar target, câu trả lời và nhập điểm 0-100 thủ công.
- Checkpoint hỗ trợ đọc bằng chứng, không tự quyết định điểm cuối cùng.

Routes:

- Admin dashboard: `/admin/dme`
- Preview: `/admin/dme-pmdt`
- Create/edit: `/admin/dme/create`, `/admin/dme/edit`
- Submissions: `/admin/dme/submissions`
- Student dashboard/session: `/student/dme`, `/student/dme/session`
- APIs: `/api/dme/scenarios`, `/api/dme/submissions`

## 7. Persistence

Local fallback:

- `cns-training:dme-scenarios`
- `cns-training:dme-submissions`

Supabase migration: `supabase/migrations/202607170001_create_dme_training.sql`.

Migration này tạo `dme_scenarios`, `dme_submissions`, indexes, RLS và temporary MVP policies. Migration đã được push vào Supabase project liên kết ngày 17/07/2026. Policies vẫn là cấu hình nội bộ tạm thời và phải thay khi triển khai authentication theo vai trò.

## 8. Verification baseline

Ngày 17/07/2026:

- ESLint: pass.
- TypeScript: pass.
- Vitest: 39 files, 167 tests pass.
- Next.js production build: pass, 31 routes.
- Playwright: 8/8 desktop/mobile Chromium flows pass.
- DME E2E kiểm tra dashboard, preview route, title/model, không có F5-F8 và điều hướng tới Standby data.

Khi thêm view mới, phải cập nhật đồng thời `DmeViewId`, default view mapping, menu/layout, scenario validator, submission validator, tests và file này.


## 9. Tùy chỉnh các trường RMS Logs theo kịch bản

Trong author mode, admin có thể chọn trực tiếp `Time Tag`, `Type`, `Alarm`/`Alert` và `State` tại `RMS > Logs`, nhập giá trị tình huống giả định và nhấn `Áp dụng`. Giá trị được lưu trong scenario overrides với field ID như `alarmLogs.0.timeTag`, `alarmLogs.0.type`, `alarmLogs.0.alarm`, `alarmLogs.0.state` và các field tương ứng trong `maintenanceLogs`.

`Time Tag` nhập theo định dạng `DD/MM/YYYY HH:mm:ss`. State của Alarms được giới hạn ở `Normal`, `Pre-Alarm`, `Primary Alarm Low`, `Alarm`; State của Maintenance Alerts được giới hạn ở `Normal`, `Pre-Alert`, `Alert`. Màu State được đồng bộ tự động.

Admin chỉ sửa các trường trên dòng có sẵn, không thêm hoặc xóa dòng. Khi student mở kịch bản và truy cập đúng màn hình RMS Logs, PMDT hiển thị toàn bộ giá trị đã lưu tại đúng dòng. Nếu màn hình log là bằng chứng bắt buộc, admin cần thêm view đó vào checkpoint trước khi lưu.

## 10. Bước 2 - Xác định phần cứng sự cố

- Admin chọn `Cấu hình` trong mục `Bước 2 - Phần cứng sự cố`, bật bước và đánh dấu một hoặc nhiều block đáp án trên sơ đồ `Dual High Power Overview`.
- Simulator cố định ở cấu hình **Dual High Power** của Model 1118A/1119A. Mỗi nhánh phát bắt buộc đi theo `Low Power Amplifier / Synthesizer -> High Power Amplifier -> RF Switch`; không mô hình hóa đường tắt của cấu hình low power.
- Antenna, directional coupler 30 dB, circulator, RF Switch, Load/Attenuator và Low-noise Amplifier là phần RF dùng chung. Hai bộ Monitor/Interrogator/Synthesizer theo dõi cả hai HPA để thể hiện giám sát chéo TX1/TX2.
- Tuyến hỏi đi từ Antenna qua Circulator/LNA tới RTC; tuyến trả lời đi từ RTC tới LPA/Synth, HPA, RF Switch, Circulator và Antenna. Mẫu coupler và đường tải giả được đưa về các monitor để phân tích công suất và kiểm tra máy dự phòng.
- Các khối RMS, LCU, PMDT, BCPS1/2, nguồn máy phát, battery, interface card, co-located ILS/VOR và RCSU được nối bằng các tuyến control/data/power riêng.
- Component ID DME có tiền tố `dme-`; không đổi ID khi đã có kịch bản lưu nếu chưa có migration tương thích.
- Student hoàn thành nhật ký/kết luận PMDT rồi chuyển sang workspace sơ đồ khối, đọc chức năng, chọn phần cứng nghi ngờ và ghi căn cứ. Có thể quay lại PMDT trước khi nộp.
- Examiner được đối chiếu đáp án kịch bản với lựa chọn student theo ba nhóm khớp, bỏ sót và chọn thêm; điểm cuối cùng vẫn chấm thủ công.
- Bước 2 là optional để giữ tương thích với scenario cũ. Nếu không có `hardwareTask`, workflow nộp bài không thay đổi.
- Dữ liệu cũ dùng ID tổng hợp `dme-bcps` được normalizer mở rộng thành `dme-bcps-1` và `dme-bcps-2` khi đọc scenario/submission.
- Migration `202607170002_add_vor_dme_hardware_diagnosis.sql` bổ sung `hardware_task` cho scenario và `hardware_answer` cho submission VOR/DME; migration đã được áp dụng lên Supabase project liên kết ngày 17/07/2026.
