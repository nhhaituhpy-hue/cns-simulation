# Hệ thống kiểm tra mô phỏng CNS (CNS Simulation Lab)

Ứng dụng web phục vụ xây dựng kịch bản, thực hành chẩn đoán sự cố kỹ thuật và sát hạch/đánh giá kỹ thuật viên trên các nhóm thiết bị bảo đảm hoạt động bay (CNS): **VOR**, **DME** và **ADS-B**.

---

## Trạng thái CI GitHub

- Theo yêu cầu chủ repository, workflow **CI** chỉ chạy thủ công qua **Actions → CI → Run workflow**; không tự chạy khi push hoặc mở pull request.
- Việc này không tắt webhook triển khai Dokploy và không thay đổi các lệnh lint, typecheck, test, build cục bộ.

## Lighthouse: tải trang chủ và trợ năng

- Preload responsive ảnh hero được phát ra ngay ở AppShell, trước session boundary; dùng `getImageProps` cùng `srcSet`/`sizes` với ảnh hiển thị và `fetchPriority="high"`. Ảnh không còn phải đợi các consumer sau gate hydrate mới được phát hiện. Không đưa nội dung riêng tư ra ngoài gate, không đổi ảnh/crop/kích thước, engine hoặc chấm điểm.
- Carousel dùng nhóm các nút chọn `aria-pressed` và một vùng chi tiết có ID ổn định, không dùng `tablist` chứa lẫn link hành động. Giữ chuyển thiết bị bằng nút, bàn phím, wheel/drag và các link simulator/sơ đồ khối.
- Logo đỏ/xanh có màu theo nền tối/sáng với tương phản tối thiểu 4.5:1; tên trợ năng của thương hiệu/tài khoản bao gồm nội dung nhìn thấy. Không đổi bố cục hoặc quyền điều hướng.
- Regression gồm axe `aria-required-children`/`aria-required-parent`, liên kết `aria-controls`/`aria-labelledby`, tương phản, nhãn và SSR preload khi consumer riêng tư vẫn bị chặn. Release cần Node 24 lint/typecheck/full suite/build, đọc lại deployment/health và Lighthouse trên URL đã đăng nhập; điểm Lighthouse không thay thế kiểm tra nghiệp vụ.

## Hiệu chỉnh vít Sideband DVOR 1150A — phiên 23/10/2026

- Chọn đúng module trên cabinet/schematic rồi bấm vít **R1–R6**; Enter/Space mở, hai nút xoay cập nhật tức thời vít/tua-vít và số đo. Dialog native giữ focus, đóng bằng vùng ngoài, Escape hoặc ×. State tách theo **1A4A1, 1A4A2, 1A4A6, 1A4A7** và từng vít; giữ khi đóng/mở hoặc đổi module trong trang, reset khi rời/tải lại trang. Không ghi engine RF, store kỳ thi, evidence, server hay điểm.
- **R3/R6 PWR ADJ:** mini **WATTMETER**, không PMDT; dải huấn luyện người dùng chọn **1–5 W**, mặc định **3 W**, thuận chiều tăng/ngược chiều giảm. Quy ước UI: góc tương đối −180°…+180°, mỗi lần 15°, `P = 3 + góc/90` W; chặn cả góc và công suất tại biên nên đảo chiều có hiệu lực ngay. Không phải dải vận hành hoặc tỷ lệ W/độ của hãng.
- **R2/R5 PWR CAL:** màn hình **PMDT · CAL** hiệu chỉnh riêng số đọc của kênh tương ứng, vẫn hiện công suất tham chiếu không đổi. Quy ước minh họa `PMDT = công suất tham chiếu × (1 + góc/900)`, không mô phỏng điện áp detector TP2/TP8 hoặc dạng sóng thành một giá trị DC giả. **R1/R4 PHS OFFSET:** hiển thị Mean Phase Control Voltage **TP4/TP10** theo `6 + góc/45` VDC, không công suất; dải minh họa 2–10 VDC. Chiều tăng và tỷ lệ góc của CAL/PHS chỉ là quy ước đào tạo, manual không quy định; không suy ra pha RF hoặc trạng thái khóa vòng.
- Nguồn đối chiếu: `tailieu_dvor1150A_selex.pdf`, Model 1150A Rev. E (March 2012), **Table 3-14, trang in 3-74/PDF 192** ghi R3/R6 “Clockwise increases power.” R1 dùng TP5 0.9 VDC với TP4 2–10 VDC; dòng R4 ghi **TP7** 0.9 VDC với TP10 2–10 VDC (giữ nguyên TP7 theo bảng, không tự sửa thành TP11). Các giá trị này là tham chiếu alignment, không phải số đo vòng khóa được UI chứng minh. **§6.4.6, trang in 6-10/PDF 210** dùng wattmeter phần tử **5 W**, chỉnh PMDT khớp máy đo ngoài **±10%**; không suy từ phần tử 5 W ra giới hạn chính thức 1–5 W. Không đưa manual riêng tư vào Git.
- Đã xác minh trên instabox-ci, Node 24.22.1: **19 file / 120 test passed** (gồm 11 test mới), typecheck, ESLint focused và production build **93/93** đạt. Chromium harness đạt ở **1440×1000, 390×844, 320×568**: native modal/focus-return, Enter/Space, Escape/click ngoài, giữ state, tách occurrence và cả sáu vít; dialog không tràn ngang, không page error hoặc request ghi. Các suite PMDT cũ có warning `act(...)`; không chạy full suite trong phạm vi UI này. Parent chạy lại độc lập 11 test mới, typecheck và browser harness trên instabox-ci, tất cả đạt; review source không phát hiện blocker. QA route đã đăng nhập trên production là gate riêng sau phát hành.
- Kiểm thử tập trung: `tests/vor/sideband-adjustment.test.tsx` (tương tác thật qua DvorBlockDiagram), `tests/vor/sideband-adjustment-model.test.ts`; browser harness `node scripts/verify-sideband-browser.mjs` dùng component thật và CSS thật, Next Image không tối ưu trong harness. Chạy Node 24 trên **instabox-ci**, không chạy tác vụ nặng trên Oracle. Harness không thay thế QA route Next.js đã đăng nhập/production.

## Hiệu năng ảnh và mở simulator

- Bản standalone phải chứa native binary/libvips của Sharp (`outputFileTracingIncludes` chỉ thêm `node_modules/@img/sharp-*`). Docker runner chạy `scripts/verify-image-runtime.mjs` với quyền `nextjs` ngay khi build: phải resize thật và xuất WebP, không chỉ `require` hoặc health HTTP200.
- Ảnh catalog dùng cùng tài sản/metadata cũ nhưng URL có `imageRuntime=1` để tránh bản PNG gốc đã bị optimizer lỗi lưu cache immutable. Không thay ảnh, crop, màu sắc hay dữ liệu thiết bị. Kiểm tra ảnh qua `/_next/image` bằng MIME, kích thước sau decode, số byte và `naturalWidth` trên trình duyệt; HTTP200 đơn lẻ không chứng minh tối ưu thành công.
- Nút **Mở simulator** bắt đầu điều hướng ngay trong click handler, bỏ timer trang trí 1 giây; giữ trạng thái đang mở và khóa click trùng. Không sửa engine/store/chấm điểm hoặc khởi tạo dữ liệu.
- Kiểm tra local: `npm run build` rồi `node scripts/verify-image-runtime.mjs .next/standalone`; release vẫn cần ảnh thực trên web live và kiểm tra điều hướng desktop/mobile. Không restart AI worker cho bản vá web này.

