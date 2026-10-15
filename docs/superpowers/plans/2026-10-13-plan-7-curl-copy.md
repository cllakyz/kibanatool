# kibanatool Plan 7 — İsteği cURL Komutu Olarak Kopyalama: Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ⋯ menüsüne "cURL olarak kopyala" eklemek. Bir HTTP isteği kaydeden logdan (`player_action_log`, `user_action_log`), isteği tekrar gönderen bir bash komutu üretilir; hassas header'lar ve değerler diğer kopyalardaki kurallarla `***` olur.

**Architecture:**
- **Komut:** Yeni ve saf bir modül, `src/core/curl.ts`.
  - `requestPrefix(source)` logun bir istek kaydedip kaydetmediğini söyler (önce `context.`, sonra kök).
  - `buildCurl(hit, maskPatterns, valueMasks)` komutu yazar.
- **Maskeleme:** Kurallar diğer kopyalarla aynı (`maskMatcher`, `maskValue`, `maskText`). Fark şu: metinler nesneye açılıp gönderilmez. Parçanın kendi JSON metni bir kez açılır. İçindeki JSON metni maskelenip yine JSON metni olarak yazılır. HTML/XML metni olduğu gibi kalır, yalnız değer içi maskeler uygulanır.
- **Arayüz:** `ActionBar` öğeyi yalnızca istek kaydeden logda, JSON öğesinin hemen altına koyar.

**Tech Stack:** Plan 6 ile aynı, yeni bağımlılık yok.
- Uygulama: WXT 0.21, React 19, TypeScript 5.9 (strict)
- Kütüphaneler: zod 4
- Test: Vitest 5, happy-dom 20, Playwright 1.64
- Ortam: Docker (Elasticsearch + Kibana 7.17.29 / 8.19.23 / 9.5.5)

**Spec:** `docs/superpowers/specs/2026-10-13-curl-copy-design.md`, kullanıcı 2026-10-13'te onayladı. Plan yazılırken spec'te iki düzeltme yapıldı (aşağıda "Plan yazılırken netleşen ayrıntılar"). Ana spec: `docs/superpowers/specs/2026-10-07-kibanatool-design.md`. JSON kopyası: `docs/superpowers/specs/2026-10-12-xml-json-design.md` (Plan 6).

