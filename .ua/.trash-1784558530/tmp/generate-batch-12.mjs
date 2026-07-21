import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/nhhai/Desktop/cns-simulator";
const ua = path.join(root, ".ua");
const batches = JSON.parse(fs.readFileSync(path.join(ua, "intermediate/batches.json"), "utf8"));
const batch = batches.batches.find((item) => item.batchIndex === 12);
if (!batch) throw new Error("Không tìm thấy batchIndex 12");
const extraction = JSON.parse(fs.readFileSync(path.join(ua, "tmp/ua-file-extract-results-12.json"), "utf8"));

const summaries = {
  "src/app/admin/dme/submissions/[id]/page.tsx": "Next.js App Router page mở màn hình review chi tiết một bài nộp DME theo route parameter.",
  "src/app/admin/dme/submissions/page.tsx": "Next.js App Router page hiển thị danh sách bài nộp DME dành cho quản trị viên hoặc giám khảo.",
  "src/components/dme/admin/dme-submission-list.tsx": "Hiển thị danh sách bài nộp DME, trạng thái chấm và liên kết tới màn hình review theo từng kịch bản.",
  "src/components/dme/admin/dme-submission-review.tsx": "Điều phối review bài nộp DME, trình bày nhật ký, câu trả lời, chẩn đoán phần cứng và thao tác nhập điểm.",
  "src/components/exams/official-exam-review.tsx": "Hiển thị kết quả official exam đa module, chuẩn hóa evidence PMDT/ADS-B, diff thao tác và phần review chẩn đoán phần cứng.",
  "src/components/hardware/equipment-block-diagram.tsx": "Render sơ đồ khối thiết bị bằng SVG với component, signal link và selection tương tác.",
  "src/components/hardware/hardware-diagnosis-step.tsx": "Bước chẩn đoán phần cứng cho học viên, kết hợp sơ đồ thiết bị với form chọn lỗi, lý luận và biện pháp khắc phục.",
  "src/components/hardware/hardware-review.tsx": "Trình bày câu trả lời chẩn đoán phần cứng và đối chiếu component được chọn trên sơ đồ thiết bị.",
  "src/components/hardware/hardware-task-editor.tsx": "Biên tập đáp án nhiệm vụ chẩn đoán phần cứng bằng cách chọn component trên sơ đồ và nhập hướng dẫn kỳ vọng.",
  "src/lib/dme-hardware-model.ts": "Định nghĩa các equipment block diagram của hệ thống DME, gồm component, tọa độ connector và signal link.",
  "src/lib/dme-scenario-storage.ts": "Xác thực, clone, serialize và ánh xạ kịch bản DME giữa domain model, local storage và row database.",
  "src/lib/dme-submission-storage.ts": "Xác thực, phiên bản hóa, serialize và ánh xạ bài nộp DME giữa domain model, local storage và database.",
  "src/lib/equipment-diagram-compatibility.ts": "Chuẩn hóa component id cũ sang schema equipment diagram hiện tại cho task và answer chẩn đoán phần cứng.",
  "src/lib/equipment-diagram-types.ts": "Định nghĩa type cho equipment diagram, hardware diagnosis task/answer cùng các validator bảo vệ dữ liệu runtime.",
  "src/lib/exams/result-presentation.ts": "Parse kết quả raw của bài thi và chuyển evidence PMDT hoặc ADS-B thành cấu trúc trình bày an toàn cho giao diện review.",
  "src/lib/vor-hardware-model.ts": "Định nghĩa các equipment block diagram của hệ thống VOR với component, cổng kết nối và đường tín hiệu.",
  "src/stores/dme-submission-store.ts": "Zustand store quản lý bài nộp DME, hydrate local/API, tạo bài, review điểm và theo dõi lỗi đồng bộ.",
  "tests/exams/result-presentation.test.ts": "Kiểm thử parser và cấu trúc trình bày kết quả PMDT/ADS-B với dữ liệu hợp lệ hoặc malformed.",
  "tests/hardware-diagrams.test.tsx": "Kiểm thử tính hợp lệ, compatibility normalization và khả năng render các sơ đồ phần cứng DME/VOR.",
  "tests/state/dme-persistence.test.ts": "Kiểm thử serialize, deserialize, migration và validation dữ liệu kịch bản/bài nộp DME."
};

