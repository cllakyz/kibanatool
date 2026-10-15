# kibanatool Plan 1 — Link Aksiyonları Dikey Dilimi: Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcı Discover'da bir satırı ya da paneli açtığında, ayarlarda tanımladığı link aksiyonları o logun **ham** alanlarıyla doldurulmuş butonlar olarak çıkar. Bu, 7.17, 8.x ve 9.x'te çalışır.

**Architecture:** WXT ile bir MV3 eklentisi kurulur.
- Background, kullanıcının izin verdiği Kibana origin'leri için içerik betiğini (`kibana.js`) `scripting.registerContentScripts` ile kaydeder.
- İçerik betiği iki adaptörle açık detay görünümlerini bulur ve logun kimliğini okur: `legacy-table` (7.17) ve `data-grid` (8.x/9.x).
- Ham log `/internal/search/es` ile çekilir. Saf çekirdek mantık alanları düzleştirir, koşulları ve şablonları değerlendirir.
- React aksiyon çubuğu Shadow DOM içinde çizilir.

**Tech Stack:**
- Uygulama: WXT 0.21, React 19, TypeScript 5.9 (strict)
- Kütüphaneler: zod 4, rison-node 2.1, lz-string 1.5
- Test: Vitest 5, happy-dom 20
- Geliştirme ortamı: Docker (Kibana 8.19.23 / 9.5.5)

**Spec:** `docs/superpowers/specs/2026-10-07-kibanatool-design.md`

### Planların sırası

Spec üç plana bölündü. Her plan çalışan ve test edilebilir yazılım üretir.

| Plan | Kapsam |
|---|---|
| **1 (bu plan)** | İskelet, alan haritası, şablon ve koşullar, ayar modeli, Kibana istemcisi, iki adaptör, background kaydı, aksiyon çubuğu (link aksiyonları), asgari ayarlar sayfası, 8.19/9.5 geliştirme stack'leri, elle doğrulama |
| 2 | Discover aksiyonları (KQL, zaman penceresi, rison URL), kopyalama menüsü (Markdown, maskeleme, datemath, panoya yazma), JSON görünümü, tam ayarlar sayfası (düzenleyici, canlı önizleme, dışa/içe aktarma), çeviri metinlerinin tamamlanması |
| 3 | Playwright uçtan uca matrisi (7.17/8.19/9.5, Observability, space/alt yol, kısıtlı kullanıcı), sürüm başına HTML örneklerinin yakalanması, GitHub Actions, ikonlar, gizlilik politikası, README/CHANGELOG, `wxt zip` ile mağaza paketi |

### Spec'ten sapmalar

| Spec | Bu plan | Neden |
|---|---|---|
| §10: dört hata mesajı | Beşinci tür olarak `server` (5xx) eklendi (Task 6) | Bir 5xx yanıtını "bu sürümle uyumsuz olabilir" diye göstermek yanıltıcı olur. |
| §7.7: WXT `createShadowRootUi` | Her host'ta doğrudan `attachShadow` + `<style>` + `createRoot` kullanılır (Task 9) | Çubuk birden fazla ve dinamik açılan görünüme ekleniyor. `createShadowRootUi` tek bir sabit bağlantı noktası için tasarlanmış. Sonuç aynı: Shadow DOM içinde React. |
| §9: `@wxt-dev/i18n` | Tarayıcının kendi `browser.i18n.getMessage` API'si + `public/_locales` (Task 9, 10) | Davranış aynı (tarayıcı dili, TR/EN), bir bağımlılık eksik. Tip güvenliği `MessageKey` birleşim tipiyle sağlanıyor. |

## Global Constraints

- **Node ve npm:** Node `>=22` (WXT engines), paket yöneticisi `npm`.
- **TypeScript:** `typescript@5` kullanılır. 7.x yeni yerel derleyicidir, WXT/Vitest uyumu doğrulanmadı. `strict: true` ve `noUncheckedIndexedAccess: true` açıktır.
- **Desteklenen Kibana sürümleri:** 7.17.29, 8.15.3, 8.19.23 ve 9.5.5'te doğrulanan davranışlar (spec §3). Yalnızca Chrome MV3, yalnızca Discover.
- **Manifest izinleri:**
  - `permissions` tam olarak `["storage", "scripting"]`
  - `optional_host_permissions` tam olarak `["http://*/*", "https://*/*"]`
  - `host_permissions` ve `content_scripts` boş
  - `tabs`, `webRequest` ve `<all_urls>` yok
- **Ham log isteği** (spec §6.2) birebir şu şekildedir:
  - `POST <önek>/internal/search/es`
  - başlıklar: `kbn-xsrf: kibanatool`, `x-elastic-internal-origin: Kibana`, `content-type: application/json`
  - `credentials: "same-origin"`
  - gövde: `{"params":{"index":"<_index>","body":{"size":1,"query":{"ids":{"values":["<_id>"]}}}}}`
- **Data view:** Önce `GET <önek>/api/data_views/data_view/<id>` denenir. 404 dönerse `GET <önek>/api/index_patterns/index_pattern/<id>` çağrılır.
- **Önek:** `location.pathname` içinde `/app/`'ten önceki kısımdır (`""`, `/kibana`, `/s/test`, `/kibana/s/test`).
- **Locator linki:** `lz` parametresi `URLSearchParams` ile okunur ve `LZString.decompressFromBase64` ile çözülür. Sonuç JSON `{index: dataViewId, rowIndex: _index, rowId: _id}` olur.
- **Yer tutucular:**
  - Biçim: `{yol}` ya da `{yol|yedek1|yedek2}`. Yol karakterleri: `A-Z a-z 0-9 _ . @ -`.
  - `undefined`, `null` ve `""` değer yok sayılır. `0` ve `false` değerdir.
  - Değer yoksa aksiyon gösterilmez.
- **Linkler:** Yalnızca `http://` ya da `https://` ile başlar. `target="_blank"` ve `rel="noopener noreferrer"` ile açılır.
- **Ayarlar:** `chrome.storage.local` içinde, anahtar `kibanatool.config`, `schemaVersion: 1`.
- **Kibana'yı bozmamak:** İçerik betiği hiçbir hatayı dışarı sızdırmaz. Hatalar `console.debug("[kibanatool]", ...)` ile loglanır.
- **Ağ trafiği:** Yalnızca kullanıcının Kibana'sına same-origin istek. Telemetri yok.
- **UI:** Shadow DOM içinde React. `innerHTML` ya da `dangerouslySetInnerHTML` kullanılmaz.
- **Kod:** Kod ve yorumlar İngilizce. Kullanıcıya görünen metinler `public/_locales/{en,tr}/messages.json` üzerinden gelir.
- **Import yolları:** `src/` modülleri birbirini göreli yolla import eder. `#imports` ve `wxt/browser` yalnızca `entrypoints/`, `src/i18n.ts` ve `src/content/ActionBar.tsx` içinde kullanılır, böylece birim testlerinde WXT gerekmez.
- **Git:**
  - Bu depoda `user.email` yerel olarak `cllakyz@hotmail.com`.
  - Her commit mesajı `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` satırıyla biter.
  - Push komutu: `GH_TOKEN=$(gh auth token --user cllakyz) git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push`

## Review Focus

1. **Alt yolda ya da space'te çalışan Kibana:** `/kibana/s/team/app/discover` gibi bir adreste her API isteği önekle gitmeli. Testleri Task 5 (önek) ve Task 6 (istemci URL'i) içerir.
2. **Panelde önceki/sonraki logla gezinme:** Aynı panel (container) içinde kimlik değişir ve çubuk eski logu değil, yenisini göstermeli. Testleri Task 7 (adaptör yeni kimliği döndürür) ve Task 9 (aynı mount yeni görünümle yeniden çizilir) içerir.
3. **7.17'de aynı anda birden fazla açık satır:** Her satırın kendi kimliğiyle kendi çubuğu olmalı. Testi Task 7 içerir.
4. **URL'de özel karakter, Unicode ve sıfır/false değerler:** `a b/c#d&e?f`, `Çağrı`, `0`, `false` doğru kodlanmalı ve "değer yok" sayılmamalı. Testi Task 3 içerir.
5. **Kibana'nın yeniden çizerken çubuğu silmesi:** Host elemanı DOM'dan düşerse geri eklenmeli. Testi Task 9 içerir.

---

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `package.json`, `wxt.config.ts`, `tsconfig.json`, `vitest.config.ts` | Araçlar ve manifest |
| `scripts/check-manifest.mjs` | Derlenen manifestin izin kurallarına uyduğunu doğrular |
| `public/_locales/{en,tr}/messages.json` | Kullanıcıya görünen metinler |
| `src/core/types.ts` | `DocIdentity`, `RawHit` |
| `src/core/fields.ts` | Ham logu nokta yollu alan haritasına düzleştirir, değer biçimleme |
| `src/core/template.ts` | `{yol\|yedek}` yer tutucularını çözer |
| `src/core/conditions.ts` | Aksiyon koşulları |
| `src/core/config.ts` | Ayar şeması (zod), doğrulama, etkin ortam, origin deseni |
| `src/core/link-actions.ts` | Link aksiyonlarından buton listesi üretir |
| `src/kibana/prefix.ts` | API öneki ve Discover yolu tespiti |
| `src/kibana/discover-state.ts` | URL'deki `_a` durumunu okur (rison), ES\|QL tespiti |
| `src/kibana/locator.ts` | 7.17 `#/doc/...` ve 8.x/9.x locator linklerinden kimlik okur |
| `src/kibana/client.ts` | Ham log, data view, sürüm, hata türleri, önbellek |
| `src/adapters/types.ts`, `legacy-table.ts`, `data-grid.ts`, `detect.ts` | Açık detay görünümlerini bulur |
| `src/storage.ts` | Ayar deposu (`chrome.storage.local` sarmalayıcı) |
| `src/background/registration.ts` | İçerik betiğinin kaydını izinlerle eşitler |
| `src/content/mounts.ts` | Görünüm başına çubuk host'u ekler, kaldırır, yeniden ekler |
| `src/content/styles.ts`, `src/content/ActionBar.tsx` | Aksiyon çubuğu |
| `src/i18n.ts` | `t()` yardımcısı (`browser.i18n`) |
| `src/options/model.ts`, `entrypoints/options/*` | Asgari ayarlar sayfası |
| `entrypoints/background.ts`, `entrypoints/kibana.ts` | Giriş noktaları |
| `src/types/rison-node.d.ts` | rison-node tip bildirimi |
| `docker/*` | 8.19.23 ve 9.5.5 geliştirme stack'leri ve sentetik veri |
| `tests/unit/**` | Birim testleri (`src/` yapısını aynalar) |

---

### Task 1: Proje iskeleti

**Files:**
- Create: `package.json`, `wxt.config.ts`, `tsconfig.json`, `vitest.config.ts`, `scripts/check-manifest.mjs`
- Create: `entrypoints/background.ts`, `entrypoints/kibana.ts`, `entrypoints/options/index.html`, `entrypoints/options/main.tsx`
- Create: `public/_locales/en/messages.json`, `public/_locales/tr/messages.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: —
- Produces: `npm run build` → `.output/chrome-mv3/` (içinde `kibana.js` dosyası), `npm test`, `npm run typecheck`, `npm run check:manifest`

- [ ] **Step 1: `package.json` oluştur**

```json
{
  "name": "kibanatool",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Chrome extension that speeds up working with logs in Kibana Discover (7.17, 8.x, 9.x)",
  "license": "MIT",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "wxt",
    "build": "wxt build",
    "zip": "wxt zip",
    "postinstall": "wxt prepare",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "check:manifest": "node scripts/check-manifest.mjs"
  }
}
```

- [ ] **Step 2: Bağımlılıkları kur**

Run:
```bash
npm install react@19 react-dom@19 zod@4 rison-node@2.1.1 lz-string@1.5
npm install -D wxt@0.21 @wxt-dev/module-react typescript@5 vitest@5 happy-dom @types/react@19 @types/react-dom@19
```
Expected: kurulum biter, `postinstall` çalışır ve `.wxt/` klasörü (`.wxt/tsconfig.json` dahil) oluşur.

- [ ] **Step 3: `wxt.config.ts`, `tsconfig.json` ve `vitest.config.ts` oluştur**

`wxt.config.ts`:
```ts
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    permissions: ["storage", "scripting"],
    optional_host_permissions: ["http://*/*", "https://*/*"],
    action: { default_title: "kibanatool" },
  },
});
```

`tsconfig.json`:
```json
{
  "extends": "./.wxt/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
  },
});
```

- [ ] **Step 4: Giriş noktalarını ve dil dosyalarını oluştur**

`entrypoints/background.ts`:
```ts
import { defineBackground } from "#imports";
import { browser } from "wxt/browser";

export default defineBackground(() => {
  browser.action.onClicked.addListener(() => void browser.runtime.openOptionsPage());
});
```

`entrypoints/kibana.ts`:
```ts
import { defineUnlistedScript } from "#imports";

// Registered at runtime for granted Kibana origins (see src/background/registration.ts).
export default defineUnlistedScript(() => {
  console.debug("[kibanatool] content script loaded");
});
```

`entrypoints/options/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="manifest.open_in_tab" content="true" />
    <title>kibanatool</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

`entrypoints/options/main.tsx`:
```tsx
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(<h1>kibanatool</h1>);
```

`public/_locales/en/messages.json`:
```json
{
  "extName": { "message": "kibanatool" },
  "extDescription": { "message": "Speeds up working with logs in Kibana Discover: action buttons built from log fields." }
}
```

`public/_locales/tr/messages.json`:
```json
{
  "extName": { "message": "kibanatool" },
  "extDescription": { "message": "Kibana Discover'da logla çalışmayı hızlandırır: log alanlarından üretilen aksiyon butonları." }
}
```

- [ ] **Step 5: Manifest kontrol betiğini yaz**

`scripts/check-manifest.mjs`:
```js
// Fails when the built manifest asks for more than the spec allows (spec §9).
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
if (!existsSync(`${dir}/kibana.js`)) {
  errors.push("kibana.js (unlisted content script) is missing from the build output");
}

if (errors.length > 0) {
  console.error(`Manifest check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("Manifest check passed");
```

- [ ] **Step 6: `.gitignore` dosyasını güncelle**

`.gitignore` içeriği tam olarak şu olmalı:
```
.DS_Store
node_modules/
.output/
.wxt/
docker/.env.*
```

- [ ] **Step 7: Doğrula**

Run: `npm run build && npm run check:manifest && npm run typecheck && npm test`
Expected:
- build başarılı
- `Manifest check passed`
- `tsc` hata vermez
- Vitest "No test files found" der ve çıkış kodu 0 olur

WXT unlisted betiği `kibana.js` dışında bir yola yazarsa (`find .output/chrome-mv3 -name 'kibana*.js'`), `check-manifest.mjs` içindeki yolu ve Task 8'deki `CONTENT_SCRIPT_FILE` sabitini o yola göre değiştir.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json wxt.config.ts tsconfig.json vitest.config.ts scripts entrypoints public .gitignore
git commit -m "chore: scaffold WXT extension with manifest permission check" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Alan haritası

**Files:**
- Create: `src/core/types.ts`, `src/core/fields.ts`
- Test: `tests/unit/core/fields.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `interface DocIdentity { dataViewId: string; index: string; id: string }`
  - `interface RawHit { _id: string; _index: string; _source?: Record<string, unknown> }`
  - `type FieldMap = Record<string, unknown>`
  - `flattenDoc(hit: RawHit): FieldMap`
  - `isMissing(value: unknown): boolean`
  - `formatValue(value: unknown): string`
  - `parseJsonText(text: string): Record<string, unknown> | unknown[] | undefined`
  - `isPlainObject(value: unknown): value is Record<string, unknown>`

- [ ] **Step 1: Başarısız testleri yaz**

`tests/unit/core/fields.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { flattenDoc, formatValue, isMissing, parseJsonText } from "../../../src/core/fields";

const hit = (source: Record<string, unknown>) => ({ _id: "id-1", _index: "logs-a", _source: source });

function nestedJson(levels: number): string {
  let text = JSON.stringify({ leaf: "x" });
  for (let i = 1; i < levels; i++) text = JSON.stringify({ next: text });
  return text;
}

describe("flattenDoc", () => {
  it("flattens nested objects into dot paths and adds _id/_index", () => {
    const fields = flattenDoc(hit({ context: { ip: "10.0.0.1", user: { id: 5 } }, level: 200 }));
    expect(fields).toMatchObject({
      "context.ip": "10.0.0.1",
      "context.user.id": 5,
      level: 200,
      _id: "id-1",
      _index: "logs-a",
    });
  });

  it("treats dotted keys and nested objects as the same path", () => {
    expect(flattenDoc(hit({ "log.level": "error" }))["log.level"]).toBe("error");
    expect(flattenDoc(hit({ log: { level: "error" } }))["log.level"]).toBe("error");
  });

  it("expands JSON text fields and keeps the raw text", () => {
    const body = JSON.stringify({ amount: 10, items: [{ id: 1 }] });
    const fields = flattenDoc(hit({ context: { body } }));
    expect(fields["context.body"]).toBe(body);
    expect(fields["context.body.amount"]).toBe(10);
    expect(fields["context.body.items"]).toEqual([{ id: 1 }]);
  });

  it("keeps invalid JSON text as plain text", () => {
    const fields = flattenDoc(hit({ message: "{not json" }));
    expect(fields.message).toBe("{not json");
    expect(Object.keys(fields).filter((key) => key.startsWith("message."))).toEqual([]);
  });

  it("does not descend into JSON array text", () => {
    const fields = flattenDoc(hit({ tags: '["a","b"]' }));
    expect(fields.tags).toBe('["a","b"]');
    expect(Object.keys(fields).filter((key) => key.startsWith("tags."))).toEqual([]);
  });

  it("expands at most 5 levels of nested JSON text", () => {
    expect(flattenDoc(hit({ f: nestedJson(5) }))["f.next.next.next.next.leaf"]).toBe("x");
    const deep = flattenDoc(hit({ f: nestedJson(6) }));
    expect(deep["f.next.next.next.next.next.leaf"]).toBeUndefined();
    expect(typeof deep["f.next.next.next.next.next"]).toBe("string");
  });

  it("handles a hit without _source", () => {
    expect(flattenDoc({ _id: "x", _index: "i" })).toEqual({ _id: "x", _index: "i" });
  });
});

describe("isMissing", () => {
  it("treats only undefined, null and empty string as missing", () => {
    expect([undefined, null, ""].map(isMissing)).toEqual([true, true, true]);
    expect([0, false, " ", "x"].map(isMissing)).toEqual([false, false, false, false]);
  });
});

describe("formatValue", () => {
  it("formats primitives, primitive arrays and objects", () => {
    expect(formatValue("a")).toBe("a");
    expect(formatValue(0)).toBe("0");
    expect(formatValue(false)).toBe("false");
    expect(formatValue(["a", 1, true])).toBe("a,1,true");
    expect(formatValue([{ id: 1 }])).toBe('[{"id":1}]');
    expect(formatValue({ a: 1 })).toBe('{"a":1}');
  });
});

describe("parseJsonText", () => {
  it("parses only object or array JSON text", () => {
    expect(parseJsonText(' {"a":1} ')).toEqual({ a: 1 });
    expect(parseJsonText("[1]")).toEqual([1]);
    expect(parseJsonText("12")).toBeUndefined();
    expect(parseJsonText('"x"')).toBeUndefined();
    expect(parseJsonText("{bad")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/core/fields.test.ts`