**Önceki planlar:** Plan 1–6 `main`'de. Son merge commit'i `b868cdd` (PR #7).

**Çalışma dalı:** Ana checkout'ta yeni dal `plan-7-curl-copy` açılır, worktree açılmaz. `docs/superpowers/` hiçbir commit'e girmez.

**Sürüm:** Bu özellik yayınlanmamış 1.0.0'a dahil (kullanıcı kararı). `package.json` sürümü değişmez. Ayar şeması değişmez (`schemaVersion: 3`).

### Planların sırası

| Plan | Kapsam |
|---|---|
| 1–6 (tamamlandı) | Link ve Discover aksiyonları, kopyalama, JSON görünümü, ayarlar sayfası, uçtan uca matris, CI, mağaza paketi, ortam değişkenleri, adla data view, değerin içinde maskeleme, XML'i JSON olarak okuma ve "JSON olarak kopyala" |
| **7 (bu plan)** | "cURL olarak kopyala" |

### Kararlar

Hepsi kullanıcıyla 2026-10-13'te tek tek alındı. Tam tablo spec §2'de.

| Konu | Karar |
|---|---|
| Görünüm | ⋯ menüsünde yeni öğe, yalnızca istek kaydeden logda. |
| Alanlar | Sabit adlar, ayar yok: önce `context.`, sonra kök. |
| Maske biçimi | `***`: `-H 'authorization: ***'`. |
| Maskeleme | Diğer kopyalarla aynı kurallar: header, body, query ve URL. |
| İç metin | Metin metin kalır: JSON metni içinde maskelenip JSON metni olarak, HTML/XML metni olduğu gibi (yalnız değer içi maskeler). |
| Atılan header'lar | Sabit taşıma/proxy listesi; `accept-encoding` yerine `--compressed`. |
| Form body | İçerik türüne göre: JSON, form-urlencoded (`a[b]=c`), multipart (`--form-string`). |
| Kabuk | bash/zsh, çok satırlı. |
| Menü sırası | Markdown, JSON, cURL, log linki, sabit görünüm. |
| Seed | `app_log`'a Symfony biçiminde iki log. |
| Varsayılan desenler | Değişmez; `*email*` eklenmez (ekibin ayar dosyalarında zaten var). |
| Sürüm ve belgeler | 1.0.0'a dahil; README, CHANGELOG, store listing (EN ve TR). |

### Plan yazılırken netleşen ayrıntılar

Spec onaylandıktan sonra, kod denenirken çıkan noktalar. Kullanıcı planı incelerken bunları da onaylar ya da düzeltir:

1. **İç metinler (kullanıcı kararı, 2026-10-13).** Spec'in ilk hali cURL'ü "JSON olarak kopyala"nın açılmış ve maskelenmiş kaynağından üretiyordu. Alpha'da `user_action_log` form body'lerinde HTML ve JSON metni tutan alanlar bulundu (spec §3). O yol bu metinleri nesneye açıp sunucuya farklı veri gönderirdi. Kullanıcı "metin metin kalsın" dedi; spec §5.6 ve §7 buna göre değişti. `maskSource` taşıması düştü, `json-copy.ts` değişmez. Aynı kural yüzünden XML body artık `***` değil; metin olarak, değer içi maskelerle gider.
2. **Menü öğelerine indeksle erişim (spec §8.3 düzeltmesi).** Onaylanan bölümde "adla erişilir" yazıyordu. Ama e2e testleri yerelleştirilmiş metni doğrulamıyor (Global Constraints) ve menü öğelerinin adları yerelleştirilmiş. Bu yüzden indeks kalır. `copyFromMenu` 0–4 kabul eder. İstek kaydeden logda cURL 2. sıradadır ve log linki 3'e kayar; bunu bir test kontrol eder.
3. **Görünürlük `useMemo` ile hesaplanır.** `hasRequest`, `jsonFields`'ın yanında, logla birlikte bir kez hesaplanır. Öğe yalnızca o zaman eklendiği için `buildCurl` orada hep bir komut döner. `?? null` dalı tip için var ve erişilemez.
4. **Seed logları en eski iki `app_log` logu.** Kullanıcıları `100009`. Böylece başka testlerin satırları, sayıları ve ±5 dakika pencereleri değişmez. Mevcut `app_log` loglarının URL'leri göreli (`/v1/coupons`); onlarda öğe görünmez ve menü 4 öğe kalır.
5. **E-posta (kullanıcı kararı).** Varsayılan desenler e-postayı maskelemez. Tasarım konuşmasındaki örnekte bu yanlış gösterilmişti, spec'teki örnek doğru (`dev%40example.com`). Seed ve e2e de bunu böyle bekler.

### Plan yazılırken yapılan denemeler (2026-10-13)

| Deneme | Sonuç |
|---|---|
| Alpha ölçümü (spec §3) | İki indexin son 500 kaydında method, içerik türü ve header adları; son 2000 kaydında parçaların içindeki metinler. Değerler okunmadı. |
| Bu planın kodu, `main`'in (`b868cdd`) geçici bir worktree kopyasına Task 1–3'teki haliyle sırayla uygulandı | `npm test`: başlangıçta 410, Task 1 sonunda 430 test; hepsi geçti. Her task sonunda `npm run typecheck` hatasız. Task 1 ve 2 sonunda `npm run build` ve `npm run check:manifest` geçti. `node --check docker/seed.mjs` geçti. |
| E2E, Task 2'deki seed ve testlerle | Yeni seed üç yığına yüklendi. Tam matris: 7.17'de 27 geçti, 3 atlandı (50,3 sn); 8.19'da 27 ve 3 (1,8 dk); 9.5'te 28 ve 3 (1,9 dk). Önceki sayılar 25/25/26'ydı; her yığında iki yeni senaryo eklendi. `copy` için `--repeat-each=3`: 7.17 ve 9.5'te 24/24. Deneme sonunda yığınlara `main`'in seed'i geri yüklendi. |
| `npm run zip` | `.output/kibanatool-1.0.0-chrome.zip`, 269,39 kB. |

### Uygulama notları

- **Diff'ler.** Mevcut dosyalardaki değişiklikler `git diff` çıktısı olarak verildi. Satırlar `main` (`b868cdd`) ve önceki task'ların sonucuna göredir. Elle uygulanabilir ya da diff bir dosyaya kaydedilip `git apply <dosya>` ile uygulanabilir. Yeni dosyaların tam içeriği verildi.
- **E2E yalnız Task 2'de çalışır.** Seed ve e2e testleri aynı commit'te değişir (seed sözleşmesi).
- **Docker yığınları açık.** `./docker/up.sh 7`, `8` ve `9` yığın açıkken de seed'i yeniden yükler.
- **Beklenen komutlar birebir.** Birim testleri ve e2e komutları tam metinle karşılaştırır. Satırlar `" \\\n  "` ile birleşir; JS kaynağında `'\\''` bash'teki `'\''` demektir.

## Global Constraints

- **Node ve npm:** Node `>=22`, paket yöneticisi `npm`. **Yeni bağımlılık eklenmez.**
- **TypeScript:** `typescript@5`, `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax` (tip import'ları `type` ile). `npm run typecheck`, `tests/e2e/` ve `playwright.config.ts` dosyalarını da kapsar.
- **Desteklenen Kibana sürümleri:** 7.17.29, 8.19.23 ve 9.5.5. Yalnızca Chrome MV3, yalnızca Discover.
- **Manifest izinleri değişmez:**
  - `permissions` tam olarak `["storage", "scripting"]`
  - `optional_host_permissions` tam olarak `["http://*/*", "https://*/*"]`
  - `npm run check:manifest` her task'ın sonunda geçer.
- **Ayar modeli:** değişmez. `schemaVersion: 3`, yeni ayar yok, `DEFAULT_MASK_PATTERNS` değişmez.
- **Uygun log (spec §4):** Önce `context`, sonra kök. `method` boş olmayan metin, `url` `http:`/`https:` şemalı geçerli adres. Uygunluk ham `_source`'tan belirlenir.
- **Komut (spec §5):**
  - Her argüman tek tırnakta, `'` → `'\''`. Sıra: URL, `--globoff`, `-X`, `-H`'ler (log sırasıyla), body, `--compressed`. Satırlar `" \\\n  "` ile birleşir.
  - `-X` yalnızca method, body varken `POST`, yokken `GET` değilse yazılır.
  - Query PHP `http_build_query` gibi: `a[b]=c`, `a[0]=x`, `true` → `1`, `false` → `0`, `null` ve boş liste atlanır; `encodeURIComponent`, köşeli parantezler kodlanmaz. URL'de `?` varsa `&` ile eklenir. URL'de `[`, `]`, `{`, `}` varsa `--globoff`.
  - Atılan header'lar (büyük-küçük harf duyarsız): `host`, `content-length`, `connection`, `accept-encoding`, `forwarded`, `x-forwarded-*`, `x-real-ip`, `cf-*`, `cdn-loop`, `x-php-ob-level`. `accept-encoding` varsa `--compressed`.
  - Body: form-urlencoded → `--data-raw` ile query kodlaması; multipart → yaprak başına `--form-string 'ad=değer'` ve `content-type` atılır; diğer nesne/dizi → tek satır JSON; metin → olduğu gibi. `[]`, `{}`, `""`, `null` body yok sayılır.
- **Maskeleme (spec §5.6):** Yollar JSON kopyasıyla aynı (`context.headers.<ad>`, `context.body.<anahtar>…`). Parçanın kendi JSON metni bir kez açılır. İçteki JSON metni maskelenip `JSON.stringify` ile metne döner, en fazla 5 metin iç içe, daha derini `***`. Diğer metinler yalnız değer içi maskelerle kalır. Tamamı maskelenen parça: URL `'***'`, header'lar yazılmaz, body `'***'`.
- **Menü (spec §6):** Markdown, JSON, cURL (yalnız uygun logda), log linki, sabit görünüm.
- **Gizlilik:**
  - Testlerde ve seed'de yalnız sentetik değerler kullanılır.
  - Alpha'dan ya da başka gerçek bir kaynaktan hiçbir değer koda, teste, commit'e ya da rapora girmez.
  - Elle kontrollerde kopyalanan komutu ve kullanıcının token'ını isteme, okuma, yazma.
- **Kibana'yı bozmamak:** İçerik betiği hiçbir hatayı dışarı sızdırmaz; hatalar `console.debug("[kibanatool]", ...)` ile loglanır. Komut üretirken atılan bir hata `CopyMenu`'nün `onFail`'ine düşer ("Kopyalanamadı").
- **UI:**
  - Shadow DOM içinde React. `innerHTML` ya da `dangerouslySetInnerHTML` kullanılmaz.
  - Yeni kullanıcı metni `menuCopyCurl` hem `public/_locales/en/messages.json` hem `public/_locales/tr/messages.json` dosyasına eklenir. `MessageKey` İngilizce dosyadan türetilir; `tests/unit/i18n.test.ts` iki dosyanın aynı anahtarları taşıdığını denetler.
- **Import yolları:**
  - `src/core/` tarayıcı API'si kullanmaz. `curl.ts` yalnız `fields.ts`, `mask.ts`, `template.ts`, `types.ts` ve `value-mask.ts`'i import eder.
  - `src/i18n.ts`'i import eden React bileşenlerinin birim testi yazılmaz; onları uçtan uca testler sınar.
- **Uçtan uca testler:**
  - Yerelleştirilmiş metin doğrulanmaz. Kullanılan seçiciler: `data-test-subj`, ARIA rolleri, eklentinin sınıf adları, menü sırası.
  - Sabit `waitForTimeout` beklemesi yazılmaz.
- **Seed sözleşmesi:** `docker/seed.mjs` ile `tests/e2e` aynı commit'te değişir. `tests/fixtures/*` (app-001'in ekran yakalaması) değişmez.
- **Docker:**
  - Sırlar `docker/.env.<major>` dosyalarındadır ve hiçbir çıktıya, loga, commit'e ya da rapora yazılmaz.
  - Ekibin `spinehub-*` konteynerlerine ve `:9601`, `:9200`, `:9201` portlarına dokunulmaz.
- **Komutlar:**
  - Her task'ın sonunda: `npm test`, `npm run typecheck`, `npm run build`, `npm run check:manifest`.
  - Uçtan uca testleri değiştiren task ayrıca o task'ın yazdığı e2e komutlarını çalıştırır.
- **Git:**
  - Bu depoda `user.email` yerel olarak `cllakyz@hotmail.com`.
  - Her commit mesajı `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` satırıyla biter.
  - `docs/superpowers/` commit edilmez.
  - Push, PR, etiket ve sürüm yalnızca kullanıcının açık onayıyla yapılır. Push komutu: `GH_TOKEN=$(gh auth token --user cllakyz) git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push`
  - Her commit'ten önce `git branch --show-current` ile dalın `plan-7-curl-copy` olduğu doğrulanır.

## Review Focus

1. **HTML ya da JSON metni tutan form alanları.** `campaign.rules`, `contract.text` (HTML) ve `bet_type_config.calcParams` (JSON) gibi alanlar, logdaki metinle aynı metin olarak gitmeli. JSON metninin içi maskelenmeli, HTML'de yalnız değer içi maskeler uygulanmalı. Test: Task 1, `curl.test.ts` ("keeps JSON and HTML text inside the body as text").
2. **Türkçe kesme işareti.** `Ali'nin` gibi değerler header'da, JSON'da ve formda bash tırnaklamasını bozmamalı. Test: Task 1 ("quotes every argument for bash"); Task 2, app-031 ve app-032 e2e.
3. **`application/json` diyen ve `[]` logu olan GET.** `player_action_log`'daki 415 GET'in 157'si böyle. Komutta `-X` ve body olmamalı. Test: Task 1 ("writes no body for a GET that says application/json").
4. **Türkçe harfler.** Query ve formda UTF-8 yüzde kodlaması; JSON body'de, PHP'nin `Ç` kaçışı yerine harfin kendisi. Test: Task 1 ("percent-encodes Turkish letters").
5. **Birden çok değerli ve maskeli header listeleri.** Her değer ayrı `-H` satırı olmalı; maskelenen liste tek satır `***` olmalı. Test: Task 1 ("writes one line per item of a header list"; maskeleme testindeki iki değerli `cookie`).

## Dosya yapısı

```
src/core/curl.ts                       (yeni)    requestPrefix, buildCurl
src/content/ActionBar.tsx              (değişir) "cURL olarak kopyala" menü öğesi
public/_locales/{en,tr}/messages.json  (değişir) menuCopyCurl
docker/seed.mjs                        (değişir) app-031 (form POST), app-032 (JSON POST)
tests/unit/core/curl.test.ts           (yeni)
tests/e2e/kibana.ts, copy.spec.ts      (değişir)
README.md, CHANGELOG.md, CLAUDE.md, docs/store-listing.md   (değişir)
docs/verification/2026-10-plan-7.md    (yeni, Task 4)
```

---

### Task 0: Dalı aç

- [ ] **Step 1: Ana checkout'ta `main`'den yeni dal aç**

```bash
git switch main && git pull --ff-only && git switch -c plan-7-curl-copy
git status --short   # boş olmalı
npm test 2>&1 | tail -4   # başlangıç: 410 test geçer
```

Bu adımın commit'i yoktur.

---

### Task 1: Komut üretimi (`curl.ts`)

**Files:**
- Create: `src/core/curl.ts`
- Test: `tests/unit/core/curl.test.ts`

**Interfaces:**
- Consumes (mevcut): `isMissing`, `isPlainObject`, `parseStructuredText` (`src/core/fields.ts`); `MASK`, `maskMatcher`, `maskValue` (`src/core/mask.ts`); `isHttpUrl` (`src/core/template.ts`); `RawHit` (`src/core/types.ts`); `ValueMaskKind`, `maskText`, `VALUE_MASK_KINDS` (`src/core/value-mask.ts`); `DEFAULT_MASK_PATTERNS` (`src/core/config.ts`, yalnız test).
- Produces:
  - `export type RequestPrefix = "context" | ""`
  - `export function requestPrefix(source: Record<string, unknown>): RequestPrefix | undefined`
  - `export function buildCurl(hit: RawHit, maskPatterns: string[], valueMasks: readonly ValueMaskKind[]): string | undefined`

- [ ] **Step 1: Önce başarısız testi yaz**

`tests/unit/core/curl.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_MASK_PATTERNS } from "../../../src/core/config";
import { buildCurl, requestPrefix } from "../../../src/core/curl";
import { VALUE_MASK_KINDS } from "../../../src/core/value-mask";

// Synthetic values only (Plan 5 spec §9.1).
const all = [...VALUE_MASK_KINDS];
const URL = "https://api.example.com/v1/x";
const curl = (source: Record<string, unknown>, patterns: string[] = DEFAULT_MASK_PATTERNS, kinds = all): string | undefined =>
  buildCurl({ _id: "10000000146", _index: "player_action_log", _source: source }, patterns, kinds);
/** A Monolog-shaped log like player_action_log: headers, body and query are JSON text (spec §3). */
const request = (fields: Record<string, unknown>): Record<string, unknown> => ({ context: { method: "GET", url: URL, ...fields } });
const json = (value: unknown): string => JSON.stringify(value);
const lines = (...parts: string[]): string => parts.join(" \\\n  ");

describe("requestPrefix (spec §4)", () => {
  it("prefers context, then the root", () => {
    expect(requestPrefix({ context: { method: "GET", url: URL }, method: "POST", url: "https://b.example.com/" })).toBe("context");
    expect(requestPrefix({ method: "get", url: "http://b.example.com/" })).toBe("");
    expect(requestPrefix({ context: { method: "GET", url: "/v1/x" }, method: "GET", url: "https://b.example.com/" })).toBe("");
  });

  it("finds no request without a method and an http(s) url", () => {
    expect(requestPrefix({})).toBeUndefined();
    expect(requestPrefix({ context: { url: URL } })).toBeUndefined();
    expect(requestPrefix({ context: { method: " ", url: URL } })).toBeUndefined();
    expect(requestPrefix({ context: { method: "GET", url: "/v1/coupons" } })).toBeUndefined();
    expect(requestPrefix({ context: { method: "GET", url: "ftp://files.example.com/" } })).toBeUndefined();
    expect(requestPrefix({ context: { method: "GET", url: 42 } })).toBeUndefined();
    expect(requestPrefix({ context: "GET https://api.example.com/" })).toBeUndefined();
  });
});

describe("buildCurl (spec §5)", () => {
  it("returns undefined when the log records no request", () => {
    expect(buildCurl({ _id: "1", _index: "i" }, [], [])).toBeUndefined();
    expect(curl({ context: { method: "GET", url: "/v1/coupons" } })).toBeUndefined();
  });

  it("writes the headers in log order, one per line, without transport, proxy and CDN headers (spec §5.1, §5.4)", () => {
    const headers = json({
      host: ["api.example.com"],
      "user-agent": ["app/1.0"],
      "X-Forwarded-For": ["10.0.0.1"],
      "x-forwarded-proto": ["https"],
      "cf-ray": ["8f00"],
      "CF-Visitor": ['{"scheme":"https"}'],
      "cdn-loop": ["cloudflare"],
      "x-real-ip": ["10.0.0.1"],
      forwarded: ["for=10.0.0.1"],
      connection: ["close"],
      "content-length": ["0"],
      "x-php-ob-level": ["1"],
      accept: ["application/json"],
      "Accept-Encoding": ["gzip, br"],
      ssl: ["on"],
    });
    expect(curl(request({ headers }))).toBe(
      lines(`curl '${URL}'`, "-H 'user-agent: app/1.0'", "-H 'accept: application/json'", "-H 'ssl: on'", "--compressed"),
    );
  });

  it("writes one line per item of a header list, and reads headers that are an object of strings and numbers", () => {
    expect(curl(request({ headers: json({ accept: ["text/html", "application/json"], "x-empty": [], "x-null": null }) }))).toBe(
      lines(`curl '${URL}'`, "-H 'accept: text/html'", "-H 'accept: application/json'"),
    );
    expect(curl({ method: "GET", url: URL, headers: { accept: "text/html", "x-retry": 3 } })).toBe(
      lines(`curl '${URL}'`, "-H 'accept: text/html'", "-H 'x-retry: 3'"),
    );
    expect(curl(request({ headers: "not json" }))).toBe(`curl '${URL}'`);
  });

  it("writes -X only when curl would guess the method wrong (spec §5.2)", () => {
    const body = json({ a: 1 });
    expect(curl(request({ body: "[]" }))).toBe(`curl '${URL}'`);
    expect(curl(request({ method: "POST", body }))).toBe(lines(`curl '${URL}'`, `--data-raw '{"a":1}'`));
    expect(curl(request({ method: "DELETE", body: "[]" }))).toBe(lines(`curl '${URL}'`, "-X 'DELETE'"));
    expect(curl(request({ method: "POST", body: "[]" }))).toBe(lines(`curl '${URL}'`, "-X 'POST'"));
    expect(curl(request({ method: "GET", body }))).toBe(lines(`curl '${URL}'`, "-X 'GET'", `--data-raw '{"a":1}'`));
    expect(curl(request({ method: "put", body }))).toBe(lines(`curl '${URL}'`, "-X 'PUT'", `--data-raw '{"a":1}'`));
  });

  it("treats [], {}, empty text and a missing body as no body", () => {
    for (const body of ["[]", "{}", "", undefined, null]) {
      expect(curl(request({ method: "POST", body }))).toBe(lines(`curl '${URL}'`, "-X 'POST'"));
    }
  });

  it("writes no body for a GET that says application/json and logs [] (Review Focus 3)", () => {
    expect(curl(request({ headers: json({ "content-type": ["application/json"] }), body: "[]", query: "[]" }))).toBe(
      lines(`curl '${URL}'`, "-H 'content-type: application/json'"),
    );
  });

  it("quotes every argument for bash, apostrophes and line breaks included (spec §5.1, Review Focus 2)", () => {
    expect(curl(request({ method: "POST", headers: json({ "x-note": ["Ali'nin notu"] }), body: "it's\nfine" }))).toBe(
      lines(`curl '${URL}'`, "-H 'x-note: Ali'\\''nin notu'", "--data-raw 'it'\\''s\nfine'"),
    );
  });

  it("appends the query the way PHP's http_build_query writes it, with --globoff for brackets (spec §5.3)", () => {
    const query = json({ page: "2", filter: { status: "active", ids: [3, 4] }, flag: true, off: false, none: null, empty: [], q: "a b&c" });
    expect(curl(request({ query }))).toBe(
      lines(`curl '${URL}?page=2&filter[status]=active&filter[ids][0]=3&filter[ids][1]=4&flag=1&off=0&q=a%20b%26c'`, "--globoff"),
    );
    expect(curl(request({ url: `${URL}?lang=tr`, query: json({ page: "2" }) }))).toBe(`curl '${URL}?lang=tr&page=2'`);
    expect(curl(request({ query: json({ "a b": "1" }) }))).toBe(`curl '${URL}?a%20b=1'`);
    expect(curl(request({ query: json(["a"]) }))).toBe(`curl '${URL}'`);
    expect(curl(request({ query: "[]" }))).toBe(`curl '${URL}'`);
  });

  it("percent-encodes Turkish letters in the query and form, and keeps them in JSON (Review Focus 4)", () => {
    expect(curl(request({ query: json({ q: "şehir" }) }))).toBe(`curl '${URL}?q=%C5%9Fehir'`);
    const form = json({ "content-type": ["application/x-www-form-urlencoded"] });
    expect(curl(request({ method: "POST", headers: form, body: json({ ad: "Çağrı" }) }))).toContain("--data-raw 'ad=%C3%87a%C4%9Fr%C4%B1'");
    // PHP's json_encode writes \u00c7; the command sends the same JSON with the letters themselves.
    expect(curl(request({ method: "POST", body: '{"ad":"\\u00c7a\\u011fr\\u0131"}' }))).toContain(`--data-raw '{"ad":"Çağrı"}'`);
  });

  it("writes a JSON body as one line of JSON, also for an unknown or missing content type (spec §5.5)", () => {
    const body = json({ amount: 10, code: "00150", items: [{ id: 1 }] });
    const sent = `--data-raw '{"amount":10,"code":"00150","items":[{"id":1}]}'`;
    for (const type of ["application/json; charset=utf-8", "application/vnd.api+json", "text/plain"]) {
      expect(curl(request({ method: "POST", headers: json({ "content-type": [type] }), body }))).toBe(
        lines(`curl '${URL}'`, `-H 'content-type: ${type}'`, sent),
      );
    }
    expect(curl(request({ method: "POST", body }))).toBe(lines(`curl '${URL}'`, sent));
  });

  it("writes a form body with http_build_query names, brackets unencoded and no --globoff (spec §5.5)", () => {
    const headers = json({ "content-type": ["application/x-www-form-urlencoded"] });
    const body = json({ searchForm: { email: "dev@example.com", tags: ["a", "b"] }, remember: true });
    expect(curl(request({ method: "POST", headers, body }), [], [])).toBe(
      lines(
        `curl '${URL}'`,
        "-H 'content-type: application/x-www-form-urlencoded'",
        "--data-raw 'searchForm[email]=dev%40example.com&searchForm[tags][0]=a&searchForm[tags][1]=b&remember=1'",
      ),
    );
  });

  it("writes multipart fields with --form-string and lets curl set the content type (spec §5.5)", () => {
    const headers = json({ "content-type": ["multipart/form-data; boundary=----x"], accept: ["*/*"] });
    const body = json({ title: "@notes.txt", meta: { lang: "<tr>" } });
    expect(curl(request({ method: "POST", headers, body }), [], [])).toBe(
      lines(`curl '${URL}'`, "-H 'accept: */*'", "--form-string 'title=@notes.txt'", "--form-string 'meta[lang]=<tr>'"),
    );
  });

  it("sends a text body as it is, XML included, with only the value masks (spec §5.5, §5.6)", () => {
    const headers = json({ "content-type": ["text/xml"] });
    expect(curl(request({ method: "POST", headers, body: "<pay><id>10000000146</id><amount>150</amount></pay>" }))).toBe(
      lines(`curl '${URL}'`, "-H 'content-type: text/xml'", "--data-raw '<pay><id>***</id><amount>150</amount></pay>'"),
    );
  });

  it("masks headers, body, query and URL like the other copies (spec §5.6)", () => {
    const source = {
      context: {
        method: "POST",
        url: "https://backoffice.example.com/player/10000000146/notes",
        headers: json({
          authorization: ["Bearer synthetic"],
          cookie: ["PHPSESSID=synthetic", "theme=dark"],
          "platform-token": ["synthetic"],
          "content-type": ["application/x-www-form-urlencoded"],
        }),
        body: json({ note: { phone: "0555 000 00 00", password: "synthetic" }, _token: "synthetic", amount: 10000000146 }),
        query: json({ iban: "TR000000000000000000000001" }),
      },
    };
    expect(curl(source)).toBe(
      lines(
        "curl 'https://backoffice.example.com/player/***/notes?iban=***'",
        "-H 'authorization: ***'",
        "-H 'cookie: ***'",
        "-H 'platform-token: ***'",
        "-H 'content-type: application/x-www-form-urlencoded'",
        "--data-raw 'note[phone]=***&note[password]=***&_token=***&amount=***'",
      ),
    );
  });

  it("keeps JSON and HTML text inside the body as text: JSON masked inside, HTML with only the value masks (spec §5.6, Review Focus 1)", () => {
    const body = json({ contract: { text: "<p>Kimlik 10000000146</p>", settings: json({ limit: 5, secret: "synthetic" }) } });
    expect(curl(request({ method: "POST", headers: json({ "content-type": ["application/json"] }), body }))).toContain(
      `--data-raw '{"contract":{"text":"<p>Kimlik ***</p>","settings":"{\\"limit\\":5,\\"secret\\":\\"***\\"}"}}'`,
    );
    const form = json({ "content-type": ["application/x-www-form-urlencoded"] });
    expect(curl(request({ method: "POST", headers: form, body }))).toContain(
      "--data-raw 'contract[text]=%3Cp%3EKimlik%20***%3C%2Fp%3E&contract[settings]=%7B%22limit%22%3A5%2C%22secret%22%3A%22***%22%7D'",
    );
  });

  it("masks JSON text nested deeper than five texts as a whole (spec §5.6)", () => {
    let body: unknown = { v: "x" };
    for (let level = 0; level < 5; level++) body = { a: json(body) };
    let expected: unknown = { a: "***" };
    for (let level = 0; level < 4; level++) expected = { a: json(expected) };
    expect(curl(request({ method: "POST", body: json(body) }), [], [])).toBe(lines(`curl '${URL}'`, `--data-raw '${json(expected)}'`));
  });

  it("writes a part that a pattern masks whole as *** (spec §5.6)", () => {
    const source = request({ method: "POST", headers: json({ "accept-encoding": ["gzip"] }), body: json({ a: 1 }), query: json({ b: "2" }) });
    expect(curl(source, ["context.url", "context.headers", "context.body", "context.query"])).toBe(lines("curl '***'", "--data-raw '***'"));
  });

  it("reads the root prefix with the root paths for masks", () => {
    expect(curl({ method: "GET", url: URL, headers: { "x-secret": "synthetic" } })).toBe(lines(`curl '${URL}'`, "-H 'x-secret: ***'"));
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/core/curl.test.ts`
Expected: FAIL; `src/core/curl` modülü bulunamaz.

- [ ] **Step 3: Modülü yaz**

`src/core/curl.ts`:

```ts
// "Copy as cURL" (Plan 7 spec): the HTTP request a log records, written as a bash command that sends it again.
import { isMissing, isPlainObject, parseStructuredText } from "./fields";
import { MASK, maskMatcher, maskValue } from "./mask";
import { isHttpUrl } from "./template";
import type { RawHit } from "./types";
import { type ValueMaskKind, maskText } from "./value-mask";

/** Where the request fields sit: under `context` (Monolog) or at the root of `_source` (spec §4). */
export type RequestPrefix = "context" | "";

const PREFIXES: readonly RequestPrefix[] = ["context", ""];

/** Transport, proxy and CDN headers: curl sets them itself or they only repeat the old hop (spec §5.4). */
const DROPPED_HEADER = /^(?:host|content-length|connection|accept-encoding|forwarded|x-forwarded-.*|x-real-ip|cf-.*|cdn-loop|x-php-ob-level)$/i;

/** Like expandStructured: at most five texts are opened one inside another (spec §5.6). */
const MAX_TEXT_DEPTH = 5;

type IsMasked = (path: string) => boolean;

function fieldsAt(source: Record<string, unknown>, prefix: RequestPrefix): Record<string, unknown> | undefined {
  const fields = prefix === "" ? source : source[prefix];
  return isPlainObject(fields) ? fields : undefined;
}

/** Spec §4: the first prefix with a method and an http(s) url; undefined when the log records no request. */
export function requestPrefix(source: Record<string, unknown>): RequestPrefix | undefined {
  return PREFIXES.find((prefix) => {
    const fields = fieldsAt(source, prefix);
    return typeof fields?.method === "string" && fields.method.trim() !== "" && typeof fields.url === "string" && isHttpUrl(fields.url);
  });
}

/** Spec §5: the command, masked like the other copies; undefined when the log records no request. */
export function buildCurl(hit: RawHit, maskPatterns: string[], valueMasks: readonly ValueMaskKind[]): string | undefined {
  const source = hit._source ?? {};
  const prefix = requestPrefix(source);
  const fields = prefix === undefined ? undefined : fieldsAt(source, prefix);
  if (prefix === undefined || fields === undefined) return undefined;
  const isMasked = maskMatcher(maskPatterns);
  const path = (name: string): string => (prefix === "" ? name : `${prefix}.${name}`);
  const part = (name: string): unknown => maskPart(path(name), fields[name], isMasked, valueMasks);
  const method = String(maskValue(path("method"), fields.method, isMasked, valueMasks)).toUpperCase();
  const url = String(maskValue(path("url"), fields.url, isMasked, valueMasks));

  const headers = headerLines(part("headers"));
  const contentType = headers.find(([name]) => name.toLowerCase() === "content-type")?.[1].split(";")[0]?.trim().toLowerCase() ?? "";
  const body = bodyOptions(part("body"), contentType);
  const queryPart = part("query");
  const query = isPlainObject(queryPart) ? encodeQuery(queryPart) : "";
  const target = query === "" ? url : `${url}${url.includes("?") ? "&" : "?"}${query}`;
  // curl sets a multipart content type with its own boundary (spec §5.5).
  const multipart = body.some((option) => option.startsWith("--form-string"));
  const sent = headers.filter(([name]) => !DROPPED_HEADER.test(name) && !(multipart && name.toLowerCase() === "content-type"));

  const options = [
    ...(/[[\]{}]/.test(target) ? ["--globoff"] : []),
    ...(method === (body.length > 0 ? "POST" : "GET") ? [] : [`-X ${quote(method)}`]),
    ...sent.map(([name, value]) => `-H ${quote(`${name}: ${value}`)}`),
    ...body,
    ...(headers.some(([name]) => name.toLowerCase() === "accept-encoding") ? ["--compressed"] : []),
  ];
  return [`curl ${quote(target)}`, ...options].join(" \\\n  ");
}

/** Bash single quotes: nothing inside is special, and a quote is closed, escaped and reopened (spec §5.1). */
const quote = (text: string): string => `'${text.replace(/'/g, "'\\''")}'`;

/** JSON text only: XML and HTML text stays text in the command (spec §5.6). */
const jsonOf = (text: string): Record<string, unknown> | unknown[] | undefined =>
  text.trim().startsWith("<") ? undefined : parseStructuredText(text);

/** Spec §5.6: the part's own JSON text is opened, so the command can read headers, form fields and query keys. */
function maskPart(path: string, value: unknown, isMasked: IsMasked, kinds: readonly ValueMaskKind[]): unknown {
  const json = typeof value === "string" ? jsonOf(value) : undefined;
  return maskKeepingText(path, json ?? value, isMasked, kinds, json === undefined ? 0 : 1);
}

/** maskValue's rules, but JSON text is masked inside and written back as JSON text, and other text stays text. */
function maskKeepingText(path: string, value: unknown, isMasked: IsMasked, kinds: readonly ValueMaskKind[], depth: number): unknown {
  if (isMasked(path)) return MASK;
  if (Array.isArray(value)) return value.map((item) => maskKeepingText(path, item, isMasked, kinds, depth));
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, maskKeepingText(`${path}.${key}`, item, isMasked, kinds, depth)]));
  }
  if (typeof value !== "string") return maskValue(path, value, isMasked, kinds);
  const json = jsonOf(value);
  if (json === undefined) return maskText(value, kinds);
  return depth >= MAX_TEXT_DEPTH ? MASK : JSON.stringify(maskKeepingText(path, json, isMasked, kinds, depth + 1));
}

/** Spec §4: one [name, value] per header value, in log order; a list gives one per item. */
function headerLines(headers: unknown): [string, string][] {
  if (!isPlainObject(headers)) return [];
  return Object.entries(headers).flatMap(([name, value]) =>
    (Array.isArray(value) ? value : [value])
      .filter((item) => typeof item === "string" || typeof item === "number")
      .map((item): [string, string] => [name, String(item)]),
  );
}

/** Spec §5.5: the options that send the body, chosen by its content type. */
function bodyOptions(body: unknown, contentType: string): string[] {
  if (isMissing(body) || (isPlainObject(body) && Object.keys(body).length === 0)) return [];
  if (!Array.isArray(body) && !isPlainObject(body)) return [`--data-raw ${quote(String(body))}`];
  if (contentType === "application/x-www-form-urlencoded") return [`--data-raw ${quote(encodeQuery(body))}`];
  if (contentType === "multipart/form-data") {
    return leaves(body).map(([name, value]) => `--form-string ${quote(`${fieldName(name, (part) => part)}=${value}`)}`);
  }
  return [`--data-raw ${quote(JSON.stringify(body))}`];
}

/** PHP http_build_query's leaves (spec §5.3): `a[b][0]`; true is 1, false 0; null and empty lists drop out. */
function leaves(value: unknown, path: string[] = []): [string[], string][] {
  if (Array.isArray(value) || isPlainObject(value)) return Object.entries(value).flatMap(([key, item]) => leaves(item, [...path, key]));
  if (value === null || value === undefined) return [];
  return [[path, typeof value === "boolean" ? (value ? "1" : "0") : String(value)]];
}

const fieldName = ([first = "", ...rest]: string[], encode: (part: string) => string): string =>
  encode(first) + rest.map((part) => `[${encode(part)}]`).join("");

/** Names and values percent-encoded, brackets left as they are (spec §5.3). */
const encodeQuery = (value: unknown): string =>
  leaves(value)
    .map(([name, item]) => `${fieldName(name, encodeURIComponent)}=${encodeURIComponent(item)}`)
    .join("&");
```

- [ ] **Step 4: Testin geçtiğini gör**

Run: `npx vitest run tests/unit/core/curl.test.ts`
Expected: PASS, 20 test.

- [ ] **Step 5: Bütün kontroller**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest
```
Expected: 430 test geçer; typecheck hatasız; build ve manifest kontrolü geçer.

- [ ] **Step 6: Commit**

```bash
git branch --show-current   # plan-7-curl-copy
git add src/core/curl.ts tests/unit/core/curl.test.ts
git commit -m "feat: build a masked cURL command from a logged request

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Menü öğesi, seed ve uçtan uca testler

**Files:**
- Modify: `src/content/ActionBar.tsx`
- Modify: `public/_locales/en/messages.json`, `public/_locales/tr/messages.json`
- Modify: `docker/seed.mjs`
- Modify: `tests/e2e/kibana.ts`, `tests/e2e/copy.spec.ts`

**Interfaces:**
- Consumes: Task 1'den `requestPrefix(source)` ve `buildCurl(hit, maskPatterns, valueMasks)`.
- Produces: `menuCopyCurl` metin anahtarı; seed'de `app-031` (`extra.uid: "uid-031"`) ve `app-032` (`extra.uid: "uid-032"`); `copyFromMenu(page, detail, item: 0 | 1 | 2 | 3 | 4)`.

- [ ] **Step 1: Menü öğesi ve metinler**

```diff
diff --git a/public/_locales/en/messages.json b/public/_locales/en/messages.json
index eb79e2a..22c0c3f 100644
--- a/public/_locales/en/messages.json
+++ b/public/_locales/en/messages.json
@@ -31,6 +31,7 @@
   "menuLabel": { "message": "Copy options" },
   "menuCopyMarkdown": { "message": "Copy as Markdown" },
   "menuCopyJson": { "message": "Copy as JSON" },
+  "menuCopyCurl": { "message": "Copy as cURL" },
   "menuCopyDocLink": { "message": "Copy link to this log" },
   "menuCopyFixedView": { "message": "Copy view with fixed time" },
   "markdownOpenInKibana": { "message": "Open in Kibana" },
diff --git a/public/_locales/tr/messages.json b/public/_locales/tr/messages.json
index d7f111f..3ed62a2 100644
--- a/public/_locales/tr/messages.json
+++ b/public/_locales/tr/messages.json
@@ -31,6 +31,7 @@
   "menuLabel": { "message": "Kopyalama seçenekleri" },
   "menuCopyMarkdown": { "message": "Markdown olarak kopyala" },
   "menuCopyJson": { "message": "JSON olarak kopyala" },
+  "menuCopyCurl": { "message": "cURL olarak kopyala" },
   "menuCopyDocLink": { "message": "Logun linkini kopyala" },
   "menuCopyFixedView": { "message": "Görünümü sabit zamanla kopyala" },
   "markdownOpenInKibana": { "message": "Kibana'da aç" },
diff --git a/src/content/ActionBar.tsx b/src/content/ActionBar.tsx
index 50c412f..7d6d57c 100644
--- a/src/content/ActionBar.tsx
+++ b/src/content/ActionBar.tsx
@@ -1,6 +1,7 @@
 // The per-document action bar (spec §7.7): link actions, Discover actions, then the copy menu.
 import { type SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
 import type { Action, Config, Environment } from "../core/config";
+import { buildCurl, requestPrefix } from "../core/curl";
 import { type DiscoverButton, buildDiscoverButtons } from "../core/discover-actions";
 import { flattenDoc } from "../core/fields";
 import { buildJson } from "../core/json-copy";
@@ -97,6 +98,7 @@ export function ActionBar({ identity, actions, client, prefix, hash, copy, envir
   }, [state, actions, prefix, dataViewId, hash, environment]);
 
   const jsonFields = useMemo(() => (state.status === "ready" ? jsonTextFields(state.hit._source ?? {}) : []), [state]);
+  const hasRequest = useMemo(() => state.status === "ready" && requestPrefix(state.hit._source ?? {}) !== undefined, [state]);
 
   if (state.status !== "ready") {
     return (
@@ -145,6 +147,8 @@ export function ActionBar({ identity, actions, client, prefix, hash, copy, envir
         }),
     },
     { label: t("menuCopyJson"), text: () => buildJson(hit, copy.maskPatterns, copy.valueMasks) },
+    // Plan 7 spec §6: only for a log that records a request, so buildCurl returns a command here.
+    ...(hasRequest ? [{ label: t("menuCopyCurl"), text: () => buildCurl(hit, copy.maskPatterns, copy.valueMasks) ?? null }] : []),
     { label: t("menuCopyDocLink"), text: docUrl },
     { label: t("menuCopyFixedView"), text: () => fixedTimeUrl(location.href, new Date()) },
   ];
```

- [ ] **Step 2: Seed: iki Symfony biçimli istek logu**

```diff
diff --git a/docker/seed.mjs b/docker/seed.mjs
index 7d8d8b9..a4228f5 100644
--- a/docker/seed.mjs
+++ b/docker/seed.mjs
@@ -80,6 +80,64 @@ for (let i = 1; i <= 30; i++) {
     },
   );
 }
