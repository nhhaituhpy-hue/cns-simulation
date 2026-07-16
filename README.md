# ADS-B Training Simulator

Ứng dụng web mô phỏng quy trình xử lý sự cố ADS-B dành cho đào tạo kỹ thuật viên. Người quản trị tạo kịch bản và ghi lại đường thao tác chuẩn; học viên quan sát trạng thái QCMS, mở ứng dụng bảo trì giả lập, thao tác trên terminal rồi nhận kết quả chấm điểm tự động.

> Đây là môi trường đào tạo xác định trước, không kết nối cảm biến thật, không mở SSH thật và không cung cấp cơ chế xác thực sản xuất.

## Chức năng chính

- Quản trị kịch bản bằng wizard năm bước: thông tin, site/sensor, vai trò, đáp án tham chiếu và sự cố phần cứng tùy chọn.
- Tối đa 8 site trong một kịch bản, 7 trạng thái sensor QCMS và tối đa 4 sensor được hiển thị đồng thời.
- Dashboard QCMS có toolbar, Event Log, Replay, General Settings, context menu và các cửa sổ Monitoring/Configuration/Status/Statistics/Site Settings.
- Terminal SA (`sysadmin`) và MA (`maintenance`) dựa trên state machine xác định trước.
- 17 màn hình terminal SA/MA dùng dữ liệu preset Côn Sơn thay cho nội dung tĩnh.
- Sơ đồ phần cứng Côn Sơn gồm 16 component và 6 signal path, kèm 10 fault preset.
- Luồng chẩn đoán kết hợp Terminal, QCMS Monitoring, Component Inspector và chấm điểm 100 điểm.
- Ghi nhận, chọn và sắp xếp hành động học viên trước khi nộp bài.
- Chấm điểm theo đúng ngữ cảnh menu, thứ tự và dữ liệu nhập đã chuẩn hóa.
- Dữ liệu mẫu và kịch bản do người dùng tạo được lưu có phiên bản trong `localStorage`.
- Giao diện tiếng Việt, hỗ trợ desktop/mobile, bàn phím, reduced motion và tương phản WCAG AA.

## Công nghệ

- Next.js 16 App Router, React 19 và TypeScript
- Tailwind CSS 4 và Phosphor Icons
- Zustand cho trạng thái phía client
- Vitest, Testing Library, Playwright và axe-core
- GitHub Actions cho lint, typecheck, unit/component test, build và dependency audit

## Chạy trên máy cục bộ

Yêu cầu Node.js 20.9 trở lên và npm. Dự án được xác minh với Node.js 24.

```bash
npm ci
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

Bốn kịch bản mẫu sẽ được tạo khi ứng dụng khởi động lần đầu. Để đưa dữ liệu về trạng thái mẫu, dùng chức năng khôi phục trong giao diện quản trị hoặc xóa khóa `adsb-training-simulator:scenarios` trong `localStorage`.

## Kiểm tra chất lượng

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run test:e2e
```

Hoặc chạy các kiểm tra chính bằng:

```bash
npm run check
```

Playwright cần Chromium ở lần đầu thiết lập:

```bash
npx playwright install chromium
```

## Cấu trúc chính

```text
src/
  app/                  Route cho landing, Admin và Student
  components/           App shell, wizard, QCMS, terminal, hardware và grading
  lib/                  Kiểu dữ liệu, menu, engine, grading và storage
  stores/               Zustand stores và kịch bản mẫu
tests/
  admin/                Kiểm thử portal quản trị
  core/                 Kiểm thử engine và grading
  e2e/                  Luồng người dùng trên Chromium
  qcms/                 Kiểm thử QCMS và accessibility behavior
  state/                Kiểm thử persistence và Zustand
  terminal/             Kiểm thử terminal và bảo vệ dữ liệu nhạy cảm
docs/
  DECISIONS.md           Quyết định kỹ thuật và sai khác đã đối chiếu
  IMPLEMENTATION_STATUS.md
```

## Quy tắc mô phỏng và bảo mật

- Username phải đúng vai trò của kịch bản; mọi password không rỗng đều được chấp nhận.
- Password không được hiển thị, lưu vào store, `localStorage`, lịch sử terminal hay dữ liệu chấm điểm.
- Đăng nhập không phải một phần của đáp án chấm điểm.
- `RETURN`, phím Enter rỗng và `0` được chuẩn hóa thành cùng một hành động; `x`/`X` thoát khỏi menu.
- Điểm số là số bước đúng chia cho tổng số bước kỳ vọng. Bài chỉ đạt khi đủ bước, đúng thứ tự và không có thao tác thừa.
- `localStorage` phù hợp với MVP một người dùng trên một trình duyệt. Để dùng nhiều người, phân quyền hoặc đồng bộ thiết bị, cần thay data adapter bằng Cloudflare D1 hoặc Supabase và bổ sung xác thực thật.

## Tài liệu nghiệp vụ đã đối chiếu

Việc mô phỏng dựa trên các tài liệu tham chiếu cục bộ sau; các PDF không được đưa vào repository:

- `QCMS_UserManual_V1.13.pdf`
- `Sensor_SA_UserManual_V3.4.pdf`
- `Sensor_MA_UserManual_V3.2.pdf`
- `ADSB_Training_Simulator_Plan.md`

Khi bản kế hoạch và hình menu trong manual khác nhau, manual là nguồn quyết định. Chi tiết được ghi tại [docs/DECISIONS.md](docs/DECISIONS.md).

## Hướng phát triển tiếp theo

1. Thay `localStorage` bằng repository adapter cho Cloudflare D1 hoặc Supabase.
2. Bổ sung đăng nhập thật và phân quyền Admin/Student.
3. Mở rộng luồng menu cấp sâu theo các manual.
4. Lưu lịch sử phiên học, tiến độ và báo cáo thống kê.
5. Thêm import/export kịch bản và triển khai nhiều lớp học.
