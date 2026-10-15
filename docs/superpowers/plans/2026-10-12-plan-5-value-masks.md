# kibanatool Plan 5 — Değere Göre Maskeleme: Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Markdown olarak kopyala" çıktısında, alan adından bağımsız olarak her değerin içindeki dört türü maskelemek: IBAN (TR), TC kimlik no, GSM (TR) ve kart numarası. Hedef, alan adı maskesinin ulaşamadığı XML ve düz metin alanları.

**Architecture:**
- **Tanıma:** Yeni ve saf bir modül, `src/core/value-mask.ts`. Her tür önce bir aday regex'iyle aranır, aday sonra kodda doğrulanır: önek, uzunluk, TCKN checksum'u, Luhn. Sınır kuralı uygulanır ve arama sabit bir sırayla yapılır.
- **Uygulama:** `maskValue` (`src/core/mask.ts`) alan adı maskesinden sonra, JSON olmayan her metne ve her sayıya `maskText`'i uygular. Bunu yalnızca `buildMarkdown` kullanır.
- **Ayarlar:** Ayar şeması 3. sürüme çıkar ve `copy.valueMasks` alanını kazanır. Sürüm 1 ve 2 girdiler `parseConfig` içinde çevrilir, dört tür de açık gelir.
- **Ayarlar sayfası:** "Kopyalama ve maskeleme" bölümüne dört onay kutusu eklenir.

**Tech Stack:** Plan 4 ile aynı, yeni bağımlılık yok.
- Uygulama: WXT 0.21, React 19, TypeScript 5.9 (strict)
- Kütüphaneler: zod 4
- Test: Vitest 5, happy-dom 20, Playwright 1.64
- Ortam: Docker (Elasticsearch + Kibana 7.17.29 / 8.19.23 / 9.5.5)

**Spec:** `docs/superpowers/specs/2026-10-12-value-masks-design.md`, kullanıcı 2026-10-12'de onayladı. Ana spec: `docs/superpowers/specs/2026-10-07-kibanatool-design.md`. Ayar modelinin önceki hali: `docs/superpowers/specs/2026-10-09-env-variables-design.md` §3.

