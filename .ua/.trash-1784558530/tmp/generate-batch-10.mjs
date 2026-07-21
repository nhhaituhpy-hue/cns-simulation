import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/nhhai/Desktop/cns-simulator";
const ua = path.join(root, ".ua");
const batchesDoc = JSON.parse(fs.readFileSync(path.join(ua, "intermediate/batches.json"), "utf8"));
const batch = (Array.isArray(batchesDoc) ? batchesDoc : batchesDoc.batches).find((item) => item.batchIndex === 10);
const extraction = JSON.parse(fs.readFileSync(path.join(ua, "tmp/ua-file-extract-results-10.json"), "utf8"));
if (!batch || !extraction.scriptCompleted || extraction.filesAnalyzed !== batch.files.length) throw new Error("Batch 10 hoặc extraction không đầy đủ.");

const fileInfo = {
  "src/app/admin/exam-sets/[examSetId]/edit/page.tsx": ["Route chỉnh sửa bộ đề: tải song song chi tiết bộ đề, danh sách môn và kịch bản khả dụng rồi chuẩn bị dữ liệu cho ExamSetEditor.", ["nextjs-route", "admin", "exam-set", "data-fetching", "editor"]],
  "src/app/admin/exam-sets/error.tsx": ["Error boundary phía client cho khu vực quản lý bộ đề, chuyển lỗi route sang component phản hồi dùng chung.", ["nextjs-route", "error-boundary", "exam-set", "component"]],
  "src/app/admin/exam-sets/new/page.tsx": ["Route tạo bộ đề mới, tải danh sách môn/kịch bản và khởi tạo ExamSetEditor không có dữ liệu ban đầu.", ["nextjs-route", "admin", "exam-set", "editor"]],
  "src/app/admin/exam-sets/page.tsx": ["Route danh sách bộ đề quản trị, tải dữ liệu và render workspace cùng ExamSetList.", ["nextjs-route", "admin", "exam-set", "data-fetching"]],
  "src/app/admin/exams/[examId]/edit/page.tsx": ["Route chỉnh sửa kỳ thi, tải chi tiết kỳ thi và các bộ đề để cấu hình ExamEditor.", ["nextjs-route", "admin", "exam", "editor"]],
  "src/app/admin/exams/[examId]/page.tsx": ["Route chi tiết kỳ thi quản trị, tải dữ liệu phân trang và trình bày môn, đề, thí sinh cùng ExamDetailManager.", ["nextjs-route", "admin", "exam", "candidate-management", "data-fetching"]],
  "src/app/admin/exams/[examId]/results/[candidateSubjectId]/page.tsx": ["Route xem/chấm kết quả chính thức của một môn thi thí sinh, chuyển dữ liệu route vào ExamReview.", ["nextjs-route", "admin", "exam-results", "review"]],
  "src/app/admin/exams/error.tsx": ["Error boundary phía client cho khu vực quản lý kỳ thi, dùng ActionFeedback để cung cấp lỗi và thao tác thử lại.", ["nextjs-route", "error-boundary", "exam", "component"]],
  "src/app/admin/exams/new/page.tsx": ["Route tạo kỳ thi mới, tải các bộ đề sẵn sàng và khởi tạo ExamEditor.", ["nextjs-route", "admin", "exam", "editor"]],
  "src/app/admin/exams/page.tsx": ["Route danh sách kỳ thi quản trị, tải dữ liệu và render ExamList trong workspace chuẩn.", ["nextjs-route", "admin", "exam", "data-fetching"]],
  "src/app/admin/media-capture/page.tsx": ["Trang media capture dành cho giảng viên, xác thực token/session và dựng ngữ cảnh kỳ thi, môn, kịch bản để ghi hình/âm thanh.", ["nextjs-route", "admin", "media-capture", "exam", "authentication"]],
  "src/app/student/exams/[examId]/page.tsx": ["Route chi tiết kỳ thi của học viên, tải kỳ thi được phân công và hiển thị danh sách môn cùng trạng thái làm bài.", ["nextjs-route", "student", "exam", "data-fetching"]],
  "src/app/student/exams/[examId]/subjects/[candidateSubjectId]/page.tsx": ["Route môn thi của học viên, tải candidate subject và render workspace danh sách kịch bản/attempt.", ["nextjs-route", "student", "exam-subject", "scenario-list"]],
  "src/app/student/exams/[examId]/subjects/[candidateSubjectId]/scenarios/[attemptItemId]/page.tsx": ["Route chạy một kịch bản thi chính thức, tải attempt context và chọn trình mô phỏng phù hợp module CNS.", ["nextjs-route", "student", "exam-attempt", "simulation", "module-routing"]],
  "src/app/student/exams/[examId]/subjects/[candidateSubjectId]/scenarios/[attemptItemId]/terminal/page.tsx": ["Route terminal cho attempt chính thức, tải ngữ cảnh thi và khởi chạy TerminalSession ở chế độ được giám sát.", ["nextjs-route", "student", "terminal", "exam-attempt"]],
  "src/app/student/exams/error.tsx": ["Error boundary phía client cho khu vực thi của học viên, hiển thị phản hồi và cho phép thử lại route.", ["nextjs-route", "error-boundary", "student", "exam"]],
  "src/app/student/exams/page.tsx": ["Route danh sách kỳ thi của học viên, tải các bài thi được phân công và render workspace tương ứng.", ["nextjs-route", "student", "exam", "data-fetching"]],
  "src/app/student/media-capture/page.tsx": ["Trang media capture cho học viên, xác thực token và dựng thông tin attempt để ghi nhận media trong phiên thi.", ["nextjs-route", "student", "media-capture", "exam", "authentication"]],
  "src/components/exams/action-feedback.tsx": ["Component phản hồi thao tác chuẩn hóa cách hiển thị thông báo thành công hoặc lỗi trong các form quản lý thi.", ["component", "feedback", "error-handling", "accessibility"]],
  "src/components/exams/candidate-result-editor.tsx": ["Form client cho giảng viên nhập điểm và nhận xét của một candidate subject rồi gọi server action và refresh kết quả.", ["component", "form", "exam-results", "validation", "server-action"]],
  "src/components/exams/exam-detail-manager.tsx": ["Giao diện quản trị chi tiết kỳ thi với CRUD thí sinh, phân công môn, điều khiển trạng thái và danh sách kết quả có phân trang.", ["component", "exam", "candidate-management", "form", "server-action"]],
  "src/components/exams/exam-editor.tsx": ["Form tạo/chỉnh sửa kỳ thi, validate tên, ngày, quyết định, địa điểm và bộ đề trước khi gọi server action.", ["component", "exam", "editor", "validation", "server-action"]],
  "src/components/exams/exam-list.tsx": ["Danh sách kỳ thi có tìm kiếm tiếng Việt không dấu và action chuyển trạng thái hoặc lưu trữ, kèm phản hồi bất đồng bộ.", ["component", "exam", "search", "state-transition", "server-action"]],
};

