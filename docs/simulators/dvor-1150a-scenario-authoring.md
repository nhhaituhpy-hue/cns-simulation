# Hướng dẫn xây dựng kịch bản Scenario cho DVOR 1150A

Tài liệu này hướng dẫn giám khảo xây dựng, kiểm tra, xuất và vận hành một kịch bản huấn luyện **Scenario Parameters** trên SELEX DVOR 1150A PMDT Simulator.

Phạm vi tài liệu là màn hình `/simulator/dvor-1150a` và schema Scenario Parameters phiên bản 1 đang được phần mềm sử dụng. Nội dung được đối chiếu với mã nguồn hiện tại tại:

- `src/components/vor/dvor1150a-scenario-parameters.tsx`: giao diện Scenario Parameters.
- `src/lib/dvor1150a/scenario.ts`: cấu trúc kịch bản, kiểm tra hợp lệ và điều kiện hoàn thành.
- `src/lib/dvor1150a/config-utils.ts`: danh mục trường cấu hình hiển thị trong panel.
- `src/lib/dvor1150a/engine.ts`: cách cấu hình tạo số đo, alarm, voting và yêu cầu chuyển máy.
- `src/stores/vor-pmdt-store.ts`: vòng đời Apply, Restore và End Scenario.

> **Nguyên tắc quan trọng:** Scenario là một bài tập chạy theo phiên. Nó tạo một trạng thái huấn luyện tạm thời, không phải cấu hình profile vận hành bình thường của người dùng.

## 1. Scenario là gì?

Một Scenario DVOR 1150A gồm bốn phần chính:

1. **Trạng thái xuất phát**: cấu hình trạm, TX1/TX2, monitor, ngưỡng và lỗi mà học viên nhìn thấy khi bắt đầu bài.
2. **Start policy**: chọn máy phát chính, Local và Monitor Bypass tại thời điểm bắt đầu.
3. **Phạm vi khôi phục**: những trường cấu hình nào học viên được phép thay đổi.
4. **Success criteria**: các điều kiện hệ thống phải đạt để bài chuyển sang `SOLVED`.

Luồng tư duy khi soạn bài:

```text
Mục tiêu huấn luyện
        ↓
Tạo trạng thái lỗi ban đầu
        ↓
Chọn những thao tác học viên được phép thực hiện
        ↓
Chọn điều kiện xác nhận đã khôi phục thành công
        ↓
Preview → Apply Scenario → thử xử lý như học viên
```

### 1.1. Draft và Active Scenario

- **Scenario Draft** là bản đang được giám khảo chỉnh trong panel. Thay đổi Draft chưa làm thay đổi simulator đang chạy.
- **Active Scenario** là bản đã được nạp bằng nút `Apply Scenario`.
- Khi một bài đang active, tiếp tục sửa Draft không tự thay đổi bài hiện tại. Muốn chạy Draft mới phải bấm `Apply Scenario` lại.
- Dòng `Draft is not active` chỉ có nghĩa là bản đang thấy chưa được Apply; không phải lỗi.

### 1.2. Các trạng thái hiển thị

| Trạng thái | Ý nghĩa |
|---|---|
| `NO ACTIVE SCENARIO` | Chưa có bài nào đang chạy. Các chỉnh sửa chỉ nằm trong Draft. |
| `IN PROGRESS` | Scenario đang chạy nhưng còn ít nhất một tiêu chí chưa đạt hoặc còn thay đổi trái phép ở trường được bảo vệ. |
| `SOLVED` | Tất cả tiêu chí đã chọn đều đạt và không có trường cấu hình được bảo vệ bị thay đổi. |

## 2. `EXAMINER` là gì?

Trong thanh phía trên PMDT, chữ **`EXAMINER` là một nhãn quyền**, không phải nút bấm.

Nhãn này xuất hiện khi tài khoản đăng nhập vào ứng dụng có vai trò `admin`. Khi đó người dùng được phép:

- nhìn thấy và mở nút `Scenario Parameters`;
- chọn preset, chỉnh Draft và Import/Export JSON;
- Apply, Restore hoặc End Scenario;
- nhìn thấy tiến độ các tiêu chí của bài trên Training HUD.

Nếu tài khoản ứng dụng không phải `admin`, panel Scenario Parameters bị khóa và nhãn `EXAMINER` không xuất hiện.

### 2.1. `EXAMINER` khác tài khoản PMDT `SEC3`/`SEC4`

Hai lớp quyền này độc lập:

| Lớp quyền | Phạm vi |
|---|---|
| Tài khoản ứng dụng `admin` / nhãn `EXAMINER` | Cho phép **soạn và điều khiển Scenario**. |
| Tài khoản PMDT `SEC3` hoặc `SEC4` | Cho phép **thao tác bảo dưỡng thiết bị** như Local, Bypass, đổi đường máy phát và Apply cấu hình. |

Vì vậy, nhìn thấy `EXAMINER` không có nghĩa là mọi nút bên trong PMDT đều tự động được mở khóa. Khi thử quy trình của học viên, giám khảo vẫn cần đăng nhập PMDT bằng cấp quyền phù hợp nếu thao tác yêu cầu Security Level 3/4.

