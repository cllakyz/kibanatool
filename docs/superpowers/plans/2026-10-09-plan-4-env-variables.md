# kibanatool Plan 4 — Ortam Değişkenleri ve Adla Data View Seçimi: Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aynı buton setinin her ortamda kopyalanmadan çalışması. Bunun için iki şey eklenir:

- `{env.ad}` yer tutucularıyla ortam değişkenleri.
- Discover aksiyonlarında hedef data view'ın adla seçilmesi (`dataViewName`).

**Architecture:**
- **Ayarlar:** Ayar şeması 2. sürüme çıkar. Her ortam bir `variables` kaydı taşır, Discover aksiyonu da `dataViewName` alabilir. Sürüm 1 girdiler `parseConfig` içinde çevrilir; bu hem dosyalar hem de depodaki ayarlar için geçerlidir.
- **Şablon motoru:** Alan ve değişken yer tutucularını ayırır. Değişkeni linke olduğu gibi, KQL'e tırnaklı yazar.
- **Butonlar:** Eksik ya da geçersiz değişkende ve çözülemeyen data view adında butonlar gizlenmez, pasif görünür.
- **Data view listesi:** Discover'da, buton çubuğu yüklenirken, açık space için bir kez çekilir. 8.x/9.x'te `/api/data_views`, 7.17'de `saved_objects/_find` kullanılır.
- **Ayarlar sayfası:** Değişken × ortam tablosu, hedef data view girişi, ortama göre önizleme ve eksik değişken uyarıları eklenir.

**Tech Stack:** Plan 3 ile aynı. Yeni bağımlılık yok.
- Uygulama: WXT 0.21, React 19, TypeScript 5.9 (strict)
- Kütüphaneler: zod 4, rison-node 2.1, lz-string 1.5
- Test: Vitest 5, happy-dom 20, Playwright 1.64
- Ortam: Docker (Elasticsearch + Kibana 7.17.29 / 8.19.23 / 9.5.5)

**Spec:** `docs/superpowers/specs/2026-10-09-env-variables-design.md`. Kullanıcı 2026-10-09'da onayladı. Ana spec: `docs/superpowers/specs/2026-10-07-kibanatool-design.md`.

**Önceki planlar:** Plan 1, 2 ve 3 `main`'de. Plan 3, PR #3 ile girdi (merge commit `30e45de`).

**Çalışma dalı:** Ana checkout'ta yeni dal `plan-4-env-variables`, worktree açılmaz. Bu, Plan 2 ve 3'te kullanıcının seçtiği yöntemdir; kullanıcı başka bir yol isterse onunki geçerlidir. `docs/superpowers/` hiçbir commit'e girmez.

**Sürüm:** Bu özellik yayınlanmamış 1.0.0'a dahildir (kullanıcı kararı). `package.json` sürümü değişmez.

### Planların sırası

| Plan | Kapsam |
|---|---|
| 1–3 (tamamlandı) | Link ve Discover aksiyonları, kopyalama, JSON görünümü, ayarlar sayfası, uçtan uca matris, CI, mağaza paketi |
| **4 (bu plan)** | Ortam değişkenleri (`{env.ad}`), `dataViewName`, ayar sürümü 2, değişken tablosu, pasif butonlar |

### Kararlar

Hepsi kullanıcıyla 2026-10-09'da tek tek alındı (spec §2). Bu planda kullanıcıya bırakılmış açık karar yoktur:

| Konu | Karar |
|---|---|
| Yazım | `{env.ad}`. `env.` öneki şablonda her zaman değişkendir. |
| Değişken değeri | Linke kodlanmadan, KQL'e tırnaklı girer. |
| Eksik ya da geçersiz değişken | Pasif buton ve ayarlar sayfasında uyarı. |
| Adın eşleşmesi | Görünen ad (`name`) ya da index deseni (`title`) birebir tutmalı. |
| Ad bulunamazsa, belirsizse ya da liste alınamazsa | Pasif buton. |
| Ayar alanı | Yeni `dataViewName`; `dataViewId` kalır, ikisi birlikte dolu olamaz. |
| Adın girilmesi | Serbest metin; ayarlar sayfası Kibana'ya bağlanmaz. |
| Adın çözülmesi | Discover'da, çubuk yüklenirken. |
| Ayar sürümü | 2. Sürüm 1 yüklenirken çevrilir, 2'den büyük sürüm reddedilir. |
| Değişken düzenleme | Değişken × ortam tablosu. |
| Eklenti sürümü | 1.0.0'a dahil. |

### Plan yazılırken yapılan denemeler (2026-10-09)

| Deneme | Sonuç |
|---|---|
| `GET /api/data_views`: 7.17.29, 8.19.23 ve 9.5.5 | 8/9: `data_view[]` (`id`, `title`, `name`). Seed'de `name` desene eşit. 7.17: 404. |
| `GET /api/saved_objects/_find?type=index-pattern&fields=title`: üç sürüm ve Alpha (7.17.26) | Hepsinde çalışıyor. 7.17'de `name` yok. `/s/<space>/` öneki yalnızca o space'in data view'larını getiriyor. |
| 8.19 ve 9.5'te `{id: "app-log-named", title: "app_log", name: "App logs"}` oluşturmak | İkisinde de 200. Kibana, aynı desenli ikinci data view'ı kabul ediyor. Deneme kaydı silindi; seed (Task 6) bunu kalıcı olarak kurar. |
| zod 4: `z.record(z.string().regex(…), z.string().min(1)).default({})` | Alan yoksa `{}` olur. Geçersiz anahtarda yol `["variables", "<anahtar>"]` ve mesaj `Invalid key in record` (özel mesaj görünmüyor); testler yolu doğrular. Boş değer `too_small` hatası verir. `__proto__` anahtarı sessizce atılıyor, prototip değişmiyor. |

### Uygulama notları

- **`variables` için varsayılan:** Şemada `variables` alanına `.default({})` verilir. Böylece sürüm 1 çevirisi yalnızca sürüm numarasını değiştirir, ve elle yazılmış bir sürüm 2 dosyasında alan yoksa `{}` sayılır. Bu, spec §3'teki "eski dosyalar boş liste olarak yüklenir" davranışının uygulamasıdır.
- **Önceki `resolveTemplate`:** Yerini yeni `fillTemplate` alır. Eski testlerin değişmeden çalışması için `template.test.ts` içinde aynı adlı küçük bir yardımcı tanımlanır.

## Global Constraints

