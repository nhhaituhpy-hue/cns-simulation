import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/nhhai/Desktop/cns-simulator";
const ua = path.join(root, ".ua");
const batches = JSON.parse(fs.readFileSync(path.join(ua, "intermediate/batches.json"), "utf8"));
const batch = batches.batches.find((item) => item.batchIndex === 6);
if (!batch) throw new Error("Không tìm thấy batchIndex 6");
const extraction = JSON.parse(fs.readFileSync(path.join(ua, "tmp/ua-file-extract-results-6.json"), "utf8"));

const summaries = {
  "src/app/admin/create/page.tsx": "Next.js App Router page mở wizard để quản trị viên tạo một kịch bản mô phỏng mới.",
  "src/app/admin/edit/page.tsx": "Next.js App Router page đọc định danh kịch bản từ search params và mở wizard ở chế độ chỉnh sửa.",
  "src/app/student/simulation/page.tsx": "Trang mô phỏng của học viên, lấy tham số kịch bản và hiển thị giao diện theo dõi scenario trong Suspense boundary.",
  "src/app/student/terminal/page.tsx": "Trang terminal của học viên, lấy session từ URL và tải TerminalSession bên trong trạng thái chờ Suspense.",
  "src/components/admin/action-builder.tsx": "Trình dựng chuỗi hành động cho kịch bản, mô phỏng terminal engine để quản trị viên ghi lệnh, phản hồi và kỳ vọng theo từng bước.",
  "src/components/admin/hardware-fault-step.tsx": "Bước wizard cấu hình lỗi phần cứng, cho phép chọn component, trạng thái, tham số lỗi và xem trực quan signal path.",
  "src/components/admin/login-role-step.tsx": "Bước wizard cấu hình vai trò đăng nhập, thông tin tài khoản và các ràng buộc truy cập cho kịch bản.",
  "src/components/admin/scenario-form-utils.ts": "Cung cấp factory, phép chuyển đổi draft và validation theo từng bước cho workflow biên soạn kịch bản.",
  "src/components/admin/scenario-metadata-step.tsx": "Bước nhập metadata của kịch bản, gồm tên, mô tả, độ khó và thời lượng dự kiến.",
  "src/components/admin/scenario-wizard-form.tsx": "Điều phối form wizard nhiều bước, validation, điều hướng bước và submit dữ liệu kịch bản hoàn chỉnh.",
  "src/components/admin/scenario-wizard.tsx": "Nạp dữ liệu kịch bản từ store và chọn chế độ tạo hoặc chỉnh sửa trước khi hiển thị ScenarioWizardForm.",
  "src/components/admin/sensor-data-profile-editor.tsx": "Biên tập profile dữ liệu cảm biến theo preset hoặc cấu hình tùy chỉnh cho giá trị, dao động và xu hướng.",
  "src/components/admin/site-state-editor.tsx": "Biên tập cấu trúc site và sensor của kịch bản, gồm trạng thái, địa chỉ, profile dữ liệu và thao tác thêm/xóa.",
  "src/components/grading/grading-result.tsx": "Hiển thị kết quả chấm bài tổng hợp và diff theo từng bước giữa hành động thực tế với đáp án kỳ vọng.",
  "src/components/grading/hardware-grading-result.tsx": "Hiển thị kết quả chẩn đoán phần cứng, so sánh component, loại lỗi, lý luận và biện pháp khắc phục.",
  "src/components/grading/step-diff.tsx": "Trình bày sai khác của một bước thao tác với đánh dấu command, target, tham số và điểm đạt được.",
  "src/components/hardware/component-inspector.tsx": "Hiển thị chi tiết component phần cứng được chọn, trạng thái, tham số kỹ thuật và thông tin liên kết.",
  "src/components/hardware/hardware-diagnosis-workspace.tsx": "Tổ chức workspace chẩn đoán phần cứng gồm sơ đồ signal path, inspector và vùng nhập kết luận của học viên.",
  "src/components/hardware/signal-path-diagram.tsx": "Vẽ sơ đồ signal path tương tác, thể hiện node, connector, trạng thái lỗi và component đang được chọn.",
  "src/components/qcms/elapsed-timer.tsx": "Hiển thị bộ đếm thời gian đã trôi qua của phiên QC-Monitoring với định dạng thời lượng dùng chung.",
  "src/components/qcms/general-settings-dialog.tsx": "Hộp thoại cài đặt chung theo phong cách QC-Monitoring cho các tùy chọn hiển thị và vận hành.",
  "src/components/qcms/ground-stations-window.tsx": "Cửa sổ quản lý các slot ground station, trạng thái site, lựa chọn trực quan hóa và context menu vận hành.",
  "src/components/qcms/log-window.tsx": "Sinh và hiển thị dòng sự kiện theo thời gian cho scenario, gồm sự kiện site, sensor và hành động mô phỏng.",
  "src/components/qcms/qcms-toolbar.tsx": "Thanh công cụ QC-Monitoring với đồng hồ, các trường trạng thái và nhóm nút điều khiển giao diện.",
  "src/components/qcms/qcms-utils.ts": "Tập hợp hằng số và utility cho slot site, trực quan hóa sensor, SNMP freshness, độ khó và định dạng thời gian."
};

