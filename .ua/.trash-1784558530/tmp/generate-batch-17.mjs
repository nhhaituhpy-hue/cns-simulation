import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/nhhai/Desktop/cns-simulator";
const ua = path.join(root, ".ua");
const batchesDoc = JSON.parse(fs.readFileSync(path.join(ua, "intermediate/batches.json"), "utf8"));
const batch = (Array.isArray(batchesDoc) ? batchesDoc : batchesDoc.batches).find((item) => item.batchIndex === 17);
const extraction = JSON.parse(fs.readFileSync(path.join(ua, "tmp/ua-file-extract-results-17.json"), "utf8"));
if (!batch || !extraction.scriptCompleted || extraction.filesAnalyzed + extraction.filesSkipped.length !== batch.files.length) throw new Error("Batch 17 hoặc extraction không đầy đủ.");

const fileInfo = {
  ".node-version": ["Ghim phiên bản Node.js 20.18.0 cho môi trường phát triển và công cụ quản lý runtime.", ["configuration", "nodejs", "runtime-version"], "file", "simple"],
  ".ua/.understandignore": ["Cấu hình loại trừ của Understand Anything với các pattern gợi ý từ .gitignore, thư mục phát hiện và nhiều quy ước tên file test; hiện các rule đều ở dạng comment.", ["configuration", "understand-anything", "ignore-patterns", "analysis-scope"], "config", "moderate"],
  ".ua/config.json": ["Cấu hình dự án Understand Anything yêu cầu sinh nội dung knowledge graph bằng tiếng Việt.", ["configuration", "understand-anything", "localization"], "config", "simple"],
  "eslint.config.mjs": ["ESLint flat config cho Next.js/TypeScript, áp dụng Core Web Vitals và cấm barrel imports Phosphor Icons để hạn chế cache Turbopack phình lớn.", ["configuration", "eslint", "typescript", "code-quality", "performance"], "file", "simple"],
  "next.config.ts": ["Next.js config tắt header nhận diện framework và đặt Turbopack root theo thư mục chứa config.", ["configuration", "nextjs", "turbopack", "build-system"], "file", "simple"],
  "playwright.config.ts": ["Playwright config chạy E2E tuần tự trên Desktop Chrome và Pixel 7, tự khởi động dev server cổng 3100, thu trace khi retry và screenshot khi lỗi.", ["configuration", "playwright", "e2e", "test", "browser-automation"], "file", "simple"],
  "postcss.config.mjs": ["PostCSS config tối giản kích hoạt plugin Tailwind CSS cho quá trình build stylesheet.", ["configuration", "postcss", "tailwind-css", "build-system"], "file", "simple"],
  "public/images/auth-cns-background.webp": ["Ảnh nền WebP tông xanh cho màn hình xác thực, kết hợp radar, máy bay, anten và mạng liên kết trong bối cảnh CNS.", ["image-asset", "authentication", "cns", "webp"], "file", "simple"],
  "public/images/cns-image.webp": ["Ảnh WebP khổ ngang về máy bay cất cánh cạnh đài dẫn đường và tháp kiểm soát, dùng làm hình minh họa chủ đề CNS.", ["image-asset", "aviation", "cns", "webp"], "file", "simple"],
  "scripts/generate-guidance-media.mjs": ["Script tự động hóa Playwright và FFmpeg để chụp luồng hướng dẫn giám khảo/thí sinh, dựng storyboard, video, thumbnail và voice script cho media đào tạo.", ["script", "browser-automation", "media-generation", "playwright", "ffmpeg"], "file", "complex"],
  "scripts/upload-training-media.mjs": ["Script ESM kiểm tra và tải bộ video/WebP/MP3 hướng dẫn lên Supabase Storage, từ chối ghi đè khác kích thước và xác minh đủ asset sau upload.", ["script", "supabase", "media-upload", "validation", "storage"], "file", "moderate"],
  "src/app/admin/page.tsx": ["Route gốc quản trị khai báo metadata và chuyển hướng người dùng sang danh sách kỳ thi.", ["nextjs-route", "admin", "redirect", "entry-point"], "file", "simple"],
  "src/app/globals.css": ["Stylesheet toàn cục nhập Tailwind, định nghĩa design tokens sáng, typography, glass/sidebar/terminal surfaces và accessibility fallbacks cho motion/transparency.", ["stylesheet", "design-tokens", "tailwind-css", "accessibility", "responsive-design"], "file", "moderate"],
  "src/app/student/page.tsx": ["Route gốc học viên chuyển hướng trực tiếp sang danh sách kỳ thi được phân công.", ["nextjs-route", "student", "redirect", "entry-point"], "file", "simple"],
  "src/lib/supabase/client.ts": ["Factory Supabase browser client, kiểm tra public URL/publishable key trước khi tạo client dùng trong Client Components.", ["factory", "supabase", "browser-client", "validation"], "file", "simple"],
  "src/lib/supabase/proxy.ts": ["Helper phía server làm mới auth session Supabase, đồng bộ cookie request/response và trả về claims hiện tại cho proxy bảo vệ route.", ["authentication", "supabase", "middleware", "session-management", "cookies"], "file", "simple"],
  "src/proxy.ts": ["Next.js proxy bảo vệ page routes bằng Supabase claims, chuyển người chưa đăng nhập về login và người đã đăng nhập rời login, đồng thời bảo toàn cookie làm mới.", ["middleware", "authentication", "route-guard", "supabase", "redirect"], "file", "simple"],
  "supabase/config.toml": ["Cấu hình Supabase local stack gồm API, Postgres, migrations/seed, Realtime, Studio, Storage, Auth, OAuth, email, Edge Runtime, analytics và các giới hạn bảo mật.", ["configuration", "supabase", "local-development", "database", "authentication"], "config", "complex"],
  "tests/e2e/app.spec.ts": ["Playwright E2E suite kiểm tra các luồng ứng dụng chính trên desktop/mobile, gồm xác thực, điều hướng, quản lý và trải nghiệm học viên.", ["test", "e2e", "playwright", "browser-automation", "user-flow"], "file", "moderate"],
  "tests/mocks/server-only.ts": ["Module mock rỗng thay thế package server-only trong môi trường unit test phía client/jsdom.", ["test", "mock", "server-only", "compatibility"], "file", "simple"],
  "tests/setup.ts": ["Thiết lập Vitest mở rộng jest-dom và xóa localStorage/sessionStorage sau mỗi test để tránh rò rỉ state.", ["test", "setup", "vitest", "test-isolation"], "file", "simple"],
  "vitest.config.mts": ["Vitest config dùng React plugin và jsdom, alias server-only sang mock, nạp setup chung, giới hạn test pattern và thu V8 coverage cho lib/store.", ["configuration", "vitest", "unit-test", "coverage", "jsdom"], "file", "simple"],
};

