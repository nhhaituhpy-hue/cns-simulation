# DVOR 1150A — đối chiếu simulator với tài liệu

Phạm vi đã viết: **§1 sơ đồ khối, §2 tủ/mặt module, §3 điều chỉnh/hiệu chỉnh,
§4 PMDT và §5 khai thác/bảo dưỡng**, gồm native PMDT, LCU và phần cứng
trong `src/modules/devices/dvor-1150a`. Baseline mã nguồn là `main`
[`db77de365a0ebba2413bc03c389507067c26ea5a`](https://github.com/nhhaituhpy-hue/cns-simulation/commit/db77de365a0ebba2413bc03c389507067c26ea5a).
Chỉ kiểm toán tài liệu, chưa sửa simulator. §6 tổng hợp gap/lộ trình đề xuất;
§7 là câu hỏi khảo sát còn mở, không phải giả định cấu hình đã được chấp nhận.

**Thứ tự ưu tiên:** phần cứng lấy TM làm nền. Khi HDCV mâu thuẫn TM về
quy trình khai thác, bảo dưỡng hoặc hiệu chỉnh, **HDCV tương ứng được ưu tiên**;
ghi rõ cả hai nguồn thay vì âm thầm trộn quy trình. Mâu thuẫn nội bộ TM và
biến thể tại trạm chưa được bốn tài liệu giải quyết phải giữ **Chưa xác minh**.
Hoàng vận hành DVOR 1150A thật; các yêu cầu khảo sát dưới đây không phải
giả định DEMO và không tự chọn thay cấu hình trạm.

Đây không phải hướng dẫn thao tác/bảo trì thiết bị thật. Không thực hiện
chuyển máy, đo có tiếp xúc, tháo card hoặc phát bài thử chỉ để trả lời audit.

## Nguồn và quy ước

| Ký hiệu | Tài liệu | Dùng để đối chiếu |
| --- | --- | --- |
| TM | `tailieu_dvor1150A_selex.pdf` — Operations and Maintenance Manual, Model 1150A, **571150A-0002 Rev. E, March 2012** | 248 trang PDF; bìa PDF 1 ghi Rev. E và copyright 2014. Nền phần cứng, mô tả chức năng, hình tủ, điểm đo và PMDT. |
| KT | `04-HDCV-khai-thac-DVOR1150A.pdf` — **HD-KTVA, lần BH 08, ngày HL 20/07/2026** | 44 trang PDF; định danh tại PDF 2 / trang in 1. Ưu tiên về khai thác, cách dùng màn hình, giá trị bình thường/ngưỡng; đối chiếu ở §4–5. |
| BD | `03-HDCV-bao-duong-DVOR1150A.pdf` — **HD-BDDVA, lần BH 10, ngày HL 15/06/2025** | 45 trang PDF; định danh tại PDF 2 / trang in 1. Ưu tiên về bảo dưỡng; đối chiếu ở §5. |
| HC | `06-HDCV-thay-the-hieu-chinh-DVOR1150A.pdf` — **HD-TTDVA, lần BH 05, ngày HL 15/06/2025** | 48 trang PDF; định danh tại PDF 2 / trang in 1. Ưu tiên về thay thế/hiệu chỉnh; §3 đối chiếu đủ các mục IV.1–16; thủ tục khai thác/bảo dưỡng rộng hơn để §5. |

Bốn PDF là bộ chủ sở hữu cung cấp, không phải tài liệu tra trên web.
Text có dấu trang `=== p.N ===` và mục lục tại
`/home/ubuntu/out/dvor1150a-src/`, `/home/ubuntu/out/dvor1150a-sources-toc.md`.
`PDF 190` là vị trí đếm từ bìa; `3-72` là trang in; không dùng chung một
offset cho cả TM. TM có đủ các đích trang chương của mục lục đã trích,
không suy thiếu chương chỉ vì tổng số 248 trang. BD PDF 45 và HC PDF 48
không có lớp chữ; OCR `eng+vie` không thu được chữ, dường như trang cuối trống.
Hình trên trang có lớp chữ vẫn cần mở ảnh, không suy bố trí từ text.

Đã render bằng `pdftoppm` và mở ảnh TM PDF **24–25, 48–49, 180–191,
193–195**: Figs. 1-3/4, 2-2/3, 3-56–73 (trừ trang bảng 3-14 ở PDF 192
đọc text). Bản render lưu ngoài Git ở `/home/ubuntu/out/dvor1150a-figures/tm-pN.png`.
Đã mở cả bốn asset cabinet/diagram thực sự được renderer dùng. Nhận xét SVG
dựa trên hình TM và tọa độ/nhãn/props source; **chưa render giao diện browser**,
chưa đo kích thước cơ khí hay kiểm chứng thao tác chạy thực tế.

Trạng thái: **Khớp** = khớp đúng nội dung/phạm vi dẫn, không chứng nhận toàn
thiết bị; **Một phần** = đã có nhưng giản lược/thiếu một phần; **Sai khác** =
mâu thuẫn cụ thể với nguồn; **Thiếu** = không có trong bề mặt đã kiểm tra;
**Chưa xác minh** = nguồn hoặc bằng chứng chưa đủ kết luận. Mỗi dòng có một
verdict chính; không gộp kết luận của ảnh tĩnh với hành vi động. Không tự gán
chức năng cho lỗ/vít/đầu nối không được chú thích; màu tô trên SVG không chứng
minh trạng thái bình thường của máy thật.

Các alias code dưới đây là file thật, không phải trạng thái manifest:

| Alias | File / symbol chính |
| --- | --- |
| BDAT | [`block-diagram-data.ts`](../../src/modules/devices/dvor-1150a/block-diagram-data.ts): `DVOR_BLOCKS`, `resolveDvorHardwareOccurrence` |
| VIEW | [`dvor-block-diagram.tsx`](../../src/modules/devices/dvor-1150a/dvor-block-diagram.tsx): `DvorReferenceDiagrams`, `referenceDiagrams`, `cabinetImages`, `ModulePanel`, `LcuPanel`, `DvorBlockDiagram`, `DvorHardwareSelector` |
| FACE | [`dvor-module-faceplates.tsx`](../../src/modules/devices/dvor-1150a/dvor-module-faceplates.tsx): tám faceplate, `DvorModuleFaceplate`, `rebuiltModuleIds`, `IndicatorLamp`, `PartNumber` |
| CSS | [`dvor-block-diagram.module.css`](../../src/modules/devices/dvor-1150a/dvor-block-diagram.module.css) và [`dvor-module-faceplates.module.css`](../../src/modules/devices/dvor-1150a/dvor-module-faceplates.module.css) |

Reachability đã đọc: route [`/simulator/dvor-1150a/block-diagram`](../../src/app/simulator/dvor-1150a/block-diagram/page.tsx)
render `DvorBlockDiagram`; chọn hotspot → `DetailPanel` → `LcuPanel` hoặc
`ModulePanel` → faceplate SVG nếu thuộc `rebuiltModuleIds`. `DvorHardwareSelector`
dùng lại lớp cabinet/diagram cho bài chẩn đoán. PMDT **đang có** ở
[`/simulator/dvor-1150a`](../../src/app/simulator/dvor-1150a/page.tsx) →
`Dvor1150aPmdtLayout` → [`PmdtLayout`](../../src/components/vor/pmdt-layout.tsx) →
[`useVorPmdtStore`](../../src/stores/vor-pmdt-store.ts); không kết luận thiếu
PMDT từ listing operations. Đối chiếu chi tiết phần mềm để §4.

## 1. Sơ đồ khối

### 1.1. Từng block ID, assembly và chức năng

VIEW dùng **ảnh raster Fig. 2-2/3 với hotspot**, không phải engine vẽ lại đường
RF. Đã nhìn thấy đường trong asset thì không gọi là thiếu chỉ vì không có
object cạnh trong TypeScript. Ngược lại, có hình trên raster không đồng nghĩa
có occurrence chọn riêng, điểm đo hoạt động hoặc mô phỏng tín hiệu.
`1A…` là reference designator; mã `030…/012…` dưới đây là mã assembly ghi trong
Fig. 1-3/4, không phải chuỗi số hình `571150A-0002-…`.

| Block ID / assembly theo nguồn | Simulator / citation code | Trạng thái | Khoảng trống / nguồn |
| --- | --- | --- | --- |
| `lcu` — 1A1, 030801 | BDAT `lcu` có 1A1; VIEW overlay LCU → `lcu-1a1`, mô tả chọn TX/tuyến và giám sát. | Một phần | Nhận diện/chức năng chính có; catalog không ghi 030801, panel tách state khỏi PMDT (§2.4). TM PDF 24 / 1-4 Fig. 1-3; PDF 48 / 2-4 Fig. 2-2; PDF 50 / 2-6 §2.3.1.1 và đoạn LCU trước đó. |
| `synthesizer` — 1A3A1/1A3A11, 030838 | BDAT đúng cặp designator, hai overlay SYNTH và hotspot tủ; mô tả RF carrier/pha. | Một phần | Không liệt kê 030838 và hai ngõ RF upper/lower sideband trong mô tả khối; đường CW có thật trên raster, không phải thiếu sơ đồ. TM PDF 23 / 1-3 §1.2.1.2; PDF 24 / 1-4 Fig. 1-3; PDF 49 / 2-5 Fig. 2-3. |
| `audio-generator` — 1A3A2/1A3A9, 012254 | BDAT đúng cặp; VIEW hai AUDIO GENERATOR. | Một phần | Mô tả có carrier/voice/ident/30 Hz nhưng bỏ vai trò điều khiển công suất/pha và commutator; không ghi 012254. Raster vẫn có modulation, RS422 và serial-to-RMS. TM PDF 23 / 1-3 §1.2.1.3; PDF 24 / 1-4 Fig. 1-3; PDF 48–51 / 2-4–7 §2.3.1–2.3.2, Fig. 2-3. |
| `carrier-amplifier` — 1A5A3/1A5A4, 030825 | BDAT đúng hai assembly/overlay; mô tả CSB sample/detected. | Một phần | Không ghi mã 030825, công suất 100 W trở lên hoặc feedback sửa pha về SYN trong mô tả; feedback có trên raster. TM PDF 24 / 1-4 Fig. 1-3; PDF 28 / 1-8 §1.2.1.13; PDF 49 / 2-5 Fig. 2-3; PDF 51 / 2-7 §2.3.2. |
| `sideband` — bốn assembly, hai kênh/assembly | BDAT dùng 1A4A1/A2/A6/A7; VIEW có đủ bốn overlay, `sidebandChannels` tách SB1/2 và SB3/4 mỗi TX. | Chưa xác minh | Mapping khớp Fig. 1-3 và §1.2.1.9, nhưng TM §3.8.9/Table 3-14 lại in A1/A2/A5/A6, trong khi A5 là commutator ở Fig. 1-3. Không sửa theo một dòng hay tuyên bố hãng xác nhận errata; cần Q1. TM PDF 24 / 1-4 Fig. 1-3; PDF 27 / 1-7 §1.2.1.9; PDF 49 / 2-5 Fig. 2-3; PDF 191–192 / 3-73–74 §3.8.9, Table 3-14. |
| `rf-monitor` — 1A4A4, 030829 | BDAT có 1A4A4; VIEW đúng RF MONITOR trên raster và cabinet. | Một phần | Mô tả nêu đo carrier/standby nhưng chưa nói đủ một tải giả carrier công suất lớn + bốn tải giả SB, không ghi 030829. Không kết luận mất đường mẫu: Fig. 2-3 asset có chúng. TM PDF 24 / 1-4 Fig. 1-3; PDF 27 / 1-7 §1.2.1.10; PDF 48–49 / 2-4–5 Figs. 2-2/3. |
| `rms` — 1A3A6, 012172 | BDAT đúng designator; VIEW overlay RMS, PMDT/LCU/interface trên raster. | Một phần | Catalog không ghi 012172; mô tả serial/USB chưa bao quát command/control và kết nối ngoài. Không gọi PMDT là thiếu. TM PDF 24 / 1-4 Fig. 1-3; PDF 27 / 1-7 §1.2.1.7; PDF 48 / 2-4 Fig. 2-2. |
| `bcps` — 1A5A1/1A5A2, 030798 | BDAT đúng designator theo hình tủ, hai overlay cấp LVPS. | Chưa xác minh | TM Fig. 1-3/§1.2.1.12 ghi A1/A2, nhưng tiêu đề §3.8.3 ghi A3/A4 trùng carrier. Code chọn A1/A2 hợp hình tủ; chưa xác nhận biến thể/errata tại trạm (Q1). TM PDF 24 / 1-4 Fig. 1-3; PDF 28 / 1-8 §1.2.1.12; PDF 185 / 3-67 §3.8.3. |
| `commutator-controller` — 1A4A5, 012257 | BDAT đúng vị trí/cụm theo Fig. 1-3; VIEW overlay tới card giữa rack. | Một phần | RS422 là đường control trên Fig. 2-3, không chứng minh một điểm đo mặt trước tên `RS-422`; catalog lại xếp nó vào testPoints và thêm `CONTROL ACTIVE` không có căn cứ LED trong các đoạn dẫn. Mã 012257 chưa có; không tự vẽ connector/pin (Q2). TM PDF 24 / 1-4 Fig. 1-3; PDF 27–28 / 1-7–8 §1.2.1.11; PDF 49 / 2-5 Fig. 2-3. |
| `rf-switch` — mạng chọn carrier và bốn SB | BDAT không gán assembly ID giả; VIEW raster đủ năm RF SWITCH, một overlay chung phủ dọc. | Một phần | Chọn được mạng chung, không chọn từng relay/tuyến; không có cabinet hotspot dù §2.3.1.1 chỉ rõ năm relay gắn sau RF Monitor ở rack giữa. Chưa chốt P/N/nhãn từng relay (Q2), không phải thiếu năm switch trên ảnh. TM PDF 49 / 2-5 Fig. 2-3; PDF 50–51 / 2-6–7 §2.3.1.1–2.3.2. |
| `antenna-bank` — BANK1–4; Commutator CCA 1A10/1A11 | BDAT có BANK1–4, VIEW overlay chung trên bốn bank ở raster, mô tả 48 cáp. | Một phần | Chưa nối định danh bank chức năng với hai CCA 1A10/1A11, không có hotspot tủ/hông hay chọn riêng bank. Không suy bốn bank là bốn card. TM PDF 26 / 1-6 Figs. 1-5/6; PDF 28 / 1-8 §1.2.1.16; PDF 49 / 2-5 Fig. 2-3. |
| `monitor-cca` — 1A3A3/1A3A10, 012245 | BDAT đúng hai designator; VIEW hai monitor, field-input và alarm-to-LCU trên raster. | Một phần | Chưa ghi 012245; catalog chỉ liệt kê integral alarms + CPU, bỏ ba standby LED vật lý (dù không dùng) mà FACE có vẽ. TM PDF 24 / 1-4 Fig. 1-3; PDF 27 / 1-7 §1.2.1.4; PDF 48 / 2-4 Fig. 2-2; PDF 187 / 3-69 Fig. 3-66/Table 3-10. |
| `interface-cca` — 1A9, 012167 | BDAT đúng 1A9, rear hotspot; VIEW raster nối RMS tới RCSU/DME/TACAN. | Một phần | Định vị chính có; chưa ghi 012167 hoặc các I/O analog/digital/sensor/TVS trong mô tả. Không tự gán jack từ hình sau tủ. TM PDF 25 / 1-5 Fig. 1-4; PDF 28 / 1-8 §1.2.1.14; PDF 48 / 2-4 Fig. 2-2. |
| `lvps` — 1A3A4/1A3A8, 012222 | BDAT có đúng hai designator và rail +28/+12/−12/+5; VIEW hai LV PS trên Fig. 2-2. | Khớp | Khớp identity/rail ở phạm vi này, không chứng nhận điện áp mô phỏng; chưa có mã assembly 012222 trong catalog, mặt riêng xem §2.3. TM PDF 24 / 1-4 Fig. 1-3; PDF 27 / 1-7 §1.2.1.5; PDF 48 / 2-4 Fig. 2-2; PDF 194 / 3-76 §3.8.11. |

### 1.2. Đường tín hiệu và ranh giới tương tác

| Đường / nhóm | Simulator / citation code | Trạng thái | Khoảng trống / nguồn |
| --- | --- | --- | --- |
| Field antenna → splitter → hai MON; data/settings → RMS; alarm → LCU | VIEW `referenceDiagrams["control-monitoring"]` dùng `figure-2-2-control-monitoring.png`, giữ đủ nhánh và mũi tên. | Khớp | Chỉ kết luận ảnh sơ đồ khớp; −50…+10 dBm là nhãn hình, không phải số đo live. TM PDF 48 / 2-4 Fig. 2-2; PDF 50–51 / 2-6–7 §2.3.1.1–2.3.2. |
| PMDT ↔ RMS ↔ LCU; Restart, Synth Disable, Audio Modulation Disable | Cùng asset của VIEW có đủ các đường; hai disable ra ngoài LCU vẫn nhìn thấy. | Khớp | Không suy ảnh này chứng minh local panel thực thi shutdown; `LcuPanel` độc lập (§2.4). TM PDF 48 / 2-4 Fig. 2-2; PDF 50 / 2-6 mô tả LCU. |
| RMS → Interface → RCSU/DME/TACAN; BCPS/battery → LVPS | VIEW giữ các node ngoại vi và rail trên raster; chỉ chín overlay chọn được (MON1/2, RMS, LCU, Interface, BCPS1/2, LVPS1/2). | Một phần | RCSU, DME/TACAN, battery, field antenna có ảnh nhưng không có block ID/chi tiết chọn riêng. Không gọi là thiếu khỏi sơ đồ. TM PDF 48 / 2-4 Fig. 2-2; PDF 27–28 / 1-7–8 §1.2.1.7/12/14. |
| SYN → carrier; CW/modulation → SB1–4 từng TX; carrier sample feedback → SYN | VIEW `referenceDiagrams.transmitter` dùng `figure-2-3-transmitter.png`; giữ hai nửa TX, nhánh feedback, coupler 30 dB và tuyến carrier antenna. | Khớp | So sánh asset với hình TM, không coi các đường là graph chạy số. TM PDF 49 / 2-5 Fig. 2-3; PDF 51 / 2-7 §2.3.2. |
| Bốn switch SB → bank/cáp; đường đậm về RF Monitor/tải; serial RMS và RS422 | VIEW raster giữ đủ bốn nhánh SB, năm RF switch kể cả carrier, đường mẫu và serial/control; 14 overlay TX. | Một phần | RF switches và BANK1–4 bị gom occurrence; không chọn riêng coupler, carrier antenna hay đường mẫu. BDAT `rf-switch`, `antenna-bank` không có cabinet target. TM PDF 49 / 2-5 Fig. 2-3; PDF 27–28 / 1-7–8 §1.2.1.10/11/16. |
| Các card ngoài 14 block ID | BDAT `DVOR_BLOCKS`, VIEW `referenceDiagrams`, FACE `DvorModuleFaceplate` không có Test Generator/Facilities/Power Control/AC Power Monitor riêng. | Thiếu | Thiếu **đối tượng phần cứng chọn/giải thích riêng**, không phủ nhận hình tủ có card hoặc PMDT có Test Generator. Test Generator 1A3A5, Facilities 1A3A7, Control Panel 1A7, AC Power Monitor 1A6 đều được nguồn định danh. TM PDF 24–25 / 1-4–5 Figs. 1-3/4; PDF 27–28 / 1-7–8 §1.2.1.6/8/15; PDF 180 / 3-62 §3.8.1/Table 3-4; PDF 189/194 / 3-71/76 Figs. 3-68/72. |

### 1.3. Part number không phải số bản vẽ hình minh họa

| Đối tượng / nguồn | Simulator / citation code | Trạng thái | Khoảng trống / nguồn |
| --- | --- | --- | --- |
| Mã assembly và số hình | FACE `PartNumber` in `571150A-0002-046/047/048/049/051/053/055`, SB in `…-052` trên bảng tên tối ở đáy panel; BDAT chỉ có `assemblyIds` kiểu 1A… | Sai khác | Các chuỗi …-046–055 nằm **ngoài biên mặt module**, cạnh caption trong các hình manual; Fig. 1-3 ghi mã assembly khác (030798/030825/012245/012172/030838/030824/012254/030829). Đưa mã hình lên plate như P/N thiết bị dạy sai nhận diện. Không khẳng định mã orderable đầy đủ của trạm nếu chưa đọc nhãn thật (Q1). TM PDF 24 / 1-4 Fig. 1-3; PDF 185–188 / 3-67–70 Figs. 3-64–67; PDF 190–191 / 3-72–73 Figs. 3-69/70; PDF 193/195 / 3-75/77 Figs. 3-71/73. |

## 2. Tủ máy và mặt module

### 2.1. Bố trí tủ

Đã đối chiếu ảnh TM với `cabinetImages` thực sự dùng:
`public/equipment/dvor-1150a/overview/front-cabinet-ai-v2.png` và
`rear-cabinet-ai-v2.png`. Đây là ảnh dựng lại, không phải ảnh trạm được Hoàng
xác nhận. Hotspot theo phần trăm của toàn ảnh; `horizontalScale: 542/486` chỉ
chuẩn hóa lớp ảnh sau, không chứng minh kích thước vật lý.

| Vùng / nguồn chuẩn | Simulator / citation code | Trạng thái | Khoảng trống / nguồn |
| --- | --- | --- | --- |
| Mặt trước: LCU trên; control rack → sideband rack → carrier rack → power control dưới | VIEW `cabinetImages.front`, BDAT `cabinetHotspots` giữ thứ tự tầng, LCU ở trên, BCPS trái/carrier phải tầng dưới. | Khớp | Chỉ thứ tự tầng lớn, không xác nhận chi tiết ảnh AI. TM PDF 24 / 1-4 Fig. 1-3; PDF 50 / 2-6 §2.3.1.1. |
| Control rack 1A3: trái SYN/AUDIO/MON/LVPS, giữa TestGen/RMS/Facilities, phải LVPS/AUDIO/MON/SYN theo định danh hình | BDAT có A1/A2/A3/A4/A6/A8/A9/A10/A11; `cabinetHotspots` bỏ A5/A7; ảnh nền có card nhưng không giữ toàn bộ nhãn nguồn. | Một phần | Không chọn Test Generator 1A3A5 hoặc Facilities 1A3A7; học viên không đọc được mã/nhãn callout đầy đủ từ nền dựng lại. TM PDF 24 / 1-4 Fig. 1-3; PDF 27 / 1-7 §1.2.1.6/8. |
| Sideband rack 1A4, RF Monitor/Commutator ở giữa | BDAT bốn SB, RF Monitor 1A4A4, Commutator 1A4A5 có hotspot; VIEW nền giữ cụm giữa và cặp SB hai bên. | Một phần | Vị trí tầng/cụm có; mặt SB trong ảnh nền thành nhiều chấm đều không tái hiện đủ TP/trim của Fig. 3-70. Mapping A5/A6/A7 mâu thuẫn nội bộ TM giữ Q1, không tự đổi card. TM PDF 24 / 1-4 Fig. 1-3; PDF 191 / 3-73 Fig. 3-70. |
| Power Control Panel 1A7, 030813 | VIEW ảnh front dưới cùng vẽ bốn cần breaker, không có control/hotspot hoặc faceplate riêng trong BDAT/FACE. | Sai khác | Table 3-4 yêu cầu sáu chức năng TX1 AC/BATT/DC BUS và TX2 AC/BATT/DC BUS; hình nền không cung cấp đúng sáu nhãn/chức năng cho học viên nhận diện. Không suy bốn nét thành đủ sáu breaker. TM PDF 24 / 1-4 Fig. 1-3; PDF 180 / 3-62 §3.8.1/Table 3-4. |
| Sau tủ: control rack, SB rack, Interface 1A9, carrier rack/AC Power Monitor 1A6 | VIEW rear asset giữ tầng và BDAT `interface-cca` có hotspot phía sau. | Một phần | Chỉ Interface chọn riêng được; thiếu nhận diện/hotspot AC Power Monitor 1A6 và đầu nối theo rack. Không suy pinout từ nét dựng lại. TM PDF 25 / 1-5 Fig. 1-4; PDF 28 / 1-8 §1.2.1.14/15. |
| Hai hông: Commutator 1A10/1A11 | VIEW `CabinetFace` chỉ front/rear, BDAT `antenna-bank` không cabinet hotspot. | Thiếu | Không có góc trái/phải hay liên kết bank → hai CCA để nhận diện vị trí lắp. Figs. 1-5/6 được đọc caption, chưa dùng để đo hình học hông; kết luận thiếu view dựa vào enum/render branch, không phải đo kích thước. TM PDF 26 / 1-6 Figs. 1-5/6; PDF 28 / 1-8 §1.2.1.16. |

### 2.2. Tám mặt module SVG đang render

Đọc hình từ trên xuống; tỷ lệ đề cập dưới đây là tương đối theo chiều cao mặt,
không phải kích thước chế tạo. Không coi lớp gradient/kim loại là thông số hãng.
Các SVG dùng `IndicatorLamp` với màu truyền cố định; `PushButton`, `TestPoint`,
`TrimPot` thông thường là SVG trang trí. Riêng SB có trigger/dialog thật; mô hình
hiệu chỉnh của nó để §3. Các mặt module TM này không có đồng hồ kim/FND tích
hợp: wattmeter/PMDT-style meter của dialog SB là dụng cụ phụ trợ, không phải
chi tiết trên Fig. 3-70.

| Module / nguồn chuẩn đã mở hình | Simulator / citation code | Trạng thái | Khoảng trống / nguồn |
| --- | --- | --- | --- |
| BCPS — cột AC ON/DC ON/AC FAIL/BATTERY FAULT/ON BATTERY/FAST CHARGE/TRICKLE CHARGE ở phần trên; S1 CHARGER RESET và CPU OK gần đáy; warning trên phải | FACE `BcpsFaceplate` đủ tên, S1/CPU, kéo cột LED tới y547/1640; warning trên phải. Dùng `ExtractionHandle` cả hai đầu, `PushButton` không handler. | Một phần | Giữ thứ tự chính nhưng dàn lại tỷ lệ nhãn/cột LED. Code tô AC ON, DC ON, AC FAIL, BATTERY FAULT, ON BATTERY, FAST và TRICKLE cùng sáng. Có đèn xanh cạnh CHARGER STATUS tương ứng dấu tròn không nhãn trên hình; Table 3-8 chỉ định CPU xanh và ý nghĩa trạng thái, không xác nhận bộ màu/chức năng dấu tròn đó. Cần phân biệt hình học và trạng thái (Q3); Charger Reset chưa thực thi. TM PDF 185 / 3-67 Fig. 3-64/Table 3-8. |
| Carrier amplifier — CSB SAMPLE P1 trên, tay kéo giữa, DETECTED CSB và DC POWER OK dưới | FACE `CarrierAmplifierFaceplate` giữ thứ tự và nhãn `100–300 mW AT 100 W`, LED xanh, hai connector; tay kéo đen ở giữa. | Một phần | Thành phần chính có; SVG đẩy P1 lên khoảng 14% chiều cao, trong hình ở khoảng 20%; khối hình/tay kéo và các vít không cùng tỷ lệ. Sample trong BDAT chỉ ghi 100–300 mW, bỏ điều kiện 100 W; không dùng nó làm số đo ở mọi công suất. LED xanh luôn cố định. TM PDF 186 / 3-68 Fig. 3-65/Table 3-9. |
| MON — sáu LED integral/standby; TEST J3 trên SYNC J2; CPU OK phía dưới | FACE `MonitorFaceplate`, `AlarmGroup` đủ sáu LED, cặp J3/J2 và CPU; integral đỏ/vàng/vàng, standby tắt. | Một phần | Fig. 3-66 đặt nhãn STANDBY phía dưới nhóm LED thứ hai; SVG đặt heading trước nhóm. Nhãn/cổng đúng thứ tự lớn nhưng thân/nhóm alarm bị giãn; integral luôn báo alarm kể cả không có input trạng thái. Table 3-10 nói đỏ/vàng **khi vượt ngưỡng**, không phải default luôn sáng; standby tắt phù hợp bảng. TM PDF 187 / 3-69 Fig. 3-66/Table 3-10. |
| RMS — AUX USB J2, PMDT USB J1, CPU OK, PWR OK theo cột thấp bên trái | FACE `RmsFaceplate` có đúng hai cổng/nhãn và hai LED xanh; bỏ các mũi tên callout ngoài hình. | Một phần | Thứ tự đúng, nhưng thân SVG 440×1640 rộng hơn tỷ lệ mặt hẹp trong Fig. 3-67; cổng/nhóm nhãn và tay trích xuất không cùng tỷ lệ. Hai LED không đọc RMS state. J2 ghi không dùng ở BDAT đúng Table 3-11, không coi là cổng hoạt động. TM PDF 188 / 3-70 Fig. 3-67/Table 3-11. |
| SYN — PHASE ERROR TP1, PHASE OFFSET TP2, SB/CSB PHASE TP3; GND TP0; FREQ SAMPLE J2; PWR OK | FACE `SynthesizerFaceplate` đủ nhãn/TP0–3/J2/LED, cùng thứ tự hình. | Một phần | SVG giãn ngang/thay tỷ lệ mặt và bộ tay kéo; BDAT testPoints bỏ TP0 và J2 dù SVG có. Không gọi hai điểm này thiếu khỏi mặt; thiếu ở danh mục hướng dẫn điểm đo. Không tự gán danh định cho TP3. TM PDF 190 / 3-72 Fig. 3-69/Table 3-13. |
| SB — TP1–5/R1–3; TP6–8; khoảng trống rồi TP9–11/R4–6; GND TP0/DC PWR OK | FACE `SidebandFaceplate`, `sidebandUpperRows/LowerRows` có đủ TP0–11/R1–6, khoảng trống TP8→TP9, cùng các nhãn SB1/SB2 của hình dùng chung. | Một phần | Giữ thứ tự và sáu trim có tương tác, nhưng thêm hai khung nền nhóm/đường phân đoạn không có trong Fig. 3-70; tỷ lệ/nhãn bị dàn lại, đặc biệt TP10 chỉ còn `MEAN/DYN PHS` thay nhãn xuống dòng của hình. LED xanh cố định; phép đo/trim không phải mô hình hãng, để §3. Không đổi nhãn SB1/SB2 thành SB3/SB4 chỉ vì chọn assembly khác mà không xác nhận mặt thật (Q1). TM PDF 191–192 / 3-73–74 Fig. 3-70/Table 3-14. |
| Audio Generator — TP1 CARRIER, TP2 VOICE, TP3 SYNC, TP0 GND; CPU OK gần đáy | FACE `AudioGeneratorFaceplate` đủ thứ tự và nhãn/LED, TP ở cột trái, nhãn bên phải. | Một phần | Nhận diện cơ bản đúng; thân 340×1640 và chung `ExtractionHandle` không tái hiện đúng tỷ lệ/hai đầu hình. BDAT không liệt kê TP0 dù SVG vẽ; CPU OK xanh không phụ thuộc processor state. TM PDF 193 / 3-75 Fig. 3-71/Table 3-15. |
| RF Monitor — R1 CSB FWD ADJ, R2 CSB RFL ADJ, R3 STANDBY ADJ; TP1/2/3/0; DC PWR OK dưới | FACE `RfMonitorFaceplate` đủ trật tự trim/TP/LED; `TrimPot` chỉ nhận góc cố định, không có trigger/handler. | Một phần | Các điểm đúng tên nhưng thân rộng/giãn khoảng cách so với Fig. 3-73, TP0 vẽ nhưng BDAT bỏ; R1–3 không cho thực hiện calibration được Table 3-17 mô tả. Không nhầm với R1–6 SB đang tương tác. TM PDF 195 / 3-77 Fig. 3-73/Table 3-17. |

### 2.3. Mặt chưa có và nội dung không được tự suy

| Mặt / chức năng nguồn | Simulator / citation code | Trạng thái | Khoảng trống / nguồn |
| --- | --- | --- | --- |
| Test Generator 1A3A5 — TP5 VIDEO, TP1 SYNC, TP4 GND; J1 MIC, J2 DET AUDIO; PWR OK | BDAT không có block này; FACE `rebuiltModuleIds`/switch không có case; VIEW không có hotspot/detail riêng. | Thiếu | Thiếu mặt/điểm đo/chọn phần cứng dù TM có Fig. 3-72 và card có trong hình tủ. Đây không phải kết luận thiếu Test Generator trong PMDT. TM PDF 24 / 1-4 Fig. 1-3; PDF 194 / 3-76 §3.8.12, Fig. 3-72/Table 3-16. |
| Facilities 1A3A7 — speaker và PWR OK | Cùng kiểm tra BDAT/FACE/VIEW: không có block/faceplate/hotspot riêng. | Thiếu | Thiếu mặt Fig. 3-68, gồm cụm speaker ở phần trên và LED thấp; không có cơ sở nói speaker đã hoạt động chỉ vì menu Select Audio tồn tại. TM PDF 24 / 1-4 Fig. 1-3; PDF 189 / 3-71 §3.8.7, Fig. 3-68/Table 3-12. |
| LVPS 1A3A4/A8 — chỉ Power OK ở mặt trước | BDAT có hai hotspot + indicator `POWER OK`; FACE không rebuilt và không `faceImage`; VIEW `ModulePanel` dùng fallback chữ. | Một phần | Đã có mô tả LED, chưa có mặt riêng. TM §3.8.11 không cho hình chi tiết hay tọa độ mặt; không tự thêm jack/rail lên mặt hoặc khẳng định vị trí LED chính xác (Q2). TM PDF 24 / 1-4 Fig. 1-3; PDF 194 / 3-76 §3.8.11. |
| LED/điểm đo của Commutator Controller 1A4A5 | BDAT `commutator-controller` thêm `CONTROL ACTIVE` và `RS-422`; FACE không rebuilt, VIEW fallback chữ. | Chưa xác minh | Fig. 1-3 và §1.2.1.11 xác định module và cáp 25 dây/40 pin, Fig. 2-3 ghi RS422 control signals; chưa xác lập LED/điểm đo vật lý tên như code. Cần ảnh mặt và nhãn của Hoàng, không tự suy pinout (Q2). TM PDF 24 / 1-4 Fig. 1-3; PDF 27–28 / 1-7–8 §1.2.1.11; PDF 49 / 2-5 Fig. 2-3. |

### 2.4. LCU: bố cục, màn hình và điều khiển tại chỗ

VIEW `LcuPanel` được mở từ hotspot LCU, không phải cửa sổ PMDT. State của
nó là `useState` trong VIEW; không nhận input/store của PMDT. Các kết luận
hành vi dưới đây là kiểm tra handler/props có thể đi tới từ panel này,
**chưa chạy browser**; chuyển máy PMDT được đối chiếu riêng ở §4.

| Hạng mục / nguồn chuẩn | Simulator / citation code | Trạng thái | Khoảng trống / nguồn |
| --- | --- | --- | --- |
| Layout: LCD trái, TX giữa, MON trên phải, SYSTEM dưới phải | VIEW `LcuPanel` + CSS `.lcuPanel/.lcuControlPanel/.lcuRightPanels` giữ phân vùng; TX có MAIN SELECT/ANTENNA/LOAD/OFF cặp 1/2, MON có integral/standby, SYSTEM đủ tên phím/đèn/volume. | Một phần | MON1/2 trong mỗi nhóm xếp dọc như nguồn, nhưng BYPASS ở dưới cả nhóm thay vì bên phải; volume thành vùng slider/knob lớn dưới các nhóm thay vì núm nhỏ cuối dãy SYSTEM. Tỷ lệ phụ thuộc breakpoint, chưa chứng thực browser. TM PDF 180 / 3-62 Fig. 3-56; PDF 183 / 3-65 Figs. 3-62/63. |
| LCD Integral MON1/MON2; RMS/Facilities Power; VOR Temps; VOR PA Temps | VIEW `lcuScreens` chỉ ba trang cố định: MON1, facilities (4 dòng), VOR Temperatures (4 dòng). | Thiếu | Không có trang MON2 và PA Temps riêng; facilities thiếu TX1/2 Current; VOR Temps bỏ BCPS1/2 và trộn Carrier Amp1 vào trang đó. Giá trị không theo monitor/power live. TM PDF 181–182 / 3-63–64 §3.8.2.1, Figs. 3-57–61. |
| Local gate, MAIN SELECT/ANTENNA/LOAD/OFF và đèn route | VIEW `transmitterButton` disable khi `!local`; MAIN SELECT và ANTENNA đều gọi `selectMain`, đổi Main và ép TX kia OFF; LOAD/OFF chỉ sửa `routes`. | Sai khác | Gating Local có, nhưng gộp chọn Main với đưa Antenna không giữ phân biệt hai chức năng nguồn. OFF làm mất đèn Main do biểu thức `routes[transmitter] !== "OFF"`, trong khi nguồn nói OFF không thay relay. Không cập nhật route/trạng thái trong PMDT store; không phải mô phỏng liên động máy thật. TM PDF 182 / 3-64 Table 3-5; PDF 184 / 3-66 Table 3-6; PDF 50 / 2-6 mô tả LCU. |
| Integral Normal/Primary/Secondary, Bypass; standby không dùng | VIEW `LcuPanel` vẽ đủ vị trí, Bypass integral chỉ bật ở Local, standby bypass disabled; `lampTest` điều khiển alarm, integral normal luôn sáng. | Một phần | Standby tắt lúc thường phù hợp Table 3-7, nhưng alarm/normal integral không lấy trạng thái MON hoặc timeout. Đây là minh họa local, không được dùng làm bằng chứng alarm hay bypass đang có tác động RF. TM PDF 183–184 / 3-65–66 Fig. 3-63/Tables 3-6/7. |
| LAMP TEST, ALARM SILENCE, RESET, system alarm/volume | VIEW `LcuPanel`: Lamp Test chỉ đổi `lampTest`; ALARM SILENCE/RESET không handler; volume `defaultValue=45` không nối audio. `systemIndicators` chỉ sáng khi lampTest, LCU POWER OK luôn true. | Sai khác | Table 3-6 yêu cầu test **mọi** indicator, silence tới alarm mới, Reset LCU/RMS/MON. TX button lamps và Bypass lamp không đọc `lampTest`, nên chưa đủ toàn bộ đèn; hai phím còn lại/volume không thực thi chức năng nguồn. Không suy state ngoài PMDT vì panel không dispatch store. TM PDF 184 / 3-66 Table 3-6; PDF 183 / 3-65 Fig. 3-63. |

### 2.5. Khoảng trống phần cứng cần giữ cho đợt tiếp

- **H1 — nhận diện thiếu cụm:** Test Generator/Facilities/Power Control/AC
  Power Monitor chưa có đối tượng phần cứng riêng; hai hông commutator chưa có
  view. Dẫn chứng và ranh giới đã tách tại §1.2/§2.1/§2.3, không kết luận thiếu
  tính năng phần mềm tương ứng.
- **H2 — nhãn mã hình thành P/N:** tám mặt in mã figure lên bảng tên; thiếu mã
  assembly đúng nguồn trong catalog (§1.3). Cần ảnh nhãn thật trước khi chốt
  P/N/revision của trạm.
- **H3 — panel LCU không phải trạng thái trạm:** LCD thiếu trang/dòng, state
  tách PMDT, MAIN/ANTENNA gộp, RESET/SILENCE/volume chưa có tác dụng (§2.4).
- **H4 — đèn dạy sai ý nghĩa nếu coi là live:** MON integral luôn alarm;
  BCPS tô đồng thời AC ON/AC FAIL và các trạng thái sạc; các LED khác cố định
  không theo nguồn/CPU (§2.2). Hình tĩnh có thể dùng minh họa vị trí nhưng cần
  ghi rõ không phải trạng thái máy bình thường.
- **H5 — mâu thuẫn chính nguồn:** sideband A5/A6/A7 và BCPS A1/A2/A3/A4
  không thống nhất giữa hình tủ và tiêu đề bảng (§1.1). Chưa được tự đóng
  bằng một giả định DEMO; cần Q1. Các chi tiết connector/LED của Commutator
  chưa có nguồn đủ để xác nhận, cần Q2.

## 3. Điều chỉnh sideband và hiệu chỉnh

### 3.1. Phạm vi, đường chạy và giới hạn dụng cụ

**HC quyết định bước, thứ tự, giá trị và dung sai hiệu chỉnh**, không lấy Table
3-14 hay hệ số đào tạo thay HC. Đã đọc toàn HC, kể cả mục **IV.16** không có
trong mục lục. Mục IV.7 và IV.15 đều là Test Generator: đếm **16 mục đánh số,
15 họ thiết bị**, không bịa thêm quy trình cho 1A12 từ mục lục. HC PDF N tương
ứng trang in N−1 trong phần này. Đã render và mở HC PDF 15–17, 24, 38, 42,
45 bằng `pdftoppm`; ảnh ở `/home/ubuntu/out/dvor1150a-figures/hc-pN.png`.
Đặc biệt công thức PDF 24 là **30.0**, không phải `300` của text extraction.
Hình TP2/TP8 có hai dạng Proper/Improper, không phải hai điện áp danh định.

| Alias bổ sung | File / symbol và ranh giới thực thi |
| --- | --- |
| SBM | [`sideband-adjustment-model.ts`](../../src/modules/devices/dvor-1150a/sideband-adjustment-model.ts): `SIDEBAND_TRIMS`, `SIDEBAND_SCALES`, `readSidebandTrim`, `turnSidebandTrim`, `readSidebandTransmitter` |
| SBD | [`sideband-adjustment.tsx`](../../src/modules/devices/dvor-1150a/sideband-adjustment.tsx): `SidebandAdjustmentDialog`; mở từ FACE `SidebandFaceplate` R1–R6 → VIEW `DvorBlockDiagram.sidebandAngles/onTurn`. State chỉ sống trong trang sơ đồ. |
| TXC | [`tx-config-offsets.tsx`](../../src/components/vor/screens/tx-config-offsets.tsx): `TxConfigOffsets`; field theo `offsetKeys` → [`PmdtConfigControl`](../../src/components/vor/pmdt-config-control.tsx) → STORE `setConfigValue`/`applyConfigChanges` → ENGINE. Không nhận `sidebandAngles`. |
| MONC | [`monitor-offsets.tsx`](../../src/components/vor/screens/monitor-offsets.tsx): `MonitorOffsets`, `calibrationFieldByParameter`; ba cột Integral/Standby/Test Generator, cùng cơ chế draft/Apply. |
| ENGINE | [`engine.ts`](../../src/lib/dvor1150a/engine.ts): `effectiveTransmitter`, `buildTxPower`, `sourceMeasurement`, `calibratedMeasurement`, `sidebandModulationValue`, `buildDvorGroundCheck`, `buildDvor1150aSnapshot` |
| STORE / CFG | [`vor-pmdt-store.ts`](../../src/stores/vor-pmdt-store.ts): `applyConfigChanges`, `setTransmitterMode`, `backupConfig`, `toggleScenarioHardware`; [`config-utils.ts`](../../src/lib/dvor1150a/config-utils.ts): `dvorConfigFieldCatalog`; [`config-service.ts`](../../src/lib/dvor1150a/config-service.ts): `applyDvorConfigPatches` |
| READ | [`TxDataLayout`](../../src/components/vor/screens/tx-data-layout.tsx)/[`TxDataMain`](../../src/components/vor/screens/tx-data-main.tsx), [`RmsDataLayout`](../../src/components/vor/screens/rms-data-layout.tsx) → [`RmsPowerSupply`](../../src/components/vor/screens/rms-power-supply.tsx), [`RmsDigitalIo`](../../src/components/vor/screens/rms-digital-io.tsx), [`RmsMaintenanceAlerts`](../../src/components/vor/screens/rms-maintenance-alerts.tsx); [`MonitorTestResults`](../../src/components/vor/screens/monitor-test-results.tsx) → `TestGenerator` |
| SCEN | [`scenario.ts`](../../src/lib/dvor1150a/scenario.ts): các `create…Scenario`, `dvor1150aScenarioPresets`, `evaluateDvor1150aScenario`; STORE ghi selection/checkpoint/action/config evidence. “replace-module” chấm **chọn đúng occurrence**, không thực hiện tháo/lắp vật lý. |

PMDT native có config thật, không phải dialog minh họa của SBD. Sửa TXC/MONC
cần Local, security ≥3, allowlist nếu trong scenario và Apply qua validation.
Nguồn của gating là `PmdtConfigControl.canEdit`, STORE `applyConfigChanges`,
CFG `applyDvorConfigPatches`, không suy từ nhãn nút. SCEN có bài Audio,
Synthesizer, Monitor, LVPS, BCPS, RF Monitor, Carrier/SB amplifier và Monitor
RF offset; hardware-selection/evaluation không mô phỏng rút card, cáp hay CB.
Đã kiểm tra cả engine và scenario để bác bỏ giả thuyết “không có calibration
vì sơ đồ detached”: **các field và hiệu ứng phần mềm có**, nhưng TP/cáp/trim
vật lý không vì thế được nối với chúng.

HC III.3–4, PDF 6–7 / in 5–6 đòi ESD, dụng cụ còn hạn kiểm định: scope hai
kênh (TDS1002 hoặc tương đương), frequency counter, DMM, Bird 4314B + element
5C/250C, tải 5 W/50 Ω; IV.11 thêm ampe kìm và IV.13 thêm máy phân tích mạng.
Simulator không thể chứng nhận đo RF/điện thật, hiệu chuẩn probe/element,
công suất tải, suy hao cáp, S11 hay an toàn điện. **Không có dụng cụ vật lý là
giới hạn đào tạo**, không mặc nhiên là lỗi phần mềm. Khoảng trống sư phạm cần
tách riêng: chưa mô phỏng chọn dụng cụ, đấu dây, xác nhận mất nguồn, điều kiện
Local/Bypass/Load, thứ tự nghiệm thu và bằng chứng đo. Các dòng “Thiếu” dưới
đây nói thiếu bề mặt/bài tập đó, không yêu cầu browser thay thế dụng cụ thật.

### 3.2. Bao phủ toàn bộ thủ tục HC

Quy tắc đếm: **đủ** = đi hết quy trình HC, kể cả điều kiện, hiệu chỉnh và kiểm
tra sau thay; **một phần** = có điều khiển/điểm kiểm tra chuyên biệt thực sự
render hoặc bài chẩn đoán liên quan, nhưng chưa đi hết quy trình; **chưa bao
phủ** = chỉ có chỉ thị chung sau sửa, không có thao tác thay/hiệu chỉnh đặc thù.
Không lấy một dòng “power bình thường” làm đủ quy trình. Mỗi mục HC tính một
lần, IV.3 gồm cả 3.1/3.2. Kết quả: **0 đủ / 14 một phần / 2 chưa bao phủ**.
Đây là coverage, không phải 14 quy trình đã đạt fidelity.

| HC / thủ tục, điểm chỉnh, chuẩn và dụng cụ | Simulator thực sự có | Verdict bao phủ | HC và TM nền phần cứng/quy trình |
| --- | --- | --- | --- |
| IV.1 Synthesizer: J2 tần số đài ±0,002%; TP1 0±0,05 V, TP2 2–8 V; counter/DMM, Carrier PLL Control | BDAT/FACE nhận diện; TXC field PLL; READ TX/Status/Alerts/Integral; SCEN `createSynthesizerTx2FrequencyScenario`. Chưa có counter/DMM live hoặc vòng chỉnh TP1/2. | Một phần | HC PDF 9–12 / in 8–11, IV.1 a–p; TM PDF 190 / 3-72 Fig. 3-69/Table 3-13; PDF 212–213 / 6-12–13 §6.4.12/14. |
| IV.2 Audio: Output Power Scale khôi phục công suất lần tốt gần nhất; SB theo IV.3; PMDT | TXC Output Power Scale có hiệu ứng; READ/SCEN `createAudioGeneratorTx1FaultScenario`; không nạp lại cấu hình sau cắm card thật. | Một phần | HC PDF 13–14 / in 12–13, IV.2 a–j; TM PDF 193 / 3-75 Fig. 3-71/Table 3-15; PDF 213 / 6-13 §6.4.15. |
| IV.3 Sideband: TP1/7, TP4/10, TP5/11, TP6; R1–6, PMDT Phase Offsets; DMM/scope/Bird 5 W | SBM/SBD sáu trim, ảnh dạng sóng ở BDAT, TXC phase/RF scale và SCEN `createSidebandAmplifierTx1Scenario`; hai thế giới không nối. Chi tiết §3.3. | Một phần | HC PDF 15–18 / in 14–17, IV.3.1/3.2; TM PDF 191–192 / 3-73–74 Fig. 3-70/Table 3-14; PDF 215 / 6-15 §6.4.24; PDF 210 / 6-10 §6.4.6. |
| IV.4 CSB AMP: Output Power Scale, Tx Sideband RF Level Scale; SYN TP1 0±50 mV; phase Fine cực đại 9960; PMDT/DMM/scope | TXC các field thật và ENGINE có đáp ứng; READ/SCEN `createCarrierAmplifierTx2Scenario`; không đo TP1/dạng sóng live. | Một phần | HC PDF 19–22 / in 18–21, IV.4 a–p; TM PDF 186 / 3-68 Fig. 3-65/Table 3-9; PDF 215 / 6-15 §6.4.23; PDF 241 / 9-19 §9.7.13.5. |
| IV.5 Monitor: Integral azimuth/30 Hz/9960/deviation/RF Level; MON2/30,0/0 dB làm đích như HC; PMDT, không thêm DMM | MONC ba cột, ENGINE `calibratedMeasurement`, SCEN `createMonitor1CalibrationScenario` RF offset; không có hướng dẫn tính/so MON2. Mơ hồ công thức giữ Q4. | Một phần | HC PDF 23–25 / in 22–24, IV.5 a–m; TM PDF 187 / 3-69 Fig. 3-66/Table 3-10; PDF 211/213 / 6-11/13 §6.4.10/16. |
| IV.6 LVPS: Power Supply Data đúng dải, Digital I/O “Power Supply Status” xanh; PMDT, HC không thêm trim | READ `RmsPowerSupply/RmsDigitalIo`, BDAT LVPS và SCEN `createLvpsTx1PowerScenario`; không CB/rút card. | Một phần | HC PDF 25–27 / in 24–26, IV.6 a–h; TM PDF 194 / 3-76 §3.8.11; PDF 213–214 / 6-13–14 §6.4.17. |
| IV.7 Test Generator 1A3A5: Test Results/Test Generator, đợi 2 phút, kết quả bằng hoặc sai lệch nhỏ so setup (HC không định lượng “nhỏ”) | READ `MonitorTestResults.TestGenerator` có setup/result; ENGINE sinh kết quả tức thời, không timer 2 phút; không có mặt TG. | Một phần | HC PDF 28 / in 27, IV.7 a–f; TM PDF 194 / 3-76 Fig. 3-72/Table 3-16; PDF 214 / 6-14 §6.4.18. |
| IV.8 RMS: System Configuration Load file tốt gần nhất, RMS Config Backup; kiểm cả TX; PMDT | STORE có backup/restore và READ dữ liệu; `System > Configuration Load` disabled trong `vor-menu-structure.ts`, không file-load theo HC; backup bị chặn trong scenario. | Một phần | HC PDF 29–32 / in 28–31, IV.8 a–n; TM PDF 188 / 3-70 Fig. 3-67; PDF 214 / 6-14 §6.4.19. |
| IV.9 Facilities: RMS Digital I/O “Facilities” G/xanh; không định lượng, PMDT | READ `RmsDigitalIo` có Facilities; BDAT/FACE không face riêng, STORE không thay card/CB. | Một phần | HC PDF 32 / in 31, IV.9 a–g; TM PDF 189 / 3-71 Fig. 3-68/Table 3-12; PDF 214 / 6-14 §6.4.20. |
| IV.10 RF Monitor: R1 công suất lịch sử tốt; R2 Carrier VSWR <1,25; R3 standby công suất lịch sử; PMDT | FACE `RfMonitorFaceplate` vẽ R1–3 tĩnh; READ có carrier/VSWR, SCEN `createRfMonitorVswrScenario` chẩn đoán; không chỉnh trim detector. | Một phần | HC PDF 33–35 / in 32–34, IV.10 a–j; TM PDF 195 / 3-77 Fig. 3-73/Table 3-17; PDF 214 / 6-14 §6.4.21. |
| IV.11 BCPS: E3 45–52 V, E1 51–55 V; AC reading ±1 V/±0,3 A; R30/R56, DVM/ampe kìm | READ Power Supply/Digital I/O, FACE BCPS, SCEN `createBcpsTx2PowerScenario`; không E1/E3/R30/R56 hoặc mô hình dụng cụ. | Một phần | HC PDF 35–37 / in 34–36, IV.11 a–i và hai tiểu mục AC; TM PDF 185 / 3-67 Fig. 3-64; PDF 206 / 6-6 §6.4.1.1/2; PDF 214–215 / 6-14–15 §6.4.22. |
| IV.12 LCU: LCD/đèn/phím/chuyển TX tốt; không giá trị chuẩn riêng/dụng cụ ngoài | VIEW `LcuPanel` có phím/đèn nhưng detached, LCD thiếu trang, nhiều phím chưa hoạt động (§2.4); không nghiệm thu chuyển máy thật. | Một phần | HC PDF 37 / in 36, IV.12 a–i; TM PDF 180–184 / 3-62–66 Figs. 3-56–63/Tables 3-5–7. |
| IV.13 Sideband Antenna: hai tụ CCA; VNA S11 Log Mag 108–118 MHz, marker tần số đài, ≤−30 dB (HC ghi tương ứng VSWR <1,05); tải 5 W lân cận | BDAT `antenna-bank` là bank commutator, không antenna CCA/tụ; ENGINE có VSWR/READ monitor nhưng không S11 sweep, VNA zero hay chỉnh cộng hưởng. | Thiếu | HC PDF 37–39 / in 36–38, IV.13 a–m; TM PDF 49 / 2-5 Fig. 2-3; PDF 212 / 6-12 §6.4.13 chỉ kiểm carrier/đổi tần, không cung cấp quy trình VNA antenna SB tương đương. Không dùng carrier VSWR thay S11. |
| IV.14 Rơ le RF 1K1: thay/ghi dây, Narda→“Tenedyne” theo hình HC; kiểm công suất/monitor/alerts, hai TX; không trim/danh định mới | BDAT/VIEW có mạng switch; SCEN không thay relay hay đấu dây; READ chỉ xem kết quả chung. Chưa bao phủ thao tác đặc thù relay. | Thiếu | HC PDF 39–42 / in 38–41, IV.14 a–l; TM PDF 49–50 / 2-5–6 Fig. 2-3/§2.3.1.1 (năm relay sau RF Monitor). Không xác nhận wiring từ hình khối. |
| IV.15 Test Generator: thân đề A3A5, mục lục đề 1A12; setup/result gần nhau, thêm Monitor/Alerts; PMDT | READ `MonitorTestResults.TestGenerator` và ENGINE đã có; không tạo module 1A12 hay tự coi đây là quy trình khác IV.7; chưa có replacement/timing/certification. | Một phần | HC PDF 4 / in 3 mục lục; PDF 42–44 / in 41–43, IV.15 a–i; TM PDF 194 / 3-76 Fig. 3-72; PDF 214 / 6-14 §6.4.18. |
| IV.16 Interface CCA (HC 1A19): HC nói **không có hiệu chỉnh**, kiểm Monitor/Alerts và kết nối RCSU | BDAT 1A9 có mô tả/định vị; READ hiển thị alerts; không thực hiện nối RCSU hoặc thay card. Không gọi thiếu trim vì HC không yêu cầu. Identity giữ Q7. | Một phần | HC PDF 45–47 / in 44–46, IV.16 j–s; TM PDF 25 / 1-5 Fig. 1-4; PDF 28 / 1-8 §1.2.1.14 (1A9). |

### 3.3. Điểm chỉnh, giá trị, phép đo và hành vi so với HC

“Không ghi dung sai” là giới hạn của nguồn HC cho bước đó, **không tự hiểu
là ±0 hoặc mượn ±5%/±10% từ TM**. Giá trị “lần hoạt động tốt gần nhất” phải
có hồ sơ trạm; không thay bằng default TST/117 MHz/2,5 W của simulator.

| Thủ tục / bước | Module, control/TP/field | Đích HC + dung sai | Dụng cụ | Simulator / code thực thi | Verdict | Dẫn chứng HC; TM |
| --- | --- | --- | --- | --- | --- | --- |
| P01 — Điều kiện trước chỉnh/thay | RF Off, CB AC/DC/BUSS, Local/Bypass/Load theo từng mục | Trạng thái và thứ tự, không số đo; IV.3 bật TX1 **vào tải** | PMDT, CB/ESD ngoài sim | VIEW/SBD cho xoay bất kỳ R1–6 không cần Local/security/Bypass/nguồn. PMDT STORE/CFG có route/gating, nhưng không có CB/cáp/tháo card. Thiếu ràng buộc trong bài tập, không yêu cầu browser mô phỏng an toàn điện thật. | Một phần | HC PDF 5–7 / in 4–6, III.1/3/4; PDF 15/17 / in 14/16 IV.3.1 a–f/3.2 a–d; TM PDF 215 / 6-15 §6.4.24 a–e. |
| P02 — IV.3.1 g,l | R1→TP1; R4→TP7, SB PHS DET | 0,90–0,95 VDC | DMM/DVM | BDAT có giá trị tham khảo; SBD R1/R4 chỉ hiển thị TP4/TP10; SBM không có TP1/TP7 và lock detector. Có nhãn/nguồn, chưa có đo/chỉnh detector. | Một phần | HC PDF 15–16 / in 14–15; TM PDF 192 / 3-74 Table 3-14; PDF 215 / 6-15 §6.4.24 f,i. |
| P03 — IV.3.1 i,m | R1→TP4, R4→TP10 MEAN/DYN PHS | **2–9 VDC** | DMM/DVM | SBM `controlVoltage=6+phaseAngle/45`, clamp ±180° ⇒ 2–10 V; SBD không đánh dấu quá 9 V. Đây là thang đào tạo có note, không dung sai HC; không lấy đầu thang 10 V làm pass. | Sai khác | HC PDF 16 / in 15; TM PDF 192 / 3-74 Table 3-14 ghi 2–10, nhưng PDF 215 / 6-15 §6.4.24 h,k cũng yêu cầu 2–9. |
| P04 — IV.3.1 j,n | R1→TP5, R4→TP11 PHS ERROR | 0,89–0,91 VDC | DMM/DVM | BDAT ghi dải; SBM chỉ có mean voltage, không phản hồi phase error/closed loop. Không thể luyện cùng lúc TP1/4/5 hoặc TP7/10/11 đạt chuẩn. | Một phần | HC PDF 16–17 / in 15–16; TM PDF 192 / 3-74 Table 3-14; PDF 215 / 6-15 §6.4.24 g,j. |
| P05 — IV.3.1 h | TP2/TP8 waveform; sai dạng thì thay SB khác | So với hình Proper/Improper; không quy định dung sai biên độ số | Oscilloscope | BDAT `TP2 / TP8.waveform`/VIEW modal có **ảnh tham khảo**; SBM không sinh trace theo chỉnh pha/công suất, không có chọn probe/ground/scope setup hoặc quyết định reject card. Đây là giới hạn mô hình đo, không thiếu ảnh. | Một phần | HC PDF 15–16 / in 14–15; TM PDF 192 / 3-74 Table 3-14 (detected 360 Hz); PDF 215 / 6-15 §6.4.24. |
| P06 — IV.3.1 k | TP6 SB1/2 PHS DIFF; PMDT SB1 hoặc SB2 Phase Offsets | **0,0 V ±50 mV** | DMM/DVM + PMDT | TXC có hai phase fields; ENGINE `buildDvorGroundCheck` đổi hài, không tính điện áp TP6. BDAT lại ghi **±0,1 V** theo TM. Không có meter TP6/pass HC; không suy từ trace ground check ra VDC. | Sai khác | HC PDF 16 / in 15; TM PDF 192 / 3-74 Table 3-14; PDF 215 / 6-15 §6.4.24 m cho ±0,1 V. |
| P07 — IV.3.2 b–i,n | SB3 tham chiếu; R3 SB1/R6 SB2 tại assembly | SB1 = SB3 tốt đo trước; SB2 = SB1 vừa chỉnh. HC không đặt W cố định/dung sai số | Bird/element **5 W**, feed cable và tải phù hợp | SBM R3/R6 tăng thuận chiều, 0–5 W/10 vòng; SBD wattmeter 2,5 W ban đầu. Có điều chỉnh độc lập bốn kênh/TX từ `readSidebandTransmitter`, nhưng không bước lấy/ghi SB3 chuẩn, nối meter/cáp/tải, hoặc kiểm bằng tham chiếu. 0–5 W là quy ước, không suy công suất chuẩn từ element 5 W. | Một phần | HC PDF 17–18 / in 16–17; TM PDF 192 / 3-74 Table 3-14 R3/R6 chiều tăng; PDF 210 / 6-10 §6.4.6 h–q; PDF 215 / 6-15 §6.4.24 n–o. |
| P08 — IV.3.2 j,o | R2 SB1/R5 SB2 PWR CAL → công suất hiển thị TX | PMDT bằng wattmeter ở mỗi kênh; không dung sai số trong HC | Bird 5 W + PMDT | SBM `calibratedPower=P×(1+CALangle/900)` (0,8–1,2 lần ở ±180°), giữ P không đổi; SBD bảng Tx1/2 và SB1–4 phản ánh CAL đúng kênh. Nhưng đây **không phải PMDT native**: VIEW state không đến STORE/ENGINE/evidence/backup. Không thể hoàn thành kiểm tra bằng READ thật sau xoay CAL. | Một phần | HC PDF 17–18 / in 16–17; TM PDF 192 / 3-74 Table 3-14 R2/R5; PDF 210 / 6-10 §6.4.6 j–q (±10% khác HC). |
| P09 — IV.3/IV.2/IV.4 làm việc vào tải | TX Data Carrier/SB và wattmeter khi TX1 Load, không on-air | Vẫn đo/đọc công suất để chỉnh khi vào tải theo HC | PMDT + Bird | STORE `setTransmitterMode` và ENGINE `effectiveTransmitter` phân biệt `load/onAir`, nhưng `sidebandPower` chỉ khác 0 khi **onAir**; `buildTxPower.measuredCarrier` cũng return 0 khi !onAir. SBD wattmeter vẫn đổi ngay cả mọi TX Off. Hai bề mặt trái điều kiện HC; không phải chỉ thiếu dụng cụ thật. | Sai khác | HC PDF 13–14 / in 12–13 IV.2 e–i; PDF 17–18 / in 16–17 IV.3.2 d–o; PDF 19–21 / in 18–20 IV.4 f–j; TM PDF 195 / 3-77 Table 3-17 TP3 (standby load). |
| P10 — IV.3.1 o và kết thúc IV.3.2 p–s | RMS Config Backup; tháo meter/khôi phục cáp, TX1 antenna, Integral trong dải | Lưu và nghiệm thu, không đích W mới | PMDT/cáp ngoài sim | STORE `backupConfig` có thật (security≥3, needBackup, ngoài scenario), nhưng không biết `sidebandAngles`; SCEN chấm selection/config/view/action, không continuity cáp hay đo nghiệm thu R1–6. Không thể backup góc trim detached. | Một phần | HC PDF 17–18 / in 16–17; PDF 5 / in 4 III.1 còn yêu cầu lưu máy tính và bộ nhớ ngoài; TM PDF 215 / 6-15 §6.4.24 p–q. |
| P11 — IV.1 g–h | Synth J2, tần số đài | ±0,002% (=±20 ppm); sai thì chuyển khối về Trung tâm | Frequency counter; TM cảnh báo bảo vệ input J2 | BDAT/FACE J2 và READ frequency có; ENGINE lấy station frequency/error cấu hình, không counter/SMA/attenuation, không xác định reject từ đo. Không thêm R27 hiện trường vào bài HC. | Một phần | HC PDF 9 / in 8; PDF 7 / in 6 III.4 counter; TM PDF 212 / 6-12 §6.4.12 a–c (+15 dBm, R27). |
| P12 — IV.1 i–l; IV.4 n | Synth TP1/TP2, Carrier PLL Control | TP1 0±0,05 V; TP2 2–8 V đồng thời | DMM | TXC PLL chỉnh được; ENGINE dùng PLL trong `buildDvorGroundCheck` bias nhưng không TP1/TP2 voltage/counter feedback. BDAT có danh định, không đồng hồ động để hội tụ. | Một phần | HC PDF 9/21 / in 8/20; TM PDF 190 / 3-72 Table 3-13; PDF 212 / 6-12 §6.4.12 d–g. |
| P13 — IV.2 h; IV.4 i,j | Output Power Scale; Tx Sideband RF Level Scale | Khôi phục giá trị tốt gần nhất, không W/tolerance cố định ở HC | PMDT (HC không đòi Bird ở bước này) | TXC/CFG→ENGINE `effectiveTransmitter`: output scale đổi carrier và SB; group SB scale và từng branch scale đổi công suất. SCEN carrier/SB có field allowlist. Có bài phần mềm thật, nhưng chưa lấy hồ sơ lần tốt làm reference, và Load bị P09. | Một phần | HC PDF 14/20–21 / in 13/19–20; TM PDF 215 / 6-15 §6.4.23 d (antenna, reference ±5%). |
| P14 — IV.4 o | Carrier to Sideband Phase Offset Fine, quan sát 9960 Hz Modulation | Cực đại, HC không cho góc chuẩn cố định | Composite waveform/scope + PMDT | TXC coarse/fine có validation; ENGINE `sidebandModulationValue` phụ thuộc cos của sai pha so reference TX1 180°/33°, TX2 90°/−16° và biên độ SB. Có đáp ứng tìm đỉnh tương đối; không trace composite/pha thực hay mô hình DSP hãng. Không dùng hai góc default làm chuẩn trạm. | Một phần | HC PDF 21 / in 20; TM PDF 241–242 / 9-19–20 §9.7.13.5 (coarse/fine và kiểm pha), PDF 49 / 2-5 Fig. 2-3. |
| P15 — IV.5 i,m | MON1 Integral azimuthOffset và rfLevelOffset | Azimuth khớp MON2; RF Level **0,0 dB**; HC không dung sai số | PMDT | MONC→ENGINE `calibratedMeasurement` cộng offset; có thể chỉnh độc lập MON1/MON2, RF offset có SCEN. Không có nút “cal” tự động nhưng HC cũng yêu cầu nhập thủ công. Chưa nghiệm thu tất cả dữ liệu trong quy trình thay card. | Một phần | HC PDF 24–25 / in 23–24; TM PDF 211 / 6-11 §6.4.10; PDF 167 / 3-49 §3.6.8.2.4/Fig. 3-44. |
| P16 — IV.5 j–l | MON1 Integral hz30ModulationScale/hz9960ModulationScale/deviationScale | 30 Hz: New = **30,0/CurrentReading × CurrentOffset**; l nói lặp cách tính cho 9960/deviation, không nêu tử số riêng; h nói khớp MON2 | PMDT, không dụng cụ ngoài được chỉ định | MONC/ENGINE scale tuyến tính `/100` cho phép tính bằng tay; không formula assistant. Nếu MON2 ≠30,0 hoặc deviation ≈16, không tự thay tử số/thay nghĩa HC. Kết luận đích áp dụng cho cả ba phép đo giữ Q4, không tuyên bố sim sai vì chưa có lời giải được phê duyệt. | Chưa xác minh | HC PDF 24–25 / in 23–24, IV.5 h–l (đã mở hình công thức); TM PDF 211 / 6-11 §6.4.10 chỉ yêu cầu offset theo kết quả flight check; PDF 167 / 3-49 Fig. 3-44. |
| P17 — IV.7 f; IV.15 i | Monitor Test Results/Test Generator setup và result | Đợi **2 phút** ở IV.7; bằng hoặc sai lệch nhỏ, chưa có dung sai số | PMDT/Test Generator CCA | READ `TestGenerator` cho sửa setup; ENGINE `testGeneratorResults` tức thời, có bias/multiplier detector minh họa; không lịch chạy 120 s/certification. Ident Control/Audio Mod/Frequency là `stored-only`, UI ghi rõ không có kết quả detector. Không coi khoảng sai sẵn có là được HC chấp nhận. | Một phần | HC PDF 28/44 / in 27/43; TM PDF 214 / 6-14 §6.4.18 d (Completed, 3 phút); PDF 164 / 3-46 §3.6.8.2.2.3/Fig. 3-41 (TG cycle khoảng 2 phút). |
| P18 — IV.8 f,g,n và III.1 | Configuration Load file tốt; RMS Config Backup, bản lưu máy tính/bộ nhớ ngoài | Khôi phục đúng hồ sơ và lưu, không dùng defaults thay hồ sơ | PMDT/lưu trữ ngoài | `vor-menu-structure.ts` config-load disabled; STORE backup có thật, restore/default/profile hydrate không phải chọn file HC; scenario chặn backup. Không có bằng chứng workflow xuất hai bản/khôi phục sau thay RMS. Không nói toàn bộ persistence absent. | Một phần | HC PDF 5/29/32 / in 4/28/31; TM PDF 214 / 6-14 §6.4.19 g–h; PDF 210 / 6-10 §6.4.7 h–i. |
| P19 — IV.10 g–j | RF Monitor R1 FWD/R2 RFL/R3 STANDBY | R1/R3 khớp lịch sử tốt; chỉnh R2 nếu ≥1,25 tới **<1,25**; HC không tolerance công suất | PMDT; TM nền còn mô tả so dụng cụ ngoài | FACE `TrimPot` R1–3 chỉ SVG, không handler; ENGINE không có calibration RF Monitor detector tương ứng. MONC Tx Power Scale hay fault/VSWR override không phải trim này và không được tính thay thế. | Thiếu | HC PDF 33–35 / in 32–34; TM PDF 195 / 3-77 Table 3-17; PDF 209–210 / 6-9–10 §6.4.6. |
| P20 — IV.11 e,g | BCPS E3/GND bus; E1/GND charger | **45–52 VDC**, **51–55 VDC**; sai thì gửi khối lỗi về Trung tâm | DMM | READ power có số hiển thị và SCEN lỗi supply; FACE không E1/E3 terminal hoặc đo độc lập, không mô phỏng trình tự bật AC/DC trước BUSS hay quyết định gửi sửa. Giới hạn đo điện thật tách với thiếu bài đối chiếu số đọc. | Một phần | HC PDF 35 / in 34; TM PDF 185 / 3-67 Fig. 3-64/Table 3-8; PDF 214–215 / 6-14–15 §6.4.22. |
| P21 — IV.11 hiệu chỉnh áp AC | BCPS R30; AC Monitor 1A6 TB3-1/2; AC Input Volt | Sai số PMDT so DVM trong **1 VAC** | DVM AC; điện lưới thật ngoài khả năng sim | READ `RmsPowerSupply` render AC/voltage rows; FACE không R30/TB3, CFG không calibration R30. Không chỉnh dữ liệu display override rồi coi là đo chuẩn. | Thiếu | HC PDF 36 / in 35, IV.11 i/Hiệu chỉnh điện áp AC; TM PDF 206 / 6-6 §6.4.1.1 cho 5 VAC. |
| P22 — IV.11 hiệu chỉnh dòng AC | BCPS R56; dây Line ở 1A6 TB3-1; AC Input Amp | Sai số trong **0,3 A** | **Ampe kìm AC** theo HC; không mắc nối tiếp theo TM | READ current rows có, không meter kìm/dây/R56/calibration transfer; không xác nhận bước cô lập/cấp điện và an toàn điện. Đây là bề mặt bài tập chưa có, phép đo thật phải dùng dụng cụ ngoài. | Thiếu | HC PDF 36–37 / in 35–36; TM PDF 206–207 / 6-6–7 §6.4.1.2 (DVM dòng 10 A mắc nối tiếp). |
| P23 — IV.6/9 và kiểm tra sau thay | RMS Power/Digital I/O, TX Status, Monitor Integral/VSWR, Maintenance Alerts | Theo dải/normal/green của từng mục; HC không ghi số cho mọi tham số | PMDT | READ có các renderer cụ thể; ENGINE có fault-driven kết quả chứ không phải toàn bộ ảnh tĩnh. Tuy nhiên SCEN `evaluateDvor1150aScenario` dùng view visits/config/task/action/selection, không mặc định kiểm mọi bước HC, không đánh giá ảnh đo hoặc thao tác CB. | Một phần | HC PDF 25–27/32/39 / in 24–26/31/38, IV.6 e–h/9 g/13 k–m; TM PDF 213–214 / 6-13–14 §6.4.17/20. |

### 3.4. Chênh lệch HC–TM và quy tắc được audit dùng

Bảng này ghi khác biệt **nguồn**, không cộng thêm verdict lỗi simulator.
HC là chuẩn thủ tục đợt này; không trộn các bước TM “cho đủ”. Khác bước do
bối cảnh khác (kiểm BITE, commissioning, thay card) được nêu rõ, không tự coi
mọi số khác nhau là mâu thuẫn cùng một phép đo. Các con số dưới đây không
phải chỉ dẫn thực hiện trên thiết bị đang khai thác.

| ID / vấn đề | HC | TM | Audit theo bên nào / tác động code |
| --- | --- | --- | --- |
| C1 TP6 tolerance | PDF 16 / in 15 IV.3.1 k: 0±50 mV | PDF 215 / 6-15 §6.4.24 m: 0±0,1 V | **HC ±0,05 V**; BDAT `sideband.testPoints` ±0,1 V không đạt chuẩn HC. TXC Phase Offsets chưa có voltage feedback (P06). |
| C2 Mean phase range | PDF 16 / in 15 IV.3.1 i,m: 2–9 V | PDF 192 / 3-74 Table 3-14 R1 ghi 2–10 V; PDF 215 / 6-15 §6.4.24 h,k lại 2–9 V | **HC 2–9 V**; thực ra TM procedure cũng đồng ý, khác bảng chung. SBM 2–10 V là thang đào tạo, không tolerance nghiệm thu (P03). |
| C3 SB trình tự và route | PDF 15–17 / in 14–16 IV.3.1: TX Load; TP1→TP2 waveform→TP4→TP5→TP6→TP7→TP10→TP11→Backup | PDF 215 / 6-15 §6.4.24: TX antenna; TP1→TP5→TP4→TP7→TP11→TP10→TP6; thêm đảo J11 nếu không đạt, zero/center Phase Offset, đặt RF Level Scale=100 trước power | **Thứ tự HC/Load**. Không biến thao tác J11/zero/scale100 chỉ có ở TM thành bước bắt buộc HC. VIEW/SBD không gate/trình tự, ENGINE Load mất power (P01/P09). |
| C4 SB reference và sai số đọc | PDF 17–18 / in 16–17 IV.3.2: đo SB3 tốt, chỉnh SB1 bằng SB3, SB2 bằng SB1, CAL cho PMDT bằng wattmeter; không cho tolerance số | PDF 210 / 6-10 §6.4.6 j–q: BITE khớp meter ±10%; PDF 215 / 6-15 §6.4.24 n–o: scale100/reference sideband power | **HC reference chain**; không dùng ±10% làm pass HC hay 5 W element làm nominal. Hai thủ tục có bối cảnh khác, chưa định lượng độ chênh được phép của chữ “bằng” (Q6). SBM không lưu reference chain (P07/P08). |
| C5 Synth không đạt tần số / tên field pha | PDF 9 / in 8 IV.1 h–l: ngoài ±0,002% gửi Trung tâm; chỉnh pha bằng Carrier PLL Control | PDF 212 / 6-12 §6.4.12 c/e: cho chỉnh TCXO R27 sau tắt/rút module; field gọi “Tx1 Phase Error” | **HC gửi khối lỗi, Carrier PLL Control**; không yêu cầu bổ sung R27 vào simulator vì TM có. TXC tên PLL có, chưa DMM feedback (P11/P12). |
| C6 CSB reference/route | PDF 19–21 / in 18–20 IV.4 f–o: chỉnh power khi vào tải, khôi phục giá trị tốt, thêm group SB scale/PLL/Fine; không tolerance power số | PDF 215 / 6-15 §6.4.23 d: trên antenna, power reference ±5%, chỉnh Output Power Scale rồi Backup | **HC Load và chuỗi kiểm bổ sung**, không coi ±5% TM là dung sai HC. TXC/ENGINE có field nhưng P09 chặn đọc Load (P13/P14). |
| C7 RF Monitor detector reference | PDF 33–35 / in 32–34 IV.10 g–j: R1/R3 so giá trị lúc tốt; R2 <1,25 | PDF 195 / 3-77 Table 3-17: R1/R3 so external test power, R2 để VSWR khớp external instrument; PDF 209 / 6-9 §6.4.6 carrier ±10% | **Tiêu chí HC** khi audit bước thay RF Monitor, ghi rõ khác cơ sở detector calibration TM. Không biến chỉnh số đọc thành chứng nhận antenna/matching vật lý tốt. FACE chưa có trim động; cần Q6 về hồ sơ đo được phê duyệt (P19). |
| C8 BCPS AC tolerance/dụng cụ | PDF 36–37 / in 35–36 IV.11: áp ±1 V; dòng ±0,3 A bằng ampe kìm Line | PDF 206–207 / 6-6–7 §6.4.1.1/2: áp ±5 V; dòng vẫn ±0,3 A nhưng DVM 10 A mắc nối tiếp, cô lập nguồn theo TM | **HC 1 V và ampe kìm**, không trộn cách đấu TM vào HC. FACE/CFG thiếu R30/R56; READ không phải dụng cụ chuẩn độc lập (P21/P22). |
| C9 Test Generator test/timing | PDF 28 / in 27 IV.7 f: Test Results→Test Generator, đợi 2 phút; PDF 44 / in 43 IV.15 i: so setup/results, không ghi thời gian | PDF 214 / 6-14 §6.4.18 d: Test Results→Completed, đợi 3 phút; PDF 164 / 3-46 §3.6.8.2.2.3 mô tả TG cycle khoảng 2 phút, đồng ý HC về chu kỳ TG | **HC 120 s cho IV.7**, không tự gán 120 s cho IV.15 hoặc đổi sang Completed. Khác thủ tục/test mode, không phải mọi đoạn TM đều yêu cầu TG cycle 3 phút. READ `TestGenerator` hiện có nhưng kết quả tức thời; cần Q6 về “sai lệch nhỏ” (P17). |

Hai bất nhất **định danh** không được giải quyết bằng “HC thắng” vì phần
cứng vẫn lấy TM nền: HC IV.15 mục lục (PDF 4 / in 3) ghi 1A12, thân (PDF
42 / in 41) ghi A3A5; TM PDF 194 / 3-76 Fig. 3-72/§3.8.12 ghi 1A3A5.
HC IV.16 PDF 45 / in 44 ghi Interface **1A19**, TM PDF 25/28 / 1-5/8
Fig. 1-4/§1.2.1.14 ghi **1A9**. BDAT có 1A9, không tạo 1A19/1A12;
giữ mở Q7 thay vì sửa tên hardware theo lỗi có thể có trong tài liệu.

Định danh cáp cũng cần Q5: HC IV.3.2 b/g/l/q, PDF 17–18 / in 16–17
ghi SB3 J26-1A10; SB1/SB2 cùng J25-1A10 rồi “SB2 vào J2”. TM PDF 210 /
6-10 §6.4.6 h–p phân biệt SB1 1A11J25, SB2 1A10J25, SB3 1A11J26,
SB4 1A10J26. Bốn nguồn chưa xác nhận mapping trạm hay errata; audit không
biến một chuỗi chưa rõ thành yêu cầu nối cáp trong SBD/BDAT.

### 3.5. Khoảng trống hiệu chỉnh ưu tiên và giới hạn kiểm chứng

1. **K1 — chỉnh vào tải không có số đọc RF native:** P09, HC IV.2–4, trong
   khi ENGINE chỉ phát sinh Carrier/SB Power khi `onAir`. SBD lại đọc power
   cả khi Off. Đây là sai khác logic có thể tới từ route Load, không phải
   suy đoán từ manifest.
2. **K2 — CAL/trim detached không nghiệm thu/backup được:** P08/P10; SBD
   hiển thị tên PMDT nhưng không cập nhật STORE/ENGINE/SCEN. UI note đào tạo
   có, song không biến nó thành quy trình hiệu chỉnh HC hoàn chỉnh.
3. **K3 — thiếu vòng TP pha và tiêu chí HC:** P02–P06/P12; TP1/5/7/11 chỉ
   danh mục, TP6 không feedback, tolerance TP6 theo TM rộng gấp đôi HC;
   mean meter cho tới 10 V mà không phân định ngoài chuẩn 9 V.
4. **K4 — RF Monitor/BCPS calibration không thao tác được:** P19/P21/P22;
   R1–3 RF Monitor chỉ hình, R30/R56/điểm đo điện AC chưa có. Chỉ thị lỗi,
   fault override hay MON Tx Power Scale không thay chức năng các trim đó.
5. **K5 — chưa có workflow đo chuẩn/ghi tham chiếu/nghiệm thu:** P01/P05/
   P07/P10/P17/P18; thiếu reference SB3/lịch sử tốt, mô hình scope/counter,
   thời gian TG, tải/cáp/CB và file-load HC. Các phần thật phải thực hiện với
   dụng cụ/nhân sự đủ điều kiện, không thể được simulator chứng nhận thay.

Chưa chạy browser, chưa đo thiết bị thật, chưa xác nhận transfer function
phần cứng. Các phép tuyến tính/cos/hài trong SBM/ENGINE là mô hình đào tạo,
không coi là đặc tính hãng. Đã đọc test
`tests/vor/sideband-adjustment-model.test.ts` và test UI liên quan để kiểm
ranh giới: chúng kiểm convention detached, không xác nhận chuẩn HC.
Không sửa source, không đổi test để hợp audit; các phần PMDT khác còn để §4.

## 4. PMDT và phần mềm khai thác

### 4.1. Bề mặt thực sự được audit và bằng chứng hình

Đã lần theo route `src/app/simulator/dvor-1150a/page.tsx` → barrel
`src/modules/devices/dvor-1150a/index.ts::Dvor1150aPmdtLayout` →
`src/components/vor/pmdt-layout.tsx::PmdtLayout/PmdtScreenRouter` → các screen
→ `useVorPmdtStore` → `buildDvor1150aSnapshot`. Vì vậy đây **không phải**
kết luận từ manifest hay wrapper operations-software của thiết bị khác.

Alias bổ sung (đường dẫn tương đối từ repository; `screens/` bên dưới là
`src/components/vor/screens/`; tên component là symbol cùng file):

| Alias | File / symbol |
| --- | --- |
| MENU | [`src/lib/vor-menu-structure.ts`](../../src/lib/vor-menu-structure.ts)::`vorMenuStructure`, `monitorItems`, `testSignalItems`, `transmitterCommandItems`, `rmsCommandItems`, `monitorCommandItems` |
| BAR | [`pmdt-menu-bar.tsx`](../../src/components/vor/pmdt-menu-bar.tsx)::`MenuItemRow.selectItem`; [`pmdt-toolbar.tsx`](../../src/components/vor/pmdt-toolbar.tsx)::`PmdtToolbar` |
| STORE | [`vor-pmdt-store.ts`](../../src/stores/vor-pmdt-store.ts)::`useVorPmdtStore`, `applyAutomaticMonitorTransfer`, `monitorProtectionDelay` |
| DEF / ENG | [`defaults.ts`](../../src/lib/dvor1150a/defaults.ts)::`createDefaultDvor1150aConfig`, `alarmLimits`, `makeRouting`; [`engine.ts`](../../src/lib/dvor1150a/engine.ts)::`buildDvor1150aSnapshot`, `calibratedMeasurement`, `effectiveTransmitter` |
| CONTROL | [`pmdt-config-control.tsx`](../../src/components/vor/pmdt-config-control.tsx)::`PmdtConfigControl`; [`config-utils.ts`](../../src/lib/dvor1150a/config-utils.ts)::`dvorConfigFieldCatalog` |
| CLOCK | [`dvor1150a-monitor-clock.tsx`](../../src/components/vor/dvor1150a-monitor-clock.tsx)::`Dvor1150aMonitorClock` |

Đã mở ảnh toàn bộ TM PDF **120–179** (trang in 3-2–61), gồm Table 3-1 và
Figs. 3-1–55, và KT PDF **12–34** (trang in 11–33), gồm ảnh Data, RMS,
Fault History, Completed/In Process. Contact sheets:
`/home/ubuntu/out/dvor1150a-figures/tm-pmdt-sheet-1.png` đến `-7.png`,
`kt-pmdt-sheet-1.png` đến `-3.png`. Đã mở riêng TM PDF 157 và KT PDF 10–11
để đọc số/ngưỡng (`tm-detail-157.png`, `kt-detail-10.png`, `kt-detail-11.png`).
Hình được render bằng PyMuPDF từ chính PDF đã trích, không phải ảnh web.
Nhận xét bố trí dưới đây dựa trên ảnh tài liệu + JSX/CSS, **chưa mở browser
để đo pixel hay vận hành UI**. Không coi các màu/giá trị trong ảnh chụp là
default bắt buộc của mọi trạm.

### 4.2. Cây menu/màn hình đầy đủ

Mỗi nhánh `Monitor 1/2`, `TX1/2` trong bảng áp dụng cho **cả hai**, không bỏ
nhánh thứ hai. Các tab được kê như màn hình con; `Có` chỉ là renderer có
thật, không có nghĩa mọi nút hoạt động. `KT —` = KT không mô tả riêng mục đó
(đã rà toàn Phần II PDF 12–34 / in 11–33); không phải thiếu citation TM.
Các cột giá trị dẫn §4.3 khi cùng dùng bộ ngưỡng; màn lệnh không có trị đo
ghi rõ loại lựa chọn thay cho bịa giá trị số.

| ID / menu → screen | Trường/nhãn/giá trị, bố trí và hành vi thực tế | Verdict | Nguồn TM; KT; code |
| --- | --- | --- | --- |
| P01 System → Logon RMS | Có dialog User ID/Password xếp dọc, OK/Cancel; nhận GUEST, SEC3, SEC4; phân quyền thiếu Level 2, xem S01. | Một phần | TM PDF 124–126 / 3-6–8 §3.6.6/Table 3-2/Fig. 3-5; KT —; `pmdt-login-dialog.tsx::PmdtLoginDialog`, STORE::`login` |
| P02 System → Connect → Navaid → Serial/USB hoặc Modem; System Directory/Add Entry/Delete Entry/Dial/Change Dialing/Modem Properties/Add Phone Number | Không có cây chọn đường truyền, COM/IP/port, quốc gia/điện thoại hay dialing rules; logon không thiết lập kết nối vật lý. | Thiếu | TM PDF 123–126 / 3-5–8 §3.6.5–6/Figs. 3-2–5; KT PDF 16 / in 15 II.4 (kiểm tra kết nối); MENU/BAR::`selectItem`, DEF::`simulation.connected` |
| P03 System → Logoff/Disconnect | Có logout về Level 0 và mở dialog; không đặt `simulation.connected=false`, không thực sự disconnect hay cảnh báo trạng thái không chuẩn trước thoát. | Một phần | TM PDF 120–121 / 3-2–3 §3.5.2.1/Table 3-1; KT PDF 12 / in 11 I; STORE::`logout`, MENU |
| P04 System → Configuration Save / Load / Print | Cả ba có nhãn nhưng disabled; không chọn file/đường dẫn, lưu/nạp cấu hình hay in tập dữ liệu. Profile/scenario không thay được quy trình này. | Thiếu | TM PDF 141 / 3-23 §3.6.7.4; KT — (BD yêu cầu ở §5 B23); MENU, BAR::`selectItem` |
| P05 System → PMDT Setup | Disabled; thiếu dialog COM, modem, IP/port, Print Screens Graphic/Text, Language, Restore Defaults, OK/Cancel theo Fig. 3-2. | Thiếu | TM PDF 123–124 / 3-5–6 §3.6.5/Fig. 3-2; KT —; MENU/BAR |
| P06 System → Print Setup / Exit PMDT | Disabled; không in hay đóng ứng dụng, không chuỗi Windows shutdown. Đây là mô phỏng browser, không yêu cầu tắt OS thật. | Thiếu | TM PDF 120–121 / 3-2–3 §3.5.2.2/Table 3-1; KT —; MENU/BAR |
| P07 Sidebar/Home | Có Connected, Alert/Local, TX1/TX2 Main/Antenna/Load/Off, Integral Normal/Pri/Sec/Bypass, năm trị Monitor 1-Antenna 1 xếp dọc; không phải công tắc gạt. Có chọn main/route, Local/Bypass phụ thuộc quyền; nguồn LCU phần cứng vẫn tách (§2). | Một phần | TM PDF 122 / 3-4 §3.6.3/Fig. 3-1; KT PDF 12,17 / in 11,16 I/II.1,6; `pmdt-sidebar.tsx::PmdtSidebar`, `home-screen.tsx::HomeScreen`, STORE |
| P08 Thanh công cụ chung Print/Copy/Next F5/Close F6/Apply F7/Reset F8 | Có đủ nhãn/nút; Print/Copy/Next/Close không handler. Apply có draft; Reset gọi restore defaults chứ không hủy thay đổi hiện tại (S03). Chưa xác nhận kích thước/browser. | Sai khác | TM PDF 123 / 3-5 §3.6.4 (F8 Reset rời screen không lưu); KT PDF 13–20 / in 12–19 các screenshot; BAR::`PmdtToolbar`, `pmdt-layout.tsx` function-key effect |
| P09 RMS → Status → VOR Status (và DME khi có) | Có nhóm System, Logon Level, Local, Maintenance, On Battery, AC Failure, Remote/Ground/Hold và RCSU; DME summary không thành hệ thống DME liên kết. RCSU error dùng đỏ trong JSX, KT mô tả vàng. | Một phần | TM PDF 127 / 3-9 §3.6.7.1.1/Fig. 3-6; KT PDF 15–16,29 / in 14–15,28 II.4/III.7; `rms-status-layout.tsx::RmsVorStatus`, ENG::`data.rmsStatus` |
| P10 RMS → Status → Monitor/Transmitter Status | Có bảng alarm monitor và nhóm Antenna/Main/On; một phần được ENG cập nhật theo máy đang phát, không phải mọi lỗi vật lý/relay. | Một phần | TM PDF 128 / 3-10 §3.6.7.1.2/Fig. 3-7; KT PDF 29 / in 28 III.7; `rms-status-layout.tsx`, ENG::`data.rmsMonitorTransmitterStatus` |
| P11 RMS → Status → Software Revisions / Hardware Revisions | Hai tab có bảng version/serial/P/N; dữ liệu mẫu, không nhận diện thiết bị trạm. Không lấy các số này ghi hồ sơ máy thật (Q9/Q12). | Một phần | TM PDF 129–130 / 3-11–12 §3.6.7.1.3–4/Figs. 3-8–9; KT PDF 29 / in 28 III.7; `rms-status-layout.tsx::RmsStatusLayout`, ENG::`buildDvor1150aSnapshot` |
| P12 RMS → Data → Maintenance Alerts/Alarms | Có hai cụm General và Monitor, cột Monitor1/2/Allow1/2; đọc được cảnh báo mẫu/derived nhưng không đủ hỏng hóc RMS/LCU/cáp thật. | Một phần | TM PDF 131 / 3-13 §3.6.7.2.1/Fig. 3-10; KT PDF 17–18 / in 16–17 II.6; `rms-maintenance-alerts.tsx::RmsMaintenanceAlerts`, ENG |
| P13 RMS → Data → Power Supply Data | Có bảng Low/PreLow/Value/PreHigh/High, voltage/current, BCPS Comm Fail cuối; đủ bề mặt đọc DC ±3.3/±12/+5/+15/+24, TX48/Battery1/2 theo danh sách KT, không mô phỏng đồng hồ độc lập hay xả ắc quy. | Một phần | TM PDF 132 / 3-14 §3.6.7.2.2/Fig. 3-11; KT PDF 29–30 / in 28–29 III.7; `rms-power-supply.tsx::RmsPowerSupply`, ENG |
| P14 RMS → Data → Digital I/O | Có Digital Inputs/Outputs, System Power Status và TX Alerts hai cột; đọc được nhóm nguồn/PLL/lỗi, nhưng không có chuỗi đo cáp/nguồn thật. | Một phần | TM PDF 133 / 3-15 §3.6.7.2.3/Fig. 3-12; KT PDF 18–19,30 / in 17–18,29 II.6/III.7; `rms-digital-io.tsx::RmsDigitalIo`, ENG |
| P15 RMS → Data → Temperature Data / A/D Data | Có bảng temp trong/ngoài/CCA và Spare A/D1–10 với cột ngưỡng; không đo môi trường thực, thiếu probe/tùy chọn cảm biến. | Một phần | TM PDF 134–135 / 3-16–17 §3.6.7.2.4–5/Figs. 3-13–14; KT PDF 11 / in 10 V.5.2; `rms-temperature.tsx::RmsTemperature`, `rms-ad-data.tsx::RmsAdData` |
| P16 RMS → Logs → Operational Summary | Có thời lượng TX1/TX2, Availability, Start/End/Elapsed và Reset; Reset không handler, không lịch sử thời lượng của trạm. | Một phần | TM PDF 136 / 3-18 §3.6.7.3.1/Fig. 3-15; KT —; `rms-logs-operational-summary.tsx::RmsLogsOperationalSummary` |
| P17 RMS → Logs → Alarm / Maintenance Alerts / Command Activity / Parameter Change | Đủ bốn tab, cột Time/Type/Alert/State hoặc User/File/Command; Parameter Change có log backup trong store, nhưng không đủ vòng đời 100 alarm/alert/command, Update/Reset, giờ thật như TM. | Một phần | TM PDF 137–140 / 3-19–22 §3.6.7.3.2–5/Figs. 3-16–19; KT PDF 21 / in 20 II ghi thêm nhật ký; `rms-logs-layout.tsx::RmsLogsLayout`, `rms-logs-{alarms,maintenance,commands,parameters}.tsx`, STORE::`backupConfig` |
| P18 RMS → Configuration → General | Có Monitor/LCU, OR/AND radio, Transfer select, Automatic Restarts, RCSU, SPI, DME/TACAN, Digital I/O, Modem. Chỉ một phần nối config (integrity/voting/transfer); restart, modem… vẫn dữ liệu hiển thị. Không đủ restart lần 1 và lần 2 cố định 5 phút. | Một phần | TM PDF 142–143 / 3-24–25 §3.6.7.4.1/Fig. 3-20/Table 3-3; KT PDF 12 / in 11 I; `rms-config-layout.tsx::RmsConfigGeneralTab`, ENG::`data.rmsConfigGeneral` |
| P19 RMS → Configuration → Station / Display DIP Switch Settings | Có station/radio Dual-Single, frequency và description; thiếu dialog S1/S2/S3 Read Switches/Update/cycling hardware như Fig. 3-22. | Một phần | TM PDF 144–145 / 3-26–27 §3.6.7.4.2/Figs. 3-21–22; KT —; `rms-config-layout.tsx::RmsConfigStationTab`, CONTROL |
| P20 RMS → Configuration → Power Supply Limits / A/D Limits | Có bảng giới hạn, ô chọn maintenance bên trái; nhiều checkbox disabled/false, không đủ bật từng tham số cảnh báo. Không có chứng cứ defaults tại trạm (Q10). | Một phần | TM PDF 146–147 / 3-28–29 §3.6.7.4.3–4/Figs. 3-23–24; KT PDF 29–30 / in 28–29 III.7; `rms-config-layout.tsx::RmsConfigPowerLimitsTab/RmsConfigAdLimitsTab` |
| P21 RMS → Configuration → Security Codes / Add / Change / Delete User | Không có tab quản trị 4–32 ký tự/user/level1–4 hay lưu NVRAM. Level4 vẫn dùng tập tài khoản huấn luyện cố định. | Thiếu | TM PDF 148–149 / 3-30–31 §3.6.7.4.5–5.4/Fig. 3-25; KT —; MENU, `rms-config-layout.tsx::RmsConfigLayout`, STORE::`login` |
| P22 RMS → Commands → Change Password | Có mục disabled, không dialog Current/New Password/OK, không thay mật khẩu. Không yêu cầu owner cung cấp mật khẩu thật. | Thiếu | TM PDF 149–150 / 3-31–32 §3.6.7.4.5.3/3.6.7.5; KT —; MENU::`rmsCommandItems`, BAR |
| P23 RMS → Commands → Set Time/Date / Reset RMS CPU / Reset Station Hardware / DME Control On-Off | Không có các mục/dialog tương ứng. Đồng hồ status bar lấy giờ browser không thay RMS clock. | Thiếu | TM PDF 150–152 / 3-32–34 §3.6.7.5/Figs. 3-26–30; KT —; MENU::`rmsCommandItems`, `pmdt-status-bar.tsx::PmdtStatusBar` |
| P24 RMS → Commands → Select Audio / System Fan Control Automatic-On-Off / Set Spare Digital Output / BCPS1/2 / Reset Intrusion-Smoke / Enable-Disable Command Mode | Có menu nhưng lá không `action`/`screenId` nên BAR trả về: không thi hành. Fan có lựa chọn Automatic/On/Off nhưng không dispatch; Audio chỉ TX1/2 khác No Audio/Monitor1 Ident/Monitor2 Ident; Spare thiếu High/Low; BCPS Reset khác Enable/Disable Charger trong hình. | Sai khác | TM PDF 150–152 / 3-32–34 §3.6.7.5/Figs. 3-26–29; KT —; MENU::`rmsCommandItems`, BAR::`selectItem` |
| P25 RMS → Config Backup / Config Restore | Backup có lưu snapshot/profile; Restore gọi `createDefaultDvor1150aConfig`, **không đọc configurationBackup**; không được dạy đây là khôi phục cấu hình vừa backup. | Sai khác | TM PDF 141 / 3-23 §3.6.7.4; KT —; STORE::`backupConfig/restoreDefaultConfig`, BAR |
| P26 Monitors → Data → Integral | Có hai cột Monitor1/2, Azimuth, 30/9960 Mod, Deviation, RF, Ident mod/status/code, Tx Power/Frequency/Error, đơn vị; xếp trị và khoảng ngắt Tx Power tương tự ảnh. Nhãn tab Integral khác chữ Integrity trong KT; màu dùng ngưỡng DEF, xem §4.3. | Một phần | TM PDF 153 / 3-35 §3.6.8.1.1.1/Fig. 3-31; KT PDF 14–15 / in 13–14 II.3; `monitor-data-layout.tsx::MonitorDataLayout`, `monitor-integral.tsx::MonitorIntegralAll`, ENG |
| P27 Monitors → Data → Notch Monitor | Có 48 hàng chia ba cụm, baseline/current và Recall Baseline; bề mặt đọc có thật, không xác nhận đo trường/nhớ baseline độc lập theo mỗi thay đổi SB. | Một phần | TM PDF 154 / 3-36 §3.6.8.1.1.2/Fig. 3-32; KT —; `monitor-notch.tsx::MonitorNotch`, ENG |
| P28 Monitors → Data → Sideband Antenna VSWR | Có đúng ba bảng 1–16/17–32/33–48, hai cột Antenna/VSWR, hai số lẻ; màu vàng từ 2.2, đỏ từ 3, có thể vẫn xanh khi >1.25 KT. | Sai khác | TM PDF 155 / 3-37 §3.6.8.1.1.3/Fig. 3-33; KT PDF 13–14 / in 12–13 II.2; `monitor-sideband-vswr.tsx::MonitorSidebandVswr`, DEF::`sidebandVswr` |
| P29 Monitors → Configuration → General | Có Executive Alarms/Integral Primary-Secondary dạng radio theo hàng, checkbox bật Notch/VSWR; không phải toggle switch; có edit draft/gating. Việc route và tình trạng disabled phụ thuộc config/scenario, không phải bản sao mọi trạng thái ảnh. | Một phần | TM PDF 156 / 3-38 §3.6.8.1.2.1/Fig. 3-34; KT —; `monitor-config-general.tsx::MonitorConfigGeneral`, DEF::`makeRouting`, CONTROL |
| P30 Monitors → Configuration → Alarm Limits | Có bảng năm cột, khối azimuth/notch ở trên, Timers dưới trái, Antenna1/2 dưới phải/checkbox Antenna2. **Ident Modulation xếp trước Tx Power/Frequency** trong data DEF, khác thứ tự Fig. 3-35 (Ident cuối); số so sánh ở §4.3. | Một phần | TM PDF 157 / 3-39 §3.6.8.1.2.2/Fig. 3-35; KT PDF 10–11,15 / in 9–10,14 V.5.1/II.3; `monitor-alarm-limits.tsx::MonitorAlarmLimits`, DEF/ENG::`buildAlarmLimits` |
| P31 Monitors → Commands → Integral Bypass On-Off / Standby Bypass On-Off | Có menu lá nhưng không dispatch; Integral có thể điều khiển bằng **sidebar** (Local, level≥3). Standby menu không chứng minh bypass thực thi. | Một phần | TM PDF 158 / 3-40 §3.6.8.1.3/Fig. 3-36; KT PDF 12 / in 11 I; MENU::`monitorCommandItems`, BAR, STORE::`setConfigValue`, `pmdt-sidebar.tsx` |
| P32 Monitor1/2 → Data → Integral / Status (Integral, Standby, Maintenance theo Table 3-1) | Có limit/current hai bên, status faults/alerts; single-monitor Integral còn trình bày standby values, không phải đủ ba screen độc lập theo cây Table 3-1. | Một phần | TM PDF 121,159–160 / 3-3,41–42 Table 3-1/§3.6.8.2.1/Figs. 3-37–38; KT PDF 14–15 / in 13–14 II.3; `monitor-data-layout.tsx`, `monitor-integral.tsx::MonitorIntegralSingle`, `monitor-status.tsx::MonitorStatus` |
| P33 Monitor1/2 → Test Results → Completed / In Process / Test Generator | Cả ba tab có; TG Setup gồm Azimuth/30Mod/9960Mod/Deviation/IdentMod và Ident Control/Audio Modulation/Audio Frequency; ba trường cuối có note chỉ lưu config, không detector/certification, nhãn Updated cố định. Completed/In Process có sáu cột LowTest/LowLimit/HighTest × low/high, Azimuth/30/9960/Deviation/Ident. Derived tính target/đánh giá chứ không snapshot chu kỳ TG thật hai phút và ba lần lỗi; không coi xem Completed là chạy phép đo đã lưu. | Một phần | TM PDF 161–164 / 3-43–46 §3.6.8.2.2/Figs. 3-39–41; KT PDF 31–33 / in 30–32 IV.1–2; `monitor-test-results.tsx::MonitorTestResults/buildTestRows`, ENG::`calculateIntegrityTestValues` (import từ domain) |
| P34 Monitor1/2 → Fault History → Integral / Local Control Unit | Có hai tab, Prior/Alarm và Older; Integral Prior lấy **số hiện tại**, Alarm/time hardcode, Older không handler; không lưu ba sự kiện cuối như TM. | Sai khác | TM PDF 165–166 / 3-47–48 §3.6.8.2.3/Figs. 3-42–43; KT PDF 20–21 / in 19–20 II.6; `monitor-fault-history.tsx::FaultIntegral/MonitorFaultHistory` |
| P35 Monitor1/2 → Offsets & Scale Factors | Có Integral/Standby/TG certification, azimuth/scale/RF/TX power/frequency/notch/return loss; hai offset ghi chỉ lưu, không tác động đo (§3); bố trí/đơn vị không đồng nghĩa hiệu chuẩn vật lý. | Một phần | TM PDF 167 / 3-49 §3.6.8.2.4/Fig. 3-44; KT —; `monitor-offsets.tsx::MonitorOffsets`, ENG::`calibratedMeasurement` |
| P36 Monitor1/2 → Test Signal Output J3 → Integral/Standby Composite, Test Generator, Carrier Forward/Reflected, Ground Check, SB1/2 Reflected | Tám lựa chọn đúng nhãn chính; lá không action nên không đổi tín hiệu/nối oscilloscope; thiếu mô phỏng đường J3. | Một phần | TM PDF 168 / 3-50 §3.6.8.2.5/Fig. 3-45; KT PDF 25–27 / in 24–26 III.4; MENU::`testSignalItems`, BAR::`selectItem` |
| P37 Transmitters → Data → Transmitter Data | Có Power/Frequency/VSWR, cột TX1/TX2, SB1–4; **không có chọn TX#1/TX#2 riêng như đường KT ghi**. RF MHz hiển thị bốn số lẻ, thiếu số thứ năm để ghi phiếu KT; Load mất RF (§3 K1). | Một phần | TM PDF 169 / 3-51 §3.6.8.3.1/Fig. 3-46; KT PDF 12–13,22 / in 11–12,21 II.2/III.1; `tx-data-main.tsx::TxDataMain`, ENG::`buildTxPower/effectiveTransmitter` |
| P38 Transmitters → Data → Ground Check TX1/2 | Có bảng 16 vị trí 22.5°, FFT/Station options, đồ thị; Run disabled, options không thay trace; Duantal lấy cùng quadrantal trong JSX. Không chạy ground check/NOTAM thật. | Một phần | TM PDF 170 / 3-52 §3.6.8.3.2/Fig. 3-47 (safety note); KT —; `tx-ground-check.tsx::TxGroundCheck`, ENG::`buildDvorGroundCheck` |
| P39 Ground Check → Advanced → Print/Copy/Save As/Close | Advanced button không handler; thiếu cửa sổ lớn/đồ thị tùy chọn/print-file workflow. | Thiếu | TM PDF 171 / 3-53 §3.6.8.3.3/Fig. 3-48; KT —; `tx-ground-check.tsx::TxGroundCheck`, `PmdtScreenRouter` |
| P40 Transmitters → Data → Status TX1/2 | Có System/Carrier PA/Synthesizer/Sideband alerts dạng lưới cột; một số theo derived, không đủ ROM/RAM/EEPROM/CRC và công suất phản xạ vật lý. | Một phần | TM PDF 172 / 3-54 §3.6.8.3.4/Fig. 3-49; KT PDF 19–20 / in 18–19 II.6; `tx-status.tsx::TxStatus`, ENG |
| P41 Transmitters → Configuration → Nominal | Có Azimuth Index, Output Power, Voice/Ident/Reference Mod, SBO RF Level, keyer/code/external input; Nominal tác động hai TX qua draft/Apply như mô tả TM. Không xác nhận đáp ứng RF ngoài mô hình. | Một phần | TM PDF 173,178–179 / 3-55,60–61 §3.6.8.4.1/3.6.8.7/Fig. 3-50; KT PDF 12 / in 11 I Ident Normal; `tx-config-nominal.tsx::TxConfigNominal`, CONTROL/STORE::`applyConfigChanges`, ENG::`effectiveTransmitter` |
| P42 Transmitters → Configuration → Offsets and Scale Factors | Có hai cột TX, coarse/fine/SB phase/scales/PLL; có hiệu lực trong mô hình, TP6/Load/đồng hồ độc lập chưa đủ (§3). | Một phần | TM PDF 174,178–179 / 3-56,60–61 §3.6.8.4.2/3.6.8.7/Fig. 3-51; KT PDF 23–25 / in 22–24 III.2–3; `tx-config-offsets.tsx::TxConfigOffsets`, ENG |
| P43 Transmitters → Commands → Transfer; TX1/2 Antenna/Load/Off | Transfer leaf không action; TX1/2 routing có action, level≥3 (Load/Off cần Local). Có thay thế qua sidebar nhưng chọn Antenna xóa cả hai cờ Load, không tự giữ standby trên tải nóng (S04). | Một phần | TM PDF 175 / 3-57 §3.6.8.5/Fig. 3-52; KT PDF 12,21 / in 11,20 I/III; MENU/BAR, STORE::`setTransmitterMode` |
| P44 Transmitters → Commands → Ident Normal/Off/Continuous; Hold Commutator | Normal/Off không action, check Normal cố định; Continuous/Hold disabled, không Hold/Release/test antenna index dialog. Nominal keyer là đường khác, không làm menu này hoạt động. | Một phần | TM PDF 175 / 3-57 §3.6.8.5/Figs. 3-52–53; KT PDF 12 / in 11 I; MENU::`transmitterCommandItems`, BAR |
| P45 Diagnostics → Power Up Results / Fault Isolation | Có bảng CPU/RAM/PROM/EEPROM và Full/On Air/Cancel có handler, level≥3+Local; kết quả từ mô hình/scenario, không tự test ROM/RAM phần cứng. Cảnh báo NOTAM chỉ hiện khi scenario diagnosis chọn full; không coi chẩn đoán mô hình là đã đáp ứng quy trình an toàn trạm. | Một phần | TM PDF 176–177 / 3-58–59 §3.6.8.6/Figs. 3-54–55; KT —; `diagnostics-workspace.tsx::PowerUpResults/FaultIsolation/DiagnosticsWorkspace`, STORE::`runDiagnostics/cancelDiagnostics` |
| P46 Info → About PMDT | Menu disabled dù có About dialog trong layout; không truy cập version/date bằng đường Info của TM. Version thực trạm chưa biết (Q9). | Một phần | TM PDF 121 / 3-3 Table 3-1; KT —; MENU, `pmdt-layout.tsx::PmdtLayout` |
| P47 Extra: System → Simulation Parameters; Practice/Student/Training HUD/Hardware Stage; instructor digital observations | Có riêng phục vụ dạy học, không có trong cây Table 3-1. Instructor observations chỉ hiện khi authoring và không student, không phải màn đo thật. Cần phân biệt UI huấn luyện với PMDT gốc, không xóa tính năng chỉ vì extra. | Một phần | TM PDF 121–123 / 3-3–5 Table 3-1/§3.6.3–4; KT PDF 12–34 / in 11–33 Phần II không có các màn này; MENU, `pmdt-layout.tsx::PmdtLayout`, `tx-data-main.tsx::KeyerObservationControls` |
| P48 Transmitters → Configuration → Integral Monitor Data | Tab có nhãn nhưng disabled, không renderer riêng trong `TxConfigLayout`; muốn xem dữ liệu phải sang Monitors → Data. Không coi tab có chữ là đã xem được monitor ngay trong màn chỉnh TX. | Một phần | TM PDF 173–174 / 3-55–56 Figs. 3-50–51 (tab Integral Monitor Data cạnh Nominal/Offsets); KT —; `tx-config-layout.tsx::TxConfigLayout`, `PmdtScreenRouter` |

### 4.3. Thông số monitor, danh định và ngưỡng

Ký hiệu bộ năm số: **AlarmLow / PreLow / Nominal / PreHigh / AlarmHigh**.
TM Fig. 3-35 là **profile minh họa**, không tuyên bố default xuất xưởng.
KT V.5.1 là yêu cầu giá trị bình thường, không cung cấp toàn bộ bảng
pre-alarm/nominal/timer trạm. Vì vậy không lấy dải KT làm bằng chứng rằng
tất cả relay alarm bắt buộc đặt chính xác tại biên dải ấy. Vấn đề chắc chắn:
sim có thể tô xanh số ngoài dải bình thường KT. Ngưỡng trạm cụ thể để Q10.

| ID / trường | TM hình / KT ưu tiên | DEF hiện tại; xử lý/giới hạn | Verdict | Citation nguồn + code |
| --- | --- | --- | --- | --- |
| L01 Azimuth (°) | TM ±0.90 pre, ±1.00 alarm, anten1 nominal 0.00; KT độ chính xác ≤2°, không chỉ định pre | ±0.5/±2, anten1 cả mon 249.25°, input14 dB; có hai nominal riêng mon1/2, wrap/góc theo ENG. Không biết nominal/pre đúng tại trạm. | Chưa xác minh | TM PDF 157 / 3-39 §3.6.8.1.2.2/Fig. 3-35; KT PDF 10 / in 9 V.5.1a; DEF::`azimuthLimits/makeAntenna`, ENG, `MonitorAlarmLimits`; Q10 |
| L02 30 Hz Modulation (%) | TM 28/28.5/30/31.5/32; KT bình thường 28–32 | 23/28.5/30/31.5/37; có thể 24% chỉ pre-alarm, không đỏ dù ngoài chuẩn KT; danh định 30 và pre giống hình, alarm khác. | Một phần | TM PDF 157 / 3-39 Fig. 3-35; KT PDF 10,15 / in 9,14 V.5.1a/II.3; DEF::`alarmLimits.hz30Modulation`, ENG::`buildDvor1150aSnapshot`, `MonitorAlarmLimits` |
| L03 9960 Hz Modulation (%) | TM 28/28.5/30/31.5/32; KT 28–32 | 23/28.5/30/31.5/37; cùng khoảng trống phân biệt bình thường/relay như L02. | Một phần | TM PDF 157 / 3-39 Fig. 3-35; KT PDF 10,15 / in 9,14 V.5.1a/II.3; DEF::`alarmLimits.hz9960Modulation`, ENG, `MonitorAlarmLimits` |
| L04 9960 Hz Deviation (Ratio) | TM 15/15.20/16/16.30/17; KT 16±1 | 12.6/15.5/16/16.5/19; nominal16 khớp, pre/alarm khác profile hình; không đủ định nghĩa pass theo KT khi chỉ dùng màu. | Một phần | TM PDF 157 / 3-39 Fig. 3-35; KT PDF 10,15 / in 9,14 V.5.1a/II.3; DEF::`alarmLimits.deviation`, ENG, `MonitorAlarmLimits` |
| L05 RF Level (dB) | TM −3/−2.5/0/2.5/3, chỉnh suy hao để gần0; KT có theo dõi RF nhưng không cho ngưỡng số | −9/−2/0/2/9; nominal0 đúng mục đích TM, không biết limits/suy hao14 dB có đúng trạm. | Chưa xác minh | TM PDF 157 / 3-39 §3.6.8.1.2.2/Fig. 3-35; KT PDF 11,15 / in 10,14 V.5.1b/II.3; DEF::`alarmLimits.rfLevel/makeAntenna`, `MonitorAlarmLimits`; Q10 |
| L06 Tx Power (W) | TM 70/85/100/115/130; KT máy phát 50–100 W bước1 W (không phải bảng alarm) | 50/65/70/80/120; khác nominal/profile hình, không kết luận trạm phải 100 W. Có thể cài power và limits độc lập. | Chưa xác minh | TM PDF 157 / 3-39 Fig. 3-35; KT PDF 10 / in 9 V.5.1a; DEF::`alarmLimits.txPower`, CONTROL, `MonitorAlarmLimits`; Q10 |
| L07 Tx Frequency Error (ppm) | TM −20/−18/0/18/20; KT ±0.002%=±20ppm | −20/−18/0/18/20; bộ số khớp hình, biên sai số KT tương đương. Không xác nhận counter độc lập. | Khớp | TM PDF 157 / 3-39 Fig. 3-35; KT PDF 10,22 / in 9,21 V.5.1a/III.1; DEF::`alarmLimits.txFrequencyError`, ENG, `MonitorAlarmLimits` |
| L08 Ident Modulation / Status / Code | TM 2/4/5/9/10%; Status/Code hàng đọc riêng, Normal/Continuous/No Ident; KT bình thường Ident Normal | Bộ % 2/4/5/9/10 khớp hình; Status/Code còn phụ thuộc keyer/scenario, menu Normal không thi hành P44; không đủ chứng nhận mã/Morse trạm. | Một phần | TM PDF 153,157,175 / 3-35,39,57 Figs. 3-31/35/52; KT PDF 12 / in 11 I; DEF::`alarmLimits.identModulation`, ENG keyers, `MonitorIntegral`, MENU |
| L09 Notch / Sideband VSWR | TM notch tolerance khoảng20% (§3.6.8.1.1.2), hình20; VSWR số anten1, pre1.5/alarm3.0; KT kiểm tra **mọi anten ≤1.25** và vàng khi có vấn đề | notch50%, VSWR số anten3, pre2.2/alarm3; ba cột 48 số đúng nhưng >1.25 vẫn có thể xanh; không đồng nhất VSWR công suất SB1–4 với anten1–48. | Sai khác | TM PDF 154–157 / 3-36–39 §§3.6.8.1.1.2–1.2.2/Figs. 3-32–35; KT PDF 13–14 / in 12–13 II.2; DEF::`notchTolerance/sidebandVswr`, ENG, `MonitorSidebandVswr` |
| L10 Timers / Antenna2 | TM Shutdown5s, Continuous17s, NoIdent17s; checkbox Antenna2 và attenuation/azimuth riêng | DEF 5/17/17s; second disabled, second input47/góc0; UI có checkbox, CONTROL mirror bật anten2 cả hai mon. Số timer đúng hình nhưng chưa biết setting trạm. | Một phần | TM PDF 157 / 3-39 §3.6.8.1.2.2/Fig. 3-35; KT PDF 12 / in 11 I (Special Test off); DEF::`timers/makeAntenna`, `MonitorAlarmLimits::ReadOnlyCheck`, STORE::`monitorProtectionDelay`; Q10 |

### 4.4. Kết nối, quyền, lưu cấu hình và bảo vệ máy phát

| ID / luồng | Chuẩn đối chiếu và hành vi simulator đã đọc | Verdict | Nguồn + code |
| --- | --- | --- | --- |
| S01 Level1–4, login sai/timeout | TM Level1 đọc, Level2 lệnh không critical, Level3 critical trừ security, Level4 tất cả. Native chỉ tài khoản GUEST/SEC3/SEC4, hầu hết edit cần ≥3+Local; không Level2/account management. `login` chỉ báo Invalid khi sai; không đếm ba lần/khóa5 phút, không timer tự logout15 phút trừ Local. Đã kiểm tra login/logout và timer layout/clock để loại khả năng có ở UI khác. | Một phần | TM PDF 124–126,148–149 / 3-6–8,30–31 Table 3-2/§3.6.6/3.6.7.4.5; KT —; `src/lib/simulator-training-accounts.ts::SELEX_DVOR_TRAINING_ACCOUNTS`, STORE::`login/logout`, CONTROL, `PmdtLayout`, CLOCK |
| S02 Phân biệt PMDT link và RCSU link | TM đường direct/modem/RCSU khác nhau; sim dùng **cùng simulation.connected** cho Connected, Remote Control Enabled, RCSU Enabled và đảo nó cho RCSU Error. Không diễn tập được direct PC vẫn connected trong lúc mất cáp RCSU độc lập. | Sai khác | TM PDF 123–127 / 3-5–9 §3.6.5–7/Fig. 3-6; KT PDF 15–16 / in 14–15 II.4; ENG::`data.rmsStatus`, DEF::`simulation`, STORE |
| S03 Apply / Reset F8 / Restore / Backup | TM F8 bỏ sửa không lưu, Restore lấy EEPROM. Native Apply commit draft; cả F8 và menu Restore gọi default factory (hoặc scenario restore), bỏ qua `configurationBackup`; Backup lưu snapshot nhưng không có file Save/Load/Print. Đây là khác biệt chắc chắn dù cấu hình mẫu tình cờ giống backup. | Sai khác | TM PDF 123,141 / 3-5,23 §3.6.4/3.6.7.4; KT —; STORE::`discardConfigChanges/restoreDefaultConfig/backupConfig`, BAR, `PmdtLayout` F8 handler |
| S04 Main selection, Antenna/Load/Off, hot/cold standby | Có phân biệt selectMainTransmitter và route; Antenna đặt một TX onAir và **xóa Load cả hai TX**, nên sau chuyển máy phải đặt lại tải standby; không giữ tự động cấu hình hot standby KT. Load/Off level≥3+Local; menu Transfer không handler, không ghi lý do chuyển máy vào sổ giao ca. | Một phần | TM PDF 175,178 / 3-57,60 §3.6.8.5/7.1; KT PDF 12,21,31,34 / in 11,20,30,33 I/III/IV/V; STORE::`selectMainTransmitter/setTransmitterMode`, MENU/BAR |
| S05 Alarm voting, delay, transfer/shutdown | ENG vote theo cùng tham số primary/secondary với OR/AND; pre-alarm không executive; bypass giữ báo nhưng chặn transfer. STORE đủ delay rồi chuyển TX dự phòng; nếu single/no healthy alternate thì shutdown. Reachable: `PmdtLayout` mount CLOCK → mỗi0.1s gọi `advanceMonitorTime` → `applyAutomaticMonitorTransfer`. Clock **dừng khi tab ẩn, login dialog mở, disconnected hoặc practice locked**; không tương đương bảo vệ phần cứng liên tục, thiếu hai automatic restart theo TM Table 3-3. | Một phần | TM PDF 143,157,175 / 3-25,39,57 Table 3-3/§3.6.8.1.2.2/5; KT PDF 12 / in 11 I; BD PDF 23 / in 22 III.3.8.1; ENG voting, STORE::`monitorProtectionDelay/advanceMonitorTime/applyAutomaticMonitorTransfer`, CLOCK |
| S06 Startup/Shutdown toàn trạm | Không đủ AC/BATT/DC BUS breaker cả hai BCPS, đợi init khoảng20s, kiểm tra Local trước phát, Logoff trước tắt nguồn. Các lệnh Off PMDT có thật nhưng không thay chuỗi nguồn; LCU tách state (§2). | Một phần | TM PDF 119–120,180 / 3-1–2,62 §3.5.1–2/Table 3-4; KT PDF 12 / in 11 I; VIEW::`LcuPanel`, STORE::`setTransmitterMode`, DEF |

**Thống kê §4:** 64 dòng verdict (48 menu/screen, 10 nhóm thông số,
6 luồng hành vi). Khớp: 1; Một phần: 44; Sai khác: 8; Thiếu: 8; Chưa xác minh: 3. Đây là các góc nhìn
chồng lấn, không phải 64 lỗi độc lập.

### 4.5. Năm khoảng trống PMDT ưu tiên

1. **P25/S03:** Restore và F8 khôi phục default thay backup/hủy draft; dạy sai
   thao tác phục hồi sau thay thử tham số (TM PDF 123,141 / 3-5,23;
   BD PDF 24–25 / in 23–24 III.5; STORE/BAR).
2. **P28/L09:** VSWR anten có thể xanh ở 1.26–2.19 thay cảnh báo vấn đề theo
   KT (KT PDF 13–14 / in 12–13 II.2; TM PDF 155,157 / 3-37,39;
   `MonitorSidebandVswr`, DEF). L02–04 cũng chưa phân biệt chuẩn bình thường
   KT với màu/giới hạn executive.
3. **P24/P31/P43/P44:** nhiều menu có vẻ enabled nhưng không làm gì;
   riêng Transfer/Bypass/Ident gây hiểu sai đường thao tác (TM PDF
   150–152,158,175 / 3-32–34,40,57; KT PDF 12,21 / in 11,20; MENU/BAR).
4. **P34:** lịch sử lỗi không phải sự kiện đã bắt giữ; Prior là live, Alarm
   hardcode, Older inert (TM PDF 165–166 / 3-47–48; KT PDF 20–21 / in
   19–20 II.6; `FaultIntegral`).
5. **P02/S02/S05:** direct/modem/RCSU chưa tách, clock bảo vệ dừng theo UI;
   học viên không diễn tập được mất RCSU độc lập/giám sát liên tục (TM PDF
   123–127,143 / 3-5–9,25; KT PDF 15–16 / in 14–15 II.4; ENG/STORE/CLOCK).

## 5. Quy trình bảo dưỡng và khai thác

### 5.1. Quy tắc coverage và chu kỳ

**Coverage là khả năng làm trọn quy trình**, không phải có chữ trên menu.
ID P/L/S ở §4 và K/B/D ở §5 là ID cục bộ của các bảng tương ứng;
không đồng nhất với ID bước Pxx hay gap Kx của §3.
`Một phần` = có bề mặt đọc/chỉnh liên quan nhưng thiếu bước, đo độc lập,
ghi chép hoặc hành vi; `Không` = không diễn tập được tác vụ ấy. Cột `Đặc
thù` phân biệt **PMDT** (có thể mô hình hóa), **Vật lý** (phải có máy đo,
cáp, ESD, công việc thực địa), **Hồ sơ** (phê duyệt/ghi sổ/nghiệm thu) và
**Hỗn hợp**. `Thiếu` ở dòng Vật lý/Hồ sơ nghĩa là **ngoài bề mặt simulator
hiện tại**, không tự động là bug hay yêu cầu simulator thay thiết bị đo thật.
Không dùng giá trị huấn luyện để cấp chứng nhận an toàn, nghiệm thu trạm.

KT quy định hàng ngày/giao ca, hàng tuần (giao ca thứ sáu), hàng tháng
(thứ sáu tuần cuối), hàng quý (thứ sáu tuần cuối quý), và chuyển main/standby
**hai tuần/lần**. KT không có checklist năm riêng. BD quy định nội dung
bảo dưỡng định kỳ nhưng không cho một lịch daily/weekly/yearly độc lập cho
tất cả mục III; **không gán chúng thành “hàng năm” từ TM**. BD IV áp dụng
máy khai thác **trên15 năm**, sideband dùng Tuning CCA kiểm tra cộng hưởng
**3 năm/lần**. TM lịch quarterly/annual được crosswalk riêng ở §5.4.
Nguồn: KT PDF 12,21,31,33–34 / in 11,20,30,32–33 Phần II.I–V;
BD PDF 25 / in 24 IV; TM PDF 199 / 5-1 Table 5-1.

### 5.2. KT — đầy đủ các tác vụ giao ca/ngày/tuần/tháng/quý và biểu mẫu

`Kxx` là dòng coverage tác vụ (không phải số thứ tự mục KT); nhiều chu kỳ
kế thừa cùng tác vụ chỉ tính một lần, kế thừa ghi ở K19/K22. Mọi dòng dùng
native PMDT §4 trừ khi ghi khác. Danh sách đọc không lược bỏ vì màn có sẵn.

| ID / chu kỳ, thủ tục KT | Giá trị/dung sai, danh sách phải đọc/ghi | Học viên làm được? / surface, giới hạn | Đặc thù / Verdict | Citation KT; TM; code |
| --- | --- | --- | --- | --- |
| K01 Ngày/giao ca: trạng thái bình thường I | AC/BATT/DC BUS ON, Main TX1 hoặc2, antenna=main, standby Load nếu hot/Off nếu cold, bypass OFF, Local OFF, Special Test không kích hoạt, Ident Normal; chỉ kiểm máy đang phát anten | Một phần: sidebar/config đọc route/Local/Bypass; breaker/LCU và menu Ident chưa đủ, không checklist xác nhận toàn bộ. | Hỗn hợp / Một phần | KT PDF 12 / in 11 I; TM PDF 119–120,180–184 / 3-1–2,62–66 §§3.5/3.8; `PmdtSidebar`, STORE::`setTransmitterMode`, VIEW::`LcuPanel`, MENU |
| K02 II.1 Trạng thái chung máy phát | Máy nào phát anten, mọi chỉ thị mặt máy/sidebar, ghi tình trạng giao ca | Một phần: sidebar live, mặt module nhiều đèn cố định (§2); không sổ giao ca. | Hỗn hợp / Một phần | KT PDF 12 / in 11 II.1; TM PDF 122,182–184 / 3-4,64–66 Fig. 3-1/Tables 3-5–7; `PmdtSidebar`, FACE, STORE |
| K03 II.2 Thông số máy phát chính | Carrier MHz/W, SB1–4 W (phiếu nhóm1&2/3&4), carrier VSWR, các tần số hiển thị; so ca trước; carrier lấy báo cáo tuần/tháng/quý gần nhất ghi **5 số lẻ** | Một phần: `TxDataMain` hai TX có Power/Frequency/VSWR nhưng MHz4 số lẻ, không giá trị ca trước hay nhập phiếu. | PMDT/Hồ sơ / Một phần | KT PDF 12–13,35,38,41 / in 11–12, biểu BM-KT-DVORA-01/02/03; TM PDF 169 / 3-51 §3.6.8.3.1; `TxDataMain`, ENG::`buildTxPower` |
| K04 II.2 Anten sideband VSWR | Ghi tình trạng **48 anten ≤1.25:1**, vàng tại anten có vấn đề | Một phần nhưng màu không đạt KT: bảng48 đúng, pre2.2/alarm3.0; không thể dùng “xanh” làm pass1.25. | PMDT / Sai khác | KT PDF 13–14 / in 12–13 II.2; TM PDF 155,157 / 3-37,39; `MonitorSidebandVswr`, DEF |
| K05 II.3 Monitor | Monitor1/2: Azimuth, 30HzMod, 9960HzMod, Deviation, RF Level, trạng thái Ident; màn còn IdentMod/Code, TxPower/Freq/Error; ghi **đủ mọi chữ số thập phân hiển thị**, trong giới hạn KT V.5.1 | Một phần: đọc Integral hai cột; không biểu mẫu/ca trước, ngưỡng §4.3 chưa bảo đảm pass chuẩn KT. | PMDT/Hồ sơ / Một phần | KT PDF 10–11,14–15,35 / in 9–10,13–14/BM01; TM PDF 153,159 / 3-35,41; `MonitorIntegral`, DEF/ENG |
| K06 II.4 Kết nối VOR–RCSU | RMS Status: RCSU Communication Error không vàng; nếu có kiểm tra cáp/đường truyền | Một phần: có dòng status nhưng gộp với PMDT link và activeColor đỏ; không cáp độc lập. | Hỗn hợp / Một phần | KT PDF 15–16 / in 14–15 II.4; TM PDF 127 / 3-9 Fig. 3-6; `RmsVorStatus`, ENG::`data.rmsStatus` |
| K07 II.5 RCSU tại trạm | Đọc chỉ thị RCSU sau khi kiểm VOR tốt, nếu Alert điều tra chi tiết | Không: không có mặt RCSU vận hành độc lập; thông tin RCSU trong RMS không thay thiết bị này. | Vật lý / Thiếu | KT PDF 16 / in 15 II.5; TM PDF 204 / 6-4 §6.2.10; `PmdtScreenRouter`, BDAT/FACE, `RmsStatusLayout` |
| K08 II.6 Nhánh khi có cảnh báo | Maintenance Alert mặt máy/sidebar Alert vàng → RMS Maintenance Alerts → Digital I/O nguồn/TX Alerts → TX Status đúng máy → Monitor1 Fault History Integral; không có alert thì bỏ nhánh chi tiết; ghi thêm nội dung sổ giao ca | Một phần: tất cả screen có; Fault History không sự kiện thật, mặt đèn không đồng bộ, thiếu sổ. | Hỗn hợp / Một phần | KT PDF 16–21 / in 15–20 II.6; TM PDF 131,133,165–166,172 / 3-13,15,47–48,54; `RmsMaintenanceAlerts`, `RmsDigitalIo`, `TxStatus`, `FaultIntegral`, FACE |
| K09 Tuần: thời điểm, báo cáo, đổi main | Giao ca thứ sáu; làm cả ngày; đổi TX hai tuần/lần **trước đo**, nếu không đạt thì về TX ban đầu, ghi việc/lý do, BM01 gửi TSS | Một phần: có chọn main/route, không lịch, lý do, tự đánh giá/trở lại theo phiếu; Transfer menu inert. | PMDT/Hồ sơ / Một phần | KT PDF 21–22 / in 20–21 III; TM PDF 199 / 5-1 Table 5-1; STORE::`selectMainTransmitter/setTransmitterMode`, MENU |
| K10 III.1 Carrier | Counter tại Synth J2; fc±0.002%, MHz5 số lẻ, tính sai số và báo TSS nếu vượt; không lấy PMDT thay counter | Một phần: Synth face J2/PMDT frequency có, không cắm counter độc lập/capture5 số. | Vật lý / Một phần | KT PDF 22–23 / in 21–22 III.1; TM PDF 201 / 6-1 §6.2.3; FACE::`SynthesizerFaceplate`, `TxDataMain`, ENG |
| K11 III.2 Synthesizer TX đang anten | DMM TP1=0±0.05V, TP2=2–8V; Carrier PLL Control nếu cần, lặp/ghi cả hai | Một phần: điểm TP và PMDT PLL field có, không DMM phản hồi/chuỗi đạt đồng thời. | Hỗn hợp / Một phần | KT PDF 23–24 / in 22–23 III.2; TM PDF 193 / 3-75 Table 3-15; FACE::`SynthesizerFaceplate`, `TxConfigOffsets`, ENG |
| K12 III.3 Sideband TX1 A1/A2 hoặc TX2 A6/A7 | TP1/7=0.900–0.950V; TP5/11=0.890–0.910V; TP4/10=2–9V, TP3/9 ghi tham chiếu; TP2/8 ảnh waveform/điện áp đỉnh, chỉnh R1/R4 khi cần | Một phần: face và trim dialog có, không đo toàn TP/waveform/ghi file; model tách PMDT (§3). | Hỗn hợp / Một phần | KT PDF 24–25,36 / in 23–24/BM01; TM PDF 191–192 / 3-73–74 Fig. 3-70/Table 3-14; FACE::`SidebandFaceplate`, `readSidebandTrim/SidebandAdjustmentDialog` |
| K13 III.4 Tín hiệu tổng hợp | Oscilloscope tại **Monitor CCA J3**, ghi đỉnh/trạng thái, ảnh waveform; ví dụ90° không phải góc nominal mọi trạm | Một phần: có J3/menu TestSignal không action, không oscilloscope waveform. Phiếu lại ghi TP3, chưa tự sửa (D08/Q14). | Vật lý / Một phần | KT PDF 25–27,36 / in 24–26/BM01; TM PDF 168,187 / 3-50,69 §3.6.8.2.5/Table 3-10; FACE::`MonitorFaceplate`, MENU::`testSignalItems` |
| K14 III.5 RF Monitor | DMM TP1 CSB FWD, TP2 CSB REFL, TP3 Standby TX; ghi VDC so lần trước | Một phần: face/labels có, R/TP chưa thành đo độc lập, không lịch sử đối chiếu. | Vật lý / Một phần | KT PDF 27 / in 26 III.5; TM PDF 195 / 3-77 Table 3-17; FACE::`RfMonitorFaceplate`, ENG |
| K15 III.6 CSB SAMPLE | Oscilloscope tại **Carrier PA P1** TX1/2, ảnh/điện áp đỉnh/trạng thái | Một phần: P1 có nhãn, không scope/capture waveform. | Vật lý / Một phần | KT PDF 27–28,36 / in 26–27/BM01; TM PDF 190 / 3-72 Table 3-13; FACE::`CarrierFaceplate`, `PmdtScreenRouter` |
| K16 III.7 RMS | Status; PowerSupply: +3.3,+5,±12,+15,+24, TX1/2 48V PS, Battery1/2 trong giới hạn; Digital I/O tất cả input/output/TX alerts; đánh Tốt/SC | Một phần: đọc đủ các screen, nhiều nguồn là dữ liệu mẫu chứ không sensor/đồng hồ; không phiếu Tốt/SC. | PMDT/Hồ sơ / Một phần | KT PDF 28–30,36 / in 27–29/BM01; TM PDF 127–135 / 3-9–17 §3.6.7.1–2; `RmsStatusLayout`, `RmsPowerSupply`, `RmsDigitalIo`, ENG |
| K17 III.8 RSU/radio tại Tower | So đèn RSU với VOR/DME đang hoạt động, ghi Main/Standby/Alert/CommFail riêng VOR và DME, chụp ảnh | Không: không RSU/Tower/radio surface liên kết; không gộp thành RCSU trong RMS. | Vật lý / Thiếu | KT PDF 31,37 / in 30/BM01; TM PDF 127,204 / 3-9,6-4 (RCSU, không xác định RSU trạm); `PmdtScreenRouter`, BDAT/FACE; Q11 |
| K18 Tháng IV.1 Monitor1 Test Results | Completed và In Process, ghi/chụp kết quả limits/tests; BM02 gửi TSS | Một phần: hai tab có sáu cột đúng nhóm; không chạy chu kỳ/bắt snapshot Completed thật, thiếu xuất báo cáo. | PMDT/Hồ sơ / Một phần | KT PDF 31–33,40 / in 30–32/BM02; TM PDF 161–163 / 3-43–45; `MonitorTestResults/buildTestRows`, ENG |
| K19 Tháng IV.2 Monitor2 + kế thừa | Lặp cả Completed/In Process Monitor2; làm K01–K17, đổi TX hai tuần/lần/ghi lý do; tháng ghi BM02, đánh giá dịch vụ và ký | Một phần: menu Monitor2 dùng cùng renderer chọn từ path, không mất nhánh2; không hồ sơ/chu kỳ. | PMDT/Hồ sơ / Một phần | KT PDF 31–33,38–40 / in 30–32/BM02; TM PDF 158,161–164 / 3-40,43–46; `monitorItems(2)`, `MonitorTestResults::monitorNumberFromPath`, STORE |
| K20 Quý V.1 DC | DMM tại E1/E3 1A3 BCPS1/2 +48V (**phiếu42–52V**), E5/E1 1A5 charger +55V (**51–56V**); mọi DC Power LED sáng, ghi VDC | Một phần: RMS Power/face LED không thay đo đầu cực; không terminal workflow; đối chiếu BD khác dải/đầu đo ở D05. | Vật lý / Một phần | KT PDF 34,43 / in 33/BM03; TM PDF 185 / 3-67 Table 3-8; FACE::`BcpsFaceplate`, `RmsPowerSupply` |
| K21 Quý V.2 Radio link nếu có | Kiểm ngoài anten/modem radio, đánh Tốt/SC; không yêu cầu tác vụ nếu không có link | Không: không anten/modem kiểm tra trực quan trong surface native; applicability chưa biết Q11. | Vật lý / Thiếu | KT PDF 34,43–44 / in 33/BM03; TM PDF 123–125 / 3-5–7 §3.6.5–6 (modem); MENU/`PmdtScreenRouter` |
| K22 Quý: kế thừa và giao ca | Làm tất cả ngày/tuần/tháng, đổi TX hai tuần/lần/ghi lý do, BM03; đánh giá quý/dịch vụ, chữ ký người kiểm tra/đài trưởng | Một phần: các surface K01–K20 có một phần; không tự kế thừa checklist/lịch/đánh giá/ký. | Hồ sơ / Một phần | KT PDF 33–34,41–44 / in 32–33/BM03; TM PDF 199 / 5-1 §5.3; STORE evidence/scenario, `PmdtLayout` |
| K23 Phiếu đọc ngày BM01/02/03 | Tên đài, ngày/giờ/kỳ, main TX/tốt-SC/hướng chuyển hoặc không TH; CarrierMHz/W, SB1&2/SB3&4 W, CarrierVSWR; Monitor1/2 sáu mục K05, VSWR anten và RCSU | Một phần: đọc phần lớn trên P07/P26/P28/P37, không mẫu/so ca trước/đánh giá/ký/gửi; không ép group SB thành một số nếu chưa rõ Q12. | Hồ sơ / Một phần | KT PDF 35,38,41 / BM01/02/03 phần1 (trang biểu không cùng mẫu số34); TM PDF 199 / 5-1 §5.3; `TxDataMain`, `MonitorIntegral`, `MonitorSidebandVswr`, STORE evidence |
| K24 Phiếu tuần, tháng, quý — reading list bổ sung | Tuần: J2/error%, SynthTP1/2; SBTP1–11 (TP2/8 ảnh, TP3/6/9 ô ref/không cho số), composite đỉnh/ảnh, RF TP1–3 lần trước/lần này, CSB P1 đỉnh/ảnh, RMS Tốt/SC, RSU VOR/DME; tháng thêm4 ảnh tests; quý thêm4 số DC/radio | Một phần: screen/model có một phần nhưng không workspace nhập/đính ảnh BM01/02/03; không bịa tolerance cho ô không ghi chuẩn. | Hồ sơ / Một phần | KT PDF 36–37,39–40,42–44 / BM01/02/03 phần2–4; TM PDF 199 / 5-1 §5.3; FACE, `MonitorTestResults`, `RmsPowerSupply`, STORE evidence |

### 5.3. BD — toàn bộ nội dung định kỳ, điều kiện và biểu kết quả

BD Phần2 đánh số I/II/III/IV; bảng dưới dùng `Bxx` để phân biệt ID coverage
với số mục văn bản. Đã mở ảnh BD PDF 20 / in 19 III.3.4 để phân biệt
bước fine 1° với lỗi đọc text thành 10° (`bd-detail-20.png` cùng thư mục ảnh).
Mục III.3.1–3.10 không bị thay bằng bảng HC §3:
**BD dùng SB1 TX tương ứng làm tham chiếu công suất**, HC thay SB có bước
lấy SB3; phải giữ đúng ngữ cảnh. Đầu nối/mã assembly mâu thuẫn vẫn mở Q1/Q5.

| ID / mục BD | Phải làm/đọc/ghi, nominal và tolerance | Học viên làm được? / surface, giới hạn | Đặc thù / Verdict | Citation BD; TM; code |
| --- | --- | --- | --- | --- |
| B01 Phần1 III.3.1–3.4 và workflow bước1 | Kế hoạch/phân công/người đủ năng định, rủi ro/an toàn/ESD/PPE, máy đo còn hiệu chuẩn; lưu cấu hình ổ tại chỗ +1 bộ nhớ ngoài | Không có quy trình phê duyệt/ESD/PPE/kiểm chuẩn; Training HUD không cấp năng định; Save disabled. | Hồ sơ/Vật lý / Thiếu | BD PDF 6–8,10–11 / in 5–7,9–10 III/workflow; TM PDF 17,199 / xv,5-1 Safety/§5.3; `PmdtLayout`, MENU::`system-config-save` |
| B02 Workflow bước2–5, Phần2 I | Bảo dưỡng → kiểm chuẩn; không đạt làm lại → nghiệm thu BM-TT-03/BM-MH-06/bảng kết quả/danh mục vật tư → lưu hồ sơ; trước tắt AC/DC phải RMS Backup | Một phần: có Backup/evidence, không tài liệu phê duyệt/nghiệm thu/lưu hồ sơ chính thức; không interlock nguồn. | Hồ sơ / Một phần | BD PDF 11–13 / in 10–12 workflow2–5/I; TM PDF 141,199 / 3-23,5-1; STORE::`backupConfig`, VIEW/FACE |
| B03 Phần2 II thông tin chung/thiết bị đo | Ghi tên đài/frequency/ident, nhãn Equipment Model/Serial/P-N/REV, version RMS/PMDT/Monitor/Audio/BCPS TX1/2; danh mục scope/counter/DMM/wattmeter/elements250 W/5 W/dummy5 W và hạn hiệu chuẩn | Một phần: RMS revisions/station có dữ liệu mẫu; nhãn face dùng mã hình (§2), không nhãn thật/biểu đo/hạn hiệu chuẩn. | Hồ sơ / Một phần | BD PDF 13,31–32 / in 12/biểu I–II; TM PDF 129–130 / 3-11–12; `RmsStatusLayout`, `RmsConfigStationTab`, FACE::`PartNumber` |
| B04 III.1.1 Anten phát/giàn phản xạ | Hai TX tắt, dây an toàn; radome/nước/hư hỏng, cáp RF/connectors ăn mòn/nứt/lỏng, sinh vật; ghi tình trạng và sửa/thay khi cần | Không: ảnh cabinet/diagram không phải inspection thực địa/radome state. | Vật lý / Thiếu | BD PDF 13–14,32 / in 12–13/biểuIII.1; TM PDF 205 / 6-5 §6.3.1; BDAT/VIEW, `PmdtScreenRouter` |
| B05 III.1.2 Anten field monitor | Kiểm hư hỏng/nước/cáp/đầu nối và ghi, không tự đồng nhất với anten phát | Không có mặt kiểm tra field antenna/cáp riêng; cấu hình attenuation không thay inspection. | Vật lý / Thiếu | BD PDF 14,32 / in 13/biểuIII.1; TM PDF 205 / 6-5 §6.3.1; VIEW/BDAT, `MonitorAlarmLimits` |
| B06 III.2.1 AC | DMM AC Monitor TB3-1/TB3-2, **220 VAC±10%**, ghi | Một phần: RMS Power có đọc AC nhưng không DMM/TB3/cách ly nguồn; không chứng nhận đo điện lưới. | Vật lý / Một phần | BD PDF 14,32 / in 13/biểuIII.2.1; TM PDF 180,185 / 3-62,67 Tables 3-4/8; `RmsPowerSupply`, FACE::`BcpsFaceplate` |
| B07 III.2.2 DC hai BCPS | BCPS1 E3/E2, BCPS2 E7/E2=**45–52V**; charger E1/E2 và E5/E6=**51–55V**; mọi DC PWR LED; ngoài dải gửi sửa. Biểu còn ghi45–53, xem D05 | Một phần: đọc RMS/face, không terminal/DMM/điện áp charge riêng đo độc lập; không quy trình gửi sửa. | Vật lý / Một phần | BD PDF 14–15,32 / in 13–14/biểuIII.2.2; TM PDF 185,206 / 3-67,6-6 Table 3-8/§6.4.1; `RmsPowerSupply`, FACE::`BcpsFaceplate` |
| B08 III.3.1 Carrier TX1/2 | Counter SynthJ2 TX1, J8 khối1A20 TX2 theo BD; fc±0.002%; tính(error/fc)×100%, ghi MHz**5 số lẻ** | Một phần: có carrier đọc/face, không counter độc lập/J8 sequence/sai số phiếu. | Vật lý / Một phần | BD PDF 15,32–33 / in 14/biểuIII.3.1; TM PDF 201 / 6-1 §6.2.3; FACE::`SynthesizerFaceplate`, `TxDataMain` |
| B09 III.3.1 LSB/USB khi nghi ngờ | Counter+attenuator20 dB, tháo/nối J25 SB1/2, TX1/2 lần lượt; ghiMHz5 số lẻ, biểu±0.002%, khôi phục cáp sau đo | Một phần: đọc LSB/USB trong PMDT, không instrument/cable topology/điều kiện nghi ngờ; không thay đo RF thực. | Vật lý / Một phần | BD PDF 16,33 / in 15/biểuIII.3.1; TM PDF 202 / 6-2 §6.2.5; `TxDataMain`, ENG, VIEW |
| B10 III.3.2 Audio/Ident khi nghi ngờ | Extender+counter/scope: AudioTP8 360sine, TP20 360cos, TP24 30Hzref, TP2 1020Ident Continuous; biểu±1%/các dòng360/30 ghi+1%; cả TX; trả Ident bình thường | Một phần: Audio card/PMDT nominal/keyer có, Continuous menu disabled, không extender/counter/scope/đếm bốn tín hiệu. | Vật lý / Một phần | BD PDF 16–17,33 / in 15–16/biểuIII.3.2; TM PDF 188,175 / 3-70,57 Table 3-11/§3.6.8.5; FACE::`AudioGeneratorFaceplate`, MENU, `TxConfigNominal` |
| B11 III.3.3 Carrier power | Wattmeter/element250 W so PMDT TX1/2, chỉnh Nominal/OutputPowerScale tới công suất yêu cầu trạm; ghiW | Một phần: config/Power có, không meter độc lập/cáp; Load RF bằng0 (§3 K1). Không bịa công suất yêu cầu trạm. | Hỗn hợp / Một phần | BD PDF 17–18,33 / in 16–17/biểuIII.3.3; TM PDF 203,210 / 6-3,10 §§6.2.8/6.4.6; `TxConfigNominal/TxConfigOffsets`, ENG::`buildTxPower` |
| B12 III.3.3 SB1–4 power | Wattmeter element5 W; **SB1 TX1 làm chuẩn SB2–4 TX1**, SB1 TX2 làm chuẩnTX2; R3/R6 chỉnhpower, R2/R5 khớpPMDT; J25/J26 và nối lại từng cáp; ghi8 số W | Một phần: trim dialog có nhưng detached, không giữ reference/cable/instrument chain; đọc Load không đúng; không gộp quy trình HC. | Hỗn hợp / Một phần | BD PDF 18–19,33 / in 17–18/biểuIII.3.3; TM PDF 210 / 6-10 §6.4.6; `SidebandAdjustmentDialog/readSidebandTrim`, `TxDataMain`, ENG |
| B13 III.3.4 Carrier-to-SB phase | Scope J2/J3 Sync của1A4A3; coarse bước90°, fine±45° **bước 1°** (ký hiệu 1⁰, không phải 10°), cực đại9960mod, cả TX; ghi coarse/fine và SB phase1–4 | Một phần: PMDT coarse/fine và mô hình9960 có, không scope/chụp waveform/điểm cực đại đo độc lập. | Hỗn hợp / Một phần | BD PDF 19–20,33 / in 18–19/biểuIII.3.4; TM PDF 211 / 6-11 §6.4.9; `TxConfigOffsets`, ENG::`effectiveTransmitter`, FACE |
| B14 III.3.5 Synth | DMM TP1=0±0.05V, TP2=2–8V, chỉnh CarrierPLL/lặp; TP3 ref ghi; cả TX1/2 | Một phần: field PLL/TP có, không phản hồi DMM TP1/2/3 theo field để nghiệm thu. | Hỗn hợp / Một phần | BD PDF 20–21,34 / in 19–20/biểuIII.3.5; TM PDF 193,212 / 3-75,6-12 Table 3-15/§6.4.12; `TxConfigOffsets`, FACE::`SynthesizerFaceplate`, ENG |
| B15 III.3.6 TP1–11 bốn Sideband | TP1/7 .90–.95V, TP4/10 **2–9V**, TP5/11 **.89–.91V**, TP6 **0±.05V**; TP3/9 reference; R1/R4, PMDT SB Phase; cả bốn assembly | Một phần: nhãn/trim/PMDT có nhưng không tất cảđiểm đo; biểu khác2–8V/.9±.05 (D06), không âm thầm lấy biểu thay bước. | Hỗn hợp / Một phần | BD PDF 21–22,34–35 / in 20–21/biểuIII.3.6; TM PDF 192,215 / 3-74,6-15 Table 3-14/§6.4.24; FACE::`SidebandFaceplate`, `SidebandAdjustmentDialog`, `TxConfigOffsets` |
| B16 III.3.6 waveform + Appendix1 | Scope TP2/TP8 đủ A1/A2/A6/A7, lưu 8 waveform; phụ lục thay1A4A1/R1/R4 rồi scale100/SB1–2 power/Backup, TP6 phụ lục±.1V khác thân±.05 | Một phần: có trim/model, không scope/waveform/sequence; câu chưa thống nhất giữ Q14, HC±.05 ở §3 ưu tiên cho thay/hiệu chỉnh. | Hỗn hợp / Một phần | BD PDF 21–22,28,35 / in 20–21,27/biểuIII.3.6; TM PDF 192,215 / 3-74,6-15; `readSidebandTrim/SidebandAdjustmentDialog`, STORE::`backupConfig` |
| B17 III.3.7 RF Monitor | DMM TP1 CSB FWD/TP2 CSB REFL/TP3 Standby TX, cả TX1/2, ghiVDC tham chiếu lần trước; không đưa tolerance chưa có | Một phần: face nhãn có, không DMM/đối chiếu độc lập/phiếu lịch sử. | Vật lý / Một phần | BD PDF 22,35–36 / in 21/biểuIII.3.7; TM PDF 195 / 3-77 Table 3-17; FACE::`RfMonitorFaceplate`, ENG |
| B18 III.3.8.1 RCSU | Rút/nối cáp kiểm ComFault/âm báo, Normal/Alarm; gây lỗi monitor kiểm shutdownTX1/chuyểnTX2; ghi đèn/âm | Một phần: STORE có automatic transfer; không cáp/RCSU/âm báo riêng, link gộp(S02); không tái hiện full procedure. Chỉ mô tả audit, không yêu cầu Hoàng tạo lỗi. | Hỗn hợp / Một phần | BD PDF 23,36 / in 22/biểuIII.3.8.1; TM PDF 203–204 / 6-3–4 §§6.2.7/10; STORE::`applyAutomaticMonitorTransfer`, CLOCK, ENG::`data.rmsStatus` |
| B19 III.3.8.2 PMDT qua RCSU2238/2240 | Ngắt kết nối local rồi connect quaRCSU, ghi Connect to VOR | Không: không lựa chọn direct/remote đường truyền riêng; login không thay thế bước này. | PMDT/Vật lý / Thiếu | BD PDF 23,36 / in 22/biểuIII.3.8.2; TM PDF 123–126 / 3-5–8 §3.6.5–6; MENU/BAR, DEF::`simulation.connected` |
| B20 III.3.9 Ắc quy | Hệ48V=4×12V, mấtAC thấy OnBattery/PowerFail/RCSU; chạy tối thiểu 20 phút, nếu xuống46V (11.5/bình) khôi phục nguồn ngay, xác nhận hết cảnh báo/ghi | Một phần: có hàng nguồn/alert, không tích phân xả/thời gian/thử tải/điện áp từng bình hay RCSU. Không chứng minh dung lượng thực bằng sim. | Vật lý / Một phần | BD PDF 23–24,36 / in 22–23/biểuIII.3.9; TM PDF 201 / 6-1 §6.2.1; `RmsPowerSupply/RmsDigitalIo`, ENG, DEF |
| B21 III.3.10 + Appendix2 Tĩnh không | Khảo sát bán kính300m, theo sơ đồ/tiêu chuẩn EUROCAE phụ lục2, ghi có/không và mô tả/báo TSS nếu phát sinh vật cản | Không: không địa hình/vật cản/khoảng cách/biểu kiểm tra. Không chuyển thành bài chỉ nhìn blockdiagram. | Vật lý / Thiếu | BD PDF 24,29–30,37 / in 23,28–29/biểuIII.3.10; TM PDF 205 / 6-5 §6.3.1; VIEW::`DvorReferenceDiagrams`, `PmdtScreenRouter` |
| B22 III.4a Backup | Lưu EEPROM bằng RMS Config Backup trước tắt nguồn/sau bảo dưỡng; ghiOK | Một phần: Backup snapshot có, không EEPROM/reboot thật; scenario chặn backup có chủ ý, không coi kết quả scenario là backup trạm. | PMDT / Một phần | BD PDF 13,24,37 / in 12,23/biểu4; TM PDF 141 / 3-23 §3.6.7.4; STORE::`backupConfig` |
| B23 III.4b Save | Sau backup, Save tên `VORBD_lan…`, thư mục `D:\DVOR-DME Config\Baoduong\Nam20…`; lưu ổ tại chỗ và ngoài | Không: menu Save disabled; profile persistence không tạo file/đường dẫn/nhân bản theo BD. | PMDT/Hồ sơ / Thiếu | BD PDF 6,24,37 / in 5,23/biểu4; TM PDF 141 / 3-23 §3.6.7.4; MENU::`system-config-save`, STORE::`backupConfig` |
| B24 III.4c Print | RMS data/config, Monitor config/data, Transmitter data/config; ghiOK | Không: Print Configuration disabled, toolbar Print/Copy không handler. | PMDT/Hồ sơ / Thiếu | BD PDF 24,37 / in 23/biểu4; TM PDF 123,141,199 / 3-5,23,5-1 §§3.6.4/7.4/5.3; MENU, BAR::`PmdtToolbar` |
| B25 III.5.1 Carrier trial | Ghi baseline, Nominal OutputPower+10 W rồi−10 W, quan sátTX1/2, ghi trước/sau; RMSRestore lại cấu hình đã backup | Một phần: chỉnh/Apply/Power đọc có; Restore vềdefault, không về baseline đã backup. Shared Nominal haiTX cần giữ đúng bước và tham chiếu phiếu. | PMDT/Hồ sơ / Sai khác | BD PDF 24,37–38 / in 23/biểu5.1; TM PDF 141,178 / 3-23,60; `TxConfigNominal`, ENG::`effectiveTransmitter`, STORE::`restoreDefaultConfig` |
| B26 III.5.2 SBO trial | Ghi9960mod banđầu; SBO RFLevel±3%, TX1 rồiTX2 anten, ghi response%; Restore | Một phần: mô hình thay9960 và routing có, không độc lậpRF/phiếu; Restore không phục hồi backup. | PMDT/Hồ sơ / Sai khác | BD PDF 24–25,38 / in 23–24/biểu5.2; TM PDF 141,179 / 3-23,61; `TxConfigNominal`, ENG::`effectiveTransmitter`, STORE::`restoreDefaultConfig` |
| B27 III.5.3 Reference trial | Ghi30Hzmod; ReferenceMod±3% lần lượt TX1/2, ghiresponse; Restore; biểu ghi nhầm giảm SBO(D07) | Một phần: mô hình30Hz có nhưng không phiếu/Restore từ backup; làm theo thân quy trình Reference, không SBO trong ô in nhầm. | PMDT/Hồ sơ / Sai khác | BD PDF 25,38 / in 24/biểu5.3; TM PDF 141,179 / 3-23,61; `TxConfigNominal`, ENG::`effectiveTransmitter`, STORE::`restoreDefaultConfig` |
| B28 IV.1 Carrier resonance (>15 năm) | VNA centerfc/span5 MHz/S11/LogMag/markerfc, OSL calibration, tắt nguồn/tháo cáp; **VSWR≤1.2 / giá trị S11≤−20.8 dB**; chỉnhC/tuningstub/thaystub, ghi | Không: không VNA/OSL/stub/đồ thị resonance; GroundCheck không thay S11. | Vật lý / Thiếu | BD PDF 25–26,38 / in 24–25/biểuIV.1; TM PDF 202 / 6-2 §6.2.6 (antenVSWR, khác phương pháp); VIEW/BDAT, `TxGroundCheck` |
| B29 IV.2 SB resonance (>15 năm, Tuning CCA3 năm/lần) | VNA nhưB28; tải50Ω−5 W kiểm50±1Ω, anten#1 với tải tại#2/#3/#47/#48; chỉnhC3/C5/thayTuning CCA, lặp48anten; VSWR≤1.2/S11≤−20.8 dB; ghi 48 số | Không: bảng48VSWR không phải sweepVNA/tải lân cận/tuning. | Vật lý / Thiếu | BD PDF 25–26,38–39 / in 24–25/biểuIV.2; TM PDF 202 / 6-2 §6.2.6; `MonitorSidebandVswr`, VIEW/BDAT |
| B30 IV.3 Pin RMS | Save trước, tắt nguồn/ESD/rútRMS/DMM, pin≥2.9V ở20±5°C, dưới thì thay; nạp file/kiểmMonitor/date/settime/Backup | Một phần: RMS/PMDT đọc/Backup có; không tháo pin/DMM, Load/SetDate không có; biểu `>2.9` khác thân`≥2.9`(D07). | Hỗn hợp / Một phần | BD PDF 26–27,39 / in 25–26/biểuIV.3; TM PDF 141,150 / 3-23,32; MENU, STORE::`backupConfig`, FACE::`RmsFaceplate`, `RmsStatusLayout` |
| B31 Bảng kết quả bảo dưỡng toàn bộ | Trước/sau, giá trị tham chiếu, chữ kýđài trưởng/bênBD; waveform TX1/TX2 composite; RF/Synth/SB/power/phase; trạng tháiRCSU/battery/tĩnh không; tên file/print/trials/VNA48/pin | Một phần: có đọc/chỉnh và evidence huấn luyện, không form/ảnh/measurement provenance/biên bản/ký/lưu hồ sơ theo BD; không dùng logsim thay chứng từ. | Hồ sơ / Một phần | BD PDF 31–39 / biểuI–IV; TM PDF 199 / 5-1 §5.3; STORE evidence/`parameterChangeLogs`, `PmdtLayout`, MENU/BAR |

### 5.4. Lịch TM quarterly/annual và khác biệt nguồn

Crosswalk **mọi dòng** Table 5-1, không tự thêm mười dòng verdict trùng
coverage BD/KT: quarterly auto-transfer → B18/S05; reassign main/standby →
K09/K19/K22; RCSU → B18–19. Annual physical inspections → B04–05/B21;
carrier output power → B11; station ident → B10/K01/K05; antenna VSWR →
K04/B28–29; battery backup transfer → B20; carrier frequency → B08/K10;
operating frequency → B09; BITE wattmeter calibration → B11–12/§3;
BITE frequency counter calibration → B08–09/§3; BITE VSWR calibration →
§3 RF Monitor/B17. Nguồn: TM PDF 199 / 5-1 Table 5-1, §§6.2.1–11,
6.3.1/6.4.4–6; chính Table 5-1 dẫn Carrier Output Power tới6.2.2 trong khi
6.2.2 thực tế là alert/parameter screen, còn6.2.8 là carrierpower
(TM PDF 201,203 / 6-1,3). Giữ phân biệt, không sửa tài liệu gốc.

| ID | Khác biệt/mâu thuẫn và quyết định audit |
| --- | --- |
| D01 Chu kỳ | TM PDF 199 / 5-1 Table 5-1: quarterly changeover/auto-transfer/RCSU, annual các phép đo còn lại. KT PDF 21,31,33–34 / in 20,30,32–33 III–V thêm ngày/tuần/tháng/quý và **đổi main/standby hai tuần/lần**. Theo KT cho khai thác; BD PDF 25 / in 24 IV quy định >15 năm/Tuning CCA ba năm. Không gọi tất cả BD III là annual. |
| D02 VSWR/ngưỡng bình thường | KT PDF 10,13–14 / in 9,12–13 V.5.1a/II.2: VSWR thiết bị≤1.2, kiểm 48 anten≤1.25. TM PDF 155,157 / 3-37,39 cho profile pre1.5/alarm3.0 và số anten alarm1. Mức kiểm tra và relay không cùng khái niệm. Theo KT khi chấm đọc ngày, không lấy hình TM nâng chuẩn pass lên3.0. Cấu hình pre/alarm trạm hỏi Q10; không gọi ảnh TM là default. |
| D03 Giá trị monitor | KT PDF 10 / in 9 V.5.1a: Mod28–32, Dev16±1, frequency±.002%. TM PDF 157 / 3-39 Fig. 3-35 là ảnh cấu hình (Mod28/32, Dev15/17, Freq±20ppm tương thích biên KT), không xác định default trạm. DEF Mod23/37, Dev12.6/19 không được chứng minh là pass KT. Nominal/pre/timer chưa được KT định nghĩa thì hỏi Q10 thay suy đoán. |
| D04 Điện/battery | BD PDF 14–15,23–24 / in 13–14,22–23: AC220±10%, DC45–52/charge51–55, xả tối thiểu20 phút và dừng ở46V. TM PDF 201 / 6-1 §6.2.1 kiểm chuyển sang battery và cảnh báo, không có bước20 phút/46V. Theo BD, không lấy test TM ngắn làm đủ B20. |
| D05 Mâu thuẫn DC giữa HDCV và trong BD | KT PDF 34,43 / in 33/BM03 ghi E1/E3 1A3 42–52V; charge E5/E1 1A5 51–56V. BD PDF 14–15 / in 13–14 III.2.2 ghi E3/E2,E7/E2 45–52V; E1/E2,E5/E6 51–55V; **BD biểu PDF 32 lại45–53V**. TM PDF 206–207 / 6-6–7 §6.4.1 hiệu chỉnh BCPS là ngữ cảnh khác. Mỗi thủ tục theo HDCV tương ứng, không trộn đầu đo/range; nội bộ BD chưa giải được → Q14, không tự thống nhất. |
| D06 Sideband TP | BD thân PDF 21–22 / in 20–21 III.3.6: TP4/10=2–9V, TP5/11=.89–.91V, TP6±.05V; biểu PDF 34–35 ghi2–8/.9±.05; Appendix PDF 28 / in 27 TP6±.1. TM PDF 192 / 3-74 Table 3-14 có2–8/.9±.05/±.1, nhưng TM procedure PDF 215 / 6-15 §6.4.24 dùng2–9V. Mô tả cả hai, theo thân BD cho bảo dưỡng/HC cho hiệu chỉnh (§3 C1–2); xác nhận biểu đang áp dụng Q14, không gán một nhãn “đã khớp” chung. |
| D07 Lỗi/mức biên biểu | BD PDF 25 / in 24 III.5.3 yêu cầu Reference Mod±3%, biểu PDF 38 lại ghi “Giảm SBO RF level” trong bảng30Hz; dùng thân Reference, không dạy giảm SBO để đo30Hz. BD PDF 26 / in 25 pin≥2.9V, biểu PDF 39 ghi>2.9; resonance thân≤1.2 còn biểu PDF 38 `<1.2`. Không bịa quyết định ở đúng biên: Q8/Q14. TM không giải lỗi biểu này. |
| D08 Nhãn/điểm đo KT | KT PDF 14 / in 13 ghi Monitors→Data→**Integrity**, ảnh PDF 15 và TM PDF 153 / 3-35 Fig. 3-31 là **Integral**; nhận diện cùng màn nhưng giữ khác biệt nhãn để hỏi Q9. KT thân PDF 25–27 / in 24–26 composite tại **J3**, biểu PDF 36/39/42 gọi **TP3**. TM PDF 168,187 / 3-50,69 xác nhận J3 test output; chưa tự hướng dẫn cắm TP3 thay J3 → Q14. |
| D09 Power/calibration context | BD PDF 18–19 / in 17–18 III.3.3 dùng SB1 TX tương ứng làm chuẩn; HC PDF 17–18 / in 16–17 IV.3 có reference SB3 khi thay; TM PDF 210 / 6-10 §6.4.6 là BITE power calibration. Theo từng HDCV/ngữ cảnh, không coi khác reference tự động là lỗi. Tương tự BD cho Carrier PLL theo DMM (PDF 20–21), HC thay Synth yêu cầu gửi sửa (§3 C4); không lấy HC thay thế để xóa bước BD. |

### 5.5. Năm khoảng trống quy trình ưu tiên

1. **B25–27:** thử±10 W/±3% không kết thúc đúng bằng Restore từ backup
   (BD PDF 24–25 / in 23–24 III.5; TM PDF 141/3-23; STORE::`restoreDefaultConfig`).
2. **K08/B18:** điều tra alert/lịch sử và thử RCSU bị chặn bởi FaultHistory
   mẫu, link gộp, thiếuRCSU; automatic-transfer có engine nhưng không đủ
   workflow kiểm chứng (KT PDF 16–21/ in 15–20 II.6; BD PDF 23/ in 22 III.3.8;
   TM PDF 165–166/3-47–48; `FaultIntegral`, ENG/STORE/CLOCK).
3. **K03–05/K23–24/B31:** thiếu phiếu/giá trị ca trước, provenance và độ chính xác
   5 số MHz; màuVSWR không chấm được chuẩn≤1.25 (KT PDF 13–15,35–44/
   in 12–14/BM01–03; BD PDF 31–39/biểu; TM PDF 199/5-1; `TxDataMain`,
   `MonitorSidebandVswr`, STORE evidence).
4. **B23–24/B30:** không Save/Load/Print/SetTime, nên thiếu cả lưu hồ sơ sau BD
   và khôi phục sau pin RMS (BD PDF 24,26–27/ in 23,25–26; TM PDF 141,150/
   3-23,32; MENU/BAR). Profile không thay fileBD.
5. **K10–15/K20/B06–17/B20/B28–30:** chỉ có nhãnTP/giá trị mô hình, không
   chuỗi DMM/counter/scope/wattmeter/VNA/battery/tải và ảnh đo. Đây chủ yếu là
   **giới hạn đào tạo vật lý**, phải ghi rõ trước khi dùngsim thay thực hành
   (KT PDF 22–28,34/ in 21–27,33; BD PDF 14–27/ in 13–26;
   TM PDF 201–215/6-1–15; FACE/ENG/`SidebandAdjustmentDialog`).

### 5.6. Số lượng coverage

**Thống kê §5:** 55 dòng coverage/verdict. Khớp: 0; Một phần: 39; Sai khác: 4; Thiếu: 12; Chưa xác minh: 0.
Không cộng bảng crosswalk/conflict thành verdict mới.

Bảng KT có **24 tác vụ** (K01–K24): 0 trọn vẹn, 21 một phần, 3 không
(K07/K17/K21). Bảng BD có **31 tác vụ** (B01–B31): 0 trọn vẹn, 22 một phần,
9 không (B01/B04/B05/B19/B21/B23/B24/B28/B29).
“Một phần” có thể mang verdict **Sai khác** khi một
bước trọng yếu sai, không có nghĩa workflow đủ chuẩn. Các chu kỳ kế thừa,
menu trùng và crosswalk TM không cộng thành thêm phép đo độc lập.

## 6. Tổng hợp khoảng trống

### 6.1. Danh sách ưu tiên đã khử trùng

Đơn vị đếm là **25 nhóm nguyên nhân/phạm vi sửa**, không phải tổng verdict
của §1–§5. Restore xuất hiện ở §3 P18, §4 P25/S03 và §5 B25–B27 nhưng chỉ
có G01. State LCU, LED module, topology và bài đo có đường chạy/nghiệm thu
khác nhau nên tách nhóm. ID bảng luôn kèm mục để tránh nhầm Pxx §3 với §4.

**Cao:** có thể dạy sai số đọc, nhận diện, giá trị hoặc thủ tục then chốt/an
toàn. **Trung bình:** thiếu thực hành hoàn chỉnh nhưng có thể khoanh rõ giới
hạn. **Thấp:** chủ yếu bố cục/nhận diện vị trí, chưa có bằng chứng gây sai
chức năng. Đây là tác động giảng dạy, không phải đánh giá an toàn trạm thật.
Điểm nguồn chưa giải được phải chốt §7, không tự biến thành default sửa.

| # | Mức ưu tiên | Khoảng trống | Nguồn | Code | Gợi ý đợt sửa |
| --- | --- | --- | --- | --- | --- |
| G01 | Cao | Reset/F8/Restore nhầm ý nghĩa: Restore lấy defaults thay backup, phá phép thử trở về baseline. Gom §3 P18, §4 P08/P25/S03, §5 B25–B27. | TM PDF 123,141 / 3-5,23 §§3.6.4/3.6.7.4; BD PDF 24–25 / in 23–24 III.5 | STORE::restoreDefaultConfig/backupConfig/applyConfigChanges; PmdtLayout F8; PmdtToolbar | Stage 1: tách cancel draft/restore backup/factory reset; kiểm backup khác defaults, chưa backup, draft lỗi. |
| G02 | Cao | RF native về0 khi Load, HC cần đo vào tải; dialog SB vẫn đổi số khi cả TX Off. Gom §3 P09, §4 P37, §5 B11–B12. | HC PDF 13–14,17–21 / in 12–13,16–20 IV.2–4; TM PDF 195 / 3-77 Table 3-17 | ENGINE::effectiveTransmitter/buildTxPower; SBM::readSidebandTransmitter | Stage 1: tách RF được cấp/Load/on-air; kiểm Off/Load/Antenna, không bịa detector thực. |
| G03 | Cao | LCU state riêng, gộp Main Select/Antenna, OFF mất Main; LCD thiếu MON2/PA Temps, Reset/Silence/volume/lamp test chưa đủ. Gom §2.4. | TM PDF 181–184 / 3-63–66 Figs. 3-57–63/Tables 3-5–7 | VIEW::LcuPanel/lcuScreens/transmitterButton; STORE | Stage 1: state trạm chung; Main khác routing, Local/remote, reset/silence/alarm mới, mọi đèn. |
| G04 | Cao | LED card cố định: AC ON/AC FAIL cùng sáng, Monitor báo alarm bất kể điều kiện, trái PMDT. Không trùng route LCU G03. | TM PDF 185–188,190–195 / 3-67–70,72–77 Tables 3-8–11/13–17; §2.2 | FACE::IndicatorLamp/BcpsFaceplate/MonitorFaceplate và các faceplate khác | Stage 1: bind state đã có; chưa mô hình phải ghi minh họa, không tô như chỉ thị live. |
| G05 | Cao | Dễ học màu/limits thành chuẩn: VSWR xanh có thể >1.25; Mod/Deviation khác KT; ảnh TM không phải default trạm. Gom §4 L01–L10, §5 K04/D02–D03. | KT PDF 10,13–15 / in 9,12–14 V.5.1/II.2–3; TM PDF 157 / 3-39 Fig. 3-35 | DEF::alarmLimits/azimuthLimits/sidebandVswr/notchTolerance; ENG; MonitorAlarmLimits | Stage 0/1: Q10, tách kiểm đọc KT khỏi relay executive; profile minh họa ghi nguồn, không tự ép relay theo dải bình thường. |
| G06 | Cao | TP/pha chưa đủ nghiệm thu: TP6 catalog±.1 thay HC±.05V; mean-phase meter tới10V thay2–9; scale/PLL không có DMM độc lập, một số field chỉ lưu. Gom §3 P02–P06/P12/P15–P16, §4 P35. | HC PDF 15–16,24–25 / in 14–15,23–24 IV.3.1/5; TM PDF 192,215 / 3-74,6-15 | BDAT::sideband.testPoints; SBM::readSidebandTrim; TXC/MONC; ENGINE::calibratedMeasurement | Stage 0/3: Q4/Q14; tách thang minh họa/tolerance, chỉ thêm detector được đặc tả, không tự chứng nhận output mô hình. |
| G07 | Cao | Trim/CAL SB không đến PMDT/store/evidence/backup, chưa hoàn thành chuỗi kiểm/ghi sau xoay. Gom §3 P08/P10, §5 K12/B12/B15–B16. | HC PDF 17–18 / in 16–17 IV.3.1 o/3.2 j,o; TM PDF 210,215 / 6-10,15 §§6.4.6/24 | VIEW::sidebandAngles; SBD::SidebandAdjustmentDialog; STORE | Stage 2: một nguồn state/provenance cho trim được hỗ trợ, backup/restore không âm thầm bỏ góc. |
| G08 | Cao | Menu enabled nhưng không dispatch: Transfer, Ident, Bypass, RMS command, Test Signal J3; sidebar thay thế không sửa menu. Gom §4 P24/P31/P36/P43–P44. | TM PDF 150–152,158,168,175 / 3-32–34,40,50,57; KT PDF 12,21 / in 11,20 | MENU; BAR::selectItem; STORE::setTransmitterMode | Stage 2: lệnh thực thi cùng guard/state hoặc disabled có lý do; test từ menu thật. |
| G09 | Cao | Clock bảo vệ dừng theo tab/login/link/practice; thiếu hai restart TM; đổi main không giữ tải hot standby. Gom §4 S04–S05, §5 K09/B18. | TM PDF 143,175 / 3-25,57 Table 3-3/§3.6.8.5; KT PDF 12,21 / in 11,20 | CLOCK; STORE::advanceMonitorTime/applyAutomaticMonitorTransfer/setTransmitterMode | Stage 1: clock mô phỏng độc lập UI; OR/AND/bypass/delay, hot/cold, mất link, không có TX khỏe dự phòng. |
| G10 | Cao | Fault History Prior live, Alarm/time cố định, Older không chạy; dễ học sai nguyên nhân trước chuyển máy. Gom §4 P34, §5 K08. | TM PDF 165–166 / 3-47–48 §3.6.8.2.3; KT PDF 20–21 / in 19–20 II.6 | MonitorFaultHistory::FaultIntegral; STORE event state | Stage 3: snapshot trước tác động, ba sự kiện; kiểm lịch sử rỗng/nhiều alarm/sau transfer, không lấy live thay history. |
| G11 | Cao | TG Completed/In Process/Updated tức thời không chứng minh chu kỳ test/snapshot đạt; field stored-only không phải detector. Gom §3 P17, §4 P33, §5 K18–K19. | HC PDF 28,44 / in 27,43 IV.7 f/15 i; TM PDF 161–164,214 / 3-43–46,6-14 | READ::MonitorTestResults/TestGenerator; ENGINE::calculateIntegrityTestValues/testGeneratorResults | Stage 3: lifecycle/fail/timeout; HC IV.7 hai phút, không áp cứng timing cho mọi mode. |
| G12 | Cao | Mã figure in như P/N; designator SB/BCPS/TG/Interface có bất nhất nguồn. Gom §1.1/1.3, §2.5 H2/H5, §3 định danh. | TM PDF 24–25,185,191–192 / 1-4–5,3-67,73–74; HC PDF 4,42,45 / in 3,41,44 | FACE::PartNumber; BDAT::DVOR_BLOCKS | Stage 0/4: Q1/Q7; tách designator/assembly/figure/variant, không tự chọn errata. |
| G13 | Cao | Thiếu điều kiện–dụng cụ–reference–nghiệm thu: chỉnh bỏ qua nguồn/cáp/reference, chọn module được chấm như đã thay. Gom §3 P01/P07/P10/P23, §5 B01–B03. | HC PDF 5–7,15–18 / in 4–6,14–17 III/IV.3; BD PDF 5–13 / in 4–12 Phần1/2 | SBD; SCEN::evaluateDvor1150aScenario; STORE evidence | Stage 0/5: Q5/Q6, guard/checklist/hồ sơ; click không chứng nhận thay card/ESD/an toàn thật. |
| G14 | Cao | RF Monitor R1–3/BCPS R30/R56 chưa là trim có tác dụng; override số hiển thị không phải calibrate. Gom §3 P19/P21–P22. | HC PDF 33–37 / in 32–36 IV.10–11; TM PDF 195,206–207 / 3-77,6-6–7 | FACE::RfMonitorFaceplate/TrimPot; CFG; READ::RmsPowerSupply | Stage 2/3: reference và dụng cụ độc lập mô phỏng nếu đủ đặc tả; HC1VAC/.3A ampe kìm, không sao đấu nối TM. |
| G15 | Trung bình | Save/Load/Print/Copy/Set Time chưa thành workflow, chặn lưu ngoài/khôi phục sau thay RMS/pin. Khác G01 về ý nghĩa restore. | BD PDF 24,26–27 / in 23,25–26 III.4/IV.3; HC PDF 29,32 / in 28,31 IV.8; TM PDF 123,141,150 / 3-5,23,32 | MENU/BAR::PmdtToolbar; STORE::backupConfig | Stage 2: file training có version; thiếu/sai file, xuất hai bản/in; không xuất password. |
| G16 | Trung bình | Thiếu phiếu/so ca trước/reference/ảnh/precision/provenance; logs không thay hồ sơ. Gom §4 P11/P16–P17/P37, §5 K03/K23–K24/B31. | KT PDF 13–15,35–44 / in 12–14/BM01–03; BD PDF 31–39 / biểuI–IV; TM PDF 199 / 5-1 §5.3 | TxDataMain/MonitorIntegral; STORE::parameterChangeLogs/evidence | Stage 5: Q12 chốt ô/số lẻ/nguồn counter; phiếu có nguồn đo/thời gian và trạng thái chưa có số liệu. |
| G17 | Trung bình | Direct/RCSU link gộp, thiếu COM/modem/remote và RCSU/RSU/radio độc lập. Gom §4 P02/P05/P09/S02, §5 K06–K07/K17/K21/B18–B19. | TM PDF 123–127,204 / 3-5–9,6-4; KT PDF 15–16,31,34 / in 14–15,30,33; BD PDF 23 / in 22 III.3.8 | DEF::simulation.connected; ENG::data.rmsStatus; MENU/BAR | Stage 0/5: Q11 chốt topology/link; không giả đã thử đường truyền thật hay triển khai kết nối trạm. |
| G18 | Trung bình | Thiếu Level2/user management/password change/khóa ba lần-năm phút/idle15 phút; RMS config nhiều mục chỉ hiển thị. Gom §4 P18/P20–P23/S01. | TM PDF 124–126,142–150 / 3-6–8,24–32 §§3.6.6/3.6.7.4–5 | simulator-training-accounts.ts; STORE::login; RmsConfigLayout; CONTROL | Stage 2: Q13, account training tách secrets; guard/Local/sai login/timeout. |
| G19 | Trung bình | Power Control/AC Monitor, startup/shutdown thiếu AC/BATT/DC BUS; bốn cần gạt ảnh không đủ sáu chức năng. Gom §1.2/§2.1, §4 S06, §5 K01/K20. | TM PDF 120,180 / 3-2,62 §§3.5/3.8.1 Table 3-4; KT PDF 12,34 / in 11,33 | VIEW::cabinetImages; BDAT::DVOR_BLOCKS; STORE | Stage 1/4: state nguồn/init/Local/trước-sau; Off phần mềm không chứng minh cô lập điện. |
| G20 | Trung bình | TG/Facilities thiếu mặt/hotspot/điểm đo, LVPS fallback; commutator/cổng chưa xác minh. Không phủ nhận TG phần mềm. | TM PDF 189,194 / 3-71,76 §§3.8.7/11/12; §2.3 | BDAT; FACE::rebuiltModuleIds; VIEW::ModulePanel | Stage 4: Q2/Q7 trước phần chưa có nguồn; không tự vẽ pinout. |
| G21 | Trung bình | Ground Check Run/Advanced/options chưa đủ; Diagnostics mô hình không phải BITE/safety Full-OnAir. Gom §4 P38–P39/P45. | TM PDF 170–171,176–177 / 3-52–53,58–59 §§3.6.8.3.2–3/3.6.8.6 | TxGroundCheck; DiagnosticsWorkspace::PowerUpResults/FaultIsolation | Stage 3: lifecycle/options/export/fail/cancel, cảnh báo giới hạn; không suy NOTAM đã ban hành. |
| G22 | Trung bình | RF switch/bank gộp occurrence; catalog thiếu assembly/TP dù raster/SVG đã có. Không phải mất đường RF trên ảnh. | TM PDF 24–28,48–51 / 1-4–8,2-4–7 Figs. 1-3–6/2-2–3; §1.1–1.2 | BDAT::DVOR_BLOCKS/resolveDvorHardwareOccurrence; VIEW::referenceDiagrams | Stage 4: occurrence→hotspot, metadata/citation; giữ đường đã có, không dựng đường suy đoán. |
| G23 | Trung bình | Anten/địa hình/VNA/pin/battery/inspection/cáp/đo điện thật không thể chứng nhận từ PMDT. Giới hạn đào tạo, không mặc định bug. | BD PDF 13–15,23–30 / in 12–14,22–29 III.1–2/3.9–10/IV/Appendix; HC PDF 38 / in 37 IV.13 | VIEW/BDAT; MonitorSidebandVswr; READ; SCEN | Stage 5: Q8/Q14; bài/hồ sơ ngoại tuyến ghi rõ dụng cụ/giới hạn; thực hành thật do đơn vị có thẩm quyền. |
| G24 | Thấp | Tỷ lệ/nhãn/vị trí mặt SVG/cabinet khác hình: tay kéo/heading/khoảng cách/view hông; hình đẹp không chứng minh cơ khí đúng. | TM PDF 24–26,185–195 / 1-4–6,3-67–77; §2.1–2.3 | FACE; CSS; VIEW::cabinetImages | Stage 4: đối chiếu ảnh duyệt/cùng viewport; chưa có nguồn giữ mở. |
| G25 | Thấp | Legacy PMDT layout/row order/đường mở tab khác; About/Integral Monitor Data disabled; extra training cần phân biệt. | TM PDF 121–123,157,173–174 / 3-3–5,39,55–56; KT PDF 12–20 / in 11–19; §4 P26/P30/P46–P48 | MonitorAlarmLimits; TxConfigLayout; PmdtLayout; MENU | Stage 4: Q9 chốt version; kiểm hình vị trí/checkbox/stacking, không chỉ trang load/DOM; không xóa extra hữu ích. |

### 6.2. Lộ trình chia đợt đề xuất

**Chỉ đề xuất; chưa có Stage nào được triển khai trong audit này.** Stage0
có thể chạy song song phần sửa được bốn PDF quyết định rõ. Mỗi Stage cần
diff nhỏ, test normal/empty/error liên quan và kiểm hình đúng bề mặt đổi.

| Đợt | Phạm vi / gap | Điều kiện nghiệm thu đề xuất | Tình trạng |
| --- | --- | --- | --- |
| Stage 0 | Profile/errata/reference/baseline ảnh: G05/G06/G12/G13/G17/G23 | Q1–Q14 có nguồn/phiên bản/quyền dùng; chưa trả lời giữ Chưa xác minh, không hỏi password/thử máy. | Đề xuất; chưa sửa. |
| Stage 1 | State/RF/nguồn/phục hồi: G01–G05/G09/G19 | Reset khác Restore; backup khác defaults; Load không on-air, Off đúng; LCU/LED/PMDT đồng bộ; hot/cold/bypass/mất link/no alternate. G05 theo Q10 hoặc profile ghi minh họa. | Đề xuất; chưa sửa. |
| Stage 2 | Native command/config/calibration bridge/file: G07/G08/G14/G15/G18 | Menu→guard→state/evidence; quyền/Local; disabled có lý do; thiếu/sai version file; trim được đặc tả có backup. Model G14 tiếp Stage3. | Đề xuất; chưa sửa. |
| Stage 3 | Feedback/lịch sử/test: G06/G10/G11/G14/G21 | Reference độc lập; history rỗng/ba sự kiện/transfer; TG pending/completed/fail/timeout; diagnostics cancel/ground-check export. Q4 chưa chốt không tự thêm công thức. | Đề xuất; chưa sửa. |
| Stage 4 | Identity/sơ đồ/mặt/bố cục: G12/G19/G20/G22/G24/G25 | Đúng designator/assembly/figure/hotspot; ảnh so sánh và tương tác thực, label/checkbox/stacking; không thêm connector thiếu nguồn. | Đề xuất; chưa sửa. |
| Stage 5 | Bài KT/BD/HC/topology/hồ sơ: G13/G16/G17/G23 | Checklist chu kỳ/điều kiện; nguồn đo/precision; nhánh không radio/không alarm/không history; trước-sau/xuất phiếu; phần vật lý phải thực hành ngoài sim. | Đề xuất; chưa sửa. |

### 6.3. Tái kiểm tra ngẫu nhiên 10 citation

Chọn phân tầng bằng Python Random(seed=1150): ba trang TM, ba HC, hai KT,
hai BD từ các trang đã dẫn. Mở lại PDF gốc bằng PyMuPDF, đọc trang in/§ và
mệnh đề dưới đây; TM24 mở cả ảnh vì label nằm trong figure (ảnh ngoài Git:
spotcheck-tm24.png). Chỉ xác nhận mười citation này, không phải toàn audit.

| # | Citation mở lại | Mệnh đề/giá trị kiểm trực tiếp | Dòng audit | Kết quả |
| --- | --- | --- | --- | --- |
| R01 | TM PDF 24 / 1-4 Fig. 1-3 | SYN030838 tại1A3A1/A11; BCPS030798 tại1A5A1/A2; SB A1/A2/A6/A7, Commutator A5 | §1.1 SYN/SB/BCPS; §1.3 | Đúng ảnh; bất nhất bảng khác vẫn Q1. |
| R02 | TM PDF 123 / 3-5 §3.6.4 | F8 cancels changes/leaves data unchanged; F7 saves changes, không phải F8 factory reset | §4 P08/S03; G01 | Đúng trang/§/chức năng. |
| R03 | TM PDF 175 / 3-57 §3.6.8.5/Figs. 3-52–53 | Transfer Main/Standby, Normal/Continuous/No Ident; Hold chọn anten, lẻ SB1/chẵn SB2 | §4 P43–P44 | Đúng; không nói sim thực thi. |
| R04 | HC PDF 16 / in 15 IV.3.1 i–m | TP4/10 2–9V, TP6 0±50mV, TP5 .89–.91V | §3 P03/P04/P06/C1–C2 | Đúng bước/dải; HC±.05V. |
| R05 | HC PDF 18 / in 17 IV.3.2 o–s | R5 khớp SB2 PMDT/wattmeter; q ghi SB2 vào J2 | §3 P08/P10/mapping | Đúng; J2 còn mơ hồ giữ Q5, không sửa thành J25/J26. |
| R06 | HC PDF 28 / in 27 IV.7 f | Monitor1→Test Results→Test Generator, đợi 2 phút, bằng hoặc sai lệch nhỏ | §3 P17/C9 | Đúng; không thêm tolerance số. |
| R07 | KT PDF 10 / in 9 V.5.1a | Mod30/9960 28–32%, deviation16±1, frequency±.002%, power50–100W bước1W | §4 L02–L04/L06–L07 | Đúng; không phải toàn bảng pre-alarm. |
| R08 | KT PDF 34 / in 33 V.1–2 | E1/E3 1A3 BCPS#1/#2 nominal+48V; charger E5/E1 1A5; mọi DC Power LED | §5 K20/D05 | Đúng; dải42–52/51–56 thuộc phiếu PDF 43 đã dẫn riêng, không gán vào trang34. |
| R09 | BD PDF 24 / in 23 III.4/5.1 | Backup rồi Save VORBD_lan… dưới DVOR-DME Config/Baoduong/Nam20…; trial+10W/−10W rồi Restore ban đầu | §5 B22–B25 | Đúng bước/độ biến thiên/mục đích Restore. |
| R10 | BD PDF 26 / in 25 IV.2 d–i/IV.3 f–h | Tải50±1Ω, lân cận anten#2/#3/#47/#48; pin RMS≥2.9V, dưới thì thay | §5 B29–B30 | Đúng; dấu biên biểu khác vẫn D07/Q14. |

Không phát hiện citation sai trong mười mẫu. Không sửa số/trang để làm nguồn
có vẻ nhất quán; R01/R05/R08/R10 tách rõ phần xác nhận và phần còn khảo sát.

## 7. Câu hỏi chủ sở hữu — khảo sát trạm thật

**14 câu xếp theo tác động giảng dạy; giữ ID cũ để không phá cross-reference.**
Q10 thu profile monitor, Q14 thu errata HDCV, Q6 thu reference/tolerance phép
đo, Q9 thu version/layout; không cần gửi trùng bộ ảnh. Có thể dùng hồ sơ/ảnh
cũ đã che thông tin hạn chế, chỉ mở màn đọc được phép. **Không xin tài khoản/
mật khẩu thật, không Apply/đổi setting, chuyển máy, tạo alarm, chạy test, tháo
cáp/card hoặc ngắt nguồn chỉ để trả lời audit.** Không quan sát an toàn được
thì ghi chưa có bằng chứng, không suy máy thiếu tính năng.

- [ ] **Q10 — Profile monitor và ngưỡng thực trạm?**
  **Xem/thu:** ảnh đọc/config được phép chia sẻ của Monitors General/Alarm
  Limits, RMS General/Power Supply/A-D Limits: năm cột, azimuth/attenuation
  từng monitor/anten, Antenna2, Notch, VSWR pre/alarm/số anten, shutdown/
  ident delays, OR/AND/Transfer/Integrity/Automatic Restarts; chuẩn bình
  thường/ngưỡng được phê duyệt kèm theo.
  **Vì sao:** không lấy profile ảnh TM làm default, màu xanh làm chuẩn KT 1.25
  hay đồng nhất normal với executive alarm.
  **Mở khóa:** §4 P18/P20/P29–P30/L01–L10/S05; §5 K04–K05/D02–D03; G05/G09.
  **Nguồn/code:** TM PDF 142–147,156–157 / 3-24–29,38–39; KT PDF 10–15 /
  in 9–14 V.5.1/II.2–3; DEF/ENG/CONTROL.

- [ ] **Q14 — Errata HDCV/phiếu nào đang được duyệt?**
  **Xem/thu:** văn bản/phiếu cũ giải DC45–52 vs biểu45–53 vs KT42–52V,
  charge51–55 vs51–56V và đầu E1/E3/E7; SB TP4/10 2–9 vs2–8,
  TP5/11 .89–.91 vs.9±.05, TP6±.05 vs±.1; composite J3 hay TP3 trên phiếu,
  ô30Hz giảm Reference hay SBO, pin đúng2.9V có đạt không. Không đo mới.
  **Vì sao:** khác biệt đổi pass/fail hoặc điểm cắm; quy tắc HDCV thắng TM
  không giải được mâu thuẫn nội bộ HDCV.
  **Mở khóa:** §5 B07/B15–B16/B27/B30/D05–D08; §3 C1–C2/P20–P22; G06/G13/G14.
  **Nguồn/code:** BD PDF 14–15,21–28,32,34–35,38–39 / in 13–14,20–27/biểu;
  KT PDF 25–27,34,36,43 / in 24–26,33/BM01/03; TM PDF 168,192,206–207,215 /
  3-50,74,6-6–7,15; FACE/ENG/CONTROL.

- [ ] **Q4 — Công thức MON1 dùng đích nào?**
  **Xem/thu:** hướng dẫn được duyệt/ví dụ hồ sơ cũ MON1/MON2 gồm reading
  trước, scale cũ/mới, reading sau cho30Hz/9960/Deviation; MON2 khác30.0%
  thì tử số MON1 là30.0 hay MON2, deviation dùng tử số/ratio/làm tròn nào.
  **Vì sao:** HC in 30.0 nhưng nói lặp cho deviation; tự chọn đích sẽ dạy sai
  phép hiệu chuẩn dù scale tuyến tính trong sim có chạy.
  **Mở khóa:** §3 P16/coverage IV.5; G06.
  **Nguồn/code:** HC PDF 24–25 / in 23–24 IV.5 h–l; TM PDF 211 / 6-11
  §6.4.10 không cho công thức thay thế; MONC/ENGINE::calibratedMeasurement.

- [ ] **Q5 — Mapping cáp SB và đầu J2 là gì?**
  **Xem/thu:** ảnh nhãn đang lộ hoặc wiring/as-built được phép chia sẻ,
  SB1–4 tới1A10/1A11 J25/J26; “SB2 vào J2” ở HC IV.3.2 q chỉ đầu nào.
  Không tháo/nối cáp hay di chuyển wattmeter.
  **Vì sao:** không biến câu mơ hồ thành bài cắm sai connector.
  **Mở khóa:** §3 P07–P10/C3–C4/đoạn mapping; §5 B09/B12; G07/G13/G22.
  **Nguồn/code:** HC PDF 17–18 / in 16–17 IV.3.2 b/g/l/q; TM PDF 210 /
  6-10 §6.4.6 h–p; SBD/SCEN/BDAT.

- [ ] **Q6 — Reference và tolerance nghiệm thu đo lấy từ đâu?**
  **Xem/thu:** hồ sơ hiệu chỉnh gần nhất: SB3 tốt, Bird element/range,
  độ phân giải/mức sai được duyệt cho “PMDT bằng wattmeter”, TG “sai lệch
  nhỏ”, reference R1/R3 RF Monitor; ảnh cũ In Process/Updated và timestamp
  đầu/cuối của đúng bài HC IV.7/15 nếu đã lưu, không chạy test mới.
  **Vì sao:** 5W là element không phải nominal; không lấy tolerance BITE TM
  áp sang HC hoặc coi Updated tức thời là đã hoàn thành test.
  **Mở khóa:** §3 P07–P08/P17/P19/C4/C7/C9; §4 P33; G11/G13/G14.
  **Nguồn/code:** HC PDF 17–18,28,33–35,44 / in 16–17,27,32–34,43;
  TM PDF 209–210,214 / 6-9–10,14 §§6.4.6/18; SBD/READ/FACE.

- [ ] **Q8 — Tiêu chí và lịch cộng hưởng anten nào áp dụng?**
  **Xem/thu:** phiếu VNA cũ/chuẩn được duyệt, marker tần số đài, S11/log-mag,
  tải anten lân cận; HC IV.13 đòi≤−30dB, VSWR<1.05 hay cả hai; BD đúng
  VSWR1.2 có pass không. Đọc năm đưa máy vào khai thác, loại Tuning CCA/
  lịch >15 năm/ba năm từ hồ sơ, không đo hoặc tháo máy.
  **Vì sao:** GroundCheck/bảng VSWR không phải đo cộng hưởng; không hợp nhất
  tiêu chí HC/BD khác ngữ cảnh hoặc suy lịch áp dụng cho mọi trạm.
  **Mở khóa:** §3 IV.13/§3.2 anten SB; §5 B28–B29/D07; G23.
  **Nguồn/code:** HC PDF 38 / in 37 IV.13 f–h; BD PDF 25–26,38–39 /
  in 24–25/biểuIV; TM PDF 212 / 6-12 §6.4.13; ENGINE/READ/BDAT.

- [ ] **Q13 — Quyền và chính sách hot/cold standby?**
  **Xem/thu:** quy định Level1–4 (có Level2/user management không), quyền
  lệnh direct/remote, khóa ba lần/năm phút, idle15 phút/ngoại lệ Local;
  cấu hình hot/cold và bản ghi đổi main hai tuần gần nhất: standby ở Load
  hay Off, lý do ghi ô nào. Chỉ chính sách, không user/password.
  **Vì sao:** tránh học quyền/timeout và đổi máy theo tài khoản demo như
  chính sách trạm; giữ phân biệt Main và routing.
  **Mở khóa:** §4 P01/P21–P23/P43/S01/S04; §5 K01/K09; G09/G18.
  **Nguồn/code:** TM PDF 124–126,148–149,175 / 3-6–8,30–31,57;
  KT PDF 12,21 / in 11,20 I/III; STORE::login/setTransmitterMode.

- [ ] **Q3 — BCPS/LCU chỉ thị gì ở trạng thái hiện có?**
  **Xem/thu:** ảnh hàng BATTERY FAULT/ON BATTERY/FAST/TRICKLE/CHARGER
  STATUS của BCPS; LCD LCU MON1/MON2, Facilities Power, VOR Temps, PA Temps
  nếu được phép xem; TX/Local lúc ảnh. Không Lamp Test/Reset/thay nguồn.
  **Vì sao:** chốt hàng/màu/dấu tròn/trang LCD, không dùng LED SVG cố định như
  số đo; version PMDT thu riêng Q9.
  **Mở khóa:** §2.2 BCPS/§2.4 LCD/indicator/system; G03–G04/G24.
  **Nguồn/code:** TM PDF 181–185 / 3-63–67 Figs. 3-57–64/Tables 3-6–8;
  FACE::BcpsFaceplate; VIEW::LcuPanel/lcuScreens.

- [ ] **Q11 — Topology direct/RCSU/RSU/radio thực tế?**
  **Xem/thu:** nhãn model/version RCSU2238/2240 hay khác, RSU tại Tower,
  radio/modem/as-built được phép chia sẻ; đường PMDT giao ca/bảo dưỡng,
  VOR–RCSU tách ra sao; đèn Main/Standby/Alert/CommFail riêng VOR/DME.
  Không ngắt link/thử ComFault.
  **Vì sao:** PMDT connected không chứng minh RCSU tốt; RSU khác RCSU,
  radio chỉ áp dụng nơi lắp.
  **Mở khóa:** §4 P02/P05/P09/S02; §5 K06–K07/K17/K21/B18–B19; G17.
  **Nguồn/code:** TM PDF 123–127,204 / 3-5–9,6-4; KT PDF 15–16,31,34 /
  in 14–15,30,33; BD PDF 23 / in 22 III.3.8; ENG::data.rmsStatus.

- [ ] **Q1 — Designator/assembly SB và BCPS thật là gì?**
  **Xem/thu:** toàn mặt tủ và nhãn nhìn được của bốn SB/hai BCPS/hai carrier:
  designator/P/N/HW revision030…/012…; A5 là Commutator hay SB, TX2 A6/A7
  hay A5/A6, BCPS A1/A2 hay A3/A4. Không rút card.
  **Vì sao:** phân biệt nhãn máy/mã figure 571150A-0002-…, giải bất nhất theo
  variant, không tự gọi hãng đã xác nhận errata.
  **Mở khóa:** §1.1 sideband/bcps/§1.3; §2.2 SB/§2.5 H2/H5; G12/G22.
  **Nguồn/code:** TM PDF 24,27–28,185,191–192 / 1-4,7–8,3-67,73–74
  Fig. 1-3/§1.2.1.9/12/§3.8.3/9; BDAT/FACE::PartNumber.

- [ ] **Q7 — Test Generator/Interface trong HC có errata không?**
  **Xem/thu:** nhãn TG/Interface đang lộ hoặc danh mục card được duyệt:
  TG1A3A5 hay có thêm1A12, Interface1A9 hay1A19; số văn bản/trang đính chính
  nếu có. Không mở tủ/rút card để tìm.
  **Vì sao:** tránh tạo thiết bị vì typo mục lục hoặc gộp sai hai thiết bị;
  hardware base vẫn TM, TG phần mềm không xác nhận slot.
  **Mở khóa:** §3 IV.7/15/16/đoạn định danh; §2.3 TG; G12/G20.
  **Nguồn/code:** HC PDF 4,42,45 / in 3,41,44; TM PDF 24–25,194 /
  1-4–5,3-76 Figs. 1-3/4/3-72; BDAT/FACE/READ.

- [ ] **Q9 — PMDT version/build và bố cục nào đang chạy?**
  **Xem/thu:** Info→About hoặc bản ghi version/date, RMS Software/Hardware
  Revisions, toàn cửa sổ/menu/sidebar, Monitor Data/Alarm Limits/Test Results,
  TX Data/Config; Integral hay Integrity, TX hai cột hay chọn riêng, tab
  Integral Monitor Data dùng được không.
  **Vì sao:** chốt khác biệt phiên bản trước sửa label/stacking/checkbox/tab;
  serial/P/N mẫu trong sim không được ghi thành hồ sơ trạm.
  **Mở khóa:** §4 P01/P05/P11/P26/P30/P37/P46/P48; G16/G25.
  **Nguồn/code:** TM PDF 121–126,153,157,173–174 / 3-3–8,35,39,55–56;
  KT PDF 12–20,31–33 / in 11–19,30–32; MENU/PmdtScreenRouter.

- [ ] **Q12 — Phiếu thực dùng và nguồn số/ảnh lưu là gì?**
  **Xem/thu:** bộ giao ca/BM-KT-DVORA-01/02/03 và bảng BD cũ đã che thông
  tin hạn chế: ô/số lẻ, SB1&2/SB3&4 ghi hai số hay một số nào, carrier năm
  số lẻ lấy counter report nào, reference/trước-sau/waveform/bốn ảnh tests
  lưu đâu, tên/đuôi config và vai trò phê duyệt; không nội dung security.
  **Vì sao:** PMDT làm tròn không thay counter; cần provenance, training log
  không thay biên bản bảo dưỡng.
  **Mở khóa:** §4 P11/P16–P17/P37; §5 K03/K23–K24/B22–B25/B31; G15–G16.
  **Nguồn/code:** KT PDF 13,15,22,35–44 / in 12,14,21/BM01–03;
  BD PDF 24,31–39 / in 23/biểuI–IV; TM PDF 199 / 5-1 §5.3; READ/STORE.

- [ ] **Q2 — Mặt Commutator/LVPS và vị trí switch/bank?**
  **Xem/thu:** ảnh thẳng mặt1A4A5/LVPS1A3A4/A8, LED/connector/TP đang lộ:
  CONTROL ACTIVE/RS-422 là nhãn mặt hay chỉ cáp backplane; drawing/ảnh cũ
  relay carrier/SB, CCA1A10/1A11 để ánh xạ bank. Không mở nắp/suy pinout.
  **Vì sao:** không biến đường control trên sơ đồ thành test point vật lý.
  **Mở khóa:** §1.1 commutator/lvps/rf-switch/antenna-bank; §2.3; G20/G22/G24.
  **Nguồn/code:** TM PDF 24,26–28,49,194 / 1-4,6–8,2-5,3-76
  Figs. 1-3/5/6/2-3/§3.8.11; BDAT/VIEW/FACE.

**Nguồn biết có nhưng không sử dụng:** bản dịch manual tiếng Việt đầy đủ
**DVOR-1150A_TiengViet.pdf** và **slide PPTX tiếng Việt** có trên Drive của
Hoàng. Hai tài liệu không thuộc bộ bốn PDF được audit; chưa mở/đối chiếu,
không dùng kết luận, giải errata hay thay citation TM/KT/BD/HC. Nếu bổ sung
đợt sau cần ghi phiên bản, trang/slide và quyền chia sẻ trước khi dùng.
