import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/nhhai/Desktop/cns-simulator";
const ua = path.join(root, ".ua");
const batchesDoc = JSON.parse(fs.readFileSync(path.join(ua, "intermediate/batches.json"), "utf8"));
const batch = (Array.isArray(batchesDoc) ? batchesDoc : batchesDoc.batches).find((item) => item.batchIndex === 7);
const extraction = JSON.parse(fs.readFileSync(path.join(ua, "tmp/ua-file-extract-results-7.json"), "utf8"));
if (!batch || !extraction.scriptCompleted || extraction.filesAnalyzed !== batch.files.length) throw new Error("Batch 7 hoặc extraction không đầy đủ.");

const fileInfo = {
  "src/components/dme/screens/rms-logs-alarms.tsx": ["Màn hình RMS hiển thị alarm log DME theo thời gian, nội dung và trạng thái đã resolve từ PMDT store.", ["component", "rms", "alarm-log", "monitoring"]],
  "src/components/dme/screens/rms-logs-layout.tsx": ["Màn hình điều hướng nhóm RMS Logs bằng tab, chuyển giữa alarm log và maintenance log qua active view của store.", ["component", "rms", "logs", "tabs", "navigation"]],
  "src/components/dme/screens/rms-logs-maintenance.tsx": ["Màn hình RMS hiển thị maintenance log DME theo thời gian, nội dung và trạng thái đã resolve.", ["component", "rms", "maintenance-log", "monitoring"]],
  "src/components/dme/screens/rms-maintenance-alerts.tsx": ["Màn hình cảnh báo bảo trì RMS, trình bày các điều kiện cảnh báo với indicator trạng thái theo dữ liệu PMDT.", ["component", "rms", "maintenance", "alerts", "monitoring"]],
  "src/components/dme/screens/rms-power-supply.tsx": ["Màn hình nguồn RMS tổng hợp điện áp, dòng điện, trạng thái và indicator cho các rail nguồn của thiết bị DME.", ["component", "rms", "power-supply", "monitoring", "dme"]],
  "src/components/dme/screens/rms-status-layout.tsx": ["Nhóm màn hình trạng thái RMS hiển thị cờ hệ thống và tình trạng transmitter/monitor, chọn nội dung theo active view.", ["component", "rms", "status", "screen-router", "monitoring"]],
  "src/components/dme/screens/rtc-data.tsx": ["Màn hình dữ liệu RTC của DME, trình bày ngày giờ và các tham số đồng hồ đã resolve từ kịch bản.", ["component", "rtc", "monitoring", "dme"]],
  "src/components/dme/screens/screen-primitives.tsx": ["Bộ primitive UI dùng chung cho màn hình DME gồm metadata field, indicator, value cell, tabs, frame và panel kiểu PMDT.", ["component", "ui-library", "pmdt", "monitoring", "accessibility"]],
  "src/components/dme/screens/tx-config-layout.tsx": ["Màn hình tab cấu hình transmitter DME, điều hướng giữa tham số nominal và offsets qua PMDT store.", ["component", "transmitter", "configuration", "tabs", "navigation"]],
  "src/components/dme/screens/tx-config-nominal.tsx": ["Màn hình cấu hình nominal transmitter, hiển thị các giá trị kiểm tra và tham số theo dữ liệu DME hiện hành.", ["component", "transmitter", "configuration", "dme"]],
  "src/components/dme/screens/tx-config-offsets.tsx": ["Màn hình cấu hình offset transmitter, trình bày các độ lệch timing/power đã resolve.", ["component", "transmitter", "offsets", "configuration"]],
  "src/components/dme/screens/tx-data-layout.tsx": ["Màn hình điều hướng dữ liệu transmitter tới view Main và Standby thông qua PMDT store.", ["component", "transmitter", "navigation", "dme"]],
  "src/components/dme/screens/tx-data-main.tsx": ["Màn hình dữ liệu chính của transmitter, hiển thị tham số vận hành theo từng kênh với format kỹ thuật.", ["component", "transmitter", "monitoring", "data-table", "dme"]],
  "src/components/dme/student/dme-student-dashboard.tsx": ["Dashboard học viên DME hydrate và sắp xếp kịch bản, hiển thị danh sách cùng trạng thái sẵn sàng hoặc empty/loading.", ["component", "student-dashboard", "dme", "scenario-list", "zustand"]],
  "src/components/dme/student/dme-student-journal.tsx": ["Nhật ký bài thi DME cho phép học viên ghi câu trả lời, gửi bài và theo dõi trạng thái nộp trong phiên.", ["component", "student-journal", "dme", "form", "submission"]],
  "src/components/dme/student/dme-student-session.tsx": ["Điều phối phiên mô phỏng DME: tải scenario, khởi tạo PMDT, ghi action, quản lý journal và hoàn tất submission.", ["component", "student-session", "dme", "simulation", "state-management"]],
  "src/lib/dme-menu-structure.ts": ["Khai báo cây menu PMDT DME và tooltip cho các mục chưa hỗ trợ, dùng để route tới monitor, RMS, TX và RTC screens.", ["configuration", "menu", "navigation", "dme", "type-definition"]],
  "src/lib/dme-pmdt-defaults.ts": ["Cung cấp toàn bộ dữ liệu PMDT mặc định cho log, digital I/O, power, alarm limits, offsets, integral và các tham số DME khác.", ["data-model", "defaults", "dme", "pmdt", "factory"]],
  "src/lib/dme-sidebar-fields.ts": ["Định nghĩa các field sidebar DME có thể tương tác và helper ánh xạ target chính/phụ cho thao tác mô phỏng.", ["utility", "sidebar", "interaction", "dme"]],
  "src/lib/dme-types.ts": ["Tập type/interface trung tâm mô tả PMDT data, screen ids, field overrides, scenario, submission và các trạng thái tham số DME.", ["type-definition", "data-model", "dme", "pmdt"]],
  "src/stores/dme-pmdt-store.ts": ["Zustand store điều khiển PMDT DME: mode, navigation, dữ liệu runtime, override, lựa chọn field, action log và tương tác sidebar.", ["state-management", "zustand", "dme", "pmdt", "simulation"]],
  "src/stores/dme-scenario-store.ts": ["Factory Zustand quản lý kịch bản DME với hydrate từ API, CRUD, reset và cơ chế fallback/báo lỗi khi persistence thất bại.", ["state-management", "zustand", "dme", "scenario", "api-client"]],
  "tests/dme/dme-authoring.test.tsx": ["Kiểm thử luồng biên soạn DME, bao gồm chọn field PMDT và tạo override từ thao tác của giảng viên.", ["test", "component-test", "dme", "scenario-authoring"]],
  "tests/dme/pmdt-shell.test.tsx": ["Kiểm thử shell PMDT DME về render layout, menu navigation và chuyển màn hình theo thao tác người dùng.", ["test", "component-test", "dme", "pmdt", "navigation"]],
  "tests/state/dme-pmdt-store.test.ts": ["Kiểm thử DME PMDT store về khởi tạo, resolve override, navigation và ghi nhận tương tác mô phỏng.", ["test", "unit-test", "zustand", "dme", "state-management"]],
};