- **Node ve npm:** Node `>=22`, paket yöneticisi `npm`. **Yeni bağımlılık eklenmez.**
- **TypeScript:** `typescript@5`, `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax` (tip import'ları `type` ile). `npm run typecheck` `tests/e2e/` ve `playwright.config.ts` dosyalarını da kapsar.
- **Desteklenen Kibana sürümleri:** 7.17.29, 8.19.23 ve 9.5.5. Yalnızca Chrome MV3, yalnızca Discover.
- **Manifest izinleri değişmez:**
  - `permissions` tam olarak `["storage", "scripting"]`
  - `optional_host_permissions` tam olarak `["http://*/*", "https://*/*"]`
  - `npm run check:manifest` her task'ın sonunda geçer.
- **Ayar modeli (spec §3):**
  - `schemaVersion: 2`. Sürüm 1 girdi yalnızca çeviriyle kabul edilir, başka sürümler reddedilir.
  - `Environment.variables: Record<string, string>`. Ad kalıbı `VARIABLE_NAME = /^[A-Za-z0-9_-]+$/`, değer boş olmayan metin.
  - `DiscoverAction.dataViewName?: string`. `dataViewId` ile birlikte dolu olamaz.
- **Şablon (spec §4):**
  - `env.` ile başlayan yol her zaman ortam değişkenidir ve logdan okunmaz.
  - Değişken yalnızca kendi anahtarından okunur (`Object.hasOwn`).
  - Link adresinde değişken olduğu gibi, alan `encodeURIComponent` ile eklenir. KQL'de ikisi de `kqlQuote` ile tırnaklanır.
- **Buton durumu sırası (spec §5.3):**
  1. Gizli: kapalı, koşul tutmuyor ya da alan yer tutucusu boş.
  2. Pasif: tanımsız değişken.
  3. Pasif: geçersiz baş değişken (yalnızca link).
  4. Gizli: geçersiz adres (yalnızca link).
  5. Pasif: data view adı (yalnızca Discover).
  6. Pasif: `noTime` (yalnızca Discover).
- **Kibana'yı bozmamak:**
  - İçerik betiği hiçbir hatayı dışarı sızdırmaz; hatalar `console.debug("[kibanatool]", ...)` ile loglanır.
  - Liste çağrısının hatası yalnızca `dataViewName` kullanan butonları pasif yapar.
- **UI:**
  - Shadow DOM içinde React. `innerHTML` ya da `dangerouslySetInnerHTML` kullanılmaz.
  - Her yeni kullanıcı metni `public/_locales/en/messages.json` ve `public/_locales/tr/messages.json` dosyalarının ikisine birden eklenir. `MessageKey` İngilizce dosyadan türetilir. `tests/unit/i18n.test.ts` iki dosyanın aynı anahtarları ve yer tutucuları taşıdığını denetler.
- **Import yolları:**
  - `wxt/browser` ve `#imports` yalnızca `entrypoints/`, `src/i18n.ts` ve onu import eden `src/passive-text.ts` içinde kullanılır.
  - `src/i18n.ts`'i import eden React bileşenlerinin birim testi yazılmaz; onları uçtan uca testler sınar.
  - `src/core/` tarayıcı API'si kullanmaz.
- **Uçtan uca testler:**
  - Yerelleştirilmiş metin doğrulanmaz. Kullanılabilecek seçiciler: `data-test-subj`, ARIA rolleri, eklentinin sınıf adları, `name` ve `data-*` öznitelikleri, ayarlardaki etiketler. Pasif butonun `title` metninde yalnızca dile bağlı olmayan değerler (değişken adı, data view adı, sayı) aranır.
  - Zaman URL'deki `_g.time`'dan okunur.
  - Sabit `waitForTimeout` beklemesi yazılmaz.
- **Seed sözleşmesi:** `docker/seed.mjs` ile `tests/e2e` aynı commit'te değişir.
- **Docker:**
  - Sırlar `docker/.env.<major>` dosyalarındadır ve hiçbir çıktıya, loga, commit'e ya da rapora yazılmaz.
  - Ekibin `spinehub-*` konteynerlerine ve `:9601`, `:9200`, `:9201` portlarına dokunulmaz.
- **Komutlar (her task'ın sonunda):** `npm test`, `npm run typecheck`, `npm run build`, `npm run check:manifest`. Uçtan uca testleri değiştiren task'lar ayrıca şunları çalıştırır: `KT_STACK=7 npm run e2e`, `KT_STACK=8 npm run e2e`, `KT_STACK=9 npm run e2e`.
- **Git:**
  - Bu depoda `user.email` yerel olarak `cllakyz@hotmail.com`.
  - Her commit mesajı `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` satırıyla biter.
  - `docs/superpowers/` commit edilmez.
  - Push, PR, etiket ve sürüm yalnızca kullanıcının açık onayıyla yapılır. Push komutu: `GH_TOKEN=$(gh auth token --user cllakyz) git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push`
  - Commit'ten önce `git branch --show-current` ile dalın `plan-4-env-variables` olduğu doğrulanır.

## Review Focus

1. **Depoda duran sürüm 1 ayar:** Güncelleme sonrası `chrome.storage.local`'daki sürüm 1 ayar boş ayara dönmemeli, sürüm 2 olarak yüklenmeli. Kullanıcının Alpha ayarları bu durumda. Testi Task 1 içerir (`storage.test.ts`).
2. **Devralınan anahtarlar:** `{env.constructor}` ve `{env.toString}` "tanımsız" sayılmalı, `Object.prototype`'tan değer gelmemeli. Değişken tablosunda yalnızca bir ortamda tanımlı `constructor` adlı değişken diğer ortamlarda boş görünmeli. `__proto__` adlı anahtar prototipi değiştirmemeli. Testleri Task 1 (`config.test.ts`), Task 2 (`template.test.ts`) ve Task 4 (`model.test.ts`) içerir.
3. **İç boşluklu data view adı ("App logs"):** Ad yazılırken her tuşta değil, kaydedilirken kırpılmalı. Bugünkü `dataViewId` girişi her tuşta kırpıyor; aynısı adda boşluk yazmayı imkânsız kılar. Testleri Task 5 (`model.test.ts`) ve Task 6 (`options.spec.ts`) içerir.
4. **`{env.a|env.b}` başta, `a` tanımsız, `b` `http(s)` değil:** Gizlenmemeli; "b geçersiz" gerekçesiyle pasif olmalı. Testi Task 2 içerir (`link-actions.test.ts`).
5. **Adla seçilen hedefte zaman penceresi:** Pencere açık data view'ın değil, adın çözüldüğü data view'ın zaman alanına göre kurulmalı. Testleri Task 3 (`discover-actions.test.ts`, `bar-data.test.ts`) içerir.

## Dosya yapısı

```
src/core/config.ts             (değişir) schemaVersion 2, variables, dataViewName, çevirme
src/core/template.ts           (değişir) env. yolları, fillTemplate, leadingVariablePaths
src/core/passive.ts            (yeni)    PassiveReason
src/core/link-actions.ts       (değişir) değişkenler, pasif buton, invalidLeadingVariable
src/core/discover-actions.ts   (değişir) değişkenler, pasif buton, adla hedef
src/core/data-view-names.ts    (yeni)    resolveDataViewName, discoverTarget
src/core/types.ts              (değişir) DataViewSummary
src/kibana/client.ts           (değişir) listDataViews
src/content/bar-data.ts        (değişir) loadDataViews, timeFieldTargets(…, views)
src/content/ActionBar.tsx      (değişir) environment prop, pasif butonlar, data view listesi
src/passive-text.ts            (yeni)    describePassive (yerelleştirilmiş gerekçe)
src/options/model.ts           (değişir) newEnvironment, variableRows, withVariables, variableWarnings, withAction kırpma
src/options/preview.ts         (değişir) previewAction(…, variables)
entrypoints/kibana.ts          (değişir) açık ortamı çubuğa verir
entrypoints/options/
  App.tsx                      (değişir) VariablesSection
  VariablesSection.tsx         (yeni)
  ActionEditor.tsx             (değişir) önizleme ortamı, hedef data view, uyarılar
  ActionsSection.tsx           (değişir) uyarılar
  feedback.tsx                 (değişir) VariableWarnings
  options.css                  (değişir) değişken tablosu
public/_locales/{en,tr}/messages.json   (değişir)
docker/seed.mjs                (değişir) app-log-named (8.x/9.x)
tests/unit/…                   (değişir/yeni) bkz. task'lar
tests/e2e/fixtures.ts          (değişir) e2eConfig sürüm 2
tests/e2e/variables.spec.ts    (yeni)
tests/e2e/options.spec.ts      (değişir)
examples/kibanatool-settings.json, README.md, CHANGELOG.md, CLAUDE.md   (değişir)
docs/verification/2026-10-plan-4.md     (yeni, Task 8)
```

---

### Task 0: Dalı aç

- [ ] **Step 1: Ana checkout'ta `main`'den yeni dal aç**

```bash
git switch main && git pull --ff-only && git switch -c plan-4-env-variables
git status --short   # boş olmalı
```

Bu adımın commit'i yoktur.

---

### Task 1: Ayar sürümü 2: değişkenler, `dataViewName` ve çevirme

**Files:**
- Modify: `src/core/template.ts`, `src/core/config.ts`, `src/options/model.ts`, `examples/kibanatool-settings.json`, `tests/e2e/fixtures.ts`
- Test: `tests/unit/core/template.test.ts`, `tests/unit/core/config.test.ts`, `tests/unit/options/model.test.ts`, `tests/unit/storage.test.ts`, `tests/unit/background/registration.test.ts`

**Interfaces:**
- Consumes: mevcut `parseConfig`, `emptyConfig`, `isHttpUrl`, `parsePlaceholders`, `isPlainObject` (`src/core/fields.ts`)
- Produces:
  - `template.ts`: `VARIABLE_PREFIX = "env."`, `isVariablePath(path: string): boolean`, `leadingVariablePaths(template: string): string[] | null`, `isHttpUrlTemplate(template)` (yeni kural)
  - `config.ts`: `VARIABLE_NAME: RegExp`, `SCHEMA_VERSION = 2`
  - `Environment` tipine `variables: Record<string, string>`, `DiscoverAction` tipine `dataViewName?: string`
  - `emptyConfig()` artık `schemaVersion: 2`
  - `newEnvironment(...)` artık `variables: {}` döndürür.

- [ ] **Step 1: Şablon testlerini ekle**

`tests/unit/core/template.test.ts` dosyasında import satırını şöyle değiştir:
```ts
import { isHttpUrl, isHttpUrlTemplate, leadingVariablePaths, lookup, parsePlaceholders, resolveTemplate } from "../../../src/core/template";
```
Dosyanın sonuna ekle:
```ts
describe("leadingVariablePaths", () => {
  it("returns the paths of a placeholder at the start that holds only env. paths", () => {
    expect(leadingVariablePaths("{env.adminUrl}/users/{user_id}")).toEqual(["env.adminUrl"]);
    expect(leadingVariablePaths("  {env.a|env.b}/x")).toEqual(["env.a", "env.b"]);
    expect(leadingVariablePaths("{context.host|env.h}/x")).toBeNull();
    expect(leadingVariablePaths("https://{env.host}/x")).toBeNull();
    expect(leadingVariablePaths("{user_id}")).toBeNull();
  });
});

describe("isHttpUrlTemplate with variables", () => {
  it("accepts a template that starts with a variable placeholder", () => {
    expect(isHttpUrlTemplate("{env.adminUrl}/users/{user_id}")).toBe(true);
    expect(isHttpUrlTemplate("{user_id}/x")).toBe(false);
    expect(isHttpUrlTemplate("{context.host|env.h}/x")).toBe(false);
  });
});
```

- [ ] **Step 2: Ayar testlerini güncelle ve ekle**

`tests/unit/core/config.test.ts` dosyasında:
- `validConfig()` içindeki `schemaVersion: 1` → `schemaVersion: 2`.
- Ortam satırı → `{ id: "prod", name: "Prod", kibanaUrl: "https://kibana.example.com", variables: {} }`.
- "rejects non-http link templates with a field path" testindeki beklenen mesajı değiştir:
```ts
    expect(errorsOf(config)).toContain("actions.0.urlTemplate: must start with http://, https:// or an {env.…} placeholder");
```
- "rejects an unknown schemaVersion" testini sil. Yerine gelen test aşağıdaki blokta.

Dosyanın sonuna ekle:
```ts
describe("parseConfig version 2 (Plan 4)", () => {
  it("migrates a version 1 config: version 2, and environments without variables get none", () => {
    const v1 = {
      ...validConfig(),
      schemaVersion: 1,
      environments: [{ id: "prod", name: "Prod", kibanaUrl: "https://kibana.example.com" }],
    };
    expect(parseConfig(v1)).toEqual({ ok: true, config: validConfig() });
  });

  it("rejects versions other than 1 and 2", () => {
    expect(errorsOf({ ...validConfig(), schemaVersion: 3 })[0]).toMatch(/^schemaVersion: /);
    expect(errorsOf({ ...validConfig(), schemaVersion: 0 })[0]).toMatch(/^schemaVersion: /);
  });

  it("accepts environment variables and rejects a bad name or an empty value", () => {
    const withVariables = (variables: Record<string, string>) => ({
      ...validConfig(),
      environments: [{ ...validConfig().environments[0]!, variables }],
    });
    expect(parseConfig(withVariables({ adminUrl: "https://admin.example.com", "app_name-2": "x" })).ok).toBe(true);
    expect(errorsOf(withVariables({ "a.b": "x" }))[0]).toMatch(/^environments\.0\.variables\.a\.b: /);
    expect(errorsOf(withVariables({ a: "" }))[0]).toMatch(/^environments\.0\.variables\.a: /);
  });

  it("drops a __proto__ variable without touching the prototype", () => {
    const result = parseConfig(
      JSON.parse(
        '{"schemaVersion":2,"environments":[{"id":"p","name":"P","kibanaUrl":"https://k.test","variables":{"__proto__":"https://evil.test"}}],"actions":[],"copy":{"markdownFields":[],"maskPatterns":[]}}',
      ),
    );
    if (!result.ok) throw new Error(result.errors.join("; "));
    const variables = result.config.environments[0]!.variables;
    expect(Object.keys(variables)).toEqual([]);
    expect(Object.getPrototypeOf(variables)).toBe(Object.prototype);
  });

  it("accepts a link template that starts with a placeholder of variables only", () => {
    const withTemplate = (urlTemplate: string): Config => {
      const config = validConfig();
      config.actions[0] = { ...config.actions[0]!, urlTemplate } as Config["actions"][number];
      return config;
    };
    expect(parseConfig(withTemplate("{env.adminUrl}/users/{user_id}")).ok).toBe(true);
    expect(parseConfig(withTemplate("{env.a|env.b}/x")).ok).toBe(true);
    expect(errorsOf(withTemplate("{context.host|env.h}/x"))).toContain(
      "actions.0.urlTemplate: must start with http://, https:// or an {env.…} placeholder",
    );
  });

  it("accepts dataViewName and rejects it together with dataViewId", () => {
    const config = validConfig();
    config.actions[1] = { ...config.actions[1]!, dataViewName: "App logs" } as Config["actions"][number];
    expect(parseConfig(config).ok).toBe(true);
    config.actions[1] = { ...config.actions[1]!, dataViewId: "app-log" } as Config["actions"][number];
    expect(errorsOf(config)).toContain("actions.1.dataViewName: dataViewId and dataViewName cannot both be set");
  });
});
```

- [ ] **Step 3: Depo, model ve kayıt testlerini güncelle**

`tests/unit/storage.test.ts`:
- `config` sabitindeki ortamı `{ id: "local", name: "Local", kibanaUrl: "http://localhost:9601", variables: {} }` yap.
- `describe("createConfigStore", …)` bloğuna, "falls back to the empty config…" testinden önce ekle:
```ts
  it("loads a stored version 1 config as version 2 instead of the empty config", async () => {
    const stored = {
      ...config,
      schemaVersion: 1,
      environments: [{ id: "local", name: "Local", kibanaUrl: "http://localhost:9601" }],
    };
    await expect(createConfigStore(fakeArea({ [CONFIG_KEY]: stored })).load()).resolves.toEqual({ config, errors: [] });
  });
```

`tests/unit/options/model.test.ts`:
- "trims the inputs and uses the given id" testinde beklenen nesneye `variables: {},` ekle.
- "rejects bad JSON and invalid configs with field paths" testinde `schemaVersion: 2` → `schemaVersion: 3`.
- `describe("parseImport", …)` bloğuna ekle:
```ts
  it("imports a version 1 file as version 2", () => {
    const result = parseImport(JSON.stringify({ ...emptyConfig(), schemaVersion: 1 }));
    expect(result.ok && result.config.schemaVersion).toBe(2);
  });
```

`tests/unit/background/registration.test.ts`: `config` sabitindeki üç ortamın her birine `variables: {}` ekle.

- [ ] **Step 4: Testleri çalıştır, kırıldıklarını gör**

Çalıştır: `npx vitest run tests/unit/core/template.test.ts tests/unit/core/config.test.ts tests/unit/storage.test.ts tests/unit/options/model.test.ts`
Beklenen: FAIL (`leadingVariablePaths` yok, `schemaVersion: 2` reddediliyor).

- [ ] **Step 5: `template.ts`'e değişken yollarını ekle**

`src/core/template.ts` dosyasında `isHttpUrlTemplate` fonksiyonunu şu kodla değiştir:
```ts
/** `env.<name>` paths name environment variables, never log fields (Plan 4 spec §4). */
export const VARIABLE_PREFIX = "env.";

export function isVariablePath(path: string): boolean {
  return path.startsWith(VARIABLE_PREFIX);
}

const LEADING_PLACEHOLDER = new RegExp(`^${PLACEHOLDER.source}`);

/** Paths of the placeholder `template` starts with, when they are all variables; null otherwise. */
export function leadingVariablePaths(template: string): string[] | null {
  const match = LEADING_PLACEHOLDER.exec(template.trim());
  if (!match) return null;
  const paths = (match[1] ?? "").split("|");
  return paths.every(isVariablePath) ? paths : null;
}

/** Plan 4 spec §3: an http(s) template, or one whose base comes from a variable. */
export function isHttpUrlTemplate(template: string): boolean {
  return /^https?:\/\//i.test(template.trim()) || leadingVariablePaths(template) !== null;
}
```

- [ ] **Step 6: Şemayı sürüm 2'ye çıkar**

`src/core/config.ts`:

Import'lara ekle:
```ts
import { isPlainObject } from "./fields";
```

`urlTemplate` satırını değiştir:
```ts
  urlTemplate: z.string().refine(isHttpUrlTemplate, { error: "must start with http://, https:// or an {env.…} placeholder" }),
```

`discoverActionSchema` içinde `dataViewId` satırının altına ekle:
```ts
  dataViewName: z.string().min(1).optional(),
```

`environmentSchema`'yı değiştir:
```ts
/** Plan 4 spec §3: variable names are letters, digits, `_` and `-`. */
export const VARIABLE_NAME = /^[A-Za-z0-9_-]+$/;

const environmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kibanaUrl: z.string().refine(isHttpUrl, { error: "must be a valid http(s) URL" }),
  // Empty values are not stored; a missing record (version 1, a hand-written file) is none.
  variables: z.record(z.string().regex(VARIABLE_NAME), z.string().min(1)).default({}),
});
```

`configSchema` içinde `schemaVersion: z.literal(1),` → `schemaVersion: z.literal(2),`.

`superRefine` içindeki `config.actions.forEach((action, actionIndex) => { … })` döngüsünün sonuna, `action.conditions.forEach(…)` çağrısından sonra ekle:
```ts
      if (action.kind === "discover" && action.dataViewId !== undefined && action.dataViewName !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: "dataViewId and dataViewName cannot both be set",
          path: ["actions", actionIndex, "dataViewName"],
          input: action.dataViewName,
        });
      }
```

`parseConfig`'i şu kodla değiştir:
```ts
export const SCHEMA_VERSION = 2;

/**
 * Plan 4 spec §3: version 1 had no variables and no dataViewName, so it only needs the new number. Done here,
 * so both imported files and settings already in chrome.storage (storage.ts) are converted, not dropped.
 */
function migrate(input: unknown): unknown {
  return isPlainObject(input) && input.schemaVersion === 1 ? { ...input, schemaVersion: SCHEMA_VERSION } : input;
}

export function parseConfig(input: unknown): ParseResult {
  const result = configSchema.safeParse(migrate(input));
  if (result.success) return { ok: true, config: withKnownEnvironments(result.data) };
  return {
    ok: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`,
    ),
  };
}
```

`emptyConfig()` içinde `schemaVersion: 1` → `schemaVersion: SCHEMA_VERSION`.

- [ ] **Step 7: `newEnvironment`, örnek dosya ve uçtan uca ayarı**

`src/options/model.ts` → `newEnvironment`:
```ts
export function newEnvironment(name: string, kibanaUrl: string, id: string = crypto.randomUUID()): Environment {
  return { id, name: name.trim(), kibanaUrl: kibanaUrl.trim(), variables: {} };
}
```

`examples/kibanatool-settings.json`:
- `"schemaVersion": 1` → `"schemaVersion": 2`.
- Ortamı şöyle yap: `{ "id": "prod", "name": "Production", "kibanaUrl": "https://kibana.example.com", "variables": {} }`.
- İçerik Task 7'de zenginleşir.

`tests/e2e/fixtures.ts` → `e2eConfig()`:
- `schemaVersion: 1` → `schemaVersion: 2`.
- Ortamı şöyle yap: `{ id: "stack", name: \`Kibana ${stack.version}\`, kibanaUrl: stack.kibana, variables: {} }`.

- [ ] **Step 8: Bütün kontrolleri çalıştır**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest
```
Beklenen: hepsi geçer. `typecheck` hata verirse, başka yerlerdeki tipli ortam nesnelerine de `variables: {}` ekle. Bunları `rg -n "kibanaUrl:" src entrypoints tests` ile bul.

- [ ] **Step 9: Commit**

```bash
git branch --show-current   # plan-4-env-variables
git add src/core/template.ts src/core/config.ts src/options/model.ts examples/kibanatool-settings.json tests/e2e/fixtures.ts tests/unit
git commit -m "feat: settings version 2 with environment variables and dataViewName

Version 1 settings are converted when parsed, so files and stored settings both load.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Değişkenler şablonda; pasif butonlar

**Files:**
- Create: `src/core/passive.ts`, `src/passive-text.ts`
- Modify: `src/core/template.ts`, `src/core/link-actions.ts`, `src/core/discover-actions.ts`, `src/options/preview.ts`, `src/content/ActionBar.tsx`, `entrypoints/kibana.ts`, `entrypoints/options/ActionEditor.tsx`, `public/_locales/en/messages.json`, `public/_locales/tr/messages.json`
- Test: `tests/unit/core/template.test.ts`, `tests/unit/core/link-actions.test.ts`, `tests/unit/core/discover-actions.test.ts`, `tests/unit/options/preview.test.ts`

**Interfaces:**
- Consumes: Task 1'den `VARIABLE_PREFIX`, `isVariablePath`, `leadingVariablePaths`, `Environment.variables`
- Produces:
  - `template.ts`:
    - `type Variables = Readonly<Record<string, string>>`
    - `lookupVariable(variables: Variables, path: string): string | null`
    - `interface Encoders { field: (value: string) => string; variable: (value: string) => string }`
    - `type TemplateResult = { ok: true; text: string } | { ok: false; reason: "missingValue" } | { ok: false; reason: "missingVariable"; variable: string }`
    - `fillTemplate(template, fields, variables, encoders): TemplateResult`
    - `resolveTemplate` silinir.
  - `passive.ts`: `type PassiveReason`, aşağıdaki altı varyantla.
  - `link-actions.ts`:
    - `type LinkButton = { id; label; url: string } | { id; label; passive: PassiveReason }`
    - `type LinkResolution = { ok: true; url } | { ok: false; reason: HiddenReason } | { ok: false; passive: PassiveReason }`
    - `resolveLinkAction(action, fields, variables)`, `buildLinkButtons(actions, fields, variables)`
    - `invalidLeadingVariable(template: string, variables: Variables): string | undefined`
  - `discover-actions.ts`:
    - `QueryResolution` bir `{ ok: false; passive }` varyantı kazanır.
    - `resolveDiscoverQuery(action, fields, variables)`
    - `DiscoverContext.variables: Variables`
    - `DiscoverButton = { id; label; url } | { id; label; passive: PassiveReason }`. Eski `disabled: "noTime"` artık `passive: { kind: "noTime" }`.
  - `preview.ts`: `previewAction(action, fields, variables)`. `Preview` bir `{ shown: false; passive }` varyantı kazanır.
  - `passive-text.ts`: `describePassive(reason: PassiveReason, environmentName: string): string`
  - `ActionBar` yeni bir zorunlu prop alır: `environment: Environment`.

- [ ] **Step 1: Şablon testlerini ekle**

`tests/unit/core/template.test.ts` dosyasının başını şöyle değiştir. Eski testler aynı adlı yardımcıyla değişmeden çalışır:
```ts
import { describe, expect, it } from "vitest";
import type { FieldMap } from "../../../src/core/fields";
import {
  fillTemplate,
  isHttpUrl,
  isHttpUrlTemplate,
  leadingVariablePaths,
  lookup,
  parsePlaceholders,
} from "../../../src/core/template";

const enc = encodeURIComponent;

/** The old field-only API as a test helper, so the cases below read as before. */
function resolveTemplate(template: string, fields: FieldMap, encode: (value: string) => string): string | null {
  const result = fillTemplate(template, fields, {}, { field: encode, variable: encode });
  return result.ok ? result.text : null;
}
```
Dosyanın sonuna ekle:
```ts
describe("fillTemplate with variables", () => {
  const encoders = { field: encodeURIComponent, variable: (value: string) => value };
  const variables = { adminUrl: "https://admin.alpha.test", app: "bitalih api" };

  it("inserts variables as they are and encodes field values", () => {
    expect(fillTemplate("{env.adminUrl}/users/{user_id}?q={q}", { user_id: 7, q: "a b" }, variables, encoders)).toEqual({
      ok: true,
      text: "https://admin.alpha.test/users/7?q=a%20b",
    });
  });

  it("tries field and variable paths of a fallback left to right", () => {
    const template = "https://{context.host|env.host}/x";
    expect(fillTemplate(template, { "context.host": "h.test" }, { host: "d.test" }, encoders)).toEqual({ ok: true, text: "https://h.test/x" });
    expect(fillTemplate(template, {}, { host: "d.test" }, encoders)).toEqual({ ok: true, text: "https://d.test/x" });
  });

  it("reports a missing variable by name, but a missing field first", () => {
    expect(fillTemplate("{env.adminUrl}/u/{user_id}", { user_id: 1 }, {}, encoders)).toEqual({
      ok: false,
      reason: "missingVariable",
      variable: "adminUrl",
    });
    expect(fillTemplate("{env.adminUrl}/u/{user_id}", {}, {}, encoders)).toEqual({ ok: false, reason: "missingValue" });
    expect(fillTemplate("https://{context.host|env.host}/x", {}, {}, encoders)).toEqual({ ok: false, reason: "missingValue" });
  });

  it("treats an empty value and inherited keys as not set", () => {
    expect(fillTemplate("{env.a}", {}, { a: "" }, encoders)).toEqual({ ok: false, reason: "missingVariable", variable: "a" });
    expect(fillTemplate("{env.constructor}/{env.toString}", {}, {}, encoders)).toEqual({
      ok: false,
      reason: "missingVariable",
      variable: "constructor",
    });
  });

  it("never reads env. paths from the log", () => {
    expect(fillTemplate("https://x.test/{env.name}", { "env.name": "from-log" }, {}, encoders)).toEqual({
      ok: false,
      reason: "missingVariable",
      variable: "name",
    });
  });

  it("applies the variable encoder to variables and the field encoder to fields", () => {
    const quote = (value: string) => `"${value}"`;
    expect(fillTemplate("app:{env.app} and u:{u}", { u: 1 }, variables, { field: quote, variable: quote })).toEqual({
      ok: true,
      text: 'app:"bitalih api" and u:"1"',
    });
  });
});
```

- [ ] **Step 2: Link aksiyonu testlerini güncelle ve ekle**

`tests/unit/core/link-actions.test.ts` dosyasında var olan her `resolveLinkAction(…)` ve `buildLinkButtons(…)` çağrısına son argüman olarak `, {}` ekle. Dosyanın sonuna ekle:
```ts
describe("link actions with environment variables", () => {
  const variables = { adminUrl: "https://admin.alpha.test", host: "admin.alpha.test", relative: "/users" };

  it("fills a variable as it is and keeps field values encoded", () => {
    expect(resolveLinkAction(link({ urlTemplate: "{env.adminUrl}/users/{user_id}" }), { user_id: "a b" }, variables)).toEqual({
      ok: true,
      url: "https://admin.alpha.test/users/a%20b",
    });
  });

  it("shows a passive button for a missing variable, but hides it when a field is missing", () => {
    const action = link({ urlTemplate: "{env.paymentUrl}/tx/{tx}" });
    expect(buildLinkButtons([action], { tx: 1 }, variables)).toEqual([
      { id: "a", label: "A", passive: { kind: "missingVariable", variable: "paymentUrl" } },
    ]);
    expect(buildLinkButtons([action], {}, variables)).toEqual([]);
  });

  it("shows a passive button when the variable the URL starts with is not an http(s) address", () => {
    expect(resolveLinkAction(link({ urlTemplate: "{env.host}/x" }), {}, variables)).toEqual({
      ok: false,
      passive: { kind: "invalidVariable", variable: "host" },
    });
    // Review Focus 4: the first variable that has a value is the one checked.
    expect(resolveLinkAction(link({ urlTemplate: "{env.unset|env.relative}/x" }), {}, variables)).toEqual({
      ok: false,
      passive: { kind: "invalidVariable", variable: "relative" },
    });
    expect(resolveLinkAction(link({ urlTemplate: "{env.unset|env.adminUrl}/x" }), {}, variables)).toEqual({
      ok: true,
      url: "https://admin.alpha.test/x",
    });
  });

  it("still hides an invalid URL built from fields", () => {
    expect(resolveLinkAction(link({ urlTemplate: "https://{host}/x" }), { host: "a b" }, variables)).toEqual({
      ok: false,
      reason: "invalidUrl",
    });
  });
});
```

- [ ] **Step 3: Discover ve önizleme testlerini güncelle ve ekle**

`tests/unit/core/discover-actions.test.ts`:
- `context()` yardımcısında `timeFields` satırından sonra ekle: `variables: {},`.
- Var olan her `resolveDiscoverQuery(…)` çağrısına son argüman olarak `, {}` ekle.
- "disables a window-only action when no time is available" testinde `disabled` sabitini şöyle değiştir:
```ts
    const disabled = [{ id: "same-user", label: "Same user", passive: { kind: "noTime" } }];
```
Dosyanın sonuna ekle:
```ts
describe("Discover actions with environment variables", () => {
  it("quotes variables like fields and shows a passive button when one is missing", () => {
    const action = discover({ queryTemplate: "app_name:{env.app} and user_id:{user_id}" });
    expect(resolveDiscoverQuery(action, fields, { app: "bitalih api" })).toEqual({
      ok: true,
      query: 'app_name:"bitalih api" and user_id:"12345"',
    });
    expect(buildDiscoverButtons([action], fields, context())).toEqual([
      { id: "same-user", label: "Same user", passive: { kind: "missingVariable", variable: "app" } },
    ]);
  });
});
```

`tests/unit/options/preview.test.ts`: var olan her `previewAction(…)` çağrısına son argüman olarak `, {}` ekle. `describe("previewAction", …)` bloğunun sonuna ekle:
```ts
  it("uses the preview environment's variables and reports a passive button", () => {
    const sample = parseSample('{"user_id": 7}');
    if (!sample.ok) throw new Error(sample.error);
    const withVariable: LinkAction = { ...link, urlTemplate: "{env.adminUrl}/users/{user_id}" };
    expect(previewAction(withVariable, sample.fields, { adminUrl: "https://admin.alpha.test" })).toEqual({
      shown: true,
      text: "https://admin.alpha.test/users/7",
    });
    expect(previewAction(withVariable, sample.fields, {})).toEqual({
      shown: false,
      passive: { kind: "missingVariable", variable: "adminUrl" },
    });
  });
```

- [ ] **Step 4: Testleri çalıştır, kırıldıklarını gör**

Çalıştır: `npx vitest run tests/unit/core tests/unit/options`
Beklenen: FAIL (`fillTemplate` yok, imzalar eski).

- [ ] **Step 5: `fillTemplate`'i yaz, `resolveTemplate`'i sil**

`src/core/template.ts` dosyasında `resolveTemplate` fonksiyonunu ve üstündeki yorumu sil. Dosyanın başındaki yorum satırını şöyle değiştir:
```ts
// Resolves {path|fallback} placeholders against a field map and environment variables (spec §7.2, §7.3; Plan 4 spec §4).
```
`isHttpUrlTemplate`'ten sonra ekle:
```ts
/** Values of `env.<name>` placeholders: the open environment's variables. */
export type Variables = Readonly<Record<string, string>>;

/** The variable's value; null when the environment does not set it. Own keys only: `env.constructor` is never Object's. */
export function lookupVariable(variables: Variables, path: string): string | null {
  const name = path.slice(VARIABLE_PREFIX.length);
  if (!Object.hasOwn(variables, name)) return null;
  const value = variables[name];
  return typeof value === "string" && value !== "" ? value : null;
}

export interface Encoders {
  /** Values from the log: encodeURIComponent in links, kqlQuote in KQL. */
  field: (value: string) => string;
  /** Values from the environment: as they are in links, kqlQuote in KQL. */
  variable: (value: string) => string;
}

export type TemplateResult =
  | { ok: true; text: string }
  | { ok: false; reason: "missingValue" }
  | { ok: false; reason: "missingVariable"; variable: string };

/**
 * Fills every placeholder from the log's fields and the environment's variables (Plan 4 spec §4, §5.3).
 * A placeholder with a field path that finds no value hides the action ("missingValue"). That wins over a
 * placeholder of variables only that finds none ("missingVariable", named by its first variable).
 */
export function fillTemplate(template: string, fields: FieldMap, variables: Variables, encoders: Encoders): TemplateResult {
  let missingValue = false;
  let missingVariable: string | undefined;
  const text = template.replace(PLACEHOLDER, (_match, group: string) => {
    const paths = group.split("|");
    for (const path of paths) {
      const fromVariable = isVariablePath(path);
      const value = fromVariable ? lookupVariable(variables, path) : lookup(fields, [path]);
      if (value === null) continue;
      try {
        return (fromVariable ? encoders.variable : encoders.field)(value);
      } catch {
        missingValue = true; // e.g. encodeURIComponent on a lone surrogate
        return "";
      }
    }
    if (paths.every(isVariablePath)) missingVariable ??= (paths[0] ?? "").slice(VARIABLE_PREFIX.length);
    else missingValue = true;
    return "";
  });
  if (missingValue) return { ok: false, reason: "missingValue" };
  if (missingVariable !== undefined) return { ok: false, reason: "missingVariable", variable: missingVariable };
  return { ok: true, text };
}
```

- [ ] **Step 6: `PassiveReason` tipini yaz**

`src/core/passive.ts` dosyasını oluştur:
```ts
// Why a button is shown greyed out instead of working (Plan 4 spec §5.3). The bar and the options preview explain it.
export type PassiveReason =
  | { kind: "missingVariable"; variable: string }
  | { kind: "invalidVariable"; variable: string }
  | { kind: "dataViewNotFound"; name: string }
  | { kind: "dataViewAmbiguous"; name: string; count: number }
  | { kind: "dataViewLookupFailed" }
  | { kind: "noTime" };
```

- [ ] **Step 7: Link aksiyonlarını değiştir**

`src/core/link-actions.ts` dosyasının tamamını şu kodla değiştir:
```ts
// Turns link actions into buttons for one document (spec §7.2; Plan 4 spec §5.3).
import type { Action, LinkAction } from "./config";
import { evaluateConditions } from "./conditions";
import type { FieldMap } from "./fields";
import type { PassiveReason } from "./passive";
import { VARIABLE_PREFIX, type Variables, fillTemplate, isHttpUrl, leadingVariablePaths, lookupVariable } from "./template";

export type LinkButton = { id: string; label: string; url: string } | { id: string; label: string; passive: PassiveReason };

/** Why an action shows no button; the options page preview names it. */
export type HiddenReason = "disabled" | "conditions" | "missingValue" | "invalidUrl";

export type LinkResolution = { ok: true; url: string } | { ok: false; reason: HiddenReason } | { ok: false; passive: PassiveReason };

const asIs = (value: string): string => value;

export function resolveLinkAction(action: LinkAction, fields: FieldMap, variables: Variables): LinkResolution {
  if (!action.enabled) return { ok: false, reason: "disabled" };
  if (!evaluateConditions(action.conditions, fields)) return { ok: false, reason: "conditions" };
  const filled = fillTemplate(action.urlTemplate, fields, variables, { field: encodeURIComponent, variable: asIs });
  if (!filled.ok) {
    return filled.reason === "missingVariable"
      ? { ok: false, passive: { kind: "missingVariable", variable: filled.variable } }
      : { ok: false, reason: "missingValue" };
  }
  const invalid = invalidLeadingVariable(action.urlTemplate, variables);
  if (invalid !== undefined) return { ok: false, passive: { kind: "invalidVariable", variable: invalid } };
  // Parsing the result also catches values that break the host, e.g. "https://{host}/".
  return isHttpUrl(filled.text) ? { ok: true, url: filled.text } : { ok: false, reason: "invalidUrl" };
}

/** Plan 4 spec §3: the variable a URL template starts with, when its value is not an http(s) address. */
export function invalidLeadingVariable(template: string, variables: Variables): string | undefined {
  const used = leadingVariablePaths(template)?.find((path) => lookupVariable(variables, path) !== null);
  if (used === undefined) return undefined;
  return /^https?:\/\//i.test(lookupVariable(variables, used) ?? "") ? undefined : used.slice(VARIABLE_PREFIX.length);
}

export function buildLinkButtons(actions: Action[], fields: FieldMap, variables: Variables): LinkButton[] {
  return actions.flatMap((action): LinkButton[] => {
    if (action.kind !== "link") return [];
    const result = resolveLinkAction(action, fields, variables);
    if (result.ok) return [{ id: action.id, label: action.label, url: result.url }];
    return "passive" in result ? [{ id: action.id, label: action.label, passive: result.passive }] : [];
  });
}
```

- [ ] **Step 8: Discover aksiyonlarını değiştir**

`src/core/discover-actions.ts`:

Import'ları şöyle yap:
```ts
import { discoverUrl } from "../kibana/url";
import type { Action, DiscoverAction } from "./config";
import { evaluateConditions } from "./conditions";
import type { FieldMap } from "./fields";
import type { HiddenReason } from "./link-actions";
import type { PassiveReason } from "./passive";
import { type Variables, fillTemplate } from "./template";
import type { TimeRange } from "./types";
```

`QueryResolution` ve `resolveDiscoverQuery`'yi şu kodla değiştir:
```ts
export type QueryResolution =
  | { ok: true; query: string }
  | { ok: false; reason: Exclude<HiddenReason, "invalidUrl"> }
  | { ok: false; passive: PassiveReason };

export function resolveDiscoverQuery(action: DiscoverAction, fields: FieldMap, variables: Variables): QueryResolution {
  if (!action.enabled) return { ok: false, reason: "disabled" };
  if (!evaluateConditions(action.conditions, fields)) return { ok: false, reason: "conditions" };
  const filled = fillTemplate(action.queryTemplate.trim(), fields, variables, { field: kqlQuote, variable: kqlQuote });
  if (filled.ok) return { ok: true, query: filled.text };
  return filled.reason === "missingVariable"
    ? { ok: false, passive: { kind: "missingVariable", variable: filled.variable } }
    : { ok: false, reason: "missingValue" };
}
```

`DiscoverContext` arayüzüne `timeFields` satırından sonra ekle:
```ts
  /** The open environment's variables (Plan 4). */
  variables: Variables;
```

`DiscoverButton` tipini değiştir:
```ts
export type DiscoverButton = { id: string; label: string; url: string } | { id: string; label: string; passive: PassiveReason };
```

`buildDiscoverButtons` içinde şu iki satırı:
```ts
    const resolved = resolveDiscoverQuery(action, fields);
    if (!resolved.ok) return [];
```
şununla değiştir:
```ts
    const resolved = resolveDiscoverQuery(action, fields, context.variables);
    if (!resolved.ok) return "passive" in resolved ? [{ id: action.id, label: action.label, passive: resolved.passive }] : [];
```
`noTime` dönüşünü değiştir:
```ts
      return [{ id: action.id, label: action.label, passive: { kind: "noTime" } }];
```

- [ ] **Step 9: Önizlemeyi değiştir**

`src/options/preview.ts`:

Import'lara ekle:
```ts
import type { PassiveReason } from "../core/passive";
import type { Variables } from "../core/template";
```

`Preview` ve `previewAction`'ı şu kodla değiştir:
```ts
export type Preview =
  | { shown: true; text: string }
  | { shown: false; reason: HiddenReason }
  | { shown: false; passive: PassiveReason };

/** The link URL or KQL query the bar would use with `variables`, or why it would show nothing or a passive button. */
export function previewAction(action: Action, fields: FieldMap, variables: Variables): Preview {
  const result =
    action.kind === "link" ? resolveLinkAction(action, fields, variables) : resolveDiscoverQuery(action, fields, variables);
  if (result.ok) return { shown: true, text: "url" in result ? result.url : result.query };
  return "passive" in result ? { shown: false, passive: result.passive } : { shown: false, reason: result.reason };
}
```

- [ ] **Step 10: Yerelleştirilmiş gerekçeler**

`public/_locales/en/messages.json`'da son girdiden sonra ekle (önceki satırın sonuna virgül koy):
```json
  "passiveMissingVariable": {
    "message": "$NAME$ is not set for the $ENV$ environment",
    "placeholders": { "env": { "content": "$1", "example": "Prod" }, "name": { "content": "$2", "example": "adminUrl" } }
  },
  "passiveInvalidVariable": {
    "message": "$NAME$ is not an http(s) address in the $ENV$ environment",
    "placeholders": { "env": { "content": "$1", "example": "Prod" }, "name": { "content": "$2", "example": "adminUrl" } }
  },
  "passiveDataViewNotFound": {
    "message": "No data view named \"$NAME$\" in this space",
    "placeholders": { "name": { "content": "$1", "example": "player_login_log" } }
  },
  "passiveDataViewAmbiguous": {
    "message": "$COUNT$ data views match \"$NAME$\"",
    "placeholders": { "name": { "content": "$1", "example": "app_log" }, "count": { "content": "$2", "example": "2" } }
  },
  "passiveDataViewLookupFailed": { "message": "Could not read the data view list" },
  "optionsPreviewPassive": { "message": "Passive:" },
  "optionsPreviewEnvironment": { "message": "Preview environment" }
```
`public/_locales/tr/messages.json`'da aynı yere ekle:
```json
  "passiveMissingVariable": {
    "message": "$ENV$ ortamında $NAME$ tanımlı değil",
    "placeholders": { "env": { "content": "$1", "example": "Prod" }, "name": { "content": "$2", "example": "adminUrl" } }
  },
  "passiveInvalidVariable": {
    "message": "$ENV$ ortamında $NAME$ bir http(s) adresi değil",
    "placeholders": { "env": { "content": "$1", "example": "Prod" }, "name": { "content": "$2", "example": "adminUrl" } }
  },
  "passiveDataViewNotFound": {
    "message": "\"$NAME$\" adlı data view bu space'te yok",
    "placeholders": { "name": { "content": "$1", "example": "player_login_log" } }
  },
  "passiveDataViewAmbiguous": {
    "message": "\"$NAME$\" adıyla $COUNT$ data view eşleşti",
    "placeholders": { "name": { "content": "$1", "example": "app_log" }, "count": { "content": "$2", "example": "2" } }
  },
  "passiveDataViewLookupFailed": { "message": "Data view listesi alınamadı" },
  "optionsPreviewPassive": { "message": "Pasif:" },
  "optionsPreviewEnvironment": { "message": "Önizleme ortamı" }
```

`src/passive-text.ts` dosyasını oluştur:
```ts
// The localized reason of a passive button (Plan 4 spec §5.3): the bar's tooltip and the options preview.
import type { PassiveReason } from "./core/passive";
import { t } from "./i18n";

export function describePassive(reason: PassiveReason, environmentName: string): string {
  switch (reason.kind) {
    case "missingVariable":
      return t("passiveMissingVariable", environmentName, reason.variable);
    case "invalidVariable":
      return t("passiveInvalidVariable", environmentName, reason.variable);
    case "dataViewNotFound":
      return t("passiveDataViewNotFound", reason.name);
    case "dataViewAmbiguous":
      return t("passiveDataViewAmbiguous", reason.name, String(reason.count));
    case "dataViewLookupFailed":
      return t("passiveDataViewLookupFailed");
    case "noTime":
      return t("discoverNoTime");
  }
}
```

- [ ] **Step 11: Çubuğa açık ortamı ver ve pasif butonları çiz**

`src/content/ActionBar.tsx`:

Import'ları değiştir ve ekle:
```ts
import type { Action, Config, Environment } from "../core/config";
import type { PassiveReason } from "../core/passive";
import { describePassive } from "../passive-text";
```

`ActionBarProps` arayüzüne `copy` satırından sonra ekle:
```ts
  /** The open environment: its variables fill {env.…}, its name explains passive buttons (Plan 4). */
  environment: Environment;
```

Fonksiyon imzası:
```ts
export function ActionBar({ identity, actions, client, prefix, hash, copy, environment }: ActionBarProps) {
```

`buttons` `useMemo`'sunun gövdesini ve bağımlılıklarını değiştir:
```ts
    return {
      links: buildLinkButtons(actions, fields, environment.variables),
      discover: buildDiscoverButtons(actions, fields, {
        prefix,
        dataViewId,
        currentTime: readGlobalTime(hash),
        timeFields: state.timeFields,
        variables: environment.variables,
      }),
    };
  }, [state, actions, prefix, dataViewId, hash, environment]);
```

`copyItems` dizisinden sonra, `return (` satırından önce ekle:
```tsx
  // Plan 4 spec §5.3: greyed out, with the reason as its tooltip.
  const passiveButton = (button: { id: string; label: string; passive: PassiveReason }) => (
    <span key={button.id} className="kt-btn kt-disabled" aria-disabled="true" tabIndex={0} title={describePassive(button.passive, environment.name)}>
      {button.label}
    </span>
  );
```

`buttons.links.map(…)` ve `buttons.discover.map(…)` bloklarının ikisini birden şu kodla değiştir:
```tsx
        {buttons.links.map((button) =>
          "url" in button ? (
            <a key={button.id} className="kt-btn" href={button.url} target="_blank" rel="noopener noreferrer">
              {button.label}
            </a>
          ) : (
            passiveButton(button)
          ),
        )}
        {buttons.discover.map((button) =>
          "url" in button ? (
            <a key={button.id} className="kt-btn kt-discover" href={button.url} target="_blank" rel="noopener noreferrer">
              {button.label}
            </a>
          ) : (
            passiveButton(button)
          ),
        )}
```

`entrypoints/kibana.ts`:

`let actions = currentActions();` ve `currentActions` fonksiyonunu şu kodla değiştir:
```ts
  // Recomputed only when the config changes: the bars refetch when this array changes identity.
  let environment = activeEnvironment(config, location.href);
  let actions = currentActions();

  function currentActions(): Action[] {
    return environment ? actionsForEnvironment(config, environment.id) : [];
  }
```
`createMount` içindeki `render`'da `root.render(…)` çağrısını değiştir:
```ts
        const open = environment;
        // The copy menu needs no actions, so every identified log gets a bar.
        root.render(
          identity && open
            ? createElement(ActionBar, {
                key: `${identity.index}/${identity.id}`,
                identity,
                actions,
                client,
                prefix,
                hash: location.hash,
                copy: config.copy,
                environment: open,
              })
            : null,
        );
```
`storage.onChanged` dinleyicisinde `config = loaded.config;` satırından sonra ekle:
```ts
        environment = activeEnvironment(config, location.href);
```

- [ ] **Step 12: Önizlemede ortam seçimi**

`entrypoints/options/ActionEditor.tsx`:

Import'lara ekle:
```ts
import { describePassive } from "../../src/passive-text";
```

`const [sample, setSample] = useState("");` satırından sonra ekle:
```ts
  const [previewEnvironmentId, setPreviewEnvironmentId] = useState<string | undefined>(undefined);
  const applicable =
    action.environmentIds.length === 0 ? environments : environments.filter((environment) => action.environmentIds.includes(environment.id));
  const previewEnvironment = applicable.find((environment) => environment.id === previewEnvironmentId) ?? applicable[0];
```

Önizleme `fieldset`'inde örnek log `label`'ından sonra ekle:
```tsx
        {applicable.length > 0 && (
          <label>
            {t("optionsPreviewEnvironment")}
            <select name="previewEnvironment" value={previewEnvironment?.id} onChange={(event) => setPreviewEnvironmentId(event.target.value)}>
              {applicable.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {environment.name}
                </option>
              ))}
            </select>
          </label>
        )}
```

`describePreview(action, parseSample(sample))` çağrısını şöyle değiştir: `describePreview(action, parseSample(sample), previewEnvironment)`. `describePreview` fonksiyonunun başını şöyle değiştir:
```ts
function describePreview(action: Action, sample: SampleResult, environment: Environment | undefined): string {
  if (!sample.ok) return t("optionsPreviewInvalid", sample.error);
  const preview = previewAction(action, sample.fields, environment?.variables ?? {});
  if (!preview.shown) {
    return "passive" in preview
      ? `${t("optionsPreviewPassive")} ${describePassive(preview.passive, environment?.name ?? "")}`
      : t(HIDDEN[preview.reason]);
  }
```
Fonksiyonun geri kalanı değişmez.

- [ ] **Step 13: Bütün kontrolleri çalıştır**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest
KT_STACK=7 npm run e2e && KT_STACK=8 npm run e2e && KT_STACK=9 npm run e2e
```
Beklenen: hepsi geçer. Var olan e2e `bar.spec.ts`'deki `.kt-disabled` + `title` beklentisi aynen geçer, çünkü `noTime` aynı metni verir.

- [ ] **Step 14: Commit**

```bash
git branch --show-current   # plan-4-env-variables
git add src entrypoints public tests/unit
git commit -m "feat: fill {env.…} placeholders and show passive buttons for missing variables

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Hedef data view'ı adla seçmek

**Files:**
- Create: `src/core/data-view-names.ts`, `tests/unit/core/data-view-names.test.ts`
- Modify: `src/core/types.ts`, `src/core/discover-actions.ts`, `src/kibana/client.ts`, `src/content/bar-data.ts`, `src/content/ActionBar.tsx`
- Test: `tests/unit/core/discover-actions.test.ts`, `tests/unit/kibana/client.test.ts`, `tests/unit/content/bar-data.test.ts`

**Interfaces:**
- Consumes: Task 1'den `DiscoverAction.dataViewName`; Task 2'den `PassiveReason`, `DiscoverContext`, `DiscoverButton`
- Produces:
  - `types.ts`: `interface DataViewSummary { id: string; title: string; name?: string }`
  - `data-view-names.ts`:
    - `type DataViewTarget = { ok: true; id: string } | { ok: false; passive: PassiveReason }`
    - `resolveDataViewName(views: readonly DataViewSummary[] | null, name: string): DataViewTarget`
    - `discoverTarget(action: DiscoverAction, openDataViewId: string, views: readonly DataViewSummary[] | null): DataViewTarget`
  - `DiscoverContext.dataViews: readonly DataViewSummary[] | null`. `null` listenin alınamadığı demektir.
  - `KibanaClient.listDataViews(): Promise<DataViewSummary[]>`
  - `bar-data.ts`:
    - `loadDataViews(client: Pick<KibanaClient, "listDataViews">, actions: Action[]): Promise<DataViewSummary[] | null>`
    - `timeFieldTargets(actions, dataViewId, views: readonly DataViewSummary[] | null): string[]`

- [ ] **Step 1: Ad çözme testlerini yaz**

`tests/unit/core/data-view-names.test.ts` dosyasını oluştur:
```ts
import { describe, expect, it } from "vitest";
import type { DiscoverAction } from "../../../src/core/config";
import { discoverTarget, resolveDataViewName } from "../../../src/core/data-view-names";

const views = [
  { id: "app-log", title: "app_log", name: "app_log" },
  { id: "app-log-named", title: "app_log", name: "App logs" },
  { id: "all-logs", title: "*_log" },
];

describe("resolveDataViewName", () => {
  it("matches the display name or the index pattern exactly, counting each data view once", () => {
    expect(resolveDataViewName(views, "App logs")).toEqual({ ok: true, id: "app-log-named" });
    expect(resolveDataViewName(views, "*_log")).toEqual({ ok: true, id: "all-logs" });
    expect(resolveDataViewName([{ id: "a", title: "x", name: "x" }], "x")).toEqual({ ok: true, id: "a" });
  });

  it("reports no match, several matches and a list that could not be read", () => {
    expect(resolveDataViewName(views, "app_log")).toEqual({ ok: false, passive: { kind: "dataViewAmbiguous", name: "app_log", count: 2 } });
    expect(resolveDataViewName(views, "player_login_log")).toEqual({
      ok: false,
      passive: { kind: "dataViewNotFound", name: "player_login_log" },
    });
    expect(resolveDataViewName(null, "App logs")).toEqual({ ok: false, passive: { kind: "dataViewLookupFailed" } });
  });

  it("is case-sensitive and does not trim", () => {
    expect(resolveDataViewName(views, "app logs").ok).toBe(false);
    expect(resolveDataViewName(views, " *_log").ok).toBe(false);
  });
});

describe("discoverTarget", () => {
  const action = (extra: Partial<DiscoverAction>): DiscoverAction => ({
    id: "d",
    kind: "discover",
    label: "D",
    enabled: true,
    environmentIds: [],
    conditions: [],
    queryTemplate: "",
    ...extra,
  });

  it("uses the named data view, then the given id, then the open log's data view", () => {
    expect(discoverTarget(action({ dataViewName: "App logs" }), "open", views)).toEqual({ ok: true, id: "app-log-named" });
    expect(discoverTarget(action({ dataViewId: "logs" }), "open", null)).toEqual({ ok: true, id: "logs" });
    expect(discoverTarget(action({}), "open", null)).toEqual({ ok: true, id: "open" });
  });
});
```

- [ ] **Step 2: Discover, istemci ve çubuk verisi testlerini ekle**

`tests/unit/core/discover-actions.test.ts`:
- `context()` yardımcısında `variables: {},` satırından sonra ekle: `dataViews: [],`.
- Dosyanın sonuna ekle:
```ts
describe("buildDiscoverButtons with a data view name", () => {
  const views = [
    { id: "app-log", title: "app_log", name: "app_log" },
    { id: "app-log-named", title: "app_log", name: "App logs" },
    { id: "all-logs", title: "*_log" },
  ];

  it("opens the data view whose display name or index pattern matches", () => {
    const [byName] = buildDiscoverButtons([discover({ dataViewName: "App logs" })], fields, context({ dataViews: views }));
    expect(state(byName).a).toMatchObject({ index: "app-log-named" });
    const [byPattern] = buildDiscoverButtons([discover({ dataViewName: "*_log" })], fields, context({ dataViews: views }));
    expect(state(byPattern).a).toMatchObject({ index: "all-logs" });
  });

  it("shows a passive button when the name matches none or several, or the list failed", () => {
    const passive = (reason: unknown) => [{ id: "same-user", label: "Same user", passive: reason }];
    expect(buildDiscoverButtons([discover({ dataViewName: "app_log" })], fields, context({ dataViews: views }))).toEqual(
      passive({ kind: "dataViewAmbiguous", name: "app_log", count: 2 }),
    );
    expect(buildDiscoverButtons([discover({ dataViewName: "App Logs" })], fields, context({ dataViews: views }))).toEqual(
      passive({ kind: "dataViewNotFound", name: "App Logs" }),
    );
    expect(buildDiscoverButtons([discover({ dataViewName: "App logs" })], fields, context({ dataViews: null }))).toEqual(
      passive({ kind: "dataViewLookupFailed" }),
    );
  });

  it("hides an action whose query has no value before looking at its name", () => {
    const action = discover({ dataViewName: "nope", queryTemplate: "x:{missing}" });
    expect(buildDiscoverButtons([action], fields, context({ dataViews: views }))).toEqual([]);
  });

  it("centers the window on the time field of the data view the name resolves to", () => {
    // Review Focus 5: the open data view (app-log) uses datetime, the named one createdAt.
    const timeFields = new Map<string, string | undefined>([
      ["app-log", "datetime"],
      ["app-log-named", "createdAt"],
    ]);
    const [button] = buildDiscoverButtons(
      [discover({ dataViewName: "App logs", windowMinutes: 5 })],
      { ...fields, createdAt: "2026-08-12T12:00:00.000Z" },
      context({ dataViews: views, timeFields }),
    );
    expect(state(button).time).toEqual({ from: "2026-08-12T11:55:00.000Z", to: "2026-08-12T12:05:00.000Z" });
  });
});
```

`tests/unit/kibana/client.test.ts` dosyasının sonuna ekle:
```ts
describe("listDataViews", () => {
  it("reads /api/data_views on 8.x/9.x, keeping display names and skipping odd entries", async () => {
    const { fetch, calls } = fakeFetch(() =>
      json({ data_view: [{ id: "app-log", title: "app_log", name: "app_log" }, { id: "all", title: "*_log", name: "" }, { title: "no id" }, null] }),
    );
    const client = createKibanaClient({ prefix: "/s/team", fetch });
    await expect(client.listDataViews()).resolves.toEqual([
      { id: "app-log", title: "app_log", name: "app_log" },
      { id: "all", title: "*_log" },
    ]);
    expect(calls.map((call) => call.url)).toEqual(["/s/team/api/data_views"]);
  });

  it("falls back to the saved objects API on 404 (7.17), where data views have no name", async () => {
    const { fetch, calls } = fakeFetch((url) =>
      url.endsWith("/api/data_views")
        ? json({ message: "Not Found" }, 404)
        : json({ saved_objects: [{ id: "app-log", attributes: { title: "app_log" } }, { id: "x", attributes: "broken" }] }),
    );
    const client = createKibanaClient({ prefix: "/kibana", fetch });
    await expect(client.listDataViews()).resolves.toEqual([{ id: "app-log", title: "app_log" }]);
    expect(calls.map((call) => call.url)).toEqual([
      "/kibana/api/data_views",
      "/kibana/api/saved_objects/_find?type=index-pattern&fields=title&per_page=10000",
    ]);
  });

  it("asks once per page and retries after a failure", async () => {
    let fail = true;
    const { fetch, calls } = fakeFetch(() => (fail ? json({}, 500) : json({ data_view: [] })));
    const client = createKibanaClient({ prefix: "", fetch });
    expect(await kindOf(client.listDataViews())).toBe("server");
    fail = false;
    await expect(client.listDataViews()).resolves.toEqual([]);
    await client.listDataViews();
    expect(calls).toHaveLength(2);
  });

  it("reports incompatible when the list is not an array", async () => {
    const { fetch } = fakeFetch(() => json({ data_view: "nope" }));
    expect(await kindOf(createKibanaClient({ prefix: "", fetch }).listDataViews())).toBe("incompatible");
  });
});
```

`tests/unit/content/bar-data.test.ts`:
- Import satırını şöyle yap: `import { loadDataViews, loadTimeFields, timeFieldTargets } from "../../../src/content/bar-data";`
- `discover` yardımcısının `extra` tipini şöyle yap: `extra: { windowMinutes?: number; dataViewId?: string; dataViewName?: string }`.
- Var olan `timeFieldTargets(actions, "current")` çağrısını `timeFieldTargets(actions, "current", [])` yap.
- `describe("timeFieldTargets", …)` bloğuna ekle:
```ts
  it("adds the data view a windowed action names, once it resolves, and skips one that does not", () => {
    const views = [{ id: "named", title: "app_log", name: "App logs" }];
    const actions = [discover("a", { windowMinutes: 5, dataViewName: "App logs" }), discover("b", { windowMinutes: 5, dataViewName: "nope" })];
    expect(timeFieldTargets(actions, "current", views)).toEqual(["current", "named"]);
    expect(timeFieldTargets(actions, "current", null)).toEqual(["current"]);
  });
```
- Dosyanın sonuna ekle:
```ts
describe("loadDataViews", () => {
  it("reads the list only when an action names a data view", async () => {
    let calls = 0;
    const client = {
      async listDataViews() {
        calls++;
        return [{ id: "a", title: "x" }];
      },
    };
    expect(await loadDataViews(client, [discover("plain", {})])).toEqual([]);
    expect(calls).toBe(0);
    expect(await loadDataViews(client, [discover("named", { dataViewName: "x" })])).toEqual([{ id: "a", title: "x" }]);
  });

  it("returns null when the list cannot be read", async () => {
    const client = {
      async listDataViews(): Promise<never> {
        throw new KibanaError("forbidden", "HTTP 403", 403);
      },
    };
    expect(await loadDataViews(client, [discover("named", { dataViewName: "x" })])).toBeNull();
  });
});
```

- [ ] **Step 3: Testleri çalıştır, kırıldıklarını gör**

Çalıştır: `npx vitest run tests/unit/core tests/unit/kibana tests/unit/content`
Beklenen: FAIL (`data-view-names` modülü, `listDataViews` ve `loadDataViews` yok).

- [ ] **Step 4: `DataViewSummary` ve ad çözme**

`src/core/types.ts` dosyasının sonuna ekle:
```ts
/** One entry of a space's data view list (Plan 4 spec §5.2). `name` exists on 8.x/9.x only. */
export interface DataViewSummary {
  id: string;
  title: string;
  name?: string;
}
```

`src/core/data-view-names.ts` dosyasını oluştur:
```ts
// The data view a Discover action opens (Plan 4 spec §5.2): named by display name or index pattern, exactly.
import type { DiscoverAction } from "./config";
import type { PassiveReason } from "./passive";
import type { DataViewSummary } from "./types";

export type DataViewTarget = { ok: true; id: string } | { ok: false; passive: PassiveReason };

/** `views` is null when the list could not be read. */
export function resolveDataViewName(views: readonly DataViewSummary[] | null, name: string): DataViewTarget {
  if (views === null) return { ok: false, passive: { kind: "dataViewLookupFailed" } };
  const ids = [...new Set(views.filter((view) => view.name === name || view.title === name).map((view) => view.id))];
  const [only] = ids;
  if (ids.length === 1 && only !== undefined) return { ok: true, id: only };
  return ids.length === 0
    ? { ok: false, passive: { kind: "dataViewNotFound", name } }
    : { ok: false, passive: { kind: "dataViewAmbiguous", name, count: ids.length } };
}

/** The named data view, else the action's id, else the open log's data view. */
export function discoverTarget(
  action: DiscoverAction,
  openDataViewId: string,
  views: readonly DataViewSummary[] | null,
): DataViewTarget {
  if (action.dataViewName !== undefined) return resolveDataViewName(views, action.dataViewName);
  return { ok: true, id: action.dataViewId ?? openDataViewId };
}
```

- [ ] **Step 5: Discover butonları adla hedef seçsin**

`src/core/discover-actions.ts`:

Import'lara ekle:
```ts
import { discoverTarget } from "./data-view-names";
import type { DataViewSummary, TimeRange } from "./types";
```
Var olan `import type { TimeRange } from "./types";` satırını sil.

`DiscoverContext` arayüzüne `variables` satırından sonra ekle:
```ts
  /** The open space's data views, for actions that name theirs; null when the list could not be read. */
  dataViews: readonly DataViewSummary[] | null;
```

`buildDiscoverButtons` içinde `const dataViewId = action.dataViewId ?? context.dataViewId;` satırını şu kodla değiştir:
```ts
    // Plan 4 spec §5.3: the name is looked at only for an action that would otherwise show.
    const target = discoverTarget(action, context.dataViewId, context.dataViews);
    if (!target.ok) return [{ id: action.id, label: action.label, passive: target.passive }];
    const dataViewId = target.id;
```

- [ ] **Step 6: İstemciye liste çağrısı**

`src/kibana/client.ts`:

Import'ları şöyle yap:
```ts
import { isPlainObject } from "../core/fields";
import type { DataViewSummary, RawHit } from "../core/types";
```

`KibanaClient` arayüzüne ekle:
```ts
  /** The open space's data views (Plan 4 spec §5.2). */
  listDataViews(): Promise<DataViewSummary[]>;
```

`readJson` fonksiyonundan sonra ekle:
```ts
/** Entries with a string id and title; anything else in the list is skipped. */
function summaries(
  list: unknown,
  read: (item: Record<string, unknown>) => { id: unknown; title: unknown; name?: unknown },
): DataViewSummary[] {
  if (!Array.isArray(list)) throw new KibanaError("incompatible", "Unexpected data view list");
  return list.flatMap((item): DataViewSummary[] => {
    if (!isPlainObject(item)) return [];
    const { id, title, name } = read(item);
    if (typeof id !== "string" || typeof title !== "string") return [];
    return [typeof name === "string" && name !== "" ? { id, title, name } : { id, title }];
  });
}
```

`createKibanaClient` içinde `const dataViews = …` satırından sonra ekle:
```ts
  const lists = new Map<string, Promise<DataViewSummary[]>>();
```
`loadDataView` fonksiyonundan sonra ekle:
```ts
  async function loadDataViewList(): Promise<DataViewSummary[]> {
    let response = await request("/api/data_views");
    if (response.status === 404) {
      // 7.17 has no data views API. Its saved objects carry the index pattern as title, and no name.
      response = await request("/api/saved_objects/_find?type=index-pattern&fields=title&per_page=10000");
      if (!response.ok) throw errorFor(response.status);
      const body = await readJson<{ saved_objects?: unknown }>(response);
      return summaries(body.saved_objects, (item) => ({
        id: item.id,
        title: isPlainObject(item.attributes) ? item.attributes.title : undefined,
      }));
    }
    if (!response.ok) throw errorFor(response.status);
    const body = await readJson<{ data_view?: unknown }>(response);
    return summaries(body.data_view, (item) => ({ id: item.id, title: item.title, name: item.name }));
  }
```
Dönen nesneye `getDataView` satırından sonra ekle:
```ts
    listDataViews: () => cached(lists, "all", loadDataViewList),
```

- [ ] **Step 7: Çubuk verisi ve `ActionBar`**

`src/content/bar-data.ts` dosyasının tamamını şu kodla değiştir:
```ts
// What the bar loads besides the log (spec §7.3, §7.4; Plan 4 spec §5.2): data views and their time fields.
import type { Action } from "../core/config";
import { discoverTarget } from "../core/data-view-names";
import type { DataViewSummary } from "../core/types";
import type { KibanaClient } from "../kibana/client";

/** The open data view (Markdown header, default target) and every resolvable target of a Discover action with a window. */
export function timeFieldTargets(actions: Action[], dataViewId: string, views: readonly DataViewSummary[] | null): string[] {
  const ids = new Set([dataViewId]);
  for (const action of actions) {
    if (action.kind !== "discover" || action.windowMinutes === undefined) continue;
    const target = discoverTarget(action, dataViewId, views);
    if (target.ok) ids.add(target.id);
  }
  return [...ids];
}

/** Plan 4 spec §5.2: read only when an action names its data view. Null when it cannot be read. */
export async function loadDataViews(
  client: Pick<KibanaClient, "listDataViews">,
  actions: Action[],
): Promise<DataViewSummary[] | null> {
  if (!actions.some((action) => action.kind === "discover" && action.dataViewName !== undefined)) return [];
  try {
    return await client.listDataViews();
  } catch (error) {
    console.debug("[kibanatool] data view list failed:", error);
    return null;
  }
}

/** Time field per data view. A failed lookup counts as "no time field": the bar still works without it. */
export async function loadTimeFields(
  client: Pick<KibanaClient, "getDataView">,
  ids: string[],
): Promise<Map<string, string | undefined>> {
  const entries = await Promise.all(
    ids.map(async (id): Promise<[string, string | undefined]> => {
      try {
        return [id, (await client.getDataView(id)).timeFieldName];
      } catch (error) {
        console.debug("[kibanatool] data view lookup failed:", id, error);
        return [id, undefined];
      }
    }),
  );
  return new Map(entries);
}
```

`src/content/ActionBar.tsx`:

Import'ları şöyle yap:
```ts
import type { DataViewSummary, DocIdentity, RawHit } from "../core/types";
import { loadDataViews, loadTimeFields, timeFieldTargets } from "./bar-data";
```

`State`'in `ready` varyantı:
```ts
  | {
      status: "ready";
      hit: RawHit;
      timeFields: ReadonlyMap<string, string | undefined>;
      dataViews: readonly DataViewSummary[] | null;
    }
```

Yükleme `useEffect`'inde `Promise.all([...])` çağrısını değiştir:
```ts
    const barData = async () => {
      const dataViews = await loadDataViews(client, actions);
      const timeFields = await loadTimeFields(client, timeFieldTargets(actions, dataViewId, dataViews));
      return { dataViews, timeFields };
    };
    Promise.all([client.fetchDoc(index, id), barData()]).then(
      ([hit, { dataViews, timeFields }]) => {
        if (!cancelled) setState({ status: "ready", hit, timeFields, dataViews });
      },
```
İkinci (hata) geri çağrısı değişmez.

`buildDiscoverButtons` bağlamına `variables` satırından sonra ekle:
```ts
        dataViews: state.dataViews,
```

- [ ] **Step 8: Bütün kontrolleri çalıştır**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest
KT_STACK=7 npm run e2e && KT_STACK=8 npm run e2e && KT_STACK=9 npm run e2e
```
Beklenen: hepsi geçer. Var olan e2e senaryoları `dataViewName` kullanmadığı için listeyi hiç çekmez.

- [ ] **Step 9: Commit**

```bash
git branch --show-current   # plan-4-env-variables
git add src tests/unit
git commit -m "feat: choose a Discover target data view by name

The open space's data view list is read once per page, only when an action names its data view.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Ayarlar sayfası: değişken tablosu

**Files:**
- Create: `entrypoints/options/VariablesSection.tsx`
- Modify: `src/options/model.ts`, `entrypoints/options/App.tsx`, `entrypoints/options/options.css`, `public/_locales/en/messages.json`, `public/_locales/tr/messages.json`
- Test: `tests/unit/options/model.test.ts`

**Interfaces:**
- Consumes: Task 1'den `Environment.variables`, `parseConfig`
- Produces:
  - `model.ts`:
    - `interface VariableRow { name: string; values: Record<string, string> }`. `values`, ortam kimliğinden değere giden bir kayıttır.
    - `variableRows(config: Config): VariableRow[]`
    - `withVariables(config: Config, rows: VariableRow[]): ParseResult`
  - `VariablesSection` (`SectionProps`). Tablonun `section[aria-labelledby="variables-title"]` öğesi içinde şunlar bulunur:
    - `input[name="variableName"]` ve hücre başına `input[data-environment="<ortam id>"]`
    - `.row > button`: sırayla "ekle" ve "kaydet"

- [ ] **Step 1: Model testlerini ekle**

`tests/unit/options/model.test.ts` import listesine `variableRows` ve `withVariables` ekle. Dosyanın sonuna ekle:
```ts
describe("variables table", () => {
  const twoEnvironments = (): Config => ({
    ...emptyConfig(),
    environments: [
      { id: "alpha", name: "Alpha", kibanaUrl: "https://elk.alpha.test", variables: { adminUrl: "https://admin.alpha.test", only: "a" } },
      { id: "prod", name: "Prod", kibanaUrl: "https://elk.prod.test", variables: { adminUrl: "https://admin.prod.test" } },
    ],
  });
  const variablesOf = (result: ReturnType<typeof withVariables>) => {
    if (!result.ok) throw new Error(result.errors.join("; "));
    return result.config.environments.map((environment) => environment.variables);
  };

  it("lists every name once, sorted, with each environment's value or an empty one", () => {
    expect(variableRows(twoEnvironments())).toEqual([
      { name: "adminUrl", values: { alpha: "https://admin.alpha.test", prod: "https://admin.prod.test" } },
      { name: "only", values: { alpha: "a", prod: "" } },
    ]);
  });

  it("reads only an environment's own keys, so a variable named constructor is empty elsewhere", () => {
    // Review Focus 2: without Object.hasOwn the prod cell would be Object.prototype.constructor.
    const config = twoEnvironments();
    config.environments[0]!.variables = { constructor: "c" };
    expect(variableRows(config)).toEqual([{ name: "constructor", values: { alpha: "c", prod: "" } }]);
  });

  it("writes rows back trimmed, leaves empty values out and drops blank rows", () => {
    const rows = [
      { name: " paymentUrl ", values: { alpha: " https://pay.alpha.test ", prod: "  " } },
      { name: "", values: {} },
    ];
    expect(variablesOf(withVariables(twoEnvironments(), rows))).toEqual([{ paymentUrl: "https://pay.alpha.test" }, {}]);
  });

  it("renames and removes a variable in every environment", () => {
    const [admin] = variableRows(twoEnvironments());
    expect(variablesOf(withVariables(twoEnvironments(), [{ ...admin!, name: "admin" }]))).toEqual([
      { admin: "https://admin.alpha.test" },
      { admin: "https://admin.prod.test" },
    ]);
  });

  it("rejects duplicate names, a row with values but no name, and names the schema does not allow", () => {
    expect(withVariables(twoEnvironments(), [{ name: "a", values: {} }, { name: " a", values: { alpha: "1" } }])).toEqual({
      ok: false,
      errors: ['variables: duplicate name "a"'],
    });
    expect(withVariables(twoEnvironments(), [{ name: " ", values: { alpha: "x" } }])).toEqual({
      ok: false,
      errors: ["variables: a row with values has no name"],
    });
    const invalid = withVariables(twoEnvironments(), [{ name: "a.b", values: { alpha: "x" } }]);
    expect(!invalid.ok && invalid.errors[0]).toMatch(/^environments\.0\.variables\.a\.b: /);
  });
});
```

- [ ] **Step 2: Testleri çalıştır, kırıldıklarını gör**

Çalıştır: `npx vitest run tests/unit/options/model.test.ts`
Beklenen: FAIL (`variableRows` yok).

- [ ] **Step 3: Model fonksiyonlarını yaz**

`src/options/model.ts` dosyasında `withCopySettings` fonksiyonundan sonra ekle:
```ts
/** One row of the variables table (Plan 4 spec §6): a name and its value per environment id. */
export interface VariableRow {
  name: string;
  values: Record<string, string>;
}

/** Every variable name of any environment, sorted, with each environment's value ("" when not set). */
export function variableRows(config: Config): VariableRow[] {
  const names = [...new Set(config.environments.flatMap((environment) => Object.keys(environment.variables)))].sort();
  return names.map((name) => ({
    name,
    values: Object.fromEntries(
      // Own keys only: a variable named "constructor" in one environment must read as empty in the others.
      config.environments.map((environment) => [
        environment.id,
        Object.hasOwn(environment.variables, name) ? (environment.variables[name] ?? "") : "",
      ]),
    ),
  }));
}

/** Writes the table back: names and values trimmed, empty values left out, rows with neither dropped. */
export function withVariables(config: Config, rows: VariableRow[]): ParseResult {
  const kept = rows
    .map((row) => ({ name: row.name.trim(), values: row.values }))
    .filter((row) => row.name !== "" || Object.values(row.values).some((value) => value.trim() !== ""));
  const names = new Set<string>();
  for (const row of kept) {
    if (row.name === "") return { ok: false, errors: ["variables: a row with values has no name"] };
    if (names.has(row.name)) return { ok: false, errors: [`variables: duplicate name "${row.name}"`] };
    names.add(row.name);
  }
  return parseConfig({
    ...config,
    environments: config.environments.map((environment) => ({
      ...environment,
      variables: Object.fromEntries(
        kept.flatMap((row) => {
          const value = (row.values[environment.id] ?? "").trim();
          return value === "" ? [] : [[row.name, value]];
        }),
      ),
    })),
  });
}
```

- [ ] **Step 4: Metinler**

`public/_locales/en/messages.json`'a ekle:
```json
  "optionsVariables": { "message": "Variables" },
  "optionsVariablesHelp": { "message": "Use them in templates as {env.name}. Each environment has its own value; an empty cell means the variable is not set there. Rows without a value are not saved." },
  "optionsVariableName": { "message": "Variable" },
  "optionsAddVariable": { "message": "Add variable" },
  "optionsVariablesNoEnvironments": { "message": "Add an environment first." }
```
`public/_locales/tr/messages.json`'a ekle:
```json
  "optionsVariables": { "message": "Değişkenler" },
  "optionsVariablesHelp": { "message": "Şablonlarda {env.ad} olarak kullanılır. Her ortamın kendi değeri vardır; boş hücre o ortamda tanımsız demektir. Değeri olmayan satırlar kaydedilmez." },
  "optionsVariableName": { "message": "Değişken" },
  "optionsAddVariable": { "message": "Değişken ekle" },
  "optionsVariablesNoEnvironments": { "message": "Önce bir ortam ekleyin." }
```

- [ ] **Step 5: `VariablesSection` bileşeni**

`entrypoints/options/VariablesSection.tsx` dosyasını oluştur:
```tsx
// Environment variables (Plan 4 spec §6): one row per variable, one column per environment.
import { useEffect, useState } from "react";
import { t } from "../../src/i18n";
import { type VariableRow, variableRows, withVariables } from "../../src/options/model";
import { Feedback, type SectionProps, useSubmit } from "./feedback";

export function VariablesSection({ config, onSave }: SectionProps) {
  const stored = JSON.stringify(variableRows(config));
  const [rows, setRows] = useState<VariableRow[]>(() => JSON.parse(stored) as VariableRow[]);
  const { errors, saved, submit } = useSubmit(onSave);

  // Follow the stored table (e.g. after an import) without wiping unsaved edits on unrelated saves.
  useEffect(() => {
    setRows(JSON.parse(stored) as VariableRow[]);
  }, [stored]);

  const setRow = (index: number, row: VariableRow): void => setRows(rows.map((item, i) => (i === index ? row : item)));

  return (
    <section aria-labelledby="variables-title">
      <h2 id="variables-title">{t("optionsVariables")}</h2>
      <p className="muted">{t("optionsVariablesHelp")}</p>
      {config.environments.length === 0 ? (
        <p className="muted">{t("optionsVariablesNoEnvironments")}</p>
      ) : (
        <>
          <div className="table-scroll">
            <table className="variables">
              <thead>
                <tr>
                  <th scope="col">{t("optionsVariableName")}</th>
                  {config.environments.map((environment) => (
                    <th scope="col" key={environment.id}>
                      {environment.name}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        name="variableName"
                        aria-label={t("optionsVariableName")}
                        spellCheck={false}
                        value={row.name}
                        onChange={(event) => setRow(index, { ...row, name: event.target.value })}
                      />
                    </td>
                    {config.environments.map((environment) => {
                      const value = row.values[environment.id] ?? "";
                      return (
                        <td key={environment.id} className={value.trim() === "" ? "unset" : undefined}>
                          <input
                            data-environment={environment.id}
                            aria-label={`${row.name}: ${environment.name}`}
                            spellCheck={false}
                            value={value}
                            onChange={(event) => setRow(index, { ...row, values: { ...row.values, [environment.id]: event.target.value } })}
                          />
                        </td>
                      );
                    })}
                    <td>
                      <button
                        type="button"
                        className="link"
                        aria-label={`${t("optionsRemove")}: ${row.name}`}
                        onClick={() => setRows(rows.filter((_, i) => i !== index))}
                      >
                        {t("optionsRemove")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row">
            <button type="button" onClick={() => setRows([...rows, { name: "", values: {} }])}>
              {t("optionsAddVariable")}
            </button>
            <button type="button" onClick={() => void submit(withVariables(config, rows))}>
              {t("optionsSave")}
            </button>
          </div>
        </>
      )}
      <Feedback errors={errors} saved={saved} />
    </section>
  );
}
```

`entrypoints/options/App.tsx`:
- Import ekle: `import { VariablesSection } from "./VariablesSection";`
- `<EnvironmentsSection {...props} />` satırından sonra ekle: `<VariablesSection {...props} />`
- Dosyanın başındaki yorumu güncelle: `// Options page (spec §9): environments, variables, actions, copy and masking, export and import.`

`entrypoints/options/options.css` dosyasının sonuna ekle:
```css
.table-scroll { overflow-x: auto; }
.variables { width: 100%; border-collapse: collapse; }
.variables th { padding: 4px; text-align: left; font-weight: 600; white-space: nowrap; }
.variables td { padding: 4px; }
.variables input { width: 100%; min-width: 140px; }
.variables td.unset input { border-color: #f5a700; background: #fff9e8; }
```

- [ ] **Step 6: Bütün kontrolleri çalıştır**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest
```
Beklenen: hepsi geçer. Tablo Task 6'da uçtan uca test edilir.

- [ ] **Step 7: Commit**

```bash
git branch --show-current   # plan-4-env-variables
git add src/options/model.ts entrypoints/options public tests/unit/options/model.test.ts
git commit -m "feat: edit environment variables in a variable-by-environment table

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Ayarlar sayfası: hedef data view, URL açıklaması ve değişken uyarıları

**Files:**
- Modify: `src/options/model.ts`, `entrypoints/options/ActionEditor.tsx`, `entrypoints/options/ActionsSection.tsx`, `entrypoints/options/feedback.tsx`, `public/_locales/en/messages.json`, `public/_locales/tr/messages.json`
- Test: `tests/unit/options/model.test.ts`

**Interfaces:**
- Consumes:
  - Task 1'den `isVariablePath`, `VARIABLE_PREFIX`, `parsePlaceholders`
  - Task 2'den `lookupVariable`, `invalidLeadingVariable`
- Produces:
  - `model.ts`:
    - `interface VariableWarning { environment: string; variable: string; kind: "missing" | "invalid" }`. `environment` ortamın adıdır.
    - `variableWarnings(environments: Environment[], action: Action): VariableWarning[]`
    - `withAction` artık `dataViewId` ve `dataViewName` alanlarını kırpar; boş kalan alan silinir.
  - `feedback.tsx`: `VariableWarnings({ warnings })`. Her uyarı `span.pending.var-warning[data-variable="<ad>"]` olarak çizilir.
  - `ActionEditor`'da hedef data view için `input[name="targetKind"]` (`name` | `id`) radyoları ve `input[name="dataView"]` girişi.

- [ ] **Step 1: Model testlerini ekle**

`tests/unit/options/model.test.ts` import listesine `variableWarnings` ekle. `Action` tipini de import et:
```ts
import { type Action, type Config, emptyConfig } from "../../../src/core/config";
```
Dosyanın sonuna ekle:
```ts
describe("variableWarnings", () => {
  const environments = [
    { id: "alpha", name: "Alpha", kibanaUrl: "https://elk.alpha.test", variables: { adminUrl: "https://admin.alpha.test", app: "api" } },
    { id: "prod", name: "Prod", kibanaUrl: "https://elk.prod.test", variables: { adminUrl: "admin.prod.test" } },
  ];
  const linkAction = (urlTemplate: string, environmentIds: string[] = []): Action => ({
    id: "l",
    kind: "link",
    label: "L",
    enabled: true,
    environmentIds,
    conditions: [],
    urlTemplate,
  });

  it("lists missing variables and a leading one that is not http(s), per environment the action applies to", () => {
    expect(variableWarnings(environments, linkAction("{env.adminUrl}/u/{user_id}?app={env.app}"))).toEqual([
      { environment: "Prod", variable: "app", kind: "missing" },
      { environment: "Prod", variable: "adminUrl", kind: "invalid" },
    ]);
    expect(variableWarnings(environments, linkAction("{env.adminUrl}/u/{env.app}", ["alpha"]))).toEqual([]);
  });

  it("checks Discover queries for missing variables only, once per name", () => {
    const query: Action = {
      id: "d",
      kind: "discover",
      label: "D",
      enabled: true,
      environmentIds: [],
      conditions: [],
      queryTemplate: "app:{env.app} or app2:{env.app}",
    };
    expect(variableWarnings(environments, query)).toEqual([{ environment: "Prod", variable: "app", kind: "missing" }]);
  });

  it("ignores placeholders that also have a field path", () => {
    expect(variableWarnings(environments, linkAction("https://{context.host|env.host}/x"))).toEqual([]);
  });
});

describe("withAction target data view", () => {
  const base = (): Config => ({ ...emptyConfig(), environments: [newEnvironment("A", "https://a.example.com", "e1")] });

  it("trims the target when saved, keeps inner spaces, and drops an empty one", () => {
    // Review Focus 3: the editor keeps what was typed; only saving trims.
    const saved = (action: Action) => {
      const result = withAction(base(), action);
      if (!result.ok) throw new Error(result.errors.join("; "));
      return result.config.actions[0];
    };
    expect(saved({ ...newAction("discover", "d"), label: "D", dataViewName: "  App logs " } as Action)).toMatchObject({
      dataViewName: "App logs",
    });
    expect(saved({ ...newAction("discover", "d"), label: "D", dataViewId: "   " } as Action)).not.toHaveProperty("dataViewId");
  });
});
```

- [ ] **Step 2: Testleri çalıştır, kırıldıklarını gör**

Çalıştır: `npx vitest run tests/unit/options/model.test.ts`
Beklenen: FAIL (`variableWarnings` yok, kırpma yok).

- [ ] **Step 3: Model fonksiyonlarını yaz**

`src/options/model.ts`:

Import'ları şöyle yap:
```ts
import { type Action, type Config, type Environment, type ParseResult, originPattern, parseConfig } from "../core/config";
import { invalidLeadingVariable } from "../core/link-actions";
import { VARIABLE_PREFIX, isVariablePath, lookupVariable, parsePlaceholders } from "../core/template";
```

`withAction`'ı değiştir:
```ts
/** Trims the editor's free-text target; an empty one means none (Plan 4 spec §6). */
function withTrimmedTarget(action: Action): Action {
  if (action.kind !== "discover") return action;
  const { dataViewId, dataViewName, ...rest } = action;
  const id = dataViewId?.trim();
  const name = dataViewName?.trim();
  return { ...rest, ...(id ? { dataViewId: id } : {}), ...(name ? { dataViewName: name } : {}) };
}

/** Replaces the action with the same id in place, or appends it. */
export function withAction(config: Config, action: Action): ParseResult {
  const saved = withTrimmedTarget(action);
  const exists = config.actions.some((item) => item.id === saved.id);
  const actions = exists ? config.actions.map((item) => (item.id === saved.id ? saved : item)) : [...config.actions, saved];
  return parseConfig({ ...config, actions });
}
```

`withVariables`'tan sonra ekle:
```ts
export interface VariableWarning {
  /** The environment's name. */
  environment: string;
  variable: string;
  kind: "missing" | "invalid";
}

/**
 * Plan 4 spec §6, from the settings alone: per environment the action applies to, the variables its
 * template needs but the environment lacks, and a leading variable whose value is not an http(s) address.
 */
export function variableWarnings(environments: Environment[], action: Action): VariableWarning[] {
  const applies = action.environmentIds.length === 0 ? environments : environments.filter((environment) => action.environmentIds.includes(environment.id));
  const template = action.kind === "link" ? action.urlTemplate : action.queryTemplate;
  const placeholders = parsePlaceholders(template).filter((placeholder) => placeholder.paths.every(isVariablePath));
  return applies.flatMap((environment): VariableWarning[] => {
    const missing = new Set(
      placeholders
        .filter((placeholder) => placeholder.paths.every((path) => lookupVariable(environment.variables, path) === null))
        .map((placeholder) => (placeholder.paths[0] ?? "").slice(VARIABLE_PREFIX.length)),
    );
    const warnings = [...missing].map((variable): VariableWarning => ({ environment: environment.name, variable, kind: "missing" }));
    const invalid = action.kind === "link" ? invalidLeadingVariable(action.urlTemplate, environment.variables) : undefined;
    return invalid === undefined ? warnings : [...warnings, { environment: environment.name, variable: invalid, kind: "invalid" }];
  });
}
```

- [ ] **Step 4: Metinler**

`public/_locales/en/messages.json`:
- `"optionsDataViewId"` girdisini sil.
- `"optionsUrlTemplate"` mesajını şöyle yap: `"URL template: {field} comes from the log, {env.name} from the environment, e.g. {env.adminUrl}/users/{user_id}"`.
- Ekle:
```json
  "optionsTargetDataView": { "message": "Target data view (empty: the data view of the open log)" },
  "optionsTargetByName": { "message": "Name or index pattern" },
  "optionsTargetById": { "message": "ID" },
  "optionsPreviewDataViewName": {
    "message": "$NAME$, resolved in Discover",
    "placeholders": { "name": { "content": "$1", "example": "player_login_log" } }
  },
  "optionsWarnMissingVariable": {
    "message": "$ENV$: $NAME$ is not set",
    "placeholders": { "env": { "content": "$1", "example": "Prod" }, "name": { "content": "$2", "example": "adminUrl" } }
  },
  "optionsWarnInvalidVariable": {
    "message": "$ENV$: $NAME$ is not an http(s) address",
    "placeholders": { "env": { "content": "$1", "example": "Prod" }, "name": { "content": "$2", "example": "adminUrl" } }
  }
```

`public/_locales/tr/messages.json`:
- `"optionsDataViewId"` girdisini sil.
- `"optionsUrlTemplate"` mesajını şöyle yap: `"URL şablonu: {alan} logdan, {env.ad} ortamdan gelir, örn. {env.adminUrl}/users/{user_id}"`.
- Ekle:
```json
  "optionsTargetDataView": { "message": "Hedef data view (boş: açık logun data view'ı)" },
  "optionsTargetByName": { "message": "Ad ya da index deseni" },
  "optionsTargetById": { "message": "Kimlik" },
  "optionsPreviewDataViewName": {
    "message": "$NAME$, Discover'da çözülür",
    "placeholders": { "name": { "content": "$1", "example": "player_login_log" } }
  },
  "optionsWarnMissingVariable": {
    "message": "$ENV$: $NAME$ tanımlı değil",
    "placeholders": { "env": { "content": "$1", "example": "Prod" }, "name": { "content": "$2", "example": "adminUrl" } }
  },
  "optionsWarnInvalidVariable": {
    "message": "$ENV$: $NAME$ bir http(s) adresi değil",
    "placeholders": { "env": { "content": "$1", "example": "Prod" }, "name": { "content": "$2", "example": "adminUrl" } }
  }
```

- [ ] **Step 5: Uyarı bileşeni ve aksiyon listesi**

`entrypoints/options/feedback.tsx`:
- Import ekle: `import type { VariableWarning } from "../../src/options/model";`
- Dosyanın sonuna ekle:
```tsx
/** Plan 4 spec §6: variables an action needs but an environment lacks or holds as a non-http(s) base. */
export function VariableWarnings({ warnings }: { warnings: VariableWarning[] }) {
  return (
    <>
      {warnings.map((warning, index) => (
        <span key={`${index}-${warning.variable}`} className="pending var-warning" data-variable={warning.variable}>
          {t(warning.kind === "missing" ? "optionsWarnMissingVariable" : "optionsWarnInvalidVariable", warning.environment, warning.variable)}
        </span>
      ))}
    </>
  );
}
```

`entrypoints/options/ActionsSection.tsx`:
- Import'ları şöyle yap:
```ts
import { newAction, variableWarnings, withAction, withoutAction } from "../../src/options/model";
import { Feedback, type SectionProps, VariableWarnings, useSubmit } from "./feedback";
```
- Liste satırında `<span className="muted">{environmentNames(config, action)}</span>` satırından sonra ekle:
```tsx
            <VariableWarnings warnings={variableWarnings(config.environments, action)} />
```

- [ ] **Step 6: Düzenleyici: hedef data view, uyarılar, önizleme notu**

`entrypoints/options/ActionEditor.tsx`:

Import'ları şöyle yap:
```ts
import type { Action, DiscoverAction, Environment } from "../../src/core/config";
import { variableWarnings } from "../../src/options/model";
import { VariableWarnings } from "./feedback";
```

Dosyanın sonuna ekle:
```tsx
type TargetKind = "name" | "id";

/** Plan 4 spec §6: the target data view by name (default) or ID. Kept as typed; withAction trims it when saved. */
function TargetDataView({ action, update }: { action: DiscoverAction; update: (patch: Partial<DiscoverAction>) => void }) {
  const [kind, setKind] = useState<TargetKind>(action.dataViewId !== undefined ? "id" : "name");
  const value = (kind === "name" ? action.dataViewName : action.dataViewId) ?? "";
  const set = (target: TargetKind, text: string): void =>
    update(
      target === "name"
        ? { dataViewName: text === "" ? undefined : text, dataViewId: undefined }
        : { dataViewId: text === "" ? undefined : text, dataViewName: undefined },
    );
  return (
    <fieldset>
      <legend>{t("optionsTargetDataView")}</legend>
      {(["name", "id"] as const).map((target) => (
        <label className="inline" key={target}>
          <input
            type="radio"
            name="targetKind"
            value={target}
            checked={kind === target}
            onChange={() => {
              setKind(target);
              set(target, value);
            }}
          />
          {t(target === "name" ? "optionsTargetByName" : "optionsTargetById")}
        </label>
      ))}
      <input name="dataView" aria-label={t("optionsTargetDataView")} spellCheck={false} value={value} onChange={(event) => set(kind, event.target.value)} />
    </fieldset>
  );
}
```

Discover dalındaki şu bloğu:
```tsx
          <label>
            {t("optionsDataViewId")}
            <input
              spellCheck={false}
              value={action.dataViewId ?? ""}
              onChange={(event) => update({ dataViewId: event.target.value.trim() || undefined })}
            />
          </label>
```
şununla değiştir:
```tsx
          <TargetDataView action={action} update={update} />
```

Koşullar `fieldset`'inden hemen önce ekle:
```tsx
      <p>
        <VariableWarnings warnings={variableWarnings(environments, action)} />
      </p>
```

`describePreview` içinde Discover dönüşünü şöyle değiştir:
```ts
  const range = action.windowMinutes === undefined ? "" : ` · ${t("optionsPreviewWindow", String(action.windowMinutes))}`;
  const target = action.dataViewName === undefined ? "" : ` · ${t("optionsPreviewDataViewName", action.dataViewName)}`;
  return `${t("optionsPreviewShown")} ${query}${range}${target}`;
```

- [ ] **Step 7: Bütün kontrolleri çalıştır**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest
```
Beklenen: hepsi geçer. `rg -n "optionsDataViewId" src entrypoints` hiçbir sonuç vermemeli.

- [ ] **Step 8: Commit**

```bash
git branch --show-current   # plan-4-env-variables
git add src/options/model.ts entrypoints/options public tests/unit/options/model.test.ts
git commit -m "feat: target data view by name in the editor, and warn about missing variables

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Uçtan uca: seed ve senaryolar

**Files:**
- Create: `tests/e2e/variables.spec.ts`
- Modify: `docker/seed.mjs`, `tests/e2e/options.spec.ts`

**Interfaces:**
- Consumes:
  - Task 1'den `e2eConfig()` (sürüm 2) ve `configure(config)`
  - Task 2'den pasif buton (`.kt-disabled`, `title`)
  - Task 3'ten `dataViewName`
  - Task 4 ve 5'ten ayarlar sayfasındaki seçiciler
  - `src/kibana/discover-state.ts`'ten `dataViewIdFromState` ve `readAppState`
- Produces: 8.x/9.x seed'inde varsayılan space'e kurulan `app-log-named` data view'ı: `title: "app_log"`, `name: "App logs"`, `timeFieldName: "datetime"`.

- [ ] **Step 1: Seed'e görünen adı farklı data view'ı ekle**

`docker/seed.mjs`:

`dataView` fonksiyonunu değiştir:
```js
// 7.17 has no data views API; its index pattern API takes the same fields except `name`.
async function dataView(space, id, title, timeFieldName, name = title) {
  const base = space ? `/s/${space}` : "";
  const [api, key] = major >= 8 ? ["/api/data_views/data_view", "data_view"] : ["/api/index_patterns/index_pattern", "index_pattern"];
  await kb("DELETE", `${base}${api}/${id}`, undefined, { allow: [404] });
  await kb("POST", `${base}${api}`, { [key]: { id, title, timeFieldName, ...(major >= 8 ? { name } : {}) } });
}
```

`await dataView("", "logs", "logs-*", "@timestamp");` satırından sonra ekle:
```js
if (major >= 8) {
  // Plan 4: a display name that differs from its index pattern, which app-log has too (name match, ambiguity).
  await dataView("", "app-log-named", "app_log", "datetime", "App logs");
}
```

Seed'i yeniden çalıştır (7'de değişiklik yok ama sözleşme gereği üçü de):
```bash
./docker/up.sh 7 && ./docker/up.sh 8 && ./docker/up.sh 9
```

