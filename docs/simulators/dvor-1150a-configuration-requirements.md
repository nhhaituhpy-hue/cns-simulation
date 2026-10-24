# DVOR1150A — yêu cầu cấu hình có giá trị đích

## Hợp đồng mới, không đổi bài đã xuất bản

Schema Scenario Parameters vẫn là v1. `successCriteria.configurationValues` là phần **tùy chọn**:

```json
{
  "configurationValues": [
    { "fieldId": "monitor.timers.shutdown", "value": 2 },
    { "fieldId": "monitor.routing.rfLevel.secondary", "value": true }
  ]
}
```

Đây là trích đoạn `successCriteria`, không phải một file Scenario đầy đủ. Các boolean vận hành cũ vẫn được lưu và đánh giá riêng. Không có nhánh mới thì kết quả và ý nghĩa `taskTargets` của publication cũ được giữ nguyên; parser không chèn nhánh cấu hình mới vào snapshot bất biến.

- Giá trị đích đối chiếu **cấu hình running đã Apply**, không dùng draft, mô tả, nhãn `config-apply` hoặc số đo suy ra thay thế.
- Chỉ chọn scalar trong catalog thiết bị có role `student-operable`: monitor general/routing, alarm bands, timers, antennas, mọi đường calibration nonblank được catalog hỗ trợ, Test Generator setup, nominal và đủ 21 offsets/scales mỗi TX.
- Form Scenario Parameters và AI wizard dùng cùng danh mục kiểu số/boolean/select/text; không có ô nhập JSON path tự do. Không nhận raw measurement, fault injection, runtime, credentials, prototype path, ID lạ, mục trùng, sai kiểu hoặc đích không thể sửa theo policy.
- Nominal là điều khiển PMDT chung cho hai TX. Compiler/replay mở rộng một lựa chọn thành hai bản sao cùng giá trị, cùng rubric; từ chối đích TX1/TX2 mâu thuẫn và mirror bị policy khóa. Offsets/scales vẫn độc lập từng TX.

## Trạng thái đích khác bằng chứng thao tác

Trong bài có hợp đồng exact-value, `taskTargets` có thể yêu cầu:

- `inspect`: mở đúng màn cấu hình native của trường.
- `change-applied`: event native của học viên phải chứa đúng field, phase `apply`, `config-apply`, accepted, before/after có thay đổi; chuỗi phải bắt đầu tại baseline và kết thúc đúng running. Không nhận draft/backup/restore, event hệ thống, nhãn thao tác chung, sai thứ tự, thiếu sequence, log bị cắt/đầy cap hoặc timestamp thuộc lượt trước.

Checkpoint mới mang `scenarioId`, `scenarioRunId` và `scenarioStartedAt`. Native event đóng dấu scope module/kịch bản/run/start ngay lúc phát sinh; evaluator và feedback đối chiếu với expected scope trong checkpoint/runtime, không lấy event đầu tiên làm nguồn scope. Thiếu/sai scope hoặc mượn log lượt/kịch bản khác thì không xác nhận `change-applied`. Lượt mới/Restore xóa proof và bộ đếm bảo vệ cũ; reload đúng phiên khôi phục boundary/run đã lưu. Bài cũ không có exact-value contract không bị chấm lại chỉ vì trước đây có metadata `taskTargets`. Technical completion không thay điểm giám khảo và không biến giá trị cuối đúng thành bằng chứng quy trình.

## AI compiler và tương thích

Scaffold `configuration-values` là bài tập **kiểm tra/cài đặt cấu hình**, không phải lối tắt sửa cảnh báo của scaffold lỗi RF. Compiler lấy recovery values thành tiêu chí bắt buộc; trường thực sự đổi có task Apply. Legacy parameter-v2 giữ SET/RECOVER phase/quote/unit grounding. AI không được tắt success safeguards hoặc đổi threshold/calibration trong bài vật lý cũ để che lỗi.

Mỗi lượt AI tối đa 24 initial và 24 recovery assignments; vượt ngân sách phải làm rõ/chia bài, không bỏ yêu cầu âm thầm. Bản tóm tắt review giữ 24 rows, giới hạn 32 checks tương thích tab cũ; khi cần, proof task và các bản sao Nominal chung được gộp bằng AND, hoặc tổng hợp tất cả exact values trong projection. Definition/rubric và native replay vẫn giữ, kiểm từng target trước projection; không bỏ một kết quả sai để thu gọn hiển thị.

Alarm-limit catalog không công bố min/max hãng. Nhánh AI exact configuration dùng biên ±`Number.MAX_SAFE_INTEGER` **chỉ để an toàn biểu diễn/tính toán phần mềm**, đồng thời kiểm finite và thứ tự alarmLow < preAlarmLow ≤ nominal ≤ preAlarmHigh < alarmHigh. Đây không phải dải khai thác OEM hoặc khuyến nghị cho thiết bị thật.

## Giới hạn nguồn và vật lý

Nguồn đúng model: Selex Model 1150A Rev. E (March 2012), `571150A-0002E`; Figure 3-34/35 (monitor config), Figure 3-44 (calibration), Figure 3-50/51 (nominal/offsets), §3.6.8 và §9.7.12–14. Manual riêng tư không đi kèm Git/public assets.

Không suy từ việc lưu được timer/routing/limit thành thay đổi số đo RF hoặc mô phỏng delay thật. Giá trị `effect: stored-only` và `effectNotice` từ catalog được chuyển nguyên sang provider/form: đặc biệt Tx Power Offset có unit % nhưng chưa xác minh basis, odd/even return-loss offset có unit dB nhưng chưa xác minh hàm truyền/dấu. Chỉ chấm **đúng giá trị cấu hình** cho các trường này, không tuyên bố đã hiệu chuẩn công suất/VSWR hoặc sửa RF. Ô blank của manual không được tạo thành calibration mới.

`native-action-replay` cho bài cấu hình xác nhận setter/guard/Apply và exact running values. Nó không chứng minh độ chính xác thiết bị hãng. Mọi preview vẫn tách khỏi publication; thay source không cập nhật snapshot đã xuất bản và không tự phân vào Ôn tập/Kiểm tra.

## Kiểm thử

Chạy Node24 trên instabox-ci, không dùng production DB:

- `tests/vor/dvor1150a-configuration-criteria.test.ts`: parser, scalar types, allowlist, cross-field/shared-control invariants và snapshot cũ.
- `tests/components/dvor1150a-configuration-authoring.test.tsx`: recursive controls, wizard state validation, native Scenario panel, draft→Apply→HUD.
- `tests/ai/dvor1150a-configuration-recovery.test.ts`: kiểm kê động mọi field, native replay từng field, compiled exact targets/rubric, v2 grounding, DTO tối đa, effect notices.
- `tests/scenario-exams/dvor1150a-configuration-evidence.test.ts`: running checkpoint, real store evidence, chuỗi Apply và từ chối proof sai/thiếu/cũ.

Số lượng coverage lấy từ catalog candidate và được ghi bằng JSON trong test inventory, không hardcode theo số trường baseline. Test fixture citation là dữ liệu tổng hợp được ghi rõ, không phải bằng chứng manufacturer; kiểm manual độc lập vẫn là gate phát hành.