+// app-031 and app-032 (Plan 7): request logs shaped like the team's Symfony listeners, where every header maps to a
+// list of values and a form body arrives as JSON. Older than every other app_log log and of user 100009, so other
+// specs' rows, counts and windows stay the same. tests/e2e/copy.spec.ts expects their cURL copies exactly.
+const symfonyHeaders = (headers) => JSON.stringify(Object.fromEntries(Object.entries(headers).map(([name, value]) => [name, [value]])));
+const requestLog = (n, appName, context) => ({
+  message: "User action processed",
+  level: 200,
+  level_name: "INFO",
+  channel: "request",
+  datetime: minutesBefore(200 + n),
+  app_name: appName,
+  user_id: 100009,
+  context: { ip: `10.0.0.${n}`, user_agent: "dev/1.0", ...context },
+  extra: { uid: `uid-${pad(n)}` },
+});
+add(
+  { index: { _index: "app_log", _id: "app-031" } },
+  requestLog(31, "admin", {
+    method: "POST",
+    url: "https://backoffice.example.com/player/search",
+    headers: symfonyHeaders({
+      host: "backoffice.example.com",
+      "user-agent": "dev/1.0",
+      accept: "text/html",
+      "accept-encoding": "gzip, br",
+      "content-type": "application/x-www-form-urlencoded",
+      "content-length": "120",
+      cookie: "PHPSESSID=synthetic-session",
+      "x-forwarded-for": "10.0.0.31",
+      "x-forwarded-proto": "https",
+      "cf-ray": "synthetic-ray",
+      "x-php-ob-level": "1",
+      origin: "https://backoffice.example.com",
+    }),
+    body: JSON.stringify({ searchForm: { email: "dev@example.com", phone: "0555 000 00 00", note: "Ali'nin <b>notu</b>" }, _token: "synthetic-csrf" }),
+    query: JSON.stringify({ page: "2", filter: { status: "active" } }),
+  }),
+);
+add(
+  { index: { _index: "app_log", _id: "app-032" } },
+  requestLog(32, "api", {
+    method: "POST",
+    url: "https://api.example.com/v1/player/password",
+    headers: symfonyHeaders({
+      host: "api.example.com",
+      "user-agent": "app/2.0",
+      accept: "application/json",
+      "accept-encoding": "gzip",
+      "content-type": "application/json",
+      authorization: "Bearer synthetic-token-32",
+      "platform-token": "synthetic-platform",
+      "cf-visitor": '{"scheme":"https"}',
+      "x-forwarded-proto": "https",
+    }),
+    body: JSON.stringify({ oldPassword: "synthetic-old", newPassword: "synthetic-new", note: "Ali'nin şifresi", settings: JSON.stringify({ lang: "tr" }) }),
+    query: "[]",
+  }),
+);
 for (let i = 1; i <= 10; i++) {
   add({ index: { _index: "legacy_log", _id: `legacy-${pad(i)}` } }, { message: `legacy event ${i}`, datetime: minutesBefore(i), user_id: 500000 + i });
 }
