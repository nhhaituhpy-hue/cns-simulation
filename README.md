# Hệ thống kiểm tra mô phỏng CNS (CNS Simulation Lab)

Ứng dụng web phục vụ xây dựng kịch bản, thực hành chẩn đoán sự cố kỹ thuật và sát hạch/đánh giá kỹ thuật viên trên các nhóm thiết bị bảo đảm hoạt động bay (CNS): **VOR**, **DME** và **ADS-B**.

---

## 1. Thông tin chung về dự án

### 1.1. Mục đích ứng dụng
- **Mô phỏng chân thực và an toàn:** Giả lập trung thực giao diện PMDT (Selex Model 1150/1150A, Mopiens), LMI, QCMS, terminal bảo trì SA/MA và sơ đồ khối phần cứng tương tác. Môi trường hoạt động hoàn toàn cục bộ/container độc lập, không kết nối thiết bị thật và không mở phiên SSH/serial vật lý ra ngoài.
- **Phục vụ đào tạo & sát hạch kỹ thuật viên:**
  - *Dành cho Giám khảo:* Thiết lập kịch bản sự cố (fault injection), cấu hình dung sai và đáp án tham chiếu, tổ chức bộ đề, quản lý kỳ thi chính thức và chấm điểm dựa trên bằng chứng kỹ thuật.
  - *Dành cho Học viên:* Luyện tập quy trình kiểm tra tham số, thao tác chuyển đổi chế độ, sửa chữa hư hỏng theo whitelist quy định, ghi nhận bằng chứng thao tác và nộp bài đánh giá.
- **Tài khoản ứng dụng:** Hệ thống quản lý tài khoản nội bộ trên PostgreSQL với 2 tài khoản: **admin** (dành cho quản trị / giám khảo) và **user** (dành cho học viên / thực hành). Tài khoản terminal bên trong bài mô phỏng chỉ là dữ liệu của kịch bản đào tạo, không phải tài khoản hệ thống.

### 1.2. Công nghệ ứng dụng
- **Giao diện & Ứng dụng (Frontend):**
  - Framework: Next.js 16.2.11 (App Router, kiến trúc standalone output tối ưu container Docker).
  - Thư viện hiển thị: React 19.2.4, TypeScript 5, Tailwind CSS 4, Motion (micro-animations), Geist Font và Phosphor Icons.
  - Phong cách thiết kế: Fluent / Windows 11 dark mode, tối ưu cho dashboard nghiệp vụ mật độ thông tin cao.
  - Quản lý trạng thái client: Zustand 5 quản lý store độc lập cho từng simulator và phiên thi.
- **Cơ sở dữ liệu & Xác thực (Backend):**
  - Database: PostgreSQL 17 self-hosted container trên máy chủ Oracle Cloud VM ARM64.
  - Data Access & Session: Node-pg connection pool server-only, xác thực phiên qua cookie HttpOnly (`cns_session`, `SameSite=Lax`, `Secure` trên production, TTL 12h).
  - Schema & Migration: Hệ thống migration SQL portable (`database/migrations/0001–0006`), quản lý version và checksum chặt chẽ.
- **Công cụ kiểm thử & Đồ thị tri thức:**
  - Vitest, React Testing Library, Playwright (E2E) và CodeGraph CLI (quản lý đồ thị phụ thuộc mã nguồn).