const functionInfo = {
  RmsLogsAlarms: ["Render các dòng alarm log RMS với timestamp, message và trạng thái.", ["component", "rms", "alarm-log"]],
  RmsLogsLayout: ["Render tab log và mở view alarm hoặc maintenance tương ứng.", ["component", "rms", "tabs", "navigation"]],
  RmsLogsMaintenance: ["Render các dòng maintenance log RMS với timestamp, message và trạng thái.", ["component", "rms", "maintenance-log"]],
  RmsMaintenanceAlerts: ["Render danh sách cảnh báo bảo trì cùng indicator trạng thái.", ["component", "rms", "maintenance", "alerts"]],
  RmsPowerSupply: ["Render các bảng nguồn RMS, resolve giá trị điện áp/dòng và trạng thái theo override.", ["component", "rms", "power-supply", "monitoring"]],
  StatusFlag: ["Render một cờ trạng thái RMS với nhãn và màu indicator tương ứng.", ["component", "status-indicator", "rms"]],
  RmsStatusMain: ["Render các cờ trạng thái hệ thống chính của RMS.", ["component", "rms", "system-status"]],
  MonitorTransmitterStatus: ["Render trạng thái liên kết giữa monitor và hai transmitter DME.", ["component", "rms", "transmitter-status"]],
  RmsStatusLayout: ["Chọn và render view trạng thái RMS theo active screen của store.", ["component", "rms", "screen-router"]],
  RtcData: ["Render các trường ngày giờ và trạng thái RTC đã resolve.", ["component", "rtc", "monitoring"]],
  dmeFieldMetadata: ["Tạo data attributes chuẩn cho field PMDT để event delegation nhận diện target tương tác.", ["utility", "metadata", "dom", "interaction"]],
  DmeIndicator: ["Render indicator DME theo status và bảng màu tham số chuẩn.", ["component", "status-indicator", "dme"]],
  DmeValueCell: ["Render ô giá trị PMDT có metadata tương tác, trạng thái và định dạng class thống nhất.", ["component", "data-cell", "interaction", "dme"]],
  ScreenTabs: ["Render tab list có trạng thái active và callback chọn tab.", ["component", "tabs", "navigation", "accessibility"]],
  ScreenFrame: ["Bọc nội dung màn hình PMDT với tiêu đề và cấu trúc layout dùng chung.", ["component", "layout", "screen"]],
  PmdtPanel: ["Render panel PMDT có tiêu đề tùy chọn và vùng nội dung chuẩn hóa.", ["component", "panel", "layout"]],
  TxConfigLayout: ["Render các tab cấu hình transmitter và đồng bộ lựa chọn với navigation store.", ["component", "transmitter", "tabs", "configuration"]],
  CheckField: ["Render một field kiểm tra nominal với nhãn, giá trị và trạng thái DME.", ["component", "form-control", "transmitter"]],
  TxConfigNominal: ["Render các tham số nominal và check field của transmitter DME.", ["component", "transmitter", "configuration"]],
  TxConfigOffsets: ["Render bảng offset cấu hình cho transmitter DME.", ["component", "transmitter", "offsets"]],
  TxDataLayout: ["Render lựa chọn view dữ liệu transmitter và mở màn hình tương ứng.", ["component", "transmitter", "navigation"]],
  TxDataMain: ["Render bảng dữ liệu vận hành chính của transmitter theo kênh.", ["component", "transmitter", "monitoring"]],
  DmeStudentDashboard: ["Hydrate, sắp xếp và render danh sách kịch bản DME cho học viên.", ["component", "student-dashboard", "dme", "zustand"]],
  DmeStudentJournal: ["Quản lý câu trả lời và thao tác nộp bài trong journal của phiên DME.", ["component", "student-journal", "submission", "form"]],
  AnswerField: ["Render textarea cho một mục trả lời có nhãn và callback cập nhật.", ["component", "form-control", "student-journal"]],
  DmeStudentSession: ["Khởi tạo phiên DME từ scenario, ghi action PMDT và kết nối journal với submission store.", ["component", "student-session", "simulation", "state-management"]],
  monitorItems: ["Tạo danh sách menu con cho nhóm Monitor với các screen và mục vô hiệu hóa tương ứng.", ["factory", "menu", "navigation", "dme"]],
  cloneDefaultDmePmdtData: ["Tạo deep clone độc lập của dữ liệu PMDT mặc định để khởi tạo phiên mới.", ["factory", "defaults", "serialization"]],
  isInteractiveSidebarField: ["Type guard xác định field id thuộc tập sidebar DME có thể tương tác.", ["type-guard", "sidebar", "interaction"]],
  getSidebarInteractionTargets: ["Trả về target chính và các target liên quan cần cập nhật cho một field sidebar.", ["utility", "sidebar", "interaction"]],
  initialState: ["Tạo state PMDT ban đầu với dữ liệu mặc định, mode và trạng thái điều hướng rỗng.", ["factory", "state-management", "defaults"]],
  resolveDmeField: ["Ưu tiên giá trị override theo field path, nếu không có thì trả về giá trị baseline.", ["utility", "state-management", "override"]],
  resolveDmeStatus: ["Resolve trạng thái override cho field và chuẩn hóa fallback thành DME parameter status hợp lệ.", ["utility", "state-management", "status", "type-guard"]],
  createDmePmdtStore: ["Tạo Zustand PMDT store với navigation, mode, override, recorded actions và các action tương tác DME.", ["factory", "zustand", "pmdt", "simulation"]],
  createDmeScenarioStore: ["Tạo Zustand scenario store DME với dependency injection, hydrate API và các action CRUD/reset.", ["factory", "zustand", "scenario", "api-client"]],
};

