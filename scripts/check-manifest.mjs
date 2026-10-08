// Fails when the built manifest asks for more than the spec allows (spec §9) or lacks what the store needs.
import { existsSync, readFileSync } from "node:fs";

const dir = ".output/chrome-mv3";
const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, "utf8"));
const sorted = (list) => JSON.stringify([...(list ?? [])].sort());
const errors = [];

if (sorted(manifest.permissions) !== sorted(["storage", "scripting"])) {
  errors.push(`permissions must be ["storage","scripting"], got ${JSON.stringify(manifest.permissions)}`);
}
if (sorted(manifest.optional_host_permissions) !== sorted(["http://*/*", "https://*/*"])) {
  errors.push(`optional_host_permissions mismatch: ${JSON.stringify(manifest.optional_host_permissions)}`);
}
if ((manifest.host_permissions ?? []).length > 0) {
  errors.push(`host_permissions must be empty: ${JSON.stringify(manifest.host_permissions)}`);
}
if ((manifest.content_scripts ?? []).length > 0) {
  errors.push("content_scripts must be empty (the content script is registered at runtime)");
}
for (const key of ["optional_permissions", "web_accessible_resources", "externally_connectable"]) {
  if (manifest[key] !== undefined) errors.push(`${key} must not be set: ${JSON.stringify(manifest[key])}`);
}
for (const size of ["16", "32", "48", "128"]) {
  const icon = manifest.icons?.[size];
  if (!icon || !existsSync(`${dir}/${icon}`)) errors.push(`icons.${size} is missing (npm run icons)`);
}
if (!existsSync(`${dir}/kibana.js`)) {
  errors.push("kibana.js (unlisted content script) is missing from the build output");
}

if (errors.length > 0) {
  console.error(`Manifest check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("Manifest check passed");
