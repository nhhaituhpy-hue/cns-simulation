# Kế hoạch di chuyển CNS Simulator từ Vercel + Supabase sang Oracle VM

> **Cập nhật:** 2026-09-01
>
> **Trạng thái:** 🟡 Đang thực hiện — checkpoint PostgreSQL foundation đã build thành công; chưa thay đổi Auth production, chưa cutover
>
> **Mục tiêu:** Chạy toàn bộ ứng dụng và PostgreSQL trong một Dokploy Project trên Oracle VM; không còn phụ thuộc Vercel, Supabase Database, Supabase Auth hoặc Supabase Storage.

---

## 1. Quyết định kiến trúc đã thống nhất

1. Dùng **một Dokploy Project** tên `cns-simulator`.
2. Trong Project có **một Environment** tên `production`.
3. Environment chứa hai service chính:
   - `cns-simulator-web`: ứng dụng Next.js standalone, cổng nội bộ `3000`.
   - `cns-simulator-postgres`: PostgreSQL riêng, cổng nội bộ `5432`.
4. PostgreSQL không mở port public và chỉ được truy cập qua mạng nội bộ của Dokploy.
5. Bỏ Supabase Auth nhưng vẫn giữ chức năng đăng nhập nội bộ:
   - Tạo bảng `public.users`.
   - Tạo bảng `public.user_sessions`.
   - Không giữ đăng ký tài khoản, OTP hoặc quên mật khẩu qua email trong giai đoạn đầu.
   - Tài khoản ban đầu được chuyển từ các tài khoản hiện có.
6. Tên đăng nhập được lấy từ phần đứng trước `@attech.com.vn` của email hiện tại, sau khi chuẩn hóa chữ thường.
7. Giữ nguyên UUID người dùng hiện tại để không làm hỏng liên kết với bài thi, cấu hình và dữ liệu đã có.
8. Role hiện có được giữ nguyên theo hai giá trị ứng dụng đang dùng: `admin` và `student`.
9. Tất cả tài khoản migration dùng chung một mật khẩu tạm do chủ dự án quy định và bắt buộc đổi ở lần đăng nhập đầu tiên.
10. Không ghi API key, mật khẩu tạm, database password, connection string hoặc session secret thật vào tài liệu/Git.

> [!IMPORTANT]
> Mật khẩu tạm chỉ được cung cấp lúc chạy migration qua biến `TEMP_INITIAL_PASSWORD`. Không lưu plaintext trong bảng `users`; mỗi tài khoản phải có password hash với salt riêng dù cùng dùng một mật khẩu tạm. Xóa biến này khỏi môi trường ngay sau khi tạo tài khoản.

---

## 2. Kiến trúc đích

```text
Oracle VM (ARM64)
└── Dokploy
    └── Project: cns-simulator
        └── Environment: production
            ├── Application: cns-simulator-web
            │   ├── Next.js 16 standalone
            │   ├── Internal port: 3000
            │   ├── Domain: mophongcns.hainh.io.vn
            │   └── Runtime DATABASE_URL → PostgreSQL internal host
            └── PostgreSQL: cns-simulator-postgres
                ├── Internal port: 5432
                ├── Không public domain/port
                └── Bind mount: /data/cns-simulator-postgres
```

### Thông tin VM đã quan sát ngày 2026-09-01

| Mục | Trạng thái thực tế |
|---|---|
| Instance | `instance-20260817-1736` |
| Public IP ghi nhận | `149.118.152.135` — phải kiểm tra lại trước khi thao tác |
| Kiến trúc | ARM64 (`aarch64`) |
| CPU/RAM | 3 OCPU; Linux hiển thị khoảng 15 GiB RAM |
| Dokploy | v0.30.2 tại thời điểm kiểm tra |
| Data volume | `/data`, 50 GB; còn khoảng 46 GB |
| Docker | 20 container đang chạy tại thời điểm kiểm tra |
| Swap | Chưa cấu hình |

Tài nguyên hiện đủ cho một Next.js service và một PostgreSQL service mới. Cần theo dõi RAM trong lúc Docker build vì VM không có swap.

