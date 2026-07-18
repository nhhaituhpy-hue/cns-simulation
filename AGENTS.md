<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Custom Developer Workflow (Pipeline)
- **Bước 1 (Sửa đổi):** Khi nhận được yêu cầu thay đổi giao diện hoặc logic, hãy thực hiện chỉnh sửa code trực tiếp trước tiên.
- **Bước 2 (Chờ xác nhận):** KHÔNG chạy các bộ test tự động (`npm run test:run`) hoặc build (`npm run build`) ngay lập tức. Hãy dừng lại để người dùng tự kiểm tra trực tiếp trên môi trường dev local (`npm run dev`).
- **Bước 3 (Kiểm tra lỗi):** Chỉ khi người dùng xác nhận "ok" (chấp nhận thay đổi), bạn mới tiến hành chạy kiểm tra tự động (`test:run` và `build`).
- **Bước 4 (Git & Push):** Sau khi kiểm tra tự động thành công, tiến hành `git add`, `git commit` (theo chuẩn Conventional Commits) và `git push` code lên repository.

