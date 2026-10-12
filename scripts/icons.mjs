// Renders assets/icon.svg to public/icon/<size>.png, which WXT adds to the manifest, and assets/icon-dark.svg to
// public/icon-dark/<size>.png, which the background swaps in when the browser is dark (src/toolbar-icon.ts). Run: npm run icons
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
for (const [source, dir] of [["assets/icon.svg", "public/icon"], ["assets/icon-dark.svg", "public/icon-dark"]]) {
  const svg = readFileSync(source, "utf8");
  mkdirSync(dir, { recursive: true });
  for (const size of [16, 32, 48, 128]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
    await page.screenshot({ path: `${dir}/${size}.png`, omitBackground: true });
    await page.close();
  }
}
await browser.close();