---

## 3. Phạm vi chuyển đổi

| Thành phần hiện tại | Thành phần đích | Công việc cần làm |
|---|---|---|
| Vercel | Next.js Docker trên Dokploy | Dùng `output: "standalone"`, domain và HTTPS qua Traefik |
| Supabase Database/PostgREST | PostgreSQL trực tiếp | Tạo data-access layer server-only và thay các lệnh `.from(...)` |
| Supabase Auth | `users` + `user_sessions` | Đăng nhập username/password, session cookie, role guard |
| Supabase RPC | PostgreSQL functions gọi trực tiếp | Giữ các transaction quan trọng, bỏ phụ thuộc `auth.uid()` |
| Supabase RLS | Phân quyền tại Next.js server | DB không public; giữ constraint/trigger bảo vệ dữ liệu |
| Supabase Storage | Static assets hoặc bind mount | Chuyển 18 file hiện có và kiểm tra checksum |
| Supabase/Vercel secrets | Dokploy secrets | Chỉ dùng runtime variables, không ghi vào Git |

### Mức độ phụ thuộc hiện tại

- 11 file server đang gọi Supabase server/admin client.
- Khoảng 61 truy vấn Supabase Database.
- 10 lời gọi Supabase RPC.
- 14 thao tác Supabase Auth.
- Không có component trình duyệt nào đang import Supabase browser client.

Điểm thuận lợi là database hiện chỉ được truy cập từ server. Browser không phải viết lại để kết nối trực tiếp PostgreSQL.

### Kiểm kê dữ liệu Supabase chỉ đọc ngày 2026-09-01

- 3 tài khoản Auth và 3 profile.
- Khoảng 152 bản ghi trong các bảng ứng dụng đã kiểm kê.
- 18 file trong bucket `training-media`, tổng khoảng 7,58 MB.
- `vor_submissions` và `dme_submissions` hiện chưa có dữ liệu.

Phải kiểm kê lại ngay trước cutover vì số liệu có thể thay đổi.

---

## 4. Thiết kế bảng người dùng và session

### 4.1. Bảng `public.users`

| Cột | Kiểu đề xuất | Mục đích |
|---|---|---|
| `id` | `uuid primary key` | Giữ UUID của tài khoản Supabase hiện tại |
| `username` | `text unique not null` | Tên đăng nhập chuẩn hóa chữ thường |
| `email` | `text unique` | Giữ email ATTECH để đối chiếu và quản trị |
| `password_hash` | `text not null` | Chỉ lưu password hash, không lưu plaintext |
| `full_name` | `text not null` | Họ tên từ profile hiện tại |
| `work_unit` | `text not null` | Đơn vị công tác |
| `role` | `text not null` | Chỉ nhận `admin` hoặc `student` bằng CHECK constraint |
| `is_active` | `boolean not null` | Cho phép khóa tài khoản mà không xóa dữ liệu |
| `must_change_password` | `boolean not null` | `true` cho toàn bộ tài khoản migration |
| `temporary_password_expires_at` | `timestamptz` | Hạn sử dụng mật khẩu tạm |
| `password_changed_at` | `timestamptz` | Theo dõi lần đổi mật khẩu gần nhất |
| `failed_login_count` | `integer not null` | Đếm số lần đăng nhập sai |
| `locked_until` | `timestamptz` | Khóa tạm khi đăng nhập sai nhiều lần |
| `last_login_at` | `timestamptz` | Theo dõi đăng nhập gần nhất |
| `created_at`, `updated_at` | `timestamptz` | Audit cơ bản |

### 4.2. Bảng `public.user_sessions`

| Cột | Kiểu đề xuất | Mục đích |
|---|---|---|
| `id` | `uuid primary key` | ID session nội bộ |
| `user_id` | `uuid references users(id)` | Chủ sở hữu session |
| `token_hash` | `text unique not null` | Hash của token ngẫu nhiên lưu trong cookie |
| `expires_at` | `timestamptz not null` | Thời điểm hết hạn tuyệt đối |
| `last_seen_at` | `timestamptz` | Hỗ trợ thời gian hết hạn do không hoạt động |
| `revoked_at` | `timestamptz` | Thu hồi session khi logout/đổi mật khẩu |
| `created_at` | `timestamptz` | Audit |

