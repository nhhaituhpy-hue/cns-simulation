import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test("landing and primary navigation are accessible", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Kiểm tra đánh giá năng lực dựa trên thực tế vận hành hệ thống CNS",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Quản lý kỳ kiểm tra/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Vào khu vực thực hành/ })).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
});

test("admin and student dashboards have no serious accessibility violations", async ({
  page,
}) => {
  const dashboards = [
    { path: "/admin/ads-b", heading: "Quản lý kịch bản kiểm tra" },
    { path: "/student/ads-b", heading: "Bài thực hành mô phỏng CNS" },
  ];

  for (const dashboard of dashboards) {
    await page.goto(dashboard.path);
    await expect(
      page.getByRole("heading", { name: dashboard.heading }),
    ).toBeVisible();

    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(
      accessibility.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      ),
    ).toEqual([]);
  }
});

test("admin can create a scenario with a recorded reference path", async ({
  page,
}) => {
  await page.goto("/admin/create");

  await page.getByLabel("Tiêu đề kịch bản").fill("Kiểm tra CAT21 ca trực");
  await page
    .getByLabel("Mô tả")
    .fill("Xác định cảm biến mất dữ liệu và bật lại đầu ra CAT21.");
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(
    page.getByRole("heading", { name: "Cấu hình trạng thái ban đầu" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(
    page.getByRole("heading", { name: "Chọn vai trò đăng nhập" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await page.getByRole("button", { name: /General Settings/ }).click();
  await page
    .getByRole("button", { name: /Enable \/ Disable ADS-B Cat21/ })
    .click();
  await page.getByRole("button", { name: /Enabled/ }).click();
  await expect(page.getByText("3 thao tác")).toBeVisible();

  // Go from Step 4 to Step 5
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  // Click Create on Step 5
  await page.getByRole("button", { name: "Tạo kịch bản" }).click();
  await expect(page).toHaveURL(/\/admin\/ads-b$/);
  await expect(page.getByText("Kiểm tra CAT21 ca trực").first()).toBeVisible();
});

test("student completes the seeded CAT21 exercise and passes", async ({ page }) => {
  await page.goto("/student/ads-b");

  await page
    .getByRole("link", { name: /Khôi phục đầu ra ADS-B CAT21/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "GROUND STATIONS" }),
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: /Mở giám sát Sensor A tại Đà Nẵng, trạng thái Một phần/,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("link", { name: "Mở ứng dụng bảo trì" }).click();

  const terminalInput = page.locator("#terminal-command-input");
  await terminalInput.fill("sysadmin@10.10.10.3");
  await terminalInput.press("Enter");
  await expect(page.getByLabel("Nhập mật khẩu mô phỏng")).toBeVisible();
  await terminalInput.fill("training-password");
  await terminalInput.press("Enter");

  await expect(page.getByText("System Administrator Main Menu")).toBeVisible();
  for (const input of ["1", "1", "1"]) {
    await terminalInput.fill(input);
    await terminalInput.press("Enter");
  }

  await expect(page.getByText("Đã chọn 0/3 bước")).toBeVisible();
  await page.getByRole("button", { name: "Chọn tất cả" }).click();
  await page.getByRole("button", { name: "Nộp bài" }).click();

  await expect(
    page.getByRole("heading", { name: "Đạt yêu cầu" }),
  ).toBeVisible();
  await expect(page.getByText(/Điểm số: 100%/)).toBeVisible();
});

test("DME dashboard opens the PMDT simulator without function-key controls", async ({
  page,
}) => {
  await page.goto("/admin/dme");
  await expect(
    page.getByRole("heading", { name: "PMDT Simulator - DME 1118A/1119A" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Mở PMDT Simulator" }).click();
  await expect(page).toHaveURL(/\/admin\/dme-pmdt$/);
  await expect(
    page.getByRole("heading", {
      name: /Dual DME - SELEX Systems Integration Inc. PMDT/i,
    }),
  ).toBeVisible();
  await expect(page.getByText("Dual DME Model 1118A/1119A")).toBeVisible();

  for (const key of ["F5", "F6", "F7", "F8"]) {
    await expect(page.getByText(key, { exact: true })).toHaveCount(0);
  }

  await page.getByRole("button", { name: "Monitors" }).click();
  await page.getByRole("menuitem", { name: "Data" }).click();
  await page.getByRole("tab", { name: "Standby" }).click();
  await expect(page.getByRole("cell", { name: /49.99/ })).toBeVisible();
});