const functionInfo = {
  EditExamSetPage: ["Tải dữ liệu liên quan, kiểm tra bộ đề tồn tại và render editor với cấu trúc môn/kịch bản hiện hành.", ["component", "nextjs-route", "exam-set", "data-fetching"]],
  Error: ["Chuyển lỗi route và callback reset sang giao diện phản hồi lỗi dùng chung.", ["component", "error-boundary", "error-handling"]],
  NewExamSetPage: ["Tải tùy chọn môn/kịch bản và render editor tạo bộ đề mới.", ["component", "nextjs-route", "exam-set"]],
  ExamSetsPage: ["Tải và render danh sách bộ đề trong workspace quản trị.", ["component", "nextjs-route", "exam-set"]],
  EditExamPage: ["Tải kỳ thi cùng các bộ đề khả dụng và render ExamEditor ở chế độ chỉnh sửa.", ["component", "nextjs-route", "exam", "data-fetching"]],
  ExamDetailPage: ["Tải chi tiết kỳ thi theo trang, chuẩn hóa ngày và render thông tin môn/thí sinh cho trình quản lý.", ["component", "nextjs-route", "exam", "candidate-management"]],
  OfficialExamReviewPage: ["Render màn hình review kết quả chính thức theo candidate subject từ route params.", ["component", "nextjs-route", "exam-results"]],
  NewExamPage: ["Tải bộ đề sẵn sàng và render form tạo kỳ thi.", ["component", "nextjs-route", "exam"]],
  ExamsPage: ["Tải và render danh sách kỳ thi cho quản trị viên.", ["component", "nextjs-route", "exam"]],
  AdminMediaCapturePage: ["Xác thực thông tin media capture của giảng viên và render recorder với ngữ cảnh kỳ thi đầy đủ.", ["component", "nextjs-route", "media-capture", "authentication"]],
  StudentExamDetailPage: ["Tải kỳ thi được phân công và render chi tiết cùng trạng thái từng môn cho học viên.", ["component", "nextjs-route", "student", "exam"]],
  StudentSubjectPage: ["Tải candidate subject và render danh sách attempt kịch bản của môn thi.", ["component", "nextjs-route", "student", "exam-subject"]],
  OfficialExamScenarioPage: ["Tải attempt context và điều phối sang simulator VOR, DME hoặc ADS-B tương ứng.", ["component", "nextjs-route", "simulation", "module-routing"]],
  OfficialExamTerminalPage: ["Tải attempt context và render terminal session chính thức của bài thi.", ["component", "nextjs-route", "terminal", "exam-attempt"]],
  StudentExamsPage: ["Tải và render danh sách kỳ thi được gán cho học viên.", ["component", "nextjs-route", "student", "exam"]],
  StudentMediaCapturePage: ["Xác thực token học viên và render media recorder gắn với attempt hiện tại.", ["component", "nextjs-route", "media-capture", "authentication"]],
  ActionFeedback: ["Render thông báo success/error có semantic styling và nội dung dễ truy cập.", ["component", "feedback", "accessibility"]],
  CandidateResultEditor: ["Validate điểm/nhận xét, gửi server action trong transition và refresh dữ liệu sau khi lưu.", ["component", "form", "exam-results", "validation"]],
  candidateToDraft: ["Chuyển candidate hiện hữu thành draft chỉnh sửa, chuẩn hóa username và cấp key ổn định cho các môn.", ["utility", "normalization", "candidate", "form-state"]],
  CandidateForm: ["Quản lý draft thí sinh, validate trường và phân công môn rồi gọi server action để thêm hoặc cập nhật.", ["component", "form", "candidate-management", "validation"]],
  ExamDetailManager: ["Điều phối danh sách, form và action quản trị thí sinh/kỳ thi, bao gồm phân trang và thay đổi trạng thái.", ["component", "exam", "candidate-management", "state-transition"]],
  ExamEditor: ["Quản lý state form kỳ thi, validate dữ liệu và lưu qua server action trước khi điều hướng.", ["component", "form", "exam", "validation"]],
  ExamList: ["Lọc danh sách kỳ thi theo truy vấn đã chuẩn hóa và xử lý action status/archive có xác nhận.", ["component", "exam", "search", "state-transition"]],
};

