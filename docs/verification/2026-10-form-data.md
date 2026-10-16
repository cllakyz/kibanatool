# Form verisi doğrulaması (spec-kit 002, US1)

- **Tarih:** 2026-10-15
- **Dal:** `002-form-data`, HEAD `3fd08a7` (kayıt commit'inden önceki HEAD)
- **Spec:** `specs/002-plain-text-viewer/` (US1; doğrulama adımları `quickstart.md`'de)
- **Kibana:** 7.17.29 (`http://localhost:17601/kibana`), 8.19.23 (`http://localhost:18601`), 9.5.5 (`http://localhost:19601`). Üçü de bu dalın `docker/seed.mjs`'iyle yeniden seed edildi.
- **Araçlar:** Playwright 1.64.0, Chromium 156.0.8078.4, Node v24.21.0

## Otomatik kontroller

| Kontrol | Sonuç |
|---|---|
| `npx vitest run` | 495 test geçti (38 dosya). Başlangıçta 459 test vardı; 36'sı yeni. |
| `npm run typecheck`, `npm run build`, `npm run check:manifest` | Üçü de geçti; manifest değişmedi. |
| `npm run zip` | `kibanatool-1.0.0-chrome.zip`, 268.34 kB (268344 bayt) |
| E2E 7.17 | 29 geçti, 3 atlandı, 45.5 sn |
| E2E 8.19 | 29 geçti, 3 atlandı, 1.2 dk |
| E2E 9.5 | 30 geçti, 3 atlandı, 1.7 dk |
| `--repeat-each=3` (`json`, `copy`, `-g form`; 7.17 ve 9.5) | 7.17'de 9/9, 9.5'te 9/9 |
| SC-005 / FR-019: mevcut beklentiler | `git diff main -- tests/e2e/copy.spec.ts tests/unit/core/{curl,markdown,json-copy,mask,json-tree}.test.ts \| grep '^-[^-]'` boş. Bu dosyalara yalnızca test eklendi; hiçbir kopya, cURL ya da ağaç beklentisi değişmedi. Testlerdeki 2 silinen satır `fields.test.ts` ve `xml.test.ts`'teki import satırları. |

## Kontroller (quickstart.md, US1)

| # | Kontrol | Sonuç |
|---|---|---|
| 1 | SC-005: form metni olmayan logların kopyaları aynı. | Geçti (yukarıdaki diff kontrolü ve değişmeden geçen mevcut e2e kopya testleri) |
| 2 | Panel: `app-033`'te liste `context.options.body` alanını tür etiketiyle gösteriyor; ağaçta `username`, `password`, `grant_type` var. | Geçti (e2e `opens form text as a tree tagged by its kind`, 7/8/9) |
| 3 | Kopyalar: `app-033`'ün Markdown ve JSON kopyalarında `password` `***`, `grant_type` `password`, `username` `dev`; `synthetic-pass` hiçbir yerde yok. | Geçti (e2e `masks the password inside form text in the Markdown and JSON copies`, 7/8/9) |
| — | cURL (FR-005): istek içindeki form metni form metni olarak kalıyor ve çift çift maskeleniyor; değişmeyen çiftler bayt bayt korunuyor; form olan sorgu URL'ye ekleniyor, düz metin sorgu atılıyor; sınırın ötesindeki form metni `***`. | Geçti (`curl.test.ts`, "buildCurl with form text", 5 test) |

## Elle kontroller

| # | Kontrol | Sonuç |
|---|---|---|
| M1 | Kullanıcının Chrome'unda eklenti bu dalın derlemesiyle yenilenir (`chrome://extensions` → yenile). Alpha'da `context.options.body` taşıyan güncel bir `iys_log` kaydı açılır: JSON panelinde alan "form" etiketiyle ve 3 anahtarıyla görünür; Markdown ve JSON kopyalarında kimlik bilgisi yalnızca `***` olarak geçer (SC-001). | Geçti (kullanıcı, 2026-10-16) |
