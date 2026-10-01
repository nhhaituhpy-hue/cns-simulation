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

### 2026-10-01 — Nhật ký chức năng và minh chứng khối/card trong bài nộp

- Theo phương án đã duyệt, trang giám khảo hiển thị `Tiêu chí đạt / Success criteria` trực tiếp và nhật ký theo tên chức năng/nút trên phần mềm; bổ sung thời gian, giá trị chọn, trạng thái trước → sau và lý do từ chối. Lệnh được chấp nhận dùng nền xanh nhẹ; kết quả đạt vẫn lấy từ evaluator của Scenario/bài nộp.
- Dùng token màu của theme sáng/tối, chữ trạng thái và icon cùng màu. Local hiển thị Bật/Tắt; boolean Alarm và Normal được diễn giải riêng để không đảo nghĩa cảnh báo. Bản nháp, yêu cầu bị từ chối và trạng thái tham khảo không được diễn giải thành cấu hình đã áp dụng hoặc kết quả đạt.
- JSON/tên trường nội bộ được thu gọn trong `Chi tiết kỹ thuật`; vẫn giữ dữ liệu gốc để đối chiếu. Presenter bài nộp giữ lại các `parameterChanges` hợp lệ của Apply/draft/restore/backup thay vì bỏ mất thay đổi tham số.
- Sau phản hồi của người dùng về khối/card, nối evidence đã lưu vào mục `Lựa chọn khối/card trong bài nộp`: tên khối/card, đúng vị trí TX/Monitor/card, lựa chọn thí sinh cạnh đáp án từ definition snapshot, lý do xử lý và danh sách đã kiểm tra. Không đọc lựa chọn từ store đang chạy hay tự lấy đáp án điền vào bài cũ.
- Bài cũ chưa lưu lựa chọn/xác nhận phần cứng hiển thị xám `Chưa có minh chứng`, không suy ra đạt từ summary cũ. Các bài SELEX có disposition `replace-module` ghi rõ tiêu chí vận hành là tham khảo theo contract evaluator hiện hữu; chúng không được cộng vào số tiêu chí bắt buộc đã đạt. Điểm chính thức tiếp tục do giám khảo nhập.
- Không sửa schema, migration, thuật toán mô phỏng hoặc dữ liệu production. Component nhật ký mới chỉ dùng trên trang review kỳ thi Scenario; nhật ký thí sinh/legacy giữ luồng hiện có.
- **Đã kiểm tra:** ESLint trực tiếp, TypeScript và **8 file / 75 test** đạt, gồm luồng UI chọn LVPS 1 → lưu → nộp → review đọc vị trí **1A3A4**/lý do từ submitted snapshot sau khi store thay đổi; PostgreSQL thật trong database cô lập kiểm tra round-trip selection/inspection/reasoning và kết quả kỹ thuật. Source test/mock auth/cache không thay thế browser QA production.
- **QA giao diện:** bản xem trước dùng component thực với dữ liệu minh họa; dark/light đạt tương phản chữ tối thiểu 7.17/5.89 ở bản khảo sát đầu, disclosure mở/đóng bằng Tab/Enter có focus-visible; 375px và landscape 812px không tràn ngang. Bổ sung khối/card đã render được và DOM xác nhận tên LVPS 1/vị trí 1A3A4/lý do/khớp đáp án; công cụ screenshot bị kẹt khi chụp bản cuối nên không lặp tiếp. Preview cục bộ: `http://127.0.0.1:3199/` (dữ liệu minh họa, không phải bài production).
- **Gate phát hành:** sau yêu cầu `commit push đi`, đã chạy đủ chuỗi CI Regression Guard bằng **Node 24.18.0** vì suite bài thi có thay đổi mock: `npm run lint` → `npm run typecheck` → toàn bộ **145 file / 906 test** (có PostgreSQL thật) → production build **84/84** đều đạt. CodeGraph sync và diff check đạt; scope Git gồm mã nguồn/test trực tiếp và README, không có env, database, log hoặc artifact xem trước.
- Người dùng đã cho phép commit/push `deploy/main`; CI và Dokploy được theo dõi sau push. Browser production đang đăng nhập chưa truy cập được do công cụ báo thiếu Codex auth token; chưa xác nhận bài thực tế trong ảnh có evidence phần cứng. Git push/CI đạt không thay thế xác nhận phiên bản đã deploy hoặc acceptance browser production.