### 4.3. Quy trình tạo tài khoản migration

1. Đọc `auth.users` và `public.profiles` ở Supabase bằng quyền server-only.
2. Tạo bảng mapping gồm `id`, `email`, `username`, `full_name`, `work_unit`, `role`.
3. Kiểm tra username trùng hoặc email/profile thiếu dữ liệu; dừng migration nếu có xung đột.
4. Giữ nguyên `id` của người dùng.
5. Hash `TEMP_INITIAL_PASSWORD` riêng cho từng user bằng thuật toán password hashing phù hợp; không dùng SHA-256 thuần cho mật khẩu.
6. Tạo user với:
   - `is_active = true`
   - `must_change_password = true`
   - `temporary_password_expires_at` theo thời hạn được duyệt trước cutover
7. So sánh tổng số user và role với Supabase.
8. Xóa biến `TEMP_INITIAL_PASSWORD` khỏi terminal/Dokploy sau khi seed thành công.

### 4.4. Luồng đăng nhập nội bộ

1. Người dùng nhập `username` và password.
2. Server chuẩn hóa username và đọc `users` bằng truy vấn tham số hóa.
3. Kiểm tra `is_active`, `locked_until` và password hash.
4. Nếu sai, tăng `failed_login_count` bằng transaction; giữ chính sách khóa 5 lần/5 phút hiện tại.
5. Nếu đúng, reset bộ đếm sai và tạo token session ngẫu nhiên.
6. Chỉ lưu `token_hash` trong database; token thật nằm trong cookie:
   - `HttpOnly`
   - `Secure` ở production
   - `SameSite=Lax`
   - giới hạn thời gian sống
7. Nếu `must_change_password = true`, chỉ cho phép truy cập trang đổi mật khẩu và logout.
8. Sau khi đổi mật khẩu:
   - đặt `must_change_password = false`
   - cập nhật `password_changed_at`
   - thu hồi các session cũ
   - tạo session mới

### 4.5. Các chức năng Auth bị loại bỏ trong giai đoạn đầu

- Đăng ký tài khoản công khai.
- Xác thực OTP đăng ký.
- Gửi lại OTP.
- Quên mật khẩu và phục hồi qua email.
- Supabase session refresh.

Việc reset password ban đầu được thực hiện bằng script quản trị server-only. Có thể bổ sung màn hình quản lý tài khoản cho admin ở phase sau.

---

## 5. RLS và RPC kỳ thi là gì?

### 5.1. RLS — Row Level Security

RLS là cơ chế của PostgreSQL dùng policy để quyết định một người được xem hoặc sửa **dòng dữ liệu nào**.

Ví dụ hiện tại:

- Học viên chỉ được xem bài thi và lượt làm bài của chính mình.
- Admin được xem và quản lý toàn bộ kỳ thi.
- Supabase cung cấp `auth.uid()` để PostgreSQL biết ID người đang đăng nhập.

Khi chuyển sang PostgreSQL riêng, Supabase không còn truyền `auth.uid()` vào database. Nếu giữ nguyên các migration hiện tại, nhiều policy/function sẽ lỗi hoặc không xác định được người dùng.

#### Quyết định cho CNS Simulator

- Không dùng lại RLS phụ thuộc Supabase trong phase đầu.
- PostgreSQL không public và chỉ `cns-simulator-web` được kết nối.
- Next.js server phải xác thực session và kiểm tra role/user ID trước mỗi thao tác.
- Không nhận `user_id` hoặc `role` từ form/browser như dữ liệu đáng tin cậy; luôn lấy từ session đã xác thực.
- Giữ các khóa ngoại, UNIQUE, CHECK constraint và trigger quan trọng trong database.
- Bổ sung integration test để chứng minh học viên không đọc/sửa dữ liệu của người khác.