`EXAMINER` trong simulator cũng không phải nút chấm điểm bài thi chính thức. Nó chỉ cho biết giao diện đang ở chế độ có quyền biên soạn kịch bản.

## 3. Khu vực Preset và thông tin nhận dạng

### 3.1. Preset

`Preset` nạp một mẫu có sẵn vào Draft. Việc chọn preset chưa chạy bài cho đến khi bấm `Apply Scenario`.

| Preset | Mục đích |
|---|---|
| `New from Đài TEST/TST` | Tạo Draft sạch từ cấu hình mặc định, phù hợp để xây bài mới. |
| `TX1 low carrier + 9960 Hz` | TX1 có công suất sóng mang thấp, kéo theo Tx Power và điều chế 9960 Hz thấp. |
| `TX1 low 30 Hz reference modulation` | Tạo sai lệch điều chế tham chiếu 30 Hz. |
| `TX1 sideband VSWR alarm` | Tạo VSWR cao ở các nhánh sideband TX1. |
| `TX1 carrier VSWR fault - change over` | Tạo lỗi carrier VSWR trên TX1 để luyện chuyển dịch vụ sang TX2. |

### 3.2. ID, Name, Difficulty và Description

| Trường | Chức năng | Khuyến nghị |
|---|---|---|
| `ID` | Mã kỹ thuật duy nhất của kịch bản; cũng được dùng làm tên file Export JSON. | Dùng chữ thường, số và dấu gạch ngang, ví dụ `tx1-low-power-recovery`. Không đổi ID tùy tiện sau khi đã đưa vào kho. |
| `Name` | Tên bài hiển thị cho giám khảo và trong kho kịch bản. | Nêu rõ thiết bị, hiện tượng và mục tiêu, ví dụ `TX1 công suất thấp - khôi phục tại chỗ`. |
| `Difficulty` | Phân loại `Basic`, `Intermediate` hoặc `Advanced`. | Căn cứ số bước chẩn đoán, số tham số liên quan và mức độ rủi ro của thao tác. Trường này không tự thay đổi độ khó của engine. |
| `Description` | Mô tả tình huống, hiện tượng quan sát được và yêu cầu cần đạt. | Mô tả điều học viên được phép biết; không nên ghi thẳng đáp án nếu đây là bài kiểm tra. |

### 3.3. Import JSON và Export JSON

- `Export JSON`: tải toàn bộ Draft hiện tại thành file JSON hợp lệ.
- `Import JSON`: đọc một file JSON DVOR 1150A schema v1 và đưa vào Draft.
- Import không tự Apply.
- File sai schema, thiếu trường, sai kiểu dữ liệu hoặc có giá trị ngoài giới hạn sẽ bị từ chối.
- Cách an toàn nhất để tạo file mẫu là chọn preset gần nhất, Export, sau đó chỉnh lại trong giao diện hoặc chỉnh JSON có kiểm soát.

## 4. `Start policy and success criteria` là gì?

Đây là khu vực xác định **hệ thống bắt đầu như thế nào** và **điều kiện nào chứng minh học viên đã xử lý xong**.

Hai khái niệm phải được thiết kế cùng nhau:

- Start policy tạo bối cảnh vận hành lúc bắt đầu.
- Success criteria xác định trạng thái đích cần đạt.

Nếu đặt trạng thái bắt đầu và trạng thái đích mâu thuẫn, bài có thể quá dễ, không thực tế hoặc không thể hoàn thành.

### 4.1. Start policy

#### `Main transmitter`

Chọn `TX1` hoặc `TX2` làm máy phát chính khi Scenario được Apply.

Khi Apply, simulator chuẩn hóa đường máy phát như sau:

- máy được chọn làm Main sẽ được bật, đưa lên anten và không ở tải giả;
- máy còn lại không On-air; nếu còn enabled và không bị `Forced disabled`, nó được đưa về tải giả làm máy dự phòng;
- lựa chọn này có ưu tiên hơn các ô `On-air`/`Load` đặt trực tiếp trong nhóm Transmitter.

Vì vậy, muốn xác định máy nào phát sóng lúc mở bài phải dùng `Main transmitter`, không nên dựa vào việc tự đánh dấu `On-air` trong cấu hình TX.

#### `Start Local`

Nếu bật, Scenario bắt đầu ở chế độ Local. Local cho phép thực hiện các thao tác bảo dưỡng tại trạm.

Nên bật khi lời giải yêu cầu học viên:

- chỉnh cấu hình transmitter/monitor;
- Apply cấu hình;
- bật hoặc sử dụng Monitor Bypass;
- thực hiện các thao tác bảo dưỡng yêu cầu Local.

Nếu mục tiêu là đánh giá việc học viên tự nhận biết và chuyển sang Local đúng quy trình, có thể để tắt. Khi đó cần bảo đảm học viên có quyền PMDT phù hợp và có đường thao tác để bật Local.

#### `Start Monitor Bypass`

Nếu bật, Integral Monitor bắt đầu ở trạng thái Bypass.

Bypass có hai tác dụng quan trọng:

1. Alarm vẫn được tính và vẫn hiển thị để học viên chẩn đoán.
2. Yêu cầu chuyển máy tự động do monitor bị chặn trong khi Bypass còn bật.

Bypass thường được bật trong bài sửa tham số tại chỗ để tránh hệ thống tự chuyển máy trước khi học viên kịp xử lý. Nếu tiêu chí `require Monitor Bypass Cleared` được chọn, học viên phải nhả Bypass sau khi thông số đã trở về an toàn.

### 4.2. Success criteria

Các ô success criteria là điều kiện được kiểm tra liên tục trong thời gian chạy bài. Chỉ các ô được chọn mới tham gia kết luận.

| Tiêu chí trên giao diện | Ý nghĩa chính xác |
|---|---|
| `require Integral Monitor Normal` | Trạng thái Integral Monitor tổng hợp phải Normal theo health của monitor và logic voting hiện tại. |
| `require Active Transmitter` | Phải có một transmitter thực sự đang cấp tín hiệu lên anten. Chỉ bật `Enabled` nhưng không có máy On-air chưa đạt. |
| `require No Sideband Vswr Alarm` | Không còn Sideband VSWR ở mức Alarm trên các monitor đang được bật. |
| `require Monitor Bypass Cleared` | Integral Monitor Bypass phải được nhả. Alarm không được che bằng cách giữ Bypass. |

Scenario chỉ chuyển sang `SOLVED` khi:

```text
mọi tiêu chí đã chọn đều đạt
VÀ
không có trường cấu hình được bảo vệ bị thay đổi
```

> **Cảnh báo:** Nếu bỏ chọn toàn bộ success criteria, bài không có điều kiện chứng minh hoàn thành và sẽ không đạt `SOLVED`. Luôn chọn ít nhất một tiêu chí có ý nghĩa.

### 4.3. Cách chọn tiêu chí phù hợp

- Bài sửa công suất/điều chế: thường chọn `Integral Monitor Normal`, `Active Transmitter` và `Monitor Bypass Cleared`.
- Bài VSWR sideband: chọn thêm `No Sideband Vswr Alarm`.
- Bài chuyển máy: chọn `Active Transmitter`, `Integral Monitor Normal` và `Monitor Bypass Cleared`; không nhất thiết cấp trường cấu hình cho học viên vì thao tác chuyển Main là một lệnh vận hành.
- Không dùng Bypass cleared như tiêu chí duy nhất, vì học viên có thể chỉ nhả Bypass mà chưa khắc phục nguyên nhân lỗi.

## 5. `Student recovery controls` là gì?

`Student recovery controls` là **danh sách trắng các trường cấu hình học viên được phép sửa trong khi Scenario đang chạy**.

Khi Scenario active:

- trường được chọn: học viên có thể thay đổi trong Config Draft và Apply;
- trường không được chọn: bị khóa để bảo vệ baseline của bài;
- nếu một trường được bảo vệ vẫn bị thay đổi bằng một đường thao tác khác, hệ thống tạo blocker và bài không được `SOLVED`;
- alarm limit, calibration và raw measurement mặc định vẫn được bảo vệ, trừ khi giám khảo chủ động cấp quyền.

### 5.1. Tại sao cần danh sách trắng?

Danh sách này ngăn học viên “xử lý” bài bằng cách làm sai bản chất, ví dụ:

- hạ ngưỡng alarm thay vì sửa tín hiệu;
- thay calibration để số đo nhìn có vẻ Normal;
- sửa raw measurement để che lỗi;
- tắt monitor hoặc bỏ định tuyến tham số đang Alarm;
- sửa trực tiếp lỗi của một khối không nằm trong mục tiêu bài.

### 5.2. Cách chọn đúng recovery controls

Chỉ cấp các trường đại diện cho thao tác kỹ thuật mà học viên thực sự phải thực hiện.

Ví dụ với bài TX1 công suất thấp:

- nên cho phép `TX1 Output power` và/hoặc `TX1 Output power scale`;
- không nên cho phép `Tx power alarmLow`, `MON1 Tx power scale` hoặc `MON1 raw RF level`, vì các trường đó có thể che hiện tượng thay vì khôi phục transmitter.

### 5.3. Những thao tác không nằm trong danh sách này

Một số điều khiển runtime không được đưa vào whitelist cấu hình, chẳng hạn:

- chọn TX1/TX2 làm Main;
- đưa transmitter về Load/Off bằng lệnh vận hành;
- bật/tắt Local và Bypass;
- đăng nhập PMDT.

Các thao tác này vẫn chịu điều kiện Security Level, Local/Bypass và logic PMDT. Vì vậy, một bài chuyển máy có thể để `Student recovery controls` rỗng nếu lời giải chỉ dùng lệnh vận hành hợp lệ.

## 6. `Preview` là gì?

Preview tính trước trạng thái từ Draft mà không chạy bài và không thay đổi simulator hiện tại.

| Giá trị Preview | Ý nghĩa |
|---|---|
| `Active TX` | Máy phát dự kiến thực sự On-air sau khi áp dụng Start policy. |
| `Integral Monitor` | Trạng thái tổng hợp dự kiến là `NORMAL` hay `ALARM`. |
| `Sideband VSWR` | Có tồn tại Sideband VSWR Alarm hay không. |