### 2026-10-01 — Thống nhất Scenario Parameters cho ba thiết bị SELEX PMDT

- Triển khai kế hoạch 1.1 đã được duyệt cho DVOR 1150 không A, DVOR 1150A và DME 1119A: Trạng thái khởi đầu → Lỗi đưa vào → Điều kiện đạt → Chẩn đoán hai bước → Quyền chỉnh sửa; metadata ở đầu, preview/footer ở cuối.
- Tạo section, diagnosis presenter và policy controls dùng chung; giữ editor fault/criterion, schema và hardware occurrence riêng của từng model. Đổi nhãn kết luận thành `Kết luận PMDT mong đợi`, hiện checkpoint/lệnh và vai trò của tiêu chí vận hành theo disposition.
- Thêm optional `editPolicy` cho non-A schema v2; giữ whitelist legacy/preset và import v1→v2. Nối resolver vào ô cấu hình, Simulation Parameters, setter, Apply và protected-field comparison; không đổi thuật toán vật lý/chẩn đoán.
- Giữ danh sách Restricted khi chuyển qua Open và ưu tiên đúng explicit policy khi nó khác whitelist legacy. Kết quả phiên active của 1150A/DME được nối với evidence theo HUD hiện có; preview baseline được giải thích riêng.
- Hướng dẫn: [SELEX Scenario Parameters](docs/simulators/selex-scenario-parameters.md). Kế hoạch/checklist: [triển khai ba thiết bị](plans/refactor/2026-10-01-scenario-parameters-organization-unification-plan.md).
- Người dùng đã xem bản dev, chấp nhận giao diện tiếng Việt và yêu cầu commit/push. Gate Node 24: lint, typecheck, **16 file / 113 test trực tiếp liên quan**, production build **84/84** đạt. Test mới kiểm tra policy non-A v1/v2, guard security/Local/setter/Apply, explicit whitelist khác legacy, round-trip Open/Restricted trên cả ba panel và đánh giá đúng policy của snapshot kỳ thi.
- Không sửa navigation/AppShell/MOPIENS hoặc test setup nên không chạy lại toàn suite cục bộ. Toàn suite tiếp tục là gate của GitHub Actions. Dev log tham số login đã được tắt; `.env.local`, PostgreSQL local, log và script kiểm tra dưới `tmp/` không thuộc gói Git.
- Runtime sau bản này phải hiểu optional policy non-A trước khi dùng revision Open. Nếu đã lưu/giao bài Open, rollback UI phải giữ parser/resolver tương thích; không tự sửa snapshot/revision cũ để quay về runtime không hỗ trợ policy.
- Tại thời điểm chuẩn bị commit: diff/CodeGraph đạt; phát hành tới `deploy/main` đã được chấp thuận. CI/Dokploy và health bản mới được theo dõi sau push. Người dùng đã review dev; agent chưa có browser kết nối để QA trực quan production.

### 2026-10-01 — Khắc phục đăng nhập bản xem trước cục bộ

- Người dùng mở bản dev nhưng đăng nhập báo hệ thống xác thực đang bận. Xác định lỗi `DATABASE_URL is not configured`: `.env.local` còn cấu hình Supabase, chưa có kết nối PostgreSQL mà auth hiện tại sử dụng.
- Dùng PostgreSQL 17.11 có sẵn, tạo database local `cns_selex_preview` chỉ nghe `127.0.0.1:5433`; áp dụng 13 migration hiện có và cấu hình `.env.local` (file được ignore). Tài khoản admin local dùng hash scrypt; không ghi credential vào source/tài liệu.
- Tắt `logging.serverFunctions` trong Next config để tham số đăng nhập không xuất hiện trong log dev, xử lý log cục bộ trước đó và khởi động lại dev.
- Xác minh `/api/health` trả database OK; gọi login action thật bằng fixture local tạm thời nhận SUCCESS/session cookie, ba trang simulator trả 200 và có toolbar authoring với phiên xác thực. Fixture đã được dọn. Đây là bằng chứng HTTP/auth/SSR; người dùng sau đó đã review dev và duyệt giao diện.