### 1.3. Repository ứng dụng & Nguồn phát triển
- **Repository phát triển mặc định:** [`nhhaituhpy-hue/cns-simulation`](https://github.com/nhhaituhpy-hue/cns-simulation), nhánh `main`.
- **Tài khoản phát triển:** `nhhaituhpy-hue`.
- **Remote Git local:** `deploy` (`https://github.com/nhhaituhpy-hue/cns-simulation.git`) là đích fetch/push mặc định. Remote `origin` cũ được giữ lại chỉ để tương thích/lưu trữ.

### 1.4. Khởi chạy trên máy cục bộ (Local Development)
```bash
# Cài đặt thư viện phụ thuộc
npm ci

# Cấu hình biến môi trường cục bộ (.env.local)
DATABASE_URL=postgresql://cns_simulator:<password>@127.0.0.1:5433/cns_simulator
DATABASE_POOL_MAX=5
DATABASE_SSL=false
SESSION_COOKIE_NAME=cns_session
SESSION_TTL_HOURS=12

# Khởi chạy PostgreSQL local (Docker Compose) và chạy migration
npm run db:dev:up
npm run db:migrate

# Chạy ứng dụng chế độ dev (mở http://localhost:3000)
npm run dev
```

---

## 2. Quy tắc thay đổi, tự động deploy và kiểm thử production

### 2.1. Quy trình phát triển và thay đổi mã nguồn (Workflow)
1. **Lập kế hoạch trước khi lập trình:** Mọi yêu cầu thay đổi giao diện, cấu trúc component hoặc logic nghiệp vụ đều phải lập kế hoạch ngắn gọn (phân tích, phạm vi ảnh hưởng, giải pháp), chờ người dùng duyệt trước khi sửa file.
2. **Kiểm tra cục bộ có trọng tâm:**
   - *Thay đổi liên quan đến Logic/Engine:* Chạy file test bị ảnh hưởng trực tiếp (ví dụ: `npx vitest run tests/vor/`) và chạy `npm run build` để kiểm tra biên dịch và kiểu dữ liệu TypeScript.
   - *Thay đổi chỉ liên quan đến UI/CSS/tài liệu tĩnh:* Không chạy toàn bộ bộ test tự động (`npm run test:run`) để tiết kiệm thời gian và tài nguyên.
3. **Cập nhật tài liệu & Commit chuẩn hóa:** Cập nhật nhật ký vào `README.md`, sau đó thực hiện đúng 1 lần:
   ```bash
   git add .
   git commit -m "<type>(<scope>): <short description>"
   git push deploy main
   ```

### 2.2. Cơ chế Tự động Deploy trên Dokploy
- Repository liên kết trực tiếp với Dokploy cài đặt trên máy chủ **Oracle Cloud VM ARM64**.
- Mọi commit push lên nhánh `main` của repository phát triển mặc định `nhhaituhpy-hue/cns-simulation` qua remote `deploy` sẽ **tự động kích hoạt webhook của Dokploy**.
- Dokploy tự động build Docker image theo multi-stage `Dockerfile`, khởi động lại container `cns-simulator-web` và kết nối với PostgreSQL 17 private cùng bind mount lưu trữ `/data/cns-simulator-storage`.

### 2.3. Quy tắc kiểm thử trực tiếp trên Production
- **Không yêu cầu môi trường dev trung gian:** Môi trường phát triển cục bộ không duy trì toàn bộ cơ sở dữ liệu và kịch bản thực tế. Do đó, **sau khi commit được push và Dokploy hoàn tất quá trình tự động deploy, việc kiểm tra chức năng, tính đúng đắn của dữ liệu và giao diện thực tế sẽ được tiến hành trực tiếp trên môi trường Production (Live URL)**.
- **Quy trình xử lý sự cố:** Nếu phát hiện lỗi trên production:
  1. Kiểm tra log container trực tiếp trên bảng điều khiển Dokploy.
  2. Xác định nguyên nhân gốc rễ (root cause) cục bộ, tái hiện và kiểm tra fix có trọng tâm.
  3. Commit và push bản vá lên `deploy/main` để Dokploy tự động deploy lại.

---

## 3. Quy tắc xây dựng bộ công cụ Simulation bám sát tài liệu

### 3.1. Nguồn tài liệu kỹ thuật bắt buộc
Mọi hành vi mô phỏng, công thức toán học, giao diện điều khiển, dải tham số và quy luật cảnh báo của từng simulator bắt buộc phải đối soát tuyệt đối với các tài liệu kỹ thuật gốc trong thư mục `C:\Test\cns-simulator\doc\`:
- **SELEX DVOR 1150A:** `doc/DVOR1150A/571150A-0002E.pdf` và các ảnh chụp màn hình PMDT thực tế tại đài trạm.
- **SELEX DVOR 1150:** `doc/DVOR1150/DVOR 1150.pdf` (đặc biệt mục 3.4 PMDT và quy trình Integral Monitor Bypass).
- **SELEX DME 1118A/1119A:** `doc/DME1119A/1119A-0001M.pdf`, `571118A-0001 Rev. M` và Table 9-5 (Channel Allocation).
- **MOPIENS 220 DVOR:** `doc/DVOR220/220 DVOR Tech Manual 20240320.pdf` và bộ ảnh tham chiếu giao diện khai thác Cam Ranh.
- **MOPIENS 320 DME:** `doc/DME320/310320_DME_Tech_Manual 2022-12-19.pdf`.
- **ADS-B Sensor:** QCMS User Manual, Sensor SA/MA User Manual, Quadrant Hardware & Installation Guide V1.5.

### 3.2. Nghiêm cấm bịa đặt công thức và logic RF
- **Không tự sáng tác hành vi kỹ thuật:** Nghiêm cấm tự nghĩ ra các công thức RF, tự đặt dải đo, hoặc tùy tiện thay đổi thứ tự ưu tiên cảnh báo không có trong tài liệu.
- **Thứ tự ưu tiên nguồn sự thật:**
  1. *Ảnh chụp màn hình PMDT/LMI đang khai thác thực tế tại các đài trạm.*
  2. *Sổ tay kỹ thuật (Technical Manual) chính thức của nhà sản xuất.*
  3. *Quy ước mô hình đào tạo (Training Model Assumptions) đã được thống nhất.*

### 3.3. Nguyên tắc làm rõ khi tài liệu chưa đầy đủ
- Khi gặp tham số hoặc quy trình không được manual lượng hóa rõ (ví dụ: công thức nội suy suy giảm nhánh, quan hệ nhiệt độ - quạt làm mát, thuật toán voting đặc thù), **TUYỆT ĐỐI KHÔNG tự suy đoán hay giả lập giá trị ngẫu nhiên**.
- **Phải dừng lại và hỏi kỹ ý kiến người dùng** để thống nhất quy ước đào tạo. Mọi quy ước bắt buộc phải được ghi rõ trong mã nguồn (dưới dạng hằng số/comment chuẩn hóa) và cập nhật vào tài liệu dự án.

---

## 4. Kiến trúc dự án & Các Route chính

### 4.1. Cấu trúc thư mục mã nguồn
```text
cns-simulator/
├── database/migrations/  # SQL migrations cho PostgreSQL portable (0001–0006)
├── doc/                  # Sổ tay kỹ thuật, manual gốc của các thiết bị (gitignored)
├── public/               # Tài nguyên tĩnh, ảnh catalogue, manuals PDF hướng dẫn
├── src/
│   ├── app/              # Next.js App Router (admin, student, simulator, api, login)
│   ├── components/       # Giao diện PMDT Selex, QCMS, Terminal, Sơ đồ khối SVG
│   ├── lib/              # Domain engines (dvor1150a, dvor1150, dme1119a), db, auth
│   ├── modules/          # Module thiết bị Mopiens (devices/dvor220, devices/dme320, operations)
│   └── stores/           # Zustand stores quản lý trạng thái client cho từng simulator
└── tests/                # Bộ kiểm thử Unit, Component, Integration và E2E
```

### 4.2. Kiến trúc dữ liệu cốt lõi (PostgreSQL 17)
```text
PostgreSQL 17
 ├── users / user_sessions                # Tài khoản nội bộ, vai trò, phiên cookie
 ├── scenarios / vor_scenarios / dme_...   # Kịch bản đào tạo và cấu hình mẫu
 ├── exam_sets / exam_papers / exams      # Cấu trúc đợt thi, bộ đề, phân công môn
 ├── exam_candidates / exam_attempts      # Danh sách thí sinh, bài làm và kết quả thi
 ├── user_simulator_configs / _history    # Cấu hình lưu trữ theo người dùng và lịch sử thay đổi
 ├── simulator_scenario_parameters        # Bộ tham số kịch bản độc lập (JSONB schema v1/v2)
 └── simulator_review_scenario_assignments # Tập con kịch bản được giám khảo publish cho Ôn tập
```

### 4.3. Bảng tổng hợp các Route chính

| Phân hệ | Mục đích | Route URL | Mô tả chức năng |
|---|---|---|---|
| **Xác thực** | Đăng nhập & Đổi mật khẩu | `/login`, `/change-password` | Form xác thực PostgreSQL, đổi mật khẩu lần đầu bắt buộc và đổi mật khẩu chủ động |
| **Giám khảo** | Quản trị kỳ thi | `/admin/exams`, `/admin/exam-sets` | Tạo kỳ thi, cấu hình đề thi theo môn, quản lý thí sinh và giám khảo chấm |
| | Trung tâm kịch bản | `/admin/vor`, `/admin/dme`, `/authoring/ads-b` | Quản lý kịch bản nghiệp vụ, chấm điểm bài nộp và xem timeline thao tác |
| | Quản lý Scenario Parameters | `/authoring`, `/authoring/[moduleId]` | Chọn thiết bị trước, rồi import/export JSON, sửa nhanh và quản lý kịch bản riêng theo từng simulator |
| **Học viên** | Vào thi chính thức | `/student/exams` | Thực hiện các kịch bản trong đề thi được phân công theo thời gian thực |
| | Ôn tập Scenario Parameters | `/review/[moduleId]` | Chỉ hiển thị tập con kịch bản đã được giám khảo gắn theo từng thiết bị |
| | Ôn tập tự do VOR/DME | `/student/vor`, `/student/dme`, `/student/ads-b` | Luyện tập thao tác trên simulator và nộp bài thử nghiệm |
| | Ôn tập DVOR 1150 | `/student/dvor-1150`, `/session?id=...` | Luồng danh mục bài tập và phòng thực hành riêng cho dòng máy 1150 legacy |
| **Simulator** | SELEX DVOR 1150A | `/simulator/dvor-1150a` | PMDT Selex 1150A đầy đủ, 12 tham số calibration, failover dual TX |
| | SELEX DVOR 1150 | `/simulator/dvor-1150` | PMDT Model 1150 tối giản theo mục 3.4 manual, Integral Monitor Bypass |
| | SELEX DME 1119A | `/simulator/dme-1119a` | PMDT DME 1119A, Table 9-5, công suất PA/RTC, 8 preset lỗi độc lập |
| | MOPIENS DVOR 220 | `/simulator/software/dvor-220` | PMDT/LMI Mopiens 220, Draft-Running-Flash, rolling average, VSWR 48 anten |
| | MOPIENS DME 320 | `/simulator/software/dme-320` | PMDT/LMI DME 320, 126 kênh X/Y, BITE Self-Test, trễ changeover |
| | ADS-B Sensor | `/simulator/ads-b` | QCMS Dashboard & Terminal SA/MA mô phỏng dòng lệnh hệ thống |
| **Sơ đồ khối** | 5 thiết bị & ADS-B | `/simulator/[thiết-bị]/block-diagram` | Sơ đồ khối tương tác SVG, cabinet front/rear, faceplate module và test points |

---

## 5. Mô tả kiến trúc từng thiết bị & Ma trận tham số

Chi tiết về công thức toán học, ma trận ảnh hưởng Config ↔ Data, cơ chế giám sát/voting và kịch bản bài tập của từng thiết bị được bóc tách và duy trì độc lập trong thư mục `docs/simulators/`:

| Thiết bị | Loại trạm | Phần mềm điều khiển | Tài liệu kỹ thuật chi tiết |
| :--- | :--- | :--- | :--- |
| **SELEX DVOR 1150A** | Đài dẫn đường đa hướng DVOR | PMDT (Portable Maintenance Data Terminal) | [Tài liệu kỹ thuật SELEX 1150A](docs/simulators/dvor-1150a.md) |
| **SELEX DVOR 1150** | Đài dẫn đường đa hướng DVOR | PMDT Model 1150 | [Tài liệu kỹ thuật SELEX 1150](docs/simulators/dvor-1150.md) |
| **SELEX DME 1119A** | Thiết bị đo cự ly hàng không DME | PMDT DME 1119A | [Tài liệu kỹ thuật SELEX 1119A](docs/simulators/dme-1119a.md) |
| **MOPIENS MARU 220** | Đài dẫn đường đa hướng DVOR | LMI / PMDT Mopiens | [Tài liệu kỹ thuật MOPIENS 220](docs/simulators/dvor-220.md) |
| **MOPIENS MARU 320** | Thiết bị đo cự ly hàng không DME | LMI / PMDT Mopiens | [Tài liệu kỹ thuật MOPIENS 320](docs/simulators/dme-320.md) |
| **Module ADS-B** | Trạm giám sát phát sóng tự động | QCMS & Terminal Console VT100 | [Tài liệu kỹ thuật ADS-B](docs/simulators/ads-b.md) |

### 5.1. SELEX DVOR 1150A (PMDT)
- **Ma trận tham số:** Tần số sóng mang Carrier và Sideband; công suất phát quy đổi RF Level ($P_{\text{ref}} = 100\text{ W}$, sàn $-60\text{ dB}$); 4 nhánh Sideband độc lập xác định độ sâu điều chế AM 9960 Hz theo công thức $\frac{1}{4}\sum\sqrt{P_i / P_0}$; góc pha Coarse ($0/90/180/270^\circ$) và Fine ($-45^\circ \dots +45^\circ$).
- **Hệ thống giám sát:** 12 tham số chuẩn hóa (Calibration Offsets & Scale Factors) độc lập trên Mon 1 và Mon 2; cơ chế chuyển đổi tự động Dual TX khi hai Monitor cùng báo động Alarm.
- **Kịch bản & Bài làm:** Định dạng JSON Schema v1; whitelist `studentEditableFieldIds` chống gian lận; lưu vết toàn bộ chuỗi sự kiện `actionHistory` vào database.
- *Xem chi tiết:* [`docs/simulators/dvor-1150a.md`](docs/simulators/dvor-1150a.md)

### 5.2. SELEX DVOR 1150 (PMDT)
- **Ma trận tham số:** Mô hình đơn giản hóa theo Mục 3.4 tài liệu vận hành. Đồng bộ giá trị Nominal giữa TX1 và TX2; hệ số scale công suất độc lập cho từng máy phát. Carrier kéo theo SBO và 4 nhánh Sideband.
- **Hệ thống giám sát:** Bù trừ sai lệch nguồn phát (Monitor Offset); phân cấp Pre-Alarm (vàng) và Alarm (đỏ). Bắt buộc phải kích hoạt **Integral Monitor Bypass** mới được phép Apply cấu hình mới.
- **Kịch bản & Bài làm:** Định dạng JSON Schema v2; kịch bản suy giảm sóng mang + điều chế 9960 Hz và lỗi VSWR anten; lưu trữ theo cặp `module_id + scenario_id`.
- *Xem chi tiết:* [`docs/simulators/dvor-1150.md`](docs/simulators/dvor-1150.md)

### 5.3. SELEX DME 1119A (PMDT)
- **Ma trận tham số:** Bảng phân bổ kênh Table 9-5 (1X–126Y) tự động suy diễn tần số thu/phát, giãn cách xung và độ trễ Reply Delay danh định ($50/56\ \mu\text{s}$). Công suất RTC Target và HPA; tính toán bức xạ hiệu dụng ERP (sàn $-60\text{ dB}$); kiểm soát xung PRF và bộ triệt phản xạ LDES/SDES.
- **Hệ thống giám sát:** 4 công thức tính toán kiểm tra toàn vẹn (Integrity Test); cờ cảnh báo `Need Backup` đỏ khi Apply cấu hình có lỗi; tự động xóa khi chạy RMS Config Backup.
- **Kịch bản & Bài làm:** 8 kịch bản định sẵn chuẩn hóa (sụt công suất, trôi trễ, nghẽn PRF, hỏng HPA, mất Ident, VSWR cao, lệch chuẩn calibration, quá nhiệt buồng máy).
- *Xem chi tiết:* [`docs/simulators/dme-1119a.md`](docs/simulators/dme-1119a.md)

### 5.4. MOPIENS MARU 220 DVOR (LMI / PMDT)
- **Ma trận tham số:** Kiến trúc quản trị 3 tầng cấu hình: **Draft** $\to$ Apply thành **Running (RAM)** $\to$ Profile Save thành **Flash**. Điều chế $\text{AM 9960 Hz} = 150 \times \sqrt{\sum P_{\text{sideband}} / P_{\text{carrier}}}$; công cụ Transmitter Helper với tính năng bám đuổi Sideband Tracking.
- **Hệ thống giám sát:** Bộ đệm trượt trung bình đo lường (2–10 mẫu, chu kỳ 100 ms) chống chập chờn trước khi so sánh ngưỡng; bảo vệ VSWR PDC; chu trình nhiệt quạt làm mát ($40^\circ\text{C}$ bật, $95^\circ\text{C}$ ngắt RF, $80^\circ\text{C}$ khởi động lại). Chế độ khóa `MAINT` tự động đưa Monitor vào trạng thái Effective Bypass.
- **Kịch bản & Bài làm:** Quản lý kịch bản suy giảm công suất RF, sự cố dàn 48 anten và quá nhiệt; khóa quyền ghi vào Flash trong suốt buổi thi.
- *Xem chi tiết:* [`docs/simulators/dvor-220.md`](docs/simulators/dvor-220.md)

### 5.5. MOPIENS MARU 320 DME (LMI / PMDT)
- **Ma trận tham số:** Đầy đủ 252 kênh 1X–126Y theo tiêu chuẩn ICAO Annex 10; công suất đỉnh Peak Power và ERP theo % đặt; lỗi HPA Low Output ghìm công suất về tỷ số 0.4; lỗi RXU kéo giãn trôi $+1.2\ \mu\text{s}$ độ trễ phát đáp.
- **Hệ thống giám sát:** Hai kênh giám sát độc lập trên mỗi Monitor: kênh Executive (giám sát máy On-Air) và Standby (giám sát máy trên tải giả). Trễ hành động `alarmDelayMs`; voting `AND`/`OR` điều khiển timed changeover hoặc shutdown; chức năng BITE Monitor Self-Test.
- **Kịch bản & Bài làm:** Scenario Parameters v1 có preset, preview, import/export JSON, kho `/authoring`, Apply/Restore/End và đánh giá phục hồi qua LMI/PMDT. Bài tập chỉ chạy trong phiên; khóa Profile Save và bảo toàn cấu hình trước bài.
- *Xem chi tiết:* [`docs/simulators/dme-320.md`](docs/simulators/dme-320.md)

### 5.6. Module Giám sát ADS-B (QCMS & Terminal Console)
- **Kiến trúc mô phỏng:** Tái lập môi trường dòng lệnh ký tự ANSI (74 cột) trạm ADS-B Côn Sơn/Cam Ranh và trung tâm QCMS. Phân định rõ hai phân quyền vận hành: `OPERATIONAL` và `MAINTENANCE`.
- **Hệ thống giám sát:** Bảng điều khiển QCMS hiển thị trạng thái cảm biến theo 4 mã màu: Green (bình thường), Yellow (mất dữ liệu tàu bay hoặc RF suy giảm), Orange (quá nhiệt cảm biến $> 55^\circ\text{C}$), Red (mất nguồn AC hoặc đứt mạng LAN).
- **Kịch bản & Chấm điểm tự động:** 10 kịch bản sự cố phần cứng chuẩn hóa; thuật toán quy hoạch động LCS (Longest Common Subsequence) so khớp chính xác từng thao tác dòng lệnh (đúng, sai, thiếu, thừa), đảm bảo tính khách quan tuyệt đối khi thi tuyển.
- *Xem chi tiết:* [`docs/simulators/ads-b.md`](docs/simulators/ads-b.md)

---

## 6. Nhật ký phiên làm việc

### 2026-09-30 — Giới hạn vùng chọn kịch bản trong thư viện
- Giới hạn bảng phân chia kịch bản vào thư viện Ôn tập/Kiểm tra ở vùng cao khoảng 5 dòng; danh sách dài có thể cuộn dọc và vẫn hỗ trợ cuộn ngang trên màn hình hẹp.
- Giữ hàng tiêu đề cùng checkbox “Chọn tất cả” cố định khi cuộn; thêm nhãn vùng và khả năng focus bằng bàn phím cho vùng danh sách.
- Kiểm tra đạt: focused test `tests/layout/scenario-library-controls.test.tsx`, ESLint hai file bị ảnh hưởng, typecheck, `git diff --check` và CodeGraph sync.

### 2026-09-22 — Nâng cấp 8 và bổ sung 10 scenario DME 1119A hai bước
- Nâng cấp 8 preset DME 1119A hiện có với diagnosis contract: PMDT checkpoints, Full/On-Air diagnostic mode, manual references, disposition thay LRU hoặc chỉnh phần mềm.
- Bổ sung 10 scenario LRU mới theo manual 1119A-0001M: Monitor Interrogator 1, RTC 1, LPA 1, TX1 Power Supply, RMS Processor, Facilities CCA, BCPS 1, Interface CCA, RF Switch và LCU.
- Nối Fault Isolation result với trạng thái scenario và mở Bước 2 cho review/student mode; hardware occurrence dùng trực tiếp catalog diagram-to-cabinet DME 1119A.
- Tạo đủ 18 JSON fixture tại `output/dme1119a-scenarios-20260922/`: 8 scenario cũ đã enrich + 10 scenario mới.
- Bổ sung test xác nhận hardware occurrence chính xác và xác nhận riêng trường hợp software-only không được chọn phần cứng.
- Kiểm tra đạt: typecheck, lint, 45 test DME/fixture ban đầu và 28 test focused cho scenario/evidence/mapping.

### 2026-09-22 — Mở các màn hình PMDT cần cho Fault Isolation
- Browser QA production phát hiện các menu `Diagnostics > Power Up Results`, `Diagnostics > Fault Isolation`, `Monitor 1/2 > Test Results` và `Monitor 1/2 > Fault History` vẫn bị đánh dấu `disabled`, khiến quy trình troubleshooting không thể bắt đầu.
- Bật các menu này và thêm regression assertions vào `tests/state/vor-pmdt-store.test.ts`.
- Kiểm tra lại đạt: lint, typecheck, build và 27/27 focused tests.

### 2026-09-22 — Bổ sung 10 scenario DVOR 1150A và quy trình chẩn đoán hai bước
- Bổ sung 10 scenario troubleshooting mới theo manual 571150A-0002E: Audio Generator TX1, Synthesizer TX2, Monitor 1, LVPS TX1, BCPS TX2, RF Monitor, Carrier Amplifier TX2, Sideband Amplifier TX1, Commutator Controller và Monitor 1 calibration.
- Mở rộng Scenario Parameters bằng hợp đồng `diagnosis`: PMDT checkpoints, loại chạy Diagnostics, kết luận thay module hay chỉnh phần mềm, manual references và hardware occurrence ID.
- Nối Fault Isolation/Power-Up Diagnostics với trạng thái scenario; Full Diagnostics yêu cầu Local/Security phù hợp và hiển thị cảnh báo NOTAM.
- Bổ sung Bước 2 dùng trực tiếp catalog sơ đồ DVOR 1150A: occurrence trên schematic được ánh xạ tới đúng cabinet hotspot, phân biệt TX1/TX2 và cho phép xác nhận trường hợp không thay phần cứng.
- Tạo 10 JSON fixture để import tại `output/dvor1150a-scenarios-20260922/`.
- Kiểm tra đạt: `npm run lint`, `npm run typecheck`, `npx vitest run tests/state/vor-pmdt-store.test.ts tests/vor/pmdt-shell.test.tsx tests/vor/monitor-screens.test.tsx tests/qa-generate-dvor1150a-scenarios.test.ts` (27/27 tests), `npm run build`, `git diff --check` và CodeGraph sync.

### 2026-09-17 — Chuẩn hóa button Kịch bản và Ôn tập
- Chuẩn hóa các button chữ trong catalog, bảng, modal Ôn tập và luồng tạo/sửa ADS-B về góc `4px` (`rounded`), `text-xs`, padding gọn; giữ nguyên màu primary/danger, loading/disabled và focus-visible.
- Chuẩn hóa các icon action, pagination và close modal về góc `4px`, nhưng giữ vùng bấm `size-9`/`size-11` để không làm giảm khả năng thao tác.
- Đã kiểm tra trực quan preview local cho catalog Kịch bản ADS-B và modal Ôn tập DVOR 220 trước khi phát hành.
- Kiểm tra: 8/8 file test UI liên quan, 23/23 test và focused ESLint đạt.

### 2026-09-17 — Chuẩn hóa ADS-B vào namespace Kịch bản
- Khôi phục card ADS-B tại `/authoring` nhưng giữ riêng mô hình kịch bản legacy `scenarios`/`/api/scenarios`, không ép vào schema Scenario Parameters JSON của năm thiết bị PMDT/MOPIENS.
- Chuẩn hóa danh sách, tạo và sửa ADS-B tại `/authoring/ads-b`, `/authoring/ads-b/create` và `/authoring/ads-b/edit`; các route `/admin/ads-b`, `/admin/create` và `/admin/edit` chuyển hướng tương thích về URL mới.
- Cập nhật liên kết nội bộ dashboard, wizard và empty state để không quay lại namespace `/admin/*`.

### 2026-09-17 — Bổ sung quy tắc chống tái phát lỗi GitHub Actions CI
- Ghi `GitHub Actions CI Regression Guard` vào `AGENTS.md`: yêu cầu kiểm tra full pipeline Node 24 khi đụng App Router/MOPIENS UI/test setup; nêu mock `useRouter` + `useSearchParams`, kỳ vọng nút quay lại nội tuyến và ranh giới giữa warning `act(...)` với lỗi test.

### 2026-09-17 — Khôi phục GitHub Actions CI cho MOPIENS và AppShell
- Sửa test harness cho UI workflow DVOR 220 và DME 320: mock `next/navigation` cung cấp App Router và search params rỗng khi render component độc lập trong Vitest.
- Đồng bộ test dispatcher MOPIENS với cùng router mock.
- Cập nhật kỳ vọng AppShell theo hành vi hiện hành: DVOR 220/DME 320 đã có nút quay lại nội tuyến để tránh render trùng; thanh chung chỉ hiện cho simulator không có thanh riêng và điều hướng về trang chủ.
- Xác nhận pipeline tương đương GitHub Actions với Node 24: `lint`, `typecheck`, 109/109 test files (620/620 tests) và build 75/75 routes đều đạt.

### 2026-09-16 — Tách danh sách thiết bị và kho Kịch bản
- Đổi `/authoring` thành catalog gồm đúng năm thiết bị có Scenario Parameters: DVOR 1150, DVOR 1150A, DME 1119A, DVOR 220 và DME 320; card tái sử dụng bố cục, trạng thái và điều hướng của tab `Ôn tập`.
- Mỗi card mở `/authoring/[moduleId]`, hiển thị bảng kịch bản, import JSON, sửa nhanh, tải JSON, mở simulator và xóa chỉ cho thiết bị đã chọn; thêm điều hướng quay về danh sách thiết bị.
- Chuyển route authoring của ba PMDT Selex về namespace `/authoring/*`; không thay đổi API, schema, dữ liệu kịch bản hoặc dữ liệu Ôn tập.

### 2026-09-16 — Phân bổ Scenario Parameters vào Ôn tập
- Thêm migration `0006_simulator_review_scenario_assignments.sql`: lưu tập con kịch bản được publish theo thiết bị, thứ tự hiển thị, người gắn và thời điểm gắn; khóa ngoại ghép chặn phân bổ chéo thiết bị và tự dọn phân bổ khi kịch bản gốc bị xóa.
- Thêm API `/api/review-scenarios`: người đã đăng nhập được đọc danh sách đã publish; chỉ admin được thay thế danh sách của một thiết bị trong transaction. API kho kịch bản chỉ cho học viên đọc chi tiết khi kịch bản đó đã được publish.
- Mở giao diện Ôn tập thống nhất cho DVOR 1150, DVOR 1150A, DME 1119A, DVOR 220 và DME 320. Giám khảo dùng modal checkbox `Thêm kịch bản`; học viên chỉ thấy các hàng đã gắn.
- Nút bắt đầu mở simulator đúng thiết bị với `scenarioId` và cờ `review=1`; Scenario Parameters được nạp và Apply tự động, không mở editor dành cho giám khảo.
- Migration `0006` đã áp dụng trực tiếp trên PostgreSQL production bằng một transaction và được đăng ký checksum; không restart hay tái tạo service.
- Sửa lỗi runtime khi chọn checkbox trong modal: chụp trạng thái `checked` trước callback state để không tham chiếu `event.currentTarget` đã bị React giải phóng; bổ sung test tương tác chống tái phát.
- Tách action bắt đầu Ôn tập khỏi quyền biên soạn Scenario: kịch bản đã được API xác nhận publish có thể khởi tạo chế độ `student` mà không yêu cầu tài khoản PMDT cấp 3 hoặc bật editor giám khảo; schema và điều kiện trạng thái ban đầu vẫn được validate trước khi Apply.
- Kiểm tra cục bộ: 77/77 test liên quan và build 74/74 route đạt trước khi kiểm thử browser production.

### 2026-09-16 — Mở giao diện ôn tập DVOR 220 và DME 320
- Chuyển trạng thái hai module DVOR 220 và DME 320 trong tab `Ôn tập` từ `Chuẩn bị` sang `Sẵn sàng`.
- Đồng bộ trạng thái `Kịch bản` của DVOR 220 và DME 320 sang `Sẵn sàng`, để các thiết bị đã có Scenario Parameters mở đúng hành động `Quản lý kịch bản`.
- Thay trang giữ chỗ bằng bảng danh sách tình huống thống nhất với DVOR 1150, DVOR 1150A và DME 1119A, gồm các cột STT, Tiêu đề, Mức độ và Thao tác.
- Hiện chưa tạo dữ liệu tình huống: mỗi bảng hiển thị `0 bài` và thông báo chưa có tình huống nào được gắn vào ôn tập.
- Component đã nhận danh sách tình huống qua props để sẵn sàng nối dữ liệu phân bổ về sau, nhưng chưa xây API hoặc chức năng gắn kịch bản trong phiên này.
- Kiến trúc dự kiến: giám khảo tạo kho kịch bản, chọn một tập con để gắn vào ôn tập theo từng thiết bị; thí sinh chỉ nhìn thấy và thực hành các kịch bản đã được gắn. Các kịch bản chưa gắn có thể được giữ riêng cho kỳ thi thật.
- Kiểm tra: focused ESLint, 9/9 test giao diện liên quan và build 72/72 routes đều đạt.

### 2026-09-16 - Tạo sổ tay Word hướng dẫn Scenario DVOR 1150A
- Tạo file Word 23 trang dành cho giám khảo và người xây dựng bài thực hành, giải thích toàn bộ vòng đời Scenario Parameters bằng tiếng Việt.
- Chèn 9 ảnh chụp thực tế từ DVOR 1150A Simulator, gồm trạng thái TEST/TST, quyền Examiner, cửa sổ Scenario Parameters, recovery controls, trạng thái IN PROGRESS, SOLVED và khôi phục sau khi kết thúc bài.
- Giải thích chi tiết Start policy, Success criteria, Student recovery controls, Preview, Station, Transmitter, Monitor limits, Monitor control, Monitor antennas, Monitor calibration, Monitor raw measurements và Monitor routing.
- Đã render và kiểm tra trực tiếp toàn bộ 23 trang; kiểm tra accessibility đạt 0 lỗi mức high, medium và low. File bàn giao: [Hướng dẫn xây dựng Scenario DVOR 1150A](output/word/DVOR1150A_Huong_dan_xay_dung_Scenario.docx).

### 2026-09-16 — Bổ sung hướng dẫn xây dựng Scenario DVOR 1150A
- Thêm tài liệu tiếng Việt hướng dẫn đầy đủ vòng đời Draft → Preview → Apply → Restore/End và cách kiểm tra trạng thái `IN PROGRESS`/`SOLVED`.
- Giải thích nhãn quyền `EXAMINER`, sự khác biệt với tài khoản PMDT `SEC3`/`SEC4`, cùng ý nghĩa của Start policy, Success criteria và Student recovery controls.
- Mô tả toàn bộ chín nhóm cấu hình từ Station, TX1/TX2, Monitor limits/control/antennas/calibration/raw measurements đến Monitor routing; bổ sung hai ví dụ công suất thấp và chuyển máy do Carrier VSWR.
- Tài liệu mới bám theo schema v1 hiện hành và được liên kết trực tiếp tại [hướng dẫn xây dựng Scenario](docs/simulators/dvor-1150a-scenario-authoring.md).

### 2026-09-14 — Đơn giản hóa tab Kịch bản và lưu sửa nhanh theo thiết bị
- Thay màn hình tile/card bằng một bảng phẳng duy nhất, nhóm theo năm module có adapter Scenario Parameters: DVOR 1150, DVOR 1150A, DME 1119A, DVOR 220 và DME 320.
- Mỗi nhóm thiết bị có nút `Thêm kịch bản` và input JSON riêng; file export từ Scenario trong simulator được parse theo đúng module trước khi ghi.
- Bấm từng scenario để mở hàng chi tiết và xem nội dung JSON; `Sửa nhanh` cho phép đổi tên, mô tả, độ khó rồi lưu lại qua API upsert, giữ nguyên mã và tham số kỹ thuật.
- Dữ liệu lưu theo khóa `moduleId + scenarioId`, nên scenario của thiết bị này không ghi đè thiết bị khác; import cùng mã trong cùng thiết bị sẽ cập nhật bản ghi cũ.
- Đã kiểm tra: focused ESLint, TypeScript, 46/46 test liên quan, build 72/72 routes, `git diff --check` và CodeGraph. Không chạy UI test.

### 2026-09-14 — Sửa nút Quay lại bị render trùng trên DME 320
- Bổ sung route `/simulator/software/dme-320` vào danh sách simulator đã có thanh `Quay lại` nội tuyến để AppShell không render thêm thanh quay lại chung.
- Giữ lại đúng một thanh công cụ kiểu DVOR 220 cho DME 320; không thay đổi logic scenario.
- Kiểm tra: focused ESLint, TypeScript, `git diff --check` và đồng bộ CodeGraph đều đạt. Không chạy test UI/build cho thay đổi hiển thị nhỏ này.

### 2026-09-14 — Đồng nhất thanh công cụ Scenario của DME 320 với DVOR 220
- Gộp nút `Quay lại` và cụm `Simulator Tools` vào cùng thanh nền xám đậm kiểu PMDT DVOR 220.
- Thêm toggle `Simulator Tools`, đưa `Scenario Parameters` vào cụm chức năng, giữ badge trạng thái scenario ở phía phải và bổ sung responsive/focus-visible cho màn hình hẹp.
- Nút quay lại dùng điều hướng App Router về trang chủ; không thay đổi logic scenario hay dữ liệu mô phỏng.
- Đã chạy focused ESLint, typecheck, `git diff --check` và `npm run build` thành công (72/72 routes). Không chạy UI test theo yêu cầu trước đó.

### 2026-09-14 — Hoàn thiện Scenario Parameters cho MOPIENS DME 320
- Bổ sung schema Scenario Parameters v1, preset Low Power/ERP, Pulse Spacing và HPA Fault; hỗ trợ import/export JSON và kho quản trị dùng chung tại `/authoring`.
- Bổ sung vòng đời `Apply → Restore/Reset/Reboot → End`, đánh giá Service/Monitor/Primary Alarm/Active Fault và preview detached qua engine DME 320 hiện hữu.
- Bổ sung editor theo nhóm Signal & Channel, Monitor & Limits, Power/Thermal, Faults và Advanced Raw; giữ nguyên công thức Peak Power/ERP, channel allocation, voting và alarm delay hiện có.
- Scenario là session-only: khóa Profile Save, không ghi fault/measurement override vào cấu hình; bảo toàn Draft/Running/Flash trước bài và trì hoãn hydrate server nếu response về muộn.
- Trong bài tập, Apply cấu hình không tự dịch ngưỡng Monitor theo setpoint mới để học viên có thể sửa đúng độ trễ theo ngưỡng đã soạn; ngoài scenario vẫn giữ cơ chế tự căn ngưỡng cũ. Thêm nút `Advance 1 s / 5 s` cho đồng hồ bài tập thủ công.
- Hướng dẫn thao tác, preset và ranh giới dữ liệu: [DME 320 Scenario Parameters](docs/simulators/dme-320.md#6-scenario-parameters-v1).