### 5.2. RPC — Remote Procedure Call

Trong Supabase, `supabase.rpc("ten_ham", params)` gọi một PostgreSQL function từ ứng dụng. Các function này thường gom nhiều câu SQL vào một transaction để tránh dữ liệu bị cập nhật dở dang.

Các RPC hiện được ứng dụng sử dụng:

| Nhóm | PostgreSQL function |
|---|---|
| Đăng nhập | `record_failed_login` |
| Cấu hình simulator | `initialize_user_simulator_config`, `save_user_simulator_config` |
| Đề/kỳ thi | `save_exam_set`, `save_exam_examiners`, `save_exam_candidate`, `save_candidate_result` |
| Làm bài | `start_exam_attempt`, `complete_exam_attempt_item`, `complete_exam_attempt` |

#### Quyết định cho CNS Simulator

- Không bỏ các transaction quan trọng chỉ vì bỏ Supabase.
- Giữ PostgreSQL function phù hợp và gọi trực tiếp bằng driver PostgreSQL, ví dụ `select public.start_exam_attempt(...)`.
- Thay `auth.uid()` trong function bằng `p_user_id` do server lấy từ session đã xác thực.
- Function phải kiểm tra quyền/trạng thái cần thiết hoặc server phải kiểm tra trước khi gọi; với thao tác kỳ thi quan trọng nên có cả hai lớp.
- Các thao tác đơn giản có thể chuyển sang TypeScript transaction nếu code dễ đọc và dễ kiểm thử hơn.

Tóm lại: **RLS kiểm soát ai được chạm vào dòng dữ liệu; RPC thực hiện một nghiệp vụ database nhiều bước.** Chúng là hai khái niệm độc lập.

---

## 6. Bộ migration PostgreSQL mới

Không chạy nguyên trạng toàn bộ `supabase/migrations` trên PostgreSQL thuần vì chúng phụ thuộc:

- schema `auth` và `storage`
- `auth.users`, `auth.uid()`, `auth.jwt()`
- database roles `anon`, `authenticated`, `service_role`
- Supabase RLS policies

### Cấu trúc đề xuất

```text
database/
├── migrations/
│   ├── 0001_base_schema.sql
│   ├── 0002_users_and_sessions.sql
│   ├── 0003_scenarios_and_submissions.sql
│   ├── 0004_simulator_configs.sql
│   ├── 0005_exam_management.sql
│   └── 0006_seed_reference_data.sql
└── scripts/
    ├── export-supabase-data.ts
    ├── import-oracle-data.ts
    ├── create-migrated-users.ts
    └── verify-migration.ts
```

`supabase/migrations` được giữ tạm thời làm tài liệu tham chiếu cho đến khi kết thúc thời gian rollback. `schema.sql` cũ không được xem là nguồn schema chính.

### PostgreSQL version

Repo đang khai báo Supabase local database major version 17. Trước khi tạo service phải kiểm tra version thực tế của Supabase Cloud. Khuyến nghị dùng cùng major version, ưu tiên `postgres:17` nếu kết quả xác nhận là 17; không tự động chọn 16 chỉ vì các project khác đang dùng 16.

---

## 7. Checklist triển khai theo phase

### Phase 0 — Làm sạch tài liệu và chốt quyết định

- [x] Xóa Dokploy API key khỏi tài liệu migration.
- [x] Không ghi plaintext mật khẩu tạm vào Git.
- [x] Chốt mô hình `users` + `user_sessions`.
- [x] Chốt role ban đầu là `admin` và `student`.
- [ ] Xác nhận thời hạn mật khẩu tạm.
- [ ] Xác nhận PostgreSQL major version từ Supabase Cloud.
- [ ] Xác nhận cách lưu 18 file media: static assets hay `/data/cns-simulator-storage`.
- [ ] Xác nhận Dokploy có quyền đọc repo `origin` hiện tại.

### Phase 1 — Tạo PostgreSQL schema portable

