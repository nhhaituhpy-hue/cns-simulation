import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/nhhai/Desktop/cns-simulator";
const ua = path.join(root, ".ua");
const batches = JSON.parse(fs.readFileSync(path.join(ua, "intermediate/batches.json"), "utf8"));
const batch = batches.batches.find((item) => item.batchIndex === 9);
if (!batch) throw new Error("Không tìm thấy batchIndex 9");
const extraction = JSON.parse(fs.readFileSync(path.join(ua, "tmp/ua-file-extract-results-9.json"), "utf8"));

const summaries = {
  "src/lib/sensor-data-presets.ts": "Định nghĩa các preset dữ liệu sensor cho trạm Côn Sơn cùng nhãn hiển thị, giá trị cơ sở, dao động và xu hướng mô phỏng.",
  "src/lib/terminal-engine.ts": "Triển khai state machine của terminal mô phỏng: xác thực đăng nhập, render menu, xử lý input, thực thi menu item và ghi nhận action có cấu trúc.",
  "src/lib/terminal-templates.ts": "Render các màn hình terminal dạng văn bản cho network, client, SNMP, system, DSP, GPS, filter và monitoring device từ scenario state.",
  "src/lib/types.ts": "Tập trung domain types cho scenario, site, sensor, terminal action, grading, recording và cấu hình lỗi phần cứng của hệ thống mô phỏng.",
  "src/stores/default-scenarios.ts": "Cung cấp các scenario mẫu hoàn chỉnh với site, sensor, terminal menu, action kỳ vọng và helper tạo bản sao độc lập.",
  "src/stores/recording-store.ts": "Zustand store quản lý phiên ghi thao tác, expected/actual actions, grading result và vòng đời recording.",
  "src/stores/terminal-store.ts": "Zustand store bọc TerminalEngine để quản lý đăng nhập, menu, output, history và đồng bộ action sang recording store.",
  "tests/admin/action-builder.test.tsx": "Kiểm thử ActionBuilder khi ghi lệnh terminal mới và khi chỉnh sửa chuỗi action đã tồn tại.",
  "tests/admin/hardware-fault-step.test.tsx": "Kiểm thử bước cấu hình lỗi phần cứng và cập nhật draft scenario từ thao tác quản trị viên.",
  "tests/admin/scenario-wizard-form.test.tsx": "Kiểm thử điều hướng, validation và submit của form wizard biên soạn scenario.",
  "tests/api/scenarios-route.test.ts": "Kiểm thử API route scenario cho thao tác đọc, tạo/cập nhật và xử lý dữ liệu mặc định.",
  "tests/core/grading.test.ts": "Kiểm thử thuật toán chấm điểm action, so khớp tham số, thứ tự bước và các trường hợp sai khác.",
  "tests/core/hardware.test.ts": "Kiểm thử hardware model, fault scenario và kết quả chấm chẩn đoán phần cứng.",
  "tests/core/terminal-engine.test.ts": "Kiểm thử state machine TerminalEngine cho login, điều hướng menu, input pending và action được tạo.",
  "tests/core/terminal-templates.test.ts": "Kiểm thử nội dung terminal template với nhiều trạng thái network, SNMP, GPS và sensor khác nhau.",
  "tests/grading/grading-result.test.tsx": "Kiểm thử giao diện kết quả chấm điểm và cách hiển thị các bước đúng hoặc sai.",
  "tests/hardware/hardware-diagnosis-workspace.test.tsx": "Kiểm thử workspace chẩn đoán phần cứng, selection component và thao tác nộp câu trả lời.",
  "tests/qcms/module-b.test.tsx": "Kiểm thử tích hợp các cửa sổ QC-Monitoring của module B với scenario, toolbar, log và sensor config.",
  "tests/qcms/qcms-utils.test.ts": "Kiểm thử utility QC-Monitoring cho slot site, SNMP staleness, trực quan hóa sensor và định dạng thời gian.",
  "tests/qcms/site-monitor.test.tsx": "Kiểm thử SiteMonitor với nhiều cấu trúc site/sensor, status badge và lựa chọn hiển thị.",
  "tests/state/recording-store.test.ts": "Kiểm thử state transition của recording store từ bắt đầu, ghi action đến dừng và chấm điểm.",
  "tests/state/terminal-store.test.ts": "Kiểm thử terminal store cho login, input, history, reset và tích hợp recording.",
  "tests/terminal/action-panel.test.tsx": "Kiểm thử action panel và callback điều khiển các bước thao tác trong phiên terminal.",
  "tests/terminal/terminal-input.test.tsx": "Kiểm thử terminal input khi nhập lệnh, submit và xử lý trạng thái disabled."
};

