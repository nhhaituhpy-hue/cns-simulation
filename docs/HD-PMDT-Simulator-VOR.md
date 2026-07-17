# Hướng dẫn duy trì và mở rộng PMDT Simulator VOR

> Tên file chuẩn: `HD-PMDT-Simulator-VOR.md`  
> Cập nhật gần nhất: 16/07/2026  
> Phạm vi: VOR PMDT Simulator – Dual DVOR 1150A  
> Mục đích: lưu ngữ cảnh kỹ thuật để Codex hoặc người phát triển khác có thể tiếp tục công việc mà không phải suy luận lại kiến trúc từ đầu.

## 1. Cách sử dụng tài liệu này

Khi bắt đầu một phiên làm việc liên quan đến VOR PMDT, phải đọc theo thứ tự:

1. File này để nắm kiến trúc và quy trình hiện hành.
2. `docs/VOR_PMDT_IMPLEMENTATION_GUIDE.md` để xem mô tả màn hình PMDT gốc.
3. `docs/VOR_PMDT_DEFAULT_DATA.md` để xem dữ liệu mặc định đã trích từ tài liệu/ảnh tham chiếu.
4. Code thực tế trong `src/components/vor`, `src/lib/vor-*` và `src/stores/vor-*`.
5. Các test trong `tests/vor`, `tests/state` và `tests/layout`.

Thứ tự ưu tiên khi có thông tin mâu thuẫn:

1. Yêu cầu mới nhất đã được người dùng xác nhận.
2. Code và test hiện đang chạy.
3. File hướng dẫn này.
4. Hai tài liệu VOR ban đầu.

Hai tài liệu ban đầu được viết trước khi có scenario engine, workflow học viên, chấm điểm và Supabase. Vì vậy không được xem chúng là mô tả đầy đủ của phiên bản hiện tại.

## 2. Mục tiêu nghiệp vụ phải giữ nguyên

Ứng dụng không mô phỏng toàn bộ phần mềm điều khiển PMDT thật. Đây là công cụ đào tạo quy trình chẩn đoán sự cố:

1. Admin mở chính giao diện PMDT mô phỏng.
2. Admin chọn các ô/tham số trên màn hình và đặt giá trị, trạng thái hoặc màu của tình huống sự cố.
3. Admin chọn các màn hình/tab quan trọng làm checkpoint tham khảo.
4. Admin có thể đặt thao tác sidebar cần thực hiện, hiện có Local và Bypass.
5. Học viên đọc đề bài, di chuyển qua menu/tab PMDT và thao tác trên sidebar.
6. Mỗi màn hình đã mở và mỗi thao tác sidebar được ghi vào nhật ký theo thứ tự.
7. Học viên có thể ghi chú cho từng thao tác, sau đó nhập:
   - vị trí hoặc sự cố nghi ngờ;
   - căn cứ chẩn đoán;
   - hướng khắc phục.
8. Giám khảo đọc toàn bộ bằng chứng, đối chiếu checkpoint rồi nhập điểm và nhận xét thủ công.

Checkpoint và checklist thao tác chỉ hỗ trợ giám khảo. Hệ thống không tự quyết định điểm cuối cùng.

Ví dụ kịch bản mất công suất có thể yêu cầu học viên kiểm tra:

- `Transmitters > Data > Transmitter Data`;
- `RMS > Logs > Alarms` hoặc `Maintenance Alerts`;
- các tab khác do giám khảo lựa chọn;
- Local/Bypass nếu đó là thao tác cần thiết;
- sau cùng viết kết luận và hướng khắc phục.

## 3. Phạm vi module và nguyên tắc tách biệt

VOR, DME và ADS-B là ba module nghiệp vụ riêng.

- VOR dùng types, defaults, store, persistence, API và bảng Supabase riêng.
- Không đưa dữ liệu PMDT VOR vào model scenario ADS-B.
- DME sau này phải có namespace riêng, ví dụ `dme-types.ts`, `dme-pmdt-store.ts`, `components/dme`.
- Chỉ trích xuất thành component hoặc model dùng chung sau khi VOR và DME thực sự có cùng hành vi. Không tạo abstraction tổng quát quá sớm.

Route module hiện tại:

| Vai trò | VOR | DME | ADS-B |
|---|---|---|---|
| Admin | `/admin/vor` | `/admin/dme` | `/admin/ads-b` |
| Học viên | `/student/vor` | `/student/dme` | `/student/ads-b` |

`/admin` và `/student` mặc định chuyển sang VOR. Vì module nằm trong URL, tải lại trang sẽ giữ đúng module hiện tại.

## 4. Tech stack và quy tắc nền tảng

- Next.js 16 App Router.
- React 19.
- TypeScript, không dùng `any`.
- Tailwind CSS 4.
- Zustand 5 với `create` từ `zustand`.
- Phosphor Icons.
- Vitest và Testing Library; Playwright cho E2E.
- Supabase cho dữ liệu dùng chung, `localStorage` có version làm fallback.

Lưu ý quan trọng: phiên bản Next.js của dự án có thay đổi so với kiến thức Next.js cũ. Trước khi sửa routing, page, layout, metadata, navigation hoặc API route, phải đọc tài liệu tương ứng trong `node_modules/next/dist/docs/`.

Không cài thêm package nếu chức năng có thể thực hiện bằng stack hiện tại.

## 5. Kiến trúc hiện tại

Luồng dữ liệu tổng quát:

```text
vor-pmdt-defaults.ts
        │
        ▼
vor-pmdt-store.ts ── overrides ──► PMDT shell + screens
        │                                │
        ├── author mode ─► scenario ─────┤
        ├── student mode ─► events/answer│
        └── preview mode                 │
                                         ▼
                         localStorage fallback + API + Supabase
                                         │
                                         ▼
                              examiner review/manual score
```

### 5.1 Lớp dữ liệu và hợp đồng

| File | Trách nhiệm |
|---|---|
| `src/lib/vor-types.ts` | Toàn bộ types của dữ liệu PMDT, scenario, checkpoint, event và submission |
| `src/lib/vor-pmdt-defaults.ts` | Dữ liệu PMDT bình thường; cung cấp bản clone mới cho mỗi session |
| `src/lib/vor-menu-structure.ts` | Cây menu, trạng thái enabled/disabled và ánh xạ menu sang screen |
| `src/lib/vor-sidebar-fields.ts` | Danh sách thao tác sidebar được chấm; hiện có Local và Bypass |
| `src/lib/vor-scenario-storage.ts` | Validation, version và ánh xạ scenario với database |
| `src/lib/vor-submission-storage.ts` | Validation, version và ánh xạ submission với database |

### 5.2 Runtime simulator

| File | Trách nhiệm |
|---|---|
| `src/stores/vor-pmdt-store.ts` | Screen/view hiện tại, mode, overlay, checkpoint, nhật ký, câu trả lời |
| `src/components/vor/pmdt-layout.tsx` | CSS Grid shell và screen router |
| `src/components/vor/pmdt-menu-bar.tsx` | Menu PMDT và navigation cấp screen |
| `src/components/vor/pmdt-sidebar.tsx` | Trạng thái bên trái, field metadata và thao tác Local/Bypass |
| `src/components/vor/screens/*` | Layout tab và nội dung từng màn hình |

Shell có độ rộng tối thiểu 1024 px và chiều cao tối thiểu 720 px để giữ mật độ thông tin gần phần mềm gốc. Responsive bên ngoài shell không được làm biến dạng bảng/ô PMDT.

### 5.3 Workflow theo vai trò

| Mode | Hành vi |
|---|---|
| `preview` | Xem PMDT, không ghi nhật ký học viên |
| `author` | Chọn field có `data-vor-field-id`, tạo override và checkpoint |
| `student` | Ghi sự kiện mở view, thao tác sidebar, ghi chú và câu trả lời |

Các component chính:

- Admin author: `src/components/vor/admin/vor-scenario-author.tsx`.
- Bảng điều khiển author: `src/components/vor/admin/vor-author-panel.tsx`.
- Phiên học viên: `src/components/vor/student/vor-student-session.tsx`.
- Nhật ký học viên: `src/components/vor/student/vor-student-journal.tsx`.
- Giám khảo: `src/components/vor/admin/vor-submission-review.tsx`.

## 6. Hợp đồng screen, view và navigation

