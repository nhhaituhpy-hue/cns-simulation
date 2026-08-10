# Simulator Model TODO

Các mục dưới đây được giữ ngoài engine cho đến khi có quy tắc training hoặc
manufacturer manual đủ cụ thể. Không tự suy diễn công thức RF chỉ từ tên field.

## DVOR 220 — RF and monitor calibration model

- [ ] Xác định quan hệ của `rfPhaseDeg` với `am9960Hz`, distortion hoặc
  bearing/monitor readings.
- [ ] Xác định cách `measurementAverageCount` ảnh hưởng readings (cửa sổ mẫu,
  làm mượt, hay chỉ display).
- [ ] Xác định cách `warningRangePercent` hiệu chỉnh warning bands.
- [ ] Xác định liệu `transmitterLimits.carrierPower` và `sidebandPower` có
  phải tham gia classifier/alarm hay chỉ validation profile.

Hiện trạng: engine giữ các field trong config và không áp công thức đo lường
chưa được xác nhận.

## DME 320 — calibration and per-transponder inheritance

- [ ] Xác định công thức của `station.autoDelayCalibration`: nguồn measured
  delay, điều kiện pass, và cách cập nhật `delayOffsetUs`/monitor limits.
- [ ] Xác định các nguồn per-transponder khi tắt `useStationPulseRate`,
  `useStationEchoSuppression`, hoặc `useStationIdent`; config hiện chưa có
  các giá trị thay thế tương ứng.
- [ ] Xác định ảnh hưởng của SDES/LDES, dead-time và equalizer tới traffic/
  monitor readings nếu cần đưa chúng ra khỏi display-only.

Hiện trạng: channel-dependent limits đã tự rebase khi đổi channel; các field
trên vẫn là display/control-only để tránh mô hình hóa sai.
