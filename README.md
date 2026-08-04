# Hệ thống kiểm tra mô phỏng CNS

Ứng dụng web phục vụ xây dựng kịch bản, thực hành chẩn đoán và đánh giá kỹ thuật viên trên ba nhóm thiết bị CNS: **VOR**, **DME** và **ADS-B**.

Hệ thống mô phỏng giao diện PMDT, QCMS, terminal bảo trì và sơ đồ phần cứng trong một môi trường đào tạo xác định trước. Giám khảo có thể cấu hình tình trạng thiết bị và đáp án tham chiếu; học viên thực hiện quy trình kiểm tra, ghi lại bằng chứng và nộp kết quả để chấm điểm.

> Đây là hệ thống đào tạo, không kết nối thiết bị thật và không mở phiên SSH thật. Tài khoản ứng dụng sử dụng Supabase Auth; tài khoản terminal bên trong bài mô phỏng vẫn chỉ là dữ liệu của kịch bản đào tạo.

## Trạng thái hiện tại

Dự án đang ở giai đoạn **MVP hoạt động đầy đủ cho đào tạo nội bộ**. Ba module đã có route riêng cho giám khảo và học viên, xác thực email công vụ qua Supabase, dữ liệu cloud trên Supabase và lớp fallback cục bộ khi không thể đồng bộ.

| Module | Phạm vi đã triển khai | Cách đánh giá |
| --- | --- | --- |
| VOR | PMDT DVOR 1150A, cấu hình kịch bản, checkpoint, nhật ký màn hình, tương tác Local/Bypass và chẩn đoán phần cứng | Giám khảo xem bằng chứng, đối chiếu checkpoint và nhập điểm thủ công |
| DME | PMDT Model 1118A/1119A, cấu hình kịch bản, nhật ký, Local/Integral Bypass/Standby Bypass và sơ đồ Dual High Power | Giám khảo xem bằng chứng, đối chiếu checkpoint và nhập điểm thủ công |
| ADS-B | QCMS, terminal SA/MA, trạng thái site/sensor, sự cố phần cứng, ghi nhận và sắp xếp thao tác | Chấm tự động theo ngữ cảnh menu, thứ tự thao tác và dữ liệu nhập |

Mốc xác minh gần nhất được ghi nhận ngày **20/07/2026**: 217 bài kiểm thử Vitest vượt qua và production build thành công. README không thay thế kết quả kiểm tra hiện tại; hãy chạy các quality gate trước khi phát hành thay đổi mới.

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
- [2026-08-04] Nâng cấp hệ thống theme (Theme Switcher, Inline Script chống FOUC), tinh chỉnh App Shell layout, tối ưu giao diện Dashboard/QCMS/Exam và tái cấu trúc các module phần mềm (`src/modules/`, `/software/`). Kiểm tra TypeScript và build hoàn tất thành công.