Expected: FAIL. `src/core/fields` modülü bulunamaz.

- [ ] **Step 3: Uygula**

`src/core/types.ts`:
```ts
// Shared shapes used across core, kibana and adapters.

/** Which document an open detail view shows (spec §5). */
export interface DocIdentity {
  dataViewId: string;
  index: string;
  id: string;
}

/** The part of an Elasticsearch hit the extension uses. */
export interface RawHit {
  _id: string;
  _index: string;
  _source?: Record<string, unknown>;
}
```

`src/core/fields.ts`:
```ts
// Flattens an Elasticsearch hit into a dot-path field map (spec §7.1).
import type { RawHit } from "./types";

export type FieldMap = Record<string, unknown>;

const MAX_JSON_DEPTH = 5;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Spec §7.1: undefined, null and "" mean "no value"; 0 and false are values. */
export function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/** Primitives as text, primitive arrays joined with ",", everything else as JSON. */
export function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (
    Array.isArray(value) &&
    value.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item))
  ) {
    return value.map((item) => (item === null ? "" : String(item))).join(",");
  }
  return JSON.stringify(value);
}

/** Returns the parsed value when `text` is JSON for an object or array, otherwise undefined. */
export function parseJsonText(text: string): Record<string, unknown> | unknown[] | undefined {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return undefined;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed) || isPlainObject(parsed)) return parsed;
    return undefined;
  } catch {
    return undefined;
  }
}

export function flattenDoc(hit: RawHit): FieldMap {
  const fields: FieldMap = {};
  flattenInto(fields, "", hit._source ?? {}, 0);
  fields._id = hit._id;
  fields._index = hit._index;
  return fields;
}

function flattenInto(
  fields: FieldMap,
  prefix: string,
  object: Record<string, unknown>,
  jsonDepth: number,
): void {
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      flattenInto(fields, path, value, jsonDepth);
      continue;
    }
    fields[path] = value;
    if (typeof value === "string" && jsonDepth < MAX_JSON_DEPTH) {
      const parsed = parseJsonText(value);
      if (isPlainObject(parsed)) flattenInto(fields, path, parsed, jsonDepth + 1);
    }
  }
}
```

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npx vitest run tests/unit/core/fields.test.ts`
Expected: PASS (10 test).

- [ ] **Step 5: Commit**

```bash
git add src/core/types.ts src/core/fields.ts tests/unit/core/fields.test.ts
git commit -m "feat(core): flatten hits into a dot-path field map" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Şablon çözme

**Files:**
- Create: `src/core/template.ts`
- Test: `tests/unit/core/template.test.ts`

**Interfaces:**
- Consumes: `FieldMap`, `isMissing`, `formatValue` from `src/core/fields.ts`
- Produces:
  - `interface Placeholder { raw: string; paths: string[] }`
  - `parsePlaceholders(template: string): Placeholder[]`
  - `lookup(fields: FieldMap, paths: string[]): string | null`
  - `resolveTemplate(template: string, fields: FieldMap, encode: (value: string) => string): string | null`
  - `isHttpUrlTemplate(template: string): boolean`

- [ ] **Step 1: Başarısız testleri yaz**

`tests/unit/core/template.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { isHttpUrlTemplate, lookup, parsePlaceholders, resolveTemplate } from "../../../src/core/template";

const enc = encodeURIComponent;

describe("resolveTemplate", () => {
  it("fills a placeholder and URL-encodes special characters", () => {
    expect(resolveTemplate("https://x.test/u/{q}", { q: "a b/c#d&e?f" }, enc)).toBe(
      "https://x.test/u/a%20b%2Fc%23d%26e%3Ff",
    );
  });

  it("encodes unicode values", () => {
    expect(resolveTemplate("https://x.test/?n={name}", { name: "Çağrı ğüş" }, enc)).toBe(
      "https://x.test/?n=%C3%87a%C4%9Fr%C4%B1%20%C4%9F%C3%BC%C5%9F",
    );
  });

  it("keeps 0 and false as values", () => {
    expect(resolveTemplate("https://x.test/{n}/{f}", { n: 0, f: false }, enc)).toBe("https://x.test/0/false");
  });

  it("uses the first fallback that has a value", () => {
    expect(resolveTemplate("https://x.test/{a|b|c}", { b: "", c: "third" }, enc)).toBe("https://x.test/third");
    expect(resolveTemplate("https://x.test/{a|b}", { a: "first", b: "second" }, enc)).toBe("https://x.test/first");
  });

  it("returns null when any placeholder has no value", () => {
    expect(resolveTemplate("https://x.test/{a}/{b}", { a: "1" }, enc)).toBeNull();
    expect(resolveTemplate("https://x.test/{a|b}", { a: null }, enc)).toBeNull();
  });

  it("supports @, dash and dots in paths", () => {
    const fields = { "@timestamp": "2026-10-07T12:00:00Z", "context.headers.user-agent": "curl/8" };
    expect(resolveTemplate("https://x.test/{@timestamp}/{context.headers.user-agent}", fields, enc)).toBe(
      "https://x.test/2026-10-07T12%3A00%3A00Z/curl%2F8",
    );
  });

  it("joins primitive arrays and leaves text without placeholders unchanged", () => {
    expect(resolveTemplate("https://x.test/{tags}", { tags: ["a", "b"] }, enc)).toBe("https://x.test/a%2Cb");
    expect(resolveTemplate("https://x.test/static", {}, enc)).toBe("https://x.test/static");
  });

  it("applies the given encoder", () => {
    expect(resolveTemplate("{a}", { a: "x y" }, (value) => `<${value}>`)).toBe("<x y>");
  });
});

describe("parsePlaceholders", () => {
  it("lists placeholders with their fallback paths and ignores non-matching braces", () => {
    expect(parsePlaceholders("https://x/{a|b.c}/{@t}/{}/{a b}")).toEqual([
      { raw: "{a|b.c}", paths: ["a", "b.c"] },
      { raw: "{@t}", paths: ["@t"] },
    ]);
  });
});

describe("lookup", () => {
  it("returns the first present value as text or null", () => {
    expect(lookup({ a: "", b: 5 }, ["a", "b"])).toBe("5");
    expect(lookup({}, ["a"])).toBeNull();
  });
});

describe("isHttpUrlTemplate", () => {
  it("accepts only http and https", () => {
    expect(isHttpUrlTemplate("https://x.test/{a}")).toBe(true);
    expect(isHttpUrlTemplate("HTTP://x.test")).toBe(true);
    expect(isHttpUrlTemplate("  https://x.test")).toBe(true);
    expect(isHttpUrlTemplate("javascript:alert(1)")).toBe(false);
    expect(isHttpUrlTemplate("ftp://x.test")).toBe(false);
    expect(isHttpUrlTemplate("{url}")).toBe(false);
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/core/template.test.ts`
Expected: FAIL. `src/core/template` modülü bulunamaz.

- [ ] **Step 3: Uygula**

`src/core/template.ts`:
```ts
// Resolves {path|fallback} placeholders against a field map (spec §7.2, §7.3).
import { type FieldMap, formatValue, isMissing } from "./fields";

const PLACEHOLDER = /\{([A-Za-z0-9_.@-]+(?:\|[A-Za-z0-9_.@-]+)*)\}/g;

export interface Placeholder {
  raw: string;
  paths: string[];
}

export function parsePlaceholders(template: string): Placeholder[] {
  return [...template.matchAll(PLACEHOLDER)].map((match) => ({
    raw: match[0],
    paths: (match[1] ?? "").split("|"),
  }));
}

/** First present value among `paths`, as text; null when none has a value. */
export function lookup(fields: FieldMap, paths: string[]): string | null {
  for (const path of paths) {
    const value = fields[path];
    if (!isMissing(value)) return formatValue(value);
  }
  return null;
}

/** Fills every placeholder with `encode(value)`; null when any placeholder has no value. */
export function resolveTemplate(
  template: string,
  fields: FieldMap,
  encode: (value: string) => string,
): string | null {
  let missing = false;
  const result = template.replace(PLACEHOLDER, (_match, group: string) => {
    const value = lookup(fields, group.split("|"));
    if (value === null) {
      missing = true;
      return "";
    }
    return encode(value);
  });
  return missing ? null : result;
}

export function isHttpUrlTemplate(template: string): boolean {
  return /^https?:\/\//i.test(template.trim());
}
```

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npx vitest run tests/unit/core/template.test.ts`
Expected: PASS (11 test).

- [ ] **Step 5: Commit**

```bash
git add src/core/template.ts tests/unit/core/template.test.ts
git commit -m "feat(core): resolve {path|fallback} templates with encoding" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Koşullar, ayar modeli ve link butonları

**Files:**
- Create: `src/core/conditions.ts`, `src/core/config.ts`, `src/core/link-actions.ts`
- Test: `tests/unit/core/conditions.test.ts`, `tests/unit/core/config.test.ts`, `tests/unit/core/link-actions.test.ts`

**Interfaces:**
- Consumes: `FieldMap`, `formatValue`, `isMissing` (Task 2); `resolveTemplate`, `isHttpUrlTemplate` (Task 3)
- Produces:
  - `type ConditionOp = "exists" | "equals" | "notEquals" | "contains" | "startsWith"`
  - `interface Condition { field: string; op: ConditionOp; value?: string }`
  - `evaluateCondition(condition: Condition, fields: FieldMap): boolean`
  - `evaluateConditions(conditions: Condition[], fields: FieldMap): boolean`
  - `configSchema` (zod)
  - Ayar tipleri: `type Config`, `Environment`, `Action`, `LinkAction`, `DiscoverAction`
  - `type ParseResult = { ok: true; config: Config } | { ok: false; errors: string[] }`
  - `parseConfig(input: unknown): ParseResult`
  - `emptyConfig(): Config`
  - `DEFAULT_MASK_PATTERNS: string[]`
  - `activeEnvironment(config: Config, href: string): Environment | undefined`
  - `originPattern(kibanaUrl: string): string`
  - `actionsForEnvironment(config: Config, environmentId: string): Action[]`
  - `interface LinkButton { id: string; label: string; url: string }`
  - `buildLinkButtons(actions: Action[], fields: FieldMap): LinkButton[]`

- [ ] **Step 1: Koşul testlerini yaz**

`tests/unit/core/conditions.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { evaluateCondition, evaluateConditions } from "../../../src/core/conditions";

const fields = { level: 200, level_name: "ERROR", "user.id": "u-1", empty: "", zero: 0 };

describe("evaluateCondition", () => {
  it("exists: present and non-empty, 0 counts as present", () => {
    expect(evaluateCondition({ field: "level", op: "exists" }, fields)).toBe(true);
    expect(evaluateCondition({ field: "zero", op: "exists" }, fields)).toBe(true);
    expect(evaluateCondition({ field: "empty", op: "exists" }, fields)).toBe(false);
    expect(evaluateCondition({ field: "missing", op: "exists" }, fields)).toBe(false);
  });

  it("equals compares text and is case-sensitive", () => {
    expect(evaluateCondition({ field: "level", op: "equals", value: "200" }, fields)).toBe(true);
    expect(evaluateCondition({ field: "level_name", op: "equals", value: "error" }, fields)).toBe(false);
  });

  it("notEquals is true for a different or missing value", () => {
    expect(evaluateCondition({ field: "level_name", op: "notEquals", value: "INFO" }, fields)).toBe(true);
    expect(evaluateCondition({ field: "missing", op: "notEquals", value: "x" }, fields)).toBe(true);
    expect(evaluateCondition({ field: "level_name", op: "notEquals", value: "ERROR" }, fields)).toBe(false);
  });

  it("contains and startsWith need a value", () => {
    expect(evaluateCondition({ field: "level_name", op: "contains", value: "RR" }, fields)).toBe(true);
    expect(evaluateCondition({ field: "user.id", op: "startsWith", value: "u-" }, fields)).toBe(true);
    expect(evaluateCondition({ field: "missing", op: "contains", value: "x" }, fields)).toBe(false);
    expect(evaluateCondition({ field: "missing", op: "startsWith", value: "x" }, fields)).toBe(false);
  });
});

describe("evaluateConditions", () => {
  it("is true for no conditions and requires all conditions otherwise", () => {
    expect(evaluateConditions([], fields)).toBe(true);
    expect(
      evaluateConditions(
        [
          { field: "level", op: "exists" },
          { field: "level_name", op: "equals", value: "ERROR" },
        ],
        fields,
      ),
    ).toBe(true);
    expect(
      evaluateConditions(
        [
          { field: "level", op: "exists" },
          { field: "level_name", op: "equals", value: "INFO" },
        ],
        fields,
      ),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Ayar ve link butonu testlerini yaz**

`tests/unit/core/config.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  type Config,
  actionsForEnvironment,
  activeEnvironment,
  emptyConfig,
  originPattern,
  parseConfig,
} from "../../../src/core/config";

const validConfig = (): Config => ({
  schemaVersion: 1,
  environments: [{ id: "prod", name: "Prod", kibanaUrl: "https://kibana.example.com" }],
  actions: [
    {
      id: "admin",
      kind: "link",
      label: "Admin",
      enabled: true,
      environmentIds: [],
      conditions: [{ field: "user_id", op: "exists" }],
      urlTemplate: "https://admin.example.com/users/{user_id}",
    },
    {
      id: "same-user",
      kind: "discover",
      label: "Same user",
      enabled: true,
      environmentIds: ["prod"],
      conditions: [],
      queryTemplate: "user_id:{user_id}",
      windowMinutes: 30,
    },
  ],
  copy: { markdownFields: [], maskPatterns: ["*token*"] },
});

function errorsOf(input: unknown): string[] {
  const result = parseConfig(input);
  if (result.ok) throw new Error("expected the config to be rejected");
  return result.errors;
}

describe("parseConfig", () => {
  it("accepts a valid config and the empty config", () => {
    expect(parseConfig(validConfig())).toEqual({ ok: true, config: validConfig() });
    expect(parseConfig(emptyConfig()).ok).toBe(true);
  });

  it("rejects non-http link templates with a field path", () => {
    const config = validConfig();
    config.actions[0] = { ...config.actions[0]!, urlTemplate: "javascript:alert(1)" } as Config["actions"][number];
    expect(errorsOf(config)).toContain("actions.0.urlTemplate: must start with http:// or https://");
  });

  it("rejects duplicate ids", () => {
    const config = validConfig();
    config.actions[1] = { ...config.actions[1]!, id: "admin" };
    expect(errorsOf(config)).toContain('actions.1.id: Duplicate id "admin"');
  });

  it("rejects windowMinutes outside 1..1440 or not an integer", () => {
    for (const windowMinutes of [0, 1441, 1.5]) {
      const config = validConfig();
      config.actions[1] = { ...config.actions[1]!, windowMinutes } as Config["actions"][number];
      expect(errorsOf(config).some((error) => error.startsWith("actions.1.windowMinutes:"))).toBe(true);
    }
  });

  it("rejects invalid kibanaUrl values", () => {
    for (const kibanaUrl of ["kibana.example.com", "ftp://kibana.example.com"]) {
      const config = validConfig();
      config.environments[0] = { ...config.environments[0]!, kibanaUrl };
      expect(errorsOf(config)).toContain("environments.0.kibanaUrl: must be a valid http(s) URL");
    }
  });

  it("rejects an unknown schemaVersion", () => {
    expect(errorsOf({ ...validConfig(), schemaVersion: 2 })[0]).toMatch(/^schemaVersion: /);
  });
});

describe("activeEnvironment", () => {
  const config: Config = {
    ...emptyConfig(),
    environments: [
      { id: "root", name: "Root", kibanaUrl: "https://example.com" },
      { id: "sub", name: "Sub", kibanaUrl: "https://example.com/kibana/" },
      { id: "local", name: "Local", kibanaUrl: "http://localhost:9601" },
    ],
  };

  it("picks the environment with the longest matching base path", () => {
    expect(activeEnvironment(config, "https://example.com/kibana/app/discover#/")?.id).toBe("sub");
    expect(activeEnvironment(config, "https://example.com/app/discover#/")?.id).toBe("root");
    expect(activeEnvironment(config, "https://EXAMPLE.com/kibana2/app/discover")?.id).toBe("root");
  });

  it("matches origin exactly, including the port", () => {
    expect(activeEnvironment(config, "http://localhost:9601/app/discover")?.id).toBe("local");
    expect(activeEnvironment(config, "http://localhost:9602/app/discover")).toBeUndefined();
    expect(activeEnvironment(config, "https://example.com.evil.test/app/discover")).toBeUndefined();
  });
});

