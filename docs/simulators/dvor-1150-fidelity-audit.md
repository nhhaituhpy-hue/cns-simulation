# DVOR 1150 — đối chiếu simulator với tài liệu

Phạm vi: sơ đồ khối/dữ liệu khối, mặt module, tủ và sơ đồ hệ thống trong
`src/modules/devices/dvor-1150`; phân biệt listing operations
`src/modules/operations/dvor-1150` với PMDT đang có tại
`src/app/simulator/dvor-1150/page.tsx` → `Dvor1150PmdtLayout`
(`src/components/dvor1150/pmdt-layout.tsx`) → `useDvor1150PmdtStore`
(`src/stores/dvor1150-pmdt-store.ts`). Stage 1 chưa tái đối chiếu màn hình;
PR #30 bổ sung re-check 40 dòng phần mềm ở §4. Baseline mã nguồn phần cứng tại
[`b368ae207fdbbe07e533c04ae6a696a49c5b9a17`](https://github.com/nhhaituhpy-hue/cns-simulation/commit/b368ae207fdbbe07e533c04ae6a696a49c5b9a17).
Đợt baseline chỉ kiểm toán; Stage 1 sửa sơ đồ/citation như ghi dưới đây.
Không đánh giá DVOR 1150A hoặc DME 1119A.
Đây không phải hướng dẫn thao tác/bảo trì thiết bị thật.

Cập nhật Stage 1 trên nền `2a2477974238853d7eb02dbb779e48b53f0db512`:
chỉ bổ sung occurrence/đường mẫu sơ đồ, chuẩn hóa citation và sửa nhận định
sai về trạng thái PMDT. Các mục phần cứng chưa được đánh dấu Stage 1 vẫn
là gap baseline. Các marker cần đối chiếu lại ở §4 của Stage 1 được thay
bằng kết quả re-check trong PR #30, không suy tính năng từ manifest.

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
**Chưa xác minh** = bộ nguồn không đủ kết luận. Riêng phần mềm §4 dùng
verdict match/partial/missing/extra và giữ TODO khi không có ảnh nội dung.
Chỉ listing operations là `planned`, không phải PMDT renderer/store hiện có;
không kết luận thiếu từ manifest.

## Giả định DEMO

Hoàng chưa vận hành DVOR 1150 thật (đang dùng 1150A). **Cả tám lựa chọn
dưới đây đều là giả định DEMO do chủ sở hữu chọn, không phải xác nhận phần
cứng/phần mềm của trạm thật.** Không dùng chúng để đóng TODO khảo sát ở §6.

| # | Giả định DEMO — không xác nhận thiết bị thật | Nguồn / ranh giới áp dụng |
| --- | --- | --- |
| 1 | **Giả định DEMO:** chọn thế hệ mới nhất trong TM Rev. K January 2008: CSB amplifier mới, RF monitor/dummy load mới; không trộn biến thể cũ/mới. | TM §2.3.2.3/8, PDF 54 §2.3.1; không suy P/N trạm thật. Stage 1 không thay kết cấu amplifier/tải. |
| 2 | **Giả định DEMO:** MON 012255-1001, không có field detector ngoài; giữ monitor interface bên phải như hình simulator hiện tại. | TM §1.2.2.1; vị trí bên phải là lựa chọn demo. Stage 1 chưa thay cabinet/detector; hình còn detector ngoài là gap, không phải cấu hình demo đã hoàn tất. |
| 3 | **Giả định DEMO:** ưu tiên Table 3-6: Normal/Alarm MON1/MON2 và **một** Integral Bypass switch kèm indicator; bỏ hai nhóm SYSTEM A/B. | TM PDF 227 Table 3-6; dành cho Stage 3, không sửa mặt status ở Stage 1. |
| 4 | **Giả định DEMO:** caption Rev. F October 2002 là nhãn cũ; chuẩn hóa Rev. K January 2008. | TM PDF 54 Fig. 2-2; Stage 1 sửa caption, không chứng minh lịch sử máy thật. |
| 5 | **Giả định DEMO:** 38 ảnh là sample figure của manual và ground truth UI; demo dual TX, dual MON, **hot standby**. | S113130/212/248 là nguồn bố cục, không dùng trạng thái Cold Standby trong sample làm cấu hình demo. PMDT là đợt riêng. |
| 6 | **Giả định DEMO:** UI chưa có ảnh dùng TM §3.4 + MX; điều kiện manual để mở vẫn để mở, không suy từ checkbox. | Standby, System/Info, Hold Commutator, connect/password/restore/backup, SEC3/4, notch Executive Alarm, automatic restart, transfer timing: PMDT đợt riêng; S113151/224/258 không đủ chứng minh luồng. |
| 7 | **Giả định DEMO:** Table 3-10 + Fig. 1-4 thắng mapping Table 3-9: A4/A20 = SYN, A5/A6/A21/A22 = SB; GND theo Fig. 3-40. Table 3-9 là **nghi errata**, chưa phải errata được hãng xác nhận. | TM PDF 26, 229–231; Stage 1 giữ mapping đúng và bổ sung ghi chú nghi errata. |
| 8 | **Giả định DEMO:** citation dùng đúng PDF Rev. K 332 trang được giao; sửa offset 56 trang trong catalog waveform. | Đã đối chiếu từng hình: Fig. 7-3 → PDF 257; 7-4/5 → 258; 7-7 → 259; 7-8 → 260; 7-16/17 → 264; 7-30 → 271. Stage 1 chỉ sửa citation, không tái hiệu chuẩn waveform. |

### Lộ trình chia đợt

| Đợt | Phạm vi | Tình trạng trong cập nhật này |
| --- | --- | --- |
| Stage 1 | Block/system diagram: thêm SB TX2, mẫu FWD/REV; caption, mapping/citation | Đợt hiện tại; không sửa các gap wiring khác. |
| Stage 2 | Mặt sideband generator | Chưa thực hiện. |
| Stage 3 | Status panel | Chưa thực hiện. |
| Stage 4 | Cabinet BCPS và bỏ lưới commutator không có nguồn | Chưa thực hiện; đồng bộ cấu hình MON/interface không detector ngoài còn là TODO phần cứng, không ngầm coi đã xong. |
| PMDT | Tái đối chiếu PMDT **hiện có** theo TM §3.4 + MX + 38 ảnh | [PR #30](https://github.com/nhhaituhpy-hue/cns-simulation/pull/30): re-check 40 dòng và browser pass, kết quả ở §4; docs-only, không phải xây ứng dụng từ stub. Chỉ operations listing là planned. |

## 1. Sơ đồ chức năng

Code: [dữ liệu khối](../../src/modules/devices/dvor-1150/block-diagram-data.ts),
[sơ đồ hệ thống](../../src/modules/devices/dvor-1150/dvor-1150-system-diagram.tsx),
[khung chọn/chi tiết](../../src/modules/devices/dvor-1150/dvor-1150-block-diagram.tsx).
Đối chiếu từng ID của `DVOR_1150_BLOCKS`; có trong catalog không đồng nghĩa
có hình trên sơ đồ chính (`diagramOccurrences` của nhiều card để trống).

| Khối | Simulator so với tài liệu | Trạng thái | Khoảng trống / nguồn |
| --- | --- | --- | --- |
| Status display 1A1 | Có hai Display CCA và danh sách Normal/Alarm 1/2, Bypass; có khối DISPLAY nối RMS. | Một phần | Hình mặt riêng thêm Bypass mỗi hệ, không có switch; TM PDF 227 Table 3-6; PDF 26 Fig. 1-4. |
| RF monitor 1A2 | Stage 1 đã tách hai đường mẫu REV/FWD từ mỗi ISO1–4 về RF Monitor A2, có nhãn riêng. | Một phần | Đã sửa gap tám đường mẫu theo TM PDF 54 Fig. 2-2; §2.3.2.8 còn phân biệt đời tải giả, chưa đổi mặt/engine. |
| CSB amplifier 1A3/1A19 | Hai occurrence TX, mô tả khoảng 120 W và AM 30 Hz/1020 Hz/voice phù hợp chức năng. | Một phần | Gộp output hai TX qua một LPF/coupler, không diễn tả transfer/dummy load; TM PDF 54 Fig. 2-2, §2.3.2.3. |
| Frequency synthesizer 1A4/1A20 | Có carrier/USB/LSB, PLL/feedback, cặp TX. | Một phần | Đường feedback từ sample trong SVG kết thúc ở vùng CSB, thiếu vòng LPF → SYN rõ ràng; TM PDF 54 Fig. 2-2, §2.3.2.1, Figs. 2-3–2-6. |
| Sideband generator 1A5/6/21/22 | Stage 1 đã vẽ đủ TX1 A5/A6 và TX2 A21/A22, chọn được từng occurrence đến hotspot tủ riêng; LSB1/2, USB3/4 theo Table 3-10/Fig. 1-4. | Khớp phạm vi occurrence | Đã sửa thiếu TX2 (TM PDF 54 Fig. 2-2, PDF 26 Fig. 1-4, PDF 231 Table 3-10); sample đầu ra vẫn gộp main/standby, không phải sơ đồ transfer/wiring. |
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

**Sau Stage 1:** đủ tám đường mẫu FWD/REV (TM PDF 54 Fig. 2-2), caption
đã đổi thành `FIGURE 2-2 · REV. K · JANUARY 2008`. ISO1–4 vẫn không có
block/hotspot riêng. Caption chuẩn hóa theo giả định DEMO #4, không phải
xác nhận lịch sử phiên bản máy thật; các gap feedback/nguồn/monitor ở bảng
vẫn chưa được sửa. Các nhánh audio/main-standby vẫn là biểu diễn gộp chức năng.

## 2. Mặt thiết bị: vị trí và sai khác

Code: [mặt chi tiết](../../src/modules/devices/dvor-1150/dvor-1150-module-faceplates.tsx),
`BlockVisual` trong khung chi tiết. Chỉ ba mặt riêng: SYN, SB generator và
status display. CSB/audio/RF monitor/MON dùng sơ đồ chức năng; các khối
khác dùng placeholder, **không phải** mặt điều khiển được đối chiếu.

| Module / nguồn | Tài liệu: thứ tự, điều khiển, điểm đo | Simulator / trạng thái / gap |
| --- | --- | --- |
| SYN; TM PDF 229 Fig. 3-40, S113326 | TP1/2/3 gần đầu trên, khoảng trống, TP4/5, GND, J8 Carrier Freq 10 mW (typ.); tay kéo dưới, R81 bên trái tay kéo. | **Khớp tương đối:** cùng thứ tự và vùng vị trí. Hình có vít/trim minh họa, không có kích thước chuẩn hay thao tác điện. |
| SYN signals; TM PDF 230 Table 3-9 | TP1 LSB quadrature, TP2 USB quadrature, TP3 phase error, TP4 carrier phase control, TP5 manual SB phase; TP6 ground trong bảng nhưng GND trên hình. | **Khớp:** catalog giữ GND và ghi chú TP6; Stage 1 thêm ghi chú Table 3-9 **nghi errata** về assembly, ưu tiên Table 3-10/Fig. 1-4. J8 đang nằm trong `controls`, không phải điều khiển chỉnh; không sửa mặt SYN. |
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

**Đã sửa Stage 1 — citation waveform:** catalog từng ghi PDF 313–316,
320, 327; nay trỏ đúng TM PDF **257–260, 264, 271**, kèm Rev. K January
2008 cho Figs. 7-3/4/5/7/8, 7-16/17, 7-30. Đã đối chiếu từng page/figure
trong PDF 332 trang. Nguyên nhân offset cũ chưa được xác nhận. Riêng
Fig. 7-30 ghi MON **012617-1003**; ảnh waveform không chứng nhận tương
đương điện/biên độ cho MON 012255-1001 demo (TODO khảo sát).
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

### PMDT re-check summary

Re-check PMDT tại SHA `2a2477974238853d7eb02dbb779e48b53f0db512`;
giữ nguyên baseline phần cứng ở đầu bài. **40 dòng: match 4, partial 34,
missing 1, extra 1.** Đây là verdict theo phạm vi từng dòng, không phải
chứng nhận toàn màn hình hay thuật toán thiết bị. Bộ 38 ảnh gồm **34 ảnh
PMDT + 4 hình phần cứng** đã nêu ở quy ước; không có 38 cửa sổ PMDT riêng.

PMDT **đang chạy**, không phải stub:
[route](../../src/app/simulator/dvor-1150/page.tsx) →
[Dvor1150PmdtLayout](../../src/components/dvor1150/pmdt-layout.tsx) →
`Dvor1150ScreenRouter`, dùng `useDvor1150PmdtStore`. Chỉ
[listing operations](../../src/modules/operations/dvor-1150/manifest.ts)
còn `planned`; không dùng trạng thái listing để kết luận thiếu renderer.

**Giả định DEMO 5–6 (quyết định chủ sở hữu, không xác nhận máy thật):**
dual TX, dual MON, hot standby; ảnh mẫu manual là ground truth UI. Phần
không có ảnh chỉ đối chiếu TM §3.4 và MX, giữ TODO/điều kiện chưa rõ.
Không lấy giá trị đo, ngày hoặc calibration trong ảnh làm mặc định bắt buộc.

Ưu tiên cho đợt sửa sau, không sửa implementation trong re-check này:
1. **P1 — persistence:** toolbar Reset gọi Restore; cả hai trở về baseline,
   không phải bỏ draft/khôi phục backup theo MX (§4.4).
2. **P1 — command thật:** Ident, DME, reset detector, Abort/Run test và Record
   Baseline phần lớn chỉ ghi `lastCommand`, không đổi dữ liệu (§4.1–4.3).
3. **P1 — A/D:** kênh −12 V trên ảnh bị tính/đặt tên +12 V trong engine;
   form limits lại ghi −12 V nhưng dùng cùng khóa dương (§4.1).
4. **P1 — history/diagnostics:** lịch sử không giữ ba snapshot; status bị
   hard-code; Power Up Results lấy trạng thái fault-isolation chung (§4.2–4.3).
5. **P2 — ground check:** thiếu Duantal, trục/legend và các đường harmonic;
   advanced/export/toggles mới là khung (§4.2).
6. **P2 — configuration:** General nhiều ô tĩnh, Station ghi Cold Standby
   cố định trái với DEMO hot standby; Security Codes chỉ đọc; DIP thiếu màu/
   chú giải RF Channel Select; thừa RF Level ở test-generator calibration.
7. **P2 — shell/menu:** Cancel login, Print/Copy chưa xử lý; thiếu status hint,
   sidebar DME và gating DME-present; giữ các dialog chưa có ảnh là TODO.

**Code key dùng trong từng dòng** (tên component sau key là citation cụ thể):
PS = [pmdt-screens.tsx](../../src/components/dvor1150/pmdt-screens.tsx);
ST = [dvor1150-pmdt-store.ts / useDvor1150PmdtStore](../../src/stores/dvor1150-pmdt-store.ts);
EN = [engine.ts](../../src/lib/dvor1150/engine.ts);
ME = [menu-structure.ts / dvor1150MenuStructure](../../src/lib/dvor1150/menu-structure.ts)
và [pmdt-menu-bar.tsx / MenuItemRow](../../src/components/dvor1150/pmdt-menu-bar.tsx);
SI = [pmdt-sidebar.tsx / Dvor1150Sidebar](../../src/components/dvor1150/pmdt-sidebar.tsx);
CC = [pmdt-config-control.tsx / Dvor1150ConfigControl](../../src/components/dvor1150/pmdt-config-control.tsx).
`match` = khớp nội dung UI được dẫn, không áp dụng cho sai khác shell dùng
chung hay số đo phụ thuộc cấu hình; `partial` = có nhưng giản lược/sai khác;
`missing` = implementation nội dung chưa có; `extra` = có trường thừa so
với ảnh. Dòng không có ảnh mở nội dung luôn giữ **TODO**, dù có verdict.

### 4.1 Khung chung, truy cập và RMS

| Ảnh / màn hình | Ground truth | PMDT hiện có / citation code | Verdict / gap cụ thể |
| --- | --- | --- | --- |
| S113042 — Login, Fig. 3-4 | PMDT Login; User ID, Password; OK, Cancel. | [Dvor1150LoginDialog](../../src/components/dvor1150/pmdt-login-dialog.tsx): đủ title, hai ô, OK/Cancel; ST `login` kiểm account huấn luyện, khóa sau ba lần sai. | **partial** — Cancel và × không có handler, không hủy dialog. Không sao chép credential từ ảnh; bố cục dialog trong overlay khác cửa sổ độc lập mẫu. |
| S113057 — RMS Data, Fig. 3-7 | Title trạm/Model 1150/PMDT; sáu menu; Connected; Print/Copy, Next F5, Close F6, Apply F7, Reset F8; Ready/CAP/Level/user/time. | `Dvor1150PmdtLayout` ghép [TitleBar](../../src/components/dvor1150/pmdt-title-bar.tsx), ME, [Toolbar](../../src/components/dvor1150/pmdt-toolbar.tsx), [StatusBar](../../src/components/dvor1150/pmdt-status-bar.tsx); PS `Dvor1150RmsDataScreen` có hai tab. | **partial** — Print/Copy và nút cửa sổ không xử lý; tab ghi “Maintenance Alerts”, thiếu “/Alarms”; thêm NUM và chrome ATTECH/Scenario Parameters của ứng dụng huấn luyện ngoài ảnh. Chức năng biểu tượng không kết luận từ ảnh đơn lẻ. |
| S113057 — sidebar + A/D | Dual TX Main/Antenna/Load/Off; MON1/2 Normal/Alarm/Bypass; năm số đo; A/D mỗi TX: +5/+12/−12/+28/PA Voltage, Lo/Hi, Volts; hai nhiệt độ °C. | SI đủ route cells, Local/Alert, bypass chung; PS `Dvor1150RmsDataScreen/AdDataTable` lấy EN `adRowsFor/temperatureRows`, có TX1/2 và temperature. | **partial** — EN `adParameterMeta` ghi hai hàng +12 VDC, `plus12VLogic` tính quanh **+12**, không phải −12 của ảnh. TX1/2/temperature xếp dọc thay vì temperature bên phải; sidebar luôn đọc MON1 (`activeMonitor`), chưa chọn theo controlling monitor. |
| S113102 — Logs/Operational Summary, Fig. 3-8 | Hai TX: Time in Normal/Standby State, Availability; Start/End/Elapsed Time, Hours/%; Reset Operational Summary. | PS `OperationalSummary` đủ nhãn, số mẫu 0.65/0.03 giờ, 14.1087%, ngày 2006 và nút. | **partial** — số/ngày hard-code, không là bộ đếm; Update/Reset/Reset Operational Summary không handler. Bố cục gộp một bảng thay các nhóm tách rời trên ảnh. |
| S113106 — Alarm log, Fig. 3-9 | Update/Reset; Time Tag, Type, Alarm, State, vùng cuộn trắng. | PS `Dvor1150RmsLogsScreen/LogTable`: đúng bốn cột, dùng `derived.data.logs` hoặc fallback. | **partial** — chung dữ liệu với Maintenance/Command, không lọc loại; Type lấy `row.user`, State suy từ severity thay sự kiện alarm. Update/Reset không handler; thiếu panel cuộn trắng như ảnh. |
| S113110 — Maintenance Alerts, Fig. 3-10 | Update/Reset; Time Tag, Type, Alert, State và scroll. | PS `LogTable(mode="maintenance")`: đủ nhãn bốn cột. | **partial** — cùng nguồn không lọc với alarm; Type vẫn là user; chỉ map green/yellow/khác thành Normal/Alert Low/Alarm, không đủ trạng thái high/low trong ảnh. Hai nút chưa hoạt động. |
| S113115 — Command Activity, Fig. 3-11 | Time Tag, User Name, Command; Update/Reset. | PS `LogTable(mode="command")`: đủ ba cột, cùng nguồn logs/fallback. | **partial** — không tách nhật ký command; nhiều command ST chỉ đặt `lastCommand`, không append log, Update/Reset không xử lý. Không yêu cầu sao chép mật độ/số dòng mẫu. |
| S113119 — Parameter Change, Fig. 3-12 | Time Tag, User Name, File; Update/Reset. | PS `ParameterChangeTable` dùng ST `parameterChangeLogs`, fallback ba dòng SEC3/Monitor/RMS. | **partial** — có log riêng, nhưng tên File mẫu “Monitor #1/#2” không chi tiết “Monitor #… Alarm Limits” trong ảnh; Update/Reset không handler. Fallback không phải lịch sử đã xảy ra. |
| S113123 — RMS Configuration/General, Fig. 3-13 | RCSU/Connection Type; TX1/2 Ident; Startup/Shutdown Delay (seconds); voting AND/OR. | PS `Dvor1150RmsGeneralConfiguration`: đủ nhóm; delays/voting qua CC, Ident “VOR” và RCSU/connection qua `StaticInput/StaticSelect`. | **partial** — RCSU, connection và hai Ident chỉ đọc, không cấu hình; voting/delays có binding nhưng chưa xác nhận timer phần cứng. Không suy quyền ghi từ screenshot disabled. |
| S113123 — General (tiếp) | Digital I/O, remote reset/delays/spares; modem/rings/dial-out/phone; Automatic Restarts/First Restart Delay; DME Type/Dual/Keying. | PS `Dvor1150RmsGeneralConfiguration` có các nhóm và CC cho smoke/intrusion, automatic restart, delay, dual DME/keying. | **partial** — remote reset, exit/entry, spares, modem và DME Type là ô tĩnh; chỉ có Dial Out VOR Enabled, thiếu Dial Out DME Enabled. Không có sidebar DME ở SI dù ảnh có; checkbox restart không chứng minh đã có chu trình restart (TODO điều kiện theo TM §3.4/MX). |
| S113130 — Station, Fig. 3-14 | CVOR/DVOR, Single/Dual, MON1/2, Hot Standby, Frequency MHz, DIP, remote config, identifier; nhóm RMS báo cấu hình máy. | PS `Dvor1150RmsStationConfiguration/Dvor1150ConfigRadioGroup`: đủ nhóm, CC frequency 4 số lẻ; Hot Standby checked khi dual TX. | **partial** — RMS luôn ghi **Cold Standby**/Dual Equip/Dual Monitors, không phản ánh draft và trái DEMO hot standby; Hot Standby chỉ suy từ dual, không là cấu hình riêng. Remote Configuration luôn checked/disabled; ảnh cũng thể hiện Cold Standby nhưng không lấy trạng thái mẫu ấy thay quyết định DEMO 5. |
| S113137 — Synthesizer DIP, Fig. 3-15 | Required Settings, **S1 đỏ**, vị trí 1–8; “1 – RF Channel Select”, ghi chú rocker, OK. | PS `Dvor1150SynthesizerDipDialog/dvor1150DipState`: tám bit từ frequency, S1/Note/OK và đóng ×. | **partial** — switch trắng/xám thay đỏ; thiếu “1 – RF Channel Select” và nét/ký hiệu ON như mẫu. Công thức 8-bit có thật nhưng bảng ánh xạ switch chưa được chứng thực chỉ bằng ảnh; không coi là pinout đã xác nhận. |
| S113142 — A/D Limits, Fig. 3-16 | TX1/2 Lo/Hi của **năm** hàng +5/+12/−12/+28/PA Voltage (Volts); hai TX temperatures (°C). | PS `Dvor1150RmsAdLimits/adParameters`: đủ hai bảng và nhiệt độ, CC theo từng TX. | **partial** — label −12 VDC trỏ vào `rms.adLimits.*.plus12VLogic` (giới hạn dương), EN cũng tính dương; cần thống nhất dấu/kênh, không thêm hàng digital/analog mà ảnh này không có. Temperature bị đẩy xuống dưới, không nằm bên phải. |
| S113146 — Security Codes, Fig. 3-17 | Unavailable, hai nhóm User ID/Password/Level; nhiều hàng, tài khoản Level 4. | PS `Dvor1150SecurityCodes`: đủ hai nhóm × năm hàng, SEC4/SEC3, password trống, Level 4/3. | **partial** — toàn bộ là static disabled, không quản trị account; tab hiện với cả SEC3/SEC4, chưa có state matrix theo quyền. Nội dung password trống không là bằng chứng mật khẩu thật; **TODO** xác nhận các trạng thái chưa có ảnh. |
| S113151 — RMS Commands, Fig. 3-18 | Status/Data/Logs/Configuration/Commands/Restore/Backup; Set Time and Date, Change Password, Reset Intrusion/Smoke/RMS, Enable/Disable Command Mode. | ME đủ các mục, Change Password disabled; ST `executeCommand` và local-mode handlers. | **partial** — Set Time chỉ refresh đồng hồ, không có dialog; Reset detector/RMS chỉ ghi tên lệnh; password chưa triển khai. **TODO** nội dung dialog connect/password/restore/backup vì không có ảnh, không thiết kế từ menu tĩnh. |
| S113156 — DME Commands, Fig. 3-19 | DME Control → DME #1 On/#2 On, DME Off, Transfer, #1/#2 Terminal (disabled). | ME có submenu, ghi **“DME's Off”**; terminal disabled; ST nhận các command DME. | **partial** — khác label “DME Off”; các lệnh chỉ đặt `lastCommand`, không đổi trạng thái DME; menu không gate theo `rms.dmePresent` dù TM PDF 203 §3.4.2.8 có điều kiện. Chỉ audit tích hợp UI, không audit phần cứng DME. |

### 4.2 Monitor: cấu hình, đo, kiểm tra và lịch sử

| Ảnh / màn hình | Ground truth | PMDT hiện có / citation code | Verdict / gap cụ thể |
| --- | --- | --- | --- |
| S113200 — Alarm Limits, Fig. 3-20 | Ident Monitoring; azimuth riêng MON1/2, 30/9960 Mod, 9960 Deviation, RF Level; Alarm Low/PreAlarm Low/Nominal/PreAlarm High/Alarm High và °/%/Ratio/dB. | PS `Dvor1150MonitorConfigScreen`: đủ năm band, azimuth riêng; CC bind limits chung còn lại như MX. | **partial** — label **“Deviation”** thay “9960 Hz Deviation”; độ chính xác azimuth hai số lẻ khác ảnh cấu hình một số lẻ. Có binding chứ không phải màn thiếu. |
| S113204 — Offsets and Scale Factors, Fig. 3-21 | MON1/2, Field Detector và Test Generator/Certification: azimuth °, ba modulation/deviation scales %; RF Level Offset dB **chỉ Field Detector**. | PS `CalibrationTable/calibrationRows` dựng hai cột cho cả năm hàng của mỗi MON. | **extra** — thừa ô **RF Level Offset ở Test Generator/Certification** cho cả MON1/2; ảnh để trống cột ấy. Nhãn “9960 Hz Deviation Scale”/đơn vị còn lại có; giá trị calibration phụ thuộc cấu hình, không ép bằng mẫu. |
| S113208 — Monitor Commands, Fig. 3-22 | Data/Fault History/Configuration/Commands; Monitor Bypass On/Off, Abort All Tests. | ME đủ menu; ST `setMonitorBypass` đổi bypass chung, giữ alarm và chặn auto-transfer; `executeCommand("abort-tests")`. | **partial** — bypass có thật; Abort chỉ đặt `lastCommand`, không hủy test đang chạy. Không suy hai bypass độc lập từ hai nút sidebar. |
| S113212 — Integrity, Fig. 3-23 | Bảy tab; hai MON xếp dọc, timestamp/Comm/Controlling/Ident Enabled; alarm/prealarm/data, Ident, °/%/Ratio/dB. | PS `Dvor1150MonitorDataScreen/MonitorIntegrityBlock` có đủ tab/nhóm, màu từ EN `monitorResult`. | **partial** — “Deviation” thiếu tiền tố 9960 Hz; EN `buildDvor1150Snapshot` luôn truyền controlling=true cho MON1, false cho MON2, không gán lại theo TX antenna như TM PDF 207 §3.4.2.11.1. Bố cục có, không còn kết luận “Thiếu”. |
| S113215 — Test Data, Fig. 3-24 | Setup MON1/2 với tám thông số; kết quả Azimuth/30/9960/Deviation, Unavailable, Run, °/%/Ratio/Hz. | PS `Dvor1150MonitorTestData/TestResultColumn`: đủ hàng; MON1 editable, MON2 mirror cùng config; EN `buildMonitorTestResults` luôn available=true. | **partial** — thiếu setup riêng MON2, không tái hiện Unavailable; results thiếu cột đơn vị; Run chỉ đặt command, không có chu trình/abort. TM PDF 208 nêu khoảng hai phút và audio 300–3000 Hz bước 30; không suy timer từ ảnh. |
| S113220 — Certification Test Results, Fig. 3-25 | MON1/2 **xếp dọc**; Low Limit/Data/High Limit/Data; azimuth/mod/deviation, °/%/Ratio; Run, hai timestamps, Set to Monitor Limits. | PS `Dvor1150CertificationResults`: hai MON **cạnh nhau**, mỗi MON một timestamp; EN `buildCertificationResults` lấy live value cho cả lowData/highData. | **partial** — chưa là hai điểm thử độc lập; Run chỉ ghi command, Set to Monitor Limits luôn disabled; thiếu timestamp kết quả riêng. TM PDF 209 nêu khoảng ba phút/abort/tolerance, chưa được chu trình hiện tại thể hiện. |
| S113224 — Notch Monitor, Fig. 3-26 | Enable, Tolerance %, Executive Alarm, Record Baseline; 48 Antenna/Baseline/Current, **3 × 16**. | PS `Dvor1150NotchMonitor`, EN `buildNotchData`: đủ 48 hàng, ba nhóm, checkbox và dữ liệu tính từ baseline. | **partial** — Executive Alarm cố định false/disabled; Record Baseline chỉ ghi command, không lưu baseline mới. **TODO** điều kiện executive chưa rõ theo TM §3.4/MX; không suy transfer từ checkbox/màu mẫu. |
| S113228 — Sideband Antenna VSWR, Fig. 3-27 | Executive Alarm, Tolerance **:1**, Number of Antennas in Alarm; 48 Antenna/VSWR chia **4 × 12**, không phải ba nhóm. | PS `Dvor1150SidebandVswr`: đúng controls CC, 48 hàng/four-column layout, readout hai số lẻ; EN tính snapshot và executive status theo MX. | **match** — không thấy thiếu/thừa trường, nhãn hay đơn vị trong nội dung được dẫn; số VSWR là dữ liệu tính, không cần bằng 48 số mẫu. Chưa kiểm thử transfer động tại dòng này. |
| S113233 — Ground Check, Fig. 3-28 | Azimuth/Station Error, Error Spread; **Duantal/Quadrantal/Octantal**, Bias amplitude/phase; FFT Errors/FFT Sum/Station Error/Markers/Legend; Run/Advanced; trục và đường màu. | PS `Dvor1150GroundCheck/GroundCheckErrorTable/GroundCheckGraph`: bảng, Run, Advanced; chỉ Quadrantal/Octantal/Bias và một polyline xanh. | **partial** — thiếu Duantal, tick/nhãn trục/legend/nhiều đường; “EPI Forms” thay “FFT Errors”; chọn mode chỉ đổi aria-label, không đổi dữ liệu vẽ. Markers/Legend readOnly; Run không tạo sweep. |
| S113236 — Advanced Ground Check, Fig. 3-29 | Ground Check Error Graph, Error (°)/Azimuth; Legend/Markers/FFT Sum/Station Error/Bias/**Duantal**/Quadrantal/Octantal; Print/Copy/Save As/Close. | PS `Dvor1150AdvancedGroundCheck` có dialog, graph dùng chung, Close và ba nút export. | **partial** — thiếu Duantal, trục số/legend/đường harmonic; options readOnly, Print/Copy/Save As không handler; title ngày giờ hard-code 03/30/07, không theo dữ liệu chính. |
| S113241 — Fault History/Monitor Data, Fig. 3-30 | Hai MON; ba timestamp snapshot, tiêu đề PreAlarm/Alarm; số đo màu, Ident, Notch/VSWR. | PS `Dvor1150FaultHistory` dựng ba timestamp và hai MON; EN `buildFaultHistory` chỉ dựng snapshot hiện tại với thông số đang bất thường. | **partial** — thiếu lịch sử ba sự kiện/tiêu đề PreAlarm–Alarm; thiếu ô normal tại snapshot lỗi; fallback đệm timestamp 2006, có thể trùng key. Ident Normal/Notch/VSWR green hard-code, không phải snapshot đã lưu. |
| S113244 — Fault History/System Status, Fig. 3-31 | Cùng timestamp: logic, MON1/2 **Bypass/Alarm**, Ident/Notch/VSWR Enabled/Executive; từng TX1/2 On Antenna/Main/On. | PS `Dvor1150FaultHistory(system-status)` đọc logic/alarm; phần khác phần lớn literal/checkbox; EN chỉ giữ một systemStatus. | **partial** — thiếu Bypass và route cells TX1/2 thực từng snapshot; “On Antenna” chỉ chữ Tx1/Tx2, Main/On đèn green cố định; Enabled/Executive hard-code, không liên kết lịch sử Monitor Data. |
| Standby tab — nhãn trên S113212–S113233, **không có ảnh mở tab** | Chỉ xác nhận nhãn Standby; nội dung không được bộ 38 ảnh chứng minh. | PS `Dvor1150MonitorDataScreen`, view `monitor-standby` trả empty div; browser thấy tab trống. | **missing** — **TODO mở:** chưa có implementation nội dung và chưa có ground-truth screenshot. Đối chiếu TM §3.4.2.11/MX trước thiết kế, không tự lấp bằng Integrity hay tuyên bố layout mong đợi. |

### 4.3 Transmitter và diagnostics

| Ảnh / màn hình | Ground truth | PMDT hiện có / citation code | Verdict / gap cụ thể |
| --- | --- | --- | --- |
| S113248 — Transmitter Data, Fig. 3-32 | Tab TX1/TX2; timestamp nhóm dữ liệu; Carrier/SB1–4 Watts, VSWR :1; 30 Hz AM/FM/Sideband Frequency Hz, Carrier/Tx Lower/Upper Sideband MHz. | PS `Dvor1150TxDataScreen`: hai TX, đủ Power/VSWR/Frequency và Hz/MHz, giá trị riêng theo transmitter. | **partial** — chỉ một timestamp chung thay hai ô thời gian trong ảnh; nhãn/giá trị tính theo config có, không gộp thành RF Level. Không coi số carrier 113.1000 MHz mẫu là mặc định bắt buộc. |
| S113252 — TX Offsets and Scale Factors, Fig. 3-33 | Hai cột TX: azimuth °, output/voice/ident/reference scales %, SB1-2/SB3-4/carrier-sideband phase °, bốn SB RF scales %, cabinet temp °C. | PS `Dvor1150TxConfigScreen/offsetFields`: đủ 13 hàng đúng thứ tự, hai cột CC độc lập, đúng đơn vị/timestamp; EN `effectiveTransmitter` nhận offsets. | **match** — không thấy gap trường/thứ tự/đơn vị trong nội dung ảnh; scale/phase hiện tại là DEMO config, không phải bản chép calibration mẫu. Tác động downstream xem §4.4. |
| S113255 — TX Nominal, Fig. 3-34 | Azimuth Index, Output Power, Voice/Ident/Reference Modulation, **SBO RF Level**; °/Watts/% và timestamp. | PS `Dvor1150TxConfigScreen/nominalFields`: đủ sáu hàng, một cột nominal chung mirror sang TX2. | **match** — nhãn là **SBO**, không phải USB như ghi nhận cũ. Không thấy gap nội dung/đơn vị/thứ tự; không tự thêm ô identCode vào mẫu nominal này. |
| S113258 — Transmitter Commands, Fig. 3-35 | Data/Configuration/Commands → Transfer, Transmitter 1/2, VOR Ident, Hold Commutator… (disabled). | ME đủ nhóm/mục và Hold Commutator disabled. | **match** — khớp menu nhìn thấy; không đồng nghĩa mọi command có tác dụng (hai dòng sau). **TODO:** không có ảnh dialog Hold Commutator, không suy nội dung hay quy tắc enable. |
| S113302 — Antenna Control, Fig. 3-36 | Transmitter 1 submenu Antenna/Load/Off; status hint “Turn on Transmitter 1 to Antenna”. | ME `transmitterCommands` có ba mục cho từng TX; ST `setTransmitterMode` cập nhật RF route/Off và log. | **partial** — Antenna dispatch `main`, gộp chọn logical Main và route; statusbar chỉ Ready/Alert, thiếu hover hint. Các route cells đã có; kiểm contract Main/Antenna ở §4.4, không yêu cầu mọi ô cùng đổi. |
| S113305 — Ident Control, Fig. 3-37 | VOR Ident → Normal/Off/Continuous và status hint. | ME `transmitterIdent` đủ ba mục; ST `executeCommand` nhận `ident-*`. | **partial** — chỉ đổi `lastCommand`, không sửa identControl/data/status và không cập nhật checkmark/hint. Không tự coi ident alarm là điều kiện transfer (MX). |
| S113309 — Power Up Results, Fig. 3-38 | Năm cột RMS/MON1/2/Audio Gen1/2, bốn hàng CPU/RAM/PROM/EEPROM, từng kết quả green. | PS `Dvor1150DiagnosticsScreen` đủ ma trận 4 × 5, nhưng mọi ô lấy cùng `diagnosticState.completed`. | **partial** — mặc định tất cả gray; hoàn tất fault isolation thì tất cả green, không có kết quả boot riêng từng module/test. Thêm note huấn luyện ngoài ảnh; không suy mọi test pass từ một cờ completed. |
| S113312 — Fault Isolation, Fig. 3-39 | Chín subsystem Logon/RMM…Control; Monitor + Cert Enabled; Progress/Results, vùng kết quả; Run Off Air Diagnostics/Cancel/Run On Air Diagnostics. | PS `Dvor1150DiagnosticsScreen`, ST `runDiagnostics/cancelDiagnostics`: đủ chín hàng, %/kết quả/gating security/local và cảnh báo NOTAM khi full. | **partial** — thiếu Cert Enabled; nút ghi **Run Full Diagnostics** thay **Run Off Air Diagnostics**; trạng thái %/text thay thanh progress mẫu. ST hoàn tất tức thì 100%, không đặt running=true nên Cancel không có giai đoạn chạy để hủy. Chưa chứng thực trình tự/chất lượng tín hiệu trên máy thật. |

### 4.4 Hợp đồng hành vi không thể xác nhận chỉ bằng ảnh

| Nguồn / ảnh liên quan | Contract | PMDT hiện có / citation code | Verdict / gap cụ thể |
| --- | --- | --- | --- |
| MX Apply and persistence; S113123/S113142 toolbar; TM PDF 201 §3.4.2.7 | SEC3/SEC4 → Local → draft → Apply F7 → Need Backup → Backup; Reset bỏ draft; Restore backup và giữ Local/Bypass/connection. | ST `applyConfigChanges/backupConfig/restoreConfig/resetConfigDraft` có draft, validation, log, backup; CC gate SEC3+Local; `Dvor1150PmdtLayout` có persistence boundary. | **partial** — [Toolbar](../../src/components/dvor1150/pmdt-toolbar.tsx) Reset gọi **restoreConfig**; cả restore/reset gọi **initialConfigurationForSession**, hàm clone **defaultDvor1150Config**, bỏ backup và chỉ giữ connected/timestamp, không Local/Bypass. Keyboard F8 dùng reset khác đường toolbar nhưng cùng lệch MX. Không khẳng định ảnh tĩnh chứng minh persistence; **TODO** dialog backup/restore chưa có ảnh. |
| MX Configuration and derived values; S113200/204/248/252/255 | Config phải tính lại live/monitor/AD/temperature/test; test calibration tách live, RMS maintenance không tự RF transfer. | EN `buildDvor1150Snapshot/effectiveTransmitter/monitorResult/buildGroundCheck/buildMonitorTestResults`; ST apply gọi recompute/automatic-transfer; có tests engine/influence-matrix. | **partial** — graph ảnh hưởng có thật, chưa audit toán học toàn bộ; −12 V và shared test setup lệch ở §4.1/4.2; certification lấy live value cho cả low/high, Run không tạo phép thử. Không coi test có sẵn là đã chạy hay số đo DEMO là đo vật lý. |
| MX Transfer/sidebar; S113057/212/244/302 | Manual ≠ monitor-alarm; Main logic ≠ Antenna; hai path alarm → shutdown Off; bypass giữ alarm nhưng chặn auto-transfer. | ST `setTransmitterMode/applyAutomaticDvor1150Transfer/setMonitorBypass` có cause/phase, Main riêng, transfer rồi shutdown, log; SI đọc route cells độc lập. | **partial** — state machine không thiếu; SI không render riêng transfer cause/phase/message như MX yêu cầu, StatusBar vẫn Ready/Alert. Timing/automatic restart chưa được browser pass kiểm; **TODO mở**, không suy delay/điều kiện từ checkbox. |

### 4.5 Browser pass và TODO thiếu bằng chứng

Browser tại `/simulator/dvor-1150`, server `:3100` với `MEDIA_CAPTURE_MODE=1`,
Chrome CDP `:29229`, desktop **1440 × 900**, phiên DEMO SEC4; mở qua menu/tab,
không đổi source hoặc inject store. Đã render login, workspace, RMS Status,
mọi tab RMS Data/Logs/Config (kể cả DIP/Security), Monitor Data/Config/History
(kể cả Advanced/Standby), TX Data cả hai TX/Config, hai Diagnostics và các
submenu RMS/DME/Monitor/TX/Antenna/Ident/Info. Màn chính không bị overlap
mới thấy được trong pass này; khác bố cục/khung và graph được ghi từng dòng.
Ảnh runtime ở `/home/ubuntu/shots26/pmdt-*.png`, **không commit**, không thay
ground truth S. Pass là kiểm hình/render/navigation, **không** phải kiểm
chức năng toàn bộ command, SEC3/SEC4 state matrix hay persistence/transfer.

Các nội dung thiếu ảnh dưới đây giữ TODO; **không phát sinh dòng mới ngoài
40 dòng gốc** (Standby đã được tính ở §4.2):
- **Standby:** dòng missing ở §4.2; chỉ nhãn được chứng minh.
- **System/Info, RMS Status:** ME System có Logon RMS/Logoff/Simulation
  Parameters, Info rỗng; PS `Dvor1150RmsStatusScreen` đang dùng maintenance
  indicators. Không có ảnh tương ứng để tuyên bố khớp/sai nội dung.
- **Connect, Change Password, Config Restore/Backup, Hold Commutator:**
  ME password/Hold disabled, ST restore/backup chạy trực tiếp; không có ảnh
  dialog. TODO đối chiếu TM §3.4/MX và xin bằng chứng, không sáng tác fields.
- **SEC3/SEC4, notch Executive Alarm, automatic restart, transfer timing:**
  các ảnh đơn không xác lập đủ state/điều kiện. DEMO 6 giữ phần chưa rõ mở;
  không suy rule máy thật từ checkbox hay disabled control.

## 5. Test, tài liệu liên quan và giới hạn kiểm chứng

Đã rà tham chiếu `dvor-1150` (tách khỏi `dvor-1150a`):
`tests/layout/module-routing.test.tsx` kiểm route thiết bị;
`tests/layout/concise-showcase.test.tsx` kiểm liên kết mở simulator;
`tests/scenario-exams/hardware-presentation.test.ts` có kiểm identity 1A3 và
evidence/reference criteria. Không phải test vị trí đèn, điểm đo hoặc fidelity
với S/TM. `tests/vor/dvor1150-{engine,influence-matrix,scenario-workflow,scenario-policy}.test.ts`
và `generate-dvor1150-scenario-fixtures.test.ts` thuộc PMDT DVOR 1150 hiện
có, không phải một stub hay dòng thiết bị khác. Store ở
`src/stores/dvor1150-pmdt-store.ts`; test tại `tests/state/vor-pmdt-store.test.ts`.
Stage 1 chưa tái audit thuật toán/luồng phần mềm với ảnh; PR #30 đã đọc
code liên quan cho §4 và kiểm hình runtime, không audit toán học toàn bộ
hoặc chạy lại tests trong đợt docs-only. Test focused của thay đổi sơ đồ
Stage 1 được ghi riêng dưới đây.

Tìm trong `docs/` không thấy tài liệu baseline riêng cho DVOR 1150 thường;
không dùng tài liệu DVOR 1150A thay nguồn. Audit DVOR 220 chỉ dùng làm mẫu
cấu trúc. Các assertion về repo ở mục này dựa trên mã/test tại SHA đầu bài,
không phải thông tin thiết bị cần suy từ manual.

Đợt audit baseline không chạy Vitest/build/lint vì chỉ thêm tài liệu; đặc biệt
không chạy suite sinh lại fixture. Stage 1 thêm test dữ liệu/diagram tại
`tests/vor/dvor1150-block-diagram-data.test.ts` và
`tests/vor/dvor1150-system-diagram.test.tsx`: occurrence TX2, mapping/GND,
nghi errata, bảy citation, tám nhánh mẫu, callback chọn bằng chuột/bàn phím,
trạng thái chưa chọn và input occurrence không hợp lệ. Kiểm tra Stage 1:
hai file mới, test scenario-workflow/hardware-presentation liên quan,
`npm run lint` và `npm run typecheck`; không chạy full suite/sinh fixture.
CodeGraph không có executable trong PATH hoặc
`node_modules/.bin`; kiểm tra môi trường một lần rồi đọc source trực tiếp,
không tạo index/artifact vào repo. PDF đã mở bằng PyMuPDF, trích text đủ
332 trang và render các hình/bảng cần đối chiếu; tất cả 38 PNG mở thành công.
Phần cứng ở baseline đầu bài chưa xác minh runtime trong audit gốc;
cập nhật Stage 1 chỉ sửa các hàng được ghi rõ. Riêng PMDT đã có browser
pass §4.5 trong PR #30, không mở rộng thành kiểm phần cứng hoặc xác nhận
máy thật. PR #30 không sửa simulator.

## 6. TODO mở — đồng nghiệp khảo sát trạm thật

**DEMO ASSUMPTION — cấu hình PMDT:** Dual Transmitters luôn dùng Hot
Standby, Single Transmitter không có Standby. Cột RMS trên tab Station là
cấu hình đã sao lưu; giá trị khác bản nháp được tô đỏ (TM §3.4.2.7.2).
Giới hạn A/D −12 V đối dấu từ giá trị DEMO cũ, giữ bề rộng dải; các mức
này không phải thông số nghiệm thu trạm. Backup ngoại tuyến chỉ tồn tại
trong phiên; mật khẩu huấn luyện không tham gia lưu/khôi phục cấu hình.

**DEMO ASSUMPTION — vận hành PMDT:** TM PDF 154 xác định vote trên
*alarm* (AND = hai monitor, OR = một); Bảng 3-4 tách Startup Delay và
Shutdown Delay. Sau mỗi lần lên antenna, mô phỏng áp dụng Startup Delay;
sau Bypass cần đủ Shutdown Delay mới tác động. Fault History lưu tối đa
ba sự kiện trong phiên (hình 3-30/31), chụp lỗi trước khi đổi đường. Lần
khởi động lại điều chỉnh được chạy một lần trên Main sau shutdown; giữ
TODO cho điều kiện lần cố định 5 phút. Standby chỉ báo Load/On/Off của bộ
phát còn lại, không giả số đo; Hold Commutator giữ không khả dụng.

Các mục sau **chưa được xác minh ngoài hiện trường**; giả định DEMO phía
trên chỉ giúp xây demo, không thay câu trả lời của đồng nghiệp vận hành.

- [ ] **Baseline đời máy/P/N nào?** TM PDF 54 §2.3.1 và §2.3.2.3/8 phân biệt
   CSB amplifier, RF monitor/dummy load đời cũ/mới. Xin P/N/ảnh máy đích;
   không ghép mọi biến thể thành một cấu hình mặc định.
- [ ] **MON và detector ngoài?** TM §1.2.2.1 loại detector ngoài với MON
   012255-1001; Fig. 1-4/S112809 liệt kê cả 012617-1003/012255-1001.
   Máy đích dùng loại nào, interface lắp trái hay phải? Hộp CURRENT VERSION
   trong simulator chưa được nguồn ảnh xác nhận.
- [ ] **Status panel thực tế?** TM Table 3-6 và S112809 không chứng minh
   hai cụm SYSTEM A/B mỗi cụm có Bypass. Xin ảnh thẳng mặt đọc rõ switch,
   đèn và nhãn để chốt bố cục/biến thể, không suy từ mặt vẽ hiện tại.
- [ ] **Phiên bản sơ đồ của trạm?** Caption Rev. F October 2002 cũ trong
   SVG đã chuẩn hóa theo TM PDF 54 Rev. K January 2008 ở Stage 1. Xin
   xác nhận revision/P/N áp dụng ngoài hiện trường, không dùng caption demo
   làm bằng chứng máy thật cùng đời.
- [ ] **Build/cấu hình phần mềm trạm thật?** 38 ảnh dùng làm mẫu manual
   theo lựa chọn DEMO, chưa thay capture phần mềm trạm. S113123/130/146 và
   S113057 có title trạm/customer service, ngày nội dung 2006/2007 và caption
   figure. Xin version/build PMDT cùng cấu hình single/dual, cold/hot standby;
   giữ 38 ảnh làm ground truth giao diện được cung cấp, không coi ngày tên
   tệp là ngày firmware. TM §3.4 và MX chưa xác lập build đích.
- [ ] **Quy tắc chưa đủ ảnh?** Xin nội dung tab Standby, menu System/Info,
   Hold Commutator, hộp thoại connect/password/restore/backup và trạng thái
   quyền SEC3/SEC4 (S113212/258/151/146). Chốt hành vi notch Executive Alarm,
   automatic restart và thời gian transfer theo tài liệu áp dụng; MX còn để
   điều kiện manual cho notch, không tự suy từ checkbox S113224.
- [ ] **Nhãn/mapping tài liệu không nhất quán?** TM PDF 230 Table 3-9 ghi
   SB1/2 là 1A4/1A21 và SB3/4 là 1A5/1A22, khác Table 3-10 PDF 231 và
   Fig. 1-4 (A4 là SYN, A5/A6 là SB). Xác nhận errata; giữ GND trên
   Fig. 3-40 dù Table 3-9 gọi TP6. Xin Fig. 11-29/ảnh jack và các bản vẽ
   phần 11 còn thiếu trước khi chốt pinout/đường dây.
- [ ] **Waveform áp dụng máy thật?** Stage 1 đã sửa offset citation về
   PDF 257–260/264/271, nhưng xin xác nhận bộ manual/P/N trạm. Đặc biệt
   Fig. 7-30 PDF 271 ghi MON 012617-1003: cần nguồn cho waveform tương ứng
   MON 012255-1001 trước khi coi ảnh đó là chuẩn đo cho demo/trạm thật.