## Giao diện gọn và cấu hình endpoint AI

- Áp dụng nguyên tắc **“Tránh các nhãn phụ và mô tả không cần thiết. Hãy để bố cục tự giải thích.”** ở trang chủ, catalog Simulator/Kịch bản/Ôn tập và trình tạo kịch bản. Bỏ nhãn `ready`, phân loại lặp, mô tả catalog và hướng dẫn hiển nhiên; dùng hành động **Mở simulator**, **Mở kịch bản**, **Vào ôn tập**. VHF/VSAT vẫn báo **Đang hoàn thiện**, không trở thành tính năng đã triển khai.
- Giữ nhãn biểu mẫu, điều khiển/keyboard, cảnh báo/lỗi, giới hạn upload, thông báo tài liệu gửi dịch vụ AI bên ngoài, quyền truy cập và ranh giới **chưa xuất bản**. Không thay engine, store, barem, snapshot, dữ liệu hay logic chấm thi.
- `CNS_AI_BASE_URL` chấp nhận chính xác `https://cliproxy.cnsvn.com/v1` và endpoint VN cũ; giữ mặc định cũ khi không cấu hình. Chuẩn hóa một dấu `/` cuối, dùng đúng endpoint đã chọn ở cả loader và transport. Vẫn từ chối host/port/path tùy ý, credentials/query/fragment, HTTP và redirect; không đổi API key/model. Chỉ worker gọi provider; web không cần redeploy env AI để thay endpoint worker.
- Regression kiểm tra endpoint mới/cũ, URL không an toàn, hành vi chọn module, điều hướng/carousel, mở modal không tự tạo job, nhãn/cảnh báo bảo mật và các thao tác kịch bản. Kiểm tra phát hành dùng Node 24, toàn bộ suite với PostgreSQL 17 cô lập, lint/typecheck, build web và worker; kết quả live được xác minh riêng sau deploy.

## Màn hình Ôn tập ba cột

- Bài đang làm của sáu thiết bị dùng bố cục desktop **1 : 2,5 : 1**: trái mô tả đầy đủ tình huống; giữa simulator native; phải vùng gợi ý lớn, nút **Bước 2 · Xác định phần cứng** và một nút **Nộp bài ôn tập**. Mobile xếp dọc, simulator cuộn trong khung; không thu nhỏ chữ/điều khiển native.
- Bước 2 dùng gate/bằng chứng native của từng kịch bản. MOPIENS DVOR 220/DME 320 chưa có bước chọn phần cứng native nên nút báo rõ chưa hỗ trợ; không mô phỏng giả thay card. ADS-B mở đúng QCMS/Terminal của snapshot Ôn tập, không mở lab terminal độc lập hoặc hydrate catalog nháp. Lựa chọn phần cứng chỉ lưu vào lượt làm, không tự nộp.
- **Nộp bài** lưu snapshot/evidence một lần rồi tự đọc nhận xét worker, không còn nút “AI nhận xét bài làm” riêng trước nộp. Khóa thao tác native khi đang nộp/đã nộp; đọc lại kết quả sau reload theo identity, scenario và membership. Có thể bắt đầu lượt mới bằng reset native. Payload và Idempotency-Key được giữ khi lỗi mạng chưa rõ; khi barem được công bố lại, lượt đang làm bị từ chối thay vì chấm nhầm đáp án mới.
- **Gợi ý từ AI** dùng queue riêng `POST/GET /api/ai/practice-hints`, không giả lập submission. Câu hỏi kiến thức/cách sử dụng tra kho đúng thiết bị; AI chỉ chọn ID đoạn trích do server tạo, câu trả lời giữ nguyên văn kèm tên tài liệu, trang/mục và hash nguồn; tách câu bằng Unicode sentence boundary để không cắt mất số thập phân hoặc tiền tố giá trị đo; bỏ soft-wrap PDF chỉ trong projection tìm ranh giới, rồi cắt từ nguồn gốc nên quote giữ nguyên cả xuống dòng. Không có đoạn trả lời phù hợp thì báo thiếu nguồn, không chuyển thành gợi ý xử lý không liên quan. Ô câu hỏi có nút **Hỏi AI**; để trống dùng **Gợi ý một bước** từ engine và bằng chứng hiện tại.
- Câu hỏi đăng nhập huấn luyện được phân biệt với credential thật: native và tutor dùng cùng định nghĩa tài khoản mô phỏng của từng module, trả mặc định có nhãn phạm vi và lưu ý khi tài khoản runtime có thể đã đổi; ADS-B không bịa mật khẩu cố định. Nhánh server-only chỉ trích cặp training mặc định khớp chính xác trong manual đúng model; không mở quarantine generic, không gửi cặp login tới model. Chuỗi có giá trị credential thật bị loại trước POST và ở enqueue/worker. Không tự Apply, nộp bài hoặc đổi điểm.
- Mỗi tài khoản tối đa 3 job pending, 12 yêu cầu/giờ; retry giữ payload/key và quyền đọc bị ràng buộc owner/publication. Worker/API giữ notice kỹ thuật nhưng UI không lặp dài; giữ câu trả lời/bước gợi ý thực, câu hỏi, thao tác, nguồn tham khảo, thông báo gửi dữ liệu ra dịch vụ AI và trạng thái/lỗi. Thiếu rubric không dựng quy trình/số bước đúng. Provider lỗi ở nhánh gợi ý bước dùng nhãn **Gợi ý hệ thống · AI chưa khả dụng.** Định nghĩa/rubric/raw logs và credential hệ thống không gửi tới provider.
- Tương thích tab còn mở khi nâng cấp: UI mới yêu cầu DTO v2 qua header; tab cũ vẫn nhận answer qua định dạng gợi ý cũ. Retry cùng body/Idempotency-Key đã được phiên bản cũ nhận vẫn đọc job ban đầu, không tạo lại; thay payload/run/publication vẫn xung đột.
- Migration additive **0018_practice_ai_hints.sql** chỉ thêm queue gợi ý; worker cần bản mã mới. Luồng thi chính thức và free simulator giữ riêng, không hiển thị tutor/submit Ôn tập.

## Phân loại thư viện ngay trong bảng kịch bản