describe("originPattern", () => {
  it("builds a host permission pattern from the origin", () => {
    expect(originPattern("https://kibana.example.com/kibana")).toBe("https://kibana.example.com/*");
    expect(originPattern("http://localhost:9601")).toBe("http://localhost:9601/*");
  });
});

describe("actionsForEnvironment", () => {
  it("returns enabled actions that are global or scoped to the environment", () => {
    const config = validConfig();
    config.actions.push({ ...config.actions[0]!, id: "off", enabled: false });
    expect(actionsForEnvironment(config, "prod").map((action) => action.id)).toEqual(["admin", "same-user"]);
    expect(actionsForEnvironment(config, "staging").map((action) => action.id)).toEqual(["admin"]);
  });
});
```

`tests/unit/core/link-actions.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { Action, LinkAction } from "../../../src/core/config";
import { buildLinkButtons } from "../../../src/core/link-actions";

const link = (overrides: Partial<LinkAction> = {}): LinkAction => ({
  id: "a",
  kind: "link",
  label: "A",
  enabled: true,
  environmentIds: [],
  conditions: [],
  urlTemplate: "https://x.test/users/{user_id}",
  ...overrides,
});

describe("buildLinkButtons", () => {
  it("builds buttons with resolved, encoded URLs in action order", () => {
    const actions: Action[] = [link({ id: "a", label: "A" }), link({ id: "b", label: "B", urlTemplate: "https://y.test/?q={msg}" })];
    expect(buildLinkButtons(actions, { user_id: 7, msg: "a b" })).toEqual([
      { id: "a", label: "A", url: "https://x.test/users/7" },
      { id: "b", label: "B", url: "https://y.test/?q=a%20b" },
    ]);
  });

  it("skips disabled, discover, condition-failing and unresolved actions", () => {
    const actions: Action[] = [
      link({ id: "disabled", enabled: false }),
      {
        id: "discover",
        kind: "discover",
        label: "D",
        enabled: true,
        environmentIds: [],
        conditions: [],
        queryTemplate: "user_id:{user_id}",
      },
      link({ id: "condition", conditions: [{ field: "level", op: "equals", value: "400" }] }),
      link({ id: "unresolved", urlTemplate: "https://x.test/{missing}" }),
      link({ id: "ok" }),
    ];
    expect(buildLinkButtons(actions, { user_id: 1, level: 200 }).map((button) => button.id)).toEqual(["ok"]);
  });

  it("drops a resolved URL that is not http(s) even if the template skipped validation", () => {
    expect(buildLinkButtons([link({ urlTemplate: "{target}" })], { target: "javascript:alert(1)" })).toEqual([]);
  });
});
```

- [ ] **Step 3: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/core/conditions.test.ts tests/unit/core/config.test.ts tests/unit/core/link-actions.test.ts`
Expected: FAIL. `conditions`, `config` ve `link-actions` modülleri bulunamaz.

- [ ] **Step 4: Uygula**

`src/core/conditions.ts`:
```ts
// Action visibility conditions (spec §7.2). All conditions must hold.
import { type FieldMap, formatValue, isMissing } from "./fields";

export type ConditionOp = "exists" | "equals" | "notEquals" | "contains" | "startsWith";

export interface Condition {
  field: string;
  op: ConditionOp;
  value?: string;
}

export function evaluateCondition(condition: Condition, fields: FieldMap): boolean {
  const raw = fields[condition.field];
  if (condition.op === "exists") return !isMissing(raw);
  const text = isMissing(raw) ? undefined : formatValue(raw);
  const expected = condition.value ?? "";
  switch (condition.op) {
    case "equals":
      return text === expected;
    case "notEquals":
      return text !== expected;
    case "contains":
      return text !== undefined && text.includes(expected);
    case "startsWith":
      return text !== undefined && text.startsWith(expected);
    default:
      return false;
  }
}

export function evaluateConditions(conditions: Condition[], fields: FieldMap): boolean {
  return conditions.every((condition) => evaluateCondition(condition, fields));
}
```

`src/core/config.ts`:
```ts
// Configuration schema, validation and lookups (spec §8).
import { z } from "zod";
import { isHttpUrlTemplate } from "./template";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const conditionSchema = z.object({
  field: z.string().min(1),
  op: z.enum(["exists", "equals", "notEquals", "contains", "startsWith"]),
  value: z.string().optional(),
});

const actionBase = {
  id: z.string().min(1),
  label: z.string().min(1),
  enabled: z.boolean(),
  environmentIds: z.array(z.string()),
  conditions: z.array(conditionSchema),
};

const linkActionSchema = z.object({
  ...actionBase,
  kind: z.literal("link"),
  urlTemplate: z.string().refine(isHttpUrlTemplate, { error: "must start with http:// or https://" }),
});

const discoverActionSchema = z.object({
  ...actionBase,
  kind: z.literal("discover"),
  queryTemplate: z.string(),
  dataViewId: z.string().min(1).optional(),
  windowMinutes: z.number().int().min(1).max(1440).optional(),
});

const environmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kibanaUrl: z.string().refine(isHttpUrl, { error: "must be a valid http(s) URL" }),
});

export const configSchema = z
  .object({
    schemaVersion: z.literal(1),
    environments: z.array(environmentSchema),
    actions: z.array(z.discriminatedUnion("kind", [linkActionSchema, discoverActionSchema])),
    copy: z.object({
      markdownFields: z.array(z.string()),
      maskPatterns: z.array(z.string()),
    }),
  })
  .superRefine((config, ctx) => {
    const groups = [
      ["environments", config.environments.map((environment) => environment.id)],
      ["actions", config.actions.map((action) => action.id)],
    ] as const;
    for (const [path, ids] of groups) {
      const seen = new Set<string>();
      ids.forEach((id, index) => {
        if (seen.has(id)) {
          ctx.addIssue({ code: "custom", message: `Duplicate id "${id}"`, path: [path, index, "id"], input: id });
        }
        seen.add(id);
      });
    }
  });

export type Config = z.infer<typeof configSchema>;
export type Environment = Config["environments"][number];
export type Action = Config["actions"][number];
export type LinkAction = Extract<Action, { kind: "link" }>;
export type DiscoverAction = Extract<Action, { kind: "discover" }>;

export type ParseResult = { ok: true; config: Config } | { ok: false; errors: string[] };

export function parseConfig(input: unknown): ParseResult {
  const result = configSchema.safeParse(input);
  if (result.success) return { ok: true, config: result.data };
  return {
    ok: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`,
    ),
  };
}

export const DEFAULT_MASK_PATTERNS = ["*authorization*", "*password*", "*token*", "*secret*", "*cookie*"];

export function emptyConfig(): Config {
  return {
    schemaVersion: 1,
    environments: [],
    actions: [],
    copy: { markdownFields: [], maskPatterns: [...DEFAULT_MASK_PATTERNS] },
  };
}

/** Length of the matched base path, or -1 when `href` is not under `kibanaUrl`. */
function matchLength(kibanaUrl: string, href: string): number {
  let base: URL;
  let target: URL;
  try {
    base = new URL(kibanaUrl);
    target = new URL(href);
  } catch {
    return -1;
  }
  if (base.origin !== target.origin) return -1;
  const basePath = base.pathname.replace(/\/+$/, "");
  if (basePath === "") return 0;
  if (target.pathname === basePath || target.pathname.startsWith(`${basePath}/`)) return basePath.length;
  return -1;
}

/** Spec §8: the environment whose kibanaUrl prefixes `href`; the longest base path wins. */
export function activeEnvironment(config: Config, href: string): Environment | undefined {
  let best: Environment | undefined;
  let bestLength = -1;
  for (const environment of config.environments) {
    const length = matchLength(environment.kibanaUrl, href);
    if (length > bestLength) {
      best = environment;
      bestLength = length;
    }
  }
  return best;
}

/** Host permission pattern for an environment (spec §9). Throws on an invalid URL. */
export function originPattern(kibanaUrl: string): string {
  return `${new URL(kibanaUrl).origin}/*`;
}

export function actionsForEnvironment(config: Config, environmentId: string): Action[] {
  return config.actions.filter(
    (action) =>
      action.enabled && (action.environmentIds.length === 0 || action.environmentIds.includes(environmentId)),
  );
}
```

`src/core/link-actions.ts`:
```ts
// Turns link actions into buttons for one document (spec §7.2).
import type { Action } from "./config";
import { evaluateConditions } from "./conditions";
import type { FieldMap } from "./fields";
import { isHttpUrlTemplate, resolveTemplate } from "./template";

export interface LinkButton {
  id: string;
  label: string;
  url: string;
}

export function buildLinkButtons(actions: Action[], fields: FieldMap): LinkButton[] {
  const buttons: LinkButton[] = [];
  for (const action of actions) {
    if (action.kind !== "link" || !action.enabled) continue;
    if (!evaluateConditions(action.conditions, fields)) continue;
    const url = resolveTemplate(action.urlTemplate, fields, encodeURIComponent);
    if (url === null || !isHttpUrlTemplate(url)) continue;
    buttons.push({ id: action.id, label: action.label, url });
  }
  return buttons;
}
```

- [ ] **Step 5: Testlerin geçtiğini gör**

Run: `npx vitest run tests/unit/core && npm run typecheck`
Expected:
- PASS: conditions 5, config 10, link-actions 3 test
- önceki testler de geçer
- `tsc` hata vermez

- [ ] **Step 6: Commit**

```bash
git add src/core/conditions.ts src/core/config.ts src/core/link-actions.ts tests/unit/core
git commit -m "feat(core): add config schema, conditions and link button builder" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Kibana URL yardımcıları (önek, Discover durumu, locator)

**Files:**
- Create: `src/types/rison-node.d.ts`, `src/kibana/prefix.ts`, `src/kibana/discover-state.ts`, `src/kibana/locator.ts`
- Test: `tests/unit/kibana/prefix.test.ts`, `tests/unit/kibana/discover-state.test.ts`, `tests/unit/kibana/locator.test.ts`

**Interfaces:**
- Consumes: `DocIdentity` (Task 2)
- Produces:
  - `kibanaPrefix(pathname: string): string | null`
  - `isDiscoverPath(pathname: string): boolean`
  - `interface DiscoverAppState { index?: string; dataSource?: { type?: string; dataViewId?: string }; query?: { language?: string; query?: unknown; esql?: string } }`
  - `readAppState(hash: string): DiscoverAppState`
  - `dataViewIdFromState(state: DiscoverAppState): string | undefined`
  - `isEsqlState(state: DiscoverAppState): boolean`
  - `decodeSingleDocLocator(href: string): DocIdentity | null`
  - `parseLegacyDocHref(href: string): DocIdentity | null`

- [ ] **Step 1: Başarısız testleri yaz**

`tests/unit/kibana/prefix.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { isDiscoverPath, kibanaPrefix } from "../../../src/kibana/prefix";

describe("kibanaPrefix", () => {
  it("returns everything before /app/", () => {
    expect(kibanaPrefix("/app/discover")).toBe("");
    expect(kibanaPrefix("/kibana/app/discover")).toBe("/kibana");
    expect(kibanaPrefix("/s/team/app/discover")).toBe("/s/team");
    expect(kibanaPrefix("/kibana/s/team/app/discover")).toBe("/kibana/s/team");
  });

  it("returns null outside Kibana apps", () => {
    expect(kibanaPrefix("/login")).toBeNull();
    expect(kibanaPrefix("/")).toBeNull();
  });
});

describe("isDiscoverPath", () => {
  it("detects Discover under any prefix", () => {
    expect(isDiscoverPath("/app/discover")).toBe(true);
    expect(isDiscoverPath("/kibana/s/team/app/discover")).toBe(true);
    expect(isDiscoverPath("/app/dashboards")).toBe(false);
    expect(isDiscoverPath("/login")).toBe(false);
  });
});
```

`tests/unit/kibana/discover-state.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { dataViewIdFromState, isEsqlState, readAppState } from "../../../src/kibana/discover-state";

// Real hashes captured during the spike (7.17 percent-encodes quotes; 9.5 adds _tab).
const hash717 =
  "#/?_g=(time:(from:%272026-08-12T00:00:00.000Z%27,to:%272026-08-21T00:00:00.000Z%27))&_a=(columns:!(),filters:!(),index:%273dea60c0-bfcc-11f1-a3fe-fbd7628c7754%27,interval:auto,query:(language:kuery,query:%27%27),sort:!(!(datetime,desc)))";
const hash95 =
  "#/?_g=(time:(from:now-2d,to:now))&_a=(columns:!(),dataSource:(dataViewId:app-log,type:dataView),filters:!(),interval:auto,query:(language:kuery,query:''),sort:!(!('@timestamp',desc)))&_tab=(tabId:'6d09')";

describe("readAppState", () => {
  it("reads the 7.17 index and the 8.x/9.x dataSource", () => {
    expect(dataViewIdFromState(readAppState(hash717))).toBe("3dea60c0-bfcc-11f1-a3fe-fbd7628c7754");
    expect(dataViewIdFromState(readAppState(hash95))).toBe("app-log");
  });

  it("returns an empty state when _a is missing or unparsable", () => {
    expect(readAppState("#/doc/dv/index?id=1")).toEqual({});
    expect(readAppState("#/?_g=(time:(from:now-1d,to:now))")).toEqual({});
    expect(readAppState("#/?_a=(((")).toEqual({});
    expect(readAppState("")).toEqual({});
  });
});

describe("isEsqlState", () => {
  it("detects ES|QL mode", () => {
    expect(isEsqlState(readAppState("#/?_a=(dataSource:(type:esql),query:(esql:'FROM logs-* | LIMIT 10'))"))).toBe(true);
    expect(isEsqlState(readAppState("#/?_a=(query:(esql:'FROM logs-*'))"))).toBe(true);
    expect(isEsqlState(readAppState(hash95))).toBe(false);
  });
});
```

`tests/unit/kibana/locator.test.ts`:
```ts
import LZString from "lz-string";
import { describe, expect, it } from "vitest";
import { decodeSingleDocLocator, parseLegacyDocHref } from "../../../src/kibana/locator";

function locatorHref(params: Record<string, unknown>, locator = "DISCOVER_SINGLE_DOC_LOCATOR"): string {
  const search = new URLSearchParams({ l: locator, v: "9.5.5", lz: LZString.compressToBase64(JSON.stringify(params)) });
  return `/app/r?${search.toString()}`;
}

const params = { index: "logs", rowIndex: ".ds-logs-spike-default-2026.10.07-000001", rowId: "AbC_123-x", referrer: "/app/discover#/" };

describe("decodeSingleDocLocator", () => {
  it("decodes data view, index and id from the lz payload", () => {
    expect(decodeSingleDocLocator(locatorHref(params))).toEqual({
      dataViewId: "logs",
      index: ".ds-logs-spike-default-2026.10.07-000001",
      id: "AbC_123-x",
    });
  });

  it("accepts the uncompressed p= variant", () => {
    const href = `/app/r?l=DISCOVER_SINGLE_DOC_LOCATOR&v=8.19.23&p=${encodeURIComponent(JSON.stringify(params))}`;
    expect(decodeSingleDocLocator(href)?.id).toBe("AbC_123-x");
  });

  it("returns null for other locators, garbage and incomplete payloads", () => {
    expect(decodeSingleDocLocator(locatorHref(params, "DISCOVER_CONTEXT_APP_LOCATOR"))).toBeNull();
    expect(decodeSingleDocLocator("/app/r?l=DISCOVER_SINGLE_DOC_LOCATOR&lz=%%%")).toBeNull();
    expect(decodeSingleDocLocator(locatorHref({ index: "logs" }))).toBeNull();
    expect(decodeSingleDocLocator("not a url at all")).toBeNull();
  });
});

describe("parseLegacyDocHref", () => {
  it("reads data view, index and id from a 7.17 single-document link", () => {
    expect(parseLegacyDocHref("/app/discover#/doc/3dea60c0-x/monolog?id=AbC_123-x")).toEqual({
      dataViewId: "3dea60c0-x",
      index: "monolog",
      id: "AbC_123-x",
    });
    expect(parseLegacyDocHref("/app/discover#/doc/dv/idx?id=a%2Fb")?.id).toBe("a/b");
  });

  it("returns null for other links", () => {
    expect(parseLegacyDocHref("/app/discover#/doc/dv/idx")).toBeNull();
    expect(parseLegacyDocHref("/app/discover#/context/dv/AbC?_g=()")).toBeNull();
  });
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/kibana`
Expected: FAIL. `prefix`, `discover-state` ve `locator` modülleri bulunamaz.

- [ ] **Step 3: Uygula**

`src/types/rison-node.d.ts`:
```ts
declare module "rison-node" {
  const rison: {
    encode(value: unknown): string;
    decode(text: string): unknown;
  };
  export default rison;
}
```

`src/kibana/prefix.ts`:
```ts
// Kibana path prefix (base path + space) and Discover detection (spec §6.1).

/** Everything before "/app/": "", "/kibana", "/s/team", "/kibana/s/team". Null outside Kibana apps. */
export function kibanaPrefix(pathname: string): string | null {
  const index = pathname.indexOf("/app/");
  return index === -1 ? null : pathname.slice(0, index);
}

export function isDiscoverPath(pathname: string): boolean {
  const prefix = kibanaPrefix(pathname);
  return prefix !== null && pathname.slice(prefix.length).startsWith("/app/discover");
}
```

