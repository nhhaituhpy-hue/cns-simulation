# Soạn kịch bản trên SELEX PMDT

Áp dụng cho **DVOR 1150 không A**, **DVOR 1150A** và **DME 1119A**. Ba cửa sổ dùng cùng cách tổ chức; tham số, tiêu chí, lệnh và vị trí card vẫn thuộc đúng thiết bị.

## 1. Mở công cụ

Tài khoản ứng dụng có quyền soạn kịch bản mở simulator và chọn **Scenario Parameters**. Quyền soạn bài trên ứng dụng khác với cấp quyền đăng nhập phần mềm PMDT. Thí sinh không có khối biên tập đáp án này trong giao diện luyện tập/thi.

Chọn Preset hoặc Import JSON, sửa bản nháp, xem trước, rồi Apply Scenario để thử bài. Export JSON giữ schema native: DVOR 1150 không A dùng v2 (vẫn import được v1); 1150A và DME dùng v1.

## 2. Năm nhóm của kịch bản

| Nhóm | Câu hỏi cần trả lời | Lưu ý |
| --- | --- | --- |
| 1. Trạng thái khởi đầu | Thiết bị bắt đầu bài như thế nào? | TX chính, Local, Bypass và Cấu hình ban đầu; DME có thêm Ident/Standby Bypass |
| 2. Lỗi đưa vào | Người soạn tạo lỗi hoặc triệu chứng gì? | DME dùng danh sách fault; 1150A có fault flag; non-A dùng các tham số native tạo triệu chứng |
| 3. Điều kiện đạt | Kết quả vận hành cần đạt là gì? | Không tự tạo quyền sửa hoặc bắt buộc sửa một trường |
| 4. Chẩn đoán hai bước | Phải kiểm tra PMDT và xác định phần cứng nào? | Kết luận mong đợi, checkpoint, lệnh, hướng xử lý, card/vị trí và manual |
| 5. Quyền chỉnh sửa | Thí sinh được sửa những trường nào? | Open hoặc Restricted, kết hợp với guard bảo mật/vận hành PMDT |

**Xem trước trạng thái khởi đầu** ở cuối cửa sổ phản ánh bản nháp, không chứng minh thí sinh đã thực hiện chẩn đoán. Kết quả phiên active sử dụng bằng chứng thao tác/phần cứng của phiên.

## 3. Điều kiện đạt, thao tác bắt buộc và quyền sửa

- **Điều kiện đạt:** trạng thái/kết quả cần đạt, ví dụ Integral Monitor Normal, có máy phát hoạt động, Bypass đã được bỏ.
- **Màn hình phải kiểm tra:** checkpoint trong diagnosis, được đối chiếu với các view đã mở.
- **Lệnh phải thực hiện:** action trong diagnosis, được đối chiếu với lệnh đã được PMDT chấp nhận. Mở Fault Isolation không tự được tính là đã chạy Full diagnostics.
- **Quyền sửa:** cho phép sửa các trường cấu hình; một trường được phép sửa không tự trở thành thao tác bắt buộc.
- `taskTargets` đã có trong JSON 1150A/DME được giữ và hiển thị với yêu cầu Inspect hoặc Change + Apply. Đợt này không bổ sung cách chấm mục tiêu mới; non-A tiếp tục dùng checkpoint/action native.

Mỗi DVOR có bốn tiêu chí boolean riêng. **VSWR executive alarm** của non-A và **Sideband VSWR alarm** của 1150A có ngữ nghĩa khác nhau. DME có danh sách criterion, tham số Integral/Standby/Both và TX1/TX2/Any.

## 4. Chẩn đoán hai bước

Khối này hiển thị đáp án của người soạn, được đọc từ preset/JSON. Nếu không có diagnosis, cửa sổ nói rõ kịch bản chưa cấu hình chẩn đoán hai bước; giao diện không tự thêm yêu cầu cho bài cũ.

### Bài hiệu chỉnh phần mềm

Thí sinh kiểm tra các màn hình/lệnh được yêu cầu, hiệu chỉnh và Apply để đạt trạng thái vận hành, rồi xác nhận không cần thay phần cứng theo contract của bài.

