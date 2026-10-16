# Satır butonları doğrulaması (spec-kit 003)

- **Tarih:** 2026-10-17
- **Dal:** `003-row-actions`, HEAD `1fae909` (kayıt commit'inden önceki HEAD)
- **Spec:** `specs/003-row-actions/` (doğrulama adımları `quickstart.md`'de)
- **Kibana:** 7.17.29 (`http://localhost:17601/kibana`), 8.19.23 (`http://localhost:18601`), 9.5.5 (`http://localhost:19601`). Seed bu özellikte değişmedi.
- **Araçlar:** Playwright 1.64.0, Chromium 156.0.8078.4, Node v24.21.0

## Otomatik kontroller

| Kontrol | Sonuç |
|---|---|
| `npx vitest run` | 563 test geçti (45 dosya). Başlangıçta 509 test vardı. |
| `npm run typecheck`, `npm run build`, `npm run check:manifest` | Üçü de geçti. Manifest değişmedi; `kibana-bridge.js` derleniyor (1,2 kB, içinde eklenti API'si yok). |
| `npm run zip` | `kibanatool-1.0.0-chrome.zip`, 272.67 kB (272670 bayt). |
| E2E 7.17 | 37 geçti, 5 atlandı, 59.7 sn |
| E2E 8.19 | 36 geçti, 6 atlandı, 1.4 dk |
| E2E 9.5 | 38 geçti, 5 atlandı, 2.0 dk |
| Atlananlar | Önceki 3 test; `capture` testleri (yalnızca `KT_CAPTURE=1` ile); köprü testi (yalnızca 7.17); Observability testi (yalnızca 9.x). |

## Kontroller (quickstart.md)

| # | Kontrol | Sonuç |
|---|---|---|
| 1 | Tek tık: "User", "Error" ve "Same user ±5" işaretliyken `app-004` satırının üzerine gelinince üçü çıkıyor; adresleri açık satırdaki çubukla aynı; "Same user ±5" yeni sekmede Discover'ı açıyor, satır kapalı kalıyor (SC-001, SC-002). | Geçti (e2e, 7/8/9) |
| 2 | Gri buton: zaman alanı olmayan `all-logs`'ta "±5 minutes" gri, `aria-disabled` ve nedeni `title`'da. | Geçti (e2e, 7/8/9) |
| 3 | Klavye: satırdaki ilk kontrole odaklanınca şerit çıkıyor ve Tab şeride ulaşıyor. 7.17'de açma düğmesinden, 8.x/9.x'te odaklanmış hücreden. T031 kapısı: 8.19 ve 9.5'te tek Tab yetiyor. | Geçti (e2e, 7/8/9) |
| 4 | İşaretli aksiyon yokken eklenti hiç istek göndermiyor ve sayfaya öğe eklemiyor; ayar sayfa yenilenmeden değişince şerit geliyor (FR-014, FR-014a). | Geçti (e2e, 7/8/9) |
| 5 | Düzen: şerit görünürken ilk iki satırın hücre dikdörtgenleri değişmiyor (SC-005). | Geçti (e2e, 7/8/9) |
| 6 | SC-004, 7.17'de tek seferlik ölçüm: `scratch_log`'a 500 geçici kayıt eklendi; `all-logs`'ta tablo sonuna kadar kaydırıldı; ardından index silindi (404 doğrulandı). Test commit'lenmedi. | Geçti. 500 satır, 10 istek, her biri 50 log. Hiçbir log iki kez istenmedi. |
| 7 | Köprü yokken (`kibanatool-bridge` kaydı silindi) 7.17'de şerit çıkmıyor, açık satırdaki çubuk çalışıyor, konsolda `[kibanatool]` hatası yok (SC-007). | Geçti (e2e, 7) |
| 8 | 9.5 Observability space'inde (`obs-logs`) satırın üzerine gelince şerit çıkıyor. | Geçti (e2e, 9) |
| SC-003 | Logu önceden çekilmiş satırda, üzerine gelinmesinden butonların çıkmasına kadar geçen süre, sayfa içinde ölçüldü (sayfadaki ilk hover). | Geçti. 7.17'de 10 ms, 8.19'da 22 ms, 9.5'te 24 ms; hedef 300 ms. |

## Elle kontroller

| # | Kontrol | Sonuç |
|---|---|---|
| M1 | Kullanıcının Chrome'unda eklenti bu dalın derlemesiyle yenilenir. Alpha ayarları kaybolmadan v4'e dönüşür, her aksiyonda "Satırda göster" kapalı gelir (SC-006). | Geçti (kullanıcı, 2026-10-17) |
| M2 | Alpha'da (7.17.26) iki aksiyon işaretlenir; bir log satırının üzerine gelince şerit hemen çıkar, tek tık beklenen admin sayfasını açar, satır kapalı kalır; ilk 50 satırın logları 2 sn içinde gelir (SC-003, SC-008). | Geçti (kullanıcı, 2026-10-17) |