`src/kibana/discover-state.ts`:
```ts
// Reads Discover's app state (`_a`, rison) from the URL hash (spec §5.1).
import rison from "rison-node";

export interface DiscoverAppState {
  index?: string;
  dataSource?: { type?: string; dataViewId?: string };
  query?: { language?: string; query?: unknown; esql?: string };
}

export function readAppState(hash: string): DiscoverAppState {
  const queryStart = hash.indexOf("?");
  if (queryStart === -1) return {};
  const raw = new URLSearchParams(hash.slice(queryStart + 1)).get("_a");
  if (!raw) return {};
  try {
    const decoded = rison.decode(raw);
    return typeof decoded === "object" && decoded !== null && !Array.isArray(decoded)
      ? (decoded as DiscoverAppState)
      : {};
  } catch {
    return {};
  }
}

/** 8.x/9.x use dataSource.dataViewId; 7.17 uses index. */
export function dataViewIdFromState(state: DiscoverAppState): string | undefined {
  return state.dataSource?.dataViewId ?? state.index;
}

/** ES|QL mode has no data view, so the extension stays inactive. */
export function isEsqlState(state: DiscoverAppState): boolean {
  return state.dataSource?.type === "esql" || typeof state.query?.esql === "string";
}
```

`src/kibana/locator.ts`:
```ts
// Reads the document identity from Kibana's own links (spec §5.2, §5.3).
import LZString from "lz-string";
import type { DocIdentity } from "../core/types";

const SINGLE_DOC_LOCATOR = "DISCOVER_SINGLE_DOC_LOCATOR";

/** 8.x/9.x: "/app/r?l=DISCOVER_SINGLE_DOC_LOCATOR&lz=<lz-string base64 JSON>" (or "&p=<JSON>"). */
export function decodeSingleDocLocator(href: string): DocIdentity | null {
  let url: URL;
  try {
    url = new URL(href, "http://kibanatool.invalid");
  } catch {
    return null;
  }
  if (url.searchParams.get("l") !== SINGLE_DOC_LOCATOR) return null;
  try {
    const lz = url.searchParams.get("lz");
    const json = lz ? LZString.decompressFromBase64(lz) : url.searchParams.get("p");
    if (!json) return null;
    const params = JSON.parse(json) as { index?: unknown; rowIndex?: unknown; rowId?: unknown };
    if (
      typeof params.index === "string" &&
      typeof params.rowIndex === "string" &&
      typeof params.rowId === "string"
    ) {
      return { dataViewId: params.index, index: params.rowIndex, id: params.rowId };
    }
  } catch {
    // Unknown payload format: callers fall back to the field table.
  }
  return null;
}

/** 7.17: "View single document" href "…#/doc/<dataViewId>/<index>?id=<id>". */
export function parseLegacyDocHref(href: string): DocIdentity | null {
  const match = /#\/doc\/([^/?#]+)\/([^/?#]+)\?(.*)$/.exec(href);
  if (!match) return null;
  const id = new URLSearchParams(match[3] ?? "").get("id");
  if (!id) return null;
  try {
    return { dataViewId: decodeURIComponent(match[1] ?? ""), index: decodeURIComponent(match[2] ?? ""), id };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npx vitest run tests/unit/kibana && npm run typecheck`
Expected:
- PASS: prefix 3, discover-state 3, locator 5 test
- `tsc` hata vermez

- [ ] **Step 5: Commit**

```bash
git add src/types src/kibana tests/unit/kibana
git commit -m "feat(kibana): read prefix, Discover state and document identity links" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Kibana istemcisi

**Files:**
- Create: `src/kibana/client.ts`
- Test: `tests/unit/kibana/client.test.ts`

**Interfaces:**
- Consumes: `RawHit` (Task 2)
- Produces:
  - `type KibanaErrorKind = "forbidden" | "notFound" | "incompatible" | "server" | "network"`
  - `class KibanaError extends Error { kind: KibanaErrorKind; status?: number }`
  - `interface DataViewInfo { title: string; timeFieldName?: string }`
  - `interface KibanaClient { fetchDoc(index: string, id: string): Promise<RawHit>; getDataView(id: string): Promise<DataViewInfo>; getVersion(): Promise<string | undefined> }`
  - `type FetchFn = (input: string, init?: RequestInit) => Promise<Response>`
  - `DOC_FETCH_HEADERS`
  - `createKibanaClient(options: { prefix: string; fetch: FetchFn }): KibanaClient`

Not: Spec §10'daki tabloya `server` türü eklendi. Bir 5xx yanıtı "uyumsuz sürüm" diye göstermek yanıltıcı olur. Bu türün mesajı Task 9'da tanımlanacak.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/unit/kibana/client.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { KibanaError, createKibanaClient } from "../../../src/kibana/client";

interface Call {
  url: string;
  init?: RequestInit;
}

function fakeFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetch = async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url, init });
    return handler(url, init);
  };
  return { fetch, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const HIT = { _id: "abc", _index: "app_log", _source: { user_id: 7 } };
const searchOk = () => json({ rawResponse: { hits: { hits: [HIT] } } });

async function kindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "resolved";
  } catch (error) {
    return error instanceof KibanaError ? error.kind : "other";
  }
}

describe("fetchDoc", () => {
  it("sends the verified universal request under the prefix", async () => {
    const { fetch, calls } = fakeFetch(searchOk);
    const client = createKibanaClient({ prefix: "/kibana/s/team", fetch });
    await expect(client.fetchDoc("app_log", "abc")).resolves.toEqual(HIT);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("/kibana/s/team/internal/search/es");
    expect(calls[0]!.init).toMatchObject({
      method: "POST",
      credentials: "same-origin",
      headers: {
        "kbn-xsrf": "kibanatool",
        "x-elastic-internal-origin": "Kibana",
        "content-type": "application/json",
      },
    });
    expect(JSON.parse(String(calls[0]!.init!.body))).toEqual({
      params: { index: "app_log", body: { size: 1, query: { ids: { values: ["abc"] } } } },
    });
  });

  it("caches successful lookups but not failures", async () => {
    let attempt = 0;
    const { fetch, calls } = fakeFetch(() => (attempt++ === 0 ? json({}, 500) : searchOk()));
    const client = createKibanaClient({ prefix: "", fetch });
    expect(await kindOf(client.fetchDoc("app_log", "abc"))).toBe("server");
    await expect(client.fetchDoc("app_log", "abc")).resolves.toEqual(HIT);
    await expect(client.fetchDoc("app_log", "abc")).resolves.toEqual(HIT);
    expect(calls).toHaveLength(2);
  });

  it("maps HTTP failures to error kinds", async () => {
    for (const [status, kind] of [
      [401, "forbidden"],
      [403, "forbidden"],
      [400, "incompatible"],
      [404, "incompatible"],
      [502, "server"],
    ] as const) {
      const { fetch } = fakeFetch(() => json({ message: "x" }, status));
      expect(await kindOf(createKibanaClient({ prefix: "", fetch }).fetchDoc("i", "d"))).toBe(kind);
    }
  });

  it("reports notFound for empty hits and network for a thrown fetch", async () => {
    const empty = fakeFetch(() => json({ rawResponse: { hits: { hits: [] } } }));
    expect(await kindOf(createKibanaClient({ prefix: "", fetch: empty.fetch }).fetchDoc("i", "d"))).toBe("notFound");
    const offline = fakeFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    expect(await kindOf(createKibanaClient({ prefix: "", fetch: offline.fetch }).fetchDoc("i", "d"))).toBe("network");
  });
});

describe("getDataView", () => {
  it("uses /api/data_views on 8.x/9.x", async () => {
    const { fetch, calls } = fakeFetch(() => json({ data_view: { title: "app_log", timeFieldName: "datetime" } }));
    const client = createKibanaClient({ prefix: "/s/team", fetch });
    await expect(client.getDataView("app-log")).resolves.toEqual({ title: "app_log", timeFieldName: "datetime" });
    expect(calls.map((call) => call.url)).toEqual(["/s/team/api/data_views/data_view/app-log"]);
  });

  it("falls back to /api/index_patterns on 404 (7.17) and drops an empty time field", async () => {
    const { fetch, calls } = fakeFetch((url) =>
      url.includes("/api/data_views/") ? json({ message: "Not Found" }, 404) : json({ index_pattern: { title: "*_log", timeFieldName: "" } }),
    );
    const client = createKibanaClient({ prefix: "", fetch });
    await expect(client.getDataView("all logs")).resolves.toEqual({ title: "*_log", timeFieldName: undefined });
    expect(calls.map((call) => call.url)).toEqual([
      "/api/data_views/data_view/all%20logs",
      "/api/index_patterns/index_pattern/all%20logs",
    ]);
  });
});

describe("getVersion", () => {
  it("reads version.number and returns undefined on failure", async () => {
    const ok = fakeFetch(() => json({ version: { number: "9.5.5" } }));
    await expect(createKibanaClient({ prefix: "", fetch: ok.fetch }).getVersion()).resolves.toBe("9.5.5");
    const failing = fakeFetch(() => json({}, 503));
    await expect(createKibanaClient({ prefix: "", fetch: failing.fetch }).getVersion()).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/kibana/client.test.ts`
Expected: FAIL. `src/kibana/client` modülü bulunamaz.

- [ ] **Step 3: Uygula**

`src/kibana/client.ts`:
```ts
// Talks to the user's Kibana with the user's own session (spec §6).
import type { RawHit } from "../core/types";

export type KibanaErrorKind = "forbidden" | "notFound" | "incompatible" | "server" | "network";

export class KibanaError extends Error {
  constructor(
    readonly kind: KibanaErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "KibanaError";
  }
}

export interface DataViewInfo {
  title: string;
  timeFieldName?: string;
}

export interface KibanaClient {
  fetchDoc(index: string, id: string): Promise<RawHit>;
  getDataView(id: string): Promise<DataViewInfo>;
  getVersion(): Promise<string | undefined>;
}

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

/** Verified on 7.17.29, 8.15.3, 8.19.23 and 9.5.5 (9.x requires x-elastic-internal-origin). */
export const DOC_FETCH_HEADERS = {
  "kbn-xsrf": "kibanatool",
  "x-elastic-internal-origin": "Kibana",
  "content-type": "application/json",
};

function errorFor(status: number): KibanaError {
  if (status === 401 || status === 403) return new KibanaError("forbidden", `HTTP ${status}`, status);
  if (status === 400 || status === 404) return new KibanaError("incompatible", `HTTP ${status}`, status);
  return new KibanaError("server", `HTTP ${status}`, status);
}

export function createKibanaClient(options: { prefix: string; fetch: FetchFn }): KibanaClient {
  const { prefix, fetch } = options;
  const docs = new Map<string, Promise<RawHit>>();
  const dataViews = new Map<string, Promise<DataViewInfo>>();

  async function request(path: string, init?: RequestInit): Promise<Response> {
    try {
      return await fetch(prefix + path, { credentials: "same-origin", ...init });
    } catch {
      throw new KibanaError("network", "Kibana is unreachable");
    }
  }

  /** Caches by key; a failed lookup is evicted so the next call retries. */
  function cached<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
    let pending = cache.get(key);
    if (!pending) {
      pending = load();
      cache.set(key, pending);
      pending.catch(() => cache.delete(key));
    }
    return pending;
  }

  async function loadDoc(index: string, id: string): Promise<RawHit> {
    const response = await request("/internal/search/es", {
      method: "POST",
      headers: DOC_FETCH_HEADERS,
      body: JSON.stringify({ params: { index, body: { size: 1, query: { ids: { values: [id] } } } } }),
    });
    if (!response.ok) throw errorFor(response.status);
    const body = (await response.json()) as { rawResponse?: { hits?: { hits?: RawHit[] } } };
    const hit = body.rawResponse?.hits?.hits?.[0];
    if (!hit) throw new KibanaError("notFound", "Document not found");
    return hit;
  }

  async function loadDataView(id: string): Promise<DataViewInfo> {
    const encoded = encodeURIComponent(id);
    let response = await request(`/api/data_views/data_view/${encoded}`);
    if (response.status === 404) response = await request(`/api/index_patterns/index_pattern/${encoded}`);
    if (!response.ok) throw errorFor(response.status);
    const body = (await response.json()) as {
      data_view?: { title?: string; timeFieldName?: string };
      index_pattern?: { title?: string; timeFieldName?: string };
    };
    const view = body.data_view ?? body.index_pattern;
    if (!view?.title) throw new KibanaError("incompatible", "Unexpected data view response");
    return { title: view.title, timeFieldName: view.timeFieldName || undefined };
  }

  return {
    fetchDoc: (index, id) => cached(docs, `${index}/${id}`, () => loadDoc(index, id)),
    getDataView: (id) => cached(dataViews, id, () => loadDataView(id)),
    async getVersion() {
      try {
        const response = await request("/api/status");
        if (!response.ok) return undefined;
        const body = (await response.json()) as { version?: { number?: string } };
        return body.version?.number;
      } catch {
        return undefined;
      }
    },
  };
}
```

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npx vitest run tests/unit/kibana/client.test.ts && npm run typecheck`
Expected:
- PASS (7 test)
- `tsc` hata vermez

- [ ] **Step 5: Commit**

```bash
git add src/kibana/client.ts tests/unit/kibana/client.test.ts
git commit -m "feat(kibana): fetch raw docs and data views with typed errors and caching" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Sayfa adaptörleri

**Files:**
- Create: `src/adapters/types.ts`, `src/adapters/legacy-table.ts`, `src/adapters/data-grid.ts`, `src/adapters/detect.ts`
- Test: `tests/unit/adapters/legacy-table.test.ts`, `tests/unit/adapters/data-grid.test.ts`, `tests/unit/adapters/detect.test.ts`

**Interfaces:**
- Consumes:
  - `DocIdentity` (Task 2)
  - `parseLegacyDocHref`, `decodeSingleDocLocator`, `isDiscoverPath`, `readAppState`, `isEsqlState`, `dataViewIdFromState` (Task 5)
- Produces:
  - `interface DetailView { container: Element; anchor: Element; position: "before" | "after"; identity: DocIdentity | null }`
  - `findLegacyDetailViews(root: ParentNode, fallbackDataViewId: string | undefined): DetailView[]`
  - `findDataGridDetailViews(root: ParentNode, fallbackDataViewId: string | undefined): DetailView[]`
  - `findDetailViews(doc: Document, location: { pathname: string; hash: string }): DetailView[]`

Tasarım notu (spec §5.1): `detect` iki bulucuyu da çalıştırır, sayfada hangi öğeler varsa o bulucu sonuç döndürür. Bu, sürüm numarasına bakmadan yapılan özellik tespitinin en basit hali.

Test HTML'leri spike'ta doğrulanan `data-test-subj` yapısını taklit eder. Gerçek sürümlerden kaydedilen HTML örnekleri Plan 3'te eklenecek.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/unit/adapters/legacy-table.test.ts`:
```ts
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { findLegacyDetailViews } from "../../../src/adapters/legacy-table";

function row(id: string, options: { expanded: boolean; link?: boolean; index?: string }): string {
  const index = options.index ?? "monolog";
  const details = options.expanded
    ? `<td colspan="2">
         <div>
           <a href="/app/discover#/context/dv-1/${id}?_g=()">View surrounding documents</a>
           ${options.link === false ? "" : `<a href="/app/discover#/doc/dv-1/${index}?id=${id}">View single document</a>`}
         </div>
         <div data-test-subj="kbnDocViewer">
           <div data-test-subj="tableDocViewRow-_id"><span data-test-subj="tableDocViewRow-_id-value">${id}</span></div>
           <div data-test-subj="tableDocViewRow-_index"><span data-test-subj="tableDocViewRow-_index-value">${index}</span></div>
         </div>
       </td>`
    : `<td colspan="2"></td>`;
  return `<tr data-test-subj="docTableRow"><td data-test-subj="docTableExpandToggleColumn"></td><td data-test-subj="docTableField">summary ${id}</td></tr>
          <tr data-test-subj="docTableDetailsRow">${details}</tr>`;
}

function render(rows: string[]): void {
  document.body.innerHTML = `<table data-test-subj="docTable"><tbody>${rows.join("")}</tbody></table>`;
}

describe("findLegacyDetailViews", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns one view per expanded row with its own identity", () => {
    render([row("A1", { expanded: true }), row("B2", { expanded: false }), row("C3", { expanded: true, index: "user_action_log" })]);
    const views = findLegacyDetailViews(document, undefined);
    expect(views.map((view) => view.identity)).toEqual([
      { dataViewId: "dv-1", index: "monolog", id: "A1" },
      { dataViewId: "dv-1", index: "user_action_log", id: "C3" },
    ]);
  });

  it("anchors the bar before the doc viewer inside the details row", () => {
    render([row("A1", { expanded: true })]);
    const [view] = findLegacyDetailViews(document, undefined);
    expect(view!.container.getAttribute("data-test-subj")).toBe("docTableDetailsRow");
    expect(view!.anchor.getAttribute("data-test-subj")).toBe("kbnDocViewer");
    expect(view!.position).toBe("before");
  });

  it("falls back to the _id/_index rows and the URL data view when the link is missing", () => {
    render([row("A1", { expanded: true, link: false })]);
    expect(findLegacyDetailViews(document, "dv-from-url")[0]!.identity).toEqual({
      dataViewId: "dv-from-url",
      index: "monolog",
      id: "A1",
    });
    expect(findLegacyDetailViews(document, undefined)[0]!.identity).toBeNull();
  });
});
```