function complexity(lines) { return lines > 200 ? "complex" : lines >= 50 ? "moderate" : "simple"; }
const notes = {
  "src/components/dme/screens/screen-primitives.tsx": "Các component TSX dùng typed props và metadata `data-*` để giữ liên kết giữa UI cell và field path của mô hình PMDT.",
  "src/lib/dme-types.ts": "File chủ yếu gồm interfaces, literal unions và Record types để mô hình hóa dữ liệu CNS có cấu trúc mà không tạo runtime code ngoài các constant trạng thái.",
  "src/stores/dme-pmdt-store.ts": "Zustand `create<DmePmdtStore>()` giữ type-safe cho state/actions; helper resolve nhận generic field value và override dạng discriminated data.",
};

const resultByPath = new Map(extraction.results.map((item) => [item.path, item]));
const nodes = [];
const edges = [];
const emitted = new Set();

for (const file of batch.files) {
  const info = resultByPath.get(file.path);
  if (!info) throw new Error(`Extractor thiếu ${file.path}`);
  const detail = fileInfo[file.path];
  if (!detail) throw new Error(`Thiếu metadata file ${file.path}`);
  const fileNode = { id: `file:${file.path}`, type: "file", name: path.posix.basename(file.path), filePath: file.path, summary: detail[0], tags: detail[1], complexity: complexity(info.nonEmptyLines) };
  if (notes[file.path]) fileNode.languageNotes = notes[file.path];
  nodes.push(fileNode);
  emitted.add(fileNode.id);
  const exported = new Set((info.exports ?? []).map((item) => item.name));
  for (const fn of info.functions ?? []) {
    if (!fn.name || !Number.isInteger(fn.startLine) || !Number.isInteger(fn.endLine)) continue;
    const lines = fn.endLine - fn.startLine + 1;
    if (lines < 10 && !exported.has(fn.name)) continue;
    const semantic = functionInfo[fn.name];
    if (!semantic) throw new Error(`Thiếu metadata function ${file.path}:${fn.name}`);
    const id = `function:${file.path}:${fn.name}`;
    nodes.push({ id, type: "function", name: fn.name, filePath: file.path, lineRange: [fn.startLine, fn.endLine], summary: semantic[0], tags: semantic[1], complexity: complexity(lines) });
    emitted.add(id);
    edges.push({ source: fileNode.id, target: id, type: "contains", direction: "forward", weight: 1.0 });
    if (exported.has(fn.name)) edges.push({ source: fileNode.id, target: id, type: "exports", direction: "forward", weight: 0.8 });
  }
}

