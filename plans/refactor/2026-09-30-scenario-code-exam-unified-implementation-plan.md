# Kế hoạch triển khai refactor kỳ thi bằng mã code và chuẩn hóa thư viện Scenario

**Phiên bản:** 1.2 — kế hoạch đã duyệt, cập nhật tiến độ và hotfix lịch hiển thị
**Ngày:** 2026-09-30
**Phạm vi:** CNS Simulation Lab — Scenario Parameters, thư viện Ôn tập/Kiểm tra, ADS-B và kỳ thi bằng mã code
**Trạng thái:** IN PROGRESS — đã có nền tảng P1/P2, workspace P3 và P4 foundation; chưa hoàn tất runtime/nộp bài/chấm điểm và acceptance P4–P8.

### Cập nhật 2026-09-30 — ổn định luồng tạo kỳ thi/cấp mã

- Người dùng đã duyệt gói sửa sau khi form tạo kỳ thi báo `could not determine data type of parameter $3`.
- Đã sửa kiểu tham số audit JSON, vị trí `FILTER` khi đếm tiến độ, khóa session/subject trước khi đọc lại snapshot để không cấp lại đề khi request đồng thời.
- Đã sửa đường dẫn revalidation sang `/admin/scenario-exams` và `/student/scenario-exams`, validate UUID/định dạng code trước SQL, giữ thông báo nghiệp vụ và không trả nguyên lỗi SQL ra client.
- Đã kiểm chứng 58 test action/query và 9 ca integration chạy trên PostgreSQL 17.11 cô lập: tạo kỳ thi có lịch, chi tiết rỗng/có mã, chuỗi create → open → issue → redeem → start, double redeem/start, rollback audit, pool rỗng, hết giờ, cách ly hai code cùng tài khoản và giữ snapshot khi sửa nguồn/gỡ membership. Auth/Next cookie/cache được mock; database, schema, transaction và truy vấn là thật. Full gate: lint, typecheck, 130 file/756 test, production build, CodeGraph sync và diff check đạt.
- CI bổ sung PostgreSQL 17 tạm; suite chỉ nhận URL localhost được chỉ định riêng, tự tạo/xóa database ngẫu nhiên chứa fixture. Không dùng `.env.local`/`DATABASE_URL`, không chạm dữ liệu production và không thêm migration.
- **Còn lại:** browser QA bản hotfix; runtime từ snapshot, resume UX, checkpoint/submission, finalize timeout, review/điểm giám khảo và pilot vẫn là công việc tiếp theo. Không coi test cấp scenario là đã hoàn tất bài thi end-to-end.

### Cập nhật 2026-09-30 — phân biệt trạng thái mở và cửa sổ vào thi

- Đã xác minh production: kỳ thi `Test case 01` có `status=open` nhưng `opens_at=20/11/2026 07:00` (giờ Việt Nam), nên chưa đủ điều kiện redeem tại thời điểm kiểm tra 30/09/2026.
- Query mới trả thêm `availability`: `upcoming`/`available`/`ended` hoặc trạng thái vòng đời; tab Thí sinh hiển thị kỳ thi sắp mở nhưng vẫn giữ chốt redeem server-side theo `opens_at`/`closes_at`.
- UI admin và candidate hiển thị lịch thống nhất UTC+7; nút khóa được đổi nhãn thành `Khóa kỳ thi` để phản ánh việc dừng cấp mã và dừng phiên mới.
- Đã thêm ma trận integration PostgreSQL cho kỳ thi tương lai/đang diễn ra/hết hạn. Không đổi lịch, không revoke/reissue và không ghi dữ liệu production.
- **Còn lại:** browser QA sau deploy; cần chốt riêng thiết kế lưu mã mã hóa trước khi làm PDF có thể xuất lại mã đầy đủ. Mã cũ chỉ có hash/hint nên không khôi phục được.

## 0. Tóm tắt quyết định chính

Refactor này không mở rộng luồng 'src/lib/exams' hiện tại. Luồng cũ dùng 'exam_sets', 'exam_papers', 'exam_candidates', email công vụ và các RPC 'start_exam_attempt'/'complete_exam_attempt'; cấu trúc đó không còn phù hợp với Scenario Parameters và không được dùng làm nền cho chức năng mới.