- [ ] **Step 2: Çubuk senaryolarını yaz**

`tests/e2e/variables.spec.ts` dosyasını oluştur:
```ts
// Plan 4: {env.…} variables and Discover targets chosen by name, on 7.17, 8.19 and 9.5.
import type { Config } from "../../src/core/config";
import { dataViewIdFromState, readAppState } from "../../src/kibana/discover-state";
import { e2eConfig, expect, test } from "./fixtures";
import { bar, barLinks, openDoc } from "./kibana";
import { stack } from "./stack";

/** e2eConfig plus a variable in a link, one that is never set, and Discover targets by name. */
function variablesConfig(): Config {
  const config = e2eConfig();
  const shared = { enabled: true, environmentIds: [], conditions: [] };
  config.environments[0]!.variables = { adminUrl: "https://admin.example.com" };
  config.actions.push(
    { ...shared, id: "var-user", kind: "link", label: "Var user", urlTemplate: "{env.adminUrl}/users/{user_id}" },
    { ...shared, id: "var-missing", kind: "link", label: "Var missing", urlTemplate: "{env.missingUrl}/users/{user_id}" },
    { ...shared, id: "by-pattern", kind: "discover", label: "By pattern", queryTemplate: "user_id:{user_id}", dataViewName: "*_log" },
    { ...shared, id: "by-title", kind: "discover", label: "By title", queryTemplate: "user_id:{user_id}", dataViewName: "app_log" },
    { ...shared, id: "by-display-name", kind: "discover", label: "By display name", queryTemplate: "", dataViewName: "App logs" },
    { ...shared, id: "unknown-name", kind: "discover", label: "Unknown name", queryTemplate: "", dataViewName: "no_such_view" },
  );
  return config;
}

/** The data view a bar link opens. */
function targetOf(href: string | undefined): string | undefined {
  const url = href ?? "";
  return dataViewIdFromState(readAppState(url.slice(url.indexOf("#"))));
}

test.beforeEach(async ({ configure }) => {
  await configure(variablesConfig());
});

test("fills {env.…} from the environment and greys out a link whose variable is not set", async ({ context }) => {
  const { detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-001"' });
  expect((await barLinks(detail))["Var user"]).toBe("https://admin.example.com/users/100001");
  const missing = bar(detail).locator(".kt-disabled", { hasText: "Var missing" });
  await expect(missing).toHaveAttribute("aria-disabled", "true");
  await expect(missing).toHaveAttribute("title", /missingUrl/);
});

test("opens a Discover action on the data view it names", async ({ context }) => {
  const { detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-001"' });
  const links = await barLinks(detail);
  expect(targetOf(links["By pattern"])).toBe("all-logs");
  await expect(bar(detail).locator(".kt-disabled", { hasText: "Unknown name" })).toHaveAttribute("title", /no_such_view/);
  if (stack.major === 7) {
    // 7.17 has no display names: app_log is one data view, "App logs" none.
    expect(targetOf(links["By title"])).toBe("app-log");
    await expect(bar(detail).locator(".kt-disabled", { hasText: "By display name" })).toHaveAttribute("title", /App logs/);
  } else {
    expect(targetOf(links["By display name"])).toBe("app-log-named");
    // app-log and app-log-named both have the index pattern app_log.
    const ambiguous = bar(detail).locator(".kt-disabled", { hasText: "By title" });
    await expect(ambiguous).toHaveAttribute("title", /app_log/);
    await expect(ambiguous).toHaveAttribute("title", /2/);
  }
});

test("looks the name up in the open space", async ({ context }) => {
  const { detail } = await openDoc(context, { space: "test", dataViewId: "test-app-log", query: 'extra.uid:"uid-001"' });
  expect(targetOf((await barLinks(detail))["By title"])).toBe("test-app-log");
});
```

