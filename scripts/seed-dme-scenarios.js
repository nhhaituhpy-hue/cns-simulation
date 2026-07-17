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

// 2. Define 3 DME scenarios data
const scenarios = [
  {
    id: 'dme-scenario-ac-power',
    title: 'Cảnh báo mất nguồn xoay chiều (AC Power Failure) và sụt áp khối cấp nguồn 1500W',
    description: 'Trạm DME 1119A đang hoạt động bình thường thì bất ngờ chuyển sang sử dụng nguồn điện từ hệ thống Ắc quy dự phòng (Battery). Hệ thống ghi nhận lỗi đầu vào điện lưới và gửi cảnh báo bảo dưỡng về trung tâm.',
    difficulty: 'easy',
    prompt: 'Trạm DME 1119A đang hoạt động bình thường thì bất ngờ chuyển sang sử dụng nguồn điện từ hệ thống Ắc quy dự phòng (Battery). Hệ thống ghi nhận lỗi đầu vào điện lưới và gửi cảnh báo bảo dưỡng về trung tâm.\n\nYêu cầu thực hiện:\n1. Sử dụng phần mềm PMDT để đọc trạng thái nguồn hiện hành.\n2. Xác định nguyên nhân mất điện là do điện lưới tại trạm thực sự bị mất hay do hỏng hóc bên trong khối nguồn AC/DC (Power Supply 1500W) của thiết bị DME 1119A.\n3. Đưa ra các bước đo đạc thực tế và quyết định xử lý khắc phục để khôi phục lại trạng thái Normal.',
    overrides: [
      { fieldId: 'alert', value: true, status: 'yellow' },
      { fieldId: 'rmsStatus.onBattery', value: true, status: 'yellow' },
      { fieldId: 'rmsStatus.acFailure', value: true, status: 'red' },
      { fieldId: 'rmsStatus.maintenanceAlert', value: true, status: 'yellow' }
    ],
    expected_checkpoints: [
      {
        id: 'cp1',
        order: 1,
        viewId: 'rms-status-main',
        menuPath: ['RMS', 'Status'],
        title: 'Kiểm tra RMS Status chính',
        guidance: 'Vào RMS >> Status >> RMS Status để kiểm tra cờ trạng thái AC Failure và On Battery.',
        required: true,
        points: 30
      },
      {
        id: 'cp2',
        order: 2,
        viewId: 'rms-logs-maintenance',
        menuPath: ['RMS', 'Logs'],
        title: 'Kiểm tra nhật ký bảo dưỡng',
        guidance: 'Mở RMS >> Logs >> Maintenance History để tìm lịch sử sự cố nguồn AC.',
        required: true,
        points: 40
      },
      {
        id: 'cp3',
        order: 3,
        viewId: 'monitor-integral',
        menuPath: ['Monitors', 'Data'],
        title: 'Kiểm tra các tham số đo lường',
        guidance: 'Vào Monitors >> Data >> Integral để kiểm tra các mức điện áp nguồn tích hợp.',
        required: true,
        points: 30
      }
    ],
    hardware_task: {
      expectedComponentIds: ['dme-tx-power-supply-1'],
      faultType: 'Volt Adj / Replacement',
      adminNote: 'Học viên cần xác định lỗi mất nguồn AC cấp cho máy phát 1. Đo kiểm và thay thế khối nguồn 1500W (1A24) bị hỏng.'
    },
    created_at: new Date().toISOString()
  },
  {
    id: 'dme-scenario-hpa-low-power',
    title: 'Cảnh báo suy giảm công suất phát (HPA Low Output Power) dẫn đến chuyển đổi máy phát',
    description: 'Đài DME 1119A là hệ thống công suất cao (1000W). Trong quá trình hoạt động, mức công suất phát của máy phát 1 (Tx1) đột ngột sụt giảm xuống dưới ngưỡng cảnh báo, khiến hệ thống kích hoạt logic tự động chuyển sang máy phát 2 (Transfer) để duy trì vùng phủ sóng.',
    difficulty: 'medium',
    prompt: 'Đài DME 1119A là hệ thống công suất cao (1000W). Trong quá trình hoạt động, mức công suất phát của máy phát 1 (Tx1) đột ngột sụt giảm xuống dưới ngưỡng cảnh báo, khiến hệ thống kích hoạt logic tự động chuyển sang máy phát 2 (Transfer) để duy trì vùng phủ sóng.\n\nYêu cầu thực hiện:\n1. Phân tích lịch sử cảnh báo để biết mức công suất thực tế trước khi máy chuyển đổi là bao nhiêu.\n2. Phân lập lỗi để xác định xem sự cố nằm ở dải khuếch đại công suất thấp (LPA) không đủ lực kích, hay do bản thân khối khuếch đại công suất cao (HPA) bị hỏng.',
    overrides: [
      { fieldId: 'transmitters.tx1.main', value: 'gray', status: 'gray' },
      { fieldId: 'transmitters.tx1.antenna', value: 'gray', status: 'gray' },
      { fieldId: 'transmitters.tx1.load', value: 'green', status: 'green' },
      { fieldId: 'transmitters.tx1.off', value: 'red', status: 'red' },
      { fieldId: 'transmitters.tx2.main', value: 'green', status: 'green' },
      { fieldId: 'transmitters.tx2.antenna', value: 'green', status: 'green' },
      { fieldId: 'transmitters.tx2.load', value: 'gray', status: 'gray' },
      { fieldId: 'transmitters.tx2.off', value: 'gray', status: 'gray' },
      { fieldId: 'sidebarParams.txPower.value', value: 450, status: 'alarm' },
      { fieldId: 'sidebarParams.txPower.status', value: 'alarm', status: 'alarm' },
      { fieldId: 'sidebarParams.erp.value', value: -3.5, status: 'alarm' },
      { fieldId: 'sidebarParams.erp.status', value: 'alarm', status: 'alarm' },
      { fieldId: 'paStatus.2.outputPower', value: 'red', status: 'red' },
      { fieldId: 'paStatus.2.powerSupply', value: 'red', status: 'red' }
    ],
    expected_checkpoints: [
      {
        id: 'cp1',
        order: 1,
        viewId: 'rms-logs-maintenance',
        menuPath: ['RMS', 'Logs'],
        title: 'Kiểm tra lịch sử bảo dưỡng RMS',
        guidance: 'Truy cập RMS >> Logs >> Maintenance History để tìm cảnh báo HPA 1 Low Output Power.',
        required: true,
        points: 30
      },
      {
        id: 'cp2',
        order: 2,
        viewId: 'monitor-integral',
        menuPath: ['Monitors', 'Data'],
        title: 'Kiểm tra tham số đo lường công suất phát',
        guidance: 'Mở Monitors >> Data >> Integral để so sánh công suất thực tế đo được trên Monitor.',
        required: true,
        points: 30
      },
      {
        id: 'cp3',
        order: 3,
        viewId: 'tx-data-main',
        menuPath: ['Transmitters', 'Data'],
        title: 'Kiểm tra tham số máy phát Transponder',
        guidance: 'Mở Transmitters >> Data >> Main để xem chi tiết bảng trạng thái PA Status và phát hiện lỗi HPA #1.',
        required: true,
        points: 40
      }
    ],
    hardware_task: {
      expectedComponentIds: ['dme-hpa-1'],
      faultType: 'HPA Failure / Replacement',
      adminNote: 'Xác định lỗi sụt giảm công suất tại khối HPA 1 (1A3) của máy phát 1. Đo kiểm và tiến hành thay thế khối HPA 1.'
    },
    created_at: new Date().toISOString()
  },
  {
    id: 'dme-scenario-reply-delay-offset',
    title: 'Sai lệch độ trễ trả lời (Reply Delay) và mất đồng bộ máy thu phát',
    description: 'Tàu bay báo cáo cự ly DME hiển thị bị sai số lớn so với thực tế hoặc chập chờn. Cùng lúc đó, thiết bị DME 1119A liên tục xuất hiện các cảnh báo đỏ liên quan đến độ trễ trả lời (Reply Delay).',
    difficulty: 'hard',
    prompt: 'Tàu bay báo cáo cự ly DME hiển thị bị sai số lớn so với thực tế hoặc chập chờn. Cùng lúc đó, thiết bị DME 1119A liên tục xuất hiện các cảnh báo đỏ liên quan đến độ trễ trả lời (Reply Delay).\n\nYêu cầu thực hiện:\n1. Kiểm tra tham số Delay đo được trên các Monitor.\n2. Thiết lập lại cấu hình thời gian trễ hệ thống bù trừ cho chiều dài cáp nội bộ.\n3. Sử dụng Oscilloscope đo tín hiệu tại các cổng Video để rà soát xung, sau đó ra quyết định hiệu chỉnh bằng phần mềm hoặc thay thế card phần cứng.',
    overrides: [
      { fieldId: 'monitors.integral.priAlarm', value: true, status: 'red' },
      { fieldId: 'monitors.integral.normal', value: false, status: 'gray' },
      { fieldId: 'sidebarParams.delay.value', value: 51.5, status: 'alarm' },
      { fieldId: 'sidebarParams.delay.status', value: 'alarm', status: 'alarm' },
      { fieldId: 'integralData.0.mon1Value', value: '51.52', status: 'alarm' },
      { fieldId: 'integralData.0.mon1Status', value: 'alarm', status: 'alarm' },
      { fieldId: 'integralData.0.mon2Value', value: '51.51', status: 'alarm' },
      { fieldId: 'integralData.0.mon2Status', value: 'alarm', status: 'alarm' },
      { fieldId: 'standbyData.0.mon1Value', value: '51.52', status: 'alarm' }
    ],
    expected_checkpoints: [
      {
        id: 'cp1',
        order: 1,
        viewId: 'rms-logs-alarms',
        menuPath: ['RMS', 'Logs'],
        title: 'Kiểm tra lịch sử báo động RMS',
        guidance: 'Mở RMS >> Logs >> Alarm History để kiểm tra lỗi trễ Reply Delay.',
        required: true,
        points: 30
      },
      {
        id: 'cp2',
        order: 2,
        viewId: 'monitor-integral',
        menuPath: ['Monitors', 'Data'],
        title: 'Kiểm tra đo lường độ trễ trả lời',
        guidance: 'Truy cập Monitors >> Data >> Integral để ghi nhận giá trị Delay bị sai lệch xa so với danh định.',
        required: true,
        points: 30
      },
      {
        id: 'cp3',
        order: 3,
        viewId: 'tx-config-nominal',
        menuPath: ['Transmitters', 'Configuration'],
        title: 'Kiểm tra cấu hình trễ danh định',
        guidance: 'Mở Transmitters >> Configuration >> Nominal Parameters để kiểm tra các hệ số bù trễ.',
        required: true,
        points: 40
      }
    ],
    hardware_task: {
      expectedComponentIds: ['dme-rtc-1'],
      faultType: 'RTC Delay Calibration / Replacement',
      adminNote: 'Lỗi do card RTC 1 (1A10) bị trôi trễ trả lời. Đo kiểm J5 low video của RTC và J5 của Monitor, thực hiện calibration bù độ trễ hoặc thay thế RTC.'
    },
    created_at: new Date().toISOString()
  }
];

// 3. Upsert data to Supabase
async function run() {
  console.log('Đang tải dữ liệu kịch bản DME lên bảng dme_scenarios...');
  
  // Format fields to match Postgres schema
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
    .from('dme_scenarios')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('Đã xảy ra lỗi khi upsert dữ liệu DME:', error);
    process.exit(1);
  }

  console.log('Thành công! Đã chèn/cập nhật 3 kịch bản DME vào database.');
  process.exit(0);
}

run();
