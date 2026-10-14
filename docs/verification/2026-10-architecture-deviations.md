# Mimari sapmaların doğrulaması (spec 001, D1–D13)

- **Tarih:** 2026-10-14
- **Dal:** `001-fix-architecture-deviations`, HEAD `8b63371` (kayıt commit'inden önceki HEAD)
- **Kibana:** 7.17.29 (`http://localhost:17601/kibana`), 8.19.23 (`http://localhost:18601`), 9.5.5 (`http://localhost:19601`)
- **Araçlar:** Playwright 1.64.0, Chromium 156.0.8078.4, Node v24.21.0

Bu iş davranış değiştirmeyen bir yeniden düzenleme. Kullanıcının göreceği bir fark yok. Bilinçli tek değişiklik aşağıda ayrıca yazılı.

## Otomatik kontroller

| Kontrol | Sonuç |
|---|---|
| `npx vitest run` | 459 test geçti (37 dosya). Bunların 431'i eski testler, 9'u katman testi, 19'u yeni |
| `npm run typecheck`, `npm run build`, `npm run check:manifest` | Üçü de geçti |
| `tests/unit/architecture.test.ts` | 9 test geçti, istisna listesi boş. `src/core/passive.ts`'e elle eklenen `../kibana/url` importunu yakaladı; satır sonra geri alındı |
| E2E 7.17 | 27 geçti, 3 atlandı, 43.5 sn |
| E2E 8.19 | 27 geçti, 3 atlandı, 48.1 sn |
| E2E 9.5 | 28 geçti, 3 atlandı, 1.3 dk |
| `git diff --stat main -- tests/e2e` | Boş (e2e testleri değişmedi) |

## Davranış karşılaştırması

Bu karşılaştırma bir fark testiyle yapıldı. `main` (56e48a2) ayrı bir çalışma kopyasında açıldı. Aynı fonksiyonlar iki sürümden de çağrıldı ve çıktıları birebir karşılaştırıldı. Fırlatılan hatalar da karşılaştırmaya dahildi. Test geçiciydi, çalıştıktan sonra silindi.

| Alan | Karşılaştırma | Sonuç |
|---|---|---|
| Markdown ve JSON kopyaları (1.079 `_source` girdisi, maske ve alan listesi kombinasyonları) | 155.376 | Hepsi aynı |
| cURL kopyası (`context` altında ve kökte; JSON, form, multipart, düz metin, XML, HTML ve "<5" gövdeler) | 657.300 | Hepsi aynı |
| Aksiyon kontrolü (link ve Discover; eksik alan, eksik ya da boş değişken, yedek zincirler, kapalı aksiyon, koşullar) | 65.280 | Hepsi aynı |
| `fillTemplate` | 720 | Hepsi aynı |
| Ortam kapsamı ve değişken uyarıları | 5.046 | Hepsi aynı |

Girdiler riskli yollara ulaştı:
- 7 seviye iç içe JSON'da derinlik sınırı devreye girdi.
- JSON/XML karışık 4 seviyede, XML metnindeki `password` ve `iban` maskelendi.
- Multipart gövdede `card=***` çıktı.
- Link aksiyonlarının olası her sonucu en az bir kez göründü.

## Ek kontrol

Geçici bir e2e testi 9.5'te geçti. Testte bir log açıkken ayarlar `chrome.storage.local`'a yazıldı ve açık bar sayfa yenilenmeden yeni linki gösterdi. Bu, `store.onChange` yolunun içerik betiğinde çalıştığını gösteriyor. Test sonra silindi.

## Bilinçli değişiklik

cURL öğesi metin üretemezse artık "kopyalanamadı" yazıyor; önce yanlışlıkla "zaman çevrilemedi" yazıyordu. Bu yol bugün ulaşılamıyor, çünkü öğe yalnızca istek kaydı olan loglarda gösteriliyor.

## Kapanan sapmalar

| Commit | Kapanan |
|---|---|
| `acfe36b` | D1, katman testi (Gate G2) |
| `70fce6a` | D9, D10 |
| `7091dc6` | D2–D8. Ayrıca http(s) önek kuralı ve cURL maskeleme yorumundaki spec atfı |
| `26fe145` | D11 |
| `2ded818` | D12, D13. Ayrıca barın saati kendisi okuması |
| `8b63371` | CLAUDE.md'de constitution'a işaret; `specs/` gitignore'a eklendi |

Constitution (`.specify/memory/constitution.md`, local-only) v1.0.6'da ve Known Deviations tablosu boş.

## Elle kontroller

Yok. Kullanıcıya görünen bir değişiklik olmadığı için Plan 1–7'deki M kontrollerinin karşılığı gerekmedi.
