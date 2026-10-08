// Copies the built extension and pre-grants the stack's origin. Chrome's permission prompt is browser UI
// that automation cannot answer, so only this copy lists the origin under host_permissions; the build never does.
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { EXTENSION_DIR, stack } from "./stack";

export default function globalSetup(): void {
  if (!existsSync(".output/chrome-mv3/manifest.json")) throw new Error("Build first: npm run build (npm run e2e does it)");
  rmSync(EXTENSION_DIR, { recursive: true, force: true });
  cpSync(".output/chrome-mv3", EXTENSION_DIR, { recursive: true });
  const path = `${EXTENSION_DIR}/manifest.json`;
  const manifest = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  manifest.host_permissions = [`${stack.origin}/*`];
  writeFileSync(path, JSON.stringify(manifest, null, 2));
}
