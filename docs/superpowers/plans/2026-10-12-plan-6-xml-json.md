# kibanatool Plan 6 — XML'i JSON Olarak Gösterme ve Kopyalama: Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Loglardaki XML metnini (SOAP istek ve yanıt gövdeleri) JSON gibi bir yapıya çevirmek. Dört yerde görünür:
- JSON görünümünde ağaç olarak;
- alan haritasında, yani şablonlarda ve koşullarda;
- Markdown kopyasında json bloğu olarak;
- ⋯ menüsündeki yeni "JSON olarak kopyala"da: log, içindeki XML ve JSON metinleri açılmış ve maskelenmiş halde kopyalanır.

**Architecture:**
- **Ayrıştırma:** Yeni ve saf bir modül, `src/core/xml.ts` (`parseXml`). Kendi küçük, katı ayrıştırıcımız; `DOMParser` ve yeni bağımlılık yok.
- **Tek giriş noktası:** `src/core/fields.ts`'te `parseStructuredText` (JSON ya da XML metni) ve `expandStructured` (bir değerin içindeki bütün yapılı metinleri en fazla 5 seviye açar). Alan haritası, JSON görünümü, Markdown kopyası ve JSON kopyası bunları kullanır.
- **Kopyalar önce açar, sonra maskeler.** `maskValue` artık metni ayrıştırmaz. Alan adı desenleri böylece XML eleman adlarına da ulaşır.
- **JSON kopyası:** Yeni `src/core/json-copy.ts` (`buildJson`), ⋯ menüsünde 2. sıra.

**Tech Stack:** Plan 5 ile aynı, yeni bağımlılık yok.
- Uygulama: WXT 0.21, React 19, TypeScript 5.9 (strict)
- Kütüphaneler: zod 4
- Test: Vitest 5, happy-dom 20, Playwright 1.64
- Ortam: Docker (Elasticsearch + Kibana 7.17.29 / 8.19.23 / 9.5.5)

**Spec:** `docs/superpowers/specs/2026-10-12-xml-json-design.md`, kullanıcı 2026-10-12'de onayladı. Ana spec: `docs/superpowers/specs/2026-10-07-kibanatool-design.md`. Değere göre maskeleme: `docs/superpowers/specs/2026-10-12-value-masks-design.md` (Plan 5).