`VorScreenId` đại diện cho màn hình cấp menu. `VorViewId` đại diện cho tab cụ thể bên trong màn hình.

Ví dụ:

```text
Screen: tx-data
├── View: tx-data-main
├── View: tx-status-1
├── Ground Check #1        disabled
├── Ground Check #2        disabled
└── Status Tx #2           disabled
```

Menu gọi `openScreen()`. Tab gọi `openView()`. Trong student mode, mỗi lần gọi tới view hợp lệ sẽ tạo một `VorAttemptEvent` loại `view`.

Các view đang hoạt động:

| Menu path | `VorViewId` | Component nội dung |
|---|---|---|
| Home | `home` | `home-screen.tsx` |
| RMS > Data > Maintenance Alerts/Alarms | `rms-maintenance-alerts` | `rms-maintenance-alerts.tsx` |
| RMS > Data > Digital I/O | `rms-digital-io` | `rms-digital-io.tsx` |
| RMS > Logs > Alarms | `rms-logs-alarms` | `rms-logs-alarms.tsx` |
| RMS > Logs > Maintenance Alerts | `rms-logs-maintenance` | `rms-logs-maintenance.tsx` |
| Monitors > Data > Integral | `monitor-integral` | `monitor-integral.tsx` |
| Monitors > Data > Sideband Antenna VSWR | `monitor-sideband-vswr` | `monitor-sideband-vswr.tsx` |
| Monitors > Configuration > Alarm Limits | `monitor-alarm-limits` | `monitor-alarm-limits.tsx` |
| Monitor 1 > Offsets & Scale Factors | `monitor-1-offsets` | `monitor-offsets.tsx` |
| Monitor 2 > Offsets & Scale Factors | `monitor-2-offsets` | `monitor-offsets.tsx` |
| Transmitters > Data > Transmitter Data | `tx-data-main` | `tx-data-main.tsx` |
| Transmitters > Data > Status Tx #1 | `tx-status-1` | `tx-status.tsx` |
| Transmitters > Configuration > Nominal | `tx-config-nominal` | `tx-config-nominal.tsx` |
| Transmitters > Configuration > Offsets & Scale Factors | `tx-config-offsets` | `tx-config-offsets.tsx` |

`disabled` là sentinel kỹ thuật, không phải checkpoint hợp lệ.

Các tab chưa có ảnh/nội dung vẫn phải hiển thị disabled, có `aria-disabled`, `opacity-50`, `cursor-not-allowed` và tooltip `Chưa khả dụng`. Không tự dựng nội dung kỹ thuật khi chưa có nguồn tham chiếu đủ rõ.

## 7. Default data, override và màu sắc

`VorPmdtData` là trạng thái PMDT bình thường. Không hardcode giá trị kỹ thuật trực tiếp trong JSX. Mọi giá trị mặc định phải vào `vor-pmdt-defaults.ts`.

Mỗi scenario chỉ lưu phần khác với mặc định:

```ts
interface VorFieldOverride {
  fieldId: string;
  value: string | number | boolean | null;
  status?: "green" | "yellow" | "red" | "gray" |
           "normal" | "warning" | "alarm";
}
```

Hai nhóm trạng thái không được trộn ý nghĩa:

- Indicator: `green`, `yellow`, `red`, `gray`.
- Ô tham số: `normal`, `warning`, `alarm`.

Màu chuẩn:

| Ý nghĩa | Màu/Background |
|---|---|
| Green | `#22c55e` / `#0f3a1f` |
| Yellow | `#eab308` / `#3a2f0f` |
| Red | `#ef4444` / `#3a0f0f` |
| Gray | `#6b7280` |

Mọi field có thể cấu hình phải đọc qua cả hai hàm khi phù hợp:

```ts
const value = resolveVorField(baseValue, fieldId, overrides);
const status = resolveVorStatus(baseStatus, fieldId, overrides);
```

Không sửa trực tiếp object default. `cloneDefaultVorPmdtData()` phải trả về dữ liệu độc lập cho session mới.

## 8. Field ID là hợp đồng lưu trữ lâu dài

Admin chọn field thông qua `data-vor-field-id`. `fieldId` được lưu vào scenario và Supabase, vì vậy đổi ID có thể làm hỏng kịch bản đã tạo.