const functionSummaries = {
  renderMenu: "Render cây menu terminal thành các dòng văn bản có đánh số và trạng thái mục.",
  renderTogglePrompt: "Render prompt lựa chọn bật/tắt cho menu item đang chờ input.",
  authenticateLoginUser: "Xác thực username và password với danh sách login user của scenario.",
  authenticateTerminalLogin: "Phân tích chuỗi đăng nhập terminal và trả về kết quả xác thực có kiểu rõ ràng.",
  assertValidMenuTree: "Kiểm tra tính toàn vẹn của cây menu và phát hiện id hoặc quan hệ cha-con không hợp lệ.",
  gpsStatus: "Chuyển trạng thái GPS trong site state thành chuỗi hiển thị terminal.",
  clientRow: "Định dạng một client network thành dòng bảng terminal cố định cột.",
  renderNetwork: "Render cấu hình và trạng thái network của site hiện tại.",
  renderClients: "Render danh sách client kết nối dưới dạng bảng terminal.",
  renderClientStats: "Render thống kê chi tiết của các client trong scenario.",
  renderSnmpUsers: "Render cấu hình SNMP users và quyền truy cập tương ứng.",
  renderSnmpTraps: "Render danh sách SNMP trap destinations cùng trạng thái cấu hình.",
  renderSystemConfig: "Render các tham số cấu hình hệ thống của site dưới dạng terminal view.",
  renderSystemStatus: "Render trạng thái vận hành tổng hợp của site và các sensor.",
  renderDspStats: "Render số liệu DSP và chất lượng xử lý tín hiệu của sensor.",
  renderGps: "Render trạng thái đồng bộ GPS và các thông số liên quan.",
  renderFilters: "Render cấu hình filter đang áp dụng cho các kênh giám sát.",
  renderMonitoringDevices: "Render danh sách thiết bị monitoring và trạng thái kết nối.",
  renderTemplate: "Dispatch template id tới renderer phù hợp và trả về toàn bộ output terminal.",
  buildExpectedActions: "Tạo chuỗi expected action từ các lệnh terminal mẫu của scenario.",
  monitoring: "Tạo cấu hình trạng thái monitoring dùng lại trong scenario mặc định.",
  singleSite: "Tạo site mẫu cùng sensor, network và thông số terminal liên quan.",
  cloneScenarios: "Tạo deep clone của danh sách scenario mặc định để tránh chia sẻ mutable state.",
  createRecordingStore: "Tạo Zustand store điều phối recording, danh sách action và grading result.",
  createTerminalStore: "Tạo Zustand store kết nối UI terminal với TerminalEngine và recording store.",
  ActionBuilderHarness: "Bọc ActionBuilder với state tối thiểu để kiểm thử thao tác ghi action.",
  ExistingActionHarness: "Bọc ActionBuilder với action có sẵn để kiểm thử workflow chỉnh sửa.",
  action: "Tạo terminal action mẫu có thể ghi đè field phục vụ kiểm thử grading.",
  makeSensor: "Tạo sensor fixture đầy đủ cho các bài kiểm thử module QC-Monitoring.",
  makeScenario: "Tạo scenario fixture với site và sensor tùy chỉnh cho kiểm thử tích hợp.",
  sensor: "Tạo sensor fixture với các giá trị mặc định và phần ghi đè tùy chọn.",
  scenarioWithSites: "Tạo scenario fixture từ danh sách site để kiểm thử SiteMonitor.",
  recordable: "Tạo recordable action fixture cho kiểm thử recording store."
};