`tests/unit/adapters/data-grid.test.ts`:
```ts
// @vitest-environment happy-dom
import LZString from "lz-string";
import { beforeEach, describe, expect, it } from "vitest";
import { findDataGridDetailViews } from "../../../src/adapters/data-grid";

interface Identity {
  dataViewId: string;
  index: string;
  id: string;
}

function locatorHref(identity: Identity): string {
  const payload = { index: identity.dataViewId, rowIndex: identity.index, rowId: identity.id, referrer: "/app/discover#/" };
  const search = new URLSearchParams({ l: "DISCOVER_SINGLE_DOC_LOCATOR", v: "9.5.5", lz: LZString.compressToBase64(JSON.stringify(payload)) });
  return `/app/r?${search.toString()}`;
}

function flyout(options: { identity?: Identity; tableRows?: Identity; actions?: boolean }): string {
  const actions =
    options.actions === false
      ? ""
      : `<div data-test-subj="docViewerFlyoutActions">
           ${options.identity ? `<a data-test-subj="docTableRowAction" href="${locatorHref(options.identity)}"></a>` : ""}
         </div>`;
  const rows = options.tableRows
    ? `<div data-test-subj="tableDocViewRow-_id-value">${options.tableRows.id}</div>
       <div data-test-subj="tableDocViewRow-_index-value">${options.tableRows.index}</div>`
    : `<div data-test-subj="unifiedDocViewLogsOverview">Log overview</div>`;
  return `<div data-test-subj="docViewerFlyout">${actions}<div data-test-subj="kbnDocViewer">${rows}</div></div>`;
}

const A = { dataViewId: "logs", index: ".ds-logs-a-2026.10.07-000001", id: "AAA" };
const B = { dataViewId: "logs", index: ".ds-logs-a-2026.10.07-000001", id: "BBB" };

describe("findDataGridDetailViews", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("reads the identity from the single-document locator link and anchors after the actions", () => {
    document.body.innerHTML = flyout({ identity: A, tableRows: A });
    const [view] = findDataGridDetailViews(document, undefined);
    expect(view!.identity).toEqual(A);
    expect(view!.anchor.getAttribute("data-test-subj")).toBe("docViewerFlyoutActions");
    expect(view!.position).toBe("after");
  });

  it("works on the Observability 'Log overview' tab where the field table is absent", () => {
    document.body.innerHTML = flyout({ identity: A });
    expect(findDataGridDetailViews(document, undefined)[0]!.identity).toEqual(A);
  });

  it("returns the new identity after next/prev navigation in the same flyout", () => {
    document.body.innerHTML = flyout({ identity: A, tableRows: A });
    const container = findDataGridDetailViews(document, undefined)[0]!.container;
    document.querySelector('[data-test-subj="docTableRowAction"]')!.setAttribute("href", locatorHref(B));
    const [view] = findDataGridDetailViews(document, undefined);
    expect(view!.container).toBe(container);
    expect(view!.identity).toEqual(B);
  });

  it("falls back to the field table plus the URL data view, and anchors before the viewer without actions", () => {
    document.body.innerHTML = flyout({ actions: false, tableRows: A });
    const [view] = findDataGridDetailViews(document, "dv-from-url");
    expect(view!.identity).toEqual({ dataViewId: "dv-from-url", index: A.index, id: "AAA" });
    expect(view!.anchor.getAttribute("data-test-subj")).toBe("kbnDocViewer");
    expect(view!.position).toBe("before");
  });

  it("returns a null identity when nothing identifies the document", () => {
    document.body.innerHTML = flyout({ actions: false });
    expect(findDataGridDetailViews(document, "dv")[0]!.identity).toBeNull();
  });
});
```

`tests/unit/adapters/detect.test.ts`:
```ts
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { findDetailViews } from "../../../src/adapters/detect";

const legacy = `<table><tbody><tr data-test-subj="docTableDetailsRow"><td>
  <a href="/app/discover#/doc/dv-1/monolog?id=L1">View single document</a>
  <div data-test-subj="kbnDocViewer"></div></td></tr></tbody></table>`;

describe("findDetailViews", () => {
  beforeEach(() => {
    document.body.innerHTML = legacy;
  });

  it("finds views only on Discover", () => {
    expect(findDetailViews(document, { pathname: "/s/team/app/discover", hash: "#/" })).toHaveLength(1);
    expect(findDetailViews(document, { pathname: "/app/dashboards", hash: "#/" })).toEqual([]);
  });

  it("stays inactive in ES|QL mode", () => {
    expect(findDetailViews(document, { pathname: "/app/discover", hash: "#/?_a=(query:(esql:'FROM logs-*'))" })).toEqual([]);
  });

  it("passes the URL data view as the fallback", () => {
    document.body.innerHTML = `<table><tbody><tr data-test-subj="docTableDetailsRow"><td>
      <div data-test-subj="kbnDocViewer">
        <span data-test-subj="tableDocViewRow-_id-value">L2</span>
        <span data-test-subj="tableDocViewRow-_index-value">monolog</span>
      </div></td></tr></tbody></table>`;
    const views = findDetailViews(document, { pathname: "/app/discover", hash: "#/?_a=(index:'dv-url')" });
    expect(views[0]!.identity).toEqual({ dataViewId: "dv-url", index: "monolog", id: "L2" });
  });
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/adapters`
Expected: FAIL. Adaptör modülleri bulunamaz.

- [ ] **Step 3: Uygula**

`src/adapters/types.ts`:
```ts
import type { DocIdentity } from "../core/types";

/** One open document detail view (spec §5.1). */
export interface DetailView {
  /** Stable element for the view's lifetime: the 7.17 details row or the 8.x/9.x flyout. */
  container: Element;
  /** The bar host is inserted next to this element. */
  anchor: Element;
  position: "before" | "after";
  /** Null when nothing on the page identifies the document; no bar is shown then. */
  identity: DocIdentity | null;
}
```

`src/adapters/legacy-table.ts`:
```ts
// Kibana 7.17 legacy doc table: expanded rows (spec §5.2).
import type { DocIdentity } from "../core/types";
import { parseLegacyDocHref } from "../kibana/locator";
import type { DetailView } from "./types";

export function findLegacyDetailViews(root: ParentNode, fallbackDataViewId: string | undefined): DetailView[] {
  return [...root.querySelectorAll('[data-test-subj="docTableDetailsRow"]')].flatMap((row) => {
    const viewer = row.querySelector('[data-test-subj="kbnDocViewer"]');
    if (!viewer) return [];
    return [{ container: row, anchor: viewer, position: "before" as const, identity: legacyIdentity(row, fallbackDataViewId) }];
  });
}

function legacyIdentity(row: Element, fallbackDataViewId: string | undefined): DocIdentity | null {
  for (const link of row.querySelectorAll("a[href]")) {
    const identity = parseLegacyDocHref(link.getAttribute("href") ?? "");
    if (identity) return identity;
  }
  return identityFromFieldTable(row, fallbackDataViewId);
}

export function identityFromFieldTable(root: Element, fallbackDataViewId: string | undefined): DocIdentity | null {
  const id = textOf(root, "tableDocViewRow-_id-value");
  const index = textOf(root, "tableDocViewRow-_index-value");
  return id && index && fallbackDataViewId ? { dataViewId: fallbackDataViewId, index, id } : null;
}

function textOf(root: Element, subject: string): string | undefined {
  return root.querySelector(`[data-test-subj="${subject}"]`)?.textContent?.trim() || undefined;
}
```

`src/adapters/data-grid.ts`:
```ts
// Kibana 8.x/9.x data grid: the document flyout (spec §5.3).
import type { DocIdentity } from "../core/types";
import { decodeSingleDocLocator } from "../kibana/locator";
import { identityFromFieldTable } from "./legacy-table";
import type { DetailView } from "./types";

export function findDataGridDetailViews(root: ParentNode, fallbackDataViewId: string | undefined): DetailView[] {
  return [...root.querySelectorAll('[data-test-subj="docViewerFlyout"]')].flatMap((flyout) => {
    const actions = flyout.querySelector('[data-test-subj="docViewerFlyoutActions"]');
    const viewer = flyout.querySelector('[data-test-subj="kbnDocViewer"]');
    const anchor = actions ?? viewer;
    if (!anchor) return [];
    return [
      {
        container: flyout,
        anchor,
        position: actions ? ("after" as const) : ("before" as const),
        identity: gridIdentity(flyout, fallbackDataViewId),
      },
    ];
  });
}

function gridIdentity(flyout: Element, fallbackDataViewId: string | undefined): DocIdentity | null {
  for (const link of flyout.querySelectorAll('a[href*="DISCOVER_SINGLE_DOC_LOCATOR"]')) {
    const identity = decodeSingleDocLocator(link.getAttribute("href") ?? "");
    if (identity) return identity;
  }
  return identityFromFieldTable(flyout, fallbackDataViewId);
}
```

`src/adapters/detect.ts`:
```ts
// Finds open detail views on a Discover page, whatever the Kibana version (spec §5.1).
import { dataViewIdFromState, isEsqlState, readAppState } from "../kibana/discover-state";
import { isDiscoverPath } from "../kibana/prefix";
import { findDataGridDetailViews } from "./data-grid";
import { findLegacyDetailViews } from "./legacy-table";
import type { DetailView } from "./types";

export function findDetailViews(doc: Document, location: { pathname: string; hash: string }): DetailView[] {
  if (!isDiscoverPath(location.pathname)) return [];
  const state = readAppState(location.hash);
  if (isEsqlState(state)) return [];
  const fallback = dataViewIdFromState(state);
  return [...findLegacyDetailViews(doc, fallback), ...findDataGridDetailViews(doc, fallback)];
}
```

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npx vitest run tests/unit/adapters && npm run typecheck`
Expected:
- PASS: legacy-table 3, data-grid 5, detect 3 test
- `tsc` hata vermez

- [ ] **Step 5: Commit**

```bash
git add src/adapters tests/unit/adapters
git commit -m "feat(adapters): find open detail views on 7.17 tables and 8.x/9.x flyouts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Ayar deposu ve background kaydı

**Files:**
- Create: `src/storage.ts`, `src/background/registration.ts`
- Modify: `entrypoints/background.ts`
- Test: `tests/unit/storage.test.ts`, `tests/unit/background/registration.test.ts`

**Interfaces:**
- Consumes: `Config`, `emptyConfig`, `parseConfig`, `originPattern` (Task 4)
- Produces:
  - `CONFIG_KEY = "kibanatool.config"`
  - `interface StorageAreaLike { get(key: string): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void> }`
  - `interface LoadedConfig { config: Config; errors: string[] }`
  - `createConfigStore(area: StorageAreaLike): { load(): Promise<LoadedConfig>; save(config: Config): Promise<void> }`
  - `isConfigChange(changes: Record<string, unknown>, areaName: string): boolean`
  - `CONTENT_SCRIPT_ID = "kibanatool"`, `CONTENT_SCRIPT_FILE = "kibana.js"`
  - `syncContentScripts(config: Config, deps: { scripting: ScriptingLike; permissions: PermissionsLike }): Promise<string[]>`

- [ ] **Step 1: Başarısız testleri yaz**

`tests/unit/storage.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { type Config, emptyConfig } from "../../src/core/config";
import { CONFIG_KEY, createConfigStore, isConfigChange } from "../../src/storage";

function fakeArea(initial: Record<string, unknown> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    async get(key: string) {
      return data.has(key) ? { [key]: data.get(key) } : {};
    },
    async set(items: Record<string, unknown>) {
      for (const [key, value] of Object.entries(items)) data.set(key, value);
    },
  };
}

const config: Config = {
  ...emptyConfig(),
  environments: [{ id: "local", name: "Local", kibanaUrl: "http://localhost:9601" }],
};

describe("createConfigStore", () => {
  it("loads the empty config when nothing is stored", async () => {
    await expect(createConfigStore(fakeArea()).load()).resolves.toEqual({ config: emptyConfig(), errors: [] });
  });

  it("round-trips a saved config under kibanatool.config", async () => {
    const area = fakeArea();
    const store = createConfigStore(area);
    await store.save(config);
    expect(area.data.get(CONFIG_KEY)).toEqual(config);
    await expect(store.load()).resolves.toEqual({ config, errors: [] });
  });

  it("falls back to the empty config and reports errors for a corrupt stored value", async () => {
    const loaded = await createConfigStore(fakeArea({ [CONFIG_KEY]: { schemaVersion: 99 } })).load();
    expect(loaded.config).toEqual(emptyConfig());
    expect(loaded.errors.length).toBeGreaterThan(0);
  });

  it("refuses to save an invalid config", async () => {
    const area = fakeArea();
    const invalid = { ...config, environments: [{ id: "x", name: "X", kibanaUrl: "nope" }] };
    await expect(createConfigStore(area).save(invalid)).rejects.toThrow(/Invalid config/);
    expect(area.data.has(CONFIG_KEY)).toBe(false);
  });
});

describe("isConfigChange", () => {
  it("is true only for the config key in local storage", () => {
    expect(isConfigChange({ [CONFIG_KEY]: {} }, "local")).toBe(true);
    expect(isConfigChange({ other: {} }, "local")).toBe(false);
    expect(isConfigChange({ [CONFIG_KEY]: {} }, "sync")).toBe(false);
  });
});
```

`tests/unit/background/registration.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { type Config, emptyConfig } from "../../../src/core/config";
import { CONTENT_SCRIPT_FILE, CONTENT_SCRIPT_ID, syncContentScripts } from "../../../src/background/registration";

function fakes(options: { granted: string[]; registered?: boolean }) {
  const calls: string[] = [];
  let lastScripts: unknown[] = [];
  const scripting = {
    async getRegisteredContentScripts() {
      return options.registered ? [{ id: CONTENT_SCRIPT_ID, matches: ["http://old/*"] }] : [];
    },
    async registerContentScripts(scripts: unknown[]) {
      calls.push("register");
      lastScripts = scripts;
    },
    async updateContentScripts(scripts: unknown[]) {
      calls.push("update");
      lastScripts = scripts;
    },
    async unregisterContentScripts() {
      calls.push("unregister");
    },
  };
  const permissions = {
    async contains(request: { origins: string[] }) {
      return request.origins.every((origin) => options.granted.includes(origin));
    },
  };
  return { scripting, permissions, calls, lastScripts: () => lastScripts };
}

const config: Config = {
  ...emptyConfig(),
  environments: [
    { id: "a", name: "A", kibanaUrl: "https://kibana.example.com" },
    { id: "b", name: "B", kibanaUrl: "https://kibana.example.com/other" },
    { id: "c", name: "C", kibanaUrl: "http://localhost:9601" },
  ],
};

describe("syncContentScripts", () => {
  it("registers the content script for granted origins only, deduplicated", async () => {
    const deps = fakes({ granted: ["https://kibana.example.com/*"] });
    await expect(syncContentScripts(config, deps)).resolves.toEqual(["https://kibana.example.com/*"]);
    expect(deps.calls).toEqual(["register"]);
    expect(deps.lastScripts()).toEqual([
      {
        id: CONTENT_SCRIPT_ID,
        matches: ["https://kibana.example.com/*"],
        js: [CONTENT_SCRIPT_FILE],
        runAt: "document_idle",
        persistAcrossSessions: true,
      },
    ]);
  });

  it("updates an existing registration", async () => {
    const deps = fakes({ granted: ["https://kibana.example.com/*", "http://localhost:9601/*"], registered: true });
    await syncContentScripts(config, deps);
    expect(deps.calls).toEqual(["update"]);
  });

  it("unregisters when no origin is granted and does nothing when nothing was registered", async () => {
    const registered = fakes({ granted: [], registered: true });
    await expect(syncContentScripts(config, registered)).resolves.toEqual([]);
    expect(registered.calls).toEqual(["unregister"]);
    const fresh = fakes({ granted: [] });
    await syncContentScripts(config, fresh);
    expect(fresh.calls).toEqual([]);
  });
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/storage.test.ts tests/unit/background`
Expected: FAIL. `storage` ve `registration` modülleri bulunamaz.

- [ ] **Step 3: Uygula**

`src/storage.ts`:
```ts
// The single access point to stored configuration (spec §8, §10).
import { type Config, emptyConfig, parseConfig } from "./core/config";

export const CONFIG_KEY = "kibanatool.config";

export interface StorageAreaLike {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export interface LoadedConfig {
  config: Config;
  /** Validation errors of a corrupt stored config; the empty config is used then. */
  errors: string[];
}

export function createConfigStore(area: StorageAreaLike) {
  return {
    async load(): Promise<LoadedConfig> {
      const stored = (await area.get(CONFIG_KEY))[CONFIG_KEY];
      if (stored === undefined) return { config: emptyConfig(), errors: [] };
      const parsed = parseConfig(stored);
      return parsed.ok ? { config: parsed.config, errors: [] } : { config: emptyConfig(), errors: parsed.errors };
    },
    async save(config: Config): Promise<void> {
      const parsed = parseConfig(config);
      if (!parsed.ok) throw new Error(`Invalid config: ${parsed.errors.join("; ")}`);
      await area.set({ [CONFIG_KEY]: parsed.config });
    },
  };
}

export function isConfigChange(changes: Record<string, unknown>, areaName: string): boolean {
  return areaName === "local" && CONFIG_KEY in changes;
}
```