const functionInfo = {
  waitForServer: ["Poll endpoint cho tới khi dev server phản hồi thành công hoặc hết timeout.", ["utility", "async", "health-check"]],
  addOverlay: ["Chèn overlay hướng dẫn vào trang Playwright với tiêu đề, mô tả và điểm nhấn thao tác.", ["browser-automation", "overlay", "dom", "guidance"]],
  captureGroup: ["Điều phối chụp một nhóm bước hướng dẫn và ghi metadata clip tương ứng.", ["browser-automation", "media-capture", "orchestration"]],
  captureExamSetGuide: ["Tự động hóa luồng tạo bộ đề của giám khảo để thu các cảnh hướng dẫn.", ["browser-automation", "exam-set", "guidance"]],
  captureExamGuide: ["Tự động hóa luồng tạo kỳ thi và quản lý thí sinh để thu hướng dẫn.", ["browser-automation", "exam", "guidance"]],
  captureVorDmeGuide: ["Thu chuỗi thao tác biên soạn kịch bản VOR/DME trên giao diện PMDT.", ["browser-automation", "vor", "dme", "guidance"]],
  captureAdsbGuide: ["Thu chuỗi thao tác biên soạn và chạy kịch bản ADS-B.", ["browser-automation", "ads-b", "guidance"]],
  capturePracticeGuide: ["Thu hướng dẫn học viên chọn module và chạy bài luyện tập.", ["browser-automation", "student", "practice", "guidance"]],
  captureStudentExamGuide: ["Thu hướng dẫn học viên vào kỳ thi và bắt đầu attempt chính thức.", ["browser-automation", "student", "exam", "guidance"]],
  compileClip: ["Dựng clip hướng dẫn từ ảnh chụp và storyboard bằng FFmpeg, đồng thời tạo thumbnail.", ["media-generation", "ffmpeg", "video", "storyboard"]],
  writeVoiceScript: ["Sinh voice script theo từng cảnh để phục vụ thuyết minh media đào tạo.", ["media-generation", "voice-over", "guidance"]],
  AdminPage: ["Chuyển hướng route quản trị gốc sang `/admin/exams`.", ["component", "nextjs-route", "redirect"]],
  StudentPage: ["Chuyển hướng route học viên gốc sang `/student/exams`.", ["component", "nextjs-route", "redirect"]],
  createClient: ["Kiểm tra biến môi trường và tạo Supabase browser client cho frontend.", ["factory", "supabase", "browser-client", "validation"]],
  refreshAuthSession: ["Tạo Supabase server client, đồng bộ cookie và lấy claims mới nhất cho request.", ["authentication", "supabase", "session-management", "cookies"]],
  proxy: ["Áp dụng route guard dựa trên claims và trả redirect có cookie làm mới khi trạng thái đăng nhập không phù hợp.", ["middleware", "authentication", "route-guard", "redirect"]],
};

