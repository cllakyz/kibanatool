# kibanatool Plan 2 — Discover Aksiyonları, Kopyalama, JSON Görünümü ve Tam Ayarlar Sayfası: Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Açık logun aksiyon çubuğuna üç şey eklenir: Discover aksiyonları (KQL ve ±N dakika zaman penceresi), "⋯" kopyalama menüsü (maskeli Markdown, log linki, sabit zamanlı görünüm) ve JSON görünümü. Ayarlar sayfası form düzenleyicisi, canlı önizleme ve dışa/içe aktarmayla tamamlanır. Hepsi 7.17, 8.x ve 9.x'te çalışır.

**Architecture:** Plan 1'in katmanları korunur.
- Yeni saf mantık `src/core/` altına gelir: Discover aksiyonları (KQL tırnaklama, log zamanı, zaman penceresi), datemath, maskeleme, Markdown ve JSON ağaç satırları.
- `src/kibana/url.ts` Discover ve tek log linklerini rison ile üretir. `discover-state.ts` artık `_g` parametresini de okur.
- İçerik tarafındaki React bileşenleri ince kalır. Hangi data view'ların zaman alanının çekileceği `src/content/bar-data.ts`'de, panoya yazma `src/content/clipboard.ts`'de. İkisi de birim testlidir.
- Ayarlar sayfası bölümlere ayrılır. Her düzenleme `src/options/model.ts`'deki saf fonksiyonlardan geçer ve `parseConfig` ile doğrulanır.

**Tech Stack:** Plan 1 ile aynı, yeni bağımlılık yok.
- Uygulama: WXT 0.21, React 19, TypeScript 5.9 (strict)
- Kütüphaneler: zod 4, rison-node 2.1, lz-string 1.5
- Test: Vitest 5, happy-dom 20

**Spec:** `docs/superpowers/specs/2026-10-07-kibanatool-design.md`

**Önceki plan:** `docs/superpowers/plans/2026-10-07-plan-1-link-actions-slice.md`. Tamamlandı ve PR #1 ile `main`'e girdi.

**Çalışma dalı:** `superpowers:using-git-worktrees` ile açılan bir worktree'de çalışılır. Dal adı tercihen `plan-2-discover-copy-json`; worktree aracı dal adına önek ekleyebilir, bu planda adı geçen dal her zaman worktree'nin açık dalıdır.

**Worktree açılınca ilk iş:** `docs/superpowers/` klasörünü ana checkout'tan worktree'ye kopyala (`cp -R <ana checkout>/docs/superpowers docs/`). Bu klasör gitignore'da olduğu için yeni worktree'de yoktur ve hiçbir commit'e girmez. Plan ve spec oradadır; kod yorumlarındaki `spec §N` atıfları da spec'i gösterir.

### Planların sırası

| Plan | Kapsam |
|---|---|
| 1 (tamamlandı) | İskelet, alan haritası, şablon ve koşullar, ayar modeli, Kibana istemcisi, iki adaptör, background kaydı, aksiyon çubuğu (link aksiyonları), asgari ayarlar sayfası, 8.19/9.5 geliştirme stack'leri, doğrulama |
| **2 (bu plan)** | Discover aksiyonları (KQL, zaman penceresi, rison URL), kopyalama menüsü (Markdown, maskeleme, datemath, panoya yazma), JSON görünümü, tam ayarlar sayfası (düzenleyici, canlı önizleme, dışa/içe aktarma), çeviri metinlerinin tamamlanması, Plan 1'den devreden bulgular |
| 3 | Playwright uçtan uca matrisi (7.17/8.19/9.5, Observability, space/alt yol, kısıtlı kullanıcı), sürüm başına HTML örneklerinin yakalanması, GitHub Actions, ikonlar, gizlilik politikası, README/CHANGELOG (örnek aksiyonlar dahil), `wxt zip` ile mağaza paketi |

### Spec'ten sapmalar ve yorumlar

| Spec | Bu plan | Neden |
|---|---|---|
| §7.5: maskeleme "kopyalanan çıktıda" | Yalnızca "Markdown olarak kopyala" çıktısı maskelenir. JSON görünümündeki "değeri kopyala" maskelemez (Task 8). | §7.4'teki paylaşım çıktısı Markdown'dır. JSON görünümünde değer zaten ekranda açıkça görünüyor. Kullanıcı tek bir değeri bilerek kopyalıyor. |
| §8: doğrulama | Hiçbir ortamda olmayan `environmentIds` değerleri **reddedilmez, onarılır**: bilinmeyen kimlikler silinir. Listesi boşalan aksiyon **kapatılır** (Task 1). | Boş liste "tüm ortamlar" demektir. Ortamı silmek, ona bağlı aksiyonu sessizce her ortama yaymamalı. Reddetmek ise ortam silmeyi geçersiz bir ayara çevirirdi. |
| §8: doğrulama | İki yeni red kuralı var: `exists` dışındaki operatörlerde koşul `value` zorunlu, aynı Kibana adresi iki kez eklenemez (Task 1). | Plan 1'den devreden bulgular. Sonuç: Plan 1'de bu kurallara uymayan kayıtlı bir ayar yüklemede geçersiz sayılır ve boş ayar kullanılır. Eklenti henüz yayınlanmadı, kayıtlı değer bir sonraki kayda kadar silinmez, ayarlar sayfası da bunu açıkça yazar (Task 10). Bu yüzden kabul edildi. |
| §7.4: "Görünümü sabit zamanla kopyala" | URL'de `_g.time` hiç yoksa da "çevrilemedi" uyarısı gösterilir (Task 4). | Zaman aralığı bilinmeden sabit tarihe çevrilemez. |
| §7.4: datemath | Yuvarlama tarayıcının saat diliminde yapılır, hafta pazar günü başlar. Kibana'nın `dateFormat:tz` ve `dateFormat:dow` ayarları okunmaz (Task 4). | Bunlar Kibana'nın varsayılanlarıdır. Ayarları okumak ayrı bir API çağrısı ister. |
| §7.4: panoya yazma yedeği | `execCommand('copy')` için geçici `textarea` çubuğun Shadow DOM'una eklenir, `document.body`'ye değil (Task 7). | 8.x/9.x'te yan panelin odak tuzağı, panel dışına eklenen elemandan odağı geri çeker. |
| §7.6: JSON görünümünün yeri | Çubuğun altında açılan bir panel (Task 8). | Spec yer belirtmiyor. Panel, Kibana'nın yan paneliyle z-index çakışmasına girmez. |
| §4.2: klasör yapısı | `kql` ayrı dosya değil, `kqlQuote` `src/core/discover-actions.ts` içinde. İçerik arayüzü Plan 1'deki gibi `src/content/` altında. | Tek fonksiyonluk modül gereksiz. |

### Plan 1'den devreden bulgular

| Bulgu | Task |
|---|---|
| `render()` kapısı Discover aksiyonlarını da sayıyor, yalnızca Discover aksiyonu olan ortamda "yükleniyor" yazıp sonra hiçbir şey göstermiyor | 7: "⋯" menüsü her zaman olduğu için kapı artık yalnızca "kimlik var mı" diye bakar. |
| `actionsForEnvironment` her çalışmada yeni dizi döndürüyor | 7: dizi yalnızca ayar değişince hesaplanır. |
| `kibanaPrefix` ilk `/app/`'i alıyor, `isDiscoverPath` de öyle | 2 |
| Koşul `value` zorunlu değil | 1 |
| `environmentIds` ortamlarla karşılaştırılmıyor | 1 (onarım olarak, bkz. sapmalar) |
| Çözülen URL `new URL` ile doğrulanmıyor | 1 |
| `[]` boş metne dönüşüp değer sayılıyor | 1 |
| `lookup` içinde `Object.hasOwn` yok | 1 |
| `readAppState` sonucu tip kontrolü olmadan isteğe ve URL'e gidiyor | 2 |
| Ayarlar sayfası: `.catch` eksikleri, kayıt başarısız olunca formun temizlenmesi, eski bildirim ve uyarı, `grantStatus` iptali, silmede host izninin kalması, aynı Kibana adresinin tekrar eklenebilmesi, etiketsiz alanlar | 1 (aynı adres), 9 (`unusedOrigins`), 10 |
| İstemci: zaman aşımı yok, `null` JSON gövdesi kaçıyor, `getVersion` önbelleksiz | 2 |
| Background bozuk ayar hatasını sessizce yutuyor | 2 |

## Global Constraints

- **Node ve npm:** Node `>=22`, paket yöneticisi `npm`. **Yeni bağımlılık eklenmez.**
- **TypeScript:** `typescript@5`, `strict: true` ve `noUncheckedIndexedAccess: true`.
- **Desteklenen Kibana sürümleri:** 7.17.29, 8.15.3, 8.19.23 ve 9.5.5'te doğrulanan davranışlar (spec §3). Yalnızca Chrome MV3, yalnızca Discover.
- **Manifest izinleri değişmez:**
  - `permissions` tam olarak `["storage", "scripting"]`
  - `optional_host_permissions` tam olarak `["http://*/*", "https://*/*"]`
  - `host_permissions` ve `content_scripts` boş
  - `npm run check:manifest` her task'ın sonunda geçer.
- **Ham log isteği** (spec §6.2): Plan 1'deki biçim aynen kalır. Tek ek: her isteğe `signal: AbortSignal.timeout(15000)` eklenir.
- **Yer tutucular:**
  - Biçim `{yol}` ya da `{yol|yedek1|yedek2}`.
  - `undefined`, `null`, `""` ve `[]` değer yok sayılır. `0` ve `false` değerdir.
  - Değeri olmayan yer tutucu aksiyonu gizler.
  - Link şablonunda değer `encodeURIComponent` ile kodlanır. KQL şablonunda `"…"` içine alınır, `\` ve `"` kaçış karakteriyle yazılır.
- **Discover linki** (spec §7.3):
  - Biçim: `<önek>/app/discover#/?_g=<rison>&_a=<rison>`
  - Her rison değeri `encodeURIComponent` ile kodlanır. Bu biçim 7.17.29'da `" \ ' ! & # Ç` karakterleriyle doğrulandı.
  - `_a` = `(index:'<dv>',query:(language:kuery,query:'<kql>'))`
  - Link her zaman yeni sekmede, `target="_blank" rel="noopener noreferrer"` ile açılır.
- **Tek log linki:** `<origin><önek>/app/discover#/doc/<dv>/<_index>?id=<_id>`. Her parça `encodeURIComponent` ile kodlanır.
- **Maskeleme:**
  - Desenler tam nokta yoluna, büyük/küçük harfe duyarsız uygulanır. `*` herhangi bir karakter dizisi demektir.
  - JSON metninin içindeki anahtarlar `<alan>.<anahtar>` yoluyla eşleşir.
  - Eşleşen değer `***` olur.
- **Panoya yazma:** Önce `navigator.clipboard.writeText` denenir, o başarısız olursa `execCommand('copy')` kullanılır. `copyText` çağrısından önce `await` yapılmaz, çünkü tarayıcı panoya yazmayı yalnızca tıklamanın içinde izin verir.
- **Kibana'yı bozmamak:**
  - İçerik betiği hiçbir hatayı dışarı sızdırmaz. Hatalar `console.debug("[kibanatool]", ...)` ile loglanır.
  - Çubuğun kök elemanı `click` ve `keydown` olaylarının yayılmasını durdurur. Aksi halde Kibana bu olayları host elemanında görür: örneğin 8.x/9.x yan panelinde ok tuşları başka loga geçer.
- **Ağ trafiği:** Yalnızca kullanıcının Kibana'sına same-origin istek. Telemetri yok.
- **UI:** Shadow DOM içinde React. `innerHTML` ya da `dangerouslySetInnerHTML` kullanılmaz. Log değerleri yalnızca React metni olarak çizilir.
- **Ayarlar:**
  - `chrome.storage.local`, anahtar `kibanatool.config`, `schemaVersion: 1`.
  - Her düzenleme `parseConfig` ile doğrulanır ve sonuç `ParseResult` olarak döner.
- **Metinler:**
  - Kod ve yorumlar İngilizce. Kullanıcıya görünen her metin `public/_locales/{en,tr}/messages.json` üzerinden gelir.
  - İki dosyanın anahtarları aynıdır. Bunu Task 2'deki test zorlar.
  - `MessageKey` tipi İngilizce dosyadan türetilir.
- **Import yolları:**
  - `wxt/browser` ve `#imports` yalnızca `entrypoints/` ve `src/i18n.ts` içinde kullanılır.
  - `src/i18n.ts`'i import eden React bileşenlerinin birim testi yazılmaz. Mantıkları test edilen saf modüllerdedir. Bileşenler derleme ve Task 12'deki doğrulamayla sınanır.
- **Komutlar (her task'ın sonunda):** `npm test`, `npm run typecheck`, `npm run build`, `npm run check:manifest`.
- **Git:**
  - Bu depoda `user.email` yerel olarak `cllakyz@hotmail.com`.
  - Her commit mesajı `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` satırıyla biter.
  - Push komutu: `GH_TOKEN=$(gh auth token --user cllakyz) git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push`
  - `docs/superpowers/` dosyaları commit edilmez.

## Review Focus

1. **KQL değerinde özel karakterler:** Değerde `"`, `\`, `'`, `!`, `&`, `#` ya da Türkçe harf varsa Discover sorgu çubuğunda değer birebir aynı görünmeli. Testi Task 3 içerir: üretilen URL'in `_a` parametresi Kibana'nın yaptığı gibi çözülür ve girdiyle karşılaştırılır.
2. **Log zamanının biçimleri:** Şu biçimlerin hepsinde zaman penceresi doğru merkezlenmeli:
   - mikrosaniyeli ve saat farklı Monolog zamanı
   - saat dilimi olmayan metin (Elasticsearch bunu UTC sayar, `Date.parse` ise yerel saat)
   - sayı ya da metin olarak epoch milisaniye
   - tarih dizisi

   Okunamayan değerde mevcut zaman aralığına düşülmeli. Testi Task 3 içerir.
3. **Datemath sınır durumları:**
   - 31 Mart'ta `now-1M` → 28/29 Şubat (3 Mart değil)
   - `to` olarak `now/d` → günün sonu, 23:59:59.999 (yerel)
   - `now-7d/d`
   - Desteklenmeyen ifadeler (`now-1d+2h`, `now-1q`) → null

   Testi Task 4 içerir.
4. **Maskelemede iç içe yapılar:**
   - JSON metninin içindeki anahtar üst alanın yoluyla eşleşmeli (`context.headers` → `context.headers.Authorization`).
   - Dizilerin içindeki nesneler de maskelenmeli.
   - Değerinde ```` ``` ```` geçen bir JSON alanı daha uzun bir kod bloğu çiti almalı.

   Testleri Task 5 içerir.
5. **Aksiyonun bağlı olduğu tek ortamı silmek:** Aksiyon kapanmalı, "tüm ortamlara" yayılmamalı. Bilinmeyen ortam kimliği içeren bir ayar dosyası içe aktarılırken de aynı onarım uygulanmalı. Testleri Task 1 (`parseConfig`, `withoutEnvironment`) ve Task 9 (`parseImport`) içerir.

## Dosya yapısı

```
src/core/
  fields.ts            (değişir) isMissing([]) → true; flattenSource(source, expandJson)
  template.ts          (değişir) lookup Object.hasOwn; isHttpUrl buraya taşınır
  link-actions.ts      (değişir) resolveLinkAction + HiddenReason
  config.ts            (değişir) yeni doğrulama kuralları, ortam onarımı, basePathOf
  types.ts             (değişir) TimeRange
  discover-actions.ts  (yeni) kqlQuote, logTimeMs, resolveDiscoverQuery, buildDiscoverButtons
  datemath.ts          (yeni) resolveDatemath
  mask.ts              (yeni) maskMatcher, maskValue
  markdown.ts          (yeni) buildMarkdown
  json-tree.ts         (yeni) jsonTextFields, jsonRows, visibleRows, matchPaths, revealPath, copyableValue
src/kibana/
  prefix.ts            (değişir) kibanaPrefix(pathname, basePath), isDiscoverPath(pathname, prefix)
  discover-state.ts    (değişir) readRisonParam, readGlobalTime, tip kontrolleri
  client.ts            (değişir) zaman aşımı, null gövde, getVersion önbelleği
  url.ts               (yeni) discoverUrl, singleDocPath, fixedTimeUrl
src/adapters/detect.ts (değişir) findDetailViews(doc, location, prefix)
src/content/
  bar-data.ts          (yeni) timeFieldTargets, loadTimeFields
  clipboard.ts         (yeni) copyText
  CopyMenu.tsx         (yeni) "⋯" menüsü
  JsonView.tsx         (yeni) JSON görünümü
  ActionBar.tsx        (değişir) Discover butonları, menü, JSON
  styles.ts            (değişir)
src/options/
  model.ts             (değişir) newAction, withAction, withoutAction, withCopySettings, parseImport, unusedOrigins
  preview.ts           (yeni) parseSample, previewAction
src/i18n.ts            (değişir) MessageKey İngilizce JSON'dan türetilir
entrypoints/
  kibana.ts            (değişir) önek, kapı, aksiyon dizisi, yeni prop'lar
  background.ts        (değişir) bozuk ayar uyarısı
  options/App.tsx      (yeniden yazılır) kabuk
  options/feedback.tsx (yeni) useSubmit, Feedback, SectionProps
  options/EnvironmentsSection.tsx, CopySection.tsx, TransferSection.tsx, ActionsSection.tsx, ActionEditor.tsx (yeni)
  options/options.css  (değişir)
public/_locales/{en,tr}/messages.json (değişir)
tsconfig.json          (değişir) resolveJsonModule
tests/unit/...         her modülün testi
docs/verification/2026-10-plan-2.md (yeni, Task 12)
```

---

### Task 1: Çekirdek sağlamlaştırma

**Files:**
- Modify: `src/core/fields.ts`, `src/core/template.ts`, `src/core/link-actions.ts`, `src/core/config.ts`, `src/options/model.ts`, `entrypoints/options/App.tsx`
- Test: `tests/unit/core/fields.test.ts`, `tests/unit/core/template.test.ts`, `tests/unit/core/link-actions.test.ts`, `tests/unit/core/config.test.ts`, `tests/unit/options/model.test.ts`

**Interfaces:**
- Consumes: Plan 1'deki `FieldMap`, `formatValue`, `resolveTemplate`, `evaluateConditions`, `Config`, `parseConfig`
- Produces:
  - `isMissing(value: unknown): boolean`: artık `[]` için de `true`
  - `isHttpUrl(value: string): boolean` (`src/core/template.ts`)
  - `type HiddenReason = "disabled" | "conditions" | "missingValue" | "invalidUrl"` (`src/core/link-actions.ts`)
  - `type LinkResolution = { ok: true; url: string } | { ok: false; reason: HiddenReason }`
  - `resolveLinkAction(action: LinkAction, fields: FieldMap): LinkResolution`
  - `buildLinkButtons(actions: Action[], fields: FieldMap): LinkButton[]` (imza aynı)
  - `basePathOf(kibanaUrl: string): string` (`src/core/config.ts`)
  - `parseConfig`: bilinmeyen ortam kimliklerini onarır
  - `withoutEnvironment(config: Config, environmentId: string): ParseResult` (dönüş tipi değişti)

- [ ] **Step 1: Alan ve şablon testlerini ekle**

`tests/unit/core/fields.test.ts` dosyasının sonuna ekle (`isMissing` zaten import edilmiş):
```ts
describe("isMissing with arrays", () => {
  it("treats an empty array as no value, like an empty string", () => {
    expect(isMissing([])).toBe(true);
    expect(isMissing([""])).toBe(false);
    expect(isMissing([0])).toBe(false);
  });
});
```

`tests/unit/core/template.test.ts` dosyasında import satırını şöyle değiştir:
```ts
import { isHttpUrl, isHttpUrlTemplate, lookup, parsePlaceholders, resolveTemplate } from "../../../src/core/template";
```
ve dosyanın sonuna ekle:
```ts
describe("lookup own keys", () => {
  it("ignores keys inherited from Object.prototype", () => {
    expect(lookup({}, ["constructor", "toString"])).toBeNull();
  });
});

describe("isHttpUrl", () => {
  it("accepts only parsable http(s) URLs", () => {
    expect(isHttpUrl("https://x.test/a")).toBe(true);
    expect(isHttpUrl("http://localhost:9601")).toBe(true);
    expect(isHttpUrl("https://a%20b/x")).toBe(false);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("x.test")).toBe(false);
  });
});
```

- [ ] **Step 2: Link aksiyonu testlerini ekle**

`tests/unit/core/link-actions.test.ts` dosyasında import satırını şöyle değiştir:
```ts
import { buildLinkButtons, resolveLinkAction } from "../../../src/core/link-actions";
```
ve dosyanın sonuna ekle:
```ts
describe("resolveLinkAction", () => {
  it("explains why an action is hidden", () => {
    expect(resolveLinkAction(link({ enabled: false }), { user_id: 1 })).toEqual({ ok: false, reason: "disabled" });
    expect(resolveLinkAction(link({ conditions: [{ field: "level", op: "exists" }] }), { user_id: 1 })).toEqual({
      ok: false,
      reason: "conditions",
    });
    expect(resolveLinkAction(link(), {})).toEqual({ ok: false, reason: "missingValue" });
    expect(resolveLinkAction(link(), { user_id: 1 })).toEqual({ ok: true, url: "https://x.test/users/1" });
  });

  it("rejects a resolved URL that does not parse, e.g. a bad value in the host", () => {
    const action = link({ urlTemplate: "https://{host}/x" });
    expect(resolveLinkAction(action, { host: "a b" })).toEqual({ ok: false, reason: "invalidUrl" });
    expect(resolveLinkAction(action, { host: "admin.test" })).toEqual({ ok: true, url: "https://admin.test/x" });
  });

  it("treats an empty array as a missing value", () => {
    expect(resolveLinkAction(link(), { user_id: [] })).toEqual({ ok: false, reason: "missingValue" });
  });
});
```

- [ ] **Step 3: Ayar testlerini ekle**

`tests/unit/core/config.test.ts` dosyasında import listesine `basePathOf` ekle:
```ts
import {
  type Config,
  actionsForEnvironment,
  activeEnvironment,
  basePathOf,
  emptyConfig,
  originPattern,
  parseConfig,
} from "../../../src/core/config";
```
ve dosyanın sonuna ekle:
```ts
describe("parseConfig rules added in Plan 2", () => {
  it("requires a value for every operator except exists", () => {
    const config = validConfig();
    config.actions[0] = { ...config.actions[0]!, conditions: [{ field: "level", op: "equals" }] };
    expect(errorsOf(config)).toContain("actions.0.conditions.0.value: value is required for this operator");
    config.actions[0] = { ...config.actions[0]!, conditions: [{ field: "level", op: "exists" }] };
    expect(parseConfig(config).ok).toBe(true);
  });

  it("rejects two environments with the same Kibana URL", () => {
    const config = validConfig();
    config.environments.push({ id: "copy", name: "Copy", kibanaUrl: "https://KIBANA.example.com/" });
    expect(errorsOf(config)).toContain("environments.1.kibanaUrl: Duplicate Kibana URL");
  });

  it("drops unknown environment ids and disables an action left with none", () => {
    const config = validConfig();
    config.actions[0] = { ...config.actions[0]!, environmentIds: ["prod", "gone"] };
    config.actions[1] = { ...config.actions[1]!, environmentIds: ["gone"] };
    const result = parseConfig(config);
    expect(result.ok && result.config.actions.map(({ environmentIds, enabled }) => ({ environmentIds, enabled }))).toEqual([
      { environmentIds: ["prod"], enabled: true },
      { environmentIds: [], enabled: false },
    ]);
  });
});