**Önceki planlar:** Plan 1–4 ve Borealis tema işi `main`'de. Son merge commit'i `bbdeb2d` (PR #5).

**Çalışma dalı:** Ana checkout'ta yeni dal `plan-5-value-masks` açılır, worktree açılmaz. `docs/superpowers/` hiçbir commit'e girmez.

**Sürüm:** Bu özellik yayınlanmamış 1.0.0'a dahil (kullanıcı kararı). `package.json` sürümü değişmez.

### Planların sırası

| Plan | Kapsam |
|---|---|
| 1–4 (tamamlandı) | Link ve Discover aksiyonları, kopyalama, JSON görünümü, ayarlar sayfası, uçtan uca matris, CI, mağaza paketi, ortam değişkenleri, adla data view |
| **5 (bu plan)** | Değerin içinde IBAN, TCKN, GSM ve kart maskeleme; ayar sürümü 3; ayarlar sayfasında dört onay kutusu |

### Kararlar

Hepsi kullanıcıyla 2026-10-12'de tek tek alındı (spec §2). Bu planda kullanıcıya bırakılmış açık karar yok.

| Konu | Karar |
|---|---|
| Kapsam | Yalnız "Markdown olarak kopyala". JSON görünümü, ekran, linkler ve diğer kopyalama seçenekleri değişmez. |
| Desenler | Gömülü dört tür, her biri açılıp kapatılabilir. Kullanıcı regex'i yok. |
| TCKN | Checksum zorunlu. |
| GSM | `+90`, `90`, `0` önekli biçimler ve öneksiz `5xxxxxxxxx`. |
| Kart | Luhn, ağ öneki ve uzunluk birlikte aranır. Ağlar: Visa, Mastercard, Amex, Troy. |
| IBAN | Yalnız `TR`, checksum yok. |
| Biçim | Eşleşen parça `***` olur, metnin geri kalanı kalır. |
| Varsayılan | Dördü de açık. Bu hem yeni kurulumda hem de sürüm 1 ve 2'den çevrilen ayarlarda geçerli. |
| Sınır | Eşleşmenin önünde ve arkasında harf ya da rakam bulunamaz. |
| Yaklaşım | A: yalnız değer desenleri. XML eleman adı maskesi kapsam dışı. |
| Eklenti sürümü | 1.0.0'a dahil. Ayar şeması 3. |

### Plan yazılırken yapılan denemeler (2026-10-12)

| Deneme | Sonuç |
|---|---|
| Alpha ölçümü (spec §3) | Hassas değerler payment ve withdraw'da duruyor. coupon, tjk ve altenar'da yalnız yanlış eşleşme adayları var: Luhn'dan geçen seri numaraları ve id'ler, checksum'u tutan 11 haneli id'ler. sms metninde dört türün hiçbiri yok. |
| Bu planın kodu, `main`'in (`bbdeb2d`) geçici bir worktree kopyasına Task 1–6'daki haliyle uygulandı | `npm test`: 309 testten 341 teste çıktı, hepsi geçti. `npm run typecheck`, `npm run build` ve `npm run check:manifest` geçti. `node --check docker/seed.mjs` geçti. **E2E bu denemede çalıştırılmadı**, çünkü docker yığınları kapalıydı. E2E, Task 2 ve Task 5'te çalışır. |
| Task 5'in beklediği Markdown satırı | Seed'deki `PAYMENT_XML` metni `buildMarkdown`'a verildi. Copy.spec'in beklediği satır birebir üretildi (geçici birim testiyle). |
| 1 MB'lık, rakam dizileriyle dolu XML üzerinde `maskText` | Birkaç milisaniye sürdü. Regex'lerin hiçbirinde iç içe sınırsız niceleyici yok. |
| zod 4 hata yolları | Bilinmeyen tür için yol `copy.valueMasks.<i>`, mesaj `Invalid option: expected one of …`. Eksik liste için yol `copy.valueMasks`. Sürüm 4 için `schemaVersion: Invalid input: expected 3`. Aynı tür iki kez yazılırsa kabul ediliyor. |
| Sentetik test değerleri | Checksum'u hesaplanmış TCKN'ler: `10000000146`, `20000000046`. Luhn'dan geçenler: Troy `9792000000000003`, coupon benzeri `70000000000120`, altenar benzeri `900000000000000126`. Ağların test numaraları: `4111111111111111`, `5555555555554444`, `2221000000000009`, `378282246310005`. `4111111111111112` Luhn'dan geçmiyor. |

### Uygulama notları

- **`MASK` sabiti** `src/core/mask.ts`'ten `src/core/value-mask.ts`'e taşınır. `mask.ts` onu yeniden dışa aktarır, böylece mevcut import'lar kırılmaz. Bağımlılık tek yönlüdür: `mask.ts` → `value-mask.ts`.
- **`withCopySettings` iki kez değişir. Bu bilinçli, kusur değil.**
  - Task 2'de sürüm 3 şeması `copy.valueMasks`'ı zorunlu kılar. Bugünkü `withCopySettings`, `copy`'yi baştan yazdığı için alanı düşürür ve ayarlar sayfasındaki "Kaydet" bozulur. Bu yüzden Task 2'de yalnızca `...config.copy` yayılır.
  - Task 4'te fonksiyon onay kutularının listesini parametre olarak alır.
- **E2E iki task'ta çalışır.** Task 2, `tests/e2e/fixtures.ts` ile `tests/e2e/options.spec.ts`'i sürüm 3'e çeker. Typecheck bunu gerektirir. Bu yüzden Task 2 `options` testlerini üç yığında çalıştırır. Task 5 seed'i değiştirir ve bütün matrisi çalıştırır.
- **Docker yığınları plan yazılırken kapalıydı.** E2E'den önce `./docker/up.sh 7`, `8` ve `9` çalıştırılır. Script yığın zaten açıksa da her çalıştırmada seed'i yeniden yükler. Seed değişikliği (Task 5) ancak bu yeniden yüklemeyle yığınlara girer.

## Global Constraints

- **Node ve npm:** Node `>=22`, paket yöneticisi `npm`. **Yeni bağımlılık eklenmez.**
- **TypeScript:** `typescript@5`, `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax` (tip import'ları `type` ile). `npm run typecheck`, `tests/e2e/` ve `playwright.config.ts` dosyalarını da kapsar.
- **Desteklenen Kibana sürümleri:** 7.17.29, 8.19.23 ve 9.5.5. Yalnızca Chrome MV3, yalnızca Discover.
- **Manifest izinleri değişmez:**
  - `permissions` tam olarak `["storage", "scripting"]`
  - `optional_host_permissions` tam olarak `["http://*/*", "https://*/*"]`
  - `npm run check:manifest` her task'ın sonunda geçer.
- **Ayar modeli (spec §6):**
  - `schemaVersion: 3`.
  - `copy.valueMasks: ("iban" | "tckn" | "gsm" | "card")[]`. Sürüm 3'te zorunlu. Boş liste "hepsi kapalı" demek.
  - Dört ad dışında bir değer reddedilir. Tekrar eden ad kabul edilir.
  - Sürüm 1 ve 2 `parseConfig` içinde 3'e çevrilir ve `copy.valueMasks` dört türle doldurulur. Başka sürümler reddedilir.
  - `emptyConfig()` dört türü açık getirir.
  - Kayıt sırası: `iban`, `tckn`, `gsm`, `card`.
- **Tanıma (spec §4):**
  - **Arama sırası:** IBAN, kart (önce 16 hane, sonra 15), TCKN, GSM.
  - **Sınır:** Eşleşmenin önünde ve arkasında `\p{L}` ya da `\p{N}` bulunamaz.
  - **Ayırıcı:** Tek boşluk. Kartta ve GSM'de tek tire de kabul edilir.
  - **Değişim:** Eşleşen parça, ayırıcıları ve önekleri dahil, `***` olur.
- **Uygulama (spec §5):**
  - Yalnız `buildMarkdown`. Başlık satırı ve sondaki link taranmaz.
  - Alan adı maskesi önce gelir.
  - JSON metni çözülür; içindeki metin ve sayı yaprakları taranır, anahtarlar taranmaz.
  - Sayı yaprağı eşleşirse `"***"` metni olur. Boolean ve `null` değerlere dokunulmaz.
- **Gizlilik:**
  - Testlerde ve seed'de yalnız sentetik değerler kullanılır.
  - Alpha'dan ya da başka gerçek bir kaynaktan hiçbir değer koda, teste, commit'e ya da rapora girmez.
- **Kibana'yı bozmamak:** İçerik betiği hiçbir hatayı dışarı sızdırmaz; hatalar `console.debug("[kibanatool]", ...)` ile loglanır. `maskText` hata fırlatmaz.
- **UI:**
  - Shadow DOM içinde React. `innerHTML` ya da `dangerouslySetInnerHTML` kullanılmaz.
  - Her yeni kullanıcı metni hem `public/_locales/en/messages.json` hem `public/_locales/tr/messages.json` dosyasına eklenir.
  - `MessageKey` İngilizce dosyadan türetilir. `tests/unit/i18n.test.ts` iki dosyanın aynı anahtarları taşıdığını denetler.
- **Import yolları:**
  - `src/core/` tarayıcı API'si kullanmaz.
  - `src/i18n.ts`'i import eden React bileşenlerinin birim testi yazılmaz; onları uçtan uca testler sınar.
- **Uçtan uca testler:**
  - Yerelleştirilmiş metin doğrulanmaz. Kullanılan seçiciler: `data-test-subj`, ARIA rolleri, eklentinin sınıf adları, `name` ve `value` öznitelikleri, `e2eConfig()` etiketleri, menü sırası.
  - Sabit `waitForTimeout` beklemesi yazılmaz.
- **Seed sözleşmesi:** `docker/seed.mjs` ile `tests/e2e` aynı commit'te değişir. `tests/fixtures/*` (app-001'in ekran yakalaması) değişmez.
- **Docker:**
  - Sırlar `docker/.env.<major>` dosyalarındadır ve hiçbir çıktıya, loga, commit'e ya da rapora yazılmaz.
  - Ekibin `spinehub-*` konteynerlerine ve `:9601`, `:9200`, `:9201` portlarına dokunulmaz.
- **Komutlar:**
  - Her task'ın sonunda: `npm test`, `npm run typecheck`, `npm run build`, `npm run check:manifest`.
  - Uçtan uca testleri değiştiren task'lar ayrıca o task'ın yazdığı e2e komutlarını çalıştırır.
- **Git:**
  - Bu depoda `user.email` yerel olarak `cllakyz@hotmail.com`.
  - Her commit mesajı `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` satırıyla biter.
  - `docs/superpowers/` commit edilmez.
  - Push, PR, etiket ve sürüm yalnızca kullanıcının açık onayıyla yapılır. Push komutu: `GH_TOKEN=$(gh auth token --user cllakyz) git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push`
  - Her commit'ten önce `git branch --show-current` ile dalın `plan-5-value-masks` olduğu doğrulanır.

## Review Focus

1. **Depoda duran sürüm 2 ayar.** Ekibin `chrome.storage.local`'daki ayarları güncelleme geldiğinde sürüm 2 olacak. Bunlar boş ayara dönmemeli; sürüm 3 olarak, dört tür açık ve geri kalanı aynen yüklenmeli. Test: Task 2, `storage.test.ts`.
2. **Büyük gövdeler.** Request ve response metinleri onlarca KB, hatta MB olabilir. Hiçbir desen felaket boyutunda geri izleme yapmamalı. Test: Task 1, `value-mask.test.ts`, 1 MB'lık XML.
3. **Alan adı maskesiyle çakışma.** `*iban*` deseni bir alanı ya da JSON anahtarını zaten maskeliyorsa, değerin tamamı bir kez `***` olmalı. Değer desenleri ikinci bir işlem yapmamalı. Test: Task 3, `mask.test.ts`.
4. **`copy.markdownFields` listesi.** Bu liste JSON içi bir yolu (`body.pidNo`) ya da `_id`'yi gösterebilir. Bunların değerleri de taranmalı. JSON içinde sayı olarak duran bir TCKN `***` olmalı. Test: Task 3, `markdown.test.ts`.
5. **Dört kutu da kapalı.** Kopya, Plan 5'ten önceki çıktının aynısı olmalı. Alan adı maskesi çalışmaya devam etmeli. Test: Task 3, `markdown.test.ts`.

## Dosya yapısı

```
src/core/value-mask.ts                 (yeni)    MASK, VALUE_MASK_KINDS, ValueMaskKind, maskText
src/core/mask.ts                       (değişir) maskValue(…, kinds); MASK value-mask.ts'ten
src/core/markdown.ts                   (değişir) MarkdownOptions.valueMasks
src/core/config.ts                     (değişir) schemaVersion 3, copy.valueMasks, çevirme, emptyConfig
src/content/ActionBar.tsx              (değişir) copy.valueMasks'ı buildMarkdown'a verir
src/options/model.ts                   (değişir) withCopySettings(…, valueMasks)
entrypoints/options/CopySection.tsx    (değişir) "Değerin içinde maskele" onay kutuları
public/_locales/{en,tr}/messages.json  (değişir) 6 yeni anahtar
docker/seed.mjs                        (değişir) app-002'ye context.request (sentetik XML)
tests/unit/core/value-mask.test.ts     (yeni)
tests/unit/core/{config,mask,markdown}.test.ts, tests/unit/storage.test.ts, tests/unit/options/model.test.ts   (değişir)
tests/e2e/fixtures.ts, tests/e2e/options.spec.ts, tests/e2e/copy.spec.ts   (değişir)
examples/kibanatool-settings.json, README.md, CHANGELOG.md, CLAUDE.md      (değişir)
docs/verification/2026-10-plan-5.md    (yeni, Task 7)
```

---

### Task 0: Dalı aç

- [ ] **Step 1: Ana checkout'ta `main`'den yeni dal aç**

```bash
git switch main && git pull --ff-only && git switch -c plan-5-value-masks
git status --short   # boş olmalı
npm test 2>&1 | tail -4   # başlangıç: 309 test geçer
```

Bu adımın commit'i yoktur.

---

### Task 1: Değerin içinde tanıma (`value-mask.ts`)

**Files:**
- Create: `src/core/value-mask.ts`
- Create: `tests/unit/core/value-mask.test.ts`

**Interfaces:**
- Consumes: yok.
- Produces (sonraki task'lar bunları kullanır):
  - `export const MASK = "***"`
  - `export const VALUE_MASK_KINDS = ["iban", "tckn", "gsm", "card"] as const`
  - `export type ValueMaskKind = (typeof VALUE_MASK_KINDS)[number]`
  - `export function maskText(text: string, kinds: readonly ValueMaskKind[]): string`

- [ ] **Step 1: Testi yaz**

`tests/unit/core/value-mask.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MASK, VALUE_MASK_KINDS, maskText } from "../../../src/core/value-mask";

// Synthetic values only (Plan 5 spec §9.1): the ID numbers' checksums were computed for these tests, and the
// card numbers are the networks' well-known test numbers.
const TCKN = "10000000146";
const TCKN_2 = "20000000046";
const IBAN = "TR000000000000000000000001";
const IBAN_SPACED = "TR00 0000 0000 0000 0000 0000 01";
const all = [...VALUE_MASK_KINDS];
const mask = (text: string): string => maskText(text, all);

describe("maskText: IBAN", () => {
  it("masks a TR IBAN, compact or in groups of four, in either case", () => {
    expect(mask(`<iban>${IBAN}</iban>`)).toBe("<iban>***</iban>");
    expect(mask(`IBAN: ${IBAN_SPACED}.`)).toBe("IBAN: ***.");
    expect(mask("iban tr000000000000000000000001")).toBe("iban ***");
  });

  it("leaves other countries and other lengths alone", () => {
    expect(mask("DE00000000000000000000")).toBe("DE00000000000000000000");
    expect(mask("TR00000000000000000000000")).toBe("TR00000000000000000000000"); // 23 digits
  });
});

describe("maskText: card numbers", () => {
  it("masks Visa, Mastercard, Amex and Troy numbers that pass Luhn, with or without separators", () => {
    expect(mask("4111 1111 1111 1111 / 4111-1111-1111-1111 / 4111111111111111")).toBe("*** / *** / ***");
    expect(mask("mc 5555555555554444, 2221000000000009")).toBe("mc ***, ***");
    expect(mask("amex 3782 822463 10005")).toBe("amex ***");
    expect(mask("troy 9792000000000003")).toBe("troy ***");
  });

  it("leaves numbers without a card network prefix alone, even when they pass Luhn", () => {
    // Like the 14-digit coupon serial numbers and the 18-digit ids seen in Alpha (spec §3).
    expect(mask("<ns1:serialNumber>70000000000120</ns1:serialNumber>")).toBe("<ns1:serialNumber>70000000000120</ns1:serialNumber>");
    expect(mask('Value="900000000000000126"')).toBe('Value="900000000000000126"');
  });

  it("leaves a number that fails Luhn and an already masked number alone", () => {
    expect(mask("4111111111111112")).toBe("4111111111111112");
    expect(mask("411111******1111")).toBe("411111******1111");
  });

  it("does not join groups across two separators in a row", () => {
    expect(mask("4111  1111 1111 1111")).toBe("4111  1111 1111 1111");
  });
});

describe("maskText: TCKN", () => {
  it("masks an 11-digit number with a valid checksum", () => {
    expect(mask(`<ns1:identitynumber>${TCKN}</ns1:identitynumber>`)).toBe("<ns1:identitynumber>***</ns1:identitynumber>");
    expect(mask(`Value="${TCKN}" ${TCKN_2}`)).toBe('Value="***" ***');
  });

  it("leaves a bad checksum and a leading zero alone", () => {
    expect(mask("10000000147")).toBe("10000000147");
    expect(mask("01234567890")).toBe("01234567890");
  });
});

describe("maskText: GSM", () => {
  it("masks Turkish mobile numbers with +90, 90, 0 or no prefix", () => {
    expect(mask("+90 555 000 00 00, 0555-000-00-00, 905550000000, (555) 000 00 00, 5550000000")).toBe("***, ***, ***, ***, ***");
    expect(mask("0 (555) 000 0000")).toBe(MASK);
    expect(mask("05550000000")).toBe(MASK);
  });

  it("leaves a 12-digit number that starts with 90 but not 905 alone", () => {
    expect(mask("901234567890")).toBe("901234567890");
  });
});

describe("maskText: boundaries (spec §4.1)", () => {
  it("never matches next to a letter or a digit", () => {
    for (const text of [`a${TCKN}b`, "x5550000000", `TCKN${TCKN}`, `1${TCKN}0`, `ş${TCKN}ğ`]) expect(mask(text)).toBe(text);
  });

  it("leaves hex trace ids alone", () => {
    const trace = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    expect(mask(trace)).toBe(trace);
  });

  it("matches at the start and at the end of the text", () => {
    expect(mask(TCKN)).toBe(MASK);
    expect(mask(`${IBAN} ${TCKN}`)).toBe("*** ***");
  });
});

describe("maskText: order and kinds", () => {
  it("masks a spaced IBAN whole, so its groups are not taken for a card number", () => {
    expect(mask("TR12 4111 1111 1111 1111 0000 00")).toBe(MASK);
  });

  it("looks only for the kinds that are on", () => {
    expect(maskText(`${TCKN} 5550000000 ${IBAN} 4111111111111111`, ["tckn"])).toBe(`*** 5550000000 ${IBAN} 4111111111111111`);
    expect(maskText(`${TCKN} 5550000000`, [])).toBe(`${TCKN} 5550000000`);
  });

  it("lists the kinds in the order the options page saves them", () => {
    expect(VALUE_MASK_KINDS).toEqual(["iban", "tckn", "gsm", "card"]);
  });
});

describe("maskText: a large body", () => {
  it("scans 1 MB of XML with many digit runs in well under a second", () => {
    // Plan 5 Review Focus 2: request/response bodies can be large; no pattern may backtrack badly.
    const body = `<a>1234567890123 9876543210 ${"x".repeat(40)}</a>`.repeat(15_000);
    const started = performance.now();
    expect(maskText(body, all)).toBe(body);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/core/value-mask.test.ts`
Expected: FAIL, `Failed to resolve import "../../../src/core/value-mask"`.

- [ ] **Step 3: Modülü yaz**

`src/core/value-mask.ts`:

```ts
// Finds IBANs, Turkish ID numbers, Turkish mobile numbers and card numbers inside any text (Plan 5 spec §4).

export const MASK = "***";

/** The kinds in the order the options page lists and saves them (Plan 5 spec §6). */
export const VALUE_MASK_KINDS = ["iban", "tckn", "gsm", "card"] as const;
export type ValueMaskKind = (typeof VALUE_MASK_KINDS)[number];

/** A match may not touch a letter or a digit on either side (spec §4.1). */
const bounded = (source: string, flags = "gu"): RegExp =>
  new RegExp(String.raw`(?<![\p{L}\p{N}])` + source + String.raw`(?![\p{L}\p{N}])`, flags);

function luhn(digits: string): boolean {
  let sum = 0;
  [...digits].reverse().forEach((char, index) => {
    const value = Number(char) * (index % 2 === 1 ? 2 : 1);
    sum += value > 9 ? value - 9 : value;
  });
  return sum % 10 === 0;
}

/** Visa, Mastercard and Troy have 16 digits, Amex 15 (spec §4.2). */
function isCard(match: string): boolean {
  const digits = match.replace(/\D/g, "");
  const network = digits.length === 16 ? /^(?:4|5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720|9792)/ : /^3[47]/;
  return network.test(digits) && luhn(digits);
}

function isTckn(digits: string): boolean {
  const d = [...digits].map(Number);
  const sum = (indexes: number[]): number => indexes.reduce((total, index) => total + (d[index] ?? 0), 0);
  const tenth = (((sum([0, 2, 4, 6, 8]) * 7 - sum([1, 3, 5, 7])) % 10) + 10) % 10;
  return tenth === d[9] && sum([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) % 10 === d[10];
}

const anyMatch = (): boolean => true;

/**
 * Candidate pattern and check per kind, in search order (spec §4.3): an earlier match is already the mask
 * when the next pattern runs. Cards are tried at 16 digits, then at 15.
 */
const RULES: ReadonlyArray<readonly [ValueMaskKind, RegExp, (match: string) => boolean]> = [
  ["iban", bounded(String.raw`TR\d{2}(?: ?\d{4}){5} ?\d{2}`, "giu"), anyMatch],
  ["card", bounded(String.raw`\d(?:[ -]?\d){15}`), isCard],
  ["card", bounded(String.raw`\d(?:[ -]?\d){14}`), isCard],
  ["tckn", bounded(String.raw`[1-9]\d{10}`), isTckn],
  ["gsm", bounded(String.raw`(?:(?:\+90|90|0)[ -]?)?(?:5\d{2}|\(5\d{2}\))[ -]?\d{3}[ -]?\d{2}[ -]?\d{2}`), anyMatch],
];

/** Replaces every match of the kinds that are on with MASK; the rest of the text stays as it is. */
export function maskText(text: string, kinds: readonly ValueMaskKind[]): string {
  let result = text;
  for (const [kind, pattern, isValid] of RULES) {
    if (kinds.includes(kind)) result = result.replace(pattern, (match) => (isValid(match) ? MASK : match));
  }
  return result;
}
```

- [ ] **Step 4: Testin geçtiğini gör**

Run: `npx vitest run tests/unit/core/value-mask.test.ts`
Expected: PASS, 17 test.

- [ ] **Step 5: Bütün kontroller**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest
```
Expected: 326 test geçer, diğerleri hatasız.

- [ ] **Step 6: Commit**

```bash
git branch --show-current   # plan-5-value-masks
git add src/core/value-mask.ts tests/unit/core/value-mask.test.ts
git commit -m "feat: find IBANs, ID, mobile and card numbers inside text

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Ayar sürümü 3: `copy.valueMasks` ve çevirme

**Files:**
- Modify: `src/core/config.ts`
- Modify: `src/options/model.ts`: `withCopySettings` yalnızca `...config.copy` yayar. Tam hali Task 4'te.
- Modify: `examples/kibanatool-settings.json`
- Modify: `tests/unit/core/config.test.ts`
- Modify: `tests/unit/storage.test.ts`
- Modify: `tests/unit/options/model.test.ts`
- Modify: `tests/e2e/fixtures.ts`
- Modify: `tests/e2e/options.spec.ts`

**Interfaces:**
- Consumes: Task 1'den `VALUE_MASK_KINDS` (`src/core/value-mask.ts`).
- Produces:
  - `Config["copy"]` artık `{ markdownFields: string[]; maskPatterns: string[]; valueMasks: ValueMaskKind[] }`.
  - `SCHEMA_VERSION = 3`.
  - `emptyConfig().copy.valueMasks` dördünü de içerir.

- [ ] **Step 1: Birim testlerini sürüm 3'e çek ve yenilerini ekle**

`tests/unit/core/config.test.ts` dosyasında `validConfig` sürüm 3 olur ve listeyi taşır:

```ts
const validConfig = (): Config => ({
  schemaVersion: 3,
```
ve
```ts
  copy: { markdownFields: [], maskPatterns: ["*token*"], valueMasks: ["iban", "tckn", "gsm", "card"] },
});
```

Aynı dosyada, `describe("parseConfig version 2 (Plan 4)")` içindeki iki test şöyle olur. Sürüm 1 girdinin `copy`'sinde artık liste yoktur. Reddedilen sürüm 3 değil, 4'tür.

```ts
  it("migrates a version 1 config: version 3, environments without variables get none, every value mask is on", () => {
    const v1 = {
      ...validConfig(),
      schemaVersion: 1,
      environments: [{ id: "prod", name: "Prod", kibanaUrl: "https://kibana.example.com" }],
      copy: { markdownFields: [], maskPatterns: ["*token*"] },
    };
    expect(parseConfig(v1)).toEqual({ ok: true, config: validConfig() });
  });

  it("rejects versions other than 1, 2 and 3", () => {
    expect(errorsOf({ ...validConfig(), schemaVersion: 4 })[0]).toMatch(/^schemaVersion: /);
    expect(errorsOf({ ...validConfig(), schemaVersion: 0 })[0]).toMatch(/^schemaVersion: /);
  });
```

Dosyanın sonuna ekle:

```ts
describe("parseConfig version 3 (Plan 5)", () => {
  const v2 = () => ({ ...validConfig(), schemaVersion: 2, copy: { markdownFields: ["level"], maskPatterns: ["*token*"] } });

  it("migrates a version 2 config: version 3 with every value mask on, the rest unchanged", () => {
    expect(parseConfig(v2())).toEqual({
      ok: true,
      config: { ...validConfig(), copy: { markdownFields: ["level"], maskPatterns: ["*token*"], valueMasks: ["iban", "tckn", "gsm", "card"] } },
    });
  });

  it("accepts an empty list and a kind written twice", () => {
    for (const valueMasks of [[], ["gsm", "gsm"]]) {
      expect(parseConfig({ ...validConfig(), copy: { ...validConfig().copy, valueMasks } }).ok).toBe(true);
    }
  });

  it("rejects a missing list and an unknown kind in version 3", () => {
    const { valueMasks: _, ...copy } = validConfig().copy;
    expect(errorsOf({ ...validConfig(), copy })[0]).toMatch(/^copy\.valueMasks: /);
    expect(errorsOf({ ...validConfig(), copy: { ...copy, valueMasks: ["iban", "email"] } })[0]).toMatch(/^copy\.valueMasks\.1: /);
  });

  it("turns every value mask on in the empty config", () => {
    expect(emptyConfig().copy.valueMasks).toEqual(["iban", "tckn", "gsm", "card"]);
  });
});
```

`tests/unit/storage.test.ts` dosyasında sürüm 1 testini şu iki testle değiştir. İkincisi Review Focus 1'dir.

```ts
  it("loads a stored version 1 config as version 3 instead of the empty config", async () => {
    const stored = {
      ...config,
      schemaVersion: 1,
      environments: [{ id: "local", name: "Local", kibanaUrl: "http://localhost:9601" }],
      copy: { markdownFields: config.copy.markdownFields, maskPatterns: config.copy.maskPatterns },
    };
    await expect(createConfigStore(fakeArea({ [CONFIG_KEY]: stored })).load()).resolves.toEqual({ config, errors: [] });
  });

  it("loads a stored version 2 config as version 3 with every value mask on", async () => {
    // Plan 5 Review Focus 1: the team's settings in chrome.storage are version 2 when the update arrives.
    const stored = {
      ...config,
      schemaVersion: 2,
      copy: { markdownFields: ["level"], maskPatterns: ["*iban*"] },
    };
    await expect(createConfigStore(fakeArea({ [CONFIG_KEY]: stored })).load()).resolves.toEqual({
      config: { ...config, copy: { markdownFields: ["level"], maskPatterns: ["*iban*"], valueMasks: ["iban", "tckn", "gsm", "card"] } },
      errors: [],
    });
  });
```

`tests/unit/options/model.test.ts` dosyasında üç değişiklik var.

`withCopySettings` beklentisi listeyi de içerir:
```ts
    expect(result.ok && result.config.copy).toEqual({
      markdownFields: ["level", "message"],
      maskPatterns: ["*token*", "*secret*"],
      valueMasks: ["iban", "tckn", "gsm", "card"],
    });
```

`parseImport` testlerinde reddedilen sürüm `4` olur:
```ts
    const result = parseImport(JSON.stringify({ ...emptyConfig(), schemaVersion: 4 }));
```

Sürüm 1 testi de şöyle olur:
```ts
  it("imports a version 1 file as version 3", () => {
    const result = parseImport(JSON.stringify({ ...emptyConfig(), schemaVersion: 1 }));
    expect(result.ok && result.config.schemaVersion).toBe(3);
  });
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/core/config.test.ts tests/unit/storage.test.ts tests/unit/options/model.test.ts`
Expected: FAIL. Hatalar `schemaVersion: Invalid input: expected 2` ve `valueMasks` eksikliğinden gelir.

- [ ] **Step 3: Şemayı, çevirmeyi ve varsayılanı yaz**

`src/core/config.ts`:

1. Import'lara ekle:
   ```ts
   import { VALUE_MASK_KINDS } from "./value-mask";
   ```
2. `configSchema` içinde `schemaVersion: z.literal(2),` satırını `schemaVersion: z.literal(3),` yap. `copy` nesnesine şu satırı ekle:
   ```ts
       copy: z.object({
         markdownFields: z.array(z.string()),
         maskPatterns: z.array(z.string()),
         valueMasks: z.array(z.enum(VALUE_MASK_KINDS)),
       }),
   ```
3. `SCHEMA_VERSION` ve `migrate` şöyle olur:
   ```ts
   export const SCHEMA_VERSION = 3;

   /**
    * Converts older settings, so both imported files and settings already in chrome.storage (storage.ts) load
    * instead of being dropped. Version 1 had no variables and no dataViewName (Plan 4 spec §3); the schema
    * defaults the variables. Versions 1 and 2 had no valueMasks, so they get every kind (Plan 5 spec §6).
    */
   function migrate(input: unknown): unknown {
     if (!isPlainObject(input) || (input.schemaVersion !== 1 && input.schemaVersion !== 2)) return input;
     const copy = isPlainObject(input.copy) ? { ...input.copy, valueMasks: [...VALUE_MASK_KINDS] } : input.copy;
     return { ...input, schemaVersion: SCHEMA_VERSION, copy };
   }
   ```
4. `emptyConfig()` içindeki `copy` satırı:
   ```ts
       copy: { markdownFields: [], maskPatterns: [...DEFAULT_MASK_PATTERNS], valueMasks: [...VALUE_MASK_KINDS] },
   ```

`src/options/model.ts`: `withCopySettings` artık mevcut `copy`'yi yayar. Böylece ayarlar sayfasında kaydetme `valueMasks`'ı düşürmez. Parametre Task 4'te gelir.

```ts
/** Both lists are edited as text, one entry per line. */
export function withCopySettings(config: Config, markdownFields: string, maskPatterns: string): ParseResult {
  return parseConfig({ ...config, copy: { ...config.copy, markdownFields: lines(markdownFields), maskPatterns: lines(maskPatterns) } });
}
```

- [ ] **Step 4: Örnek dosyayı ve e2e ayarını sürüm 3'e çek**

`examples/kibanatool-settings.json`:
- `"schemaVersion": 2,` satırı `"schemaVersion": 3,` olur.
- `copy` şöyle olur:
  ```json
    "copy": {
      "markdownFields": [],
      "maskPatterns": ["*authorization*", "*password*", "*token*", "*secret*", "*cookie*"],
      "valueMasks": ["iban", "tckn", "gsm", "card"]
    }
  ```

`tests/e2e/fixtures.ts`:
- Import ekle: `import { VALUE_MASK_KINDS } from "../../src/core/value-mask";`
- `e2eConfig()` içinde `schemaVersion: 3,` yap.
- `copy` satırı:
  ```ts
      copy: { markdownFields: [], maskPatterns: [...DEFAULT_MASK_PATTERNS], valueMasks: [...VALUE_MASK_KINDS] },
  ```

`tests/e2e/options.spec.ts`: sürüm 1 içe aktarma testinin başı şöyle olur. Başlangıç ayarında liste boştur. İçe aktarılan sürüm 1 dosyasında liste yoktur. Sonuç `e2eConfig()` ile aynı olmalıdır, yani dört tür açık.

```ts
test("imports a version 1 settings file and stores it as version 3", async ({ context, extension, configure }) => {
  const { environments, copy, ...rest } = e2eConfig();
  await configure({ ...e2eConfig(), actions: [], copy: { ...copy, valueMasks: [] } }); // differs from what the import must produce
  const options = await openOptions(context, extension.id);
  const transfer = options.locator('section[aria-labelledby="transfer-title"]');
  const v1 = {
    ...rest,
    schemaVersion: 1,
    environments: environments.map(({ id, name, kibanaUrl }) => ({ id, name, kibanaUrl })),
    copy: { markdownFields: copy.markdownFields, maskPatterns: copy.maskPatterns },
  };
```
Testin geri kalanı değişmez: dosyanın yüklenmesi, "Replace settings" ve `toEqual(e2eConfig())`.

- [ ] **Step 5: Testlerin geçtiğini gör**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest
```
Expected: 331 test geçer, diğerleri hatasız.

- [ ] **Step 6: Ayarlar sayfasının uçtan uca testleri, üç yığında**

```bash
./docker/up.sh 7 && ./docker/up.sh 8 && ./docker/up.sh 9
KT_STACK=7 npm run e2e -- options && KT_STACK=8 npm run e2e -- options && KT_STACK=9 npm run e2e -- options
```
Expected: `options.spec.ts` her yığında hatasız geçer. Özellikle şu iki test bakılacak yer:
- `imports a version 1 settings file and stores it as version 3`
- `exports the settings and imports the example file`

- [ ] **Step 7: Commit**

```bash
git branch --show-current   # plan-5-value-masks
git add src/core/config.ts src/options/model.ts examples/kibanatool-settings.json tests/unit/core/config.test.ts tests/unit/storage.test.ts tests/unit/options/model.test.ts tests/e2e/fixtures.ts tests/e2e/options.spec.ts
git commit -m "feat: settings version 3 with copy.valueMasks, older settings converted with every kind on

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Markdown kopyasında değer maskesi

**Files:**
- Modify (dosyanın tamamı aşağıda): `src/core/mask.ts`
- Modify: `src/core/markdown.ts`
- Modify: `src/content/ActionBar.tsx`
- Modify (dosyanın tamamı aşağıda): `tests/unit/core/mask.test.ts`
- Modify: `tests/unit/core/markdown.test.ts`

**Interfaces:**
- Consumes:
  - Task 1'den `MASK`, `ValueMaskKind`, `maskText`, `VALUE_MASK_KINDS`.
  - Task 2'den `Config["copy"]["valueMasks"]`.
- Produces:
  - `maskValue(path: string, value: unknown, isMasked: (path: string) => boolean, kinds: readonly ValueMaskKind[]): unknown`. Dördüncü parametre zorunludur.
  - `MarkdownOptions.valueMasks: readonly ValueMaskKind[]`. Bu da zorunludur.
  - `mask.ts` `MASK`'ı yeniden dışa aktarır.

- [ ] **Step 1: Testleri yaz**

`tests/unit/core/mask.test.ts`, dosyanın tamamı. Mevcut testler dördüncü parametre olarak `[]` alır, yeni testler ekleniyor.

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_MASK_PATTERNS } from "../../../src/core/config";
import { MASK, maskMatcher, maskValue } from "../../../src/core/mask";
import { VALUE_MASK_KINDS } from "../../../src/core/value-mask";

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
    expect(maskValue("access_token", "abc", isMasked, [])).toBe(MASK);
    expect(maskValue("message", "plain", isMasked, [])).toBe("plain");
  });

  it("masks keys inside JSON text under the field's path and re-serializes it", () => {
    const headers = JSON.stringify({ Authorization: "Bearer x", accept: "json" });
    expect(maskValue("context.headers", headers, isMasked, [])).toBe('{"Authorization":"***","accept":"json"}');
  });

  it("masks inside arrays and nested objects", () => {
    expect(maskValue("items", [{ token: "t", id: 1 }], isMasked, [])).toEqual([{ token: MASK, id: 1 }]);
    expect(maskValue("body", JSON.stringify({ user: { Password: "p", name: "n" } }), isMasked, [])).toBe(
      '{"user":{"Password":"***","name":"n"}}',
    );
  });
});