for (const file of batch.files) for (const target of batch.batchImportData[file.path] ?? []) edges.push({ source: `file:${file.path}`, target: `file:${target}`, type: "imports", direction: "forward", weight: 0.7 });

for (const info of extraction.results) {
  const seen = new Set();
  for (const call of info.callGraph ?? []) {
    const source = `function:${info.path}:${call.caller}`;
    const target = `function:${info.path}:${call.callee}`;
    const key = `${source}|${target}`;
    if (source !== target && emitted.has(source) && emitted.has(target) && !seen.has(key)) {
      edges.push({ source, target, type: "calls", direction: "forward", weight: 0.8 });
      seen.add(key);
    }
  }
}

for (const [production, test] of [
  ["src/stores/dme-pmdt-store.ts", "tests/state/dme-pmdt-store.test.ts"],
]) edges.push({ source: `file:${production}`, target: `file:${test}`, type: "tested_by", direction: "forward", weight: 0.5 });

// Hai production files thuộc batch khác; phát cạnh từ test để merge script chuẩn hóa lại hướng.
for (const [test, production] of [
  ["tests/dme/dme-authoring.test.tsx", "src/components/dme/admin/dme-scenario-author.tsx"],
  ["tests/dme/pmdt-shell.test.tsx", "src/components/dme/pmdt-layout.tsx"],
]) edges.push({ source: `file:${test}`, target: `file:${production}`, type: "tested_by", direction: "forward", weight: 0.5 });

const importExpected = batch.files.reduce((sum, file) => sum + (batch.batchImportData[file.path] ?? []).length, 0);
const importActual = edges.filter((edge) => edge.type === "imports").length;
if (importExpected !== importActual) throw new Error(`Sai import edges ${importActual}/${importExpected}`);
if (new Set(nodes.map((node) => node.id)).size !== nodes.length) throw new Error("Node ID trùng lặp");
if (edges.some((edge) => edge.source === edge.target)) throw new Error("Self edge");

const partCount = Math.ceil(Math.max(nodes.length / 60, edges.length / 120));
const sortedFiles = [...batch.files].sort((a, b) => a.path.localeCompare(b.path)).map((file) => file.path);
const chunkSize = Math.ceil(sortedFiles.length / partCount);
const knownFiles = new Set([...batch.files.map((file) => file.path), ...Object.values(batch.batchImportData).flat(), ...Object.keys(batch.neighborMap ?? {}), ...Object.values(batch.neighborMap ?? {}).flat().map((item) => item.path)]);
const written = [];
for (let index = 0; index < partCount; index += 1) {
  const filePaths = new Set(sortedFiles.slice(index * chunkSize, (index + 1) * chunkSize));
  const partNodes = nodes.filter((node) => filePaths.has(node.filePath));
  const sourceIds = new Set(partNodes.map((node) => node.id));
  const partEdges = edges.filter((edge) => sourceIds.has(edge.source));
  for (const edge of partEdges) {
    const match = edge.target.match(/^file:(.+)$/);
    if (!sourceIds.has(edge.target) && !emitted.has(edge.target) && !(match && knownFiles.has(match[1]))) throw new Error(`Part ${index + 1}: target không hợp lệ ${edge.target}`);
  }
  const outputPath = partCount === 1 ? path.join(ua, "intermediate/batch-7.json") : path.join(ua, `intermediate/batch-7-part-${index + 1}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify({ nodes: partNodes, edges: partEdges }, null, 2)}\n`, "utf8");
  JSON.parse(fs.readFileSync(outputPath, "utf8"));
  written.push({ outputPath, nodes: partNodes.length, edges: partEdges.length });
}
console.log(JSON.stringify({ nodeCount: nodes.length, edgeCount: edges.length, importExpected, importActual, partCount, written }, null, 2));