function complexity(lines) { return lines > 200 ? "complex" : lines >= 50 ? "moderate" : "simple"; }
const notes = {
  "src/components/exams/exam-detail-manager.tsx": "TSX dùng draft types và immutable array updates để quản lý form thí sinh/môn; `useTransition` tách trạng thái pending của server actions khỏi input state.",
  "src/components/exams/exam-list.tsx": "Hàm normalize dùng Unicode NFD và locale vi-VN để tìm kiếm không dấu, còn union status điều khiển các transition hợp lệ của kỳ thi.",
};

const byPath = new Map(extraction.results.map((item) => [item.path, item]));
const nodes = [];
const edges = [];
const emitted = new Set();
for (const file of batch.files) {
  const info = byPath.get(file.path);
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
  const outputPath = partCount === 1 ? path.join(ua, "intermediate/batch-10.json") : path.join(ua, `intermediate/batch-10-part-${index + 1}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify({ nodes: partNodes, edges: partEdges }, null, 2)}\n`, "utf8");
  JSON.parse(fs.readFileSync(outputPath, "utf8"));
  written.push({ outputPath, nodes: partNodes.length, edges: partEdges.length });
}
console.log(JSON.stringify({ nodeCount: nodes.length, edgeCount: edges.length, importExpected, importActual, partCount, written }, null, 2));