const notes = {
  "eslint.config.mjs": "ES Module flat config dùng spread các preset Next.js và `globalIgnores`; rule tùy chỉnh kiểm soát import path thay vì runtime behavior.",
  "playwright.config.ts": "Type guard trong `Object.entries(...).filter` thu hẹp tuple thành `[string, string]`, giúp truyền environment type-safe cho webServer.",
  "src/app/globals.css": "CSS custom properties tạo design token tập trung; media queries `prefers-reduced-*` giảm hiệu ứng cho người dùng có nhu cầu accessibility.",
  "vitest.config.mts": "Đuôi `.mts` buộc ESM semantics; alias dùng `import.meta.url` và `fileURLToPath` để resolve mock ổn định đa nền tảng.",
};

const resultByPath = new Map(extraction.results.map((item) => [item.path, item]));
const skipped = new Set(extraction.filesSkipped);
const nodes = [];
const edges = [];
const emitted = new Set();

for (const file of batch.files) {
  const info = resultByPath.get(file.path);
  if (!info && !skipped.has(file.path)) throw new Error(`Không có outcome cho ${file.path}`);
  const detail = fileInfo[file.path];
  if (!detail) throw new Error(`Thiếu metadata file ${file.path}`);
  const [summary, tags, nodeType, complexity] = detail;
  const prefix = nodeType === "config" ? "config" : "file";
  const fileNode = { id: `${prefix}:${file.path}`, type: nodeType, name: path.posix.basename(file.path), filePath: file.path, summary, tags, complexity };
  if (notes[file.path]) fileNode.languageNotes = notes[file.path];
  nodes.push(fileNode);
  emitted.add(fileNode.id);
  if (!info) continue;
  const exported = new Set((info.exports ?? []).map((item) => item.name));
  for (const fn of info.functions ?? []) {
    if (!fn.name || !Number.isInteger(fn.startLine) || !Number.isInteger(fn.endLine)) continue;
    const lines = fn.endLine - fn.startLine + 1;
    if (lines < 10 && !exported.has(fn.name)) continue;
    const semantic = functionInfo[fn.name];
    if (!semantic) throw new Error(`Thiếu metadata function ${file.path}:${fn.name}`);
    const id = `function:${file.path}:${fn.name}`;
    nodes.push({ id, type: "function", name: fn.name, filePath: file.path, lineRange: [fn.startLine, fn.endLine], summary: semantic[0], tags: semantic[1], complexity: lines > 200 ? "complex" : lines >= 50 ? "moderate" : "simple" });
    emitted.add(id);
    edges.push({ source: fileNode.id, target: id, type: "contains", direction: "forward", weight: 1.0 });
    if (exported.has(fn.name)) edges.push({ source: fileNode.id, target: id, type: "exports", direction: "forward", weight: 0.8 });
  }
}

// Import data đã được scanner resolve; batch này có đúng một import nội bộ.
for (const file of batch.files) for (const target of batch.batchImportData[file.path] ?? []) edges.push({ source: `file:${file.path}`, target: `file:${target}`, type: "imports", direction: "forward", weight: 0.7 });

// Call graph nội file cho các helper media đủ điều kiện phát node.
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

// Quan hệ semantic chỉ dùng target có node hiện hữu hoặc neighbor đã xác minh.
edges.push(
  { source: "config:supabase/config.toml", target: "file:src/lib/supabase/client.ts", type: "configures", direction: "forward", weight: 0.6 },
  { source: "config:supabase/config.toml", target: "file:src/lib/supabase/proxy.ts", type: "configures", direction: "forward", weight: 0.6 },
  { source: "file:src/app/globals.css", target: "file:src/app/layout.tsx", type: "related", direction: "forward", weight: 0.5 },
  { source: "file:playwright.config.ts", target: "file:tests/e2e/app.spec.ts", type: "depends_on", direction: "forward", weight: 0.6 },
  { source: "file:vitest.config.mts", target: "file:tests/setup.ts", type: "depends_on", direction: "forward", weight: 0.6 },
  { source: "file:vitest.config.mts", target: "file:tests/mocks/server-only.ts", type: "depends_on", direction: "forward", weight: 0.6 },
  { source: "function:src/proxy.ts:proxy", target: "function:src/lib/supabase/proxy.ts:refreshAuthSession", type: "calls", direction: "forward", weight: 0.8 }
);

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
    const fileMatch = edge.target.match(/^file:(.+)$/);
    const targetKnown = sourceIds.has(edge.target) || emitted.has(edge.target) || (fileMatch && knownFiles.has(fileMatch[1]));
    if (!targetKnown) throw new Error(`Part ${index + 1}: target không hợp lệ ${edge.target}`);
  }
  const outputPath = partCount === 1 ? path.join(ua, "intermediate/batch-17.json") : path.join(ua, `intermediate/batch-17-part-${index + 1}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify({ nodes: partNodes, edges: partEdges }, null, 2)}\n`, "utf8");
  JSON.parse(fs.readFileSync(outputPath, "utf8"));
  written.push({ outputPath, nodes: partNodes.length, edges: partEdges.length });
}
console.log(JSON.stringify({ nodeCount: nodes.length, edgeCount: edges.length, importExpected, importActual, partCount, skipped: [...skipped], written }, null, 2));
