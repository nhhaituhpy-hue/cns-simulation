import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/nhhai/Desktop/cns-simulator";
const ua = path.join(root, ".ua");
const batchesDoc = JSON.parse(fs.readFileSync(path.join(ua, "intermediate/batches.json"), "utf8"));
const batches = Array.isArray(batchesDoc) ? batchesDoc : batchesDoc.batches;
const batch = batches.find((item) => item.batchIndex === 3);
const extraction = JSON.parse(fs.readFileSync(path.join(ua, "tmp/ua-file-extract-results-3.json"), "utf8"));

if (!batch || !extraction.scriptCompleted || extraction.filesAnalyzed !== batch.files.length) {
  throw new Error("Dữ liệu batch hoặc kết quả extractor không đầy đủ.");
}

const fileInfo = {
  "src/app/admin/ads-b/page.tsx": ["Route App Router mở dashboard quản trị ADS-B bằng cách cấu hình module hoạt động cho dashboard dùng chung.", ["nextjs-route", "component", "admin", "ads-b"]],
  "src/app/admin/dme/page.tsx": ["Route App Router mở dashboard quản trị DME bằng cách cấu hình module hoạt động cho dashboard dùng chung.", ["nextjs-route", "component", "admin", "dme"]],
  "src/app/admin/vor/page.tsx": ["Route App Router mở dashboard quản trị VOR bằng cách cấu hình module hoạt động cho dashboard dùng chung.", ["nextjs-route", "component", "admin", "vor"]],
  "src/app/student/ads-b/page.tsx": ["Route App Router mở dashboard học viên ADS-B thông qua dashboard QC/M dùng chung.", ["nextjs-route", "component", "student", "ads-b"]],
  "src/app/student/dme/page.tsx": ["Route App Router mở dashboard học viên DME thông qua dashboard QC/M dùng chung.", ["nextjs-route", "component", "student", "dme"]],
  "src/app/student/loading.tsx": ["Loading UI của nhánh route học viên, hiển thị skeleton trong khi trang dashboard đang được tải.", ["nextjs-route", "loading-ui", "component", "skeleton"]],
  "src/app/student/vor/page.tsx": ["Route App Router mở dashboard học viên VOR thông qua dashboard QC/M dùng chung.", ["nextjs-route", "component", "student", "vor"]],
  "src/components/admin/admin-dashboard.tsx": ["Dashboard quản trị cấp cao điều phối giao diện VOR, DME và ADS-B, hydrate kho kịch bản, sắp xếp dữ liệu và xử lý xác nhận xóa.", ["component", "admin-dashboard", "module-routing", "scenario-management", "zustand"]],
  "src/components/admin/delete-scenario-dialog.tsx": ["Dialog xác nhận xóa kịch bản dùng HTML dialog, quản lý focus và ngăn đóng ngoài ý muốn khi đang xử lý.", ["component", "dialog", "confirmation", "accessibility"]],
  "src/components/dme/admin/dme-admin-dashboard.tsx": ["Dashboard quản trị DME tổng hợp kịch bản và lượt nộp, hydrate các store, trình bày trạng thái tham số và cung cấp thao tác xem hoặc xóa.", ["component", "admin-dashboard", "dme", "scenario-management", "zustand"]],
  "src/components/qcms/student-dashboard.tsx": ["Dashboard học viên QC/M chọn giao diện theo module CNS, hydrate và sắp xếp kịch bản ADS-B, đồng thời ủy quyền VOR/DME cho dashboard chuyên biệt.", ["component", "student-dashboard", "module-routing", "scenario-list", "zustand"]],
  "src/components/qcms/student-loading.tsx": ["Cung cấp skeleton tái sử dụng cho danh sách kịch bản học viên và màn hình giám sát trong lúc dữ liệu đang tải.", ["component", "loading-ui", "skeleton", "student-dashboard"]],
  "src/components/ui/exam-workspace.tsx": ["Bộ component trình bày workspace bài thi gồm header, tóm tắt module, tiêu đề khu vực, khung danh sách, hàng loading và empty state.", ["component", "ui-library", "exam-workspace", "layout", "accessibility"]],
  "src/components/ui/scenario-data-table.tsx": ["Bảng kịch bản tổng quát có tìm kiếm tiếng Việt không dấu, phân trang, trạng thái rỗng và API render cell linh hoạt.", ["component", "data-table", "search", "pagination", "accessibility"]],
  "src/components/vor/admin/vor-admin-dashboard.tsx": ["Dashboard quản trị VOR tổng hợp kịch bản và lượt nộp, hydrate các store, trình bày trạng thái tham số và cung cấp thao tác xem hoặc xóa.", ["component", "admin-dashboard", "vor", "scenario-management", "zustand"]],
  "src/lib/scenario-normalization.ts": ["Chuẩn hóa dữ liệu kịch bản chưa tin cậy thành cấu trúc Scenario tương thích, bao gồm giá trị mặc định cho site, sensor và hardware fault cũ.", ["utility", "normalization", "data-model", "backward-compatibility"]],
  "src/lib/scenario-order.ts": ["Cung cấp quy tắc sắp xếp kịch bản theo thời điểm cập nhật/tạo và định dạng số thứ tự cố định hai chữ số.", ["utility", "sorting", "formatting", "scenario"]],
  "src/lib/storage.ts": ["Lớp persistence cho kịch bản: kiểm tra sâu dữ liệu runtime, chuẩn hóa phiên bản cũ, serialize/deserialize có version và thao tác CRUD trên Web Storage.", ["service", "validation", "serialization", "storage", "type-guards"]],
  "src/stores/scenario-store.ts": ["Factory Zustand quản lý vòng đời kịch bản ADS-B với hydrate từ API/localStorage, CRUD đồng bộ lạc quan, reset và cơ chế báo lỗi persistence.", ["state-management", "zustand", "scenario", "persistence", "api-client"]],
  "tests/admin/admin-dashboard.test.tsx": ["Kiểm thử dashboard quản trị về hydrate dữ liệu, render danh sách, điều hướng module và quy trình xác nhận xóa kịch bản.", ["test", "component-test", "admin-dashboard", "scenario-management"]],
  "tests/core/scenario-normalization.test.ts": ["Kiểm thử chuẩn hóa kịch bản, đặc biệt khả năng bổ sung các trường mới khi đọc dữ liệu lịch sử thiếu cấu trúc.", ["test", "unit-test", "normalization", "backward-compatibility"]],
  "tests/core/scenario-order.test.ts": ["Kiểm thử thứ tự kịch bản theo mốc thời gian và định dạng số thứ tự hiển thị.", ["test", "unit-test", "sorting", "formatting"]],
  "tests/core/storage.test.ts": ["Kiểm thử validation, serialization và deserialization của kho kịch bản, bao gồm dữ liệu hợp lệ và payload hỏng.", ["test", "unit-test", "storage", "serialization", "validation"]],
  "tests/layout/module-routing.test.tsx": ["Kiểm thử dashboard cấp cao chuyển đúng sang UI và store của từng module VOR, DME hoặc ADS-B.", ["test", "component-test", "module-routing", "dashboard"]],
  "tests/layout/scenario-data-table.test.tsx": ["Kiểm thử bảng kịch bản về render, tìm kiếm không dấu và điều khiển phân trang.", ["test", "component-test", "data-table", "search", "pagination"]],
  "tests/qcms/student-dashboard.test.tsx": ["Kiểm thử dashboard học viên QC/M về hydrate, sắp xếp và hiển thị danh sách kịch bản theo module.", ["test", "component-test", "student-dashboard", "scenario-list"]],
  "tests/state/scenario-store.test.ts": ["Kiểm thử Zustand scenario store về hydrate, CRUD, persistence, reset và các nhánh lỗi storage/API.", ["test", "unit-test", "zustand", "state-management", "persistence"]],
};