- [ ] **Step 3: Ayarlar sayfası senaryolarını ekle**

`tests/e2e/options.spec.ts`:

Import'lara ekle:
```ts
import type { Config } from "../../src/core/config";
```

Dosyanın sonuna ekle:
```ts
test("edits environment variables in the table and clears the action's warning", async ({ context, extension, configure }) => {
  const config = e2eConfig();
  config.actions.push({
    id: "needs-var",
    kind: "link",
    label: "Needs var",
    enabled: true,
    environmentIds: [],
    conditions: [],
    urlTemplate: "{env.adminUrl}/users/{user_id}",
  });
  await configure(config);
  const options = await openOptions(context, extension.id);
  const actions = options.locator('section[aria-labelledby="actions-title"]');
  await expect(actions.locator('.var-warning[data-variable="adminUrl"]')).toHaveCount(1);

  const variables = options.locator('section[aria-labelledby="variables-title"]');
  await variables.locator(".row > button").first().click(); // "Add variable"
  await variables.locator('input[name="variableName"]').fill("adminUrl");
  await variables.locator('input[data-environment="stack"]').fill(" https://admin.example.com ");
  await variables.locator(".row > button").nth(1).click(); // "Save"
  await expect
    .poll(async () => ((await readStored(extension.worker)) as Config).environments[0]?.variables)
    .toEqual({ adminUrl: "https://admin.example.com" });
  await expect(actions.locator(".var-warning")).toHaveCount(0);
});

test("keeps the inner space of a target data view name typed in the editor", async ({ context, extension, configure }) => {
  await configure();
  const options = await openOptions(context, extension.id);
  const actions = options.locator('section[aria-labelledby="actions-title"]');
  await actions.locator(".row > button").nth(1).click(); // "Add Discover action"
  await actions.locator('input[name="label"]').fill("Named");
  await expect(actions.locator('input[name="targetKind"][value="name"]')).toBeChecked();
  await actions.locator('input[name="dataView"]').pressSequentially("  App logs ");
  await actions.locator('.editor button[type="submit"]').click();
  await expect
    .poll(async () => ((await readStored(extension.worker)) as Config).actions.find((action) => action.label === "Named"))
    .toMatchObject({ kind: "discover", dataViewName: "App logs" });
});

test("imports a version 1 settings file and stores it as version 2", async ({ context, extension, configure }) => {
  await configure();
  const options = await openOptions(context, extension.id);
  const transfer = options.locator('section[aria-labelledby="transfer-title"]');
  const { environments, ...rest } = e2eConfig();
  const v1 = {
    ...rest,
    schemaVersion: 1,
    environments: environments.map(({ id, name, kibanaUrl }) => ({ id, name, kibanaUrl })),
  };
  await transfer
    .locator('input[type="file"]')
    .setInputFiles({ name: "v1.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(v1)) });
  await transfer.locator(".warning button").first().click(); // "Replace settings"
  await expect.poll(() => readStored(extension.worker)).toEqual(e2eConfig());
});
```
`pressSequentially`, her tuşu ayrı ayrı yazdığı için iç boşluğu her tuşta kırpan bir girişi yakalar (Review Focus 3).

