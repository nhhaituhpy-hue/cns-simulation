import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/nhhai/Desktop/cns-simulator";
const ua = path.join(root, ".ua");
const batches = JSON.parse(fs.readFileSync(path.join(ua, "intermediate/batches.json"), "utf8"));
const batch = batches.batches.find((item) => item.batchIndex === 2);
if (!batch) throw new Error("Không tìm thấy batchIndex 2");
const extraction = JSON.parse(fs.readFileSync(path.join(ua, "tmp/ua-file-extract-results-2.json"), "utf8"));

const summaries = {
  "src/components/vor/screens/rms-maintenance-alerts.tsx": "Hiển thị màn hình cảnh báo bảo trì RMS, cho phép quan sát và chỉnh trạng thái mô phỏng của các cảnh báo tổng quát và Monitor AGEN.",
  "src/components/vor/screens/rms-power-supply.tsx": "Hiển thị điện áp, dòng điện và trạng thái nguồn của hệ thống VOR dưới dạng các chỉ thị vận hành lấy từ PMDT store.",
  "src/components/vor/screens/rms-temperature.tsx": "Trình bày các giá trị nhiệt độ RMS của thiết bị VOR và phản ánh màu trạng thái theo dữ liệu mô phỏng hiện tại.",
  "src/components/vor/screens/tx-config-layout.tsx": "Điều phối khu vực cấu hình máy phát, toolbar PMDT và các màn hình con nominal hoặc offsets theo active view.",
  "src/components/vor/screens/tx-config-nominal.tsx": "Hiển thị các tham số cấu hình nominal của máy phát VOR cùng các cờ bật/tắt phục vụ mô phỏng vận hành.",
  "src/components/vor/screens/tx-config-offsets.tsx": "Hiển thị và cho phép thao tác với các giá trị offset cấu hình của máy phát VOR trong PMDT.",
  "src/components/vor/screens/tx-data-layout.tsx": "Điều phối nhóm màn hình dữ liệu máy phát, gồm dữ liệu chính và trạng thái từng transmitter, đồng thời gắn toolbar PMDT.",
  "src/components/vor/screens/tx-data-main.tsx": "Trình bày các thông số công suất, tần số và VSWR chính của hai máy phát VOR theo bố cục panel vận hành.",
  "src/components/vor/screens/tx-status.tsx": "Hiển thị các nhóm cảnh báo hệ thống, PA và synthesizer cho transmitter đang được chọn.",
  "src/components/vor/student/vor-student-dashboard.tsx": "Cung cấp dashboard học viên để duyệt kịch bản VOR, xem thông tin bài thực hành và khởi động phiên mô phỏng.",
  "src/components/vor/student/vor-student-journal.tsx": "Hiển thị nhật ký thao tác, checkpoint kỳ vọng và biểu mẫu kết luận của học viên trong phiên VOR.",
  "src/components/vor/student/vor-student-session.tsx": "Điều phối toàn bộ phiên thực hành hoặc bài thi VOR: hydrate dữ liệu, khởi tạo PMDT, chuyển bước chẩn đoán phần cứng và nộp kết quả.",
  "src/lib/vor-menu-structure.ts": "Định nghĩa cây menu PMDT VOR và ánh xạ các mục monitor theo transmitter để điều hướng giữa các màn hình.",
  "src/lib/vor-pmdt-defaults.ts": "Cung cấp bộ dữ liệu mặc định đầy đủ cho PMDT VOR, bao gồm cảnh báo, tham số monitor, transmitter, RMS và cấu hình.",
  "src/lib/vor-scenario-storage.ts": "Xác thực, clone, serialize và chuyển đổi dữ liệu kịch bản VOR giữa domain model, local storage và row database.",
  "src/lib/vor-sidebar-fields.ts": "Khai báo các field sidebar có thể tương tác và chuyển cấu hình tương tác thành các target PMDT chuẩn hóa.",
  "src/lib/vor-submission-storage.ts": "Xác thực, phiên bản hóa, serialize và ánh xạ bài nộp VOR giữa domain model, local storage và database.",
  "src/lib/vor-types.ts": "Tập trung type, interface, literal union và hằng trạng thái cho dữ liệu PMDT, kịch bản, checkpoint, sự kiện và bài nộp VOR.",
  "src/stores/vor-pmdt-store.ts": "Triển khai Zustand store cho trạng thái PMDT VOR, điều hướng màn hình, overlay lỗi, checkpoint, sự kiện thao tác và câu trả lời học viên.",
  "src/stores/vor-scenario-store.ts": "Quản lý danh sách kịch bản VOR bằng Zustand, đồng bộ local storage với API và cung cấp thao tác CRUD có fallback.",
  "src/stores/vor-submission-store.ts": "Quản lý bài nộp VOR bằng Zustand, hydrate từ local/API, gửi bài, chấm điểm và ghi nhận lỗi đồng bộ.",
  "tests/state/vor-pmdt-store.test.ts": "Kiểm thử state transition của PMDT store, dữ liệu mặc định, override, điều hướng, checkpoint và nhật ký tương tác VOR.",
  "tests/state/vor-scenario-store.test.ts": "Kiểm thử hydrate, CRUD, lưu cục bộ và đồng bộ API của Zustand scenario store cho VOR.",
  "tests/state/vor-submission-store.test.ts": "Kiểm thử quy trình tạo, hydrate và review bài nộp trong Zustand submission store của VOR.",
  "tests/vor/monitor-screens.test.tsx": "Kiểm thử render và hành vi các màn hình monitor VOR với dữ liệu từ PMDT store.",
  "tests/vor/pmdt-shell.test.tsx": "Kiểm thử shell và điều hướng của bố cục PMDT VOR trong các trạng thái màn hình khác nhau.",
  "tests/vor/rms-screens.test.tsx": "Kiểm thử render các nhóm màn hình RMS data và RMS logs của mô phỏng VOR.",
  "tests/vor/transmitter-screens.test.tsx": "Kiểm thử các layout cấu hình và dữ liệu transmitter VOR cùng liên kết với PMDT store.",
  "tests/vor/vor-authoring.test.tsx": "Kiểm thử workflow biên soạn kịch bản VOR, gồm nhập metadata, overrides và checkpoint kỳ vọng.",
  "tests/vor/vor-examiner-workflow.test.tsx": "Kiểm thử workflow giám khảo khi duyệt danh sách bài nộp, mở chi tiết, nhận xét và chấm điểm VOR.",
  "tests/vor/vor-integration.test.tsx": "Kiểm thử tích hợp định tuyến module VOR từ dashboard quản trị tới giao diện PMDT và shared scenario store.",
  "tests/vor/vor-student-workflow.test.tsx": "Kiểm thử workflow học viên từ chọn kịch bản, thực hiện phiên PMDT đến ghi nhật ký và nộp bài VOR."
};

