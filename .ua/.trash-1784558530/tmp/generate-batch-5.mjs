import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/nhhai/Desktop/cns-simulator";
const ua = path.join(root, ".ua");
const batchesDoc = JSON.parse(fs.readFileSync(path.join(ua, "intermediate/batches.json"), "utf8"));
const batch = (Array.isArray(batchesDoc) ? batchesDoc : batchesDoc.batches).find((item) => item.batchIndex === 5);
const extraction = JSON.parse(fs.readFileSync(path.join(ua, "tmp/ua-file-extract-results-5.json"), "utf8"));
if (!batch || !extraction.scriptCompleted || extraction.filesAnalyzed !== batch.files.length) throw new Error("Batch 5 hoặc extraction không đầy đủ.");

const fileInfo = {
  "src/app/admin/dme-pmdt/page.tsx": ["Route quản trị khởi chạy giao diện PMDT mô phỏng cho DME trong layout toàn màn hình và khai báo metadata riêng cho trang.", ["nextjs-route", "component", "dme", "pmdt"]],
  "src/app/admin/dme/create/page.tsx": ["Route tạo mới kịch bản DME, nhúng trình biên soạn kịch bản ở chế độ chưa có scenario id.", ["nextjs-route", "component", "dme", "scenario-authoring"]],
  "src/app/admin/dme/edit/page.tsx": ["Route chỉnh sửa kịch bản DME, đọc id từ search params trong Suspense boundary và chuyển cho trình biên soạn.", ["nextjs-route", "component", "dme", "scenario-authoring", "suspense"]],
  "src/components/dme/admin/dme-author-panel.tsx": ["Panel dành cho giảng viên để chọn trường PMDT, nhập giá trị hoặc trạng thái mô phỏng và áp dụng override vào kịch bản DME.", ["component", "scenario-authoring", "dme", "form", "validation"]],
  "src/components/dme/admin/dme-scenario-author.tsx": ["Điều phối quy trình tạo/chỉnh sửa kịch bản DME: hydrate store, ánh xạ phần tử PMDT được chọn thành override và lưu metadata kịch bản.", ["component", "scenario-authoring", "dme", "zustand", "event-handler"]],
  "src/components/dme/pmdt-layout.tsx": ["Khung PMDT DME ghép title bar, menu, toolbar, sidebar, status bar và router màn hình dựa trên state điều hướng của store.", ["component", "layout", "screen-router", "dme", "pmdt"]],
  "src/components/dme/pmdt-menu-bar.tsx": ["Thanh menu phân cấp của PMDT, mở màn hình từ cấu trúc menu và xử lý đóng menu khi click ngoài hoặc nhấn Escape.", ["component", "menu", "navigation", "event-handler", "pmdt"]],
  "src/components/dme/pmdt-sidebar.tsx": ["Sidebar trạng thái DME hiển thị và cho phép tương tác với các field/status theo mode học viên hoặc soạn kịch bản.", ["component", "sidebar", "dme", "interactive-controls", "zustand"]],
  "src/components/dme/pmdt-status-bar.tsx": ["Status bar PMDT hiển thị đường dẫn menu, màn hình hiện tại, mode vận hành và thông tin trạng thái từ store.", ["component", "status-bar", "dme", "pmdt"]],
  "src/components/dme/pmdt-title-bar.tsx": ["Title bar mô phỏng cửa sổ ứng dụng DME với tên hệ thống và các nút điều khiển kiểu desktop.", ["component", "title-bar", "desktop-ui", "pmdt"]],
  "src/components/dme/pmdt-toolbar.tsx": ["Toolbar trang trí của PMDT, cung cấp dải điều khiển trực quan nhất quán bên dưới menu.", ["component", "toolbar", "desktop-ui", "pmdt"]],
  "src/components/dme/screens/disabled-screen.tsx": ["Màn hình placeholder cho chức năng PMDT đang bị vô hiệu hóa hoặc chưa khả dụng.", ["component", "screen", "disabled-state", "pmdt"]],
  "src/components/dme/screens/home-screen.tsx": ["Màn hình chào của PMDT DME, hướng dẫn người dùng chọn chức năng từ menu.", ["component", "screen", "home", "pmdt"]],
  "src/components/dme/screens/monitor-alarm-limits.tsx": ["Màn hình bảng giới hạn alarm của monitor DME, trình bày ngưỡng theo kênh và các tham số delay/certification liên quan.", ["component", "monitoring", "alarm-limits", "dme"]],
  "src/components/dme/screens/monitor-calibration.tsx": ["Màn hình calibration monitor DME, resolve các override và so sánh baseline, actual, offset, scale cho từng hàng đo.", ["component", "monitoring", "calibration", "dme"]],
  "src/components/dme/screens/monitor-config-general.tsx": ["Màn hình cấu hình tổng quát monitor, hiển thị các field đã resolve cùng trạng thái và các cờ vận hành của DME.", ["component", "monitoring", "configuration", "dme"]],
  "src/components/dme/screens/monitor-config-layout.tsx": ["Màn hình điều hướng nhóm cấu hình monitor, mở các view General và Alarm Limits qua store PMDT.", ["component", "navigation", "configuration", "dme"]],
  "src/components/dme/screens/monitor-data-detail.tsx": ["Màn hình chi tiết dữ liệu monitor với tab transmitter, điều hướng offsets và bảng giá trị đã resolve/định dạng.", ["component", "monitoring", "data-table", "tabs", "dme"]],
  "src/components/dme/screens/monitor-data-layout.tsx": ["Màn hình điều hướng nhóm dữ liệu monitor tới các view Integral, Detail, Calibration và Decoder Results.", ["component", "navigation", "monitoring", "dme"]],
  "src/components/dme/screens/monitor-decoder-results.tsx": ["Màn hình kết quả decoder của monitor DME, trình bày các trường chẩn đoán theo dạng bảng.", ["component", "monitoring", "decoder", "data-table"]],
  "src/components/dme/screens/monitor-integral.tsx": ["Bảng dữ liệu integral theo hai transmitter, resolve giá trị và status riêng cho từng kênh.", ["component", "monitoring", "integral-data", "data-table", "dme"]],
  "src/components/dme/screens/monitor-offsets.tsx": ["Màn hình offsets của monitor, cho phép quay lại chi tiết dữ liệu và hiển thị các độ lệch đã cấu hình.", ["component", "monitoring", "offsets", "navigation"]],
  "src/components/dme/screens/rms-ad-data.tsx": ["Màn hình RMS A/D hiển thị điện áp, trạng thái và dữ liệu nhiệt độ với các giá trị được resolve từ override kịch bản.", ["component", "rms", "analog-data", "monitoring", "dme"]],
  "src/components/dme/screens/rms-config-layout.tsx": ["Giao diện cấu hình RMS nhiều tab cho general, station, power limits và A/D limits; các input lấy giá trị/status đã resolve từ store PMDT.", ["component", "rms", "configuration", "tabs", "dme"]],
  "src/components/dme/screens/rms-data-layout.tsx": ["Màn hình tab dữ liệu RMS điều hướng giữa Analog/Digital, A/D Data và các view chẩn đoán liên quan.", ["component", "rms", "navigation", "tabs", "dme"]],
  "src/components/dme/screens/rms-digital-io.tsx": ["Màn hình RMS Digital I/O hiển thị input/output, nguồn hệ thống và cảnh báo transmitter với trạng thái được resolve theo từng kênh.", ["component", "rms", "digital-io", "monitoring", "dme"]],
};