Preview nên được dùng để phát hiện nhanh các lỗi thiết kế:

- chọn TX2 làm Main trong cấu hình Single Transmitter;
- máy Main bị `Forced disabled`;
- bài dự kiến Alarm nhưng Preview lại Normal;
- muốn bài khởi đầu có lỗi VSWR nhưng Preview báo `CLEAR`.

Preview không thay thế việc Apply rồi tự thực hiện quy trình như học viên. Nó chỉ là ảnh chụp tính toán ban đầu.

## 7. `Scenario configuration` là gì?

Đây là toàn bộ baseline kỹ thuật sẽ được nạp làm trạng thái xuất phát của bài. Các nhóm xuất hiện theo đúng thứ tự trên panel.

Các trường `Simulation` như Connected, Local, Bypass và timestamp không xuất hiện trong danh sách này. Local/Bypass được điều khiển bằng Start policy; kết nối và thời gian thuộc phiên PMDT đang chạy.

## 8. Nhóm `Station`

| Trường | Chức năng | Lưu ý khi tạo Scenario |
|---|---|---|
| `Station description` | Tên trạm hiển thị trên title bar và RMS Station Config. | Chỉ đổi khi tên trạm là một phần của bài; thông thường giữ TEST/TST. |
| `Transmitter frequency` | Tần số VOR từ 108 đến 118 MHz; engine dùng để tính carrier và sideband frequency. | Không dùng tần số sai để tạo bài lỗi công suất/monitor nếu nó không liên quan mục tiêu. |
| `Station type` | Loại đài, hiện chỉ có `DVOR`. | Giữ nguyên. |
| `Transmitter configuration` | Chọn `Dual Transmitters` hoặc `Single Transmitter`. | Single Transmitter loại TX2 khỏi snapshot vận hành; không chọn TX2 làm Main. |
| `Monitor configuration` | Chọn `Dual Monitors` hoặc `Single Monitor`. | Single Monitor loại MON2 khỏi health và voting nhưng vẫn giữ cấu hình MON2 để có thể quay lại Dual. |

## 9. Nhóm `Transmitter 1` và `Transmitter 2`

Hai nhóm có cùng cấu trúc. Mọi trường tác động riêng lên TX tương ứng.

### 9.1. Trạng thái và đường công suất

| Trường | Chức năng |
|---|---|
| `Enabled` | Cho phép transmitter tồn tại và tham gia cấu hình dual transmitter. |
| `On-air` | Biểu diễn transmitter đang nối ra anten. Khi Apply Scenario, Start policy sẽ chuẩn hóa lại máy On-air. |
| `Load` | Đưa transmitter vào tải giả. Trạng thái này loại trừ On-air và Off. Khi Apply, máy standby thường được đưa về Load nếu còn khả dụng. |
| `Frequency error` | Sai số tần số TX theo ppm; ảnh hưởng số đo frequency error và tần số phát hiệu dụng. |

### 9.2. Giá trị danh định `Nominal`

| Trường | Chức năng |
|---|---|
| `Azimuth index` | Chỉ số góc danh định của Audio Generator. |
| `Output power` | Công suất danh định trước khi nhân hệ số scale. |
| `Voice modulation` | Điều chế thoại danh định; trong mô hình có ảnh hưởng đến deviation. |
| `Ident modulation` | Độ sâu điều chế Ident danh định. |
| `Reference modulation` | Điều chế tham chiếu 30 Hz danh định; ảnh hưởng trực tiếp số đo 30 Hz và liên quan 9960 Hz. |
| `SBO RF level` | Mức RF sideband theo phần trăm công suất cực đại của bộ khuếch đại. |
| `Main ident code` | Mã nhận dạng chính, dài từ 2 đến 4 ký tự. |
| `Standby ident code` | Chọn dùng cùng mã Main hoặc mã khác cho trạng thái standby. |
| `Keyer mode` | Chọn keyer input `disabled` hoặc `external`. |

### 9.3. Hiệu chỉnh đầu ra `Offsets/Scale`

| Nhóm trường | Chức năng |
|---|---|
| `Azimuth angle offset` | Cộng sai lệch vào góc azimuth của Audio Generator. |
| `Output power scale` | Công suất hiệu dụng được tính theo `Output power × scale / 100`. Đây là trường phù hợp để mô phỏng suy giảm khuếch đại. |
| `Voice/Ident/Reference modulation scale` | Nhân tỷ lệ lên các thành phần điều chế tương ứng trước khi monitor đánh giá. |
| `Carrier PLL control` | Điều khiển PLL carrier trong mô hình transmitter. |
| `Carrier sideband phase coarse/fine` | Đặt lệch pha thô 0/90/180/270° và pha tinh từ -45° đến +45°; lệch pha làm giảm hiệu quả tạo thành phần 9960 Hz. |
| `Sideband 1…4 phase offset` | Tạo sai lệch pha riêng cho từng nhánh sideband. |
| `Tx sideband RF scale` | Scale chung áp dụng lên toàn bộ sideband. |
| `Sideband 1…4 RF level scale` | Scale biên độ riêng từng nhánh; mất hoặc giảm một nhánh làm 9960 Hz giảm tương ứng. |
| `Sideband 1…4 VSWR offset` | Cộng hiệu chỉnh vào VSWR sideband do transmitter đo. |

