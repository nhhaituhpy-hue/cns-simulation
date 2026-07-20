<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Custom Developer Workflow (Pipeline)
- **Bước 1 (Sửa đổi):** Khi nhận được yêu cầu thay đổi giao diện hoặc logic, hãy thực hiện chỉnh sửa code trực tiếp trước tiên.
- **Bước 2 (Chờ xác nhận):** KHÔNG chạy các bộ test tự động (`npm run test:run`) hoặc build (`npm run build`) ngay lập tức. Hãy dừng lại để người dùng tự kiểm tra trực tiếp trên môi trường dev local (`npm run dev`).
- **Bước 3 (Kiểm tra lỗi):** Chỉ khi người dùng xác nhận "ok" (chấp nhận thay đổi), bạn mới tiến hành chạy kiểm tra tự động:
  - **Với thay đổi liên quan đến Logic:** Chỉ chạy các file test bị ảnh hưởng trực tiếp (ví dụ: `npx vitest run tests/exams/`) và chạy `npm run build` để kiểm tra biên dịch.
  - **Với thay đổi chỉ liên quan đến UI/CSS/HTML tĩnh:** KHÔNG cần chạy bộ test tự động toàn bộ (`npm run test:run`) hay `npm run build` để tránh mất thời gian, trừ khi thay đổi cấu trúc component lớn hoặc có nguy cơ lỗi kiểu dữ liệu.
- **Bước 4 (Cập nhật tài liệu & Git & Push):** Sau khi các kiểm tra cần thiết ở Bước 3 thành công (hoặc được bỏ qua đối với UI tĩnh), tiến hành cập nhật đầy đủ nhật ký phiên làm việc vào `README.md` (và tệp `walkthrough.md` nếu có). Sau đó thực hiện duy nhất một lần `git add .`, `git commit` (theo chuẩn Conventional Commits) và `git push` toàn bộ cả mã nguồn và tài liệu lên repository.