Quy ước hiện tại:

| Loại | Ví dụ |
|---|---|
| Field đơn | `connected`, `alert`, `local` |
| Object lồng nhau | `monitorIntegral.bypass` |
| Sidebar parameter | `sidebarParams.azimuth.value` |
| Mảng | `txPower.0.tx1`, `txVswr.2.value` |
| Hai cột monitor | `integralData.0.mon1Value` |

Với mảng, index hiện là một phần của hợp đồng. Không đổi thứ tự các dòng default đã tồn tại nếu chưa có migration/normalizer cho scenario cũ. Khi có thể, dữ liệu mới nên dùng ID ổn định theo tên thay vì phụ thuộc index.

Metadata nên gắn đầy đủ trên phần tử được chọn:

```tsx
<td
  data-vor-field-id={fieldId}
  data-vor-field-label={label}
  data-vor-field-value={String(value)}
  data-vor-field-type={typeof value}
  data-vor-field-status={status}
>
  {displayValue}
</td>
```

Tối thiểu phải có `data-vor-field-id`. Tuy nhiên nên truyền đủ metadata để author không phải suy giá trị từ text đã format, đơn vị hoặc ký hiệu.

## 9. Local và Bypass – trường hợp tương tác đặc biệt

Local và Bypass vừa là field cấu hình, vừa là thao tác học viên:

- `local`
- `monitorIntegral.bypass`

Danh sách nguồn nằm trong `VOR_INTERACTIVE_SIDEBAR_FIELDS` ở `vor-sidebar-fields.ts`.

Trong author mode, admin đặt giá trị đích và màu, ví dụ `true + yellow`. Trong student mode, field bắt đầu từ trạng thái bình thường màu xám; chỉ sau khi học viên bấm thì mới chuyển tới trạng thái đích. Mỗi lần bấm tạo event loại `sidebar` gồm:

- `fieldId`;
- `resultValue`;
- `resultStatus`;
- vị trí màn hình hiện tại;
- thứ tự, thời gian và chú thích.

Giám khảo xét trạng thái của lần thao tác cuối cùng. Nếu học viên bật đúng rồi tắt lại, checklist phải hiển thị chưa hoàn thành.

Muốn bổ sung một thao tác sidebar mới:

1. Thêm ID vào `VOR_INTERACTIVE_SIDEBAR_FIELDS`.
2. Render field bằng button trong student mode.
3. Gọi `interactWithSidebar()` khi thao tác.
4. Bảo đảm author vẫn chọn được field bằng metadata.
5. Thêm test cho store, student workflow và examiner workflow.

## 10. Quy trình tiếp nhận ảnh chụp PMDT mới

Không dựa lâu dài vào đường dẫn attachment tạm của Codex. Khi nhận ảnh mới, nên lưu trong repository theo cấu trúc:

```text
docs/reference/vor-pmdt/
  rms-data-power-supply.png
  rms-data-temperature.png
  tx-data-status-2.png
  ...
```

Tên file dùng chữ thường, dấu gạch nối và phản ánh menu/tab. Không ghi thông tin nhạy cảm vào ảnh.

Với mỗi ảnh, bổ sung một bản ghi vào mục “Nhật ký ảnh tham chiếu” cuối file này:

| Thuộc tính | Nội dung cần ghi |
|---|---|
| File | Đường dẫn tương đối trong repository |
| Menu path | Ví dụ `RMS > Data > Power Supply Data` |
| Thiết bị/version | Model và phiên bản PMDT nếu biết |
| Kích thước ảnh | Width × height |
| Trạng thái thiết bị | Normal, alarm, local, maintenance... |
| Giá trị đọc được | Bảng giá trị và đơn vị |
| Hành vi | Tab, button, checkbox nào có thể thao tác |
| Chỗ chưa rõ | Text/màu/giá trị không đọc được; tuyệt đối không tự đoán |

Quy trình phân tích ảnh:

1. Xác định menu path và tab chính xác.
2. Đối chiếu bố cục chung với shell hiện tại; không dựng lại title/menu/sidebar trong screen con.
3. Liệt kê panel, bảng, cột, hàng, đơn vị, control và trạng thái màu.
4. Phân biệt dữ liệu mặc định với dữ liệu chỉ xuất hiện do lỗi tại thời điểm chụp.
5. Xác định field nào admin cần cấu hình trong kịch bản.
6. Xác định control nào học viên cần thao tác và có cần ghi event riêng không.
7. Ghi lại mọi thông tin chưa chắc chắn để hỏi người dùng.
8. Chỉ sau khi dữ liệu đã rõ mới sửa types/defaults/components.

Nếu ảnh bị cắt, mờ hoặc thiếu tab liên quan, dừng ở mức mô tả và yêu cầu ảnh bổ sung. Không tạo dữ liệu kỹ thuật giả để lấp chỗ trống.

## 11. Quy trình thêm một tab PMDT mới

Ví dụ sau dùng cho một tab đang disabled và nay đã có ảnh rõ.

### Bước 1 – Lập đặc tả từ ảnh

- Menu path và tên tab.
- Bố cục panel/table.
- Dữ liệu mặc định và đơn vị.
- Màu/trạng thái.
- Field có thể inject sự cố.
- Hành vi cần ghi nhận của học viên.

### Bước 2 – Mở rộng types

Trong `vor-types.ts`:

- thêm interface dữ liệu nếu cấu trúc mới;
- thêm property vào `VorPmdtData`;
- thêm `VorViewId`;
- chỉ thêm `VorScreenId` nếu cần một screen cấp menu mới.

### Bước 3 – Thêm default data

Trong `vor-pmdt-defaults.ts`:

- đặt toàn bộ giá trị bình thường;
- giữ đúng kiểu và đơn vị;
- cập nhật object `defaultVorPmdtData`;
- bảo đảm clone không chia sẻ reference có thể bị mutate.

### Bước 4 – Cập nhật store và validation

- Nếu thêm screen, cập nhật `defaultViews` trong `vor-pmdt-store.ts`.
- Thêm view mới vào `validViews` của cả `vor-scenario-storage.ts` và `vor-submission-storage.ts`.
- Nếu thêm screen, cập nhật `validScreens` của submission storage.
- Giữ backward compatibility cho dữ liệu đã lưu; nếu không thể, tăng storage version và viết migration/normalizer.

Đây là bước dễ bị quên nhất. View chạy được trên UI nhưng scenario hoặc submission có thể bị validator từ chối nếu thiếu cập nhật các danh sách trên.

### Bước 5 – Tạo screen component

- Đặt tại `src/components/vor/screens/`.
- Dùng `"use client"` nếu đọc Zustand/hooks.
- Đọc dữ liệu từ store.
- Áp dụng override bằng field ID ổn định.
- Thêm semantic HTML, caption/label và keyboard focus.
- Giữ file dễ đọc; nếu vượt khoảng 300 dòng, tách panel hoặc table con.

### Bước 6 – Kích hoạt tab/menu

- Thêm view vào layout tab tương ứng.
- Đổi `enabled: false` thành `true` chỉ khi screen đã hoàn chỉnh.
- `onClick` phải gọi `openView(screenId, viewId, menuPath, title)`.
- Nếu là menu cấp mới, cập nhật `vor-menu-structure.ts` và `PmdtScreenRouter`.

### Bước 7 – Authoring và grading

- Gắn metadata cho mọi field admin cần sửa.
- Kiểm tra author có thể đặt cả value và status.
- Kiểm tra view có thể thêm làm checkpoint.
- Nếu có thao tác thật, xác định event type và logic đối chiếu cho giám khảo.

### Bước 8 – Tests

Tối thiểu cần:

1. Test render dữ liệu mặc định của tab.
2. Test disabled → enabled và navigation đúng view.
3. Test override value/status.
4. Test author chọn field và lưu scenario.
5. Test student mở view và event được ghi.
6. Test submission validator chấp nhận view mới.
7. Test examiner nhìn thấy checkpoint/event.

### Bước 9 – Verification

Chạy:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Khi có môi trường trình duyệt:

```bash
npm run test:e2e
```

Kiểm tra thêm ở kích thước desktop chuẩn của PMDT và xác nhận F5 vẫn giữ đúng route module.

## 12. Persistence và Supabase