- Bỏ bảng “Cài đặt thư viện” riêng; từng dòng bảng Kịch bản có hai cột gọn **Ôn tập** và **Kiểm tra**, checkbox tiêu đề chọn tất cả có tooltip/nhãn hỗ trợ truy cập. Có thể chọn một hoặc cả hai. ADS-B ánh xạ ID legacy sang UUID nguồn canonical, không gửi nhầm ID hiển thị.
- Tích/bỏ tích hoặc chọn tất cả tự lưu ngay bằng delta `PATCH`, không nút Apply. Chỉ thêm/gỡ các ID vừa chọn; giữ nguyên membership, định nghĩa, rubric và assignment của bài đã xuất bản khác, kể cả nguồn đã lưu trữ. Khóa thao tác khi đang tải/lưu, gửi revision thư viện, đọc lại server sau lưu và phục hồi trạng thái thực khi lỗi/xung đột; không tự retry ghi khi kết quả mạng chưa rõ.
- Chỉ giữ **Tạo kịch bản bằng AI** ở vùng tạo bài, bỏ nút Thêm/tạo thủ công bên cạnh và nút tạo lặp ở ADS-B trống. Cột **Thao tác** chỉ có hai icon SVG **mở simulator** và **xóa**, không chữ; giữ tooltip, aria-label và xác nhận xóa. Bấm tên bài ở bảng native để mở chi tiết, sửa nhanh hoặc tải JSON; ADS-B mở đúng QCMS của bài đã chọn thay vì lab độc lập. Bảng cuộn ngang trong khung trên mobile.

## Sửa tương phản ô đăng nhập

- Hai ô tài khoản/mật khẩu dùng nền trắng đục, chữ và con trỏ màu xanh đen; màu ký tự, dấu che mật khẩu và WebKit text fill không còn phụ thuộc theme của trang. Icon và nút hiện/ẩn mật khẩu dùng màu tối, focus viền xanh rõ.
- Chỉ đổi giao diện input; giữ nguyên autocomplete, che/hiện mật khẩu và luồng xác thực.

## Tạo kịch bản bằng AI — trình hướng dẫn từng bước

- Từ trang **Kịch bản** của sáu thiết bị, chọn **Tạo kịch bản bằng AI** rồi chọn **Tải tài liệu** hoặc **Mô tả tình huống** trước khi mở modal. Mặc định native chỉ làm nền nội bộ; các editor/đường dẫn tạo thủ công chuyên biệt vẫn giữ nguyên, không đặt nút tạo thứ hai tại danh sách.
- AI đối chiếu tài liệu đúng thiết bị, dựng **tình huống, triệu chứng, nguyên nhân, đáp án xử lý và rubric có phiên bản**. Các giá trị huấn luyện chưa có trong manual được ghi rõ là giả định mô phỏng, không phải giới hạn của hãng. Nguồn `reference-only` không được trình bày như tài liệu hãng.
- Native compiler kiểm tra schema, guard, thao tác và kết quả khôi phục; không chấp nhận chỉ đổi tên preset hoặc tắt/bypass cảnh báo thay cho sửa cấu hình. ADS-B/MOPIENS kiểm chứng theo phạm vi native action/config replay; không suy ra đã sửa phần cứng hay GPS khi engine chưa mô phỏng được.
- **Xem thử** hiển thị triệu chứng, đáp án từng bước, tiêu chí đạt và quote nguyên văn kèm trang/mục, SHA-256. **Chỉnh sửa nâng cao** mở form native khi cần; đổi cấu hình hoặc mục tiêu làm mất hiệu lực bản kiểm chứng cũ, phải yêu cầu soạn lại trước khi lưu.
- Modal ba cột `1 : 2 : 1` ở desktop, xếp một cột trên mobile; nút chọn tệp tách khỏi khung trạng thái. Hủy hộp chọn tệp không đóng modal. Mở modal không tự tạo thêm nháp.
- Có **Lưu nháp**, tiếp tục bản nháp và retry dùng lại tài liệu trên server. Phản hồi chỉ giải thích không trở thành proposal chặn thao tác. Khi AI đang xử lý và có chỉnh sửa chưa lưu, người dùng chọn giữ bản chỉnh hoặc bỏ riêng phần chưa lưu để đóng; bản nháp/công việc server không bị xóa âm thầm.
- **Lưu kịch bản** chỉ ghi nguồn chưa xuất bản sau kiểm chứng và xác nhận; không tự Apply vào simulator, không phân Ôn tập/Kỳ thi. ADS-B ghi canonical/legacy nguyên tử và giữ rubric sau đồng bộ. Sau lưu có **Tải JSON đầy đủ** và **Mở trong simulator**.
- Native schema của DVOR1150/DVOR1150A/DME1119A, MOPIENS và ADS-B vẫn riêng biệt. Không tạo RF physics, phần cứng, lệnh hoặc bằng chứng thao tác thay học viên. Giám khảo kiểm tra bài trước khi xuất bản.
- Durable sessions/analysis dùng **0016_ai_authoring_sessions.sql**; rubric/snapshot/nhận xét tự động bổ sung **0017_scenario_blueprints_feedback.sql**. Queue generation cũ và lịch sử nháp giữ tương thích. API kiểm tra admin/ownership/quota/idempotency/revision; worker có lease/fencing và kiểm tra lại quyền khi hoàn tất.
- File riêng tư tối đa 5 tệp, 10 MiB/tệp, tổng 25 MiB; PDF tối đa 200 trang, scan cần OCR. Parser giữ ZIP/local-central/CRC/overlap checks, XML budgets, tiến trình con credential-free heap192MiB/RSS watchdog256MiB/timeout30s. Không nới guard để nhận Word mẫu.
- Corpus trích xuất riêng giữ SHA-256, nhãn trang/mục và quote nguyên văn. Chapter chứa credential chỉ được dùng qua excerpt an toàn có ranh giới; vùng credential/lân cận bị loại, key material không xác định ranh giới làm cả segment bị loại. Tài liệu upload cũng được lọc trước blueprint/baseline/guidance: bỏ nguyên đoạn có nhãn credential kể cả giá trị xuống dòng, đồng thời từ chối citation đó ở compiler. Tên/mục/đoạn chỉ rõ model khác không được dùng làm bằng chứng cho thiết bị hiện tại; tài liệu nhiều thiết bị cần đoạn cục bộ đúng model. Không đưa manual riêng tư vào Git/public assets.
- AI/provider chỉ hỗ trợ trong phạm vi đã kiểm chứng; thiếu manual, mục tiêu mơ hồ hoặc tình huống ngoài engine phải yêu cầu bổ sung/báo rõ. Không tự đổi nguồn cũ, default hệ thống, điểm thi, n8n hoặc keys.
- Release gate: Node24 lint/typecheck/full suite, PostgreSQL17 cô lập, worker/Next build, native six-module payload probes và review exact candidate; backup/restore/rehearsal trước migration. GitHub CI vẫn **manual-only**. Không coi fixture browser hay health endpoint là bằng chứng toàn luồng production.

### Tái tạo mẫu Word

Dùng `scripts/export-ai-authoring-forms.mts` để xuất projection baseline của các form và `scripts/generate-ai-authoring-templates.py` (python-docx) để tạo sáu tệp. Lệnh ở đầu script export. Intermediate manifest không được publish; giữ nguyên guard của production extractor. Không sửa thủ công bounds/default riêng trong generator.

### Kho tài liệu tham chiếu riêng tư cho hướng dẫn từng bước (`CNS_AI_KNOWLEDGE_DIR`)