Luồng mới sẽ có ba lớp tách biệt:

    Scenario Authoring
      -> Scenario source + immutable revisions
      -> Library membership: Ôn tập / Kiểm tra
      -> Code-based exam: mã thí sinh + các môn được chọn
      -> Candidate session: mỗi môn random một scenario tại thời điểm bắt đầu môn
      -> Submission/evidence/review

Tài khoản có role Thí sinh vẫn được dùng để bảo vệ tab và xác thực người truy cập. Tuy nhiên, tài khoản/email không còn là định danh phân công bài. Định danh nghiệp vụ của bài thi là mã code; user_id nếu được lưu chỉ phục vụ audit truy cập.

ADS-B sẽ được đưa vào cùng mô hình hai thư viện thông qua adapter chuẩn hóa, không để kỳ thi mới đọc trực tiếp catalog legacy.

## 1. Bằng chứng baseline tại thời điểm lập kế hoạch

Các count/commit dưới đây là baseline lịch sử trước triển khai, không phải khẳng định trạng thái production hiện tại. Tiến độ mới xem mục 1.5 và cập nhật đầu tài liệu.

### 1.1. Trạng thái thư viện Kiểm tra production

Đã kiểm tra read-only PostgreSQL production sau khi bổ sung scenario:

| module_id | Scenario Kiểm tra active |
| --- | ---: |
| dme-1119a | 21 |
| dme-320 | 2 |
| dvor-1150 | 2 |
| dvor-1150a | 13 |
| dvor-220 | 2 |

Ba module trước đây chỉ có một scenario nay đã có đủ hai scenario để kiểm thử random. DME 1119A và DVOR 1150A có pool lớn hơn.

### 1.2. ADS-B hiện tại

Production hiện có:

| Nguồn | Số lượng |
| --- | ---: |
| simulator_scenario_library_memberships, module_id = ads-b, library_kind = exam | 0 |
| simulator_scenario_parameters, module_id = ads-b | 0 |
| public.scenarios legacy | 17 |
| public.exam_scenario_catalog, module_code = ads-b | 17 |

ADS-B hiện dùng Scenario legacy với sites, targetSensorId, targetLoginUser, expectedActions, hardwareFault và eventLog. Authoring hiện đi qua useScenarioStore, /api/scenarios và fallback localStorage. Đây là nguồn cần được chuẩn hóa trước khi ADS-B tham gia kỳ thi code-based.

### 1.3. Dữ liệu kỳ thi thử nghiệm cũ

Đã xóa có kiểm soát trên production đúng kỳ thi Kỳ thi thử nghiệm 01:

- 1 kỳ thi.
- 1 thí sinh.
- 1 phân môn.
- 2 giám khảo.
- 1 lượt thi.
- 2 attempt items chứa kết quả/evidence.

Đã xác minh sau xóa: các count mục tiêu bằng 0, không có orphan attempt/item, trigger bảo vệ attempt đã bật lại. Bộ đề Bộ đề thử nghiệm 01 và thư viện Scenario không bị xóa. Không tạo backup riêng cho dữ liệu đã xóa.

### 1.4. Trạng thái source

- Worktree trước khi tạo tài liệu này sạch.
- Commit hiện tại: fb65451 fix(ui): constrain scenario library list height.
- Migration hiện có kết thúc ở 0009_scenario_resource_authorization.sql.
- Kế hoạch cũ 2026-09-27-scenario-training-exam-refactor-plan.md được dùng làm tài liệu QA tham khảo; các quyết định loại trừ ADS-B/exam legacy trong kế hoạch cũ bị thay thế bởi kế hoạch này.

### 1.5. Bảng trạng thái công việc

| Nhóm | Đã viết | Đã xác minh | Còn lại |
| --- | --- | --- | --- |
| Scenario Parameters 5 module | Source/migration hiện có | Production counts đã kiểm tra | Không mở rộng v2 ngoài nhu cầu |
| ADS-B | Adapter/parser, source/library panel và migration 0010/0012 | Backfill production được ghi trong README; parser/migration tests | Runtime snapshot và browser QA/publish theo lựa chọn giám khảo |
| Kỳ thi cũ | Phạm vi xóa đã thực hiện | Target counts = 0 | Không dùng lại business flow |
| Kỳ thi bằng mã | Migration 0011, action/query/session, trang admin và candidate foundation | 58 regression tests + 9 integration PostgreSQL 17.11; migration production đã ghi trong README | Runtime/nộp bài/timeout/review; browser QA/pilot/cutover chưa hoàn tất |