const functionInfo = {
  AdsbAdminDashboardPage: ["Render dashboard quản trị với module ADS-B được chọn.", ["component", "nextjs-route", "admin"]],
  DmeAdminDashboardPage: ["Render dashboard quản trị với module DME được chọn.", ["component", "nextjs-route", "admin"]],
  VorAdminDashboardPage: ["Render dashboard quản trị với module VOR được chọn.", ["component", "nextjs-route", "admin"]],
  AdsbStudentDashboardPage: ["Render dashboard học viên với module ADS-B được chọn.", ["component", "nextjs-route", "student"]],
  DmeStudentDashboardPage: ["Render dashboard học viên với module DME được chọn.", ["component", "nextjs-route", "student"]],
  VorStudentDashboardPage: ["Render dashboard học viên với module VOR được chọn.", ["component", "nextjs-route", "student"]],
  StudentLoading: ["Render loading UI mặc định cho nhánh route học viên.", ["component", "loading-ui", "nextjs-route"]],
  AdminDashboard: ["Điều phối dashboard quản trị theo module, tải danh sách kịch bản và xử lý luồng xóa có xác nhận.", ["component", "admin-dashboard", "event-handler", "zustand"]],
  DeleteScenarioDialog: ["Hiển thị dialog modal xác nhận xóa, đồng bộ trạng thái mở và chuyển tiếp hành động xác nhận/hủy.", ["component", "dialog", "event-handler", "accessibility"]],
  DmeAdminDashboard: ["Render workspace quản trị DME từ scenario store và submission store, kèm trạng thái, kết quả và thao tác quản lý.", ["component", "admin-dashboard", "dme", "zustand"]],
  ScenarioCells: ["Render các ô dữ liệu cho một kịch bản ADS-B, gồm số thứ tự, mức độ, số sensor và liên kết bắt đầu.", ["component", "table-row", "scenario", "ads-b"]],
  StudentDashboard: ["Chọn dashboard học viên phù hợp module và render danh sách kịch bản ADS-B đã sắp xếp.", ["component", "student-dashboard", "module-routing", "zustand"]],
  StudentDashboardLoading: ["Render skeleton hoàn chỉnh của dashboard học viên và các hàng kịch bản giả lập.", ["component", "loading-ui", "skeleton"]],
  ScenarioMonitorLoading: ["Render skeleton gọn cho vùng giám sát kịch bản.", ["component", "loading-ui", "monitoring"]],
  WorkspaceHeader: ["Render header workspace theo vai trò cùng tiêu đề và mô tả ngữ cảnh.", ["component", "layout", "header"]],
  ModuleSummary: ["Render thẻ tóm tắt module với icon và vùng action tùy chọn.", ["component", "summary", "layout"]],
  ScenarioSectionHeader: ["Render tiêu đề khu vực kịch bản cùng số lượng và mô tả hỗ trợ.", ["component", "section-header", "scenario"]],
  ScenarioListFrame: ["Bọc nội dung danh sách trong khung giao diện thống nhất.", ["component", "layout", "container"]],
  LoadingRows: ["Render ba hàng skeleton có nhãn cho trạng thái tải dữ liệu.", ["component", "loading-ui", "skeleton"]],
  EmptyState: ["Render trạng thái rỗng có icon, mô tả và action tùy chọn.", ["component", "empty-state", "accessibility"]],
  ScenarioDataTable: ["Lọc kịch bản theo tiêu đề đã chuẩn hóa, tính trang hợp lệ và render bảng cùng bộ điều khiển phân trang.", ["component", "data-table", "search", "pagination"]],
  VorAdminDashboard: ["Render workspace quản trị VOR từ scenario store và submission store, kèm trạng thái, kết quả và thao tác quản lý.", ["component", "admin-dashboard", "vor", "zustand"]],
  normalizeScenario: ["Chuẩn hóa một giá trị đầu vào thành Scenario và bổ sung cấu trúc mặc định cho dữ liệu cũ khi cần.", ["utility", "normalization", "type-guard", "scenario"]],
  normalizeScenarioList: ["Áp dụng chuẩn hóa lần lượt cho toàn bộ danh sách kịch bản.", ["utility", "normalization", "collection"]],
  sortScenariosByRecency: ["Trả về bản sao danh sách được sắp giảm dần theo updatedAt, rồi createdAt và id để ổn định thứ tự.", ["utility", "sorting", "scenario"]],
  formatScenarioNumber: ["Định dạng chỉ số kịch bản thành số thứ tự hai chữ số.", ["utility", "formatting", "scenario"]],
  isMonitoringData: ["Type guard kiểm tra đầy đủ timestamp, số liệu giám sát và trạng thái đồng bộ của sensor.", ["type-guard", "validation", "monitoring"]],
  isSensorDataProfile: ["Type guard kiểm tra sâu profile cấu hình sensor, client, SNMP, site monitor và các nhóm thông số thiết bị.", ["type-guard", "validation", "sensor-profile"]],
  isSensorState: ["Type guard xác nhận trạng thái sensor, nhãn dự kiến, monitoring data và data profile đi kèm.", ["type-guard", "validation", "sensor-state"]],
  isSiteState: ["Type guard xác nhận site cùng hai sensor A/B có cấu trúc hợp lệ.", ["type-guard", "validation", "site-state"]],
  isRecordedAction: ["Type guard kiểm tra action được ghi lại theo thứ tự, loại thao tác và dữ liệu thời gian.", ["type-guard", "validation", "recorded-action"]],
  isQcmsEvent: ["Type guard kiểm tra event log QC/M và giới hạn loại sự kiện được hỗ trợ.", ["type-guard", "validation", "event-log"]],
  isHardwareFault: ["Type guard kiểm tra topology phần cứng, signal path, component lỗi và tính toàn vẹn của các ID tham chiếu.", ["type-guard", "validation", "hardware-fault", "graph-integrity"]],
  isScenario: ["Type guard kiểm tra toàn bộ Scenario, bảo đảm site/sensor, fault, event và expected action nhất quán.", ["type-guard", "validation", "scenario"]],
  assertValidScenario: ["Ném ScenarioStorageError có ngữ cảnh khi dữ liệu không thỏa schema Scenario runtime.", ["validation", "error-handling", "scenario"]],
  createEmptyScenarioStorage: ["Tạo payload storage rỗng theo version schema hiện hành.", ["factory", "storage", "serialization"]],
  deserializeScenarioStorage: ["Parse payload storage, kiểm tra version, chuẩn hóa kịch bản cũ và xác thực từng phần tử trước khi sử dụng.", ["deserialization", "validation", "storage", "migration"]],
  serializeScenarioStorage: ["Xác thực và chuyển danh sách kịch bản thành JSON storage có version và bản sao dữ liệu.", ["serialization", "validation", "storage"]],
  loadScenarios: ["Đọc payload theo key từ Web Storage rồi deserialize thành danh sách kịch bản.", ["storage", "deserialization", "utility"]],
  saveScenarios: ["Serialize danh sách và ghi vào Web Storage theo key cấu hình.", ["storage", "serialization", "utility"]],
  clearScenarios: ["Xóa dữ liệu kịch bản khỏi Web Storage theo key cấu hình.", ["storage", "utility", "cleanup"]],
  upsertScenario: ["Xác thực rồi thêm mới hoặc thay thế kịch bản có cùng id mà không đột biến mảng nguồn.", ["utility", "crud", "validation", "scenario"]],
  removeScenario: ["Tạo danh sách mới sau khi loại bỏ kịch bản theo id.", ["utility", "crud", "scenario"]],
  createScenarioStore: ["Tạo Zustand store có dependency injection cho storage, fetch, clock và ID; triển khai hydrate, CRUD, reset và đồng bộ API.", ["factory", "zustand", "state-management", "persistence", "api-client"]],
  scenarioFixture: ["Tạo fixture Scenario hợp lệ và cho phép ghi đè từng trường phục vụ kiểm thử dashboard.", ["test-fixture", "factory", "scenario"]],
  scenario: ["Tạo Scenario tối giản với timestamp tùy biến để kiểm thử quy tắc sắp xếp.", ["test-fixture", "factory", "scenario"]],
  validScenario: ["Tạo Scenario đầy đủ, hợp lệ để kiểm thử lớp storage và validation.", ["test-fixture", "factory", "scenario"]],
  renderTable: ["Render ScenarioDataTable với dữ liệu và cấu hình cột cố định phục vụ từng test case.", ["test-helper", "component-test", "data-table"]],
  scenarioInput: ["Tạo ScenarioInput mặc định và hỗ trợ override để kiểm thử các action của store.", ["test-fixture", "factory", "state-management"]],
};