- Dùng `scripts/build-device-knowledge.mjs /absolute/sources.json /absolute/new-private-directory` để trích text layer theo trang (PDF/DOCX/MD) từ các tài liệu kỹ thuật gốc kèm SHA-256 gốc, SHA-256 từng đoạn và số trang PDF. Không đóng gói các tài liệu bản quyền vào Git hoặc public assets.
- Worker đọc corpus trong hướng dẫn và dựng blueprint từ mô tả/tài liệu, qua `src/lib/ai/knowledge/retrieve.ts` và `context.ts`; kho này không tự thay baseline hay điểm. Thiếu cấu hình/toàn vẹn sai thì dựng bài mới phải báo thiếu nguồn an toàn, không tự bịa đáp án. Guidance cũ vẫn có thể trả giải thích theo phạm vi native.

### AI nhận xét bài làm trong Ôn tập và Chấm bài của Giám khảo

- **Ôn tập cả sáu thiết bị:** **Nộp bài** ghi một submission bất biến và outbox job nguyên tử (`POST /api/ai/practice-submissions`, `Idempotency-Key`). Worker tự nhận xét từ snapshot/rubric, UI tự hiển thị và tải lại được qua `GET /api/ai/attempt-feedback`. Thử lại lỗi mạng giữ nguyên payload/key; bắt đầu lượt mới xóa con trỏ kết quả cũ. Gợi ý tức thời `/api/ai/practice-feedback` vẫn tương thích nhưng chỉ đối chiếu tất định, không được coi là đã nộp bài hay gọi model trong web.
- **Kỳ thi:** code-based và RPC legacy enqueue feedback cùng transaction nộp/timeout, không chặn nộp vì AI. Redeem mã ghi owner nguyên tử; phiên cũ có owner code NULL dùng owner phiên đã xác thực, không tự backfill hoặc chấp nhận owner mâu thuẫn. Đọc/sửa phiên cần đúng tài khoản và token của mã, không chọn phiên chỉ theo tài khoản. Server finalizer và worker sweep đóng phiên quá hạn nguyên tử, chỉ dùng evidence đã lưu; giữ bài đã nộp/điểm, không cấp bài giả cho môn chưa bắt đầu. Cookie token mới giữ tới deadline +24h để xem nhận xét, không kéo dài quyền sửa bài; cookie cũ đã hết hạn không tự phục hồi. Student chỉ xem chi tiết sau khi server xác nhận kết thúc toàn phiên/lượt; giám khảo được đọc bài đã nộp. Revocation/quyền hiện tại vẫn kiểm tra ở claim/heartbeat/completion/read.
- Counts như **4/6** từ bước bắt buộc của rubric versioned và bằng chứng native có thứ tự, không do LLM đếm hay suy từ số alarm. Tách bước đúng/thiếu/sai/chưa đủ bằng chứng, điều chỉnh ngoài phạm vi và thao tác lặp. Trạng thái cuối đúng không tự chứng minh quy trình; bài lịch sử thiếu rubric/log giữ **UNVERIFIED** thay vì dựng lại đáp án từ nguồn mới.
- Snapshot nguồn/rubric được đóng băng khi xuất bản/assignment/bắt đầu thi và khi nộp Ôn tập. Sửa nguồn chỉ làm rubric nguồn mất hiệu lực, không thay snapshot cũ. MOPIENS Apply, DVOR220 Helper Apply và DVOR1150 Apply/bypass mới lưu before/after effective, run scope và sequence; log cũ thiếu dữ liệu vẫn đọc được nhưng không coi là bằng chứng mới. Sideband tracking tự tính được đánh dấu riêng với trường người học chỉnh: giữ proof khôi phục nhưng không tự gán thay đổi suy ra thành thao tác dư của học viên.
- AI chỉ chọn diễn giải được ràng buộc với step/evidence/citation; không thay technical status, factual arrays, counts hoặc điểm chính thức. Provider lỗi/quá hạn thì dùng báo cáo tất định. Giám khảo có thể đưa nhận xét vào ô soạn rồi tự sửa/lưu điểm; không tự ghi điểm.

## Nhật ký phiên 20/10/2026 — gia cố kỳ thi PostgreSQL

- Tái hiện trong PostgreSQL 17 cô lập: các RPC lưu thí sinh/giám khảo/điểm gọi `public.current_app_role()` chưa tồn tại; bổ sung migration **0014** chỉ thêm resolver, không sửa 13 migration đã áp dụng hoặc dữ liệu bài thi.
- Resolver lấy role từ user đang hoạt động qua actor UUID transaction-local, mặc định từ chối khi không có actor hợp lệ. Helper server-only lấy actor từ phiên xác thực, dùng cùng client/transaction cho RPC và trigger; không nhận role/admin từ trình duyệt và không lưu role vào session connection.
- Sửa tham số JSONB của bộ đề, phân môn và giám khảo: serialize JSON rõ ràng thay vì để node-pg chuyển JavaScript array sang PostgreSQL array.
- Bổ sung kiểm thử SQL thật cho luồng kỳ thi legacy, bảo toàn evidence/điểm 0/retry/hồ sơ đã lưu trữ, từ chối tài khoản không đủ quyền và cách ly actor giữa commit/rollback/kết nối đồng thời. Suite code-based hiện có cũng chạy với database kiểm thử thật, không dùng DB production.
- Đồng bộ `.node-version` về Node 24 theo CI và Dockerfile. Chi tiết release/migration an toàn tại `database/README.md`; **đã phát hành bản `3b590ad` với migration 0014 và production health được xác minh**.
- Kiểm tra trên Node 24.22.0: lint, typecheck và production build đạt; **920 test passed, 0 skipped**, gồm 12 test integration legacy mới và 25 test integration code-based chạy trên PostgreSQL 17 cô lập. Không coi đây là xác minh browser production hoặc bằng chứng mọi rủi ro vận hành đã hết.

## Nhật ký phiên 19/10/2026 — rà soát Light Gray Mode

- Sửa `/simulator` và `/simulator/` dùng light theme; trang chủ và các màn hình thiết bị `/simulator/*` tiếp tục dùng dark theme. Thêm test chuyển route để tránh tái phát lỗi nền tối của catalog.
- Thay dòng chữ chờ tải trong `ScenarioLibraryControls` bằng 4 hàng skeleton xen kẽ màu, có `aria-busy`, thông báo cho trình đọc màn hình và hỗ trợ giảm chuyển động. Không thay đổi API hay quy trình lưu thư viện.
- Bỏ class `!bg-slate-200`/`!border-slate-400` ghi đè trạng thái checkbox; xác nhận trên trình duyệt nền checked là `rgb(2, 132, 199)` và dấu ✓ hiển thị.
- Khung tiêu đề xem trước terminal và header ADS-B dùng token theme; giữ nền màn hình terminal để mô phỏng thiết bị, không đổi engine hay luồng vận hành.
- Kiểm tra trình duyệt: `/simulator` và `/authoring/dme-320` dùng light theme, nền trang `#f5f7f9`; trang chủ vẫn dark. Trang thư viện local đang không có scenario nên chưa xác nhận trực quan trạng thái tải với dữ liệu thật; bổ sung test dùng response chờ để kiểm tra skeleton và checkbox sau tải.
- Kiểm tra trên Node 24.18.0: `npm run check` đạt toàn bộ lint → typecheck → test → build; 145 file / 883 test passed, 1 file / 25 test skipped; build tạo 86/86 trang. Không coi phiên này là hoàn tất chuyển theme toàn bộ ứng dụng; các màn hình còn lại cần được rà soát riêng.