### 2026-10-01 — Đưa phần nhận định sự cố lên trước simulator
- Theo yêu cầu thí sinh xác định sự cố trước khi thao tác phần mềm, đưa ba ô `Vị trí / sự cố nghi ngờ`, `Căn cứ chẩn đoán`, `Hướng khắc phục` lên trên simulator, giữ thứ tự trái sang phải này.
- Chỉnh vị trí JSX và khoảng cách của phần kết luận. Kiểm tra: ESLint targeted và `git diff --check` đạt; bố cục là thay đổi UI tĩnh theo workflow dự án.

### 2026-10-01 — Kết luận thí sinh, phần cứng và trạng thái SOLVED
- Xác nhận thiếu kết nối: HUD và stagebar DVOR 1150A/DME 1119A chỉ render trong mode preview, còn route item dùng mode student. Ba ô kết luận chưa được đưa vào route item nên payload answer vẫn trống.
- Thêm `Vị trí / sự cố nghi ngờ`, `Căn cứ chẩn đoán`, `Hướng khắc phục` dưới simulator. Cache theo session/item, đưa answer vào result khi lưu/nộp và đồng bộ với store Selex để không lẫn môn/phiên.
- Hiện HUD và nút `Tiếp tục: Xác định phần cứng` trong phiên thi; giữ chốt PMDT checkpoint trước bước hardware. Bước hardware hiển thị danh sách khối/card đã kiểm tra, đã chọn và ô `Lý do xử lý phần cứng`; dùng selector occurrence/card sẵn có. Nối lại bước hardware DVOR 1150 non-A trong route item. ADS-B lưu lựa chọn/inspection/reasoning từ workspace chẩn đoán hardware của Scenario.
- Giữ simulator căn giữa; toolbar của phiên thi có style theo theme, nút gọn, focus-visible và disabled state. HUD/student header dùng chữ `SOLVED` xanh lá; trạng thái `submitted` tiếp tục chỉ phản ánh việc đã nộp.
- Thêm evaluator adapter cho sáu module, đọc definition snapshot và checkpoint/evidence đã lưu. Không tin cờ `solved` hoặc summary từ client; Selex dựng lại snapshot/derived data, MOPIENS dùng evaluator thiết bị, ADS-B đối chiếu actions/QCMS/authentication/hardware.
- Server lưu summary kỹ thuật trong `result_summary_json`; trang giám khảo tính lại từ snapshot/result, kể cả bài cũ có đủ checkpoint, và hiện nhanh `SOLVED` / `IN PROGRESS` / `CHƯA ĐỦ DỮ LIỆU` đầu từng môn. Có danh sách tiêu chí để xem chi tiết; điểm chính thức vẫn do giám khảo nhập.
- Không thêm migration và không sửa dữ liệu các bài đã nộp. Kết luận/khối-card bị thiếu ở phiên bản trước vẫn để trống nếu không từng được ghi nhận; không tạo câu trả lời hoặc evidence thay thí sinh.
- Gate Node 24 đạt lint → typecheck → **140 file / 875 test** (gồm **24 ca PostgreSQL thật**) → production build; đã build lại sau chỉnh CSS toolbar. Test route item kiểm tra nhập cả ba trường, sang hardware, chọn đúng LVPS 1A3A4, lưu inspection/selection/reasoning và hiển thị SOLVED; test evaluator giữ strict PMDT→hardware, chặn cờ SOLVED giả, protected field và thiếu checkpoint.
- **Giới hạn xác minh:** Workflow UI kiểm chứng bằng Vitest, auth/Next cookie/cache integration được mock; PostgreSQL/schema/transaction là thật trên database cô lập. Chưa QA trực quan production do Computer Use thiếu Codex auth token. Khôi phục checkpoint server đầy đủ, finalize timeout tự động và pilot vẫn còn trong kế hoạch.