- [ ] **Step 4: Uçtan uca testleri üç sürümde çalıştır**

```bash
npm run typecheck
KT_STACK=7 npm run e2e && KT_STACK=8 npm run e2e && KT_STACK=9 npm run e2e
```
Beklenen: hepsi geçer. Bir test kırılırsa sebebi düzeltilir; beklenti gevşetilmez. `--repeat-each=3` ile `variables.spec.ts` ve `options.spec.ts` 7 ve 9'da bir kez daha çalıştırılır:
```bash
KT_STACK=7 npm run e2e -- variables options --repeat-each=3 && KT_STACK=9 npm run e2e -- variables options --repeat-each=3
```

- [ ] **Step 5: Commit**

```bash
git branch --show-current   # plan-4-env-variables
git add docker/seed.mjs tests/e2e
git commit -m "test: e2e for environment variables, data view names and the variables table

The 8.x/9.x seed adds app-log-named: a display name that differs from its index pattern.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Belgeler: örnek ayar, README, CHANGELOG, CLAUDE.md

**Files:**
- Modify: `examples/kibanatool-settings.json`, `README.md`, `CHANGELOG.md`, `CLAUDE.md`
- Test: `tests/unit/examples.test.ts` (değişmez; dosyayı doğrulamaya devam eder), `tests/e2e/options.spec.ts` (örnek dosyayı içe aktaran test)

**Interfaces:**
- Consumes: Task 1–5'teki ayar biçimi
- Produces: belgeler; kod değişmez.

- [ ] **Step 1: Örnek ayar dosyası**

`examples/kibanatool-settings.json` dosyasının tamamını şu içerikle değiştir:
```json
{
  "schemaVersion": 2,
  "environments": [
    {
      "id": "prod",
      "name": "Production",
      "kibanaUrl": "https://kibana.example.com",
      "variables": { "adminUrl": "https://admin.example.com", "jiraUrl": "https://acme.atlassian.net" }
    }
  ],
  "actions": [
    {
      "id": "admin-user",
      "kind": "link",
      "label": "User in admin",
      "enabled": true,
      "environmentIds": [],
      "conditions": [],
      "urlTemplate": "{env.adminUrl}/users/{user_id|context.user_id|user.id}"
    },
    {
      "id": "sentry",
      "kind": "link",
      "label": "Sentry",
      "enabled": true,
      "environmentIds": [],
      "conditions": [{ "field": "level_name", "op": "equals", "value": "ERROR" }],
      "urlTemplate": "https://acme.sentry.io/issues/?query={message}"
    },
    {
      "id": "jira",
      "kind": "link",
      "label": "Jira",
      "enabled": true,
      "environmentIds": [],
      "conditions": [],
      "urlTemplate": "{env.jiraUrl}/issues/?jql=text%20~%20{user_id|user.id}"
    },
    {
      "id": "user-logs",
      "kind": "discover",
      "label": "This user's logs",
      "enabled": true,
      "environmentIds": [],
      "conditions": [],
      "queryTemplate": "user_id:{user_id}"
    },
    {
      "id": "user-everywhere",
      "kind": "discover",
      "label": "This user in all logs",
      "enabled": true,
      "environmentIds": [],
      "conditions": [],
      "queryTemplate": "user_id:{user_id}",
      "dataViewName": "*_log",
      "windowMinutes": 60
    },
    {
      "id": "around",
      "kind": "discover",
      "label": "±5 minutes",
      "enabled": true,
      "environmentIds": [],
      "conditions": [],
      "queryTemplate": "",
      "windowMinutes": 5
    }
  ],
  "copy": {
    "markdownFields": [],
    "maskPatterns": ["*authorization*", "*password*", "*token*", "*secret*", "*cookie*"]
  }
}
```

- [ ] **Step 2: README**

`README.md` → "Set up" listesinde 3. maddeden ("Environments") sonra yeni bir madde ekle. Sonraki maddelerin numaralarını bir artır:
```markdown
4. **Variables:** values that differ per environment, like your admin panel's address. Each row is a
   variable, each column an environment; use them in templates as `{env.name}`.