```

- [ ] **Step 3: Uçtan uca senaryolar**

```diff
diff --git a/tests/e2e/copy.spec.ts b/tests/e2e/copy.spec.ts
index d33d1af..a634e2d 100644
--- a/tests/e2e/copy.spec.ts
+++ b/tests/e2e/copy.spec.ts
@@ -10,6 +10,9 @@ test.beforeEach(async ({ configure }) => {
 
 const APP_001 = { dataViewId: "app-log", query: 'extra.uid:"uid-001"' };
 const APP_002 = { dataViewId: "app-log", query: 'extra.uid:"uid-002"' };
+// Plan 7: Symfony-shaped request logs (docker/seed.mjs); "Copy as cURL" is menu item 2 there.
+const APP_031 = { dataViewId: "app-log", query: 'extra.uid:"uid-031"' };
+const APP_032 = { dataViewId: "app-log", query: 'extra.uid:"uid-032"' };
 // app-002's context.request (PAYMENT_XML, values masked) and context.response (PAYMENT_RESPONSE_XML) as JSON (docker/seed.mjs).
 const REQUEST = { Envelope: { Body: { pay: { identitynumber: "***", iban: "***", gsm: "***", card: "***", amount: "150" } } } };
 const RESPONSE = {
@@ -59,6 +62,43 @@ test("copies the log as JSON with its JSON and XML text expanded and masked", as
   expect(copied._source.context.headers).toEqual({ "user-agent": "dev/1.0", authorization: "***" });
 });
 
+test("copies a form request as a cURL command with proxy headers dropped and values masked", async ({ context }) => {
+  // Plan 7 spec §5: query and form body in http_build_query form, cookie, _token and the mobile number masked.
+  const { page, detail } = await openDoc(context, APP_031);
+  expect(await copyFromMenu(page, detail, 2)).toBe(
+    [
+      "curl 'https://backoffice.example.com/player/search?page=2&filter[status]=active'",
+      "--globoff",
+      "-H 'user-agent: dev/1.0'",
+      "-H 'accept: text/html'",
+      "-H 'content-type: application/x-www-form-urlencoded'",
+      "-H 'cookie: ***'",
+      "-H 'origin: https://backoffice.example.com'",
+      "--data-raw 'searchForm[email]=dev%40example.com&searchForm[phone]=***&searchForm[note]=Ali'\\''nin%20%3Cb%3Enotu%3C%2Fb%3E&_token=***'",
+      "--compressed",
+    ].join(" \\\n  "),
+  );
+});
+
+test("copies a JSON request as a cURL command, keeping JSON text inside the body as text", async ({ context }) => {
+  const { page, detail } = await openDoc(context, APP_032);
+  expect(await copyFromMenu(page, detail, 2)).toBe(
+    [
+      "curl 'https://api.example.com/v1/player/password'",
+      "-H 'user-agent: app/2.0'",
+      "-H 'accept: application/json'",
+      "-H 'content-type: application/json'",
+      "-H 'authorization: ***'",
+      "-H 'platform-token: ***'",
+      `--data-raw '{"oldPassword":"***","newPassword":"***","note":"Ali'\\''nin şifresi","settings":"{\\"lang\\":\\"tr\\"}"}'`,
+      "--compressed",
+    ].join(" \\\n  "),
+  );
+  // The other items move down one: the log link is now item 3.
+  await expect(bar(detail).getByRole("status")).toBeHidden(); // the next copy's notice must be its own
+  expect(await copyFromMenu(page, detail, 3)).toBe(`${stack.origin}${prefixOf()}/app/discover#/doc/app-log/app_log?id=app-032`);
+});
+
 test("copies the log link, and the link opens the same log", async ({ context }) => {
   const { page, detail } = await openDoc(context, APP_001);
   expect(await copyFromMenu(page, detail, 2)).toBe(DOC_LINK);
diff --git a/tests/e2e/kibana.ts b/tests/e2e/kibana.ts
index bf53d75..910a412 100644
--- a/tests/e2e/kibana.ts
+++ b/tests/e2e/kibana.ts
@@ -55,8 +55,11 @@ export async function barLinks(detail: Locator): Promise<Record<string, string>>
   return Object.fromEntries(entries);
 }
 
-/** Runs a copy menu item (0 Markdown, 1 JSON, 2 log link, 3 view with fixed time) and returns what it copied. */
-export async function copyFromMenu(page: Page, detail: Locator, item: 0 | 1 | 2 | 3): Promise<string> {
+/**
+ * Runs a copy menu item and returns what it copied: 0 Markdown, 1 JSON, then 2 log link and 3 view with fixed time.
+ * A log that records a request has "Copy as cURL" at 2, which moves the other two down (Plan 7 spec §6).
+ */
+export async function copyFromMenu(page: Page, detail: Locator, item: 0 | 1 | 2 | 3 | 4): Promise<string> {
   await bar(detail).locator(".kt-menu > button").click();
   await bar(detail).getByRole("menuitem").nth(item).click();
   await expect(bar(detail).getByRole("status")).toBeVisible();
```

- [ ] **Step 4: Birim ve derleme kontrolleri**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest && node --check docker/seed.mjs
```
Expected: 430 test geçer (birim testi eklenmedi); typecheck hatasız; build, manifest ve seed sözdizimi kontrolleri geçer.

- [ ] **Step 5: Yeni seed'i yükle ve uçtan uca matrisi çalıştır**

```bash
./docker/up.sh 7 && ./docker/up.sh 8 && ./docker/up.sh 9
KT_STACK=7 npm run e2e && KT_STACK=8 npm run e2e && KT_STACK=9 npm run e2e
KT_STACK=7 npx playwright test copy --repeat-each=3
KT_STACK=9 npx playwright test copy --repeat-each=3
```
Expected:
- 7.17'de 27 geçer, 3 atlanır; 8.19'da 27 ve 3; 9.5'te 28 ve 3.
- `--repeat-each=3`: iki yığında da 24 geçer.

Bir senaryo geçmezse beklenen metni değiştirerek "düzeltme". Önce komutun spec §5'e uyup uymadığına bak; uymuyorsa `curl.ts`'i düzelt ve Task 1'in birim testine aynı durumu ekle.

- [ ] **Step 6: Commit**

```bash
git branch --show-current   # plan-7-curl-copy
git add src/content/ActionBar.tsx public/_locales/en/messages.json public/_locales/tr/messages.json docker/seed.mjs tests/e2e/kibana.ts tests/e2e/copy.spec.ts
git commit -m "feat: add \"Copy as cURL\" to the copy menu for logs that record a request

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Belgeler: README, CHANGELOG, CLAUDE.md, store listing

**Files:**
- Modify: `README.md`, `CHANGELOG.md`, `CLAUDE.md`, `docs/store-listing.md`

**Interfaces:**
- Consumes: Task 1 ve 2'nin davranışı (spec §4–§6).
- Produces: yok.

- [ ] **Step 1: Belgeleri güncelle**

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index 5cceb29..c3e9432 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -24,6 +24,9 @@ First public release, for Kibana 7.17, 8.x and 9.x in Chrome.
   and in placeholders. Namespace prefixes are dropped, attributes become `@name` and the text beside them
   `#text`, and every value stays text. "Copy as JSON" writes `_index`, `_id` and `_source` with all JSON and
   XML text expanded; field-name masks now reach XML element names too.
+- "Copy as cURL" for logs that record an HTTP request (`method`, `url`, and optionally `headers`, `body` and
+  `query`, as in Symfony request logs): a bash command that sends the request again, with proxy headers dropped
+  and the same masks as the other copies.
 - Options page: environments with per-site access, an action editor with a live preview, copy and masking
   settings, export and import.
 - Environment variables: `{env.name}` placeholders take each environment's own value, set in a variables
diff --git a/CLAUDE.md b/CLAUDE.md
index 87b4798..68fdedc 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -28,7 +28,7 @@ Dev Kibana stacks: `./docker/up.sh 7|8|9` starts Kibana 7.17.29 on :17601 under
 **The content script is not in the manifest.** The manifest has only `storage` + `scripting` and `optional_host_permissions`. When the user adds a Kibana environment on the options page, the options page requests that origin. `entrypoints/background.ts` → `src/background/registration.ts` then registers `kibana.js` with `scripting.registerContentScripts` for the granted origins only. It re-syncs on install, startup, permission changes and config changes, one run at a time (`serialized`). `scripts/check-manifest.mjs` fails if `content_scripts` or `host_permissions` ever appear in the built manifest.
 
 **Layers:**
-- `src/core/` is pure logic with no browser APIs: the config schema (zod), field flattening (which also expands JSON and XML text; `xml.ts` is the XML parser), `{path|fallback}` templates, conditions, and copy masking: by field name (`mask.ts`) and inside values (`value-mask.ts`: IBAN, TCKN, GSM, card).
+- `src/core/` is pure logic with no browser APIs: the config schema (zod), field flattening (which also expands JSON and XML text; `xml.ts` is the XML parser), `{path|fallback}` templates, conditions, and copy masking: by field name (`mask.ts`) and inside values (`value-mask.ts`: IBAN, TCKN, GSM, card). `curl.ts` writes the request a log records as a masked cURL command.
 - `src/kibana/` handles Kibana I/O and URL/state parsing.
 - `src/adapters/` only reads the DOM.
 - `src/theme.ts` holds every color: the Borealis light and dark palettes, as `--kt-*` custom properties for the bar's shadow root and the options page. `tests/unit/theme.test.ts` fails if a pair drops below its WCAG contrast floor.
@@ -49,7 +49,7 @@ Dev Kibana stacks: `./docker/up.sh 7|8|9` starts Kibana 7.17.29 on :17601 under
 - Render log values through React only; never use `innerHTML`. Log field values in URL templates go through `encodeURIComponent`, and templates must start with `http(s)://` or an `{env.…}` placeholder.
 - Settings validation repairs, it does not reject, unknown environmentIds: parseConfig drops them and disables an action left with none (an empty list would mean "all environments").
 - XML text is parsed by `src/core/xml.ts`, never `DOMParser`: core has no browser APIs, and happy-dom (the unit tests' DOM) rejects CDATA and undeclared prefixes that Chrome accepts. Its values are always strings; `@name` keys are attributes and `#text` the text beside them, so the placeholder pattern allows `#`.
-- The copies run `expandStructured` before `maskValue`; `maskValue` masks any JSON or XML text still left past the 5-level expansion cap as a whole.
+- The copies run `expandStructured` before `maskValue`; `maskValue` masks any JSON or XML text still left past the 5-level expansion cap as a whole. The cURL copy is the exception: it must send the request as it was, so `curl.ts` masks JSON text inside and writes it back as text, and leaves HTML/XML text as text with only the value masks.
 - `{env.<name>}` placeholder paths are environment variables, never log fields. Their values go into link URLs unencoded (they come from the user's settings, not the log); field values are always encoded.
 - A settings schema change bumps `schemaVersion` and converts older input inside `parseConfig`. `storage.ts` turns anything `parseConfig` rejects into the empty config, so a missing conversion silently wipes stored settings.
 - A new UI string needs an entry in both `public/_locales/en/messages.json` and `public/_locales/tr/messages.json`. `MessageKey` in `src/i18n.ts` is derived from the English file, and `tests/unit/i18n.test.ts` keeps the two in step.
@@ -57,4 +57,4 @@ Dev Kibana stacks: `./docker/up.sh 7|8|9` starts Kibana 7.17.29 on :17601 under
 
 ## Docs
 
-Code comments cite the design spec by section (`spec §5.1`). The spec and plans live in `docs/superpowers/`, which is gitignored, local-only and written in Turkish, so a fresh clone won't have them. `docs/verification/` is tracked. Plans 1 (link actions), 2 (Discover actions, copy/mask, JSON view, full options page), 3 (e2e matrix, CI, store package), 4 (environment variables, data views by name), 5 (masking inside values) and 6 (XML as JSON, "Copy as JSON") are done. `.github/workflows/ci.yml` runs the unit checks and the e2e matrix on every pull request.
+Code comments cite the design spec by section (`spec §5.1`). The spec and plans live in `docs/superpowers/`, which is gitignored, local-only and written in Turkish, so a fresh clone won't have them. `docs/verification/` is tracked. Plans 1 (link actions), 2 (Discover actions, copy/mask, JSON view, full options page), 3 (e2e matrix, CI, store package), 4 (environment variables, data views by name), 5 (masking inside values), 6 (XML as JSON, "Copy as JSON") and 7 ("Copy as cURL") are done. `.github/workflows/ci.yml` runs the unit checks and the e2e matrix on every pull request.
diff --git a/README.md b/README.md
index a39fc2e..f4070a1 100644
--- a/README.md
+++ b/README.md
@@ -13,7 +13,7 @@ a bar above it with:
 - **Link actions** that jump to another system with a value from the log, e.g. `https://admin.example.com/users/{user_id}`.
 - **Discover actions** that open related logs in a new tab: the same user's logs, or everything ±5 minutes around this log.
 - **JSON**: fields that hold JSON or XML text, such as a request body, as a tree you can search and copy from.
-- **⋯** to copy the log as Markdown or JSON with sensitive fields and values masked, a link to the log, or the current view with its time range fixed.
+- **⋯** to copy the log as Markdown or JSON with sensitive fields and values masked, the request it records as a cURL command, a link to the log, or the current view with its time range fixed.
 
 ## Set up
 
@@ -89,6 +89,21 @@ A number glued to a letter or another digit is left alone, so IDs inside longer
 Masking applies to what you copy; the screen and your link templates are not changed. It is a best effort:
 read the copy before you share it.
 
+### Copy as cURL
+
+A log that records an HTTP request, with a `method` and an absolute `http(s)` `url` under `context` or at the top
+level, also gets "Copy as cURL": a bash or zsh command that sends the request again.
+
+- `headers`, `body` and `query` are read from the same place. Each may be JSON text, as in Symfony request logs.
+- The query is added to the URL, and a form body is written back as `a[b]=c`, the way PHP reads it. Multipart
+  fields become `--form-string` options; uploaded files are not in the log, so they are left out.
+- Transport, proxy and CDN headers are dropped: `host`, `content-length`, `connection`, `accept-encoding`,
+  `forwarded`, `x-forwarded-*`, `x-real-ip`, `cf-*`, `cdn-loop` and `x-php-ob-level`. `accept-encoding` becomes
+  `--compressed`.
+- The command is masked like the other copies, so a token reads `-H 'authorization: ***'`: put in your own before
+  you run it. JSON text inside the request is masked inside and stays JSON text; HTML and XML text stays as it is,
+  with only the value masks.
+
 ## Privacy
 
 kibanatool talks only to the Kibana addresses you add, with your own session, and keeps its settings in your
diff --git a/docs/store-listing.md b/docs/store-listing.md
index 7bbb305..a2a65f1 100644
--- a/docs/store-listing.md
+++ b/docs/store-listing.md
@@ -29,6 +29,7 @@ It works on Kibana 7.17, 8.x and 9.x.
   inside XML or plain-text request bodies.
 - Read XML request and response bodies as a JSON tree too, and copy the whole log as JSON with the XML and JSON
   text inside it expanded and masked like the Markdown copy.
+- Copy the HTTP request a log records as a cURL command, with tokens and cookies masked, to send it again.
 
 You choose which Kibana addresses it runs on. It talks only to your Kibana, with your own session, and keeps
 its settings in your browser. Open source: https://github.com/cllakyz/kibanatool
@@ -47,6 +48,7 @@ Kibana 7.17, 8.x ve 9.x'te çalışır.
   gövdelerinin içinde olsalar bile.
 - XML istek ve yanıt gövdelerini de JSON ağacı olarak okuyun, logun tamamını içindeki XML ve JSON metinleri
   açılmış ve Markdown kopyası gibi maskelenmiş halde JSON olarak kopyalayın.
+- Logun kaydettiği HTTP isteğini, token ve çerezleri maskelenmiş bir cURL komutu olarak kopyalayıp tekrar gönderin.
 
 Hangi Kibana adreslerinde çalışacağını siz seçersiniz. Yalnızca kendi Kibana'nızla, kendi oturumunuzla konuşur,
 ayarlarını tarayıcınızda tutar. Açık kaynak: https://github.com/cllakyz/kibanatool
```

- [ ] **Step 2: Kontroller**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest
```
Expected: 430 test geçer; diğerleri hatasız.

- [ ] **Step 3: Commit**

```bash
git branch --show-current   # plan-7-curl-copy
git add README.md CHANGELOG.md CLAUDE.md docs/store-listing.md
git commit -m "docs: describe \"Copy as cURL\"

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Doğrulama ve PR

**Files:**
- Create: `docs/verification/2026-10-plan-7.md`

- [ ] **Step 1: Bütün otomatik kontroller**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest && npm run zip
KT_STACK=7 npm run e2e && KT_STACK=8 npm run e2e && KT_STACK=9 npm run e2e
```
Bir sonraki adımdaki tabloya şu sonuçları yaz:
- test sayıları;
- e2e'de geçen ve atlanan testlerin sayıları ve süreleri;
- zip dosyasının boyutu.

- [ ] **Step 2: Doğrulama kaydını yaz**

`docs/verification/2026-10-plan-7.md` dosyasını oluştur. Değerler Step 1'in gerçek çıktısından ve Task 2'nin `--repeat-each` koşusundan gelir.

```markdown
# Plan 7 doğrulaması ("cURL olarak kopyala")

- **Tarih:** <YYYY-MM-DD>
- **Dal:** `plan-7-curl-copy`, HEAD `<kısa SHA>` (kayıt commit'inden önceki HEAD)
- **Kibana:** 7.17.29 (`http://localhost:17601/kibana`), 8.19.23 (`http://localhost:18601`), 9.5.5 (`http://localhost:19601`)
- **Araçlar:** Playwright <sürüm>, Chromium <sürüm>, Node <sürüm>

## Otomatik kontroller

| Kontrol | Sonuç |
|---|---|
| `npm test` | <N> test geçti (<M> dosya) |
| `npm run typecheck`, `npm run build`, `npm run check:manifest` | <sonuç> |
| `npm run zip` | <dosya, boyut> |
| E2E 7.17 | <geçti, atlandı, süre> |
| E2E 8.19 | <geçti, atlandı, süre> |
| E2E 9.5 | <geçti, atlandı, süre> |
| `--repeat-each=3` (`copy`; 7.17 ve 9.5) | <sonuç> |

## Elle kontroller

| # | Kontrol | Sonuç |
|---|---|---|
| M1 | Kullanıcının Chrome'unda eklenti bu dalın derlemesiyle yenilendi (`chrome://extensions` → yenile). Alpha'da bir `player_action_log` GET kaydında "cURL olarak kopyala" görünüyor. Komutta `authorization` ve `platform-token` `***`, proxy header'ları yok. Kullanıcı kendi token'ını yazıp çalıştırdı; istek yanıt verdi. | |
| M2 | Alpha'da bir `user_action_log` form POST'unun cURL kopyası alındı. `cookie` ve `_token` `***`, body `a[b]=c` biçiminde, HTML/JSON metni tutan alanlar metin olarak. POST çalıştırılmadı. Method'u ve URL'si olmayan bir logda (ör. `payment_log`) öğe görünmüyor. | |
```
Tarih, SHA ve sürüm alanlarını gerçek değerlerle doldurmadan dosyayı commit etme.

- [ ] **Step 3: Elle kontrolleri kullanıcıdan iste**

1. **M1.** Kullanıcı eklentiyi bu dalın derlemesiyle (`.output/chrome-mv3`) yeniler. Alpha'da bir `player_action_log` GET kaydının cURL kopyasını alır, kendi token'ını yazıp terminalde çalıştırır.
2. **M2.** Kullanıcı Alpha'da bir `user_action_log` form POST'unun cURL kopyasını alır ve metne bakar. POST'u çalıştırmaz. Bir `payment_log` kaydında menüde öğenin olmadığına bakar.
3. Her iki kontrolde:
   - Kopyalanan komutu ve token'ı sohbete istemezsin, okumazsın ve yazmazsın. Gerçek kişisel veri içerir.
   - Sonucu kullanıcının "geçti" ya da "geçmedi" yanıtı belirler.
4. Sonuçları tabloya yaz.
5. Bir kontrol geçmezse dur ve kullanıcıya sor. Kendi başına düzeltme yapma.

- [ ] **Step 4: Kayıt commit'i**

```bash
git branch --show-current   # plan-7-curl-copy
git add docs/verification/2026-10-plan-7.md
git commit -m "docs: record Plan 7 verification

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Push ve PR, yalnızca kullanıcı onaylarsa**

`superpowers:finishing-a-development-branch` becerisini kullan. Kullanıcı "push ve PR" seçeneğini seçerse:
1. Global Constraints'teki komutla push et.
2. `GH_TOKEN=$(gh auth token --user cllakyz) gh pr create --base main` ile PR aç.
3. PR açıklamasında şunlar olsun:
   - değişikliklerin kısa listesi;
   - test planı: birim testleri, üç e2e yığını, M1 ve M2;
   - doğrulama kaydının yolu.
4. Açıklama `🤖 Generated with [Claude Code](https://claude.com/claude-code)` satırıyla biter.

Merge, etiket ve sürüm kullanıcının kararıdır.

## Otomatik kontroller

| Kontrol | Nerede |
|---|---|
| Birim testleri: 410 → 430 | Task 1 |
| `npm run typecheck`, `build`, `check:manifest` | Her task |
| E2E 7.17 / 8.19 / 9.5: 27+3 / 27+3 / 28+3 | Task 2, Task 4 |
| `--repeat-each=3` (`copy`; 7.17 ve 9.5) | Task 2 |
| `npm run zip` | Task 4 |

## Elle kontroller

| # | Kontrol | Kim |
|---|---|---|
| M1 | Alpha'da `player_action_log` GET: cURL kopyası, maskeler, kullanıcının token'ıyla çalıştırma | Kullanıcı |
| M2 | Alpha'da `user_action_log` form POST: maskeler, form kodlaması, iç metinler; uygun olmayan logda öğe yok | Kullanıcı |