## 2. Mục tiêu và ranh giới

### 2.1. Mục tiêu bắt buộc

1. Giám khảo tạo một kỳ thi với tên, thời gian mở/đóng và thời lượng.
2. Giám khảo tạo nhiều mã code cho danh sách thí sinh.
3. Mỗi mã chứa thông tin tên, đơn vị và danh sách module được chọn.
4. Mã không nhúng PII vào chuỗi; server lưu hash mã và thông tin thí sinh ở bản ghi bảo mật.
5. Thí sinh đăng nhập role Thí sinh, chọn kỳ thi, nhập mã và tạo một phiên thi duy nhất.
6. Thí sinh chỉ thấy các module đã được tích cho mã của mình.
7. Khi thí sinh bắt đầu một module, server random đúng một scenario active trong thư viện Kiểm tra của module đó.
8. Scenario đã chọn được snapshot và không random lại khi refresh, mất mạng tạm thời hoặc tiếp tục phiên.
9. Một phiên nhiều module có timer server-authoritative và trạng thái hoàn tất tổng hợp.
10. Giám khảo xem bảng thống kê theo mã; dòng chỉ xanh khi toàn bộ module của mã đã nộp hoặc được finalize do hết giờ.
11. Giám khảo click vào mã để xem từng scenario, evidence, kết quả kỹ thuật, điểm và nhận xét.
12. ADS-B được phân chia Ôn tập/Kiểm tra như các module còn lại.

### 2.2. Không làm trong đợt đầu

- Không sử dụng lại action/query/RPC business flow trong src/lib/exams.
- Không dùng email công vụ để tạo roster hoặc quyết định quyền xem bài.
- Không encode tên/đơn vị vào code theo dạng có thể giải mã.
- Không hỗ trợ nhiều attempt cho cùng một code trong MVP.
- Không xây hệ thống chống gian lận tuyệt đối; chỉ xây server authorization, audit và integrity cơ bản.
- Không xóa các bảng legacy còn lại trong đợt đầu; chỉ cô lập, không gọi từ flow mới.
- Không tự động công bố toàn bộ ADS-B legacy vào cả hai thư viện nếu chưa có quyết định nghiệp vụ về seed ban đầu.
- Không cho phép candidate tự chọn scenario hoặc xem danh sách pool trước khi server assignment.

## 3. Luồng nghiệp vụ chuẩn

### 3.1. Ví dụ chấp nhận chính

1. Giám khảo tạo kỳ thi Năng định đợt 2 năm 2026.
2. Giám khảo tạo code cho Nguyễn Hoàng Hải, đơn vị Đài DVOR/DME Tuy Hòa.
3. Giám khảo tích DVOR 1150A và DME 1119A.
4. Server kiểm tra cả hai module có pool Kiểm tra active.
5. Candidate đăng nhập role Thí sinh, vào tab Thí sinh, chọn kỳ thi và nhập code.
6. Server tạo một candidate session, hiển thị đúng hai module.
7. Candidate chọn DVOR 1150A; server transaction chọn một membership active, tạo snapshot assignment và mở item.
8. Candidate làm/nộp scenario DVOR 1150A.
9. Candidate chọn DME 1119A; server chọn một scenario khác trong pool DME 1119A và cố định nó.
10. Candidate nộp cả hai module hoặc timer hết hạn.
11. Dòng code chuyển xanh khi cả hai item terminal.
12. Giám khảo mở dòng và xem hai bài nộp độc lập.

### 3.2. State machine kỳ thi

    draft -> open -> locked -> closed -> archived

- draft: có thể chỉnh metadata, chưa cho redeem.
- open: cho tạo/redeem code trong cửa sổ thời gian.
- locked: không nhận code mới; session đang chạy được hoàn tất nếu còn deadline.
- closed: không bắt đầu mới; cho xem kết quả.
- archived: chỉ đọc.

### 3.3. State machine code

    issued -> redeemed -> in_progress -> terminal
                                  |-> submitted
                                  |-> timed_out
                                  |-> revoked