### 9.4. VSWR và Fault injection

| Trường | Chức năng |
|---|---|
| `Carrier VSWR` | VSWR sóng mang trước fault; giá trị vật lý tối thiểu là 1:1. |
| `Sideband 1…4 VSWR` | VSWR từng nhánh sideband trước offset; giá trị tối thiểu 1:1. |
| `Forced disabled` | Cưỡng bức transmitter không khả dụng. Không được đặt trên máy được chọn làm Main khi bắt đầu. |
| `carrierVswr` | Inject lỗi VSWR carrier; dùng cho bài alarm/chuyển máy. |
| `overtemperature` | Inject lỗi quá nhiệt transmitter. |
| `frequencyError` | Inject lỗi sai tần số; trong mô hình có thể làm trạng thái Ident bất thường. |

> Nên ưu tiên thay đổi một nguyên nhân vật lý rõ ràng. Tránh cùng lúc sửa Nominal, Scale, Calibration và Raw measurement cho cùng một hiện tượng vì học viên sẽ khó xác định quan hệ nguyên nhân–kết quả.

## 10. Nhóm `Monitor limits`

Nhóm này đặt dải đánh giá cho bảy tham số:

- 30 Hz modulation;
- 9960 Hz modulation;
- 9960 Hz deviation;
- RF level;
- Ident modulation;
- Tx power;
- Tx frequency error.

Mỗi tham số có năm mốc:

```text
Alarm Low
    < Pre-alarm Low
    < Nominal
    < Pre-alarm High
    < Alarm High
```

Phân loại trạng thái:

- **Normal**: giá trị nằm trong vùng giữa hai ngưỡng pre-alarm.
- **Warning/Pre-alarm**: giá trị đã ra khỏi vùng Normal nhưng chưa vượt ngưỡng Alarm.
- **Alarm**: giá trị nhỏ hơn/bằng Alarm Low hoặc lớn hơn/bằng Alarm High.

Đây là tiêu chuẩn đánh giá, không phải nguyên nhân lỗi. Trong hầu hết bài tập, giám khảo nên giữ ngưỡng hợp lý và tạo lỗi ở Transmitter. Chỉ cấp quyền sửa Monitor limits cho học viên khi mục tiêu bài thực sự là cấu hình lại giới hạn monitor.

## 11. Nhóm `Monitor control`

| Trường | Chức năng |
|---|---|
| `Azimuth pre-alarm` | Sai lệch góc so với góc anten danh định để tạo pre-alarm. |
| `Azimuth alarm` | Sai lệch góc để tạo alarm. |
| `Integral shutdown delay` | Thời gian trễ trước hành động shutdown khi monitor alarm. |
| `Continuous ident timer` | Thời gian xác nhận lỗi Ident liên tục. |
| `No ident timer` | Thời gian xác nhận mất Ident. |
| `Voting logic` | `AND`: hệ thống chỉ healthy khi cả hai monitor healthy. `OR`: hệ thống healthy khi có ít nhất một monitor healthy. Với Single Monitor chỉ MON1 được dùng. |
| `Transfer rule` | `on Primary Alarm`: yêu cầu chuyển máy khi MON1 không healthy; `on Any Alarm`: MON1 hoặc MON2 không healthy đều có thể yêu cầu chuyển; `disabled`: không yêu cầu chuyển tự động từ alarm monitor. |
| `Integrity tests enabled` | Bật kiểm tra integrity tự động của monitor. |
| `Integrity consecutive failures` | Số lần integrity fail liên tiếp trước khi monitor bị xem là không đạt. |
| `Sideband antennas in alarm` | Số anten sideband phải vượt ngưỡng Alarm để trạng thái Sideband VSWR thành Alarm. |
| `Sideband VSWR pre-alarm` | Ngưỡng VSWR tạo cảnh báo sớm. |
| `Sideband VSWR alarm` | Ngưỡng VSWR tạo Alarm. |
| `Notch monitor tolerance` | Sai lệch phần trăm so với notch baseline trước khi tạo cảnh báo/alarm. |

### 11.1. Quan hệ giữa Voting, Transfer và Bypass

```text
Alarm của các tham số đã được routing
                ↓
Health của MON1 và MON2
                ↓
Voting logic → Integral Monitor Normal/Alarm
                ↓
Transfer rule → yêu cầu chuyển máy
                ↓
Monitor Bypass bật? ─ Có → chặn yêu cầu chuyển tự động
                     └ Không → cho phép cơ chế bảo vệ xử lý
```

Bypass không xóa màu Alarm và không sửa số đo. Nó chỉ chặn yêu cầu transfer tự động trong mô hình.

## 12. Nhóm `Monitor antennas`

Các trường được lặp riêng cho MON1 và MON2.

