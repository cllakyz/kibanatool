# Seçenekler sayfası tema seçicisi doğrulaması (spec-kit 006)

- **Tarih:** 2026-10-20
- **Dal:** `006-theme-toggle`, HEAD `6966517` (uygulama commit'inden önceki HEAD)
- **Spec:** `specs/006-theme-toggle/` (doğrulama adımları `quickstart.md`'de)
- **Kibana:** 9.5.5 (`http://localhost:19601`). Seed bu özellikte değişmedi.
- **Araçlar:** Playwright 1.64.0, Chromium (Playwright'ın kendi sürümü), Node v24.21.0. macOS dili `tr-TR`, bu yüzden
  Chromium arayüzü Türkçe.

## Otomatik kontroller

| Kontrol | Sonuç |
|---|---|
| `npx vitest run` | 581 test geçti (45 dosya). Başlangıçta 571 test vardı; 10 yeni test: `applyTheme` (3) ve tema tercihinin okunup yazılması (7). |
| `npm run typecheck`, `npm run build`, `npm run check:manifest` | Üçü de geçti. Manifest değişmedi. |
| Build'deki `options.html` | `<head>`'deki ilk script `<script src="/options-theme.js">`; `type` yok, yani klasik script. `options-theme.js` 97,5 kB (zod'u `src/storage.ts` üzerinden taşıyor; research R2). |
| Vite uyarısı | Etikete `vite-ignore` eklenince "can't be bundled without type=module" uyarısı kalktı ve build'deki etiket klasik kaldı. Özellik bırakıldı. |
| E2E `options` (9.5) | 11 test geçti: 10 eski test ve yeni tema testi (7 adım). |
| E2E 9.5, tamamı | 42 geçti, 5 atlandı, 1.3 dk. Atlananlar önceki özelliklerdekiyle aynı. |
| E2E 7.17 ve 8.19 | Yerelde koşulmadı; PR'da CI matrisi koşar (G4). |

Yeni testteki ilk kare kontrolünün gerçekten bir şey yakaladığı denendi. Head script geçici olarak
`type="module"` yapılınca test kırıldı: ilk karede `data-theme` yoktu (`undefined`). Etiket klasik script'e
döndürülünce test geçti.

## İlk kare ve sığma (quickstart.md)

Ölçümler scratchpad'deki bir Playwright betiğiyle yapıldı ve repoya eklenmedi.

| # | Kontrol | Sonuç |
|---|---|---|
| F1 | Sistem açık, seçim Koyu: 10 yeniden yüklemenin 10'unda ilk karede `data-theme="dark"` ve sayfa arka planı `rgb(5, 15, 33)` (koyu `surface-page`). Açık tema hiç görünmedi (SC-002). | Geçti |
| F2 | 1000px, Türkçe: sekmeler `scrollWidth` = `clientWidth` = 639 px, kaymıyor. Seçici 833–919 px'te, sürüm 943 px'te başlıyor (SC-003). Navbar boşluğu 32 px'ten 24 px'e indi; inmeden önce sekmeler 11 px taşıyordu. | Geçti |
| F3 | 700px: sekmeler yana kayıyor (352 px görünür), seçici 533–619 px'te, ekranın içinde ve sürümün solunda. | Geçti |

## Görsel kontrol (quickstart.md)

1000px, Türkçe. Ortamlar ve Dışa ve içe aktarma sekmeleri dört durumda çekildi: sistem açık + Koyu, sistem koyu +
Açık, iki sistem modunda da Sistem. Aksiyonlar sekmesi ve aksiyon diyaloğu `examples/kibanatool-settings.json`
ile, sistemin tersi seçilerek çekildi.

| # | Kontrol | Sonuç |
|---|---|---|
| G1 | Bütün sayfa seçilen temada: paneller, form alanları, onay kutuları, diyalog arka planı (FR-006). | Geçti |
| G2 | İşaret temaya uyuyor: koyu temada koyu ikon, açık temada açık ikon. | Geçti |
| G3 | Dışa ve içe aktarma'daki dosya seçme butonu, sistem koyuyken Açık seçilince açık çiziliyor. | Geçti |
| G4 | Seçici: seçili parça mavi dolgulu, ikonu açık temada beyaz, koyu temada koyu; ötekiler gri ikonlu. Üç ikon (ekran, güneş, ay) 16 px'te net. | Geçti |
| G5 | Sistem seçiliyken sayfa sistemin modunu izliyor (iki sistem modunda da). | Geçti |
| G6 | Klavye odağı: seçicideki halka iki temada da görünüyor. Koyu temada halkanın rengi dolguyla aynı olduğu için halka dolguya karışıyordu. Halka 2 px dışarı alındı (sayfadaki butonların odak stili gibi), aradaki boşlukla ayrılıyor. | Geçti |

## Elle yapılacak kontroller

2026-10-20: kullanıcı M1–M5'i `006-theme-toggle` dalındaki build ile elle yaptı; beşi de geçti. M2 aynı zamanda spec
005'in M3'ünü kapattı (`docs/verification/2026-10-tabbed-options.md`).

| # | Kontrol | Spec | Sonuç |
|---|---|---|---|
| M1 | Klavye ve VoiceOver: üstten Tab ile işaret, beş sekme, sonra seçicide tek durak, odak halkasıyla. Ok tuşları temayı değiştiriyor. VoiceOver "Tema", seçeneğin adını ve "seçili" diyor. Fareyle üzerine gelince her seçeneğin adı çıkıyor. | FR-004, FR-005, SC-006 | Geçti (kullanıcı, 2026-10-20) |
| M2 | Sistem değişikliği: sayfa açık ve Sistem seçiliyken macOS açık/koyu arasında değiştirilince palet ve işaret izliyor. Açık ya da Koyu seçiliyken sayfa değişmiyor. Bu kontrol spec 005'in açık M3'ünü de kapatır. | FR-007 | Geçti (kullanıcı, 2026-10-20) |
| M3 | Parlama yok, tercih kalıcı: sistem açık, seçim Koyu; sayfa birkaç kez yenilenip yeniden açılınca hiç açık kare görünmüyor. Chrome kapatılıp açılınca hâlâ Koyu. | FR-008, FR-009, SC-002 | Geçti (kullanıcı, 2026-10-20) |
| M4 | Kibana değişmiyor: seçim Koyu, Kibana açık temada; aksiyon barı ve satır butonları eskisi gibi açık. Araç çubuğu ikonu seçimi değil tarayıcıyı izliyor. | FR-012, SC-007 | Geçti (kullanıcı, 2026-10-20) |
| M5 | İçe aktarma: seçim Açık, `examples/kibanatool-settings.json` içe aktarılınca sayfa Açık kalıyor. | FR-010 | Geçti (kullanıcı, 2026-10-20) |