function fileTags(file) {
  if (file.path.startsWith("tests/")) return ["kiểm-thử", "vor", "workflow", file.path.includes("state/") ? "zustand" : "react"];
  if (file.path.includes("/student/")) return ["react-component", "giao-diện-học-viên", "vor", "workflow"];
  if (file.path.includes("/screens/")) return ["react-component", "màn-hình-pmdt", "vor", "giám-sát"];
  if (file.path.includes("/stores/")) return ["zustand", "quản-lý-trạng-thái", "vor", "đồng-bộ-dữ-liệu"];
  if (file.path.endsWith("vor-types.ts")) return ["type-definition", "typescript", "domain-model", "vor"];
  if (file.path.includes("storage")) return ["lưu-trữ", "validation", "serialization", "vor"];
  if (file.path.includes("defaults")) return ["dữ-liệu-mặc-định", "cấu-hình", "pmdt", "vor"];
  return ["cấu-hình", "điều-hướng", "pmdt", "vor"];
}

function functionSummary(filePath, name) {
  const storage = filePath.includes("scenario-storage") ? "kịch bản" : filePath.includes("submission-storage") ? "bài nộp" : null;
  const exact = {
    RmsMaintenanceAlerts: "Render bảng cảnh báo bảo trì RMS và liên kết các trường chỉnh sửa với PMDT store.",
    RmsPowerSupply: "Render các rail nguồn, dòng điện và chỉ thị trạng thái của hệ thống VOR.",
    RmsTemperature: "Render các phép đo nhiệt độ RMS với giá trị và màu trạng thái mô phỏng.",
    TxConfigLayout: "Chọn màn hình cấu hình transmitter phù hợp với active view và bao quanh bằng toolbar PMDT.",
    ValueField: "Render một trường giá trị cấu hình transmitter có khả năng chỉnh sửa theo mode.",
    TxConfigNominal: "Render tập tham số nominal và cờ cấu hình của transmitter VOR.",
    TxConfigOffsets: "Render các trường offset transmitter và nối thao tác người dùng vào store.",
    TxDataLayout: "Chọn màn hình dữ liệu hoặc trạng thái transmitter dựa trên active view.",
    TxDataMain: "Render các panel thông số RF chính cho hai transmitter VOR.",
    AlertGroup: "Render một nhóm cảnh báo transmitter với màu trạng thái theo từng chỉ thị.",
    TxStatus: "Render các nhóm cảnh báo cho transmitter được chọn.",
    VorStudentDashboard: "Render danh sách và chi tiết kịch bản để học viên bắt đầu bài thực hành VOR.",
    VorStudentJournal: "Render checkpoint, nhật ký thao tác và biểu mẫu kết luận của học viên.",
    AnswerField: "Render một vùng nhập nội dung cho câu trả lời chẩn đoán của học viên.",
    VorStudentSession: "Khởi tạo và điều phối vòng đời phiên VOR, bao gồm nộp kết quả thường hoặc official exam.",
    monitorItems: "Tạo các mục menu monitor theo transmitter và ánh xạ chúng tới view tương ứng.",
    cloneDefaultVorPmdtData: "Tạo deep clone độc lập từ bộ dữ liệu PMDT VOR mặc định.",
    isInteractiveSidebarField: "Type guard xác định field id có hỗ trợ tương tác từ sidebar.",
    getSidebarInteractionTargets: "Chuyển một field sidebar thành danh sách target override tương ứng trong PMDT.",
    initialState: "Khởi tạo snapshot trạng thái PMDT VOR sạch từ dữ liệu mặc định.",
    resolveVorField: "Tra cứu giá trị field VOR sau khi áp dụng các override đang hoạt động.",
    resolveVorStatus: "Chuẩn hóa trạng thái chỉ thị VOR từ dữ liệu gốc và override.",
    createVorPmdtStore: "Tạo Zustand store PMDT với hành động điều hướng, overlay, checkpoint, nhật ký và reset.",
    createVorScenarioStore: "Tạo Zustand store kịch bản với local persistence, API sync và thao tác CRUD.",
    createVorSubmissionStore: "Tạo Zustand store bài nộp với hydrate, submit, review và đồng bộ API."
  };
  if (exact[name]) return exact[name];
  if (storage) {
    if (name.startsWith("is")) return `Type guard kiểm tra cấu trúc và ràng buộc runtime của ${storage} VOR.`;
    if (name.startsWith("clone")) return `Tạo deep clone đã chuẩn hóa cho ${storage} VOR.`;
    if (name.startsWith("serialize")) return `Xác thực và serialize danh sách ${storage} VOR vào envelope có phiên bản.`;
    if (name.startsWith("deserialize")) return `Parse, kiểm tra phiên bản và khôi phục danh sách ${storage} VOR.`;
    if (name.startsWith("mapRow")) return `Ánh xạ row database thành domain model ${storage} VOR đã được xác thực.`;
    if (name.includes("ToRow")) return `Chuyển domain model ${storage} VOR sang cấu trúc row dùng cho database.`;
    if (name.startsWith("save")) return `Lưu danh sách ${storage} VOR đã serialize vào storage adapter.`;
    if (name.startsWith("load")) return `Đọc và khôi phục danh sách ${storage} VOR từ storage adapter.`;
  }
  return `Thực hiện logic ${name} trong mô-đun VOR tương ứng.`;
}

