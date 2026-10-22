# kibanatool Plan 8 — Web Sitesi: Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `website/` altında, GitHub Pages'te yayınlanan, İngilizce ve Türkçe bir Docusaurus sitesi: tanıtım sayfası,
README'den bölünmüş docs ve CHANGELOG'u gösteren sürümler sayfası. README kısalır, Türkçe örnek ayar dosyası eklenir.

**Architecture:**
- **Ayrı paket:** `website/` kendi `package.json`'ı ve kilidiyle durur; eklentinin bağımlılıklarına, build'ine,
  testlerine ve `typecheck`'ine karışmaz. Eklentinin `src/` kodunu import etmez.
- **Docusaurus 3.10.2 `preset-classic`:** blog kapalı, tek docs sürümü, `en` (varsayılan) ve `tr`. Görünüm Infima
  değişkenleri ve `src/css/custom.css` ile; ana sayfanın iki etkileşimli parçası (`HeroDemo`, `ScreenshotTabs`)
  kendi bileşeni.
- **Tek kaynaklar:** sürüm bilgisi repo kökündeki `CHANGELOG.md`'den build sırasında okunur (yerel eklenti +
  MDX import); store adresi `website/src/constants.ts`'te tek yerde.
- **Testler:** `node --test` (changelog ayrıştırıcı, docs eşliği) ve derlenmiş siteye karşı Playwright smoke testi.
  Yeni `website.yml` workflow'u PR'da build + test eder, main'e push'ta yayınlar.

**Tech Stack:**
- Site: Docusaurus 3.10.2 (`@docusaurus/core`, `preset-classic`), React 19, TypeScript 5.9
- Eklentiler: `@easyops-cn/docusaurus-search-local` 0.55.3, `@fontsource/schibsted-grotesk` 5.3.0, `@fontsource/roboto-mono` 5.3.0
- Test: Node 22 `node --test`, Playwright 1.64 (kökteki sürümle aynı)
- Yayın: GitHub Actions, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-10-21-website-design.md`, kullanıcı 2026-10-22'de onayladı. Bölüm numaraları
(§) bu belgeye aittir. Plan ondan tartışır; uygulayıcı ikisini birlikte okur.

**Önceki işler:** Plan 1–7 ve spec-kit 002–006 `main`'de; son merge `2bf9ea7` (PR #17). 1.0.0 store incelemesinde.

**Çalışma dalı:** ana checkout'ta yeni dal `website`, worktree yok. `docs/superpowers/` artık commit'lenir.

**Sürüm:** eklentinin sürümü ve CHANGELOG değişmez; site eklentinin bir sürümü değildir.

### Kararlar

Kullanıcının kararları spec §3'te (K1–K12), benim kararlarım §4'te. Plan yazılırken kullanıcıya bir soru daha
soruldu:

| Konu | Karar (2026-10-22) |
|---|---|
| Sitenin otomatik testi | Küçük bir Playwright smoke testi, `website.yml`'de PR'da çalışır |

Plan yazılırken netleşen tek ayrıntı: spec §9'daki "build çıktısı taranarak" yapılacak dış istek kontrolü, smoke
testinde sayfalar yüklenirken giden istekler ölçülerek yapılır (Task 3); bu, dosya taramasının kaçıracağı çalışma
anı isteklerini de yakalar.

### Deneme sitesinde doğrulananlar (2026-10-22)

Scratchpad'de kurulan en küçük site ile:
- Docusaurus 3.10.2 + React 19, `en` ve `tr` build oluyor; Türkçe tema metinleri paketle geliyor ("Ana içeriğe geç").
- `import Changelog from "@site/../CHANGELOG.md"` site klasörünün dışından çalışıyor; `<Changelog components={{ h1: () => null }} />`
  CHANGELOG'un kendi `# Changelog` başlığını gizliyor (sayfada tek `<h1>`). TypeScript bu `components` prop'unu
  tanımıyor: import bir kez `ComponentType<{ components?: Record<string, ComponentType> }>`'a cast edilir.
- `markdown.format: "detect"` ile `.md` dosyaları CommonMark: `{user_id}` düz metin kalıyor, `:::note[Başlık]`
  admonition'ları çalışıyor. `.mdx` dosyalarında süslü parantez JavaScript'tir.