### 2026-10-01 — P5: mở bài nộp và chấm điểm giám khảo
- Bỏ nền xanh nhạt toàn dòng `submitted`/`timed_out` ở bảng mã để giữ tương phản của theme tối. Chỉ chữ `submitted` dùng màu xanh lá từ token của theme.
- Tên thí sinh, mã hint và link `Xem bài / Chấm điểm` mở `/admin/scenario-exams/[examId]/results/[codeId]`. Cùng một người có nhiều mã vẫn mở đúng bài theo code ID, không theo tên hoặc tài khoản dùng chung.
- Trang review hiển thị từng môn, Scenario/revision đã cấp, thời gian, câu trả lời, nhật ký kỹ thuật, cấu hình/checkpoint, QCMS/Terminal hoặc chẩn đoán/phần cứng theo payload đã lưu. Dữ liệu cấu trúc được mở theo từng mục; đối chiếu tham chiếu bằng definition snapshot, không tải lại thư viện/source hiện tại.
- Giám khảo nhập điểm 0–100 (tối đa hai chữ số thập phân) và nhận xét tối đa 4000 ký tự cho từng item. Hiển thị điểm đã lưu, người chấm và thời gian chấm; số 0 được giữ đúng, không coi là chưa nhập điểm.
- Query/action kiểm tra quyền admin như workspace giám khảo hiện hành; chặn student/teacher, kiểm tra exam/code/item thuộc cùng phiên và chỉ chấm item `submitted`/`timed_out` có result hợp lệ. Không thay đổi result/definition/status nộp khi lưu điểm.
- Lưu score/comment/reviewed_by/reviewed_at cùng audit `review_updated` trong transaction; rollback điểm và thông tin người chấm nếu audit thất bại. Không thêm migration, không gọi action/query kỳ thi legacy; chỉ tái sử dụng pure presenter nhật ký PMDT.
- Gate Node 24 đạt: lint → typecheck → **139 file / 865 test** (gồm **23 ca PostgreSQL thật**) → production build; CodeGraph sync/diff check đạt. Regression kiểm tra chữ xanh không tô nền, link đúng code, score 0/85.25/100, dữ liệu snapshot, cách ly exam/code, chặn chấm trước nộp, không sửa evidence và rollback audit.
- **Giới hạn:** QA trực quan production chưa chạy do Computer Use báo thiếu Codex auth token. Trang đọc bài và nhập điểm đã viết/kiểm thử; acceptance browser toàn bộ sáu module, summary evaluator tự động, khôi phục checkpoint server và finalize timeout vẫn còn trong kế hoạch.

### 2026-10-01 — Căn giữa simulator và nộp bài kết thúc phiên thi
- Căn giữa PMDT trong wrapper của trang làm bài, ghi đè quy tắc căn trái ở breakpoint của skin cũ. Khung nhỏ hơn simulator vẫn cuộn ngang và giữ mép trái truy cập được.
- Thêm `Lưu bài làm` và `Nộp môn` cạnh countdown; định kỳ lưu bản nháp lên server mỗi 10 giây và lưu khi bấm `Quay lại phiên thi`. Nếu runtime chưa nạp hoặc khởi tạo lỗi, vẫn có thể quay lại phiên.
- Thêm `Nộp bài và kết thúc phiên thi` ngay dưới danh sách các môn. Có xác nhận trước khi nộp; nút bật khi tất cả môn đã bắt đầu và phiên còn hạn. Server yêu cầu mỗi môn có kết quả hợp lệ trước khi hoàn tất, không đánh dấu hoàn thành chỉ vì đã mở simulator.
- Kết quả lấy trực tiếp từ sáu runtime, bao gồm cấu hình/nhật ký/chẩn đoán/phần cứng hoặc QCMS/terminal tùy thiết bị; định danh bằng session item/module/scenario/revision. Loại account credential và definition lặp khỏi payload, giới hạn JSON 750 KB và độ sâu. Điểm giám khảo không lấy từ candidate payload.
- Trang phiên thu hồi bài Selex đã lưu cục bộ từ phiên bản trước; chọn bản mới hơn giữa cache theo thao tác và bản autosave định kỳ. Lưu thành công rồi mới nộp toàn phiên; nếu mất kết nối hoặc lưu thất bại, giữ phiên mở để thử lại.
- Nộp môn và nộp toàn phiên kiểm tra role/cookie, khóa session/code/subject/item, dùng lại kết quả đã nộp khi retry và chặn sửa kết quả sau nộp. Nộp toàn phiên cập nhật item, môn, session và code cùng audit trong một transaction; rollback toàn bộ nếu audit hoặc bất kỳ bước nào thất bại.
- Dùng `result_json`, status, timestamp và audit event đã có; không thêm migration, không đổi deadline hoặc mã thí sinh production. Sau nộp, trang phiên hiện `Đã nộp bài`, ẩn thao tác tiếp tục và nút nộp.
- Gate cuối đạt trên Node 24: lint → typecheck → **137 file / 834 test** (gồm **20 ca PostgreSQL thật**) → production build; CodeGraph sync/diff check đạt. Các ca mới kiểm chứng nộp hai môn, double submit đồng thời, không ghi đè bài đã nộp, cách ly mã, deadline, payload sai/credential, thiếu bài và rollback audit; regression UI chờ React hoàn tất transition trước khi thao tác lại.
- **Giới hạn:** chưa QA trực quan production vì Computer Use không có browser khả dụng. Đã lưu checkpoint lên server nhưng khôi phục đầy đủ checkpoint server cho mọi module, finalize tự động khi hết giờ và màn hình giám khảo đọc/chấm bài vẫn là phần tiếp theo của P4/P5.