const classInfo = {
  ScenarioStorageError: ["Lỗi chuyên biệt của tầng storage, giữ mã lỗi có kiểu và nguyên nhân gốc để chẩn đoán persistence.", ["error-handling", "storage", "validation"]],
};

function complexity(lines) {
  if (lines > 200) return "complex";
  if (lines >= 50) return "moderate";
  return "simple";
}

function noteFor(filePath) {
  const notes = {
    "src/components/ui/scenario-data-table.tsx": "TSX dùng generic ScenarioDataTableProps<T> để bảng giữ type-safe cho nhiều kiểu kịch bản; chuỗi tìm kiếm được normalize Unicode theo locale vi-VN.",
    "src/lib/storage.ts": "TypeScript type guards thu hẹp unknown theo từng tầng và kiểm tra tham chiếu chéo trong topology phần cứng trước khi deserialize.",
    "src/stores/scenario-store.ts": "Factory inject các dependency tùy chọn và dùng Zustand generic create<ScenarioStore>() để giữ type-safe cho state lẫn actions.",
    "src/components/admin/admin-dashboard.tsx": "TSX sử dụng union type CnsModule để điều phối render theo module và selector Zustand riêng cho từng phần state.",
  };
  return notes[filePath];
}

const resultByPath = new Map(extraction.results.map((entry) => [entry.path, entry]));
const nodes = [];
const edges = [];
const emitted = new Set();
const exportedByFile = new Map();

