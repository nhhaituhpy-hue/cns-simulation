# Kế hoạch bổ sung bước xác định phần cứng VOR/DME

> Ngày lập: 17/07/2026
> Trạng thái: đã duyệt, triển khai H0-H5 và cập nhật topology chi tiết ngày 17/07/2026
> Phạm vi: VOR Dual DVOR 1150A và DME Model 1118A/1119A

## 1. Mục tiêu nghiệp vụ

Quy trình bài thực hành được chia thành hai bước rõ ràng:

1. Học viên kiểm tra tình huống trên PMDT Simulator, mở các màn hình cần thiết, thao tác sidebar và ghi chú bằng chứng.
2. Học viên chuyển sang sơ đồ khối thiết bị, xác định một hoặc nhiều khối phần cứng nghi ngờ bị sự cố, giải thích căn cứ và gửi bài.

Admin phải cấu hình được phần cứng đích của tình huống. Giám khảo xem được phần cứng đích, lựa chọn của học viên và bằng chứng PMDT trên cùng trang review. Kết quả đối chiếu chỉ hỗ trợ giám khảo; điểm cuối cùng vẫn nhập thủ công như workflow VOR/DME hiện tại.

## 2. Nguyên tắc thiết kế

- VOR và DME giữ dữ liệu phần cứng riêng, không dùng model thiết bị ADS-B Côn Sơn.
- Chỉ dùng chung schema và component tương tác thực sự không chứa thuật ngữ của thiết bị.
- Field/component ID là hợp đồng lưu trữ lâu dài; không đặt ID theo vị trí hiển thị.
- Sơ đồ student không được làm lộ phần cứng đích hoặc trạng thái lỗi do admin cấu hình.
- Không lưu nguyên ảnh vendor có thông báo proprietary trong repository. Dựng lại sơ đồ khối tương tác từ topology, tên khối và luồng tín hiệu đã trích.
- Hỗ trợ chọn nhiều khối vì một tình huống có thể gồm phần tử chính và phần tử liên quan.
- Không tự động thay đổi điểm 0-100 hiện có trong phase đầu.

## 3. Phạm vi sơ đồ đề xuất

### 3.1 VOR

VOR có hai lớp sơ đồ để tách phần điều khiển/nguồn khỏi tuyến phát RF chi tiết:

1. `System Overview`
   - PMDT
   - RMS
   - LCU
   - Monitor 1, Monitor 2
   - Field Monitor Antenna
   - Interface Circuit Card
   - RCSU
   - Co-located DME/TACAN
   - BCPS 1, BCPS 2, Battery
   - LV Power Supply 1, LV Power Supply 2
2. `Transmitter / RF Path`
   - Audio Generator TX1/TX2
   - Synthesizer TX1/TX2
   - Carrier Amplifier TX1/TX2
   - Sideband 1-4 của từng transmitter; SB1/SB2 mang LSB `f0 - 9960 Hz`, SB3/SB4 mang USB `f0 + 9960 Hz`
   - Bốn Sideband RF Switch độc lập, bốn Antenna Bank và mảng 48 Sideband Antenna
   - Carrier RF Switch, directional coupler 30 dB và Carrier Antenna
   - RF Monitor nhận mẫu carrier/sideband và mẫu thuận/phản xạ
   - Commutator Controller CCA nhận dữ liệu chuyển mạch từ Audio Generator và điều khiển các Antenna Bank
   - Các tuyến modulation SIN/COS/Biphase, RS422 control và serial data tới RMS

### 3.2 DME

DME dùng một sơ đồ `Dual High Power Overview` đúng cấu hình mục tiêu 1118A/1119A. Đây là topology cố định của simulator, không phải lựa chọn low/high power:

- DME Antenna, directional coupler/circulator và filter
- RF Switch
- Load/Attenuator
- Low-noise Amplifier
- Low Power Amplifier/Synthesizer TX1/TX2
- High Power Amplifier TX1/TX2
- Monitor/Interrogator/Synthesizer 1/2
- Receiver/Transmitter Controller 1/2
- RMS, LCU, PMDT
- BCPS 1/2, TX Power Supply 1/2, 48 V Batteries
- Interface Circuit Card
- Co-located ILS/VOR
- RCSU

Hai tuyến phát bắt buộc đi theo chuỗi `LPA/Synth -> HPA -> RF Switch`; không có tuyến tắt trực tiếp từ LPA/Synth đến RF Switch. Hai Monitor/Interrogator/Synthesizer cùng giám sát chéo TX1/TX2, còn coupler 30 dB, circulator, LNA và load/attenuator là phần dùng chung.

## 4. Mô hình dữ liệu đề xuất

Tạo schema dùng chung, còn inventory/topology nằm trong module riêng:

```ts
interface EquipmentDiagram {
  id: string;
  title: string;
  components: EquipmentComponent[];
  links: EquipmentLink[];
}

interface EquipmentComponent {
  id: string;
  diagramId: string;
  subsystem: string;
  name: string;
  shortName: string;
  functionDescription: string;
  position: { x: number; y: number };
}

interface EquipmentLink {
  id: string;
  fromComponentId: string;
  toComponentId: string;
  kind: "rf" | "control" | "monitor" | "power" | "data";
  label?: string;
}

interface HardwareDiagnosisTask {
  expectedComponentIds: string[];
  faultType?: string;
  adminNote?: string;
}

interface HardwareDiagnosisAnswer {
  selectedComponentIds: string[];
  reasoning: string;
  inspectedComponentIds: string[];
  completedAt: string;
}
```

File đề xuất:

- `src/lib/equipment-diagram-types.ts`
- `src/lib/vor-hardware-model.ts`
- `src/lib/dme-hardware-model.ts`
- `src/components/hardware/equipment-block-diagram.tsx`
- `src/components/vor/admin/vor-hardware-task-editor.tsx`
- `src/components/dme/admin/dme-hardware-task-editor.tsx`
- `src/components/vor/student/vor-hardware-diagnosis.tsx`
- `src/components/dme/student/dme-hardware-diagnosis.tsx`

## 5. Luồng giao diện

### 5.1 Admin

Trang create/edit có stepper:

1. `Bước 1 - Cấu hình PMDT`
2. `Bước 2 - Phần cứng sự cố`
3. `Kiểm tra và lưu`

Tại bước 2, admin chọn tab sơ đồ, bấm một hoặc nhiều block để đánh dấu phần cứng đích, nhập loại/mô tả sự cố và ghi chú dành cho giám khảo. Không hiển thị block lỗi trực tiếp trên PMDT.

### 5.2 Student

1. Học viên thực hiện kiểm tra PMDT như hiện tại.
2. Nút `Tiếp tục: Xác định phần cứng` mở workspace toàn chiều rộng; trạng thái PMDT và nhật ký vẫn được giữ.
3. Học viên bấm các block để xem chức năng, đánh dấu phần cứng nghi ngờ và nhập căn cứ lựa chọn.
4. Học viên có thể quay lại PMDT trước khi nộp; mọi lần xem block được ghi vào `inspectedComponentIds` nhưng không ghi là lỗi.
5. Chỉ cho nộp khi đã chọn ít nhất một component và hoàn thành các trường trả lời bắt buộc.

### 5.3 Examiner

Trang review bổ sung:

- sơ đồ hoặc danh sách component admin đặt làm đáp án;
- component học viên chọn;
- đúng, thiếu và chọn thừa;
- danh sách component học viên đã xem;
- căn cứ phần cứng của học viên;
- checkpoint và nhật ký PMDT hiện có.

Không tự điền điểm. Có thể hiển thị tỷ lệ đối chiếu Jaccard như thông tin tham khảo ở phase sau.

## 6. Persistence và tương thích ngược

Thêm optional field vào `VorScenario`/`DmeScenario` và submission tương ứng:

- Scenario: `hardwareTask?: HardwareDiagnosisTask`
- Submission: `hardwareAnswer?: HardwareDiagnosisAnswer`

Database nên có JSONB riêng thay vì nhét vào `overrides` hoặc `answer`:

- `hardware_task jsonb` trên `vor_scenarios`, `dme_scenarios`
- `hardware_answer jsonb` trên `vor_submissions`, `dme_submissions`

Cần migration Supabase mới, cập nhật API row mapper, validators và localStorage normalizer. Field là optional để scenario/submission cũ vẫn đọc được. Sau khi rollout ổn định mới cân nhắc bắt buộc bước 2 cho kịch bản mới.

## 7. Các phase triển khai

### Phase H0 - Chốt đặc tả và topology ✅

- Duyệt inventory VOR/DME và tên tiếng Việt/tiếng Anh.
- Duyệt mức chi tiết: block lớn hay card/module cụ thể.
- Gán component ID ổn định.
- Duyệt quan hệ signal/control/power/monitor.
- Kết quả: hai file đặc tả topology, chưa có UI.

### Phase H1 - Domain và renderer dùng chung ✅

- Tạo schema diagram độc lập ADS-B.
- Tạo model VOR/DME và validation topology.
- Dựng renderer block diagram có vùng pan/scroll, chọn block, keyboard focus và legend luồng tín hiệu.
- Test ID duy nhất, link hợp lệ, chọn nhiều block và accessibility.

### Phase H2 - Admin authoring ✅

- Thêm mục cấu hình bước 2 và workspace editor trên trang create/edit.
- Cho admin chọn expected components và mô tả fault.
- Validation trước khi lưu.
- Bảo đảm edit scenario khôi phục đúng lựa chọn.