- Code chỉ được redeem một lần.
- redeemed phải tạo session trong cùng transaction.
- revoked chỉ áp dụng trước khi candidate bắt đầu hoặc theo quyền reset đặc biệt.
- Không xóa code đã phát sinh; dùng status/audit.

### 3.4. State machine module item

    not_started -> in_progress -> submitted
                               |-> timed_out

- Scenario được chọn tại transition not_started -> in_progress.
- Chỉ transition đầu tiên được random; các request retry trả lại cùng assignment.
- Module chưa mở khi parent timeout không được bịa started_at hoặc kết quả.

## 4. Kiến trúc domain mới

### 4.1. Namespace source

Tạo namespace riêng, đề xuất:

    src/lib/scenario-exams/
    src/components/scenario-exams/
    src/app/admin/scenario-exams/
    src/app/student/scenario-exams/

Tên cuối cùng phải được chốt trước P1. Không import business functions từ:

    src/lib/exams/actions.ts
    src/lib/exams/queries.ts
    src/lib/exams/types.ts
    src/components/exams/*

Có thể tái sử dụng pure adapter/parser hiện hành nếu không mang theo identity/assignment logic cũ, ví dụ presenter ADS-B hoặc parser kết quả; mọi quyền, session, timer và persistence phải đi qua domain mới.

### 4.2. Module registry hợp nhất

Registry mới phải có sáu module:

    dvor-1150
    dvor-1150a
    dme-1119a
    dme-320
    dvor-220
    ads-b

Mỗi module khai báo:

- moduleId.
- Nhãn hiển thị.
- Schema/parser.
- Source kind (scenario-parameters hoặc legacy adapter trong giai đoạn chuyển tiếp).
- Runtime loader.
- Result/evidence evaluator.
- Capabilities được hỗ trợ.

Sau khi ADS-B migration hoàn tất, mục tiêu là cả sáu module đều có source kind normalized snapshot, không còn nhánh đọc legacy trong kỳ thi mới.

## 5. Mô hình dữ liệu đề xuất

Migration đề xuất, sau khi khảo sát schema thật và chốt tên:

    0010_adsb_scenario_parameters_and_library.sql
    0011_scenario_code_exam_sessions.sql

Không sửa trực tiếp migration 0001–0009 đã chạy; migration mới phải expand-only và đăng ký trong app_schema_migrations.

### 5.1. Chuẩn hóa ADS-B source

Có hai lựa chọn:

| Phương án | Đánh giá |
| --- | --- |
| Mở rộng simulator_scenario_parameters cho ads-b, thêm parser/normalizer và import 17 legacy rows | Khuyến nghị — giữ một source/revision/library contract |
| Tạo bảng ADS-B library riêng rồi để kỳ thi query hai nguồn | Không khuyến nghị — tăng branch, dễ lệch revision, permission và random selection |

Phương án khuyến nghị:

- Thêm ads-b vào SCENARIO_PARAMETERS_MODULES.
- Tạo AdsbScenarioDefinition và parser/validator.
- Map Scenario legacy vào definition JSON ổn định.
- Giữ ID legacy trong scenario_id để truy vết.
- Lưu source_filename = legacy-adsb hoặc metadata migration rõ ràng.
- Ghi schema_version và catalog_version.
- Import idempotent; chạy lại không tạo duplicate.
- Không tự publish Kiểm tra nếu chưa có quyết định seed; import vào source/draft trước.

### 5.2. scenario_exams

Các trường tối thiểu:

- id uuid.
- name.
- description/decision_basis tùy nghiệp vụ đã chốt, không ép trường hành chính legacy.
- opens_at, closes_at.
- duration_minutes.
- status.
- created_by.
- created_at, updated_at.
- revision nếu metadata kỳ thi có optimistic concurrency.

Ràng buộc:

- duration dương và trong giới hạn hợp lý.
- closes_at > opens_at nếu cả hai được đặt.
- Không sửa duration/deadline đã có session active nếu chưa có chính sách riêng.

### 5.3. scenario_exam_codes

- id uuid.
- exam_id FK.
- code_hash unique.
- code_hint/last4 để giám khảo nhận diện nhưng không lộ code.
- candidate_name.
- candidate_unit.
- status.
- issued_at, redeemed_at, revoked_at, terminal_at.
- redeem_user_id nullable để audit account Thí sinh, không dùng làm assignment identity.
- session_id unique nullable.
- created_by.

Không lưu plaintext code. Code sinh bằng CSPRNG, format dễ đọc, có checksum nếu cần giảm lỗi gõ.

### 5.4. scenario_exam_code_subjects

Một row cho mỗi module giám khảo tích:

- id uuid.
- code_id FK.
- module_id.
- position.
- status (not_started, in_progress, submitted, timed_out).
- started_at, submitted_at.
- session_item_id nullable unique.

Unique (code_id, module_id) để không tích trùng môn.

Bảng này chưa lưu scenario cụ thể; scenario được chọn khi candidate bắt đầu module.

### 5.5. scenario_exam_sessions

- id uuid.
- code_id unique FK.
- session_token_hash unique.
- candidate_user_id nullable/audit-only.
- started_at.
- deadline_at.
- submitted_at.
- terminal_reason (submitted, timed_out, revoked).
- status.
- last_seen_at.
- created_at, updated_at.

Timer tính theo UTC trong database. UI chuyển sang Asia/Ho_Chi_Minh khi hiển thị.

### 5.6. scenario_exam_session_items

Một row cho mỗi module bắt đầu:

- id uuid.
- session_id FK.
- code_subject_id FK.
- module_id.
- library_membership_id FK hoặc reference immutable.
- library_revision_number.
- scenario_id, scenario_name.
- definition_snapshot_json.
- engine_version, evaluator_version.
- status.
- started_at, submitted_at.
- result_json.
- result_summary_json.
- submission_ref.
- score/examiner_score nullable.
- examiner_comment nullable.
- reviewed_by, reviewed_at.

Snapshot bắt buộc để chỉnh sửa thư viện sau này không làm thay đổi bài đang thi.

### 5.7. scenario_exam_audit_events

Append-only:

- code_issued.
- code_redeemed.
- session_started.
- subject_started.
- scenario_assigned.
- item_submitted.
- session_submitted.
- session_timed_out.
- code_revoked.
- review_updated.

Không ghi plaintext code hoặc raw secret vào audit.

## 6. ADS-B normalization workstream

### A1. Contract

Tạo AdsbScenarioDefinition dựa trên type legacy nhưng thêm envelope thống nhất:

- id.
- name/description.
- difficulty.
- schemaVersion.
- initialState gồm sites/sensors.
- taskTargets gồm target sensor/login role.
- expectedActions.
- hardwareFault.
- eventLog/symptoms.
- completionCriteria.

Không bỏ các field đặc thù ADS-B chỉ để ép vừa contract VOR/DME.

### A2. Parser/validator

- Parse legacy Scenario thành definition mới.
- Validate site/sensor/IP/target sensor.
- Validate expected actions có menu/input hợp lệ.
- Validate hardware component IDs tồn tại trong ADS-B block diagram.
- Validate login role.
- Reject definition không có expected action tối thiểu.
- Giữ compatibility parser cho 17 rows đã tồn tại.

### A3. Persistence/backfill

- Rehearsal trên database clone.
- Insert 17 legacy source rows idempotently.
- Kiểm tra count, scenario_id, title, hash definition trước/sau.
- Không tự publish cả 17 vào Kiểm tra nếu chưa duyệt danh sách.
- Sau khi duyệt, publish membership Ôn tập/Kiểm tra qua cùng transaction/revision API.

### A4. Authoring UI

Giai đoạn đầu giữ wizard /authoring/ads-b để không làm mất khả năng biên tập. Thay đổi bắt buộc:

- Lưu source server-side vào normalized Scenario Parameters.
- Không coi localStorage là nguồn chính.
- Thêm bảng phân chia ADS-B vào ScenarioLibraryControls/workspace chung.
- Hiển thị revision, trạng thái draft/published/archived.
- Chặn publish nếu parser/evaluator/capability không hợp lệ.
- Giữ /admin/* legacy redirect tương thích.

### A5. Runtime/review

- Khi code session chọn ADS-B, loader chỉ trả snapshot của session item.
- Không tải toàn bộ public.scenarios cho candidate.
- Runtime adapter hydrate simulator từ snapshot.
- Result adapter sử dụng expected actions, authentication, QCMS và hardware fault.
- Review hiển thị evidence terminal/QCMS/hardware cùng format với các module khác nhưng giữ nhãn ADS-B riêng.

## 7. API/service mới

### 7.1. Admin

Các action/service đề xuất:

- createScenarioExam.
- updateScenarioExam trước khi có session.
- openScenarioExam, lockScenarioExam, closeScenarioExam.
- issueCandidateCode.
- listCandidateCodes.
- revokeCandidateCode.
- resetCandidateCode chỉ với quyền đặc biệt và audit.
- getScenarioExamStats.
- getScenarioExamSubmission.
- saveScenarioExamReview.

Mọi action admin phải kiểm tra server-side role và ownership/scope.

### 7.2. Candidate

- listCandidateOpenExams.
- redeemCandidateCode.
- getCandidateSession.
- startSessionSubject.
- saveSessionCheckpoint.
- submitSessionItem.
- submitCandidateSession.
- resumeCandidateSession.

Candidate API không nhận candidate_id từ body để quyết định quyền. Candidate identity lấy từ hash session/code trong cookie và row server.

### 7.3. Random selection

startSessionSubject phải chạy transaction:

1. Lock code_subject.
2. Nếu đã có session_item, trả lại item hiện có.
3. Kiểm tra session còn hạn và kỳ thi còn hợp lệ.
4. Đọc active memberships của module_id, library_kind='exam'.
5. Chọn random một membership bằng server/database.
6. Ghi membership id, revision, definition snapshot và version.
7. Đổi status subject/item sang in_progress.
8. Commit.

Retry hoặc double-click không được tạo scenario thứ hai.

## 8. UI/route plan

### 8.1. Giám khảo

Canonical route có thể giữ /admin/exams để không đổi menu, nhưng component/data layer phải là domain mới:

- /admin/exams: danh sách kỳ thi code-based, filter, status, số mã, số đã hoàn tất.
- /admin/exams/new: tạo kỳ thi và thời gian.
- /admin/exams/[examId]: thống kê mã, tạo mã, revoke, xem trạng thái.
- /admin/exams/[examId]/results/[codeId]: xem bài nộp theo mã.

Không render ExamList, ExamEditor, ExamDetailManager cũ cho flow mới.

### 8.2. Thí sinh

Có thể giữ URL /student/exams nhưng thay toàn bộ data flow:

- Login role Thí sinh vẫn là gate.
- Không query theo email công vụ.
- Chọn kỳ thi -> nhập code -> session.
- Hiển thị module cards đúng với code.
- Timer cố định ở vùng dễ nhìn.
- Trạng thái từng module: Chưa bắt đầu, Đang làm, Đã nộp, Hết giờ.

### 8.3. Bảng thống kê giám khảo

Mỗi row là một code/thí sinh:

- Tên, đơn vị, code hint.
- Các module được tích.
- Tiến độ x/y.
- Thời gian còn lại/đã kết thúc.
- Status color.
- Nút Xem bài nộp.

Màu xanh chỉ được suy ra từ server status terminal, không từ màu client tự đặt.

## 9. Lộ trình implementation

### P0 — Freeze contract và baseline

- Chốt code one-time, candidate login gate, timer start tại redeem, một attempt/code.
- Chốt ADS-B seed policy: import draft hay publish membership ban đầu.
- Chụp migration checksum/count production hiện tại.
- Ghi feature flag SCENARIO_CODE_EXAMS_ENABLED=false.
- Tạo decision log và acceptance matrix.

Cổng P0: các quyết định D01–D08 được xác nhận; chưa viết migration nếu timer/code/reset semantics còn mơ hồ.

### P1 — ADS-B normalized source/library

- Thêm type/parser/validator.
- Thêm ads-b vào registry/module catalog.
- Viết migration expand-only cho module/revision constraints.
- Backfill 17 legacy scenario trên database rehearsal.
- Đối chiếu definition hash/title/id.
- Mở UI publish Ôn tập/Kiểm tra cho ADS-B.
- Chạy preview runtime từng scenario.

Cổng P1: 17 source rows parse được; ít nhất 2 ADS-B scenario được publish thử vào Kiểm tra; random selection và review snapshot đạt.

### P2 — Scenario code exam schema/service

- Tạo migration code/session tables.
- Thêm FK/unique/index/check constraints.
- Viết service generate/hash/redeem/revoke.
- Viết service random subject start.
- Viết timer/finalize idempotent.
- Viết audit events.
- Test transaction/concurrency bằng database thật.

Cổng P2: hai request redeem cùng code chỉ một thành công; hai request start cùng module chỉ một scenario assignment.

### P3 — Tab Giám khảo

- Refactor /admin/exams sang component/domain mới.
- Tạo kỳ thi.
- Tạo nhiều code liên tiếp.
- Form tên/đơn vị/checkbox sáu module.
- Hiển thị pool count trước khi tạo mã.
- Bảng thống kê status/progress.
- Revoke/reset với quyền và audit.

Cổng P3: hoàn tất workflow Nguyễn Hoàng Hải với DVOR 1150A + DME 1119A.

### P4 — Tab Thí sinh và runtime session

- Login gate role Thí sinh.
- Chọn kỳ thi/nhập code.
- Tạo cookie session.
- Hiển thị đúng module đã tích.
- Start module và random snapshot.
- Hydrate VOR/DME/ADS-B runtime từ session snapshot.
- Save checkpoint/submission.
- Timer, refresh, timeout, duplicate submit.

Cổng P4: candidate không thể đọc scenario pool hoặc session khác; refresh không reroll.

### P5 — Review/chấm

- Trang chi tiết code.
- Per-module submission review.
- Reuse pure result presenter khi an toàn, không reuse old exam actions/query.
- Tính summary kỹ thuật.
- Giám khảo nhập điểm/nhận xét.
- Status terminal và màu thống kê server-authoritative.

Cổng P5: giám khảo xem được đủ evidence của VOR/DME/ADS-B snapshot.

### P6 — Migration/rehearsal

- Restore schema/data copy vào database cô lập.
- Chạy migration 0010/0011 trên clone.
- Kiểm tra row counts, FK, orphan, unique, trigger, checksum.
- Chạy backfill ADS-B idempotent hai lần.
- Chạy code exam seed/test data.
- Test rollback bằng restore/redeploy image cũ, không drop bảng mới.

Cổng P6: báo cáo written / verified / remaining và target database identity khớp.

### P7 — QA browser và production pilot

- Authenticated admin browser QA.
- Authenticated candidate browser QA bằng tài khoản role Thí sinh.
- Test nhiều candidate/code đồng thời.
- Test timer/refresh/timeout.
- Test ADS-B random/review.
- Deploy feature flag tắt trước, bật cho pilot sau.

Cổng P7: không còn P0 blocker; production health, migration table và running bundle đã xác nhận.

### P8 — Cutover và deprecation

- Chuyển menu/route chính sang flow mới.
- Giữ old exam routes read-only/redirect trong thời gian theo dõi.
- Không xóa legacy tables trong release đầu.
- Sau thời hạn khiếu nại và backup policy mới quyết định deprecate/drop.

## 10. Kiểm thử

### Unit/domain

- ADS-B parser/normalizer round-trip.
- Legacy 17 scenario backfill idempotency.
- Module registry sáu thiết bị.
- Code format/hash/constant-time compare.
- Random chọn đúng module và pool.
- Không reroll nếu session item tồn tại.
- Timer deadline và terminal reason.
- Status aggregation x/y và màu xanh.

### Database

- FK/revision/archive constraints.
- Duplicate code hash.
- Double redeem concurrency.
- Double start-subject concurrency.
- Revoke/timeout race.
- Candidate session isolation.
- Review update chỉ admin.
- Không orphan item/audit.

### Component/API

- Form tạo kỳ thi.
- Checkbox module và pool count.
- Tạo nhiều code.
- Candidate code error/status.
- Session module list.
- Timer display/loading/error.
- Table status colors and accessibility.
- ADS-B library membership controls.

### Browser acceptance

1. Admin tạo kỳ thi.
2. Admin tạo hai code cho hai thí sinh.
3. Candidate A redeem code với DVOR 1150A + DME 1119A.
4. Candidate B redeem code với DME 320 + DVOR 220.
5. Hai candidate không nhìn thấy session của nhau.
6. Random selection ghi đúng snapshot.
7. Nộp một module -> row chưa xanh nếu còn module khác.
8. Nộp hết -> row xanh.
9. Hết giờ -> row xanh với reason timed_out.
10. ADS-B code random scenario từ library mới và review được evidence.

Khi đụng AppShell/navigation/new routes, chạy full CI local theo AGENTS.md: lint -> typecheck -> test:run -> build. Không dùng || true hoặc bỏ qua failure.

## 11. Rollout và rollback

### Rollout

1. Expand schema, chưa bật feature flag.
2. Backfill ADS-B source, kiểm tra count/hash.
3. Deploy code mới với flag tắt.
4. Rehearsal create/redeem/start/submit trên pilot.
5. Bật flag cho admin pilot.
6. Bật candidate pilot.
7. Theo dõi lỗi, duration, DB size, orphan/audit.
8. Mở rộng toàn bộ module.

### Rollback

- Tắt feature flag trước.
- Không drop bảng mới ngay.
- Không xóa snapshot/session đã phát sinh.
- Nếu runtime mới lỗi, rollback image/application release; dữ liệu mới giữ nguyên để điều tra.
- Legacy route chỉ được bật lại nếu đã kiểm tra tương thích; không âm thầm trộn session mới vào exam_attempts cũ.
- ADS-B source backfill có thể đánh dấu archived/revert membership, không xóa source legacy trước khi đối chiếu.

## 12. Rủi ro và biện pháp

| Rủi ro | Biện pháp |
| --- | --- |
| Code bị dùng hai lần | Hash unique + transaction lock + status transition |
| Candidate refresh làm random lại | Snapshot item và unique code_subject_id |
| Mất mạng sau khi nộp | Idempotency key, checkpoint ACK, server deadline |
| Thư viện đổi sau khi phát code | Snapshot membership/definition tại subject start |
| ADS-B legacy khác schema | Adapter/normalizer, không ép cast JSON mù |
| Scenario localStorage không lên server | Database source chính, publish chỉ từ server |
| Candidate account dùng chung | Session token/code là identity nghiệp vụ; user chỉ audit |
| Giám khảo tạo mã cho pool rỗng | Chặn server và hiển thị count theo module |
| Chấm sai do tin client | Recompute summary server-side; không tin score/solved client |
| Đổi schema làm hỏng legacy | New namespace/tables; compatibility read-only |

## 13. Acceptance criteria cuối cùng

Release chỉ đạt khi:

- Sáu module đều có registry/adapter/library membership đúng.
- ADS-B có ít nhất hai scenario Kiểm tra để test random.
- Nguyễn Hoàng Hải hoàn tất được hai module trong một code.
- Candidate login không cần email assignment.
- Code không lộ PII và không dùng lại được.
- Random selection có snapshot/revision/audit.
- Timer và timeout server-authoritative.
- Bảng giám khảo xanh đúng điều kiện toàn bộ module terminal.
- Click review mở đúng scenario/evidence của đúng code.
- Full validation và browser QA đạt.
- Migration/checksum/count/FK/orphan/trigger đã verified production.
- Có báo cáo riêng: written, verified, remaining.

## 14. Quyết định cần phê duyệt trước khi triển khai

| Mã | Quyết định đề xuất | Giá trị mặc định |
| --- | --- | --- |
| D01 | Code chứa PII hay chỉ map server-side | Map server-side, không chứa PII trong chuỗi |
| D02 | Timer bắt đầu lúc nào | Khi redeem code tạo session |
| D03 | Một code có bao nhiêu attempt | Một attempt; reset phải audit |
| D04 | ADS-B seed vào thư viện nào sau import | Import draft; giám khảo publish rõ ràng |
| D05 | Điểm tự động hay giám khảo | Evidence/summary tự động, điểm chính thức do giám khảo |
| D06 | Candidate xem điểm sau nộp | MVP chỉ giám khảo xem; candidate view-only là phase sau |
| D07 | Xử lý code mất cookie | Không tự cấp lại; giám khảo revoke/reset có audit |
| D08 | Legacy exam_* | Giữ read-only trong rollout đầu, chưa drop |

## 15. Cổng phê duyệt

Đây là bản kế hoạch chi tiết, chưa phải ủy quyền triển khai source/migration. Sau khi các quyết định D01–D08 được xác nhận, bước tiếp theo mới là tạo migration ADS-B/source và test database cô lập; chưa chạy production migration ở phase đầu.
