# Kế hoạch refactor tình huống, thư viện Ôn tập và Kiểm tra — bản QA hiệu chỉnh

- Ngày lập: 27/09/2026.
- Vị trí tài liệu: `plans/refactor/` vì `docs/plans/` hiện bị `.gitignore` loại trừ; không thay đổi quy tắc Git của dự án.
- Trạng thái: IN PROGRESS — đang triển khai pilot theo phase; chưa migration/deploy production.
- Phạm vi hiện tại: đã sửa code/test cho P1, P2 và P4 pilot; chưa chạy migration thật, commit, push hay deploy.
- Đầu vào: 5 yêu cầu của người dùng và bản kế hoạch Luna được bàn giao trong hội thoại. Không tìm thấy file kế hoạch Luna độc lập trong repository; đây không phải kiểm định một tài liệu Luna khác ngoài nội dung đã được bàn giao.
- Căn cứ: đối chiếu source hiện tại, CodeGraph, focused tests và migration files. Không có Docker/psql/PostgreSQL local trong môi trường hiện tại nên rehearsal database chưa chạy; không truy cập production.
- Mọi tên bảng, API và kiểu dữ liệu ghi là “đề xuất” bên dưới đều chưa tồn tại hoặc chưa được triển khai đầy đủ.

## 1. Kết luận QA

Năm yêu cầu đều hợp lý và khả thi. Hướng Luna đúng ở việc tách quyền sửa, điều kiện hoàn thành, bằng chứng thao tác, thư viện và lượt thi; nhưng chưa đủ điều kiện giao thẳng cho lập trình viên triển khai.

Các thiếu sót quan trọng nhất là: nghĩa của “thông số cần tác động” chưa rõ; whitelist còn liên quan đến đánh giá chứ không chỉ UI; schema các thiết bị khác phiên bản; chưa có quy tắc đầy log, mất mạng, sửa đề sau giao bài, phân quyền giáo viên theo đối tượng và tương thích hệ thống thi cũ.

Phương án hiệu chỉnh: mở mặc định quyền sửa nghiệp vụ cho tình huống mới, giữ các khóa an toàn của thiết bị; một nguồn tình huống có phiên bản bất biến; hai thư viện chỉ là nơi công bố; phiên kiểm tra được lưu database, thời hạn do server quyết định; kết quả kỹ thuật hỗ trợ giáo viên chấm, không tự được xem là điểm chính thức.

Không làm một đợt thay thế toàn bộ. Làm pilot xuyên suốt trên DVOR 1150A và DME 1119A, sau đó mở rộng ba thiết bị còn lại. ADS-B và bài thi VOR/DME kiểu cũ phải tiếp tục chạy, nhưng không bị ép chuyển sang schema Scenario Parameters trong đợt này.

## 2. Những gì thực sự đã có

| Hiện trạng đã kiểm tra | Bằng chứng source | Hệ quả với kế hoạch |
| --- | --- | --- |
| Scenario Parameters hỗ trợ 5 thiết bị; DVOR 1150 là schema v2, bốn thiết bị còn lại khai báo v1 | [scenario-parameters.ts](../../src/lib/scenario-parameters.ts) | Không dùng khẩu hiệu “nâng tất cả lên v2” mà không có migration theo module |
| DVOR 1150/1150A và DME 1119A có `studentEditableFieldIds`; danh sách còn được dùng để phát hiện sửa field được bảo vệ | [DVOR 1150A scenario](../../src/lib/dvor1150a/scenario.ts), [DME 1119A scenario](../../src/lib/dme1119a/scenario.ts) | Phải sửa đồng bộ quyền sửa, kiểm tra cấu hình và đánh giá; không chỉ đổi checkbox |
| DME 1119A dùng độ dài whitelist trong đánh giá khả năng khắc phục | `evaluateDme1119aScenario` trong file trên | Policy `open` không thể tiếp tục bị hiểu là “không có field được phép sửa” |
| Có action history với `before`, `after`, `accepted`, `reason` | [scenario-evidence.ts](../../src/lib/scenario-evidence.ts) | Tái sử dụng contract, nhưng JSON hợp lệ không có nghĩa là đã loại mật khẩu hoặc đã chống giả mạo |
| Log hiển thị tham số đang giới hạn 100; bản ghi không có cấu trúc giá trị cũ/mới; phục hồi từ history chỉ lấy Backup/Flash Save | [parameter-change.ts](../../src/lib/simulator-config/parameter-change.ts) | Đổi hằng số 100 thành 500 không đáp ứng yêu cầu nhật ký phiên thi |
| VOR/DME submissions có `action_history` và `resolution` | [migration 0005](../../database/migrations/0005_submission_action_evidence.sql) | Không tạo thêm một hệ thống kết quả cạnh tranh với kết quả cũ |
| Kho tình huống và công bố Ôn tập đã có database/API | [migration 0004](../../database/migrations/0004_simulator_scenario_parameters.sql), [migration 0006](../../database/migrations/0006_simulator_review_scenario_assignments.sql) | Cần nâng cấp và backfill, không xây lại từ đầu |
| Student chỉ GET tình huống theo ID khi đã được gắn Ôn tập; API này trả definition dùng cho luyện tập | [scenario-parameters API](../../src/app/api/scenario-parameters/route.ts) | Không nới API này thành cổng đọc đề thi; đề kiểm tra phải đi theo quyền của attempt |
| PUT Ôn tập thay toàn bộ danh sách của một module | [review-scenarios API](../../src/app/api/review-scenarios/route.ts) | Khi nhiều giáo viên cùng quản lý cần revision/chống ghi đè, không chỉ transaction |
| Nút thêm kịch bản hiện mở file JSON | [scenario-management-workspace.tsx](../../src/components/scenario/scenario-management-workspace.tsx) | Bỏ import/export đòi hỏi có editor nội bộ đủ chức năng trước khi bỏ nút cũ |
| App role hiện chỉ `admin` và `student`; loader cũng từ chối role khác | [profile.ts](../../src/lib/auth/profile.ts), [migration 0001](../../database/migrations/0001_users_and_sessions.sql) | Thêm `teacher` phải xuyên suốt DB, session/profile, server actions và navigation |
| Exam dùng `vor`, `dme`, `ads-b`; loader dựa vào các nguồn scenario cũ | [exam types](../../src/lib/exams/types.ts), [exam queries](../../src/lib/exams/queries.ts) | Không đổi nhãn `vor` thành `dvor-1150a` rồi coi là tích hợp xong |
| RPC start/submit gắn thí sinh bằng email và user của attempt; chưa có duration/deadline trong contract đã kiểm tra | [migration 0003](../../database/migrations/0003_portable_rpcs.sql) | Cần assignment bằng `user_id` và deadline trên server |
| Mỗi candidate-subject có một attempt; giám khảo hiện được lưu bằng họ tên, chưa phải liên kết tài khoản | [migration 0002](../../database/migrations/0002_application_schema.sql) | Không dùng họ tên làm quyền chấm; làm lại phải tạo assignment mới |
| Exam cũ yêu cầu địa điểm và căn cứ tổ chức | `exams`, `ExamInput`, `validateExamInput` | Luồng giao bài nhanh cần loại kiểm tra thực hành, không tự bịa địa điểm/căn cứ |
| Đã có lưu cấu hình cá nhân; nhiều subscriber bỏ qua scenario đang active | [simulator-config-persistence.tsx](../../src/components/simulator/simulator-config-persistence.tsx) | Bảo toàn cơ chế cách ly; bổ sung kiểm thử hydrate muộn và queue lưu đang chạy |

Worktree đang có thay đổi DVOR 1150 non-A từ công việc trước, gồm logic chẩn đoán hai giai đoạn, UI phần cứng và test. Không coi chúng là phần triển khai kế hoạch này; không revert, stage hoặc commit gộp. Chưa có căn cứ kết luận chúng đã được nghiệm thu đầy đủ.

## 3. Các tồn tại của kế hoạch Luna và cách khắc phục

P0 = phải xử lý trước khi phát hành chức năng liên quan; P1 = phải hoàn tất trước khi mở rộng/triển khai chính thức.

| ID | Mức | Tồn tại | Cách hiệu chỉnh | Cổng xác nhận |
| --- | --- | --- | --- | --- |
| F01 | P0 | “Mở whitelist” dễ bị hiểu là bỏ mọi kiểm soát | Mặc định `open` cho tình huống mới ở cả hai thư viện; vẫn kiểm tra quyền PMDT, field catalog và điều kiện vận hành | T01–T04 |
| F02 | P0 | Trộn field được phép sửa với field bắt buộc phải tác động | Tách edit policy, mục tiêu thao tác và điều kiện kết thúc; chỉ mục tiêu được giáo viên chọn rõ mới bắt buộc | T05–T08 |
| F03 | P0 | Whitelist rỗng của dữ liệu cũ có thể bị đổi nghĩa | Legacy adapter giữ nguyên hành vi; chỉ chuyển khi giáo viên xác nhận và tạo revision mới | T04, T24 |
| F04 | P0 | “Schema v2 chung” đụng schema v2 đã có của DVOR 1150 | Tách phiên bản envelope chung, schema từng thiết bị và engine/evaluator; không ghi đè parser cũ | T24–T25 |
| F05 | P0 | Bộ criteria chung chưa có ngữ nghĩa riêng từng thiết bị | Capability matrix; criterion không hỗ trợ phải chặn công bố; không mặc định pass | T05–T08 |
| F06 | P0 | Monitor Normal có thể đạt bằng đổi ngưỡng, bypass hoặc tắt monitor | Phân biệt trạng thái chỉ thị với phục hồi vật lý; criterion/rubric về ngưỡng, monitor enabled, active TX phải được định nghĩa theo bài | T06 |
| F07 | P0 | Log 500 chưa xác định đơn vị, thứ tự và cách xử lý đầy | Chốt 500 sự kiện nghiệp vụ/lượt làm; event chứa các field delta; đánh dấu thiếu bằng chứng khi vượt giới hạn | T09–T12 |
| F08 | P0 | Log tham số giao diện bị nhầm thành audit đầy đủ | Thu nhận tại action/domain boundary; phân biệt draft, Apply, Backup, Restore và lệnh bị từ chối | T09–T10 |
| F09 | P0 | Lưu local chưa đủ cho giám khảo xem từ tài khoản/máy khác | Database là nguồn chính cho kiểm tra; bộ nhớ trình duyệt chỉ phục hồi; mỗi lần đồng bộ có ACK và revision | T11–T15 |
| F10 | P0 | Snapshot ở lúc bắt đầu vẫn cho phép đề đổi sau khi đã giao | Ghim revision khi giao bài/khóa đề; attempt chỉ sao chép revision đã ghim | T17–T18 |
| F11 | P0 | Thêm teacher bằng kiểm tra role chung có thể mở toàn bộ quyền admin | Kiểm tra quyền theo người sở hữu/bài được phân công ở mọi API, action và RPC | T19–T21 |
| F12 | P0 | Membership thư viện chưa bao gồm lifecycle, ownership và concurrency | Draft/published/archived, revision kỳ vọng, archive thay xóa dữ liệu đã sử dụng; một nguồn ghi chính | T16–T18, T24 |
| F13 | P0 | Timer chưa định nghĩa mất mạng, reload, nộp trùng và hết giờ | Deadline từ DB; submit/finalize idempotent; timeout dùng checkpoint đã được server xác nhận | T12–T15 |
| F14 | P0 | Chưa giới hạn mức tin cậy của bằng chứng browser | Không tin `solved`, điểm hay timestamp client; evaluator server kiểm tra lại trạng thái; vẫn ghi rõ đây chưa phải hệ thống chống gian lận tuyệt đối | T22 |
| F15 | P0 | Ghép Scenario Parameters với exam cũ dễ làm hỏng khóa ngoại, route và review | Adapter phân biệt nguồn và module ID chính xác; giữ exam legacy và ADS-B nguyên đường đi | T23–T25 |
| F16 | P1 | Chưa đủ luồng editor khi bỏ JSON và chưa có lát cắt end-to-end | Editor → công bố → giao → thi → giáo viên xem; pilot hoàn chỉnh trước khi thêm thiết bị | T26–T28 |
| F17 | P0 | Bỏ sót dữ liệu đang lưu cá nhân và chẩn đoán hai giai đoạn | Session context riêng; không ghi scenario vào profile; bảo toàn PMDT → phần cứng | T07, T23 |
| F18 | P1 | 500 bản ghi/phiên không ngăn database tăng mãi | Giới hạn byte, số bản cache, chính sách lưu giữ và cảnh báo dung lượng riêng | T10–T11, T29 |
| F19 | P0 | Kế hoạch thiếu migration/rollback và phạm vi phát hành | Expand → backfill → switch → contract, feature flag theo thiết bị; không drop dữ liệu trong rollout đầu | T24–T25, T30 |
| F20 | P1 | Chưa phân biệt kiểm tra nhanh với cấu trúc kỳ thi hành chính | Tái sử dụng exam core với `exam_kind`; kiểm tra thực hành không bị ép nhập căn cứ/địa điểm giả | T27 |