```

"Placeholders and conditions" listesine, "Values are URL-encoded…" maddesinden önce ekle:
```markdown
- `{env.name}` is a variable of the environment you are in (see **Variables**), e.g. `{env.adminUrl}/users/{user_id}`.
  It goes into links as it is and is quoted like a field in KQL. A link may start with one if its value is an
  `http(s)` address. If the environment does not set it, the button is greyed out and its tooltip says why.
- A Discover action opens the data view of the open log, or the one under **Target data view**: a display
  name or an index pattern (e.g. `*_log`), looked up in the current space, or an ID. If no data view or more
  than one matches the name, the button is greyed out.
```

"Example actions" tablosunu şu tabloyla değiştir:
```markdown
| Label | Kind | Template |
|---|---|---|
| User in admin | Link | `{env.adminUrl}/users/{user_id\|context.user_id\|user.id}` |
| Sentry | Link, only when `level_name` is `ERROR` | `https://acme.sentry.io/issues/?query={message}` |
| Jira | Link | `{env.jiraUrl}/issues/?jql=text%20~%20{user_id\|user.id}` |
| This user's logs | Discover | `user_id:{user_id}` |
| This user in all logs | Discover on the `*_log` data view, 60-minute window | `user_id:{user_id}` |
| ±5 minutes | Discover, 5-minute window | empty query |
```

- [ ] **Step 3: CHANGELOG**

`CHANGELOG.md` → `## [1.0.0] - Unreleased` → `### Added` listesinde "Options page: …" maddesinden sonra ekle:
```markdown
- Environment variables: `{env.name}` placeholders take each environment's own value, set in a variables
  table on the options page, so one set of actions works in every Kibana. A button whose variable is not set
  is greyed out with the reason.
- Discover actions can name their target data view (display name or index pattern) instead of an ID; the
  name is looked up in the current space.
- Settings files are version 2. Version 1 files and settings saved by earlier builds are converted when loaded.
```