`src/background/registration.ts`:
```ts
// Keeps the runtime content script registration in sync with environments and granted permissions (spec §9).
import { type Config, originPattern } from "../core/config";

export const CONTENT_SCRIPT_ID = "kibanatool";
export const CONTENT_SCRIPT_FILE = "kibana.js";

export interface RegisteredScript {
  id: string;
  matches: string[];
  js: string[];
  runAt: "document_idle";
  persistAcrossSessions: boolean;
}

export interface ScriptingLike {
  getRegisteredContentScripts(filter?: { ids?: string[] }): Promise<Array<{ id: string }>>;
  registerContentScripts(scripts: RegisteredScript[]): Promise<void>;
  updateContentScripts(scripts: RegisteredScript[]): Promise<void>;
  unregisterContentScripts(filter?: { ids?: string[] }): Promise<void>;
}

export interface PermissionsLike {
  contains(permissions: { origins: string[] }): Promise<boolean>;
}

async function grantedPatterns(config: Config, permissions: PermissionsLike): Promise<string[]> {
  const patterns = [...new Set(config.environments.map((environment) => originPattern(environment.kibanaUrl)))];
  const granted: string[] = [];
  for (const pattern of patterns) {
    if (await permissions.contains({ origins: [pattern] })) granted.push(pattern);
  }
  return granted.sort();
}

/** Registers, updates or removes the content script; returns the origins it now runs on. */
export async function syncContentScripts(
  config: Config,
  deps: { scripting: ScriptingLike; permissions: PermissionsLike },
): Promise<string[]> {
  const matches = await grantedPatterns(config, deps.permissions);
  const registered = await deps.scripting.getRegisteredContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  const exists = registered.some((script) => script.id === CONTENT_SCRIPT_ID);
  if (matches.length === 0) {
    if (exists) await deps.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
    return matches;
  }
  const script: RegisteredScript = {
    id: CONTENT_SCRIPT_ID,
    matches,
    js: [CONTENT_SCRIPT_FILE],
    runAt: "document_idle",
    persistAcrossSessions: true,
  };
  if (exists) await deps.scripting.updateContentScripts([script]);
  else await deps.scripting.registerContentScripts([script]);
  return matches;
}
```

`entrypoints/background.ts` dosyasının tamamını şununla değiştir:
```ts
import { defineBackground } from "#imports";
import { browser } from "wxt/browser";
import { syncContentScripts } from "../src/background/registration";
import { createConfigStore, isConfigChange } from "../src/storage";

export default defineBackground(() => {
  const store = createConfigStore(browser.storage.local);

  const sync = async (): Promise<void> => {
    try {
      const { config } = await store.load();
      await syncContentScripts(config, { scripting: browser.scripting, permissions: browser.permissions });
    } catch (error) {
      console.error("[kibanatool] content script sync failed", error);
    }
  };

  browser.runtime.onInstalled.addListener(() => void sync());
  browser.runtime.onStartup.addListener(() => void sync());
  browser.permissions.onAdded.addListener(() => void sync());
  browser.permissions.onRemoved.addListener(() => void sync());
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (isConfigChange(changes, areaName)) void sync();
  });
  browser.action.onClicked.addListener(() => void browser.runtime.openOptionsPage());
});
```

- [ ] **Step 4: Testlerin, tip kontrolünün ve derlemenin geçtiğini gör**

Run: `npx vitest run tests/unit/storage.test.ts tests/unit/background && npm run typecheck && npm run build && npm run check:manifest`
Expected:
- PASS: storage 5, registration 3 test
- `tsc` hata vermez
- `Manifest check passed`

`tsc`, `browser.scripting` ya da `browser.permissions` nesnesinin `ScriptingLike`/`PermissionsLike` arayüzüne uymadığını söylerse: arayüzü Chrome tiplerine göre gevşet, örneğin `getRegisteredContentScripts` dönüşünü `Promise<Array<{ id: string }>>` olarak bırak, parametre tiplerini Chrome'unkine eşitle. Çağrı yerinde `as` ile tip dönüştürme kullanma.

- [ ] **Step 5: Commit**

```bash
git add src/storage.ts src/background tests/unit/storage.test.ts tests/unit/background entrypoints/background.ts
git commit -m "feat(background): register the content script for granted Kibana origins" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: İçerik betiği ve aksiyon çubuğu

**Files:**
- Create: `src/content/mounts.ts`, `src/content/styles.ts`, `src/content/ActionBar.tsx`, `src/i18n.ts`
- Modify: `entrypoints/kibana.ts`, `public/_locales/en/messages.json`, `public/_locales/tr/messages.json`
- Test: `tests/unit/content/mounts.test.ts`

**Interfaces:**
- Consumes:
  - `DetailView`, `findDetailViews` (Task 7)
  - `createKibanaClient`, `KibanaClient`, `KibanaError` (Task 6)
  - `kibanaPrefix` (Task 5)
  - `Config`, `Action`, `activeEnvironment`, `actionsForEnvironment` (Task 4)
  - `buildLinkButtons` (Task 4)
  - `flattenDoc` (Task 2)
  - `createConfigStore`, `isConfigChange` (Task 8)
- Produces:
  - `HOST_TAG = "kibanatool-bar"`
  - `interface MountHandle { render(view: DetailView): void; destroy(): void }`
  - `interface Mount { host: HTMLElement; handle: MountHandle }`
  - `type MountFactory = (host: HTMLElement) => MountHandle`
  - `reconcileMounts(views: DetailView[], mounts: Map<Element, Mount>, createMount: MountFactory, doc: Document): void`
  - `type MessageKey` (union of message names)
  - `t(key: MessageKey, ...substitutions: string[]): string`
  - `ActionBar` React bileşeni: `{ identity: DocIdentity; actions: Action[]; client: KibanaClient }`
  - `BAR_CSS: string`

Tasarım notu: Spec §7.7 `createShadowRootUi` diyor. Ama çubuk birden fazla ve dinamik olarak açılan detay görünümüne ekleniyor. Bu yüzden her host'ta `attachShadow` + `<style>` + `createRoot` doğrudan kullanılır, sonuç aynıdır (Shadow DOM içinde React). CSS bir TS sabitinde tutulur, böylece `?inline` import tiplerine gerek kalmaz.

- [ ] **Step 1: Mount uzlaştırma testlerini yaz**

`tests/unit/content/mounts.test.ts`:
```ts
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { DetailView } from "../../../src/adapters/types";
import { HOST_TAG, type Mount, reconcileMounts } from "../../../src/content/mounts";

interface FakeHandle {
  render: Mock;
  destroy: Mock;
}

let handles: FakeHandle[];
let mounts: Map<Element, Mount>;

const factory = (): FakeHandle => {
  const handle = { render: vi.fn(), destroy: vi.fn() };
  handles.push(handle);
  return handle;
};
const byId = (id: string): HTMLElement => document.getElementById(id)!;
const view = (n: 1 | 2, id = "X", position: "before" | "after" = "before"): DetailView => ({
  container: byId(`c${n}`),
  anchor: byId(`a${n}`),
  position,
  identity: { dataViewId: "dv", index: "idx", id },
});

describe("reconcileMounts", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="c1"><div id="a1"></div></div><div id="c2"><div id="a2"></div></div>`;
    handles = [];
    mounts = new Map();
  });

  it("inserts a host before the anchor and renders the view", () => {
    const first = view(1);
    reconcileMounts([first], mounts, factory, document);
    expect(byId("a1").previousElementSibling?.tagName.toLowerCase()).toBe(HOST_TAG);
    expect(handles[0]!.render).toHaveBeenCalledWith(first);
  });

  it("inserts a host after the anchor when asked", () => {
    reconcileMounts([view(2, "X", "after")], mounts, factory, document);
    expect(byId("a2").nextElementSibling?.tagName.toLowerCase()).toBe(HOST_TAG);
  });

  it("re-renders the same mount when the identity changes in the same container", () => {
    reconcileMounts([view(1, "A")], mounts, factory, document);
    reconcileMounts([view(1, "B")], mounts, factory, document);
    expect(handles).toHaveLength(1);
    expect(handles[0]!.render.mock.lastCall?.[0].identity.id).toBe("B");
    expect(byId("c1").querySelectorAll(HOST_TAG)).toHaveLength(1);
  });

  it("re-inserts a host that Kibana removed", () => {
    reconcileMounts([view(1)], mounts, factory, document);
    const host = byId("a1").previousElementSibling!;
    host.remove();
    reconcileMounts([view(1)], mounts, factory, document);
    expect(byId("a1").previousElementSibling).toBe(host);
    expect(handles).toHaveLength(1);
  });

  it("destroys and removes mounts whose view closed", () => {
    reconcileMounts([view(1), view(2)], mounts, factory, document);
    expect(document.querySelectorAll(HOST_TAG)).toHaveLength(2);
    reconcileMounts([view(1)], mounts, factory, document);
    expect(handles[1]!.destroy).toHaveBeenCalledOnce();
    expect(byId("c2").querySelector(HOST_TAG)).toBeNull();
    expect(mounts.size).toBe(1);
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/content/mounts.test.ts`
Expected: FAIL. `src/content/mounts` modülü bulunamaz.

- [ ] **Step 3: `mounts.ts` dosyasını uygula**

`src/content/mounts.ts`:
```ts
// Keeps exactly one action-bar host next to each open detail view (spec §5.1, §10).
import type { DetailView } from "../adapters/types";

export const HOST_TAG = "kibanatool-bar";

export interface MountHandle {
  render(view: DetailView): void;
  destroy(): void;
}

export interface Mount {
  host: HTMLElement;
  handle: MountHandle;
}

export type MountFactory = (host: HTMLElement) => MountHandle;

export function reconcileMounts(
  views: DetailView[],
  mounts: Map<Element, Mount>,
  createMount: MountFactory,
  doc: Document,
): void {
  const seen = new Set<Element>();
  for (const view of views) {
    seen.add(view.container);
    let mount = mounts.get(view.container);
    if (!mount) {
      const host = doc.createElement(HOST_TAG);
      mount = { host, handle: createMount(host) };
      mounts.set(view.container, mount);
    }
    if (!isPlaced(mount.host, view)) place(mount.host, view);
    mount.handle.render(view);
  }
  for (const [container, mount] of mounts) {
    if (seen.has(container)) continue;
    mount.handle.destroy();
    mount.host.remove();
    mounts.delete(container);
  }
}

function isPlaced(host: Element, view: DetailView): boolean {
  if (!host.isConnected) return false;
  return view.position === "before"
    ? host.nextElementSibling === view.anchor
    : host.previousElementSibling === view.anchor;
}

function place(host: Element, view: DetailView): void {
  if (view.position === "before") view.anchor.before(host);
  else view.anchor.after(host);
}
```

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npx vitest run tests/unit/content/mounts.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Mesajları, i18n yardımcısını ve stilleri ekle**

`public/_locales/en/messages.json` dosyasının tamamını şununla değiştir:
```json
{
  "extName": { "message": "kibanatool" },
  "extDescription": { "message": "Speeds up working with logs in Kibana Discover: action buttons built from log fields." },
  "barLoading": { "message": "kibanatool: loading the log…" },
  "errorForbidden": { "message": "kibanatool: you are not allowed to read this log" },
  "errorNotFound": { "message": "kibanatool: log not found" },
  "errorIncompatible": {
    "message": "kibanatool: possibly incompatible with this Kibana version ($VERSION$)",
    "placeholders": { "version": { "content": "$1", "example": "9.5.5" } }
  },
  "errorServer": {
    "message": "kibanatool: Kibana returned an error (HTTP $STATUS$)",
    "placeholders": { "status": { "content": "$1", "example": "502" } }
  },
  "errorNetwork": { "message": "kibanatool: Kibana is unreachable" },
  "errorUnknown": { "message": "kibanatool: something went wrong" }
}
```

`public/_locales/tr/messages.json` dosyasının tamamını şununla değiştir:
```json
{
  "extName": { "message": "kibanatool" },
  "extDescription": { "message": "Kibana Discover'da logla çalışmayı hızlandırır: log alanlarından üretilen aksiyon butonları." },
  "barLoading": { "message": "kibanatool: log yükleniyor…" },
  "errorForbidden": { "message": "kibanatool: bu logu okuma yetkin yok" },
  "errorNotFound": { "message": "kibanatool: log bulunamadı" },
  "errorIncompatible": {
    "message": "kibanatool: bu Kibana sürümüyle uyumsuz olabilir ($VERSION$)",
    "placeholders": { "version": { "content": "$1", "example": "9.5.5" } }
  },
  "errorServer": {
    "message": "kibanatool: Kibana hata döndürdü (HTTP $STATUS$)",
    "placeholders": { "status": { "content": "$1", "example": "502" } }
  },
  "errorNetwork": { "message": "kibanatool: Kibana'ya ulaşılamadı" },
  "errorUnknown": { "message": "kibanatool: bir şeyler ters gitti" }
}
```

`src/i18n.ts`:
```ts
// Localized strings from public/_locales; Chrome picks the browser language (spec §9).
import { browser } from "wxt/browser";

export type MessageKey =
  | "barLoading"
  | "errorForbidden"
  | "errorNotFound"
  | "errorIncompatible"
  | "errorServer"
  | "errorNetwork"
  | "errorUnknown";

const getMessage = browser.i18n.getMessage.bind(browser.i18n) as unknown as (
  name: string,
  substitutions?: string[],
) => string;

export function t(key: MessageKey, ...substitutions: string[]): string {
  return getMessage(key, substitutions) || key;
}
```

`src/content/styles.ts`:
```ts
// Styles for the action bar; they live inside each host's shadow root, isolated from Kibana's CSS.
export const BAR_CSS = `
:host { all: initial; display: block; }
.kt-bar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  margin: 6px 0; padding: 6px 8px;
  border: 1px solid #d3dae6; border-radius: 6px; background: #f7f8fc; color: #343741;
  font: 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}