// Synthetic values only (Plan 5 spec §9.1).
describe("maskValue with value masks (Plan 5 spec §5)", () => {
  const isMasked = maskMatcher(["*iban*"]);
  const all = [...VALUE_MASK_KINDS];

  it("masks the matches inside plain text and keeps the rest", () => {
    expect(maskValue("note", "call +90 555 000 00 00 today", isMasked, all)).toBe("call *** today");
  });

  it("masks a number with a match as text, and keeps other numbers", () => {
    expect(maskValue("pid", 10000000146, isMasked, all)).toBe(MASK);
    expect(maskValue("amount", 150, isMasked, all)).toBe(150);
  });

  it("masks inside JSON text, numbers included, leaves booleans and null, and re-serializes it", () => {
    const body = JSON.stringify({ pidNo: 10000000146, note: "card 4111 1111 1111 1111", ok: true, none: null });
    expect(maskValue("body", body, isMasked, all)).toBe('{"pidNo":"***","note":"card ***","ok":true,"none":null}');
  });

  it("lets a field-name mask win, so the whole value is masked once", () => {
    // Plan 5 Review Focus 3.
    expect(maskValue("context.iban", "TR000000000000000000000001", isMasked, all)).toBe(MASK);
    expect(maskValue("body", JSON.stringify({ IBAN: "x TR000000000000000000000001" }), isMasked, all)).toBe('{"IBAN":"***"}');
  });

  it("masks inside arrays", () => {
    expect(maskValue("phones", ["5550000000", "x"], isMasked, all)).toEqual([MASK, "x"]);
  });

  it("leaves every value alone when no kind is on", () => {
    expect(maskValue("pid", 10000000146, isMasked, [])).toBe(10000000146);
    expect(maskValue("note", "+90 555 000 00 00", isMasked, [])).toBe("+90 555 000 00 00");
  });
});
```

`tests/unit/core/markdown.test.ts` dosyasında üç değişiklik var.

1. Import'lara ekle:
   ```ts
   import { VALUE_MASK_KINDS } from "../../../src/core/value-mask";
   ```
2. Dosyanın başındaki `options()` yardımcısına `valueMasks: []` ekle. Mevcut testler böylece değişmeden kalır.
   ```ts
     maskPatterns: ["*authorization*"],
     valueMasks: [],
     docUrl: "http://k/app/discover#/doc/dv/app_log?id=A1",
   ```
3. Dosyanın sonuna ekle:

```ts
// Synthetic values only (Plan 5 spec §9.1).
describe("buildMarkdown with value masks (Plan 5 spec §5)", () => {
  const payment = {
    _id: "10000000146",
    _index: "pay-5550000000",
    _source: {
      datetime: "2026-08-12T10:00:00+03:00",
      request: "<a><tckn>10000000146</tckn><iban>TR00 0000 0000 0000 0000 0000 01</iban><n>150</n></a>",
      body: JSON.stringify({ pidNo: 10000000146, phone: "+90 555 000 00 00", note: "ok" }),
      iban: "TR000000000000000000000001",
    },
  };
  const masked = (overrides: Partial<MarkdownOptions> = {}): string[] =>
    buildMarkdown(
      options({ hit: payment, maskPatterns: ["*iban*"], valueMasks: [...VALUE_MASK_KINDS], docUrl: "u?id=10000000146", ...overrides }),
    ).split("\n");

  it("masks the values inside XML and JSON text, keeps the rest, and leaves the header and the link alone", () => {
    expect(masked()).toEqual([
      "**pay-5550000000** · 2026-08-12T10:00:00+03:00",
      "- `body`:",
      "  ```json",
      "  {",
      '    "pidNo": "***",',
      '    "phone": "***",',
      '    "note": "ok"',
      "  }",
      "  ```",
      "- `datetime`: 2026-08-12T10:00:00+03:00",
      "- `iban`: ***",
      "- `request`: <a><tckn>***</tckn><iban>***</iban><n>150</n></a>",
      "[Open in Kibana](u?id=10000000146)",
    ]);
  });

  it("masks a listed JSON sub-path that holds a number, and a listed _id", () => {
    // Plan 5 Review Focus 4: copy.markdownFields may name a path inside JSON text, or _id.
    expect(masked({ fields: ["_id", "body.pidNo", "body.note"] })).toEqual([
      "**pay-5550000000** · 2026-08-12T10:00:00+03:00",
      "- `_id`: ***",
      "- `body.pidNo`: ***",
      "- `body.note`: ok",
      "[Open in Kibana](u?id=10000000146)",
    ]);
  });

  it("copies the values as before when every kind is off", () => {
    // Plan 5 Review Focus 5.
    const lines = masked({ valueMasks: [] });
    expect(lines).toContain("- `request`: <a><tckn>10000000146</tckn><iban>TR00 0000 0000 0000 0000 0000 01</iban><n>150</n></a>");
    expect(lines).toContain('    "pidNo": 10000000146,');
    expect(lines).toContain("- `iban`: ***"); // the field-name mask still applies
  });
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/core/mask.test.ts tests/unit/core/markdown.test.ts`
Expected: FAIL.
- Değer maskesi testleri maskesiz değer döndürür, örneğin `call +90 555 000 00 00 today`.
- `valueMasks: []` ile çalışan eski testler geçer.

- [ ] **Step 3: `maskValue`'yu yaz**

`src/core/mask.ts`, dosyanın tamamı:

```ts
// Masks sensitive values in copied output: by field name (spec §7.5) and inside values (Plan 5 spec §5).
import { isPlainObject, parseJsonText } from "./fields";
import { MASK, type ValueMaskKind, maskText } from "./value-mask";

export { MASK };

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `*` matches any run of characters; the whole dot path must match, ignoring case. */
export function maskMatcher(patterns: string[]): (path: string) => boolean {
  const regexes = patterns.map((pattern) => new RegExp(`^${pattern.split("*").map(escapeRegExp).join(".*")}$`, "i"));
  return (path) => regexes.some((regex) => regex.test(path));
}

/**
 * Replaces values whose path matches with MASK, also inside objects, arrays and JSON text.
 * Keys inside JSON text are matched as `<field path>.<key>`; masked JSON text is re-serialized.
 * Every other text and number is searched for the value kinds that are on; a number with a match becomes MASK.
 */
export function maskValue(path: string, value: unknown, isMasked: (path: string) => boolean, kinds: readonly ValueMaskKind[]): unknown {
  if (isMasked(path)) return MASK;
  if (Array.isArray(value)) return value.map((item) => maskValue(path, item, isMasked, kinds));
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, maskValue(`${path}.${key}`, item, isMasked, kinds)]));
  }
  if (typeof value === "string") {
    const parsed = parseJsonText(value);
    return parsed === undefined ? maskText(value, kinds) : JSON.stringify(maskValue(path, parsed, isMasked, kinds));
  }
  if (typeof value === "number") return maskText(String(value), kinds) === String(value) ? value : MASK;
  return value;
}
```

- [ ] **Step 4: `buildMarkdown`'a ve çubuğa bağla**

`src/core/markdown.ts`:
- Import ekle: `import type { ValueMaskKind } from "./value-mask";`
- `MarkdownOptions` içinde `maskPatterns` satırından sonra şunu ekle:
  ```ts
    /** copy.valueMasks: kinds searched inside every value (Plan 5 spec §5); the header and the link are not. */
    valueMasks: readonly ValueMaskKind[];
  ```
- `buildMarkdown` içindeki iki satır şöyle olur:
  ```ts
    const { hit, timeField, fields, maskPatterns, valueMasks, docUrl, linkLabel } = options;
  ```
  ```ts
      lines.push(...fieldLines(path, maskValue(path, value, isMasked, valueMasks)));
  ```

`src/content/ActionBar.tsx`: `buildMarkdown({ … })` çağrısında `maskPatterns: copy.maskPatterns,` satırının altına şunu ekle:
```ts
          valueMasks: copy.valueMasks,