- [ ] **Step 4: CLAUDE.md**

`CLAUDE.md` → "Traps" listesinde "Settings validation repairs…" maddesinden sonra ekle:
```markdown
- `{env.<name>}` placeholder paths are environment variables, never log fields. Their values go into link URLs unencoded (they come from the user's settings, not the log); field values are always encoded.
- A settings schema change bumps `schemaVersion` and converts older input inside `parseConfig`. `storage.ts` turns anything `parseConfig` rejects into the empty config, so a missing conversion silently wipes stored settings.
```

"Architecture" bölümünde `activeEnvironment …` maddesinden sonra ekle:
```markdown
- Discover actions may name their target data view (`dataViewName`). The bar reads the open space's data view list once per page (`/api/data_views`, or `saved_objects/_find` on 7.17), only when an action needs it.
```

- [ ] **Step 5: Kontroller**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest
KT_STACK=8 npm run e2e -- options
```
Beklenen: hepsi geçer. `examples.test.ts` ve örnek dosyayı içe aktaran e2e testi yeni dosyayla geçer.

- [ ] **Step 6: Commit**

```bash
git branch --show-current   # plan-4-env-variables
git add examples/kibanatool-settings.json README.md CHANGELOG.md CLAUDE.md
git commit -m "docs: environment variables and data view names in the example, README, changelog and CLAUDE.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Doğrulama, Alpha ayarları ve PR

