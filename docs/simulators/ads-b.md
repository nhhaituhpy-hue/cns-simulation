# Tài liệu Kỹ thuật Mô phỏng Hệ thống Giám sát ADS-B (QCMS & Terminal Console)

## 1. Giới thiệu tổng quan
Hệ thống giám sát phát sóng tự động phụ thuộc ADS-B (Automatic Dependent Surveillance – Broadcast) là công nghệ giám sát không lưu hiện đại thu nhận tín hiệu 1090 MHz Extended Squitter từ tàu bay. Module mô phỏng ADS-B bao gồm giao diện trung tâm giám sát QCMS (Quality Control & Monitoring System) kết hợp giao diện dòng lệnh Terminal Console chuyên dụng mô phỏng trực tiếp từ trạm ADS-B Côn Sơn và Cam Ranh.

Mã nguồn triển khai lõi:
- Engine điều khiển Terminal Console: [`src/lib/terminal-engine.ts`](file:///c:/Test/cns-simulator/src/lib/terminal-engine.ts)
- Luồng công việc & tương tác tham số: [`src/lib/terminal-workflows.ts`](file:///c:/Test/cns-simulator/src/lib/terminal-workflows.ts)
- Danh mục 10 kịch bản sự cố phần cứng: [`src/lib/fault-scenarios.ts`](file:///c:/Test/cns-simulator/src/lib/fault-scenarios.ts)
- Thuật toán chấm điểm tự động (LCS Grading): [`src/lib/grading.ts`](file:///c:/Test/cns-simulator/src/lib/grading.ts)
- Chuẩn hóa đầu vào dòng lệnh: [`src/lib/normalization.ts`](file:///c:/Test/cns-simulator/src/lib/normalization.ts)
- Mẫu hiển thị màn hình ký tự ANSI: [`src/lib/terminal-templates.ts`](file:///c:/Test/cns-simulator/src/lib/terminal-templates.ts)

---

## 2. Kiến trúc Terminal Engine & Chế độ Vận hành
Terminal Engine tái lập môi trường bảng điều khiển 74 cột (`TERMINAL_WIDTH = 74` ký tự) với cấu trúc phân cấp menu đa cấp:

### 2.1. Chế độ Vận hành (Operation Modes)
Thuộc tính `operationMode` trong `TerminalWorkflowRuntime`:
1. **OPERATIONAL Mode:**
   - Chế độ khai thác tiêu chuẩn.
   - Cho phép giám sát dữ liệu mục tiêu tàu bay thời gian thực, lưu lượng bức xạ xung CAT 21 / CAT 23, trạng thái đồng bộ vệ tinh GPS/GNSS, và kiểm tra tình trạng kết nối SNMP.
   - Khóa các chức năng can thiệp cấu hình mạng và cài đặt ngưỡng báo động nhạy cảm.
2. **MAINTENANCE Mode:**
   - Chế độ bảo dưỡng kỹ thuật.
   - Yêu cầu xác thực tài khoản kỹ thuật viên.
   - Cho phép thay đổi cấu hình mạng LAN (`IP Address`, `Subnet Mask`, `Default Gateway`), thiết lập ngưỡng cảnh báo công suất (`alertPower`, `failurePower`), kiểm tra RF cục bộ và chạy quy trình tự kiểm tra thiết bị.

---

## 3. Ma trận Ảnh hưởng Tham số & Giám sát QCMS

### 3.1. Cấu hình Tham số Mạng và Định tuyến (Network Workflow)
Thực thi tại hàm `networkSettingsLines` và `validateWorkflowValue` trong `terminal-workflows.ts`:
- **Địa chỉ IPv4**: Kiểm tra định dạng 4 octet $0 - 255$ (`isIpv4`).
- **Trạng thái cấu hình**: Chuyển đổi giữa `CONFIRMED` và `UNCONFIRMED`.
- **Định tuyến Gateway**: Cập nhật trực tiếp vào bảng định tuyến trạm (`IP Routing 2`).
- **Giao thức cấp phát IP**: Chuyển mạch `DHCP = ENABLED/DISABLED`.

### 3.2. Mã hóa Trạng thái Cảm biến trên QCMS (Sensor Status Color Coding)
Trung tâm giám sát QCMS hiển thị trạng thái hoạt động của cảm biến theo 4 mã màu tiêu chuẩn:
- **Green (Xanh lục):** Cảm biến hoạt động bình thường, dữ liệu giám sát tàu bay đầy đủ và kết nối SNMP ổn định.
- **Yellow (Vàng):** Cảnh báo suy giảm — mất luồng dữ liệu giám sát tàu bay hoặc mức tín hiệu RF quá yếu, nhưng kết nối SNMP quản lý mạng và đồng bộ GPS vẫn hoạt động.
- **Orange (Cam):** Cảnh báo nhiệt độ — nhiệt độ buồng máy hoặc cảm biến vượt ngưỡng $55^\circ\text{C}$, hiệu suất thu bắt đầu suy giảm.
- **Red (Đỏ):** Mất kết nối nghiêm trọng — mất nguồn điện AC trạm hoặc đứt cáp mạng LAN, cảm biến hoàn toàn không thể liên lạc được.

---

## 4. Danh mục 10 Kịch bản Sự cố Phần cứng Chuẩn hóa (Fault Scenarios)
Được định nghĩa tại [`src/lib/fault-scenarios.ts`](file:///c:/Test/cns-simulator/src/lib/fault-scenarios.ts):

| Mã kịch bản | Tên sự cố | Vị trí linh kiện | Trạng thái QCMS | Triệu chứng Terminal Console |
| :--- | :--- | :--- | :---: | :--- |
| `fault-antenna-cable-open` | Hở cáp đồng trục ăng-ten | `coax-1` | **Yellow** | Đếm mục tiêu = 0; Squitter không tăng; SNMP và GPS vẫn OK. |
| `fault-preamp-degraded` | Hỏng suy giảm bộ tiền khuếch đại LNA | `preamp-1` | **Yellow** | Độ tin cậy thu < 10%; Tỷ lệ lỗi CRC tăng; Biên độ tín hiệu RF sụt giảm. |
| `fault-lightning-short` | Chập thiết bị chống sét đồng trục | `lightning-1` | **Yellow** | Mức RF suy hao nặng; Khung bản tin ADS-B không vượt qua kiểm tra CRC. |
| `fault-gps-cable-disconnected` | Tuột cáp ăng-ten GPS đồng bộ thời gian | `gps-cable-1` | **Green** | Báo UNSYNCHRONIZED; Độ lệch thời gian trôi liên tục; Tín hiệu tàu bay vẫn thu được. |
| `fault-lan-cable-open` | Hở cáp mạng Ethernet LAN | `lan-cable-1` | **Red** | Mất phản hồi Ping, SSH, SNMP; Đèn cổng switch báo Link Down. |
| `fault-power-feed-open` | Mất nguồn điện AC trạm | `power-ac-1` | **Red** | Cảm biến ngắt nguồn hoàn toàn; Không có đèn tín hiệu; Không giao tiếp được. |
| `fault-sensor-overheated` | Quá nhiệt khối cảm biến thu | `sensor-1` | **Orange** | Nhiệt độ khối thu $> 55^\circ\text{C}$; Tải CPU tăng cao; Tỷ lệ lỗi CRC tăng. |
| `fault-site-monitor-antenna` | Hỏng ăng-ten phát mục tiêu giả lập | `site-monitor-antenna-1` | **Green** | Tàu bay thật thu bình thường; Mục tiêu giả lập nội bộ báo FAILED. |
| `fault-switch-port-degraded` | Hỏng cổng mạng switch của Sensor A | `lan-switch-1` | **Red** | Sensor A mất kết nối trong khi Sensor B vẫn hoạt động bình thường. |
| `fault-earth-disconnected` | Đứt tiếp địa bảo vệ an toàn trạm | `earth-cable-1` | **Green** | Không sinh cảnh báo phần mềm; Cần kiểm tra đo điện trở tiếp đất vật lý. |

---

## 5. Thuật toán Chấm điểm Tự động (LCS Dynamic Programming)
Hệ thống chấm điểm bài thực hành của học viên theo thời gian thực được xây dựng trong [`src/lib/grading.ts`](file:///c:/Test/cns-simulator/src/lib/grading.ts):

### 5.1. Nhận diện Thao tác (Action Identity)
Mỗi thao tác của học viên được trích xuất thành chuỗi định danh duy nhất:
$$\text{ActionIdentity} = \text{JSON.stringify}([\text{normalizeMenuId}(\text{menuId}), \text{normalizeTerminalInput}(\text{input})])$$
Loại bỏ hoàn toàn các ký tự thừa, khoảng trắng và chuẩn hóa chữ hoa/thường để tránh việc chấm sai do định dạng.

### 5.2. So khớp Dãy con Chung Dài nhất (Longest Common Subsequence)
- Sử dụng thuật toán quy hoạch động LCS trên tập hợp các thao tác hợp lệ (loại bỏ bước đăng nhập mật khẩu `authentication`).
- Tự động phân loại từng bước thao tác:
  - `correct`: Thao tác đúng thứ tự và chuẩn xác trong quy trình kỹ thuật.
  - `incorrect`: Thao tác sai nhánh lệnh hoặc sai tham số.
  - `missing`: Thao tác bị bỏ sót so với quy trình chuẩn.
  - `redundant`: Thao tác dư thừa, đi lạc menu không cần thiết.
- Điểm số được tính toán công bằng, minh bạch dựa trên tỷ lệ bước hoàn thành chính xác trên tổng số bước chuẩn của quy trình xử lý sự cố.