function fileTags(file) {
  if (file.path.startsWith("tests/")) {
    const area = file.path.split("/")[1];
    return ["kiểm-thử", area, file.path.endsWith(".tsx") ? "react" : "typescript", "hồi-quy"];
  }
  if (file.path.includes("terminal-engine")) return ["state-machine", "terminal", "command-processing", "authentication"];
  if (file.path.includes("terminal-templates")) return ["template-rendering", "terminal", "formatting", "qcms"];
  if (file.path.endsWith("types.ts")) return ["type-definition", "domain-model", "typescript", "schema"];
  if (file.path.includes("sensor-data")) return ["data-presets", "sensor", "simulation", "qcms"];
  if (file.path.includes("default-scenarios")) return ["dữ-liệu-mặc-định", "scenario", "fixtures", "simulation"];
  return ["zustand", "quản-lý-trạng-thái", "terminal", "workflow"];
}

function symbolTags(filePath, name, type) {
  if (type === "class") return ["class", "state-machine", "terminal", "command-processing"];
  if (/authenticate/.test(name)) return ["authentication", "validation", "terminal", "type-narrowing"];
  if (/^render|Row$|Status$/.test(name)) return ["rendering", "terminal", "formatting", "template"];
  if (/^create|build|clone|make|singleSite|monitoring/.test(name)) return ["factory", "test-fixture", "scenario", "data-model"];
  if (filePath.startsWith("tests/")) return ["test-helper", "fixture", "typescript", "hồi-quy"];
  return ["logic-nghiệp-vụ", "typescript", "terminal", "utility"];
}

function languageNotes(filePath) {
  if (filePath.endsWith("terminal-engine.ts")) return "TerminalEngine đóng gói state machine trong class TypeScript, còn kết quả xử lý dùng các type có cấu trúc để truyền output và recorded action an toàn.";
  if (filePath.endsWith("terminal-templates.ts")) return "Các renderer nhỏ được dispatch theo template id, giữ phần định dạng text tách khỏi state machine terminal.";
  if (filePath.endsWith("types.ts")) return "Sử dụng interface, literal union và utility type để biểu diễn nhiều trạng thái domain mà vẫn hỗ trợ narrowing theo field phân biệt.";
  if (filePath.includes("/stores/")) return "Zustand store dùng generic StoreApi/UseBoundStore và factory injection để tách instance production khỏi instance trong test.";
  return undefined;
}

const extracted = new Map(extraction.results.map((item) => [item.path, item]));
const nodes = [];
const edges = [];
const batchPaths = new Set(batch.files.map((file) => file.path));
for (const file of batch.files) {
  const info = extracted.get(file.path);
  if (!info) throw new Error(`Thiếu extraction result cho ${file.path}`);
  const note = languageNotes(file.path);
  nodes.push({ id: `file:${file.path}`, type: "file", name: path.posix.basename(file.path), filePath: file.path,
    summary: summaries[file.path], tags: fileTags(file),
    complexity: info.nonEmptyLines < 50 ? "simple" : info.nonEmptyLines <= 200 ? "moderate" : "complex",
    ...(note ? { languageNotes: note } : {}) });

  const exported = new Set((info.exports ?? []).map((item) => item.name));
  for (const fn of info.functions ?? []) {
    const span = fn.endLine - fn.startLine + 1;
    if (span < 10 && !exported.has(fn.name)) continue;
    const id = `function:${file.path}:${fn.name}`;
    nodes.push({ id, type: "function", name: fn.name, filePath: file.path, lineRange: [fn.startLine, fn.endLine],
      summary: functionSummaries[fn.name] ?? `Thực hiện logic ${fn.name} cho terminal simulator hoặc bộ kiểm thử liên quan.`,
      tags: symbolTags(file.path, fn.name, "function"), complexity: span < 50 ? "simple" : span <= 120 ? "moderate" : "complex" });
    edges.push({ source: `file:${file.path}`, target: id, type: "contains", direction: "forward", weight: 1.0 });
    if (exported.has(fn.name)) edges.push({ source: `file:${file.path}`, target: id, type: "exports", direction: "forward", weight: 0.8 });
  }
  for (const cls of info.classes ?? []) {
    const span = cls.endLine - cls.startLine + 1;
    if (span < 20 && (cls.methods ?? []).length < 2 && !exported.has(cls.name)) continue;
    const id = `class:${file.path}:${cls.name}`;
    nodes.push({ id, type: "class", name: cls.name, filePath: file.path, lineRange: [cls.startLine, cls.endLine],
      summary: cls.name === "TerminalEngine" ? "State machine trung tâm xử lý phiên terminal, điều hướng menu, pending input và sinh recorded action." : `Lớp ${cls.name} triển khai logic domain tương ứng.`,
      tags: symbolTags(file.path, cls.name, "class"), complexity: span < 50 ? "simple" : span <= 200 ? "moderate" : "complex" });
    edges.push({ source: `file:${file.path}`, target: id, type: "contains", direction: "forward", weight: 1.0 });
    if (exported.has(cls.name)) edges.push({ source: `file:${file.path}`, target: id, type: "exports", direction: "forward", weight: 0.8 });
  }
  for (const imported of batch.batchImportData[file.path] ?? []) {
    edges.push({ source: `file:${file.path}`, target: `file:${imported}`, type: "imports", direction: "forward", weight: 0.7 });
    if (file.path.startsWith("tests/") && batchPaths.has(imported) && !imported.startsWith("tests/")) {
      edges.push({ source: `file:${imported}`, target: `file:${file.path}`, type: "tested_by", direction: "forward", weight: 0.5 });
    }
  }
}

