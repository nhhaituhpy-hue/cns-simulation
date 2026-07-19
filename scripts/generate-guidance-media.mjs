import { execFileSync, spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";
import { chromium } from "playwright";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const outputDirectory = join(projectRoot, "public", "media");
const sourceDirectory = join(outputDirectory, "sources");
const renderDirectory = join(projectRoot, ".media-capture-render");
const baseUrl = "http://127.0.0.1:3210";
const viewport = { width: 1920, height: 1080 };

const vorScenario = {
  id: "capture-vor-monitor",
  title: "Cảnh báo giám sát Integral VOR",
  description: "Kiểm tra trạng thái monitor và xác định nguyên nhân cảnh báo.",
  difficulty: "medium",
  prompt: "Mở PMDT, kiểm tra monitor Integral và ghi kết luận xử lý.",
  createdAt: "2026-07-19T00:00:00.000Z",
  overrides: [{ fieldId: "monitorIntegral.bypass", value: true, status: "yellow" }],
  expectedCheckpoints: [{
    id: "capture-vor-checkpoint",
    order: 1,
    viewId: "monitor-integral",
    menuPath: ["Monitors", "Data", "Integral"],
    title: "Integral Monitor",
    guidance: "Kiểm tra trạng thái Integral Monitor.",
    required: true,
    points: 20,
  }],
};

const dmeScenario = {
  id: "capture-dme-delay",
  title: "Sai lệch propagation delay DME",
  description: "Kiểm tra dữ liệu RTC và giới hạn monitor.",
  difficulty: "medium",
  prompt: "Xác định nguyên nhân sai lệch propagation delay và hướng xử lý.",
  createdAt: "2026-07-19T00:00:00.000Z",
  overrides: [{ fieldId: "delayControl.rtc1.propagationDelay", value: 10.5, status: "alarm" }],
  expectedCheckpoints: [{
    id: "capture-dme-checkpoint",
    order: 1,
    viewId: "tx-rtc-data",
    menuPath: ["Transmitters", "Data", "RTC Data"],
    title: "RTC Data",
    guidance: "Kiểm tra delay control.",
    required: true,
    points: 20,
  }],
};

const clips = [];

function createClip(slug, title, audience) {
  const clip = { slug, title, audience, frames: [], screenCount: 0 };
  clips.push(clip);
  return clip;
}

function safeTimestamp(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function waitForServer(server) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 120_000) {
    if (server.exitCode !== null) throw new Error("Next.js media capture server stopped before becoming ready.");
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status > 0) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  throw new Error("Timed out waiting for the media capture server.");
}

async function waitForPage(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => {
    const transition = document.querySelector("#main-content > div");
    return !transition || getComputedStyle(transition).opacity === "1";
  }, { timeout: 20_000 });
  await page.waitForTimeout(350);
}

async function navigate(page, path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
  await waitForPage(page);
}

async function removeOverlay(page) {
  await page.evaluate(() => document.querySelector("#media-guide-overlay")?.remove());
}

