# CNS Training Simulator (Hệ thống kiểm tra mô phỏng CNS)

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

## Quy trình cập nhật video & thuyết minh lồng tiếng

Do các tệp media (video, âm thanh, poster) trên Supabase Storage được cấu hình cache immutable lâu dài, khi có sự thay đổi hoặc cập nhật các video clip mới, bắt buộc phải tăng phiên bản thư mục lưu trữ (ví dụ từ `v2` lên `v3`) để bust cache trên CDN (Cloudflare) và trình duyệt người dùng.

### Các bước thực hiện:

1. **Chuẩn bị và tạo file media mới ở local:**
   - Thay thế các file `.mp4`, `.webp` (poster), `.mp3` mới vào thư mục `public/media` (giữ nguyên tên file).
   - Nếu sinh lại video tự động bằng Python:
     ```powershell
     $env:PYTHONPATH = "C:\tmp\adsb-video-tools"; python scripts/generate_home_media_clips.py
     ```

2. **Tăng phiên bản thư mục (Bust Cache):**
   Thay đổi ký hiệu phiên bản thư mục lưu trữ (ví dụ đổi `v2` thành `v3`) trong 4 file:
   - `src/app/page.tsx`
   - `tests/layout/home-media-carousel.test.tsx` (2 vị trí)
   - `scripts/upload_home_media.js`
   - `scripts/upload_home_media.ps1`

3. **Đồng bộ lên Supabase Storage:**
   Chạy script đồng bộ của dự án để đẩy các tệp mới lên folder phiên bản mới trên Supabase:
   - Node.js: `node scripts/upload_home_media.js`
   - PowerShell: `.\scripts\upload_home_media.ps1`

4. **Triển khai lên bản Live:**
   Commit các file thay đổi đường dẫn ở local và push lên Github để Vercel tự động build và deploy lại:
   ```bash
   git add .
   git commit -m "feat(ui): upgrade media folder version to v3 for new clips"
   git push origin main
   ```

## Triển khai trên Vercel

- Repository được liên kết với Vercel để tự động triển khai khi nhánh `main` được cập nhật.
- `vercel.json` đặt vùng chạy Vercel Functions/SSR tại Singapore (`sin1`) để giảm độ trễ truy cập cơ sở dữ liệu trong khu vực.
- CDN và tài nguyên tĩnh của Vercel vẫn được phân phối trên mạng toàn cầu; người dùng nhận nội dung từ điểm hiện diện gần nhất. Thiết lập `sin1` không giới hạn CDN chỉ chạy tại Singapore.
- Sau khi triển khai, có thể kiểm tra tại **Project → Settings → Functions → Function Regions**. Cấu hình trong `vercel.json` sẽ được áp dụng cho deployment mới.

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

## Tiến trình nâng cấp v1.0

| Phase | Mô tả | Trạng thái |
|-------|-------|------------|
| 1     | Module A: Cấu hình dữ liệu Côn Sơn và Terminal template | ✅ Hoàn thành |
| 2     | Module B: Khung Toolbar legacy và 64 slot Ground Stations | ✅ Hoàn thành |
| 3     | Module C: Sơ đồ phần cứng interactive & cô lập sự cố | ✅ Hoàn thành |

## Session Log
- 2026-07-16: Hoàn thành Module A, B, C. Đã kết nối tất cả các hành động/thao tác (Monitoring, VA/VB, RR, context menu, Site Settings, Sensor Statistics) vào từng ô compact 64 slot và sửa toàn bộ lỗi kiểm thử (Unit, E2E) đảm bảo không có regression.
- 2026-07-16: Đổi tên thương hiệu hệ thống sang Hệ thống kiểm tra mô phỏng CNS. Bổ sung các tab VOR, DME, ADS-B vào trang quản lý kịch bản của quản trị viên và trang bài thực hành của học viên.
- 2026-07-17: Gỡ bỏ cns-image.webp khỏi Carousel trang chủ, tích hợp tính năng phát âm thanh thuyết minh (lồng tiếng) tiếng Việt song song đồng bộ cho các video clip và sửa lỗi kiểm thử định tuyến.
- 2026-07-17: Đồng bộ thành công 4 video, 4 poster (webp) và 2 file âm thanh thuyết minh (.mp3) lên Supabase Storage qua SDK với chế độ upsert; frontend tự động sử dụng đường dẫn CDN từ Supabase Storage thông qua cấu hình URL động.
- 2026-07-17: Sửa lỗi video 15s bị lệch pha so với âm thanh lồng tiếng bằng cách chạy script Python để vẽ lại toàn bộ 4 video hướng dẫn dài 30s và đồng bộ ghi đè lên Supabase Storage qua SDK Node.js.
- 2026-07-17: Cải tiến HomeMediaCarousel: Khi video kết thúc tự động ở slide cuối, âm thanh lồng tiếng (.mp3) vẫn tiếp tục phát cho tới khi kết thúc chứ không bị dừng đột ngột.
- 2026-07-17: Đồng bộ thành công 3 kịch bản sự cố giả lập DVOR 1150A và 3 kịch bản sự cố DME 1119A lên cơ sở dữ liệu Cloud Supabase, đi kèm đầy đủ cấu trúc overrides, checkpoints và Hardware Diagnosis Task.
- 2026-07-17: Bổ sung tính năng Xóa thao tác PMDT đã ghi nhận ở cả giao diện học viên VOR và DME, tự động sắp xếp lại chỉ số sequence liền mạch. Đã git push lên GitHub.
- 2026-07-17: Lên kế hoạch đổi tên thư mục repository gốc từ `ADS-B test` sang `cns-simulator` (Khuyến nghị Phương án A: Người dùng tự đóng IDE và đổi tên thủ công ngoài Windows Explorer).
- 2026-07-17: Hoàn tất đổi tên repo sang `cns-simulator`. Cập nhật cấu hình ESLint (`eslint.config.mjs`) để bỏ qua thư mục `scripts/` giúp kiểm tra chất lượng (lint, typecheck, test, build Next.js) vượt qua 100% không có lỗi.
- 2026-07-17: Session ended at Phase N (Seed Scenarios & Event Deletion Feature)
  - Done: Đổi tên repo thành công; Sửa cấu hình ESLint bỏ qua thư mục scripts; Xác minh hệ thống chạy ổn định 100% với 191 bài test và build Next.js thành công.
  - Remaining: Tiếp tục triển khai các tính năng mới theo roadmap.
  - Note for next session: Hệ thống hiện tại đã cực kỳ ổn định, sẵn sàng cho các pha phát triển tiếp theo.


## Hướng phát triển tiếp theo

1. Thay `localStorage` bằng repository adapter cho Cloudflare D1 hoặc Supabase.
2. Bổ sung đăng nhập thật và phân quyền Admin/Student.
3. Mở rộng luồng menu cấp sâu theo các manual.
4. Lưu lịch sử phiên học, tiến độ và báo cáo thống kê.
5. Thêm import/export kịch bản và triển khai nhiều lớp học.