### Phase H3 - Student workflow ✅

- Thêm state chuyển PMDT sang hardware workspace và quay lại.
- Ghi component đã xem, component đã chọn và reasoning.
- Chặn nộp khi thiếu bước bắt buộc.
- Không làm lộ expected component IDs ở client state/markup trước khi nộp nếu có thể; API chỉ trả dữ liệu student-safe.

### Phase H4 - Persistence và examiner ✅

- Migration JSONB, API mapper, local fallback và validators.
- Hiển thị đối chiếu expected/submitted trong review.
- Giữ điểm thủ công.
- Kiểm thử scenario/submission cũ không có hardware field.

### Phase H5 - QA và tài liệu ✅

- Unit test domain, store, persistence và grading helper.
- Integration test admin -> student -> examiner cho cả VOR/DME.
- E2E desktop; kiểm tra diagram ở 1024, 1366, 1920 px.
- Cập nhật hai tài liệu PMDT, DECISIONS và migration notes.

## 8. Dependency và blocker

1. Inventory/topology đã được duyệt; đổi ID sau khi có scenario thật phải có mapping tương thích hoặc migration.
2. Admin được chọn nhiều component, tối thiểu một component khi bật bước 2.
3. Bước 2 tiếp tục là optional để scenario cũ không thay đổi workflow.
4. Kết quả đối chiếu chỉ hỗ trợ giám khảo; điểm cuối vẫn chấm thủ công.
5. VOR giữ hai sơ đồ `System Overview` và `Transmitter / RF Path`; DME giữ một sơ đồ Dual High Power chi tiết.

## 9. Rủi ro và phương án giảm thiểu

- Sơ đồ quá dày: tách overview/detail, có zoom/pan và filter subsystem.
- Lộ đáp án cho student: tách student-safe payload khỏi author/examiner payload.
- Chọn tất cả block để lấy điểm: hiển thị chọn thừa và dùng Jaccard nếu sau này có điểm tự động.
- Scenario cũ hỏng validator: mọi hardware field là optional và có normalizer.
- Copy tài liệu proprietary: chỉ lưu topology và renderer tự dựng, không commit ảnh vendor.
- Trùng logic VOR/DME: dùng chung primitive renderer/schema, giữ inventory và workflow adapter riêng.

## 10. Độ phức tạp và kết quả dự kiến

Độ phức tạp: cao. Đây là thay đổi xuyên suốt domain, UI, persistence và workflow đào tạo.

Kết quả sau H0-H5:

- Admin xây được tình huống PMDT và đáp án phần cứng trong một workflow.
- Student thực hiện đúng hai bước: kiểm tra simulator rồi xác định block phần cứng.
- Examiner có đủ bằng chứng PMDT và đối chiếu phần cứng để chấm thủ công.
- Scenario cũ tiếp tục hoạt động.

## 11. Kết quả triển khai

- Renderer dùng chung được đặt tại `src/components/hardware/`; inventory VOR và DME vẫn nằm ở hai module riêng.
- Renderer hỗ trợ polyline nhiều đoạn, mũi tên một/hai chiều, nhãn tuyến, nhóm subsystem, canvas cuộn và làm nổi các tuyến liên quan khi chọn block.
- VOR `Transmitter / RF Path` đã tách SB1-SB4, RF Switch 1-4, Antenna Bank 1-4, carrier coupler 30 dB, RF Monitor và các tuyến modulation/control/monitor/data.
- DME đã khóa ở cấu hình `Dual High Power`; cả TX1 và TX2 đều đi qua HPA trước RF Switch và có tuyến giám sát chéo.
- Normalizer tự mở rộng các component ID tổng hợp đã lưu trước đây sang các block chi tiết mới để scenario/submission cũ tiếp tục đọc được.
- Admin có thể bật/tắt bước 2, chọn nhiều block, đặt loại sự cố và ghi chú cho giám khảo.
- Student chỉ chuyển sang bước 2 sau khi nhật ký và ba phần kết luận PMDT hợp lệ; có thể quay lại PMDT trước khi nộp.
- Examiner thấy đáp án kịch bản, lựa chọn của học viên, block khớp/bỏ sót/chọn thêm và căn cứ lựa chọn; điểm vẫn nhập thủ công.
- Migration `202607170002_add_vor_dme_hardware_diagnosis.sql` đã được áp dụng lên Supabase project liên kết ngày 17/07/2026.
- Ảnh vendor không được chép vào repository; sơ đồ tương tác được dựng từ topology đã trích.
- Browser backend không khả dụng trong phiên triển khai; visual QA thủ công trên trình duyệt thật vẫn là bước xác nhận trước phát hành.