describe("basePathOf", () => {
  it("returns the URL path without trailing slashes", () => {
    expect(basePathOf("https://example.com")).toBe("");
    expect(basePathOf("https://example.com/kibana/")).toBe("/kibana");
    expect(basePathOf("https://example.com/app/kibana")).toBe("/app/kibana");
  });
});
```

- [ ] **Step 4: Ayar modeli testini güncelle**

`tests/unit/options/model.test.ts` dosyasında `describe("withoutEnvironment", …)` bloğunu tamamen şununla değiştir:
```ts
describe("withoutEnvironment", () => {
  it("removes the environment and disables an action that was scoped only to it", () => {
    const config = {
      ...emptyConfig(),
      environments: [newEnvironment("A", "https://a.example.com", "e1"), newEnvironment("B", "https://b.example.com", "e2")],
      actions: [action, { ...action, id: "both", environmentIds: ["e1", "e2"] }],
    } as Config;
    const result = withoutEnvironment(config, "e1");
    if (!result.ok) throw new Error(result.errors.join("; "));
    expect(result.config.environments.map((environment) => environment.id)).toEqual(["e2"]);
    expect(result.config.actions.map(({ id, environmentIds, enabled }) => ({ id, environmentIds, enabled }))).toEqual([
      { id: "admin", environmentIds: [], enabled: false },
      { id: "both", environmentIds: ["e2"], enabled: true },
    ]);
  });
});
```

- [ ] **Step 5: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/core tests/unit/options`
Expected: FAIL. `isHttpUrl` ve `resolveLinkAction` export edilmemiş, `basePathOf` yok. `lookup` miras alınmış anahtar için `undefined` döndürüyor. Yeni doğrulama kuralları ve onarım yok.

- [ ] **Step 6: Alanlar ve şablonu güncelle**

`src/core/fields.ts` içinde `isMissing` fonksiyonunu şununla değiştir:
```ts
/** Spec §7.1: undefined, null, "" and [] mean "no value"; 0 and false are values. */
export function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}
```

`src/core/template.ts` içinde `lookup` fonksiyonunu şununla değiştir:
```ts
/** First present value among `paths`, as text; null when none has a value. */
export function lookup(fields: FieldMap, paths: string[]): string | null {
  for (const path of paths) {
    if (!Object.hasOwn(fields, path)) continue;
    const value = fields[path];
    if (!isMissing(value)) return formatValue(value);
  }
  return null;
}
```
ve dosyanın sonuna ekle:
```ts
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
```

- [ ] **Step 7: Link aksiyonlarını güncelle**

`src/core/link-actions.ts` dosyasının tamamını şununla değiştir:
```ts
// Turns link actions into buttons for one document (spec §7.2).
import type { Action, LinkAction } from "./config";
import { evaluateConditions } from "./conditions";
import type { FieldMap } from "./fields";
import { isHttpUrl, resolveTemplate } from "./template";

export interface LinkButton {
  id: string;
  label: string;
  url: string;
}

/** Why an action shows no button; the options page preview names it. */
export type HiddenReason = "disabled" | "conditions" | "missingValue" | "invalidUrl";

export type LinkResolution = { ok: true; url: string } | { ok: false; reason: HiddenReason };

export function resolveLinkAction(action: LinkAction, fields: FieldMap): LinkResolution {
  if (!action.enabled) return { ok: false, reason: "disabled" };
  if (!evaluateConditions(action.conditions, fields)) return { ok: false, reason: "conditions" };
  const url = resolveTemplate(action.urlTemplate, fields, encodeURIComponent);
  if (url === null) return { ok: false, reason: "missingValue" };
  // Parsing the result also catches values that break the host, e.g. "https://{host}/".
  return isHttpUrl(url) ? { ok: true, url } : { ok: false, reason: "invalidUrl" };
}

export function buildLinkButtons(actions: Action[], fields: FieldMap): LinkButton[] {
  return actions.flatMap((action) => {
    if (action.kind !== "link") return [];
    const result = resolveLinkAction(action, fields);
    return result.ok ? [{ id: action.id, label: action.label, url: result.url }] : [];
  });
}
```

- [ ] **Step 8: Ayar şemasını güncelle**

`src/core/config.ts` içinde:

1. Import satırını şöyle değiştir ve dosyadaki yerel `isHttpUrl` fonksiyonunu sil (artık `template.ts`'de):
```ts
import { isHttpUrl, isHttpUrlTemplate } from "./template";
```

2. `.superRefine((config, ctx) => { … })` bloğunun içinde, mevcut kimlik döngüsünden sonra şunları ekle:
```ts
    const urls = new Set<string>();
    config.environments.forEach((environment, index) => {
      const key = kibanaUrlKey(environment.kibanaUrl);
      if (key === null) return;
      if (urls.has(key)) {
        ctx.addIssue({ code: "custom", message: "Duplicate Kibana URL", path: ["environments", index, "kibanaUrl"], input: environment.kibanaUrl });
      }
      urls.add(key);
    });
    config.actions.forEach((action, actionIndex) => {
      action.conditions.forEach((condition, conditionIndex) => {
        if (condition.op === "exists" || condition.value !== undefined) return;
        ctx.addIssue({
          code: "custom",
          message: "value is required for this operator",
          path: ["actions", actionIndex, "conditions", conditionIndex, "value"],
          input: condition,
        });
      });
    });
```

3. `parseConfig` fonksiyonunu şununla değiştir ve hemen altına iki yardımcı ekle:
```ts
export function parseConfig(input: unknown): ParseResult {
  const result = configSchema.safeParse(input);
  if (result.success) return { ok: true, config: withKnownEnvironments(result.data) };
  return {
    ok: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`,
    ),
  };
}

/**
 * Drops environment ids that no environment has (removed environments, hand-edited imports).
 * An action left with none would widen to every environment, so it is disabled instead.
 */
function withKnownEnvironments(config: Config): Config {
  const known = new Set(config.environments.map((environment) => environment.id));
  return {
    ...config,
    actions: config.actions.map((action) => {
      const environmentIds = action.environmentIds.filter((id) => known.has(id));
      if (environmentIds.length === action.environmentIds.length) return action;
      return { ...action, environmentIds, enabled: action.enabled && environmentIds.length > 0 };
    }),
  };
}

/** Origin plus base path, so "https://X.test/" and "https://x.test" count as the same Kibana. */
function kibanaUrlKey(kibanaUrl: string): string | null {
  try {
    return `${new URL(kibanaUrl).origin}${basePathOf(kibanaUrl)}`;
  } catch {
    return null; // an invalid URL is reported by its own rule; superRefine may still run
  }
}
```

4. `originPattern` fonksiyonunun hemen üstüne ekle:
```ts
/** "https://x/kibana/" → "/kibana"; "https://x" → "". Throws on an invalid URL. */
export function basePathOf(kibanaUrl: string): string {
  return new URL(kibanaUrl).pathname.replace(/\/+$/, "");
}
```

- [ ] **Step 9: Ayar modelini ve çağıranı güncelle**

`src/options/model.ts` içinde `withoutEnvironment` fonksiyonunu şununla değiştir:
```ts
/** parseConfig drops the removed id from actions and disables actions that were scoped only to it. */
export function withoutEnvironment(config: Config, environmentId: string): ParseResult {
  return parseConfig({
    ...config,
    environments: config.environments.filter((environment) => environment.id !== environmentId),
  });
}
```

`entrypoints/options/App.tsx` içinde "Remove" butonunun `onClick` değerini şununla değiştir (bu dosya Task 10'da yeniden yazılır):
```tsx
                onClick={() => {
                  const result = withoutEnvironment(current, environment.id);
                  if (result.ok) void persist(result.config);
                  else setErrors(result.errors);
                }}
```

- [ ] **Step 10: Testlerin geçtiğini gör**

Run: `npm test && npm run typecheck`
Expected: Bütün testler PASS, typecheck temiz.

- [ ] **Step 11: Commit**

```bash
git add src/core src/options/model.ts entrypoints/options/App.tsx tests/unit/core tests/unit/options
git commit -m "fix(core): validate resolved links and conditions, repair dangling environment ids

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Kibana G/Ç sağlamlaştırma ve çeviri anahtarları

**Files:**
- Modify: `src/core/types.ts`, `src/kibana/prefix.ts`, `src/kibana/discover-state.ts`, `src/adapters/detect.ts`, `src/kibana/client.ts`, `src/i18n.ts`, `tsconfig.json`, `entrypoints/kibana.ts`, `entrypoints/background.ts`
- Test: `tests/unit/kibana/prefix.test.ts`, `tests/unit/kibana/discover-state.test.ts`, `tests/unit/adapters/detect.test.ts`, `tests/unit/kibana/client.test.ts`
- Create test: `tests/unit/i18n.test.ts`

**Interfaces:**
- Consumes: `basePathOf` (Task 1), `isPlainObject` (`src/core/fields.ts`)
- Produces:
  - `interface TimeRange { from: string; to: string }` (`src/core/types.ts`)
  - `kibanaPrefix(pathname: string, basePath?: string): string | null`
  - `isDiscoverPath(pathname: string, prefix: string): boolean`
  - `findDetailViews(doc: Document, location: { pathname: string; hash: string }, prefix: string): DetailView[]`
  - `type DiscoverAppState = Record<string, unknown>`
  - `readRisonParam(hash: string, name: string): Record<string, unknown>`
  - `readAppState(hash: string): DiscoverAppState`
  - `readGlobalTime(hash: string): TimeRange | undefined`
  - `dataViewIdFromState(state: DiscoverAppState): string | undefined`
  - `isEsqlState(state: DiscoverAppState): boolean`
  - `REQUEST_TIMEOUT_MS = 15_000`
  - `createKibanaClient(options: { prefix: string; fetch: FetchFn; timeoutMs?: number }): KibanaClient`
  - `type MessageKey`: `public/_locales/en/messages.json` dosyasının anahtarları

- [ ] **Step 1: Önek ve adaptör testlerini güncelle**

`tests/unit/kibana/prefix.test.ts` dosyasında `describe("isDiscoverPath", …)` bloğunu şununla değiştir ve `kibanaPrefix` bloğunun içine yeni `it` ekle:
```ts
  it("starts looking after the environment's base path", () => {
    expect(kibanaPrefix("/app/kibana/app/discover", "/app/kibana")).toBe("/app/kibana");
    expect(kibanaPrefix("/app/kibana/s/team/app/discover", "/app/kibana")).toBe("/app/kibana/s/team");
    expect(kibanaPrefix("/kibana/app/discover", "/kibana")).toBe("/kibana");
    expect(kibanaPrefix("/other/app/discover", "/kibana")).toBeNull();
  });
```
```ts
describe("isDiscoverPath", () => {
  it("detects Discover under the given prefix", () => {
    expect(isDiscoverPath("/app/discover", "")).toBe(true);
    expect(isDiscoverPath("/kibana/s/team/app/discover", "/kibana/s/team")).toBe(true);
    expect(isDiscoverPath("/app/kibana/app/discover", "/app/kibana")).toBe(true);
    expect(isDiscoverPath("/app/dashboards", "")).toBe(false);
    expect(isDiscoverPath("/app/kibana/app/dashboards", "/app/kibana")).toBe(false);
  });
});
```

`tests/unit/adapters/detect.test.ts` içinde her `findDetailViews` çağrısına üçüncü argüman olarak öneki ekle:
```ts
    expect(findDetailViews(document, { pathname: "/s/team/app/discover", hash: "#/" }, "/s/team")).toHaveLength(1);
    expect(findDetailViews(document, { pathname: "/app/dashboards", hash: "#/" }, "")).toEqual([]);
```
```ts
    expect(findDetailViews(document, { pathname: "/app/discover", hash: "#/?_a=(query:(esql:'FROM logs-*'))" }, "")).toEqual([]);
```
```ts
    const views = findDetailViews(document, { pathname: "/app/discover", hash: "#/?_a=(index:'dv-url')" }, "");
```

- [ ] **Step 2: Discover durumu testlerini ekle**

`tests/unit/kibana/discover-state.test.ts` dosyasında import satırını şöyle değiştir:
```ts
import { dataViewIdFromState, isEsqlState, readAppState, readGlobalTime } from "../../../src/kibana/discover-state";
```
ve dosyanın sonuna ekle:
```ts
describe("readGlobalTime", () => {
  it("reads relative and absolute time ranges", () => {
    expect(readGlobalTime(hash95)).toEqual({ from: "now-2d", to: "now" });
    expect(readGlobalTime(hash717)).toEqual({ from: "2026-08-12T00:00:00.000Z", to: "2026-08-21T00:00:00.000Z" });
  });

  it("returns undefined without a usable time range", () => {
    expect(readGlobalTime("#/?_a=(index:dv)")).toBeUndefined();
    expect(readGlobalTime("#/?_g=(time:(from:1,to:now))")).toBeUndefined();
    expect(readGlobalTime("#/?_g=(((")).toBeUndefined();
  });
});

describe("URL state is type-checked", () => {
  it("ignores a data view id that is not a non-empty string", () => {
    expect(dataViewIdFromState(readAppState("#/?_a=(index:42)"))).toBeUndefined();
    expect(dataViewIdFromState(readAppState("#/?_a=(index:'')"))).toBeUndefined();
    expect(dataViewIdFromState(readAppState("#/?_a=(dataSource:'x',index:dv)"))).toBe("dv");
    expect(dataViewIdFromState(readAppState("#/?_a=(dataSource:!(a),index:dv)"))).toBe("dv");
  });

  it("does not treat odd shapes as ES|QL", () => {
    expect(isEsqlState(readAppState("#/?_a=(dataSource:esql,query:'x')"))).toBe(false);
  });
});
```

- [ ] **Step 3: İstemci testlerini ekle**

`tests/unit/kibana/client.test.ts` dosyasının sonuna ekle:
```ts
describe("timeouts and odd bodies", () => {
  it("abandons a hung request as network and retries it on the next call", async () => {
    let attempt = 0;
    const fetch = (_url: string, init?: RequestInit): Promise<Response> =>
      attempt++ === 0
        ? new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal?.reason)))
        : Promise.resolve(searchOk());
    const client = createKibanaClient({ prefix: "", fetch, timeoutMs: 20 });
    expect(await kindOf(client.fetchDoc("app_log", "abc"))).toBe("network");
    await expect(client.fetchDoc("app_log", "abc")).resolves.toEqual(HIT);
  });

  it("reports incompatible for a JSON null body", async () => {
    const { fetch } = fakeFetch(() => json(null));
    expect(await kindOf(createKibanaClient({ prefix: "", fetch }).fetchDoc("i", "d"))).toBe("incompatible");
    expect(await kindOf(createKibanaClient({ prefix: "", fetch }).getDataView("dv"))).toBe("incompatible");
  });
});

describe("getVersion caching", () => {
  it("asks once per page and retries after a failure", async () => {
    let attempt = 0;
    const { fetch, calls } = fakeFetch(() => (attempt++ === 0 ? json({}, 503) : json({ version: { number: "8.19.23" } })));
    const client = createKibanaClient({ prefix: "", fetch });
    await expect(client.getVersion()).resolves.toBeUndefined();
    await expect(client.getVersion()).resolves.toBe("8.19.23");
    await expect(client.getVersion()).resolves.toBe("8.19.23");
    expect(calls).toHaveLength(2);
  });
});
```

- [ ] **Step 4: Çeviri anahtarı testini yaz**

`tests/unit/i18n.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import en from "../../public/_locales/en/messages.json";
import tr from "../../public/_locales/tr/messages.json";

type Messages = Record<string, { message: string; placeholders?: Record<string, unknown> }>;

describe("locales", () => {
  it("tr has exactly the en keys", () => {
    expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
  });

  it("every tr message has the en placeholders", () => {
    for (const [key, entry] of Object.entries(en as Messages)) {
      expect(Object.keys((tr as Messages)[key]?.placeholders ?? {}), key).toEqual(Object.keys(entry.placeholders ?? {}));
    }
  });
});
```

- [ ] **Step 5: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/kibana tests/unit/adapters tests/unit/i18n.test.ts`
Expected: FAIL. `readGlobalTime` yok. `kibanaPrefix` taban yolu almıyor. `findDetailViews` öneki kullanmıyor. `index:42` sayı olarak dönüyor. İstemcide zaman aşımı yok ve `null` gövde `TypeError` veriyor (`other`). `getVersion` başarılı sonucu önbelleğe almıyor. Çeviri testi şu an geçer; anahtarlar sonraki task'larda eklendikçe korur.

- [ ] **Step 6: `TimeRange` tipini ekle**

`src/core/types.ts` dosyasının sonuna ekle:
```ts
/** Discover's `_g.time`: relative ("now-15m") or absolute ISO dates. */
export interface TimeRange {
  from: string;
  to: string;
}
```

- [ ] **Step 7: Öneki güncelle**

`src/kibana/prefix.ts` dosyasının tamamını şununla değiştir:
```ts
// Kibana path prefix (base path + space) and Discover detection (spec §6.1).

/**
 * Everything before the first "/app/" after the environment's base path:
 * "", "/kibana", "/s/team", "/kibana/s/team". Null outside Kibana apps.
 */
export function kibanaPrefix(pathname: string, basePath = ""): string | null {
  if (!pathname.startsWith(basePath)) return null;
  const index = pathname.indexOf("/app/", basePath.length);
  return index === -1 ? null : pathname.slice(0, index);
}