- [x] Tạo thư mục `database/migrations`.
- [ ] Chuyển 23 bảng ứng dụng sang migration PostgreSQL thuần.
- [x] Tạo `users` và `user_sessions`.
- [ ] Chuyển foreign key từ `auth.users` sang `public.users`.
- [ ] Loại bỏ Supabase roles/policies khỏi migration mới.
- [ ] Giữ các constraint, trigger và function bảo vệ trạng thái kỳ thi.
- [ ] Chuyển các function dùng `auth.uid()` sang tham số user ID rõ ràng.
- [x] Tạo migration runner có bảng theo dõi version, checksum và advisory lock.

### Phase 2 — Tạo database access layer cho Next.js

- [x] Chọn `pg` làm PostgreSQL driver phù hợp Node.js/ARM64.
- [x] Tạo connection pool server-only trong `src/lib/db`.
- [x] Đặt giới hạn pool mặc định 5 connection cho một app instance.
- [x] Tạo query/transaction helper dùng tham số hóa; không nối chuỗi SQL từ input.
- [ ] Chuyển theo thứ tự:
  1. profile/user
  2. scenarios/submissions
  3. simulator configs
  4. exam queries/actions
- [ ] Giữ nguyên API/UI contract khi có thể để giảm phạm vi ảnh hưởng.

### Phase 3 — Chuyển đăng nhập sang bảng `users`

- [ ] Tạo password hashing/verification server-only.
- [ ] Tạo session service và cookie an toàn.
- [ ] Chuyển `getCurrentProfile()` sang `users` + `user_sessions`.
- [ ] Thay Supabase session refresh trong `src/proxy.ts`.
- [ ] Proxy chỉ hỗ trợ redirect sớm; layout/API vẫn phải xác thực session thật ở server.
- [ ] Chuyển login/logout actions.
- [ ] Tạo trang bắt buộc đổi mật khẩu lần đầu.
- [ ] Bỏ UI/action đăng ký, OTP và phục hồi password qua email.
- [ ] Giữ lockout 5 lần/5 phút.
- [ ] Viết test cho session, role, đổi mật khẩu và lockout.

### Phase 4 — Chuẩn bị data migration

- [ ] Export các bảng ứng dụng từ Supabase.
- [ ] Không migrate session, refresh token hoặc OTP của Supabase.
- [ ] Có thể bỏ dữ liệu `auth_login_attempts` cũ vì đây là trạng thái tạm.
- [ ] Export mapping user/profile với UUID và role.
- [ ] Tạo user mới bằng `TEMP_INITIAL_PASSWORD` tại thời điểm migration.
- [ ] Download 18 media files và tạo checksum manifest.
- [ ] Tạo báo cáo row count theo từng bảng.
- [ ] Chạy ít nhất một dry-run import trên PostgreSQL tạm.

### Phase 5 — Tạo hạ tầng Dokploy

- [ ] Kiểm tra lại public IP, `/data`, RAM và Docker trước khi thao tác.
- [ ] Tạo Project `cns-simulator`.
- [ ] Tạo Environment `production`.
- [ ] Tạo `/data/cns-simulator-postgres` với đúng UID/GID của image PostgreSQL.
- [ ] Tạo PostgreSQL service:
  - internal port `5432`
  - không public port/domain
  - bind mount `/data/cns-simulator-postgres:/var/lib/postgresql/data`
  - health check `pg_isready`
- [ ] Tạo application `cns-simulator-web` từ repo/branch đã duyệt.
- [ ] Cấu hình runtime secrets.
- [ ] Chạy database migrations sau khi PostgreSQL Healthy; không chạy migration trong Docker build.
- [ ] Cấu hình health/readiness endpoint cho web.
- [ ] Cấu hình domain `mophongcns.hainh.io.vn` và HTTPS.
- [ ] Đặt resource limit hợp lý và theo dõi lần build đầu trên VM không có swap.

### Phase 6 — Rehearsal trên Oracle VM

