# kibanatool Plan 3 — Uçtan Uca Test Matrisi, CI ve Mağaza Sürümü: Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eklenti 7.17, 8.19 ve 9.5'te her PR'da otomatik uçtan uca testlerle doğrulanır ve Chrome Web Store'a yüklenecek 1.0.0 paketi hazırlanır. Plan 2'den devreden düzeltmeler de bu sürüme girer.

**Architecture:**
- **Docker stack'leri** üç sürümü de kapsar: 7.17.29 eklendi ve `/kibana` alt yolunda çalışır. Seed deterministik ve tekrar çalıştırılabilir. Her stack'te bir `test` space'i, 9.x'te bir Observability space'i (`obs`) ve yalnızca okuma yetkili bir kullanıcı bulunur.
- **Playwright testleri** her testte eklentili, taze bir Chromium profili açar. Hangi stack'e bağlanılacağını `KT_STACK=7|8|9` seçer. Beklenen değerler seed'deki sabit loglardan gelir.
- **GitHub Actions:** Birim işinden sonra üç sürümlük uçtan uca matris çalışır.
- **Mağaza paketi:** İkonlar, sıkılaştırılmış manifest kontrolü, `wxt zip`, gizlilik politikası, README, CHANGELOG ve mağaza metinleri. Yükleme, etiket ve push kullanıcının onayıyla yapılır.

**Tech Stack:** Plan 2 ile aynı. Tek yeni geliştirme bağımlılığı `@playwright/test`.
- Uygulama: WXT 0.21, React 19, TypeScript 5.9 (strict)
- Kütüphaneler: zod 4, rison-node 2.1, lz-string 1.5
- Test: Vitest 5, happy-dom 20, Playwright 1.64
- Ortam: Docker (Elasticsearch + Kibana 7.17.29 / 8.19.23 / 9.5.5), GitHub Actions

**Spec:** `docs/superpowers/specs/2026-10-07-kibanatool-design.md`

**Önceki planlar:**
- `docs/superpowers/plans/2026-10-07-plan-1-link-actions-slice.md`: PR #1 ile `main`'e girdi.
- `docs/superpowers/plans/2026-10-08-plan-2-discover-copy-json-options.md`: PR #2 ile `main`'e girdi (merge commit `9830cea`).

**Çalışma dalı:** Ana checkout'ta yeni dal `plan-3-e2e-ci-release`, worktree açılmaz. Bu, Plan 2'de kullanıcının seçtiği yöntemdir; kullanıcı başka bir yol isterse onunki geçerlidir. `docs/superpowers/` ana checkout'ta zaten var ve hiçbir commit'e girmez.

### Planların sırası

| Plan | Kapsam |
|---|---|
| 1 (tamamlandı) | İskelet, link aksiyonları, iki adaptör, background kaydı, asgari ayarlar sayfası |
| 2 (tamamlandı) | Discover aksiyonları, kopyalama menüsü, JSON görünümü, tam ayarlar sayfası |
| **3 (bu plan)** | Plan 2'den devreden düzeltmeler, 7.17 stack'i ve deterministik seed, Playwright uçtan uca matrisi (Observability, space, alt yol, kısıtlı kullanıcı, ayarlar sayfası), sürüm başına HTML örnekleri, GitHub Actions, ikonlar, gizlilik politikası, README/CHANGELOG, mağaza metinleri, `wxt zip` paketi |

### Plan yazılırken yapılan denemeler (2026-10-08)

Planı kesin koda dayandırmak için çalışan stack'lerde şunlar denendi:

| Deneme | Sonuç |
|---|---|
| Elasticsearch anonim erişimi açıkken `superuser` rollü anonim kullanıcı ve yalnızca okuma yetkili kullanıcı | **Olmuyor.** Elasticsearch anonim kullanıcının rollerini kimliği doğrulanmış her kullanıcıya da ekliyor: kullanıcı `["kt_reader","superuser"]` oldu. |
| Elasticsearch anonim erişimi kapalı, Kibana'nın anonim sağlayıcısı `credentials: {username: "kt_anon", password}` ile (7.17.29, `/kibana` alt yolu) | Çalışıyor. Tarayıcı `kt_anon` olarak girdi. Okuma kullanıcısının rolü yalnızca `["kt_reader"]`. |
| 7.17'de `telemetry.optIn: false` + `telemetry.allowChangingOptInStatus: false` | Kibana açılmıyor (`[telemetry].optIn: expected value to equal [true]`). İkinci satır kaldırılınca üç sürümde de geçerli. |
| `SERVER_BASEPATH=/kibana` + `SERVER_REWRITEBASEPATH=true` (7.17.29) | Çalışıyor. Kibana Docker başlatıcısı (8.19.23 ve 9.5.5) boş ortam değişkenlerini atlıyor, yani 8/9'da değişkeni boş geçmek alt yolu kapatır. `${BASE_PATH:+true}` Compose v5.1.2'de doğru açılıyor. |
| Playwright `setExtraHTTPHeaders({ authorization: "Basic …" })` ile okuma kullanıcısı | Çalışıyor. Discover sayfası ve içerik betiğinin `fetch` isteği başlığı taşıyor, çerez oluşmuyor. Çubuk doğru link ile çıktı (7.17, alt yol). |
| 7.17'de alt yol + `test` space'i, `#/doc/` linkinden kimlik, KQL `extra.uid:"uid-001"` | Çalışıyor. 7.17'de eski tablo zaten varsayılan, ayar gerekmiyor. |
| 9.5'te `solution: "oblt"` ile ayrı `obs` space'i | Çalışıyor: panel "Log overview" sekmesiyle (`docViewerTab-doc_view_logs_overview`) açıldı, `_id` satırı yok, çubuk doğru. Varsayılan space'i değiştirmeye gerek yok. |
| 9.5'te aynı data view kimliğini ikinci bir space'te oluşturmak | **Olmuyor** (`Saved object [index-pattern/logs] conflict`). 7.17 izin veriyor. Space'lerdeki data view'lar kendi kimliklerini alır (`test-app-log`, `obs-logs`). |
| 7.17'de `/api/data_views/data_view` | 404. 7.17'de `/api/index_patterns/index_pattern` kullanılır (aynı alanlar, `name` yok). |
| `discoverQueryHits`, `queryInput`, `pagination-button-next`, `docTableExpandToggleColumn` | Üç sürümde de var. |
| WXT ikon keşfi | `public/icon/<boyut>.png` (`/^icons?[/\\]([0-9]+)\.png$/`) manifestteki `icons`'a otomatik eklenir. |

### Spec'ten sapmalar ve kararlar

| Spec | Bu plan | Neden |
|---|---|---|
| §13.2: "tarayıcı anonim auth sağlayıcısıyla şifresiz girer" | Elasticsearch anonim erişimi kapatılır. Kibana'nın anonim sağlayıcısı `kt_anon` adlı gerçek bir `superuser` kullanıcıyla girer (Task 4). | Elasticsearch anonim rolleri her kullanıcıya ekliyor (denemeler). Aksi halde "yalnızca okuma yetkili kullanıcı" senaryosu kurulamaz. Tarayıcı yine şifresiz girer. |
| §13.2: alt yolda çalışan Kibana | Ayrı bir stack yerine 7.17 stack'i her zaman `/kibana` alt yolunda çalışır (Task 4). | Ek Kibana gerekmez. 7.17 senaryolarının hepsi alt yolu da sınar, 8/9 kök yolu sınar. |
| §13.2: 9.5 Observability görünümü | Varsayılan space değiştirilmez. Seed 9.x'te `solution: "oblt"` ile `obs` space'i kurar. `docker/obs-view.sh` silinir (Task 4). | Varsayılan space'in görünümü diğer 9.5 senaryolarını etkiliyordu. Ayrı space'le iki görünüm aynı anda test edilir. |
| §13.2: yalnızca okuma yetkili kullanıcı | Tarayıcı bu kullanıcıyla giriş formu yerine `Authorization: Basic` başlığıyla girer. Kibana'nın HTTP kimlik doğrulaması bunu kabul eder (Task 7). | Giriş formu ikinci bir sağlayıcı ister ve geliştirme ortamındaki şifresiz girişi bozar. Başlık yöntemi denendi. |
| İzin penceresi | Testlerdeki eklenti kopyasının manifestinde stack'in origin'i `host_permissions` olarak verilir (Plan 1 yöntemi). Derlenen manifest değişmez (Task 5). | Chrome'un izin penceresi otomasyonla cevaplanamıyor. Hiçbir senaryo `permissions.remove` çağrısının başarılı olmasına dayanmıyor. İzin penceresi, izni geri alma ve "Site erişimi" listesi elle denenir (Task 12). |
| §13.1: `tests/fixtures/` altında HTML örnekleri | Her örnek tek bir JSON dosyasıdır: detay görünümünün HTML'i, `pathname`, `hash`, önek ve beklenen kimlik. Örnekleri `capture.spec.ts` yakalar (Task 8). | Adaptör testi sayfanın adresini ve beklenen sonucu da ister. Tek dosya bunları birlikte tutar. Kimlik eklentiden değil Elasticsearch'ten alınır. |
| §3: doğrulanmış sürümler 7.17.29, 8.15.3, 8.19.23 ve 9.5.5 | Uçtan uca matris yalnızca 7.17.29, 8.19.23 ve 9.5.5'i kapsar. 8.15.3 yalnızca 2026-10-07 denemesinde doğrulandı. | Spec §13.2 matrisi bu üç sürümle tanımlıyor. 8.15 ile 8.19 aynı adaptörü ve aynı isteği kullanıyor. |
| §13.3: "lint, tip kontrolü ve birim testleri" | Lint yerine `npm run typecheck` (strict TypeScript) çalışır. ESLint eklenmez (Task 9). | Depoda linter yok. Strict tip kontrolü asıl hataları yakalıyor. Biçim kuralı için yeni bağımlılık ve ayar gerekmiyor. |
| §14: sürüm numarası | İlk mağaza sürümü `1.0.0` olur (`package.json` şu an `0.1.0`) (Task 10). | Spec bu sürümü "v1" diye tanımlıyor. **Kullanıcı onayı gerekir.** |
| §14: MIT lisansı | `LICENSE` telif satırı: `Copyright (c) 2026 kibanatool contributors` (Task 11). | Kişi adı varsayılmadı. **Kullanıcı kendi adını yazdırmak isterse değişir.** |
| §14: yayın | Paket hazırlanır. Etiket, push, PR ve mağazaya yükleme yalnızca kullanıcının açık onayıyla yapılır. Mağazaya yüklemeyi kullanıcı elle yapar (Task 12). | Hepsi depo dışına etki eder. |

### Plan 2'den (ve Plan 1'den) devreden bulgular

| Bulgu | Task |
|---|---|
| Epoch saniye değerleri 1970'te bir pencere açıyor (`logTimeMs`) | 1 |
| Gövde okunurken zaman aşımı "uyumsuz" diye gösteriliyor, "ağ" olmalı | 1 |
| s/m/h datemath yerel saat setter'larıyla çalışıyor, yaz saati geri dönüşünde bir saat kayıyor | 1 |
| `copy.markdownFields` içinde yaprak olmayan bir alan (örn. `context`) sessizce atlanıyor | 1 |
| Markdown'da `_index`/`_id` içindeki `)` linki bozuyor | 1 |
| Bozuk ayar yüklendikten sonra host izinleri kalıyor; dışa aktarma boş ayarı veriyor, bozuk ayarı onarmanın yolu yok | 2 |
| Reddedilen `permissions.request` hatasını ardından gelen kayıt siliyor | 2 |
| Hızlı art arda iki içe aktarma dosyası sırasız sonuçlanabiliyor | 2 |
| Başka bir aksiyonda "Düzenle" kaydedilmemiş taslağı siliyor | 2 |
| Kaldır/Düzenle butonlarının `aria-label`'ı hangi öğe olduğunu söylemiyor | 2 |
| `CopySection`'da çift yorum, `ActionsSection`'da Kaldır butonunun girintisi | 2 |
| Kopyalama menüsü dışarı tıklayınca kapanmıyor, odak tetikleyiciye dönmüyor, ok tuşları yok | 3 (testi Task 6) |
| Seed hataları sessizce geçebiliyor (`bulk.errors`, `legacy_log` catch, Kibana hazır olmadan devam eden `up.sh`) | 4 |
| `.env.<major>` sürümü ve portları ilk oluşturulduğu anda sabitliyor | 4 |
| Seed'i tekrar çalıştırmak logları çoğaltıyor; testler sabit loglar istiyor | 4 |
| `check-manifest` `optional_permissions`, `web_accessible_resources`, `externally_connectable` alanlarına bakmıyor | 10 |
| `LICENSE` yok | 11 |
| Elle denenecekler: izin penceresinde izin verme ve reddetme, geri alınan izni yeniden verme, "Site erişimi" listesi | 12 |
| Datemath test boşlukları: yıl sonuna yuvarlama, `now-Nh` | 1 |

**Bu planda yapılmayanlar (v1 sonrasına bırakıldı):**
- `evaluateCondition` içinde `Object.hasOwn` yok (alan haritaları prototipsiz, ulaşılamaz).
- Ortam onarımı arayüzde sessiz kalıyor.
- `kibanaPrefix` segment sınırına bakmıyor (etkin ortamla ulaşılamaz).
- `getVersion`'daki zararsız yarış.
- Markdown başlığı (`_index`, zaman) maskelenmiyor.
- Datemath'in mutlak tarihleri `Date.parse`'a güvenmesi.
- JSON görünümü aç/kapa sonrası yeniden kaydırıyor.
- `parseSample`'ın metin olmayan `_id`'yi `[object Object]` yapması.
- İç içe kapatma, alanlar modunda maskeli JSON alt yolu ve boş `maskPatterns` için test boşlukları.
- Background kaydı için sahte nesne test boşlukları. Adaptörlerin gerçek DOM'daki davranışı artık Task 8'deki örneklerle sınanıyor.

Kullanıcıya etkisi olmayan ya da ulaşılamayan durumlar bunlar. Hiçbiri 1.0.0'ı engellemiyor.

## Global Constraints

- **Node ve npm:** Node `>=22`, paket yöneticisi `npm`. Tek yeni bağımlılık `devDependencies` içinde `@playwright/test` `^1.64.0`. Başka bağımlılık eklenmez.
- **TypeScript:** `typescript@5`, `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax` (WXT'den gelir; tip import'ları `type` ile). `npm run typecheck` `tests/e2e/` ve `playwright.config.ts` dosyalarını da kapsar.
- **Desteklenen Kibana sürümleri:** 7.17.29, 8.19.23 ve 9.5.5 (spec §3). Yalnızca Chrome MV3, yalnızca Discover.
- **Manifest izinleri değişmez:**
  - `permissions` tam olarak `["storage", "scripting"]`
  - `optional_host_permissions` tam olarak `["http://*/*", "https://*/*"]`
  - `host_permissions`, `content_scripts`, `optional_permissions`, `web_accessible_resources` ve `externally_connectable` yok
  - `npm run check:manifest` her task'ın sonunda geçer.
