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
  - Schema & Migration: Hệ thống migration SQL portable (`database/migrations/0001–0005`), quản lý version và checksum chặt chẽ.
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
├── database/migrations/  # SQL migrations cho PostgreSQL portable (0001–0005)
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
 └── simulator_scenario_parameters        # Bộ tham số kịch bản độc lập (JSONB schema v1/v2)
```

### 4.3. Bảng tổng hợp các Route chính

| Phân hệ | Mục đích | Route URL | Mô tả chức năng |
|---|---|---|---|
| **Xác thực** | Đăng nhập & Đổi mật khẩu | `/login`, `/change-password` | Form xác thực PostgreSQL, đổi mật khẩu lần đầu bắt buộc và đổi mật khẩu chủ động |
| **Giám khảo** | Quản trị kỳ thi | `/admin/exams`, `/admin/exam-sets` | Tạo kỳ thi, cấu hình đề thi theo môn, quản lý thí sinh và giám khảo chấm |
| | Trung tâm kịch bản | `/admin/vor`, `/admin/dme`, `/admin/ads-b` | Quản lý kịch bản nghiệp vụ, chấm điểm bài nộp và xem timeline thao tác |
| | Quản lý Scenario Parameters | `/authoring` | Import/Export JSON kịch bản, cấu hình fault injection, whitelist cho từng simulator |
| **Học viên** | Vào thi chính thức | `/student/exams` | Thực hiện các kịch bản trong đề thi được phân công theo thời gian thực |
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
- **Kịch bản & Bài làm:** Mô phỏng sự cố khối nguồn, bộ dao động, công suất phát và trôi trễ; kiểm tra quy trình xử lý phục hồi của học viên qua LMI/PMDT.
- *Xem chi tiết:* [`docs/simulators/dme-320.md`](docs/simulators/dme-320.md)

### 5.6. Module Giám sát ADS-B (QCMS & Terminal Console)
- **Kiến trúc mô phỏng:** Tái lập môi trường dòng lệnh ký tự ANSI (74 cột) trạm ADS-B Côn Sơn/Cam Ranh và trung tâm QCMS. Phân định rõ hai phân quyền vận hành: `OPERATIONAL` và `MAINTENANCE`.
- **Hệ thống giám sát:** Bảng điều khiển QCMS hiển thị trạng thái cảm biến theo 4 mã màu: Green (bình thường), Yellow (mất dữ liệu tàu bay hoặc RF suy giảm), Orange (quá nhiệt cảm biến $> 55^\circ\text{C}$), Red (mất nguồn AC hoặc đứt mạng LAN).
- **Kịch bản & Chấm điểm tự động:** 10 kịch bản sự cố phần cứng chuẩn hóa; thuật toán quy hoạch động LCS (Longest Common Subsequence) so khớp chính xác từng thao tác dòng lệnh (đúng, sai, thiếu, thừa), đảm bảo tính khách quan tuyệt đối khi thi tuyển.
- *Xem chi tiết:* [`docs/simulators/ads-b.md`](docs/simulators/ads-b.md)