for (const batchFile of batch.files) {
  const info = resultByPath.get(batchFile.path);
  if (!info) throw new Error(`Extractor thiếu file ${batchFile.path}`);
  const [summary, tags] = fileInfo[batchFile.path];
  const fileNode = {
    id: `file:${batchFile.path}`,
    type: "file",
    name: path.posix.basename(batchFile.path),
    filePath: batchFile.path,
    summary,
    tags,
    complexity: complexity(info.nonEmptyLines),
  };
  const languageNotes = noteFor(batchFile.path);
  if (languageNotes) fileNode.languageNotes = languageNotes;
  nodes.push(fileNode);
  emitted.add(fileNode.id);

  const exported = new Set((info.exports ?? []).map((item) => item.name));
  exportedByFile.set(batchFile.path, exported);
  for (const fn of info.functions ?? []) {
    const lines = fn.endLine - fn.startLine + 1;
    if (lines < 10 && !exported.has(fn.name)) continue;
    const detail = functionInfo[fn.name];
    if (!detail) throw new Error(`Thiếu semantic metadata cho function ${batchFile.path}:${fn.name}`);
    const id = `function:${batchFile.path}:${fn.name}`;
    nodes.push({
      id,
      type: "function",
      name: fn.name,
      filePath: batchFile.path,
      lineRange: [fn.startLine, fn.endLine],
      summary: detail[0],
      tags: detail[1],
      complexity: complexity(lines),
    });
    emitted.add(id);
    edges.push({ source: fileNode.id, target: id, type: "contains", direction: "forward", weight: 1.0 });
    if (exported.has(fn.name)) {
      edges.push({ source: fileNode.id, target: id, type: "exports", direction: "forward", weight: 0.8 });
    }
  }

  for (const cls of info.classes ?? []) {
    const lines = cls.endLine - cls.startLine + 1;
    if (lines < 20 && (cls.methods ?? []).length < 2 && !exported.has(cls.name)) continue;
    const detail = classInfo[cls.name];
    if (!detail) throw new Error(`Thiếu semantic metadata cho class ${batchFile.path}:${cls.name}`);
    const id = `class:${batchFile.path}:${cls.name}`;
    nodes.push({
      id,
      type: "class",
      name: cls.name,
      filePath: batchFile.path,
      lineRange: [cls.startLine, cls.endLine],
      summary: detail[0],
      tags: detail[1],
      complexity: complexity(lines),
    });
    emitted.add(id);
    edges.push({ source: fileNode.id, target: id, type: "contains", direction: "forward", weight: 1.0 });
    if (exported.has(cls.name)) {
      edges.push({ source: fileNode.id, target: id, type: "exports", direction: "forward", weight: 0.8 });
    }
  }
}