**Files:**
- Create: `docs/verification/2026-10-plan-4.md`
- Depo dışı: kullanıcının dışa aktardığı Alpha ayar dosyasının sürüm 2 hali. Repoya girmez.

- [ ] **Step 1: Bütün otomatik kontroller**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest && npm run zip
KT_STACK=7 npm run e2e && KT_STACK=8 npm run e2e && KT_STACK=9 npm run e2e
```
Sonuçları (test sayıları, e2e geçen/atlanan sayıları, zip boyutu) bir sonraki adımdaki tabloya yaz.

- [ ] **Step 2: Doğrulama kaydını yaz**

`docs/verification/2026-10-plan-4.md` dosyasını oluştur. Değerler Step 1'in gerçek çıktısından gelir:
```markdown
# Plan 4 doğrulaması (ortam değişkenleri ve adla data view)

- **Tarih:** <YYYY-MM-DD>
- **Dal:** `plan-4-env-variables`, HEAD `<kısa SHA>` (kayıt commit'inden önceki HEAD)
- **Kibana:** 7.17.29 (`http://localhost:17601/kibana`), 8.19.23 (`http://localhost:18601`), 9.5.5 (`http://localhost:19601`)

## Otomatik kontroller

| Kontrol | Sonuç |
|---|---|
| `npm test` | <N> test geçti |
| `npm run typecheck`, `npm run build`, `npm run check:manifest` | <sonuç> |
| `npm run zip` | <dosya, boyut> |
| E2E 7.17 | <geçti, atlandı> |
| E2E 8.19 | <geçti, atlandı> |
| E2E 9.5 | <geçti, atlandı> |
| `--repeat-each=3` (`variables`, `options`; 7.17 ve 9.5) | <sonuç> |

## Elle kontroller

| # | Kontrol | Sonuç |
|---|---|---|
| M1 | Kullanıcının Chrome'unda, sürüm 1 Alpha ayarlarıyla çalışan eklenti bu dalın derlemesiyle yenilendi (`chrome://extensions` → yenile). Ayarlar sayfası Alpha ortamını ve 17 aksiyonu kaybetmeden gösteriyor, Alpha'da çubuk eskisi gibi çıkıyor. | |
| M2 | Sürüm 2'ye çevrilmiş Alpha ayarları içe aktarıldı. Değişken tablosunda Alpha'nın değerleri görünüyor, `{env.…}` linkleri ve adla seçilen Discover butonları Alpha'da doğru yere gidiyor. | |
```
Tarih ve SHA alanlarını gerçek değerlerle doldurmadan dosyayı commit etme.

- [ ] **Step 3: Alpha ayarlarını sürüm 2'ye çevir (kullanıcıyla)**

1. **M1'i kullanıcıdan iste.** Kullanıcı, eklentiyi bu dalın derlemesiyle (`.output/chrome-mv3`) yeniler. Ardından ayarlarının kaybolmadığını doğrular. Bu, depodaki sürüm 1 çevirisinin gerçek veriyle denemesidir.
2. **Güncel ayarları al.** Kullanıcıdan ayarlar sayfasında "Ayarları dışa aktar" ile **güncel** ayarlarını dışa aktarmasını ve dosyanın yolunu vermesini iste. `~/Downloads/kibanatool-alpha.json` kullanılmaz, çünkü örnek adresler içerir. Kullanıcının gerçek adresleri dışa aktarılan dosyadadır. Dosyayı oku. Gerçek adresleri ve sırları sohbet çıktısına yazma.
3. **Değişkene çevrilecek kısımları sor.** Linklerin hangi kısmının değişken olacağını kullanıcıya sor, örneğin `adminUrl` ve `paymentUrl`. Adresler tek bir tabana oturmayabilir; karar kullanıcınındır.
4. **Dönüştür.** Dışa aktarılan dosyayı şöyle değiştir:
   - `schemaVersion: 2` yap.
   - Alpha ortamına `variables` ekle; değerler kullanıcının onayladığı tabanlar.
   - Link şablonlarında tabanı `{env.<ad>}` ile değiştir.
   - Discover aksiyonlarındaki `dataViewId`'leri Alpha'daki adlarla değiştir (`dataViewName`). Eşleştirme: `56a4d390-…` → `player_login_log`, `6d14c9b0-…` → `player_action_log`, `8e9b9a60-…` → `withdraw_log`, `1e1fcb30-…` → `coupon_log`, `28fe1d30-…` → `sms_log`, `81370f00-…` → `payment_log`, `1774b730-…` → `shared_coupon_log`, `892bd110-…` → `user_action_log`. Bu eşleştirme oturum belleğinde (`alpha-kibana-env`) kayıtlı.
   - Aksiyonların `environmentIds` alanını `[]` (tüm ortamlar) yapıp yapmamayı kullanıcıya sor. Değişkenler bunu mümkün kılıyor, ama kapsam kullanıcının kararı.
   - Sonucu `jiti` ile `parseConfig`'ten geçir ve değişmeden döndüğünü doğrula. Yöntem için 2026-10-09 oturumundaki `validate.ts` betiğine bak.
5. **Teslim.** Dosyayı kullanıcının seçtiği yere yaz, repoya değil. Kullanıcı içe aktarır ve M2'yi dener.

- [ ] **Step 4: Kayıt commit'i**

```bash
git branch --show-current   # plan-4-env-variables
git add docs/verification/2026-10-plan-4.md
git commit -m "docs: record Plan 4 verification

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Push ve PR (yalnızca kullanıcı onayıyla)**

Kullanıcıya şu seçenekleri sun: dalı push edip PR açmak, `main`'e yerelde birleştirmek ya da dalı olduğu gibi bırakmak. Onay gelirse push komutu Global Constraints'teki komuttur. PR açıklaması:

- değişiklikleri,
- test planını,
- M1/M2 sonuçlarını

anlatır ve `🤖 Generated with [Claude Code](https://claude.com/claude-code)` satırıyla biter. PR açılınca CI izlenir. Plan 3'te `pull_request` tetikleyicisi çalışmamıştı; çalışmazsa bu da kullanıcıya bildirilir.
