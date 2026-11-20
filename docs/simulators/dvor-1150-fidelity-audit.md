# DVOR 1150 — đối chiếu simulator với tài liệu

Phạm vi: sơ đồ khối/dữ liệu khối, mặt module, tủ và sơ đồ hệ thống trong
`src/modules/devices/dvor-1150`; trạng thái phần mềm trong
`src/modules/operations/dvor-1150`. Baseline mã nguồn tại
[`b368ae207fdbbe07e533c04ae6a696a49c5b9a17`](https://github.com/nhhaituhpy-hue/cns-simulation/commit/b368ae207fdbbe07e533c04ae6a696a49c5b9a17).
Chỉ kiểm toán, không sửa simulator; không đánh giá DVOR 1150A hoặc DME 1119A.
Đây không phải hướng dẫn thao tác/bảo trì thiết bị thật.

## Nguồn và quy ước

| Ký hiệu | Tài liệu | Dùng để đối chiếu |
| --- | --- | --- |
| TM | `DVOR-1150-new.pdf` trong bộ nguồn chủ sở hữu | 332 trang PDF, nội dung trang tham chiếu mang Rev. K, January 2008; phần cứng, chức năng, bảng điểm đo và PMDT. |
| MX | `DVOR1150_CONFIG_MONITOR_MATRIX.md` | Hợp đồng cấu hình → số đo → alarm → transfer; Apply/backup/restore và route sidebar. Không coi là bằng chứng bố trí cơ khí. |
| S | `shots/screenshots/Screenshot 2026-08-17 HHMMSS.png` | Đã mở ảnh toàn bộ 38 tệp; mã `S113057` dưới đây là **tên đầy đủ** `Screenshot 2026-08-17 113057.png`, tương tự cho các mã còn lại. |

Đường dẫn nguồn gốc: `/home/ubuntu/dvor1150src/`. S và MX ưu tiên cho
phần mềm; TM là nền phần cứng. Bốn ảnh S112809, S112858, S113326,
S113339 là hình tủ/mặt module có chú thích manual, không phải cửa sổ PMDT.
Các ảnh PMDT cũng có caption Figure 3-x và ngày nội dung 2006/2007: ngày
tên tệp 2026-08-17 không chứng minh phiên bản phần mềm đang chạy tại trạm.

Số `PDF 229` là vị trí đếm từ bìa; `3-51` là số trang in. Hình/bảng/§
được ghi sau TM. Đọc mặt trước theo hướng hình, từ trên xuống/trái sang phải.
Không suy kích thước chế tạo, vị trí chân hoặc trạng thái mặc định từ ảnh.

Trạng thái: **Khớp** = đúng nội dung được dẫn, không chứng nhận toàn thiết bị;
**Một phần** = có biểu diễn nhưng thiếu/giản lược; **Sai khác** = có chi tiết
mâu thuẫn nguồn; **Thiếu** = chưa có trong bề mặt được audit;
**Chưa xác minh** = bộ nguồn không đủ kết luận. Mỗi dòng phần mềm bên dưới
đều có trạng thái **Thiếu** vì module operations mới là manifest `planned`;
không lấy tính năng ở namespace hoặc dòng thiết bị khác để điền vào stub.

## 1. Sơ đồ chức năng

Code: [dữ liệu khối](../../src/modules/devices/dvor-1150/block-diagram-data.ts),
[sơ đồ hệ thống](../../src/modules/devices/dvor-1150/dvor-1150-system-diagram.tsx),
[khung chọn/chi tiết](../../src/modules/devices/dvor-1150/dvor-1150-block-diagram.tsx).
Đối chiếu từng ID của `DVOR_1150_BLOCKS`; có trong catalog không đồng nghĩa
có hình trên sơ đồ chính (`diagramOccurrences` của nhiều card để trống).

| Khối | Simulator so với tài liệu | Trạng thái | Khoảng trống / nguồn |
| --- | --- | --- | --- |
| Status display 1A1 | Có hai Display CCA và danh sách Normal/Alarm 1/2, Bypass; có khối DISPLAY nối RMS. | Một phần | Hình mặt riêng thêm Bypass mỗi hệ, không có switch; TM PDF 227 Table 3-6; PDF 26 Fig. 1-4. |
| RF monitor 1A2 | Mô tả detector/amplifier/distributor, carrier dummy load; có mẫu carrier và sideband. | Một phần | Sơ đồ mẫu sideband chỉ một đường mỗi ISO, không tách đủ FWD/REV như TM PDF 54 Fig. 2-2; §2.3.2.8 phân biệt đời tải giả. |
| CSB amplifier 1A3/1A19 | Hai occurrence TX, mô tả khoảng 120 W và AM 30 Hz/1020 Hz/voice phù hợp chức năng. | Một phần | Gộp output hai TX qua một LPF/coupler, không diễn tả transfer/dummy load; TM PDF 54 Fig. 2-2, §2.3.2.3. |
| Frequency synthesizer 1A4/1A20 | Có carrier/USB/LSB, PLL/feedback, cặp TX. | Một phần | Đường feedback từ sample trong SVG kết thúc ở vùng CSB, thiếu vòng LPF → SYN rõ ràng; TM PDF 54 Fig. 2-2, §2.3.2.1, Figs. 2-3–2-6. |
| Sideband generator 1A5/6/21/22 | Catalog có đủ bốn assembly/occurrence và TP theo cặp SB. Sơ đồ chỉ vẽ hai khối TX1 A5/A6. | Thiếu | Chưa có hai occurrence TX2 A21/A22 trên SVG; TM PDF 54 Fig. 2-2 thể hiện cặp main/standby; PDF 231 Table 3-10. |
| Audio generator 1A7/1A23 | Có hai TX; danh sách 360 Hz sin/cos, ident, reference đúng chức năng. | Một phần | Đường audio dùng chung, chưa tách đầy đủ drive/control/đo power; TM §2.3.2.2, Fig. 2-7; PDF 264 Figs. 7-16/17. |
| Monitor CCA 1A8/1A24 | Hai monitor, TP1–15/TP0 và Integral Fault có dữ liệu. | Một phần | Một đường detector đi vào vùng MON2, không thể hiện hai tín hiệu độc lập đến MON1/2; TM PDF 54 Fig. 2-2, PDF 228 Table 3-8; §2.4.4.2. |
| Modem 1A9 | Catalog mô tả SCC/dial-up và có hotspot. | Một phần | Không có occurrence trên sơ đồ; không phân biệt tuyến modem với video terminal; TM §1.2.1.8, §2.3.2.14, Fig. 2-32. |
| Serial interface 1A10 | Có mô tả CPU ↔ terminal/DME/audio/monitor. | Một phần | Không vẽ khối riêng/tuyến serial tương ứng; TM §2.3.2.12, Fig. 2-30. |
| Facilities 1A11 | Có mô tả transfer, BCPS, display/RSCU và TP1. | Một phần | Không có occurrence/đường điều khiển riêng; TM §2.3.2.11, Fig. 2-29; PDF 267 Fig. 7-22. |
| Test generator 1A12 | Có mô tả chuẩn calibration và test ngưỡng; TP1–3. | Một phần | Không vẽ đường kích MON hay test/calibration switching; TM §2.3.2.13, Fig. 2-31, Figs. 7-23–7-26. |
| RMS CPU 1A13 | Có khối SCIP/RMS, CPU Fault và ghi chú đổi thuật ngữ. | Một phần | Sơ đồ chỉ vài kết nối display/MON; chưa thể hiện các giao diện và điều phối như TM §2.3.2.9, Fig. 2-27; PDF 227 Table 3-7. |
| LVPS 1A14/15/16 | Đủ ba card, phân công RMS/TX1/TX2. | Một phần | Không có bus nguồn trên sơ đồ; TM §1.2.1.13, §2.3.2.16, Fig. 2-34. |
| Jack assembly 1A38 | Dữ liệu J1 mic/J2 nghe audio và ngắt remote mic. | Một phần | Không vẽ switching jack; TM §2.3.2.17; Fig. 11-29 được gọi nhưng không có trong PDF này. Không xác nhận chân giắc. |
| BCPS 1A33/34 | Có hai nguồn và mô tả battery/AC, +28 và +43/48 V. | Một phần | Không có tuyến battery/charging hoặc lựa chọn đời nguồn; TM §1.2.1.15, Fig. 2-44, Table 4-1. |
| Power panel A18 | Có bốn breaker TX1/2 AC/DC trong dữ liệu. | Một phần | Không mô hình hóa đóng/ngắt nguồn; TM PDF 227 Table 3-6, §1.2.1.16. |
| LPF 1A35/36 | Có khối và dữ liệu J3 feedback/J4 sample. | Một phần | Chưa vẽ rõ J3 quay về SYN; không phải jack đo mặt trước đã xác nhận; TM §2.3.2.4, PDF 54 Fig. 2-2. |
| Bi-directional coupler DC1/2 | Khối carrier và hai đường sample đến RF monitor. | Khớp | Đúng mức sơ đồ chức năng gộp, không phải hai tuyến đấu dây độc lập; TM §2.3.2.5, PDF 54 Fig. 2-2. |
| Sideband sample A29–32 | Mô tả lấy hai USB/hai LSB tạo feedback pha/biên độ. | Một phần | Đường SVG không trả về SYN rõ ràng; TM §2.3.1, PDF 54 Fig. 2-2. |
| PIN driver 2A1/2A1A1 | Có khối điều khiển commutator và strap ground check trong dữ liệu. | Một phần | Chưa thể hiện nguồn detector, 25-pin/10-pin/hai 40-pin; TM §1.2.2.2.1–2, Fig. 2-45. |
| Commutator CCA 2A2/2A3 | Có hai CCA, odd/even, 48 anten; mô tả 27 RF/2 D-shell mỗi CCA. | Một phần | Hình tủ không thể hiện connector thật, xem §3; TM §1.2.2.3, §2.4.3, Fig. 2-46. |
| Field detector 2A6A1/A2 | Có hai detector, hotspot upgrade bên hông. | Một phần | Chưa phân biệt MON 012255-1001 không dùng detector ngoài; TM §1.2.2.1, §1.2.2.4.3; PDF 54 Fig. 2-2. |
| Carrier antenna | Có anten trung tâm, không gán hotspot tủ. | Khớp | Chỉ biểu diễn chức năng, không mô hình bức xạ; TM §1.2.4.1, PDF 54 Fig. 2-2. |
| Sideband antenna array | Có anten 1–48, mô tả vòng đường kính 44 ft. | Khớp | Không phải mô hình trường/pha từng anten; TM §1.2.4, PDF 54 Fig. 2-2. |
| Field monitor antenna | Có đường vào field detector, không gán vào tủ điện tử. | Khớp | Vị trí thực địa không được xác minh; TM §1.2.4, PDF 54 Fig. 2-2. |

**Giới hạn sơ đồ:** ISO1–4 được vẽ nhưng không có block/hotspot riêng;
đường sample không phân nhánh FWD/REV đầy đủ (TM PDF 54 Fig. 2-2).
SVG ghi `FIGURE 2-2 · REV. F · OCTOBER 2002`, trong khi trang nguồn được
cung cấp là Rev. K January 2008; không có bằng chứng để khẳng định nội dung
SVG thực sự lấy từ bản Rev. F. Không dùng caption làm chứng cứ phiên bản.

## 2. Mặt thiết bị: vị trí và sai khác

Code: [mặt chi tiết](../../src/modules/devices/dvor-1150/dvor-1150-module-faceplates.tsx),
`BlockVisual` trong khung chi tiết. Chỉ ba mặt riêng: SYN, SB generator và
status display. CSB/audio/RF monitor/MON dùng sơ đồ chức năng; các khối
khác dùng placeholder, **không phải** mặt điều khiển được đối chiếu.

| Module / nguồn | Tài liệu: thứ tự, điều khiển, điểm đo | Simulator / trạng thái / gap |
| --- | --- | --- |
| SYN; TM PDF 229 Fig. 3-40, S113326 | TP1/2/3 gần đầu trên, khoảng trống, TP4/5, GND, J8 Carrier Freq 10 mW (typ.); tay kéo dưới, R81 bên trái tay kéo. | **Khớp tương đối:** cùng thứ tự và vùng vị trí. Hình có vít/trim minh họa, không có kích thước chuẩn hay thao tác điện. |
| SYN signals; TM PDF 230 Table 3-9 | TP1 LSB quadrature, TP2 USB quadrature, TP3 phase error, TP4 carrier phase control, TP5 manual SB phase; TP6 ground trong bảng nhưng GND trên hình. | **Khớp:** catalog giữ GND và ghi chú TP6; không nên đổi nhãn mặt thành TP6 khi chưa có nguồn khác. J8 đang nằm trong `controls`, không phải điều khiển chỉnh. |
| SB generator: nhóm trên; TM PDF 230 Fig. 3-41, S113339 | Nhóm TP1–4, A1R100, A1R18, TP5 ở mép trái; Q101 phía dưới nhóm. | **Một phần:** đúng thứ tự dọc nhưng simulator đặt điểm trên trục giữa thay vì lệch trái; heatsink/tay kéo được đơn giản hóa. |
| SB generator: nhóm dưới; cùng Fig. 3-41, S113339 | TP6, A3R18, GND, A3R100, TP7–10 ở mép phải bên dưới Q201. | **Sai khác:** simulator đảo GND và A3R18; gom nhóm vào giữa và đặt phần lớn nhóm phía trên Q201. Sai vị trí tương đối dù đủ tên. |
| SB adjustments; TM PDF 231 Table 3-10, PDF 230 Fig. 3-41 | A1/A3 R18/R24 balance, R51 DC offset, R73 mean phase, R97 zero, R100 detector calibration, R102 dynamic phase. Một số nằm trên mặt bên bo. | **Một phần:** catalog có danh sách, mặt riêng chỉ vẽ R18/R100; không tách điểm nội bộ/mặt trước cho các trim còn lại. Không chuyển tất cả thành nút trên panel. |
| SB measurements; TM PDF 231 Table 3-10 | TP1/10 dynamic, TP2/9 manual, TP3/8 mean, TP4/7 error, TP5/6 detected forward; GND. | **Khớp dữ liệu:** đủ cặp chức năng; waveform tham chiếu không phải phép đo live. Vị trí vật lý vẫn sai như trên. |
| Status panel; TM PDF 26 Fig. 1-4, PDF 227 Table 3-6, S112809 | Normal/Alarm cho MON1 và MON2; Integral Bypass switch và indicator. Hình tủ là nguồn vị trí, bảng là nguồn chức năng. | **Sai khác:** `SYSTEM A/B` mỗi nhóm NORM/ALARM/BYPASS tạo 6 đèn; không vẽ switch Bypass. Dữ liệu văn bản đúng hơn mặt vẽ; chưa xác minh nhãn SYSTEM A/B. |
| RF monitor; TM §2.3.2.8, PDF 256–258 Figs. 7-1–7-4 | Điểm carrier TX1/2 FWD/REFLD và mẫu SB dùng cho đo bảo trì. | **Thiếu mặt:** chỉ functional diagram + danh sách điểm/waveform; chưa định vị jack thực. Không coi FWD/REV nội bộ là jack panel nếu hình không chỉ rõ. |
| CSB amplifier; TM §2.3.2.3, Fig. 2-13; PDF 26 Fig. 1-4 | Module có tay kéo, khác phiên bản amplifier; tài liệu mô tả vòng điều chế/khuếch đại. | **Thiếu mặt:** functional diagram thay panel; không xác nhận chi tiết phần cứng của từng P/N. |
| Audio generator; TM §2.3.2.2, Figs. 7-10–7-21 | Có nhiều waveform/điểm chức năng, gồm TP7/8 sin/cos 360 Hz, TP9 ident, TP10 reference. | **Một phần:** catalog có bốn điểm trên, không phải toàn bộ sơ đồ điểm đo hay mặt bo. Chưa định vị cơ khí các điểm. |
| MON; TM PDF 228 Table 3-8 | Integral Fault LED, TP1–15 và TP0 ground; voice ±, notch, composite, AM/FM/ident. | **Khớp tên dữ liệu / thiếu mặt:** đủ danh sách nhưng không có hình edge-card định vị từng TP/LED. Không suy màu/trạng thái từ functional diagram. |
| RMS CPU; TM PDF 227 Table 3-7 | LED CPU Fault đỏ khi reset do mất nguồn/lỗi memory. | **Thiếu mặt:** có tên LED; BATTERY trong danh sách đo là phép kiểm bo, không chứng minh có jack battery mặt trước (TM §6.2.12). |
| Power control; TM PDF 227 Table 3-6, PDF 26 Fig. 1-4 | Hai cột TX1/TX2; AC input phía trên, DC input/battery phía dưới; panel bản lề. | **Thiếu mặt:** bốn tên breaker có trong dữ liệu, hình tủ chỉ hình học nguồn chung; không có bốn breaker đúng bố cục/chức năng. |
| LVPS/BCPS; TM §1.2.1.13/15/16, Figs. 2-34/44 | LVPS card cage; BCPS sau power panel; hạ panel để tiếp cận đầu nối/trim BCPS. | **Một phần:** có hotspot, chưa có mặt/tiếp cận bảo trì; `DC BUS` là tên đo khái quát, không xác nhận terminal panel. |
| Jack assembly; TM §2.3.2.17, PDF 26 Fig. 1-4 | J1 mic và J2 audio; hai jack tại cụm cạnh card cage. | **Một phần:** dữ liệu hai jack có; thân hình chung không định vị jack/nhãn thật. Fig. 11-29 không có trong bộ PDF. |
| Modem/serial/facilities/test generator; TM §2.3.2.11–14, Figs. 2-29–32 | Sơ đồ chức năng card, vị trí card trên Fig. 1-4; không đủ để lấy tọa độ mọi điểm mặt trước. | **Chưa xác minh mặt:** placeholder; không được hiểu câu “manual không cung cấp mặt riêng” là đã chứng minh không có điểm đo trên bo. |
| PIN driver/commutator/interface; TM §1.2.2.1–3, Figs. 1-5, 2-45/46 | Đầu nối điều khiển/RF và strap; upgrade interface có splitter/detector tùy MON. | **Thiếu mặt chi tiết:** tủ minh họa không phải bản đồ chân, connector hoặc vị trí strap. |
| LPF/coupler/sample/antenna; TM §2.3.1, §2.3.2.4/5, §1.2.4 | Các cụm RF/antenna không phải card mặt điều khiển tương đương SYN. | **Chưa xác minh:** không có panel riêng; không tự dựng mặt điều khiển từ tên tín hiệu schematic. |

**Sai khác dẫn nguồn waveform:** catalog ghi PDF 313–316, 320, 327 cho
Figs. 7-3–7-8, 7-16/17, 7-30. Trong TM được giao, các hình tương ứng ở
PDF **257–260, 264, 271**; các số trang catalog không áp dụng cho tệp này.
Đây có thể là phân trang của bản xuất khác, chưa có bằng chứng xác nhận.
Waveform là ảnh tham chiếu tĩnh. Audit không xác nhận hiệu chuẩn,
biên độ live, tính đúng đắn engine hay mô hình điện từ từ các ảnh này.

## 3. Bố trí tủ

Code: [cabinet](../../src/modules/devices/dvor-1150/dvor-1150-cabinet.tsx),
tọa độ `cabinetHotspots` trong dữ liệu. Nguồn chính TM PDF 26 Fig. 1-4 và
PDF 31 Fig. 1-5; đã đọc cả hình render PDF và S112809/S112858.

| Vùng / nguồn | Simulator so với nguồn | Trạng thái / gap |
| --- | --- | --- |
| Tổng thể electronics; Fig. 1-4, S112809 | Status trên, RF monitor kế tiếp, TX1, RMS cage, TX2, power đáy. | **Khớp tương đối**, không phải bản vẽ kích thước; cửa được bỏ như hình nguồn. |
| Hai tầng TX; cùng nguồn | CSB trái, SYN kế bên, hai SB, Audio, MON về bên phải; đủ A3–8/A19–24. | **Khớp thứ tự**, nhưng thân chung vẽ hai vòng tròn cho mọi `module`, không phản ánh đúng SYN/SB. |
| RMS cage; cùng nguồn | Jack rồi modem, serial, khoảng trống, Facilities, Test, CPU và ba LVPS. | **Một phần:** không gắn nhãn cả Spare 1/Spare 2; không có slot/backplane chi tiết như Fig. 1-4. |
| Đáy tủ; Fig. 1-4; TM §1.2.1.16 | Power panel trái; hai BCPS đặt cạnh nhau ngang phía phải. | **Sai khác:** nguồn chỉ hai BCPS main/standby theo tầng đứng, sau panel; SVG biến thành hai hộp lộ trước ngang hàng, thiếu cơ cấu hạ panel. |
| Commutator; Fig. 1-5, S112858 | Có 2A2 trên, control 2A1 giữa, 2A3 dưới và ribbon bên phải. | **Khớp mức khoang**, không xác nhận tỷ lệ/kích thước. |
| Mặt Commutator CCA; cùng nguồn | Vẽ lưới 24 vòng trên/21 vòng dưới ở mặt lớn. | **Sai khác:** hình nguồn là mặt plate gần như kín, không có các lưới jack này; §1.2.2.3 nêu 27 RF connector mỗi CCA, không phải 24/21. |
| Monitor interface upgrade; TM §1.2.2.1 | Vẽ hộp CURRENT VERSION bên phải với hai detector và splitter. | **Chưa xác minh lắp đặt:** TM cho lắp trái hoặc phải, và không có detector ngoài với MON 012255-1001; Fig. 1-5 không thể chứng minh hộp cụ thể này. |
| Cáp/top/coax và phần che khuất; TM PDF 26, §1.2.2 | SVG không mô tả các adapter trên nóc, đường cáp sau/rack cutout. | **Thiếu** nếu dùng huấn luyện đấu nối; chấp nhận là tổng quan chọn khối, không gọi là wiring diagram. |

## 4. Phần mềm khai thác so với bộ 38 ảnh

[Manifest operations](../../src/modules/operations/dvor-1150/manifest.ts)
chỉ khai báo ID, tên, mô tả, routes và `status: "planned"`; `index.ts` chỉ
export manifest. Không có renderer PMDT trong thư mục đó. Đường
`/simulator/software/dvor-1150` là khai báo route, không chứng minh có ứng
dụng. Phần dưới là backlog fidelity cho stub này, không phủ nhận mã mô
phỏng khác nằm ngoài phạm vi thư mục đã giao.

### 4.1 Khung chung, truy cập và RMS

| Ảnh / màn hình | Tài liệu/ảnh: cửa sổ, menu, trường cần có | Simulator / trạng thái / gap |
| --- | --- | --- |
| S113042 — Login, Fig. 3-4 | PMDT Login; User ID, Password; OK, Cancel. | **Thiếu** dialog/login và quyền theo phiên. Không sao chép tài khoản/mật khẩu ảnh thành credential mặc định. |
| S113057 — RMS Data, Fig. 3-7 | Shell: title trạm/Model 1150/PMDT; menu System, RMS, Monitors, Transmitters, Diagnostics, Info; Connected; toolbar biểu tượng, Next F5, Close F6, Apply F7, Reset F8; status Ready/CAP/Level/user/time. | **Thiếu** shell và trạng thái nút; hai tab Maintenance Alerts/Alarms, A/D Data. Chức năng biểu tượng không rõ chỉ từ ảnh: chưa xác minh. |
| S113057 — sidebar + A/D | Alert, Local; TX1/2 Main/Antenna/Load/Off; MON1/2 Normal/Alarm/Bypass; Azimuth Angle, 30 Hz Mod, 9960 Hz Mod, Deviation, RF Level. A/D TX1/2: +5, +12 digital/analog, −12, +28 V, PA Voltage; Lo/Hi Limit và Volts; nhiệt độ TX1/2 °C. | **Thiếu** route cells độc lập, màu trạng thái, timestamp và dữ liệu/giới hạn. Không coi giá trị chụp là mặc định; đối chiếu thêm MX Transfer/sidebar. |
| S113102 — Logs/Operational Summary, Fig. 3-8 | TX1/2 Time in Normal State, Time in Standby State, Availability; Start/End Time, Elapsed Time; Reset Operational Summary. | **Thiếu** bộ đếm, khoảng thời gian và reset summary. |
| S113106 — Alarm log, Fig. 3-9 | Update, Reset; bảng Time Tag, Type, Alarm, State. | **Thiếu** log alarm, thời gian, trạng thái và reset. |
| S113110 — Maintenance Alerts, Fig. 3-10 | Update, Reset; Time Tag, Type, Alert, State; scroll. | **Thiếu** log cảnh báo bảo trì, phân biệt alert/normal. |
| S113115 — Command Activity, Fig. 3-11 | Update, Reset; Time Tag, User Name, Command. | **Thiếu** nhật ký command và người thực hiện. |
| S113119 — Parameter Change, Fig. 3-12 | Update, Reset; Time Tag, User Name, File. | **Thiếu** log thay đổi cấu hình; cần phân biệt với command log. |
| S113123 — RMS Configuration/General, Fig. 3-13 | RSCU Type/Connection Type; TX1/2 Ident; Startup/Shutdown Delay; Monitor Voting Logic AND/OR. | **Thiếu** cấu hình chung và validation; MX quy định voting tác động transfer. |
| S113123 — General (tiếp) | Digital I/O: Smoke/Intrusion Alarm Installed, Enable Remote Reset, Exit/Entry Delay; Spare #1/#2 Usage. Modem: Dial In VOR # Rings, Tone Dial Out, Dial Out VOR/DME Enabled, Dial Out Phone Number. Automatic Restarts Enabled, First Restart Delay. DME Type, Dual, Keying Output Enabled. | **Thiếu** toàn bộ nhóm trường. Sidebar DME TX1/2 Normal/Antenna là giao diện DVOR cần ghi nhận, không audit nội bộ DME. |
| S113130 — Station, Fig. 3-14 | User Configuration: CVOR/DVOR, Single/Dual Equipment, Dual/Single Monitors, Hot Standby, Frequency; RMS hiển thị DVOR/Dual Equip/Dual Monitors/Cold Standby; Display DIP Switch Settings, Allow Remote Configuration, Station Identifier. | **Thiếu** trường đọc/ghi và trạng thái disabled theo quyền/thiết bị. Không hợp thức hóa mọi tùy chọn CVOR cho DVOR. |
| S113137 — Synthesizer DIP, Fig. 3-15 | Dialog Required Settings; S1 các vị trí 1–8, RF Channel Select, ghi chú rocker switch, OK. | **Thiếu** cửa sổ tính DIP từ frequency; MX `station.frequencyMHz`. |
| S113142 — A/D Limits, Fig. 3-16 | Lo/Hi TX1/2 cho +5/+12 digital/+12 analog/−12/+28/PA Voltage và TX temperatures. | **Thiếu** giới hạn riêng và đơn vị; MX `rms.adLimits.*`. |
| S113146 — Security Codes, Fig. 3-17 | Unavailable indicator; hai nhóm User ID/Password/Level, một tài khoản Level 4 và các dòng chọn level. | **Thiếu** quản trị account/permission. Cần quy tắc quyền và che mật khẩu, không suy từ ô trống. |
| S113151 — RMS Commands, Fig. 3-18 | RMS: Status, Data, Logs, Configuration, Commands, Config Restore/Backup; Commands: Set Time and Date, Change Password, Reset Intrusion/Smoke Detector, Reset RMS Hardware, Enable/Disable Command Mode. | **Thiếu** menu, quyền enable/disable và hộp thoại xác nhận; ảnh không cung cấp toàn bộ dialog. |
| S113156 — DME Commands, Fig. 3-19 | DME Control: DME #1 On, DME #2 On, DME Off, Transfer, DME #1/#2 Terminal; một số mục disabled. | **Thiếu** bề mặt tích hợp/menu có điều kiện DME present (TM PDF 203 §3.4.2.8). Không cần mô phỏng phần cứng DME trong audit này. |

### 4.2 Monitor: cấu hình, đo, kiểm tra và lịch sử

| Ảnh / màn hình | Trường/menu/cửa sổ được thấy | Simulator / trạng thái / gap |
| --- | --- | --- |
| S113200 — Alarm Limits, Fig. 3-20 | Enable Ident Monitoring; Monitor 1/2 Azimuth Angle riêng, 30 Hz/9960 Hz Modulation, 9960 Hz Deviation, RF Level; Alarm Low/PreAlarm Low/Nominal/PreAlarm High/Alarm High và đơn vị. | **Thiếu** bảng limits; MX yêu cầu azimuth riêng, các ngưỡng khác dùng chung. |
| S113204 — Offsets and Scale Factors, Fig. 3-21 | MON1/2; Field Detector và Test Generator/Certification: Azimuth Angle Offset, 30 Hz Modulation Scale, 9960 Hz Modulation Scale, 9960 Hz Deviation Scale; RF Level Offset ở Field Detector. | **Thiếu** hiệu chỉnh theo nguồn đo; không trộn test calibration với live path (MX). |
| S113208 — Monitor Commands, Fig. 3-22 | Monitors: Data, Fault History, Configuration, Commands; Monitor Bypass → On/Off; Abort All Tests. | **Thiếu** bypass/abort; MX yêu cầu alarm còn hiển thị nhưng bypass chặn tự transfer. |
| S113212 — Integrity, Fig. 3-23 | Bảy tab: Integrity, Ground Check, Certification Test Results, Test Data, Notch Monitor, Sideband Antenna VSWR, Standby; MON1/2 timestamp, Comm Status, Controlling, Ident Monitor Enabled; limits/prelimits/data và Ident. | **Thiếu** trạng thái và bảng màu green/yellow/red; TM PDF 207 §3.4.2.11.1 giải thích controlling/audio và gán MON theo TX antenna. |
| S113215 — Test Data, Fig. 3-24 | Test Generator Setup MON1/2: azimuth, 30/9960 modulation, deviation, ident modulation/control, audio modulation/frequency; Test Results MON1/2, Unavailable, Run. | **Thiếu** setup/test/results; TM PDF 208: test khoảng 2 phút, abort; audio 300–3000 Hz bước 30. Không suy timer từ ảnh. |
| S113220 — Certification Test Results, Fig. 3-25 | MON1/2 Low Limit/Data/High Limit/Data; azimuth/modulation/deviation; Run riêng, timestamps; Set to Monitor Limits. | **Thiếu** chạy kiểm định/copy limits và kết quả; TM PDF 209 quy định thời gian khoảng 3 phút, abort và đỏ khi ngoài tolerance. |
| S113224 — Notch Monitor, Fig. 3-26 | Enable Notch Monitoring, Tolerance %, Executive Alarm, Record Baseline; 48 hàng Antenna/Baseline/Current chia ba nhóm. | **Thiếu** đủ 48 anten và baseline; MX giới hạn quy tắc executive nếu manual chưa xác lập. Không tự suy transfer từ màu xanh của ảnh. |
| S113228 — Sideband Antenna VSWR, Fig. 3-27 | Sideband VSWR Executive Alarm, Tolerance, Number of Antennas in Alarm; 48 Antenna/VSWR chia ba nhóm. | **Thiếu** 48 hàng, tolerance/voting anten; MX cho executive tham gia system alarm/transfer. |
| S113233 — Ground Check, Fig. 3-28 | Bảng Azimuth/Station Error, Error Spread; Duantal/Quadrantal/Octantal amplitude/phase, Bias; Graph Options FFT Errors/FFT Sum/Station Error/Markers/Legend; Advanced, Run, graph. | **Thiếu** ground-check sweep, harmonic analysis và lựa chọn graph. Không suy thuật toán FFT từ ảnh. |
| S113236 — Advanced Ground Check, Fig. 3-29 | Dialog Ground Check Error Graph: Error (°) theo Azimuth; Legend, Markers, FFT Sum, Station Error, Bias, Duantal, Quadrantal, Octantal; Print, Copy, Save As, Close. | **Thiếu** dialog/export/graph toggles và dữ liệu nhất quán màn chính. |
| S113241 — Fault History/Monitor Data, Fig. 3-30 | MON1/2; ba cột timestamp snapshot với PreAlarm/Alarm; azimuth, 30/9960 modulation, deviation, RF Level, Ident Status, Notch Monitor, Sideband VSWR. | **Thiếu** snapshot lịch sử và màu từng giá trị, không chỉ log văn bản. |
| S113244 — Fault History/System Status, Fig. 3-31 | Cùng timestamp: voting AND, MON1/2 Bypass/Alarm, Ident Monitoring, Notch/VSWR Enabled/Executive; TX1/2 On Antenna/Main/On. | **Thiếu** snapshot liên kết với Monitor Data và lịch sử route. |
| Standby tab — thấy trên S113212–S113233 | Có nhãn tab nhưng không ảnh mở nội dung trong bộ 38. | **Thiếu / chưa xác minh nội dung ảnh**; phải đối chiếu TM §3.4.2.11 trước thiết kế, không lấy nội dung từ tab Integrity. |

### 4.3 Transmitter và diagnostics

| Ảnh / màn hình | Trường/menu/cửa sổ được thấy | Simulator / trạng thái / gap |
| --- | --- | --- |
| S113248 — Transmitter Data, Fig. 3-32 | Tab TX1/TX2, timestamps; Power Carrier/SB1–4 Watts, VSWR Carrier/SB1–4; Frequency 30 Hz AM/FM, Sideband Frequency, Carrier, Tx Lower/Upper Sideband. | **Thiếu** dữ liệu riêng mỗi TX và đơn vị Hz/MHz, không gộp power/VSWR thành monitor RF Level. |
| S113252 — TX Offsets and Scale Factors, Fig. 3-33 | Hai cột TX1/TX2: Azimuth Angle Offset, Output Power Scale, Voice/Ident/Reference Modulation Scale; SB1-2/SB3-4 Phase Offset; Carrier-Sideband Phase Offset; SB1–4 RF Level Scale; Cabinet Temperature Offset. | **Thiếu** mọi trường và ảnh hưởng downstream; MX phân biệt phase/scale/temperature và điều kiện transfer. |
| S113255 — TX Nominal, Fig. 3-34 | Azimuth Index, Output Power, Voice Modulation, Ident Modulation, Reference Modulation, USB RF Level; giá trị/đơn vị, timestamp. | **Thiếu** bảng nominal; MX có `identCode` nhưng ảnh không thấy ô đó tại đây: cần xác minh nơi nhập, không tự thêm vào ảnh mẫu. |
| S113258 — Transmitter Commands, Fig. 3-35 | Transmitters: Data, Configuration, Commands; Transfer, Transmitter 1, Transmitter 2, VOR Ident, Hold Commutator… | **Thiếu** command/menu và dialog Hold Commutator chưa thấy nội dung. |
| S113302 — Antenna Control, Fig. 3-36 | Transmitter 1 submenu Antenna/Load/Off; status hint dưới cửa sổ. | **Thiếu** command/route feedback cho từng TX; MX tách Main/Antenna/Load/Off, không đổi tất cả cùng lúc. |
| S113305 — Ident Control, Fig. 3-37 | VOR Ident → Normal/Off/Continuous. | **Thiếu** chế độ nhận dạng và cập nhật chỉ báo; không suy ident alarm tự transfer (MX). |
| S113309 — Power Up Results, Fig. 3-38 | Diagnostics Data and Commands; Power Up Results/Fault Isolation; cột RMS, MON1/2, Audio Gen1/2; CPU Functional Test, RAM, PROM, EEPROM Check. | **Thiếu** ma trận kết quả boot, không dùng một đèn Normal chung thay thế. |
| S113312 — Fault Isolation, Fig. 3-39 | Sub System/Progress/Results: Logon/RMM, Power Supplies, Monitor + Cert Enabled, Audio Generator, Synthesizer, Power Amplifier, Distribution, Alarm/Alert Analysis, Control; Fault Isolation Results; Run Off Air Diagnostics, Cancel, Run On Air Diagnostics. | **Thiếu** quy trình chẩn đoán, tiến độ, kết quả và khóa điều kiện on/off-air. |

### 4.4 Hợp đồng hành vi không thể xác nhận chỉ bằng ảnh

| Nguồn | Yêu cầu đối chiếu | Simulator / trạng thái / gap |
| --- | --- | --- |
| MX Apply and persistence; S113123/S113142 toolbar; TM PDF 201 §3.4.2.7 | SEC3/SEC4 → Local → draft → Apply F7 → Need Backup → RMS Config Backup; Reset F8 bỏ draft; Restore persistent nhưng giữ Local/Bypass/connection. | **Thiếu trong stub** cả draft/running/persistent và validation/log parameter-change. Ảnh không chứng minh mỗi bước chuyển trạng thái. |
| MX Configuration and derived values; S113200/204/248/252/255 | Frequency, nominal/scale/phase/monitor calibration phải tính lại snapshot; RMS temperature/A-D chỉ cảnh báo bảo trì, test generator không đổi tuyến live. | **Thiếu trong stub** graph ảnh hưởng cấu hình → số đo, không chỉ dựng form tĩnh. |
| MX Transfer/sidebar; S113057/212/244/302 | Manual transfer khác monitor-alarm transfer; Main logic khác Antenna thực; cả hai path alarm → shutdown Off; bypass giữ alarm và chặn tự transfer. | **Thiếu trong stub** state machine và event log. Đây là contract MX, không khẳng định đã quan sát chuỗi sự kiện trong ảnh tĩnh. |

## 5. Test, tài liệu liên quan và giới hạn kiểm chứng

Đã rà tham chiếu `dvor-1150` (tách khỏi `dvor-1150a`):
`tests/layout/module-routing.test.tsx` kiểm route thiết bị;
`tests/layout/concise-showcase.test.tsx` kiểm liên kết mở simulator;
`tests/scenario-exams/hardware-presentation.test.ts` có kiểm identity 1A3 và
evidence/reference criteria. Không phải test vị trí đèn, điểm đo hoặc fidelity
với S/TM. `tests/vor/dvor1150-{engine,influence-matrix,scenario-workflow,scenario-policy}.test.ts`
và `generate-dvor1150-scenario-fixtures.test.ts` thuộc engine/scenario khác
phạm vi operations stub: đã xác định vị trí, chưa audit thuật toán hoặc chạy.

Tìm trong `docs/` không thấy tài liệu baseline riêng cho DVOR 1150 thường;
không dùng tài liệu DVOR 1150A thay nguồn. Audit DVOR 220 chỉ dùng làm mẫu
cấu trúc. Các assertion về repo ở mục này dựa trên mã/test tại SHA đầu bài,
không phải thông tin thiết bị cần suy từ manual.

Không chạy Vitest/build/lint vì chỉ thêm tài liệu; đặc biệt không chạy suite
sinh lại fixture. CodeGraph không có executable trong PATH hoặc
`node_modules/.bin`; kiểm tra môi trường một lần rồi đọc source trực tiếp,
không tạo index/artifact vào repo. PDF đã mở bằng PyMuPDF, trích text đủ
332 trang và render các hình/bảng cần đối chiếu; tất cả 38 PNG mở thành công.
Không render UI simulator trong trình duyệt: các nhận xét vị trí simulator
dựa trên SVG/source, **chưa xác minh trực quan runtime**. Không có sửa chữa
hay xác nhận thiết bị đang lắp ngoài hiện trường trong đợt audit này.

## 6. Câu hỏi cần chủ sở hữu xác nhận

1. **Baseline đời máy/P/N nào?** TM PDF 54 §2.3.1 và §2.3.2.3/8 phân biệt
   CSB amplifier, RF monitor/dummy load đời cũ/mới. Xin P/N/ảnh máy đích;
   không ghép mọi biến thể thành một cấu hình mặc định.
2. **MON và detector ngoài?** TM §1.2.2.1 loại detector ngoài với MON
   012255-1001; Fig. 1-4/S112809 liệt kê cả 012617-1003/012255-1001.
   Máy đích dùng loại nào, interface lắp trái hay phải? Hộp CURRENT VERSION
   trong simulator chưa được nguồn ảnh xác nhận.
3. **Status panel thực tế?** TM Table 3-6 và S112809 không chứng minh
   hai cụm SYSTEM A/B mỗi cụm có Bypass. Xin ảnh thẳng mặt đọc rõ switch,
   đèn và nhãn để chốt bố cục/biến thể, không suy từ mặt vẽ hiện tại.
4. **Phiên bản sơ đồ?** SVG tự ghi Rev. F October 2002 nhưng TM PDF 54
   là Rev. K January 2008. Có bản Rev. F thực sự dùng cho máy đích hay
   caption cũ? Chưa thể kết luận khác đời phần cứng chỉ từ dòng chữ này.
5. **Ảnh là mẫu manual hay capture phần mềm trạm?** S113123/130/146 và
   S113057 có title trạm/customer service, ngày nội dung 2006/2007 và caption
   figure. Xin version/build PMDT cùng cấu hình single/dual, cold/hot standby;
   giữ 38 ảnh làm ground truth giao diện được cung cấp, không coi ngày tên
   tệp là ngày firmware. TM §3.4 và MX chưa xác lập build đích.
6. **Quy tắc chưa đủ ảnh?** Xin nội dung tab Standby, menu System/Info,
   Hold Commutator, hộp thoại connect/password/restore/backup và trạng thái
   quyền SEC3/SEC4 (S113212/258/151/146). Chốt hành vi notch Executive Alarm,
   automatic restart và thời gian transfer theo tài liệu áp dụng; MX còn để
   điều kiện manual cho notch, không tự suy từ checkbox S113224.
7. **Nhãn/mapping tài liệu không nhất quán?** TM PDF 230 Table 3-9 ghi
   SB1/2 là 1A4/1A21 và SB3/4 là 1A5/1A22, khác Table 3-10 PDF 231 và
   Fig. 1-4 (A4 là SYN, A5/A6 là SB). Xác nhận errata; giữ GND trên
   Fig. 3-40 dù Table 3-9 gọi TP6. Xin Fig. 11-29/ảnh jack và các bản vẽ
   phần 11 còn thiếu trước khi chốt pinout/đường dây.
8. **Bản PDF nào dùng để dẫn waveform?** Catalog lệch 56 trang với TM
   được giao ở Figs. 7-3–7-8/7-16/17/7-30 (PDF 257–260/264/271).
   Có bản xuất dài hơn tương ứng số trang hiện tại hay cần chuẩn hóa citation?