| Trường | Chức năng |
|---|---|
| `MONx enabled` | Cho monitor tham gia health/voting. Nếu tắt, monitor không được xem là healthy. |
| `MONx input attenuation` | Suy hao đầu vào dùng để đưa mức RF monitor về vùng tham chiếu. |
| `MONx azimuth angle` | Góc radial danh định của anten monitor; số đo azimuth được so với góc này. |
| `MONx antenna 2` | Bật anten thứ hai cho monitor. Khi bật, góc danh định dùng trung bình hai góc anten. |
| `MONx antenna 2 attenuation` | Suy hao đầu vào của anten thứ hai. |
| `MONx antenna 2 angle` | Góc radial của anten thứ hai. |

Không nên cho học viên tắt monitor để làm bài “hết Alarm”. Nếu mục tiêu là chẩn đoán hỏng monitor, hãy mô tả rõ và chọn success criteria phù hợp.

## 13. Nhóm `Monitor calibration`

Calibration hiệu chỉnh số đo sau khi engine tạo tín hiệu nguồn. Mỗi monitor có bộ hiệu chỉnh riêng.

| Trường | Phép hiệu chỉnh |
|---|---|
| `Azimuth offset` | `Azimuth hiển thị = Azimuth nguồn + offset`. |
| `30 Hz scale` | `30 Hz hiển thị = giá trị nguồn × scale / 100`. |
| `9960 Hz scale` | `9960 Hz hiển thị = giá trị nguồn × scale / 100`. |
| `Deviation scale` | `Deviation hiển thị = giá trị nguồn × scale / 100`. |
| `RF offset` | `RF hiển thị = RF nguồn + offset`. |
| `Ident scale` | `Ident modulation hiển thị = nguồn × scale / 100`. |
| `Tx power scale` | Nhân tỷ lệ lên công suất TX nhìn từ monitor. |
| `Tx power offset` | Cộng offset công suất sau khi scale. |
| `Tx frequency offset` | Cộng offset ppm vào sai số tần số. |
| `Notch scale` | Nhân tỷ lệ lên giá trị notch monitor. |
| `Odd/Even return loss offset` | Cộng offset theo nhóm anten lẻ/chẵn vào profile VSWR 48 anten. |

Calibration có thể tạo bài hiệu chuẩn monitor, nhưng cũng là cách rất dễ che lỗi. Mặc định không nên đưa các trường này vào Student recovery controls của bài sửa transmitter.

## 14. Nhóm `Monitor raw measurements`

Raw measurements là dữ liệu nền của MON1/MON2 trước calibration. Các trường gồm:

- raw azimuth;
- raw 30 Hz và 9960 Hz modulation;
- raw deviation;
- raw RF level;
- raw ident modulation, ident status và ident code;
- raw frequency error;
- notch detector scale;
- VSWR thô của 48 anten sideband.

Trong engine, raw measurement là baseline đầu vào. Khi có transmitter đang hoạt động, tác động của công suất, điều chế, pha, lỗi và anten tiếp tục được kết hợp vào nguồn đo trước khi calibration được áp dụng.

Nhóm này phù hợp để:

- tạo tình huống lỗi cảm biến/đường đo;
- mô phỏng sai lệch dữ liệu đầu vào độc lập với transmitter;
- kiểm thử monitor và threshold.

Không nên dùng raw measurement để tạo mọi loại lỗi. Nếu muốn mô phỏng hỏng TX1, hãy đặt nguyên nhân ở TX1 để các màn hình liên quan cùng phản ứng nhất quán.

## 15. `Monitor routing` là gì?

`Monitor routing` xác định **mỗi tham số monitor có được đưa vào phép đánh giá health/voting của đường Primary và Secondary hay không**.

Trong mô hình DVOR 1150A hiện tại:

- cột `primary` tương ứng đường đánh giá của **MON1**;
- cột `secondary` tương ứng đường đánh giá của **MON2**;
- routing không phải là nút chuyển cáp RF hoặc chọn transmitter nào nối anten;
- đường RF TX1/TX2 được điều khiển bởi Main/Load/Off và Start policy.

### 15.1. Các tham số có routing

Mỗi tham số dưới đây có hai ô `primary` và `secondary`:

| Tham số | Nội dung được đưa vào health/voting |
|---|---|
| `azimuth` | Sai lệch góc phương vị. |
| `hz30Modulation` | Độ sâu điều chế tham chiếu 30 Hz. |
| `hz9960Modulation` | Độ sâu điều chế sóng mang phụ 9960 Hz. |
| `deviation` | Độ lệch 9960 Hz. |
| `rfLevel` | Mức RF monitor. |
| `identModulation` | Độ sâu điều chế Ident. |
| `identStatus` | Trạng thái Normal/No Ident/Continuous Ident. |
| `identCode` | Mã Ident đo được. |
| `txPower` | Công suất transmitter do monitor đánh giá. |
| `txFrequencyError` | Sai số tần số TX. |
| `notchMonitor` | Kết quả giám sát notch. |
| `sidebandVswr` | Alarm VSWR của dàn anten sideband. |

### 15.2. Routing ảnh hưởng như thế nào?

Ví dụ với `txPower`:

- `txPower primary = bật`: Tx Power Alarm có thể làm MON1 không healthy.
- `txPower secondary = bật`: Tx Power Alarm có thể làm MON2 không healthy.
- cả hai bật: Alarm được xét trên cả hai monitor.
- cả hai tắt: số đo vẫn có thể được hiển thị và phân loại, nhưng Tx Power không được dùng để làm MON1/MON2 mất health trong phép routing tổng quát.

Sau đó health của MON1/MON2 được kết hợp bằng `Voting logic`, rồi `Transfer rule` quyết định có tạo yêu cầu chuyển máy hay không.

`notchMonitor` có xử lý đặc biệt: nếu notch phát hiện alarm nhưng chỉ được route Secondary, trạng thái được hạ thành warning; nếu không route vào đường nào, nó không tạo alarm health.

### 15.3. Khi nào nên thay đổi Monitor routing?

Chỉ thay đổi routing khi mục tiêu bài là:

- cấu hình sai ma trận bảo vệ;
- kiểm tra vì sao một Alarm không tham gia voting;
- phân biệt đường Primary/Secondary;
- phục hồi cấu hình monitor sau bảo dưỡng.

Không nên bỏ routing của tham số đang Alarm chỉ để làm bài đạt. Đó là vô hiệu hóa bảo vệ, không phải khắc phục nguyên nhân. Vì vậy các trường Monitor routing thường phải để ngoài Student recovery controls, trừ bài chuyên về cấu hình routing.

## 16. Các nút điều khiển vòng đời Scenario

| Nút | Tác dụng |
|---|---|
| `Apply Scenario` | Kiểm tra Draft, nạp baseline và Start policy, bắt đầu hoặc thay thế Scenario đang chạy. |
| `Restore Scenario` | Đưa bài active trở lại đúng baseline ban đầu, xóa kết quả chỉnh sửa của lần thử hiện tại nhưng giữ Scenario đang active. |
| `End / Restore TST` | Kết thúc bài, xóa Scenario active và đưa simulator về cấu hình mặc định Đài TEST/TST. Draft cũng trở về mẫu mặc định. |
| `Close` hoặc dấu `X` | Chỉ đóng panel; không Apply, không Restore và không End bài. |

Khi Scenario đang active, `Reset (F8)` cũng đi theo hành vi Restore Scenario. `Apply (F7)` trong phần cấu hình PMDT là thao tác Apply các thay đổi phục hồi của học viên, không đồng nghĩa với nút `Apply Scenario` của giám khảo.

## 17. Ví dụ đầy đủ: TX1 công suất thấp và 9960 Hz thấp

### 17.1. Mục tiêu

Học viên phải nhận biết TX1 có công suất thấp, chỉnh đúng tham số đầu ra, Apply cấu hình và nhả Monitor Bypass sau khi monitor trở lại Normal.

### 17.2. Tạo Draft

1. Mở `/simulator/dvor-1150a` bằng tài khoản ứng dụng admin.
2. Xác nhận có nhãn `EXAMINER`.
3. Bấm `Scenario Parameters`.
4. Chọn preset `TX1 low carrier + 9960 Hz`.
5. Kiểm tra:
   - Main transmitter = `TX1`;
   - Start Local = bật;
   - Start Monitor Bypass = bật;
   - TX1 Output power = `10 W`;
   - Student recovery controls gồm `TX1 Output power` và `TX1 Output power scale`.

### 17.3. Chọn điều kiện đạt

Nên bật:

- `require Integral Monitor Normal`;
- `require Active Transmitter`;
- `require Monitor Bypass Cleared`.

Có thể giữ `require No Sideband Vswr Alarm`, nhưng tiêu chí này chủ yếu bảo đảm bài không phát sinh thêm VSWR Alarm; nó không thay thế kiểm tra công suất.

### 17.4. Kiểm tra Preview

- Active TX phải là `TX1`.
- Integral Monitor dự kiến phải thể hiện trạng thái bất thường phù hợp với công suất thấp.
- Nếu Preview vẫn Normal, kiểm tra lại Output power, scale và Monitor limits.

### 17.5. Apply và thử như học viên

1. Bấm `Apply Scenario`; trạng thái chuyển `IN PROGRESS`.
2. Đăng nhập PMDT bằng tài khoản có Security Level phù hợp.
3. Quan sát Tx Power, RF Level, 30 Hz/9960 Hz và trạng thái monitor.
4. Mở đúng màn hình cấu hình TX1.
5. Đưa Output power hoặc Output power scale về giá trị hợp lý.
6. Bấm Apply cấu hình PMDT (`F7`).
7. Xác nhận Integral Monitor trở lại Normal.
8. Nhả Monitor Bypass.
9. Kiểm tra Training HUD/panel chuyển sang `SOLVED`.

Nếu bài không `SOLVED`, kiểm tra từng criterion và blocker thay vì tiếp tục thay đổi ngẫu nhiên.

## 18. Ví dụ: TX1 Carrier VSWR Fault và chuyển sang TX2

Mục tiêu bài này là luyện thao tác chuyển dịch vụ, không phải sửa một trường configuration.

Thiết kế phù hợp:

- Main transmitter: TX1;
- TX1 `carrierVswr` fault: bật;
- TX2: enabled và không có fault;
- Start Local/Bypass: chọn theo quy trình muốn kiểm tra;
- Student recovery controls: có thể để rỗng;
- Success criteria: Active Transmitter, Integral Monitor Normal và Monitor Bypass Cleared.

Học viên xử lý bằng lệnh chọn TX2 Main, sau đó xác nhận monitor ổn định và nhả Bypass. Không cần cấp quyền sửa trực tiếp TX1 fault nếu mục tiêu là changeover.

## 19. Lưu vào kho kịch bản `/authoring`

Sau khi thử thành công:

1. Bấm `Export JSON` trong Scenario Parameters.
2. Mở trang **Kịch bản** tại `/authoring` bằng tài khoản admin.
3. Trong nhóm DVOR 1150A, chọn `Thêm kịch bản` và nạp file vừa export.
4. Hệ thống parse file theo đúng schema DVOR 1150A trước khi lưu.
5. Nếu cùng module và cùng Scenario ID đã tồn tại, bản ghi cũ được cập nhật.
6. Khi mở simulator từ một bản ghi trong kho, file được nạp vào Draft; giám khảo vẫn phải bấm `Apply Scenario` để bắt đầu bài.

## 20. Checklist trước khi phát hành một Scenario

### Nội dung bài

- [ ] ID ổn định, tên và mô tả dễ hiểu.
- [ ] Mục tiêu chỉ tập trung vào một hoặc một nhóm kỹ năng liên quan.
- [ ] Hiện tượng ban đầu có thể quan sát được trên PMDT.
- [ ] Không ghi lộ đáp án trong Description nếu dùng để kiểm tra.

### Trạng thái bắt đầu

- [ ] Main transmitter hợp lệ với Single/Dual Transmitter.
- [ ] Máy Main không bị Forced disabled.
- [ ] Local và Bypass phù hợp với quy trình mong muốn.
- [ ] Preview thể hiện đúng Active TX và trạng thái alarm dự kiến.

### Quyền phục hồi

- [ ] Chỉ cấp đúng các trường học viên cần sửa.
- [ ] Không vô tình cấp Alarm limits, Calibration, Raw measurements hoặc Routing để học viên che lỗi.
- [ ] Lời giải vẫn thực hiện được với Security Level và điều kiện Local/Bypass hiện tại.

### Điều kiện hoàn thành

- [ ] Có ít nhất một success criterion.
- [ ] Tiêu chí đánh giá đúng nguyên nhân lỗi, không chỉ đánh giá Bypass.
- [ ] Đã thử quy trình đúng và thấy `SOLVED`.
- [ ] Đã thử một thao tác sai và xác nhận bài không đạt nhầm.
- [ ] `Restore Scenario` đưa bài về đúng baseline.
- [ ] `End / Restore TST` kết thúc bài và trả về TEST/TST.

### Lưu trữ

- [ ] Export JSON sau lần chỉnh sửa cuối cùng.
- [ ] Import thử lại file vừa export.
- [ ] Lưu đúng nhóm DVOR 1150A trong `/authoring`.
- [ ] Không nhầm file của DVOR 1150, DME 1119A, DVOR 220 hoặc DME 320.

## 21. Các lỗi thiết kế thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách sửa |
|---|---|---|
| Apply Scenario bị từ chối | ID/tên/mô tả rỗng, giá trị ngoài giới hạn, TX2 Main trong Single Transmitter hoặc máy Main bị disabled. | Đọc thông báo dưới panel, sửa lỗi đầu tiên rồi kiểm tra lại Preview. |
| Bài luôn `IN PROGRESS` | Còn criterion chưa đạt, Bypass chưa nhả hoặc có protected-field blocker. | Xem từng check trên Training HUD/panel và khôi phục trường bị thay đổi trái phép. |
| Bài không bao giờ `SOLVED` dù hệ thống trông bình thường | Không chọn success criterion hoặc chọn tiêu chí không thể đạt với baseline/lời giải. | Chọn lại ít nhất một tiêu chí và tự chạy toàn bộ quy trình. |
| Học viên có thể “chữa” bằng cách hạ alarm limit | Whitelist cấp quyền quá rộng. | Chỉ cho sửa trường nguyên nhân ở TX/monitor tương ứng. |
| Hệ thống tự chuyển TX quá sớm | Start Monitor Bypass tắt và Transfer rule đang cho phép alarm yêu cầu chuyển. | Bật Bypass khi bắt đầu hoặc chủ động thiết kế bài changeover. |
| Alarm hiển thị nhưng không làm monitor mất health | Tham số không được bật trong Monitor routing của đường tương ứng. | Kiểm tra routing Primary/Secondary và Monitor configuration. |
| Sửa Draft nhưng bài active không đổi | Draft và Active Scenario độc lập. | Bấm `Apply Scenario` lại sau khi kiểm tra Draft. |
| Đóng panel nhưng bài vẫn chạy | `Close` chỉ đóng giao diện. | Dùng `End / Restore TST` nếu muốn kết thúc bài. |