const expectedImports = Object.values(batch.batchImportData).reduce((sum, list) => sum + list.length, 0);
const actualImports = edges.filter((edge) => edge.type === "imports").length;
if (actualImports !== expectedImports) throw new Error(`Import edge mismatch ${actualImports}/${expectedImports}`);
if (new Set(nodes.map((node) => node.id)).size !== nodes.length) throw new Error("Node ID trùng lặp");
if (nodes.some((node) => !node.summary || node.tags.length < 3 || node.tags.length > 5)) throw new Error("Node thiếu summary/tags");
if (edges.some((edge) => edge.source === edge.target)) throw new Error("Self-reference edge");

const partCount = Math.ceil(Math.max(nodes.length / 60, edges.length / 120));
const sortedFiles = [...batch.files].sort((a, b) => a.path.localeCompare(b.path));
const groupSize = Math.ceil(sortedFiles.length / partCount);
const sourcePath = (id) => id.replace(/^(file|function|class):/, "").split(/:(?=[^/]+$)/)[0];
const knownPaths = new Set([...batch.files.map((f) => f.path), ...Object.keys(batch.batchImportData),
  ...Object.values(batch.batchImportData).flat(), ...Object.keys(batch.neighborMap),
  ...Object.values(batch.neighborMap).flat().map((neighbor) => neighbor.path)]);
for (let i = 0; i < partCount; i += 1) {
  const groupPaths = new Set(sortedFiles.slice(i * groupSize, (i + 1) * groupSize).map((f) => f.path));
  const partNodes = nodes.filter((node) => groupPaths.has(node.filePath));
  const partIds = new Set(partNodes.map((node) => node.id));
  const partEdges = edges.filter((edge) => groupPaths.has(sourcePath(edge.source)));
  for (const edge of partEdges) {
    const validSource = partIds.has(edge.source) || (edge.source.startsWith("file:") && knownPaths.has(edge.source.slice(5)));
    const validTarget = partIds.has(edge.target) || (edge.target.startsWith("file:") && knownPaths.has(edge.target.slice(5)));
    if (!validSource || !validTarget) throw new Error(`Edge không hợp lệ part ${i + 1}: ${JSON.stringify(edge)}`);
  }
  fs.writeFileSync(path.join(ua, "intermediate", `batch-9-part-${i + 1}.json`), `${JSON.stringify({ nodes: partNodes, edges: partEdges }, null, 2)}\n`);
}
console.log(JSON.stringify({ partCount, nodeCount: nodes.length, edgeCount: edges.length, expectedImports, actualImports, files: batch.files.length, skipped: extraction.filesSkipped }));