```

- [ ] **Step 5: Testlerin geçtiğini gör**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest
```
Expected: 340 test geçer, diğerleri hatasız.

- [ ] **Step 6: Commit**

```bash
git branch --show-current   # plan-5-value-masks
git add src/core/mask.ts src/core/markdown.ts src/content/ActionBar.tsx tests/unit/core/mask.test.ts tests/unit/core/markdown.test.ts
git commit -m "feat: mask IBANs, ID, mobile and card numbers inside values when copying as Markdown

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Ayarlar sayfası: "Değerin içinde maskele"

**Files:**
- Modify: `src/options/model.ts`
- Modify (dosyanın tamamı aşağıda): `entrypoints/options/CopySection.tsx`
- Modify: `public/_locales/en/messages.json`
- Modify: `public/_locales/tr/messages.json`
- Modify: `tests/unit/options/model.test.ts`

**Interfaces:**
- Consumes: Task 1'den `VALUE_MASK_KINDS` ve `ValueMaskKind`.
- Produces:
  - `withCopySettings(config: Config, markdownFields: string, maskPatterns: string, valueMasks: readonly ValueMaskKind[]): ParseResult`. Listeyi `VALUE_MASK_KINDS` sırasıyla ve tekrarsız yazar.
  - Onay kutuları: `section[aria-labelledby="copy-title"] input[name="valueMask"][value="<tür>"]`. Task 5'in e2e testi bunu kullanır.

- [ ] **Step 1: Testi yaz**

`tests/unit/options/model.test.ts` dosyasında `describe("withCopySettings")` bloğu şöyle olur:

```ts
describe("withCopySettings", () => {
  it("reads one entry per line and drops blank lines", () => {
    const result = withCopySettings(emptyConfig(), " level \n\nmessage\n", "*token*\n  *secret*  ", ["iban", "tckn", "gsm", "card"]);
    expect(result.ok && result.config.copy).toEqual({
      markdownFields: ["level", "message"],
      maskPatterns: ["*token*", "*secret*"],
      valueMasks: ["iban", "tckn", "gsm", "card"],
    });
  });

  it("saves the value masks in a fixed order, once each, and an empty list as none", () => {
    const saved = (valueMasks: Parameters<typeof withCopySettings>[3]) => {
      const result = withCopySettings(emptyConfig(), "", "", valueMasks);
      return result.ok && result.config.copy.valueMasks;
    };
    expect(saved(["card", "iban", "card"])).toEqual(["iban", "card"]);
    expect(saved([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run tests/unit/options/model.test.ts`
Expected: FAIL. `saved(["card", "iban", "card"])` değeri `["iban","tckn","gsm","card"]` döner, çünkü parametre henüz yok sayılıyor.

- [ ] **Step 3: `withCopySettings`'i yaz**

`src/options/model.ts`:
- Import ekle:
  ```ts
  import { VALUE_MASK_KINDS, type ValueMaskKind } from "../core/value-mask";
  ```
- Task 2'deki `withCopySettings` şöyle değişir:

```ts
/** Both lists are edited as text, one entry per line; the value masks are saved in VALUE_MASK_KINDS order. */
export function withCopySettings(
  config: Config,
  markdownFields: string,
  maskPatterns: string,
  valueMasks: readonly ValueMaskKind[],
): ParseResult {
  return parseConfig({
    ...config,
    copy: {
      markdownFields: lines(markdownFields),
      maskPatterns: lines(maskPatterns),
      valueMasks: VALUE_MASK_KINDS.filter((kind) => valueMasks.includes(kind)),
    },
  });
}
```

- [ ] **Step 4: Metinleri ekle**

İki dosyada da `"optionsMaskPatterns"` satırının hemen altına ekle.

`public/_locales/en/messages.json`:
```json
  "optionsValueMasks": { "message": "Mask inside values" },
  "optionsValueMasksHelp": { "message": "Searched inside every value, whatever the field's name. Applies only to \"Copy as Markdown\"." },
  "optionsValueMaskIban": { "message": "IBAN (TR)" },
  "optionsValueMaskTckn": { "message": "Turkish ID number (TCKN)" },
  "optionsValueMaskGsm": { "message": "Mobile number (TR)" },
  "optionsValueMaskCard": { "message": "Card number (Visa, Mastercard, Amex, Troy)" },
```

`public/_locales/tr/messages.json`:
```json
  "optionsValueMasks": { "message": "Değerin içinde maskele" },
  "optionsValueMasksHelp": { "message": "Alan adından bağımsız olarak her değerin içinde aranır. Yalnızca \"Markdown olarak kopyala\"ya uygulanır." },
  "optionsValueMaskIban": { "message": "IBAN (TR)" },
  "optionsValueMaskTckn": { "message": "TC kimlik no" },
  "optionsValueMaskGsm": { "message": "GSM (TR)" },
  "optionsValueMaskCard": { "message": "Kart numarası (Visa, Mastercard, Amex, Troy)" },
```

- [ ] **Step 5: Bölümü yaz**

`entrypoints/options/CopySection.tsx`, dosyanın tamamı. Onay kutuları bir `fieldset` içinde, mevcut iki metin kutusunun altında durur. Açıklama satırı kutuların altındadır (spec §7). Kayıtlı değer, diğer iki alan gibi değer anahtarıyla izlenir; böylece başka bölümlerdeki kayıtlar kaydedilmemiş işaretleri silmez.

```tsx
// Copy and masking settings (spec §7.4, §7.5; Plan 5 spec §7).
import { useEffect, useState } from "react";
import { VALUE_MASK_KINDS, type ValueMaskKind } from "../../src/core/value-mask";
import { type MessageKey, t } from "../../src/i18n";
import { withCopySettings } from "../../src/options/model";
import { Feedback, type SectionProps, useSubmit } from "./feedback";

const VALUE_MASK_LABELS: Record<ValueMaskKind, MessageKey> = {
  iban: "optionsValueMaskIban",
  tckn: "optionsValueMaskTckn",
  gsm: "optionsValueMaskGsm",
  card: "optionsValueMaskCard",
};

export function CopySection({ config, onSave }: SectionProps) {
  const [fields, setFields] = useState("");
  const [patterns, setPatterns] = useState("");
  const [valueMasks, setValueMasks] = useState<ValueMaskKind[]>([]);
  const { errors, saved, submit } = useSubmit(onSave);

  const storedFields = config.copy.markdownFields.join("\n");
  const storedPatterns = config.copy.maskPatterns.join("\n");
  const storedMasks = config.copy.valueMasks.join(" ");

  // Follow the stored values (e.g. after an import) without wiping unsaved edits on unrelated saves.
  useEffect(() => {
    setFields(storedFields);
    setPatterns(storedPatterns);
    setValueMasks(VALUE_MASK_KINDS.filter((kind) => storedMasks.split(" ").includes(kind)));
  }, [storedFields, storedPatterns, storedMasks]);

  function toggle(kind: ValueMaskKind, on: boolean): void {
    setValueMasks((current) => (on ? [...current, kind] : current.filter((item) => item !== kind)));
  }

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
      <fieldset>
        <legend>{t("optionsValueMasks")}</legend>
        {VALUE_MASK_KINDS.map((kind) => (
          <label className="inline" key={kind}>
            <input
              type="checkbox"
              name="valueMask"
              value={kind}
              checked={valueMasks.includes(kind)}
              onChange={(event) => toggle(kind, event.target.checked)}
            />
            {t(VALUE_MASK_LABELS[kind])}
          </label>
        ))}
        <p className="muted">{t("optionsValueMasksHelp")}</p>
      </fieldset>
      <button type="button" className="primary" onClick={() => void submit(withCopySettings(config, fields, patterns, valueMasks))}>
        {t("optionsSave")}
      </button>
      <Feedback errors={errors} saved={saved} />
    </section>
  );
}
```

- [ ] **Step 6: Testlerin geçtiğini gör**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest
```
Expected: 341 test geçer (`i18n.test.ts` dahil), diğerleri hatasız.

- [ ] **Step 7: Commit**

```bash
git branch --show-current   # plan-5-value-masks
git add src/options/model.ts entrypoints/options/CopySection.tsx public/_locales/en/messages.json public/_locales/tr/messages.json tests/unit/options/model.test.ts
git commit -m "feat: turn each value mask on or off on the options page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Uçtan uca: seed ve senaryolar

**Files:**
- Modify: `docker/seed.mjs`
- Modify: `tests/e2e/copy.spec.ts`
- Modify: `tests/e2e/options.spec.ts`

**Interfaces:**
- Consumes:
  - Task 3'ten Markdown kopyasında değer maskesi.
  - Task 4'ten `input[name="valueMask"][value=…]` ve `section[aria-labelledby="copy-title"] button.primary`.
- Produces: `app-002` kaydında `context.request` (sentetik XML). Başka hiçbir e2e testi `app-002`'yi kullanmaz.

- [ ] **Step 1: Seed'e sentetik XML'i ekle**

`docker/seed.mjs`:
- `LEVELS` satırının altına ekle:

```js
// app-002 only: a payment-style XML body with a synthetic ID number, IBAN, mobile number and card test number
// (Plan 5: masking inside values). tests/e2e/copy.spec.ts expects exactly this text with the four values masked.
const PAYMENT_XML =
  "<soap:Envelope><soap:Body><ns1:pay><ns1:identitynumber>10000000146</ns1:identitynumber>" +
  "<ns1:iban>TR00 0000 0000 0000 0000 0000 01</ns1:iban><ns1:gsm>+90 555 000 00 00</ns1:gsm>" +
  "<ns1:card>4111-1111-1111-1111</ns1:card><ns1:amount>150</ns1:amount></ns1:pay></soap:Body></soap:Envelope>";
```

- `app_log` döngüsündeki `context` nesnesinde `query` satırının altına ekle:

```js
        ...(i === 2 ? { request: PAYMENT_XML } : {}),
```

- [ ] **Step 2: Senaryoları yaz**

`tests/e2e/copy.spec.ts`: `copies the log link…` testinin üstüne ekle.

```ts
test("masks the ID, IBAN, mobile and card numbers inside an XML value and keeps the XML", async ({ context }) => {
  // app-002's context.request holds synthetic values (docker/seed.mjs, PAYMENT_XML).
  const { page, detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-002"' });
  const lines = (await copyFromMenu(page, detail, 0)).split("\n");
  expect(lines).toContain(
    "- `context.request`: <soap:Envelope><soap:Body><ns1:pay><ns1:identitynumber>***</ns1:identitynumber>" +
      "<ns1:iban>***</ns1:iban><ns1:gsm>***</ns1:gsm><ns1:card>***</ns1:card><ns1:amount>150</ns1:amount>" +
      "</ns1:pay></soap:Body></soap:Envelope>",
  );
});
```

`tests/e2e/options.spec.ts`: `exports a corrupt stored value…` testinin üstüne ekle.

```ts
test("turns one value mask off and keeps the others", async ({ context, extension, configure }) => {
  await configure();
  const options = await openOptions(context, extension.id);
  const copy = options.locator('section[aria-labelledby="copy-title"]');
  const gsm = copy.locator('input[name="valueMask"][value="gsm"]');
  await expect(gsm).toBeChecked();
  await gsm.uncheck();
  await copy.locator("button.primary").click();
  await expect
    .poll(async () => ((await readStored(extension.worker)) as Config).copy.valueMasks)
    .toEqual(["iban", "tckn", "card"]);
});
```

- [ ] **Step 3: Yığınlara yeni seed'i yükle**

Script, yığın açık olsa da her çalıştırmada seed'i yeniden yükler:

```bash
./docker/up.sh 7 && ./docker/up.sh 8 && ./docker/up.sh 9
```

- [ ] **Step 4: Bütün matris**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest
KT_STACK=7 npm run e2e && KT_STACK=8 npm run e2e && KT_STACK=9 npm run e2e
KT_STACK=7 npm run e2e -- copy options --repeat-each=3 && KT_STACK=9 npm run e2e -- copy options --repeat-each=3
```
Expected:
- Her yığında iki yeni test eklenir ve hepsi geçer. Plan yazılırken `npx playwright test --list` 7.17 ve 8.19 için 24, 9.5 için 25 test sayıyordu; bunların 3'ü her yığında atlanıyor. Yeni beklenti: 7.17 ve 8.19'da 23 test geçer, 9.5'te 24; her birinde 3 test atlanır.
- `--repeat-each=3` koşularında hiçbir test kırılmaz.
- Bir test kırılırsa önce seed'in yeniden yüklendiğini doğrula (Step 3).

- [ ] **Step 5: Commit**

```bash
git branch --show-current   # plan-5-value-masks
git add docker/seed.mjs tests/e2e/copy.spec.ts tests/e2e/options.spec.ts
git commit -m "test: e2e for masking inside an XML value and the value mask switches

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Belgeler: README, CHANGELOG, CLAUDE.md

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: README**

Kullanım listesindeki satır:
```markdown
- **⋯** to copy the log as Markdown with sensitive fields and values masked, a link to the log, or the current view with its time range fixed.
```

`### Copy and masking` bölümünün gövdesi:
```markdown
"Copy as Markdown" masks every field whose path matches a pattern under **Copy and masking** (by default
`*authorization*`, `*password*`, `*token*`, `*secret*` and `*cookie*`), keys inside JSON text included.

It also looks inside every value, so XML and plain-text bodies that a field name cannot reach are covered
too, and replaces each of these with `***`. Each kind can be turned off under **Mask inside values**:

- Turkish IBANs: `TR` and 24 digits, with or without a space before each group of four.
- Turkish ID numbers (TCKN): 11 digits with a valid checksum.
- Turkish mobile numbers: `5xx xxx xx xx`, with or without `+90`, `90` or `0` in front.
- Card numbers: Visa, Mastercard, Amex and Troy numbers with a valid Luhn digit.

A number glued to a letter or another digit is left alone, so IDs inside longer codes are not touched.
Masking applies to what you copy; the screen and your link templates are not changed. It is a best effort:
read the copy before you share it.
```

- [ ] **Step 2: CHANGELOG (`## [1.0.0] - Unreleased`, `### Added`)**

`- JSON view for fields…` maddesinin üstüne ekle:
```markdown
- Masking inside values: "Copy as Markdown" also masks Turkish IBANs, Turkish ID numbers (TCKN, with a valid
  checksum), Turkish mobile numbers and card numbers (Visa, Mastercard, Amex and Troy, with a valid Luhn digit)
  wherever they appear in a value, such as XML or plain-text request bodies. Each kind can be turned off; all
  four are on by default.
```

Ayar sürümü maddesi şöyle olur:
```markdown
- Settings files are version 3; settings from pre-release builds (versions 1 and 2) are converted when loaded.
```

- [ ] **Step 3: CLAUDE.md**

"Layers" listesindeki `src/core/` maddesinin sonu:
```markdown
`{path|fallback}` templates, conditions, and copy masking: by field name (`mask.ts`) and inside values (`value-mask.ts`: IBAN, TCKN, GSM, card).
```

"Docs" bölümündeki plan cümlesi:
```markdown
Plans 1 (link actions), 2 (Discover actions, copy/mask, JSON view, full options page), 3 (e2e matrix, CI, store package), 4 (environment variables, data views by name) and 5 (masking inside values) are done.
```

Uygulama sırasında kodu okuyarak çıkarılamayan yeni bir tuzak bulunduysa "Traps" bölümüne bir madde olarak ekle. Bulunmadıysa ekleme.

- [ ] **Step 4: Kontroller ve commit**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest
git branch --show-current   # plan-5-value-masks
git add README.md CHANGELOG.md CLAUDE.md
git commit -m "docs: masking inside values in the README, changelog and CLAUDE.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Doğrulama ve PR

**Files:**
- Create: `docs/verification/2026-10-plan-5.md`

- [ ] **Step 1: Bütün otomatik kontroller**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest && npm run zip
KT_STACK=7 npm run e2e && KT_STACK=8 npm run e2e && KT_STACK=9 npm run e2e
```
Bir sonraki adımdaki tabloya şu sonuçları yaz:
- test sayıları;
- e2e'de geçen ve atlanan testlerin sayıları;
- zip dosyasının boyutu.

- [ ] **Step 2: Doğrulama kaydını yaz**

`docs/verification/2026-10-plan-5.md` dosyasını oluştur. Değerler Step 1'in gerçek çıktısından ve Task 5'in `--repeat-each` koşusundan gelir.

```markdown
# Plan 5 doğrulaması (değere göre maskeleme)

- **Tarih:** <YYYY-MM-DD>
- **Dal:** `plan-5-value-masks`, HEAD `<kısa SHA>` (kayıt commit'inden önceki HEAD)
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
| `--repeat-each=3` (`copy`, `options`; 7.17 ve 9.5) | <sonuç> |

## Elle kontroller

| # | Kontrol | Sonuç |
|---|---|---|
| M1 | Kullanıcının Chrome'unda, sürüm 2 Alpha ayarlarıyla çalışan eklenti bu dalın derlemesiyle yenilendi (`chrome://extensions` → yenile). Ayarlar sayfası ortamları, değişkenleri ve aksiyonları kaybetmeden gösteriyor. "Değerin içinde maskele" kutularının dördü de işaretli. | |
| M2 | Alpha'da bir `payment_log` kaydında "Markdown olarak kopyala" kullanıldı. Yapıştırılan metinde `context.request` XML'indeki TCKN ve IBAN `***`, XML etiketleri yerinde. | |
```
Tarih ve SHA alanlarını gerçek değerlerle doldurmadan dosyayı commit etme.

- [ ] **Step 3: Elle kontrolleri kullanıcıdan iste**

1. **M1.** Kullanıcı eklentiyi bu dalın derlemesiyle (`.output/chrome-mv3`) yeniler ve ayarlar sayfasına bakar. Bu, depodaki sürüm 2 çevirisinin gerçek veriyle denemesidir.
2. **M2.** Kullanıcı Alpha'da bir `payment_log` kaydını açar ve "Markdown olarak kopyala"yı kullanır. Ardından yapıştırdığı metne kendisi bakar.
   - Kopyalanan metni sohbete istemezsin, okumazsın ve yazmazsın. Gerçek kişisel veri içerir.
   - Sonucu kullanıcının "geçti" ya da "geçmedi" yanıtı belirler.
3. Sonuçları tabloya yaz.
4. Bir kontrol geçmezse dur ve kullanıcıya sor. Kendi başına düzeltme yapma.

- [ ] **Step 4: Kayıt commit'i**

```bash
git branch --show-current   # plan-5-value-masks
git add docs/verification/2026-10-plan-5.md
git commit -m "docs: record Plan 5 verification

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