- [ ] Import bản snapshot thử nghiệm.
- [ ] So sánh row count từng bảng.
- [ ] So sánh media file count/checksum.
- [ ] Kiểm tra ba tài khoản migration có đúng username/role.
- [ ] Kiểm tra password tạm chỉ cho vào trang đổi password.
- [ ] Kiểm tra admin/student không truy cập chéo quyền.
- [ ] Kiểm tra toàn bộ simulator, scenario, config và workflow kỳ thi.
- [ ] Kiểm tra restart app không mất session đang hợp lệ ngoài dự kiến.
- [ ] Kiểm tra restart PostgreSQL không mất dữ liệu.
- [ ] Tạo một backup thử và thực hiện restore thử.

### Phase 7 — Cutover production

- [ ] Thông báo maintenance window.
- [ ] Giảm DNS TTL trước cutover nếu domain cũ cần chuyển.
- [ ] Bật maintenance mode/khóa thao tác ghi trên Vercel cũ.
- [ ] Tạo final Supabase export và media checksum.
- [ ] Import vào PostgreSQL Oracle.
- [ ] Tạo 3 user với UUID/role hiện tại và password tạm.
- [ ] Chạy verification script; dừng nếu row count hoặc role không khớp.
- [ ] Mở web service/domain Oracle.
- [ ] Smoke test trước khi cho người dùng truy cập.
- [ ] Yêu cầu người dùng đổi mật khẩu ở lần đăng nhập đầu tiên.
- [ ] Xóa `TEMP_INITIAL_PASSWORD` khỏi môi trường sau khi seed.

### Phase 8 — Quan sát, rollback và decommission

- [ ] Giữ Vercel và Supabase 7–14 ngày, không xóa ngay.
- [ ] Ghi nhận lỗi, log đăng nhập, kết nối DB và dung lượng `/data`.
- [ ] Chốt tiêu chí rollback trước cutover.
- [ ] Nếu Oracle đã có dữ liệu mới, không rollback DNS mù mà phải xử lý đồng bộ dữ liệu.
- [ ] Sau thời gian quan sát:
  - gỡ package Supabase khỏi code
  - gỡ biến `NEXT_PUBLIC_SUPABASE_*` và `SUPABASE_SECRET_KEY`
  - xóa/đóng Vercel deployment
  - revoke Supabase keys
  - archive export cuối
  - cập nhật README và nhật ký phiên

---

## 8. Environment variables và secrets

### Runtime của web application

| Biến | Mục đích |
|---|---|
| `DATABASE_URL` | Kết nối PostgreSQL qua internal host của Dokploy |
| `APP_URL` | URL production `https://mophongcns.hainh.io.vn` |
| `SESSION_COOKIE_NAME` | Tên cookie session |
| `SESSION_TTL_HOURS` | Thời gian sống session đã được duyệt |
| `NODE_ENV` | `production` |

### Chỉ dùng lúc migration/quản trị

| Biến | Mục đích |
|---|---|
| `DATABASE_ADMIN_URL` | Quyền chạy migration; không dùng cho web runtime |
| `TEMP_INITIAL_PASSWORD` | Password tạm để seed user; xóa ngay sau khi dùng |

### Quy tắc secrets

- Dokploy API key chỉ lấy từ skill/runbook riêng khi agent được phép thao tác.
- Tài liệu này chỉ dùng placeholder, không chứa API key thật.
- Không in secrets trong log, command output, README hoặc commit history.
- Web runtime dùng database user quyền tối thiểu; không dùng PostgreSQL superuser.
- Migration role và application role phải tách riêng nếu Dokploy/PostgreSQL setup cho phép.

---

## 9. Backup và vận hành PostgreSQL

### Yêu cầu tối thiểu

- Backup logic bằng `pg_dump` hằng ngày.
- Giữ nhiều phiên bản theo retention được duyệt.
- Không chỉ lưu backup trên cùng `/data` với database live.
- Có ít nhất một bản copy ngoài VM hoặc OCI volume backup phù hợp giới hạn Always Free.
- Kiểm tra restore định kỳ; backup chưa restore thử không được xem là hoàn chỉnh.
- Theo dõi:
  - dung lượng `/data`
  - connection count
  - PostgreSQL health
  - lỗi migration
  - login lockout bất thường
  - container restart/OOM