async function addOverlay(page, locator, instruction, screenIndex, actionIndex, actionCount) {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Không thể xác định vị trí phần tử: ${instruction}`);
  await page.evaluate(({ boxValue, text, screen, action, total }) => {
    document.querySelector("#media-guide-overlay")?.remove();
    const root = document.createElement("div");
    root.id = "media-guide-overlay";
    root.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:Segoe UI,Arial,sans-serif";
    const highlight = document.createElement("div");
    highlight.style.cssText = [
      "position:fixed",
      `left:${Math.max(3, boxValue.x - 7)}px`,
      `top:${Math.max(3, boxValue.y - 7)}px`,
      `width:${Math.max(26, boxValue.width + 14)}px`,
      `height:${Math.max(26, boxValue.height + 14)}px`,
      "border:4px solid #ef4444",
      "border-radius:10px",
      "box-shadow:0 0 0 7px rgba(239,68,68,.22),0 8px 28px rgba(15,23,42,.32)",
      "background:rgba(255,255,255,.04)",
    ].join(";");
    const banner = document.createElement("div");
    const placeAtTop = boxValue.y > window.innerHeight * 0.63;
    banner.style.cssText = [
      "position:fixed",
      "left:205px",
      placeAtTop ? "top:96px" : "bottom:22px",
      "max-width:1180px",
      "display:flex",
      "align-items:center",
      "gap:16px",
      "padding:14px 20px",
      "border:1px solid #38bdf8",
      "border-left:7px solid #0ea5e9",
      "border-radius:12px",
      "background:rgba(7,20,34,.96)",
      "color:white",
      "box-shadow:0 16px 42px rgba(15,23,42,.35)",
    ].join(";");
    const badge = document.createElement("span");
    badge.textContent = `MÀN HÌNH ${screen} · ${action}/${total}`;
    badge.style.cssText = "white-space:nowrap;color:#7dd3fc;font-size:13px;font-weight:800;letter-spacing:.08em";
    const label = document.createElement("span");
    label.textContent = text;
    label.style.cssText = "font-size:21px;font-weight:750;line-height:1.35";
    banner.append(badge, label);
    root.append(highlight, banner);
    document.body.append(root);
  }, { boxValue: box, text: instruction, screen: screenIndex, action: actionIndex, total: actionCount });
}

async function captureGroup(clip, page, screenName, actions) {
  clip.screenCount += 1;
  const duration = actions.length === 1 ? 5 : 2;
  for (let index = 0; index < actions.length; index += 1) {
    const action = actions[index];
    const locator = await action.target(page);
    await addOverlay(page, locator, action.instruction, clip.screenCount, index + 1, actions.length);
    const sequence = clip.frames.length + 1;
    const framePath = join(renderDirectory, clip.slug, `frame-${String(sequence).padStart(2, "0")}.png`);
    mkdirSync(dirname(framePath), { recursive: true });
    await page.screenshot({ path: framePath, type: "png", animations: "disabled" });
    clip.frames.push({
      framePath,
      instruction: action.instruction,
      voice: action.voice,
      screenName,
      duration,
    });
    await removeOverlay(page);
    if (action.after) {
      await action.after(page);
      await page.waitForTimeout(220);
    }
  }
}

function roleCookie(role) {
  return { name: "media-capture-role", value: role, url: baseUrl };
}

function labelControl(page, sectionId, labelText, selector) {
  return page.locator(`section[aria-labelledby="${sectionId}"] label`).filter({ hasText: labelText }).locator(selector).first();
}

async function captureExamSetGuide(page) {
  const clip = createClip("huong-dan-giam-khao-tao-de-thi", "Giám khảo tạo Đề thi", "Giám khảo");
  await navigate(page, "/admin/media-capture?screen=exam-set-list");
  await captureGroup(clip, page, "Danh sách bộ đề", [{
    target: (current) => current.getByRole("link", { name: "Tạo bộ đề thi" }),
    instruction: "Bấm Tạo bộ đề thi để mở biểu mẫu biên soạn.",
    voice: "Mở Tạo đề thi và bấm Tạo bộ đề thi.",
    after: async (current) => { await current.getByRole("link", { name: "Tạo bộ đề thi" }).click(); await waitForPage(current); },
  }]);
  await captureGroup(clip, page, "Thông tin bộ đề", [
    { target: (current) => current.locator("#exam-set-name"), instruction: "Nhập tên bộ đề thi.", voice: "Nhập tên bộ đề.", after: (current) => current.locator("#exam-set-name").fill("Bộ đề kiểm tra năng định CNS 2026") },
    { target: (current) => current.locator("#exam-set-description"), instruction: "Nhập mô tả hoặc phạm vi áp dụng.", voice: "Thêm mô tả áp dụng.", after: (current) => current.locator("#exam-set-description").fill("Áp dụng cho kỳ kiểm tra năng định CNS đợt 1 năm 2026.") },
    { target: (current) => current.locator("#exam-set-subject"), instruction: "Chọn môn thi cần đưa vào bộ đề.", voice: "Chọn môn thi.", after: (current) => current.locator("#exam-set-subject").selectOption("subject-vor-dme") },
    { target: (current) => current.getByRole("button", { name: "Thêm môn" }), instruction: "Bấm Thêm môn để tạo đề cho môn đã chọn.", voice: "Bấm Thêm môn.", after: (current) => current.getByRole("button", { name: "Thêm môn" }).click() },
  ]);
  await captureGroup(clip, page, "Cấu hình đề thi", [
    { target: (current) => current.getByLabel("Tên đề số 1"), instruction: "Đặt tên cho đề số 1.", voice: "Đặt tên đề.", after: (current) => current.getByLabel("Tên đề số 1").fill("Đề VOR/DME số 01") },
    { target: (current) => current.getByRole("button", { name: "Thêm kịch bản" }).first(), instruction: "Bấm Thêm kịch bản để tạo một dòng tình huống.", voice: "Thêm một kịch bản.", after: (current) => current.getByRole("button", { name: "Thêm kịch bản" }).first().click() },
    { target: (current) => current.getByLabel(/Kịch bản thứ 1/), instruction: "Chọn kịch bản VOR, DME hoặc ADS-B cho dòng này.", voice: "Chọn kịch bản phù hợp.", after: (current) => current.getByLabel(/Kịch bản thứ 1/).selectOption("vor:vor-monitor-alarm") },
    { target: (current) => current.getByRole("button", { name: "Lưu đề này" }), instruction: "Bấm Lưu đề này; lặp lại nếu cần thêm đề.", voice: "Lưu đề hiện tại." },
  ]);
  await captureGroup(clip, page, "Hoàn tất bộ đề", [{
    target: (current) => current.getByRole("button", { name: "Lưu bộ đề thi" }),
    instruction: "Sau khi mọi đề đã lưu, bấm Lưu bộ đề thi.",
    voice: "Cuối cùng, lưu toàn bộ bộ đề thi.",
  }]);
}

async function captureExamGuide(page) {
  const clip = createClip("huong-dan-giam-khao-tao-ky-thi", "Giám khảo tạo Kỳ thi", "Giám khảo");
  await navigate(page, "/admin/media-capture?screen=exam-list");
  await captureGroup(clip, page, "Danh sách kỳ thi", [{
    target: (current) => current.getByRole("link", { name: "Tạo kỳ thi" }),
    instruction: "Bấm Tạo kỳ thi để khai báo một kỳ thi mới.",
    voice: "Trong mục Kỳ thi, bấm Tạo kỳ thi.",
    after: async (current) => { await current.getByRole("link", { name: "Tạo kỳ thi" }).click(); await waitForPage(current); },
  }]);
  await captureGroup(clip, page, "Thông tin kỳ thi", [
    { target: (current) => current.locator("#exam-name"), instruction: "Nhập tên kỳ thi.", voice: "Nhập tên kỳ thi.", after: (current) => current.locator("#exam-name").fill("Kỳ kiểm tra năng định CNS đợt 1 năm 2026") },
    { target: (current) => current.locator("#exam-date"), instruction: "Chọn ngày thi.", voice: "Chọn ngày thi.", after: (current) => current.locator("#exam-date").fill("2026-08-20") },
    { target: (current) => current.locator("#exam-location"), instruction: "Chọn địa điểm hội đồng thi.", voice: "Chọn địa điểm.", after: (current) => current.locator("#exam-location").selectOption("da_nang") },
    { target: (current) => current.locator("#exam-decision"), instruction: "Nhập căn cứ hoặc số quyết định.", voice: "Nhập căn cứ tổ chức.", after: (current) => current.locator("#exam-decision").fill("Quyết định số 123/QĐ-ATTECH") },
    { target: (current) => current.locator("#exam-set"), instruction: "Chọn bộ đề đã ở trạng thái Sẵn sàng.", voice: "Chọn bộ đề sẵn sàng.", after: (current) => current.locator("#exam-set").selectOption("set-2026") },
    { target: (current) => current.getByRole("button", { name: "Tạo kỳ thi" }), instruction: "Kiểm tra thông tin rồi bấm Tạo kỳ thi.", voice: "Bấm Tạo kỳ thi.", after: (current) => navigate(current, "/admin/media-capture?screen=exam-detail") },
  ]);
  const examinerInputs = page.locator('input[aria-label^="Tên giám khảo"]');
  const examinerSelects = page.locator('select[aria-label^="Môn chấm thi"]');
  await captureGroup(clip, page, "Danh sách giám khảo", [
    { target: () => examinerInputs.nth(0), instruction: "Nhập tên giám khảo thứ nhất.", voice: "Nhập giám khảo một.", after: () => examinerInputs.nth(0).fill("Trần Minh Hải") },
    { target: () => examinerSelects.nth(0), instruction: "Chọn bộ môn chấm thi.", voice: "Chọn môn chấm.", after: () => examinerSelects.nth(0).selectOption("subject-vor-dme") },
    { target: () => examinerInputs.nth(1), instruction: "Nhập thêm giám khảo khi cần.", voice: "Nhập giám khảo hai.", after: () => examinerInputs.nth(1).fill("Lê Thu Hà") },
    { target: () => examinerSelects.nth(1), instruction: "Phân bộ môn cho từng giám khảo.", voice: "Phân môn tương ứng.", after: () => examinerSelects.nth(1).selectOption("subject-ads-b") },
    { target: (current) => current.getByRole("button", { name: "Lưu danh sách giám khảo" }), instruction: "Bấm Lưu danh sách giám khảo.", voice: "Lưu danh sách hội đồng." },
  ]);
  await captureGroup(clip, page, "Danh sách thí sinh", [{
    target: (current) => current.getByRole("button", { name: "Thêm thí sinh" }),
    instruction: "Bấm Thêm thí sinh để mở biểu mẫu phân đề.",
    voice: "Tiếp theo, bấm Thêm thí sinh.",
    after: (current) => current.getByRole("button", { name: "Thêm thí sinh" }).click(),
  }]);
  await captureGroup(clip, page, "Phân môn và đề", [
    { target: (current) => current.locator("#candidate-name"), instruction: "Nhập tên thí sinh.", voice: "Nhập họ tên.", after: (current) => current.locator("#candidate-name").fill("Nguyễn Văn An") },
    { target: (current) => current.locator("#candidate-unit"), instruction: "Nhập đơn vị công tác.", voice: "Nhập đơn vị.", after: (current) => current.locator("#candidate-unit").fill("Đài DVOR/DME Đà Nẵng") },
    { target: (current) => current.locator("#candidate-email"), instruction: "Nhập phần tên của email công vụ ATTECH.", voice: "Nhập email công vụ.", after: (current) => current.locator("#candidate-email").fill("nguyenvanan") },
    { target: (current) => current.getByRole("button", { name: "Thêm môn thi" }), instruction: "Bấm Thêm môn thi.", voice: "Thêm môn thi.", after: (current) => current.getByRole("button", { name: "Thêm môn thi" }).click() },
    { target: (current) => current.getByLabel("Đề thi"), instruction: "Chọn đề thi đã phân cho thí sinh.", voice: "Chọn đề được phân.", after: (current) => current.getByLabel("Đề thi").selectOption("paper-vd-02") },
    { target: (current) => current.getByRole("button", { name: "Lưu thí sinh" }), instruction: "Bấm Lưu thí sinh sau khi phân đủ môn và đề.", voice: "Lưu thí sinh." },
  ]);
}

async function captureVorDmeGuide(page) {
  const clip = createClip("huong-dan-giam-khao-kich-ban-vor-dme", "Giám khảo tạo Kịch bản VOR/DME", "Giám khảo");
  await navigate(page, "/admin/vor");
  await page.getByRole("heading", { name: /PMDT Simulator - DVOR/ }).waitFor({ timeout: 20_000 });
  await captureGroup(clip, page, "Danh sách kịch bản VOR", [{
    target: (current) => current.getByRole("link", { name: "Tạo kịch bản VOR" }).first(),
    instruction: "Trong tab VOR, bấm Tạo kịch bản VOR.",
    voice: "Chọn VOR và bấm Tạo kịch bản VOR.",
    after: async (current) => { await current.getByRole("link", { name: "Tạo kịch bản VOR" }).first().click(); await waitForPage(current); },
  }]);
  await captureGroup(clip, page, "Thông tin bài thực hành", [
    { target: (current) => labelControl(current, "vor-metadata-title", "Tiêu đề", "input"), instruction: "Nhập tiêu đề kịch bản.", voice: "Nhập tiêu đề.", after: (current) => labelControl(current, "vor-metadata-title", "Tiêu đề", "input").fill("Cảnh báo giám sát Integral VOR") },
    { target: (current) => labelControl(current, "vor-metadata-title", "Mô tả", "textarea"), instruction: "Mô tả dấu hiệu và mục tiêu đào tạo.", voice: "Nhập mô tả.", after: (current) => labelControl(current, "vor-metadata-title", "Mô tả", "textarea").fill("Monitor Integral xuất hiện trạng thái cảnh báo cần kiểm tra.") },
    { target: (current) => labelControl(current, "vor-metadata-title", "Đề bài", "textarea"), instruction: "Nhập yêu cầu dành cho thí sinh.", voice: "Nhập đề bài.", after: (current) => labelControl(current, "vor-metadata-title", "Đề bài", "textarea").fill("Kiểm tra PMDT, xác định nguyên nhân và đề xuất xử lý.") },
  ]);
  await captureGroup(clip, page, "Chọn màn hình PMDT", [
    { target: (current) => current.getByRole("button", { name: "Transmitters" }), instruction: "Mở menu Transmitters.", voice: "Mở Transmitters.", after: (current) => current.getByRole("button", { name: "Transmitters" }).click() },
    { target: (current) => current.getByRole("menuitem", { name: "Data", exact: true }), instruction: "Chọn Data để mở màn hình Transmitter Data cần kiểm tra.", voice: "Chọn Data để mở Transmitter Data.", after: (current) => current.getByRole("menuitem", { name: "Data", exact: true }).click() },
  ]);
  await captureGroup(clip, page, "Đáp án màn hình", [{
    target: (current) => current.getByRole("button", { name: "Thêm màn hình" }),
    instruction: "Bấm Thêm màn hình để ghi màn hình hiện tại vào đáp án chuẩn.",
    voice: "Thêm màn hình này vào các bước kiểm tra chuẩn.",
    after: (current) => current.getByRole("button", { name: "Thêm màn hình" }).click(),
  }]);
  await captureGroup(clip, page, "Giá trị và trạng thái sự cố", [
    { target: (current) => current.locator('[data-vor-field-id="monitorIntegral.bypass"]'), instruction: "Chọn trực tiếp trường cần tạo trạng thái sự cố.", voice: "Chọn trường sự cố.", after: (current) => current.locator('[data-vor-field-id="monitorIntegral.bypass"]').click() },
    { target: (current) => current.locator('section[aria-labelledby="vor-field-title"] input[type="checkbox"]'), instruction: "Đặt giá trị đích của trường.", voice: "Đặt giá trị đích.", after: (current) => current.locator('section[aria-labelledby="vor-field-title"] input[type="checkbox"]').check() },
    { target: (current) => current.locator('section[aria-labelledby="vor-field-title"] select').last(), instruction: "Chọn màu hoặc trạng thái cảnh báo.", voice: "Chọn trạng thái cảnh báo.", after: (current) => current.locator('section[aria-labelledby="vor-field-title"] select').last().selectOption("yellow") },
    { target: (current) => current.getByRole("button", { name: "Áp dụng" }), instruction: "Bấm Áp dụng để lưu giá trị ghi đè.", voice: "Bấm Áp dụng.", after: (current) => current.getByRole("button", { name: "Áp dụng" }).click() },
  ]);
  await captureGroup(clip, page, "Mở cấu hình phần cứng", [{
    target: (current) => current.getByRole("button", { name: "Cấu hình" }),
    instruction: "Nếu cần chẩn đoán phần cứng, bấm Cấu hình.",
    voice: "Mở cấu hình phần cứng khi kịch bản yêu cầu.",
    after: (current) => current.getByRole("button", { name: "Cấu hình" }).click(),
  }]);
  await captureGroup(clip, page, "Phần cứng sự cố", [
    { target: (current) => current.getByLabel(/Bật bước xác định phần cứng/), instruction: "Bật bước xác định phần cứng.", voice: "Bật bước phần cứng.", after: (current) => current.getByLabel(/Bật bước xác định phần cứng/).check() },
    { target: (current) => current.locator('section[aria-label="Sơ đồ khối thiết bị"] button[aria-pressed]').first(), instruction: "Chọn một hoặc nhiều block làm đáp án.", voice: "Chọn block sự cố.", after: (current) => current.locator('section[aria-label="Sơ đồ khối thiết bị"] button[aria-pressed]').first().click() },
    { target: (current) => current.getByRole("button", { name: "Đóng cấu hình phần cứng" }), instruction: "Đóng cửa sổ sau khi chọn đủ block.", voice: "Đóng cấu hình.", after: (current) => current.getByRole("button", { name: "Đóng cấu hình phần cứng" }).click() },
  ]);
  await captureGroup(clip, page, "Lưu kịch bản VOR", [{
    target: (current) => current.getByRole("button", { name: "Lưu", exact: true }),
    instruction: "Rà soát dữ liệu rồi bấm Lưu.",
    voice: "Kiểm tra toàn bộ rồi lưu kịch bản VOR.",
  }]);
  await navigate(page, "/admin/dme");
  await page.getByRole("heading", { name: /PMDT Simulator - DME/ }).waitFor({ timeout: 20_000 });
  await captureGroup(clip, page, "Danh sách kịch bản DME", [{
    target: (current) => current.getByRole("link", { name: "Tạo kịch bản DME" }).first(),
    instruction: "Với DME, mở tab DME và bấm Tạo kịch bản DME.",
    voice: "Với DME, bấm Tạo kịch bản DME.",
    after: async (current) => { await current.getByRole("link", { name: "Tạo kịch bản DME" }).first().click(); await waitForPage(current); },
  }]);
  await captureGroup(clip, page, "Trình biên soạn DME", [{
    target: (current) => current.locator('section[aria-labelledby="dme-metadata-title"]'),
    instruction: "Lặp lại quy trình: nhập nội dung, cấu hình PMDT, đáp án và phần cứng rồi Lưu.",
    voice: "Trình DME dùng cùng quy trình biên soạn như VOR.",
  }]);
}

async function captureAdsbGuide(page) {
  const clip = createClip("huong-dan-giam-khao-kich-ban-ads-b", "Giám khảo tạo Kịch bản ADS-B", "Giám khảo");
  await navigate(page, "/admin/ads-b");
  await page.getByRole("heading", { name: "Mô phỏng giám sát ADS-B" }).waitFor({ timeout: 20_000 });
  await captureGroup(clip, page, "Danh sách kịch bản ADS-B", [{
    target: (current) => current.getByRole("link", { name: /Tạo kịch bản ADS-B/ }).first(),
    instruction: "Trong tab ADS-B, bấm Tạo kịch bản ADS-B.",
    voice: "Mở ADS-B và bấm Tạo kịch bản ADS-B.",
    after: async (current) => { await current.getByRole("link", { name: /Tạo kịch bản ADS-B/ }).first().click(); await waitForPage(current); },
  }]);
  await captureGroup(clip, page, "Bước 1 - Thông tin", [
    { target: (current) => current.locator("#scenario-title"), instruction: "Nhập tiêu đề kịch bản.", voice: "Nhập tiêu đề.", after: (current) => current.locator("#scenario-title").fill("Mất đầu ra ADS-B CAT21") },
    { target: (current) => current.locator("#scenario-description"), instruction: "Mô tả tình huống và mục tiêu đào tạo.", voice: "Nhập mô tả.", after: (current) => current.locator("#scenario-description").fill("Cảm biến ADS-B mất đầu ra CAT21 và cần khôi phục theo quy trình.") },
    { target: (current) => current.locator('input[name="difficulty"][value="medium"]'), instruction: "Chọn mức độ phù hợp.", voice: "Chọn mức độ.", after: (current) => current.locator('input[name="difficulty"][value="medium"]').check() },
    { target: (current) => current.getByRole("button", { name: "Tiếp tục" }), instruction: "Bấm Tiếp tục sang cấu hình trạng thái.", voice: "Bấm Tiếp tục.", after: (current) => current.getByRole("button", { name: "Tiếp tục" }).click() },
  ]);
  await captureGroup(clip, page, "Bước 2 - Site và cảm biến", [
    { target: (current) => current.locator('input[name="target-sensor"]').first(), instruction: "Chọn cảm biến mục tiêu.", voice: "Chọn cảm biến mục tiêu.", after: (current) => current.locator('input[name="target-sensor"]').first().check() },
    { target: (current) => current.locator('select[id^="sensor-status-"]').first(), instruction: "Đặt trạng thái ban đầu của cảm biến.", voice: "Đặt trạng thái ban đầu.", after: (current) => current.locator('select[id^="sensor-status-"]').first().selectOption("yellow") },
    { target: (current) => current.getByRole("button", { name: "Tiếp tục" }), instruction: "Bấm Tiếp tục.", voice: "Tiếp tục.", after: (current) => current.getByRole("button", { name: "Tiếp tục" }).click() },
  ]);
  await captureGroup(clip, page, "Bước 3 - Vai trò đăng nhập", [
    { target: (current) => current.locator('input[name="target-login-user"][value="sysadmin"]'), instruction: "Chọn tài khoản terminal có quyền cấu hình CAT21.", voice: "Chọn vai trò Quản trị hệ thống.", after: (current) => current.locator('input[name="target-login-user"][value="sysadmin"]').check() },
    { target: (current) => current.getByRole("button", { name: "Tiếp tục" }), instruction: "Bấm Tiếp tục để ghi thao tác chuẩn.", voice: "Sang bước thao tác chuẩn.", after: (current) => current.getByRole("button", { name: "Tiếp tục" }).click() },
  ]);
  await captureGroup(clip, page, "Bước 4 - Thao tác chuẩn", [
    { target: (current) => current.getByRole("button", { name: /General Settings/ }), instruction: "Chọn chức năng đầu tiên trên cây menu.", voice: "Chọn General Settings.", after: (current) => current.getByRole("button", { name: /General Settings/ }).click() },
    { target: (current) => current.getByRole("button", { name: /Enable \/ Disable ADS-B Cat21/ }), instruction: "Chọn chức năng cần thao tác.", voice: "Chọn chức năng CAT21.", after: (current) => current.getByRole("button", { name: /Enable \/ Disable ADS-B Cat21/ }).click() },
    { target: (current) => current.getByRole("button", { name: /Enabled/ }), instruction: "Chọn giá trị đích để ghi vào đáp án.", voice: "Chọn Enabled.", after: (current) => current.getByRole("button", { name: /Enabled/ }).click() },
    { target: (current) => current.getByRole("button", { name: "Tiếp tục" }), instruction: "Kiểm tra chuỗi đã ghi rồi bấm Tiếp tục.", voice: "Kiểm tra rồi tiếp tục.", after: (current) => current.getByRole("button", { name: "Tiếp tục" }).click() },
  ]);
  await captureGroup(clip, page, "Bước 5 - Sự cố phần cứng", [
    { target: (current) => current.getByLabel("Kịch bản sự cố phần cứng"), instruction: "Bật sự cố phần cứng nếu tình huống yêu cầu.", voice: "Bật sự cố phần cứng.", after: (current) => current.getByLabel("Kịch bản sự cố phần cứng").check() },
    { target: (current) => current.getByRole("button", { name: "Tạo kịch bản" }), instruction: "Rà soát năm bước rồi bấm Tạo kịch bản.", voice: "Cuối cùng, tạo kịch bản." },
  ]);
}

async function capturePracticeGuide(page) {
  const clip = createClip("huong-dan-thi-sinh-luyen-tap", "Thí sinh vào Luyện tập", "Thí sinh");
  await navigate(page, "/student/vor");
  await page.getByRole("link", { name: /Bắt đầu bài VOR/ }).waitFor({ timeout: 20_000 });
  await captureGroup(clip, page, "Danh sách thực hành VOR", [{
    target: (current) => current.getByRole("link", { name: /Bắt đầu bài VOR/ }).first(),
    instruction: "Trong tab VOR, chọn biểu tượng bắt đầu của một tình huống.",
    voice: "Mở tab VOR và chọn một bài thực hành.",
    after: async (current) => { await current.getByRole("link", { name: /Bắt đầu bài VOR/ }).first().click(); await waitForPage(current); },
  }]);
  await captureGroup(clip, page, "Phiên thực hành VOR", [{
    target: (current) => current.getByText("Nhật ký học viên", { exact: true }),
    instruction: "Thực hiện trên PMDT; các màn hình đã mở được ghi vào Nhật ký học viên.",
    voice: "Kiểm tra PMDT và ghi kết luận trong Nhật ký học viên.",
    after: (current) => navigate(current, "/student/dme"),
  }]);
  await page.getByRole("link", { name: /Bắt đầu bài DME/ }).waitFor({ timeout: 20_000 });
  await captureGroup(clip, page, "Danh sách thực hành DME", [{
    target: (current) => current.getByRole("link", { name: /Bắt đầu bài DME/ }).first(),
    instruction: "Trong tab DME, chọn tình huống cần luyện tập.",
    voice: "Mở tab DME và chọn một tình huống.",
    after: async (current) => { await current.getByRole("link", { name: /Bắt đầu bài DME/ }).first().click(); await waitForPage(current); },
  }]);
  await captureGroup(clip, page, "Phiên thực hành DME", [{
    target: (current) => current.getByText("Nhật ký học viên", { exact: true }),
    instruction: "Kiểm tra PMDT DME, ghi bằng chứng và hoàn thành kết luận.",
    voice: "Thực hiện PMDT DME và hoàn thành nhật ký.",
    after: (current) => navigate(current, "/student/ads-b"),
  }]);
  await page.getByRole("link", { name: /Khôi phục đầu ra ADS-B CAT21/ }).waitFor({ timeout: 20_000 });
  await captureGroup(clip, page, "Danh sách thực hành ADS-B", [{
    target: (current) => current.getByRole("link", { name: /Khôi phục đầu ra ADS-B CAT21/ }).first(),
    instruction: "Trong tab ADS-B, chọn một tình huống QCMS.",
    voice: "Mở tab ADS-B và chọn tình huống QCMS.",
    after: async (current) => { await current.getByRole("link", { name: /Khôi phục đầu ra ADS-B CAT21/ }).first().click(); await waitForPage(current); },
  }]);
  await captureGroup(clip, page, "QCMS và ứng dụng bảo trì", [
    { target: (current) => current.getByRole("button", { name: /Mở giám sát Sensor A tại Đà Nẵng/ }), instruction: "Chọn cảm biến có trạng thái bất thường.", voice: "Chọn cảm biến bất thường.", after: (current) => current.getByRole("button", { name: /Mở giám sát Sensor A tại Đà Nẵng/ }).click() },
    { target: (current) => current.getByRole("link", { name: "Mở ứng dụng bảo trì" }), instruction: "Từ cửa sổ giám sát, mở ứng dụng bảo trì.", voice: "Mở ứng dụng bảo trì.", after: async (current) => { await current.getByRole("link", { name: "Mở ứng dụng bảo trì" }).click(); await waitForPage(current); } },
  ]);
  await captureGroup(clip, page, "Terminal thực hành ADS-B", [{
    target: (current) => current.locator("#terminal-command-input"),
    instruction: "Đăng nhập terminal và thực hiện chuỗi thao tác xử lý sự cố.",
    voice: "Đăng nhập terminal, xử lý tình huống rồi nộp bài.",
  }]);
}

async function captureStudentExamGuide(page) {
  const clip = createClip("huong-dan-thi-sinh-vao-thi", "Thí sinh vào Thi", "Thí sinh");
  await navigate(page, "/student/media-capture?screen=exam-list");
  await captureGroup(clip, page, "Danh sách kỳ thi", [{
    target: (current) => current.getByRole("link", { name: /Mở Kỳ kiểm tra năng định CNS/ }),
    instruction: "Chọn đúng kỳ thi đang mở và có tên trong danh sách.",
    voice: "Trong Vào thi, mở đúng kỳ thi đang tổ chức.",
    after: (current) => navigate(current, "/student/media-capture?screen=exam-detail"),
  }]);
  await captureGroup(clip, page, "Môn thi được phân", [{
    target: (current) => current.getByRole("link", { name: "Vào thi" }).first(),
    instruction: "Kiểm tra thông tin cá nhân, môn và đề rồi bấm Vào thi.",
    voice: "Kiểm tra môn, đề được phân rồi bấm Vào thi.",
    after: (current) => navigate(current, "/student/media-capture?screen=subject-ready"),
  }]);
  await captureGroup(clip, page, "Bắt đầu môn thi", [{
    target: (current) => current.getByRole("button", { name: "Bắt đầu môn thi" }),
    instruction: "Chỉ bấm Bắt đầu môn thi khi đã sẵn sàng làm bài.",
    voice: "Khi sẵn sàng, bấm Bắt đầu môn thi.",
    after: (current) => navigate(current, "/student/media-capture?screen=subject-progress"),
  }]);
  await captureGroup(clip, page, "Tiến độ kịch bản", [{
    target: (current) => current.getByRole("link", { name: "Tiếp tục kịch bản" }),
    instruction: "Mở kịch bản đang sẵn sàng; kịch bản tiếp theo sẽ còn khóa.",
    voice: "Thực hiện lần lượt từng kịch bản trong đề.",
    after: (current) => navigate(current, "/student/media-capture?screen=subject-complete"),
  }]);
  await captureGroup(clip, page, "Hoàn tất môn thi", [{
    target: (current) => current.getByRole("button", { name: "Hoàn tất môn thi" }),
    instruction: "Khi mọi kịch bản đã nộp, bấm Hoàn tất môn thi.",
    voice: "Nộp đủ kịch bản rồi bấm Hoàn tất môn thi.",
  }]);
}

function runFfmpeg(argumentsList) {
  execFileSync(ffmpegPath, argumentsList, { stdio: "ignore" });
}

function writeStoryboardHtml(clip) {
  const frameData = clip.frames.map((frame, index) => ({
    file: `frame-${String(index + 1).padStart(2, "0")}.webp`,
    duration: frame.duration,
    instruction: frame.instruction,
    screenName: frame.screenName,
  }));
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${clip.title}</title><style>*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;background:#020617;overflow:hidden}img{width:100%;height:100%;object-fit:contain}#meta{position:fixed;right:16px;top:16px;padding:7px 11px;border-radius:999px;background:rgba(2,6,23,.82);color:white;font:600 12px Segoe UI,Arial}</style></head><body><img id="frame" alt=""><div id="meta"></div><script>const frames=${JSON.stringify(frameData)};let index=0;let timer;function show(){const item=frames[index];document.getElementById('frame').src=item.file;document.getElementById('meta').textContent=(index+1)+'/'+frames.length+' · '+item.duration+' giây';clearTimeout(timer);timer=setTimeout(()=>{index=(index+1)%frames.length;show()},item.duration*1000)}show()</script></body></html>`;
}

