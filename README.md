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
- State DVOR 1150 chỉ nằm trong Zustand store của tab trình duyệt, không ghi localStorage/API/ Supabase. Vì vậy nhiều người hoặc nhiều tab có phiên mô phỏng độc lập, không ghi đè dữ liệu nhau; reload tạo lại snapshot mặc định.

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
- Engine hai thiết bị là deterministic và tách biệt; phần dùng chung trong `src/modules/operations/mopiens-pmdt/` chỉ là presentation shell/component.

Quality gate ngày **10/08/2026**: **21 file, 103/103 test đạt**, targeted ESLint đạt không warning, `npm run typecheck` và `npm run build` thành công. Smoke check HTTP trả 200 và đúng marker cho cả hai route cùng fallback VHF. Browser backend không khả dụng trong phiên xác minh, vì vậy kiểm tra tương tác dùng component workflow tests; cần kiểm tra trực quan desktop/narrow ở phiên có Browser trước khi phát hành UI ra người dùng cuối.

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
            └─ training media storage
```

- Supabase Auth quản lý thông tin đăng nhập; `public.profiles` quản lý họ tên, đơn vị và vai trò ứng dụng.
- Supabase Database lưu kịch bản ADS-B, VOR, DME và bài nộp VOR/DME.
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