export function isDiscoverPath(pathname: string, prefix: string): boolean {
  return pathname.startsWith(`${prefix}/app/discover`);
}
```

`src/adapters/detect.ts` içinde fonksiyonun ilk iki satırını şöyle değiştir:
```ts
export function findDetailViews(
  doc: Document,
  location: { pathname: string; hash: string },
  prefix: string,
): DetailView[] {
  if (!isDiscoverPath(location.pathname, prefix)) return [];
```

- [ ] **Step 8: Discover durumunu güncelle**

`src/kibana/discover-state.ts` dosyasının tamamını şununla değiştir:
```ts
// Reads Discover's URL state (`_a`, `_g`; rison) from the hash (spec §5.1, §7.3, §7.4).
import rison from "rison-node";
import { isPlainObject } from "../core/fields";
import type { TimeRange } from "../core/types";

/** Decoded `_a`. It comes from the URL, so every value is type-checked before use. */
export type DiscoverAppState = Record<string, unknown>;

/** The rison object in hash parameter `name` ("_a", "_g"); {} when missing or not an object. */
export function readRisonParam(hash: string, name: string): Record<string, unknown> {
  const queryStart = hash.indexOf("?");
  if (queryStart === -1) return {};
  const raw = new URLSearchParams(hash.slice(queryStart + 1)).get(name);
  if (!raw) return {};
  try {
    const decoded: unknown = rison.decode(raw);
    return isPlainObject(decoded) ? decoded : {};
  } catch {
    return {};
  }
}

export function readAppState(hash: string): DiscoverAppState {
  return readRisonParam(hash, "_a");
}

/** `_g.time` when both ends are strings. */
export function readGlobalTime(hash: string): TimeRange | undefined {
  const time = readRisonParam(hash, "_g").time;
  return isPlainObject(time) && typeof time.from === "string" && typeof time.to === "string"
    ? { from: time.from, to: time.to }
    : undefined;
}

/** 8.x/9.x use dataSource.dataViewId; 7.17 uses index. Only a non-empty string is accepted. */
export function dataViewIdFromState(state: DiscoverAppState): string | undefined {
  const fromSource = isPlainObject(state.dataSource) ? state.dataSource.dataViewId : undefined;
  for (const id of [fromSource, state.index]) {
    if (typeof id === "string" && id !== "") return id;
  }
  return undefined;
}

/** ES|QL mode has no data view, so the extension stays inactive. */
export function isEsqlState(state: DiscoverAppState): boolean {
  return (
    (isPlainObject(state.dataSource) && state.dataSource.type === "esql") ||
    (isPlainObject(state.query) && typeof state.query.esql === "string")
  );
}
```

- [ ] **Step 9: İstemciyi güncelle**

`src/kibana/client.ts` içinde:

1. `DOC_FETCH_HEADERS` sabitinin altına ekle:
```ts
/** A request that has not answered by then is abandoned and reported as "network". */
export const REQUEST_TIMEOUT_MS = 15_000;
```

2. `readJson` fonksiyonunu şununla değiştir:
```ts
/** A 2xx body that is not a JSON object (an SSO page, `null`) is an unexpected response, not a TypeError. */
async function readJson<T extends object>(response: Response): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new KibanaError("incompatible", "Unexpected response");
  }
  if (typeof body !== "object" || body === null) throw new KibanaError("incompatible", "Unexpected response");
  return body as T;
}
```

3. `createKibanaClient` fonksiyonunun başını ve `request` fonksiyonunu şöyle değiştir:
```ts
export function createKibanaClient(options: { prefix: string; fetch: FetchFn; timeoutMs?: number }): KibanaClient {
  const { prefix, fetch, timeoutMs = REQUEST_TIMEOUT_MS } = options;
  const docs = new Map<string, Promise<RawHit>>();
  const dataViews = new Map<string, Promise<DataViewInfo>>();
  let version: Promise<string | undefined> | undefined;

  async function request(path: string, init?: RequestInit): Promise<Response> {
    try {
      return await fetch(prefix + path, { credentials: "same-origin", signal: AbortSignal.timeout(timeoutMs), ...init });
    } catch {
      throw new KibanaError("network", "Kibana is unreachable");
    }
  }
```

4. `loadDataView` fonksiyonunun altına ekle:
```ts
  async function loadVersion(): Promise<string | undefined> {
    try {
      const response = await request("/api/status");
      if (!response.ok) return undefined;
      return (await readJson<{ version?: { number?: string } }>(response)).version?.number;
    } catch {
      return undefined;
    }
  }
```

5. Dönen nesnedeki `getVersion` yöntemini şununla değiştir:
```ts
    async getVersion() {
      version ??= loadVersion();
      const number = await version;
      if (number === undefined) version = undefined; // a failed lookup is retried next time
      return number;
    },
```

- [ ] **Step 10: `MessageKey` tipini İngilizce dosyadan türet**

`tsconfig.json` içinde `compilerOptions` listesine ekle:
```json
    "resolveJsonModule": true,
```

`src/i18n.ts` içinde elle yazılmış `MessageKey` birleşim tipini tamamen sil ve yerine şunu yaz:
```ts
/** Every key of the English messages; tests/unit/i18n.test.ts keeps Turkish in step. */
export type MessageKey = keyof typeof import("../public/_locales/en/messages.json");
```

- [ ] **Step 11: Giriş noktalarını güncelle**

`entrypoints/kibana.ts` içinde:

1. Config import satırına `basePathOf` ekle:
```ts
import { type Config, actionsForEnvironment, activeEnvironment, basePathOf } from "../src/core/config";
```

2. `start()` fonksiyonunun ilk dört satırını şununla değiştir (önek artık ayardan sonra hesaplanır):
```ts
async function start(): Promise<void> {
  const store = createConfigStore(browser.storage.local);
  let config: Config = (await store.load()).config;
  const startEnvironment = activeEnvironment(config, location.href);
  // The base path may itself contain "/app/" (spec §6.1), so the search starts after it.
  const found = kibanaPrefix(location.pathname, startEnvironment ? basePathOf(startEnvironment.kibanaUrl) : "");
  if (found === null) return;
  // Typed binding: hoisted function declarations below (run, createMount) do not see narrowing.
  const prefix: string = found;
```

3. `run()` içindeki çağrıyı şöyle değiştir:
```ts
      const views = activeEnvironment(config, location.href) ? findDetailViews(document, location, prefix) : [];
```

`entrypoints/background.ts` içinde `run` fonksiyonunun `try` bloğunu şununla değiştir:
```ts
    try {
      const { config, errors } = await store.load();
      if (errors.length > 0) console.warn("[kibanatool] stored settings are invalid; running with empty settings:", errors);
      await syncContentScripts(config, { scripting: browser.scripting, permissions: browser.permissions });
    } catch (error) {
```

- [ ] **Step 12: Testlerin ve derlemenin geçtiğini gör**

Run: `npm test && npm run typecheck && npm run build && npm run check:manifest`
Expected: Hepsi PASS. Typecheck temiz: `MessageKey` artık JSON'dan geliyor ve `t("…")` çağrılarının hepsi mevcut anahtarlara denk.

- [ ] **Step 13: Commit**

```bash
git add src tsconfig.json entrypoints tests/unit
git commit -m "fix(kibana): honor base paths with /app/, type-check URL state, time out requests

Also derive MessageKey from the English locale and check that tr has the same keys.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Discover aksiyonları (KQL, zaman penceresi, URL)

**Files:**
- Create: `src/kibana/url.ts`, `src/core/discover-actions.ts`
- Test: `tests/unit/kibana/url.test.ts`, `tests/unit/core/discover-actions.test.ts`

**Interfaces:**
- Consumes: `TimeRange`, `DocIdentity` (`src/core/types.ts`); `HiddenReason` (Task 1); `resolveTemplate`, `evaluateConditions`, `FieldMap`; `readRisonParam`, `readGlobalTime` (Task 2, yalnızca testte)
- Produces:
  - `discoverUrl(options: { prefix: string; dataViewId: string; query: string; time?: TimeRange }): string`
  - `singleDocPath(prefix: string, identity: DocIdentity): string`
  - `kqlQuote(value: string): string`
  - `logTimeMs(value: unknown): number | undefined`
  - `type QueryResolution = { ok: true; query: string } | { ok: false; reason: Exclude<HiddenReason, "invalidUrl"> }`
  - `resolveDiscoverQuery(action: DiscoverAction, fields: FieldMap): QueryResolution`
  - `interface DiscoverContext { prefix: string; dataViewId: string; currentTime?: TimeRange; timeFields: ReadonlyMap<string, string | undefined> }`
  - `type DiscoverButton = { id: string; label: string; url: string } | { id: string; label: string; disabled: "noTime" }`
  - `buildDiscoverButtons(actions: Action[], fields: FieldMap, context: DiscoverContext): DiscoverButton[]`

- [ ] **Step 1: URL testlerini yaz**

`tests/unit/kibana/url.test.ts`:
```ts
import rison from "rison-node";
import { describe, expect, it } from "vitest";
import { discoverUrl, singleDocPath } from "../../../src/kibana/url";

/** Reads a rison parameter the way Kibana does: URL-decode, then rison-decode. */
function param(url: string, name: string): unknown {
  const hash = url.slice(url.indexOf("#"));
  return rison.decode(new URLSearchParams(hash.slice(hash.indexOf("?") + 1)).get(name)!);
}

describe("discoverUrl", () => {
  it("round-trips KQL with quotes, backslashes, &, #, ! and Turkish letters (verified on 7.17)", () => {
    const query = 'message:"a \\"q\\" O\'Brien & #x Çağ!" and path:"C:\\\\tmp"';
    const time = { from: "2026-08-12T07:00:00.000Z", to: "2026-08-12T09:00:00.000Z" };
    const url = discoverUrl({ prefix: "/s/team", dataViewId: "dv-1", query, time });
    expect(url.startsWith("/s/team/app/discover#/?_g=")).toBe(true);
    expect(param(url, "_a")).toEqual({ index: "dv-1", query: { language: "kuery", query } });
    expect(param(url, "_g")).toEqual({ time });
  });

  it("leaves out _g without a time range", () => {
    expect(discoverUrl({ prefix: "", dataViewId: "dv", query: "" })).toBe(
      `/app/discover#/?_a=${encodeURIComponent(rison.encode({ index: "dv", query: { language: "kuery", query: "" } }))}`,
    );
  });
});

describe("singleDocPath", () => {
  it("encodes each part of the single-document route", () => {
    expect(singleDocPath("/kibana", { dataViewId: "dv 1", index: ".ds-logs-a", id: "a/b?c" })).toBe(
      "/kibana/app/discover#/doc/dv%201/.ds-logs-a?id=a%2Fb%3Fc",
    );
  });
});
```

- [ ] **Step 2: Discover aksiyonu testlerini yaz**

`tests/unit/core/discover-actions.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { Action, DiscoverAction } from "../../../src/core/config";
import {
  type DiscoverContext,
  buildDiscoverButtons,
  kqlQuote,
  logTimeMs,
  resolveDiscoverQuery,
} from "../../../src/core/discover-actions";
import { readGlobalTime, readRisonParam } from "../../../src/kibana/discover-state";

const discover = (overrides: Partial<DiscoverAction> = {}): DiscoverAction => ({
  id: "same-user",
  kind: "discover",
  label: "Same user",
  enabled: true,
  environmentIds: [],
  conditions: [],
  queryTemplate: "user_id:{user_id}",
  ...overrides,
});

const context = (overrides: Partial<DiscoverContext> = {}): DiscoverContext => ({
  prefix: "",
  dataViewId: "app-log",
  currentTime: { from: "now-15m", to: "now" },
  timeFields: new Map<string, string | undefined>([
    ["app-log", "datetime"],
    ["all-logs", undefined],
  ]),
  ...overrides,
});

const fields = { user_id: 12345, datetime: "2026-08-12T10:00:00.000Z", note: 'say "hi" \\o/' };

/** The link's _a and _g.time as Kibana reads them. */
function state(button: unknown) {
  const url = (button as { url: string }).url;
  const hash = url.slice(url.indexOf("#"));
  return { a: readRisonParam(hash, "_a"), time: readGlobalTime(hash) };
}

describe("kqlQuote", () => {
  it("wraps the value in quotes and escapes backslashes and quotes", () => {
    expect(kqlQuote("12345")).toBe('"12345"');
    expect(kqlQuote('say "hi" \\o/')).toBe('"say \\"hi\\" \\\\o/"');
  });
});

describe("logTimeMs", () => {
  it("reads Monolog times with microseconds and an offset", () => {
    expect(logTimeMs("2026-08-12T10:00:00.123456+03:00")).toBe(Date.UTC(2026, 7, 12, 7, 0, 0, 123));
  });

  it("reads a time without a zone as UTC, like Elasticsearch", () => {
    expect(logTimeMs("2026-08-12 10:00:00")).toBe(Date.UTC(2026, 7, 12, 10));
    expect(logTimeMs("2026-08-12T10:00:00.5")).toBe(Date.UTC(2026, 7, 12, 10, 0, 0, 500));
  });

  it("reads epoch milliseconds as a number or text, and the first value of an array", () => {
    expect(logTimeMs(1786528800000)).toBe(1786528800000);
    expect(logTimeMs("1786528800000")).toBe(1786528800000);
    expect(logTimeMs(["2026-08-12T10:00:00Z", "x"])).toBe(Date.UTC(2026, 7, 12, 10));
  });

  it("returns undefined for anything else", () => {
    for (const value of ["tomorrow", "", null, undefined, {}, [], Number.NaN]) expect(logTimeMs(value)).toBeUndefined();
  });
});

describe("resolveDiscoverQuery", () => {
  it("quotes placeholder values for KQL", () => {
    expect(resolveDiscoverQuery(discover({ queryTemplate: "note:{note}" }), fields)).toEqual({
      ok: true,
      query: 'note:"say \\"hi\\" \\\\o/"',
    });
  });

  it("hides like link actions: disabled, failing conditions, missing values", () => {
    expect(resolveDiscoverQuery(discover({ enabled: false }), fields)).toEqual({ ok: false, reason: "disabled" });
    expect(resolveDiscoverQuery(discover({ conditions: [{ field: "level", op: "exists" }] }), fields)).toEqual({
      ok: false,
      reason: "conditions",
    });
    expect(resolveDiscoverQuery(discover({ queryTemplate: "x:{missing}" }), fields)).toEqual({ ok: false, reason: "missingValue" });
  });

  it("allows an empty query", () => {
    expect(resolveDiscoverQuery(discover({ queryTemplate: "  " }), fields)).toEqual({ ok: true, query: "" });
  });
});

describe("buildDiscoverButtons", () => {
  it("centers a ±N minute window on the log's time in the target data view", () => {
    const [button] = buildDiscoverButtons([discover({ windowMinutes: 5 })], fields, context());
    expect(button).toMatchObject({ id: "same-user", label: "Same user" });
    expect(state(button)).toEqual({
      a: { index: "app-log", query: { language: "kuery", query: 'user_id:"12345"' } },
      time: { from: "2026-08-12T09:55:00.000Z", to: "2026-08-12T10:05:00.000Z" },
    });
  });

  it("keeps the current time range without a window, or when the target data view has no time field", () => {
    const [plain] = buildDiscoverButtons([discover()], fields, context());
    expect(state(plain).time).toEqual({ from: "now-15m", to: "now" });
    const [noField] = buildDiscoverButtons([discover({ windowMinutes: 5, dataViewId: "all-logs" })], fields, context());
    expect(state(noField)).toEqual({
      a: { index: "all-logs", query: { language: "kuery", query: 'user_id:"12345"' } },
      time: { from: "now-15m", to: "now" },
    });
  });

  it("disables a window-only action when no time is available", () => {
    const action = discover({ queryTemplate: "", windowMinutes: 5 });
    const disabled = [{ id: "same-user", label: "Same user", disabled: "noTime" }];
    expect(buildDiscoverButtons([action], { user_id: 1 }, context())).toEqual(disabled);
    expect(buildDiscoverButtons([action], fields, context({ timeFields: new Map() }))).toEqual(disabled);
  });

  it("leaves out _g when the current URL has no time range either", () => {
    const [button] = buildDiscoverButtons([discover()], fields, context({ currentTime: undefined }));
    expect((button as { url: string }).url).not.toContain("_g=");
  });

  it("skips link actions and hidden Discover actions", () => {
    const actions: Action[] = [
      { id: "l", kind: "link", label: "L", enabled: true, environmentIds: [], conditions: [], urlTemplate: "https://x.test" },
      discover({ id: "off", enabled: false }),
      discover({ id: "ok" }),
    ];
    expect(buildDiscoverButtons(actions, fields, context()).map((button) => button.id)).toEqual(["ok"]);
  });
});
```

- [ ] **Step 3: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/kibana/url.test.ts tests/unit/core/discover-actions.test.ts`
Expected: FAIL, `src/kibana/url.ts` ve `src/core/discover-actions.ts` yok.

- [ ] **Step 4: URL üreticisini yaz**

`src/kibana/url.ts`:
```ts
// Discover links (spec §7.3, §7.4). Rison values are percent-encoded so quotes, "&" and "#" survive
// (verified on 7.17.29: Discover shows the exact query, data view and time range).
import rison from "rison-node";
import type { DocIdentity, TimeRange } from "../core/types";

const encodeRison = (value: unknown): string => encodeURIComponent(rison.encode(value));

/** Relative to the page origin; the bar opens it in a new tab (spec §7.3). */
export function discoverUrl(options: { prefix: string; dataViewId: string; query: string; time?: TimeRange }): string {
  const { prefix, dataViewId, query, time } = options;
  const global = time ? `_g=${encodeRison({ time })}&` : "";
  return `${prefix}/app/discover#/?${global}_a=${encodeRison({ index: dataViewId, query: { language: "kuery", query } })}`;
}

/** `<prefix>/app/discover#/doc/<dv>/<_index>?id=<_id>`: the single-document route of every version. */
export function singleDocPath(prefix: string, identity: DocIdentity): string {
  const { dataViewId, index, id } = identity;
  return `${prefix}/app/discover#/doc/${encodeURIComponent(dataViewId)}/${encodeURIComponent(index)}?id=${encodeURIComponent(id)}`;
}
```

- [ ] **Step 5: Discover aksiyonlarını yaz**

`src/core/discover-actions.ts`:
```ts
// Discover actions (spec §7.3): a KQL query from the log, optionally ±N minutes around the log's time.
import { discoverUrl } from "../kibana/url";
import type { Action, DiscoverAction } from "./config";
import { evaluateConditions } from "./conditions";
import type { FieldMap } from "./fields";
import type { HiddenReason } from "./link-actions";
import { resolveTemplate } from "./template";
import type { TimeRange } from "./types";

/** `12345` → `"12345"`: KQL quoting with `\` and `"` escaped. */
export function kqlQuote(value: string): string {
  return `"${value.replace(/[\\"]/g, "\\$&")}"`;
}

const ZONELESS = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/** Epoch milliseconds of a time field value. Elasticsearch reads a date without a zone as UTC; Date.parse would not. */
export function logTimeMs(value: unknown): number | undefined {
  if (Array.isArray(value)) return logTimeMs(value[0]);
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (/^\d+$/.test(text)) return Number(text);
  const time = Date.parse(ZONELESS.test(text) ? `${text.replace(" ", "T")}Z` : text);
  return Number.isNaN(time) ? undefined : time;
}

export type QueryResolution = { ok: true; query: string } | { ok: false; reason: Exclude<HiddenReason, "invalidUrl"> };

export function resolveDiscoverQuery(action: DiscoverAction, fields: FieldMap): QueryResolution {
  if (!action.enabled) return { ok: false, reason: "disabled" };
  if (!evaluateConditions(action.conditions, fields)) return { ok: false, reason: "conditions" };
  const query = resolveTemplate(action.queryTemplate.trim(), fields, kqlQuote);
  return query === null ? { ok: false, reason: "missingValue" } : { ok: true, query };
}

export interface DiscoverContext {
  prefix: string;
  /** The open log's data view; the target when an action names none. */
  dataViewId: string;
  /** `_g.time` of the current URL, kept when no window applies. */
  currentTime?: TimeRange;
  /** Time field per data view id; undefined when it has none or could not be read. */
  timeFields: ReadonlyMap<string, string | undefined>;
}

export type DiscoverButton =
  | { id: string; label: string; url: string }
  | { id: string; label: string; disabled: "noTime" };

export function buildDiscoverButtons(actions: Action[], fields: FieldMap, context: DiscoverContext): DiscoverButton[] {
  return actions.flatMap((action): DiscoverButton[] => {
    if (action.kind !== "discover") return [];
    const resolved = resolveDiscoverQuery(action, fields);
    if (!resolved.ok) return [];
    const dataViewId = action.dataViewId ?? context.dataViewId;
    const range =
      action.windowMinutes === undefined
        ? undefined
        : timeWindow(fields, context.timeFields.get(dataViewId), action.windowMinutes);
    // Spec §7.3: without a time, a window-only action would just reopen the current view.
    if (action.windowMinutes !== undefined && !range && resolved.query === "") {
      return [{ id: action.id, label: action.label, disabled: "noTime" }];
    }
    const url = discoverUrl({ prefix: context.prefix, dataViewId, query: resolved.query, time: range ?? context.currentTime });
    return [{ id: action.id, label: action.label, url }];
  });
}

function timeWindow(fields: FieldMap, timeField: string | undefined, minutes: number): TimeRange | undefined {
  const time = timeField === undefined ? undefined : logTimeMs(fields[timeField]);
  if (time === undefined) return undefined;
  const span = minutes * 60_000;
  return { from: new Date(time - span).toISOString(), to: new Date(time + span).toISOString() };
}
```

- [ ] **Step 6: Testlerin geçtiğini gör**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/kibana/url.ts src/core/discover-actions.ts tests/unit/kibana/url.test.ts tests/unit/core/discover-actions.test.ts
git commit -m "feat(core): build Discover actions with quoted KQL and a time window

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Datemath ve sabit zamanlı görünüm linki

**Files:**
- Create: `src/core/datemath.ts`
- Modify: `src/kibana/url.ts`
- Test: `tests/unit/core/datemath.test.ts`, `tests/unit/kibana/url.test.ts`

**Interfaces:**
- Consumes: `readRisonParam` (Task 2), `encodeRison` (`url.ts` içinde, Task 3)
- Produces:
  - `resolveDatemath(expression: string, now: Date, roundUp: boolean): string | null`
  - `fixedTimeUrl(href: string, now: Date): string | null`

Testler yerel saatle kurulur (`new Date(yıl, ay, …)`), bu yüzden makinenin saat diliminden bağımsızdır.

- [ ] **Step 1: Datemath testlerini yaz**

`tests/unit/core/datemath.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { resolveDatemath } from "../../../src/core/datemath";

/** ISO string of a local time, so the tests pass in any time zone. */
const local = (...parts: [number, number, number, number?, number?, number?, number?]) =>
  new Date(parts[0], parts[1], parts[2], parts[3] ?? 0, parts[4] ?? 0, parts[5] ?? 0, parts[6] ?? 0).toISOString();

const NOW = new Date(2026, 9, 8, 14, 37, 21, 500); // Thursday, 8 October 2026

describe("resolveDatemath", () => {
  it("resolves now and now±N<unit>", () => {
    expect(resolveDatemath("now", NOW, true)).toBe(NOW.toISOString());
    expect(resolveDatemath("now-15m", NOW, false)).toBe(local(2026, 9, 8, 14, 22, 21, 500));
    expect(resolveDatemath("now+2h", NOW, false)).toBe(local(2026, 9, 8, 16, 37, 21, 500));
  });

  it("rounds down for from and to the end of the unit for to", () => {
    expect(resolveDatemath("now/d", NOW, false)).toBe(local(2026, 9, 8));
    expect(resolveDatemath("now/d", NOW, true)).toBe(local(2026, 9, 8, 23, 59, 59, 999));
    expect(resolveDatemath("now-7d/d", NOW, false)).toBe(local(2026, 9, 1));
    expect(resolveDatemath("now/w", NOW, false)).toBe(local(2026, 9, 4));
    expect(resolveDatemath("now/w", NOW, true)).toBe(local(2026, 9, 10, 23, 59, 59, 999));
    expect(resolveDatemath("now/M", NOW, true)).toBe(local(2026, 9, 31, 23, 59, 59, 999));
    expect(resolveDatemath("now/y", NOW, false)).toBe(local(2026, 0, 1));
  });

  it("clamps month math to the last day of the month, like Kibana", () => {
    expect(resolveDatemath("now-1M", new Date(2026, 2, 31, 10), false)).toBe(local(2026, 1, 28, 10));
    expect(resolveDatemath("now-1y", new Date(2028, 1, 29, 10), false)).toBe(local(2027, 1, 28, 10));
  });

  it("passes absolute dates through", () => {
    expect(resolveDatemath("2026-08-12T00:00:00.000Z", NOW, false)).toBe("2026-08-12T00:00:00.000Z");
  });

  it("returns null for unsupported expressions", () => {
    for (const expression of ["now-1d+2h", "now-1q", "now-", "now/q", "yesterday", ""]) {
      expect(resolveDatemath(expression, NOW, false)).toBeNull();
    }
  });
});
```

- [ ] **Step 2: Sabit zamanlı link testlerini ekle**

`tests/unit/kibana/url.test.ts` dosyasında import satırını şöyle değiştir:
```ts
import { discoverUrl, fixedTimeUrl, singleDocPath } from "../../../src/kibana/url";
import { readRisonParam } from "../../../src/kibana/discover-state";
```
ve dosyanın sonuna ekle:
```ts
describe("fixedTimeUrl", () => {
  const NOW = new Date(2026, 9, 8, 14, 37, 21, 500);
  const href95 =
    "http://localhost:19601/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-15m,to:now))" +
    "&_a=(columns:!(),dataSource:(dataViewId:app-log,type:dataView),query:(language:kuery,query:''))&_tab=(tabId:'6d09')";

  it("replaces a relative _g.time with absolute dates and keeps everything else", () => {
    const fixed = fixedTimeUrl(href95, NOW)!;
    const hash = fixed.slice(fixed.indexOf("#"));
    expect(readRisonParam(hash, "_g")).toEqual({
      filters: [],
      refreshInterval: { pause: true, value: 60000 },
      time: { from: new Date(2026, 9, 8, 14, 22, 21, 500).toISOString(), to: NOW.toISOString() },
    });
    expect(fixed.startsWith("http://localhost:19601/app/discover#/?_g=")).toBe(true);
    expect(fixed.endsWith("&_a=(columns:!(),dataSource:(dataViewId:app-log,type:dataView),query:(language:kuery,query:''))&_tab=(tabId:'6d09')")).toBe(true);
  });

  it("returns null without a time range or with unsupported date math", () => {
    expect(fixedTimeUrl("http://x/app/discover#/?_a=(index:dv)", NOW)).toBeNull();
    expect(fixedTimeUrl("http://x/app/discover#/?_g=(time:(from:now-1q,to:now))", NOW)).toBeNull();
    expect(fixedTimeUrl("http://x/app/discover", NOW)).toBeNull();
  });
});
```

- [ ] **Step 3: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/core/datemath.test.ts tests/unit/kibana/url.test.ts`
Expected: FAIL, `datemath.ts` ve `fixedTimeUrl` yok.