const exactFunctionSummaries = {
  DmeSubmissionReviewPage: "Render màn hình review bài nộp DME cho id lấy từ dynamic route.",
  DmeSubmissionsPage: "Render danh sách bài nộp DME trong khu vực quản trị.",
  DmeSubmissionList: "Hydrate stores và render các bài nộp DME kèm trạng thái, học viên và liên kết review.",
  DmeSubmissionReview: "Nạp bài nộp cùng scenario, hiển thị evidence và gửi kết quả chấm của giám khảo.",
  PmdtEvidence: "Chuyển evidence PMDT thành các bảng sự kiện, câu trả lời và hardware review dễ đọc.",
  AdsbEvidence: "Trình bày recorded actions và grading details của kết quả ADS-B.",
  AttemptItemReview: "Chọn renderer phù hợp với module và trạng thái của một attempt item.",
  OfficialExamReview: "Render tổng quan official exam và danh sách kết quả theo từng module thi.",
  EquipmentBlockDiagram: "Render SVG equipment diagram và phát sự kiện khi người dùng chọn component.",
  HardwareDiagnosisStep: "Quản lý câu trả lời chẩn đoán và điều phối thao tác quay lại hoặc nộp bài.",
  HardwareReview: "Render thông tin task/answer chẩn đoán và highlight component liên quan.",
  HardwareTaskEditor: "Render editor chọn component hỏng và cập nhật hướng dẫn chẩn đoán kỳ vọng.",
  component: "Tạo định nghĩa equipment component với vị trí, kích thước và metadata chuẩn hóa.",
  link: "Tạo signal link giữa hai connector trong equipment block diagram.",
  normalizeEquipmentComponentIds: "Chuẩn hóa tập component id theo module để tương thích dữ liệu cũ.",
  normalizeHardwareDiagnosisTask: "Chuẩn hóa component đích trong hardware diagnosis task.",
  normalizeHardwareDiagnosisAnswer: "Chuẩn hóa component được chọn trong hardware diagnosis answer.",
  isHardwareDiagnosisTask: "Type guard kiểm tra cấu trúc task chẩn đoán phần cứng tại runtime.",
  isHardwareDiagnosisAnswer: "Type guard kiểm tra cấu trúc câu trả lời chẩn đoán phần cứng tại runtime.",
  validateEquipmentDiagrams: "Kiểm tra uniqueness, connector và signal link của toàn bộ equipment diagrams.",
  parsePmdtEvent: "Parse một PMDT event raw thành row trình bày đã chuẩn hóa.",
  presentPmdtResult: "Chuyển kết quả PMDT raw thành evidence có kiểu rõ ràng cho giao diện review.",
  parseRecordedAction: "Parse recorded action raw và loại bỏ cấu trúc không hợp lệ.",
  presentAdsbResult: "Chuyển kết quả ADS-B raw thành action/evidence dùng trong chấm thi.",
  createDmeSubmissionStore: "Tạo Zustand store bài nộp DME với local persistence và API synchronization."
};

function fileTags(file) {
  if (file.path.startsWith("tests/")) return ["kiểm-thử", "hồi-quy", file.path.includes("hardware") ? "hardware" : "dme", "typescript"];
  if (file.path.startsWith("src/app/")) return ["nextjs", "app-router", "dme", "review"];
  if (file.path.includes("/components/hardware/")) return ["react-component", "hardware-diagnosis", "equipment-diagram", "tương-tác"];
  if (file.path.includes("/components/exams/")) return ["react-component", "official-exam", "result-presentation", "grading"];
  if (file.path.includes("/components/dme/")) return ["react-component", "dme", "submission-review", "grading"];
  if (file.path.includes("hardware-model")) return ["hardware-model", "equipment-diagram", "signal-path", file.path.includes("dme") ? "dme" : "vor"];
  if (file.path.includes("equipment-diagram-types")) return ["type-definition", "type-guard", "equipment-diagram", "validation"];
  if (file.path.includes("compatibility")) return ["data-migration", "compatibility", "normalization", "hardware"];
  if (file.path.includes("result-presentation")) return ["result-presentation", "parsing", "validation", "official-exam"];
  if (file.path.includes("storage")) return ["lưu-trữ", "validation", "serialization", "dme"];
  return ["zustand", "quản-lý-trạng-thái", "dme", "đồng-bộ-dữ-liệu"];
}

function functionSummary(filePath, name) {
  if (exactFunctionSummaries[name]) return exactFunctionSummaries[name];
  const entity = filePath.includes("scenario-storage") ? "kịch bản DME" : filePath.includes("submission-storage") ? "bài nộp DME" : null;
  if (entity) {
    if (name.startsWith("is")) return `Type guard kiểm tra cấu trúc và ràng buộc runtime của ${entity}.`;
    if (name.startsWith("clone")) return `Tạo deep clone đã chuẩn hóa cho ${entity}.`;
    if (name.startsWith("serialize")) return `Xác thực và serialize danh sách ${entity} vào envelope có phiên bản.`;
    if (name.startsWith("deserialize")) return `Parse, kiểm tra phiên bản và khôi phục danh sách ${entity}.`;
    if (name.startsWith("mapRow")) return `Ánh xạ row database thành domain model ${entity} đã xác thực.`;
    if (name.includes("ToRow")) return `Chuyển domain model ${entity} thành row database.`;
    if (name.startsWith("save")) return `Lưu danh sách ${entity} vào storage adapter.`;
    if (name.startsWith("load")) return `Đọc và khôi phục danh sách ${entity} từ storage adapter.`;
  }
  return `Thực hiện logic ${name} trong workflow DME hoặc review kết quả.`;
}

