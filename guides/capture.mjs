import { chromium } from "playwright";
import { mkdirSync } from "fs";

const URL = "https://aslp-anatomy-studio.vercel.app/";
const DIR = "/workspace/artifacts/aslp-anatomy-studio/guides/shots";
mkdirSync(DIR, { recursive: true });
const exe = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";

async function shot(page, name) {
  await page.screenshot({ path: `${DIR}/${name}.png`, type: "png" });
  console.log("shot", name);
}

async function tap(page, sel) {
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (el) el.click();
  }, sel);
}

async function waitHome(page) {
  await page.waitForSelector("#home");
  await page.waitForTimeout(700);
}

async function waitStudio(page) {
  await page.waitForFunction(() => {
    const home = document.getElementById("home");
    return home && getComputedStyle(home).display === "none";
  }, { timeout: 40000 });
  await page.waitForFunction(() => {
    const loader = document.getElementById("loader");
    if (!loader) return true;
    const d = getComputedStyle(loader).display;
    return d === "none" || loader.style.display === "none";
  }, { timeout: 120000 });
  await page.waitForFunction(() => document.querySelectorAll("#partsList .part").length > 2, { timeout: 120000 });
  await page.waitForTimeout(1800);
}

const browser = await chromium.launch({
  executablePath: exe,
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1.4
});
const page = await context.newPage();
page.setDefaultTimeout(90000);

await page.goto(URL, { waitUntil: "domcontentloaded" });
await waitHome(page);
await shot(page, "desktop-home");

await tap(page, "#openStudio");
await waitStudio(page);
await shot(page, "desktop-studio-ear");

await page.evaluate(() => {
  const btn = document.querySelector("#partsList .part");
  if (btn) btn.click();
});
await page.waitForTimeout(900);
await shot(page, "desktop-explain");

await page.evaluate(() => document.querySelector('.tabs .btn[data-tab="workbook"]')?.click());
await page.waitForTimeout(400);
await shot(page, "desktop-workbook");

await page.evaluate(() => document.querySelector('.tabs .btn[data-tab="activity"]')?.click());
await page.waitForTimeout(400);
await shot(page, "desktop-osce");

await tap(page, "#btnClinic");
await page.waitForTimeout(700);
await shot(page, "desktop-clinic");

await tap(page, "#btnTweaks");
await page.waitForTimeout(500);
await shot(page, "desktop-tweaks");
await page.keyboard.press("Escape");
await page.waitForTimeout(200);

await tap(page, "#btnFaculty");
await page.waitForTimeout(1000);
await shot(page, "desktop-faculty");
await tap(page, "#btnStudent");
await page.waitForTimeout(300);

await tap(page, "#btnSheets");
await page.waitForTimeout(800);
await shot(page, "desktop-sheets");
await page.keyboard.press("Escape");

await tap(page, "#btnHome");
await waitHome(page);
await page.evaluate(() => {
  const b = [...document.querySelectorAll(".mod")].find((x) => x.textContent.includes("Larynx"));
  if (b) b.click();
});
await waitStudio(page);
await shot(page, "desktop-studio-larynx");

await tap(page, "#btnHome");
await waitHome(page);

await page.setViewportSize({ width: 834, height: 1112 });
await page.waitForTimeout(600);
await shot(page, "tablet-home");
await tap(page, "#openStudio");
await waitStudio(page);
await shot(page, "tablet-studio");

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(URL, { waitUntil: "domcontentloaded" });
await waitHome(page);
await shot(page, "phone-home");
await tap(page, "#openStudio");
await waitStudio(page);
await shot(page, "phone-studio");
await tap(page, "#btnLearn");
await page.waitForTimeout(500);
await shot(page, "phone-learn");
await page.keyboard.press("Escape");
await page.waitForTimeout(250);
await tap(page, "#btnModules");
await page.waitForTimeout(500);
await shot(page, "phone-modules");

await page.setViewportSize({ width: 844, height: 390 });
await page.goto(URL, { waitUntil: "domcontentloaded" });
await tap(page, "#openStudio");
await waitStudio(page);
await shot(page, "phone-landscape");

await browser.close();
console.log("done");
