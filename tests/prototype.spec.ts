import { expect, test } from "@playwright/test";

const runningTimer = (phase: "work" | "break", remainingSeconds: number) => ({
  phase,
  status: "running",
  durationSeconds: phase === "work" ? 3000 : 600,
  remainingSeconds,
  endsAt: Date.now() + remainingSeconds * 1000,
});

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Moyu番茄钟悬浮窗" })).toBeVisible();
});

test("默认50分钟，开始、暂停、继续与重置完整可用", async ({ page }) => {
  await expect(page.locator("time")).toHaveText("50:00");
  await page.getByRole("button", { name: "开始专注", exact: true }).click();
  await expect(page.locator(".timer-status")).toHaveText("正在专注");
  await page.waitForTimeout(1150);
  await page.getByRole("button", { name: "暂停一下", exact: true }).click();
  await expect(page.locator(".timer-status")).toHaveText("已暂停");
  const paused = await page.locator("time").textContent();
  await page.waitForTimeout(1100);
  await expect(page.locator("time")).toHaveText(paused!);
  await page.getByRole("button", { name: "继续计时", exact: true }).click();
  await expect(page.locator(".timer-status")).toHaveText("正在专注");
  await page.getByRole("button", { name: "重置当前阶段" }).click();
  await expect(page.locator("time")).toHaveText("50:00");
  await expect(page.locator(".timer-status")).toHaveText("准备就绪");
});

test("工作结束自动休息，休息结束等待确认而不自动工作", async ({ page }) => {
  await page.evaluate((timer) => localStorage.setItem("moyu.timer.v1", JSON.stringify(timer)), runningTimer("work", 2));
  await page.reload();
  await expect(page.locator(".phase-chip")).toHaveText("休息时光", { timeout: 5000 });
  expect(Number((await page.locator("time").textContent())!.split(":")[0])).toBeGreaterThanOrEqual(9);
  await page.evaluate((timer) => localStorage.setItem("moyu.timer.v1", JSON.stringify(timer)), runningTimer("break", 2));
  await page.reload();
  await expect(page.locator(".timer-status")).toHaveText("等待开始", { timeout: 5000 });
  await expect(page.locator("time")).toHaveText("00:00");
  await expect(page.getByRole("button", { name: "开始新的专注" })).toBeVisible();
  await page.getByRole("button", { name: "开始新的专注" }).click();
  await expect(page.locator(".phase-chip")).toHaveText("专注时刻");
  await expect(page.locator("time")).toHaveText("50:00");
});

test("设置独立校验，非法输入不保存，新时长不打断运行阶段", async ({ page }) => {
  await page.getByRole("button", { name: "开始专注", exact: true }).click();
  await page.getByRole("button", { name: "打开设置" }).click();
  await page.getByRole("textbox", { name: "专注时长" }).fill("181");
  await page.getByRole("textbox", { name: "休息时长" }).fill("0");
  await page.getByRole("button", { name: "保存偏好" }).click();
  await expect(page.locator("#work-error")).toHaveText("请输入 1–180 之间的整数");
  await expect(page.locator("#break-error")).toHaveText("请输入 1–60 之间的整数");
  await page.getByRole("textbox", { name: "专注时长" }).fill("25");
  await page.getByRole("textbox", { name: "休息时长" }).fill("5");
  await page.getByRole("button", { name: "保存偏好" }).click();
  await expect(page.getByRole("button", { name: "已保存偏好" })).toBeVisible();
  await page.getByRole("button", { name: "返回计时" }).click();
  await expect(page.locator(".timer-status")).toHaveText("正在专注");
  await expect(page.locator("time")).not.toHaveText("25:00");
});

test("固定、主题、设置保存与窗口尺寸跨重载保留", async ({ page }) => {
  const panel = page.getByRole("region", { name: "Moyu番茄钟悬浮窗" });
  const oldBox = await panel.boundingBox();
  const resize = page.getByRole("separator", { name: "调整窗口大小" });
  const resizeBox = await resize.boundingBox();
  await page.mouse.move(resizeBox!.x + 10, resizeBox!.y + 10);
  await page.mouse.down();
  await page.mouse.move(resizeBox!.x + 75, resizeBox!.y + 55, { steps: 6 });
  await page.mouse.up();
  expect((await panel.boundingBox())!.width).toBeGreaterThan(oldBox!.width + 50);
  await page.getByRole("button", { name: "固定窗口", exact: true }).click();
  await expect(page.getByRole("button", { name: "取消固定窗口" })).toHaveAttribute("aria-pressed", "true");
  await expect(resize).toHaveCount(0);
  await page.getByRole("button", { name: "切换到黑夜模式" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "取消固定窗口" })).toHaveAttribute("aria-pressed", "true");
  expect((await panel.boundingBox())!.width).toBeGreaterThan(oldBox!.width + 50);
});

test("暂停后重开保留剩余时间，运行中重开按结束时间恢复", async ({ page }) => {
  await page.getByRole("button", { name: "开始专注", exact: true }).click();
  await page.waitForTimeout(1100);
  await page.getByRole("button", { name: "暂停一下", exact: true }).click();
  const paused = await page.locator("time").textContent();
  await page.reload();
  await expect(page.locator("time")).toHaveText(paused!);
  await expect(page.locator(".timer-status")).toHaveText("已暂停");
  await page.getByRole("button", { name: "继续计时", exact: true }).click();
  await page.waitForTimeout(1100);
  await page.reload();
  await expect(page.locator(".timer-status")).toHaveText("正在专注");
  expect(await page.locator("time").textContent()).not.toBe("50:00");
});

test("减少动态效果、提示音开关与恢复默认均可操作", async ({ page }) => {
  await page.getByRole("button", { name: "打开设置" }).click();
  await page.getByRole("switch", { name: "减少动态效果" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
  await page.getByRole("switch", { name: "提示音" }).click();
  await expect(page.getByRole("switch", { name: "提示音" })).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("slider", { name: "提示音量" })).toHaveCount(0);
  await page.getByRole("button", { name: "恢复默认设置" }).click();
  await expect(page.getByRole("textbox", { name: "专注时长" })).toHaveValue("50");
  await expect(page.getByRole("textbox", { name: "休息时长" })).toHaveValue("10");
  await expect(page.getByRole("switch", { name: "提示音" })).toHaveAttribute("aria-checked", "true");
});

test("手机窄屏无横向溢出，主要操作和设置可用", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await page.getByRole("region", { name: "Moyu番茄钟悬浮窗" }).boundingBox())!.x).toBeLessThan(50);
  const panel = await page.getByRole("region", { name: "Moyu番茄钟悬浮窗" }).boundingBox();
  expect(panel!.x).toBeGreaterThanOrEqual(0);
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole("button", { name: "打开设置" }).click();
  await expect(page.getByRole("heading", { name: "一点你的偏好" })).toBeVisible();
  await page.getByRole("button", { name: "返回计时" }).click();
  await expect(page.getByRole("button", { name: "开始专注", exact: true })).toBeVisible();
});