function compileClip(clip) {
  if (clip.frames.length === 0) throw new Error(`${clip.slug} không có khung hình.`);
  const clipSourceDirectory = join(sourceDirectory, clip.slug);
  mkdirSync(clipSourceDirectory, { recursive: true });
  for (let index = 0; index < clip.frames.length; index += 1) {
    const sourceWebp = join(clipSourceDirectory, `frame-${String(index + 1).padStart(2, "0")}.webp`);
    runFfmpeg(["-y", "-i", clip.frames[index].framePath, "-frames:v", "1", "-c:v", "libwebp", "-quality", "84", sourceWebp]);
  }
  copyFileSync(join(clipSourceDirectory, "frame-01.webp"), join(outputDirectory, `${clip.slug}.webp`));
  writeFileSync(join(clipSourceDirectory, "storyboard.html"), writeStoryboardHtml(clip), "utf8");
  writeFileSync(join(clipSourceDirectory, "storyboard.json"), JSON.stringify({
    title: clip.title,
    audience: clip.audience,
    totalDuration: clip.frames.reduce((total, frame) => total + frame.duration, 0),
    frames: clip.frames.map((frame, index) => ({
      file: `frame-${String(index + 1).padStart(2, "0")}.webp`,
      screen: frame.screenName,
      duration: frame.duration,
      instruction: frame.instruction,
      voice: frame.voice,
    })),
  }, null, 2), "utf8");

  const videoArguments = ["-y"];
  for (const frame of clip.frames) videoArguments.push("-loop", "1", "-t", String(frame.duration), "-i", frame.framePath);
  const concatInputs = clip.frames.map((_, index) => `[${index}:v]`).join("");
  const totalDuration = clip.frames.reduce((total, frame) => total + frame.duration, 0);
  videoArguments.push(
    "-filter_complex", `${concatInputs}concat=n=${clip.frames.length}:v=1:a=0,format=yuv420p[v]`,
    "-map", "[v]", "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-r", "30",
    "-t", String(totalDuration), "-movflags", "+faststart", join(outputDirectory, `${clip.slug}.mp4`),
  );
  runFfmpeg(videoArguments);
}