### Bài thay module/card

Thí sinh dùng bằng chứng PMDT để xác định đúng block/card và đúng vị trí của nó. Bộ đánh giá có thể hoàn thành chẩn đoán khi cảnh báo vẫn còn vì chưa mô phỏng việc lắp card thay thế. Các tiêu chí vận hành được hiển thị để giám khảo hiểu trạng thái thiết bị.

Định danh chấm phần cứng gồm block và occurrence/hotspot theo model. Một mã assembly giống hoặc gần giống ở TX khác không phải cùng đáp án. Giữ riêng các vị trí TX1/TX2, Monitor 1/2 và các nhánh sideband.

## 5. Open và Restricted

**Open** cho phép các field nghiệp vụ an toàn trong catalog của thiết bị. Field chỉ đọc, runtime, bảo mật và field dành cho người soạn vẫn được bảo vệ. Open không thay cấp quyền PMDT và không bỏ điều kiện Local/Bypass của lệnh.

**Restricted** chỉ cho phép những field được tích trong danh sách. Danh sách rỗng nghĩa là không được sửa cấu hình; bài chẩn đoán vẫn có thể dùng các lệnh vận hành được PMDT cho phép.

Chuyển sang Open rồi quay lại Restricted giữ danh sách explicit đã chọn, kể cả khi JSON có `editPolicy.allowedFieldIds` khác danh sách legacy. Các checkbox bị bảo vệ không thể bật bằng editor mới.

### Tương thích DVOR 1150 không A

- `editPolicy` là optional trong schema v2; preset và definition cũ thiếu policy tiếp tục dùng `studentEditableFieldIds`.
- Import v1 vẫn suy ra whitelist theo cách legacy và chuẩn hóa sang v2.
- Open chỉ được chọn chủ động; không tự sửa definition đã lưu hoặc snapshot kỳ thi đang sử dụng.
- Guard ô tham số, setter, Apply và kiểm tra protected fields dùng cùng quyền thực tế.
- Sau khi đã lưu/giao một bài có policy mới, rollback phải giữ phiên bản runtime đọc được policy đó. Không sửa snapshot cũ để làm khớp một bản runtime cũ.

## 6. Ví dụ theo từng thiết bị

| Thiết bị | Bài ví dụ | Cách đọc |
| --- | --- | --- |
| DVOR 1150 không A | CSB amplifier TX1, assembly `1A3` | Kiểm tra PMDT/diagnostics và chọn đúng occurrence của TX1; không dùng card của 1150A hoặc TX2 |
| DVOR 1150A | Synthesizer TX2, assembly `1A3A11` | Đối chiếu dấu hiệu tần số/khóa pha, các checkpoint/lệnh và đúng vị trí Synthesizer TX2 |
| DME 1119A | Delay drift hoặc HPA changeover | Phân biệt bài hiệu chỉnh với bài thay card; tiêu chí và quyền sửa do preset/giám khảo cấu hình |

## 7. Vòng đời bản nháp và phiên

1. Chọn/import bản nháp.
2. Đặt trạng thái khởi đầu và lỗi/triệu chứng.
3. Chọn điều kiện đạt; đọc diagnosis nếu có.
4. Chọn quyền sửa hợp lý.
5. Xem trước rồi Apply Scenario.
6. Thử thao tác PMDT/phần cứng và xem kết quả phiên active.
7. Restore Scenario để thử lại hoặc End / Restore TST để kết thúc.

Các action giữ hành vi riêng của thiết bị. Cấu hình kịch bản chỉ thuộc phiên, không ghi vào profile vận hành bình thường. Đổi bản nháp không tự áp dụng vào phiên đang chạy.

## 8. Tình trạng triển khai

Người dùng đã xem và duyệt giao diện tiếng Việt trên dev. Lint, typecheck, 113 test trực tiếp liên quan trong 16 file và production build đạt; gói phát hành được chuẩn bị theo kế hoạch. CI/Dokploy và health bản mới cần được xác minh sau push. Review dev không được xem là browser QA production.
