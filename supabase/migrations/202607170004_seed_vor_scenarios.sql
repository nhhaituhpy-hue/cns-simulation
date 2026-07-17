-- Seed data for 3 new DVOR 1150A training scenarios

INSERT INTO public.vor_scenarios (
  id,
  title,
  description,
  difficulty,
  prompt,
  overrides,
  expected_checkpoints,
  hardware_task,
  created_at,
  updated_at
) VALUES (
  'vor-scenario-dc-power',
  'Sự cố sụt giảm điện áp và cảnh báo khối cấp nguồn BCPS',
  'Hệ thống DVOR 1150A bất ngờ xuất hiện cảnh báo bảo dưỡng liên quan đến nguồn điện. Đài vẫn phát sóng bình thường nhưng đang chuyển sang sử dụng nguồn ắc quy (Battery) hoặc báo lỗi mất một trong các mức điện áp DC cung cấp cho các khối card.',
  'easy',
  'Hệ thống DVOR 1150A bất ngờ xuất hiện cảnh báo bảo dưỡng liên quan đến nguồn điện. Đài vẫn phát sóng bình thường nhưng đang chuyển sang sử dụng nguồn ắc quy (Battery) hoặc báo lỗi mất một trong các mức điện áp DC cung cấp cho các khối card.

Yêu cầu thực hiện:
1. Truy cập vào phần mềm PMDT để đọc các cảnh báo hiện hành.
2. Xác định chính xác cảnh báo thuộc về thành phần nguồn AC đầu vào, khối nguồn sạc BCPS hay khối nguồn thứ cấp LVPS.
3. Đo đạc và đánh giá mức điện áp thực tế để quyết định hiệu chỉnh chiết áp hoặc thay thế khối phần cứng.',
  '[
    { "fieldId": "alert", "value": true, "status": "yellow" },
    { "fieldId": "generalAlerts.ac-power-failure.checked", "value": true },
    { "fieldId": "generalAlerts.sys48-ps1.checked", "value": true },
    { "fieldId": "systemPowerStatus.1.tx1", "value": "yellow", "status": "yellow" },
    { "fieldId": "systemPowerStatus.0.tx1", "value": "yellow", "status": "yellow" }
  ]'::jsonb,
  '[
    {
      "id": "cp1",
      "order": 1,
      "viewId": "rms-maintenance-alerts",
      "menuPath": ["RMS", "Data"],
      "title": "Kiểm tra cảnh báo bảo dưỡng RMS",
      "guidance": "Truy cập RMS >> Data >> Maintenance Alerts/Alarms để kiểm tra các cảnh báo hiện hành.",
      "required": true,
      "points": 30
    },
    {
      "id": "cp2",
      "order": 2,
      "viewId": "rms-digital-io",
      "menuPath": ["RMS", "Data"],
      "title": "Kiểm tra Digital I/O và trạng thái nguồn",
      "guidance": "Truy cập RMS >> Data >> Digital I/O để kiểm tra trạng thái chỉ thị Battery Fault và On Battery.",
      "required": true,
      "points": 30
    },
    {
      "id": "cp3",
      "order": 3,
      "viewId": "rms-logs-maintenance",
      "menuPath": ["RMS", "Logs"],
      "title": "Kiểm tra nhật ký bảo dưỡng",
      "guidance": "Truy cập RMS >> Logs >> Maintenance History để xem lịch sử xuất hiện cảnh báo nguồn.",
      "required": true,
      "points": 40
    }
  ]'::jsonb,
  '{
    "expectedComponentIds": ["vor-bcps-1"],
    "faultType": "Volt Adj / Replacement",
    "adminNote": "Cần đo áp tại BCPS 1, dùng chiết áp điều chỉnh Volt Adj hoặc thay thế BCPS 1."
  }'::jsonb,
  '2026-07-17T22:15:00Z',
  '2026-07-17T22:15:00Z'
), (
  'vor-scenario-sideband-vswr',
  'Cảnh báo VSWR Anten biên tần (Sideband Antenna VSWR) và tín hiệu vết lõm (Notch)',
  'Hệ thống DVOR tự động ngắt máy phát 1 (Shutdown) và chuyển đổi sang máy phát 2 (Transfer). Kỹ thuật viên nhận thấy cảnh báo liên quan đến tỷ số sóng đứng của dàn anten biên tần ngoài trời hoặc cảnh báo giám sát vết lõm tín hiệu từ anten Field Monitor.',
  'medium',
  'Hệ thống DVOR tự động ngắt máy phát 1 (Shutdown) và chuyển đổi sang máy phát 2 (Transfer). Kỹ thuật viên nhận thấy cảnh báo liên quan đến tỷ số sóng đứng của dàn anten biên tần ngoài trời hoặc cảnh báo giám sát vết lõm tín hiệu từ anten Field Monitor.

Yêu cầu thực hiện:
1. Truy cập PMDT để xác định anten biên tần (Sideband) nào đang bị lỗi VSWR.
2. Sử dụng giao diện Notch Monitor để xác nhận suy hao tín hiệu bức xạ.
3. Cô lập lỗi xem nguyên nhân là do bản thân Anten/cáp RF, do bộ chuyển mạch Commutator hay do lỗi mạch đo lường VSWR trên khối Sideband Amplifier.',
  '[
    { "fieldId": "transmitters.tx1.main", "value": "gray", "status": "gray" },
    { "fieldId": "transmitters.tx1.off", "value": "red", "status": "red" },
    { "fieldId": "transmitters.tx2.main", "value": "green", "status": "green" },
    { "fieldId": "transmitters.tx2.off", "value": "gray", "status": "gray" },
    { "fieldId": "monitorAgenAlerts.5.mon1", "value": true },
    { "fieldId": "monitorAgenAlerts.6.mon1", "value": true },
    { "fieldId": "vswrData.10", "value": 2.85, "status": "red" },
    { "fieldId": "vswrData.12", "value": 2.65, "status": "red" }
  ]'::jsonb,
  '[
    {
      "id": "cp1",
      "order": 1,
      "viewId": "rms-logs-alarms",
      "menuPath": ["RMS", "Logs"],
      "title": "Kiểm tra lịch sử cảnh báo alarm",
      "guidance": "Mở RMS >> Logs >> Alarm History để xác định nguyên nhân đài tự động ngắt máy phát 1 (Shutdown) và chuyển sang máy phát 2 (Transfer).",
      "required": true,
      "points": 30
    },
    {
      "id": "cp2",
      "order": 2,
      "viewId": "monitor-sideband-vswr",
      "menuPath": ["Monitors", "Data"],
      "title": "Kiểm tra tỷ số sóng đứng Sideband VSWR",
      "guidance": "Vào Monitors >> Data >> Sideband Antenna VSWR để xác định những anten nào đang báo lỗi chỉ số VSWR cao (>1.2).",
      "required": true,
      "points": 40
    },
    {
      "id": "cp3",
      "order": 3,
      "viewId": "tx-status-1",
      "menuPath": ["Transmitters", "Data"],
      "title": "Kiểm tra trạng thái Transmitter 1",
      "guidance": "Truy cập Transmitters >> Data >> Status - Tx1 để kiểm tra chi tiết lỗi máy phát.",
      "required": true,
      "points": 30
    }
  ]'::jsonb,
  '{
    "expectedComponentIds": ["vor-sideband-antennas"],
    "faultType": "Antenna / RF Cable Damage",
    "adminNote": "Xác định lỗi VSWR cao trên anten biên tần số 11. Đo kiểm và thay thế cáp hoặc anten bị hỏng."
  }'::jsonb,
  '2026-07-17T22:15:00Z',
  '2026-07-17T22:15:00Z'
), (
  'vor-scenario-sb-unlocked',
  'Lỗi lệch pha dải biên và mất đồng bộ Synthesizer',
  'Chất lượng tín hiệu dẫn đường trong không gian bị suy giảm nghiêm trọng. Hệ thống cảnh báo lệch pha giữa sóng mang (Carrier) và sóng dải biên (Sideband) hoặc báo các tần số không khóa được pha (Unlock).',
  'hard',
  'Chất lượng tín hiệu dẫn đường trong không gian bị suy giảm nghiêm trọng. Hệ thống cảnh báo lệch pha giữa sóng mang (Carrier) và sóng dải biên (Sideband) hoặc báo các tần số không khóa được pha (Unlock).

Yêu cầu thực hiện:
1. Chạy chương trình chẩn đoán Diagnostics để hệ thống tự cách ly lỗi.
2. Kiểm tra chi tiết menu trạng thái máy phát để tìm ra vòng khóa pha (PLL) nào đang mất đồng bộ.
3. Thực hiện đo đạc tín hiệu Phase Error bằng dao động ký (Oscilloscope) và ra quyết định hiệu chỉnh bù pha bằng phần mềm hay thay thế phần cứng.',
  '[
    { "fieldId": "alert", "value": true, "status": "yellow" },
    { "fieldId": "sidebarParams.hz9960Mod.value", "value": 24.5, "status": "warning" },
    { "fieldId": "sidebarParams.hz9960Mod.status", "value": "warning", "status": "warning" },
    { "fieldId": "sidebarParams.deviation.value", "value": 12.1, "status": "alarm" },
    { "fieldId": "sidebarParams.deviation.status", "value": "alarm", "status": "alarm" },
    { "fieldId": "txSynthesizerAlerts.4.indicator", "value": "red", "status": "red" },
    { "fieldId": "txSynthesizerAlerts.1.indicator", "value": "red", "status": "red" },
    { "fieldId": "txOffsets.6.tx1", "value": 162, "status": "yellow" },
    { "fieldId": "monitorAgenAlerts.4.agen1", "value": true }
  ]'::jsonb,
  '[
    {
      "id": "cp1",
      "order": 1,
      "viewId": "tx-status-1",
      "menuPath": ["Transmitters", "Data"],
      "title": "Kiểm tra vòng khóa pha Synthesizer",
      "guidance": "Mở Transmitters >> Data >> Status - Tx1 để xem trạng thái LSB Unlocked trong nhóm Synthesizer Alerts.",
      "required": true,
      "points": 30
    },
    {
      "id": "cp2",
      "order": 2,
      "viewId": "tx-config-offsets",
      "menuPath": ["Transmitters", "Configuration"],
      "title": "Kiểm tra Offsets máy phát",
      "guidance": "Mở Transmitters >> Configuration >> Offsets and Scale Factors để kiểm tra giá trị lệch pha Carrier Sideband Phase Offset.",
      "required": true,
      "points": 40
    },
    {
      "id": "cp3",
      "order": 3,
      "viewId": "rms-maintenance-alerts",
      "menuPath": ["RMS", "Data"],
      "title": "Kiểm tra cảnh báo RMS Maintenance",
      "guidance": "Mở RMS >> Data >> Maintenance Alerts/Alarms để xác nhận cảnh báo trên Audio Gen 1.",
      "required": true,
      "points": 30
    }
  ]'::jsonb,
  '{
    "expectedComponentIds": ["vor-synth-1"],
    "faultType": "Synthesizer Frequency/Phase Unlock",
    "adminNote": "Xác định lỗi vòng khóa pha LSB Unlocked của Synthesizer 1. Học viên thực hiện đo TP3/TP4 trên card Synthesizer và căn chỉnh chiết áp R81."
  }'::jsonb,
  '2026-07-17T22:15:00Z',
  '2026-07-17T22:15:00Z'
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  difficulty = EXCLUDED.difficulty,
  prompt = EXCLUDED.prompt,
  overrides = EXCLUDED.overrides,
  expected_checkpoints = EXCLUDED.expected_checkpoints,
  hardware_task = EXCLUDED.hardware_task,
  updated_at = now();