### 2026-10-01 — P4: mở và tiếp tục môn từ Scenario đã cấp
- Xác nhận nguyên nhân: `Bắt đầu môn` đã lưu item/snapshot nhưng handler chỉ cập nhật danh sách, chưa chuyển trang; môn đang làm chỉ hiện `Scenario đã được cố định`.
- Sau khi bắt đầu thành công, chuyển thẳng đến `/student/scenario-exams/session/items/[itemId]`. Môn `in_progress` có nút `Tiếp tục môn` dùng item đã lưu; môn đã kết thúc hoặc phiên hết hạn không có thao tác tiếp tục.
- Route làm bài kiểm tra role Thí sinh, cookie phiên, quan hệ item/môn/mã, trạng thái và deadline bằng PostgreSQL. Runtime đọc `definition_snapshot_json`, không đọc lại Scenario nguồn hoặc pool Kiểm tra; sửa/gỡ nguồn sau khi cấp không đổi đề đang làm.
- Nối snapshot vào cả sáu runtime: DVOR 1150, DVOR 1150A, DME 1119A, DVOR 220, DME 320 và ADS-B. PMDT dùng cơ chế khởi tạo học viên hiện có; MOPIENS không hydrate cấu hình cá nhân hoặc hiện công cụ authoring trong phiên thi; ADS-B dùng QCMS/terminal của snapshot và cache terminal theo item/revision.
- DVOR 1150A/DME 1119A khởi tạo sạch khi đổi item để đáp án và nhật ký cũ không đi vào phiên mới. Định danh lưu cục bộ gồm session/item/revision; giữ deadline gốc khi mở lại. Countdown chặn thao tác khi hết giờ; đây chưa phải finalize timeout trên server.
- Bổ sung regression UI cho bắt đầu → chuyển trang, resume từ dữ liệu đã lưu, lỗi cấp/lỗi mạng, trạng thái terminal, loader Strict Mode, URL không thay snapshot, runtime của sáu module và cách ly trạng thái PMDT. Integration PostgreSQL kiểm chứng cách ly hai mã cùng tài khoản, snapshot bất biến và chặn bài hết hạn/đã kết thúc.
- Gate cuối đạt trên Node 24: `lint` → `typecheck` → **136 file / 802 test** (có **12 ca PostgreSQL thật**, không skip suite này) → production build; CodeGraph sync và diff check đạt. Auth và Next cookie/cache trong suite integration được mock; schema, transaction và SQL chạy thật trên database cô lập.
- Thêm `tmp/**` vào ESLint ignores cho artifact/helper cục bộ, giữ kiểm tra mã nguồn và test. Một lượt gate bị công cụ dừng ở giới hạn 240 giây và đóng stdout (`EPIPE`); lượt tiếp theo lưu log trên đĩa và hoàn tất với exit code 0. Cụm PostgreSQL test tạm đã dừng sau kiểm tra.
- **Giới hạn xác minh:** QA trên trình duyệt chưa chạy do Computer Use báo `Codex auth token is unavailable`; chưa xác minh UI production. Không thêm migration trong đợt này. P4 còn checkpoint trên server, submission/idempotency, finalize timeout; P5 còn review/điểm giám khảo. Mở lại giữ Scenario và deadline; không coi đó là đã hoàn tất khôi phục tiến độ server cho mọi module.