// Mỗi project-internal import trong batchImportData phải phát sinh đúng một cạnh.
for (const batchFile of batch.files) {
  for (const target of batch.batchImportData[batchFile.path] ?? []) {
    edges.push({
      source: `file:${batchFile.path}`,
      target: `file:${target}`,
      type: "imports",
      direction: "forward",
      weight: 0.7,
    });
  }
}

// Bổ sung call edges nội bộ chỉ khi cả caller và callee đều là function node đã phát hành.
for (const info of extraction.results) {
  for (const call of info.callGraph ?? []) {
    const source = `function:${info.path}:${call.caller}`;
    const target = `function:${info.path}:${call.callee}`;
    if (source !== target && emitted.has(source) && emitted.has(target)) {
      const key = `${source}|${target}|calls`;
      if (!edges.some((edge) => `${edge.source}|${edge.target}|${edge.type}` === key)) {
        edges.push({ source, target, type: "calls", direction: "forward", weight: 0.8 });
      }
    }
  }
}

const testedPairs = [
  ["src/components/admin/admin-dashboard.tsx", "tests/admin/admin-dashboard.test.tsx"],
  ["src/lib/scenario-normalization.ts", "tests/core/scenario-normalization.test.ts"],
  ["src/lib/scenario-order.ts", "tests/core/scenario-order.test.ts"],
  ["src/lib/storage.ts", "tests/core/storage.test.ts"],
  ["src/components/admin/admin-dashboard.tsx", "tests/layout/module-routing.test.tsx"],
  ["src/components/qcms/student-dashboard.tsx", "tests/layout/module-routing.test.tsx"],
  ["src/components/ui/scenario-data-table.tsx", "tests/layout/scenario-data-table.test.tsx"],
  ["src/components/qcms/student-dashboard.tsx", "tests/qcms/student-dashboard.test.tsx"],
  ["src/stores/scenario-store.ts", "tests/state/scenario-store.test.ts"],
];
for (const [production, test] of testedPairs) {
  edges.push({ source: `file:${production}`, target: `file:${test}`, type: "tested_by", direction: "forward", weight: 0.5 });
}