function functionTags(filePath, name) {
  if (name.startsWith("is")) return ["type-guard", "validation", "typescript", "vor"];
  if (/serialize|deserialize|clone|ToRow|mapRow|save|load/.test(name)) return ["serialization", "lưu-trữ", "chuyển-đổi-dữ-liệu", "vor"];
  if (name.startsWith("createVor")) return ["factory", "zustand", "quản-lý-trạng-thái", "vor"];
  if (filePath.endsWith(".tsx")) return ["react-component", "tsx", "giao-diện", "vor"];
  return ["utility", "logic-nghiệp-vụ", "typescript", "vor"];
}

function languageNotes(filePath) {
  if (filePath.endsWith("vor-types.ts")) return "Sử dụng rộng rãi literal union, interface và type alias để mô hình hóa trạng thái PMDT và các biến thể sự kiện một cách type-safe.";
  if (filePath.includes("-storage.ts")) return "Các custom type guard thu hẹp dữ liệu unknown trước khi chuyển sang domain type, giúp bảo vệ ranh giới local storage và database.";
  if (filePath.includes("/stores/")) return "Zustand store dùng generic UseBoundStore<StoreApi<T>> và dependency injection tùy chọn để vừa chạy trên client vừa dễ kiểm thử.";
  if (filePath.endsWith(".tsx") && !filePath.startsWith("tests/")) return "React function component viết bằng TSX, dùng typed props và selector từ Zustand để giới hạn dữ liệu đăng ký.";
  return undefined;
}

const resultByPath = new Map(extraction.results.map((result) => [result.path, result]));
const nodes = [];
const edges = [];
const batchPathSet = new Set(batch.files.map((file) => file.path));