VOR dùng hai localStorage key có version:

- `cns-training:vor-scenarios`;
- `cns-training:vor-submissions`.

Supabase dùng hai bảng riêng:

- `public.vor_scenarios`;
- `public.vor_submissions`.

Migration gốc: `supabase/migrations/202607160003_create_vor_training.sql`.

Scenario lưu `overrides` và `expected_checkpoints` bằng JSONB. Submission lưu `events` và `answer` bằng JSONB. Vì vậy thêm field hoặc view tương thích thường không cần đổi schema SQL, nhưng phải cập nhật TypeScript validator. Chỉ tạo migration mới khi thay đổi cột, constraint, index hoặc chính sách.

API:

- `/api/vor/scenarios`;
- `/api/vor/submissions`.

Biến môi trường:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Không ghi key thật vào repository. RLS hiện là chính sách MVP tạm thời cho phép truy cập rộng. Trước khi triển khai đăng nhập admin/user thật phải thay chính sách theo vai trò; không được coi cấu hình hiện tại là bảo mật production hoàn chỉnh.

## 13. Quy tắc giao diện không được quên

- Tiêu đề card admin hiện là `PMDT Simulator — DVOR 1150A`.
- Title bar mô phỏng vẫn thể hiện thiết bị Dual DVOR/SELEX theo giao diện tham chiếu.
- Sidebar nằm ngoài screen content và phải nhất quán ở mọi tab.
- Không khôi phục nhóm nút Save/Print/Next/Close/Apply/Reset ở toolbar chung; nhóm này đã bỏ để tránh nhầm với thao tác tạo kịch bản.
- Nút Update/Reset riêng trong RMS Logs vẫn được giữ vì thuộc đúng màn hình log và hiện chỉ mang tính mô phỏng.
- Disabled item phải có dấu hiệu ngoài màu sắc: `aria-disabled`, tooltip và cursor.
- Màu không được là tín hiệu duy nhất; cần text, label hoặc accessible name.
- Timestamp hiển thị theo `DD/MM/YYYY HH:mm:ss`.
- Input mô phỏng dữ liệu thiết bị nên read-only/disabled; control học viên được phép thao tác phải phân biệt rõ.

## 14. Những lỗi kiến trúc thường gặp

1. Hardcode giá trị trong JSX thay vì đưa vào defaults.
2. Chỉ thay value mà quên áp dụng status/color override.
3. Đổi field ID hoặc thứ tự array làm scenario cũ mất tác dụng.
4. Thêm `VorViewId` nhưng quên hai storage validator.
5. Mở tab bằng local state mà không gọi `openView()`, khiến học viên không có event.
6. Hiển thị mục tiêu Local/Bypass ngay từ đầu cho học viên, làm lộ thao tác cần thực hiện.
7. Tự chấm điểm hoàn toàn từ checkpoint, trái với workflow giám khảo đọc bài.
8. Dùng model VOR cho DME chỉ vì giao diện nhìn giống nhau.
9. Xóa local fallback khi Supabase lỗi.
10. Sửa route bằng kiến thức Next.js cũ mà không đọc docs của Next 16 trong project.

## 15. Kế hoạch tham khảo khi xây PMDT Simulator DME

Nên thực hiện theo các phase nhỏ:

### Phase D0 – Thu thập nguồn

- Ảnh shell, menu, sidebar và từng tab DME.
- Dữ liệu bình thường, alarm và đơn vị.
- Danh sách thao tác học viên cần ghi.
- Xác nhận model/version của thiết bị.

### Phase D1 – Domain riêng

- `dme-types.ts`.
- `dme-pmdt-defaults.ts`.
- `dme-menu-structure.ts`.
- `dme-pmdt-store.ts`.

### Phase D2 – Shell và screens

- `src/components/dme/`.
- Có thể sao chép pattern, nhưng không import types/data VOR.
- Chỉ dùng chung UI primitive thực sự không chứa thuật ngữ VOR/DME.

### Phase D3 – Training workflow

- Scenario override.
- Checkpoint/view event.
- Interactive control event.
- Student answer và examiner review.

### Phase D4 – Persistence