## 1. Thông tin chung về dự án

### 1.1. Mục đích ứng dụng
- **Mô phỏng chân thực và an toàn:** Giả lập trung thực giao diện PMDT (Selex Model 1150/1150A, Mopiens), LMI, QCMS, terminal bảo trì SA/MA và sơ đồ khối phần cứng tương tác. Môi trường hoạt động hoàn toàn cục bộ/container độc lập, không kết nối thiết bị thật và không mở phiên SSH/serial vật lý ra ngoài.
- **Phục vụ đào tạo & sát hạch kỹ thuật viên:**
  - *Dành cho Giám khảo:* Thiết lập kịch bản sự cố (fault injection), cấu hình dung sai và đáp án tham chiếu, tổ chức bộ đề, quản lý kỳ thi chính thức và chấm điểm dựa trên bằng chứng kỹ thuật.
  - *Dành cho Học viên:* Luyện tập quy trình kiểm tra tham số, thao tác chuyển đổi chế độ, sửa chữa hư hỏng theo whitelist quy định, ghi nhận bằng chứng thao tác và nộp bài đánh giá.
- **Tài khoản ứng dụng:** Hệ thống quản lý tài khoản nội bộ trên PostgreSQL với vai trò `admin`, `teacher`, `student` (không phải chỉ hai tài khoản cố định). Authoring UI hiện dành cho admin; teacher authoring API vẫn có rollout flag và kiểm tra tài nguyên. Tài khoản terminal bên trong bài mô phỏng chỉ là dữ liệu của kịch bản đào tạo, không phải tài khoản hệ thống.

### 1.2. Công nghệ ứng dụng
- **Giao diện & Ứng dụng (Frontend):**
  - Framework: Next.js 16.2.11 (App Router, kiến trúc standalone output tối ưu container Docker).
  - Thư viện hiển thị: React 19.2.4, TypeScript 5, Tailwind CSS 4, Motion (micro-animations), Geist Font và Phosphor Icons.
  - Phong cách thiết kế: workspace Light Gray qua token; trang chủ/màn hình thiết bị giữ dark và giao diện PMDT/LMI cổ điển.
  - Quản lý trạng thái client: Zustand 5 quản lý store độc lập cho từng simulator và phiên thi.
- **Cơ sở dữ liệu & Xác thực (Backend):**
  - Database: PostgreSQL 17 self-hosted container trên máy chủ Oracle Cloud VM ARM64.
  - Data Access & Session: Node-pg connection pool server-only, xác thực phiên qua cookie HttpOnly (`cns_session`, `SameSite=Lax`, `Secure` trên production, TTL 12h).
  - Schema & Migration: Hệ thống migration SQL portable (`database/migrations/`, hiện đến `0015`), quản lý version và checksum chặt chẽ.
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
├── database/migrations/  # SQL migrations PostgreSQL portable; không sửa bản đã áp dụng
├── doc/                  # Sổ tay kỹ thuật, manual gốc của các thiết bị (gitignored)
├── public/               # Tài nguyên tĩnh, ảnh catalogue, manuals PDF hướng dẫn
├── src/
│   ├── app/              # Next.js App Router (admin, student, simulator, api, login)
│   ├── components/       # Giao diện PMDT Selex, QCMS, Terminal, Sơ đồ khối SVG
│   ├── lib/              # Domain engines (dvor1150a, dvor1150, dme1119a), db, auth
│   ├── modules/          # Registry, devices và Mopiens operations/dvor-220, operations/dme-320
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

### 2026-10-19 — Dựng harness giao diện (component playground) để chỉnh sửa UI

- Bổ sung route dev `/playground` liệt kê toàn bộ component trong `src/components` (225 file), nhóm theo thư mục, có tìm kiếm và xem source.
- Preview component best-effort qua dynamic import (`@/components/<path>`) bọc trong Error Boundary; hiển thị lỗi import/render thay vì crash.
- API `/api/playground/source` trả nội dung file (chỉ dev hoặc `PLAYGROUND_ENABLED=true`).
- Gỡ bỏ yêu cầu đăng nhập cho `/playground` trong môi trường dev (cập nhật `src/proxy.ts`) để thuận tiện chỉnh sửa UI.
- Gate an toàn: playground và source API tự tắt trong production trừ khi `PLAYGROUND_ENABLED=true`.
- Kiểm tra: `npm run lint` (0 lỗi), `npm run typecheck` (0 lỗi), `npm run build` (thành công).

