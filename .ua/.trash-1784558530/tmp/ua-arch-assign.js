const fs = require('fs');

const [inputPath, resultsPath, outputPath] = process.argv.slice(2);
if (!inputPath || !resultsPath || !outputPath) {
  console.error('Usage: node ua-arch-assign.js <input.json> <results.json> <layers.json>');
  process.exit(1);
}

const modelFiles = new Set([
  'src/lib/types.ts',
  'src/lib/vor-types.ts',
  'src/lib/dme-types.ts',
  'src/lib/equipment-diagram-types.ts',
  'src/lib/exams/types.ts',
  'src/lib/exams/client-types.ts',
  'src/lib/hardware-model.ts',
  'src/lib/vor-hardware-model.ts',
  'src/lib/dme-hardware-model.ts',
  'src/lib/fault-scenarios.ts',
  'src/lib/vor-pmdt-defaults.ts',
  'src/lib/dme-pmdt-defaults.ts',
  'src/lib/vor-menu-structure.ts',
  'src/lib/dme-menu-structure.ts',
  'src/lib/vor-sidebar-fields.ts',
  'src/lib/dme-sidebar-fields.ts',
  'src/lib/sensor-data-presets.ts',
  'src/lib/menu-data/index.ts',
  'src/lib/menu-data/ma-menus.ts',
  'src/lib/menu-data/menu-types.ts',
  'src/lib/menu-data/sa-menus.ts',
]);

const dataAccessFiles = new Set([
  'src/lib/storage.ts',
  'src/lib/vor-scenario-storage.ts',
  'src/lib/vor-submission-storage.ts',
  'src/lib/dme-scenario-storage.ts',
  'src/lib/dme-submission-storage.ts',
  'src/lib/exams/queries.ts',
]);

try {
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  if (!results.scriptCompleted) throw new Error('Structural analysis did not complete');
  if (results.fileStats.totalFileNodes !== input.fileNodes.length) {
    throw new Error('Structural result count does not match input count');
  }

  const layers = [
    {
      id: 'layer:ui',
      name: 'Giao Diện Và Điều Hướng',
      description: 'Các page, layout và React component tạo giao diện quản trị, học viên, PMDT VOR/DME, QCMS, terminal và quy trình thi.',
      nodeIds: [],
    },
    {
      id: 'layer:api',
      name: 'API Và Middleware',
      description: 'Các Next.js route handler cung cấp API kịch bản/bài nộp và proxy xác thực bảo vệ luồng truy cập ứng dụng.',
      nodeIds: [],
    },
    {
      id: 'layer:service',
      name: 'Nghiệp Vụ Và Mô Phỏng',
      description: 'Logic điều phối thi, chấm điểm, xác thực, chuẩn hóa và các engine mô phỏng terminal cùng trình bày kết quả.',
      nodeIds: [],
    },
    {
      id: 'layer:state',
      name: 'Quản Lý State',
      description: 'Các Zustand store quản lý state phiên mô phỏng, PMDT, kịch bản và bài nộp cho ADS-B, VOR và DME.',
      nodeIds: [],
    },
    {
      id: 'layer:types',
      name: 'Mô Hình Miền Và Dữ Liệu Nền',
      description: 'Type, mô hình thiết bị, topology, cấu trúc menu và dữ liệu mặc định làm nền dùng chung cho các module CNS.',
      nodeIds: [],
    },
    {
      id: 'layer:data',
      name: 'Dữ Liệu Và Persistence',
      description: 'Supabase client, mapper, storage adapter, truy vấn kỳ thi cùng schema, bảng và migration lưu trữ dữ liệu đào tạo.',
      nodeIds: [],
    },
    {
      id: 'layer:test',
      name: 'Kiểm Thử',
      description: 'Các bộ Vitest và Playwright kiểm chứng nghiệp vụ, state, UI, API và luồng end-to-end của trình mô phỏng.',
      nodeIds: [],
    },
    {
      id: 'layer:infrastructure',
      name: 'Tài Nguyên Và Tự Động Hóa',
      description: 'Ảnh tĩnh của ứng dụng và các script tạo, kiểm tra, tải media hướng dẫn lên kho lưu trữ đào tạo.',
      nodeIds: [],
    },
    {
      id: 'layer:config',
      name: 'Cấu Hình Và CI/CD',
      description: 'Cấu hình Next.js, TypeScript, CSS, kiểm thử, Supabase, Cloudflare/Vercel, Understand Anything và pipeline GitHub Actions.',
      nodeIds: [],
    },
    {
      id: 'layer:documentation',
      name: 'Tài Liệu Dự Án',
      description: 'Tài liệu tổng quan, kiến trúc, quy trình cộng tác, hướng dẫn triển khai và nhật ký phát triển cns-simulator.',
      nodeIds: [],
    },
  ];
  const byId = new Map(layers.map((layer) => [layer.id, layer]));

  function chooseLayer(node) {
    const filePath = (node.filePath || '').replace(/\\/g, '/');
    if (node.type === 'document') return 'layer:documentation';
    if (node.type === 'pipeline' || node.type === 'config') return 'layer:config';
    if (['table', 'schema', 'endpoint'].includes(node.type)) return 'layer:data';
    if (['service', 'resource'].includes(node.type)) return 'layer:infrastructure';
    if (filePath.startsWith('tests/')) return 'layer:test';
    if (filePath.startsWith('src/app/api/') || filePath === 'src/proxy.ts') return 'layer:api';
    if (filePath.startsWith('src/app/') || filePath.startsWith('src/components/')) return 'layer:ui';
    if (filePath.startsWith('src/stores/')) return 'layer:state';
    if (filePath.startsWith('src/lib/supabase/') || dataAccessFiles.has(filePath)) return 'layer:data';
    if (modelFiles.has(filePath)) return 'layer:types';
    if (filePath.startsWith('src/lib/')) return 'layer:service';
    if (filePath.startsWith('public/') || filePath.startsWith('scripts/')) return 'layer:infrastructure';
    if (
      !filePath.includes('/') ||
      filePath.startsWith('.ua/') ||
      filePath === 'supabase/config.toml'
    ) return 'layer:config';
    throw new Error(`No semantic layer rule for ${node.id} (${filePath})`);
  }

  for (const node of input.fileNodes) byId.get(chooseLayer(node)).nodeIds.push(node.id);
  for (const layer of layers) layer.nodeIds.sort();

  if (layers.length < 3 || layers.length > 10) throw new Error(`Invalid layer count: ${layers.length}`);
  if (layers.some((layer) => layer.nodeIds.length === 0)) throw new Error('Layer with no assigned nodes');
  const assigned = layers.flatMap((layer) => layer.nodeIds);
  const inputIds = input.fileNodes.map((node) => node.id);
  const assignedSet = new Set(assigned);
  const inputSet = new Set(inputIds);
  const duplicates = assigned.filter((id, index) => assigned.indexOf(id) !== index);
  const missing = inputIds.filter((id) => !assignedSet.has(id));
  const invented = assigned.filter((id) => !inputSet.has(id));
  if (assigned.length !== inputIds.length || assignedSet.size !== inputSet.size || duplicates.length || missing.length || invented.length) {
    throw new Error(JSON.stringify({ assigned: assigned.length, expected: inputIds.length, duplicates, missing, invented }));
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(layers, null, 2)}\n`);
  console.log(JSON.stringify({
    layers: layers.length,
    assigned: assigned.length,
    expected: inputIds.length,
    counts: Object.fromEntries(layers.map((layer) => [layer.id, layer.nodeIds.length])),
  }, null, 2));
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