Không tự động tạo backup, restart container hoặc thay đổi volume trước khi được chủ dự án xác nhận theo quy trình Oracle VM.

---

## 10. Verification bắt buộc

### Database parity

- Tổng số user bằng Supabase tại thời điểm freeze.
- UUID, username, email và role khớp mapping được duyệt.
- Row count từng bảng khớp export.
- Foreign key không bị orphan.
- Các function/trigger kỳ thi hoạt động trong transaction.

### Login và phân quyền

- Password không được lưu plaintext.
- Password tạm bắt buộc đổi trước khi truy cập app.
- User `student` không mở được route/action admin.
- User không đọc/sửa attempt/config của user khác.
- Logout thu hồi session.
- Đổi password thu hồi session cũ.
- Lockout 5 lần/5 phút hoạt động.

### Workflow ứng dụng

- Trang chủ và đăng nhập.
- Tạo/chỉnh sửa scenario.
- Lưu/restore simulator config.
- Admin tạo đề thi, kỳ thi, giám khảo và thí sinh.
- Student bắt đầu, hoàn thành item và nộp bài.
- Kết quả thi không bị cập nhật dở dang khi một bước lỗi.
- Tất cả simulator chính và mobile smoke test.

---

## 11. Troubleshooting định hướng

### Migration báo thiếu `auth.uid()` hoặc role `authenticated`

Đang chạy nhầm migration Supabase cũ. Dừng và chuyển sang bộ `database/migrations` đã port; không tạo giả Supabase roles để che lỗi.

### Login thành công nhưng bị chuyển về `/login`

- Kiểm tra cookie flags/domain.
- Kiểm tra session token hash và `expires_at`.
- Kiểm tra layout/API có đọc đúng `user_sessions`.
- Kiểm tra reverse proxy chuyển đúng HTTPS headers.

### User không thoát được trang đổi password

- Kiểm tra `must_change_password` đã được cập nhật trong cùng transaction.
- Thu hồi session cũ và tạo session mới sau khi đổi password.
- Không tin role/must-change flag gửi từ browser.

### RPC kỳ thi lỗi sau migration

- Tìm `auth.uid()` hoặc `auth.jwt()` còn sót trong function.
- Kiểm tra function đã nhận `p_user_id` từ server session.
- Kiểm tra transaction, permissions và trạng thái kỳ thi trước khi sửa workaround.

### PostgreSQL container không lên

- Kiểm tra `/data` còn được mount.
- Kiểm tra ownership của `/data/cns-simulator-postgres`.
- Kiểm tra image major version và `PGDATA`.
- Không xóa data directory để thử lại khi chưa có backup và xác nhận.

---

## 12. Quy trình làm việc của project

Với mỗi phase có thay đổi code/logic:

1. Sửa code theo phạm vi nhỏ.
2. Dừng để chủ dự án kiểm tra trên `npm run dev`.
3. Chỉ sau khi nhận xác nhận `ok` mới chạy test bị ảnh hưởng và `npm run build` nếu cần.
4. Sau khi kiểm tra thành công, cập nhật README/walkthrough rồi thực hiện một lượt Git add/commit/push theo quy định project.
5. Sau khi source thay đổi, chạy `codegraph sync`; không commit artifact runtime trong `.codegraph`.

Remote nguồn chuẩn phải giữ:

```text
origin = git@github-hainokinguyen:hainokinguyen-coder/cns-simulator.git
```

Không tự đổi `origin` sang HTTPS hoặc tài khoản GitHub khác.

---

> **Ghi chú tiếp tục:** Đây là kế hoạch, không phải script thực thi. Mỗi thao tác trên Oracle VM phải tuân thủ Observe → Report → Ask → Act → Verify. API key và các secrets thật chỉ được đọc từ nguồn riêng được chủ dự án cho phép; tuyệt đối không bổ sung trở lại tài liệu này.
