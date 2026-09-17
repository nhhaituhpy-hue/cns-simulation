<!-- BEGIN:nextjs-agent-rules -->
# CodeGraph Workflow
- Khi cần tìm hiểu kiến trúc, luồng xử lý, dependency hoặc vị trí cần sửa, chạy `codegraph status` trước và dùng `codegraph explore "<câu hỏi hoặc symbol>"` trước khi tìm kiếm/đọc source diện rộng.
- Nếu index không còn mới, chạy `codegraph sync` trước khi dựa vào kết quả. Chỉ dùng `codegraph index` khi cần xây dựng lại toàn bộ index.
- Giữ truy vấn hẹp theo feature, file hoặc symbol để giảm thời gian và token. Dùng `codegraph node`, `callers`, `callees` hoặc `impact` khi cần đi sâu vào một symbol cụ thể.
- Trước khi sửa logic, dùng `codegraph impact <symbol>` để xác định phạm vi ảnh hưởng nếu có symbol phù hợp. Source hiện tại vẫn là nguồn sự thật cuối cùng; luôn mở và kiểm tra file thực tế trước khi chỉnh sửa.
- Khi chuẩn bị kiểm thử thay đổi logic, dùng `codegraph affected` để tham khảo các test liên quan, sau đó áp dụng quy tắc kiểm thử tại Custom Developer Workflow bên dưới.
- Sau khi thay đổi source, chạy `codegraph sync` để cập nhật index. Không commit database hoặc artifact runtime trong `.codegraph/`; chỉ giữ `.codegraph/.gitignore`.
- Nếu CodeGraph không có kết quả phù hợp hoặc không hỗ trợ loại file cần tìm, chuyển sang `rg`/đọc source trực tiếp và không lặp lại truy vấn vô ích.

# Custom Developer Workflow (Pipeline)
- **Bước 1 (Sửa đổi):** Khi nhận được yêu cầu thay đổi giao diện hoặc logic, hãy thực hiện lập kế hoạch ngắn gọn, chờ người dùng duyệt phương án, sau đó chỉnh sửa code.
- **Bước 2 (Kiểm tra lỗi):** Tiến hành chạy kiểm tra tự động:
  - **Với thay đổi liên quan đến Logic:** Chỉ chạy các file test bị ảnh hưởng trực tiếp (ví dụ: `npx vitest run tests/exams/`) và chạy `npm run build` để kiểm tra biên dịch.
  - **Với thay đổi chỉ liên quan đến UI/CSS/HTML tĩnh:** KHÔNG cần chạy bộ test tự động toàn bộ (`npm run test:run`) hay `npm run build` để tránh mất thời gian, trừ khi thay đổi cấu trúc component lớn hoặc có nguy cơ lỗi kiểu dữ liệu.
- **Bước 3 (Cập nhật tài liệu & Git & Push):** Sau khi các kiểm tra cần thiết ở Bước 2 thành công (hoặc được bỏ qua đối với UI tĩnh), tiến hành cập nhật đầy đủ nhật ký phiên làm việc vào `README.md`. Sau đó thực hiện duy nhất một lần `git add .`, `git commit` (theo chuẩn Conventional Commits) và `git push` toàn bộ cả mã nguồn và tài liệu lên repository phát triển mặc định `nhhaituhpy-hue/cns-simulation`, nhánh `main` (qua remote `deploy`).

# GitHub Actions CI Regression Guard
- `ci.yml` chạy bằng Node 24 theo chuỗi `lint` → `typecheck` → `npm run test:run` → `build`. Khi thay đổi Next.js navigation, AppShell, MOPIENS UI hoặc test setup, phải chạy toàn bộ chuỗi này cục bộ trước khi push; không chỉ chạy test focused.
- Khi render độc lập component dùng App Router trong Vitest, phải mock đầy đủ `next/navigation` hoặc cung cấp router context. Với `Dvor220Simulator`, `Dme320Simulator` và `OperationsSoftwareSimulator`, mock tối thiểu cần có `useRouter()` (với `push`, `replace`, `back`, `forward`, `refresh`, `prefetch`) và `useSearchParams()` trả về `new URLSearchParams()` để Scenario Parameters route loader không làm test crash với lỗi `expected app router to be mounted`.
- Giữ mock router ở chính test suite chịu trách nhiệm render component để không che giấu hành vi router của các test khác.
- Kỳ vọng AppShell phải phản ánh UI hiện hành: DVOR 220 và DME 320 có nút `Quay lại trang chủ` nội tuyến, nên AppShell không render thêm nút quay lại toàn cục ở hai route này; ADS-B vẫn dùng nút quay lại của AppShell. Không khôi phục nhãn cũ `Quay lại trang trước` chỉ để làm test pass.
- Warning React về `act(...)` cần được ghi nhận và xử lý khi có tác động tới assertion, nhưng không được nhầm với test failure. Không được vô hiệu hóa test hoặc thêm `|| true` cho lint, typecheck, test hay build để làm xanh CI.

# Git & Dokploy Auto-Deploy Workflow
- **Repository phát triển mặc định:** `nhhaituhpy-hue/cns-simulation` nhánh `main`, truy cập qua remote `deploy` (`https://github.com/nhhaituhpy-hue/cns-simulation.git`). Ứng dụng này được phát triển trực tiếp trên repo này với tài khoản `nhhaituhpy-hue`.
- **Triển khai tự động (Dokploy):** Mọi commit push lên nhánh `main` của repository `nhhaituhpy-hue/cns-simulation` sẽ tự động kích hoạt quá trình build và deploy phiên bản mới trên Dokploy (Oracle Cloud VM).