- [ ] **Step 4: Datemath'i yaz**

`src/core/datemath.ts`:
```ts
// Kibana date math for "copy view with fixed time" (spec §7.4):
// "now", "now±N<unit>" and an optional "/<unit>" rounding; absolute dates pass through.
// ponytail: rounding uses the browser time zone and Sunday-first weeks (Kibana's defaults);
// the dateFormat:tz / dateFormat:dow advanced settings are not read.

type Unit = "s" | "m" | "h" | "d" | "w" | "M" | "y";

const EXPRESSION = /^now(?:([+-])(\d+)([smhdwMy]))?(?:\/([smhdwMy]))?$/;

/** ISO date for `expression`, or null when it is unsupported. `roundUp` rounds to the end of the unit (for `to`). */
export function resolveDatemath(expression: string, now: Date, roundUp: boolean): string | null {
  const text = expression.trim();
  const match = EXPRESSION.exec(text);
  if (!match) return text.startsWith("now") || Number.isNaN(Date.parse(text)) ? null : text;
  const [, sign, amount, unit, roundUnit] = match;
  const date = new Date(now.getTime());
  if (sign && amount && unit) add(date, (sign === "-" ? -1 : 1) * Number(amount), unit as Unit);
  if (roundUnit) roundTo(date, roundUnit as Unit, roundUp);
  return date.toISOString();
}

function add(date: Date, amount: number, unit: Unit): void {
  switch (unit) {
    case "s":
      date.setSeconds(date.getSeconds() + amount);
      break;
    case "m":
      date.setMinutes(date.getMinutes() + amount);
      break;
    case "h":
      date.setHours(date.getHours() + amount);
      break;
    case "d":
      date.setDate(date.getDate() + amount);
      break;
    case "w":
      date.setDate(date.getDate() + 7 * amount);
      break;
    case "M":
      addMonths(date, amount);
      break;
    case "y":
      addMonths(date, 12 * amount);
      break;
  }
}

/** Like Kibana (moment): 31 March minus a month is 28/29 February, not 2/3 March. */
function addMonths(date: Date, amount: number): void {
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
}

function roundTo(date: Date, unit: Unit, roundUp: boolean): void {
  startOf(date, unit);
  if (!roundUp) return;
  add(date, 1, unit);
  date.setMilliseconds(date.getMilliseconds() - 1);
}

function startOf(date: Date, unit: Unit): void {
  switch (unit) {
    case "y":
      date.setMonth(0, 1);
      date.setHours(0, 0, 0, 0);
      break;
    case "M":
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      break;
    case "w":
      date.setDate(date.getDate() - date.getDay());
      date.setHours(0, 0, 0, 0);
      break;
    case "d":
      date.setHours(0, 0, 0, 0);
      break;
    case "h":
      date.setMinutes(0, 0, 0);
      break;
    case "m":
      date.setSeconds(0, 0);
      break;
    case "s":
      date.setMilliseconds(0);
      break;
  }
}
```

- [ ] **Step 5: `fixedTimeUrl`'i ekle**

`src/kibana/url.ts` içinde import'ları şöyle değiştir:
```ts
import rison from "rison-node";
import { resolveDatemath } from "../core/datemath";
import { isPlainObject } from "../core/fields";
import type { DocIdentity, TimeRange } from "../core/types";
import { readRisonParam } from "./discover-state";
```
ve dosyanın sonuna ekle:
```ts
/**
 * The current view with `_g.time` turned into absolute dates (spec §7.4), so a shared link shows
 * the same logs later. Other `_g` keys and every other parameter are kept as they are.
 * Null when the URL has no time range or uses date math that resolveDatemath does not support.
 */
export function fixedTimeUrl(href: string, now: Date): string | null {
  const hashStart = href.indexOf("#");
  const queryStart = href.indexOf("?", hashStart);
  if (hashStart === -1 || queryStart === -1) return null;
  const global = readRisonParam(href.slice(hashStart), "_g");
  const time = global.time;
  if (!isPlainObject(time) || typeof time.from !== "string" || typeof time.to !== "string") return null;
  const from = resolveDatemath(time.from, now, false);
  const to = resolveDatemath(time.to, now, true);
  if (from === null || to === null) return null;
  const encoded = `_g=${encodeRison({ ...global, time: { ...time, from, to } })}`;
  const params = href.slice(queryStart + 1).split("&").map((param) => (param.startsWith("_g=") ? encoded : param));
  return `${href.slice(0, queryStart + 1)}${params.join("&")}`;
}
```

- [ ] **Step 6: Testlerin geçtiğini gör**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/datemath.ts src/kibana/url.ts tests/unit/core/datemath.test.ts tests/unit/kibana/url.test.ts
git commit -m "feat(core): resolve Kibana date math and build fixed-time view links

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Maskeleme ve Markdown

**Files:**
- Create: `src/core/mask.ts`, `src/core/markdown.ts`
- Modify: `src/core/fields.ts`
- Test: `tests/unit/core/mask.test.ts`, `tests/unit/core/markdown.test.ts`, `tests/unit/core/fields.test.ts`

**Interfaces:**
- Consumes: `flattenDoc`, `formatValue`, `isMissing`, `isPlainObject`, `parseJsonText`, `DEFAULT_MASK_PATTERNS`, `RawHit`
- Produces:
  - `flattenSource(source: Record<string, unknown>, expandJson?: boolean): FieldMap` (`_id`/`_index` olmadan)
  - `MASK = "***"`
  - `maskMatcher(patterns: string[]): (path: string) => boolean`
  - `maskValue(path: string, value: unknown, isMasked: (path: string) => boolean): unknown`
  - `interface MarkdownOptions { hit: RawHit; timeField?: string; fields: string[]; maskPatterns: string[]; docUrl: string; linkLabel: string }`
  - `buildMarkdown(options: MarkdownOptions): string`

- [ ] **Step 1: `flattenSource` testini ekle**

`tests/unit/core/fields.test.ts` dosyasında import satırını şöyle değiştir:
```ts
import { flattenDoc, flattenSource, formatValue, isMissing, parseJsonText } from "../../../src/core/fields";
```
ve dosyanın sonuna ekle:
```ts
describe("flattenSource", () => {
  it("can keep JSON text unexpanded and never adds _id/_index", () => {
    const source = { context: { body: JSON.stringify({ amount: 5 }) }, level: 200 };
    expect({ ...flattenSource(source, false) }).toEqual({ "context.body": '{"amount":5}', level: 200 });
    expect({ ...flattenSource(source) }).toEqual({ "context.body": '{"amount":5}', "context.body.amount": 5, level: 200 });
  });
});
```

- [ ] **Step 2: Maskeleme testlerini yaz**

`tests/unit/core/mask.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_MASK_PATTERNS } from "../../../src/core/config";
import { MASK, maskMatcher, maskValue } from "../../../src/core/mask";

describe("maskMatcher", () => {
  it("matches the whole dot path, ignoring case, with * as any run of characters", () => {
    const isMasked = maskMatcher(["*authorization*", "user.pass"]);
    expect(isMasked("context.headers.Authorization")).toBe(true);
    expect(isMasked("user.pass")).toBe(true);
    expect(isMasked("user.password")).toBe(false);
    expect(isMasked("userXpass")).toBe(false);
  });

  it("treats regex characters in patterns literally", () => {
    expect(maskMatcher(["a.b(c)"])("a.b(c)")).toBe(true);
    expect(maskMatcher(["a.b(c)"])("aXb(c)")).toBe(false);
  });
});

describe("maskValue", () => {
  const isMasked = maskMatcher(DEFAULT_MASK_PATTERNS);

  it("masks a matching field", () => {
    expect(maskValue("access_token", "abc", isMasked)).toBe(MASK);
    expect(maskValue("message", "plain", isMasked)).toBe("plain");
  });

  it("masks keys inside JSON text under the field's path and re-serializes it", () => {
    const headers = JSON.stringify({ Authorization: "Bearer x", accept: "json" });
    expect(maskValue("context.headers", headers, isMasked)).toBe('{"Authorization":"***","accept":"json"}');
  });

  it("masks inside arrays and nested objects", () => {
    expect(maskValue("items", [{ token: "t", id: 1 }], isMasked)).toEqual([{ token: MASK, id: 1 }]);
    expect(maskValue("body", JSON.stringify({ user: { Password: "p", name: "n" } }), isMasked)).toBe(
      '{"user":{"Password":"***","name":"n"}}',
    );
  });
});
```

- [ ] **Step 3: Markdown testlerini yaz**

`tests/unit/core/markdown.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { type MarkdownOptions, buildMarkdown } from "../../../src/core/markdown";

const hit = {
  _id: "A1",
  _index: "app_log",
  _source: {
    message: "Handled /v1",
    datetime: "2026-08-12T10:00:00+03:00",
    level: 200,
    empty: "",
    tags: ["a", "b"],
    context: { headers: JSON.stringify({ Authorization: "Bearer x", accept: "json" }), trace: "line1\nline2" },
  },
};

const options = (overrides: Partial<MarkdownOptions> = {}): MarkdownOptions => ({
  hit,
  timeField: "datetime",
  fields: [],
  maskPatterns: ["*authorization*"],
  docUrl: "http://k/app/discover#/doc/dv/app_log?id=A1",
  linkLabel: "Open in Kibana",
  ...overrides,
});

describe("buildMarkdown", () => {
  it("lists every _source leaf alphabetically, JSON and multi-line text as code blocks, masked", () => {
    expect(buildMarkdown(options()).split("\n")).toEqual([
      "**app_log** · 2026-08-12T10:00:00+03:00",
      "- `context.headers`:",
      "  ```json",
      "  {",
      '    "Authorization": "***",',
      '    "accept": "json"',
      "  }",
      "  ```",
      "- `context.trace`:",
      "  ```",
      "  line1",
      "  line2",
      "  ```",
      "- `datetime`: 2026-08-12T10:00:00+03:00",
      "- `level`: 200",
      "- `message`: Handled /v1",
      "- `tags`: a,b",
      "[Open in Kibana](http://k/app/discover#/doc/dv/app_log?id=A1)",
    ]);
  });

  it("uses only the configured fields in their order, including JSON sub-paths and _id", () => {
    const markdown = buildMarkdown(
      options({ timeField: undefined, fields: ["level", "context.headers.accept", "missing", "_id"], docUrl: "u", linkLabel: "L" }),
    );
    expect(markdown.split("\n")).toEqual(["**app_log**", "- `level`: 200", "- `context.headers.accept`: json", "- `_id`: A1", "[L](u)"]);
  });

  it("lengthens the fence when the value contains backticks", () => {
    const markdown = buildMarkdown(
      options({ hit: { _id: "1", _index: "i", _source: { body: JSON.stringify({ note: "use ``` here" }) } }, timeField: undefined, docUrl: "u" }),
    );
    expect(markdown.split("\n")).toEqual([
      "**i**",
      "- `body`:",
      "  ````json",
      "  {",
      '    "note": "use ``` here"',
      "  }",
      "  ````",
      "[Open in Kibana](u)",
    ]);
  });
});
```

- [ ] **Step 4: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/core/fields.test.ts tests/unit/core/mask.test.ts tests/unit/core/markdown.test.ts`
Expected: FAIL. `flattenSource`, `mask.ts` ve `markdown.ts` yok.

- [ ] **Step 5: `flattenSource`'u ekle**

`src/core/fields.ts` içinde `flattenDoc` fonksiyonunu şununla değiştir:
```ts
/** Dot-path leaves of `_source`. JSON text is also expanded under its own path unless `expandJson` is false. */
export function flattenSource(source: Record<string, unknown>, expandJson = true): FieldMap {
  const fields: FieldMap = Object.create(null);
  flattenInto(fields, "", source, expandJson ? 0 : MAX_JSON_DEPTH);
  return fields;
}

export function flattenDoc(hit: RawHit): FieldMap {
  const fields = flattenSource(hit._source ?? {});
  fields._id = hit._id;
  fields._index = hit._index;
  return fields;
}
```

- [ ] **Step 6: Maskelemeyi yaz**

`src/core/mask.ts`:
```ts
// Masks sensitive values in copied output (spec §7.5).
import { isPlainObject, parseJsonText } from "./fields";

export const MASK = "***";

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `*` matches any run of characters; the whole dot path must match, ignoring case. */
export function maskMatcher(patterns: string[]): (path: string) => boolean {
  const regexes = patterns.map((pattern) => new RegExp(`^${pattern.split("*").map(escapeRegExp).join(".*")}$`, "i"));
  return (path) => regexes.some((regex) => regex.test(path));
}

/**
 * Replaces values whose path matches with MASK, also inside objects, arrays and JSON text.
 * Keys inside JSON text are matched as `<field path>.<key>`; masked JSON text is re-serialized.
 */
export function maskValue(path: string, value: unknown, isMasked: (path: string) => boolean): unknown {
  if (isMasked(path)) return MASK;
  if (Array.isArray(value)) return value.map((item) => maskValue(path, item, isMasked));
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, maskValue(`${path}.${key}`, item, isMasked)]));
  }
  if (typeof value === "string") {
    const parsed = parseJsonText(value);
    if (parsed !== undefined) return JSON.stringify(maskValue(path, parsed, isMasked));
  }
  return value;
}
```

- [ ] **Step 7: Markdown'ı yaz**

`src/core/markdown.ts`:
```ts
// "Copy as Markdown" (spec §7.4): plain Markdown for GitHub, Jira Cloud and Slack.
import { type FieldMap, flattenDoc, flattenSource, formatValue, isMissing, parseJsonText } from "./fields";
import { maskMatcher, maskValue } from "./mask";
import type { RawHit } from "./types";

export interface MarkdownOptions {
  hit: RawHit;
  /** The data view's time field; its raw value goes into the header. */
  timeField?: string;
  /** copy.markdownFields: empty means every `_source` leaf, alphabetically. */
  fields: string[];
  maskPatterns: string[];
  docUrl: string;
  /** Localized text of the closing link. */
  linkLabel: string;
}

export function buildMarkdown(options: MarkdownOptions): string {
  const { hit, timeField, fields, maskPatterns, docUrl, linkLabel } = options;
  const isMasked = maskMatcher(maskPatterns);
  const all = flattenDoc(hit);
  // Listed fields may name JSON sub-paths or _id; the full list keeps JSON text whole (spec §7.4).
  const source: FieldMap = fields.length > 0 ? all : flattenSource(hit._source ?? {}, false);
  const paths = fields.length > 0 ? fields : Object.keys(source).sort();
  const time = timeField === undefined ? undefined : all[timeField];
  const lines = [`**${hit._index}**${isMissing(time) ? "" : ` · ${formatValue(time)}`}`];
  for (const path of paths) {
    const value = source[path];
    if (isMissing(value)) continue;
    lines.push(...fieldLines(path, maskValue(path, value, isMasked)));
  }
  lines.push(`[${linkLabel}](${docUrl})`);
  return lines.join("\n");
}

const isObjectArray = (value: unknown): boolean =>
  Array.isArray(value) && value.some((item) => typeof item === "object" && item !== null);

function fieldLines(path: string, value: unknown): string[] {
  const json = typeof value === "string" ? parseJsonText(value) : isObjectArray(value) ? value : undefined;
  if (json !== undefined) return [`- \`${path}\`:`, ...codeBlock(JSON.stringify(json, null, 2), "json")];
  const text = formatValue(value);
  if (text.includes("\n")) return [`- \`${path}\`:`, ...codeBlock(text, "")];
  return [`- \`${path}\`: ${text}`];
}

/** Indented two spaces so it belongs to the list item; the fence is longer than any backtick run inside. */
function codeBlock(text: string, language: string): string[] {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longest + 1));
  return [`  ${fence}${language}`, ...text.split("\n").map((line) => `  ${line}`), `  ${fence}`];
}
```

- [ ] **Step 8: Testlerin geçtiğini gör**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/core/fields.ts src/core/mask.ts src/core/markdown.ts tests/unit/core
git commit -m "feat(core): mask sensitive fields and format a log as Markdown

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: JSON görünümünün modeli

**Files:**
- Create: `src/core/json-tree.ts`
- Test: `tests/unit/core/json-tree.test.ts`

**Interfaces:**
- Consumes: `flattenSource` (Task 5), `isPlainObject`, `parseJsonText`
- Produces:
  - `interface JsonField { path: string; value: Record<string, unknown> | unknown[] }`
  - `interface JsonRow { path: string; depth: number; key: string | number | null; value: unknown; container: "object" | "array" | null }`
  - `jsonTextFields(source: Record<string, unknown>): JsonField[]`
  - `jsonRows(value: unknown): JsonRow[]`
  - `isDescendant(path: string, parent: string): boolean`
  - `visibleRows(rows: JsonRow[], collapsed: ReadonlySet<string>): JsonRow[]`
  - `matchPaths(rows: JsonRow[], query: string): string[]`
  - `revealPath(collapsed: ReadonlySet<string>, path: string): Set<string>`
  - `copyableValue(row: JsonRow): string`

Satır yolları alana göredir: kök `""`, sonra `.anahtar`, `[0]` ya da `["tuhaf anahtar"]`. Böylece "yolu kopyala" `alan yolu + satır yolu` olur (`context.body` + `.items[0].sku`).

- [ ] **Step 1: Testleri yaz**

`tests/unit/core/json-tree.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  copyableValue,
  isDescendant,
  jsonRows,
  jsonTextFields,
  matchPaths,
  revealPath,
  visibleRows,
} from "../../../src/core/json-tree";

const doc = { user: { id: 7, name: "Ada" }, items: [{ sku: "A-1" }, { sku: "B-2" }], "odd.key": null };
const rows = jsonRows(doc);

describe("jsonTextFields", () => {
  it("finds _source fields whose text is a JSON object or array", () => {
    const source = { message: "x", context: { body: '{"a":1}', query: "[1,2]", raw: "{not json" }, count: 3 };
    expect(jsonTextFields(source)).toEqual([
      { path: "context.body", value: { a: 1 } },
      { path: "context.query", value: [1, 2] },
    ]);
  });
});

describe("jsonRows", () => {
  it("lists every node in order with relative paths", () => {
    expect(rows.map((row) => row.path)).toEqual([
      "",
      ".user",
      ".user.id",
      ".user.name",
      ".items",
      ".items[0]",
      ".items[0].sku",
      ".items[1]",
      ".items[1].sku",
      '["odd.key"]',
    ]);
    expect(rows[5]).toMatchObject({ depth: 2, key: 0, container: "object" });
    expect(rows[9]).toMatchObject({ depth: 1, key: "odd.key", value: null, container: null });
  });
});

describe("isDescendant", () => {
  it("needs a path separator after the parent", () => {
    expect(isDescendant(".items[0].sku", ".items")).toBe(true);
    expect(isDescendant(".itemsX", ".items")).toBe(false);
    expect(isDescendant(".items", ".items")).toBe(false);
    expect(isDescendant(".user", "")).toBe(true);
  });
});

describe("visibleRows", () => {
  it("hides the descendants of collapsed containers", () => {
    expect(visibleRows(rows, new Set([".items"])).map((row) => row.path)).toEqual([
      "",
      ".user",
      ".user.id",
      ".user.name",
      ".items",
      '["odd.key"]',
    ]);
    expect(visibleRows(rows, new Set([""])).map((row) => row.path)).toEqual([""]);
  });
});

describe("matchPaths", () => {
  it("matches keys and primitive values, ignoring case; array indexes are not keys", () => {
    expect(matchPaths(rows, "SKU")).toEqual([".items[0].sku", ".items[1].sku"]);
    expect(matchPaths(rows, "b-2")).toEqual([".items[1].sku"]);
    expect(matchPaths(rows, "1")).toEqual([".items[0].sku"]);
    expect(matchPaths(rows, "null")).toEqual(['["odd.key"]']);
    expect(matchPaths(rows, "  ")).toEqual([]);
  });
});

describe("revealPath", () => {
  it("expands every collapsed ancestor of the path and nothing else", () => {
    expect([...revealPath(new Set(["", ".items", ".items[1]", ".user"]), ".items[1].sku")]).toEqual([".user"]);
  });
});

