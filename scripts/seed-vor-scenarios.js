const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Read and parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Không tìm thấy tệp .env.local!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    // Remove surrounding quotes if any
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Thiếu cấu hình NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY trong .env.local!');
  process.exit(1);
}

console.log('Đang kết nối tới Supabase:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Define 3 DVOR scenarios data
const scenarios = [
  {
    id: 'vor-scenario-dc-power',
    title: 'Sự cố sụt giảm điện áp và cảnh báo khối cấp nguồn BCPS',
    description: 'Hệ thống DVOR 1150A bất ngờ xuất hiện cảnh báo bảo dưỡng liên quan đến nguồn điện. Đài vẫn phát sóng bình thường nhưng đang chuyển sang sử dụng nguồn ắc quy (Battery) hoặc báo lỗi mất một trong các mức điện áp DC cung cấp cho các khối card.',
    difficulty: 'easy',
    prompt: 'Hệ thống DVOR 1150A bất ngờ xuất hiện cảnh báo bảo dưỡng liên quan đến nguồn điện. Đài vẫn phát sóng bình thường nhưng đang chuyển sang sử dụng nguồn ắc quy (Battery) hoặc báo lỗi mất một trong các mức điện áp DC cung cấp cho các khối card.\n\nYêu cầu thực hiện:\n1. Truy cập vào phần mềm PMDT để đọc các cảnh báo hiện hành.\n2. Xác định chính xác cảnh báo thuộc về thành phần nguồn AC đầu vào, khối nguồn sạc BCPS hay khối nguồn thứ cấp LVPS.\n3. Đo đạc và đánh giá mức điện áp thực tế để quyết định hiệu chỉnh chiết áp hoặc thay thế khối phần cứng.',
    overrides: [
      { fieldId: 'alert', value: true, status: 'yellow' },
      { fieldId: 'generalAlerts.ac-power-failure.checked', value: true },
      { fieldId: 'generalAlerts.sys48-ps1.checked', value: true },
      { fieldId: 'systemPowerStatus.1.tx1', value: 'yellow', status: 'yellow' },
      { fieldId: 'systemPowerStatus.0.tx1', value: 'yellow', status: 'yellow' }
    ],
    expected_checkpoints: [
      {
        id: 'cp1',
        order: 1,
        viewId: 'rms-maintenance-alerts',
        menuPath: ['RMS', 'Data'],
        title: 'Kiểm tra cảnh báo bảo dưỡng RMS',
        guidance: 'Truy cập RMS >> Data >> Maintenance Alerts/Alarms để kiểm tra các cảnh báo hiện hành.',
        required: true,
        points: 30
      },
      {
        id: 'cp2',
        order: 2,
        viewId: 'rms-digital-io',
        menuPath: ['RMS', 'Data'],
        title: 'Kiểm tra Digital I/O và trạng thái nguồn',
        guidance: 'Truy cập RMS >> Data >> Digital I/O để kiểm tra trạng thái chỉ thị Battery Fault và On Battery.',
        required: true,
        points: 30
      },
      {
        id: 'cp3',
        order: 3,
        viewId: 'rms-logs-maintenance',
        menuPath: ['RMS', 'Logs'],
        title: 'Kiểm tra nhật ký bảo dưỡng',
        guidance: 'Truy cập RMS >> Logs >> Maintenance History để xem lịch sử xuất hiện cảnh báo nguồn.',
        required: true,
        points: 40
      }
    ],
    hardware_task: {
      expectedComponentIds: ['vor-bcps-1'],
      faultType: 'Volt Adj / Replacement',
      adminNote: 'Cần đo áp tại BCPS 1, dùng chiết áp điều chỉnh Volt Adj hoặc thay thế BCPS 1.'
    },
    created_at: new Date().toISOString()
  },
  {
    id: 'vor-scenario-sideband-vswr',
    title: 'Cảnh báo VSWR Anten biên tần (Sideband Antenna VSWR) và tín hiệu vết lõm (Notch)',
    description: 'Hệ thống DVOR tự động ngắt máy phát 1 (Shutdown) và chuyển đổi sang máy phát 2 (Transfer). Kỹ thuật viên nhận thấy cảnh báo liên quan đến tỷ số sóng đứng của dàn anten biên tần ngoài trời hoặc cảnh báo giám sát vết lõm tín hiệu từ anten Field Monitor.',
    difficulty: 'medium',
    prompt: 'Hệ thống DVOR tự động ngắt máy phát 1 (Shutdown) và chuyển đổi sang máy phát 2 (Transfer). Kỹ thuật viên nhận thấy cảnh báo liên quan đến tỷ số sóng đứng của dàn anten biên tần ngoài trời hoặc cảnh báo giám sát vết lõm tín hiệu từ anten Field Monitor.\n\nYêu cầu thực hiện:\n1. Truy cập PMDT để xác định anten biên tần (Sideband) nào đang bị lỗi VSWR.\n2. Sử dụng giao diện Notch Monitor để xác nhận suy hao tín hiệu bức xạ.\n3. Cô lập lỗi xem nguyên nhân là do bản thân Anten/cáp RF, do bộ chuyển mạch Commutator hay do lỗi mạch đo lường VSWR trên khối Sideband Amplifier.',
    overrides: [
      { fieldId: 'transmitters.tx1.main', value: 'gray', status: 'gray' },
      { fieldId: 'transmitters.tx1.off', value: 'red', status: 'red' },
      { fieldId: 'transmitters.tx2.main', value: 'green', status: 'green' },
      { fieldId: 'transmitters.tx2.off', value: 'gray', status: 'gray' },
      { fieldId: 'monitorAgenAlerts.5.mon1', value: true },
      { fieldId: 'monitorAgenAlerts.6.mon1', value: true },
      { fieldId: 'vswrData.10', value: 2.85, status: 'red' },
      { fieldId: 'vswrData.12', value: 2.65, status: 'red' }
    ],
    expected_checkpoints: [
      {
        id: 'cp1',
        order: 1,
        viewId: 'rms-logs-alarms',
        menuPath: ['RMS', 'Logs'],
        title: 'Kiểm tra lịch sử cảnh báo alarm',
        guidance: 'Mở RMS >> Logs >> Alarm History để xác định nguyên nhân đài tự động ngắt máy phát 1 (Shutdown) và chuyển sang máy phát 2 (Transfer).',
        required: true,
        points: 30
      },
      {
        id: 'cp2',
        order: 2,
        viewId: 'monitor-sideband-vswr',
        menuPath: ['Monitors', 'Data'],
        title: 'Kiểm tra tỷ số sóng đứng Sideband VSWR',
        guidance: 'Vào Monitors >> Data >> Sideband Antenna VSWR để xác định những anten nào đang báo lỗi chỉ số VSWR cao (>1.2).',
        required: true,
        points: 40
      },
      {
        id: 'cp3',
        order: 3,
        viewId: 'tx-status-1',
        menuPath: ['Transmitters', 'Data'],
        title: 'Kiểm tra trạng thái Transmitter 1',
        guidance: 'Truy cập Transmitters >> Data >> Status - Tx1 để kiểm tra chi tiết lỗi máy phát.',
        required: true,
        points: 30
      }
    ],
    hardware_task: {
      expectedComponentIds: ['vor-sideband-antennas'],
      faultType: 'Antenna / RF Cable Damage',
      adminNote: 'Xác định lỗi VSWR cao trên anten biên tần số 11. Đo kiểm và thay thế cáp hoặc anten bị hỏng.'
    },
    created_at: new Date().toISOString()
  },
  {
    id: 'vor-scenario-sb-unlocked',
    title: 'Lỗi lệch pha dải biên và mất đồng bộ Synthesizer',
    description: 'Chất lượng tín hiệu dẫn đường trong không gian bị suy giảm nghiêm trọng. Hệ thống cảnh báo lệch pha giữa sóng mang (Carrier) và sóng dải biên (Sideband) hoặc báo các tần số không khóa được pha (Unlock).',
    difficulty: 'hard',
    prompt: 'Chất lượng tín hiệu dẫn đường trong không gian bị suy giảm nghiêm trọng. Hệ thống cảnh báo lệch pha giữa sóng mang (Carrier) và sóng dải biên (Sideband) hoặc báo các tần số không khóa được pha (Unlock).\n\nYêu cầu thực hiện:\n1. Chạy chương trình chẩn đoán Diagnostics để hệ thống tự cách ly lỗi.\n2. Kiểm tra chi tiết menu trạng thái máy phát để tìm ra vòng khóa pha (PLL) nào đang mất đồng bộ.\n3. Thực hiện đo đạc tín hiệu Phase Error bằng dao động ký (Oscilloscope) và ra quyết định hiệu chỉnh bù pha bằng phần mềm hay thay thế phần cứng.',
    overrides: [
      { fieldId: 'alert', value: true, status: 'yellow' },
      { fieldId: 'sidebarParams.hz9960Mod.value', value: 24.5, status: 'warning' },
      { fieldId: 'sidebarParams.hz9960Mod.status', value: 'warning', status: 'warning' },
      { fieldId: 'sidebarParams.deviation.value', value: 12.1, status: 'alarm' },
      { fieldId: 'sidebarParams.deviation.status', value: 'alarm', status: 'alarm' },
      { fieldId: 'txSynthesizerAlerts.4.indicator', value: 'red', status: 'red' },
      { fieldId: 'txSynthesizerAlerts.1.indicator', value: 'red', status: 'red' },
      { fieldId: 'txOffsets.6.tx1', value: 162, status: 'yellow' },
      { fieldId: 'monitorAgenAlerts.4.agen1', value: true }
    ],
    expected_checkpoints: [
      {
        id: 'cp1',
        order: 1,
        viewId: 'tx-status-1',
        menuPath: ['Transmitters', 'Data'],
        title: 'Kiểm tra vòng khóa pha Synthesizer',
        guidance: 'Mở Transmitters >> Data >> Status - Tx1 để xem trạng thái LSB Unlocked trong nhóm Synthesizer Alerts.',
        required: true,
        points: 30
      },
      {
        id: 'cp2',
        order: 2,
        viewId: 'tx-config-offsets',
        menuPath: ['Transmitters', 'Configuration'],
        title: 'Kiểm tra Offsets máy phát',
        guidance: 'Mở Transmitters >> Configuration >> Offsets and Scale Factors để kiểm tra giá trị lệch pha Carrier Sideband Phase Offset.',
        required: true,
        points: 40
      },
      {
        id: 'cp3',
        order: 3,
        viewId: 'rms-maintenance-alerts',
        menuPath: ['RMS', "Data"],
        title: 'Kiểm tra cảnh báo RMS Maintenance',
        guidance: 'Mở RMS >> Data >> Maintenance Alerts/Alarms để xác nhận cảnh báo trên Audio Gen 1.',
        required: true,
        points: 30
      }
    ],
    hardware_task: {
      expectedComponentIds: ['vor-synth-1'],
      faultType: 'Synthesizer Frequency/Phase Unlock',
      adminNote: 'Xác định lỗi vòng khóa pha LSB Unlocked của Synthesizer 1. Học viên thực hiện đo TP3/TP4 trên card Synthesizer và căn chỉnh chiết áp R81.'
    },
    created_at: new Date().toISOString()
  }
];

// 3. Upsert data to Supabase
async function run() {
  console.log('Đang tải dữ liệu kịch bản lên bảng vor_scenarios...');
  
  // Format fields to match Postgres schema (expected_checkpoints -> expected_checkpoints)
  const rows = scenarios.map((sc) => ({
    id: sc.id,
    title: sc.title,
    description: sc.description,
    difficulty: sc.difficulty,
    prompt: sc.prompt,
    overrides: sc.overrides,
    expected_checkpoints: sc.expected_checkpoints,
    hardware_task: sc.hardware_task,
    created_at: sc.created_at,
    updated_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('vor_scenarios')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('Đã xảy ra lỗi khi upsert dữ liệu:', error);
    process.exit(1);
  }

  console.log('Thành công! Đã chèn/cập nhật 3 kịch bản vào database.');
  process.exit(0);
}

run();