## 4. Quyết định nghiệp vụ cần duyệt

Đây là phương án mặc định đề xuất để có thể lập kế hoạch cụ thể, chưa phải những quyết định người dùng đã phê duyệt.

| ID | Quyết định đề xuất | Nếu chọn khác |
| --- | --- | --- |
| D01 | Tình huống mới mặc định `open` cả Ôn tập và Kiểm tra. Tình huống cũ giữ policy tương đương whitelist hiện hành | Mặc định restricted cho Kiểm tra phải được xác nhận riêng |
| D02 | 500 là số sự kiện nghiệp vụ của một lượt làm, tổng toàn bộ item; một Apply có nhiều field nằm trong một event | Nếu là 500 field-delta hoặc 500 phiên đã lưu, phải đổi schema/retention và test trước P4 |
| D03 | Khi đủ 500: giữ 500 event đầu, tiếp tục checkpoint và thống kê thiếu log; đánh dấu bắt buộc giám khảo xem xét | Muốn audit chi tiết đầy đủ mọi thao tác thì không thể đồng thời hard-cap 500 event; cần chọn giới hạn hiển thị thay giới hạn lưu |
| D04 | Thời gian tính cho toàn bộ bài được giao, bắt đầu khi server xác nhận “Bắt đầu”; không dừng khi đóng tab/mất mạng | Timer từng tình huống, pause hoặc gia hạn là phạm vi bổ sung |
| D05 | Một assignment chỉ có một attempt; làm lại bằng assignment mới; không xóa bài cũ | Nhiều lần làm tự động cần chính sách số lần/điểm được tính |
| D06 | Giáo viên được tạo/sửa bài của mình, dùng bài đã công bố để giao và xem bài do mình giao; admin quản lý toàn bộ | Đồng sở hữu/chia sẻ chấm cần quyền liên kết tài khoản cụ thể, không suy ra từ tên giám khảo |
| D07 | Khi đưa cùng revision vào cả hai thư viện, phải cảnh báo rằng nội dung đã được dùng để luyện tập; vẫn cho phép | Nếu muốn bí mật tuyệt đối phải dùng revision/bài riêng không công bố Ôn tập |
| D08 | Điểm chính thức do giám khảo nhập; checks tự động là bằng chứng hỗ trợ | Chấm tự động có trọng số và chống can thiệp sâu là đợt riêng |
| D09 | Sau mất mạng, không chấp nhận thao tác nhận lần đầu sau deadline là thao tác đúng giờ; dùng checkpoint đã ACK | Cho phép bài thi offline có xác nhận giờ cần trust model khác |
| D10 | Phạm vi hoàn thành đợt này: 5 thiết bị Scenario Parameters; ADS-B và exam legacy chỉ bảo toàn, không hợp nhất schema | Nếu cả 6 thiết bị phải có editor/thư viện thống nhất thì phải mở rộng dự toán |
| D11 | Local cache Ôn tập: đề xuất tối đa 20 phiên đã kết thúc, 30 ngày, ngân sách 20 MiB; không tự xóa phiên đang làm/chưa đồng bộ. DB: chưa tự xóa điểm/bài thi; đề xuất thời hạn audit chi tiết 180 ngày để chủ dự án quyết định | Chính sách xóa DB phải được duyệt riêng cùng thời hạn khiếu nại, backup và restore; không triển khai xóa chỉ vì duyệt UI |

Điểm cần chốt ưu tiên: D02/D03 (500 và mất log), D04/D09 (timer/mất mạng), D06 (quyền giáo viên), D10 (phạm vi thiết bị). Không để lập trình viên tự chọn khác nhau giữa các màn hình.

## 5. Thiết kế chức năng và kỹ thuật đã hiệu chỉnh

### 5.1. Tách rõ 6 thành phần của tình huống

1. `initialState`: trạng thái ban đầu và lỗi được người soạn đưa vào.
2. `editPolicy`: những gì học viên có thể sửa, có giới hạn hay không.
3. `taskTargets`: những tham số/thao tác bài thực sự yêu cầu học viên tác động; có thể rỗng.
4. `completionCriteria`: trạng thái và quy trình cần đạt khi kết thúc.
5. `attemptEvidence`: lịch sử hành động, checkpoint và câu trả lời của một lượt làm.
6. `resolution`: kết quả đối chiếu các tiêu chí tại thời điểm nộp/hết giờ, tách khỏi điểm chính thức.

“Được phép sửa Monitor Configuration” không đồng nghĩa “bắt buộc sửa tất cả tham số Monitor Configuration”. UI phải giải thích khác biệt này ngay nơi thiết lập, không chỉ trong tài liệu.

### 5.2. Quyền sửa và chọn nhóm/tham số

Contract minh họa, không phải source cần chép nguyên xi:

```ts
type ScenarioEditPolicy =
  | { mode: "open" }
  | { mode: "restricted"; allowedFieldIds: string[] };

type TaskTarget = {
  fieldId: string;
  requirement: "inspect" | "change-applied";
};
```

- `open`: mọi field trong catalog được phân loại `student-operable`, tại catalog version đã ghim. Field mới thêm ở bản phần mềm sau không tự được mở cho một đề cũ.
- `restricted`: chỉ các field đã chọn; rỗng có nghĩa không cho sửa cấu hình, nhưng vẫn có thể là bài chẩn đoán/hardware hợp lệ.
- Không dùng `*`, prefix tùy ý hoặc JSON path do người dùng nhập để cấp quyền.
- Chọn nhóm Monitor/Transmitter chỉ là tiện ích UI; lúc công bố phải resolve thành danh sách field ID ổn định. Chọn một phần nhóm hiển thị trạng thái trung gian.
- Security accounts, mật khẩu, đồng hồ, field read-only, lỗi do người soạn đưa vào, raw measurement override và field chỉ dành cho instructor không được mở theo `open`.
- Phân loại từng field dựa trên catalog/module; không dựa duy nhất vào tên chứa `fault` hay `monitor`.
- Chính sách của bài kết hợp với quyền PMDT và điều kiện vận hành. `open` không cho tài khoản view-only thực hiện Apply hoặc bỏ qua Local/Bypass.
- Các lệnh vận hành như chuyển TX, Local, Bypass, Backup, Restore có capability/action policy riêng. Không ép tất cả thành field sửa trực tiếp; kiểm tra đúng điều kiện riêng từng thiết bị.
- Nếu bài cần hạn chế Restore/Reset để tránh bỏ qua quy trình, người soạn phải cấu hình rõ. Thay đổi hàng loạt từ Restore vẫn phải được đối chiếu edit policy và ghi log, không trở thành đường vòng sửa field bị khóa.
- Giá trị draft chưa Apply không được tính là đã sửa cấu hình thực. Edit rồi Cancel chỉ là thao tác nháp; không được tính hoàn thành `change-applied`.
- Không buộc mọi bài chẩn đoán phải sửa tham số. `taskTargets=[]` hợp lệ nếu có criterion chẩn đoán phù hợp.

Phải cập nhật cả UI gate, store/action gate, `get*ProtectedFieldChanges`, `is*StudentEditable`, logic `correctable`, evaluation và validator dữ liệu đầu vào. Đây là lý do F01/F03 không thể giải quyết bằng một điều kiện ở component.

### 5.3. Criteria theo năng lực từng thiết bị

Giai đoạn đầu dùng danh mục typed cố định, không cho giáo viên nhập JavaScript/biểu thức tùy ý.

| Criterion | Ngữ nghĩa phải xác định trong adapter |
| --- | --- |
| Local Off | Local của đúng controller/module đã tắt |
| Monitor Normal | Chỉ rõ Integral/Standby hoặc monitor/channel nào; các monitor bắt buộc vẫn enabled, không dùng “tắt monitor” để coi là bình thường |
| Bypass Cleared | Các loại bypass có liên quan đều tắt; không chỉ một cờ giao diện |
| No Maintenance Alarm | Không còn nguồn cảnh báo maintenance đang active; acknowledge/xóa lịch sử không đồng nghĩa khắc phục |
| Backup Complete | Không còn `needBackup`/dirty persistent state tương ứng; không gộp ngầm với No Maintenance Alarm |
| Active Transmitter | Có đúng TX được yêu cầu on-air; TX cũ ở trạng thái phù hợp; Load/Off không bị lẫn |
| No VSWR Alarm | Dùng trạng thái VSWR do engine tính; tắt đường giám sát không được thay cho phục hồi |
| Parameter Target | Field, đơn vị, target/range và tolerance; kiểm tra trên applied state, không trên input đang gõ |
| Diagnosis/Hardware Complete | Giữ checkpoint PMDT, thao tác bắt buộc và đúng occurrence của card/TX/Monitor; theo disposition của bài |