for (const file of batch.files) {
  const info = resultByPath.get(file.path);
  if (!info) throw new Error(`Thiếu extraction result cho ${file.path}`);
  const note = languageNotes(file.path);
  nodes.push({
    id: `file:${file.path}`,
    type: "file",
    name: path.posix.basename(file.path),
    filePath: file.path,
    summary: summaries[file.path],
    tags: fileTags(file),
    complexity: info.nonEmptyLines < 50 ? "simple" : info.nonEmptyLines <= 200 ? "moderate" : "complex",
    ...(note ? { languageNotes: note } : {})
  });

  const exported = new Set((info.exports ?? []).map((item) => item.name));
  for (const fn of info.functions ?? []) {
    const span = fn.endLine - fn.startLine + 1;
    if (span < 10 && !exported.has(fn.name)) continue;
    const id = `function:${file.path}:${fn.name}`;
    nodes.push({
      id,
      type: "function",
      name: fn.name,
      filePath: file.path,
      lineRange: [fn.startLine, fn.endLine],
      summary: functionSummary(file.path, fn.name),
      tags: functionTags(file.path, fn.name),
      complexity: span < 50 ? "simple" : span <= 120 ? "moderate" : "complex"
    });
    edges.push({ source: `file:${file.path}`, target: id, type: "contains", direction: "forward", weight: 1.0 });
    if (exported.has(fn.name)) edges.push({ source: `file:${file.path}`, target: id, type: "exports", direction: "forward", weight: 0.8 });
  }

  for (const imported of batch.batchImportData[file.path] ?? []) {
    edges.push({ source: `file:${file.path}`, target: `file:${imported}`, type: "imports", direction: "forward", weight: 0.7 });
    if (file.path.startsWith("tests/") && batchPathSet.has(imported) && !imported.startsWith("tests/")) {
      edges.push({ source: `file:${imported}`, target: `file:${file.path}`, type: "tested_by", direction: "forward", weight: 0.5 });
    }
  }
}

const importExpected = Object.values(batch.batchImportData).reduce((sum, list) => sum + list.length, 0);
const importActual = edges.filter((edge) => edge.type === "imports").length;
if (importActual !== importExpected) throw new Error(`Import edge mismatch: ${importActual}/${importExpected}`);

const nodeIds = new Set(nodes.map((node) => node.id));
if (nodeIds.size !== nodes.length) throw new Error("Có node ID trùng lặp");
if (nodes.some((node) => !node.summary || node.tags.length < 3 || node.tags.length > 5)) throw new Error("Node thiếu summary hoặc tags không hợp lệ");
if (edges.some((edge) => edge.source === edge.target)) throw new Error("Có self-referencing edge");

const partCount = Math.ceil(Math.max(nodes.length / 60, edges.length / 120));
const sortedFiles = [...batch.files].sort((a, b) => a.path.localeCompare(b.path));
const groupSize = Math.ceil(sortedFiles.length / partCount);
const sourceFile = (id) => id.replace(/^(file|function|class):/, "").split(/:(?=[^/]+$)/)[0];
const allKnownPaths = new Set([
  ...batch.files.map((file) => file.path),
  ...Object.keys(batch.batchImportData),
  ...Object.values(batch.batchImportData).flat(),
  ...Object.keys(batch.neighborMap),
  ...Object.values(batch.neighborMap).flat().map((neighbor) => neighbor.path)
]);

for (let index = 0; index < partCount; index += 1) {
  const group = sortedFiles.slice(index * groupSize, (index + 1) * groupSize);
  const groupPaths = new Set(group.map((file) => file.path));
  const partNodes = nodes.filter((node) => groupPaths.has(node.filePath));
  const partNodeIds = new Set(partNodes.map((node) => node.id));
  const partEdges = edges.filter((edge) => groupPaths.has(sourceFile(edge.source)));
  for (const edge of partEdges) {
    const validSource = partNodeIds.has(edge.source) || (edge.source.startsWith("file:") && allKnownPaths.has(edge.source.slice(5)));
    const validTarget = partNodeIds.has(edge.target) || (edge.target.startsWith("file:") && allKnownPaths.has(edge.target.slice(5)));
    if (!validSource || !validTarget) throw new Error(`Edge không hợp lệ ở part ${index + 1}: ${JSON.stringify(edge)}`);
  }
  const out = path.join(ua, "intermediate", `batch-2-part-${index + 1}.json`);
  fs.writeFileSync(out, `${JSON.stringify({ nodes: partNodes, edges: partEdges }, null, 2)}\n`);
}

console.log(JSON.stringify({ partCount, nodeCount: nodes.length, edgeCount: edges.length, importExpected, importActual, files: batch.files.length, skipped: extraction.filesSkipped }));