**Önceki planlar:** Plan 1–5 `main`'de. Son merge commit'i `e65fbcd` (PR #6).

**Çalışma dalı:** Ana checkout'ta yeni dal `plan-6-xml-json` açılır, worktree açılmaz. `docs/superpowers/` hiçbir commit'e girmez.

**Sürüm:** Bu özellik yayınlanmamış 1.0.0'a dahil (kullanıcı kararı). `package.json` sürümü değişmez. Ayar şeması değişmez (`schemaVersion: 3`).

### Planların sırası

| Plan | Kapsam |
|---|---|
| 1–5 (tamamlandı) | Link ve Discover aksiyonları, kopyalama, JSON görünümü, ayarlar sayfası, uçtan uca matris, CI, mağaza paketi, ortam değişkenleri, adla data view, değerin içinde maskeleme |
| **6 (bu plan)** | XML'i JSON olarak okuma: JSON görünümü, alan haritası, Markdown kopyası, "JSON olarak kopyala" |

### Kararlar

Hepsi kullanıcıyla 2026-10-12'de tek tek alındı. Tam tablo spec §2'de.

| Konu | Karar |
|---|---|
| JSON kopyası | ⋯ menüsüne yeni "JSON olarak kopyala". Kibana'nın kendi JSON sekmesine dokunulmaz. |
| Namespace | Önek atılır (`soap:Envelope` → `Envelope`), `xmlns` bildirimleri atılır. |
| Attribute | `@` önekli anahtar. Attribute ile birlikte metin varsa `#text`. Yer tutucu deseni `#`'i de kabul eder. |
| Değer türü | Hep metin. Boş eleman `""`. |
| Tekrar | İki ve daha fazla aynı adlı kardeş dizi olur, tek olan değer olarak kalır. |
| İç içe metin | XML ya da JSON metni içindeki XML ve JSON metni de açılır, en fazla 5 seviye. |
| XML tanımı | Tek kök, baştan sona düzgün biçimli. `<?xml` bildirimi şart değil. Eleman derinliği en fazla 100. |
| Kopyanın kapsamı | `_index`, `_id`, `_source`. JSON metinleri de açılır. Alan adı ve değer desenleriyle maskelenir. |
| Markdown | XML alanları da json bloğuna çevrilir. |
| Alan haritası | XML yolları şablonlarda, koşullarda ve Markdown alan listesinde kullanılabilir. |
| Ayrıştırıcı | Yaklaşım A: `src/core/xml.ts`, kendi ayrıştırıcımız. |
| Ayar | Yok. Dönüşüm hep açık. |
| Seed | app-002'ye sentetik bir XML yanıtı eklenir (spec §8.2). |
| Store listing | EN ve TR birer madde eklenir. |
| Eklenti sürümü | 1.0.0'a dahil. |

### Plan yazılırken netleşen ayrıntılar

Spec'in söylemediği, plan yazılırken kodda karar verilen noktalar. Kullanıcı planı incelerken bunları da onaylar ya da düzeltir:

1. **Önek atılınca kalan yerel ad harf ya da `_` ile başlamalı.** `<a:1>` gibi bir eleman XML sayılmaz, metin kalır. Sebep: JS nesneleri tamsayıya benzeyen anahtarları (`"1"`) öne alır, eleman sırası bozulurdu. Bu, spec §4.1'deki "geçersiz ad" kuralının biraz daha sıkı hali.
2. **JSON görünümündeki `XML` etiketi butonun metnine eklenir** (`context.request · XML`). Yeni renk ya da stil yok, bu yüzden kontrast testleri etkilenmez.
3. **`parseJsonText` `fields.ts`'te dışa açılmayan bir yardımcı olarak kalır.** Task 2'de `mask.ts` ve `markdown.ts` onu hâlâ kullandığı için geçici olarak dışa açıktır; Task 3 `export`'u kaldırır.
4. **Bir alan adı deseni yapılı bir alanın tamamını maskeliyorsa** Markdown'da bugünkü gibi tek satır yazılır (`` - `alan`: *** ``), json bloğu açılmaz.

### Plan yazılırken yapılan denemeler (2026-10-12)

| Deneme | Sonuç |
|---|---|
| Alpha ölçümü (spec §3) | SOAP zarfları, namespace önekleri, altenar'da attribute'lar, tjk'da kaçışlı iç XML. CDATA, karışık içerik ve attribute + metin hiç yok. En büyük XML ~2 KB, en derin 8 seviye. |
| happy-dom'un `DOMParser`'ı | CDATA'yı hata sayıyor, bildirimsiz öneki (`<ns1:a>`) reddediyor. Seed'deki `PAYMENT_XML` bildirimsiz önek kullanıyor. Yaklaşım A bu yüzden seçildi. |
| Bu planın kodu, `main`'in (`e65fbcd`) geçici bir worktree kopyasına Task 1–5'teki haliyle sırayla uygulandı | `npm test`: Task 1 sonunda 382, Task 2 sonunda 391, Task 3 sonunda 404 test; hepsi geçti. Her task sonunda `npm run typecheck` hatasız. Task 3 sonunda `npm run build` ve `npm run check:manifest` geçti. `node --check docker/seed.mjs` geçti. |
| E2E, Task 4'teki seed ve testlerle | Yeni seed üç yığına yüklendi. Tam matris: 7.17'de 25 geçti, 3 atlandı (36,6 sn); 8.19'da 25 ve 3 (42,0 sn); 9.5'te 26 ve 3 (1,1 dk). Önceki sayılar 23/23/24'tü; her yığında iki yeni senaryo eklendi. Deneme sonunda yığınlara `main`'in seed'i geri yüklendi. |
| 1 MB XML | `xml.test.ts`'teki 1 MB testi 1 saniye sınırının çok altında geçti. Ayrıştırıcıda özyineleme ve geri izleme yok. |

### Uygulama notları

- **Diff'ler.** Mevcut dosyalardaki değişiklikler `git diff` çıktısı olarak verildi. Satırlar `main` (`e65fbcd`) ve önceki task'ların sonucuna göredir. Elle uygulanabilir ya da diff bir dosyaya kaydedilip `git apply <dosya>` ile uygulanabilir. Yeni dosyaların tam içeriği verildi.
- **`parseJsonText` geçişi.** Task 2 `parseStructuredText`'i ekler ama `parseJsonText`'i dışa açık bırakır, çünkü `mask.ts` ve `markdown.ts` onu Task 3'e kadar kullanır. Böylece Task 2'de Markdown çıktısı değişmez. Task 3 bu iki dosyayı değiştirir ve `export`'u kaldırır.
- **E2E yalnız Task 4'te çalışır.** Task 3 menüye yeni öğe ekler. Task 3 ile Task 4 arasında `copy.spec` ve `spaces.spec`'in menü sıraları eskidir; bu yüzden e2e Task 3'te çalıştırılmaz.
- **Docker yığınları açık.** Task 4'te `./docker/up.sh 7`, `8` ve `9` seed'i yeniden yükler. Script, yığın açıkken de her çalıştırmada seed'i yükler.
- **`__proto__` testleri.** Beklenen değer `JSON.stringify`, `JSON.parse` ya da `Object.keys` ile yazılır. `{ "__proto__": … }` biçiminde bir nesne literal'i anahtar değil prototip atar.

## Global Constraints

- **Node ve npm:** Node `>=22`, paket yöneticisi `npm`. **Yeni bağımlılık eklenmez.**
- **TypeScript:** `typescript@5`, `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax` (tip import'ları `type` ile). `npm run typecheck`, `tests/e2e/` ve `playwright.config.ts` dosyalarını da kapsar.
- **Desteklenen Kibana sürümleri:** 7.17.29, 8.19.23 ve 9.5.5. Yalnızca Chrome MV3, yalnızca Discover.
- **Manifest izinleri değişmez:**
  - `permissions` tam olarak `["storage", "scripting"]`
  - `optional_host_permissions` tam olarak `["http://*/*", "https://*/*"]`
  - `npm run check:manifest` her task'ın sonunda geçer.
- **Ayar modeli:** değişmez. `schemaVersion: 3`, yeni ayar yok.
- **XML'in tanınması (spec §4.1):**
  - Kırpılmış metin `<` ile başlar ve baştan sona tek kök elemandır. Önünde ve arkasında yalnız `<?…?>`, yorum ve boşluk olabilir.
  - DOCTYPE, beş hazır ve sayısal entity dışında bir `&`, uyuşmayan/kapanmayan etiket, tırnaksız attribute, attribute değerinde `<`, aynı attribute iki kez, kök dışında metin, ikinci kök ya da 100'den derin iç içelik → metin kalır.
- **XML'in çevrilmesi (spec §4.2):**
  - Sonuç `{ <kökün yerel adı>: değer }`. Önekler ve `xmlns`/`xmlns:*` atılır.
  - Alt elemanı ve attribute'u olmayan eleman metnidir (boşsa `""`). Diğerleri nesnedir: `@attribute`'lar, sonra alt elemanlar, sonra `#text`.
  - Aynı anahtar tekrar ederse ilk yerinde dizi olur. Değerler hep metindir.
- **Açma (spec §5.1):** Bir değerin içinde en fazla 5 metin (`MAX_JSON_DEPTH`) iç içe ayrıştırılır.
- **Kopya (spec §6):**
  - "JSON olarak kopyala": `JSON.stringify({ _index, _id, _source }, null, 2)`, `_source` sırası korunur.
  - `_index` ve `_id` maskelenmez, taranmaz.
  - Menü sırası: Markdown, JSON, log linki, sabit zamanlı görünüm.
- **Gizlilik:**
  - Testlerde ve seed'de yalnız sentetik değerler kullanılır.
  - Alpha'dan ya da başka gerçek bir kaynaktan hiçbir değer koda, teste, commit'e ya da rapora girmez.
- **Kibana'yı bozmamak:** İçerik betiği hiçbir hatayı dışarı sızdırmaz; hatalar `console.debug("[kibanatool]", ...)` ile loglanır. `parseXml` hata fırlatmaz.
- **UI:**
  - Shadow DOM içinde React. `innerHTML` ya da `dangerouslySetInnerHTML` kullanılmaz.
  - Yeni kullanıcı metni `menuCopyJson` hem `public/_locales/en/messages.json` hem `public/_locales/tr/messages.json` dosyasına eklenir. `MessageKey` İngilizce dosyadan türetilir; `tests/unit/i18n.test.ts` iki dosyanın aynı anahtarları taşıdığını denetler.
- **Import yolları:**
  - `src/core/` tarayıcı API'si kullanmaz. `xml.ts` hiçbir şey import etmez; bağımlılık tek yönlüdür: `fields.ts` → `xml.ts`.
  - `src/i18n.ts`'i import eden React bileşenlerinin birim testi yazılmaz; onları uçtan uca testler sınar.
- **Uçtan uca testler:**
  - Yerelleştirilmiş metin doğrulanmaz. Kullanılan seçiciler: `data-test-subj`, ARIA rolleri, eklentinin sınıf adları, menü sırası. `XML` etiketi iki dilde de aynı olduğu için doğrulanabilir.
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
  - Her commit'ten önce `git branch --show-current` ile dalın `plan-6-xml-json` olduğu doğrulanır.

## Review Focus

1. **İç elemanlarda namespace bildirimi.** SOAP gövdelerinde varsayılan namespace (`<GetResult xmlns="http://tempuri.org/">`) ve iç elemanda `xmlns:ns1` olur. Bunlar `@xmlns` olarak görünmemeli, atılmalı. Test: Task 1, `xml.test.ts`.
2. **BOM ve Windows satır sonları.** .NET servislerinin yanıtları `\uFEFF<?xml…` ile ve `\r\n` satır sonlarıyla gelebilir. Yine XML sayılmalı. Test: Task 1, `xml.test.ts`.
3. **HTML hata sayfası.** `withdraw_log`'da bir yanıt HTML. JSON görünümünde listelenmemeli; Markdown'da bugünkü gibi metin olarak yazılmalı. Test: Task 2, `json-tree.test.ts`; Task 3, `markdown.test.ts`.
4. **Üst elemanı adlandıran desen.** `*.Body` gibi bir desen XML'deki bir üst elemanı gösteriyorsa, JSON kopyasında o elemanın tamamı bir kez `***` olmalı. Test: Task 3, `json-copy.test.ts`.
5. **Hash route'lu link şablonları.** Admin panelleri `{env.adminUrl}/#/users/{user_id}` gibi şablonlar kullanır. `#` yer tutucu desenine girince bunlar bozulmamalı. Test: Task 2, `template.test.ts`.

## Dosya yapısı

```
src/core/xml.ts                        (yeni)    parseXml
src/core/fields.ts                     (değişir) parseStructuredText, expandStructured; alan haritası XML'i açar
src/core/template.ts                   (değişir) yer tutucu deseninde #
src/core/json-tree.ts                  (değişir) JsonField.source, açılmış değer, .@ ve .# yol parçaları
src/content/JsonView.tsx               (değişir) listede "· XML" etiketi
src/core/mask.ts                       (değişir) maskValue metni ayrıştırmaz
src/core/markdown.ts                   (değişir) önce aç, sonra maskele; XML json bloğu
src/core/json-copy.ts                  (yeni)    buildJson
src/content/ActionBar.tsx              (değişir) "JSON olarak kopyala" menü öğesi
public/_locales/{en,tr}/messages.json  (değişir) menuCopyJson
docker/seed.mjs                        (değişir) app-002'ye context.response (sentetik XML)
tests/unit/core/xml.test.ts            (yeni)
tests/unit/core/json-copy.test.ts      (yeni)
tests/unit/core/{fields,template,json-tree,mask,markdown}.test.ts   (değişir)
tests/e2e/kibana.ts, copy.spec.ts, json.spec.ts, spaces.spec.ts     (değişir)
README.md, CHANGELOG.md, CLAUDE.md, docs/store-listing.md           (değişir)
docs/verification/2026-10-plan-6.md    (yeni, Task 6)
```

---

### Task 0: Dalı aç

- [ ] **Step 1: Ana checkout'ta `main`'den yeni dal aç**

```bash
git switch main && git pull --ff-only && git switch -c plan-6-xml-json
git status --short   # boş olmalı
npm test 2>&1 | tail -4   # başlangıç: 344 test geçer
```

Bu adımın commit'i yoktur.

---

### Task 1: XML ayrıştırıcı (`xml.ts`)

**Files:**
- Create: `src/core/xml.ts`
- Create: `tests/unit/core/xml.test.ts`

**Interfaces:**
- Consumes: yok.
- Produces (Task 2 kullanır):
  - `export function parseXml(text: string): Record<string, unknown> | undefined`. `text` düzgün biçimli tek kökü olan bir XML belgesiyse `{ <kökün yerel adı>: değer }`, değilse `undefined`. Hata fırlatmaz.

- [ ] **Step 1: Testi yaz**

`tests/unit/core/xml.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseXml } from "../../../src/core/xml";

const nested = (levels: number): string => "<a>".repeat(levels) + "x" + "</a>".repeat(levels);

describe("parseXml: conversion (Plan 6 spec §4.2)", () => {
  it("drops namespace prefixes and xmlns declarations, with or without a declaration", () => {
    const xml = '<?xml version="1.0"?><soap:Envelope xmlns:soap="http://s"><soap:Body><ns1:Id>7</ns1:Id></soap:Body></soap:Envelope>';
    expect(parseXml(xml)).toEqual({ Envelope: { Body: { Id: "7" } } });
    // Undeclared prefixes are fine too: the seeded PAYMENT_XML has none.
    expect(parseXml("<ns1:a><ns1:b>1</ns1:b></ns1:a>")).toEqual({ a: { b: "1" } });
  });

  it("writes attributes as @keys first, then children in first-seen order, and text beside attributes as #text", () => {
    expect(parseXml('<Bet xsi:type="T" Id="7"><Sel>A</Sel><Odd>2</Odd></Bet>')).toEqual({ Bet: { "@type": "T", "@Id": "7", Sel: "A", Odd: "2" } });
    expect(Object.keys(parseXml('<Bet Id="7"><Sel>A</Sel></Bet>')?.Bet as object)).toEqual(["@Id", "Sel"]);
    expect(parseXml('<Amount currency="TRY">150</Amount>')).toEqual({ Amount: { "@currency": "TRY", "#text": "150" } });
    expect(parseXml('<Bet Id="8" Type="S"/>')).toEqual({ Bet: { "@Id": "8", "@Type": "S" } });
    expect(parseXml('<Bet Id="8">  </Bet>')).toEqual({ Bet: { "@Id": "8" } });
  });

  it("joins the text of mixed content without the whitespace between elements", () => {
    expect(parseXml("<p>\n  Hello <b>x</b>\n  world\n</p>")).toEqual({ p: { b: "x", "#text": "\n  Hello \n  world\n" } });
    expect(parseXml("<p>\n  <b>x</b>\n  <i>y</i>\n</p>")).toEqual({ p: { b: "x", i: "y" } });
  });

  it("turns repeated keys into an array at their first place, in document order", () => {
    expect(parseXml("<r><Item>1</Item><Other>o</Other><Item>2</Item><Item>3</Item></r>")).toEqual({ r: { Item: ["1", "2", "3"], Other: "o" } });
    expect(Object.keys(parseXml("<r><Item>1</Item><Other>o</Other><Item>2</Item></r>")?.r as object)).toEqual(["Item", "Other"]);
    expect(parseXml('<r a:x="1" b:x="2"/>')).toEqual({ r: { "@x": ["1", "2"] } });
    expect(parseXml("<r><a:Id>1</a:Id><b:Id>2</b:Id></r>")).toEqual({ r: { Id: ["1", "2"] } });
  });

  it("keeps every value as text and an empty element as an empty string", () => {
    expect(parseXml("<r><Code>00</Code><Amount>1500</Amount><Ok>true</Ok><None/><Empty></Empty></r>")).toEqual({
      r: { Code: "00", Amount: "1500", Ok: "true", None: "", Empty: "" },
    });
    expect(parseXml("<a/>")).toEqual({ a: "" });
  });

  it("decodes the predefined and numeric entities and keeps CDATA and whitespace as they are", () => {
    expect(parseXml('<a q="&quot;&apos;&lt;">&amp;&lt;&gt;&#65;&#x42;&#x1F600;</a>')).toEqual({ a: { "@q": "\"'<", "#text": "&<>AB😀" } });
    expect(parseXml("<a><![CDATA[<x>1</x> & more]]></a>")).toEqual({ a: "<x>1</x> & more" });
    expect(parseXml("<a>  two  spaces\n</a>")).toEqual({ a: "  two  spaces\n" });
  });

  it("decodes escaped XML inside an element into text, for expandStructured to open", () => {
    expect(parseXml("<p>&lt;?xml version=\"1.0\"?&gt;&lt;race&gt;&lt;runId&gt;42&lt;/runId&gt;&lt;/race&gt;</p>")).toEqual({
      p: '<?xml version="1.0"?><race><runId>42</runId></race>',
    });
  });

  it("skips comments and processing instructions anywhere", () => {
    expect(parseXml("<!-- c --><?pi x?><a><!-- in --><?pi?>t</a><!-- after -->")).toEqual({ a: "t" });
  });

  it("drops a default namespace and xmlns declared on inner elements (Review Focus 1)", () => {
    const xml =
      '<s:Envelope xmlns:s="http://s"><s:Body><GetResult xmlns="http://tempuri.org/"><ns1:Id xmlns:ns1="http://n">7</ns1:Id></GetResult></s:Body></s:Envelope>';
    expect(parseXml(xml)).toEqual({ Envelope: { Body: { GetResult: { Id: "7" } } } });
  });

  it("accepts a byte order mark and Windows line endings (Review Focus 2)", () => {
    expect(parseXml('\uFEFF<?xml version="1.0"?>\r\n<a>\r\n  <b>1</b>\r\n</a>\r\n')).toEqual({ a: { b: "1" } });
  });

  it("allows 100 levels of nesting", () => {
    let value: unknown = parseXml(nested(100));
    for (let level = 0; level < 99; level++) value = (value as { a: unknown }).a;
    expect(value).toEqual({ a: "x" });
  });

  it("gives __proto__ and constructor elements and attributes own keys and never touches a prototype", () => {
    const parsed = parseXml('<__proto__ constructor="c"><__proto__>x</__proto__><polluted>1</polluted></__proto__>');
    expect(JSON.stringify(parsed)).toBe('{"__proto__":{"@constructor":"c","__proto__":"x","polluted":"1"}}');
    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("parseXml: text that stays text (Plan 6 spec §4.1)", () => {
  it.each([
    ["plain text", "hello"],
    ["a tag that is not a name", "<5 dk"],
    ["JSON", '{"a":1}'],
    ["a DOCTYPE", '<!DOCTYPE a><a/>'],
    ["an HTML error page", "<!DOCTYPE html><html><body><br></body></html>"],
    ["HTML without a DOCTYPE", "<html><body><br></body></html>"],
    ["an unknown entity", "<a>&nbsp;</a>"],
    ["an inherited name as an entity", "<a>&constructor;</a>"],
    ["a bare ampersand", "<a>a & b</a>"],
    ["an entity without a semicolon", "<a>&amp</a>"],
    ["an invalid code point", "<a>&#xD800;</a>"],
    ["a mismatched tag", "<a><b></a></b>"],
    ["an unclosed tag", "<a><b>"],
    ["an extra closing tag", "<a></a></a>"],
    ["an unquoted attribute", "<a x=1/>"],
    ["an attribute without whitespace before it", '<a x="1"y="2"/>'],
    ["< inside an attribute", '<a x="<"/>'],
    ["a duplicate attribute", '<a x="1" x="2"/>'],
    ["text after the root", "<a/>tail"],
    ["two roots", "<a/><b/>"],
    ["CDATA outside the root", "<![CDATA[x]]><a/>"],
    ["an empty local name", "<a:>x</a:>"],
    ["a local name that starts with a digit", "<a:1>x</a:1>"],
    ["an unclosed comment", "<a><!-- x</a>"],
    ["101 levels of nesting", nested(101)],
  ])("%s", (_, text) => {
    expect(parseXml(text)).toBeUndefined();
  });
});

describe("parseXml: size", () => {
  it("converts 1 MB of XML in well under a second", () => {
    const body = '<Bet Id="7"><Sel>A</Sel><Amount>150</Amount></Bet>'.repeat(20_000);
    const xml = `<?xml version="1.0"?><Bets>${body}</Bets>`;
    expect(xml.length).toBeGreaterThan(1_000_000);
    const started = performance.now();
    const parsed = parseXml(xml) as { Bets: { Bet: unknown[] } };
    expect(performance.now() - started).toBeLessThan(1000);
    expect(parsed.Bets.Bet).toHaveLength(20_000);
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/core/xml.test.ts`
Expected: FAIL, `Failed to resolve import "../../../src/core/xml"`.

- [ ] **Step 3: Ayrıştırıcıyı yaz**

`src/core/xml.ts`:

```ts
// XML text as JSON (Plan 6 spec §4): a small, strict parser for the request and response bodies in logs.
// No DTDs and no entities beyond the five predefined and numeric ones, so nothing is fetched or expanded.

type Entry = [key: string, value: unknown];

interface Element {
  name: string;
  /** Attributes first, then child elements, in document order. */
  entries: Entry[];
  text: string[];
  hasChildren: boolean;
}

/** Spec §4.3: deeper XML stays text, since every consumer walks the result recursively. */
const MAX_DEPTH = 100;
const NAME = /[\p{L}_:][\p{L}\p{M}\p{N}_:.·-]*/uy;
const PREDEFINED = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
]);

/** `{ <root's local name>: value }` when `text` is one well-formed XML element, otherwise undefined (spec §4.1). */
export function parseXml(text: string): Record<string, unknown> | undefined {
  const source = text.trim();
  if (!source.startsWith("<")) return undefined;
  const stack: Element[] = [];
  let root: Entry | undefined;
  let i = 0;
  while (i < source.length) {
    const top = stack.at(-1);
    if (source[i] !== "<") {
      const end = source.indexOf("<", i);
      const run = decode(source.slice(i, end < 0 ? undefined : end));
      if (run === undefined || (!top && run.trim() !== "")) return undefined;
      top?.text.push(run);
      i = end < 0 ? source.length : end;
    } else if (source.startsWith("<!--", i) || source.startsWith("<?", i)) {
      const close = source[i + 1] === "?" ? "?>" : "-->";
      const end = source.indexOf(close, i + 2);
      if (end < 0) return undefined;
      i = end + close.length;
    } else if (source.startsWith("<![CDATA[", i)) {
      const end = source.indexOf("]]>", i + 9);
      if (!top || end < 0) return undefined;
      top.text.push(source.slice(i + 9, end));
      i = end + 3;
    } else if (source[i + 1] === "!") {
      return undefined; // DOCTYPE and other declarations
    } else if (source[i + 1] === "/") {
      const name = readName(source, i + 2);
      if (!top || name !== top.name) return undefined;
      i = skipSpace(source, i + 2 + name.length);
      if (source[i] !== ">") return undefined;
      i++;
      stack.pop();
      root = attach(stack, top) ?? root;
    } else {
      if ((!top && root) || stack.length >= MAX_DEPTH) return undefined;
      const tag = readTag(source, i);
      if (!tag) return undefined;
      i = tag.end;
      if (tag.selfClosing) root = attach(stack, tag.element) ?? root;
      else stack.push(tag.element);
    }
  }
  return stack.length === 0 && root ? Object.fromEntries([root]) : undefined;
}

/** Adds a closed element to its parent; returns its entry when it is the root. */
function attach(stack: Element[], element: Element): Entry | undefined {
  const entry: Entry = [element.name.slice(element.name.lastIndexOf(":") + 1), valueOf(element)];
  const parent = stack.at(-1);
  if (!parent) return entry;
  parent.entries.push(entry);
  parent.hasChildren = true;
  return undefined;
}

/** Spec §4.2: text alone, or an object of `@attributes`, children and `#text`. */
function valueOf(element: Element): unknown {
  if (element.entries.length === 0) return element.text.join("");
  const text = (element.hasChildren ? element.text.filter((run) => run.trim() !== "") : element.text).join("");
  const entries: Entry[] = text.trim() === "" ? element.entries : [...element.entries, ["#text", text]];
  // A repeated key becomes an array at the place it first appeared; fromEntries keeps "__proto__" an own key.
  const grouped = new Map<string, unknown[]>();
  for (const [key, value] of entries) {
    const values = grouped.get(key);
    if (values) values.push(value);
    else grouped.set(key, [value]);
  }
  return Object.fromEntries([...grouped].map(([key, values]) => [key, values.length > 1 ? values : values[0]]));
}

function readTag(source: string, start: number): { element: Element; end: number; selfClosing: boolean } | undefined {
  const name = readName(source, start + 1);
  if (!isQualified(name)) return undefined;
  const element: Element = { name, entries: [], text: [], hasChildren: false };
  const seen = new Set<string>();
  let i = start + 1 + name.length;
  for (;;) {
    const next = skipSpace(source, i);
    if (source[next] === ">") return { element, end: next + 1, selfClosing: false };
    if (source.startsWith("/>", next)) return { element, end: next + 2, selfClosing: true };
    const attribute = readName(source, next);
    if (next === i || !isQualified(attribute) || seen.has(attribute)) return undefined;
    seen.add(attribute);
    const equals = skipSpace(source, next + attribute.length);
    if (source[equals] !== "=") return undefined;
    const open = skipSpace(source, equals + 1);
    const quote = source[open];
    if (quote !== '"' && quote !== "'") return undefined;
    const close = source.indexOf(quote, open + 1);
    if (close < 0) return undefined;
    const raw = source.slice(open + 1, close);
    const value = raw.includes("<") ? undefined : decode(raw);
    if (value === undefined) return undefined;
    if (attribute !== "xmlns" && !attribute.startsWith("xmlns:")) {
      element.entries.push([`@${attribute.slice(attribute.lastIndexOf(":") + 1)}`, value]);
    }
    i = close + 1;
  }
}

function readName(source: string, start: number): string {
  NAME.lastIndex = start;
  return NAME.exec(source)?.[0] ?? "";
}

/** A name whose part after the prefix is itself a name, so `<a:>` and `<a:1>` are rejected. */
function isQualified(name: string): boolean {
  return /^[\p{L}_]/u.test(name.slice(name.lastIndexOf(":") + 1));
}

function skipSpace(source: string, start: number): number {
  let i = start;
  while (source[i] === " " || source[i] === "\t" || source[i] === "\n" || source[i] === "\r") i++;
  return i;
}

/** Resolves the predefined and numeric entities; undefined for any other `&`. */
function decode(raw: string): string | undefined {
  if (!raw.includes("&")) return raw;
  let valid = true;
  const text = raw.replace(/&(#x[0-9A-Fa-f]+|#[0-9]+|[A-Za-z]+)?(;?)/g, (match, body: string | undefined, semicolon: string) => {
    const char = body !== undefined && semicolon === ";" ? entity(body) : undefined;
    if (char === undefined) valid = false;
    return char ?? match;
  });
  return valid ? text : undefined;
}

function entity(body: string): string | undefined {
  if (!body.startsWith("#")) return PREDEFINED.get(body);
  const code = body[1] === "x" ? Number.parseInt(body.slice(2), 16) : Number(body.slice(1));
  const valid = code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff);
  return valid ? String.fromCodePoint(code) : undefined;
}
```

Notlar:
- `NAME` yapışkan (`y`) bir regex; `readName` her çağrıda `lastIndex`'i ayarlar. Ayrıştırıcı kendini çağırmaz, bu yüzden paylaşılan `lastIndex` güvenlidir.
- `valueOf`, `Object.fromEntries` ile nesne kurar. Bu, `__proto__` adını kendi anahtar olarak tanımlar; prototip değişmez.
- Varlık adları `Map`'te tutulur, böylece `&constructor;` gibi bir ad `Object.prototype`'tan bir şey bulamaz.

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npx vitest run tests/unit/core/xml.test.ts`
Expected: 38 test geçer.

- [ ] **Step 5: Bütün kontroller**

```bash
npm test 2>&1 | tail -4        # 382 test geçer
npm run typecheck && npm run build && npm run check:manifest
```

- [ ] **Step 6: Commit**

```bash
git branch --show-current   # plan-6-xml-json
git add src/core/xml.ts tests/unit/core/xml.test.ts
git commit -m "feat: parse XML text into JSON

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Alan haritası, şablonlar ve JSON görünümü

**Files:**
- Modify: `src/core/fields.ts`
- Modify: `src/core/template.ts`
- Modify: `src/core/json-tree.ts`
- Modify: `src/content/JsonView.tsx`
- Test: `tests/unit/core/fields.test.ts`, `tests/unit/core/template.test.ts`, `tests/unit/core/json-tree.test.ts`

**Interfaces:**
- Consumes: Task 1'den `parseXml`.
- Produces (Task 3 kullanır):
  - `export function parseStructuredText(text: string): Record<string, unknown> | unknown[] | undefined`
  - `export function expandStructured(value: unknown, depth = 0): unknown`
  - `export function parseJsonText(...)` bu task'ta dışa açık kalır; Task 3 `export`'u kaldırır.
  - `JsonField` artık `source: "json" | "xml"` taşır; `value` tamamen açılmış değerdir.
- Markdown kopyası bu task'ta değişmez: `markdown.ts` ve `mask.ts` hâlâ `parseJsonText` kullanır.

- [ ] **Step 1: Testleri yaz**

```diff
diff --git a/tests/unit/core/fields.test.ts b/tests/unit/core/fields.test.ts
index d5a66fe..c4f3ab5 100644
--- a/tests/unit/core/fields.test.ts
+++ b/tests/unit/core/fields.test.ts
@@ -1,5 +1,5 @@
 import { describe, expect, it } from "vitest";
-import { flattenDoc, flattenSource, formatValue, isMissing, parseJsonText } from "../../../src/core/fields";
+import { expandStructured, flattenDoc, flattenSource, formatValue, isMissing, parseStructuredText } from "../../../src/core/fields";
 
 const hit = (source: Record<string, unknown>) => ({ _id: "id-1", _index: "logs-a", _source: source });
 
@@ -34,6 +34,15 @@ describe("flattenDoc", () => {
     expect(fields["context.body.items"]).toEqual([{ id: 1 }]);
   });
 
+  it("expands XML text fields into paths, with @attributes and #text (Plan 6 spec §5.2)", () => {
+    const request = '<soap:Envelope><soap:Body><Bet Id="7"><Amount currency="TRY">150</Amount></Bet></soap:Body></soap:Envelope>';
+    const fields = flattenDoc(hit({ context: { request } }));
+    expect(fields["context.request"]).toBe(request);
+    expect(fields["context.request.Envelope.Body.Bet.@Id"]).toBe("7");
+    expect(fields["context.request.Envelope.Body.Bet.Amount.@currency"]).toBe("TRY");
+    expect(fields["context.request.Envelope.Body.Bet.Amount.#text"]).toBe("150");
+  });
+
   it("keeps invalid JSON text as plain text", () => {
     const fields = flattenDoc(hit({ message: "{not json" }));
     expect(fields.message).toBe("{not json");
@@ -82,13 +91,53 @@ describe("formatValue", () => {
   });
 });
 
-describe("parseJsonText", () => {
+describe("parseStructuredText", () => {
   it("parses only object or array JSON text", () => {
-    expect(parseJsonText(' {"a":1} ')).toEqual({ a: 1 });
-    expect(parseJsonText("[1]")).toEqual([1]);
-    expect(parseJsonText("12")).toBeUndefined();
-    expect(parseJsonText('"x"')).toBeUndefined();
-    expect(parseJsonText("{bad")).toBeUndefined();
+    expect(parseStructuredText(' {"a":1} ')).toEqual({ a: 1 });
+    expect(parseStructuredText("[1]")).toEqual([1]);
+    expect(parseStructuredText("12")).toBeUndefined();
+    expect(parseStructuredText('"x"')).toBeUndefined();
+    expect(parseStructuredText("{bad")).toBeUndefined();
+  });
+
+  it("parses XML text too, and leaves other text that starts with < alone (Plan 6 spec §5.1)", () => {
+    expect(parseStructuredText(' <a x="1"><b>2</b></a> ')).toEqual({ a: { "@x": "1", b: "2" } });
+    expect(parseStructuredText("<html><br></html>")).toBeUndefined();
+    expect(parseStructuredText("<5 dk")).toBeUndefined();
+  });
+});
+
+describe("expandStructured (Plan 6 spec §5.1)", () => {
+  it("parses JSON and XML text wherever it sits, also inside other text", () => {
+    const inner = "&lt;race&gt;&lt;runId&gt;42&lt;/runId&gt;&lt;/race&gt;";
+    expect(
+      expandStructured({
+        n: 1,
+        request: `<r><Payload>${inner}</Payload><Json>{"a":[1]}</Json></r>`,
+        list: ['{"b":2}', "plain"],
+        body: JSON.stringify({ xml: "<c>3</c>" }),
+      }),
+    ).toEqual({
+      n: 1,
+      request: { r: { Payload: { race: { runId: "42" } }, Json: { a: [1] } } },
+      list: [{ b: 2 }, "plain"],
+      body: { xml: { c: "3" } },
+    });
+  });
+
+  it("parses at most 5 texts one inside another", () => {
+    let five: unknown = expandStructured(nestedJson(5));
+    for (let level = 0; level < 4; level++) five = (five as { next: unknown }).next;
+    expect(five).toEqual({ leaf: "x" });
+    let six: unknown = expandStructured(nestedJson(6));
+    for (let level = 0; level < 5; level++) six = (six as { next: unknown }).next;
+    expect(six).toBe(JSON.stringify({ leaf: "x" }));
+  });
+
+  it("keeps __proto__ keys own keys", () => {
+    const expanded = expandStructured(JSON.parse('{"__proto__":{"polluted":1}}'));
+    expect(Object.keys(expanded as object)).toEqual(["__proto__"]);
+    expect(Object.getPrototypeOf(expanded)).toBe(Object.prototype);
   });
 });
 
diff --git a/tests/unit/core/json-tree.test.ts b/tests/unit/core/json-tree.test.ts
index c31cbf8..12af749 100644
--- a/tests/unit/core/json-tree.test.ts
+++ b/tests/unit/core/json-tree.test.ts
@@ -16,8 +16,20 @@ describe("jsonTextFields", () => {
   it("finds _source fields whose text is a JSON object or array", () => {
     const source = { message: "x", context: { body: '{"a":1}', query: "[1,2]", raw: "{not json" }, count: 3 };
     expect(jsonTextFields(source)).toEqual([
-      { path: "context.body", value: { a: 1 } },
-      { path: "context.query", value: [1, 2] },
+      { path: "context.body", value: { a: 1 }, source: "json" },
+      { path: "context.query", value: [1, 2], source: "json" },
+    ]);
+  });
+
+  it("finds XML text fields too and opens the text inside them (Plan 6 spec §5.3)", () => {
+    const source = {
+      request: ' <r><Payload>&lt;race&gt;&lt;runId&gt;42&lt;/runId&gt;&lt;/race&gt;</Payload></r>',
+      body: JSON.stringify({ nested: '{"a":1}' }),
+      page: "<html><br></html>",
+    };
+    expect(jsonTextFields(source)).toEqual([
+      { path: "request", value: { r: { Payload: { race: { runId: "42" } } } }, source: "xml" },
+      { path: "body", value: { nested: { a: 1 } }, source: "json" },
     ]);
   });
 });
@@ -41,6 +53,13 @@ describe("jsonRows", () => {
   });
 });
 
+describe("jsonRows with XML keys", () => {
+  it("writes @attribute and #text keys as dot segments, so a copied path works in a template", () => {
+    const paths = jsonRows({ Bet: { "@Id": "7", "#text": "x", "@1": "a", "#odd key": "b" } }).map((row) => row.path);
+    expect(paths).toEqual(["", ".Bet", ".Bet.@Id", ".Bet.#text", '.Bet["@1"]', '.Bet["#odd key"]']);
+  });
+});
+
 describe("isDescendant", () => {
   it("needs a path separator after the parent", () => {
     expect(isDescendant(".items[0].sku", ".items")).toBe(true);
diff --git a/tests/unit/core/template.test.ts b/tests/unit/core/template.test.ts
index a4768ad..06332cc 100644
--- a/tests/unit/core/template.test.ts
+++ b/tests/unit/core/template.test.ts
@@ -55,6 +55,18 @@ describe("resolveTemplate", () => {
     );
   });
 
+  it("supports # in paths, for the #text of an XML element (Plan 6 spec §5.2)", () => {
+    const fields = { "context.request.Amount.#text": "150", "context.request.Amount.@currency": "TRY" };
+    expect(resolveTemplate("https://x.test/{context.request.Amount.#text}?c={context.request.Amount.@currency}", fields, enc)).toBe(
+      "https://x.test/150?c=TRY",
+    );
+  });
+
+  it("still fills a template with a hash route around its placeholders (Review Focus 5)", () => {
+    expect(resolveTemplate("https://admin.test/#/users/{user_id}?tab=#logs", { user_id: 7 }, enc)).toBe("https://admin.test/#/users/7?tab=#logs");
+    expect(parsePlaceholders("{env.adminUrl}/#/users/{user_id}").map((placeholder) => placeholder.paths)).toEqual([["env.adminUrl"], ["user_id"]]);
+  });
+
   it("joins primitive arrays and leaves text without placeholders unchanged", () => {
     expect(resolveTemplate("https://x.test/{tags}", { tags: ["a", "b"] }, enc)).toBe("https://x.test/a%2Cb");
     expect(resolveTemplate("https://x.test/static", {}, enc)).toBe("https://x.test/static");
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/core/fields.test.ts tests/unit/core/template.test.ts tests/unit/core/json-tree.test.ts`
Expected: FAIL. `parseStructuredText` ve `expandStructured` dışa açık değil; XML yolları yok; `#` yer tutucusu dolmuyor; `JsonField.source` yok.

- [ ] **Step 3: Kodu yaz**

```diff
diff --git a/src/content/JsonView.tsx b/src/content/JsonView.tsx
index 59abf59..1391dc0 100644
--- a/src/content/JsonView.tsx
+++ b/src/content/JsonView.tsx
@@ -1,4 +1,4 @@
-// JSON view (spec §7.6): a tree with collapse, search and copy, for fields that hold JSON text.
+// JSON view (spec §7.6): a tree with collapse, search and copy, for fields that hold JSON or XML text (Plan 6 spec §5.3).
 import { useEffect, useMemo, useRef, useState } from "react";
 import {
   type JsonField,
@@ -40,7 +40,7 @@ export function JsonView({ fields, onCopy, onClose }: JsonViewProps) {
           {fields.map((field) => (
             <li key={field.path}>
               <button type="button" onClick={() => setSelected(field)}>
-                {field.path}
+                {field.source === "xml" ? `${field.path} · XML` : field.path}
               </button>
             </li>
           ))}
diff --git a/src/core/fields.ts b/src/core/fields.ts
index ffaebf6..97a77de 100644
--- a/src/core/fields.ts
+++ b/src/core/fields.ts
@@ -1,5 +1,6 @@
-// Flattens an Elasticsearch hit into a dot-path field map (spec §7.1).
+// Flattens an Elasticsearch hit into a dot-path field map (spec §7.1), JSON and XML text included (Plan 6 spec §5).
 import type { RawHit } from "./types";
+import { parseXml } from "./xml";
 
 export type FieldMap = Record<string, unknown>;
 
@@ -27,7 +28,11 @@ export function formatValue(value: unknown): string {
   return JSON.stringify(value);
 }
 
-/** Returns the parsed value when `text` is JSON for an object or array, otherwise undefined. */
+/** The parsed value when `text` is JSON for an object or array, or XML (Plan 6 spec §5.1); otherwise undefined. */
+export function parseStructuredText(text: string): Record<string, unknown> | unknown[] | undefined {
+  return text.trim().startsWith("<") ? parseXml(text) : parseJsonText(text);
+}
+
 export function parseJsonText(text: string): Record<string, unknown> | unknown[] | undefined {
   const trimmed = text.trim();
   if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return undefined;
@@ -40,7 +45,19 @@ export function parseJsonText(text: string): Record<string, unknown> | unknown[]
   }
 }
 
-/** Dot-path leaves of `_source`. JSON text is also expanded under its own path unless `expandJson` is false. */
+/**
+ * `value` with every JSON or XML text inside it parsed, however deep it sits (Plan 6 spec §5.1).
+ * At most MAX_JSON_DEPTH texts are parsed one inside another; deeper text stays a string.
+ */
+export function expandStructured(value: unknown, depth = 0): unknown {
+  if (Array.isArray(value)) return value.map((item) => expandStructured(item, depth));
+  if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, expandStructured(item, depth)]));
+  if (typeof value !== "string" || depth >= MAX_JSON_DEPTH) return value;
+  const parsed = parseStructuredText(value);
+  return parsed === undefined ? value : expandStructured(parsed, depth + 1);
+}
+
+/** Dot-path leaves of `_source`. JSON and XML text is also expanded under its own path unless `expandJson` is false. */
 export function flattenSource(source: Record<string, unknown>, expandJson = true): FieldMap {
   const fields: FieldMap = Object.create(null);
   flattenInto(fields, "", source, expandJson ? 0 : MAX_JSON_DEPTH);
@@ -68,7 +85,7 @@ function flattenInto(
     }
     fields[path] = value;
     if (typeof value === "string" && jsonDepth < MAX_JSON_DEPTH) {
-      const parsed = parseJsonText(value);
+      const parsed = parseStructuredText(value);
       if (isPlainObject(parsed)) flattenInto(fields, path, parsed, jsonDepth + 1);
     }
   }
diff --git a/src/core/json-tree.ts b/src/core/json-tree.ts
index f3982e5..30df789 100644
--- a/src/core/json-tree.ts
+++ b/src/core/json-tree.ts
@@ -1,11 +1,13 @@
-// The JSON view's data (spec §7.6): JSON-text fields and a flat, pre-ordered row list,
+// The JSON view's data (spec §7.6): JSON- and XML-text fields (Plan 6 spec §5.3) and a flat, pre-ordered row list,
 // so collapsing, search and revealing a match are plain array operations.
-import { flattenSource, isPlainObject, parseJsonText } from "./fields";
+import { expandStructured, flattenSource, isPlainObject } from "./fields";
 
 export interface JsonField {
-  /** Dot path of the `_source` field that holds the JSON text. */
+  /** Dot path of the `_source` field that holds the JSON or XML text. */
   path: string;
+  /** The parsed text, with JSON and XML text inside it parsed too. */
   value: Record<string, unknown> | unknown[];
+  source: "json" | "xml";
 }
 
 export interface JsonRow {
@@ -18,15 +20,18 @@ export interface JsonRow {
   container: "object" | "array" | null;
 }
 
-/** `_source` fields whose text is a JSON object or array, in field order. */
+/** `_source` fields whose text is a JSON object or array, or XML, in field order. */
 export function jsonTextFields(source: Record<string, unknown>): JsonField[] {
-  return Object.entries(flattenSource(source, false)).flatMap(([path, value]) => {
-    const parsed = typeof value === "string" ? parseJsonText(value) : undefined;
-    return parsed === undefined ? [] : [{ path, value: parsed }];
+  return Object.entries(flattenSource(source, false)).flatMap(([path, text]): JsonField[] => {
+    if (typeof text !== "string") return [];
+    const value = expandStructured(text);
+    if (!isPlainObject(value) && !Array.isArray(value)) return [];
+    return [{ path, value, source: text.trim().startsWith("<") ? "xml" : "json" }];
   });
 }
 
-const segment = (key: string): string => (/^[A-Za-z_$][\w$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`);
+// XML's `@attribute` and `#text` keys stay dot segments, so a copied path works in a template (Plan 6 spec §5.3).
+const segment = (key: string): string => (/^[@#]?[A-Za-z_$][\w$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`);
 
 export function jsonRows(value: unknown): JsonRow[] {
   const rows: JsonRow[] = [];
diff --git a/src/core/template.ts b/src/core/template.ts
index 8e4ff44..c18bd14 100644
--- a/src/core/template.ts
+++ b/src/core/template.ts
@@ -1,7 +1,8 @@
 // Resolves {path|fallback} placeholders against a field map and environment variables (spec §7.2, §7.3; Plan 4 spec §4).
 import { type FieldMap, formatValue, isMissing } from "./fields";
 
-const PLACEHOLDER = /\{([A-Za-z0-9_.@-]+(?:\|[A-Za-z0-9_.@-]+)*)\}/g;
+// "#" reaches the text of an XML element that has attributes (`….Amount.#text`, Plan 6 spec §5.2).
+const PLACEHOLDER = /\{([A-Za-z0-9_.@#-]+(?:\|[A-Za-z0-9_.@#-]+)*)\}/g;
 
 export interface Placeholder {
   raw: string;
```

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npx vitest run tests/unit/core/fields.test.ts tests/unit/core/template.test.ts tests/unit/core/json-tree.test.ts`
Expected: hepsi geçer.

- [ ] **Step 5: Bütün kontroller**

```bash
npm test 2>&1 | tail -4        # 391 test geçer; markdown.test.ts ve mask.test.ts değişmeden geçer
npm run typecheck && npm run build && npm run check:manifest
```

- [ ] **Step 6: Commit**

```bash
git branch --show-current   # plan-6-xml-json
git add src/core/fields.ts src/core/template.ts src/core/json-tree.ts src/content/JsonView.tsx \
  tests/unit/core/fields.test.ts tests/unit/core/template.test.ts tests/unit/core/json-tree.test.ts
git commit -m "feat: read XML text in the field map, templates and the JSON view

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Kopyalar: Markdown, maskeleme ve "JSON olarak kopyala"

**Files:**
- Create: `src/core/json-copy.ts`
- Create: `tests/unit/core/json-copy.test.ts`
- Modify: `src/core/mask.ts`
- Modify: `src/core/markdown.ts`
- Modify: `src/core/fields.ts` (`parseJsonText`'in `export`'u kalkar)
- Modify: `src/content/ActionBar.tsx`
- Modify: `public/_locales/en/messages.json`, `public/_locales/tr/messages.json`
- Test: `tests/unit/core/mask.test.ts`, `tests/unit/core/markdown.test.ts`

**Interfaces:**
- Consumes: Task 2'den `expandStructured`, `isPlainObject`.
- Produces:
  - `export function buildJson(hit: RawHit, maskPatterns: string[], valueMasks: readonly ValueMaskKind[]): string`
  - `maskValue(path, value, isMasked, kinds)` imzası aynı; ama artık string'i ayrıştırmaz. Çağıran önce `expandStructured` uygular.
  - Menü sırası: 0 Markdown, 1 JSON, 2 log linki, 3 sabit zamanlı görünüm (Task 4'ün e2e testleri buna dayanır).

- [ ] **Step 1: Testleri yaz**

`tests/unit/core/json-copy.test.ts` (yeni):

```ts
import { describe, expect, it } from "vitest";
import { buildJson } from "../../../src/core/json-copy";
import { VALUE_MASK_KINDS } from "../../../src/core/value-mask";

// Synthetic values only (Plan 5 spec §9.1).
const hit = {
  _id: "10000000146",
  _index: "pay-5550000000",
  _source: {
    datetime: "2026-08-12T10:00:00+03:00",
    user_id: 10000000146,
    context: {
      headers: JSON.stringify({ Authorization: "Bearer x", accept: "json" }),
      request: '<soap:Envelope xmlns:soap="s"><soap:Body><pay pid="10000000146"><iban>TR000000000000000000000001</iban><amount>150</amount></pay></soap:Body></soap:Envelope>',
    },
    level: 200,
  },
};
const all = [...VALUE_MASK_KINDS];

describe("buildJson (Plan 6 spec §6)", () => {
  it("copies _index, _id and _source, two-space indented, with JSON and XML text expanded and masked", () => {
    expect(JSON.parse(buildJson(hit, ["*authorization*"], all))).toEqual({
      _index: "pay-5550000000",
      _id: "10000000146",
      _source: {
        datetime: "2026-08-12T10:00:00+03:00",
        user_id: "***",
        context: {
          headers: { Authorization: "***", accept: "json" },
          request: { Envelope: { Body: { pay: { "@pid": "***", iban: "***", amount: "150" } } } },
        },
        level: 200,
      },
    });
    expect(buildJson(hit, [], []).split("\n").slice(0, 4)).toEqual(["{", '  "_index": "pay-5550000000",', '  "_id": "10000000146",', '  "_source": {']);
  });

  it("keeps the order of _source and never masks or scans _index and _id", () => {
    const copied = JSON.parse(buildJson(hit, ["*id*", "*index*"], all));
    expect(Object.keys(copied)).toEqual(["_index", "_id", "_source"]);
    expect(Object.keys(copied._source)).toEqual(["datetime", "user_id", "context", "level"]);
    expect(copied._index).toBe("pay-5550000000");
    expect(copied._id).toBe("10000000146");
  });

  it("matches field-name masks on _source paths, inside XML too", () => {
    const copied = JSON.parse(buildJson(hit, ["context.request.Envelope.Body.pay.amount"], []));
    expect(copied._source.context.request.Envelope.Body.pay).toEqual({ "@pid": "10000000146", iban: "TR000000000000000000000001", amount: "***" });
    expect(copied._source.user_id).toBe(10000000146);
  });

  it("masks a whole XML element once when a pattern names it (Review Focus 4)", () => {
    const copied = JSON.parse(buildJson(hit, ["*.Body"], all));
    expect(copied._source.context.request).toEqual({ Envelope: { Body: "***" } });
  });

  it("copies a hit without _source as an empty object", () => {
    expect(JSON.parse(buildJson({ _id: "1", _index: "i" }, [], all))).toEqual({ _index: "i", _id: "1", _source: {} });
  });
});
```

`mask.test.ts` ve `markdown.test.ts`. `markdown.test.ts`'teki "keeps the rest" ve "copies the values as before" testleri kasıtlı olarak değişir (spec §8.1): XML artık json bloğu, `*iban*` deseni XML elemanına da ulaşıyor.

````diff
diff --git a/tests/unit/core/markdown.test.ts b/tests/unit/core/markdown.test.ts
index 84e5a65..22840fd 100644
--- a/tests/unit/core/markdown.test.ts
+++ b/tests/unit/core/markdown.test.ts
@@ -123,7 +123,7 @@ describe("buildMarkdown with value masks (Plan 5 spec §5)", () => {
       options({ hit: payment, maskPatterns: ["*iban*"], valueMasks: [...VALUE_MASK_KINDS], docUrl: "u?id=10000000146", ...overrides }),
     ).split("\n");
 
-  it("masks the values inside XML and JSON text, keeps the rest, and leaves the header and the link alone", () => {
+  it("masks the values inside XML and JSON text, writes both as json blocks, and leaves the header and the link alone", () => {
     expect(masked()).toEqual([
       "**pay-5550000000** · 2026-08-12T10:00:00+03:00",
       "- `body`:",
@@ -136,7 +136,16 @@ describe("buildMarkdown with value masks (Plan 5 spec §5)", () => {
       "  ```",
       "- `datetime`: 2026-08-12T10:00:00+03:00",
       "- `iban`: ***",
-      "- `request`: <a><tckn>***</tckn><iban>***</iban><n>150</n></a>",
+      "- `request`:",
+      "  ```json",
+      "  {",
+      '    "a": {',
+      '      "tckn": "***",',
+      '      "iban": "***",',
+      '      "n": "150"',
+      "    }",
+      "  }",
+      "  ```",
       "[Open in Kibana](u?id=10000000146)",
     ]);
   });
@@ -152,11 +161,63 @@ describe("buildMarkdown with value masks (Plan 5 spec §5)", () => {
     ]);
   });
 
-  it("copies the values as before when every kind is off", () => {
+  it("masks nothing inside the values when every kind is off", () => {
     // Plan 5 Review Focus 5.
     const lines = masked({ valueMasks: [] });
-    expect(lines).toContain("- `request`: <a><tckn>10000000146</tckn><iban>TR00 0000 0000 0000 0000 0000 01</iban><n>150</n></a>");
+    expect(lines).toContain('      "tckn": "10000000146",');
     expect(lines).toContain('    "pidNo": 10000000146,');
-    expect(lines).toContain("- `iban`: ***"); // the field-name mask still applies
+    expect(lines).toContain("- `iban`: ***"); // the field-name mask still applies,
+    expect(lines).toContain('      "iban": "***",'); // also to an XML element (Plan 6 spec §5.5)
+  });
+});
+
+describe("buildMarkdown with XML (Plan 6 spec §5.4)", () => {
+  const xmlHit = (source: Record<string, unknown>) => ({ _id: "1", _index: "i", _source: source });
+  const lines = (source: Record<string, unknown>, overrides: Partial<MarkdownOptions> = {}): string[] =>
+    buildMarkdown(options({ hit: xmlHit(source), timeField: undefined, docUrl: "u", ...overrides })).split("\n");
+
+  it("writes XML text as a json block, with the text inside it opened, and JSON array text as a block as before", () => {
+    expect(lines({ response: '<r code="00"><Payload>{"runId":42}</Payload></r>', tags: "[1,2]" })).toEqual([
+      "**i**",
+      "- `response`:",
+      "  ```json",
+      "  {",
+      '    "r": {',
+      '      "@code": "00",',
+      '      "Payload": {',
+      '        "runId": 42',
+      "      }",
+      "    }",
+      "  }",
+      "  ```",
+      "- `tags`:",
+      "  ```json",
+      "  [",
+      "    1,",
+      "    2",
+      "  ]",
+      "  ```",
+      "[Open in Kibana](u)",
+    ]);
+  });
+
+  it("opens JSON text inside JSON text, which stayed an escaped string before", () => {
+    expect(lines({ body: JSON.stringify({ inner: JSON.stringify({ a: 1 }) }) })).toContain('    "inner": {');
+  });
+
+  it("writes text that is not well-formed XML, such as an HTML error page, as before (Review Focus 3)", () => {
+    expect(lines({ page: "<html><body><br></body></html>" })).toContain("- `page`: <html><body><br></body></html>");
+  });
+
+  it("writes a masked XML field as *** on one line, not as a block", () => {
+    expect(lines({ secretXml: "<a>1</a>" }, { maskPatterns: ["*secret*"] })).toContain("- `secretXml`: ***");
+  });
+
+  it("copies a listed path inside XML text", () => {
+    expect(lines({ request: '<pay><Amount currency="TRY">150</Amount></pay>' }, { fields: ["request.pay.Amount.#text"] })).toEqual([
+      "**i**",
+      "- `request.pay.Amount.#text`: 150",
+      "[Open in Kibana](u)",
+    ]);
   });
 });
diff --git a/tests/unit/core/mask.test.ts b/tests/unit/core/mask.test.ts
index 1bcc59e..fd1fc47 100644
--- a/tests/unit/core/mask.test.ts
+++ b/tests/unit/core/mask.test.ts
@@ -1,5 +1,6 @@
 import { describe, expect, it } from "vitest";
 import { DEFAULT_MASK_PATTERNS } from "../../../src/core/config";
+import { expandStructured } from "../../../src/core/fields";
 import { MASK, maskMatcher, maskValue } from "../../../src/core/mask";
 import { VALUE_MASK_KINDS } from "../../../src/core/value-mask";
 
@@ -26,16 +27,26 @@ describe("maskValue", () => {
     expect(maskValue("message", "plain", isMasked, [])).toBe("plain");
   });
 
-  it("masks keys inside JSON text under the field's path and re-serializes it", () => {
-    const headers = JSON.stringify({ Authorization: "Bearer x", accept: "json" });
-    expect(maskValue("context.headers", headers, isMasked, [])).toBe('{"Authorization":"***","accept":"json"}');
+  it("masks keys inside expanded JSON text under the field's path", () => {
+    const headers = expandStructured(JSON.stringify({ Authorization: "Bearer x", accept: "json" }));
+    expect(maskValue("context.headers", headers, isMasked, [])).toEqual({ Authorization: MASK, accept: "json" });
+  });
+
+  it("masks XML element names and attributes under the field's path (Plan 6 spec §5.5)", () => {
+    const request = expandStructured('<soap:Envelope><soap:Body><Login Token="t"><Password>p</Password><User>u</User></Login></soap:Body></soap:Envelope>');
+    expect(maskValue("context.request", request, isMasked, [])).toEqual({
+      Envelope: { Body: { Login: { "@Token": MASK, Password: MASK, User: "u" } } },
+    });
+  });
+
+  it("leaves text unparsed: callers expand it first", () => {
+    const headers = JSON.stringify({ Authorization: "Bearer x" });
+    expect(maskValue("context.headers", headers, isMasked, [])).toBe(headers);
   });
 
   it("masks inside arrays and nested objects", () => {
     expect(maskValue("items", [{ token: "t", id: 1 }], isMasked, [])).toEqual([{ token: MASK, id: 1 }]);
-    expect(maskValue("body", JSON.stringify({ user: { Password: "p", name: "n" } }), isMasked, [])).toBe(
-      '{"user":{"Password":"***","name":"n"}}',
-    );
+    expect(maskValue("body", { user: { Password: "p", name: "n" } }, isMasked, [])).toEqual({ user: { Password: MASK, name: "n" } });
   });
 });
 
@@ -53,15 +64,20 @@ describe("maskValue with value masks (Plan 5 spec §5)", () => {
     expect(maskValue("amount", 150, isMasked, all)).toBe(150);
   });
 
-  it("masks inside JSON text, numbers included, leaves booleans and null, and re-serializes it", () => {
-    const body = JSON.stringify({ pidNo: 10000000146, note: "card 4111 1111 1111 1111", ok: true, none: null });
-    expect(maskValue("body", body, isMasked, all)).toBe('{"pidNo":"***","note":"card ***","ok":true,"none":null}');
+  it("masks inside expanded JSON text, numbers included, and leaves booleans and null", () => {
+    const body = expandStructured(JSON.stringify({ pidNo: 10000000146, note: "card 4111 1111 1111 1111", ok: true, none: null }));
+    expect(maskValue("body", body, isMasked, all)).toEqual({ pidNo: MASK, note: "card ***", ok: true, none: null });
+  });
+
+  it("masks inside expanded XML text: element text and attribute values (Plan 6 spec §5.5)", () => {
+    const request = expandStructured('<pay pid="10000000146"><gsm>+90 555 000 00 00</gsm><amount>150</amount></pay>');
+    expect(maskValue("request", request, isMasked, all)).toEqual({ pay: { "@pid": MASK, gsm: MASK, amount: "150" } });
   });
 
   it("lets a field-name mask win, so the whole value is masked once", () => {
     // Plan 5 Review Focus 3.
     expect(maskValue("context.iban", "TR000000000000000000000001", isMasked, all)).toBe(MASK);
-    expect(maskValue("body", JSON.stringify({ IBAN: "x TR000000000000000000000001" }), isMasked, all)).toBe('{"IBAN":"***"}');
+    expect(maskValue("body", expandStructured(JSON.stringify({ IBAN: "x TR000000000000000000000001" })), isMasked, all)).toEqual({ IBAN: MASK });
   });
 
   it("masks inside arrays", () => {
````

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/core/json-copy.test.ts tests/unit/core/mask.test.ts tests/unit/core/markdown.test.ts`
Expected: FAIL. `json-copy` modülü yok; `maskValue` hâlâ JSON metnini ayrıştırıp string döndürüyor; Markdown XML'i olduğu gibi yazıyor.

- [ ] **Step 3: Kodu yaz**

`src/core/json-copy.ts` (yeni):

```ts
// "Copy as JSON" (Plan 6 spec §6): the hit with its JSON and XML text expanded, masked like the Markdown copy.
import { expandStructured } from "./fields";
import { maskMatcher, maskValue } from "./mask";
import type { RawHit } from "./types";
import type { ValueMaskKind } from "./value-mask";

/** `_index` and `_id` are neither masked nor scanned, like the Markdown header and link; `_source` keeps its order. */
export function buildJson(hit: RawHit, maskPatterns: string[], valueMasks: readonly ValueMaskKind[]): string {
  const isMasked = maskMatcher(maskPatterns);
  const source = Object.fromEntries(
    Object.entries(hit._source ?? {}).map(([key, value]) => [key, maskValue(key, expandStructured(value), isMasked, valueMasks)]),
  );
  return JSON.stringify({ _index: hit._index, _id: hit._id, _source: source }, null, 2);
}
```

Mevcut dosyalar:

```diff
diff --git a/public/_locales/en/messages.json b/public/_locales/en/messages.json
index ccb562f..eb79e2a 100644
--- a/public/_locales/en/messages.json
+++ b/public/_locales/en/messages.json
@@ -30,6 +30,7 @@
   "discoverNoTime": { "message": "No time to center on: the data view has no time field or this log has no value for it" },
   "menuLabel": { "message": "Copy options" },
   "menuCopyMarkdown": { "message": "Copy as Markdown" },
+  "menuCopyJson": { "message": "Copy as JSON" },
   "menuCopyDocLink": { "message": "Copy link to this log" },
   "menuCopyFixedView": { "message": "Copy view with fixed time" },
   "markdownOpenInKibana": { "message": "Open in Kibana" },
diff --git a/public/_locales/tr/messages.json b/public/_locales/tr/messages.json
index e9ecf24..d7f111f 100644
--- a/public/_locales/tr/messages.json
+++ b/public/_locales/tr/messages.json
@@ -30,6 +30,7 @@
   "discoverNoTime": { "message": "Ortalanacak zaman yok: data view'ın zaman alanı yok ya da bu logda o alanın değeri yok" },
   "menuLabel": { "message": "Kopyalama seçenekleri" },
   "menuCopyMarkdown": { "message": "Markdown olarak kopyala" },
+  "menuCopyJson": { "message": "JSON olarak kopyala" },
   "menuCopyDocLink": { "message": "Logun linkini kopyala" },
   "menuCopyFixedView": { "message": "Görünümü sabit zamanla kopyala" },
   "markdownOpenInKibana": { "message": "Kibana'da aç" },
diff --git a/src/content/ActionBar.tsx b/src/content/ActionBar.tsx
index 9cdb483..3e36be0 100644
--- a/src/content/ActionBar.tsx
+++ b/src/content/ActionBar.tsx
@@ -3,6 +3,7 @@ import { type SyntheticEvent, useEffect, useMemo, useRef, useState } from "react
 import type { Action, Config, Environment } from "../core/config";
 import { type DiscoverButton, buildDiscoverButtons } from "../core/discover-actions";
 import { flattenDoc } from "../core/fields";
+import { buildJson } from "../core/json-copy";
 import { jsonTextFields } from "../core/json-tree";
 import { type LinkButton, buildLinkButtons } from "../core/link-actions";
 import { buildMarkdown } from "../core/markdown";
@@ -143,6 +144,7 @@ export function ActionBar({ identity, actions, client, prefix, hash, copy, envir
           linkLabel: t("markdownOpenInKibana"),
         }),
     },
+    { label: t("menuCopyJson"), text: () => buildJson(hit, copy.maskPatterns, copy.valueMasks) },
     { label: t("menuCopyDocLink"), text: docUrl },
     { label: t("menuCopyFixedView"), text: () => fixedTimeUrl(location.href, new Date()) },
   ];
diff --git a/src/core/fields.ts b/src/core/fields.ts
index 97a77de..46ef8a3 100644
--- a/src/core/fields.ts
+++ b/src/core/fields.ts
@@ -33,7 +33,7 @@ export function parseStructuredText(text: string): Record<string, unknown> | unk
   return text.trim().startsWith("<") ? parseXml(text) : parseJsonText(text);
 }
 
-export function parseJsonText(text: string): Record<string, unknown> | unknown[] | undefined {
+function parseJsonText(text: string): Record<string, unknown> | unknown[] | undefined {
   const trimmed = text.trim();
   if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return undefined;
   try {
diff --git a/src/core/markdown.ts b/src/core/markdown.ts
index e0f4768..0e43524 100644
--- a/src/core/markdown.ts
+++ b/src/core/markdown.ts
@@ -1,5 +1,5 @@
 // "Copy as Markdown" (spec §7.4): plain Markdown for GitHub, Jira Cloud and Slack.
-import { type FieldMap, flattenDoc, flattenSource, formatValue, isMissing, parseJsonText } from "./fields";
+import { type FieldMap, expandStructured, flattenDoc, flattenSource, formatValue, isMissing, isPlainObject } from "./fields";
 import { maskMatcher, maskValue } from "./mask";
 import type { RawHit } from "./types";
 import type { ValueMaskKind } from "./value-mask";
@@ -32,7 +32,7 @@ export function buildMarkdown(options: MarkdownOptions): string {
   for (const path of paths) {
     const value = source[path];
     if (isMissing(value)) continue;
-    lines.push(...fieldLines(path, maskValue(path, value, isMasked, valueMasks)));
+    lines.push(...fieldLines(path, value, maskValue(path, expandStructured(value), isMasked, valueMasks)));
   }
   // A ")" in the index or id would end the Markdown link early.
   lines.push(`[${linkLabel}](${docUrl.replace(/[()]/g, (paren) => (paren === "(" ? "%28" : "%29"))})`);
@@ -50,9 +50,10 @@ function listedPaths(path: string, all: FieldMap, leaves: FieldMap): string[] {
 const isObjectArray = (value: unknown): boolean =>
   Array.isArray(value) && value.some((item) => typeof item === "object" && item !== null);
 
-function fieldLines(path: string, value: unknown): string[] {
-  const json = typeof value === "string" ? parseJsonText(value) : isObjectArray(value) ? value : undefined;
-  if (json !== undefined) return [`- \`${path}\`:`, ...codeBlock(JSON.stringify(json, null, 2), "json")];
+/** `raw` is the field's value, `value` the same expanded and masked: JSON and XML text become one json block (Plan 6 spec §5.4). */
+function fieldLines(path: string, raw: unknown, value: unknown): string[] {
+  const json = isPlainObject(value) || (Array.isArray(value) && (typeof raw === "string" || isObjectArray(value)));
+  if (json) return [`- \`${path}\`:`, ...codeBlock(JSON.stringify(value, null, 2), "json")];
   const text = formatValue(value);
   if (text.includes("\n")) return [`- \`${path}\`:`, ...codeBlock(text, "")];
   return [`- \`${path}\`: ${text}`];
diff --git a/src/core/mask.ts b/src/core/mask.ts
index e9983c6..033d53c 100644
--- a/src/core/mask.ts
+++ b/src/core/mask.ts
@@ -1,5 +1,5 @@
 // Masks sensitive values in copied output: by field name (spec §7.5) and inside values (Plan 5 spec §5).
-import { isPlainObject, parseJsonText } from "./fields";
+import { isPlainObject } from "./fields";
 import { MASK, type ValueMaskKind, maskText } from "./value-mask";
 
 export { MASK };
@@ -13,9 +13,9 @@ export function maskMatcher(patterns: string[]): (path: string) => boolean {
 }
 
 /**
- * Replaces values whose path matches with MASK, also inside objects, arrays and JSON text.
- * Keys inside JSON text are matched as `<field path>.<key>`; masked JSON text is re-serialized.
- * Every other text and number is searched for the value kinds that are on; a number with a match becomes MASK.
+ * Replaces values whose path matches with MASK, also inside objects and arrays. Callers pass the value through
+ * expandStructured first (Plan 6 spec §5.5), so keys inside JSON and XML text are matched as `<field path>.<key>`.
+ * Every text and number is searched for the value kinds that are on; a number with a match becomes MASK.
  */
 export function maskValue(path: string, value: unknown, isMasked: (path: string) => boolean, kinds: readonly ValueMaskKind[]): unknown {
   if (isMasked(path)) return MASK;
@@ -23,10 +23,7 @@ export function maskValue(path: string, value: unknown, isMasked: (path: string)
   if (isPlainObject(value)) {
     return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, maskValue(`${path}.${key}`, item, isMasked, kinds)]));
   }
-  if (typeof value === "string") {
-    const parsed = parseJsonText(value);
-    return parsed === undefined ? maskText(value, kinds) : JSON.stringify(maskValue(path, parsed, isMasked, kinds));
-  }
+  if (typeof value === "string") return maskText(value, kinds);
   if (typeof value === "number") return maskText(String(value), kinds) === String(value) ? value : MASK;
   return value;
 }
```

`fieldLines`'ın kuralı: açılmış ve maskelenmiş değer bir nesneyse, ya da bir diziyse ve ham değer metinse (JSON dizi metni) veya dizi nesne içeriyorsa json bloğu yazılır. Alanın tamamı maskelendiyse değer `***` metnidir ve tek satır yazılır.

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npx vitest run tests/unit/core/json-copy.test.ts tests/unit/core/mask.test.ts tests/unit/core/markdown.test.ts`
Expected: hepsi geçer.

- [ ] **Step 5: Bütün kontroller**

```bash
npm test 2>&1 | tail -4        # 404 test geçer
npm run typecheck && npm run build && npm run check:manifest
```

E2E bu task'ta çalıştırılmaz (Uygulama notları): menü sırası Task 4'te güncellenir.

- [ ] **Step 6: Commit**

```bash
git branch --show-current   # plan-6-xml-json
git add src/core/json-copy.ts src/core/mask.ts src/core/markdown.ts src/core/fields.ts src/content/ActionBar.tsx \
  public/_locales/en/messages.json public/_locales/tr/messages.json \
  tests/unit/core/json-copy.test.ts tests/unit/core/mask.test.ts tests/unit/core/markdown.test.ts
git commit -m "feat: copy the log as JSON, and write XML as JSON in the Markdown copy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Uçtan uca: seed ve senaryolar

**Files:**
- Modify: `docker/seed.mjs`
- Modify: `tests/e2e/kibana.ts`
- Modify: `tests/e2e/copy.spec.ts`
- Modify: `tests/e2e/json.spec.ts`
- Modify: `tests/e2e/spaces.spec.ts`

**Interfaces:**
- Consumes:
  - Task 2'den JSON görünümünde XML alanları ve `· XML` etiketi.
  - Task 3'ten menü sırası ve "JSON olarak kopyala".
- Produces: `app-002` kaydında `context.response` (sentetik XML, spec §8.2). Başka hiçbir e2e testi `app-002`'yi kullanmaz; `context.request` (`PAYMENT_XML`) değişmez.

- [ ] **Step 1: Seed'e sentetik XML yanıtını ekle**

```diff
diff --git a/docker/seed.mjs b/docker/seed.mjs
index 947160b..7d8d8b9 100644
--- a/docker/seed.mjs
+++ b/docker/seed.mjs
@@ -28,6 +28,22 @@ const PAYMENT_XML =
   "<soap:Envelope><soap:Body><ns1:pay><ns1:identitynumber>10000000146</ns1:identitynumber>" +
   "<ns1:iban>TR00 0000 0000 0000 0000 0000 01</ns1:iban><ns1:gsm>+90 555 000 00 00</ns1:gsm>" +
   "<ns1:card>4111-1111-1111-1111</ns1:card><ns1:amount>150</ns1:amount></ns1:pay></soap:Body></soap:Envelope>";
+// app-002 only: an XML response with the shapes seen on the team's Kibana (Plan 6 spec §8.2): an xmlns declaration,
+// attributes, a repeated element, an element of attributes only, text beside an attribute and escaped XML inside an
+// element. tests/e2e/copy.spec.ts and json.spec.ts expect its JSON form; none of its values is a value-mask match.
+const PAYMENT_RESPONSE_XML = [
+  '<?xml version="1.0" encoding="UTF-8"?>',
+  '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
+  "  <soap:Body>",
+  '    <Result code="00">',
+  '      <Bet Id="7" Type="S"><Sel>A</Sel></Bet>',
+  '      <Bet Id="8" Type="S"/>',
+  '      <Amount currency="TRY">150</Amount>',
+  '      <Payload>&lt;?xml version="1.0"?&gt;&lt;race&gt;&lt;runId&gt;42&lt;/runId&gt;&lt;/race&gt;</Payload>',
+  "    </Result>",
+  "  </soap:Body>",
+  "</soap:Envelope>",
+].join("\n");
 
 // Start from scratch, so a re-run gives the same documents.
 await es("DELETE", "/app_log,legacy_log?ignore_unavailable=true");
@@ -58,7 +74,7 @@ for (let i = 1; i <= 30; i++) {
         body: JSON.stringify({ amount: i * 10, currency: "TRY", items: [{ id: i, qty: 1 }] }),
         headers: JSON.stringify({ "user-agent": "dev/1.0", authorization: `Bearer synthetic-token-${i}` }),
         query: JSON.stringify({ page: i % 5 }),
-        ...(i === 2 ? { request: PAYMENT_XML } : {}),
+        ...(i === 2 ? { request: PAYMENT_XML, response: PAYMENT_RESPONSE_XML } : {}),
       },
       extra: { uid: `uid-${pad(i)}` },
     },
```

Run: `node --check docker/seed.mjs`
Expected: çıktı yok.

- [ ] **Step 2: Senaryoları yaz**

- `copyFromMenu` dört öğeyi bilir.
- `copy.spec.ts`: app-002'nin Markdown beklentisi json bloklarına geçer; yeni "JSON olarak kopyala" senaryosu; menü sıraları 2 ve 3'e kayar; klavye testi dört öğeyi sayar.
- `json.spec.ts`: XML alanlarının senaryosu.
- `spaces.spec.ts`: log linki 2. sıraya kayar.

```diff
diff --git a/tests/e2e/copy.spec.ts b/tests/e2e/copy.spec.ts
index c29d61b..d33d1af 100644
--- a/tests/e2e/copy.spec.ts
+++ b/tests/e2e/copy.spec.ts
@@ -9,6 +9,23 @@ test.beforeEach(async ({ configure }) => {
 });
 
 const APP_001 = { dataViewId: "app-log", query: 'extra.uid:"uid-001"' };
+const APP_002 = { dataViewId: "app-log", query: 'extra.uid:"uid-002"' };
+// app-002's context.request (PAYMENT_XML, values masked) and context.response (PAYMENT_RESPONSE_XML) as JSON (docker/seed.mjs).
+const REQUEST = { Envelope: { Body: { pay: { identitynumber: "***", iban: "***", gsm: "***", card: "***", amount: "150" } } } };
+const RESPONSE = {
+  Envelope: {
+    Body: {
+      Result: {
+        "@code": "00",
+        Bet: [{ "@Id": "7", "@Type": "S", Sel: "A" }, { "@Id": "8", "@Type": "S" }],
+        Amount: { "@currency": "TRY", "#text": "150" },
+        Payload: { race: { runId: "42" } },
+      },
+    },
+  },
+};
+/** A value as the Markdown copy writes it inside a field's json block. */
+const jsonBlock = (value: unknown): string => JSON.stringify(value, null, 2).replace(/^/gm, "  ");
 const DOC_LINK = `${stack.origin}${prefixOf()}/app/discover#/doc/app-log/app_log?id=app-001`;
 
 test("copies the log as masked Markdown", async ({ context }) => {
@@ -22,20 +39,29 @@ test("copies the log as masked Markdown", async ({ context }) => {
   expect(lines.at(-1)?.endsWith(`](${DOC_LINK})`)).toBe(true); // the link text is localized
 });
 
-test("masks the ID, IBAN, mobile and card numbers inside an XML value and keeps the XML", async ({ context }) => {
-  // app-002's context.request holds synthetic values (docker/seed.mjs, PAYMENT_XML).
-  const { page, detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-002"' });
-  const lines = (await copyFromMenu(page, detail, 0)).split("\n");
-  expect(lines).toContain(
-    "- `context.request`: <soap:Envelope><soap:Body><ns1:pay><ns1:identitynumber>***</ns1:identitynumber>" +
-      "<ns1:iban>***</ns1:iban><ns1:gsm>***</ns1:gsm><ns1:card>***</ns1:card><ns1:amount>150</ns1:amount>" +
-      "</ns1:pay></soap:Body></soap:Envelope>",
-  );
+test("writes XML values as masked json blocks in the Markdown copy", async ({ context }) => {
+  // Plan 5 spec §5 and Plan 6 spec §5.4: the ID, IBAN, mobile and card numbers inside PAYMENT_XML are masked.
+  const { page, detail } = await openDoc(context, APP_002);
+  const markdown = await copyFromMenu(page, detail, 0);
+  expect(markdown).toContain(`- \`context.request\`:\n  \`\`\`json\n${jsonBlock(REQUEST)}\n  \`\`\``);
+  expect(markdown).toContain(`- \`context.response\`:\n  \`\`\`json\n${jsonBlock(RESPONSE)}\n  \`\`\``);
+});
+
+test("copies the log as JSON with its JSON and XML text expanded and masked", async ({ context }) => {
+  // Plan 6 spec §6.
+  const { page, detail } = await openDoc(context, APP_002);
+  const copied = JSON.parse(await copyFromMenu(page, detail, 1));
+  expect(Object.keys(copied)).toEqual(["_index", "_id", "_source"]);
+  expect(copied._index).toBe("app_log");
+  expect(copied._id).toBe("app-002");
+  expect(copied._source.context.request).toEqual(REQUEST);
+  expect(copied._source.context.response).toEqual(RESPONSE);
+  expect(copied._source.context.headers).toEqual({ "user-agent": "dev/1.0", authorization: "***" });
 });
 
 test("copies the log link, and the link opens the same log", async ({ context }) => {
   const { page, detail } = await openDoc(context, APP_001);
-  expect(await copyFromMenu(page, detail, 1)).toBe(DOC_LINK);
+  expect(await copyFromMenu(page, detail, 2)).toBe(DOC_LINK);
   const doc = await context.newPage();
   await doc.goto(DOC_LINK);
   await expect(doc.getByText("app-001", { exact: true }).first()).toBeVisible({ timeout: 90_000 });
@@ -44,7 +70,7 @@ test("copies the log link, and the link opens the same log", async ({ context })
 test("copies the view with its relative time range made absolute", async ({ context }) => {
   const { page, detail } = await openDoc(context, { ...APP_001, time: { from: "now-5y", to: "now" } });
   const before = Date.now();
-  const url = await copyFromMenu(page, detail, 2);
+  const url = await copyFromMenu(page, detail, 3);
   const hash = new URL(url).hash;
   const time = readGlobalTime(hash) ?? { from: "", to: "" };
   const to = Date.parse(time.to);
@@ -63,7 +89,7 @@ test("the copy menu works with the keyboard and closes on a click outside", asyn
   await page.keyboard.press("ArrowDown");
   await expect(items.nth(1)).toBeFocused();
   await page.keyboard.press("End");
-  await expect(items.nth(2)).toBeFocused();
+  await expect(items.nth(3)).toBeFocused();
   await page.keyboard.press("ArrowDown");
   await expect(items.first()).toBeFocused();
   await page.keyboard.press("Escape");
@@ -71,7 +97,7 @@ test("the copy menu works with the keyboard and closes on a click outside", asyn
   await expect(trigger).toBeFocused();
   await expect(detail).toBeVisible(); // Escape stayed in the bar: Kibana kept the row or flyout open
   await trigger.click();
-  await expect(items).toHaveCount(3);
+  await expect(items).toHaveCount(4);
   await detail.locator('[data-test-subj="kbnDocViewer"]').click({ position: { x: 5, y: 5 } });
   await expect(items).toHaveCount(0);
 });
diff --git a/tests/e2e/json.spec.ts b/tests/e2e/json.spec.ts
index 4a800ed..5a983e8 100644
--- a/tests/e2e/json.spec.ts
+++ b/tests/e2e/json.spec.ts
@@ -14,6 +14,16 @@ test("opens JSON text fields as a searchable tree", async ({ context }) => {
   await expect(bar(detail).locator(".kt-row.kt-match")).toHaveCount(1);
 });
 
+test("opens XML text fields as a tree, with the escaped XML inside them opened too", async ({ context }) => {
+  // Plan 6 spec §5.3: app-002's context.request and context.response are XML (docker/seed.mjs).
+  const { detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-002"' });
+  await bar(detail).locator(".kt-bar > button.kt-ghost").click();
+  await expect(bar(detail).locator(".kt-fields button", { hasText: "context.request" })).toHaveText("context.request · XML");
+  await bar(detail).locator(".kt-fields button", { hasText: "context.response" }).click();
+  await expect(bar(detail).locator(".kt-row .kt-key", { hasText: "@currency" })).toBeVisible();
+  await expect(bar(detail).locator(".kt-row .kt-key", { hasText: "runId" })).toBeVisible();
+});
+
 test("shows no JSON button for a log without JSON text", async ({ context }) => {
   const { detail } = await openDoc(context, { dataViewId: "logs", query: 'trace.id:"trace-0001"' });
   await expect(bar(detail).locator(".kt-bar > button.kt-ghost")).toHaveCount(0);
diff --git a/tests/e2e/kibana.ts b/tests/e2e/kibana.ts
index b911b46..bf53d75 100644
--- a/tests/e2e/kibana.ts
+++ b/tests/e2e/kibana.ts
@@ -55,8 +55,8 @@ export async function barLinks(detail: Locator): Promise<Record<string, string>>
   return Object.fromEntries(entries);
 }
 
-/** Runs a copy menu item (0 Markdown, 1 log link, 2 view with fixed time) and returns what it copied. */
-export async function copyFromMenu(page: Page, detail: Locator, item: 0 | 1 | 2): Promise<string> {
+/** Runs a copy menu item (0 Markdown, 1 JSON, 2 log link, 3 view with fixed time) and returns what it copied. */
+export async function copyFromMenu(page: Page, detail: Locator, item: 0 | 1 | 2 | 3): Promise<string> {
   await bar(detail).locator(".kt-menu > button").click();
   await bar(detail).getByRole("menuitem").nth(item).click();
   await expect(bar(detail).getByRole("status")).toBeVisible();
diff --git a/tests/e2e/spaces.spec.ts b/tests/e2e/spaces.spec.ts
index aa9e059..fe126e3 100644
--- a/tests/e2e/spaces.spec.ts
+++ b/tests/e2e/spaces.spec.ts
@@ -10,7 +10,7 @@ test.beforeEach(async ({ configure }) => {
 test("works in a space, under the base path on 7.17", async ({ context }) => {
   const { page, detail } = await openDoc(context, { space: "test", dataViewId: "test-app-log", query: 'extra.uid:"uid-001"' });
   expect((await barLinks(detail)).User).toBe("https://admin.example.com/users/100001");
-  expect(await copyFromMenu(page, detail, 1)).toBe(`${stack.origin}${prefixOf("test")}/app/discover#/doc/test-app-log/app_log?id=app-001`);
+  expect(await copyFromMenu(page, detail, 2)).toBe(`${stack.origin}${prefixOf("test")}/app/discover#/doc/test-app-log/app_log?id=app-001`);
 });
 
 test("9.x Observability view: the bar works on the Log overview tab", async ({ context }) => {
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: hatasız.

- [ ] **Step 4: Seed'i yığınlara yükle**

```bash
./docker/up.sh 7 && ./docker/up.sh 8 && ./docker/up.sh 9
```
Expected: her biri `seeded Kibana <sürüm>` ile biter. Script sırları yazdırmaz.

- [ ] **Step 5: E2E matrisini çalıştır**

```bash
KT_STACK=7 npm run e2e
KT_STACK=8 npm run e2e
KT_STACK=9 npm run e2e
```
Expected: 7.17'de 25 geçer 3 atlanır; 8.19'da 25 geçer 3 atlanır; 9.5'te 26 geçer 3 atlanır.

```bash
KT_STACK=7 npx playwright test copy json --repeat-each=3
KT_STACK=9 npx playwright test copy json --repeat-each=3
```
Expected: kırılan yok. Sonuçları Task 6'nın kaydı için not al.

- [ ] **Step 6: Bütün kontroller ve commit**

```bash
npm test 2>&1 | tail -4        # 404 test geçer
npm run typecheck && npm run build && npm run check:manifest
git branch --show-current   # plan-6-xml-json
git add docker/seed.mjs tests/e2e/kibana.ts tests/e2e/copy.spec.ts tests/e2e/json.spec.ts tests/e2e/spaces.spec.ts
git commit -m "test: e2e for XML as JSON and the JSON copy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Belgeler: README, CHANGELOG, CLAUDE.md, store listing

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `CLAUDE.md`
- Modify: `docs/store-listing.md`

**Interfaces:**
- Consumes: Task 1–4'ün davranışı.
- Produces: yok.

- [ ] **Step 1: Belgeleri güncelle**

- **README:** JSON görünümü ve ⋯ menüsü maddeleri; yer tutucularda XML yolları; yeni "XML" bölümü; "Copy and masking" iki kopyayı anlatır.
- **CHANGELOG** (1.0.0): kopya menüsü, JSON görünümü ve yeni "XML as JSON" maddesi.
- **CLAUDE.md:** `src/core/` satırı, iki yeni tuzak, "Docs" satırında Plan 6.
- **Store listing:** EN ve TR birer yeni madde (spec §9).

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index 3f937a8..9894c56 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -13,13 +13,17 @@ First public release, for Kibana 7.17, 8.x and 9.x in Chrome.
   built from the log's raw fields, which are read from your Kibana with your own session.
 - Link actions: URL templates with `{field|fallback}` placeholders and conditions.
 - Discover actions: a KQL query from the log, optionally ±N minutes around the log's time, in a new tab.
-- Copy menu: the log as Markdown with sensitive fields masked, a link to the log, and the current view with
-  its time range fixed.
+- Copy menu: the log as Markdown or as JSON with sensitive fields masked, a link to the log, and the current
+  view with its time range fixed.
 - Masking inside values: "Copy as Markdown" also masks Turkish IBANs, Turkish ID numbers (TCKN, with a valid
   checksum), Turkish mobile numbers and card numbers (Visa, Mastercard, Amex and Troy, with a valid Luhn digit)
   wherever they appear in a value, such as XML or plain-text request bodies. Each kind can be turned off; all
   four are on by default.
-- JSON view for fields that hold JSON text: a tree with search, and copying a value or its path.
+- JSON view for fields that hold JSON or XML text: a tree with search, and copying a value or its path.
+- XML as JSON: fields that hold XML text, such as SOAP bodies, are read as JSON in the JSON view, in both copies
+  and in placeholders. Namespace prefixes are dropped, attributes become `@name` and the text beside them
+  `#text`, and every value stays text. "Copy as JSON" writes `_index`, `_id` and `_source` with all JSON and
+  XML text expanded; field-name masks now reach XML element names too.
 - Options page: environments with per-site access, an action editor with a live preview, copy and masking
   settings, export and import.
 - Environment variables: `{env.name}` placeholders take each environment's own value, set in a variables
diff --git a/CLAUDE.md b/CLAUDE.md
index c566ced..d49e5a6 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -28,7 +28,7 @@ Dev Kibana stacks: `./docker/up.sh 7|8|9` starts Kibana 7.17.29 on :17601 under
 **The content script is not in the manifest.** The manifest has only `storage` + `scripting` and `optional_host_permissions`. When the user adds a Kibana environment on the options page, the options page requests that origin. `entrypoints/background.ts` → `src/background/registration.ts` then registers `kibana.js` with `scripting.registerContentScripts` for the granted origins only. It re-syncs on install, startup, permission changes and config changes, one run at a time (`serialized`). `scripts/check-manifest.mjs` fails if `content_scripts` or `host_permissions` ever appear in the built manifest.
 
 **Layers:**
-- `src/core/` is pure logic with no browser APIs: the config schema (zod), field flattening (which also expands JSON-string values), `{path|fallback}` templates, conditions, and copy masking: by field name (`mask.ts`) and inside values (`value-mask.ts`: IBAN, TCKN, GSM, card).
+- `src/core/` is pure logic with no browser APIs: the config schema (zod), field flattening (which also expands JSON and XML text; `xml.ts` is the XML parser), `{path|fallback}` templates, conditions, and copy masking: by field name (`mask.ts`) and inside values (`value-mask.ts`: IBAN, TCKN, GSM, card).
 - `src/kibana/` handles Kibana I/O and URL/state parsing.
 - `src/adapters/` only reads the DOM.
 - `src/theme.ts` holds every color: the Borealis light and dark palettes, as `--kt-*` custom properties for the bar's shadow root and the options page. `tests/unit/theme.test.ts` fails if a pair drops below its WCAG contrast floor.
@@ -48,6 +48,8 @@ Dev Kibana stacks: `./docker/up.sh 7|8|9` starts Kibana 7.17.29 on :17601 under
 - The bar picks light or dark from the first opaque background behind its host (`themeBehind`), not from Kibana's theme setting: 7.17, 8.x and 9.x mark the theme differently, and 9.x can follow the system.
 - Render log values through React only; never use `innerHTML`. Log field values in URL templates go through `encodeURIComponent`, and templates must start with `http(s)://` or an `{env.…}` placeholder.
 - Settings validation repairs, it does not reject, unknown environmentIds: parseConfig drops them and disables an action left with none (an empty list would mean "all environments").
+- XML text is parsed by `src/core/xml.ts`, never `DOMParser`: core has no browser APIs, and happy-dom (the unit tests' DOM) rejects CDATA and undeclared prefixes that Chrome accepts. Its values are always strings; `@name` keys are attributes and `#text` the text beside them, so the placeholder pattern allows `#`.
+- The copies run `expandStructured` before `maskValue`; `maskValue` never parses text itself.
 - `{env.<name>}` placeholder paths are environment variables, never log fields. Their values go into link URLs unencoded (they come from the user's settings, not the log); field values are always encoded.
 - A settings schema change bumps `schemaVersion` and converts older input inside `parseConfig`. `storage.ts` turns anything `parseConfig` rejects into the empty config, so a missing conversion silently wipes stored settings.
 - A new UI string needs a key in the `MessageKey` union in `src/i18n.ts` and an entry in both `public/_locales/en/messages.json` and `public/_locales/tr/messages.json`.
@@ -55,4 +57,4 @@ Dev Kibana stacks: `./docker/up.sh 7|8|9` starts Kibana 7.17.29 on :17601 under
 
 ## Docs
 
-Code comments cite the design spec by section (`spec §5.1`). The spec and plans live in `docs/superpowers/`, which is gitignored, local-only and written in Turkish, so a fresh clone won't have them. `docs/verification/` is tracked. Plans 1 (link actions), 2 (Discover actions, copy/mask, JSON view, full options page), 3 (e2e matrix, CI, store package), 4 (environment variables, data views by name) and 5 (masking inside values) are done. `.github/workflows/ci.yml` runs the unit checks and the e2e matrix on every pull request.
+Code comments cite the design spec by section (`spec §5.1`). The spec and plans live in `docs/superpowers/`, which is gitignored, local-only and written in Turkish, so a fresh clone won't have them. `docs/verification/` is tracked. Plans 1 (link actions), 2 (Discover actions, copy/mask, JSON view, full options page), 3 (e2e matrix, CI, store package), 4 (environment variables, data views by name), 5 (masking inside values) and 6 (XML as JSON, "Copy as JSON") are done. `.github/workflows/ci.yml` runs the unit checks and the e2e matrix on every pull request.
diff --git a/README.md b/README.md
index eeef753..3221cee 100644
--- a/README.md
+++ b/README.md
@@ -12,8 +12,8 @@ a bar above it with:
 
 - **Link actions** that jump to another system with a value from the log, e.g. `https://admin.example.com/users/{user_id}`.
 - **Discover actions** that open related logs in a new tab: the same user's logs, or everything ±5 minutes around this log.
-- **JSON**: fields that hold JSON text, such as a request body, as a tree you can search and copy from.
-- **⋯** to copy the log as Markdown with sensitive fields and values masked, a link to the log, or the current view with its time range fixed.
+- **JSON**: fields that hold JSON or XML text, such as a request body, as a tree you can search and copy from.
+- **⋯** to copy the log as Markdown or JSON with sensitive fields and values masked, a link to the log, or the current view with its time range fixed.
 
 ## Set up
 
@@ -31,7 +31,7 @@ a bar above it with:
 ### Placeholders and conditions
 
 - `{field}` is a field of the raw log. Nested fields use dots (`context.user_id`), and fields that hold JSON
-  text can be read inside too (`context.body.amount`).
+  or XML text can be read inside too (`context.body.amount`, `context.request.Envelope.Body.Id`; see [XML](#xml)).
 - `{a|b|c}` uses the first field that has a value. If none has one, the button is hidden.
 - `{env.name}` is a variable of the environment you are in (see **Variables**), e.g. `{env.adminUrl}/users/{user_id}`.
   It goes into links as it is and is quoted like a field in KQL. A link may start with one if its value is an
@@ -55,13 +55,27 @@ These are in [`examples/kibanatool-settings.json`](examples/kibanatool-settings.
 | This user in all logs | Discover on the `*_log` data view, 60-minute window | `user_id:{user_id}` |
 | ±5 minutes | Discover, 5-minute window | empty query |
 
+### XML
+
+Fields that hold XML text, such as SOAP request and response bodies, are read as JSON: in the JSON view, in
+both copies and in placeholders.
+
+- Namespace prefixes are dropped: `soap:Envelope` becomes `Envelope`.
+- An attribute becomes `@name`, and the text of an element that has attributes becomes `#text`
+  (`{context.request.Amount.#text}`).
+- An element that appears more than once becomes a list. Every value stays text, so `00` keeps its zeros.
+- XML or JSON escaped inside a value is opened too, up to five levels deep.
+- Text that is not well-formed XML, such as an HTML error page, stays as it is.
+
 ### Copy and masking
 
-"Copy as Markdown" masks every field whose path matches a pattern under **Copy and masking** (by default
-`*authorization*`, `*password*`, `*token*`, `*secret*` and `*cookie*`), keys inside JSON text included.
+"Copy as JSON" copies the log's `_index`, `_id` and `_source`, with the JSON and XML text inside it expanded.
+
+Both copies mask every field whose path matches a pattern under **Copy and masking** (by default
+`*authorization*`, `*password*`, `*token*`, `*secret*` and `*cookie*`), keys inside JSON and XML text included.
 
-It also looks inside every value, so XML and plain-text bodies that a field name cannot reach are covered
-too, and replaces each of these with `***`. Each kind can be turned off under **Mask inside values**:
+They also look inside every value, such as plain-text bodies that a field name cannot reach, and replace each
+of these with `***`. Each kind can be turned off under **Mask inside values**:
 
 - Turkish IBANs: `TR` and 24 digits, written together or in the usual groups of four.
 - Turkish ID numbers (TCKN): 11 digits with a valid checksum.
diff --git a/docs/store-listing.md b/docs/store-listing.md
index ac46a67..61a1f9a 100644
--- a/docs/store-listing.md
+++ b/docs/store-listing.md
@@ -27,6 +27,8 @@ It works on Kibana 7.17, 8.x and 9.x.
   or copy the current view with its time range fixed.
 - IBANs, ID numbers and mobile numbers (Turkish formats) and card numbers are masked in the copy too, even
   inside XML or plain-text request bodies.
+- Read XML request and response bodies as a JSON tree too, and copy the whole log as JSON with the XML and JSON
+  text inside it expanded.
 
 You choose which Kibana addresses it runs on. It talks only to your Kibana, with your own session, and keeps
 its settings in your browser. Open source: https://github.com/cllakyz/kibanatool
@@ -43,6 +45,8 @@ Kibana 7.17, 8.x ve 9.x'te çalışır.
   zamanı sabitlenmiş mevcut görünümü kopyalayın.
 - Kopyada IBAN, TC kimlik no, cep telefonu ve kart numaraları da maskelenir; XML ya da düz metin istek
   gövdelerinin içinde olsalar bile.
+- XML istek ve yanıt gövdelerini de JSON ağacı olarak okuyun, logun tamamını içindeki XML ve JSON metinleri
+  açılmış halde JSON olarak kopyalayın.
 
 Hangi Kibana adreslerinde çalışacağını siz seçersiniz. Yalnızca kendi Kibana'nızla, kendi oturumunuzla konuşur,
 ayarlarını tarayıcınızda tutar. Açık kaynak: https://github.com/cllakyz/kibanatool
```

- [ ] **Step 2: Kontroller**

```bash
npm test 2>&1 | tail -4        # 404 test geçer
npm run typecheck && npm run build && npm run check:manifest
```

- [ ] **Step 3: Commit**

```bash
git branch --show-current   # plan-6-xml-json
git add README.md CHANGELOG.md CLAUDE.md docs/store-listing.md
git commit -m "docs: XML as JSON and the JSON copy in the README, changelog, CLAUDE.md and store listing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Doğrulama ve PR

**Files:**
- Create: `docs/verification/2026-10-plan-6.md`

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

`docs/verification/2026-10-plan-6.md` dosyasını oluştur. Değerler Step 1'in gerçek çıktısından ve Task 4'ün `--repeat-each` koşusundan gelir.

```markdown
# Plan 6 doğrulaması (XML'i JSON olarak gösterme ve kopyalama)

- **Tarih:** <YYYY-MM-DD>
- **Dal:** `plan-6-xml-json`, HEAD `<kısa SHA>` (kayıt commit'inden önceki HEAD)
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
| `--repeat-each=3` (`copy`, `json`; 7.17 ve 9.5) | <sonuç> |

## Elle kontroller

| # | Kontrol | Sonuç |
|---|---|---|
| M1 | Kullanıcının Chrome'unda eklenti bu dalın derlemesiyle yenilendi (`chrome://extensions` → yenile). Alpha'da `payment_log`, `tjk_webhook_log` ve `altenar_api_log` kayıtlarında JSON görünümü XML alanlarını `· XML` etiketiyle listeliyor ve ağaç olarak açıyor. tjk'daki kaçışlı iç XML de açılıyor; altenar'da attribute'lar `@` önekli. | |
| M2 | Alpha'da bir `payment_log` kaydında "JSON olarak kopyala" ve "Markdown olarak kopyala" kullanıldı. XML iç içe nesne olarak geliyor, TCKN ve IBAN `***`. | |
```
Tarih, SHA ve sürüm alanlarını gerçek değerlerle doldurmadan dosyayı commit etme.

- [ ] **Step 3: Elle kontrolleri kullanıcıdan iste**

1. **M1.** Kullanıcı eklentiyi bu dalın derlemesiyle (`.output/chrome-mv3`) yeniler. Alpha'da üç index'ten birer kaydın JSON görünümüne bakar.
2. **M2.** Kullanıcı Alpha'da bir `payment_log` kaydında iki kopyayı da alır ve yapıştırdığı metne kendisi bakar.
   - Kopyalanan metni sohbete istemezsin, okumazsın ve yazmazsın. Gerçek kişisel veri içerir.
   - Sonucu kullanıcının "geçti" ya da "geçmedi" yanıtı belirler.
3. Sonuçları tabloya yaz.
4. Bir kontrol geçmezse dur ve kullanıcıya sor. Kendi başına düzeltme yapma.

- [ ] **Step 4: Kayıt commit'i**

```bash
git branch --show-current   # plan-6-xml-json
git add docs/verification/2026-10-plan-6.md
git commit -m "docs: record Plan 6 verification

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
| Birim testleri: 382 → 391 → 404 | Task 1, 2, 3 |
| `npm run typecheck`, `build`, `check:manifest` | Her task |
| E2E 7.17 / 8.19 / 9.5: 25+3 / 25+3 / 26+3 | Task 4, Task 6 |
| `--repeat-each=3` (`copy`, `json`; 7.17 ve 9.5) | Task 4 |
| `npm run zip` | Task 6 |

## Elle kontroller

| # | Kontrol | Kim |
|---|---|---|
| M1 | Alpha'da `payment_log`, `tjk_webhook_log`, `altenar_api_log` JSON görünümü | Kullanıcı |
| M2 | Alpha'da `payment_log`: "JSON olarak kopyala" ve Markdown kopyası, TCKN ve IBAN `***` | Kullanıcı |