const functionInfo = {
  DmePmdtPage: ["Render PMDT DME trong vùng làm việc toàn màn hình của route quản trị.", ["component", "nextjs-route", "pmdt"]],
  CreateDmeScenarioPage: ["Render trình biên soạn để tạo kịch bản DME mới.", ["component", "nextjs-route", "scenario-authoring"]],
  EditDmeScenarioPage: ["Bọc nội dung chỉnh sửa DME trong Suspense để đọc search params an toàn.", ["component", "nextjs-route", "suspense"]],
  DmeAuthorPanel: ["Quản lý lựa chọn target và form override, validate input rồi cập nhật dữ liệu soạn kịch bản trong PMDT store.", ["component", "scenario-authoring", "form", "validation"]],
  parseVisibleValue: ["Trích giá trị số hoặc text đang hiển thị từ phần tử PMDT được chọn, kể cả control con.", ["utility", "parsing", "dom"]],
  selectedFromElement: ["Chuyển phần tử DOM tương tác thành mô tả field đã chọn, ưu tiên override hiện có và nhận diện status từ text.", ["utility", "selection", "dom", "normalization"]],
  DmeScenarioAuthor: ["Hydrate scenario store, tìm kịch bản theo id và chuyển dữ liệu sang editor hoặc trạng thái loading.", ["component", "scenario-authoring", "zustand"]],
  DmeScenarioAuthorEditor: ["Điều phối editor kịch bản, bắt tương tác PMDT, duy trì override và lưu bản tạo mới hoặc chỉnh sửa.", ["component", "scenario-authoring", "event-handler", "zustand"]],
  PmdtScreenRouter: ["Ánh xạ active screen trong store sang component màn hình PMDT DME tương ứng.", ["component", "screen-router", "navigation"]],
  PmdtLayout: ["Khởi tạo mode PMDT và ghép các vùng giao diện chính quanh màn hình được route động.", ["component", "layout", "pmdt"]],
  MenuItemRow: ["Render một menu item, mở screen khi chọn và đệ quy các mục con nếu có.", ["component", "menu-item", "navigation"]],
  PmdtMenuBar: ["Quản lý nhóm menu đang mở, xử lý keyboard/pointer và render cấu trúc menu DME.", ["component", "menu", "navigation", "event-handler"]],
  PmdtSidebar: ["Resolve trạng thái sidebar theo override và mode, rồi chuyển tương tác field thành action trong store.", ["component", "sidebar", "interactive-controls", "zustand"]],
  PmdtStatusBar: ["Render ngữ cảnh điều hướng và mode hiện tại ở chân cửa sổ PMDT.", ["component", "status-bar", "pmdt"]],
  PmdtTitleBar: ["Render title bar và bộ nút cửa sổ mang phong cách desktop.", ["component", "title-bar", "desktop-ui"]],
  PmdtToolbar: ["Render thanh công cụ PMDT tĩnh dùng chung cho màn hình DME.", ["component", "toolbar", "pmdt"]],
  DisabledScreen: ["Render thông báo chức năng không khả dụng trong vùng màn hình PMDT.", ["component", "screen", "disabled-state"]],
  HomeScreen: ["Render màn hình mặc định và hướng dẫn thao tác ban đầu của PMDT.", ["component", "screen", "home"]],
  MonitorAlarmLimits: ["Render các nhóm ngưỡng alarm monitor theo dữ liệu DME hiện hành.", ["component", "monitoring", "alarm-limits"]],
  MonitorCalibration: ["Resolve và render bảng baseline/actual/offset/scale cho các điểm calibration monitor.", ["component", "monitoring", "calibration"]],
  MonitorConfigGeneral: ["Render cấu hình monitor tổng quát cùng trạng thái đã resolve từ override.", ["component", "monitoring", "configuration"]],
  MonitorConfigLayout: ["Render menu điều hướng tới các nhóm cấu hình monitor DME.", ["component", "navigation", "configuration"]],
  MonitorDetailData: ["Quản lý tab transmitter và render bảng dữ liệu monitor chi tiết có liên kết sang offsets.", ["component", "monitoring", "tabs", "data-table"]],
  MonitorDataLayout: ["Render các lựa chọn điều hướng cấp cao cho nhóm dữ liệu monitor.", ["component", "navigation", "monitoring"]],
  MonitorDecoderResults: ["Render bảng các kết quả decoder lấy từ DME PMDT store.", ["component", "monitoring", "decoder"]],
  MonitorDataTable: ["Render dữ liệu integral theo transmitter, resolve cả giá trị và trạng thái cho từng field.", ["component", "monitoring", "data-table"]],
  MonitorOffsets: ["Render bảng offset và action quay lại màn hình dữ liệu chi tiết.", ["component", "monitoring", "offsets"]],
  RmsAdData: ["Render các bảng A/D và nhiệt độ RMS với giá trị/status có thể bị override.", ["component", "rms", "analog-data", "monitoring"]],
  ConfigInput: ["Render input cấu hình có giá trị và status resolve theo field path trong PMDT store.", ["component", "form-control", "configuration"]],
  DmeConfigGeneralTab: ["Render tab cấu hình RMS tổng quát, gồm mode, timing và spare inputs.", ["component", "rms", "configuration"]],
  DmeConfigStationTab: ["Render tab tham số nhận dạng và thông tin station của DME.", ["component", "rms", "station-config"]],
  DmeConfigPowerLimitsTab: ["Render tab giới hạn điện áp và dòng điện cho các kênh RMS.", ["component", "rms", "power-limits"]],
  DmeConfigAdLimitsTab: ["Render tab giới hạn A/D và nhiệt độ theo từng hàng dữ liệu RMS.", ["component", "rms", "analog-limits"]],
  RmsConfigLayout: ["Quản lý active tab cấu hình RMS và đồng bộ view điều hướng khi người dùng đổi tab.", ["component", "rms", "tabs", "configuration"]],
  RmsDataLayout: ["Render tab điều hướng dữ liệu RMS và mở view tương ứng qua store.", ["component", "rms", "tabs", "navigation"]],
  RmsDigitalIo: ["Render Digital I/O, trạng thái nguồn và cảnh báo TX theo dữ liệu/override RMS.", ["component", "rms", "digital-io", "monitoring"]],
};