- Yerel eklentinin `setGlobalData` + `usePluginData` ile son sürümü (`1.0.0`, `2026-10-20`, "First public release,
  for Kibana 7.17, 8.x and 9.x in Chrome.") iki dilde veriyor.
- Fontlar `customCss` dizisine `require.resolve("@fontsource/…/400.css")` ile girince yerelden sunuluyor; build
  çıktısındaki tek dış adresler sitenin kendi `canonical`/`alternate` linkleri.
- Arama eklentisi `indexBlog: false` verilmezse "blogDir doesn't exist" uyarısı basıyor.

## Global Constraints

- Node 22 (CI), `website/` npm ile; kökteki `package.json` değişmez.
- `url: "https://cllakyz.github.io"`, `baseUrl: "/kibanatool/"`, `i18n: { defaultLocale: "en", locales: ["en", "tr"] }`.
- `onBrokenLinks: "throw"`, `markdown: { format: "detect", hooks: { onBrokenMarkdownLinks: "throw" } }`.
- Sitenin her isteği kendi adresine gider (spec §2 anti-hedef, §9). Google Fonts, analytics, CDN yok.
- Renkler spec §5.1 tablosundan, yazı §5.2'den; numara yalnızca sıralı adımlarda; büyük harfli etiket, tek kelime
  vurgusu, metin sonunda "→" yok (§5.2–5.3).
- Kendiliğinden hareket yok; etkileşim geçişleri `prefers-reduced-motion: reduce`'da kapanır.
- İki temada WCAG AA: metin 4.5:1, odak halkası ve kenarlıklar 3:1; görünür klavye odağı; 375px'te yatay kaydırma yok.
- İngilizce metinler spec §6.2'deki gibi, birebir. Türkçe "siz" diliyle; arayüz adları aşağıdaki sözlükle birebir.
- `translate()`/`<Translate>` mesajlarına `{…}` içeren kod yazılmaz: Docusaurus `{ad}`'ı yer tutucu sayar. Kod parçası
  `values` ile verilir (`translate({ message: "from {template}" }, { template: "{env.adminUrl}/users/{user_id}" })`).
- Ekran görüntüleri ve örnekler yalnızca sentetik veri.

### Türkçe arayüz sözlüğü

`public/_locales/tr/messages.json`'dan. Docs ve ana sayfa bu adları kullanır:

| İngilizce | Türkçe |
|---|---|
| Environments | Ortamlar |
| Variables | Değişkenler |
| Actions | Aksiyonlar |
| Copy and masking | Kopyalama ve maskeleme |
| Export and import | Dışa ve içe aktarma |
| Grant access | Erişim izni ver |
| Add link action / Add Discover action | Link aksiyonu ekle / Discover aksiyonu ekle |
| Show in row | Satırda göster |
| Import a settings file / Export settings | Ayar dosyası içe aktar / Ayarları dışa aktar |
| Target data view | Hedef data view |
| Live preview | Canlı önizleme |
| Conditions | Koşullar |
| View | Görüntüle |
| Copy as Markdown / JSON / cURL | Markdown olarak kopyala / JSON olarak kopyala / cURL olarak kopyala |
| Copy link to this log | Logun linkini kopyala |
| Copy view with fixed time | Görünümü sabit zamanla kopyala |
| Wrap lines / Copy value / Copy path | Satırları kaydır / Değeri kopyala / Yolu kopyala |
| Masked fields / Mask inside values | Maskelenecek alanlar / Değerin içinde maskele |
| Theme | Tema |

## Review Focus

Spec'in ima ettiği ama hiçbir görevin olağan testinin yakalamadığı, kullanıcıyı en çok ısıracak beş durum. Her
birinin testi sahibi olan göreve eklendi.

1. **Dokunmatik ekran ve JavaScript'siz açılış:** hover yok ya da script henüz çalışmadı. Demo "User in admin"
   seçili, dolu görünmeli; dokunma da seçmeli. → Task 3, `hero demo without JavaScript` ve `focus and click choose`.
2. **Base path altında kırık varlık yolu:** `/kibanatool/` öneki unutulmuş bir görsel ya da font 404 verir, build
   bunu yakalamaz. → Task 3, `pages load only from the site, with no failed request` her yanıtın < 400 olmasını da ister.
3. **Özetsiz bir CHANGELOG girdisi:** yeni sürüm doğrudan `### Added` ile başlarsa ayrıştırıcı eski sürüme kaymamalı.
   → Task 2, `an entry without a summary paragraph is still the latest`.
4. **Docs'un iki dilde kopması:** İngilizce bir sayfa eklenir, Türkçesi unutulur; dil menüsü 404'e gider.
   → Task 5, `every English docs page has a Turkish page`.
5. **Türkçe karakterler ve koyu tema karşıtlığı:** ğ, ş, ı, İ fontta yoksa yedek fonta düşer; demodaki işaretli
   satır koyu temada okunmaz olabilir. → Task 8, elle doğrulama M2 ve karşıtlık ölçümü.

---

### Task 0: Dal ve belgeler

**Files:**
- Commit: `docs/superpowers/specs/2026-10-21-website-design.md`, `docs/superpowers/plans/2026-10-22-plan-8-website.md`

- [ ] **Step 1: Dalı aç**

Run: `git switch -c website main` — Expected: `Switched to a new branch 'website'`

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-10-21-website-design.md docs/superpowers/plans/2026-10-22-plan-8-website.md
git commit -m "docs: website design and Plan 8"
```

### Task 1: Türkçe örnek ayar dosyası (K12)

**Files:**
- Create: `examples/kibanatool-settings.tr.json`
- Modify: `tests/unit/examples.test.ts`

**Interfaces:**
- Produces: `examples/kibanatool-settings.tr.json`; Task 4–5 docs ve Task 3/5 ana sayfa ona link verir.

- [ ] **Step 1: Testi genişlet**

```ts
import example from "../../examples/kibanatool-settings.json";
import exampleTr from "../../examples/kibanatool-settings.tr.json";

describe.each([
  ["examples/kibanatool-settings.json", example],
  ["examples/kibanatool-settings.tr.json", exampleTr],
])("%s", (_name, file) => {
  it("is valid settings that import without repairs", () => {
    expect(parseConfig(file)).toEqual({ ok: true, config: file });
  });
});

it("the Turkish example differs from the English one only in action labels", () => {
  const withoutLabels = (file: typeof example) => ({ ...file, actions: file.actions.map(({ label: _, ...rest }) => rest) });
  expect(withoutLabels(exampleTr)).toEqual(withoutLabels(example));
  expect(exampleTr.actions.map((a) => a.label)).toEqual([
    "Admin'de kullanıcı", "Sentry", "Jira", "Bu kullanıcının logları", "Tüm loglarda bu kullanıcı", "±5 dakika",
  ]);
});
```

- [ ] **Step 2: Çalıştır, düştüğünü gör**

Run: `npx vitest run tests/unit/examples.test.ts` — Expected: FAIL, `kibanatool-settings.tr.json` bulunamıyor.

- [ ] **Step 3: `examples/kibanatool-settings.tr.json`'ı yaz**

İngilizce dosyanın birebir kopyası; yalnızca altı `label` yukarıdaki sırayla Türkçe. Ortam adı "Production" kalır.

- [ ] **Step 4: Çalıştır, geçtiğini gör**

Run: `npx vitest run tests/unit/examples.test.ts` — Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add examples/kibanatool-settings.tr.json tests/unit/examples.test.ts
git commit -m "feat: Turkish example settings"
```

### Task 2: Site iskeleti, sürüm bilgisi ve sürümler sayfası

**Files:**
- Create: `website/package.json`, `website/package-lock.json`, `website/tsconfig.json`, `website/docusaurus.config.ts`,
  `website/sidebars.ts`, `website/src/constants.ts`, `website/src/css/custom.css`, `website/plugins/changelog.mjs`,
  `website/plugins/changelog.test.mjs`, `website/src/pages/releases.tsx`, `website/src/pages/index.tsx` (geçici,
  Task 3 doldurur), `website/docs/getting-started/introduction.md` (geçici, Task 4 doldurur), `website/static/img/icon.svg`,
  `website/static/img/favicon.png`
- Modify: `tsconfig.json`, `.gitignore`

**Interfaces:**
- Produces:
  - `latestRelease(markdown: string): { version: string; date: string; summary: string }` (`plugins/changelog.mjs`)
  - global data `usePluginData("kibanatool-changelog")` → aynı nesne
  - `website/src/constants.ts`: `REPO_URL = "https://github.com/cllakyz/kibanatool"`,
    `STORE_URL = "https://chromewebstore.google.com/detail/STORE_ITEM_ID"` (Task 9 gerçek ID'yi yazar),
    `exampleSettingsUrl(locale: string): string` → `https://raw.githubusercontent.com/cllakyz/kibanatool/main/examples/kibanatool-settings.json`,
    `tr` için `…/kibanatool-settings.tr.json`
  - site CSS değişkenleri (Task 3 kullanır): `--kt-muted`, `--kt-tint`, `--kt-surface`, `--kt-line`, `--kt-discover`,
    `--kt-discover-text`, `--kt-key`, `--kt-value`, `--kt-mark`, `--kt-shadow`; değerler §5.1, `:root` ve
    `[data-theme="dark"]` altında
  - npm script'leri: `start`, `build`, `serve`, `clear`, `write-translations`, `typecheck` (`tsc`), `test`
    (`node --test plugins/*.test.mjs`; Task 5 sonuna `tests/*.test.mjs` ekler, eşleşmeyen glob Node 22'de risk),
    `smoke` (`playwright test`)

- [ ] **Step 1: Ayrıştırıcının testini yaz** (`website/plugins/changelog.test.mjs`, `node:test` + `node:assert/strict`)

```js
test("the newest dated entry wins, its first paragraph joined into one line", () => {
  assert.deepEqual(
    latestRelease("# Changelog\n\nIntro.\n\n## [Unreleased]\n\n- x\n\n## [1.1.0] - 2026-11-02\n\nSecond release,\nwrapped.\n\n### Added\n\n- y\n\n## [1.0.0] - 2026-10-20\n\nFirst.\n"),
    { version: "1.1.0", date: "2026-11-02", summary: "Second release, wrapped." },
  );
});
test("an entry without a summary paragraph is still the latest", () => {
  assert.deepEqual(
    latestRelease("## [1.1.0] - 2026-11-02\n\n### Added\n\n- y\n\n## [1.0.0] - 2026-10-20\n\nFirst.\n"),
    { version: "1.1.0", date: "2026-11-02", summary: "" },
  );
});
test("a changelog without a dated entry is an error", () => {
  assert.throws(() => latestRelease("# Changelog\n"), /no "## \[version\] - date" entry/);
});
test("the repository's CHANGELOG.md has a latest release", () => {
  assert.equal(latestRelease(readFileSync(new URL("../../CHANGELOG.md", import.meta.url), "utf8")).version, "1.0.0");
});
```

- [ ] **Step 2: `website/package.json`'ı kur, testin düştüğünü gör**

```bash
cd website
npm install @docusaurus/core@3.10.2 @docusaurus/preset-classic@3.10.2 @mdx-js/react@3 react@19 react-dom@19 clsx prism-react-renderer @easyops-cn/docusaurus-search-local@0.55.3 @fontsource/schibsted-grotesk@5.3.0 @fontsource/roboto-mono@5.3.0
npm install -D @docusaurus/tsconfig@3.10.2 @docusaurus/types@3.10.2 @docusaurus/module-type-aliases@3.10.2 typescript@5.9.3 @playwright/test@1.64
```

`package.json`: `"private": true`, `"type"` verilmez (Docusaurus config TS), `"engines": { "node": ">=22" }`.
Run: `npm --prefix website test` — Expected: FAIL, `changelog.mjs` yok.

- [ ] **Step 3: `latestRelease` ve eklentiyi yaz** (`website/plugins/changelog.mjs`)

Düzenli ifade, özet paragrafı isteğe bağlı olacak şekilde (Review Focus 3); `summary` satır sonlarını tek boşluğa
indirir. Eşleşme yoksa hata mesajı: `CHANGELOG.md has no "## [version] - date" entry`.

```js
/^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})\n+(?:([^\n#][^\n]*(?:\n[^\n#][^\n]*)*))?/m
```

Varsayılan export bir Docusaurus eklentisi: `name: "kibanatool-changelog"`, `getPathsToWatch` kökteki
`CHANGELOG.md`, `loadContent` → `latestRelease(...)`, `contentLoaded` → `actions.setGlobalData(content)`.

- [ ] **Step 4: Testin geçtiğini gör**

Run: `npm --prefix website test` — Expected: PASS (4 test).

- [ ] **Step 5: Config'i yaz** (`website/docusaurus.config.ts`)

Global Constraints'teki `url`, `baseUrl`, `i18n`, `onBrokenLinks`, `markdown` ayarlarına ek olarak:
- `title: "kibanatool"`, `tagline` §6.2 hero açıklaması, `favicon: "img/favicon.png"` (kökteki `public/icon/32.png`'nin kopyası).
- `presets: classic` → `docs: { routeBasePath: "docs", sidebarPath: "./sidebars.ts", editUrl: "https://github.com/cllakyz/kibanatool/edit/main/website/", editLocalizedFiles: true }`,
  `blog: false`, `theme.customCss`: Schibsted Grotesk `400.css`, `700.css`, `800.css`, Roboto Mono `400.css`, `500.css`
  (`require.resolve` ile), sonra `./src/css/custom.css`.
- `plugins: [changelog]` (`./plugins/changelog.mjs`).
- `themes: [["@easyops-cn/docusaurus-search-local", { hashed: true, language: ["en", "tr"], docsRouteBasePath: "docs", indexBlog: false, indexPages: false }]]`.
- `themeConfig.colorMode: { respectPrefersColorScheme: true }`.
- `navbar`: logo `img/icon.svg` (kökteki `assets/icon.svg`'nin kopyası, iki temada aynı), başlık "kibanatool";
  solda `docSidebar` "Docs" ve `/releases` "Releases"; sağda `search`, `localeDropdown`, GitHub (`REPO_URL`).
- `footer` (`style: "light"`): "MIT License" → `REPO_URL/blob/main/LICENSE`, "Privacy policy" → `REPO_URL/blob/main/PRIVACY.md`,
  "GitHub" → `REPO_URL`; `copyright` alanında "Inspired by graytool for Graylog" (graytool linki
  `https://github.com/bozkurtemre/graytool`).
- `prism`: `theme: themes.github`, `darkTheme: themes.vsDark` (`prism-react-renderer`).

`website/tsconfig.json`: `{ "extends": "@docusaurus/tsconfig", "compilerOptions": { "baseUrl": "." }, "exclude": ["build", ".docusaurus", "node_modules"] }`.

- [ ] **Step 6: Temayı yaz** (`website/src/css/custom.css`)

- Infima: `--ifm-color-primary` `#0b64dd` / koyuda `#61a2ff`; `-dark`, `-darker`, `-darkest` `#1750ba`'ya (koyuda
  `#85b7ff`'ye) doğru, `-light` tonları tersine. `--ifm-background-color`, `--ifm-font-color-base`,
  `--ifm-color-emphasis-*` (çizgiler), `--ifm-navbar-background-color`, `--ifm-footer-background-color` §5.1'den.
- `--ifm-font-family-base: "Schibsted Grotesk", system-ui, sans-serif`; `--ifm-font-family-monospace: "Roboto Mono", ui-monospace, monospace`;
  başlıklar 800, harf aralığı §5.2.
- Docs menüsünde açık sayfa: `.menu__link--active` zemini `--kt-discover`, metni `--kt-discover-text`, kalın.
- Admonition'lar birincil mavinin tonları; odak halkası `outline: 2px solid var(--ifm-color-primary)`.
- `@media (prefers-reduced-motion: reduce)` altında `transition: none`.

- [ ] **Step 7: Sürümler sayfasını yaz** (`website/src/pages/releases.tsx`)

`<Layout title={translate({ id: "releases.title", message: "Releases" })}>`, `<Heading as="h1">` aynı metin, altında
`releases.intro` ("Every release of the extension, from CHANGELOG.md.") ve `<Changelog components={{ h1: () => null }} />`
(cast "Deneme sitesinde doğrulananlar"daki gibi).

- [ ] **Step 8: Geçici sayfalar, `sidebars.ts`, `constants.ts`, kök ayarları**

- Geçici `index.tsx` yalnızca `<Layout>` ve bir başlık; geçici `introduction.md` tek paragraf. `sidebars.ts`: `docs`
  kenar çubuğunda "Getting started" kategorisi ve bu sayfa.
- Kök `tsconfig.json`'a `"exclude": ["website", ".output", "**/node_modules"]` (`.wxt`'ninkini ezdiği için üçü birden).
- Kök `.gitignore`'a `website/build/` ve `website/.docusaurus/`.

- [ ] **Step 9: Doğrula**

Run: `npm --prefix website run typecheck && npm --prefix website run build` — Expected: iki `[SUCCESS] Generated static files`
(`build` ve `build/tr`), uyarı yok.
Run: `npm run typecheck && npm test` (kök) — Expected: önceki gibi geçer (581 + Task 1'in testleri).

- [ ] **Step 10: Commit**

```bash
git add website tsconfig.json .gitignore
git commit -m "feat(website): Docusaurus skeleton with the releases page"
```

### Task 3: Ana sayfa ve smoke testi

**Files:**
- Create: `website/playwright.config.ts`, `website/tests/smoke.spec.ts`, `website/src/components/HeroDemo/index.tsx`,
  `website/src/components/HeroDemo/styles.module.css`, `website/src/components/ScreenshotTabs/index.tsx`,
  `website/src/components/ScreenshotTabs/styles.module.css`, `website/src/pages/index.module.css`,
  `website/static/img/screenshots/{en,tr}/{1-bar,2-rows,3-view,4-copy,5-options}.png`
- Modify: `website/src/pages/index.tsx`

**Interfaces:**
- Consumes: `STORE_URL`, `REPO_URL`, `exampleSettingsUrl` (Task 2), `usePluginData("kibanatool-changelog")`, `--kt-*` değişkenleri.
- Produces:
  - `HeroDemo(): JSX.Element` — kökü `data-testid="hero-demo"`; her alan satırı `data-field="<anahtar>"` ve
    `data-marked="true|false"`; butonlar `aria-pressed`; sonuç `role="status"`.
  - `ScreenshotTabs(): JSX.Element` — ARIA tabs; panel görseli `src` = `useBaseUrl("/img/screenshots/<locale>/<key>.png")`.
  - `translate` id'leri `home.<bölüm>.<öğe>` biçiminde (örn. `home.hero.title`, `home.demo.sentry.label`,
    `home.shots.rows.caption`, `home.install.step2.title`); Task 5 bunları çevirir.

- [ ] **Step 1: Playwright config'i yaz** (`website/playwright.config.ts`)

`testDir: "tests"`, `testMatch: "*.spec.ts"` (aynı klasördeki `node --test` dosyaları Playwright'a girmesin),
`use.baseURL: "http://localhost:4173/kibanatool/"`, tek proje Chromium,
`webServer: { command: "npm run serve -- --port 4173 --no-open", url: "http://localhost:4173/kibanatool/", reuseExistingServer: !process.env.CI }`.
`serve` derlenmiş `build/`'i sunar; smoke'tan önce `npm run build` gerekir.

- [ ] **Step 2: Smoke testlerini yaz** (`website/tests/smoke.spec.ts`)

```ts
const PAGES = ["", "tr/", "docs/getting-started/introduction", "tr/docs/getting-started/introduction", "releases", "tr/releases"];

test("pages load only from the site, with no failed request", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const bad: string[] = [];
  page.on("request", (r) => { if (!r.url().startsWith("data:") && new URL(r.url()).origin !== origin) bad.push(r.url()); });
  page.on("response", (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  for (const path of PAGES) await page.goto(path, { waitUntil: "networkidle" });
  expect(bad).toEqual([]);
});

test.describe("hero demo without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("starts on User in admin", async ({ page }) => {
    await page.goto("");
    const demo = page.getByTestId("hero-demo");
    await expect(demo.getByRole("button", { name: "User in admin" })).toHaveAttribute("aria-pressed", "true");
    await expect(demo.locator('[data-field="user_id"]')).toHaveAttribute("data-marked", "true");
    await expect(demo.getByRole("status")).toContainText("https://admin.example.com/users/4821");
  });
});

test("focus and click choose a demo button", async ({ page }) => {
  await page.goto("");
  const demo = page.getByTestId("hero-demo");
  await demo.getByRole("button", { name: "Sentry", exact: true }).focus();
  for (const field of ["level_name", "message"]) await expect(demo.locator(`[data-field="${field}"]`)).toHaveAttribute("data-marked", "true");
  await expect(demo.locator('[data-field="user_id"]')).toHaveAttribute("data-marked", "false");
  await expect(demo.getByRole("status")).toContainText("https://acme.sentry.io/issues/?query=Coupon%20not%20applied");
  await demo.getByRole("button", { name: "±5 minutes" }).click();
  await expect(demo.locator('[data-field="datetime"]')).toHaveAttribute("data-marked", "true");
  await expect(demo.getByRole("status")).toContainText("12:34 to 12:44");
});

test("screenshot tabs follow the arrow keys", async ({ page }) => {
  await page.goto("");
  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveCount(5);
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel").getByRole("img")).toHaveAttribute("src", /\/img\/screenshots\/en\/2-rows\.png$/);
  await page.keyboard.press("End");
  await expect(tabs.nth(4)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
});

// import { STORE_URL } from "../src/constants";
test("Add to Chrome goes to the store and Read the docs to the introduction", async ({ page }) => {
  await page.goto("");
  await expect(page.getByRole("link", { name: "Add to Chrome" }).first()).toHaveAttribute("href", STORE_URL);
  await expect(page.getByRole("link", { name: "Read the docs" })).toHaveAttribute("href", "/kibanatool/docs/getting-started/introduction");
});

test("no horizontal scroll at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ["", "tr/", "docs/getting-started/introduction"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  }
});
```

- [ ] **Step 3: Çalıştır, düştüğünü gör**

Run: `cd website && npx playwright install chromium && npm run build && npm run smoke` — Expected: hero, tabs ve link
testleri FAIL (geçici ana sayfa); diğerleri geçebilir.

- [ ] **Step 4: Ekran görüntülerini kopyala**

`.output/store-screenshots/<n>-en.png` → `website/static/img/screenshots/en/<n>.png`, `-tr` → `tr/`. Kaynak yoksa
(`.output` gitignored) spec'teki store görüntüleri yeniden çekilmeden ilerlenemez: kullanıcıya sorulur.

- [ ] **Step 5: `HeroDemo`'yu yaz**

Veri bileşenin içinde sabit (spec §4 "Hero demosu"); alanlar ve buton tablosu spec §6.2, sırasıyla:

```ts
type DemoKind = "link" | "discover" | "plain";
interface DemoAction { id: string; kind: DemoKind; label: string; fields: readonly string[]; result: string; note: string }
```

- Satırlar: `datetime`, `level_name`, `message`, `user_id`, `context.method`, `context.url`, `context.body`,
  `context.headers` ve spec'teki değerleri. Değerler çevrilmez.
- `result` sonuç satırının Roboto Mono, kalın ilk satırı; `note` altındaki düz metin. "⋯" için `result`
  `authorization: ***`, `note` "masked in Copy as Markdown, JSON or cURL"; "⋯" butonunun erişilebilir adı "Copy menu".
- Seçim `useState("admin-user")`; `onMouseEnter`, `onFocus`, `onClick` seçer; fare çıkınca seçim kalır.
- Görünüm: link butonları dolu birincil, Discover butonları `--kt-discover`, `plain` çerçevesiz; işaretli satır `--kt-mark`.

- [ ] **Step 6: `ScreenshotTabs`'ı yaz**

Beş sekme spec §6.2 tablosundaki sırayla; `tablist`/`tab`/`tabpanel`, `aria-controls`, seçili olmayan sekmeler
`tabIndex={-1}`. ←/→ dolaşır (sondan başa sarar), Home/End uçlara gider; ok tuşu seçer ve odaklar. Yalnızca seçili
görüntü render edilir, `width={1280} height={800}`, `alt` = açıklama.

- [ ] **Step 7: Ana sayfayı yaz** (`website/src/pages/index.tsx`, `index.module.css`)

Bölümler, sıra, zemin ve İngilizce metin spec §6.2'den; dar ekran §6.3. "Add to Chrome" iki yerde `STORE_URL`,
Install 2. adımdaki dosya linki `exampleSettingsUrl(i18n.currentLocale)`, "Build from source" → `/docs/more/build-from-source`
(Task 4 oluşturur; o zamana kadar build kırılmasın diye bu link Task 4'te eklenir). Releases kutusu
`usePluginData("kibanatool-changelog")`, tarih `Intl.DateTimeFormat(i18n.currentLocale, { dateStyle: "long", timeZone: "UTC" })`
(UTC'siz, UTC'nin gerisindeki tarayıcıda bir gün önceyi gösterir ve SSR çıktısıyla çelişir),
"All releases" → `/releases`. Layout `title` yok (ana sayfa), `description` hero açıklaması. Config'e
`themeConfig.image: "img/screenshots/en/1-bar.png"` (paylaşım önizlemesi).

- [ ] **Step 8: Testlerin geçtiğini gör**

Run: `npm --prefix website run build && npm --prefix website run smoke` — Expected: PASS (6 test).

- [ ] **Step 9: Commit**

```bash
git add website
git commit -m "feat(website): home page with the hero demo and screenshots"
```

### Task 4: İngilizce docs

**Files:**
- Create: `website/docs/getting-started/{introduction.md,install.mdx,first-setup.md}`,
  `website/docs/configure/{environments,variables,actions,placeholders-and-conditions,example-actions}.md`,
  `website/docs/use/{action-bar-and-row-buttons,view-panel,xml-and-form-data,text-view,copy-and-masking,copy-as-curl}.md`,
  `website/docs/more/{privacy-and-permissions,build-from-source}.md`
- Modify: `website/sidebars.ts`, `website/src/pages/index.tsx` ("Build from source" linki)

**Interfaces:**
- Consumes: `STORE_URL`, `exampleSettingsUrl` (yalnızca `.mdx` sayfalarda import edilebilir).
- Produces: yukarıdaki 16 dosya yolu; Task 5 aynı yolları `i18n/tr/docusaurus-plugin-content-docs/current/` altında
  kurar. URL'ler dosya yolundan: `/docs/<grup>/<sayfa>`.

- [ ] **Step 1: Sayfaları yaz**

İçerik ve kaynak eşlemesi spec §7.2. Kurallar:
- README metni kısaltılmaz, yalnızca bölünür; sayfalar arası "see …" cümleleri ilgili docs sayfasına link olur.
- README'nin göreli linkleri (`PRIVACY.md`, `LICENSE`, `CHANGELOG.md`, `docs/store-listing.md`, `examples/…`,
  `#development`) docs'ta `onBrokenMarkdownLinks: "throw"` ile build'i düşürür: repo dosyaları
  `https://github.com/cllakyz/kibanatool/blob/main/<yol>` olur (örnek ayarlar `exampleSettingsUrl`'deki ham adres),
  bölüm referansları docs sayfası linki olur.
- Her sayfanın front matter'ında `title` ve tek cümlelik `description`.
- "Install" ve "First setup" `.mdx`: süslü parantez ve `<` yalnızca kod parçası ya da kod bloğu içinde
  (`` `{env.name}` ``); düz metinde MDX bunları JavaScript ve JSX sayar.
- "Install": store butonu/linki `STORE_URL`'den; paketlenmemiş yükleme "Build from source"a link.
- "First setup" spec §4'teki sırayla: store'dan kur → örnek ayarları içe aktar (`exampleSettingsUrl("en")`, ayrıca
  "Importing replaces all current settings." notu) → Environments'ta adresi değiştirip **Grant access** → Variables
  → Kibana sekmesini yenile, bir log aç.
- "Privacy and permissions": README "Privacy" + PRIVACY.md özeti + `docs/store-listing.md`'deki üç izin gerekçesi
  (`storage`, `scripting`, isteğe bağlı host izinleri), PRIVACY.md'ye link.
- "Build from source": `npm install`, `npm run build`, `chrome://extensions` → paketlenmemiş yükle `.output/chrome-mv3`;
  geliştirme ayrıntıları için README'nin Development bölümüne link.

- [ ] **Step 2: `sidebars.ts`'i yaz**

Tek `docs` kenar çubuğu, dört kategori ("Getting started", "Configure", "Use", "More"), sayfalar §7.2 sırasıyla,
kategoriler açık (`collapsed: false`).

- [ ] **Step 3: Ana sayfadaki "Build from source" linkini ekle**

- [ ] **Step 4: Doğrula**

Run: `npm --prefix website run build && npm --prefix website run smoke` — Expected: build kırık link vermeden geçer,
smoke PASS.

- [ ] **Step 5: Commit**

```bash
git add website
git commit -m "docs(website): English docs from the README"
```

### Task 5: Türkçe

**Files:**
- Create: `website/i18n/tr/code.json`, `website/i18n/tr/docusaurus-theme-classic/{navbar,footer}.json`,
  `website/i18n/tr/docusaurus-plugin-content-docs/current.json`, Task 4'teki 16 sayfanın Türkçeleri aynı göreli
  yollarla `website/i18n/tr/docusaurus-plugin-content-docs/current/` altında, `website/tests/docs-parity.test.mjs`
- Modify: `website/tests/smoke.spec.ts`

**Interfaces:**
- Consumes: Task 3'ün `home.*` ve Task 2'nin `releases.*` id'leri; Task 4'ün dosya yolları.

- [ ] **Step 1: Testleri yaz**

`website/tests/docs-parity.test.mjs`:

```js
test("every English docs page has a Turkish page", () => {
  assert.deepEqual(list("docs"), list("i18n/tr/docusaurus-plugin-content-docs/current"));
});
```

(`list(dir)`: dizindeki `.md`/`.mdx` dosyalarının göreli yolları, sıralı.) `website/package.json`'daki `test`
script'i `node --test plugins/*.test.mjs tests/*.test.mjs` olur.

`smoke.spec.ts`'e:

```ts
test("the Turkish home page uses Turkish screenshots and the Turkish example file", async ({ page }) => {
  await page.goto("tr/");
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  await expect(page.getByRole("tabpanel").getByRole("img")).toHaveAttribute("src", /\/img\/screenshots\/tr\/1-bar\.png$/);
  await expect(page.locator('a[href$="/examples/kibanatool-settings.tr.json"]')).toHaveCount(1);
});
```

- [ ] **Step 2: Düştüğünü gör**

Run: `npm --prefix website test` — Expected: parity FAIL (Türkçe sayfa yok). Smoke'taki yeni test henüz `.tr.json`
linki olmadığı için değil, görüntü `tr/` olduğu için geçebilir; link adımı Step 3'te doğrulanır.

- [ ] **Step 3: Çeviri dosyalarını üret ve doldur**

Run: `npm --prefix website run write-translations -- --locale tr`; sonra `code.json`, `navbar.json`, `footer.json`,
`current.json` mesajlarını Türkçe yaz. Demo değerleri, URL'ler, `Sentry`, `Jira`, `cURL`, alan adları çevrilmez.
Demo buton etiketleri Türkçe örnek dosyadaki gibi ("Admin'de kullanıcı", "Bu kullanıcının logları", "±5 dakika").
`exampleSettingsUrl("tr")` zaten `.tr.json`'a gider.

- [ ] **Step 4: 16 sayfanın Türkçesini yaz**

İngilizce sayfanın tam çevirisi, "siz" diliyle; arayüz adları sözlükten birebir. "Example actions" Türkçe etiketleri
ve `.tr.json`'ı gösterir. `.mdx` sayfalar `.mdx` kalır.

- [ ] **Step 5: Doğrula**

Run: `npm --prefix website test && npm --prefix website run build && npm --prefix website run smoke` — Expected: PASS
(node 5 test, smoke 7 test).

- [ ] **Step 6: Commit**

```bash
git add website
git commit -m "docs(website): Turkish site and docs"
```

### Task 6: Yayın workflow'u

**Files:**
- Create: `.github/workflows/website.yml`

- [ ] **Step 1: Workflow'u yaz**

- `on`: `pull_request` (branches `main`) ve `push` (branches `main`), ikisi de `paths: ["website/**", "CHANGELOG.md", ".github/workflows/website.yml"]`;
  ayrıca `workflow_dispatch`.
- `permissions: contents: read`; `concurrency: { group: website-${{ github.ref }}, cancel-in-progress: true }`.
- `build` işi (ubuntu-latest, `working-directory: website`): checkout, setup-node 22 (`cache: npm`,
  `cache-dependency-path: website/package-lock.json`), `npm ci`, `npm run typecheck`, `npm test`, `npm run build`,
  `npx playwright install --with-deps chromium`, `npm run smoke`; PR değilse `actions/upload-pages-artifact` ile `website/build`.
- `deploy` işi: `if: github.event_name != 'pull_request'`, `needs: build`, `permissions: { pages: write, id-token: write }`,
  `environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }`, `actions/deploy-pages` (`id: deployment`).
- Aksiyonların sürümleri `ci.yml`'deki gibi en son ana sürüm; `upload-pages-artifact` ve `deploy-pages` için
  `gh api repos/actions/<ad>/releases/latest --jq .tag_name` ile bakılır.

- [ ] **Step 2: Doğrula**

Run: `cd website && node -e "require('js-yaml').load(require('fs').readFileSync('../.github/workflows/website.yml', 'utf8'))"`
(`js-yaml` Docusaurus'la gelir) — Expected: çıktı yok. Gerçek çalışma PR'da görülür (Task 8).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/website.yml
git commit -m "ci: build, test and publish the website"
```

### Task 7: README ve CLAUDE.md

**Files:**
- Modify: `README.md`, `CLAUDE.md`

- [ ] **Step 1: README'yi kısalt** (spec §8)

Kalanlar sırayla: başlık ve iki cümle; "Website: https://cllakyz.github.io/kibanatool/"; "Install" üç madde (store
linki `STORE_URL` ile aynı adres; örnek ayarları içe aktar; adresi değiştirip Grant access) ve "Full guide" linki
(İngilizce ve Türkçe docs girişleri); "Privacy" iki cümle ve PRIVACY.md; "Development" bölümünün tamamı (yeni alt
başlık "Website": `npm --prefix website ci`, `start`, `build`, `test`, `smoke`); "Credits"; "License". Taşınan
bölümler silinir; README'nin iç linkleri (`#development` vb.) çalışır kalır.

- [ ] **Step 2: CLAUDE.md'ye ekle**

- "Commands": `npm --prefix website start|build|test|smoke`.
- "Architecture"ya bir paragraf: site `website/`'da, ayrı paket, eklenti kodunu import etmez; sürüm bilgisi
  `CHANGELOG.md`'den, store adresi `website/src/constants.ts`'ten.
- "Traps"e: kullanım kılavuzu docs'ta, README kısa; eklentinin bir arayüz metni değişince iki dildeki docs da
  güncellenir; bir docs sayfası iki dilde birlikte eklenir (parity testi); `translate()` mesajına `{…}` kod yazılmaz;
  `website/static/img/icon.svg` ve `favicon.png`, `assets/icon.svg` ve `public/icon/32.png`'nin kopyasıdır.
- "Docs": Plan 8 (web sitesi) tamamlananlara.

- [ ] **Step 3: Doğrula**

Run: `npm run typecheck && npm test && npm --prefix website run build` — Expected: hepsi geçer.

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: short README pointing to the website"
```

### Task 8: Elle doğrulama ve PR

**Files:**
- Create: `docs/verification/2026-10-website.md`

- [ ] **Step 1: Elle kontrol** (`npm --prefix website run serve`, uygulamanın tarayıcı paneli)

- M1: 1280px ve 375px'te ana sayfa ve bir docs sayfası, açık ve koyu tema: bölüm sırası ve zeminler spec §6.2, taşma yok.
- M2: Türkçe sayfalarda ğ, ş, ı, İ Schibsted Grotesk'te (yedek fonta düşmüyor).
- M3: Klavyeyle: Tab sırası navbar → hero butonları → demo → sekmeler; odak halkası her yerde görünür.
- M4: Arama "masking" ve "maskeleme" için ilgili docs sayfalarını buluyor.
- M5: `prefers-reduced-motion: reduce` ile demo ve sekmelerde geçiş yok.

- [ ] **Step 2: Karşıtlığı ölç**

§5.1 dışında yeni bir renk çifti kullanıldıysa ve demodaki işaretli satırda (`--kt-value` / `--kt-key` üstünde
`--kt-mark`, iki tema) `src/theme.ts`'teki `luminance` ile oran hesaplanır; metin ≥ 4.5:1 olmalı, değilse işaret rengi
yerine satıra 3:1'lik bir kenar çizgisi verilir ve kullanıcıya söylenir.

- [ ] **Step 3: Kayıt ve tüm kontroller**

Sonuçlar `docs/verification/2026-10-website.md`'ye. Run: `npm run typecheck && npm test && npm run build && npm run check:manifest`
ve `npm --prefix website test && npm --prefix website run build && npm --prefix website run smoke` — Expected: hepsi geçer.

- [ ] **Step 4: Commit, sonra sor**

```bash
git add docs/verification/2026-10-website.md
git commit -m "docs: website verification"
```

Push ve PR için kullanıcıya sorulur. PR açıklaması: birleştirme store onayından sonra (Task 9), önce Pages açılır.

### Task 9: Store onayından sonra yayın

Kullanıcı store item ID'sini verdiğinde.

- [ ] **Step 1:** `website/src/constants.ts`'te `STORE_ITEM_ID`'yi ve README'deki store linkini gerçek adresle değiştir.
  Run: `grep -rn STORE_ITEM_ID website/src README.md` — Expected: çıktı yok. Build + smoke geçer. Commit
  `chore(website): Chrome Web Store link`, kullanıcıya sorup push.
- [ ] **Step 2 (kullanıcı):** GitHub → Settings → Pages → Source: "GitHub Actions"; repo "About" → Website alanına
  `https://cllakyz.github.io/kibanatool/`.
- [ ] **Step 3 (kullanıcı):** PR'ı birleştirir. `website.yml`'nin `deploy` işinin yeşil olduğu ve
  `https://cllakyz.github.io/kibanatool/` ile `/tr/`'nin açıldığı kontrol edilir.