### 2026-09-30 — Điều tra lỗi cấu hình bảo mật mã kỳ thi sau tự triển khai

- Lỗi “Thiếu cấu hình bảo mật mã kỳ thi” khi tạo mã xuất phát từ runner web không còn `SCENARIO_EXAM_CODE_ENCRYPTION_KEY`: khóa trước đó chỉ được gắn vào Docker service và bị Dokploy thay thế ở lần deploy tiếp theo.
- Kiểm tra production: bảng `scenario_exam_codes` có 3 mã cũ và 0 mã có `code_ciphertext`; có thể tạo khóa mới mà không mất khả năng giải mã mã mới đã phát hành. Docker service nhận khóa hợp lệ khi gắn tạm, nhưng lần tự deploy sau đó lại bỏ biến này; health vẫn trả 200 vì không kiểm tra cấu hình cấp mã.
- Dokploy lưu nguyên khối environment ở dạng mã hóa. Việc thêm dòng trực tiếp vào database không được Dokploy áp dụng; đã gỡ dòng thử nghiệm và khôi phục nguyên trạng dữ liệu environment. Runner sau tự deploy hiện **chưa có khóa**. Cần tạo khóa 32 byte dạng hex mới, thêm `SCENARIO_EXAM_CODE_ENCRYPTION_KEY` qua màn hình Environment của ứng dụng `cns-simulator-web` trong Dokploy, lưu và redeploy; sau đó kiểm tra runner và luồng tạo mã/PDF bằng phiên Giám khảo.

### 2026-09-30 — Hiển thị đúng kỳ thi sắp mở ở tab Thí sinh

- Tách trạng thái vòng đời (`draft/open/locked/...`) khỏi khả năng vào thi theo lịch: `upcoming`, `available`, `ended` và các trạng thái khóa/đóng được tính bằng giờ PostgreSQL.
- Tab `/student/scenario-exams` hiển thị kỳ thi đã mở nhưng chưa tới `opens_at`, khóa nút nhập mã cho tới giờ bắt đầu; lịch mở/đóng hiển thị cố định theo giờ Việt Nam (UTC+7).
- Bổ sung nút làm mới danh sách, nhãn trạng thái rõ ràng và thông báo hướng dẫn khi danh sách trống. Điều kiện redeem server-side vẫn yêu cầu đúng cửa sổ thời gian, không thay đổi mã hoặc dữ liệu production.
- Kiểm tra đạt: 65 test action/query, 10 test integration PostgreSQL 17.11 cô lập, typecheck, ESLint targeted và `git diff --check`; production browser QA sau deploy còn chờ xác minh.

### 2026-09-30 — Xuất PDF danh sách mã vào thi

- Bổ sung migration `0013_scenario_code_export_encryption.sql`: giữ `code_hash` cho redeem một lần và lưu thêm envelope AES-256-GCM cho mã phát hành mới; khóa runtime là `SCENARIO_EXAM_CODE_ENCRYPTION_KEY` (32 byte dạng hex), không lưu plaintext/log/DTO thường.
- Thêm endpoint admin-only `/api/scenario-exams/[examId]/codes.pdf` với `no-store`, audit `code_exported`, PDF A4 ngang có thông tin kỳ thi, lịch UTC+7, STT, họ tên, đơn vị, mã, môn, tiến độ, trạng thái và phân trang lặp header.
- Font Geist Regular/Bold và license được bundle trong `public/fonts`; PDF QA tiếng Việt 4 trang đã render và kiểm tra trực quan bằng PyMuPDF. Các mã cũ chỉ có hash/hint sẽ được ghi rõ là không khôi phục được, không tự cấp lại.
- Đã kiểm tra: encryption round-trip/tamper, route authorization/audit, migration guard, PDF generator, PostgreSQL integration, typecheck và production build. Migration `0013` đã áp dụng trên đúng database `cns_simulator` với checksum khớp; secret 32-byte đã gắn vào service, runner mới có route/font và health production 200. Gọi route chưa xác thực trả 401; browser download với tài khoản Giám khảo còn chờ xác minh.

