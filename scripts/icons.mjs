// Renders assets/icon.svg to public/icon/<size>.png, which WXT adds to the manifest. Run: npm run icons
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const svg = readFileSync("assets/icon.svg", "utf8");
mkdirSync("public/icon", { recursive: true });
const browser = await chromium.launch();
for (const size of [16, 32, 48, 128]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: `public/icon/${size}.png`, omitBackground: true });
  await page.close();
}
await browser.close();