- localStorage version riêng.
- API riêng.
- `dme_scenarios` và `dme_submissions` hoặc schema đã được thiết kế rõ ràng.
- RLS gắn với cơ chế đăng nhập khi có.

Sau khi DME hoàn thành, mới đánh giá phần nào của VOR/DME nên trích thành generic training engine. Ưu tiên khả năng đọc và bảo trì hơn giảm vài dòng code trùng lặp.

## 16. Checklist bàn giao cho mỗi lần thay đổi

- [ ] Ảnh/nguồn tham chiếu đã lưu trong repository hoặc được mô tả rõ.
- [ ] Types và defaults là nguồn dữ liệu duy nhất.
- [ ] Field ID ổn định và có metadata.
- [ ] Menu/screen/view mapping đầy đủ.
- [ ] Scenario validator và submission validator đã cập nhật.
- [ ] Author cấu hình được field mới.
- [ ] Student event được ghi đúng nếu cần.
- [ ] Examiner xem được bằng chứng.
- [ ] Disabled state và accessibility đúng.
- [ ] Test mới được thêm.
- [ ] Lint, typecheck, test và build đều đạt.
- [ ] Tài liệu này và `IMPLEMENTATION_STATUS.md` được cập nhật.
- [ ] Không có secret trong diff.

## 17. Nhật ký ảnh tham chiếu

Ảnh gốc ban đầu từng được cung cấp dưới dạng attachment ngoài repository. Nội dung đã được chép thành mô tả trong `VOR_PMDT_IMPLEMENTATION_GUIDE.md` và dữ liệu trong `VOR_PMDT_DEFAULT_DATA.md`, nhưng các đường dẫn attachment không được xem là nguồn lưu trữ lâu dài.

Khi bổ sung ảnh mới, thêm từng dòng theo mẫu:

| Ngày | File | Menu path | Model/version | Trạng thái | Chỗ chưa rõ | Đã triển khai |
|---|---|---|---|---|---|---|
| YYYY-MM-DD | `docs/reference/vor-pmdt/example.png` | `RMS > Data > ...` | DVOR 1150A / chưa rõ | Normal/Alarm | Mô tả | Chưa/Có |

## 18. Trạng thái tại thời điểm viết tài liệu

- VOR PMDT shell và 14 view chức năng đã có.
- Admin authoring bằng cách chọn trực tiếp field trên simulator đã có.
- Local và Bypass đã hỗ trợ thao tác học viên và đối chiếu giám khảo.
- Workflow học viên viết chú thích, chẩn đoán và hướng khắc phục đã có.
- Workflow chấm điểm thủ công đã có.
- Route riêng VOR/DME/ADS-B đã có; DME PMDT đã được triển khai độc lập. Xem `docs/HD-PMDT-Simulator-DME.md`.
- Supabase migration VOR đã được áp dụng, local fallback vẫn được giữ.
- Baseline kiểm thử gần nhất trước tài liệu này: 36 file, 156 test Vitest đạt; TypeScript, ESLint và production build đạt.

Khi baseline thay đổi, cập nhật con số tại đây nhưng không xóa lịch sử quyết định quan trọng ở `docs/DECISIONS.md`.


### 8.1 Tùy chỉnh nội dung RMS Logs theo kịch bản

Trong author mode, admin có thể chọn trực tiếp nội dung ở cột `Alarm` hoặc `Alert` của các màn hình `RMS > Logs > Alarms` và `RMS > Logs > Maintenance Alerts`. Nội dung mới được lưu dưới dạng override, ví dụ `alarmLogs.0.alarm` hoặc `maintenanceLogs.0.alert`.

Quy trình sử dụng:

1. Mở màn hình RMS Logs cần đưa vào tình huống.
2. Chọn nội dung Alarm/Alert trên một dòng log có sẵn.
3. Nhập nội dung giả định trong panel tạo kịch bản và nhấn `Áp dụng`.
4. Thêm màn hình hiện tại làm checkpoint nếu đây là bước học viên cần kiểm tra.
5. Lưu kịch bản. Khi student làm bài, cùng override được nạp vào PMDT và nội dung tùy chỉnh xuất hiện tại đúng dòng log.

Không thêm, xóa hoặc đổi thứ tự các dòng log mặc định vì index dòng là một phần của field ID đã lưu.