### 2026-09-30 — Hotfix SQL và kiểm thử thực tế kỳ thi Scenario bằng mã

- Sửa lỗi tạo kỳ thi `could not determine data type of parameter $3`: khai báo kiểu text cho tham số audit JSON; sửa cùng lỗi ở audit cấp scenario (`$4`/`$5`).
- Sửa cú pháp `FILTER`/ép kiểu ở thống kê hoàn tất môn, giúp mở trang chi tiết ngay cả khi kỳ thi chưa có mã.
- Bắt đầu môn khóa session/subject trước rồi đọc lại item bằng statement riêng: request đồng thời dùng lại snapshot đã commit; không khóa nullable side của `LEFT JOIN`, không random lại. Kiểm tra deadline/trạng thái trước khi trả item.
- Revalidate đúng route mới; kiểm tra UUID/định dạng code trước SQL. Thông báo nghiệp vụ vẫn cụ thể; lỗi nội bộ được trả bằng tiếng Việt an toàn, log chỉ giữ operation/SQLSTATE, không in SQL, PII hoặc token. Không hướng dẫn nhập lại code đã tiêu thụ khi mất cookie.
- Bổ sung test action/query và integration PostgreSQL thật, kiểm tra create → open → issue → redeem → start, rollback audit, double redeem/start, pool đúng môn, cách ly theo token/code và snapshot cố định. Database test mới mỗi lượt, chỉ dùng fixture, tự xóa sau khi chạy; auth và Next cookie/cache được mock.
- CI có service PostgreSQL 17 riêng để các kiểm thử SQL được chạy bắt buộc trong `npm run test:run`. Local mặc định bỏ qua suite PostgreSQL nếu chưa cấu hình biến riêng; không coi lượt bỏ qua là đã kiểm chứng SQL.
- Kiểm tra đạt trên Node 24: lint toàn repo, typecheck, **130 file/756 test**, production build, CodeGraph sync và `git diff --check`. Trong đó có **58 test action/query mới + 9 test PostgreSQL 17.11 thật**; suite database đã chạy, không skip.
- Chạy local bằng endpoint PostgreSQL **cô lập** (user cần quyền tạo database):

  ```powershell
  $env:SCENARIO_EXAM_TEST_DATABASE_URL = 'postgresql://<test-user>:<test-password>@127.0.0.1:55432/cns_scenario_exams_test'
  npx vitest run tests/integration/scenario-exams.postgres.test.ts tests/scenario-exams/
  ```

  Suite chỉ chấp nhận host loopback và database kiểm tra tên `cns_scenario_exams_test`; không fallback sang `DATABASE_URL` hoặc `.env.local`. Mỗi lượt tự tạo database `cns_exam_test_<uuid>`, chạy migration thật và chỉ xóa đúng database do lượt đó tạo.
- Không thêm/sửa migration và không xóa hoặc thay đổi dữ liệu production. Hotfix không bao gồm runtime/nộp bài/finalize timeout/review P4/P5 đang còn dở; browser QA production vẫn phải xác minh riêng.

### 2026-09-30 — Căn chỉnh nhịp các ô nhập kỳ thi Scenario
- Căn các field form tạo kỳ thi theo cùng nhịp label → input → hint; thêm `items-start` và hint đối xứng cho các cột thời gian/tên kỳ thi.
- Kiểm tra đạt: ESLint component, typecheck và `git diff --check`.