describe("copyableValue", () => {
  it("copies primitives as text and containers as indented JSON", () => {
    expect(copyableValue(rows[2]!)).toBe("7");
    expect(copyableValue(rows[9]!)).toBe("null");
    expect(copyableValue(rows[1]!)).toBe('{\n  "id": 7,\n  "name": "Ada"\n}');
  });
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/core/json-tree.test.ts`
Expected: FAIL, `json-tree.ts` yok.

- [ ] **Step 3: Modeli yaz**

`src/core/json-tree.ts`:
```ts
// The JSON view's data (spec §7.6): JSON-text fields and a flat, pre-ordered row list,
// so collapsing, search and revealing a match are plain array operations.
import { flattenSource, isPlainObject, parseJsonText } from "./fields";

export interface JsonField {
  /** Dot path of the `_source` field that holds the JSON text. */
  path: string;
  value: Record<string, unknown> | unknown[];
}

export interface JsonRow {
  /** Relative to the field: "" for the root, then ".key", "[0]" or `["odd key"]` segments. */
  path: string;
  depth: number;
  /** Property name, array index, or null for the root. */
  key: string | number | null;
  value: unknown;
  container: "object" | "array" | null;
}

/** `_source` fields whose text is a JSON object or array, in field order. */
export function jsonTextFields(source: Record<string, unknown>): JsonField[] {
  return Object.entries(flattenSource(source, false)).flatMap(([path, value]) => {
    const parsed = typeof value === "string" ? parseJsonText(value) : undefined;
    return parsed === undefined ? [] : [{ path, value: parsed }];
  });
}

const segment = (key: string): string => (/^[A-Za-z_$][\w$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`);

export function jsonRows(value: unknown): JsonRow[] {
  const rows: JsonRow[] = [];
  const visit = (path: string, key: string | number | null, item: unknown, depth: number): void => {
    const container = Array.isArray(item) ? "array" : isPlainObject(item) ? "object" : null;
    rows.push({ path, depth, key, value: item, container });
    if (Array.isArray(item)) {
      item.forEach((child, index) => visit(`${path}[${index}]`, index, child, depth + 1));
    } else if (isPlainObject(item)) {
      for (const [childKey, child] of Object.entries(item)) visit(`${path}${segment(childKey)}`, childKey, child, depth + 1);
    }
  };
  visit("", null, value, 0);
  return rows;
}

/** True when `path` lies under the container at `parent` (every non-root path starts with "." or "["). */
export function isDescendant(path: string, parent: string): boolean {
  return path !== parent && (path.startsWith(`${parent}.`) || path.startsWith(`${parent}[`));
}

/** Rows not hidden by a collapsed ancestor; relies on the pre-order of jsonRows. */
export function visibleRows(rows: JsonRow[], collapsed: ReadonlySet<string>): JsonRow[] {
  const visible: JsonRow[] = [];
  let hiddenUnder: string | null = null;
  for (const row of rows) {
    if (hiddenUnder !== null && isDescendant(row.path, hiddenUnder)) continue;
    hiddenUnder = row.container && collapsed.has(row.path) ? row.path : null;
    visible.push(row);
  }
  return visible;
}

/** Paths of rows whose property name or primitive value contains `query`, ignoring case. */
export function matchPaths(rows: JsonRow[], query: string): string[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [];
  return rows
    .filter(
      (row) =>
        (typeof row.key === "string" && row.key.toLowerCase().includes(needle)) ||
        (row.container === null && String(row.value).toLowerCase().includes(needle)),
    )
    .map((row) => row.path);
}

/** `collapsed` without the ancestors of `path`, so that row becomes visible. */
export function revealPath(collapsed: ReadonlySet<string>, path: string): Set<string> {
  return new Set([...collapsed].filter((parent) => !isDescendant(path, parent)));
}

/** "Copy value": primitives as text, containers as indented JSON. */
export function copyableValue(row: JsonRow): string {
  return row.container ? JSON.stringify(row.value, null, 2) : String(row.value);
}
```

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/json-tree.ts tests/unit/core/json-tree.test.ts
git commit -m "feat(core): model the JSON view as searchable, collapsible rows

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 7: Aksiyon çubuğu: Discover butonları ve "⋯" kopyalama menüsü

**Files:**
- Create: `src/content/bar-data.ts`, `src/content/clipboard.ts`, `src/content/CopyMenu.tsx`
- Modify: `src/content/ActionBar.tsx`, `src/content/styles.ts`, `entrypoints/kibana.ts`, `public/_locales/en/messages.json`, `public/_locales/tr/messages.json`
- Test: `tests/unit/content/bar-data.test.ts`, `tests/unit/content/clipboard.test.ts`

**Interfaces:**
- Consumes: `buildDiscoverButtons`, `DiscoverButton` (Task 3); `fixedTimeUrl`, `singleDocPath` (Task 3/4); `buildMarkdown` (Task 5); `readGlobalTime` (Task 2); `KibanaClient`
- Produces:
  - `timeFieldTargets(actions: Action[], dataViewId: string): string[]`
  - `loadTimeFields(client: Pick<KibanaClient, "getDataView">, ids: string[]): Promise<Map<string, string | undefined>>`
  - `copyText(text: string, container: Element): Promise<void>`
  - `interface CopyItem { label: string; text: () => string | null }`
  - `CopyMenu(props: { items: CopyItem[]; onCopy: (text: string | null) => void })`
  - `ActionBarProps`: `{ identity, actions, client, prefix: string, hash: string, copy: Config["copy"] }`

Bu task'tan sonra her tanınan logda bir çubuk görünür. Aksiyon olmasa da "⋯" menüsü vardır. Bu, Plan 1'den devreden "render kapısı" bulgusunu kapatır.

- [ ] **Step 1: Çubuk verisi testlerini yaz**

`tests/unit/content/bar-data.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { loadTimeFields, timeFieldTargets } from "../../../src/content/bar-data";
import type { Action } from "../../../src/core/config";
import { KibanaError } from "../../../src/kibana/client";

const discover = (id: string, extra: { windowMinutes?: number; dataViewId?: string }): Action => ({
  id,
  kind: "discover",
  label: id,
  enabled: true,
  environmentIds: [],
  conditions: [],
  queryTemplate: "",
  ...extra,
});

describe("timeFieldTargets", () => {
  it("lists the open data view and every target of a windowed Discover action, once", () => {
    const actions = [
      discover("a", { windowMinutes: 5 }),
      discover("b", { windowMinutes: 5, dataViewId: "other" }),
      discover("c", { dataViewId: "no-window" }),
      discover("d", { windowMinutes: 1, dataViewId: "other" }),
    ];
    expect(timeFieldTargets(actions, "current")).toEqual(["current", "other"]);
  });
});

describe("loadTimeFields", () => {
  it("maps each data view to its time field and treats a failed lookup as none", async () => {
    const client = {
      async getDataView(id: string) {
        if (id === "broken") throw new KibanaError("notFound", "Data view not found", 404);
        return id === "logs" ? { title: "logs-*", timeFieldName: "@timestamp" } : { title: "*_log" };
      },
    };
    expect(await loadTimeFields(client, ["logs", "all", "broken"])).toEqual(
      new Map([
        ["logs", "@timestamp"],
        ["all", undefined],
        ["broken", undefined],
      ]),
    );
  });
});
```

- [ ] **Step 2: Pano testlerini yaz**

`tests/unit/content/clipboard.test.ts`:
```ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "../../../src/content/clipboard";

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("copyText", () => {
  it("uses the async clipboard when it is available", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await copyText("hello", document.body);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to execCommand with a textarea inside the given container", async () => {
    vi.stubGlobal("navigator", {}); // insecure (http) pages have no navigator.clipboard
    const container = document.createElement("div");
    document.body.append(container);
    let copied = "";
    document.execCommand = vi.fn(() => {
      copied = container.querySelector("textarea")?.value ?? "";
      return true;
    });
    await copyText("hello", container);
    expect(copied).toBe("hello");
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("rejects when the fallback copies nothing", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn(async () => Promise.reject(new Error("denied"))) } });
    document.execCommand = vi.fn(() => false);
    await expect(copyText("hello", document.body)).rejects.toThrow("copy failed");
    expect(document.querySelector("textarea")).toBeNull();
  });
});
```

- [ ] **Step 3: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/content`
Expected: FAIL, `bar-data.ts` ve `clipboard.ts` yok.

- [ ] **Step 4: Çubuk verisini ve panoyu yaz**

`src/content/bar-data.ts`:
```ts
// Which data views the bar needs time fields for (spec §7.3, §7.4), and loading them.
import type { Action } from "../core/config";
import type { KibanaClient } from "../kibana/client";

/** The open data view (Markdown header, default target) and every target of a Discover action with a window. */
export function timeFieldTargets(actions: Action[], dataViewId: string): string[] {
  const ids = new Set([dataViewId]);
  for (const action of actions) {
    if (action.kind === "discover" && action.windowMinutes !== undefined) ids.add(action.dataViewId ?? dataViewId);
  }
  return [...ids];
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

`src/content/clipboard.ts`:
```ts
// Clipboard writes for the action bar (spec §7.4).

/**
 * Tries the async clipboard first. Insecure (http) pages do not have it, so a hidden textarea and
 * execCommand("copy") follow. The textarea goes into `container` (inside the bar's shadow root):
 * on 8.x/9.x the flyout's focus trap would pull focus back from an element on document.body.
 */
export async function copyText(text: string, container: Element): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Fall back to execCommand below.
  }
  const doc = container.ownerDocument;
  const area = doc.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
  container.append(area);
  try {
    area.select();
    if (!doc.execCommand("copy")) throw new Error("copy failed");
  } finally {
    area.remove();
  }
}
```

- [ ] **Step 5: Testlerin geçtiğini gör**

Run: `npx vitest run tests/unit/content`
Expected: PASS.

- [ ] **Step 6: Metinleri ekle**

`public/_locales/en/messages.json` dosyasında son girdiden sonra virgül koy ve nesnenin sonuna şunları ekle:
```json
  "discoverNoTime": { "message": "No time to center on: the data view has no time field or this log has no value for it" },
  "menuLabel": { "message": "Copy options" },
  "menuCopyMarkdown": { "message": "Copy as Markdown" },
  "menuCopyDocLink": { "message": "Copy link to this log" },
  "menuCopyFixedView": { "message": "Copy view with fixed time" },
  "markdownOpenInKibana": { "message": "Open in Kibana" },
  "noticeCopied": { "message": "Copied" },
  "noticeCopyFailed": { "message": "Could not copy" },
  "noticeTimeNotConverted": { "message": "Could not convert the time range to fixed dates" }
```

`public/_locales/tr/messages.json` dosyasına aynı yere şunları ekle:
```json
  "discoverNoTime": { "message": "Ortalanacak zaman yok: data view'ın zaman alanı yok ya da bu logda o alanın değeri yok" },
  "menuLabel": { "message": "Kopyalama seçenekleri" },
  "menuCopyMarkdown": { "message": "Markdown olarak kopyala" },
  "menuCopyDocLink": { "message": "Logun linkini kopyala" },
  "menuCopyFixedView": { "message": "Görünümü sabit zamanla kopyala" },
  "markdownOpenInKibana": { "message": "Kibana'da aç" },
  "noticeCopied": { "message": "Kopyalandı" },
  "noticeCopyFailed": { "message": "Kopyalanamadı" },
  "noticeTimeNotConverted": { "message": "Zaman aralığı sabit tarihlere çevrilemedi" }
```

- [ ] **Step 7: Menüyü yaz**

`src/content/CopyMenu.tsx`:
```tsx
// The "⋯" copy menu of the action bar (spec §7.4).
import { useState } from "react";
import { t } from "../i18n";

export interface CopyItem {
  label: string;
  /** The text to copy, or null when it cannot be produced (the bar says why). */
  text: () => string | null;
}

export function CopyMenu({ items, onCopy }: { items: CopyItem[]; onCopy: (text: string | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="kt-menu"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        className="kt-ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("menuLabel")}
        title={t("menuLabel")}
        onClick={() => setOpen(!open)}
      >
        ⋯
      </button>
      {open && (
        <div className="kt-menu-list" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onCopy(item.text());
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Aksiyon çubuğunu yeniden yaz**

`src/content/ActionBar.tsx` dosyasının tamamını şununla değiştir:
```tsx
// The per-document action bar (spec §7.7): link actions, Discover actions, then the copy menu.
import { type SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Action, Config } from "../core/config";
import { type DiscoverButton, buildDiscoverButtons } from "../core/discover-actions";
import { flattenDoc } from "../core/fields";
import { type LinkButton, buildLinkButtons } from "../core/link-actions";
import { buildMarkdown } from "../core/markdown";
import type { DocIdentity, RawHit } from "../core/types";
import { type MessageKey, t } from "../i18n";
import { type KibanaClient, KibanaError } from "../kibana/client";
import { readGlobalTime } from "../kibana/discover-state";
import { fixedTimeUrl, singleDocPath } from "../kibana/url";
import { loadTimeFields, timeFieldTargets } from "./bar-data";
import { copyText } from "./clipboard";
import { type CopyItem, CopyMenu } from "./CopyMenu";

type State =
  | { status: "loading" }
  | { status: "ready"; hit: RawHit; timeFields: ReadonlyMap<string, string | undefined> }
  | { status: "error"; message: string };

export interface ActionBarProps {
  identity: DocIdentity;
  /** Recomputed only when the config changes (entrypoints/kibana.ts), so the fetch effect stays put. */
  actions: Action[];
  client: KibanaClient;
  prefix: string;
  /** location.hash: Discover links keep the current time range when no window applies. */
  hash: string;
  copy: Config["copy"];
}

/** Kibana would see these events on the host element otherwise (e.g. arrow keys move the 8.x/9.x flyout). */
const keepInside = (event: SyntheticEvent): void => event.stopPropagation();

export function ActionBar({ identity, actions, client, prefix, hash, copy }: ActionBarProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { dataViewId, index, id } = identity;

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    Promise.all([client.fetchDoc(index, id), loadTimeFields(client, timeFieldTargets(actions, dataViewId))]).then(
      ([hit, timeFields]) => {
        if (!cancelled) setState({ status: "ready", hit, timeFields });
      },
      async (error: unknown) => {
        const message = await describeError(error, client);
        if (!cancelled) setState({ status: "error", message });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [dataViewId, index, id, actions, client]);

  useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const buttons = useMemo((): { links: LinkButton[]; discover: DiscoverButton[] } => {
    if (state.status !== "ready") return { links: [], discover: [] };
    const fields = flattenDoc(state.hit);
    return {
      links: buildLinkButtons(actions, fields),
      discover: buildDiscoverButtons(actions, fields, {
        prefix,
        dataViewId,
        currentTime: readGlobalTime(hash),
        timeFields: state.timeFields,
      }),
    };
  }, [state, actions, prefix, dataViewId, hash]);

  if (state.status !== "ready") {
    return (
      <div className="kt-root">
        <div className="kt-bar">
          {state.status === "loading" ? (
            <span className="kt-muted">{t("barLoading")}</span>
          ) : (
            <span className="kt-error">{state.message}</span>
          )}
        </div>
      </div>
    );
  }
  const { hit, timeFields } = state;

  // writeText only works inside the click, so nothing is awaited before copyText.
  function copyToClipboard(text: string | null): void {
    if (text === null) {
      setNotice("noticeTimeNotConverted");
      return;
    }
    if (!rootRef.current) return;
    copyText(text, rootRef.current).then(
      () => setNotice("noticeCopied"),
      (error: unknown) => {
        console.debug("[kibanatool] copy failed:", error);
        setNotice("noticeCopyFailed");
      },
    );
  }

  const docUrl = (): string => `${location.origin}${singleDocPath(prefix, identity)}`;
  const copyItems: CopyItem[] = [
    {
      label: t("menuCopyMarkdown"),
      text: () =>
        buildMarkdown({
          hit,
          timeField: timeFields.get(dataViewId),
          fields: copy.markdownFields,
          maskPatterns: copy.maskPatterns,
          docUrl: docUrl(),
          linkLabel: t("markdownOpenInKibana"),
        }),
    },
    { label: t("menuCopyDocLink"), text: docUrl },
    { label: t("menuCopyFixedView"), text: () => fixedTimeUrl(location.href, new Date()) },
  ];

  return (
    <div className="kt-root" ref={rootRef} onClick={keepInside} onKeyDown={keepInside}>
      <div className="kt-bar">
        {buttons.links.map((button) => (
          <a key={button.id} className="kt-btn" href={button.url} target="_blank" rel="noopener noreferrer">
            {button.label}
          </a>
        ))}
        {buttons.discover.map((button) =>
          "url" in button ? (
            <a key={button.id} className="kt-btn kt-discover" href={button.url} target="_blank" rel="noopener noreferrer">
              {button.label}
            </a>
          ) : (
            <span key={button.id} className="kt-btn kt-disabled" aria-disabled="true" tabIndex={0} title={t("discoverNoTime")}>
              {button.label}
            </span>
          ),
        )}
        {notice && (
          <span className="kt-muted" role="status">
            {t(notice)}
          </span>
        )}
        <CopyMenu items={copyItems} onCopy={copyToClipboard} />
      </div>
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

- [ ] **Step 9: Stilleri güncelle**

`src/content/styles.ts` dosyasının tamamını şununla değiştir:
```ts
// Styles for the action bar; they live inside each host's shadow root, isolated from Kibana's CSS.
export const BAR_CSS = `
:host { all: initial; display: block; }
.kt-root {
  margin: 6px 0; color: #343741;
  font: 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}
.kt-bar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  padding: 6px 8px; border: 1px solid #d3dae6; border-radius: 6px; background: #f7f8fc;
}
.kt-btn {
  display: inline-flex; align-items: center; padding: 2px 10px; border: 0; border-radius: 4px;
  background: #0077cc; color: #fff; font: inherit; font-weight: 500; text-decoration: none; cursor: pointer;
}
.kt-btn:hover, .kt-btn:focus-visible { background: #005fa3; outline: none; }
.kt-discover { background: #e6f1fa; color: #005fa3; }
.kt-discover:hover, .kt-discover:focus-visible { background: #cce4f5; }
.kt-disabled, .kt-disabled:hover, .kt-disabled:focus-visible { background: #eef0f4; color: #98a2b3; cursor: not-allowed; }
.kt-ghost { padding: 2px 8px; border: 0; border-radius: 4px; background: none; color: #343741; font: inherit; cursor: pointer; }
.kt-ghost:hover, .kt-ghost:focus-visible, .kt-ghost[aria-expanded="true"] { background: #e9edf3; outline: none; }
.kt-muted { color: #69707d; }
.kt-error { color: #bd271e; }
.kt-menu { position: relative; margin-left: auto; }
.kt-menu-list {
  position: absolute; top: 100%; right: 0; z-index: 1000; display: flex; flex-direction: column; min-width: 220px;
  margin-top: 4px; padding: 4px; border: 1px solid #d3dae6; border-radius: 6px; background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.kt-menu-list button {
  padding: 6px 8px; border: 0; border-radius: 4px; background: none; color: #343741;
  font: inherit; text-align: left; cursor: pointer;
}
.kt-menu-list button:hover, .kt-menu-list button:focus-visible { background: #e9edf3; outline: none; }
`;
```

- [ ] **Step 10: İçerik betiğini güncelle**

`entrypoints/kibana.ts` içinde:

1. Config import satırını şöyle değiştir:
```ts
import { type Action, type Config, actionsForEnvironment, activeEnvironment, basePathOf } from "../src/core/config";
```

2. `const mounts = new Map<Element, Mount>();` satırının altına ekle:
```ts
  // Recomputed only when the config changes: the bars refetch when this array changes identity.
  let actions = currentActions();

  function currentActions(): Action[] {
    const environment = activeEnvironment(config, location.href);
    return environment ? actionsForEnvironment(config, environment.id) : [];
  }
```

3. `createMount` içindeki `render(view)` yöntemini şununla değiştir:
```ts
      render(view: DetailView) {
        const identity = view.identity;
        if (!identity && !loggedMissing) {
          loggedMissing = true;
          console.debug(LOG, "no document identity in this detail view; bar hidden");
        }
        // The copy menu needs no actions, so every identified log gets a bar.
        root.render(
          identity
            ? createElement(ActionBar, {
                key: `${identity.index}/${identity.id}`,
                identity,
                actions,
                client,
                prefix,
                hash: location.hash,
                copy: config.copy,
              })
            : null,
        );
      },
```

4. `storage.onChanged` dinleyicisindeki `.then` gövdesini şununla değiştir:
```ts
      .then((loaded) => {
        config = loaded.config;
        actions = currentActions();
        run();
      })
```

- [ ] **Step 11: Testlerin ve derlemenin geçtiğini gör**

Run: `npm test && npm run typecheck && npm run build && npm run check:manifest`
Expected: Hepsi PASS.

- [ ] **Step 12: Commit**

```bash
git add src/content entrypoints/kibana.ts public/_locales tests/unit/content
git commit -m "feat(content): add Discover buttons and the copy menu to the action bar

Every identified log now gets a bar, so a Discover-only environment no longer shows
a loading text that never resolves.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: JSON görünümü

**Files:**
- Create: `src/content/JsonView.tsx`
- Modify: `src/content/ActionBar.tsx`, `src/content/styles.ts`, `public/_locales/en/messages.json`, `public/_locales/tr/messages.json`

**Interfaces:**
- Consumes: `JsonField`, `JsonRow`, `jsonTextFields`, `jsonRows`, `visibleRows`, `matchPaths`, `revealPath`, `copyableValue` (Task 6); `ActionBar` içindeki `copyToClipboard` (Task 7)
- Produces: `JsonView(props: { fields: JsonField[]; onCopy: (text: string) => void; onClose: () => void })`

Bu task'ın mantığı Task 6'da test edildi. Bileşen derleme ve Task 12'deki doğrulamayla sınanır (bkz. Global Constraints). "Değeri kopyala" maskelemez (bkz. sapmalar).

- [ ] **Step 1: Metinleri ekle**

`public/_locales/en/messages.json` dosyasının sonuna ekle (önceki girdiden sonra virgül):
```json
  "jsonButton": { "message": "JSON" },
  "jsonChooseField": { "message": "Choose a field" },
  "jsonBack": { "message": "All fields" },
  "jsonClose": { "message": "Close" },
  "jsonSearch": { "message": "Search keys and values" },
  "jsonPrevious": { "message": "Previous match" },
  "jsonNext": { "message": "Next match" },
  "jsonMatchCount": {
    "message": "$CURRENT$ of $TOTAL$",
    "placeholders": { "current": { "content": "$1", "example": "2" }, "total": { "content": "$2", "example": "5" } }
  },
  "jsonNoMatches": { "message": "No matches" },
  "jsonToggle": { "message": "Expand or collapse" },
  "jsonCopyValue": { "message": "Copy value" },
  "jsonCopyPath": { "message": "Copy path" }
```

`public/_locales/tr/messages.json` dosyasının sonuna ekle:
```json
  "jsonButton": { "message": "JSON" },
  "jsonChooseField": { "message": "Bir alan seç" },
  "jsonBack": { "message": "Tüm alanlar" },
  "jsonClose": { "message": "Kapat" },
  "jsonSearch": { "message": "Anahtar ve değerlerde ara" },
  "jsonPrevious": { "message": "Önceki eşleşme" },
  "jsonNext": { "message": "Sonraki eşleşme" },
  "jsonMatchCount": {
    "message": "$CURRENT$ / $TOTAL$",
    "placeholders": { "current": { "content": "$1", "example": "2" }, "total": { "content": "$2", "example": "5" } }
  },
  "jsonNoMatches": { "message": "Eşleşme yok" },
  "jsonToggle": { "message": "Aç/kapa" },
  "jsonCopyValue": { "message": "Değeri kopyala" },
  "jsonCopyPath": { "message": "Yolu kopyala" }
```

Run: `npx vitest run tests/unit/i18n.test.ts`
Expected: PASS (anahtarlar ve yer tutucular iki dosyada aynı).

- [ ] **Step 2: JSON görünümünü yaz**

`src/content/JsonView.tsx`:
```tsx
// JSON view (spec §7.6): a tree with collapse, search and copy, for fields that hold JSON text.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type JsonField,
  type JsonRow,
  copyableValue,
  jsonRows,
  matchPaths,
  revealPath,
  visibleRows,
} from "../core/json-tree";
import { t } from "../i18n";

export interface JsonViewProps {
  fields: JsonField[];
  onCopy: (text: string) => void;
  onClose: () => void;
}

export function JsonView({ fields, onCopy, onClose }: JsonViewProps) {
  // A single field opens directly; several start with the list (spec §7.6).
  const [selected, setSelected] = useState<JsonField | null>(fields.length === 1 ? (fields[0] ?? null) : null);
  return (
    <div className="kt-json">
      <div className="kt-json-head">
        {selected && fields.length > 1 && (
          <button type="button" onClick={() => setSelected(null)}>
            {t("jsonBack")}
          </button>
        )}
        <strong>{selected ? selected.path : t("jsonChooseField")}</strong>
        <button type="button" className="kt-json-close" onClick={onClose}>
          {t("jsonClose")}
        </button>
      </div>
      {selected ? (
        <JsonTree key={selected.path} field={selected} onCopy={onCopy} />
      ) : (
        <ul className="kt-fields">
          {fields.map((field) => (
            <li key={field.path}>
              <button type="button" onClick={() => setSelected(field)}>
                {field.path}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function JsonTree({ field, onCopy }: { field: JsonField; onCopy: (text: string) => void }) {
  const rows = useMemo(() => jsonRows(field.value), [field]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(0);
  const matches = useMemo(() => matchPaths(rows, query), [rows, query]);
  const matched = useMemo(() => new Set(matches), [matches]);
  const active = matches[current];
  const listRef = useRef<HTMLDivElement>(null);

  // Moving to a match expands its ancestors once; the user can collapse them again.
  useEffect(() => {
    if (active !== undefined) setCollapsed((previous) => revealPath(previous, active));
  }, [active]);

  useEffect(() => {
    listRef.current?.querySelector("[data-active]")?.scrollIntoView({ block: "nearest" });
  }, [active, collapsed]);

  function search(text: string): void {
    setQuery(text);
    setCurrent(0);
  }

  function step(delta: number): void {
    if (matches.length > 0) setCurrent((current + delta + matches.length) % matches.length);
  }

  function toggle(path: string): void {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }

  const status =
    query.trim() === ""
      ? ""
      : matches.length > 0
        ? t("jsonMatchCount", String(current + 1), String(matches.length))
        : t("jsonNoMatches");

  return (
    <>
      <div className="kt-json-head">
        <input
          type="search"
          value={query}
          placeholder={t("jsonSearch")}
          aria-label={t("jsonSearch")}
          onChange={(event) => search(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") step(event.shiftKey ? -1 : 1);
          }}
        />
        <span className="kt-muted" aria-live="polite">
          {status}
        </span>
        <button type="button" disabled={matches.length === 0} aria-label={t("jsonPrevious")} title={t("jsonPrevious")} onClick={() => step(-1)}>
          ↑
        </button>
        <button type="button" disabled={matches.length === 0} aria-label={t("jsonNext")} title={t("jsonNext")} onClick={() => step(1)}>
          ↓
        </button>
      </div>
      <div className="kt-json-rows" ref={listRef}>
        {visibleRows(rows, collapsed).map((row) => (
          <div
            key={row.path}
            className={matched.has(row.path) ? "kt-row kt-match" : "kt-row"}
            data-active={row.path === active ? "" : undefined}
            style={{ paddingLeft: `${8 + row.depth * 14}px` }}
          >
            {row.container ? (
              <button
                type="button"
                className="kt-toggle"
                aria-expanded={!collapsed.has(row.path)}
                aria-label={t("jsonToggle")}
                onClick={() => toggle(row.path)}
              >
                {collapsed.has(row.path) ? "▸" : "▾"}
              </button>
            ) : (
              <span className="kt-toggle" />
            )}
            {row.key !== null && <span className="kt-key">{typeof row.key === "number" ? `[${row.key}]` : row.key}</span>}
            <span className={`kt-${kindOf(row)}`}>{display(row)}</span>
            <span className="kt-row-actions">
              <button type="button" onClick={() => onCopy(copyableValue(row))}>
                {t("jsonCopyValue")}
              </button>
              <button type="button" onClick={() => onCopy(`${field.path}${row.path}`)}>
                {t("jsonCopyPath")}
              </button>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function kindOf(row: JsonRow): string {
  if (row.container) return "summary";
  return row.value === null ? "null" : typeof row.value;
}

/** Containers show their size; strings are quoted like JSON. */
function display(row: JsonRow): string {
  if (Array.isArray(row.value)) return `[${row.value.length}]`;
  if (row.container === "object") return `{${Object.keys(row.value as object).length}}`;
  return typeof row.value === "string" ? JSON.stringify(row.value) : String(row.value);
}
```

- [ ] **Step 3: Çubuğa JSON butonunu ve panelini ekle**

`src/content/ActionBar.tsx` içinde:

1. Import'lara ekle:
```tsx
import { jsonTextFields } from "../core/json-tree";
import { JsonView } from "./JsonView";
```

2. `const rootRef = useRef<HTMLDivElement>(null);` satırının altına ekle:
```tsx
  const [jsonOpen, setJsonOpen] = useState(false);
```

3. `const buttons = useMemo(…)` bloğunun altına ekle (erken `return`'lerden önce kalmalı):
```tsx
  const jsonFields = useMemo(() => (state.status === "ready" ? jsonTextFields(state.hit._source ?? {}) : []), [state]);
```

4. Son `return` bloğunda `{notice && (…)}` satırından **önce** JSON butonunu ekle (spec §7.7 sırası: linkler, Discover, JSON, "⋯"):
```tsx
        {jsonFields.length > 0 && (
          <button type="button" className="kt-ghost" aria-expanded={jsonOpen} onClick={() => setJsonOpen(!jsonOpen)}>
            {t("jsonButton")}
          </button>
        )}
```

5. Aynı `return` bloğunda `.kt-bar` div'inin kapanışından sonra, `.kt-root` kapanmadan önce paneli ekle:
```tsx
      {jsonOpen && jsonFields.length > 0 && (
        <JsonView fields={jsonFields} onCopy={copyToClipboard} onClose={() => setJsonOpen(false)} />
      )}
```

- [ ] **Step 4: JSON stillerini ekle**

`src/content/styles.ts` içinde, `BAR_CSS` şablonunun kapanış satırından (`` `; ``) hemen önce şunları ekle:
```css
.kt-json { margin-top: 4px; border: 1px solid #d3dae6; border-radius: 6px; background: #fff; }
.kt-json-head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 6px 8px; border-bottom: 1px solid #eef0f4; }
.kt-json-head input { flex: 1 1 160px; padding: 2px 6px; border: 1px solid #c9d1dc; border-radius: 4px; font: inherit; }
.kt-json-head button, .kt-row-actions button, .kt-fields button {
  padding: 1px 8px; border: 1px solid #d3dae6; border-radius: 4px; background: #fff; color: #343741; font: inherit; cursor: pointer;
}
.kt-json-head button:disabled { color: #98a2b3; cursor: default; }
.kt-json-close { margin-left: auto; }
.kt-fields { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 8px; list-style: none; }
.kt-json-rows { max-height: 420px; overflow: auto; padding: 4px 0; font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; }
.kt-row { display: flex; align-items: baseline; gap: 6px; padding-right: 8px; white-space: pre-wrap; word-break: break-all; }
.kt-row:hover { background: #f5f7fa; }
.kt-match { background: #fff3c4; }
.kt-row[data-active] { background: #ffd966; }
.kt-toggle { flex: none; width: 16px; padding: 0; border: 0; background: none; color: #69707d; font: inherit; cursor: pointer; }
.kt-key { color: #7a3e9d; }
.kt-key::after { content: ":"; color: #69707d; }
.kt-string { color: #017d73; }
.kt-number, .kt-boolean { color: #0061a6; }
.kt-null, .kt-summary { color: #69707d; }
.kt-row-actions {
  display: inline-flex; gap: 4px; margin-left: auto; visibility: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}
.kt-row:hover .kt-row-actions, .kt-row:focus-within .kt-row-actions { visibility: visible; }
```

- [ ] **Step 5: Testlerin ve derlemenin geçtiğini gör**

Run: `npm test && npm run typecheck && npm run build && npm run check:manifest`
Expected: Hepsi PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content public/_locales
git commit -m "feat(content): add a searchable JSON view for fields that hold JSON text

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Ayarlar modeli ve canlı önizleme

**Files:**
- Modify: `src/options/model.ts`
- Create: `src/options/preview.ts`
- Test: `tests/unit/options/model.test.ts`, `tests/unit/options/preview.test.ts`

**Interfaces:**
- Consumes: `parseConfig`, `originPattern`, `Config`, `Action`, `ParseResult`; `resolveLinkAction`, `HiddenReason` (Task 1); `resolveDiscoverQuery` (Task 3); `flattenDoc`, `isPlainObject`
- Produces:
  - `newAction(kind: Action["kind"], id?: string): Action`
  - `withAction(config: Config, action: Action): ParseResult`
  - `withoutAction(config: Config, actionId: string): ParseResult`
  - `withCopySettings(config: Config, markdownFields: string, maskPatterns: string): ParseResult`
  - `parseImport(text: string): ParseResult`
  - `unusedOrigins(before: Config, after: Config): string[]`
  - `type SampleResult = { ok: true; fields: FieldMap } | { ok: false; error: string }`
  - `parseSample(text: string): SampleResult`
  - `type Preview = { shown: true; text: string } | { shown: false; reason: HiddenReason }`
  - `previewAction(action: Action, fields: FieldMap): Preview`

`withActionsJson` bu task'ta kalır. Onu kullanan JSON düzenleyicisi Task 11'de kaldırılır.

- [ ] **Step 1: Model testlerini ekle**

`tests/unit/options/model.test.ts` dosyasında import satırını şöyle değiştir:
```ts
import {
  newAction,
  newEnvironment,
  parseImport,
  unusedOrigins,
  withAction,
  withActionsJson,
  withCopySettings,
  withEnvironment,
  withoutAction,
  withoutEnvironment,
} from "../../../src/options/model";
```
ve dosyanın sonuna ekle:
```ts
describe("actions", () => {
  const base = (): Config => ({ ...emptyConfig(), environments: [newEnvironment("A", "https://a.example.com", "e1")] });

  it("creates blank link and Discover actions", () => {
    expect(newAction("link", "x")).toEqual({
      id: "x",
      kind: "link",
      label: "",
      enabled: true,
      environmentIds: [],
      conditions: [],
      urlTemplate: "https://",
    });
    expect(newAction("discover", "y")).toEqual({
      id: "y",
      kind: "discover",
      label: "",
      enabled: true,
      environmentIds: [],
      conditions: [],
      queryTemplate: "",
    });
  });

  it("appends a new action and replaces one with the same id in place", () => {
    const added = withAction(base(), { ...newAction("link", "x"), label: "Admin" });
    if (!added.ok) throw new Error(added.errors.join("; "));
    const second = withAction(added.config, { ...newAction("discover", "y"), label: "Logs" });
    if (!second.ok) throw new Error(second.errors.join("; "));
    const replaced = withAction(second.config, { ...second.config.actions[0]!, label: "Admin 2" });
    expect(replaced.ok && replaced.config.actions.map((action) => action.label)).toEqual(["Admin 2", "Logs"]);
  });

  it("reports schema errors for an invalid action", () => {
    const result = withAction(base(), newAction("link", "x"));
    expect(!result.ok && result.errors.some((error) => error.startsWith("actions.0.label:"))).toBe(true);
  });

  it("removes an action by id", () => {
    const added = withAction(base(), { ...newAction("link", "x"), label: "Admin" });
    if (!added.ok) throw new Error(added.errors.join("; "));
    const removed = withoutAction(added.config, "x");
    expect(removed.ok && removed.config.actions).toEqual([]);
  });
});

describe("withCopySettings", () => {
  it("reads one entry per line and drops blank lines", () => {
    const result = withCopySettings(emptyConfig(), " level \n\nmessage\n", "*token*\n  *secret*  ");
    expect(result.ok && result.config.copy).toEqual({ markdownFields: ["level", "message"], maskPatterns: ["*token*", "*secret*"] });
  });
});

describe("parseImport", () => {
  it("accepts an exported config", () => {
    const config = { ...emptyConfig(), environments: [newEnvironment("A", "https://a.example.com", "e1")] };
    expect(parseImport(JSON.stringify(config, null, 2))).toEqual({ ok: true, config });
  });

  it("repairs actions scoped to environments the file does not have", () => {
    const result = parseImport(JSON.stringify({ ...emptyConfig(), actions: [action] }));
    expect(result.ok && result.config.actions[0]).toMatchObject({ environmentIds: [], enabled: false });
  });

  it("rejects bad JSON and invalid configs with field paths", () => {
    expect(parseImport("{").ok).toBe(false);
    const result = parseImport(JSON.stringify({ ...emptyConfig(), schemaVersion: 2 }));
    expect(!result.ok && result.errors[0]).toMatch(/^schemaVersion: /);
  });
});

describe("unusedOrigins", () => {
  it("lists permission patterns that only the removed environments needed", () => {
    const before = {
      ...emptyConfig(),
      environments: [
        newEnvironment("A", "https://a.example.com", "e1"),
        newEnvironment("A2", "https://a.example.com/kibana", "e2"),
        newEnvironment("B", "http://b.example.com:5601", "e3"),
      ],
    };
    const keepFirst = { ...before, environments: [before.environments[0]!] };
    expect(unusedOrigins(before, keepFirst)).toEqual(["http://b.example.com:5601/*"]);
    expect(unusedOrigins(before, { ...before, environments: [] })).toEqual(["https://a.example.com/*", "http://b.example.com:5601/*"]);
  });
});
```

- [ ] **Step 2: Önizleme testlerini yaz**

`tests/unit/options/preview.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { DiscoverAction, LinkAction } from "../../../src/core/config";
import { parseSample, previewAction } from "../../../src/options/preview";

const link: LinkAction = {
  id: "l",
  kind: "link",
  label: "Admin",
  enabled: true,
  environmentIds: [],
  conditions: [],
  urlTemplate: "https://admin.test/users/{user_id|context.user_id}",
};
const discover: DiscoverAction = {
  id: "d",
  kind: "discover",
  label: "Same user",
  enabled: true,
  environmentIds: [],
  conditions: [],
  queryTemplate: "user_id:{user_id}",
};

describe("parseSample", () => {
  it("accepts a raw hit or a bare _source and flattens it", () => {
    const hit = parseSample(JSON.stringify({ _id: "A", _index: "app_log", _source: { context: { user_id: 7 } } }));
    expect(hit.ok && hit.fields).toMatchObject({ _id: "A", _index: "app_log", "context.user_id": 7 });
    const source = parseSample('{"user_id": 7, "context": {"body": "{\\"amount\\": 5}"}}');
    expect(source.ok && source.fields).toMatchObject({ user_id: 7, "context.body.amount": 5 });
  });

  it("reports text that is not a JSON object", () => {
    expect(parseSample("[1]")).toEqual({ ok: false, error: "Expected a JSON object" });
    expect(parseSample("{").ok).toBe(false);
  });
});

describe("previewAction", () => {
  it("shows the resolved URL or KQL query", () => {
    const sample = parseSample('{"context": {"user_id": 7}, "user_id": "u \\"1\\""}');
    if (!sample.ok) throw new Error(sample.error);
    expect(previewAction(link, sample.fields)).toEqual({ shown: true, text: "https://admin.test/users/u%20%221%22" });
    expect(previewAction(discover, sample.fields)).toEqual({ shown: true, text: 'user_id:"u \\"1\\""' });
  });

  it("explains why an action would be hidden", () => {
    const sample = parseSample('{"level": 200}');
    if (!sample.ok) throw new Error(sample.error);
    expect(previewAction(link, sample.fields)).toEqual({ shown: false, reason: "missingValue" });
    const onlyErrors: DiscoverAction = { ...discover, conditions: [{ field: "level", op: "equals", value: "400" }] };
    expect(previewAction(onlyErrors, sample.fields)).toEqual({ shown: false, reason: "conditions" });
    expect(previewAction({ ...link, enabled: false }, sample.fields)).toEqual({ shown: false, reason: "disabled" });
  });
});
```

- [ ] **Step 3: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/options`
Expected: FAIL, yeni model fonksiyonları ve `preview.ts` yok.

- [ ] **Step 4: Modeli genişlet**

`src/options/model.ts` içinde import satırını şöyle değiştir:
```ts
import { type Action, type Config, type Environment, type ParseResult, originPattern, parseConfig } from "../core/config";
```
ve dosyanın sonuna ekle:
```ts
/** A blank action for the editor; the label must be filled in before it validates. */
export function newAction(kind: Action["kind"], id: string = crypto.randomUUID()): Action {
  const base = { id, label: "", enabled: true, environmentIds: [], conditions: [] };
  return kind === "link" ? { ...base, kind, urlTemplate: "https://" } : { ...base, kind, queryTemplate: "" };
}

/** Replaces the action with the same id in place, or appends it. */
export function withAction(config: Config, action: Action): ParseResult {
  const exists = config.actions.some((item) => item.id === action.id);
  const actions = exists ? config.actions.map((item) => (item.id === action.id ? action : item)) : [...config.actions, action];
  return parseConfig({ ...config, actions });
}

export function withoutAction(config: Config, actionId: string): ParseResult {
  return parseConfig({ ...config, actions: config.actions.filter((action) => action.id !== actionId) });
}

const lines = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** Both lists are edited as text, one entry per line. */
export function withCopySettings(config: Config, markdownFields: string, maskPatterns: string): ParseResult {
  return parseConfig({ ...config, copy: { markdownFields: lines(markdownFields), maskPatterns: lines(maskPatterns) } });
}

/** Spec §8: the file is validated as a whole; the caller previews it and replaces the settings. */
export function parseImport(text: string): ParseResult {
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch (error) {
    return { ok: false, errors: [`(file): ${(error as Error).message}`] };
  }
  return parseConfig(input);
}

/** Host permission patterns that `before` needed and `after` no longer does (removed or replaced environments). */
export function unusedOrigins(before: Config, after: Config): string[] {
  const needed = new Set(after.environments.map((environment) => originPattern(environment.kibanaUrl)));
  const previous = new Set(before.environments.map((environment) => originPattern(environment.kibanaUrl)));
  return [...previous].filter((pattern) => !needed.has(pattern));
}
```

- [ ] **Step 5: Önizlemeyi yaz**

`src/options/preview.ts`:
```ts
// Live preview of one action against a pasted sample log (spec §9).
import type { Action } from "../core/config";
import { resolveDiscoverQuery } from "../core/discover-actions";
import { type FieldMap, flattenDoc, isPlainObject } from "../core/fields";
import { type HiddenReason, resolveLinkAction } from "../core/link-actions";

export type SampleResult = { ok: true; fields: FieldMap } | { ok: false; error: string };

/** A raw hit ({_id, _index, _source}) or just its _source object, flattened like a real log. */
export function parseSample(text: string): SampleResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  if (!isPlainObject(parsed)) return { ok: false, error: "Expected a JSON object" };
  const hit = isPlainObject(parsed._source)
    ? { _id: String(parsed._id ?? ""), _index: String(parsed._index ?? ""), _source: parsed._source }
    : { _id: "", _index: "", _source: parsed };
  return { ok: true, fields: flattenDoc(hit) };
}

export type Preview = { shown: true; text: string } | { shown: false; reason: HiddenReason };

/** The link URL or KQL query the bar would use, or why it would show nothing. */
export function previewAction(action: Action, fields: FieldMap): Preview {
  if (action.kind === "link") {
    const result = resolveLinkAction(action, fields);
    return result.ok ? { shown: true, text: result.url } : { shown: false, reason: result.reason };
  }
  const result = resolveDiscoverQuery(action, fields);
  return result.ok ? { shown: true, text: result.query } : { shown: false, reason: result.reason };
}
```

- [ ] **Step 6: Testlerin geçtiğini gör**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/options tests/unit/options
git commit -m "feat(options): add action, copy, import and preview helpers to the settings model

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 10: Ayarlar sayfası: kabuk, ortamlar, kopyalama, dışa/içe aktarma

**Files:**
- Create: `entrypoints/options/feedback.tsx`, `entrypoints/options/EnvironmentsSection.tsx`, `entrypoints/options/CopySection.tsx`, `entrypoints/options/TransferSection.tsx`, `entrypoints/options/ActionsSection.tsx`
- Modify: `entrypoints/options/App.tsx` (yeniden yazılır), `entrypoints/options/options.css` (yeniden yazılır), `public/_locales/en/messages.json`, `public/_locales/tr/messages.json`

**Interfaces:**
- Consumes: `newEnvironment`, `withEnvironment`, `withoutEnvironment` (Task 1), `withCopySettings`, `parseImport`, `unusedOrigins` (Task 9), `withActionsJson` (Plan 1), `createConfigStore`, `originPattern`, `emptyConfig`
- Produces:
  - `type SaveConfig = (next: Config) => Promise<string[]>` (boş dizi = başarılı)
  - `interface SectionProps { config: Config; onSave: SaveConfig }`
  - `useSubmit(onSave: SaveConfig): { errors: string[]; saved: boolean; submit(result: ParseResult): Promise<boolean>; fail(errors: string[]): void }`
  - `Feedback(props: { errors: string[]; saved: boolean })`
  - Bölüm bileşenleri: `EnvironmentsSection`, `CopySection`, `TransferSection`, `ActionsSection` (hepsi `SectionProps` alır)

Hatalar ve "kaydedildi" bildirimi artık sayfanın tepesinde değil, işlemi yapan bölümün altında görünür. Bu task, Plan 1'den devreden ayarlar sayfası bulgularını kapatır:
- **`.catch` eksikleri:** her izin ve depolama çağrısının hata yolu var.
- **Kayıt başarısızken formun temizlenmesi:** form yalnızca `submit` `true` dönünce temizlenir.
- **Eski bildirim:** her gönderimde `saved` sıfırlanır.
- **Eski yükleme uyarısı:** başarılı kayıt `loadErrors`'ı temizler.
- **`grantStatus` iptali:** effect temizliğinde iptal edilir.
- **Silinen ortamın izni:** `unusedOrigins` ile kaldırılır.
- **Etiketsiz alanlar:** her girdi bir `<label>` içinde.

Aksiyonlar bölümü bu task'ta Plan 1'deki JSON düzenleyicisini taşır. Task 11 onu form düzenleyicisiyle değiştirir.

- [ ] **Step 1: Metinleri güncelle**

`public/_locales/en/messages.json` içinde `optionsLoadError` girdisini şununla değiştir:
```json
  "optionsLoadError": { "message": "The stored settings are invalid, so empty settings are in use. Saving anything replaces the stored settings:" },
```
ve dosyanın sonuna ekle:
```json
  "optionsEnvUrl": { "message": "Kibana address" },
  "optionsPending": { "message": "Waiting for access" },
  "optionsPermissionError": {
    "message": "Chrome could not update the access permission: $ERROR$",
    "placeholders": { "error": { "content": "$1", "example": "Permission denied" } }
  },
  "optionsCopy": { "message": "Copy and masking" },
  "optionsMarkdownFields": { "message": "Fields for \"Copy as Markdown\", one per line (empty: every field, alphabetically)" },
  "optionsMaskPatterns": { "message": "Masked fields, one pattern per line (* matches anything; case does not matter)" },
  "optionsTransfer": { "message": "Export and import" },
  "optionsExport": { "message": "Export settings" },
  "optionsImport": { "message": "Import a settings file" },
  "optionsImportPreview": {
    "message": "This file has $ENVIRONMENTS$ environments and $ACTIONS$ actions. Importing replaces all current settings; grant access to the environments afterwards.",
    "placeholders": { "environments": { "content": "$1", "example": "2" }, "actions": { "content": "$2", "example": "5" } }
  },
  "optionsImportConfirm": { "message": "Replace settings" },
  "optionsImportErrors": { "message": "The file was rejected:" },
  "optionsCancel": { "message": "Cancel" }
```

`public/_locales/tr/messages.json` içinde `optionsLoadError` girdisini şununla değiştir:
```json
  "optionsLoadError": { "message": "Kayıtlı ayarlar geçersiz, bu yüzden boş ayarlar kullanılıyor. Yapılacak ilk kayıt, kayıtlı ayarların yerine geçer:" },
```
ve dosyanın sonuna ekle:
```json
  "optionsEnvUrl": { "message": "Kibana adresi" },
  "optionsPending": { "message": "İzin bekliyor" },
  "optionsPermissionError": {
    "message": "Chrome erişim iznini güncelleyemedi: $ERROR$",
    "placeholders": { "error": { "content": "$1", "example": "Permission denied" } }
  },
  "optionsCopy": { "message": "Kopyalama ve maskeleme" },
  "optionsMarkdownFields": { "message": "\"Markdown olarak kopyala\" için alanlar, her satıra bir tane (boş: bütün alanlar, alfabetik)" },
  "optionsMaskPatterns": { "message": "Maskelenecek alanlar, her satıra bir desen (* her şeyle eşleşir; büyük/küçük harf fark etmez)" },
  "optionsTransfer": { "message": "Dışa ve içe aktarma" },
  "optionsExport": { "message": "Ayarları dışa aktar" },
  "optionsImport": { "message": "Ayar dosyası içe aktar" },
  "optionsImportPreview": {
    "message": "Bu dosyada $ENVIRONMENTS$ ortam ve $ACTIONS$ aksiyon var. İçe aktarma mevcut ayarların hepsinin yerine geçer; ardından ortamlara erişim izni ver.",
    "placeholders": { "environments": { "content": "$1", "example": "2" }, "actions": { "content": "$2", "example": "5" } }
  },
  "optionsImportConfirm": { "message": "Ayarların yerine koy" },
  "optionsImportErrors": { "message": "Dosya reddedildi:" },
  "optionsCancel": { "message": "Vazgeç" }
```

Run: `npx vitest run tests/unit/i18n.test.ts`
Expected: PASS.

- [ ] **Step 2: Ortak parçaları yaz**

`entrypoints/options/feedback.tsx`:
```tsx
// Shared pieces of the options page sections: their props and per-section save feedback.
import { useState } from "react";
import type { Config, ParseResult } from "../../src/core/config";
import { t } from "../../src/i18n";

/** Saves an already validated config; resolves to the errors to show (empty on success). */
export type SaveConfig = (next: Config) => Promise<string[]>;

export interface SectionProps {
  config: Config;
  onSave: SaveConfig;
}

/** Keeps errors and the "saved" notice next to the section that caused them. */
export function useSubmit(onSave: SaveConfig) {
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  async function submit(result: ParseResult): Promise<boolean> {
    setSaved(false);
    const next = result.ok ? await onSave(result.config) : result.errors;
    setErrors(next);
    setSaved(next.length === 0);
    return next.length === 0;
  }

  function fail(next: string[]): void {
    setSaved(false);
    setErrors(next);
  }

  return { errors, saved, submit, fail };
}

export function Feedback({ errors, saved }: { errors: string[]; saved: boolean }) {
  if (errors.length > 0) {
    return (
      <div className="error" role="alert">
        <ul>
          {errors.map((error, index) => (
            <li key={`${index}-${error}`}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }
  return saved ? (
    <div className="notice" role="status">
      {t("optionsSavedReload")}
    </div>
  ) : null;
}
```

- [ ] **Step 3: Ortamlar bölümünü yaz**

`entrypoints/options/EnvironmentsSection.tsx`:
```tsx
// Environments (spec §9): each Kibana address with its host permission.
import { type FormEvent, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { type Config, type Environment, originPattern } from "../../src/core/config";
import { t } from "../../src/i18n";
import { newEnvironment, withEnvironment, withoutEnvironment } from "../../src/options/model";
import { Feedback, type SectionProps, useSubmit } from "./feedback";

async function grantStatus(config: Config): Promise<Record<string, boolean>> {
  const entries = await Promise.all(
    config.environments.map(async (environment) => {
      const granted = await browser.permissions.contains({ origins: [originPattern(environment.kibanaUrl)] });
      return [environment.id, granted] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export function EnvironmentsSection({ config, onSave }: SectionProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [granted, setGranted] = useState<Record<string, boolean>>({});
  const [checks, setChecks] = useState(0);
  const { errors, saved, submit, fail } = useSubmit(onSave);

  useEffect(() => {
    let cancelled = false;
    grantStatus(config).then(
      (status) => {
        if (!cancelled) setGranted(status);
      },
      (error: unknown) => {
        if (!cancelled) fail([t("optionsPermissionError", String(error))]);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [config, checks]);

  // Chrome shows the permission prompt only during the click, so this runs before any await.
  function request(environment: Environment): Promise<void> {
    return browser.permissions.request({ origins: [originPattern(environment.kibanaUrl)] }).then(
      () => undefined,
      (error: unknown) => fail([t("optionsPermissionError", String(error))]),
    );
  }

  function add(event: FormEvent): void {
    event.preventDefault();
    const environment = newEnvironment(name, url);
    const result = withEnvironment(config, environment);
    if (!result.ok) {
      void submit(result);
      return;
    }
    // Saved whether or not access was granted: the environment then waits for access.
    void request(environment)
      .then(() => submit(result))
      .then((ok) => {
        if (ok) {
          setName("");
          setUrl("");
        }
      });
  }

  function grant(environment: Environment): void {
    void request(environment).then(() => setChecks((count) => count + 1));
  }

  return (
    <section aria-labelledby="environments-title">
      <h2 id="environments-title">{t("optionsEnvironments")}</h2>
      <ul className="list">
        {config.environments.map((environment) => (
          <li key={environment.id}>
            <span className="name">{environment.name}</span>
            <code>{environment.kibanaUrl}</code>
            {granted[environment.id] ? (
              <span className="ok">{t("optionsGranted")}</span>
            ) : (
              <>
                <span className="pending">{t("optionsPending")}</span>
                <button type="button" onClick={() => grant(environment)}>
                  {t("optionsGrant")}
                </button>
              </>
            )}
            <button type="button" className="link" onClick={() => void submit(withoutEnvironment(config, environment.id))}>
              {t("optionsRemove")}
            </button>
          </li>
        ))}
      </ul>
      <form className="row" onSubmit={add}>
        <label>
          {t("optionsEnvName")}
          <input required value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          {t("optionsEnvUrl")}
          <input
            required
            type="url"
            placeholder="https://kibana.example.com"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <button type="submit">{t("optionsAdd")}</button>
      </form>
      <Feedback errors={errors} saved={saved} />
    </section>
  );
}
```

- [ ] **Step 4: Kopyalama ve aktarma bölümlerini yaz**

`entrypoints/options/CopySection.tsx`:
```tsx
// Copy and masking settings (spec §7.4, §7.5).
import { useEffect, useState } from "react";
import { t } from "../../src/i18n";
import { withCopySettings } from "../../src/options/model";
import { Feedback, type SectionProps, useSubmit } from "./feedback";

export function CopySection({ config, onSave }: SectionProps) {
  const [fields, setFields] = useState("");
  const [patterns, setPatterns] = useState("");
  const { errors, saved, submit } = useSubmit(onSave);

  // Follow the stored values, e.g. after an import.
  useEffect(() => {
    setFields(config.copy.markdownFields.join("\n"));
    setPatterns(config.copy.maskPatterns.join("\n"));
  }, [config.copy]);

  return (
    <section aria-labelledby="copy-title">
      <h2 id="copy-title">{t("optionsCopy")}</h2>
      <label>
        {t("optionsMarkdownFields")}
        <textarea rows={4} spellCheck={false} value={fields} onChange={(event) => setFields(event.target.value)} />
      </label>
      <label>
        {t("optionsMaskPatterns")}
        <textarea rows={5} spellCheck={false} value={patterns} onChange={(event) => setPatterns(event.target.value)} />
      </label>
      <button type="button" onClick={() => void submit(withCopySettings(config, fields, patterns))}>
        {t("optionsSave")}
      </button>
      <Feedback errors={errors} saved={saved} />
    </section>
  );
}
```

`entrypoints/options/TransferSection.tsx`:
```tsx
// Export and import of the whole settings (spec §8): validate, preview the counts, then replace.
import { type ChangeEvent, useState } from "react";
import type { Config } from "../../src/core/config";
import { t } from "../../src/i18n";
import { parseImport } from "../../src/options/model";
import { Feedback, type SectionProps, useSubmit } from "./feedback";

export function TransferSection({ config, onSave }: SectionProps) {
  const [pending, setPending] = useState<Config | null>(null);
  const { errors, saved, submit, fail } = useSubmit(onSave);

  function exportSettings(): void {
    const link = document.createElement("a");
    link.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(config, null, 2))}`;
    link.download = "kibanatool-settings.json";
    link.click();
  }

  function choose(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = ""; // so choosing the same file again still fires change
    setPending(null);
    if (!file) return;
    file.text().then(
      (text) => {
        const result = parseImport(text);
        if (result.ok) {
          fail([]);
          setPending(result.config);
        } else {
          fail([t("optionsImportErrors"), ...result.errors]);
        }
      },
      (error: unknown) => fail([String(error)]),
    );
  }

  function replace(): void {
    if (!pending) return;
    void submit({ ok: true, config: pending }).then((ok) => {
      if (ok) setPending(null);
    });
  }

  return (
    <section aria-labelledby="transfer-title">
      <h2 id="transfer-title">{t("optionsTransfer")}</h2>
      <div className="row">
        <button type="button" onClick={exportSettings}>
          {t("optionsExport")}
        </button>
        <label>
          {t("optionsImport")}
          <input type="file" accept="application/json,.json" onChange={choose} />
        </label>
      </div>
      {pending && (
        <div className="warning">
          <p>{t("optionsImportPreview", String(pending.environments.length), String(pending.actions.length))}</p>
          <div className="row">
            <button type="button" onClick={replace}>
              {t("optionsImportConfirm")}
            </button>
            <button type="button" className="link" onClick={() => setPending(null)}>
              {t("optionsCancel")}
            </button>
          </div>
        </div>
      )}
      <Feedback errors={errors} saved={saved} />
    </section>
  );
}
```

`entrypoints/options/ActionsSection.tsx` (geçici, Task 11'de değişir):
```tsx
// Actions (spec §9), edited as a JSON array.
import { useEffect, useState } from "react";
import { t } from "../../src/i18n";
import { withActionsJson } from "../../src/options/model";
import { Feedback, type SectionProps, useSubmit } from "./feedback";

export function ActionsSection({ config, onSave }: SectionProps) {
  const [text, setText] = useState("");
  const { errors, saved, submit } = useSubmit(onSave);

  useEffect(() => setText(JSON.stringify(config.actions, null, 2)), [config.actions]);

  return (
    <section aria-labelledby="actions-title">
      <h2 id="actions-title">{t("optionsActions")}</h2>
      <p className="muted">{t("optionsActionsHelp")}</p>
      <textarea rows={18} spellCheck={false} aria-labelledby="actions-title" value={text} onChange={(event) => setText(event.target.value)} />
      <button type="button" onClick={() => void submit(withActionsJson(config, text))}>
        {t("optionsSave")}
      </button>
      <Feedback errors={errors} saved={saved} />
    </section>
  );
}
```

- [ ] **Step 5: Sayfa kabuğunu yeniden yaz**

`entrypoints/options/App.tsx` dosyasının tamamını şununla değiştir:
```tsx
// Options page (spec §9): environments, actions, copy and masking, export and import.
import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { type Config, emptyConfig } from "../../src/core/config";
import { t } from "../../src/i18n";
import { unusedOrigins } from "../../src/options/model";
import { createConfigStore } from "../../src/storage";
import { ActionsSection } from "./ActionsSection";
import { CopySection } from "./CopySection";
import { EnvironmentsSection } from "./EnvironmentsSection";
import { TransferSection } from "./TransferSection";

const store = createConfigStore(browser.storage.local);

export function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  useEffect(() => {
    store.load().then(
      (loaded) => {
        setConfig(loaded.config);
        setLoadErrors(loaded.errors);
      },
      (error: unknown) => {
        setConfig(emptyConfig());
        setLoadErrors([String(error)]);
      },
    );
  }, []);

  if (!config) return <p>{t("optionsLoading")}</p>;
  const current = config;

  /** Saves, then drops host permissions that no environment needs any more. */
  async function save(next: Config): Promise<string[]> {
    try {
      await store.save(next);
    } catch (error) {
      return [String(error)];
    }
    setConfig(next);
    setLoadErrors([]);
    const unused = unusedOrigins(current, next);
    if (unused.length === 0) return [];
    try {
      await browser.permissions.remove({ origins: unused });
      return [];
    } catch (error) {
      return [t("optionsPermissionError", String(error))];
    }
  }

  const props = { config: current, onSave: save };
  return (
    <main>
      <h1>kibanatool</h1>
      <p className="muted">{t("optionsIntro")}</p>
      {loadErrors.length > 0 && (
        <div className="warning" role="alert">
          <strong>{t("optionsLoadError")}</strong>
          <ul>
            {loadErrors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <EnvironmentsSection {...props} />
      <ActionsSection {...props} />
      <CopySection {...props} />
      <TransferSection {...props} />
    </main>
  );
}
```

- [ ] **Step 6: Stilleri yeniden yaz**

`entrypoints/options/options.css` dosyasının tamamını şununla değiştir:
```css
body { margin: 0; background: #f7f8fc; color: #343741; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
main { max-width: 860px; margin: 0 auto; padding: 24px 16px 48px; }
h1 { margin: 0 0 4px; font-size: 22px; }
h2 { margin: 20px 0 8px; font-size: 16px; }
section { background: #fff; border: 1px solid #d3dae6; border-radius: 8px; padding: 4px 16px 16px; margin-top: 16px; }
.muted { color: #69707d; }
.row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px; margin: 8px 0; }
label { display: flex; flex-direction: column; gap: 4px; margin: 8px 0; font-weight: 500; }
.row label { flex: 1 1 200px; margin: 0; }
input, select, textarea { box-sizing: border-box; padding: 6px 8px; border: 1px solid #c9d1dc; border-radius: 4px; font: inherit; font-weight: 400; }
textarea { width: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
button { padding: 6px 12px; border: 0; border-radius: 4px; background: #0077cc; color: #fff; font: inherit; cursor: pointer; }
button.link { background: none; color: #bd271e; }
.list { list-style: none; padding: 0; margin: 0 0 12px; }
.list li { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #eef0f4; }
.name { font-weight: 600; }
.ok { color: #017d73; }
.pending { color: #b4690e; }
.warning, .error, .notice { margin-top: 12px; padding: 8px 12px; border-radius: 6px; }
.warning { background: #fff9e8; border: 1px solid #f5a700; }
.error { background: #fbebeb; border: 1px solid #bd271e; }
.notice { background: #e6f9f7; border: 1px solid #017d73; }
```

- [ ] **Step 7: Testlerin ve derlemenin geçtiğini gör**

Run: `npm test && npm run typecheck && npm run build && npm run check:manifest`
Expected: Hepsi PASS.

- [ ] **Step 8: Ayarlar sayfasını elle dene**

`chrome://extensions` → *Load unpacked* → `.output/chrome-mv3` (ya da mevcut kaydı yenile). Ayarlar sayfasında şunları dene:
1. Ortam ekle. İzin penceresinde reddet: ortam "İzin bekliyor" görünmeli. "Erişim izni ver" ile izni verince "Erişim verildi" olmalı.
2. Aynı adresi tekrar eklemeyi dene: bölümün altında `environments.1.kibanaUrl: Duplicate Kibana URL`, form temizlenmemeli.
3. Kopyalama bölümünde bir desen ekle ve kaydet: "Kaydedildi" bildirimi bölümün altında.
4. Dışa aktar, sonra aynı dosyayı içe aktar: sayılar doğru. "Ayarların yerine koy" kaydeder.
5. Ortamı sil: `chrome://extensions` → eklentinin "Site erişimi" listesinden o origin düşmeli.

- [ ] **Step 9: Commit**

```bash
git add entrypoints/options public/_locales
git commit -m "feat(options): split the settings page into sections with export, import and per-section feedback

Removing an environment now also drops its host permission when no other environment needs it.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Ayarlar sayfası: aksiyon listesi, düzenleyici ve canlı önizleme

**Files:**
- Create: `entrypoints/options/ActionEditor.tsx`
- Modify: `entrypoints/options/ActionsSection.tsx` (yeniden yazılır), `entrypoints/options/options.css`, `src/options/model.ts`, `tests/unit/options/model.test.ts`, `public/_locales/en/messages.json`, `public/_locales/tr/messages.json`

**Interfaces:**
- Consumes: `newAction`, `withAction`, `withoutAction` (Task 9); `parseSample`, `previewAction`, `SampleResult` (Task 9); `HiddenReason` (Task 1); `ConditionOp` (`src/core/conditions.ts`); `SectionProps`, `useSubmit`, `Feedback` (Task 10)
- Produces: `ActionEditor(props: { action: Action; environments: Environment[]; onChange(action: Action): void; onSave(): void; onCancel(): void })`. `withActionsJson` silinir.

Aksiyonların sırası eklenme sırasıdır. Yeniden sıralama yok: gerekirse dışa aktarılan dosyada sıra değiştirilip içe aktarılır.

- [ ] **Step 1: Metinleri güncelle**

`public/_locales/en/messages.json` içinde şu üç girdiyi değiştir:
```json
  "optionsActions": { "message": "Actions" },
  "optionsActionsHelp": { "message": "Buttons shown above an open log. Placeholders: {field} or {field|fallback}; a placeholder without a value hides the button." },
  "optionsSave": { "message": "Save" },
```
ve dosyanın sonuna ekle:
```json
  "optionsAddLink": { "message": "Add link action" },
  "optionsAddDiscover": { "message": "Add Discover action" },
  "optionsEdit": { "message": "Edit" },
  "optionsKindLink": { "message": "Link" },
  "optionsKindDiscover": { "message": "Discover" },
  "optionsDisabled": { "message": "Disabled" },
  "optionsAllEnvironments": { "message": "All environments" },
  "optionsLabel": { "message": "Label" },
  "optionsEnabled": { "message": "Enabled" },
  "optionsActionEnvironments": { "message": "Environments (none selected: all)" },
  "optionsUrlTemplate": { "message": "URL template" },
  "optionsQueryTemplate": { "message": "KQL query template; values are quoted for you, e.g. user_id:{user_id}" },
  "optionsDataViewId": { "message": "Data view ID (empty: the data view of the open log)" },
  "optionsWindowMinutes": { "message": "Minutes before and after the log's time (empty: keep the current time range)" },
  "optionsConditions": { "message": "Conditions (all must hold)" },
  "optionsConditionField": { "message": "Field" },
  "optionsConditionOp": { "message": "Operator" },
  "optionsConditionValue": { "message": "Value" },
  "optionsAddCondition": { "message": "Add condition" },
  "optionsOpExists": { "message": "exists" },
  "optionsOpEquals": { "message": "equals" },
  "optionsOpNotEquals": { "message": "does not equal" },
  "optionsOpContains": { "message": "contains" },
  "optionsOpStartsWith": { "message": "starts with" },
  "optionsPreview": { "message": "Live preview" },
  "optionsPreviewSample": { "message": "Sample log as JSON (a raw hit or its _source)" },
  "optionsPreviewInvalid": {
    "message": "The sample is not a JSON object: $ERROR$",
    "placeholders": { "error": { "content": "$1", "example": "Unexpected end of JSON input" } }
  },
  "optionsPreviewShown": { "message": "Shown:" },
  "optionsPreviewEmptyQuery": { "message": "(empty query)" },
  "optionsPreviewWindow": {
    "message": "±$MINUTES$ minutes around the log's time",
    "placeholders": { "minutes": { "content": "$1", "example": "5" } }
  },
  "optionsHiddenDisabled": { "message": "Hidden: the action is disabled" },
  "optionsHiddenConditions": { "message": "Hidden: a condition does not hold for this log" },
  "optionsHiddenMissingValue": { "message": "Hidden: a placeholder has no value in this log" },
  "optionsHiddenInvalidUrl": { "message": "Hidden: the result is not a valid http(s) URL" }
```

`public/_locales/tr/messages.json` içinde aynı üç girdiyi değiştir:
```json
  "optionsActions": { "message": "Aksiyonlar" },
  "optionsActionsHelp": { "message": "Açık logun üstünde görünen butonlar. Yer tutucular: {alan} ya da {alan|yedek}; değeri olmayan yer tutucu butonu gizler." },
  "optionsSave": { "message": "Kaydet" },
```
ve dosyanın sonuna ekle:
```json
  "optionsAddLink": { "message": "Link aksiyonu ekle" },
  "optionsAddDiscover": { "message": "Discover aksiyonu ekle" },
  "optionsEdit": { "message": "Düzenle" },
  "optionsKindLink": { "message": "Link" },
  "optionsKindDiscover": { "message": "Discover" },
  "optionsDisabled": { "message": "Kapalı" },
  "optionsAllEnvironments": { "message": "Tüm ortamlar" },
  "optionsLabel": { "message": "Etiket" },
  "optionsEnabled": { "message": "Açık" },
  "optionsActionEnvironments": { "message": "Ortamlar (hiçbiri seçili değilse: hepsi)" },
  "optionsUrlTemplate": { "message": "URL şablonu" },
  "optionsQueryTemplate": { "message": "KQL sorgu şablonu; değerler otomatik tırnaklanır, örn. user_id:{user_id}" },
  "optionsDataViewId": { "message": "Data view kimliği (boş: açık logun data view'ı)" },
  "optionsWindowMinutes": { "message": "Log zamanından önce ve sonra kaç dakika (boş: mevcut zaman aralığı korunur)" },
  "optionsConditions": { "message": "Koşullar (hepsi sağlanmalı)" },
  "optionsConditionField": { "message": "Alan" },
  "optionsConditionOp": { "message": "Operatör" },
  "optionsConditionValue": { "message": "Değer" },
  "optionsAddCondition": { "message": "Koşul ekle" },
  "optionsOpExists": { "message": "var" },
  "optionsOpEquals": { "message": "eşittir" },
  "optionsOpNotEquals": { "message": "eşit değildir" },
  "optionsOpContains": { "message": "içerir" },
  "optionsOpStartsWith": { "message": "ile başlar" },
  "optionsPreview": { "message": "Canlı önizleme" },
  "optionsPreviewSample": { "message": "JSON olarak örnek log (ham kayıt ya da _source)" },
  "optionsPreviewInvalid": {
    "message": "Örnek bir JSON nesnesi değil: $ERROR$",
    "placeholders": { "error": { "content": "$1", "example": "Unexpected end of JSON input" } }
  },
  "optionsPreviewShown": { "message": "Görünür:" },
  "optionsPreviewEmptyQuery": { "message": "(boş sorgu)" },
  "optionsPreviewWindow": {
    "message": "log zamanının ±$MINUTES$ dakika çevresi",
    "placeholders": { "minutes": { "content": "$1", "example": "5" } }
  },
  "optionsHiddenDisabled": { "message": "Gizli: aksiyon kapalı" },
  "optionsHiddenConditions": { "message": "Gizli: bu log için bir koşul sağlanmıyor" },
  "optionsHiddenMissingValue": { "message": "Gizli: bir yer tutucunun bu logda değeri yok" },
  "optionsHiddenInvalidUrl": { "message": "Gizli: sonuç geçerli bir http(s) URL'i değil" }
```

Run: `npx vitest run tests/unit/i18n.test.ts`
Expected: PASS.

- [ ] **Step 2: Düzenleyiciyi yaz**

`entrypoints/options/ActionEditor.tsx`:
```tsx
// Form editor for one action, with a live preview against a pasted sample log (spec §9).
import { type FormEvent, useState } from "react";
import type { ConditionOp } from "../../src/core/conditions";
import type { Action, Environment } from "../../src/core/config";
import type { HiddenReason } from "../../src/core/link-actions";
import { type MessageKey, t } from "../../src/i18n";
import { type SampleResult, parseSample, previewAction } from "../../src/options/preview";

const OPERATORS: Record<ConditionOp, MessageKey> = {
  exists: "optionsOpExists",
  equals: "optionsOpEquals",
  notEquals: "optionsOpNotEquals",
  contains: "optionsOpContains",
  startsWith: "optionsOpStartsWith",
};

const HIDDEN: Record<HiddenReason, MessageKey> = {
  disabled: "optionsHiddenDisabled",
  conditions: "optionsHiddenConditions",
  missingValue: "optionsHiddenMissingValue",
  invalidUrl: "optionsHiddenInvalidUrl",
};

type Condition = Action["conditions"][number];

export interface ActionEditorProps {
  action: Action;
  environments: Environment[];
  onChange: (action: Action) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ActionEditor({ action, environments, onChange, onSave, onCancel }: ActionEditorProps) {
  const [sample, setSample] = useState("");
  const update = (patch: Partial<Action>): void => onChange({ ...action, ...patch } as Action);

  function setCondition(index: number, patch: Partial<Condition>): void {
    update({ conditions: action.conditions.map((condition, i) => (i === index ? { ...condition, ...patch } : condition)) });
  }

  function toggleEnvironment(id: string, checked: boolean): void {
    update({ environmentIds: checked ? [...action.environmentIds, id] : action.environmentIds.filter((item) => item !== id) });
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    onSave();
  }

  return (
    <form className="editor" onSubmit={submit}>
      <label>
        {t("optionsLabel")}
        <input required value={action.label} onChange={(event) => update({ label: event.target.value })} />
      </label>
      <label className="inline">
        <input type="checkbox" checked={action.enabled} onChange={(event) => update({ enabled: event.target.checked })} />
        {t("optionsEnabled")}
      </label>
      <fieldset>
        <legend>{t("optionsActionEnvironments")}</legend>
        {environments.map((environment) => (
          <label className="inline" key={environment.id}>
            <input
              type="checkbox"
              checked={action.environmentIds.includes(environment.id)}
              onChange={(event) => toggleEnvironment(environment.id, event.target.checked)}
            />
            {environment.name}
          </label>
        ))}
      </fieldset>
      {action.kind === "link" ? (
        <label>
          {t("optionsUrlTemplate")}
          <input required spellCheck={false} value={action.urlTemplate} onChange={(event) => update({ urlTemplate: event.target.value })} />
        </label>
      ) : (
        <>
          <label>
            {t("optionsQueryTemplate")}
            <input spellCheck={false} value={action.queryTemplate} onChange={(event) => update({ queryTemplate: event.target.value })} />
          </label>
          <label>
            {t("optionsDataViewId")}
            <input
              spellCheck={false}
              value={action.dataViewId ?? ""}
              onChange={(event) => update({ dataViewId: event.target.value.trim() || undefined })}
            />
          </label>
          <label>
            {t("optionsWindowMinutes")}
            <input
              type="number"
              min={1}
              max={1440}
              step={1}
              value={action.windowMinutes ?? ""}
              onChange={(event) => update({ windowMinutes: event.target.value === "" ? undefined : Number(event.target.value) })}
            />
          </label>
        </>
      )}
      <fieldset>
        <legend>{t("optionsConditions")}</legend>
        {action.conditions.map((condition, index) => (
          <div className="row" key={index}>
            <label>
              {t("optionsConditionField")}
              <input required spellCheck={false} value={condition.field} onChange={(event) => setCondition(index, { field: event.target.value })} />
            </label>
            <label>
              {t("optionsConditionOp")}
              <select
                value={condition.op}
                onChange={(event) => {
                  const op = event.target.value as ConditionOp;
                  setCondition(index, { op, value: op === "exists" ? undefined : (condition.value ?? "") });
                }}
              >
                {(Object.keys(OPERATORS) as ConditionOp[]).map((op) => (
                  <option key={op} value={op}>
                    {t(OPERATORS[op])}
                  </option>
                ))}
              </select>
            </label>
            {condition.op !== "exists" && (
              <label>
                {t("optionsConditionValue")}
                <input value={condition.value ?? ""} onChange={(event) => setCondition(index, { value: event.target.value })} />
              </label>
            )}
            <button
              type="button"
              className="link"
              onClick={() => update({ conditions: action.conditions.filter((_, i) => i !== index) })}
            >
              {t("optionsRemove")}
            </button>
          </div>
        ))}
        <button type="button" onClick={() => update({ conditions: [...action.conditions, { field: "", op: "exists" }] })}>
          {t("optionsAddCondition")}
        </button>
      </fieldset>
      <fieldset>
        <legend>{t("optionsPreview")}</legend>
        <label>
          {t("optionsPreviewSample")}
          <textarea rows={6} spellCheck={false} value={sample} onChange={(event) => setSample(event.target.value)} />
        </label>
        {sample.trim() !== "" && (
          <p className="preview" role="status">
            {describePreview(action, parseSample(sample))}
          </p>
        )}
      </fieldset>
      <div className="row">
        <button type="submit">{t("optionsSave")}</button>
        <button type="button" className="link" onClick={onCancel}>
          {t("optionsCancel")}
        </button>
      </div>
    </form>
  );
}

function describePreview(action: Action, sample: SampleResult): string {
  if (!sample.ok) return t("optionsPreviewInvalid", sample.error);
  const preview = previewAction(action, sample.fields);
  if (!preview.shown) return t(HIDDEN[preview.reason]);
  if (action.kind === "link") return `${t("optionsPreviewShown")} ${preview.text}`;
  const query = preview.text === "" ? t("optionsPreviewEmptyQuery") : preview.text;
  const range = action.windowMinutes === undefined ? "" : ` · ${t("optionsPreviewWindow", String(action.windowMinutes))}`;
  return `${t("optionsPreviewShown")} ${query}${range}`;
}
```

- [ ] **Step 3: Aksiyonlar bölümünü yeniden yaz**

`entrypoints/options/ActionsSection.tsx` dosyasının tamamını şununla değiştir:
```tsx
// Actions (spec §9): the list and a form editor with a live preview.
import { useState } from "react";
import type { Action, Config } from "../../src/core/config";
import { t } from "../../src/i18n";
import { newAction, withAction, withoutAction } from "../../src/options/model";
import { ActionEditor } from "./ActionEditor";
import { Feedback, type SectionProps, useSubmit } from "./feedback";

function environmentNames(config: Config, action: Action): string {
  if (action.environmentIds.length === 0) return t("optionsAllEnvironments");
  return config.environments
    .filter((environment) => action.environmentIds.includes(environment.id))
    .map((environment) => environment.name)
    .join(", ");
}

export function ActionsSection({ config, onSave }: SectionProps) {
  const [draft, setDraft] = useState<Action | null>(null);
  const { errors, saved, submit } = useSubmit(onSave);

  function save(): void {
    if (!draft) return;
    void submit(withAction(config, draft)).then((ok) => {
      if (ok) setDraft(null);
    });
  }

  return (
    <section aria-labelledby="actions-title">
      <h2 id="actions-title">{t("optionsActions")}</h2>
      <p className="muted">{t("optionsActionsHelp")}</p>
      <ul className="list">
        {config.actions.map((action) => (
          <li key={action.id}>
            <span className="name">{action.label}</span>
            <span className="badge">{t(action.kind === "link" ? "optionsKindLink" : "optionsKindDiscover")}</span>
            {!action.enabled && <span className="pending">{t("optionsDisabled")}</span>}
            <span className="muted">{environmentNames(config, action)}</span>
            <button type="button" onClick={() => setDraft(action)}>
              {t("optionsEdit")}
            </button>
            <button type="button" className="link" onClick={() => void submit(withoutAction(config, action.id))}>
              {t("optionsRemove")}
            </button>
          </li>
        ))}
      </ul>
      <div className="row">
        <button type="button" onClick={() => setDraft(newAction("link"))}>
          {t("optionsAddLink")}
        </button>
        <button type="button" onClick={() => setDraft(newAction("discover"))}>
          {t("optionsAddDiscover")}
        </button>
      </div>
      {draft && (
        <ActionEditor
          key={draft.id}
          action={draft}
          environments={config.environments}
          onChange={setDraft}
          onSave={save}
          onCancel={() => setDraft(null)}
        />
      )}
      <Feedback errors={errors} saved={saved} />
    </section>
  );
}
```

- [ ] **Step 4: Stilleri ekle**

`entrypoints/options/options.css` dosyasının sonuna ekle:
```css
label.inline { display: inline-flex; flex-direction: row; align-items: center; gap: 6px; margin: 4px 12px 4px 0; font-weight: 400; }
fieldset { margin: 12px 0; border: 1px solid #e3e8f0; border-radius: 6px; }
legend { padding: 0 4px; font-weight: 600; }
.badge { padding: 0 6px; border-radius: 4px; background: #e9edf3; font-size: 12px; }
.editor { margin-top: 12px; padding: 12px; border: 1px solid #d3dae6; border-radius: 6px; background: #fbfcfd; }
.preview { margin: 8px 0 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; }
```

- [ ] **Step 5: Artık kullanılmayan JSON düzenleyici yardımcısını sil**

`src/options/model.ts` içinden `withActionsJson` fonksiyonunu sil.

`tests/unit/options/model.test.ts` içinden `describe("withActionsJson", …)` bloğunu sil ve import listesinden `withActionsJson`'ı çıkar.

Run: `grep -rn withActionsJson src entrypoints tests`
Expected: Çıktı yok.

- [ ] **Step 6: Testlerin ve derlemenin geçtiğini gör**

Run: `npm test && npm run typecheck && npm run build && npm run check:manifest`
Expected: Hepsi PASS.

- [ ] **Step 7: Düzenleyiciyi elle dene**

Eklentiyi yeniden yükle ve ayarlar sayfasında şunları dene:
1. Link aksiyonu ekle: etiket boşken "Kaydet" tarayıcının zorunlu alan uyarısını göstermeli.
2. Şablon `https://admin.example.com/users/{user_id|context.user_id}` olsun. Önizlemeye `{"context": {"user_id": 7}}` yapıştır: `Görünür: https://admin.example.com/users/7`. `{"level": 1}` yapıştır: "Gizli: bir yer tutucunun bu logda değeri yok".
3. `level_name equals ERROR` koşulu ekle. `{"level_name": "INFO", "user_id": 1}` ile önizleme "Gizli: bu log için bir koşul sağlanmıyor" demeli.
4. Discover aksiyonu ekle: sorgu `user_id:{user_id}`, pencere `5`. Önizleme `Görünür: user_id:"7" · log zamanının ±5 dakika çevresi` demeli.
5. Kaydet ve listede gör. "Düzenle" ile aç, etiketi değiştir, kaydet: listedeki yeri değişmemeli.
6. Aksiyonu sil.

- [ ] **Step 8: Commit**

```bash
git add entrypoints/options src/options tests/unit/options public/_locales
git commit -m "feat(options): replace the actions JSON editor with a form editor and live preview

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Doğrulama (7.17, 8.19, 9.5) ve PR (insan gerekli)

**Files:**
- Create: `docs/verification/2026-10-plan-2.md` (Türkçe, Plan 1'in `docs/verification/2026-10-plan-1.md` biçiminde)

Plan 1'de olduğu gibi kontrol listesi Playwright ile otomatik çalıştırılabilir. Doğrulama betiği geçicidir ve depoya girmez; uçtan uca testler Plan 3'ün işi.

**Ortamlar:**
- **7.17.29:** Kullanıcının yerel ortamı, `http://localhost:9601`. Çalışmıyorsa kullanıcıdan başlatmasını iste.
- **8.19.23:** `./docker/up.sh 8` → `http://localhost:18601`
- **9.5.5:** `./docker/up.sh 9` → `http://localhost:19601`. Observability maddesi için `./docker/obs-view.sh 9`.

- [ ] **Step 1: Son kontroller**

Run: `npm test && npm run typecheck && npm run build && npm run check:manifest`
Expected: Hepsi PASS. Test sayısını not et.

- [ ] **Step 2: Doğrulama tarayıcısını hazırla**

Bu adım Plan 1'deki yaklaşımın aynısıdır:
1. Playwright'ı geçici bir klasöre kur, depoya ekleme: `npm i playwright@1.64.0 && npx playwright install chromium`.
2. `.output/chrome-mv3` klasörünü geçici bir yere kopyala. Kopyanın `manifest.json` dosyasına `host_permissions` ekle: `http://localhost:9601/*`, `http://localhost:18601/*`, `http://localhost:19601/*`, `http://kibana-dev.test:18601/*`. Sebep: Chrome'un izin penceresi otomasyonla tıklanamaz.
3. Tarayıcıyı şöyle başlat:
```js
import { chromium } from "playwright";

const context = await chromium.launchPersistentContext(profileDir, {
  channel: "chromium",
  headless: true,
  args: [
    `--disable-extensions-except=${extensionCopy}`,
    `--load-extension=${extensionCopy}`,
    // A non-localhost http origin is an insecure context: it exercises the execCommand clipboard fallback.
    "--host-resolver-rules=MAP kibana-dev.test 127.0.0.1",
  ],
});
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://localhost:18601" });
```
4. Kontrol listesinin her maddesi için beklenen URL'leri ve metinleri aynı logu Elasticsearch'ten doğrudan okuyarak hesapla. Kibana'nın ekranından okuma.
5. Shadow DOM içindeki elemanlar Playwright CSS seçicileriyle doğrudan bulunur (`kibanatool-bar .kt-btn`).

- [ ] **Step 3: Ayarları gir**

Ayarlar sayfasında (eklenti kopyasının `options.html` sayfası) şunları gir:
- **Ortamlar:** dört adres (9601, 18601, 19601, `kibana-dev.test:18601`).
- **Aksiyonlar** (form düzenleyicisiyle):
  - Link "User (admin)": `https://admin.example.com/users/{user_id|user.id}`
  - Discover "Same user ±5": `user_id:{user_id}`, pencere 5
  - Discover "±5 minutes": sorgu boş, pencere 5
  - Discover "Same channel": `channel:{channel}`, pencere yok
- **Kopyalama:** varsayılan maske desenleri.

- [ ] **Step 4: Kontrol listesini çalıştır**

| # | Ortam | Kontrol | Beklenen |
|---|---|---|---|
| 1 | 7.17 | `user_action_log` satırını aç | Çubukta sırasıyla: link, Discover butonları, "JSON", "⋯". |
| 2 | 7.17 | "Same user ±5" | Yeni sekmede `monolog`, sorgu çubuğunda `user_id:"<id>"`, zaman seçicide logun `datetime` değerinin ±5 dakikası. |
| 3 | 7.17 | `*_log` data view'ı (zaman alanı yok) | "Same user ±5" mevcut zaman aralığıyla açılır. "±5 minutes" pasif ve üzerinde gerekçe ipucu var. |
| 4 | 8.19 | Panel → "Same user ±5" | 2 ile aynı. Kibana `_a.index`'i `dataSource`'a çevirir ve doğru data view açılır. |
| 5 | 8.19 | Panel açıkken zaman seçiciyi değiştir | "Same channel" linkindeki `_g.time` yeni aralığı gösterir (hash prop'u). |
| 6 | 8.19 | Panelde "sonraki" | Çubuk yeni logun değerleriyle güncellenir. Discover linkleri de güncellenir. |
| 7 | 9.5 | "Same user ±5" | Yeni sekmede doğru data view, sorgu ve zaman (Discover sekmeleri, `_tab`). |
| 8 | 9.5 | Observability görünümü, `logs-*` | "Log overview" sekmesiyle de çubuk ve Discover butonları var. |
| 9 | 7.17 | ⋯ → "Markdown olarak kopyala" (`context.headers` içinde Authorization olan log) | Panodaki metinde `"Authorization": "***"`, JSON alanları kod bloğunda, son satırda çalışan "Kibana'da aç" linki. |
| 10 | 8.19 | ⋯ → "Logun linkini kopyala" | Link açılınca aynı `_id` gösterilir. |
| 11 | 9.5 | Zaman `now-15m`, ⋯ → "Görünümü sabit zamanla kopyala" | URL'de sabit ISO tarihler var. Yeni sekmede aynı aralık açılır, `_tab` parametresi sorun çıkarmaz. |
| 12 | 7.17, 8.19 | JSON görünümü | Buton yalnızca JSON alanı olan loglarda var. Birden fazla alanda önce liste gelir. Arama vurgular, Enter ve ↑/↓ ile gezilir. "Değeri/yolu kopyala" çalışır. |
| 13 | 8.19 | JSON arama kutusunda ← → ↑ ↓ ve Escape | Panel başka loga geçmez ve kapanmaz (çubuk olayları dışarı sızdırmıyor). |
| 14 | `kibana-dev.test:18601` | ⋯ → "Markdown olarak kopyala" | Güvensiz bağlamda `execCommand` yedeği çalışır. Pano, `localhost:18601` sekmesinden `navigator.clipboard.readText()` ile okunur ve metni içerir. |
| 15 | Ayarlar | Ortamı sil | Ona bağlı aksiyon kapanır. Origin, eklentinin izinlerinden düşer. |
| 16 | Ayarlar | Dışa aktar → içe aktar, ardından bozuk bir dosya içe aktar | Dosya geri yüklenir. Bozuk dosya alan yollu hatalarla reddedilir. |
| 17 | Hepsi | Konsol | kibanatool kaynaklı hata ya da yakalanmamış istisna yok. |

- [ ] **Step 5: Sonuçları yaz**

`docs/verification/2026-10-plan-2.md` dosyasını Plan 1'in doğrulama belgesiyle aynı yapıda yaz:
- tarih, yöntem, sürümler, dal ve HEAD, test sayısı
- sapmalar: izin penceresi ve izni geri alma elle denenemiyor
- sonuç tablosu
- Plan 3'e notlar

Kalan bir madde olursa gerekçesiyle "Kaldı" yaz. Bir madde başarısız olursa düzeltmeyi ayrı commit olarak yap ve maddeyi yeniden çalıştır.

- [ ] **Step 6: Commit**

```bash
git add docs/verification/2026-10-plan-2.md
git commit -m "docs: record Plan 2 verification on 7.17, 8.19 and 9.5

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Push ve PR (kullanıcıya sorduktan sonra)**

Push etmeden önce kullanıcıdan onay al. Onay gelirse:
```bash
GH_TOKEN=$(gh auth token --user cllakyz) git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push -u origin HEAD
GH_TOKEN=$(gh auth token --user cllakyz) gh pr create --base main --title "Plan 2: Discover actions, copy menu, JSON view and full settings page" --body-file <PR açıklaması dosyası>
```
PR açıklaması şunları içerir: özet, Plan 1'den kapanan bulgular, doğrulama belgesine link. Son satırı: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