const functionSummaries = {
  CreateScenarioPage: "Render ScenarioWizard ở chế độ tạo kịch bản mới.",
  EditScenarioPage: "Bọc nội dung chỉnh sửa trong Suspense boundary của App Router.",
  SimulationContent: "Đọc scenario id từ search params và render màn hình theo dõi mô phỏng.",
  StudentScenarioPage: "Cung cấp Suspense boundary cho trang mô phỏng học viên.",
  TerminalPage: "Cung cấp Suspense boundary và fallback cho trang terminal học viên.",
  createInitialEngineSession: "Khởi tạo terminal engine session tạm thời từ draft để preview chuỗi hành động.",
  toRecordedAction: "Chuyển kết quả terminal engine thành action đã ghi trong kịch bản.",
  ActionBuilder: "Quản lý giao diện ghi, sắp xếp, chỉnh sửa và preview các action của kịch bản.",
  createScenarioHardwareFault: "Tạo cấu hình lỗi phần cứng mặc định từ component được chọn.",
  inferredStatus: "Suy ra trạng thái component từ loại lỗi và dữ liệu cấu hình hiện tại.",
  faultForComponent: "Chuẩn hóa fault tương ứng với component, loại và tham số lỗi được chọn.",
  HardwareFaultStep: "Render và quản lý bước cấu hình lỗi phần cứng trong scenario wizard.",
  LoginRoleStep: "Render các trường cấu hình vai trò và thông tin đăng nhập của kịch bản.",
  createSensor: "Tạo sensor draft mới với định danh và profile dữ liệu mặc định.",
  createSite: "Tạo site draft mới cùng sensor khởi tạo.",
  createInitialScenarioDraft: "Khởi tạo draft kịch bản đầy đủ cho workflow tạo mới.",
  scenarioToDraft: "Chuyển domain scenario hiện có sang cấu trúc draft có thể chỉnh sửa.",
  renumberActions: "Đánh lại thứ tự action liên tục sau khi danh sách thay đổi.",
  isValidIpv4: "Kiểm tra chuỗi địa chỉ IPv4 theo cấu trúc octet hợp lệ.",
  validateScenarioStep: "Xác thực dữ liệu của một bước wizard và trả về lỗi theo field.",
  validateScenarioDraft: "Chạy validation toàn bộ các bước trên một scenario draft.",
  ScenarioMetadataStep: "Render bước nhập và cập nhật metadata cơ bản của kịch bản.",
  findTargetSensorName: "Tra cứu tên sensor đích của action từ cấu trúc site trong draft.",
  firstInvalidStep: "Tìm bước wizard đầu tiên còn lỗi để điều hướng người dùng tới vị trí cần sửa.",
  ScenarioWizardForm: "Điều phối state, validation, điều hướng và submit của form wizard nhiều bước.",
  WizardLoadingState: "Render trạng thái đang nạp dữ liệu cho scenario wizard.",
  ScenarioWizard: "Hydrate store, chọn scenario cần sửa và cung cấp draft cho wizard form.",
  ProfileField: "Render một field số có nhãn và đơn vị trong trình chỉnh sửa profile sensor.",
  selectedProfileValue: "Xác định preset profile phù hợp với cấu hình sensor hiện tại.",
  SensorDataProfileEditor: "Quản lý lựa chọn preset và chỉnh sửa profile dữ liệu sensor tùy chỉnh.",
  SiteStateEditor: "Quản lý cây site/sensor và các thao tác cấu hình trạng thái cho scenario.",
  GradingResult: "Render tổng điểm và danh sách StepDiff cho toàn bộ bài làm.",
  ResultLine: "Render một dòng so sánh kết quả phần cứng với trạng thái đạt hoặc sai.",
  componentNames: "Tạo ánh xạ component id sang tên hiển thị từ hardware model.",
  HardwareGradingResult: "So sánh câu trả lời chẩn đoán với đáp án phần cứng và trình bày kết quả.",
  ActionCell: "Render một ô action trong bảng diff với định dạng theo loại thao tác.",
  StepDiff: "Render chi tiết sai khác và điểm của một bước giữa expected với actual action.",
  ComponentInspector: "Render thuộc tính và trạng thái của hardware component đang được chọn.",
  HardwareDiagnosisWorkspace: "Điều phối selection, sơ đồ, inspector và form trả lời chẩn đoán.",
  Connector: "Render đường nối SVG giữa hai node trong signal path diagram.",
  SignalPathDiagram: "Render sơ đồ tín hiệu tương tác và áp dụng trạng thái lỗi cho từng component.",
  ElapsedTimer: "Cập nhật định kỳ và hiển thị thời gian trôi qua kể từ mốc bắt đầu.",
  SettingsGroup: "Nhóm các tùy chọn cài đặt có tiêu đề trong dialog.",
  Setting: "Render một dòng cài đặt với nhãn và control tương ứng.",
  GeneralSettingsDialog: "Render hộp thoại cấu hình chung và xử lý thao tác đóng.",
  LegacyButton: "Render nút điều khiển kiểu legacy cho cửa sổ ground station.",
  EmptySlot: "Render một slot ground station trống với hành động cấu hình.",
  GroundStationsWindow: "Render danh sách slot ground station và xử lý chọn/context menu site.",
  sensorEvents: "Sinh các log event của sensor dựa trên trạng thái và timeline scenario.",
  generateScenarioEvents: "Tổng hợp, đóng dấu thời gian và sắp xếp toàn bộ event của scenario.",
  LogWindow: "Render bảng log có thể cuộn từ các event đã sinh cho scenario.",
  QcmsClock: "Duy trì và hiển thị đồng hồ thời gian thực trên toolbar.",
  QcmsToolbar: "Render nhóm nút và trường trạng thái chính của QC-Monitoring.",
  createGroundStationSlots: "Phân bổ site vào số lượng slot ground station cố định.",
  toggleSensorVisualization: "Bật hoặc tắt sensor trong danh sách đang được trực quan hóa.",
  siteHasVisualizedSensor: "Kiểm tra một site có sensor nào đang được trực quan hóa hay không.",
  getSnmpAgeSeconds: "Tính tuổi dữ liệu SNMP theo giây từ timestamp gần nhất.",
  isSnmpStale: "Xác định dữ liệu SNMP đã vượt ngưỡng stale hay chưa.",
  formatSnmpAge: "Định dạng tuổi dữ liệu SNMP thành chuỗi ngắn dễ đọc.",
  countScenarioSensors: "Đếm tổng số sensor trong toàn bộ site của scenario.",
  formatElapsedTime: "Định dạng số giây thành thời lượng giờ, phút và giây."
};