### 2026-09-30 — Sửa lỗi truy cập tab Thí sinh khi đăng nhập tài khoản admin
- Route `/student/scenario-exams` không còn ném server error khi người dùng đang đăng nhập role admin/khác student.
- Hiển thị màn hình hướng dẫn rõ ràng yêu cầu đăng nhập tài khoản Thí sinh; session/code flow không bị thay đổi.
- Kiểm tra đạt: ESLint targeted, typecheck, `git diff --check` và production build.

### 2026-09-30 — P4 foundation: candidate code session
- Thêm entry/session cho role Thí sinh tại `/student/scenario-exams`: chọn kỳ thi, redeem mã một lần, cookie session HttpOnly riêng và hiển thị đúng module được cấp.
- `startScenarioExamSubjectAction` chọn ngẫu nhiên một membership Kiểm tra tại thời điểm bắt đầu môn, snapshot definition/revision và không random lại khi retry.
- Thêm query/session types và timer UI; submit/evidence runtime tiếp tục ở phase kế tiếp.
- Kiểm tra đạt: ESLint targeted, typecheck và focused scenario-exam tests.

### 2026-09-30 — P3: Tab Giám khảo kỳ thi bằng mã code
- Thêm route mới `/admin/scenario-exams`, tách khỏi luồng `src/lib/exams` legacy: danh sách kỳ thi, tìm kiếm, tạo kỳ thi, mở/khóa/đóng kỳ thi.
- Thêm form phát mã theo tên, đơn vị và các module được tích; hiển thị pool scenario Kiểm tra trước khi cấp mã, lưu plaintext code chỉ một lần ở giao diện.
- Thêm bảng tiến độ theo mã và module đã cấp; code/session data lấy từ domain `scenario_exam_*` mới.
- Giữ `/admin/exams` legacy để compatibility, chưa xóa hoặc chuyển dữ liệu cũ.
- Kiểm tra đạt: typecheck, ESLint targeted, production build và CodeGraph sync.

### 2026-09-30 — Sửa lỗi lưu thư viện ADS-B trên production
- Tách hẳn câu SQL chọn source theo nhánh admin/teacher trong `PUT /api/scenario-libraries`, bảo đảm số placeholder và params luôn khớp; không còn phụ thuộc predicate động cho admin.
- Thêm regression test mô phỏng lỗi bind parameter khiến giao diện báo `Không thể cập nhật thư viện kịch bản.`.
- Bổ sung migration `0012_adsb_review_assignment_support.sql` để cột Ôn tập có thể lưu assignment ADS-B; migration không xóa hay thay đổi các row hiện có.
- Kiểm tra đạt: focused API tests 7/7, ESLint, typecheck và production build.

### 2026-09-30 — Chuẩn hóa ADS-B và nền tảng kỳ thi bằng mã code (P1/P2)
- Thêm adapter Scenario Parameters ADS-B, chấp nhận dữ liệu legacy `title/easy|medium|hard` và chuẩn hóa thành `name/basic|intermediate|advanced`; giữ nguyên site/sensor, expected actions, QCMS/event log và hardware fault.
- Thêm ADS-B vào module registry/review catalog, chống card trùng trong `/authoring`, và bổ sung panel phân chia ADS-B vào hai thư viện Ôn tập/Kiểm tra trong giai đoạn chuyển tiếp.
- Tạo migration expand-only `0010_adsb_scenario_parameters_and_library.sql`: mở module constraint, tạo revision counters và backfill 17 scenario legacy vào `simulator_scenario_parameters`; không tự publish membership.
- Tạo migration `0011_scenario_code_exam_sessions.sql` cho kỳ thi code-based: kỳ thi, mã hash một lần, module được chọn, session, snapshot session item và audit event; chưa nối UI kỳ thi mới.
- Production đã chạy migration bằng runner có advisory lock/checksum: 0010/0011 apply thành công; ADS-B source = 17, ADS-B exam library = 0, bảng code/session = 0; health database 200, web/postgres healthy.
- Kiểm tra local đạt: focused tests, ESLint, typecheck, production build, `git diff --check` và CodeGraph sync. Database rehearsal local chưa chạy vì máy không có Docker/psql và Chocolatey/winget bị chặn bởi quyền Administrator.

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