.kt-btn {
  display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 4px;
  background: #0077cc; color: #fff; font-weight: 500; text-decoration: none;
}
.kt-btn:hover, .kt-btn:focus-visible { background: #005fa3; outline: none; }
.kt-muted { color: #69707d; }
.kt-error { color: #bd271e; }
`;
```

- [ ] **Step 6: Aksiyon çubuğunu ve içerik betiğini uygula**

`src/content/ActionBar.tsx`:
```tsx
// The per-document action bar (spec §7.7). Plan 1 renders link actions only.
import { useEffect, useMemo, useState } from "react";
import type { Action } from "../core/config";
import { flattenDoc } from "../core/fields";
import { buildLinkButtons } from "../core/link-actions";
import type { DocIdentity, RawHit } from "../core/types";
import { t } from "../i18n";
import { type KibanaClient, KibanaError } from "../kibana/client";

type State = { status: "loading" } | { status: "ready"; hit: RawHit } | { status: "error"; message: string };

export interface ActionBarProps {
  identity: DocIdentity;
  actions: Action[];
  client: KibanaClient;
}

export function ActionBar({ identity, actions, client }: ActionBarProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  const { index, id } = identity;

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    client.fetchDoc(index, id).then(
      (hit) => {
        if (!cancelled) setState({ status: "ready", hit });
      },
      async (error: unknown) => {
        const message = await describeError(error, client);
        if (!cancelled) setState({ status: "error", message });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [index, id, client]);

  const buttons = useMemo(
    () => (state.status === "ready" ? buildLinkButtons(actions, flattenDoc(state.hit)) : []),
    [state, actions],
  );

  if (state.status === "loading") {
    return (
      <div className="kt-bar">
        <span className="kt-muted">{t("barLoading")}</span>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="kt-bar">
        <span className="kt-error">{state.message}</span>
      </div>
    );
  }
  if (buttons.length === 0) return null;
  return (
    <div className="kt-bar">
      {buttons.map((button) => (
        <a
          key={button.id}
          className="kt-btn"
          href={button.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          {button.label}
        </a>
      ))}
    </div>
  );
}

async function describeError(error: unknown, client: KibanaClient): Promise<string> {
  if (!(error instanceof KibanaError)) return t("errorUnknown");
  switch (error.kind) {
    case "forbidden":
      return t("errorForbidden");
    case "notFound":
      return t("errorNotFound");
    case "network":
      return t("errorNetwork");
    case "server":
      return t("errorServer", String(error.status ?? "?"));
    case "incompatible":
      return t("errorIncompatible", (await client.getVersion()) ?? "?");
    default:
      return t("errorUnknown");
  }
}
```

`entrypoints/kibana.ts` dosyasının tamamını şununla değiştir:
```ts
import { createElement } from "react";
import { type Root, createRoot } from "react-dom/client";
import { defineUnlistedScript } from "#imports";
import { browser } from "wxt/browser";
import { findDetailViews } from "../src/adapters/detect";
import type { DetailView } from "../src/adapters/types";
import { ActionBar } from "../src/content/ActionBar";
import { type Mount, type MountHandle, reconcileMounts } from "../src/content/mounts";
import { BAR_CSS } from "../src/content/styles";
import { type Config, actionsForEnvironment, activeEnvironment } from "../src/core/config";
import { createKibanaClient } from "../src/kibana/client";
import { kibanaPrefix } from "../src/kibana/prefix";
import { createConfigStore, isConfigChange } from "../src/storage";

const LOG = "[kibanatool]";

// Registered at runtime for granted Kibana origins (see src/background/registration.ts).
export default defineUnlistedScript(() => {
  start().catch((error: unknown) => console.debug(LOG, "inactive:", error));
});

async function start(): Promise<void> {
  const prefix = kibanaPrefix(location.pathname);
  if (prefix === null) return;
  const store = createConfigStore(browser.storage.local);
  let config: Config = (await store.load()).config;
  const client = createKibanaClient({ prefix, fetch: (input, init) => window.fetch(input, init) });
  const mounts = new Map<Element, Mount>();

  function createMount(host: HTMLElement): MountHandle {
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = BAR_CSS;
    const container = document.createElement("div");
    shadow.append(style, container);
    const root: Root = createRoot(container);
    return {
      render(view: DetailView) {
        const environment = activeEnvironment(config, location.href);
        const actions = environment ? actionsForEnvironment(config, environment.id) : [];
        const identity = view.identity;
        root.render(
          identity && actions.length > 0
            ? createElement(ActionBar, { key: `${identity.index}/${identity.id}`, identity, actions, client })
            : null,
        );
      },
      destroy() {
        root.unmount();
      },
    };
  }

  function run(): void {
    try {
      const views = activeEnvironment(config, location.href) ? findDetailViews(document, location) : [];
      reconcileMounts(views, mounts, createMount, document);
    } catch (error) {
      console.debug(LOG, "reconcile failed:", error);
    }
  }

  let scheduled: number | undefined;
  function schedule(): void {
    if (scheduled !== undefined) return;
    scheduled = window.setTimeout(() => {
      scheduled = undefined;
      run();
    }, 100);
  }

  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href"],
  });
  window.addEventListener("hashchange", schedule);
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (!isConfigChange(changes, areaName)) return;
    void store.load().then((loaded) => {
      config = loaded.config;
      run();
    });
  });
  run();
}
```

- [ ] **Step 7: Tüm testleri, tip kontrolünü ve derlemeyi çalıştır**

Run: `npm test && npm run typecheck && npm run build && npm run check:manifest`
Expected:
- tüm birim testleri PASS
- `tsc` hata vermez
- build başarılı
- `Manifest check passed`

- [ ] **Step 8: Commit**

```bash
git add src/content src/i18n.ts entrypoints/kibana.ts public/_locales tests/unit/content
git commit -m "feat(content): render link action bars in Discover detail views" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Asgari ayarlar sayfası

**Files:**
- Create: `src/options/model.ts`, `entrypoints/options/App.tsx`, `entrypoints/options/options.css`
- Modify: `entrypoints/options/main.tsx`, `src/i18n.ts`, `public/_locales/en/messages.json`, `public/_locales/tr/messages.json`
- Test: `tests/unit/options/model.test.ts`

**Interfaces:**
- Consumes:
  - `Config`, `Environment`, `ParseResult`, `parseConfig`, `originPattern` (Task 4)
  - `createConfigStore` (Task 8)
  - `t`, `MessageKey` (Task 9)
- Produces:
  - `newEnvironment(name: string, kibanaUrl: string, id?: string): Environment`
  - `withEnvironment(config: Config, environment: Environment): ParseResult`
  - `withoutEnvironment(config: Config, environmentId: string): Config`
  - `withActionsJson(config: Config, text: string): ParseResult`

Kapsam notu: Bu görev Plan 1 için **asgari** bir ayarlar sayfasıdır. İçinde ortam ekleme ve silme, izin isteme ve aksiyonlar için bir JSON düzenleyici var. Gerçek aksiyon düzenleyici, canlı önizleme ve dışa/içe aktarma Plan 2'de gelecek.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/unit/options/model.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { type Config, emptyConfig } from "../../../src/core/config";
import { newEnvironment, withActionsJson, withEnvironment, withoutEnvironment } from "../../../src/options/model";

const action = {
  id: "admin",
  kind: "link",
  label: "Admin",
  enabled: true,
  environmentIds: ["e1"],
  conditions: [],
  urlTemplate: "https://admin.example.com/users/{user_id}",
};

describe("newEnvironment", () => {
  it("trims the inputs and uses the given id", () => {
    expect(newEnvironment("  Prod ", " https://kibana.example.com ", "e1")).toEqual({
      id: "e1",
      name: "Prod",
      kibanaUrl: "https://kibana.example.com",
    });
  });
});

describe("withEnvironment", () => {
  it("appends a valid environment", () => {
    const result = withEnvironment(emptyConfig(), newEnvironment("Prod", "https://kibana.example.com", "e1"));
    expect(result.ok && result.config.environments.map((environment) => environment.id)).toEqual(["e1"]);
  });

  it("reports invalid URLs and empty names with field paths", () => {
    const result = withEnvironment(emptyConfig(), newEnvironment("", "kibana.example.com", "e1"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("environments.0.kibanaUrl: must be a valid http(s) URL");
      expect(result.errors.some((error) => error.startsWith("environments.0.name:"))).toBe(true);
    }
  });
});

describe("withoutEnvironment", () => {
  it("removes the environment and leaves actions untouched", () => {
    const config = {
      ...emptyConfig(),
      environments: [newEnvironment("A", "https://a.example.com", "e1"), newEnvironment("B", "https://b.example.com", "e2")],
      actions: [action],
    } as Config;
    const next = withoutEnvironment(config, "e1");
    expect(next.environments.map((environment) => environment.id)).toEqual(["e2"]);
    expect(next.actions).toEqual(config.actions);
  });
});

describe("withActionsJson", () => {
  it("replaces the actions with a valid JSON array", () => {
    const result = withActionsJson(emptyConfig(), JSON.stringify([action]));
    expect(result.ok && result.config.actions).toEqual([action]);
  });

  it("reports JSON syntax errors and schema errors", () => {
    const syntax = withActionsJson(emptyConfig(), "[{");
    expect(!syntax.ok && syntax.errors[0]).toMatch(/^actions: /);
    const schema = withActionsJson(emptyConfig(), JSON.stringify([{ ...action, urlTemplate: "javascript:alert(1)" }]));
    expect(!schema.ok && schema.errors).toContain("actions.0.urlTemplate: must start with http:// or https://");
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/options/model.test.ts`
Expected: FAIL. `src/options/model` modülü bulunamaz.

- [ ] **Step 3: Modeli uygula**

`src/options/model.ts`:
```ts
// Pure config edits used by the options page; every result is re-validated (spec §8).
import { type Config, type Environment, type ParseResult, parseConfig } from "../core/config";

export function newEnvironment(name: string, kibanaUrl: string, id: string = crypto.randomUUID()): Environment {
  return { id, name: name.trim(), kibanaUrl: kibanaUrl.trim() };
}

export function withEnvironment(config: Config, environment: Environment): ParseResult {
  return parseConfig({ ...config, environments: [...config.environments, environment] });
}

/** Actions keep their environmentIds: an action scoped only to a removed environment simply stops showing. */
export function withoutEnvironment(config: Config, environmentId: string): Config {
  return { ...config, environments: config.environments.filter((environment) => environment.id !== environmentId) };
}

export function withActionsJson(config: Config, text: string): ParseResult {
  let actions: unknown;
  try {
    actions = JSON.parse(text);
  } catch (error) {
    return { ok: false, errors: [`actions: ${(error as Error).message}`] };
  }
  return parseConfig({ ...config, actions });
}
```

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npx vitest run tests/unit/options/model.test.ts`
Expected: PASS (6 test).

- [ ] **Step 5: Ayarlar sayfası metinlerini ekle**

`public/_locales/en/messages.json` içinde son girdi olan `"errorUnknown": { "message": "kibanatool: something went wrong" }` satırını aşağıdakiyle değiştir. Yani son satırın sonuna virgül ekle ve yeni girdileri ekle:
```json
  "errorUnknown": { "message": "kibanatool: something went wrong" },
  "optionsLoading": { "message": "Loading…" },
  "optionsIntro": { "message": "Add the Kibana addresses you use, grant access, then define link actions. Reload open Kibana tabs after changes." },
  "optionsLoadError": { "message": "The stored settings were invalid and have been replaced with empty settings:" },
  "optionsSavedReload": { "message": "Saved. Reload open Kibana tabs to apply." },
  "optionsEnvironments": { "message": "Environments" },
  "optionsEnvName": { "message": "Name (e.g. Production)" },
  "optionsAdd": { "message": "Add and grant access" },
  "optionsGrant": { "message": "Grant access" },
  "optionsGranted": { "message": "Access granted" },
  "optionsRemove": { "message": "Remove" },
  "optionsActions": { "message": "Actions (JSON)" },
  "optionsActionsHelp": { "message": "A JSON array of actions. Placeholders use {field} or {field|fallback}. Example: [{\"id\":\"admin\",\"kind\":\"link\",\"label\":\"Admin\",\"enabled\":true,\"environmentIds\":[],\"conditions\":[],\"urlTemplate\":\"https://admin.example.com/users/{user_id}\"}]" },
  "optionsSave": { "message": "Save actions" }
```

`public/_locales/tr/messages.json` içinde de son girdiyi aynı şekilde değiştir:
```json
  "errorUnknown": { "message": "kibanatool: bir şeyler ters gitti" },
  "optionsLoading": { "message": "Yükleniyor…" },
  "optionsIntro": { "message": "Kullandığın Kibana adreslerini ekle, erişim izni ver, sonra link aksiyonlarını tanımla. Değişikliklerden sonra açık Kibana sekmelerini yenile." },
  "optionsLoadError": { "message": "Kayıtlı ayarlar geçersizdi, yerine boş ayarlar kullanıldı:" },
  "optionsSavedReload": { "message": "Kaydedildi. Uygulanması için açık Kibana sekmelerini yenile." },
  "optionsEnvironments": { "message": "Ortamlar" },
  "optionsEnvName": { "message": "Ad (örn. Production)" },
  "optionsAdd": { "message": "Ekle ve erişim izni ver" },
  "optionsGrant": { "message": "Erişim izni ver" },
  "optionsGranted": { "message": "Erişim var" },
  "optionsRemove": { "message": "Kaldır" },
  "optionsActions": { "message": "Aksiyonlar (JSON)" },
  "optionsActionsHelp": { "message": "Aksiyonların JSON dizisi. Yer tutucular {alan} ya da {alan|yedek} biçiminde. Örnek: [{\"id\":\"admin\",\"kind\":\"link\",\"label\":\"Admin\",\"enabled\":true,\"environmentIds\":[],\"conditions\":[],\"urlTemplate\":\"https://admin.example.com/users/{user_id}\"}]" },
  "optionsSave": { "message": "Aksiyonları kaydet" }
```

`src/i18n.ts` içinde `MessageKey` tipini şununla değiştir:
```ts
export type MessageKey =
  | "barLoading"
  | "errorForbidden"
  | "errorNotFound"
  | "errorIncompatible"
  | "errorServer"
  | "errorNetwork"
  | "errorUnknown"
  | "optionsLoading"
  | "optionsIntro"
  | "optionsLoadError"
  | "optionsSavedReload"
  | "optionsEnvironments"
  | "optionsEnvName"
  | "optionsAdd"
  | "optionsGrant"
  | "optionsGranted"
  | "optionsRemove"
  | "optionsActions"
  | "optionsActionsHelp"
  | "optionsSave";
```

Doğrulama: `node -e 'for (const l of ["en","tr"]) JSON.parse(require("fs").readFileSync("public/_locales/"+l+"/messages.json","utf8"))'` hata vermeden bitmeli. İki dosyadaki anahtar listeleri aynı olmalı.

- [ ] **Step 6: Sayfayı uygula**

`entrypoints/options/App.tsx`:
```tsx
// Minimal options page (Plan 1): environments with permission requests and an actions JSON editor.
import { type FormEvent, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { type Config, type Environment, originPattern } from "../../src/core/config";
import { t } from "../../src/i18n";
import { newEnvironment, withActionsJson, withEnvironment, withoutEnvironment } from "../../src/options/model";
import { createConfigStore } from "../../src/storage";

const store = createConfigStore(browser.storage.local);

async function grantStatus(config: Config): Promise<Record<string, boolean>> {
  const entries = await Promise.all(
    config.environments.map(async (environment) => {
      const granted = await browser.permissions.contains({ origins: [originPattern(environment.kibanaUrl)] });
      return [environment.id, granted] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [granted, setGranted] = useState<Record<string, boolean>>({});
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [actionsText, setActionsText] = useState("[]");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void store.load().then((loaded) => {
      setConfig(loaded.config);
      setLoadErrors(loaded.errors);
      setActionsText(JSON.stringify(loaded.config.actions, null, 2));
    });
  }, []);

  useEffect(() => {
    if (config) void grantStatus(config).then(setGranted);
  }, [config]);

  if (!config) return <p>{t("optionsLoading")}</p>;
  const current = config;

  async function persist(next: Config): Promise<void> {
    try {
      await store.save(next);
      setConfig(next);
      setErrors([]);
      setNotice(t("optionsSavedReload"));
    } catch (error) {
      setErrors([String(error)]);
    }
  }

  // Chrome only shows the permission prompt during a user gesture, so call this before any await.
  function requestAccess(environment: Environment): Promise<boolean> {
    return browser.permissions.request({ origins: [originPattern(environment.kibanaUrl)] });
  }

  function addEnvironment(event: FormEvent): void {
    event.preventDefault();
    const environment = newEnvironment(name, url);
    const result = withEnvironment(current, environment);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    void requestAccess(environment).finally(() => {
      void persist(result.config).then(() => {
        setName("");
        setUrl("");
      });
    });
  }

  function grant(environment: Environment): void {
    void requestAccess(environment).then(() => grantStatus(current).then(setGranted));
  }

  function saveActions(): void {
    const result = withActionsJson(current, actionsText);
    if (result.ok) void persist(result.config);
    else setErrors(result.errors);
  }

  return (
    <main>
      <h1>kibanatool</h1>
      <p className="muted">{t("optionsIntro")}</p>

      {loadErrors.length > 0 && (
        <div className="warning">
          <strong>{t("optionsLoadError")}</strong>
          <ul>
            {loadErrors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {errors.length > 0 && (
        <div className="error">
          <ul>
            {errors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {notice && <div className="notice">{notice}</div>}

      <section>
        <h2>{t("optionsEnvironments")}</h2>
        <ul className="environments">
          {current.environments.map((environment) => (
            <li key={environment.id}>
              <span className="env-name">{environment.name}</span>
              <code>{environment.kibanaUrl}</code>
              {granted[environment.id] ? (
                <span className="ok">{t("optionsGranted")}</span>
              ) : (
                <button type="button" onClick={() => grant(environment)}>
                  {t("optionsGrant")}
                </button>
              )}
              <button
                type="button"
                className="link"
                onClick={() => void persist(withoutEnvironment(current, environment.id))}
              >
                {t("optionsRemove")}
              </button>
            </li>
          ))}
        </ul>
        <form className="row" onSubmit={addEnvironment}>
          <input required placeholder={t("optionsEnvName")} value={name} onChange={(event) => setName(event.target.value)} />
          <input
            required
            type="url"
            placeholder="https://kibana.example.com"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <button type="submit">{t("optionsAdd")}</button>
        </form>
      </section>

      <section>
        <h2>{t("optionsActions")}</h2>
        <p className="muted">{t("optionsActionsHelp")}</p>
        <textarea spellCheck={false} rows={18} value={actionsText} onChange={(event) => setActionsText(event.target.value)} />
        <button type="button" onClick={saveActions}>
          {t("optionsSave")}
        </button>
      </section>
    </main>
  );
}
```

`entrypoints/options/options.css`:
```css
body { margin: 0; background: #f7f8fc; color: #343741; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
main { max-width: 860px; margin: 0 auto; padding: 24px 16px 48px; }
h1 { margin: 0 0 4px; font-size: 22px; }
h2 { margin: 28px 0 8px; font-size: 16px; }
section { background: #fff; border: 1px solid #d3dae6; border-radius: 8px; padding: 4px 16px 16px; margin-top: 16px; }
.muted { color: #69707d; }
.row { display: flex; flex-wrap: wrap; gap: 8px; }
.row input { flex: 1 1 220px; }
input, textarea { box-sizing: border-box; padding: 6px 8px; border: 1px solid #c9d1dc; border-radius: 4px; font: inherit; }
textarea { width: 100%; margin: 8px 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
button { padding: 6px 12px; border: 0; border-radius: 4px; background: #0077cc; color: #fff; font: inherit; cursor: pointer; }
button.link { background: none; color: #bd271e; }
.environments { list-style: none; padding: 0; margin: 0 0 12px; }
.environments li { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #eef0f4; }
.env-name { font-weight: 600; }
.ok { color: #017d73; }
.warning, .error, .notice { margin-top: 12px; padding: 8px 12px; border-radius: 6px; }
.warning { background: #fff9e8; border: 1px solid #f5a700; }
.error { background: #fbebeb; border: 1px solid #bd271e; }
.notice { background: #e6f9f7; border: 1px solid #017d73; }
```

`entrypoints/options/main.tsx` dosyasının tamamını şununla değiştir:
```tsx
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./options.css";

createRoot(document.getElementById("root")!).render(<App />);
```

- [ ] **Step 7: Testleri, tip kontrolünü ve derlemeyi çalıştır**

Run: `npm test && npm run typecheck && npm run build && npm run check:manifest`
Expected:
- tüm birim testleri PASS
- `tsc` hata vermez
- build başarılı
- `Manifest check passed`

- [ ] **Step 8: Commit**

```bash
git add src/options src/i18n.ts entrypoints/options public/_locales tests/unit/options
git commit -m "feat(options): add environments with permission requests and an actions JSON editor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Docker geliştirme stack'leri (8.19.23, 9.5.5)

**Files:**
- Create: `docker/compose.yml`, `docker/kibana.yml`, `docker/up.sh`, `docker/down.sh`, `docker/obs-view.sh`, `docker/seed.mjs`
- Create: `README.md`

**Interfaces:**
- Consumes: —
- Produces:
  - `./docker/up.sh 8|9`: Kibana 8.19.23 `http://localhost:18601` ya da 9.5.5 `http://localhost:19601`. Güvenlik açık, tarayıcı anonim olarak girer.
  - Data view'lar: `app-log` (`app_log`, zaman alanı `datetime`), `all-logs` (`*_log`, zaman alanı yok), `logs` (`logs-*`, `@timestamp`)
  - `./docker/down.sh 8|9`
  - `./docker/obs-view.sh 9`

Not: Bu tarif 8.15.3, 8.19.23 ve 9.5.5'te denendi (spec §3). 7.17 için şimdilik projeyi başlatan ekibin yerel ortamı kullanılır, 7.17 Docker stack'i Plan 3'te eklenecek. İmajlar paralel çekilince "unexpected EOF" hatası görüldü. `up.sh`, `docker compose` imajları sırayla çeker.

- [ ] **Step 1: Compose ve Kibana ayarlarını yaz**

`docker/compose.yml`:
```yaml
# Development stack: Elasticsearch + Kibana with security ON.
# Kibana's anonymous auth provider gives the browser a real session without a password.
name: ${STACK_NAME}

services:
  es:
    image: docker.elastic.co/elasticsearch/elasticsearch:${STACK_VERSION}
    environment:
      discovery.type: single-node
      xpack.security.enabled: "true"
      xpack.security.http.ssl.enabled: "false"
      xpack.security.transport.ssl.enabled: "false"
      xpack.security.authc.anonymous.username: anonymous_user
      xpack.security.authc.anonymous.roles: superuser
      xpack.security.authc.anonymous.authz_exception: "true"
      ELASTIC_PASSWORD: ${ELASTIC_PASSWORD}
      ES_JAVA_OPTS: "-Xms512m -Xmx512m"
    ports:
      - "127.0.0.1:${ES_PORT}:9200"
    healthcheck:
      test: ["CMD-SHELL", "curl -fs -u elastic:${ELASTIC_PASSWORD} http://localhost:9200/_cluster/health || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 60

  kibana:
    image: docker.elastic.co/kibana/kibana:${STACK_VERSION}
    environment:
      KIBANA_SYSTEM_PASSWORD: ${KIBANA_SYSTEM_PASSWORD}
      ENC_KEY: ${ENC_KEY}
    volumes:
      - ./kibana.yml:/usr/share/kibana/config/kibana.yml:ro
    ports:
      - "127.0.0.1:${KIBANA_PORT}:5601"
    depends_on:
      es:
        condition: service_healthy
```

`docker/kibana.yml`:
```yaml
server.host: "0.0.0.0"
server.name: kibanatool-dev
elasticsearch.hosts: ["http://es:9200"]
elasticsearch.username: "kibana_system"
elasticsearch.password: "${KIBANA_SYSTEM_PASSWORD}"
xpack.security.encryptionKey: "${ENC_KEY}"
xpack.encryptedSavedObjects.encryptionKey: "${ENC_KEY}"
xpack.reporting.encryptionKey: "${ENC_KEY}"
xpack.security.authc.providers:
  anonymous.anonymous1:
    order: 0
    credentials: "elasticsearch_anonymous_user"
# Lets scripts call Kibana APIs with a Basic auth header; the browser uses the anonymous session.
xpack.security.authc.http.schemes: ["apikey", "bearer", "basic"]
status.allowAnonymous: true
telemetry.optIn: false
telemetry.allowChangingOptInStatus: false
```

- [ ] **Step 2: Betikleri yaz**

`docker/up.sh`:
```bash
#!/usr/bin/env bash
# Usage: ./docker/up.sh 8|9 — starts the dev stack for that major and seeds synthetic logs and data views.
# Secrets are generated into docker/.env.<major> (mode 600, gitignored) and never printed.
set -euo pipefail
cd "$(dirname "$0")"
case "${1:-}" in
  8) VERSION=8.19.23; ES_PORT=18200; KB_PORT=18601 ;;
  9) VERSION=9.5.5; ES_PORT=19200; KB_PORT=19601 ;;
  *) echo "usage: $0 8|9" >&2; exit 1 ;;
esac
ENV_FILE=".env.$1"
if [ ! -f "$ENV_FILE" ]; then
  (umask 077; cat > "$ENV_FILE" <<EOF
STACK_NAME=kibanatool-dev-$1
STACK_VERSION=$VERSION
ES_PORT=$ES_PORT
KIBANA_PORT=$KB_PORT
ELASTIC_PASSWORD=$(openssl rand -hex 16)
KIBANA_SYSTEM_PASSWORD=$(openssl rand -hex 16)
ENC_KEY=$(openssl rand -hex 32)
EOF
  )
fi
set -a; source "$ENV_FILE"; set +a

docker compose --env-file "$ENV_FILE" -f compose.yml up -d --wait es
curl -fs -u "elastic:$ELASTIC_PASSWORD" -X POST "http://localhost:$ES_PORT/_security/user/kibana_system/_password" \
  -H 'Content-Type: application/json' -d "{\"password\":\"$KIBANA_SYSTEM_PASSWORD\"}" >/dev/null
docker compose --env-file "$ENV_FILE" -f compose.yml up -d kibana

level=""
for _ in $(seq 1 120); do
  level=$(curl -s "http://localhost:$KB_PORT/api/status" | jq -r '.status.overall.level // .status.overall.state // empty' 2>/dev/null || true)
  if [ "$level" = "available" ] || [ "$level" = "green" ]; then break; fi
  sleep 5
done
echo "kibana $VERSION status: ${level:-unknown} -> http://localhost:$KB_PORT"

ES_AUTH="elastic:$ELASTIC_PASSWORD" node seed.mjs "http://localhost:$ES_PORT" "http://localhost:$KB_PORT"
```

`docker/down.sh`:
```bash
#!/usr/bin/env bash
# Usage: ./docker/down.sh 8|9 — stops the dev stack and deletes its data.
set -euo pipefail
cd "$(dirname "$0")"
docker compose --env-file ".env.$1" -f compose.yml down -v
```

`docker/obs-view.sh`:
```bash
#!/usr/bin/env bash
# Usage: ./docker/obs-view.sh 9 — switches the default space to the Observability solution view (9.x),
# where ECS logs open the flyout on the "Log overview" tab.
set -euo pipefail
cd "$(dirname "$0")"
set -a; source ".env.$1"; set +a
curl -fsS -u "elastic:$ELASTIC_PASSWORD" -X PUT "http://localhost:$KIBANA_PORT/api/spaces/space/default" \
  -H 'kbn-xsrf: kibanatool' -H 'Content-Type: application/json' \
  -d '{"id":"default","name":"Default","solution":"oblt","disabledFeatures":[]}' >/dev/null
echo "default space now uses the Observability view"
```

`docker/seed.mjs`:
```js
// Seeds synthetic logs and data views into a dev stack. No real data.
// Usage: ES_AUTH="elastic:<password>" node seed.mjs <esUrl> <kibanaUrl>
const [esUrl, kbUrl] = process.argv.slice(2);
const auth = "Basic " + Buffer.from(process.env.ES_AUTH).toString("base64");

async function call(base, method, path, body, extraHeaders = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { authorization: auth, "content-type": "application/json", ...extraHeaders },
    body: typeof body === "string" ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const now = Date.now();
const lines = [];

// app_log: Monolog-shaped, like the team's 7.17 logs (JSON strings inside context).
for (let i = 0; i < 150; i++) {
  const [level, level_name] = pick([[200, "INFO"], [250, "NOTICE"], [300, "WARNING"], [400, "ERROR"]]);
  const url = pick(["/v1/coupons", "/v1/races/today", "/v1/wallet/deposit", "/v1/auth/login"]);
  lines.push(
    JSON.stringify({ index: { _index: "app_log" } }),
    JSON.stringify({
      message: level >= 400 ? `Request failed for ${url}` : `Handled ${url}`,
      level,
      level_name,
      channel: pick(["request", "app", "security"]),
      datetime: new Date(now - i * 7 * 60 * 1000).toISOString(),
      app_name: pick(["api", "admin"]),
      user_id: 100000 + Math.floor(Math.random() * 900000),
      context: {
        method: pick(["GET", "POST"]),
        ip: `10.0.${i % 255}.${(i * 7) % 255}`,
        url,
        body: JSON.stringify({ amount: i * 10, currency: "TRY", items: [{ id: i, qty: 1 }] }),
        headers: JSON.stringify({ "user-agent": "dev/1.0", authorization: "Bearer synthetic-token" }),
        query: JSON.stringify({ page: i % 5 }),
      },
      extra: { uid: Math.random().toString(16).slice(2, 10) },
    }),
  );
}

// legacy_log: datetime mapped as text, so the "*_log" data view has no usable time field.
await call(esUrl, "PUT", "/legacy_log", { mappings: { properties: { datetime: { type: "text" } } } }).catch(() => {});
for (let i = 0; i < 20; i++) {
  lines.push(
    JSON.stringify({ index: { _index: "legacy_log" } }),
    JSON.stringify({ message: `legacy event ${i}`, datetime: new Date(now - i * 60000).toISOString(), user_id: 500000 + i }),
  );
}

// logs-kibanatool-default: ECS-shaped data stream (triggers the logs profile in the Observability view).
for (let i = 0; i < 60; i++) {
  lines.push(
    JSON.stringify({ create: { _index: "logs-kibanatool-default" } }),
    JSON.stringify({
      "@timestamp": new Date(now - i * 5 * 60 * 1000).toISOString(),
      message: i % 4 === 0 ? `Payment failed for order ${1000 + i}` : `Order ${1000 + i} processed`,
      "log.level": i % 4 === 0 ? "error" : "info",
      "service.name": i % 2 ? "api" : "admin",
      "host.name": "dev-host",
      "user.id": String(200000 + i),
      "trace.id": Math.random().toString(16).slice(2, 18),
    }),
  );
}

const bulk = await call(esUrl, "POST", "/_bulk?refresh=true", lines.join("\n") + "\n", { "content-type": "application/x-ndjson" });
console.log("bulk errors:", bulk.errors, "items:", bulk.items.length);

for (const dataView of [
  { id: "app-log", title: "app_log", name: "app_log", timeFieldName: "datetime" },
  { id: "all-logs", title: "*_log", name: "*_log" },
  { id: "logs", title: "logs-*", name: "logs-*", timeFieldName: "@timestamp" },
]) {
  const result = await call(kbUrl, "POST", "/api/data_views/data_view", { data_view: dataView, override: true }, { "kbn-xsrf": "kibanatool" });
  console.log("data view:", result.data_view.id, "time field:", result.data_view.timeFieldName ?? null);
}
```

Run: `chmod +x docker/*.sh`

- [ ] **Step 3: README yaz**

`README.md`:
````markdown
# kibanatool

A Chrome extension that speeds up working with logs in Kibana Discover (7.17, 8.x, 9.x): it adds
action buttons built from the raw fields of the log you open. Inspired by
[graytool](https://github.com/bozkurtemre/graytool) for Graylog.

> Status: early development. Design: `docs/superpowers/specs/2026-10-07-kibanatool-design.md`.

## Privacy

The extension only talks to the Kibana you configure, with your own session. Nothing leaves your browser,
there is no telemetry.

## Development

Requirements: Node 22+, npm, Docker (for the dev stacks), jq.

```bash
npm install
npm test
npm run build            # output: .output/chrome-mv3
npm run check:manifest   # fails if the manifest asks for more permissions than allowed
```

Load the extension: open `chrome://extensions`, enable *Developer mode*, *Load unpacked* →
`.output/chrome-mv3`. Then open the extension's options, add your Kibana address, grant access and
reload your Kibana tab.

### Kibana dev stacks

```bash
./docker/up.sh 8     # Kibana 8.19.23 on http://localhost:18601
./docker/up.sh 9     # Kibana 9.5.5  on http://localhost:19601
./docker/obs-view.sh 9   # optional: Observability view (ECS logs open on "Log overview")
./docker/down.sh 8   # stop and delete data
```

Security is on; the browser signs in anonymously, no password needed. Data views: `app_log`
(Monolog-shaped, time field `datetime`), `*_log` (no time field) and `logs-*` (ECS, `@timestamp`).

## License

MIT
````

- [ ] **Step 4: Stack'leri doğrula**

Run: `./docker/up.sh 9`
Expected:
- `kibana 9.5.5 status: available -> http://localhost:19601`
- `bulk errors: false items: 230`
- üç data view satırı: `app-log datetime`, `all-logs null`, `logs @timestamp`

Run: `./docker/down.sh 9 && ./docker/up.sh 8 && ./docker/down.sh 8`
Expected: 8.19.23 için de aynı çıktı, ardından container'lar silinir.

- [ ] **Step 5: Commit**

```bash
git add docker README.md
git commit -m "chore(docker): add Kibana 8.19/9.5 dev stacks with synthetic logs; add README" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Elle doğrulama ve push (insan gerekli)

**Files:**
- Create: `docs/verification/2026-10-plan-1.md`

**Interfaces:**
- Consumes: Task 1–11'deki her şey
- Produces: doğrulama kaydı; `main` dalının GitHub'a push'u

Bu görevde eklentinin Chrome'a yüklenmesi ve tarayıcıda tıklanması gerekir. Ajan derlemeyi ve stack'leri hazırlar, kontrol listesini insana adım adım verir ve sonuçları kaydeder. Otomatik uçtan uca testler Plan 3'te gelecek.

- [ ] **Step 1: Hazırlık**

Run: `npm test && npm run typecheck && npm run build && npm run check:manifest && ./docker/up.sh 8 && ./docker/up.sh 9`
Expected:
- bütün komutlar başarılı
- 18601 ve 19601 portlarında Kibana hazır

Kullanıcının 7.17 ortamı `http://localhost:9601` adresinde açık olmalı. Kapalıysa `/Users/celal.akyuz/Projects/Bitalih/docker-env-setup` klasöründe `make up-elastic` ile başlatılır.

- [ ] **Step 2: Eklentiyi yükle ve ayarla (insan)**

1. `chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3`.
2. Eklenti ikonuna tıkla, ayarlar sayfası açılır. Sırayla şu ortamları ekle ve her birinde Chrome'un izin penceresine "Allow" de:
   - `Local 7.17` → `http://localhost:9601`
   - `Dev 8.19` → `http://localhost:18601`
   - `Dev 9.5` → `http://localhost:19601`
3. "Aksiyonlar (JSON)" alanına şunu yapıştır ve kaydet:

```json
[
  {
    "id": "user-admin",
    "kind": "link",
    "label": "User (admin)",
    "enabled": true,
    "environmentIds": [],
    "conditions": [],
    "urlTemplate": "https://admin.example.com/users/{user_id|user.id}"
  },
  {
    "id": "search-url",
    "kind": "link",
    "label": "Search URL",
    "enabled": true,
    "environmentIds": [],
    "conditions": [],
    "urlTemplate": "https://www.google.com/search?q={context.url|message}"
  },
  {
    "id": "only-errors",
    "kind": "link",
    "label": "Error only",
    "enabled": true,
    "environmentIds": [],
    "conditions": [{ "field": "level_name", "op": "equals", "value": "ERROR" }],
    "urlTemplate": "https://www.google.com/search?q=error+{_id}"
  }
]
```

- [ ] **Step 3: Kontrol listesini çalıştır (insan)**

Her maddeyi geçti/kaldı olarak not et. Linkleri tıklamak gerekmez, fareyle üzerine gelip URL'ye bakmak yeterli.

| # | Ortam | Adım | Beklenen |
|---|---|---|---|
| 1 | 7.17 | `http://localhost:9601/app/discover#/?_g=(time:(from:'2026-08-12T00:00:00.000Z',to:'2026-08-21T00:00:00.000Z'))&_a=(index:'3e239930-bfcc-11f1-a3fe-fbd7628c7754',query:(language:kuery,query:'_index:user_action_log'))` adresini aç, bir satırı genişlet | Alan tablosunun üstünde "User (admin)" ve "Search URL" butonları var. URL'de o satırın `user_id` ve `context.url` değerleri kodlanmış olarak görünüyor. |
| 2 | 7.17 | İkinci bir satırı da genişlet | İki satırın her birinde kendi değerleriyle ayrı bir çubuk var. |
| 3 | 7.17 | `_index:monolog` sorgusuyla bir satırı aç | `user_id` olmadığı için "User (admin)" yok. "Search URL" `message` değerine düşüyor. "Error only" yalnızca `ERROR` satırlarında görünüyor. |
| 4 | 8.19 | `http://localhost:18601/app/discover#/?_g=(time:(from:now-1d,to:now))&_a=(index:'app-log')` → bir satırın yan panelini aç | Çubuk panel başlığındaki aksiyonların hemen altında. |
| 5 | 8.19 | Paneldeki sonraki/önceki oklarıyla gezin | Butonların URL'sindeki `user_id` her logda değişiyor. |
| 6 | 9.5 | 4. ve 5. adımları `http://localhost:19601` için tekrarla | Aynı sonuç. |
| 7 | 9.5 | `./docker/obs-view.sh 9` çalıştır → `http://localhost:19601/app/discover#/?_g=(time:(from:now-1d,to:now))&_a=(index:'logs')` → yan paneli aç | Panel "Log overview" sekmesiyle açılıyor, çubuk yine var. "User (admin)" `user.id` değerini kullanıyor. |
| 8 | 8.19 | `chrome://extensions` → kibanatool → Details → Site access'ten `localhost:18601` iznini kaldır → Kibana sekmesini yenile | Çubuk yok. Konsolda kibanatool kaynaklı yakalanmamış hata yok. |
| 9 | Hepsi | DevTools konsoluna bak | Yalnızca `[kibanatool]` önekli debug mesajları var, kırmızı hata yok. |

- [ ] **Step 4: Sonuçları kaydet**

`docs/verification/2026-10-plan-1.md` dosyasını oluştur. İçinde tarih, Kibana sürümleri, Chrome sürümü ve yukarıdaki tablonun "Sonuç" sütunu (geçti/kaldı + not) olsun. Kalan bir madde varsa ilgili görevin kodu düzeltilir, ilgili birim testi eklenir ve kontrol listesi tekrarlanır.

- [ ] **Step 5: Stack'leri kapat, commit'le ve push'la**

Run:
```bash
./docker/down.sh 8 && ./docker/down.sh 9
git add docs/verification/2026-10-plan-1.md
git commit -m "docs: record Plan 1 manual verification" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
GH_TOKEN=$(gh auth token --user cllakyz) git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push
```
Expected: `main -> main` push'u başarılı.