function fileTags(file) {
  if (file.path.startsWith("src/app/")) return ["nextjs", "app-router", "trang", "điều-hướng"];
  if (file.path.includes("/admin/")) return ["react-component", "quản-trị", "scenario-authoring", "wizard"];
  if (file.path.includes("/grading/")) return ["react-component", "chấm-điểm", "so-sánh-kết-quả", "workflow"];
  if (file.path.includes("/hardware/")) return ["react-component", "chẩn-đoán-phần-cứng", "signal-path", "tương-tác"];
  if (file.path.endsWith("qcms-utils.ts")) return ["utility", "qcms", "snmp", "định-dạng"];
  return ["react-component", "qcms", "giao-diện-vận-hành", "giám-sát"];
}

function functionTags(filePath, name) {
  if (/^is|validate/.test(name)) return ["validation", "type-guard", "typescript", "dữ-liệu"];
  if (/create|ToDraft|renumber/.test(name)) return ["factory", "chuyển-đổi-dữ-liệu", "scenario", "utility"];
  if (/format|getSnmp|count|toggle|selected|find/.test(name)) return ["utility", "dữ-liệu", "typescript", "qcms"];
  if (filePath.endsWith(".tsx")) return ["react-component", "tsx", "giao-diện", filePath.includes("qcms") ? "qcms" : "workflow"];
  return ["logic-nghiệp-vụ", "typescript", "scenario", "utility"];
}