function complexity(lines) { return lines > 200 ? "complex" : lines >= 50 ? "moderate" : "simple"; }
const notes = {
  "src/components/dme/admin/dme-scenario-author.tsx": "TSX kết hợp type guards DOM, event delegation và Zustand selectors để chuyển tương tác trực quan trên PMDT thành override có kiểu.",
  "src/components/dme/pmdt-layout.tsx": "Screen router dùng union/discriminated screen id từ store để chọn component React tương ứng trong App Router.",
  "src/components/dme/screens/rms-config-layout.tsx": "Các tuple khai báo `as const` giữ literal key khi ánh xạ field cấu hình sang component input dùng lại.",
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

for (const file of batch.files) {
  for (const target of batch.batchImportData[file.path] ?? []) {
    edges.push({ source: `file:${file.path}`, target: `file:${target}`, type: "imports", direction: "forward", weight: 0.7 });
  }
}

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

const importExpected = batch.files.reduce((sum, file) => sum + (batch.batchImportData[file.path] ?? []).length, 0);
const importActual = edges.filter((edge) => edge.type === "imports").length;
if (importActual !== importExpected) throw new Error(`Sai import edges ${importActual}/${importExpected}`);
if (new Set(nodes.map((node) => node.id)).size !== nodes.length) throw new Error("Node ID trùng lặp");
if (edges.some((edge) => edge.source === edge.target)) throw new Error("Self edge");

const nodeCount = nodes.length;
const edgeCount = edges.length;
const partCount = Math.ceil(Math.max(nodeCount / 60, edgeCount / 120));
const filesSorted = [...batch.files].sort((a, b) => a.path.localeCompare(b.path)).map((file) => file.path);
const chunkSize = Math.ceil(filesSorted.length / partCount);
const knownFiles = new Set([...batch.files.map((file) => file.path), ...Object.values(batch.batchImportData).flat(), ...Object.keys(batch.neighborMap ?? {}), ...Object.values(batch.neighborMap ?? {}).flat().map((item) => item.path)]);
const written = [];

for (let index = 0; index < partCount; index += 1) {
  const filePaths = new Set(filesSorted.slice(index * chunkSize, (index + 1) * chunkSize));
  const partNodes = nodes.filter((node) => filePaths.has(node.filePath));
  const sourceIds = new Set(partNodes.map((node) => node.id));
  const partEdges = edges.filter((edge) => sourceIds.has(edge.source));
  for (const edge of partEdges) {
    const fileTarget = edge.target.match(/^file:(.+)$/);
    if (!sourceIds.has(edge.target) && !emitted.has(edge.target) && !(fileTarget && knownFiles.has(fileTarget[1]))) throw new Error(`Part ${index + 1}: target không hợp lệ ${edge.target}`);
  }
  const outputPath = partCount === 1 ? path.join(ua, "intermediate/batch-5.json") : path.join(ua, `intermediate/batch-5-part-${index + 1}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify({ nodes: partNodes, edges: partEdges }, null, 2)}\n`, "utf8");
  JSON.parse(fs.readFileSync(outputPath, "utf8"));
  written.push({ outputPath, nodes: partNodes.length, edges: partEdges.length });
}

console.log(JSON.stringify({ nodeCount, edgeCount, importExpected, importActual, partCount, written }, null, 2));