const importExpected = batch.files.reduce((count, item) => count + (batch.batchImportData[item.path] ?? []).length, 0);
const importActual = edges.filter((edge) => edge.type === "imports").length;
if (importActual !== importExpected) throw new Error(`Sai import edges: ${importActual}/${importExpected}`);
if (new Set(nodes.map((node) => node.id)).size !== nodes.length) throw new Error("Có node ID trùng lặp.");
if (edges.some((edge) => edge.source === edge.target)) throw new Error("Có self edge.");

const nodeCount = nodes.length;
const edgeCount = edges.length;
const parts = Math.ceil(Math.max(nodeCount / 60, edgeCount / 120));
const sortedFiles = [...batch.files].sort((a, b) => a.path.localeCompare(b.path)).map((item) => item.path);
const chunkSize = Math.ceil(sortedFiles.length / parts);
const written = [];
const knownFilePaths = new Set([
  ...batch.files.map((item) => item.path),
  ...Object.values(batch.batchImportData).flat(),
  ...Object.keys(batch.neighborMap ?? {}),
  ...Object.values(batch.neighborMap ?? {}).flat().map((item) => item.path),
]);

for (let index = 0; index < parts; index += 1) {
  const paths = new Set(sortedFiles.slice(index * chunkSize, (index + 1) * chunkSize));
  const partNodes = nodes.filter((node) => paths.has(node.filePath));
  const sourceIds = new Set(partNodes.map((node) => node.id));
  const partEdges = edges.filter((edge) => sourceIds.has(edge.source));
  for (const edge of partEdges) {
    const targetLocal = sourceIds.has(edge.target);
    const fileMatch = edge.target.match(/^file:(.+)$/);
    const functionMatch = edge.target.match(/^(?:function|class):(.+):([^:]+)$/);
    const targetKnownFile = fileMatch && knownFilePaths.has(fileMatch[1]);
    const targetKnownSymbol = functionMatch && Object.values(batch.neighborMap ?? {}).flat().some(
      (neighbor) => neighbor.path === functionMatch[1] && (neighbor.symbols ?? []).includes(functionMatch[2]),
    );
    const targetInBatch = emitted.has(edge.target);
    if (!targetLocal && !targetKnownFile && !targetKnownSymbol && !targetInBatch) {
      throw new Error(`Part ${index + 1}: target không hợp lệ ${edge.target}`);
    }
  }
  const outputPath = parts === 1
    ? path.join(ua, "intermediate/batch-3.json")
    : path.join(ua, `intermediate/batch-3-part-${index + 1}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify({ nodes: partNodes, edges: partEdges }, null, 2)}\n`, "utf8");
  JSON.parse(fs.readFileSync(outputPath, "utf8"));
  written.push({ outputPath, nodes: partNodes.length, edges: partEdges.length });
}

console.log(JSON.stringify({ nodeCount, edgeCount, importExpected, importActual, parts, written }, null, 2));