function writeVoiceScript() {
  const lines = [
    "# LỜI THOẠI LỒNG TIẾNG — VIDEO HƯỚNG DẪN CNS SIMULATOR",
    "",
    "Video được dựng từ ảnh chụp giao diện thật. Mốc thời gian dưới đây khớp chính xác với từng thao tác.",
    "",
  ];
  for (const clip of clips) {
    const total = clip.frames.reduce((sum, frame) => sum + frame.duration, 0);
    lines.push(`## ${clip.title}`, "", `- Tên MP3: \`${clip.slug}.mp3\``, `- Tổng thời lượng: ${safeTimestamp(total)}`, "");
    let elapsed = 0;
    for (const frame of clip.frames) {
      const end = elapsed + frame.duration;
      lines.push(`- ${safeTimestamp(elapsed)}–${safeTimestamp(end)} · ${frame.screenName} — ${frame.voice}`);
      elapsed = end;
    }
    lines.push("", "Bản đọc liền:", "", clip.frames.map((frame) => frame.voice).join(" "), "");
  }
  writeFileSync(join(outputDirectory, "LOI-THOAI-LONG-TIENG.md"), `${lines.join("\n")}\n`, "utf8");
}

const outputResolved = resolve(outputDirectory);
if (!outputResolved.startsWith(`${projectRoot}\\`) && !outputResolved.startsWith(`${projectRoot}/`)) {
  throw new Error(`Unsafe media output path: ${outputResolved}`);
}
rmSync(outputDirectory, { recursive: true, force: true });
rmSync(renderDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });
mkdirSync(sourceDirectory, { recursive: true });
mkdirSync(renderDirectory, { recursive: true });

