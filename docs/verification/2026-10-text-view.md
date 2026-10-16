# Metin görünümü doğrulaması (spec-kit 002, US2)

- **Tarih:** 2026-10-16
- **Dal:** `002-text-view`, HEAD `58d96b0` (kayıt commit'inden önceki HEAD)
- **Spec:** `specs/002-plain-text-viewer/` (US2; doğrulama adımları `quickstart.md`'de)
- **Kibana:** 7.17.29 (`http://localhost:17601/kibana`), 8.19.23 (`http://localhost:18601`), 9.5.5 (`http://localhost:19601`). Üçü de bu dalın `docker/seed.mjs`'iyle yeniden seed edildi.
- **Araçlar:** Playwright 1.64.0, Chromium 156.0.8078.4, Node v24.21.0

## Otomatik kontroller

| Kontrol | Sonuç |
|---|---|
| `npx vitest run` | 509 test geçti (39 dosya). Başlangıçta 495 test vardı; 14'ü yeni. |
| `npm run typecheck`, `npm run build`, `npm run check:manifest` | Üçü de geçti; manifest değişmedi. |
| `npm run zip` | `kibanatool-1.0.0-chrome.zip`, 269.17 kB (269165 bayt). Metin görünümü 1.0.0'a girdi (kullanıcı kararı, 2026-10-16); ilk ölçüm 1.1.0 adıyla alınmıştı, içerik aynı. |
| E2E 7.17 | 30 geçti, 3 atlandı, 49.4 sn |
| E2E 8.19 | 30 geçti, 3 atlandı, 1.4 dk |
| E2E 9.5 | 31 geçti, 3 atlandı, 1.9 dk |
| `--repeat-each=3` (`json -g "text view"`; 7.17 ve 9.5) | 7.17'de 3/3, 9.5'te 3/3 |
| Tema kontrastı | Yeni çift gerekmedi: `<mark>` metni miras alır; `text` / `match` (4.5) ve `warning` / `match` (3) çiftleri `theme.test.ts`'te zaten var. |

## Kontroller (quickstart.md, US2)

| # | Kontrol | Sonuç |
|---|---|---|
| 1 | Panel: `app-034`'te buton paneli açıyor; listede `context.output` ve `context.error` metin olarak var. | Geçti (e2e `opens long and multi-line text in the text view`, 7/8/9) |
| 2 | Tablo: `context.output` kaydırılmadan açılıyor (`white-space: pre`, `kt-wrap` yok); kaydırma düğmesi `kt-wrap`'i ekliyor. | Geçti (aynı e2e) |
| 3 | Arama ve kopya: `synced` 2 eşleşme işaretliyor; kopya metnin aynısı. | Geçti (aynı e2e; sayaç ve Enter ile adım `json-view.test.ts`'te) |
| 4 | Tek satır: 500+ karakterlik tek satırlı metin kaydırılmış açılıyor. | Geçti (`json-view.test.ts`) |
| 5 | Listelenecek alanı olmayan logda (`trace.id:"trace-0001"`) panel butonu yok. | Geçti (e2e `shows no panel button for a log without listed fields`, 7/8/9) |
| 6 | SC-004: 9.5'e e2e'den sonra 106.800 karakterlik (1.200 satır) geçici bir doküman eklendi ve geçici bir Playwright testiyle ölçüldü; ardından test silindi ve stack yeniden seed edildi. | Geçti. Açılış 141 ms; tek harflik arama (`a`, 4.800 eşleşme ve vurgu) 362 ms; eşleşmeler arası adım ortalama 85 ms. Hepsi 1 sn'nin altında, bu yüzden R10'daki vurgu sınırı gerekmedi. |
| 7 | SC-002: Alpha'da (7.17.26) 23 data view'in son 500 kaydı, kullanıcının Chrome oturumunda salt okuma ile tarandı (2026-10-16). Bu dalın `panelFields`'i, kuraldan bağımsız yazılmış bir beklentiyle karşılaştırıldı (satır sonu ya da 500+ karakter, yapılı metin değil). Yalnızca sayılar okundu, hiçbir değer yazılmadı. | Geçti. 10.096 kayıt, 0 hata: listelenmeyen uygun alan 0, yanlış listelenen alan 0. Panel 1.280 metin alanı (cron_log 500, filebeat 463, sms_log 282, social 15, shared_coupon_log 15, withdraw_log 5) ve 9.534 ağaç alanı listeliyor. Dizi içindeki uygun metin (tasarım gereği listelenmez) 0. |

## Elle kontroller

| # | Kontrol | Sonuç |
|---|---|---|
| M2 | Kullanıcının Chrome'unda eklenti bu dalın derlemesiyle yenilenir. Alpha'da bir `cron_log` kaydının `context.output`'u kaydırılmadan, sütunları hizalı açılır; bir `shared_coupon_log` stack trace'i açılır ve içinde arama yapılabilir. | Geçti (kullanıcı, 2026-10-16) |
