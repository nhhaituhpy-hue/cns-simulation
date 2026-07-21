<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Understand Anything Workflow
- Khi cần tìm hiểu kiến trúc, luồng xử lý, quan hệ phụ thuộc hoặc vị trí cần sửa trong codebase, hãy sử dụng skill `understand-anything:understand-chat` và tra cứu `.ua/knowledge-graph.json` trước khi đọc source diện rộng.
- Trước khi dựa vào knowledge graph, phải kiểm tra `project.gitCommitHash` trong graph so với Git `HEAD`, staged changes, working-tree changes và untracked project files. Bỏ qua các artifact phát sinh bên trong `.ua/` khi đánh giá độ mới.
- Nếu source đã thay đổi sau lần phân tích gần nhất, phải cảnh báo rằng graph có thể thiếu thay đổi và đề xuất chạy lại `understand-anything:understand` để cập nhật incremental trước khi đưa ra kết luận kiến trúc quan trọng.
- Chỉ đọc các node, edge, layer và tour liên quan đến câu hỏi; không nạp toàn bộ knowledge graph nếu không cần thiết.
- Khi triển khai thay đổi, dùng graph để xác định phạm vi ảnh hưởng và các dependency, nhưng luôn kiểm tra source thực tế trước khi chỉnh sửa. Source code hiện tại là nguồn sự thật cuối cùng.

# Custom Developer Workflow (Pipeline)
- **Bước 1 (Sửa đổi):** Khi nhận được yêu cầu thay đổi giao diện hoặc logic, hãy thực hiện chỉnh sửa code trực tiếp trước tiên.
- **Bước 2 (Chờ xác nhận):** KHÔNG chạy các bộ test tự động (`npm run test:run`) hoặc build (`npm run build`) ngay lập tức. Hãy dừng lại để người dùng tự kiểm tra trực tiếp trên môi trường dev local (`npm run dev`).
- **Bước 3 (Kiểm tra lỗi):** Chỉ khi người dùng xác nhận "ok" (chấp nhận thay đổi), bạn mới tiến hành chạy kiểm tra tự động:
  - **Với thay đổi liên quan đến Logic:** Chỉ chạy các file test bị ảnh hưởng trực tiếp (ví dụ: `npx vitest run tests/exams/`) và chạy `npm run build` để kiểm tra biên dịch.
  - **Với thay đổi chỉ liên quan đến UI/CSS/HTML tĩnh:** KHÔNG cần chạy bộ test tự động toàn bộ (`npm run test:run`) hay `npm run build` để tránh mất thời gian, trừ khi thay đổi cấu trúc component lớn hoặc có nguy cơ lỗi kiểu dữ liệu.
- **Bước 4 (Cập nhật tài liệu & Git & Push):** Sau khi các kiểm tra cần thiết ở Bước 3 thành công (hoặc được bỏ qua đối với UI tĩnh), tiến hành cập nhật đầy đủ nhật ký phiên làm việc vào `README.md` (và tệp `walkthrough.md` nếu có). Sau đó thực hiện duy nhất một lần `git add .`, `git commit` (theo chuẩn Conventional Commits) và `git push` toàn bộ cả mã nguồn và tài liệu lên repository.
