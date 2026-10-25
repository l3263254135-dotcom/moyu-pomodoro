import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";

await mkdir("artifacts", { recursive: true });
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5180", "--strictPort"], { stdio: "ignore" });
for (let attempt = 0; attempt < 50; attempt++) {
  try { if ((await fetch("http://127.0.0.1:5180/")).ok) break; } catch { /* Wait for the isolated preview server. */ }
  await new Promise((resolve) => setTimeout(resolve, 100));
}
const browser = await chromium.launch({ headless: true });
try {
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto("http://127.0.0.1:5180/");
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: "artifacts/demo-light.png" });

await page.getByRole("button", { name: "开始专注", exact: true }).click();
await page.getByRole("button", { name: "暂停一下", exact: true }).click();
await page.screenshot({ path: "artifacts/demo-paused.png" });
await page.getByRole("button", { name: "切换到黑夜模式" }).click();
await page.screenshot({ path: "artifacts/demo-dark.png" });
await page.getByRole("button", { name: "打开设置" }).click();
await page.screenshot({ path: "artifacts/demo-settings-dark.png" });
await page.getByRole("button", { name: "切换到白天模式" }).click();
await page.screenshot({ path: "artifacts/demo-settings-light.png" });

await page.getByRole("button", { name: "返回计时" }).click();
await page.evaluate(() => localStorage.setItem("moyu.timer.v1", JSON.stringify({
  phase: "break", status: "running", durationSeconds: 600,
  remainingSeconds: 600, endsAt: Date.now() + 600_000,
})));
await page.reload();
await page.screenshot({ path: "artifacts/demo-break.png" });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "artifacts/demo-mobile.png" });
} finally {
  await browser.close();
  server.kill();
}
console.log("已生成浅色、深色、暂停、休息、设置和窄屏截图到 artifacts/。");