Quy tắc đánh giá:

- Các tiêu chí bắt buộc được kết hợp bằng AND trong MVP; chưa làm trình dựng logic AND/OR tùy ý.
- Capability không hỗ trợ → lỗi cấu hình khi công bố; không giả pass hoặc lặng lẽ bỏ qua.
- Khi tất cả tiêu chí trống, không công bố làm bài chấm tự động. Bài đánh giá thủ công phải có loại/chỉ dẫn và trạng thái “chấm thủ công” rõ ràng, không dùng AND rỗng để cho pass.
- Đánh giá lại khi nộp, không chỉ giữ cờ “đã từng solved”. Học viên sửa hỏng lại sau khi đạt phải phản ánh trạng thái cuối.
- Không tự mặc định `No Active Faults` cho bài thay module: lỗi phần cứng được đưa vào có thể chỉ cần chẩn đoán, chưa có mô phỏng thay card thực.
- Việc nới ngưỡng báo động có thể là một bài hợp lệ hoặc một cách xử lý sai. Rubric phải chỉ rõ field nào cần giữ nguyên/target vật lý nào phải đạt, không suy luận duy nhất từ màu xanh của monitor.
- Kiểm tra tính khả thi trước công bố: target thuộc vùng sửa được; giá trị trong miền hợp lệ; lệnh cần thiết không bị policy chặn; criteria không mâu thuẫn start state/disposition. Đây là kiểm tra quy tắc đã biết, không tuyên bố tự chứng minh mọi bài đều giải được.
- Giáo viên chạy thử lời giải hợp lệ và ít nhất một lời giải sai trong preview cô lập trước khi công bố.

### 5.4. Phiên bản và thư viện

Quan hệ dữ liệu tối thiểu:

```text
Scenario identity (1 nguồn gốc)
  └─ Revision bất biến + schema/catalog/evaluator version
       ├─ Membership Ôn tập → công bố cho học viên
       └─ Membership Kiểm tra → giáo viên chọn giao bài
            └─ Đề/assignment ghim revision
                 └─ Attempt + snapshot + checkpoint + tối đa 500 event
                      └─ Kết quả kỹ thuật + điểm/nhận xét của giám khảo
```

- Không copy hai bản tình huống chỉ vì chọn “cả hai”. Membership trỏ revision đã công bố; Ôn tập và Kiểm tra có thể trỏ revision khác nhau nếu giáo viên chủ động cập nhật.
- Vòng đời: nháp → công bố vào một/hai thư viện → lưu trữ. Sửa bản đã công bố tạo nháp revision mới; không ghi đè revision đã được giao.
- Giao bài đóng băng revision/policy/criteria. Bắt đầu thi đóng băng engine/evaluator version và bản khởi tạo theo revision đã giao; không lấy “mới nhất”.
- Không triển khai bundle/engine không tương thích giữa một đợt thi đang chạy. MVP dùng cửa sổ triển khai tránh active attempts; lưu version không tự làm engine cũ tiếp tục chạy được.
- Gỡ khỏi thư viện chỉ ngăn giao/khởi tạo lượt mới từ thư viện; không xóa attempt, assignment đang hợp lệ hoặc kết quả đã nộp. Thu hồi assignment chưa bắt đầu là thao tác riêng, có xác nhận.
- Bài cũ chỉ được backfill Ôn tập nếu đang có assignment Ôn tập. Không tự công bố tất cả bài còn lại vào Kiểm tra.
- Revision đã được tham chiếu không hard-delete; dùng archive và FK restrict. Chỉ xóa nháp chưa được dùng theo quyền và xác nhận rõ.
- Khi teacher/admin cùng sửa, gửi `expectedRevision`; xung đột trả 409 và yêu cầu tải/so sánh, không tự ghi đè.
- API Ôn tập cũ chuyển thành lớp tương thích của membership mới sau cutover; không duy trì hai danh sách độc lập có thể lệch nhau.

### 5.5. Nhật ký, giới hạn 500 và khả năng phục hồi

#### Đơn vị ghi log

Một event nghiệp vụ tương ứng một hành động có ý nghĩa: Apply, Backup, Restore, chuyển TX, Local/Bypass, thao tác chẩn đoán, hoặc lệnh bị từ chối. Apply nhiều field là một event với `changes[]`, không ghi mỗi phím gõ thành một record. Lượt xem màn hình lặp lại có thể tổng hợp checkpoint, không spam 500 slot.

Event đề xuất gồm:

- `eventId`, `attemptId/sessionId`, `attemptItemId`, `moduleId`, `revisionId`, `clientSequence`, `serverSequence`.
- `actionId`, `phase` (draft/apply/command/backup/restore), `changes[]` gồm `fieldId`, label/unit tại revision đó, giá trị cũ/mới đã chuẩn hóa.
- `reportedAccepted`, `reasonCode`, `validationStatus`; phân biệt “simulator báo chấp nhận” và “server đã xác thực payload”.
- `clientOccurredAt` để tham khảo, `serverReceivedAt` để audit; user ID do server lấy từ session, không tin ID gửi trong body.
- Chỉ ghi field nằm trong allowlist audit. Không ghi password, token, cookie, toàn bộ security config hoặc request body tùy ý. Kiểu JSON không tự đảm bảo loại bí mật; phải có bộ lọc và test. [OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

Ghi tại action/domain boundary để bao phủ toolbar, hotkey F7/F8, context menu và thay đổi hàng loạt. Một lệnh bị từ chối không tạo delta applied giả; Apply no-op không được tính là đã sửa target. Phân biệt thao tác học viên với việc system hydrate, đưa lỗi ban đầu hoặc khôi phục checkpoint.

#### Chính sách lưu và khi đầy

- Giới hạn 500 event chi tiết trên một attempt, bao gồm các item của bài; phiên Ôn tập tương ứng một local session. Giới hạn phải được áp dụng phía server bằng transaction, không chỉ `.slice()` ở UI.
- Giữ event 1–500 bất biến. Sau đó tiếp tục lưu checkpoint cuối, số lần thay đổi theo field/criterion đã định danh, `totalEventCount`, `storedEventCount`, `droppedCount`, `evidenceTruncated`, khoảng sequence thiếu và lý do.
- Thống kê tổng hợp không có lịch sử giá trị đầy đủ và không phải bằng chứng thay thế tương đương. `evidenceTruncated` bắt buộc hiển thị cho giám khảo; không kết luận chắc chắn về toàn bộ quy trình đã thực hiện.
- Event vượt cap được server kiểm tra khi nhận nhưng không lưu chi tiết; ACK vẫn ghi sequence đã xử lý. Retry phải có batch sequence đơn điệu và ACK high-water mark để không cộng lại `droppedCount`.
- Không cho client overwrite 500 event trước bằng một JSON array mới. Server chỉ append hợp lệ; sửa nhận xét/điểm là dữ liệu khác có audit riêng.
- Nộp bài, timeout, kết quả cuối và thời gian chính thức nằm ở attempt record/checkpoint, không bị mất vì log hết slot.
- Thêm giới hạn byte/event, số field/event, độ dài chuỗi, độ sâu JSON, byte/checkpoint, byte/batch. P0 đo trường hợp Restore toàn bộ để chốt các số này; không cắt cụt giá trị âm thầm.
- Event quá lớn phải chia thành các phần có transaction ID hoặc bị từ chối rõ ràng theo contract. Không làm thay đổi cấu hình mà không thông báo không lưu được evidence.
- Giới hạn hiển thị log RMS cũ 100 là vấn đề riêng; không thay toàn cục chỉ để “đạt 500”. Nhật ký học viên/giám khảo lấy evidence contract mới; reuse renderer qua adapter nếu phù hợp.

Giới hạn 500/attempt không giới hạn tổng database. Dự toán dung lượng dựa trên số attempt × kích thước event đo được + checkpoint + index + backup. Ví dụ giả định 2 KiB/event thì 500 event khoảng 1 MiB/attempt trước các phần khác; đây không phải số đo của hệ thống hiện tại.

#### Lưu local và đồng bộ

- Kiểm tra: database là nguồn sự thật về attempt, thời hạn, dữ liệu đã nhận và kết quả. Local không phải bản nộp chính thức.
- Ôn tập: đề xuất IndexedDB cho phiên/checkpoint/log; đây vẫn là lưu trên máy học viên. Không chọn localStorage chỉ vì API đơn giản khi payload gồm nhiều event và trạng thái thiết bị.
- Browser storage có quota, có thể bị người dùng xóa và có hạn chế ở private mode. Phải xử lý lỗi ghi/quota và thông báo mức phục hồi thực tế. [MDN Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- Dùng namespace `app/version/user/module/session`. Đổi tài khoản không được hiển thị phiên người trước. Khi logout có dữ liệu chưa gửi, cảnh báo rõ; cache nhạy cảm được xử lý theo chính sách logout đã duyệt.
- Đề xuất autosave checkpoint tối đa mỗi 5 giây khi có thay đổi, gửi ngay sau Apply/lệnh quan trọng và trước submit; debounce draft, không gửi toàn bộ cấu hình mỗi keystroke.
- Mỗi batch có idempotency key, expected checkpoint revision và sequence; chỉ xóa khỏi outbox sau ACK. Giữ thứ tự và backoff có giới hạn; không phụ thuộc `beforeunload` để lưu lần cuối.
- Snapshot phục hồi phải đủ applied/draft, dirty/needBackup, Local/Bypass, TX, lỗi active, stage PMDT/hardware, câu trả lời và con trỏ sequence; không serialize password/security session.
- Refresh phục hồi đúng attempt và revision. Không reset đồng hồ, không ghi hydrate thành thao tác học viên, không đánh tráo profile cá nhân thành baseline bài.
- Hai tab cùng attempt: server giữ một writer lease/version; tab sau read-only hoặc takeover có xác nhận. Takeover tăng generation, từ chối writer cũ. Đây không phải cơ chế chống gian lận tuyệt đối.
- Server kiểm tra và recompute các checks từ trạng thái hợp lệ; không tin cờ `solved`/điểm của client. Với engine chạy trên browser, dữ liệu đầu vào vẫn có thể bị can thiệp. Chưa được quảng bá log này là audit chống giả mạo hoàn toàn; server-authoritative command replay là phạm vi riêng nếu cần.

### 5.6. Giáo viên, giao bài và thời gian

#### Phân quyền

| Hành động | Admin | Teacher | Student |
| --- | --- | --- | --- |
| Quản lý tài khoản/cấp role | Có | Không | Không |
| Tạo nháp/preview tình huống | Có | Có, trong phạm vi cho phép | Không |
| Sửa/công bố/archive tình huống | Toàn bộ | Bài sở hữu hoặc được cấp quyền | Không |
| Đọc thư viện Kiểm tra để giao bài | Có | Bài đã công bố có quyền sử dụng | Không có quyền đọc toàn kho |
| Giao bài/chọn tài khoản | Có | Theo phạm vi tài khoản được phép giao | Không |
| Làm bài | Luồng xem thử riêng | Luồng xem thử riêng | Chỉ assignment của chính mình |
| Xem log/nhận xét/chấm | Toàn bộ | Bài mình giao/được phân công | Kết quả của mình theo chính sách công bố |

Mọi request phải kiểm tra quyền theo tài nguyên; ẩn nút không phải là phân quyền. Mặc định mở thao tác trong simulator không được áp dụng thành “mặc định mở API”. [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

- Không replace hàng loạt `role === admin` bằng `admin || teacher`. Role mới không được thừa hưởng quản lý user hay đọc kết quả lớp/giáo viên khác.
- Giao bằng `user_id` lấy từ danh sách tài khoản hợp lệ; email/họ tên là thông tin hiển thị. Không tự cấp teacher theo tên/email miền cơ quan.
- API thay đổi dữ liệu dùng cơ chế chống CSRF/cùng origin phù hợp với cookie session hiện tại; kiểm tra request trực tiếp, giới hạn tần suất và kích thước body trước parse sâu. Không xem việc có session cookie là đủ cho mọi mutation.
- Dữ liệu candidate cũ chỉ backfill `user_id` khi ánh xạ duy nhất và kiểm tra được. Bản ghi mơ hồ giữ legacy và báo danh sách cần xử lý, không đoán.
- `exam_examiners.full_name` hiện không là bằng chứng danh tính. Nếu cần giao chấm, bổ sung liên kết user rõ ràng; MVP cho chủ assignment/admin chấm trước.
- Tách payload của người soạn/giám khảo khỏi payload học viên. API attempt chỉ trả tình huống đã được giao, đúng item đang được phép làm; không trả đáp án/rubric nội bộ/expected hardware IDs.
- Fault state cần cho engine client vẫn có thể tiết lộ gợi ý qua dữ liệu tải xuống; loại bỏ đáp án rõ ràng không đồng nghĩa giữ bí mật hoàn toàn. Chấp nhận giới hạn này theo D08 hoặc mở dự án hardening riêng.
- Nếu revision ở cả Ôn tập và Kiểm tra, không hứa bí mật nội dung; đây là lựa chọn nghiệp vụ có cảnh báo.

#### Tái sử dụng exam core

- Giữ `exam_sets`, papers, candidates, candidate-subjects, attempts và item hiện có; thêm lớp giao bài nhanh, không xây một LMS thứ hai.
- Đề xuất `exam_kind = official | training`, backfill bản cũ là `official`. Với `training`, địa điểm/căn cứ tổ chức là tùy chọn; không nhét giá trị giả để vượt validation. Ràng buộc cũ của `official` vẫn giữ.
- Chọn một hoặc nhiều bài → thời gian → tài khoản học viên → xác nhận. Service tạo các bản ghi exam liên quan trong một transaction và chống giao trùng do double-click/retry.
- Đề xuất mở rộng registry exam bằng module ID chính xác của 5 thiết bị và `source_kind`, `scenario_revision_id`; legacy `vor/dme/ads-b` giữ nguyên. Không suy ra DVOR 1150 hay 1150A chỉ từ `vor`.
- Phải cập nhật catalog, subject-module links, composite FK, RPC payload, route resolver, student sanitizer, trang chấm và in kết quả. Ánh xạ môn/thiết bị cần được kiểm tra ở P0 trước DDL.
- Assignment ghim revision khi giao. Sửa source không sửa nội dung của bài đã giao. Muốn đổi bài: thu hồi assignment chưa bắt đầu và tạo assignment mới có audit.

#### Quy tắc timer/submit

- `duration_seconds = null` nghĩa không giới hạn; số dương là giới hạn. UI có 5 phút, 10 phút, tùy chọn khác trong giới hạn đã duyệt và Không giới hạn; không dùng 0 lẫn lộn với null.
- Server tạo `started_at`, `deadline_at` một lần khi start. Start gọi lại trả cùng attempt/deadline. Mỗi item dùng chung deadline của bài theo D04.
- Countdown client dựa trên `serverNow` và `deadline_at`; đổi giờ máy, reload, sleep hoặc tab nền không gia hạn bài.
- Mọi thao tác lưu/submit cần khóa/kiểm tra attempt và thời gian DB sau khi đã lấy lock; không tin thời gian bắt đầu transaction cũ nếu request phải chờ lock lâu.
- Trước deadline: lưu checkpoint/event hợp lệ. Tại hoặc sau deadline: khóa ghi tiến độ mới, finalize từ checkpoint đã ACK và ghi `completion_reason = timeout`.
- Giữ status terminal tương thích (`submitted`) và thêm reason phân biệt tự nộp/hết giờ; không thêm hàng loạt status mới vào mọi màn hình nếu chưa cần.
- Khi hết giờ ở bài nhiều item: chốt item đang làm từ checkpoint cuối; item chưa mở không có câu trả lời/điểm kỹ thuật và không được bịa `started_at`. Đề xuất giữ item chưa mở ở trạng thái lưu trữ `pending`, UI suy ra “chưa làm — bài đã hết giờ” từ parent terminal/timeout. RPC/guard/report phải cho phép parent timeout kết thúc với item chưa làm, trong khi submit thông thường giữ quy tắc hoàn tất item hiện hành.
- Nộp chủ động: gửi checkpoint cuối + batch còn lại và finalize trong transaction; server trả ACK chính thức. Nếu request đến lần đầu sau deadline thì dùng chính sách timeout, không tin timestamp client để lùi giờ.
- Request submit trùng hoặc ACK bị mất: trả cùng kết quả đã chốt, không tạo bài thứ hai. Retry của batch đã ACK được phép lấy lại ACK nhưng không ghi dữ liệu mới.
- Mất mạng: hiện “chưa đồng bộ” và số thao tác đang chờ. Đồng hồ tiếp tục chạy. Khi nối lại trước deadline có thể gửi; sau deadline giữ dữ liệu muộn để báo thiếu đồng bộ, không tự nhập vào kết quả chính thức.
- Session đăng nhập hết hạn/role bị thu hồi: ngừng gửi mutation, thông báo cần xác thực lại; chỉ đúng tài khoản và quyền còn hiệu lực mới resume được. Deadline không reset. Không rơi ngầm từ chế độ thi sang thực hành local để tiếp tục ghi như bài thi hợp lệ.
- Không cần thêm hạ tầng scheduler cho MVP: mọi read/list/write attempt đều thực hiện hoặc phản ánh expiry; khi không có request, `deadline_at` vẫn là thời điểm hết hạn có hiệu lực, `finalized_at` có thể muộn hơn. Nếu yêu cầu thông báo tức thời khi mọi tab đã đóng, thêm job server idempotent ở phạm vi được duyệt riêng.
- Không giới hạn thời gian không có nghĩa log/cache không giới hạn. Retention không tự xóa attempt đang active.

### 5.7. Mô hình lưu trữ đề xuất

Tên cuối cùng phải được xác nhận ở P0; không sửa các migration 0001–0006 đã áp dụng.

| Đối tượng | Thay đổi tối thiểu đề xuất | Bất biến cần bảo vệ |
| --- | --- | --- |
| `simulator_scenario_parameters` | Giữ identity, owner/created_by, lifecycle, current draft/version reference | Không đổi `created_by` khi upsert cập nhật; quyền sở hữu không lấy từ body |
| `scenario_revisions` mới | Scenario FK, revision number, module schema, definition JSON, policy/targets/criteria, catalog/evaluator version, published_at | Unique `(scenario_id, revision)`; revision đã công bố bất biến |
| `scenario_library_memberships` mới | Scenario/revision FK, `practice/exam`, published_by, sort_order, revision concurrency | Một membership/nguồn/thư viện; revision phải thuộc đúng scenario/module |
| `exam_scenario_catalog` và paper items | Nguồn legacy/parameters, exact module ID, revision reference | Không làm mất composite FK/ràng buộc module hiện tại |
| `exam_candidates` | `user_id` cho giao mới; email/name vẫn là snapshot hiển thị | Assignment mới bắt buộc tài khoản; bản legacy chưa ánh xạ không bị gắn nhầm |
| `exam_candidate_subjects`/assignment | Duration, revision pin qua paper, owner scope, assignment state | Không sửa đề/thời lượng đã bắt đầu; một attempt theo contract hiện tại |
| `exam_attempts` | Deadline, completion reason, writer generation, evidence counts/truncation, finalized_at | Thời gian từ DB; terminal không quay lại active bằng request cũ |
| `exam_attempt_items` | Snapshot revision, engine version, checkpoint version/state, result | Snapshot và checkpoint là hai loại dữ liệu khác nhau; result không bị autosave ghi đè sau nộp |
| `exam_attempt_action_events` mới | Attempt/item FK, server/client sequence, event ID, typed delta, timestamps | Unique event/idempotency keys; giới hạn 500 toàn attempt dưới lock; chỉ append |
| Local session store | Versioned checkpoint + outbox + TTL/cache budget | Scope theo user; không dùng làm nguồn quyền hoặc điểm chính thức |

Index cần dự kiến: memberships theo `(library_kind, module_id, sort_order)`; assignments theo user/status; attempts theo user/start và deadline còn active; events theo `(attempt_id, server_sequence)`; revisions theo scenario/revision. Query list không tải toàn bộ definition/log của mọi bài; phân trang và tải detail riêng.

### 5.8. Hợp đồng API/service đề xuất

Ưu tiên mở rộng service/API hiện có. Tên đường dẫn dưới đây minh họa trách nhiệm, không tạo hai bộ endpoint và Server Action làm cùng một việc nhưng validation khác nhau.

| Thao tác | Hợp đồng cần có |
| --- | --- |
| Lưu nháp | Validate module/schema, owner, `expectedRevision`; trả revision mới hoặc 409 |
| Preview | Cô lập khỏi profile và attempt thật; không công bố; kiểm tra khả thi/lời giải |
| Công bố thư viện | Chọn practice/exam/cả hai; transaction revision + memberships; không để công bố dở một nửa |
| Archive/gỡ công bố | Kiểm tra tham chiếu; giữ bài đã giao và kết quả; audit actor/reason |
| Giao bài nhanh | ID revision, student user IDs, duration, idempotency key; server resolve quyền/nội dung |
| Start/resume attempt | Auth + assignment ownership + exam status; cùng attempt/deadline khi gọi lại |
| Gửi evidence/checkpoint | Expected revision, writer generation, batch sequence; validate scope/size/time; ACK high-water mark |
| Submit/finalize | Atomic flush cuối nếu còn giờ, chốt kết quả một lần; không nhận `score/solved` như kết luận chính thức |
| Xem bài/đánh giá | Teacher scope hoặc admin; snapshot đúng revision; log phân trang; nhập điểm/nhận xét riêng |

Quy ước lỗi: 401 chưa đăng nhập, 403 không có quyền, 404 không tồn tại/không được tiết lộ, 409 xung đột version/writer, 413 vượt kích thước, 422 dữ liệu nghiệp vụ sai. Hết giờ/đã nộp trả mã nghiệp vụ ổn định cùng trạng thái đã chốt để UI không retry vô hạn. Không trả raw SQL/stack trace cho học viên.

### 5.9. Luồng UI và khả năng sử dụng

- Editor gồm Thông tin → Trạng thái/lỗi ban đầu → Phạm vi sửa → Mục tiêu/Criteria → Xem thử → Công bố. Cho lưu nháp giữa các bước.
- Nút “Thêm kịch bản” mở editor, không mở file chooser. Có chọn Ôn tập/Kiểm tra/cả hai khi công bố; autosave nháp không tự công bố.
- Dữ liệu đã nhập trước đây vẫn dùng được. Bộ parser JSON giữ cho validation/migration/test nội bộ; không giữ import/export như lối vòng bắt giáo viên dùng.
- Thư viện có tìm kiếm, lọc thiết bị, độ khó, trạng thái, revision và chủ sở hữu; nhãn rõ đang ở thư viện nào.
- Giao bài hiển thị lại tên học viên, đúng thiết bị, revision và thời gian trước xác nhận; không giao chỉ bằng click nhầm một icon.
- Màn hình học viên có trạng thái Đang lưu/Đã lưu/Chưa đồng bộ/Lỗi, thời điểm server nhận gần nhất và hành động thử lại. Không hiện “Đã nộp” chỉ vì local đã ghi xong.
- Trang giám khảo hiển thị giá trị cũ → mới, thao tác bị từ chối, thời gian server, trạng thái cuối, checks và cờ thiếu log/mất mạng; giữ riêng điểm/nhận xét chính thức.
- Giữ PMDT classic; các control quản lý dùng convention hiện tại `rounded` 4px, chữ gọn, `focus-visible`, disabled/loading và hit area phù hợp. Không làm lại design system trong dự án này.
- Có thao tác bàn phím, nhãn field, trạng thái chọn một phần của nhóm, lỗi cạnh field và vùng thông báo hỗ trợ screen reader. Đây là phần bổ sung từ rà soát UI/UX, không chỉ thay màu/nút.

## 6. Lộ trình thực hiện và phụ thuộc

Luồng chính: P0 → P1/P2 → P3/P4 → P5 → P6 → P7 → P8 → P9. Có thể làm P1/P2 song song sau khi chốt contract; P3 cần P1+P2; P4 cần P1 và phần persistence của P2; tích hợp P5 cần cả hai. Không mở rộng P8 trước khi pilot P7 đạt.

Quy ước người chịu trách nhiệm: Chủ dự án chốt nghiệp vụ/nghiệm thu; DEV triển khai; QA thiết kế ca kiểm thử và xác nhận độc lập; người phụ trách triển khai chỉ thao tác môi trường khi được duyệt. Nếu một người kiêm nhiều vai trò vẫn phải giữ các cổng kiểm tra này.

### P0 — Chốt contract, baseline và cách tích hợp

- Độ phức tạp: M. Phụ thuộc: duyệt kế hoạch và D01–D11.
- [x] P0.1 Ghi branch/commit, `git status`, nhóm thay đổi có sẵn và baseline test liên quan; tách lỗi nền khỏi lỗi mới. Không dọn worktree bằng reset.
- [x] P0.2 Lập capability/field baseline cho pilot DVOR 1150A và DME 1119A; các thiết bị còn lại giữ adapter hiện trạng.
- [x] P0.3 Inventory schema/parser/version, exam FK/trigger/RPC, subject mapping và đường đi teacher/admin/student. Kết luận exam core cũ chưa được mở rộng trong phase này.
- [x] P0.4 Dùng các quyết định mặc định D01–D11 làm baseline tạm thời; hard-cap action history/evidence local là 500, chưa tuyên bố audit server đầy đủ.
- [x] P0.5 Bổ sung fixture/test cho legacy whitelist, open/restricted và field bảo vệ.
- [ ] P0.6 Đo dung lượng payload/checkpoint thực tế trên DB staging; còn chờ phase evidence database.
- [x] P0.7 Giữ nguyên schema từng module; thêm policy optional để không đổi nghĩa JSON cũ.
- Đầu ra: decision log, capability matrix, migration map, API contract, acceptance matrix và dự toán đã hiệu chỉnh.
- Rủi ro: quyết định mơ hồ bị đẩy sang code; dirty worktree làm baseline không ổn định. Cổng: chưa rõ D02/D03/D04/D06 thì chưa triển khai các phần tương ứng.

### P1 — Domain policy, criteria và tương thích parser

- Độ phức tạp: L. Phụ thuộc: P0.
- [x] P1.1 Viết typed contract chung cho `open/restricted`, task targets và evidence; giữ engine vật lý riêng.
- [x] P1.2 Cho parser chấp nhận policy optional; legacy không có policy vẫn dùng whitelist cũ; round-trip và field invalid có test.
- [x] P1.3 Resolver catalog phân loại student-operable/instructor-only/runtime/security; open không mở fault injection, raw measurements, security hoặc live fields; policy mới explicit thắng whitelist legacy, chỉ definition thiếu policy mới fallback whitelist.
- [x] P1.4 Nối gate vào UI, store/action và protected-field evaluation của DVOR 1150A + DME 1119A; regression policy/evidence/recovery pilot pass.
- [ ] P1.5 Criteria capability/targets mới đã có contract và validator, nhưng chưa có editor đầy đủ và chưa được server-evaluate trong exam.
- [x] P1.6 Giữ Local/Bypass, transfer, draft/Apply/Backup/Restore, active/inactive TX và chẩn đoán hai giai đoạn hiện hành; focused Apply/Restore regression của hai pilot pass.
- Đầu ra: domain contract chạy được cho hai thiết bị pilot, có unit/characterization tests.
- Nghiệm thu: T01–T08, T23/T24 phần domain. Rủi ro chính: UI cho sửa nhưng evaluator vẫn coi trái phép, hoặc open vô tình mở fault/security.

### P2 — Persistence nền, thư viện có revision và quyền teacher

- Độ phức tạp: L. Phụ thuộc: P0, interface từ P1.
- [x] P2.1 Thêm migration expand-only `0007_scenario_library_memberships.sql` cho membership practice/exam snapshot; thêm `0008_teacher_role.sql`. Chưa chạy production.
- [ ] P2.2 Backfill rehearsal thực tế từ 0004/0006 và kiểm tra checksum/row count; đã sửa seed 0009 thành cartesian module/library pair, nhưng chưa chạy vì máy thiếu Docker/psql/PostgreSQL cô lập.
- [x] P2.3 Code writer chính cho library membership snapshot, archive, revision counter và đồng bộ Ôn tập cũ; teacher archive chỉ chạm membership owner/grant, focused API tests pass. [ ] DB transaction rehearsal còn thiếu.
- [x] P2.4 Resource owner/grant predicate đã nối vào Scenario Parameters/library API; owner/grantee update, publish, archive và revoke được test; teacher authoring có feature flag mặc định tắt và UI vẫn admin-only. [ ] Cấp grant thật/DB rehearsal còn thiếu.
- [x] P2.5 Reader Ôn tập cũ đã thành compatibility adapter qua library/membership snapshot; học viên không đọc source mutable; focused API tests pass.
- [x] P2.6 Student GET chỉ trả practice snapshot; test teacher A/B truy cập ID trực tiếp bị chặn, compatibility writer yêu cầu revision đã đọc. [ ] Cross-student/cross-teacher trên DB thật còn thiếu.
- [ ] P2.7 Tạo test database thật trong môi trường cô lập cho FK, transaction rollback, concurrent publish và permission; API mock/E2E_TEST_MODE không thay thế test này.
- Đầu ra: backend thư viện/role tương thích dữ liệu cũ và báo cáo rehearsal migration.
- Nghiệm thu: T16–T21, T24–T25. Rủi ro: mất danh sách Ôn tập hoặc mở quyền admin cho teacher.

### P3 — Editor nội bộ và công bố không import/export

- Độ phức tạp: L. Phụ thuộc: P1, P2.
- [ ] P3.1 Tái sử dụng config catalog/control hiện có cho tạo/sửa initial state; tách component editor khỏi logic simulator nếu cần, không sao chép toàn bộ màn hình PMDT.
- [ ] P3.2 Thêm chọn nhóm/field, task targets, completion criteria và giải thích rõ khác biệt quyền sửa/mục tiêu.
- [ ] P3.3 Thêm draft autosave, version conflict, validation cạnh field và preview cô lập; preview không ghi vào `user_simulator_configs` hoặc attempt thật.
- [ ] P3.4 Thêm thao tác công bố vào một/cả hai thư viện; hiển thị cảnh báo bài đã lộ ở Ôn tập; giao dịch công bố phải nguyên vẹn.
- [ ] P3.5 Với hai thiết bị pilot, thay file chooser/import/export trong workflow giáo viên bằng editor chỉ khi tạo–sửa–mở lại–preview–công bố đều đạt. Không bỏ JSON parser phục vụ dữ liệu cũ.
- [ ] P3.6 Người dùng kiểm tra UI thực tế; QA kiểm tra bàn phím, focus, chọn nhóm một phần, loading/error và unsaved changes.
- Đầu ra: giáo viên tạo và công bố bài pilot hoàn toàn trong ứng dụng.
- Nghiệm thu: T05, T16–T18, T26. Rủi ro: mất khả năng soạn một nhóm tham số từng có trong công cụ cũ.

### P4 — Thu nhận evidence, lưu phiên và phục hồi

- Độ phức tạp: L. Phụ thuộc: P1, persistence contract P2.
- [x] P4.1 Tách evidence theo user/session/scenario trong local key; profile persistence hiện có tiếp tục bỏ qua scenario active.
- [x] P4.2 Stage/Apply của pilot ghi typed before/after field delta; không ghi password/token; timeline hiển thị phase.
- [x] P4.3 Có versioned localStorage checkpoint, namespace user/session/revision; review loader truyền published revision và simulator session truyền user/session identity; IndexedDB/outbox server còn pending. [ ] Browser reload/cross-account evidence còn cần QA thật.
- [x] P4.4 Hard-cap action history/evidence ở 500; draft keystrokes không tiêu quota; counters `total/stored/dropped/evidenceTruncated/lastSequence` và test truncation đã có. [ ] Server-authoritative còn pending.
- [x] P4.5 Restore local evidence gồm action history, attempt views, answer, hardware reasoning và applied/draft/backup/diagnostic checkpoint; DME loại security accounts/password khỏi checkpoint. [ ] Browser reload thực tế còn thiếu.
- [ ] P4.6 Chưa có ACK/outbox/network sync; chỉ có local recovery và final submission storage hiện hành.
- Đầu ra: phiên Ôn tập pilot phục hồi được; evidence contract sẵn sàng đồng bộ kiểm tra.
- Nghiệm thu: T09–T12, T23, T29. Rủi ro: ghi trùng, log bí mật, nhầm lưu cấu hình cá nhân với tiến độ bài.

### P5 — Tích hợp exam core, assignment, server timer và autosave

- Độ phức tạp: XL. Phụ thuộc: P2, P4; source adapter P1.
- [ ] P5.1 Thêm exact module/source mapping vào registry/catalog, paper/item FK, loader và result presentation; giữ ba module legacy nguyên nghĩa.
- [ ] P5.2 Thêm `exam_kind` và service giao bài nhanh tái sử dụng exam core; nới metadata hành chính chỉ cho training, cập nhật DTO/validation/print phù hợp.
- [ ] P5.3 Thêm candidate user link, duration và revision pin; backfill email duy nhất có báo cáo, không tự giải quyết bản ghi mơ hồ.
- [ ] P5.4 Implement start/resume idempotent, thời gian DB, snapshot từ revision đã giao và một writer generation/attempt.
- [ ] P5.5 Implement evidence/checkpoint endpoint có auth theo attempt, giới hạn payload, expected revision và transaction ACK; server cap 500 dưới lock chung của attempt.
- [ ] P5.6 Implement submit/timeout dùng cùng đường finalize; phân biệt thời điểm hết hạn và thời điểm materialize kết quả; terminal state bất biến. Xử lý item chưa mở khi timeout mà không giả thời điểm bắt đầu; sửa guard/payload/report và test tương ứng.
- [ ] P5.7 Sanitize payload candidate; recompute technical checks từ snapshot cấu hình hợp lệ, bỏ qua `solved/score` client; lưu evidence quality và evaluator version.
- [ ] P5.8 Test tích hợp DB: double start, batch gửi trùng, out-of-order, hai tab, submit đối đầu timeout, 499/500/501, mất ACK, khóa chờ qua deadline và đổi email.
- Đầu ra: giao–bắt đầu–autosave–nộp/hết giờ có thể chạy qua API thật với hai adapter pilot.
- Nghiệm thu: T10, T12–T15, T19–T25, T27. Rủi ro: race condition và composite FK/trigger/RPC cũ không tương thích.

### P6 — UI giáo viên, học viên và màn hình chấm

- Độ phức tạp: L. Phụ thuộc: P3, P5.
- [ ] P6.1 Thêm thư viện Kiểm tra cho teacher; chọn bài, 5/10 phút hoặc không giới hạn, chọn tài khoản và xác nhận giao; loading/idempotency ngăn giao lặp.
- [ ] P6.2 Học viên chỉ thấy assignment của mình; start/resume/timer/submit theo server state, không tự tạo session mới mỗi lần mở route.
- [ ] P6.3 Thêm timeline giá trị cũ/mới và bộ lọc loại thao tác; phân biệt draft, applied, rejected và dữ liệu hệ thống.
- [ ] P6.4 Trang chấm đọc snapshot đúng revision, hiển thị checks cuối, thiếu log/chưa đồng bộ, điểm và nhận xét riêng. Kết quả tự động không khóa quyền nhận xét giám khảo.
- [ ] P6.5 Kiểm tra navigation/role/empty state/không có quyền. UI scope không được dựa vào việc tài khoản có tên “giáo viên”.
- [ ] P6.6 Người dùng duyệt UI pilot trước cổng kiểm tra/phát hành theo workflow dự án.
- Đầu ra: luồng nghiệp vụ pilot hoàn chỉnh từ tài khoản teacher đến student rồi trở lại teacher.
- Nghiệm thu: T19–T22, T26–T28. Rủi ro: UX báo lưu thành công trước ACK hoặc giáo viên đọc nhầm bài/revision.

### P7 — Nghiệm thu pilot xuyên suốt

- Độ phức tạp: M/L. Phụ thuộc: P1–P6.
- [ ] P7.1 Dùng tài khoản test admin, hai teacher và hai student trên DB staging/cô lập; kiểm thử quyền âm tính, không dùng mock role để kết luận phân quyền thật.
- [ ] P7.2 Mỗi thiết bị pilot chạy bài open và restricted, cả có thời hạn và không giới hạn; ít nhất một bài chẩn đoán hai giai đoạn.
- [ ] P7.3 Chạy đủ mất mạng/reload/hết giờ/sửa đề sau giao/gỡ thư viện/log vượt cap và rollback flag.
- [ ] P7.4 Đối chiếu timeline UI với row DB, sequence, snapshot và điểm; lưu bằng chứng không chứa dữ liệu cá nhân thật/secret.
- [ ] P7.5 Chạy focused tests, build và toàn chuỗi CI khi chạm navigation/AppShell/MOPIENS/test setup; không bỏ qua failure để đạt cổng.
- [ ] P7.6 Chủ dự án xác nhận pilot đạt. Nếu khác biệt domain còn chưa rõ thì dừng mở rộng, không nhân rộng adapter lỗi.
- Đầu ra: biên bản QA có pass/fail và giới hạn đã biết; quyết định go/no-go cho P8.
- Nghiệm thu: toàn bộ test liên quan pilot không còn lỗi P0/P1 mở.

### P8 — Mở rộng DVOR 1150, DVOR 220 và DME 320

- Độ phức tạp: L. Phụ thuộc: P7 đạt.
- [ ] P8.1 Thống nhất baseline của DVOR 1150 non-A với công việc đang dở; không ghi đè schema v2/occurrence key/PMDT→hardware. Xác nhận thay đổi cũ riêng trước khi trộn.
- [ ] P8.2 Thêm adapter policy/criteria/evidence cho từng thiết bị, một thiết bị mỗi đợt; không chỉ copy field ID của DVOR 1150A.
- [ ] P8.3 Kiểm tra MOPIENS-specific draft/running/flash, security, monitor bypass, timer và Restore/Flash Save.
- [ ] P8.4 Mở editor/công bố/exam theo feature flag thiết bị sau khi cả ba phía author–student–reviewer hoạt động.
- [ ] P8.5 Chạy regression thiết bị trước, sau đó full CI cho thay đổi MOPIENS/navigation. Mock router theo AGENTS.md tại suite sở hữu component.
- [ ] P8.6 Giữ ADS-B authoring dưới `/authoring/ads-b` và redirect legacy; test exam legacy không bị route sang thiết bị mới.
- Đầu ra: đủ 5 thiết bị theo cùng contract nghiệp vụ, nhưng giữ engine riêng.
- Nghiệm thu: T01–T30 theo capability từng thiết bị. Rủi ro: giả định giống nhau giữa thiết bị và xung đột DVOR 1150 đang dirty.

### P9 — Migration, phát hành có kiểm soát và bàn giao

- Độ phức tạp: M/L. Phụ thuộc: P8; phê duyệt riêng môi trường/triển khai.
- [ ] P9.1 Rehearsal trên bản sao dữ liệu đã được phép dùng: row counts, ID mapping, FK, membership/order, schema parse, role và bài thi cũ.
- [ ] P9.2 Xác nhận backup có thể restore; feature flags server mặc định tắt, không chỉ flag UI; xác nhận không có active attempts bị đổi engine giữa chừng.
- [ ] P9.3 Phát hành compatibility readers trước, migration expand/backfill sau, rồi bật writer mới theo module. Không bật teacher accounts trước khi mọi reader/session gate hiểu role này.
- [ ] P9.4 Kiểm chứng backfill và route cũ rồi chuyển nguồn đọc; chưa drop bảng/cột cũ trong cùng release. Contract/drop chỉ ở release sau khi chứng minh không còn consumer và được duyệt.
- [ ] P9.5 Chạy smoke test thật teacher→student→teacher sau rollout; kiểm tra audit cap, timeouts, lỗi 409/413, restore và dung lượng tăng.
- [ ] P9.6 Cập nhật README/changelog/runbook trong đợt triển khai được duyệt. Chỉ stage file thuộc task; nếu muốn dùng `git add .`, trước hết phải có worktree cô lập/được xác nhận không lẫn thay đổi ngoài phạm vi.
- [ ] P9.7 Chỉ commit/push/deploy khi được phép. Push `deploy/main` có thể kích hoạt Dokploy, không coi push là một thao tác lưu tài liệu vô hại; xác minh commit/image/migration/HTTP và smoke test riêng.
- Đầu ra: báo cáo release, chứng cứ nghiệm thu, rollback runbook và danh sách giới hạn còn lại.
- Nghiệm thu: T24–T25, T29–T30 và checklist mục 10.

Ước lượng sơ bộ: tổng thể L/XL, khoảng 25–45 ngày công cho một lập trình viên có thời gian QA/review phối hợp; đây là khoảng dự toán, không phải cam kết lịch. Chưa gồm chờ duyệt, xử lý baseline DVOR 1150, chống gian lận server-authoritative, hoặc mở rộng ADS-B. Phải ước lượng lại sau spike P0.

## 7. Ma trận kiểm thử bắt buộc

| ID | Ca kiểm thử | Kết quả phải đạt |
| --- | --- | --- |
| T01 | Bài mới open, field nghiệp vụ thường | Sửa được khi đủ quyền vận hành, không cần tick whitelist |
| T02 | Open + GUEST/view-only/security/fault/clock/read-only | Không vượt quyền/khóa an toàn, báo lý do đúng |
| T03 | Restricted theo group/field; Apply, hotkey, Restore | Chỉ sửa phần cho phép; bulk action không bypass |
| T04 | Legacy whitelist rỗng/có field, parser cũ | Hành vi cũ không tự đổi khi đọc/backfill |
| T05 | Target so với quyền sửa; criterion không hỗ trợ/trống | Không bắt học viên sửa mọi field được mở; lỗi publish rõ, không pass giả |
| T06 | Nới ngưỡng/tắt monitor/bypass/ack để hết màu đỏ | Chấm đúng rubric; không nhầm hết chỉ thị với phục hồi đã yêu cầu |
| T07 | Bài software-adjustment và replace-module | Không bắt thao tác/No Active Faults vô lý; giữ thứ tự PMDT→hardware và đúng occurrence |
| T08 | Draft chưa Apply, đã solved rồi sửa hỏng lại, NaN/tolerance | Chấm applied/final state; reject số không hữu hạn, tolerance đúng đơn vị |
| T09 | Apply đổi nhiều field, Apply no-op, Cancel, Backup, Restore | Before/after đúng; không mất delta và không ghi giả sửa applied |
| T10 | 0/499/500/501 event, nhiều item, concurrent batch/retry | Không vượt 500 chi tiết; counters đúng; timeout/result còn lưu; không đếm trùng phần bị bỏ |
| T11 | Quota/private mode/xóa cache/logout/đổi user | Không crash hoặc báo saved giả; không lộ phiên người khác; DB bài thi còn nguyên |
| T12 | Refresh/mất ACK/sleep/hai tab | Đúng attempt/revision/deadline; một writer; outbox không mất/trùng |
| T13 | 5 phút/10 phút/null/0/âm/giá trị quá lớn | Chuẩn hóa đúng, reject invalid; null thật sự không giới hạn |
| T14 | Client đổi giờ, offline qua deadline, không còn tab mở | Không kéo dài giờ; lần truy cập sau phản ánh timeout; không nhận tiến độ mới quá hạn |
| T15 | Nộp double-click, submit đua expiry, lock chờ qua deadline, còn item chưa mở | Một terminal outcome, ACK ổn định; item chưa làm không bị giả started_at/kết quả; parent timeout vẫn chốt được |
| T16 | Công bố Ôn tập/Kiểm tra/cả hai; chưa công bố | Đúng visibility, không nhân bản source, không lộ bài nháp |
| T17 | Sửa scenario sau giao và trong lúc làm | Assignment/attempt cũ không đổi revision/criteria |
| T18 | Gỡ membership/archive/concurrent editor | Bài đã giao/kết quả còn nguyên; 409 khi version cũ, không silent overwrite |
| T19 | Student A truy cập ID của B, gọi API thẳng | Bị từ chối dù biết UUID/URL |
| T20 | Teacher A sửa/xem/chấm tài nguyên riêng của B | Bị từ chối trừ quyền được cấp rõ; admin vẫn quản lý được |
| T21 | Student mở exam-only qua endpoint Ôn tập; chèn owner/role/userId; session hết hạn, CSRF | Không nâng quyền/đọc toàn đề; identity từ server session; re-auth không reset giờ, mutation trái origin bị chặn |
| T22 | Client gửi score/solved/accepted/timestamp giả, payload chứa secret | Không nhận kết luận client như chính thức; validation/redaction và evidence quality hoạt động |
| T23 | Profile hydrate muộn, queue save cũ, rời bài, TX1↔TX2 | Không ghi baseline bài vào cấu hình cá nhân; không mất stage hoặc hiển thị sai TX |
| T24 | Migration dữ liệu v1/v2, malformed row, email mơ hồ | Không mất dữ liệu; có báo cáo/quarantine, không đoán identity; không tự công bố |
| T25 | Bài thi cũ, ADS-B, route/print/RPC/FK cũ | Luồng đang dùng vẫn chạy, kết quả cũ đọc được; version mới không chui qua parser cũ |
| T26 | Teacher tạo–sửa–preview–công bố không file JSON | Đủ initial state/policy/criteria; accessibility và unsaved changes đúng |
| T27 | Giao bài nhanh bằng tài khoản; 2 học viên đổi email | Assignment vẫn đúng user; không cần metadata hành chính giả; thao tác idempotent |
| T28 | Giáo viên xem từ trình duyệt/máy khác sau nộp | Đọc được log/giá trị cuối/nhận xét từ DB, không phụ thuộc local học viên |
| T29 | Payload lớn, local budget, nhiều attempt/pagination | Không tải toàn bộ log vào list, reject size rõ; không cleanup phiên active/chưa ACK |
| T30 | Tắt feature, rollback code compatible, restore rehearsal | Chặn tạo phiên mới an toàn; dữ liệu mới không bị xóa; bài cũ và kết quả vẫn đọc được |

Kiểm thử tải: P0 chốt số học viên đồng thời dự kiến; thử autosave và nộp gần đồng thời ở mức đó và một mức cao hơn. Đo p95 latency, error rate, row lock wait, byte/attempt và số request/phút; không đưa cam kết năng lực chịu tải khi chưa đo.

### 7.1. Lệnh và phạm vi kiểm tra khi triển khai

Không chạy các lệnh này chỉ vì đang soạn kế hoạch. Trước sửa logic dùng `codegraph.cmd impact <symbol>`; trước kiểm thử dùng `codegraph.cmd affected`; sau sửa source dùng `codegraph.cmd sync`.

Các suite hiện có để chọn theo phạm vi thay đổi:

```powershell
npx vitest run tests/api/review-scenarios.test.ts tests/api/dme320-scenario-parameters.test.ts tests/layout/scenario-management-workspace.test.tsx
npx vitest run tests/vor/dvor1150a-engine.test.ts tests/state/vor-scenario-store.test.ts tests/vor/pmdt-shell.test.tsx
npx vitest run tests/dme/dme1119a-scenario-permissions.test.ts tests/dme/dme1119a-scenario.test.ts tests/dme/dme1119a-scenario-persistence.test.ts tests/dme/dme1119a-two-stage-scenario.test.ts
npx vitest run tests/exams/ tests/auth/
```

Thêm suite mới cho policy/criteria migration, evidence/outbox/cap, timer/race, membership/ownership và database integration. Các suite tạo fixture có thể ghi output; chỉ chạy trên vị trí được phép, không dùng việc tạo fixture thay cho assertion.

- Logic: focused tests + typecheck/build theo workflow, sau cổng kiểm tra UI khi có chỉnh UI cần người dùng xác nhận.
- UI tĩnh: không tự chạy full test/build không cần thiết; vẫn kiểm tra UI phù hợp.
- Navigation/AppShell/MOPIENS/test setup: trước push phải chạy đủ `npm run lint` → `npm run typecheck` → `npm run test:run` → `npm run build` theo AGENTS.md/CI Node 24.
- Component App Router độc lập phải mock `useRouter` và `useSearchParams` đúng suite; không sửa label cũ chỉ để test pass, không dùng `|| true` che failure.
- DB transaction/permission/timer phải chạy với DB test thật, không chỉ API E2E_TEST_MODE. Browser E2E teacher/student dùng môi trường và tài khoản đã được phép.
- `git diff --check` và kiểm tra danh sách file trước bàn giao. Passing unit/build không thay bằng chứng UI/DB/live deployment.

## 8. Đăng ký rủi ro và phương án giảm thiểu

| ID | Rủi ro | Khả năng / Tác động | Giảm thiểu | Khi nào dừng |
| --- | --- | --- | --- | --- |
| R01 | Legacy whitelist đổi nghĩa | Cao / Cao | Adapter giữ nghĩa, fixture rỗng/non-empty, không bulk convert sang open | T04 khác baseline mà chưa có quyết định duyệt |
| R02 | Criteria không đúng thiết bị hoặc bài không giải được | Cao / Cao | Capability matrix, validate, giáo viên preview lời giải đúng/sai | Không có expected outcome đáng tin cho một criterion |
| R03 | Mở field instructor/security hoặc Restore bypass | Trung bình / Rất cao | Catalog phân loại, domain guards, negative tests mọi entry point | Có đường ghi không qua policy |
| R04 | 500 event mất bằng chứng quan trọng | Cao với bài dài / Cao | Cảnh báo cap, summary/checkpoint độc lập, reviewer flag, chốt D03 | Nghiệp vụ yêu cầu full audit nhưng vẫn yêu cầu hard-cap |
| R05 | Mất tiến độ do quota/mạng | Trung bình / Cao | IndexedDB/outbox, ACK, quota handling, timeout từ checkpoint đã ACK | UI báo đã nộp khi server chưa nhận |
| R06 | Nộp trùng/hết giờ sai do race | Trung bình / Rất cao | DB clock sau lock, idempotency, terminal immutability, concurrency tests | Hai kết quả terminal hoặc ghi tiến độ sau hạn |
| R07 | Teacher đọc/sửa tài nguyên ngoài quyền | Trung bình / Rất cao | Object-level authorization ở service/API/RPC, test cross-user | Chỉ có gate UI hoặc role check tổng quát |
| R08 | Đề bị đổi/lộ nội dung | Trung bình / Cao | Revision pin từ lúc giao, DTO tách, cảnh báo cả hai thư viện | Attempt còn đọc live definition/rubric chưa sanitize |
| R09 | Log client bị giả mạo | Có thể xảy ra / Cao | Recompute checks, validate state, explicit trust label, manual grading | Có yêu cầu chống gian lận mạnh nhưng chưa duyệt server-authoritative scope |
| R10 | Ghi cấu hình bài vào profile cá nhân | Trung bình / Cao | Session context, hủy/định tuyến queue cũ, test hydrate muộn/rời bài | Profile thay đổi chỉ vì start/restore/submit scenario |
| R11 | Exam core cũ hỏng FK/trigger/RPC/print | Cao / Cao | Expand-only, source discriminator, database rehearsal và regression legacy | Rehearsal có orphan/không đọc được kết quả cũ |
| R12 | Chồng thay đổi DVOR 1150 đang dở | Cao / Cao | Baseline và phạm vi riêng, đồng thuận trước P8 | Không xác định được ai sở hữu thay đổi hoặc test baseline chưa rõ |
| R13 | Dung lượng DB tiếp tục tăng dù có cap | Chắc chắn theo số phiên / Vừa–Cao | Byte limits, pagination, dung lượng cảnh báo, retention được duyệt | Chưa đo payload hoặc chưa có chính sách quản lý dung lượng |
| R14 | Engine đổi giữa lượt thi | Trung bình / Cao | Ghim version + cửa sổ deploy không active attempts | Có lượt đang chạy mà release không backward-compatible |
| R15 | Push làm deploy ngoài ý muốn | Trung bình / Cao | Phê duyệt release riêng, xem remote/diff, scoped staging | Chỉ được duyệt viết plan nhưng chuẩn bị push/migrate |
| R16 | Scope phình thành viết lại cả platform | Cao / Cao | Pilot, adapter nhỏ, giữ ADS-B/legacy; không thêm microservice/scheduler nếu chưa cần | Công việc không truy được về yêu cầu/acceptance case |

Sau 2–3 lần thất bại cùng một vấn đề, dừng sửa thử, thu bằng chứng và chuyển sang chẩn đoán. Nêu nguyên nhân/giả thuyết, điều chỉnh kế hoạch và xin hướng dẫn nếu cần thay đổi phạm vi; không tiếp tục thêm workaround che nguyên nhân.

## 9. Migration và rollback chi tiết

### 9.1. Trình tự dữ liệu

1. Trước mọi thay đổi môi trường: xác nhận quyền, backup, khả năng restore, version đang chạy và tình trạng active attempts.
2. Deploy code compatibility: đọc được schema cũ/mới nhưng chưa ghi định dạng mới, chưa mở teacher/public UI.
3. Chạy migration additive đã rehearsal: bảng/cột/index mới, constraints staged nếu cần; không sửa lịch sử migration.
4. Backfill theo batch có checkpoint, transaction và thống kê: scenario/revision, membership Ôn tập, candidate-user mapping. Record lỗi không bị xóa hoặc đánh dấu thành công giả.
5. Đối chiếu row counts/checksums nội dung phù hợp, FK, module/schema, thứ tự Ôn tập và owner; xác nhận bài unpublished không tự public.
6. Bật writer mới cho pilot, reader cũ đi qua compatibility adapter; theo dõi lỗi/version conflict. Nếu tạm dual-write là cần thiết thì cùng transaction, có reconciliation và thời hạn kết thúc; không có hai nguồn sự thật độc lập.
7. Bật từng module còn lại sau nghiệm thu. Cấp teacher sau khi role reader/gate/UI đã tương thích.
8. Chỉ contract/drop ở đợt sau khi không còn consumer cũ, hết thời gian rollback và được phê duyệt riêng.

### 9.2. Rollback

- Trigger: mất dữ liệu/membership, sai quyền, sai deadline, không submit/resume được hoặc lỗi tăng quá ngưỡng vận hành chốt ở P0.
- Tắt tạo/công bố/giao bài mới của module bị lỗi bằng server feature flag; không đột ngột xóa/ẩn attempt đang làm và dữ liệu đã nộp.
- Nếu có active attempts: ưu tiên hotfix tương thích hoặc đóng luồng theo quyết định vận hành có ghi nhận; không đổi ngầm timer/engine giữa bài.
- Rollback về bản code compatibility đã kiểm thử, không mặc định rollback về release quá cũ không hiểu role teacher/schema mới.
- Giữ các bảng/cột/event mới. Không dùng down migration drop tables để “quay lại nhanh”.
- Restore backup là phương án cuối được duyệt: phải xác định dữ liệu phát sinh sau backup, kế hoạch đối soát và mức mất dữ liệu; không restore mù.
- Kiểm tra lại admin/student đăng nhập, Ôn tập cũ, exam legacy, kết quả đã nộp và danh sách bài mới còn lưu. Ghi rõ phần đang tạm khóa và cách tiếp tục.

## 10. Điều kiện hoàn thành

- [ ] Tình huống mới mặc định mở đúng phạm vi thao tác, dữ liệu cũ giữ nguyên ý nghĩa.
- [ ] Chọn nhóm/từng tham số và điều kiện hoàn thành có định nghĩa rõ, không trộn quyền sửa với mục tiêu bắt buộc.
- [ ] 5 thiết bị có adapter được kiểm chứng; chẩn đoán hai giai đoạn và engine hiện có không hồi quy.
- [ ] Giáo viên tạo/sửa/preview/công bố vào một hoặc hai thư viện không cần import/export JSON.
- [ ] Giao bài theo tài khoản, chọn thời gian hoặc không giới hạn; timer/ownership được server cưỡng chế.
- [ ] Phiên kiểm tra lưu DB, phục hồi được theo chính sách; giáo viên máy khác xem được giá trị thay đổi và nhận xét.
- [ ] Cap 500, byte limits, retry/out-of-order/truncation có kiểm thử; không tuyên bố audit đầy đủ khi log bị cắt.
- [ ] Snapshot/revision đã giao không bị sửa; archive không phá bài đã làm; exam legacy và ADS-B vẫn chạy.
- [ ] Có bằng chứng unit/component, DB integration, browser teacher/student, migration rehearsal và rollback; giới hạn được ghi rõ.
- [ ] Full CI theo phạm vi, README/runbook và release verification chỉ thực hiện khi bước triển khai được duyệt; không lẫn thay đổi ngoài task.

## 11. Theo dõi quyết định và bàn giao phiên tiếp theo

### 11.1. Tình trạng tại lúc lập kế hoạch

- [x] Đọc bản Luna được bàn giao, đối chiếu điểm trọng yếu với source hiện tại.
- [x] Chỉ ra tồn tại và đưa phương án hiệu chỉnh trong tài liệu này.
- [x] Lập các phase, dependency, acceptance tests, rủi ro, migration và rollback.
- [x] Chủ dự án đã chỉ đạo đóng lỗi nền pilot, giữ teacher flag tắt và dừng P5/P6.
- [ ] P0–P4 đã triển khai một phần; P2.2/P2.7, P3, P4.6 và các cổng DB/browser/build còn mở.

Skill DVOR 1150A được dùng để giữ các bất biến PMDT và chuỗi draft/Apply/Backup; UI/UX Pro Max được dùng để bổ sung trạng thái lưu, phục hồi lỗi và accessibility. Thông tin persistence cũ trong skill không được dùng thay source hiện tại: repo đã có lưu cấu hình cá nhân, khác với nhận định lịch sử chỉ lưu in-memory.

### 11.2. Mẫu ghi nhận khi tiếp tục

```text
Ngày / người thực hiện:
Phase / task ID:
Branch + commit baseline:
Phạm vi được duyệt:
File hoặc migration thay đổi:
Quyết định mới / Dxx được chốt:
Test đã chạy + kết quả + môi trường:
Bằng chứng UI/DB:
Vấn đề còn mở / rủi ro:
Trạng thái feature flag / dữ liệu:
Bước tiếp theo / người phụ trách:
```

Không đánh dấu task hoàn thành chỉ vì đã viết code; phải có đầu ra và kiểm thử của phase. Không dùng tài liệu này làm sự cho phép tự động sửa production, cấp role thật, xóa dữ liệu, commit/push hoặc triển khai.

### 11.3. Nhật ký thực thi pilot — 27/09/2026

#### Đã viết code

- Policy dùng `ScenarioFieldRole`; `open` chỉ resolve field `student-operable`, giữ runtime/security/instructor-only ngoài edit surface. Áp dụng cho DVOR 1150A và DME 1119A.
- Thêm migration expand-only `0009_scenario_resource_authorization.sql` cho revision source, archive, teacher grant và library revision counter; sửa seed thành đủ 10 cặp module/library; chưa chạy môi trường nào.
- Scenario Parameters API giữ owner `created_by`, không đổi owner khi update, yêu cầu `expectedRevision` cho update và archive thay hard-delete. Teacher flag `CNS_TEACHER_SCENARIO_AUTHORING` mặc định tắt.
- Library API là writer chính có snapshot/revision/409; teacher chỉ archive membership owner/grant; `/api/review-scenarios` chuyển thành adapter bắt buộc expected revision; student đọc practice membership snapshot.
- Evidence có stats/cap, bỏ draft keystroke khỏi event quota, lưu checkpoint theo user/session/revision; review loader và pilot store đã nối published revision; DME checkpoint không lưu security accounts/password.

#### Đã kiểm chứng

- Regression đỏ trước sửa đã tái hiện policy, owner bind, grant listing, teacher archive, compatibility revision và checkpoint identity.
- Focused pilot/API/UI/migration-guard: **48 tests pass trong 8 files**; affected pilot/layout suite **183/183 tests pass trong 33 files**; targeted ESLint, `npm run typecheck` và `git diff --check` pass; CodeGraph đã sync.
- `npm run typecheck` pass.

#### Còn thiếu / chưa được phép coi là hoàn tất

- Migration rehearsal trên database cô lập chưa chạy: máy thiếu Docker, `psql` và PostgreSQL local; không dùng `DATABASE_URL` production để thay thế.
- Chưa có DB integration test thật cho FK, grant, transaction rollback, concurrent revision và row count/backfill.
- Chưa có browser reload/cross-account QA cho checkpoint; localStorage vẫn chỉ là recovery cache, chưa là audit nguồn chính; chưa có IndexedDB/outbox/ACK/server evidence.
- Chưa triển khai P5/P6 assignment/timer/exam UI; chưa mở teacher flag, chưa migration production, chưa commit/push/deploy.

#### Bước tiếp theo được phép

- Cung cấp hoặc duyệt một PostgreSQL cô lập (Docker Desktop hoặc VM/database tạm riêng) để chạy rehearsal 0001–0009, FK/backfill/rollback/grant/concurrency và ghi row count/checksum.
- Sau khi có DB rehearsal, chạy browser QA hai pilot: teacher flag tắt, student đọc đúng published revision, reload cùng user/session, đổi tài khoản/revision và cảnh báo localStorage.
- Chỉ sau UI approval mới chạy build/quality gate; vẫn giữ P5/P6, teacher rollout, production migration, commit/push/deploy ở trạng thái khóa.

### 11.4. Nhật ký phát hành production — 27/09/2026

#### Phạm vi được chủ dự án mở rộng

- Chủ dự án xác nhận đưa cả phần DVOR 1150 non-A đang có trong worktree vào đợt phát hành; không còn áp dụng giới hạn chỉ pilot DVOR 1150A + DME 1119A cho commit này.
- Vẫn giữ P5/P6 và teacher rollout ngoài phạm vi; `CNS_TEACHER_SCENARIO_AUTHORING` mặc định vẫn tắt.

#### Đã kiểm chứng trước phát hành

- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm run test:run`: **120 test files / 674 tests pass**.
- `npm run build`: pass; Next.js tạo đủ 79 route.
- Secret-pattern scan trên tập thay đổi: không phát hiện khóa/API key/connection string.
- Browser visual QA không thực hiện được vì môi trường CUA không có browser provider/tab; đã kiểm tra HTTP read-only trên `labs.cnsvn.com` và cần kiểm tra lại sau deploy.

#### Migration production đã chạy

- Database đã xác nhận là PostgreSQL 17.11, database `cns_simulator`, service `cns-simulator-postgres-5f4cno`.
- Áp dụng transaction `0007_scenario_library_memberships.sql`, `0008_teacher_role.sql`, `0009_scenario_resource_authorization.sql` và ghi checksum vào `app_schema_migrations`.
- Xác minh: 9 migration records; 37 membership backfill; 10/10 module-library revision seed; orphan FK = 0; duplicate active membership = 0; constraint/index chính tồn tại.
- Không chạy rehearsal cô lập theo chỉ đạo mới; không thay đổi dữ liệu production ngoài migration expand-only và backfill được nêu trên.

#### Còn thiếu trước/sau push

- Chưa push commit phát hành và chưa có bằng chứng container mới đã được Dokploy build/deploy.
- Chưa có browser reload/cross-account visual QA; chỉ có HTTP health/read-only evidence.
- Cần xác minh `app_schema_migrations`, HTTP health và log container sau khi Dokploy hoàn tất deploy.