- Đồng bộ triệt để hệ thống Design Tokens cho trang Ôn tập ADS-B (`/student/ads-b`):
  - **Khung giao diện & Điều hướng ([`page.tsx`](file:///C:/Test/cns-simulator/src/app/student/ads-b/page.tsx), [`student-dashboard.tsx`](file:///C:/Test/cns-simulator/src/modules/devices/adsb/student-dashboard.tsx)):**
    - Đưa container trang từ toàn màn hình (`w-full max-w-none`) về khung chuẩn `max-w-[1280px]` căn giữa đồng bộ với các trang thiết bị khác.
    - Bổ sung breadcrumb điều hướng `← Danh sách thiết bị` (`href="/review"`).
    - Khối Header chuẩn 3 tầng typography: Eyebrow `Ôn tập / Thực hành`, H1 26-28px font-semibold text `#E6EDF5`, mô tả dịu mắt `#9AA9BC`, cùng chip pill đếm bài bo tròn `rounded-full border border-white/[0.08] bg-white/[0.05] px-2.5 text-[12px] font-medium text-[#9AA9BC]`.
  - **Bảng kịch bản ôn tập:**
    - Cột STT dạng badge vuông vát góc 6px `size-7 rounded-[6px] border border-white/[0.08] bg-white/[0.04] text-[12px] font-medium text-[#9AA9BC]`.
    - Tiêu đề kịch bản 14px font-semibold text `#E6EDF5`, mô tả ngắn 12px `#9AA9BC`.
    - Mức độ kịch bản chuẩn hóa bằng component `<DifficultyBadge />`.
    - Cột Phạm vi hiển thị rõ số site và cảm biến với icon `MapPin` và `Monitor` xám dịu, số tabular-nums.
    - Cột Thao tác nâng cấp thành nút CTA **"Bắt đầu"** (`ButtonLink` variant primary, size sm) với icon `Play` điền tam giác sắc nét, thay thế nút icon nhỏ trước đây.
  - **Trạng thái nạp ([`student-loading.tsx`](file:///C:/Test/cns-simulator/src/components/qcms/student-loading.tsx)):**
    - Chuẩn hóa skeleton loading về nền tối `#141f2a` và `max-w-[1280px]`, loại bỏ các class `bg-white` gây chói mắt.
- **Kiểm tra chất lượng & Regression Guard:**
  - `npm run lint`: đạt (0 lỗi).
  - `npm run typecheck`: đạt (0 lỗi).
  - Vitest: **144 file / 881 test passed** (100% pass, 0 fail).
  - `npm run build`: biên dịch sản xuất thành công 84 dynamic routes.
  - Đã chụp ảnh xác minh trực quan ở độ phân giải 1440px và 1280px.

### 2026-10-02 — Chuẩn hóa Design Tokens toàn diện cho phân hệ ADS-B

- Đồng bộ triệt để hệ thống Design Tokens (màu sắc HSL tối, typography 3 tầng, border mờ tinh tế, border-radius 6/8/12px) cho toàn bộ phân hệ ADS-B:
  - **Trang quản lý kịch bản ADS-B ([`admin-dashboard.tsx`](file:///C:/Test/cns-simulator/src/modules/devices/adsb/admin-dashboard.tsx), [`page.tsx`](file:///C:/Test/cns-simulator/src/app/authoring/ads-b/page.tsx)):**
    - Container chuẩn `max-w-[1280px]` căn giữa với breadcrumb điều hướng `Danh sách thiết bị` và icon `ArrowLeft`.
    - Header 3 tầng typography chuẩn (Eyebrow: `Kịch bản / ADS-B`, H1 28-32px, text mô tả).
    - Cụm nút hành động chuẩn `ButtonLink`: "Mở giả lập ADS-B" (secondary) và "Tạo kịch bản ADS-B" (primary).
    - Khung bảng `ScenarioListFrame` bo 12px viền mờ `border-white/[0.08] bg-[#141f2a]`, thead viền mờ 6% uppercase tracking 0.06em, STT badge bo 6px, tag mức độ `DifficultyBadge` (hỗ trợ cả easy/medium/hard).
    - Cột quy mô với badge số site và thao tác sắc nét; nút Sửa (`ButtonLink` sm) và Xóa (`Button` sm danger) chuẩn hóa tokens.
  - **Hộp thoại xác nhận xóa kịch bản ([`delete-scenario-dialog.tsx`](file:///C:/Test/cns-simulator/src/components/admin/delete-scenario-dialog.tsx)):**
    - Card dialog bo 12px `rounded-[12px] border border-white/[0.12] bg-[#141f2a] shadow-2xl` với backdrop blur.
    - Icon cảnh báo badge `bg-red-500/10 text-red-400 border border-red-500/20`, các nút hành động chuẩn `Button`: "Giữ lại" (secondary) và "Xóa kịch bản" (danger).
  - **Wizard Tạo/Sửa Kịch bản ADS-B ([`scenario-wizard.tsx`](file:///C:/Test/cns-simulator/src/components/admin/scenario-wizard.tsx), [`scenario-wizard-form.tsx`](file:///C:/Test/cns-simulator/src/components/admin/scenario-wizard-form.tsx)):**
    - Container `max-w-[1280px]` căn giữa với breadcrumb `ArrowLeft` quay lại danh sách kịch bản.
    - Card các bước thiết lập cấu hình site/sensor bo góc 12px viền mờ `bg-[#141f2a]`.
    - Thanh điều hướng các bước (steppers) với active pill viền xanh `#0284c7`, footer tích hợp nút chuẩn `ButtonLink` ("Hủy"), `Button` secondary ("Quay lại") và `Button` primary ("Tiếp tục" / "Tạo kịch bản" / "Lưu thay đổi").
- **Kiểm tra chất lượng & Regression Guard:**
  - `npm run lint`: đạt (0 lỗi).
  - `npm run typecheck`: đạt (0 lỗi).
  - Vitest: các test suites của ADS-B, routing và catalog đều passed 100%.
  - `npm run build`: biên dịch sản xuất thành công 84 dynamic routes.
  - Giữ nguyên 100% dữ liệu Store, test assertions và luồng hoạt động.

### 2026-10-02 — Chuẩn hóa Design Tokens cho toàn bộ trang Ôn tập / Thực hành

- Áp dụng triệt để hệ thống Design Tokens (màu sắc HSL tối, font typography 3 tầng, border mờ tinh tế, border-radius 6/8/12px) từ trang Kịch bản tác giả sang toàn bộ 6 trang Ôn tập / Thực hành (`/review/[moduleId]`): DVOR 1150, DVOR 1150A, DME 1119A, DVOR 220, DME 320 và ADS-B.
- Tinh chỉnh `OperationsReviewDashboard` (`src/modules/training/operations-review-dashboard.tsx`):
  - Container chuẩn `max-w-[1280px]` căn giữa với breadcrumb điều hướng `Danh sách thiết bị` và icon `ArrowLeft`.
  - Header chuyên nghiệp với eyebrow `Ôn tập / Thực hành`, tiêu đề H1 sắc nét và mô tả rõ ràng.
  - Cụm điều khiển góc phải tích hợp `CountBadgePill` hiển thị số bài thi và nút `Button` primary "Thêm kịch bản" cho giám khảo.
  - Thay thế bảng dữ liệu sang giao diện tối tinh tế: STT badge bo 6px, tiêu đề kịch bản rõ ràng, tag mức độ `DifficultyBadge` tương phản cao, và nút `ButtonLink` "Bắt đầu" primary với icon `Play` (fill tam giác sắc nét, cân bằng quang học), chống ngắt dòng (`whitespace-nowrap`), mở rộng cột thao tác `w-32` hiển thị hoàn hảo trên 1 dòng đơn.
  - Chuẩn hóa modal dialog "Chọn kịch bản ôn tập" với card bo 12px viền mờ `border-white/[0.12] bg-[#141f2a] shadow-2xl`, thanh cuộn `cns-scrollbar`, danh sách checkbox bo 8px hover mượt mà và nút hành động chuẩn `Button`.
- Tinh chỉnh `ScenarioListFrame` (`src/components/ui/exam-workspace.tsx`) và `ScenarioDataTable` (`src/components/ui/scenario-data-table.tsx`): thanh tìm kiếm bo 8px, thead viền mờ 6% uppercase tracking 0.06em, các nút phân trang bo 8px (`size-8` 32px).
- Nâng cấp `ButtonLinkProps` trong `src/components/ui/button.tsx` hỗ trợ đầy đủ các thuộc tính của thẻ HTML anchor (`<a>`), đồng thời thêm thuộc tính `whitespace-nowrap shrink-0` vào `cnsButtonClass` bảo đảm mọi nút trong hệ thống không bị rớt dòng.
- **Kiểm tra chất lượng & Regression Guard:**
  - `npm run lint`: đạt (0 lỗi).
  - `npm run typecheck`: đạt (0 lỗi).
  - Toàn bộ test suite Vitest: **144 file / 881 test passed** (100% pass, 0 fail).
  - `npm run build`: biên dịch sản xuất thành công 84 dynamic routes.
  - Giữ nguyên 100% logic API `/api/review-scenarios`, cấu trúc URL tham số và quyền hạn người dùng.

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

### 2026-10-02 — Tinh chỉnh giao diện trang Kịch bản DVOR 1150A chuẩn Design Tokens
- Chuẩn hóa hệ thống Design Tokens trong `theme-tokens.css`: thang radius (6px tag/checkbox, 8px button/input/pill, 12px card), màu chữ phân tầng (#E6EDF5, #9AA9BC, #6B7A8D), viền mờ 6–8%, scrollbar mảnh bo tròn `cns-scrollbar`.
- Xây dựng component `Button` và `ButtonLink` dùng chung tại `src/components/ui/button.tsx`: chuẩn hóa 3 cấp độ (Primary nền xanh ATTECH, Secondary/Ghost viền mờ 12%, Danger ghost đỏ); 2 kích thước (32px cho hàng bảng, 36px cho hành động trang); bo góc 8px; đầy đủ hover, active, focus-visible ring 2px, disabled.
- Tinh chỉnh khối `Phân chia thư viện`: header cân xứng trái/phải; số lượng kịch bản chuyển thành chip pill (24px, radius 999px); checkbox 16px bo 4px căn giữa; scrollbar mảnh; sticky action bar ở đáy card với nút "Lưu thay đổi" (disabled mờ khi chưa có thay đổi, sáng lên khi có thay đổi).
- Tinh chỉnh trang quản lý kịch bản `DVOR 1150A`: container max 1280px căn giữa; header H1 (28-32px) + mô tả max-width 640px; cụm tiêu đề thiết bị cân xứng với chip trạng thái nhỏ (chấm xanh + chữ); bảng kịch bản hàng cao 56–64px; tên kịch bản 14px font-medium; slug kỹ thuật dùng font JetBrains Mono 12px màu mờ dịu mắt; badge độ khó phân màu; status "Đã lưu" chấm xanh 6px + chữ 12px; cột Thao tác căn phải thẳng hàng.
- Tinh chỉnh AppShell Navbar: chiều cao nav 60px; tab đang chọn ("Kịch bản") dùng pill bo 8px nền xanh mờ, chữ xanh sáng; các mục khác chữ phụ, hover sáng; mobile drawer khớp vị trí top 60px.
- Kiểm tra đạt: 11/11 file test layout (44/44 tests), `npm run lint` (0 errors, 0 warnings), `npm run typecheck`, và `npm run build` (84/84 static pages).

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

### 2026-10-02 — Chuẩn hóa Design Tokens và bố cục UI trang Quản lý Kịch bản
- Chuẩn hóa hệ thống Design Tokens và bố cục UI cho trang Quản lý Kịch bản tác giả (`/authoring/[moduleId]`).
- Bổ sung token `--cns-radius-full: 999px;` và thiết lập `[scrollbar-gutter:stable]` vào hệ thống token CSS.
- Card "Phân chia thư viện": Sử dụng CSS Grid đồng bộ `[minmax(0,1fr)_150px_150px]`, tâm của checkbox "Chọn tất cả" và các checkbox từng hàng bên dưới thẳng hàng tuyệt đối 100%; lề phải 24px (`px-6`) cân xứng với lề trái 24px; scrollbar stable chống rung giật layout.
- Đầu trang & Header thiết bị: Điều chỉnh khoảng cách chuẩn Windows 11; tên thiết bị 18px leading-none thẳng hàng baseline với chip trạng thái; bổ sung bản đồ mô tả chuyên môn loại bỏ hiện tượng lặp lại tên thiết bị khi `name === shortName`; nút "Thêm kịch bản" căn giữa dọc với khối thông tin.
- Bảng kịch bản: Chống vỡ dòng tên kịch bản dài bằng `truncate` và tooltip `title`; chuyển đổi các nút phụ ("Sửa nhanh", "Tải JSON", "Xóa") sang nút icon-only 32x32px với `aria-label` và `title` tooltip đầy đủ; giữ nguyên nút "Mở simulator" (icon + text, font-medium).
- Kiểm tra tự động CI Regression Guard: `npm run lint` (0 lỗi), `npm run typecheck` (0 lỗi), `npm run test:run` (144 test files, 881 tests passed, 0 failures), `npm run build` (84 routes biên dịch thành công).
- Xác minh trực quan bằng ảnh chụp 1440px và 1280px: tâm checkbox thẳng hàng tuyệt đối, tên kịch bản gọn gàng trên một hàng, lề phải card đúng 24px.

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

### 2026-10-19 — Điều chỉnh UI theo phản hồi trình duyệt (batch UI edits, chưa push)
- `/playground`: harness & error boundary đã commit/push trước đó (9c3b881, 5047857, ea0c9f0).
- Home showcase: eyebrow "Hệ thống thiết bị CNS", heading "Thực hành mô phỏng", xóa hint paragraph; nút "Sơ đồ khối" style giống "Mở simulator"; `rounded-full` trên `primaryButtonClassName`, `cnsButtonClass`, simulator-catalog & training-workspace buttons; canvas `#1f2937`; simulator card `#e5e7eb`; nút "Run" + thẻ ready/pending.
- Authoring page: cards xám + nhãn "Scenario Builder"/"Practice"; thêm thẻ VHF/VSAT.
- Scenario management workspace: header chỉ hiển thị shortName, mô tả 1 dòng, breadcrumb "back", eyebrow "KỊCH BẢN", xóa description p và schema v chip, "Thêm kịch bản"→"Thêm"; library controls "Cài đặt thư viện", "Lưu", hàng trống xám `#e5e7eb`; checkbox tròn custom.
- Xóa const `moduleDescriptions` không dùng (clear lint warning).
- Ô trống scenario → "Chưa có kịch bản"; nút lưu → text "Apply" (bỏ icon), hiệu ứng click `active:scale`.
- Nút "Lưu" và "Thêm" đổi nền cam `#ea580c` (hover `#c2410c`).
- `/review/dvor-1150a`: "Danh sách thiết bị"→"Back"; xóa nút "Thêm kịch bản"; mô tả 1 dòng (`whitespace-nowrap`); ô trống xám trắng `#e5e7eb`; nút "Bắt đầu" bo tròn tối đa, nền cam, hiệu ứng click.
- `/admin/scenario-exams`: 2 nút "Tạo kỳ thi" nền cam; ô trống "Chưa có kỳ thi phù hợp." nền xám trắng; heading "Kỳ thi Scenario"→"Quản lý kỳ thi".
- `/admin/scenario-exams/new`: section form nền `#e5e7eb`; text label `slate-800`; ô nhập liệu `!bg-white !text-slate-900`; heading "Tạo kỳ thi Scenario"→"Tạo kỳ thi mới"; xóa câu mô tả legacy; ngày nhập `dd/mm/yyyy`; nút Hủy xám đậm bo tròn; nút Tạo kỳ thi bỏ icon, nền cam.
- `/admin/scenario-exams/new`: section form nền `#e5e7eb`; text label `slate-800`; ô nhập liệu `!bg-white !text-slate-900`; heading "Tạo kỳ thi Scenario"→"Tạo kỳ thi mới"; xóa câu mô tả legacy; ngày nhập `dd/mm/yyyy`; nút Hủy xám đậm bo tròn; nút Tạo kỳ thi bỏ icon, nền cam.
- `/admin/scenario-exams/[id]`: badge availability flat (bỏ viền & nền màu), đặt bên phải tên kỳ thi; nút trạng thái (Mở/Khóa/Mở lại) gom cùng container header cố định vị trí; "Mở kỳ thi" xám đậm, "Khóa kỳ thi" xanh lá; "Tạo mã code" cam; checkbox module tròn; thẻ modul nền xám trắng; ô "Chưa có mã thí sinh" nền xám trắng; "Xuất danh sách PDF" bo tròn, nền xám trắng, text `slate-900`; thêm "File" đầu mô tả PDF; xóa khung viền thông báo upcoming/ended.
- Kiểm thử: `npx vitest run` (881 passed), `npm run typecheck` (sạch), `npm run lint` (sạch), `npm run build` (72/72 routes đạt).

### 2026-10-19 — Bổ sung hiệu ứng loading và sửa contrast hàng kịch bản (batch UI edits 2, chưa push)
- `/authoring/dvor-1150a` (scenario-management-workspace): hàng kịch bản trong bảng đổi nền `#e5e7eb`, text `slate-900`/`slate-600`, xóa `hover:bg-white/[0.04]`; các ô `td` và nút "Sửa nhanh"/"Tải JSON" (`!bg-slate-200 !text-slate-700 !border-slate-300`) tương phản trên nền xám.
- `/authoring/dvor-1150a` (scenario-library-controls): hàng kịch bản trong danh sách thư viện đổi nền `#e5e7eb`, text `slate-900`/`slate-600`, xóa `hover:bg-white/[0.04]`; các ô `td` và label checkbox (`border-slate-300 bg-white hover:bg-slate-100`) tương phản, bỏ viền vuông checkbox label.
- `/review/dvor-1150a` (operations-review-dashboard): hàng kịch bản nền `#e5e7eb`, text `slate-900`/`slate-600`, STT badge `slate-700`/`slate-200`/`slate-300`; nút "Bắt đầu" cam bo tròn; thêm hiệu ứng loading 1s (overlay mờ `backdrop-blur-sm`) trước khi mở simulator; thay `ButtonLink` bằng `<button>` + `useRouter`; cập nhật 2 test (link → button) và mock `next/navigation`.
- `/admin/scenario-exams`: hàng kỳ thi nền `#e5e7eb`, text `slate-600`/`slate-700`/`slate-900`; badge "Đã khóa" (neutral) text `slate-700`; nút mở `slate-300`/`white`/`slate-100`.
- `/simulator`: thêm framework hiệu ứng loading 1s (overlay mờ) khi bấm **Run** trước khi mở simulator; chuyển `SimulatorCatalog` sang client component; cập nhật test `operations-catalog.test.tsx` thêm mock `next/navigation`.
- `/student/scenario-exams`: nút "Vào phiên thi" đổi cam `#ea580c`; bỏ icon `Key` vuông trong tiêu đề.
- `/review` (training-workspace): module `pending` khóa click — thay `<Link>` bằng `<span>` xám `#d1d5db` với `aria-disabled="true"`.
- `/admin/scenario-exams` (scenario-exam-list): hàng kỳ thi nền `#e5e7eb`, text `slate-600`/`slate-700`/`slate-900`, badge tương phản, nút mở `slate-300`/`white`/`slate-100`.
- Cập nhật `scenario-data-table.tsx`: empty cell nền `#e5e7eb` text `slate-600`.
- Cập nhật test `operations-review-dashboard.test.tsx` thêm mock `next/navigation` và đổi `getByRole("link")` → `getByRole("button")`.
- Kiểm thử: `npx vitest run` (881 passed), `npm run typecheck` (sạch), `npm run lint` (sạch), `npm run build` (72/72 routes đạt).

### 2026-10-19 — Bổ sung skeleton loading, zebra striping, checkbox contrast và DifficultyBadge (batch UI edits 3, chưa push)
- `/authoring/dvor-1150a` (scenario-management-workspace): thay text loading bằng hiệu ứng skeleton (3 hàng placeholder `animate-pulse`); xen kẽ 2 màu nền `#f9fafb` ↔ `#d1d5db` giữa các kịch bản liên tục (tr, th, td); checkbox `checkboxClass()` đổi `border-white/20 bg-white/5` → `border-slate-400 bg-slate-200` để tương phản trên nền xám; dấu tích ✓ đổi sang xanh lá `#22c55e`.
- `/authoring/dvor-1150a` (scenario-library-controls): xen kẽ 2 màu nền `#f9fafb` ↔ `#d1d5db` giữa các kịch bản liên tục (tr, th, td).
- `/review/dvor-1150a` (operations-review-dashboard): xen kẽ 2 màu nền `#f9fafb` ↔ `#d1d5db` giữa các kịch bản; `DifficultyBadge` tăng tương phản: basic `#16a34a`, advanced `#ea580c`, intermediate `#ca8a04`, border opacity `0.4`.
- Kiểm thử: `npx vitest run` (881 passed), `npm run typecheck` (sạch), `npm run lint` (sạch), `npm run build` (72/72 routes đạt).

### 2026-10-19 — Skeleton loading, zebra striping mở rộng, DifficultyBadge, checkbox xanh (batch UI edits 4, chưa push)
- `/authoring/dvor-1150a` (scenario-management-workspace): thay text loading bằng skeleton (3 hàng placeholder `animate-pulse`); xen kẽ 2 màu nền `#f9fafb` ↔ `#d1d5db` (tr, th, td); checkbox `checkboxClass()` đổi `border-white/20 bg-white/5` → `border-slate-400 bg-slate-200`; dấu tích ✓ đổi sang xanh lá `#22c55e`.
- `/authoring/dvor-1150a` (scenario-library-controls): xen kẽ 2 màu nền `#f9fafb` ↔ `#d1d5db` (tr, th, td).
- `/review/dvor-1150a` (operations-review-dashboard): xen kẽ 2 màu nền `#f9fafb` ↔ `#d1d5db`; `DifficultyBadge` tăng tương phản: basic `#16a34a`, advanced `#ea580c`, intermediate `#ca8a04`, border opacity `0.4`.
- `/admin/scenario-exams` (scenario-exam-list): xen kẽ 2 màu nền `#f9fafb` ↔ `#d1d5db` giữa các hàng kỳ thi (tr, td).
- Kiểm thử: `npx vitest run` (881 passed), `npm run typecheck` (sạch), `npm run lint` (sạch), `npm run build` (72/72 routes đạt).

### 2026-10-19 — Chuyển tổng thể sang Light Gray Mode (trừ trang chủ & simulator)
- `src/lib/theme.ts`: `DEFAULT_APP_THEME` → `"light"`.
- `src/app/layout.tsx`: `data-theme="light"` mặc định + thêm `ThemeRouteSync` client component.
- `src/components/layout/theme-route-sync.tsx` (mới): Tự động set `data-theme="dark"` cho route `/` và `/simulator/*`, `data-theme="light"` cho các route còn lại.
- `src/styles/theme-tokens.css`: CNS design system tokens (`--cns-*`) giờ theme-aware — light values under `:root`/`[data-theme="light"]`, dark values under `[data-theme="dark"]`.
- Global replacement: Thay hardcoded dark colors (`#E6EDF5`, `#9AA9BC`, `#6B7A8D`, `#101922`, `#141f2a`, `#111a24`, `border-white/[0.0X]`, `bg-white/[0.0X]`) bằng `--cns-*` tokens và `black/[0.X]` trong ~15 file.
- Kiểm thử: `npx vitest run` (881 passed), `npm run typecheck` (sạch), `npm run lint` (sạch), `npm run build` (72/72 routes đạt).