const nextBinary = join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const server = spawn(process.execPath, [nextBinary, "dev", "--hostname", "127.0.0.1", "--port", "3210"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    MEDIA_CAPTURE_MODE: "1",
    E2E_TEST_MODE: "1",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:1",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "media-capture-key",
    SUPABASE_SECRET_KEY: "media-capture-secret",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

let browser;
try {
  await waitForServer(server);
  browser = await chromium.launch({ headless: true });
  const adminContext = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const studentContext = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await adminContext.addCookies([roleCookie("admin")]);
  await studentContext.addCookies([roleCookie("student")]);
  const seedStorage = ({ vor, dme }) => {
    window.localStorage.setItem("cns-training:vor-scenarios", JSON.stringify({ version: 1, scenarios: [vor] }));
    window.localStorage.setItem("cns-training:dme-scenarios", JSON.stringify({ version: 1, scenarios: [dme] }));
    window.localStorage.removeItem("adsb-training-simulator:scenarios");
  };
  await adminContext.addInitScript(seedStorage, { vor: vorScenario, dme: dmeScenario });
  await studentContext.addInitScript(seedStorage, { vor: vorScenario, dme: dmeScenario });
  const adminPage = await adminContext.newPage();
  const studentPage = await studentContext.newPage();
  await captureExamSetGuide(adminPage);
  await captureExamGuide(adminPage);
  await captureVorDmeGuide(adminPage);
  await captureAdsbGuide(adminPage);
  await capturePracticeGuide(studentPage);
  await captureStudentExamGuide(studentPage);
  for (const clip of clips) compileClip(clip);
  writeVoiceScript();
  writeFileSync(join(outputDirectory, "MEDIA-MANIFEST.json"), JSON.stringify(clips.map((clip) => ({
    slug: clip.slug,
    title: clip.title,
    audience: clip.audience,
    duration: clip.frames.reduce((sum, frame) => sum + frame.duration, 0),
    frameCount: clip.frames.length,
    screenCount: clip.screenCount,
  })), null, 2), "utf8");
} catch (error) {
  writeFileSync(join(renderDirectory, "server.log"), serverLog, "utf8");
  throw error;
} finally {
  if (browser) await browser.close();
  server.kill();
}

rmSync(renderDirectory, { recursive: true, force: true });
console.log(`Đã tạo ${clips.length} video từ giao diện thật tại ${relative(projectRoot, outputDirectory)}.`);