function languageNotes(filePath) {
  if (filePath.startsWith("src/app/")) return "Tuân theo Next.js App Router; page component dùng Suspense khi đọc search params phía client.";
  if (filePath.endsWith("scenario-form-utils.ts")) return "Các helper sử dụng typed draft và validation result để tách business rules khỏi React component.";
  if (filePath.endsWith("qcms-utils.ts")) return "Các utility giữ kiểu dữ liệu domain xuyên suốt và dùng readonly input khi không cần mutation.";
  if (filePath.endsWith(".tsx")) return "React function component viết bằng TSX với typed props và state được thu hẹp bằng literal union khi phù hợp.";
  return undefined;
}

const extracted = new Map(extraction.results.map((item) => [item.path, item]));
const nodes = [];
const edges = [];
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
    nodes.push({ id, type: "function", name: fn.name, filePath: file.path,
      lineRange: [fn.startLine, fn.endLine],
      summary: functionSummaries[fn.name] ?? `Thực hiện logic ${fn.name} trong mô-đun tương ứng.`,
      tags: functionTags(file.path, fn.name),
      complexity: span < 50 ? "simple" : span <= 120 ? "moderate" : "complex" });
    edges.push({ source: `file:${file.path}`, target: id, type: "contains", direction: "forward", weight: 1.0 });
    if (exported.has(fn.name)) edges.push({ source: `file:${file.path}`, target: id, type: "exports", direction: "forward", weight: 0.8 });
  }
  for (const imported of batch.batchImportData[file.path] ?? []) {
    edges.push({ source: `file:${file.path}`, target: `file:${imported}`, type: "imports", direction: "forward", weight: 0.7 });
  }
}

const renderedChildren = {
  "src/components/admin/hardware-fault-step.tsx": ["src/components/hardware/component-inspector.tsx", "src/components/hardware/signal-path-diagram.tsx"],
  "src/components/admin/scenario-wizard-form.tsx": ["src/components/admin/action-builder.tsx", "src/components/admin/hardware-fault-step.tsx", "src/components/admin/login-role-step.tsx", "src/components/admin/scenario-metadata-step.tsx", "src/components/admin/site-state-editor.tsx"],
  "src/components/admin/scenario-wizard.tsx": ["src/components/admin/scenario-wizard-form.tsx"],
  "src/components/grading/grading-result.tsx": ["src/components/grading/step-diff.tsx"],
  "src/components/hardware/hardware-diagnosis-workspace.tsx": ["src/components/hardware/component-inspector.tsx", "src/components/hardware/signal-path-diagram.tsx"],
  "src/components/qcms/ground-stations-window.tsx": ["src/components/qcms/site-context-menu.tsx", "src/components/qcms/site-item.tsx"]
};
for (const [source, targets] of Object.entries(renderedChildren)) {
  for (const target of targets) edges.push({ source: `file:${source}`, target: `file:${target}`, type: "contains", direction: "forward", weight: 1.0 });
}

const expectedImports = Object.values(batch.batchImportData).reduce((sum, list) => sum + list.length, 0);
const actualImports = edges.filter((edge) => edge.type === "imports").length;
if (actualImports !== expectedImports) throw new Error(`Import edge mismatch: ${actualImports}/${expectedImports}`);
if (new Set(nodes.map((node) => node.id)).size !== nodes.length) throw new Error("Có node ID trùng lặp");
if (nodes.some((node) => !node.summary || node.tags.length < 3 || node.tags.length > 5)) throw new Error("Node thiếu summary hoặc tags không hợp lệ");
if (edges.some((edge) => edge.source === edge.target)) throw new Error("Có self-reference edge");

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
  fs.writeFileSync(path.join(ua, "intermediate", `batch-6-part-${i + 1}.json`), `${JSON.stringify({ nodes: partNodes, edges: partEdges }, null, 2)}\n`);
}
console.log(JSON.stringify({ partCount, nodeCount: nodes.length, edgeCount: edges.length, expectedImports, actualImports, files: batch.files.length, skipped: extraction.filesSkipped }));
