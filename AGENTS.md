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
# Git & Dokploy Auto-Deploy Workflow
- **Repository phát triển mặc định:** `nhhaituhpy-hue/cns-simulation` nhánh `main`, truy cập qua remote `deploy` (`https://github.com/nhhaituhpy-hue/cns-simulation.git`). Ứng dụng này được phát triển trực tiếp trên repo này với tài khoản `nhhaituhpy-hue`.
- **Triển khai tự động (Dokploy):** Mọi commit push lên nhánh `main` của repository `nhhaituhpy-hue/cns-simulation` sẽ tự động kích hoạt quá trình build và deploy phiên bản mới trên Dokploy (Oracle Cloud VM).