function functionTags(filePath, name) {
  if (/^is|validate/.test(name)) return ["type-guard", "validation", "typescript", "runtime-safety"];
  if (/serialize|deserialize|clone|ToRow|mapRow|save|load|normalize/.test(name)) return ["serialization", "normalization", "chuyển-đổi-dữ-liệu", "dme"];
  if (/component|link/.test(name)) return ["factory", "hardware-model", "equipment-diagram", "signal-path"];
  if (/parse|present/.test(name)) return ["parsing", "result-presentation", "validation", "official-exam"];
  if (name.startsWith("createDme")) return ["factory", "zustand", "quản-lý-trạng-thái", "dme"];
  if (filePath.endsWith(".tsx")) return ["react-component", "tsx", "review", "workflow"];
  return ["logic-nghiệp-vụ", "typescript", "dme", "utility"];
}

function languageNotes(filePath) {
  if (filePath.startsWith("src/app/")) return "Tuân theo Next.js App Router với typed dynamic params và page component server-side gọn nhẹ.";
  if (filePath.includes("-storage.ts")) return "Custom type guards thu hẹp dữ liệu unknown trước khi chuyển thành domain type, bảo vệ ranh giới local storage và database.";
  if (filePath.endsWith("equipment-diagram-types.ts")) return "Dùng interface và type guard để liên kết diagram schema với task/answer chẩn đoán mà không cần ép kiểu không an toàn.";
  if (filePath.includes("hardware-model.ts")) return "Mô hình sơ đồ được khai báo dữ liệu-first bằng typed component/link factory, giúp kiểm tra cấu trúc tĩnh và render dùng chung.";
  if (filePath.includes("/stores/")) return "Zustand store dùng generic StoreApi/UseBoundStore và dependency injection cho storage, request, clock và id generator.";
  if (filePath.endsWith(".tsx") && !filePath.startsWith("tests/")) return "React function component viết bằng TSX với typed props và các nhánh render theo discriminated domain state.";
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
      summary: functionSummary(file.path, fn.name), tags: functionTags(file.path, fn.name),
      complexity: span < 50 ? "simple" : span <= 120 ? "moderate" : "complex" });
    edges.push({ source: `file:${file.path}`, target: id, type: "contains", direction: "forward", weight: 1.0 });
    if (exported.has(fn.name)) edges.push({ source: `file:${file.path}`, target: id, type: "exports", direction: "forward", weight: 0.8 });
  }
  for (const imported of batch.batchImportData[file.path] ?? []) {
    edges.push({ source: `file:${file.path}`, target: `file:${imported}`, type: "imports", direction: "forward", weight: 0.7 });
    if (file.path.startsWith("tests/") && batchPaths.has(imported) && !imported.startsWith("tests/")) {
      edges.push({ source: `file:${imported}`, target: `file:${file.path}`, type: "tested_by", direction: "forward", weight: 0.5 });
    }
  }
}

const renderedChildren = {
  "src/components/dme/admin/dme-submission-review.tsx": ["src/components/hardware/hardware-review.tsx"],
  "src/components/exams/official-exam-review.tsx": ["src/components/exams/candidate-result-editor.tsx", "src/components/grading/step-diff.tsx", "src/components/hardware/hardware-review.tsx"],
  "src/components/hardware/hardware-diagnosis-step.tsx": ["src/components/hardware/equipment-block-diagram.tsx"],
  "src/components/hardware/hardware-task-editor.tsx": ["src/components/hardware/equipment-block-diagram.tsx"]
};
for (const [source, targets] of Object.entries(renderedChildren)) {
  for (const target of targets) edges.push({ source: `file:${source}`, target: `file:${target}`, type: "contains", direction: "forward", weight: 1.0 });
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
  fs.writeFileSync(path.join(ua, "intermediate", `batch-12-part-${i + 1}.json`), `${JSON.stringify({ nodes: partNodes, edges: partEdges }, null, 2)}\n`);
}
console.log(JSON.stringify({ partCount, nodeCount: nodes.length, edgeCount: edges.length, expectedImports, actualImports, files: batch.files.length, skipped: extraction.filesSkipped }));