- **Docker stack'leri** (Task 4'ten sonra):

  | `up.sh` | Sürüm | Elasticsearch | Kibana | Alt yol |
  |---|---|---|---|---|
  | `7` | 7.17.29 | `http://localhost:17200` | `http://localhost:17601/kibana` | `/kibana` |
  | `8` | 8.19.23 | `http://localhost:18200` | `http://localhost:18601` | yok |
  | `9` | 9.5.5 | `http://localhost:19200` | `http://localhost:19601` | yok |

  - Sırlar `docker/.env.<major>` dosyasındadır (izin 600, gitignore'da): `ELASTIC_PASSWORD`, `KIBANA_SYSTEM_PASSWORD`, `ANON_PASSWORD`, `READER_PASSWORD`, `ENC_KEY`.
  - **Sırlar hiçbir çıktıya, loga, commit'e ya da rapora yazılmaz.**
  - Projeyi başlatan ekibin `http://localhost:9601` adresindeki 7.17 ortamı ve 9200/9201 portları kullanılmaz, durdurulmaz.
- **Seed sözleşmesi:** `docker/seed.mjs`'deki log kimlikleri, değerleri ve zamanları uçtan uca testlerin beklentileridir. Biri değişirse öbürü de aynı commit'te değişir.
- **Uçtan uca testler:**
  - Yerelleştirilmiş metin doğrulanmaz. Seçiciler Kibana'nın `data-test-subj` değerleri, ARIA rolleri, eklentinin sınıf adları, menüdeki sıra ve ayarlardaki aksiyon etiketleridir. macOS'ta Chromium arayüz dilini işletim sisteminden alır.
  - Zaman Kibana'nın zaman seçicisinden değil, URL'deki `_g.time`'dan okunur. 9.5'in seçicisi farklı ve dakika hassasiyetinde gösteriyor.
  - Sabit `waitForTimeout` beklemesi yazılmaz. Locator beklemeleri ve `expect.poll` kullanılır. İlk Discover yüklemesi için 90 saniyeye kadar beklenir.
  - Her testte konsola `[kibanatool]` içeren `error` düzeyinde mesaj düşmez. Bunu fixture doğrular.
- **Kibana'yı bozmamak:** İçerik betiği hiçbir hatayı dışarı sızdırmaz. Hatalar `console.debug("[kibanatool]", ...)` ile loglanır. Çubuğun kök elemanı `click` ve `keydown` yayılmasını durdurur.
- **UI:** Shadow DOM içinde React. `innerHTML` ya da `dangerouslySetInnerHTML` kullanılmaz. Yeni kullanıcı metni gerekirse `public/_locales/{en,tr}/messages.json` ikisine de eklenir. Bu planda yeni metin anahtarı gerekmiyor.
- **Import yolları:** `wxt/browser` ve `#imports` yalnızca `entrypoints/` ve `src/i18n.ts` içinde. `src/i18n.ts`'i import eden React bileşenlerinin birim testi yazılmaz, onları uçtan uca testler sınar. `tests/e2e/` saf `src/` modüllerini (`src/kibana/url.ts`, `src/kibana/discover-state.ts`, `src/core/datemath.ts`, `src/core/config.ts`) import edebilir.
- **Komutlar (her task'ın sonunda):** `npm test`, `npm run typecheck`, `npm run build`, `npm run check:manifest`. Task 5'ten sonra uçtan uca testleri değiştiren task'lar `KT_STACK=7 npm run e2e`, `KT_STACK=8 npm run e2e` ve `KT_STACK=9 npm run e2e` komutlarını da çalıştırır.
- **Bellek:** Üç stack ve ekibin ortamı birlikte yaklaşık 10 GB ister. Docker'a 12 GB'tan az bellek verilmişse stack'ler sırayla kullanılır: `./docker/down.sh 8 && ./docker/up.sh 7` gibi.
- **Git:**
  - Bu depoda `user.email` yerel olarak `cllakyz@hotmail.com`.
  - Her commit mesajı `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` satırıyla biter.
  - `docs/superpowers/` dosyaları commit edilmez.
  - Push, PR, etiket ve sürüm yalnızca kullanıcının açık onayıyla yapılır. Push komutu: `GH_TOKEN=$(gh auth token --user cllakyz) git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push`

## Review Focus

1. **Alt yol ve space birlikte (`/kibana/s/test` üzerinde 7.17):** Çubuğun linkleri, Kibana istekleri ve kopyalanan log linki `/kibana/s/test` önekini taşımalı. Testi Task 7 içerir (`spaces.spec.ts`, 7 numaralı stack'te kopyalanan linki karşılaştırır).
2. **Yalnızca okuma yetkili kullanıcı:** Yalnızca `read` ve `view_index_metadata` yetkisi olan kullanıcıda çubuk çalışmalı. Kullanıcıya gizlice `superuser` eklenmemeli. Testi Task 7 içerir (`readonly.spec.ts`: rollerin tam olarak `["kt_reader"]` olduğunu da doğrular).
3. **Epoch saniye ve milisaniye sınırı:** `99_999_999_999` saniye, `100_000_000_000` milisaniye sayılmalı. Sayı ve rakam metni aynı davranmalı. Testi Task 1 içerir.
4. **Yaz saati geri dönüşü:** `America/New_York`'ta 1 Kasım 2026 01:30 EST anında `now-1h`, `now-90m` ve `now-3600s` mutlak zamanla geri gitmeli, `now-1d` ise takvim günü olarak kalmalı. Testi Task 1 içerir.
5. **`copy.markdownFields` içinde üst alan:** `context` listelenince altındaki her yaprak bir kez yazılmalı. JSON metni açılmış alt yollar olarak değil tek bir maskeli `json` bloğu olarak çıkmalı. Testi Task 1 içerir.

## Dosya yapısı

```
src/core/discover-actions.ts   (değişir) logTimeMs epoch saniye
src/core/datemath.ts           (değişir) s/m/h mutlak zaman
src/core/markdown.ts           (değişir) listelenen üst alan, linkte parantez
src/kibana/client.ts           (değişir) gövde zaman aşımı → network
src/options/model.ts           (değişir) unusedOrigins(granted, after)
src/storage.ts                 (değişir) LoadedConfig.invalid
src/content/CopyMenu.tsx       (değişir) klavye, odak, dışarı tıklama
entrypoints/options/
  App.tsx, EnvironmentsSection.tsx, ActionsSection.tsx, ActionEditor.tsx,
  TransferSection.tsx, CopySection.tsx, options.css   (değişir)
docker/
  compose.yml, kibana.yml, up.sh, down.sh            (değişir)
  seed.mjs                                           (yeniden yazılır)
  obs-view.sh                                        (silinir)
playwright.config.ts                                 (yeni)
tests/e2e/
  stack.ts, global-setup.ts, fixtures.ts, kibana.ts  (yeni) altyapı
  bar.spec.ts, navigation.spec.ts, copy.spec.ts, json.spec.ts,
  spaces.spec.ts, readonly.spec.ts, options.spec.ts, capture.spec.ts   (yeni)
tests/fixtures/*.json                                (yeni, Task 8)
tests/unit/adapters/fixtures.test.ts                 (yeni)
tests/unit/examples.test.ts                          (yeni)
examples/kibanatool-settings.json                    (yeni)
.github/workflows/ci.yml                             (yeni)
assets/icon.svg, scripts/icons.mjs, public/icon/{16,32,48,128}.png   (yeni)
scripts/check-manifest.mjs                           (değişir)
LICENSE, PRIVACY.md, CHANGELOG.md, docs/store-listing.md            (yeni)
README.md, CLAUDE.md, package.json, .gitignore      (değişir)
docs/verification/2026-10-plan-3.md                  (yeni, Task 12)
```

---
### Task 0: Dalı aç

- [ ] **Step 1: Ana checkout'ta `main`'den yeni dal aç**

```bash
git switch main && git pull --ff-only && git switch -c plan-3-e2e-ci-release
git status --short   # boş olmalı
```

Bu adımın commit'i yoktur. Kullanıcı worktree isterse `superpowers:using-git-worktrees` kullanılır ve `docs/superpowers/` oraya kopyalanır (`cp -R <ana checkout>/docs/superpowers docs/`).

---

### Task 1: Çekirdek düzeltmeleri

**Files:**
- Modify: `src/core/discover-actions.ts`, `src/kibana/client.ts`, `src/core/datemath.ts`, `src/core/markdown.ts`
- Test: `tests/unit/core/discover-actions.test.ts`, `tests/unit/kibana/client.test.ts`, `tests/unit/core/datemath.test.ts`, `tests/unit/core/markdown.test.ts`

**Interfaces:**
- Consumes: Plan 2'deki `logTimeMs`, `createKibanaClient`, `KibanaError`, `resolveDatemath`, `buildMarkdown`, `flattenSource`, `flattenDoc`
- Produces: imzalar değişmez. Davranış değişiklikleri:
  - `logTimeMs`: `1e11`'den küçük epoch değerleri saniyedir.
  - `fetchDoc`, `getDataView`: gövde okunurken gelen `TimeoutError`/`AbortError` → `KibanaError("network")`.
  - `resolveDatemath`: `s`, `m`, `h` mutlak milisaniyeyle eklenir.
  - `buildMarkdown`: listelenen ve kendisi alan olmayan bir yol, altındaki ham yaprakların hepsine açılır. Kapanış linkindeki `(` ve `)` `%28`/`%29` olur.

- [ ] **Step 1: `logTimeMs` testini ekle**

`tests/unit/core/discover-actions.test.ts` dosyasında `describe("logTimeMs", …)` bloğunun içine, son `it`'ten önce ekle:
```ts
  it("reads epoch values below 1e11 as seconds, as a number or text", () => {
    expect(logTimeMs(1786528800)).toBe(1786528800000);
    expect(logTimeMs("1786528800")).toBe(1786528800000);
    expect(logTimeMs(99_999_999_999)).toBe(99_999_999_999_000);
    expect(logTimeMs(100_000_000_000)).toBe(100_000_000_000);
  });
```

- [ ] **Step 2: İstemci testini ekle**

`tests/unit/kibana/client.test.ts` dosyasının sonuna ekle:
```ts
describe("timeouts while the body is read", () => {
  it("reports a body that times out as network, not incompatible", async () => {
    const { fetch } = fakeFetch(() => {
      const response = searchOk();
      response.json = () => Promise.reject(new DOMException("The operation timed out.", "TimeoutError"));
      return response;
    });
    const client = createKibanaClient({ prefix: "", fetch });
    expect(await kindOf(client.fetchDoc("app_log", "abc"))).toBe("network");
  });
});
```

- [ ] **Step 3: Datemath testlerini ekle**

`tests/unit/core/datemath.test.ts` dosyasında ilk iki satırı şöyle değiştir:
```ts
import { afterAll, describe, expect, it } from "vitest";
import { resolveDatemath } from "../../../src/core/datemath";

// A zone with DST, so the DST tests below mean something on any machine (UTC on CI).
// Node applies a TZ change at runtime; the other tests here pass in any zone.
const originalTz = process.env.TZ;
process.env.TZ = "America/New_York";
afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});
```
`describe("resolveDatemath", …)` bloğundaki "rounds down for from…" testinin sonuna (`now/y` satırından sonra) ekle:
```ts
    expect(resolveDatemath("now/y", NOW, true)).toBe(local(2026, 11, 31, 23, 59, 59, 999));
```
Dosyanın sonuna ekle:
```ts
describe("resolveDatemath across a DST change", () => {
  // America/New_York falls back on 1 November 2026 at 06:00Z: 02:00 EDT becomes 01:00 EST.
  const AFTER_FALL_BACK = new Date("2026-11-01T06:30:00.000Z"); // 01:30 EST

  it("moves s, m and h by absolute time, like Kibana", () => {
    expect(AFTER_FALL_BACK.getTimezoneOffset()).toBe(300); // EST: the TZ switch above took effect
    expect(resolveDatemath("now-1h", AFTER_FALL_BACK, false)).toBe("2026-11-01T05:30:00.000Z");
    expect(resolveDatemath("now-90m", AFTER_FALL_BACK, false)).toBe("2026-11-01T05:00:00.000Z");
    expect(resolveDatemath("now-3600s", AFTER_FALL_BACK, false)).toBe("2026-11-01T05:30:00.000Z");
  });

  it("keeps d as a calendar day", () => {
    expect(resolveDatemath("now-1d", AFTER_FALL_BACK, false)).toBe("2026-10-31T05:30:00.000Z"); // 01:30 EDT
  });
});
```
Eski kodla `now-1h` `2026-11-01T04:30:00.000Z`, `now-90m` `04:00:00.000Z` döner (Node'da `TZ=America/New_York` ile denendi).

- [ ] **Step 4: Markdown testlerini ekle**

`tests/unit/core/markdown.test.ts` dosyasının sonuna ekle:
```ts
describe("buildMarkdown with a listed parent field", () => {
  it("lists every leaf under the parent once, JSON text as one masked block", () => {
    expect(buildMarkdown(options({ fields: ["context", "level"] })).split("\n")).toEqual([
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
      "- `level`: 200",
      "[Open in Kibana](http://k/app/discover#/doc/dv/app_log?id=A1)",
    ]);
  });

  it("keeps parentheses in the log link from ending the Markdown link", () => {
    const markdown = buildMarkdown(options({ docUrl: "http://k/app/discover#/doc/dv/logs(1)?id=a(b)" }));
    expect(markdown.split("\n").at(-1)).toBe("[Open in Kibana](http://k/app/discover#/doc/dv/logs%281%29?id=a%28b%29)");
  });
});
```

- [ ] **Step 5: Testlerin kırıldığını gör**

Run: `npx vitest run tests/unit/core tests/unit/kibana/client.test.ts`
Expected: FAIL. Yeni `logTimeMs`, zaman aşımı, DST (`now-1h` `04:30` döner), üst alan ve parantez testleri kırılır. Eski testler geçer.

- [ ] **Step 6: `logTimeMs`'i düzelt**

`src/core/discover-actions.ts` dosyasında `logTimeMs` fonksiyonunu ve üstündeki yorumu şununla değiştir:
```ts
/** Epoch values below 1e11 are seconds: as milliseconds they would fall before March 1973. */
const fromEpoch = (epoch: number): number => (epoch < 1e11 ? epoch * 1000 : epoch);

/** Epoch milliseconds of a time field value. Elasticsearch reads a date without a zone as UTC; Date.parse would not. */
export function logTimeMs(value: unknown): number | undefined {
  if (Array.isArray(value)) return logTimeMs(value[0]);
  const valid = (ms: number) => (Number.isFinite(new Date(ms).getTime()) ? ms : undefined);
  if (typeof value === "number") return valid(fromEpoch(value));
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (/^\d+$/.test(text)) return valid(fromEpoch(Number(text)));
  return valid(Date.parse(ZONELESS.test(text) ? `${text.replace(" ", "T")}Z` : text));
}
```

- [ ] **Step 7: İstemcide gövde zaman aşımını düzelt**

`src/kibana/client.ts` dosyasında `readJson` fonksiyonunu şununla değiştir:
```ts
/** A 2xx body that is not a JSON object (an SSO page, `null`) is an unexpected response, not a TypeError. */
async function readJson<T extends object>(response: Response): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    // AbortSignal.timeout also aborts a body that is still arriving: that is a slow Kibana, not another API.
    if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new KibanaError("network", "Kibana is unreachable");
    }
    throw new KibanaError("incompatible", "Unexpected response");
  }
  if (typeof body !== "object" || body === null) throw new KibanaError("incompatible", "Unexpected response");
  return body as T;
}
```

- [ ] **Step 8: Datemath'te s/m/h'yi mutlak zamana çevir**

`src/core/datemath.ts` dosyasında `add` fonksiyonunu şununla değiştir:
```ts
const UNIT_MS: Partial<Record<Unit, number>> = { s: 1000, m: 60_000, h: 3_600_000 };

function add(date: Date, amount: number, unit: Unit): void {
  // Like Kibana (moment): s, m and h are absolute time, so a DST change does not shift them; d, w, M and y are calendar units.
  const ms = UNIT_MS[unit];
  if (ms !== undefined) {
    date.setTime(date.getTime() + amount * ms);
    return;
  }
  switch (unit) {
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
```

- [ ] **Step 9: Markdown'ı düzelt**

`src/core/markdown.ts` dosyasında `buildMarkdown` fonksiyonunu şununla değiştir:
```ts
export function buildMarkdown(options: MarkdownOptions): string {
  const { hit, timeField, fields, maskPatterns, docUrl, linkLabel } = options;
  const isMasked = maskMatcher(maskPatterns);
  const all = flattenDoc(hit);
  // JSON text stays whole (spec §7.4): the full list and listed parents use the raw leaves, not parsed sub-paths.
  const leaves = flattenSource(hit._source ?? {}, false);
  // Listed fields may also name JSON sub-paths or _id, which only `all` has.
  const source: FieldMap = fields.length > 0 ? all : leaves;
  const paths = fields.length > 0 ? fields.flatMap((path) => listedPaths(path, all, leaves)) : Object.keys(leaves).sort();
  const time = timeField === undefined ? undefined : all[timeField];
  const lines = [`**${hit._index}**${isMissing(time) ? "" : ` · ${formatValue(time)}`}`];
  for (const path of paths) {
    const value = source[path];
    if (isMissing(value)) continue;
    lines.push(...fieldLines(path, maskValue(path, value, isMasked)));
  }
  // A ")" in the index or id would end the Markdown link early.
  lines.push(`[${linkLabel}](${docUrl.replace(/[()]/g, (paren) => (paren === "(" ? "%28" : "%29"))})`);
  return lines.join("\n");
}

/** A listed path that is not a field itself (e.g. `context`) stands for every raw leaf under it. */
function listedPaths(path: string, all: FieldMap, leaves: FieldMap): string[] {
  if (Object.hasOwn(all, path)) return [path];
  return Object.keys(leaves)
    .filter((leaf) => leaf.startsWith(`${path}.`))
    .sort();
}
```

- [ ] **Step 10: Testlerin geçtiğini gör**

Run: `npm test && npm run typecheck && npm run build && npm run check:manifest`
Expected: hepsi geçer.

- [ ] **Step 11: Commit**

```bash
git add src/core/discover-actions.ts src/kibana/client.ts src/core/datemath.ts src/core/markdown.ts \
  tests/unit/core/discover-actions.test.ts tests/unit/kibana/client.test.ts tests/unit/core/datemath.test.ts tests/unit/core/markdown.test.ts
git commit -m "fix: epoch seconds, body timeouts, DST-safe date math and listed parent fields in Markdown

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Ayarlar sayfası düzeltmeleri

**Files:**
- Modify: `src/options/model.ts`, `src/storage.ts`, `entrypoints/options/App.tsx`, `entrypoints/options/EnvironmentsSection.tsx`, `entrypoints/options/ActionsSection.tsx`, `entrypoints/options/ActionEditor.tsx`, `entrypoints/options/TransferSection.tsx`, `entrypoints/options/CopySection.tsx`, `entrypoints/options/options.css`
- Test: `tests/unit/options/model.test.ts`, `tests/unit/storage.test.ts`

**Interfaces:**
- Consumes: Plan 2'deki `Config`, `originPattern`, `createConfigStore`, `useSubmit`, `SectionProps`
- Produces:
  - `unusedOrigins(granted: string[], after: Config): string[]` (imza değişti: ilk parametre artık Chrome'un verdiği izin desenleri)
  - `LoadedConfig.invalid?: unknown`: bozuk kayıtlı değerin kendisi
  - `TransferSection` yeni prop: `exportValue: unknown`
  - Uçtan uca testlerin kullandığı seçiciler (Task 7):
    - Ortam formunda `input[name="name"]` ve `input[name="kibanaUrl"]`
    - Aksiyon düzenleyicisinde `input[name="label"]` ve `input[name="urlTemplate"]`
    - Taslak açıkken aksiyon listesindeki "Düzenle" ve iki "ekle" butonu `disabled`

- [ ] **Step 1: Model ve depolama testlerini güncelle**

`tests/unit/options/model.test.ts` dosyasında `describe("unusedOrigins", …)` bloğunu tamamen şununla değiştir:
```ts
describe("unusedOrigins", () => {
  it("lists granted patterns that no environment needs any more", () => {
    const config = { ...emptyConfig(), environments: [newEnvironment("A", "https://a.example.com/kibana", "e1")] };
    const granted = ["https://a.example.com/*", "http://b.example.com:5601/*"];
    expect(unusedOrigins(granted, config)).toEqual(["http://b.example.com:5601/*"]);
    expect(unusedOrigins(granted, emptyConfig())).toEqual(granted);
    expect(unusedOrigins([], config)).toEqual([]);
  });
});
```
`tests/unit/storage.test.ts` dosyasında `describe("createConfigStore", …)` bloğunun içine, "falls back to the empty config…" testinden sonra ekle:
```ts
  it("keeps a corrupt stored value so it can be exported and repaired", async () => {
    const stored = { schemaVersion: 99, environments: "x" };
    const loaded = await createConfigStore(fakeArea({ [CONFIG_KEY]: stored })).load();
    expect(loaded.invalid).toEqual(stored);
  });
```

- [ ] **Step 2: Testlerin kırıldığını gör**

Run: `npx vitest run tests/unit/options/model.test.ts tests/unit/storage.test.ts`
Expected: FAIL. `unusedOrigins` eski imzayla dizi yerine `Config` bekliyor, `loaded.invalid` `undefined`.

- [ ] **Step 3: `unusedOrigins` ve `LoadedConfig`'i değiştir**

`src/options/model.ts` dosyasında `unusedOrigins` fonksiyonunu ve yorumunu şununla değiştir:
```ts
/**
 * Granted host permission patterns that no environment of `after` needs. Compared with what Chrome granted,
 * not with the previous config: after a corrupt load that is the empty fallback, which needs nothing.
 */
export function unusedOrigins(granted: string[], after: Config): string[] {
  const needed = new Set(after.environments.map((environment) => originPattern(environment.kibanaUrl)));
  return granted.filter((pattern) => !needed.has(pattern));
}
```
`src/storage.ts` dosyasında `LoadedConfig` arayüzünü ve `load` fonksiyonunu şununla değiştir:
```ts
export interface LoadedConfig {
  config: Config;
  /** Validation errors of a corrupt stored config; the empty config is used then. */
  errors: string[];
  /** The corrupt stored value itself, so the options page can export it for repair. */
  invalid?: unknown;
}
```
```ts
    async load(): Promise<LoadedConfig> {
      const stored = (await area.get(CONFIG_KEY))[CONFIG_KEY];
      if (stored === undefined) return { config: emptyConfig(), errors: [] };
      const parsed = parseConfig(stored);
      return parsed.ok ? { config: parsed.config, errors: [] } : { config: emptyConfig(), errors: parsed.errors, invalid: stored };
    },
```

- [ ] **Step 4: `App.tsx`'i güncelle**

`entrypoints/options/App.tsx` dosyasında `App` fonksiyonunu şununla değiştir:
```tsx
export function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  // A corrupt stored value: "Export" saves it as is until a save replaces it, so it can be fixed by hand.
  const [invalid, setInvalid] = useState<unknown>(undefined);

  useEffect(() => {
    store.load().then(
      (loaded) => {
        setConfig(loaded.config);
        setLoadErrors(loaded.errors);
        setInvalid(loaded.invalid);
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
    setInvalid(undefined);
    try {
      const unused = unusedOrigins((await browser.permissions.getAll()).origins ?? [], next);
      if (unused.length > 0) await browser.permissions.remove({ origins: unused });
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
      <TransferSection {...props} exportValue={invalid ?? current} />
    </main>
  );
}
```

- [ ] **Step 5: `TransferSection.tsx`'i güncelle**

`entrypoints/options/TransferSection.tsx` dosyasında import satırını ve `TransferSection` fonksiyonunun başından `choose` fonksiyonunun kapanış ayracına kadar olan kısmı şununla değiştir:
```tsx
import { type ChangeEvent, useRef, useState } from "react";
```
```tsx
export function TransferSection({ onSave, exportValue }: SectionProps & { exportValue: unknown }) {
  const [pending, setPending] = useState<Config | null>(null);
  const picks = useRef(0);
  const { errors, saved, submit, fail } = useSubmit(onSave);

  function exportSettings(): void {
    const link = document.createElement("a");
    link.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportValue, null, 2))}`;
    link.download = "kibanatool-settings.json";
    link.click();
  }

  function choose(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = ""; // so choosing the same file again still fires change
    setPending(null);
    const pick = ++picks.current; // a slower, earlier pick must not overwrite the latest one
    if (!file) return;
    file.text().then(
      (text) => {
        if (pick !== picks.current) return;
        const result = parseImport(text);
        if (result.ok) {
          fail([]);
          setPending(result.config);
        } else {
          fail([t("optionsImportErrors"), ...result.errors]);
        }
      },
      (error: unknown) => {
        if (pick === picks.current) fail([String(error)]);
      },
    );
  }
```
`replace` fonksiyonu ve JSX olduğu gibi kalır.

- [ ] **Step 6: `EnvironmentsSection.tsx`'i güncelle**

`entrypoints/options/EnvironmentsSection.tsx` dosyasında `request`, `add` ve `grant` fonksiyonlarını şununla değiştir:
```tsx
  // Chrome shows the permission prompt only during the click, so this runs before any await.
  // It resolves to the errors to show, so a following save cannot hide them.
  function request(environment: Environment): Promise<string[]> {
    return browser.permissions.request({ origins: [originPattern(environment.kibanaUrl)] }).then(
      () => [],
      (error: unknown) => [t("optionsPermissionError", String(error))],
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
    void request(environment).then(async (permissionErrors) => {
      if (await submit(result)) {
        setName("");
        setUrl("");
      }
      if (permissionErrors.length > 0) fail(permissionErrors);
    });
  }

  function grant(environment: Environment): void {
    void request(environment).then((permissionErrors) => {
      if (permissionErrors.length > 0) fail(permissionErrors);
      setChecks((count) => count + 1);
    });
  }
```
Aynı dosyanın JSX'inde:
- "Erişim izni ver" butonuna `aria-label={`${t("optionsGrant")}: ${environment.name}`}` ekle.
- "Kaldır" butonuna `aria-label={`${t("optionsRemove")}: ${environment.name}`}` ekle.
- Ad alanına `name="name"`, adres alanına `name="kibanaUrl"` ekle.

- [ ] **Step 7: `ActionsSection.tsx`'i güncelle**

`entrypoints/options/ActionsSection.tsx` dosyasında `return (` ile başlayan JSX'i şununla değiştir:
```tsx
  // One draft at a time: opening another one would drop its unsaved changes.
  const editing = draft !== null;
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
            <button type="button" disabled={editing} aria-label={`${t("optionsEdit")}: ${action.label}`} onClick={() => setDraft(action)}>
              {t("optionsEdit")}
            </button>
            <button
              type="button"
              className="link"
              aria-label={`${t("optionsRemove")}: ${action.label}`}
              onClick={() => {
                if (draft?.id === action.id) setDraft(null);
                void submit(withoutAction(config, action.id));
              }}
            >
              {t("optionsRemove")}
            </button>
          </li>
        ))}
      </ul>
      <div className="row">
        <button type="button" disabled={editing} onClick={() => setDraft(newAction("link"))}>
          {t("optionsAddLink")}
        </button>
        <button type="button" disabled={editing} onClick={() => setDraft(newAction("discover"))}>
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
```

- [ ] **Step 8: Küçük düzeltmeler**

- `entrypoints/options/ActionEditor.tsx`: etiket alanına `name="label"`, URL şablonu alanına `name="urlTemplate"` ekle.
- `entrypoints/options/CopySection.tsx`: 12. satırdaki `// Follow the stored values, e.g. after an import.` yorumunu sil. Aynı şeyi `useEffect`'in üstündeki yorum zaten söylüyor.
- `entrypoints/options/options.css`: `button.link { … }` satırından sonra ekle:
```css
button:disabled { opacity: 0.5; cursor: default; }
```

- [ ] **Step 9: Testlerin geçtiğini gör**

Run: `npm test && npm run typecheck && npm run build && npm run check:manifest`
Expected: hepsi geçer.

Bileşen değişikliklerinin testleri:
- Task 7'deki `options.spec.ts` sınar: `name` öznitelikleri, bozuk değerin dışa aktarılması, taslak açıkken "ekle" butonunun kapanması.
- Yalnızca kod incelemesiyle doğrulanır, otomatik testi yoktur: izin hatasının kayıttan sonra görünür kalması ve içe aktarmadaki yarış. İzin isteğini otomasyonda reddettirmek ve dosya okumasını yavaşlatmak mümkün değil.

- [ ] **Step 10: Commit**

```bash
git add src/options/model.ts src/storage.ts entrypoints/options tests/unit/options/model.test.ts tests/unit/storage.test.ts
git commit -m "fix(options): drop leftover permissions after a corrupt load, export the corrupt value, keep permission errors, one draft at a time

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Kopyalama menüsü: klavye, odak ve dışarı tıklama

**Files:**
- Modify: `src/content/CopyMenu.tsx`

**Interfaces:**
- Consumes: `CopyItem`, `t("menuLabel")`
- Produces: Task 6'daki `copy.spec.ts` bu davranışı sınar.
  - Menü açılınca odak ilk öğeye gider.
  - `ArrowDown`/`ArrowUp` öğeler arasında döner (sondan başa, baştan sona). `Home`/`End` ilk ve son öğeye gider.
  - `Escape` menüyü kapatır ve odağı "⋯" butonuna geri verir. Bir öğe seçilince de odak oraya döner.
  - `Tab` menüyü kapatır.
  - Menünün dışına basılınca (`pointerdown`) menü kapanır.
  - Seçiciler değişmez: `.kt-menu > button` tetikleyici, `[role="menuitem"]` öğeler.

Bu bileşen `src/i18n.ts`'i import ettiği için birim testi yazılmaz (Global Constraints). Testi Task 6'dadır.

- [ ] **Step 1: `CopyMenu.tsx`'i yeniden yaz**

`src/content/CopyMenu.tsx` dosyasının tamamını şununla değiştir:
```tsx
// The "⋯" copy menu of the action bar (spec §7.4), with the keyboard behaviour of a menu button.
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { t } from "../i18n";

export interface CopyItem {
  label: string;
  /** The text to copy, or null when it cannot be produced (the bar says why). */
  text: () => string | null;
}

export function CopyMenu({ items, onCopy }: { items: CopyItem[]; onCopy: (text: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Opening moves focus to the first item. A press anywhere else closes the menu; the bar lives in a
  // shadow root, so the check uses composedPath (the event target outside is the host element).
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const closeOutside = (event: PointerEvent): void => {
      if (rootRef.current && !event.composedPath().includes(rootRef.current)) setOpen(false);
    };
    window.addEventListener("pointerdown", closeOutside, true);
    return () => window.removeEventListener("pointerdown", closeOutside, true);
  }, [open]);

  function close(): void {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onListKey(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const current = buttons.indexOf(event.target as HTMLButtonElement);
    const targets: Record<string, number> = { ArrowDown: current + 1, ArrowUp: current - 1, Home: 0, End: buttons.length - 1 };
    const next = targets[event.key];
    if (next === undefined) return;
    event.preventDefault();
    buttons[(next + buttons.length) % buttons.length]?.focus();
  }

  return (
    <div
      className="kt-menu"
      ref={rootRef}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) close();
      }}
    >
      <button
        ref={triggerRef}
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
        <div className="kt-menu-list" role="menu" ref={listRef} onKeyDown={onListKey}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                close();
                let text: string | null;
                try {
                  text = item.text();
                } catch (error) {
                  console.debug("[kibanatool] copy text failed:", error);
                  text = null;
                }
                onCopy(text);
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
Notlar:
- `onCopy` hâlâ tıklamanın içinde ve `await` olmadan çağrılır. `navigator.clipboard.writeText` yalnızca tıklama sırasında izinli (Global Constraints, Plan 2).
- `Escape` olayı ActionBar'ın kökünde zaten durduruluyor, bu yüzden 8.x/9.x yan paneli kapanmaz.

- [ ] **Step 2: Derle ve kontrol et**

Run: `npm test && npm run typecheck && npm run build && npm run check:manifest`
Expected: hepsi geçer.

- [ ] **Step 3: Commit**

```bash
git add src/content/CopyMenu.tsx
git commit -m "feat(bar): keyboard navigation, focus return and outside click for the copy menu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Docker: 7.17 stack'i, deterministik seed, space'ler ve okuma kullanıcısı

**Files:**
- Modify: `docker/compose.yml`, `docker/kibana.yml`, `docker/up.sh`, `docker/down.sh`, `README.md` (yalnızca "Kibana dev stacks" bölümü), `CLAUDE.md` (yalnızca "Dev Kibana stacks" paragrafı)
- Rewrite: `docker/seed.mjs`
- Delete: `docker/obs-view.sh`

**Interfaces:**
- Consumes: yok
- Produces (seed sözleşmesi, Task 5–8 buna dayanır):
  - Stack tablosu ve `docker/.env.<major>` anahtarları: Global Constraints.
  - `app_log`, 30 log. `i = 1…30` için:
    - `_id` `app-001`…`app-030`, `extra.uid` `uid-001`…`uid-030`
    - `datetime` = `2026-01-15T10:00:00.000Z` − (i−1)×7 dakika
    - `user_id` = `100000 + i % 5`
    - `level_name`: `i % 4` 0 → `ERROR`, 1 → `INFO`, 2 → `NOTICE`, 3 → `WARNING`
    - `channel` = `["request","app","security"][i % 3]`
    - `context.body`, `context.headers`, `context.query` JSON metinleri. `context.headers` = `{"user-agent":"dev/1.0","authorization":"Bearer synthetic-token-<i>"}`.
    - Örnek: `app-001` → `user_id` 100001, `INFO`, `channel` `app`, `datetime` `2026-01-15T10:00:00.000Z`.
    - Örnek: `datetime`'a göre yeniden eskiye ilk iki `ERROR` logu `app-004` (`user_id` 100004) ve `app-008` (`user_id` 100003).
  - `legacy_log`, 10 log: `_id` `legacy-001`…`legacy-010`. `datetime` metin olarak eşlenir, bu yüzden `*_log`'un zaman alanı yok.
  - `logs-kibanatool-default` (ECS data stream), 20 log, kimlikler otomatik. `i = 1…20` için:
    - `@timestamp` = `2026-01-15T10:00:00.000Z` − (i−1)×5 dakika
    - `user.id` = `String(200000 + i)`, `trace.id` = `trace-0001`…`trace-0020`
  - Data view'lar:

    | Space | Kimlik | Desen | Zaman alanı |
    |---|---|---|---|
    | varsayılan | `app-log` | `app_log` | `datetime` |
    | varsayılan | `all-logs` | `*_log` | yok |
    | varsayılan | `logs` | `logs-*` | `@timestamp` |
    | `test` | `test-app-log` | `app_log` | `datetime` |
    | `obs` (yalnızca 9.x, `solution: "oblt"`) | `obs-logs` | `logs-*` | `@timestamp` |

  - Kullanıcılar:
    - `kt_anon`: `superuser`. Tarayıcı bununla şifresiz girer.
    - `kt_reader`: rol `kt_reader`. `app_log`, `legacy_log` ve `logs-*` üzerinde `read` ve `view_index_metadata`, bütün space'lerde Kibana `read`.

- [ ] **Step 1: `compose.yml`'ı güncelle**

`docker/compose.yml` dosyasının tamamını şununla değiştir:
```yaml
# Development and e2e stack: Elasticsearch + Kibana with security ON (spec §13.2).
# Kibana's anonymous provider signs the browser in as kt_anon (created by up.sh), so no password is needed.
# Elasticsearch anonymous access stays off: it would add its roles to every user, read-only ones included.
name: ${STACK_NAME}

services:
  es:
    image: docker.elastic.co/elasticsearch/elasticsearch:${STACK_VERSION}
    environment:
      discovery.type: single-node
      xpack.security.enabled: "true"
      xpack.security.http.ssl.enabled: "false"
      xpack.security.transport.ssl.enabled: "false"
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
      ANON_PASSWORD: ${ANON_PASSWORD}
      ENC_KEY: ${ENC_KEY}
      # The image skips empty values, so stacks without BASE_PATH run at the root.
      SERVER_BASEPATH: ${BASE_PATH:-}
      SERVER_REWRITEBASEPATH: ${BASE_PATH:+true}
    volumes:
      - ./kibana.yml:/usr/share/kibana/config/kibana.yml:ro
    ports:
      - "127.0.0.1:${KIBANA_PORT}:5601"
    depends_on:
      es:
        condition: service_healthy
```

- [ ] **Step 2: `kibana.yml`'ı güncelle**

`docker/kibana.yml` dosyasının tamamını şununla değiştir:
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
    credentials:
      username: "kt_anon"
      password: "${ANON_PASSWORD}"
# Lets scripts and the read-only e2e test send a Basic auth header; the browser otherwise uses the anonymous session.
xpack.security.authc.http.schemes: ["apikey", "bearer", "basic"]
status.allowAnonymous: true
# 7.17 refuses optIn: false together with allowChangingOptInStatus: false, so only optIn is set.
telemetry.optIn: false
```

- [ ] **Step 3: `up.sh`'ı yeniden yaz**

`docker/up.sh` dosyasının tamamını şununla değiştir:
```bash
#!/usr/bin/env bash
# Usage: ./docker/up.sh 7|8|9 — starts the stack for that major, then seeds synthetic logs, data views, spaces
# and users (docker/seed.mjs). Safe to re-run. Secrets live in docker/.env.<major> (mode 600, gitignored) and
# are never printed; versions, ports and the base path always come from the table below.
set -euo pipefail
cd "$(dirname "$0")"
ENV_FILE=".env.${1:-}"
ELASTIC_PASSWORD="" KIBANA_SYSTEM_PASSWORD="" ANON_PASSWORD="" READER_PASSWORD="" ENC_KEY=""
if [ -f "$ENV_FILE" ]; then set -a; source "$ENV_FILE"; set +a; fi
case "${1:-}" in
  7) STACK_VERSION=7.17.29; ES_PORT=17200; KIBANA_PORT=17601; BASE_PATH=/kibana ;;
  8) STACK_VERSION=8.19.23; ES_PORT=18200; KIBANA_PORT=18601; BASE_PATH= ;;
  9) STACK_VERSION=9.5.5; ES_PORT=19200; KIBANA_PORT=19601; BASE_PATH= ;;
  *) echo "usage: $0 7|8|9" >&2; exit 1 ;;
esac
(umask 077; cat > "$ENV_FILE" <<EOF
STACK_NAME=kibanatool-dev-$1
STACK_VERSION=$STACK_VERSION
ES_PORT=$ES_PORT
KIBANA_PORT=$KIBANA_PORT
BASE_PATH=$BASE_PATH
ELASTIC_PASSWORD=${ELASTIC_PASSWORD:-$(openssl rand -hex 16)}
KIBANA_SYSTEM_PASSWORD=${KIBANA_SYSTEM_PASSWORD:-$(openssl rand -hex 16)}
ANON_PASSWORD=${ANON_PASSWORD:-$(openssl rand -hex 16)}
READER_PASSWORD=${READER_PASSWORD:-$(openssl rand -hex 16)}
ENC_KEY=${ENC_KEY:-$(openssl rand -hex 32)}
EOF
)
set -a; source "$ENV_FILE"; set +a

docker compose --env-file "$ENV_FILE" -f compose.yml up -d --wait es
es() { curl -fsS -u "elastic:$ELASTIC_PASSWORD" -H 'Content-Type: application/json' "$@" >/dev/null; }
es -X POST "http://localhost:$ES_PORT/_security/user/kibana_system/_password" -d "{\"password\":\"$KIBANA_SYSTEM_PASSWORD\"}"
es -X POST "http://localhost:$ES_PORT/_security/user/kt_anon" -d "{\"password\":\"$ANON_PASSWORD\",\"roles\":[\"superuser\"]}"
docker compose --env-file "$ENV_FILE" -f compose.yml up -d kibana

KB_URL="http://localhost:$KIBANA_PORT$BASE_PATH"
level=""
for _ in $(seq 1 120); do
  level=$(curl -s "$KB_URL/api/status" | jq -r '.status.overall.level // .status.overall.state // empty' 2>/dev/null || true)
  if [ "$level" = "available" ] || [ "$level" = "green" ]; then break; fi
  sleep 5
done
if [ "$level" != "available" ] && [ "$level" != "green" ]; then
  echo "kibana $STACK_VERSION did not become ready at $KB_URL (status: ${level:-none})" >&2
  exit 1
fi
echo "kibana $STACK_VERSION ready -> $KB_URL"

ES_AUTH="elastic:$ELASTIC_PASSWORD" READER_PASSWORD="$READER_PASSWORD" node seed.mjs "http://localhost:$ES_PORT" "$KB_URL"
```
Notlar:
- Eski `.env.8`/`.env.9` dosyalarındaki sırlar korunur. Eksik `ANON_PASSWORD` ve `READER_PASSWORD` üretilir. Sürüm ve portlar her çalıştırmada tablodan yazılır. Plan 1'den devreden bulgu buydu.
- `down.sh` ve CI'daki `docker compose … logs` komutu `STACK_NAME` gibi değerleri bu dosyadan okur, bu yüzden dosyada kalırlar.

- [ ] **Step 4: `down.sh`'ın kullanım metnini güncelle**

`docker/down.sh` dosyasının ilk iki satırını şununla değiştir:
```bash
#!/usr/bin/env bash
# Usage: ./docker/down.sh 7|8|9 — stops the stack and deletes its data.
```

- [ ] **Step 5: `seed.mjs`'i yeniden yaz**

`docker/seed.mjs` dosyasının tamamını şununla değiştir:
```js
// Seeds deterministic synthetic logs, data views, spaces and a read-only user into a dev stack. No real data.
// Usage: ES_AUTH="elastic:<password>" READER_PASSWORD=<password> node seed.mjs <esUrl> <kibanaUrl>
// tests/e2e relies on the exact ids, values and times below: change both together.
const [esUrl, kbUrl] = process.argv.slice(2);
const auth = "Basic " + Buffer.from(process.env.ES_AUTH).toString("base64");

async function call(base, method, path, body, { headers = {}, allow = [] } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { authorization: auth, "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok && !allow.includes(response.status)) throw new Error(`${method} ${path} -> ${response.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const es = (method, path, body, options) => call(esUrl, method, path, body, options);
const kb = (method, path, body, options = {}) =>
  call(kbUrl, method, path, body, { ...options, headers: { "kbn-xsrf": "kibanatool", ...options.headers } });

const pad = (n, width = 3) => String(n).padStart(width, "0");
const minutesBefore = (minutes) => new Date(Date.UTC(2026, 0, 15, 10, 0) - minutes * 60_000).toISOString();
const URLS = ["/v1/coupons", "/v1/races/today", "/v1/wallet/deposit", "/v1/auth/login"];
const LEVELS = [[400, "ERROR"], [200, "INFO"], [250, "NOTICE"], [300, "WARNING"]]; // by i % 4

// Start from scratch, so a re-run gives the same documents.
await es("DELETE", "/app_log,legacy_log?ignore_unavailable=true");
await es("DELETE", "/_data_stream/logs-kibanatool-default", undefined, { allow: [404] });
// legacy_log: datetime mapped as text, so the "*_log" data view has no usable time field.
await es("PUT", "/legacy_log", { mappings: { properties: { datetime: { type: "text" } } } });

const lines = [];
const add = (action, doc) => lines.push(JSON.stringify(action), JSON.stringify(doc));
// app_log: Monolog-shaped, like the team's 7.17 logs (JSON strings inside context).
for (let i = 1; i <= 30; i++) {
  const [level, level_name] = LEVELS[i % 4];
  const url = URLS[i % 4];
  add(
    { index: { _index: "app_log", _id: `app-${pad(i)}` } },
    {
      message: level >= 400 ? `Request failed for ${url}` : `Handled ${url}`,
      level,
      level_name,
      channel: ["request", "app", "security"][i % 3],
      datetime: minutesBefore((i - 1) * 7),
      app_name: i % 2 ? "api" : "admin",
      user_id: 100000 + (i % 5),
      context: {
        method: i % 2 ? "GET" : "POST",
        ip: `10.0.0.${i}`,
        url,
        body: JSON.stringify({ amount: i * 10, currency: "TRY", items: [{ id: i, qty: 1 }] }),
        headers: JSON.stringify({ "user-agent": "dev/1.0", authorization: `Bearer synthetic-token-${i}` }),
        query: JSON.stringify({ page: i % 5 }),
      },
      extra: { uid: `uid-${pad(i)}` },
    },
  );
}
for (let i = 1; i <= 10; i++) {
  add({ index: { _index: "legacy_log", _id: `legacy-${pad(i)}` } }, { message: `legacy event ${i}`, datetime: minutesBefore(i), user_id: 500000 + i });
}
// logs-kibanatool-default: ECS data stream (the logs profile of the Observability view); ids are generated.
for (let i = 1; i <= 20; i++) {
  add(
    { create: { _index: "logs-kibanatool-default" } },
    {
      "@timestamp": minutesBefore((i - 1) * 5),
      message: i % 4 === 0 ? `Payment failed for order ${1000 + i}` : `Order ${1000 + i} processed`,
      "log.level": i % 4 === 0 ? "error" : "info",
      "service.name": i % 2 ? "api" : "admin",
      "host.name": "dev-host",
      "user.id": String(200000 + i),
      "trace.id": `trace-${pad(i, 4)}`,
    },
  );
}
const bulk = await es("POST", "/_bulk?refresh=true", lines.join("\n") + "\n", { headers: { "content-type": "application/x-ndjson" } });
if (bulk.errors) {
  const failed = bulk.items.map((item) => Object.values(item)[0]).find((result) => result.error);
  throw new Error(`bulk indexing failed: ${JSON.stringify(failed).slice(0, 500)}`);
}
console.log("documents:", bulk.items.length);

const status = await kb("GET", "/api/status");
const major = Number(status.version.number.split(".")[0]);

// 7.17 has no data views API; its index pattern API takes the same fields except `name`.
async function dataView(space, id, title, timeFieldName) {
  const base = space ? `/s/${space}` : "";
  const [api, key] = major >= 8 ? ["/api/data_views/data_view", "data_view"] : ["/api/index_patterns/index_pattern", "index_pattern"];
  await kb("DELETE", `${base}${api}/${id}`, undefined, { allow: [404] });
  await kb("POST", `${base}${api}`, { [key]: { id, title, timeFieldName, ...(major >= 8 ? { name: title } : {}) } });
}
async function space(id, extra = {}) {
  await kb("DELETE", `/api/spaces/space/${id}`, undefined, { allow: [404] });
  await kb("POST", "/api/spaces/space", { id, name: id, ...extra });
}

// Data view ids are unique across spaces on 8.x/9.x, so the space copies get their own ids.
await dataView("", "app-log", "app_log", "datetime");
await dataView("", "all-logs", "*_log");
await dataView("", "logs", "logs-*", "@timestamp");
await space("test");
await dataView("test", "test-app-log", "app_log", "datetime");
if (major >= 9) {
  // Solution view: ECS logs open the flyout on "Log overview" (spec §3).
  await space("obs", { solution: "oblt" });
  await dataView("obs", "obs-logs", "logs-*", "@timestamp");
}

// Read-only user. Base privileges, because feature ids differ between majors.
await kb("PUT", "/api/security/role/kt_reader", {
  elasticsearch: { indices: [{ names: ["app_log", "legacy_log", "logs-*"], privileges: ["read", "view_index_metadata"] }] },
  kibana: [{ base: ["read"], spaces: ["*"] }],
});
await es("POST", "/_security/user/kt_reader", { password: process.env.READER_PASSWORD, roles: ["kt_reader"] });
console.log(`seeded Kibana ${status.version.number}`);
```

- [ ] **Step 6: `obs-view.sh`'ı sil**

```bash
git rm docker/obs-view.sh
```

- [ ] **Step 7: Belgelerdeki stack bölümlerini güncelle**

`README.md` dosyasında `### Kibana dev stacks` başlığından `## License` başlığına kadar olan bölümü şununla değiştir:
````markdown
### Kibana dev stacks

```bash
./docker/up.sh 7     # Kibana 7.17.29 on http://localhost:17601/kibana (served under a base path)
./docker/up.sh 8     # Kibana 8.19.23 on http://localhost:18601
./docker/up.sh 9     # Kibana 9.5.5  on http://localhost:19601
./docker/down.sh 8   # stop and delete data
```

Security is on; the browser signs in anonymously, no password needed. `up.sh` is safe to re-run: it
re-creates the same synthetic logs every time. Data views: `app_log` (Monolog-shaped, time field
`datetime`), `*_log` (no time field) and `logs-*` (ECS, `@timestamp`). Every stack also has a `test`
space; 9.x has an `obs` space in the Observability view, where ECS logs open on "Log overview"
(`/s/obs/app/discover`).

````
`CLAUDE.md` dosyasında "Dev Kibana stacks:" ile başlayan paragrafı şununla değiştir:
```markdown
Dev Kibana stacks: `./docker/up.sh 7|8|9` starts Kibana 7.17.29 on :17601 under the `/kibana` base path, 8.19.23 on :18601 or 9.5.5 on :19601, with security on and anonymous browser login (as `kt_anon`; Elasticsearch anonymous access is off). It re-seeds the same synthetic logs, data views, a `test` space, an `obs` Observability space (9.x) and the read-only user `kt_reader` on every run. `./docker/down.sh 7|8|9` stops a stack and deletes its data. Secrets are in `docker/.env.<major>`; never print them.
```

- [ ] **Step 8: Stack'leri yeniden kur**

Elasticsearch ayarları değiştiği için çalışan stack'ler silinip yeniden kurulur. Veri sentetiktir. Ekibin 7.17 ortamına (`:9601`, `:9200`) dokunulmaz.
```bash
./docker/down.sh 8; ./docker/down.sh 9
./docker/up.sh 7 && ./docker/up.sh 8 && ./docker/up.sh 9
```
Expected: her biri `kibana <sürüm> ready -> <adres>`, `documents: 60` ve `seeded Kibana <sürüm>` yazar. Bellek yetmezse stack'leri tek tek kur ve aradaki kontrolleri o stack'te yap (Global Constraints).

- [ ] **Step 9: Seed'i doğrula (sırları yazdırmadan)**

Her çalışan stack için (örnek 7; 8 ve 9 için portları ve alt yolu tablodan al):
```bash
set -a; source docker/.env.7; set +a
ES=http://localhost:17200; KB=http://localhost:17601/kibana
for index in app_log legacy_log logs-kibanatool-default; do
  printf '%s ' "$index"; curl -s -u "elastic:$ELASTIC_PASSWORD" "$ES/$index/_count" | jq .count
done
curl -s -u "kt_reader:$READER_PASSWORD" -H 'x-elastic-internal-origin: Kibana' "$KB/internal/security/me" | jq -c '{username, roles}'
curl -s -u "elastic:$ELASTIC_PASSWORD" "$KB/api/spaces/space" | jq -c '[.[].id]'
curl -s -u "elastic:$ELASTIC_PASSWORD" "$ES/app_log/_doc/app-001" | jq -c '._source | {user_id, level_name, channel, datetime}'
```
Expected:
- `app_log 30`, `legacy_log 10`, `logs-kibanatool-default 20`
- `{"username":"kt_reader","roles":["kt_reader"]}`. Rollerde `superuser` olmamalı.
- 7 ve 8'de `["default","test"]`, 9'da `["default","test","obs"]` (sıra farklı olabilir)
- `{"user_id":100001,"level_name":"INFO","channel":"app","datetime":"2026-01-15T10:00:00.000Z"}`

Discover'ın tarayıcıda şifresiz, `kt_anon` olarak açıldığını Task 5'teki testler sınar. İstenirse tarayıcıda `<Kibana>/internal/security/me` açılarak da görülebilir.

- [ ] **Step 10: Tekrar çalıştırmayı ve hata durumunu dene**

```bash
./docker/up.sh 7      # ikinci kez
```
Expected: aynı sayılar (Step 9'u tekrarla). Loglar çoğalmaz.

```bash
set -a; source docker/.env.7; set +a
ES_AUTH="elastic:wrong" READER_PASSWORD=x node docker/seed.mjs http://localhost:17200 http://localhost:17601/kibana; echo "exit=$?"
```
Expected: `401` içeren bir hata ve `exit=1`.

- [ ] **Step 11: Kontrolleri çalıştır ve commit et**

Run: `bash -n docker/up.sh docker/down.sh && npm test && npm run typecheck && npm run build && npm run check:manifest`
Expected: hepsi geçer.

```bash
git add docker README.md CLAUDE.md
git commit -m "feat(docker): 7.17 stack under a base path, deterministic re-runnable seed, spaces and a read-only user

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Uçtan uca altyapı ve çubuk senaryoları

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/stack.ts`, `tests/e2e/global-setup.ts`, `tests/e2e/fixtures.ts`, `tests/e2e/kibana.ts`, `tests/e2e/bar.spec.ts`
- Modify: `package.json`, `package-lock.json`, `.gitignore`

**Interfaces:**
- Consumes:
  - Task 4'teki stack tablosu, `.env` anahtarları ve seed sözleşmesi
  - Saf modüller: `discoverUrl` (`src/kibana/url.ts`), `readAppState`, `readGlobalTime`, `dataViewIdFromState` (`src/kibana/discover-state.ts`), `Config`, `DEFAULT_MASK_PATTERNS` (`src/core/config.ts`), `CONFIG_KEY` (`src/storage.ts`), `TimeRange` (`src/core/types.ts`)
- Produces (Task 6, 7, 8 kullanır):
  - `tests/e2e/stack.ts`:
    - `stack: { major: 7 | 8 | 9; version: string; es: string; kibana: string; origin: string; elasticAuth: string; readerAuth: string }`
    - `EXTENSION_DIR = ".output/e2e-extension"`
  - `tests/e2e/fixtures.ts`:
    - `test`, `expect` ve fixture'lar: `context`, `page`, `extension: { worker: Worker; id: string }`, `configure(config?: Config): Promise<void>`, `recordTrace` seçeneği
    - `e2eConfig(): Config` (aksiyon etiketleri `User`, `Error`, `Same user ±5`, `±5 minutes`)
    - `registeredMatches(worker): Promise<string[]>`, `readStored(worker): Promise<unknown>`, `writeStored(worker, value): Promise<void>`
  - `tests/e2e/kibana.ts`:
    - `SEED_TIME`, `type DiscoverTarget`, `prefixOf(space?)`, `detailViews(page)`, `bar(detail)`
    - `openDoc(context, target): Promise<{ page; detail }>`, `barLinks(detail)`
    - `copyFromMenu(page, detail, item: 0 | 1 | 2)`, `followToNewTab(page, link)`
  - `npm run e2e` (önce derler)

Bu testler zaten var olan davranışı tarif ediyor. Kırmızı aşama yok. Doğrulama, üç stack'te geçmeleridir.

- [ ] **Step 1: Playwright'ı ekle**

```bash
npm install --save-dev "@playwright/test@^1.64.0"
npx playwright install chromium
```
`package.json` dosyasındaki `scripts` içine `"test:watch"` satırından sonra ekle:
```json
    "e2e": "npm run build && playwright test",
```
`.gitignore` dosyasının sonuna ekle:
```
playwright-report/
test-results/
```

- [ ] **Step 2: `playwright.config.ts`'i yaz**

```ts
import { defineConfig } from "@playwright/test";

// One Kibana stack per run: KT_STACK=7|8|9 after ./docker/up.sh <major> (tests/e2e/stack.ts).
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 180_000,
  expect: { timeout: 30_000 },
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
});
```

- [ ] **Step 3: `tests/e2e/stack.ts`'i yaz**

```ts
// The Kibana stack an e2e run targets: KT_STACK=7|8|9, started with ./docker/up.sh <major>.
import { readFileSync } from "node:fs";

const STACKS = {
  "7": { major: 7, version: "7.17.29", es: "http://localhost:17200", kibana: "http://localhost:17601/kibana" },
  "8": { major: 8, version: "8.19.23", es: "http://localhost:18200", kibana: "http://localhost:18601" },
  "9": { major: 9, version: "9.5.5", es: "http://localhost:19200", kibana: "http://localhost:19601" },
} as const;

/** The extension copy that global-setup.ts prepares. */
export const EXTENSION_DIR = ".output/e2e-extension";

function readSecrets(major: string): Record<string, string> {
  const text = readFileSync(`docker/.env.${major}`, "utf8");
  return Object.fromEntries(
    text.split("\n").flatMap((line) => {
      const at = line.indexOf("=");
      return at > 0 ? [[line.slice(0, at), line.slice(at + 1)]] : [];
    }),
  );
}

function basicAuth(user: string, password: string | undefined): string {
  if (!password) throw new Error(`No password for ${user} in docker/.env.*; run ./docker/up.sh first`);
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function currentStack() {
  const key = process.env.KT_STACK;
  if (key !== "7" && key !== "8" && key !== "9") throw new Error(`Set KT_STACK to 7, 8 or 9 (got "${key ?? ""}")`);
  const target = STACKS[key];
  const secrets = readSecrets(key);
  return {
    ...target,
    origin: new URL(target.kibana).origin,
    // Authorization header values; never log them.
    elasticAuth: basicAuth("elastic", secrets.ELASTIC_PASSWORD),
    readerAuth: basicAuth("kt_reader", secrets.READER_PASSWORD),
  };
}

export const stack = currentStack();
```

- [ ] **Step 4: `tests/e2e/global-setup.ts`'i yaz**

```ts
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
```

- [ ] **Step 5: `tests/e2e/fixtures.ts`'i yaz**

```ts
// Playwright fixtures: every test gets a fresh Chromium profile with the extension (spec §13.2).
import { resolve } from "node:path";
import { type BrowserContext, type Page, type Worker, chromium, expect, test as base } from "@playwright/test";
import { type Config, DEFAULT_MASK_PATTERNS } from "../../src/core/config";
import { CONFIG_KEY } from "../../src/storage";
import { EXTENSION_DIR, stack } from "./stack";

// The extension APIs used inside worker.evaluate (the background service worker), typed as far as needed.
declare const chrome: {
  storage: { local: { get(key: string): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void> } };
  scripting: { getRegisteredContentScripts(): Promise<Array<{ matches?: string[] }>> };
};

/** The actions every spec uses; the expected values come from the seeded logs (docker/seed.mjs). */
export function e2eConfig(): Config {
  const shared = { enabled: true, environmentIds: [], conditions: [] };
  return {
    schemaVersion: 1,
    environments: [{ id: "stack", name: `Kibana ${stack.version}`, kibanaUrl: stack.kibana }],
    actions: [
      { ...shared, id: "user", kind: "link", label: "User", urlTemplate: "https://admin.example.com/users/{user_id|user.id}" },
      {
        ...shared,
        id: "error",
        kind: "link",
        label: "Error",
        urlTemplate: "https://errors.example.com/?id={_id}",
        conditions: [{ field: "level_name", op: "equals", value: "ERROR" }],
      },
      { ...shared, id: "same-user", kind: "discover", label: "Same user ±5", queryTemplate: "user_id:{user_id}", windowMinutes: 5 },
      { ...shared, id: "window", kind: "discover", label: "±5 minutes", queryTemplate: "", windowMinutes: 5 },
    ],
    copy: { markdownFields: [], maskPatterns: [...DEFAULT_MASK_PATTERNS] },
  };
}

export function readStored(worker: Worker): Promise<unknown> {
  return worker.evaluate(async (key) => (await chrome.storage.local.get(key))[key], CONFIG_KEY);
}

export function writeStored(worker: Worker, value: unknown): Promise<void> {
  return worker.evaluate(([key, item]) => chrome.storage.local.set({ [key]: item }), [CONFIG_KEY, value] as const);
}

/** Origins the background registered the content script for. */
export function registeredMatches(worker: Worker): Promise<string[]> {
  return worker.evaluate(async () => (await chrome.scripting.getRegisteredContentScripts()).flatMap((script) => script.matches ?? []));
}

interface Fixtures {
  /** A trace is kept for failed tests. Off where it would hold credentials (readonly.spec.ts). */
  recordTrace: boolean;
  context: BrowserContext;
  page: Page;
  extension: { worker: Worker; id: string };
  /** Stores the settings, then waits until the content script is registered for the stack. */
  configure: (config?: Config) => Promise<void>;
}

export const test = base.extend<Fixtures>({
  recordTrace: [true, { option: true }],
  context: async ({ recordTrace }, use, testInfo) => {
    const extension = resolve(EXTENSION_DIR);
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      viewport: { width: 1600, height: 1000 },
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: stack.origin });
    // Pages and the background service worker; the content script itself only logs with console.debug.
    const errors: string[] = [];
    context.on("console", (message) => {
      if (message.type() === "error" && message.text().includes("[kibanatool]")) errors.push(message.text());
    });
    if (recordTrace) await context.tracing.start({ screenshots: true, snapshots: true });
    await use(context);
    if (recordTrace) {
      const failed = testInfo.status !== testInfo.expectedStatus;
      await context.tracing.stop(failed ? { path: testInfo.outputPath("trace.zip") } : {});
    }
    await context.close();
    expect(errors, "[kibanatool] errors in the console").toEqual([]);
  },
  page: async ({ context }, use) => {
    await use(context.pages()[0] ?? (await context.newPage()));
  },
  extension: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    await use({ worker, id: new URL(worker.url()).host });
  },
  configure: async ({ extension }, use) => {
    await use(async (config = e2eConfig()) => {
      await writeStored(extension.worker, config);
      await expect.poll(() => registeredMatches(extension.worker)).toContain(`${stack.origin}/*`);
    });
  },
});

export { expect };
```

- [ ] **Step 6: `tests/e2e/kibana.ts`'i yaz**

```ts
// Discover helpers for the e2e specs. Selectors are Kibana's data-test-subj values, checked on 7.17.29, 8.19.23 and 9.5.5.
import { type BrowserContext, type Locator, type Page, expect } from "@playwright/test";
import type { TimeRange } from "../../src/core/types";
import { discoverUrl } from "../../src/kibana/url";
import { stack } from "./stack";

/** Every seeded log is inside this range (docker/seed.mjs). */
export const SEED_TIME: TimeRange = { from: "2026-01-01T00:00:00.000Z", to: "2026-02-01T00:00:00.000Z" };

export interface DiscoverTarget {
  space?: string;
  dataViewId: string;
  query: string;
  time?: TimeRange;
}

/** `<base path>[/s/<space>]`, the prefix the extension derives from the page (spec §6.1). */
export function prefixOf(space?: string): string {
  return new URL(stack.kibana).pathname.replace(/\/$/, "") + (space ? `/s/${space}` : "");
}

/** Open detail views: expanded rows on 7.17, the document flyout on 8.x/9.x. */
export function detailViews(page: Page): Locator {
  return page.locator(
    stack.major === 7 ? '[data-test-subj="docTableDetailsRow"]:has([data-test-subj="kbnDocViewer"])' : '[data-test-subj="docViewerFlyout"]',
  );
}

/** The action bar of a detail view; Playwright's CSS selectors pierce its open shadow root. */
export function bar(detail: Locator): Locator {
  return detail.locator("kibanatool-bar");
}

/**
 * Opens Discover on `target` in a new tab, opens the first row, and waits for its bar to finish loading.
 * A new tab every time: on 9.x a hash change in the same tab does not switch the data view (spec §3).
 */
export async function openDoc(context: BrowserContext, target: DiscoverTarget): Promise<{ page: Page; detail: Locator }> {
  const page = await context.newPage();
  const { space, dataViewId, query, time = SEED_TIME } = target;
  await page.goto(stack.origin + discoverUrl({ prefix: prefixOf(space), dataViewId, query, time }));
  const toggle = page.locator('[data-test-subj="docTableExpandToggleColumn"]').first();
  await toggle.waitFor({ timeout: 90_000 });
  await toggle.click();
  const detail = detailViews(page).first();
  await bar(detail).locator(".kt-menu").waitFor(); // the menu renders once the log is loaded
  return { page, detail };
}

/** Label → href of the bar's link and Discover buttons. */
export async function barLinks(detail: Locator): Promise<Record<string, string>> {
  const entries = await bar(detail)
    .locator("a.kt-btn")
    .evaluateAll((links) => links.map((link): [string, string] => [link.textContent ?? "", link.getAttribute("href") ?? ""]));
  return Object.fromEntries(entries);
}

/** Runs a copy menu item (0 Markdown, 1 log link, 2 view with fixed time) and returns what it copied. */
export async function copyFromMenu(page: Page, detail: Locator, item: 0 | 1 | 2): Promise<string> {
  await bar(detail).locator(".kt-menu > button").click();
  await bar(detail).getByRole("menuitem").nth(item).click();
  await expect(bar(detail).getByRole("status")).toBeVisible();
  return page.evaluate(() => navigator.clipboard.readText());
}

/** Clicks a bar link that opens a new tab and waits until Discover there shows its hit count. */
export async function followToNewTab(page: Page, link: Locator): Promise<Page> {
  const [tab] = await Promise.all([page.context().waitForEvent("page"), link.click()]);
  await tab.locator('[data-test-subj="discoverQueryHits"]').waitFor({ timeout: 90_000 });
  return tab;
}
```

- [ ] **Step 7: `tests/e2e/bar.spec.ts`'i yaz (spec §13.2 senaryo 1–4)**

```ts
import { dataViewIdFromState, readAppState, readGlobalTime } from "../../src/kibana/discover-state";
import { expect, test } from "./fixtures";
import { SEED_TIME, bar, barLinks, followToNewTab, openDoc } from "./kibana";

test.beforeEach(async ({ configure }) => {
  await configure();
});

test("shows link actions built from the raw log, with their conditions", async ({ context }) => {
  const info = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-001"' });
  const infoLinks = await barLinks(info.detail);
  expect(infoLinks.User).toBe("https://admin.example.com/users/100001");
  expect(infoLinks).not.toHaveProperty("Error");

  const error = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-004"' });
  expect(await barLinks(error.detail)).toMatchObject({
    User: "https://admin.example.com/users/100004",
    Error: "https://errors.example.com/?id=app-004",
  });
});

test("opens a Discover action in a new tab with its data view, query and ±5 minutes", async ({ context }) => {
  const { page, detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-001"' });
  const tab = await followToNewTab(page, bar(detail).getByRole("link", { name: "Same user ±5" }));
  // app-001 is the only log of user 100001 between 09:55 and 10:05.
  await expect(tab.locator('[data-test-subj="discoverQueryHits"]')).toHaveText("1");
  const hash = new URL(tab.url()).hash;
  expect(dataViewIdFromState(readAppState(hash))).toBe("app-log");
  expect(readAppState(hash).query).toEqual({ language: "kuery", query: 'user_id:"100001"' });
  expect(readGlobalTime(hash)).toEqual({ from: "2026-01-15T09:55:00.000Z", to: "2026-01-15T10:05:00.000Z" });
});

test("keeps the current time range when the data view has no time field", async ({ context }) => {
  const { detail } = await openDoc(context, { dataViewId: "all-logs", query: 'extra.uid:"uid-001"' });
  const href = (await barLinks(detail))["Same user ±5"] ?? "";
  const hash = href.slice(href.indexOf("#"));
  expect(dataViewIdFromState(readAppState(hash))).toBe("all-logs");
  expect(readAppState(hash).query).toEqual({ language: "kuery", query: 'user_id:"100001"' });
  expect(readGlobalTime(hash)).toEqual(SEED_TIME);
  const windowOnly = bar(detail).locator(".kt-disabled", { hasText: "±5 minutes" });
  await expect(windowOnly).toHaveAttribute("aria-disabled", "true");
  await expect(windowOnly).toHaveAttribute("title", /\S/);
});
```

- [ ] **Step 8: Tip kontrolü**

Run: `npm run typecheck`
Expected: PASS. `tests/e2e/` ve `playwright.config.ts` de denetlenir.

- [ ] **Step 9: Üç stack'te çalıştır**

Run (stack'ler Task 4'teki gibi çalışırken):
```bash
KT_STACK=7 npm run e2e
KT_STACK=8 npm run e2e
KT_STACK=9 npm run e2e
```
Expected: her çalıştırmada `3 passed`.

Bir test kırılırsa:
- `npx playwright show-trace test-results/<test>/trace.zip` ile adımlara bak.
- Seçici bir sürümde farklıysa yardımcıyı (`kibana.ts`) sürüme göre düzelt ve hangi sürümde ne görüldüğünü yoruma yaz.
- Beklenen değeri seed'e bakmadan değiştirme. Seed sözleşmesi Task 4'te.

- [ ] **Step 10: Commit**

```bash
npm test && npm run build && npm run check:manifest
git add package.json package-lock.json .gitignore playwright.config.ts tests/e2e
git commit -m "test(e2e): Playwright harness against the docker stacks, action bar scenarios

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Uçtan uca: gezinme, kopyalama ve JSON görünümü

**Files:**
- Create: `tests/e2e/navigation.spec.ts`, `tests/e2e/copy.spec.ts`, `tests/e2e/json.spec.ts`

**Interfaces:**
- Consumes:
  - Task 5'teki `test`, `expect`, `configure`, `openDoc`, `bar`, `barLinks`, `detailViews`, `copyFromMenu`, `prefixOf`, `stack`
  - Task 3'teki kopyalama menüsü davranışı
  - Saf modüller: `resolveDatemath` (`src/core/datemath.ts`), `readAppState`, `readGlobalTime`
- Produces: spec §13.2 senaryo 5, 6 ve 7. Plan 2'den devreden menü bulgusunun testi.

- [ ] **Step 1: `tests/e2e/navigation.spec.ts`'i yaz (senaryo 7)**

```ts
import { expect, test } from "./fixtures";
import { bar, barLinks, detailViews, openDoc } from "./kibana";
import { stack } from "./stack";

test.beforeEach(async ({ configure }) => {
  await configure();
});

// Newest first: app-004 (user 100004), then app-008 (user 100003).
const ERRORS = { dataViewId: "app-log", query: 'level_name:"ERROR"' };

test("7.17: every expanded row has its own bar", async ({ context }) => {
  test.skip(stack.major !== 7, "the legacy table exists only on 7.17");
  const { page } = await openDoc(context, ERRORS);
  await page.locator('[data-test-subj="docTableExpandToggleColumn"]').nth(1).click();
  const rows = detailViews(page);
  await expect(rows).toHaveCount(2);
  await bar(rows.nth(1)).locator(".kt-menu").waitFor();
  expect((await barLinks(rows.nth(0))).Error).toBe("https://errors.example.com/?id=app-004");
  expect((await barLinks(rows.nth(1))).Error).toBe("https://errors.example.com/?id=app-008");
});

test("8.x/9.x: the bar follows the next log in the flyout", async ({ context }) => {
  test.skip(stack.major === 7, "7.17 has no flyout");
  const { detail } = await openDoc(context, ERRORS);
  expect((await barLinks(detail)).Error).toBe("https://errors.example.com/?id=app-004");
  await detail.locator('[data-test-subj="pagination-button-next"]').click();
  await expect.poll(async () => (await barLinks(detail)).Error).toBe("https://errors.example.com/?id=app-008");
  expect((await barLinks(detail)).User).toBe("https://admin.example.com/users/100003");
  await expect(bar(detail)).toHaveCount(1);
});
```

- [ ] **Step 2: `tests/e2e/copy.spec.ts`'i yaz (senaryo 5 ve kopyalama menüsü)**

```ts
import { resolveDatemath } from "../../src/core/datemath";
import { readAppState, readGlobalTime } from "../../src/kibana/discover-state";
import { expect, test } from "./fixtures";
import { bar, copyFromMenu, openDoc, prefixOf } from "./kibana";
import { stack } from "./stack";

test.beforeEach(async ({ configure }) => {
  await configure();
});

const APP_001 = { dataViewId: "app-log", query: 'extra.uid:"uid-001"' };
const DOC_LINK = `${stack.origin}${prefixOf()}/app/discover#/doc/app-log/app_log?id=app-001`;

test("copies the log as masked Markdown", async ({ context }) => {
  const { page, detail } = await openDoc(context, APP_001);
  const markdown = await copyFromMenu(page, detail, 0);
  const lines = markdown.split("\n");
  expect(lines[0]).toBe("**app_log** · 2026-01-15T10:00:00.000Z");
  expect(lines).toContain("- `user_id`: 100001");
  expect(markdown).toContain('"authorization": "***"');
  expect(markdown).not.toContain("synthetic-token");
  expect(lines.at(-1)?.endsWith(`](${DOC_LINK})`)).toBe(true); // the link text is localized
});

test("copies the log link, and the link opens the same log", async ({ context }) => {
  const { page, detail } = await openDoc(context, APP_001);
  expect(await copyFromMenu(page, detail, 1)).toBe(DOC_LINK);
  const doc = await context.newPage();
  await doc.goto(DOC_LINK);
  await expect(doc.getByText("app-001", { exact: true }).first()).toBeVisible({ timeout: 90_000 });
});

test("copies the view with its relative time range made absolute", async ({ context }) => {
  const { page, detail } = await openDoc(context, { ...APP_001, time: { from: "now-5y", to: "now" } });
  const before = Date.now();
  const url = await copyFromMenu(page, detail, 2);
  const hash = new URL(url).hash;
  const time = readGlobalTime(hash) ?? { from: "", to: "" };
  const to = Date.parse(time.to);
  expect(to).toBeGreaterThanOrEqual(before - 1000);
  expect(to).toBeLessThanOrEqual(Date.now() + 1000);
  expect(time.from).toBe(resolveDatemath("now-5y", new Date(to), false));
  expect(readAppState(hash).query).toEqual({ language: "kuery", query: APP_001.query });
});

test("the copy menu works with the keyboard and closes on a click outside", async ({ context }) => {
  const { page, detail } = await openDoc(context, APP_001);
  const trigger = bar(detail).locator(".kt-menu > button");
  const items = bar(detail).getByRole("menuitem");
  await trigger.click();
  await expect(items.first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press("End");
  await expect(items.nth(2)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(items.first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(items).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(detail).toBeVisible(); // Escape stayed in the bar: Kibana kept the row or flyout open
  await trigger.click();
  await expect(items).toHaveCount(3);
  await detail.locator('[data-test-subj="kbnDocViewer"]').click({ position: { x: 5, y: 5 } });
  await expect(items).toHaveCount(0);
});
```

- [ ] **Step 3: `tests/e2e/json.spec.ts`'i yaz (senaryo 6)**

```ts
import { expect, test } from "./fixtures";
import { bar, openDoc } from "./kibana";

test.beforeEach(async ({ configure }) => {
  await configure();
});

test("opens JSON text fields as a searchable tree", async ({ context }) => {
  const { detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-001"' });
  await bar(detail).locator(".kt-bar > button.kt-ghost").click(); // "JSON"; the menu button sits inside .kt-menu
  await bar(detail).locator(".kt-fields button", { hasText: "context.headers" }).click();
  await expect(bar(detail).locator(".kt-row .kt-key", { hasText: "user-agent" })).toBeVisible();
  await bar(detail).locator('.kt-json input[type="search"]').fill("dev/1.0");
  await expect(bar(detail).locator(".kt-row.kt-match")).toHaveCount(1);
});

test("shows no JSON button for a log without JSON text", async ({ context }) => {
  const { detail } = await openDoc(context, { dataViewId: "logs", query: 'trace.id:"trace-0001"' });
  await expect(bar(detail).locator(".kt-bar > button.kt-ghost")).toHaveCount(0);
});
```

- [ ] **Step 4: Üç stack'te çalıştır**

Run:
```bash
KT_STACK=7 npm run e2e
KT_STACK=8 npm run e2e
KT_STACK=9 npm run e2e
```
Expected: her stack'te `10 passed, 1 skipped`. 7'de flyout testi, 8 ve 9'da eski tablo testi atlanır.

- [ ] **Step 5: Commit**

```bash
npm test && npm run typecheck && npm run check:manifest
git add tests/e2e
git commit -m "test(e2e): flyout and row navigation, copy menu, JSON view

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Uçtan uca: space, Observability, okuma kullanıcısı ve ayarlar sayfası

**Files:**
- Create: `tests/e2e/spaces.spec.ts`, `tests/e2e/readonly.spec.ts`, `tests/e2e/options.spec.ts`, `examples/kibanatool-settings.json`, `tests/unit/examples.test.ts`

**Interfaces:**
- Consumes:
  - Task 5'teki fixture'lar ve yardımcılar
  - Task 2'deki seçiciler (`input[name="name"]`, `input[name="kibanaUrl"]`, `input[name="label"]`, `input[name="urlTemplate"]`) ve `exportValue`
  - Task 4'teki `test` ve `obs` space'leri, `kt_reader`
- Produces:
  - `examples/kibanatool-settings.json`: README'nin anlattığı, içe aktarılabilir örnek ayar dosyası (Task 11 buna bağlanır)
  - Spec §13.2'nin ek senaryoları. Alt yol senaryosu 7 numaralı stack'teki bütün testlerdir.

- [ ] **Step 1: Örnek ayar dosyasını ve testini yaz**

`examples/kibanatool-settings.json`:
```json
{
  "schemaVersion": 1,
  "environments": [{ "id": "prod", "name": "Production", "kibanaUrl": "https://kibana.example.com" }],
  "actions": [
    {
      "id": "admin-user",
      "kind": "link",
      "label": "User in admin",
      "enabled": true,
      "environmentIds": [],
      "conditions": [],
      "urlTemplate": "https://admin.example.com/users/{user_id|context.user_id|user.id}"
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
      "urlTemplate": "https://acme.atlassian.net/issues/?jql=text%20~%20{user_id|user.id}"
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
`tests/unit/examples.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import example from "../../examples/kibanatool-settings.json";
import { parseConfig } from "../../src/core/config";

describe("examples/kibanatool-settings.json", () => {
  it("is valid settings that import without repairs", () => {
    expect(parseConfig(example)).toEqual({ ok: true, config: example });
  });
});
```
Run: `npx vitest run tests/unit/examples.test.ts`
Expected: PASS.

- [ ] **Step 2: `tests/e2e/spaces.spec.ts`'i yaz**

```ts
import { expect, test } from "./fixtures";
import { barLinks, copyFromMenu, openDoc, prefixOf } from "./kibana";
import { stack } from "./stack";

test.beforeEach(async ({ configure }) => {
  await configure();
});

// On 7.17 this is /kibana/s/test: base path and space together (Review Focus 1).
test("works in a space, under the base path on 7.17", async ({ context }) => {
  const { page, detail } = await openDoc(context, { space: "test", dataViewId: "test-app-log", query: 'extra.uid:"uid-001"' });
  expect((await barLinks(detail)).User).toBe("https://admin.example.com/users/100001");
  expect(await copyFromMenu(page, detail, 1)).toBe(`${stack.origin}${prefixOf("test")}/app/discover#/doc/test-app-log/app_log?id=app-001`);
});

test("9.x Observability view: the bar works on the Log overview tab", async ({ context }) => {
  test.skip(stack.major !== 9, "the obs space is seeded only on 9.x");
  const { detail } = await openDoc(context, { space: "obs", dataViewId: "obs-logs", query: 'trace.id:"trace-0001"' });
  await expect(detail.locator('[role="tab"][aria-selected="true"]')).toHaveAttribute(
    "data-test-subj",
    "docViewerTab-doc_view_logs_overview",
  );
  await expect(detail.locator('[data-test-subj="tableDocViewRow-_id-value"]')).toHaveCount(0);
  expect((await barLinks(detail)).User).toBe("https://admin.example.com/users/200001");
});
```

- [ ] **Step 3: `tests/e2e/readonly.spec.ts`'i yaz**

```ts
import { expect, test } from "./fixtures";
import { barLinks, openDoc, prefixOf } from "./kibana";
import { stack } from "./stack";

// The trace would record the Authorization header.
test.use({ recordTrace: false });

test("a user with read-only privileges gets the bar", async ({ context, configure }) => {
  await configure();
  // Kibana's HTTP authentication takes this header instead of the anonymous session.
  await context.setExtraHTTPHeaders({ authorization: stack.readerAuth });
  const { page, detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-001"' });
  const me = await page.evaluate(async (prefix) => {
    const response = await fetch(`${prefix}/internal/security/me`, { headers: { "x-elastic-internal-origin": "Kibana" } });
    return response.json();
  }, prefixOf());
  expect(me).toMatchObject({ username: "kt_reader", roles: ["kt_reader"] }); // no anonymous superuser on top
  expect((await barLinks(detail)).User).toBe("https://admin.example.com/users/100001");
});
```

- [ ] **Step 4: `tests/e2e/options.spec.ts`'i yaz**

```ts
import { readFile } from "node:fs/promises";
import type { BrowserContext } from "@playwright/test";
import { e2eConfig, expect, readStored, registeredMatches, test, writeStored } from "./fixtures";
import { barLinks, openDoc } from "./kibana";
import { stack } from "./stack";

async function openOptions(context: BrowserContext, extensionId: string) {
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  return options;
}

test("adds an environment and a link action, and the bar shows it", async ({ context, extension }) => {
  const options = await openOptions(context, extension.id);
  const environments = options.locator('section[aria-labelledby="environments-title"]');
  await environments.locator('input[name="name"]').fill("e2e");
  await environments.locator('input[name="kibanaUrl"]').fill(stack.kibana);
  await environments.locator('button[type="submit"]').click();
  // The e2e copy of the extension already holds the permission, so no prompt opens.
  await expect(environments.locator(".list li .ok")).toHaveCount(1);

  const actions = options.locator('section[aria-labelledby="actions-title"]');
  await actions.locator(".row > button").first().click(); // "Add link action"
  await expect(actions.locator(".row > button").first()).toBeDisabled(); // one draft at a time
  await actions.locator('input[name="label"]').fill("From options");
  await actions.locator('input[name="urlTemplate"]').fill("https://admin.example.com/u/{user_id}");
  await actions.locator('.editor button[type="submit"]').click();
  await expect(actions.locator(".list li .name")).toHaveText(["From options"]);

  await expect.poll(() => registeredMatches(extension.worker)).toContain(`${stack.origin}/*`);
  const { detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-001"' });
  expect(await barLinks(detail)).toEqual({ "From options": "https://admin.example.com/u/100001" });
});

test("exports the settings and imports the example file", async ({ context, extension, configure }) => {
  await configure();
  const options = await openOptions(context, extension.id);
  const transfer = options.locator('section[aria-labelledby="transfer-title"]');
  const [download] = await Promise.all([options.waitForEvent("download"), transfer.locator(".row > button").click()]);
  expect(JSON.parse(await readFile(await download.path(), "utf8"))).toEqual(e2eConfig());

  const example: unknown = JSON.parse(await readFile("examples/kibanatool-settings.json", "utf8"));
  await transfer.locator('input[type="file"]').setInputFiles("examples/kibanatool-settings.json");
  await transfer.locator(".warning button").first().click(); // "Replace settings"
  // The save then tries to drop the stack's permission, which the e2e copy holds as required: only storage is checked.
  await expect.poll(() => readStored(extension.worker)).toEqual(example);
});

test("exports a corrupt stored value as it is, so it can be repaired", async ({ context, extension }) => {
  const corrupt = { schemaVersion: 99, environments: "broken" };
  await writeStored(extension.worker, corrupt);
  const options = await openOptions(context, extension.id);
  await expect(options.locator('.warning[role="alert"]')).toBeVisible();
  const transfer = options.locator('section[aria-labelledby="transfer-title"]');
  const [download] = await Promise.all([options.waitForEvent("download"), transfer.locator(".row > button").click()]);
  expect(JSON.parse(await readFile(await download.path(), "utf8"))).toEqual(corrupt);
});
```

- [ ] **Step 5: Üç stack'te çalıştır**

Run:
```bash
KT_STACK=7 npm run e2e
KT_STACK=8 npm run e2e
KT_STACK=9 npm run e2e
```
Expected:
- 7 ve 8: `15 passed, 2 skipped` (gezinmeden biri ve Observability)
- 9: `16 passed, 1 skipped` (eski tablo)

- [ ] **Step 6: Commit**

```bash
npm test && npm run typecheck && npm run check:manifest
git add tests/e2e tests/unit/examples.test.ts examples
git commit -m "test(e2e): spaces, base path, Observability view, read-only user and the options page; example settings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Sürüm başına HTML örnekleri ve adaptör testleri

**Files:**
- Create: `tests/e2e/capture.spec.ts`, `tests/fixtures/7.17.29-app-log.json`, `tests/fixtures/8.19.23-app-log.json`, `tests/fixtures/9.5.5-app-log.json`, `tests/fixtures/9.5.5-obs-log-overview.json`, `tests/unit/adapters/fixtures.test.ts`

**Interfaces:**
- Consumes: Task 5'teki fixture'lar, `openDoc`, `prefixOf`, `stack`. `findDetailViews(doc, location, prefix)` (`src/adapters/detect.ts`), `DocIdentity` (`src/core/types.ts`).
- Produces: `tests/fixtures/<sürüm>-<ad>.json`. Biçim:
  `{ "pathname": string, "hash": string, "prefix": string, "identity": DocIdentity, "html": string }`
  - `html`: detay görünümünün HTML'i, eklentinin kendi elemanı çıkarılmış. 7.17 satırı `<table><tbody>` içinde. SVG ikonları boşaltılmış.
  - `identity`: sayfadan değil seed'den ya da Elasticsearch'ten alınır.

- [ ] **Step 1: `tests/e2e/capture.spec.ts`'i yaz**

```ts
// Refreshes tests/fixtures/ from the running stack (spec §13.1). Run once per stack:
//   KT_STACK=7 KT_CAPTURE=1 npm run e2e -- capture
import { mkdirSync, writeFileSync } from "node:fs";
import type { DocIdentity } from "../../src/core/types";
import { test } from "./fixtures";
import { type DiscoverTarget, openDoc, prefixOf } from "./kibana";
import { stack } from "./stack";

test.skip(!process.env.KT_CAPTURE, "set KT_CAPTURE=1 to refresh tests/fixtures");

/** From Elasticsearch, not from the page: the fixture test checks the adapters against it. */
async function ecsIdentity(traceId: string, dataViewId: string): Promise<DocIdentity> {
  const response = await fetch(`${stack.es}/logs-kibanatool-default/_search`, {
    method: "POST",
    headers: { authorization: stack.elasticAuth, "content-type": "application/json" },
    body: JSON.stringify({ size: 1, query: { match: { "trace.id": traceId } } }),
  });
  const hit = (await response.json()).hits.hits[0];
  return { dataViewId, index: hit._index, id: hit._id };
}

const cases: Array<{ name: string; target: DiscoverTarget; identity: () => Promise<DocIdentity> }> = [
  {
    name: `${stack.version}-app-log`,
    target: { dataViewId: "app-log", query: 'extra.uid:"uid-001"' },
    identity: async () => ({ dataViewId: "app-log", index: "app_log", id: "app-001" }),
  },
];
if (stack.major === 9) {
  cases.push({
    name: `${stack.version}-obs-log-overview`,
    target: { space: "obs", dataViewId: "obs-logs", query: 'trace.id:"trace-0001"' },
    identity: () => ecsIdentity("trace-0001", "obs-logs"),
  });
}

for (const { name, target, identity } of cases) {
  test(`capture ${name}`, async ({ context, configure }) => {
    await configure();
    const { page, detail } = await openDoc(context, target);
    // Without the extension's own element. A legacy <tr> needs its table, or HTML parsing drops it.
    const html = await detail.evaluate((element) => {
      const copy = element.cloneNode(true) as Element;
      for (const host of copy.querySelectorAll("kibanatool-bar")) host.remove();
      return copy.tagName === "TR" ? `<table><tbody>${copy.outerHTML}</tbody></table>` : copy.outerHTML;
    });
    const url = new URL(page.url());
    const fixture = {
      pathname: url.pathname,
      hash: url.hash,
      prefix: prefixOf(target.space),
      identity: await identity(),
      html: html.replace(/<svg[\s\S]*?<\/svg>/g, "<svg></svg>"), // icons only; keeps the files small
    };
    mkdirSync("tests/fixtures", { recursive: true });
    writeFileSync(`tests/fixtures/${name}.json`, `${JSON.stringify(fixture, null, 2)}\n`);
  });
}
```

- [ ] **Step 2: Örnekleri yakala**

Run:
```bash
KT_STACK=7 KT_CAPTURE=1 npm run e2e -- capture
KT_STACK=8 KT_CAPTURE=1 npm run e2e -- capture
KT_STACK=9 KT_CAPTURE=1 npm run e2e -- capture
ls -la tests/fixtures
```
Expected: dört dosya (`7.17.29-app-log.json`, `8.19.23-app-log.json`, `9.5.5-app-log.json`, `9.5.5-obs-log-overview.json`).
- Her biri 1 MB'tan küçük olmalı. Büyükse büyüten içeriği (örn. gömülü `<style>`) yakalamada çıkar ve nedenini yoruma yaz.
- `grep -l "synthetic-token\|kt_reader" tests/fixtures/*.json` yalnızca sentetik değerleri göstermeli. Ortam sırları dosyalarda olmamalı: `grep -c "$(grep ELASTIC_PASSWORD docker/.env.9 | cut -d= -f2)" tests/fixtures/*.json` her dosya için `0` vermeli. Komut sırrı ekrana yazmaz.

- [ ] **Step 3: Adaptör testini yaz**

`tests/unit/adapters/fixtures.test.ts`:
```ts
// @vitest-environment happy-dom
// Detail views captured from the e2e stacks (tests/e2e/capture.spec.ts); synthetic data only.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findDetailViews } from "../../../src/adapters/detect";

interface Fixture {
  pathname: string;
  hash: string;
  prefix: string;
  identity: unknown;
  html: string;
}

const dir = "tests/fixtures";
const names = readdirSync(dir)
  .filter((name) => name.endsWith(".json"))
  .sort();

describe("captured Kibana detail views", () => {
  it("cover 7.17, 8.19, 9.5 and the 9.5 Observability view", () => {
    expect(names).toEqual(["7.17.29-app-log.json", "8.19.23-app-log.json", "9.5.5-app-log.json", "9.5.5-obs-log-overview.json"]);
  });

  it.each(names)("%s yields the captured identity", (name) => {
    const fixture = JSON.parse(readFileSync(`${dir}/${name}`, "utf8")) as Fixture;
    document.body.innerHTML = fixture.html;
    const views = findDetailViews(document, { pathname: fixture.pathname, hash: fixture.hash }, fixture.prefix);
    expect(views.map((view) => view.identity)).toEqual([fixture.identity]);
  });
});
```

- [ ] **Step 4: Testin hem geçtiğini hem anlamlı olduğunu gör**

Run: `npx vitest run tests/unit/adapters/fixtures.test.ts`
Expected: PASS (5 test).

Kontrol: `src/adapters/data-grid.ts` içinde `DISCOVER_SINGLE_DOC_LOCATOR` metnini geçici olarak `X_LOCATOR` yap ve testi tekrar çalıştır. Expected: `9.5.5-obs-log-overview.json` kırılır (bu görünümde yedek kaynak yok). Değişikliği geri al (`git checkout src/adapters/data-grid.ts`).

- [ ] **Step 5: Commit**

```bash
npm test && npm run typecheck && npm run build && npm run check:manifest
git add tests/e2e/capture.spec.ts tests/fixtures tests/unit/adapters/fixtures.test.ts
git commit -m "test(adapters): detail views captured from 7.17, 8.19 and 9.5 (incl. Log overview)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 9: GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check:manifest`, `./docker/up.sh <major>`, `npm run e2e`, `KT_STACK`
- Produces: `unit` işi ve `e2e (Kibana 7|8|9)` matrisi, her push'ta `main`'e ve her PR'da. Gerçek çalıştırma Task 12'de PR açılınca görülür.

- [ ] **Step 1: İş akışını yaz**

`.github/workflows/ci.yml`:
```yaml
# Unit checks, then the e2e matrix against Kibana 7.17, 8.19 and 9.5 (spec §13.3).
name: ci

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - run: npm run check:manifest

  e2e:
    name: e2e (Kibana ${{ matrix.major }})
    needs: unit
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        major: ["7", "8", "9"]
    env:
      KT_STACK: ${{ matrix.major }}
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: ./docker/up.sh ${{ matrix.major }}
      - run: npm run e2e
      - name: Kibana logs
        if: failure()
        run: docker compose --env-file docker/.env.${{ matrix.major }} -f docker/compose.yml logs --tail 300 kibana
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: e2e-kibana-${{ matrix.major }}
          path: |
            playwright-report/
            test-results/
          retention-days: 7
```
Notlar:
- `docker/up.sh` sırları iş içinde üretir. Kibana'yı beklerken zaman aşımına uğrarsa işi `exit 1` ile bitirir (Task 4).
- `discovery.type: single-node` olduğu için Elasticsearch'in `vm.max_map_count` kontrolü çalışmaz, runner'da ayar gerekmez.
- Okuma kullanıcısı testi trace kaydetmez (Task 7), bu yüzden yüklenen dosyalarda kimlik bilgisi bulunmaz.

- [ ] **Step 2: YAML'ı ve CI çalıştırmasını yerelde dene**

Run:
```bash
ruby -ryaml -e 'YAML.load_file(".github/workflows/ci.yml"); puts "yaml ok"'
CI=1 KT_STACK=9 npm run e2e
ls playwright-report/index.html
```
Expected:
- `yaml ok`. Makinede `ruby` yoksa bu satırı atla, GitHub Task 12'de doğrular.
- `CI=1` ile testler geçer, HTML raporu oluşur.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: unit checks and the e2e matrix against Kibana 7.17, 8.19 and 9.5

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Mağaza paketi: ikonlar, manifest kontrolü, sürüm ve zip

**Files:**
- Create: `assets/icon.svg`, `scripts/icons.mjs`, `public/icon/16.png`, `public/icon/32.png`, `public/icon/48.png`, `public/icon/128.png`
- Modify: `scripts/check-manifest.mjs`, `package.json`

**Interfaces:**
- Consumes: `@playwright/test`'in `chromium`'u (Task 5)
- Produces:
  - `npm run icons`
  - Manifestte `icons` (WXT `public/icon/<boyut>.png` dosyalarını kendisi ekler)
  - `package.json` sürümü `1.0.0` (sapmalar tablosu: kullanıcı onayı)
  - `npm run zip` → `.output/kibanatool-1.0.0-chrome.zip`

- [ ] **Step 1: Manifest kontrolünü sıkılaştır**

`scripts/check-manifest.mjs` dosyasında ilk yorum satırını şununla değiştir:
```js
// Fails when the built manifest asks for more than the spec allows (spec §9) or lacks what the store needs.
```
ve `content_scripts` kontrolünden sonra ekle:
```js
for (const key of ["optional_permissions", "web_accessible_resources", "externally_connectable"]) {
  if (manifest[key] !== undefined) errors.push(`${key} must not be set: ${JSON.stringify(manifest[key])}`);
}
for (const size of ["16", "32", "48", "128"]) {
  const icon = manifest.icons?.[size];
  if (!icon || !existsSync(`${dir}/${icon}`)) errors.push(`icons.${size} is missing (npm run icons)`);
}
```

- [ ] **Step 2: Kontrolün kırıldığını gör**

Run: `npm run build && npm run check:manifest`
Expected: FAIL. `icons.16 is missing (npm run icons)` ve diğer üç boyut.

- [ ] **Step 3: İkonu ve üreticisini yaz**

`assets/icon.svg` (log satırları ve "başka yere git" oku):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="#0077cc"/>
  <rect x="22" y="30" width="84" height="12" rx="6" fill="#ffffff"/>
  <rect x="22" y="58" width="60" height="12" rx="6" fill="#ffffff" fill-opacity="0.8"/>
  <rect x="22" y="86" width="36" height="12" rx="6" fill="#ffffff" fill-opacity="0.6"/>
  <path d="M72 102 L102 72 M84 72 H102 V90" fill="none" stroke="#ffd966" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```
`scripts/icons.mjs`:
```js
// Renders assets/icon.svg to public/icon/<size>.png, which WXT adds to the manifest. Run: npm run icons
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const svg = readFileSync("assets/icon.svg", "utf8");
mkdirSync("public/icon", { recursive: true });
const browser = await chromium.launch();
for (const size of [16, 32, 48, 128]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: `public/icon/${size}.png`, omitBackground: true });
  await page.close();
}
await browser.close();
```
`package.json` dosyasındaki `scripts` içine `"e2e"` satırından sonra ekle:
```json
    "icons": "node scripts/icons.mjs",
```

- [ ] **Step 4: İkonları üret ve gözle bak**

Run: `npm run icons && file public/icon/*.png`
Expected: dört dosya, `PNG image data, 16 x 16`, `32 x 32`, `48 x 48` ve `128 x 128`. `public/icon/128.png` ve `public/icon/16.png` dosyalarını açıp bak: mavi zemin, beyaz satırlar, sarı ok. 16 px'te satırlar seçilebiliyor olmalı.

- [ ] **Step 5: Kontrolün geçtiğini ve yasak alanları yakaladığını gör**

Run: `npm run build && npm run check:manifest`
Expected: `Manifest check passed`. `cat .output/chrome-mv3/manifest.json | jq .icons` dört boyutu gösterir.

Negatif kontrol:
```bash
node -e 'const f=".output/chrome-mv3/manifest.json",fs=require("fs"),m=JSON.parse(fs.readFileSync(f));m.web_accessible_resources=[];fs.writeFileSync(f,JSON.stringify(m))'
npm run check:manifest; echo "exit=$?"
npm run build
```
Expected: `web_accessible_resources must not be set: []` ve `exit=1`. Son `npm run build` derlemeyi düzeltir.

- [ ] **Step 6: Sürümü yükselt ve paketi çıkar**

`package.json` dosyasında `"version": "0.1.0"` değerini `"version": "1.0.0"` yap.

Run:
```bash
npm install --package-lock-only
npm run build && npm run check:manifest && npm run zip
unzip -l .output/kibanatool-1.0.0-chrome.zip
unzip -p .output/kibanatool-1.0.0-chrome.zip manifest.json | jq -c '{version, permissions, optional_host_permissions, icons}'
```
Expected:
- Listede `manifest.json`, `background.js`, `kibana.js`, `options.html`, `icon/16.png` … `icon/128.png`, `_locales/en/messages.json`, `_locales/tr/messages.json` ve `chunks/`/`assets/` altındaki derleme dosyaları var.
- `.map` dosyası yok. `e2e-extension/` yok (zip yalnızca `chrome-mv3`'ten çıkar).
- Manifest: `"version":"1.0.0"`, izinler değişmemiş, `icons` dört boyutlu.

- [ ] **Step 7: Commit**

```bash
npm test && npm run typecheck
git add assets scripts public/icon package.json package-lock.json
git commit -m "build: extension icons, stricter manifest check, version 1.0.0

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Belgeler: lisans, gizlilik, README, CHANGELOG, mağaza metinleri, CLAUDE.md

**Files:**
- Create: `LICENSE`, `PRIVACY.md`, `CHANGELOG.md`, `docs/store-listing.md`
- Modify: `README.md` (tamamı), `CLAUDE.md`

**Interfaces:**
- Consumes:
  - `examples/kibanatool-settings.json` (Task 7)
  - Task 4'teki stack bölümü (README'de aynen kalır)
  - `npm run e2e`, `npm run icons`, `npm run zip`
- Produces: Mağaza başvurusunun metinleri ve gizlilik politikası adresi `https://github.com/cllakyz/kibanatool/blob/main/PRIVACY.md` (dosya `main`'e girince yayında olur).

- [ ] **Step 1: `LICENSE`'ı yaz**

```text
MIT License

Copyright (c) 2026 kibanatool contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: `PRIVACY.md`'yi yaz (spec §11)**

```markdown
# Privacy policy

kibanatool is a Chrome extension that adds action buttons to the log you open in Kibana Discover.
**It does not collect, sell or share any data, and it sends nothing to its authors or to any third party.**

- **Settings.** Your Kibana addresses, actions and copy settings are stored only in your browser
  (`chrome.storage.local`). They leave your computer only if you export them to a file yourself.
- **Network.** The extension talks only to the Kibana addresses you add, with your own Kibana session, to
  read the log you opened and its data view. These requests go from your browser to your Kibana.
- **Links.** Buttons open the address that your own action templates build, in a new tab, only when you click them.
- **Clipboard.** The extension writes to the clipboard only when you choose a copy command. It never reads it.
- **No telemetry, analytics, ads or remote code.**
- **Permissions.** `storage` keeps your settings. `scripting` runs the extension only on the Kibana
  addresses you add. Access to each address is requested when you add it, and you can remove it at any
  time in `chrome://extensions`.

Questions: <https://github.com/cllakyz/kibanatool/issues>

---

## Gizlilik politikası

kibanatool, Kibana Discover'da açtığınız loga aksiyon butonları ekleyen bir Chrome eklentisidir.
**Hiçbir veri toplamaz, satmaz ya da paylaşmaz. Geliştiricilerine ya da üçüncü taraflara hiçbir şey göndermez.**

- **Ayarlar.** Kibana adresleriniz, aksiyonlarınız ve kopyalama ayarlarınız yalnızca tarayıcınızda
  (`chrome.storage.local`) saklanır. Ancak siz bir dosyaya dışa aktarırsanız bilgisayarınızdan çıkar.
- **Ağ.** Eklenti yalnızca eklediğiniz Kibana adresleriyle, kendi Kibana oturumunuzla, açtığınız logu ve
  data view'ını okumak için konuşur. Bu istekler tarayıcınızdan Kibana'nıza gider.
- **Linkler.** Butonlar, kendi aksiyon şablonlarınızın ürettiği adresi yalnızca tıkladığınızda yeni sekmede açar.
- **Pano.** Eklenti panoya yalnızca bir kopyalama komutu seçtiğinizde yazar. Panoyu hiç okumaz.
- **Telemetri, analitik, reklam ya da uzaktan kod yoktur.**
- **İzinler.** `storage` ayarlarınızı saklar. `scripting` eklentiyi yalnızca eklediğiniz Kibana
  adreslerinde çalıştırır. Her adres için erişim, adresi eklediğinizde istenir ve `chrome://extensions`
  üzerinden istediğiniz zaman geri alınabilir.

Sorular: <https://github.com/cllakyz/kibanatool/issues>
```

- [ ] **Step 3: `CHANGELOG.md`'yi yaz**

```markdown
# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/).

## [1.0.0] - Unreleased

First public release, for Kibana 7.17, 8.x and 9.x in Chrome.

### Added

- An action bar on the log you open in Discover (an expanded row on 7.17, the document flyout on 8.x/9.x),
  built from the log's raw fields, which are read from your Kibana with your own session.
- Link actions: URL templates with `{field|fallback}` placeholders and conditions.
- Discover actions: a KQL query from the log, optionally ±N minutes around the log's time, in a new tab.
- Copy menu: the log as Markdown with sensitive fields masked, a link to the log, and the current view with
  its time range fixed.
- JSON view for fields that hold JSON text: a tree with search, and copying a value or its path.
- Options page: environments with per-site access, an action editor with a live preview, copy and masking
  settings, export and import.
- English and Turkish.
```

- [ ] **Step 4: `README.md`'yi yeniden yaz**

`README.md` dosyasının tamamını şununla değiştir. "Kibana dev stacks" bölümü Task 4'teki metnin aynısıdır.
````markdown
# kibanatool

A Chrome extension that speeds up working with logs in Kibana Discover. It adds a row of action buttons to
the log you open, built from that log's raw fields. It works on Kibana 7.17, 8.x and 9.x.

Inspired by [graytool](https://github.com/bozkurtemre/graytool) for Graylog.

## What it does

When you open a log in Discover (an expanded row on 7.17, the document flyout on 8.x/9.x), kibanatool shows
a bar above it with:

- **Link actions** that jump to another system with a value from the log, e.g. `https://admin.example.com/users/{user_id}`.
- **Discover actions** that open related logs in a new tab: the same user's logs, or everything ±5 minutes around this log.
- **JSON**: fields that hold JSON text, such as a request body, as a tree you can search and copy from.
- **⋯** to copy the log as Markdown with sensitive fields masked, a link to the log, or the current view with its time range fixed.

## Set up

1. Install kibanatool from the Chrome Web Store, or build it (see [Development](#development)) and load
   `.output/chrome-mv3` as an unpacked extension.
2. Click the toolbar icon to open the options.
3. **Environments:** add your Kibana address, e.g. `https://kibana.example.com` or `https://example.com/kibana`.
   Chrome asks for access to that site; the extension runs nowhere else.
4. **Actions:** add link or Discover actions, and paste a sample log into the preview to see the result.
   Or import [`examples/kibanatool-settings.json`](examples/kibanatool-settings.json) under **Export and import** and edit it.
5. Reload your Kibana tab and open a log.

### Placeholders and conditions

- `{field}` is a field of the raw log. Nested fields use dots (`context.user_id`), and fields that hold JSON
  text can be read inside too (`context.body.amount`).
- `{a|b|c}` uses the first field that has a value. If none has one, the button is hidden.
- Values are URL-encoded in links and quoted for KQL in Discover queries.
- Conditions (`exists`, `equals`, `notEquals`, `contains`, `startsWith`) must all hold for the button to show.

### Example actions

These are in [`examples/kibanatool-settings.json`](examples/kibanatool-settings.json):

| Label | Kind | Template |
|---|---|---|
| User in admin | Link | `https://admin.example.com/users/{user_id\|context.user_id\|user.id}` |
| Sentry | Link, only when `level_name` is `ERROR` | `https://acme.sentry.io/issues/?query={message}` |
| Jira | Link | `https://acme.atlassian.net/issues/?jql=text%20~%20{user_id\|user.id}` |
| This user's logs | Discover | `user_id:{user_id}` |
| ±5 minutes | Discover, 5-minute window | empty query |

### Copy and masking

"Copy as Markdown" masks every field whose path matches a pattern under **Copy and masking** (by default
`*authorization*`, `*password*`, `*token*`, `*secret*` and `*cookie*`), keys inside JSON text included.
Masking applies to what you copy; the screen and your link templates are not changed.

## Privacy

kibanatool talks only to the Kibana addresses you add, with your own session, and keeps its settings in your
browser. There is no telemetry and no third-party service. See [PRIVACY.md](PRIVACY.md).

## Development

Requirements: Node 22+, npm, Docker with Compose v2 (for the dev stacks), jq, openssl, curl.

```bash
npm install
npm test                 # unit tests
npm run typecheck
npm run build            # output: .output/chrome-mv3
npm run check:manifest   # fails if the manifest asks for more than allowed
```

### Kibana dev stacks

```bash
./docker/up.sh 7     # Kibana 7.17.29 on http://localhost:17601/kibana (served under a base path)
./docker/up.sh 8     # Kibana 8.19.23 on http://localhost:18601
./docker/up.sh 9     # Kibana 9.5.5  on http://localhost:19601
./docker/down.sh 8   # stop and delete data
```

Security is on; the browser signs in anonymously, no password needed. `up.sh` is safe to re-run: it
re-creates the same synthetic logs every time. Data views: `app_log` (Monolog-shaped, time field
`datetime`), `*_log` (no time field) and `logs-*` (ECS, `@timestamp`). Every stack also has a `test`
space; 9.x has an `obs` space in the Observability view, where ECS logs open on "Log overview"
(`/s/obs/app/discover`).

### End-to-end tests

```bash
./docker/up.sh 9
KT_STACK=9 npm run e2e                              # builds, then runs tests/e2e against that stack
KT_STACK=9 KT_CAPTURE=1 npm run e2e -- capture      # refreshes tests/fixtures from the stack
```

CI runs the unit checks and the e2e tests against all three versions on every pull request.

### Release

```bash
npm run icons   # after changing assets/icon.svg
npm run zip     # .output/kibanatool-<version>-chrome.zip, uploaded to the Chrome Web Store by hand
```

Store listing texts are in [docs/store-listing.md](docs/store-listing.md); changes in [CHANGELOG.md](CHANGELOG.md).

## Credits

The `{path|fallback}` placeholders, the condition operators and the field flattening are adapted from
[graytool](https://github.com/bozkurtemre/graytool) by Emre Bozkurt (MIT License, Copyright (c) 2026 Emre Bozkurt).

## License

MIT. See [LICENSE](LICENSE).
````

- [ ] **Step 5: `docs/store-listing.md`'yi yaz**

````markdown
# Chrome Web Store listing

Texts and answers for the store submission. The package is `npm run zip` → `.output/kibanatool-<version>-chrome.zip`,
uploaded by hand in the developer dashboard.

## Store listing

- **Name:** kibanatool (from `__MSG_extName__`)
- **Summary:** comes from `extDescription` in `public/_locales/<lang>/messages.json` (max. 132 characters).
- **Category:** Developer Tools
- **Languages:** English (default), Turkish
- **Icon:** `public/icon/128.png`
- **Screenshots:** at least one, 1280×800. Take them from a dev stack (synthetic data only): `./docker/up.sh 9`,
  load `.output/chrome-mv3`, import `examples/kibanatool-settings.json` with the Kibana address changed to
  `http://localhost:19601`, open a log, show the bar, the JSON view and the copy menu.
- **Small promo tile (440×280):** only if the dashboard requires it; same design as the icon.

### Description (English)

kibanatool adds a row of action buttons to the log you open in Kibana Discover, built from that log's raw fields.
It works on Kibana 7.17, 8.x and 9.x.

- Jump to your admin panel, Sentry, Jira or any other tool with a value from the log.
- Open related logs in a new tab: the same user's logs, or everything ±5 minutes around this log.
- Read fields that hold JSON text as a searchable tree.
- Copy the log as Markdown with passwords, tokens and other sensitive fields masked, copy a link to the log,
  or copy the current view with its time range fixed.

You choose which Kibana addresses it runs on. It talks only to your Kibana, with your own session, and keeps
its settings in your browser. Open source: https://github.com/cllakyz/kibanatool

### Açıklama (Türkçe)

kibanatool, Kibana Discover'da açtığınız loga, o logun ham alanlarından üretilen bir sıra aksiyon butonu ekler.
Kibana 7.17, 8.x ve 9.x'te çalışır.

- Logdaki bir değerle admin panelinize, Sentry'ye, Jira'ya ya da başka bir araca tek tıkla geçin.
- İlgili logları yeni sekmede açın: aynı kullanıcının logları ya da bu logun ±5 dakika çevresi.
- JSON metni tutan alanları aranabilir bir ağaç olarak okuyun.
- Logu şifre, token ve diğer hassas alanları maskelenmiş Markdown olarak kopyalayın, logun linkini ya da
  zamanı sabitlenmiş mevcut görünümü kopyalayın.

Hangi Kibana adreslerinde çalışacağını siz seçersiniz. Yalnızca kendi Kibana'nızla, kendi oturumunuzla konuşur,
ayarlarını tarayıcınızda tutar. Açık kaynak: https://github.com/cllakyz/kibanatool

## Privacy practices

- **Single purpose:** Adds action buttons to the log the user opens in Kibana Discover, built from that log's fields.
- **Permission justifications:**
  - `storage`: keeps the user's settings (Kibana addresses, actions, copy settings) locally.
  - `scripting`: registers the extension's script only on the Kibana addresses the user added
    (`chrome.scripting.registerContentScripts`), instead of declaring a content script for every site.
  - Host permissions (optional, `http://*/*` and `https://*/*`): requested at runtime for each Kibana address
    the user adds, one origin at a time. Needed to run on that Kibana and to read the opened log through
    Kibana's own API with the user's session. Never requested for any other site.
- **Remote code:** No. All code is in the package.
- **Data usage:** The extension does not collect or transmit any user data. Certify all three statements
  (no selling, no use unrelated to the single purpose, no use for creditworthiness or lending).
- **Privacy policy URL:** https://github.com/cllakyz/kibanatool/blob/main/PRIVACY.md
````

- [ ] **Step 6: `CLAUDE.md`'yi güncelle**

`CLAUDE.md` dosyasında:

1. `## Commands` altındaki kod bloğunda `npm run dev` satırından sonra ekle:
```bash
KT_STACK=9 npm run e2e      # builds, then runs tests/e2e against the running docker stack 7|8|9
npm run icons               # re-render public/icon/*.png from assets/icon.svg
npm run zip                 # store package: .output/kibanatool-<version>-chrome.zip
```
2. `## Traps` listesinin sonuna ekle:
```markdown
- E2E tests never assert localized text (Chromium on macOS takes the UI language from the OS). They use `data-test-subj`, roles, menu order and the action labels from `e2eConfig()`, and read time ranges from `_g.time` in the URL, not from the 9.x time picker.
- `docker/seed.mjs` is a contract with `tests/e2e` (ids, values, times): change both together. `tests/fixtures/*.json` are captured from the stacks (`KT_CAPTURE=1 npm run e2e -- capture`); refresh them after a Kibana upgrade instead of editing them.
- The e2e copy of the extension (`.output/e2e-extension`) lists the stack's origin under `host_permissions`, because Chrome's permission prompt cannot be automated. The prompt itself is checked by hand (`docs/verification/2026-10-plan-3.md`).
```
3. `## Docs` paragrafındaki "Plans 1 (link actions) and 2 (…) are done. Plan 3 will add the Playwright e2e matrix, CI and the store release." cümlelerini şununla değiştir:
```markdown
Plans 1 (link actions), 2 (Discover actions, copy/mask, JSON view, full options page) and 3 (e2e matrix, CI, store package) are done. `.github/workflows/ci.yml` runs the unit checks and the e2e matrix on every pull request.
```

- [ ] **Step 7: Linkleri ve komutları kontrol et**

Run:
```bash
for f in examples/kibanatool-settings.json PRIVACY.md LICENSE CHANGELOG.md docs/store-listing.md; do test -f "$f" && echo "ok $f"; done
grep -n "obs-view" README.md CLAUDE.md docker/*; echo "obs-view refs: $?"
node -e 'const m=require("./public/_locales/en/messages.json");console.log(m.extDescription.message.length)'
npm test && npm run typecheck && npm run build && npm run check:manifest
```
Expected:
- Beş dosya `ok`.
- `obs-view` için eşleşme yok (`obs-view refs: 1`).
- Mağaza özeti 132 karakterden kısa.
- Kontroller geçer.

- [ ] **Step 8: Commit**

```bash
git add LICENSE PRIVACY.md CHANGELOG.md README.md CLAUDE.md docs/store-listing.md
git commit -m "docs: license, privacy policy, README with examples, changelog and store listing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Doğrulama, PR ve CI

**Files:**
- Create: `docs/verification/2026-10-plan-3.md`

**Interfaces:**
- Consumes: bütün task'lar
- Produces: Türkçe doğrulama kaydı, kullanıcı onayıyla açılmış bir PR ve yeşil CI. Merge, etiket, GitHub sürümü ve mağazaya yükleme bu task'ta **yapılmaz**.

- [ ] **Step 1: Bütün otomatik kontrolleri çalıştır**

Run:
```bash
git status --short          # boş olmalı
npm test && npm run typecheck && npm run build && npm run check:manifest && npm run zip
KT_STACK=7 npm run e2e
KT_STACK=8 npm run e2e
KT_STACK=9 npm run e2e
KT_STACK=7 npx playwright test --repeat-each=3
KT_STACK=9 npx playwright test --repeat-each=3
```
Expected:
- Birim testleri, tip kontrolü, derleme, manifest ve zip geçer.
- 7 ve 8: `15 passed, 3 skipped`. 9: `16 passed, 3 skipped`. Atlananlar: sürüme özel testler ve yakalama testleri.
- `--repeat-each=3` ile kırılan test yok. Kırılan test dengesizdir: nedeni bulunur (beklenmeyen bir bekleme, Kibana'nın geç yüklenen bir parçası) ve düzeltilir. Tekrar sayısını artırmak ya da `retries` eklemek düzeltme değildir.

- [ ] **Step 2: Doğrulama kaydını yaz**

`docs/verification/2026-10-plan-3.md` (Türkçe; Plan 2 kaydının biçiminde):
```markdown
# Plan 3 doğrulaması (Task 12)

- **Tarih:** <YYYY-MM-DD>
- **Dal:** `plan-3-e2e-ci-release`, HEAD `<kısa sha>`
- **Kibana:** 7.17.29 (`http://localhost:17601/kibana`), 8.19.23 (`http://localhost:18601`), 9.5.5 (`http://localhost:19601`). Hepsi `docker/up.sh` ile kuruldu.
- **Araçlar:** Playwright <sürüm>, Chromium <sürüm>, Node <sürüm>

## Otomatik kontroller

| Kontrol | Sonuç |
|---|---|
| `npm test` | <N> test geçti (<M> dosya) |
| `npm run typecheck`, `npm run build`, `npm run check:manifest` | Geçti |
| `npm run zip` | `.output/kibanatool-1.0.0-chrome.zip`, <boyut> |
| E2E 7.17 | 15 geçti, 3 atlandı |
| E2E 8.19 | 15 geçti, 3 atlandı |
| E2E 9.5 | 16 geçti, 3 atlandı |
| `--repeat-each=3` (7.17, 9.5) | Kırılan yok |
| CI (PR #<n>) | <unit / e2e 7 / e2e 8 / e2e 9 sonuçları ve süreleri> |

## Elle kontroller

Chrome'un izin penceresi otomasyonla cevaplanamadığı için bunları kullanıcı denedi.

| # | Kontrol | Sonuç |
|---|---|---|
| M1 | Taze bir Chrome profilinde zip'ten açılan paket yüklendi. Ortam eklenince izin penceresi açıldı, "İzin ver" seçildi. Ortam "Erişim var" oldu, Discover'da çubuk çıktı. | |
| M2 | İkinci bir ortamda pencerede "Reddet" seçildi. Ortam "İzin bekliyor" oldu, o Kibana'da çubuk çıkmadı. "Erişim izni ver" → pencere → "İzin ver" sonrası çubuk çıktı. | |
| M3 | chrome://extensions → "Site erişimi" üzerinden bir adresin izni kaldırıldı. Ayarlarda ortam "İzin bekliyor" oldu, sayfa yenilenince çubuk çıkmadı. "Erişim izni ver" tekrar pencere açtı ve izin verilince çalıştı. | |
| M4 | Gerçek pencereyle izin verilmiş bir ortam silindi. chrome://extensions'taki "Site erişimi" listesinin o adresi bırakıp bırakmadığı (Plan 2 bulgusu). | |
| M5 | Araç çubuğu ikonu ve chrome://extensions'taki ikon 16, 48 ve 128 px'te düzgün görünüyor. | |

## Notlar

<Dengesiz testler ve düzeltmeleri, CI'a özgü sorunlar, sürüm farkları.>
```
Açılı ayraçlı yerleri gerçek değerlerle doldur. Elle kontrollerin sonuç sütunu boş kalır, Step 5'te dolar.

```bash
git add docs/verification/2026-10-plan-3.md
git commit -m "docs: record Plan 3 verification

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Push ve PR için kullanıcıdan onay al**

Kullanıcıya sor: "`plan-3-e2e-ci-release` dalını push edip `main`'e PR açayım mı? CI'a özgü bir hata çıkarsa düzeltmeleri aynı dala push edeceğim." Onay yoksa burada dur ve kaydı öyle bırak.

Onay varsa:
```bash
GH_TOKEN=$(gh auth token --user cllakyz) git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push -u origin plan-3-e2e-ci-release
GH_TOKEN=$(gh auth token --user cllakyz) gh pr create --base main --head plan-3-e2e-ci-release \
  --title "Plan 3: e2e matrix, CI and the 1.0.0 store package" --body-file <PR gövdesi dosyası>
```
PR gövdesi:
- Özet: devreden düzeltmeler, Docker, uçtan uca testler, CI, paket, belgeler
- Test planı: Step 1'deki sonuçlar
- Kullanıcı onayı bekleyen sapmalar: sürüm 1.0.0 ve LICENSE telif satırı
- Son satır: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

- [ ] **Step 4: CI'ı izle**

Run: `GH_TOKEN=$(gh auth token --user cllakyz) gh pr checks <PR numarası> --watch`
Expected: `unit`, `e2e (Kibana 7)`, `e2e (Kibana 8)` ve `e2e (Kibana 9)` geçer.

Bir iş kırılırsa:
1. Kibana loglarına ve `e2e-kibana-<n>` dosyalarına bak:
   ```bash
   gh run download <run id> -n e2e-kibana-<n>
   npx playwright show-trace <trace.zip>
   ```
2. Yerelde (macOS) denenemeyen, yalnızca CI'da görülebilecek riskler:
   - **Linux'ta headless panodan okuma:** `copyFromMenu` boş metin döndürürse pano izni ya da odak sorunudur. Önce `page.bringToFront()` ekle.
   - **Elasticsearch açılış kontrolleri:** `single-node`'a rağmen `vm.max_map_count` hatası verirse iş akışına `sudo sysctl -w vm.max_map_count=262144` adımı eklenir.
   - **Dosya düzeyinde `test.skip(boolean, …)`:** `capture.spec.ts` bu biçimde hata verirse geri çağrı biçimine geç: `test.skip(() => !process.env.KT_CAPTURE, "…")`.
   - **Kibana'nın geç hazır olması:** `up.sh` 10 dakika bekler. Süre aşılırsa Kibana logları adımında nedeni görünür.
3. Nedeni düzelt, yerelde aynı stack'te doğrula, commit et ve push et (Step 3'teki onay bunu kapsar).
4. CI sonuçlarını ve sorunları doğrulama kaydına yaz, commit et, push et.

- [ ] **Step 5: Elle kontrolleri kullanıcıyla yap**

Kullanıcıya doğrulama kaydındaki M1–M5 listesini ver. Zip'i açıp "Paketlenmemiş öğe yükle" ile yüklemesini ve bir Kibana adresiyle (örn. `http://localhost:19601`) denemesini iste. Kullanıcının bildirdiği sonuçları tabloya "Geçti", "Kaldı" ya da gözlemiyle yaz.

Kullanıcı ertelerse sütuna "Bekliyor" yaz. Kaydı commit edip push et.

- [ ] **Step 6: Dur**

Kullanıcıya özetle:
- PR linki ve CI durumu
- Elle kontrollerin durumu
- Onay bekleyen kararlar: sürüm 1.0.0 ve LICENSE telif satırı

Merge, `v1.0.0` etiketi, GitHub sürümü ve mağazaya yükleme yalnızca kullanıcı açıkça isterse yapılır. İstenirse sırası şöyle:
1. `CHANGELOG.md`'de `Unreleased` yerine tarih yazılır.
2. Merge yapılır.
3. `main` üzerinde `git tag v1.0.0` ve push.
4. Kullanıcı zip'i mağazaya `docs/store-listing.md`'ye göre elle yükler.
5. Mağaza linki çıkınca README'ye ayrı bir commit'le eklenir.
