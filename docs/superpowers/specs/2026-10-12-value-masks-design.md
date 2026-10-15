# Değere göre maskeleme — Tasarım Dokümanı

- **Tarih:** 2026-10-12
- **Durum:** Kullanıcı incelemesi bekliyor
- **Ana spec:** `2026-10-07-kibanatool-design.md`. Bu doküman oradaki §7.5 (maskeleme), §8 (ayar modeli) ve §9 (ayarlar sayfası) bölümlerini genişletir. Çelişen yerde bu doküman geçerlidir. Ayar modelinin son hali `2026-10-09-env-variables-design.md` §3'tedir (schemaVersion 2).
- **Sürüm:** Eklentinin yayınlanmamış 1.0.0 sürümüne dahil edilir.

## 1. Amaç

"Markdown olarak kopyala" çıktısı Jira'ya ve Slack'e yapıştırılıyor. Bugünkü maskeleme alan adına göre çalışıyor: adı bir desene uyan alanın değeri `***` olur. JSON metninin içindeki anahtarlara da ulaşıyor. Ama `payment_log`, `coupon_log`, `tjk_webhook_log` ve `altenar_api_log`'daki `context.request`/`context.response` alanları XML. `sms_log`'daki SMS metni de düz metin. Alan adı maskesi bunların içine giremiyor.

Bu özellik, değerin içinde IBAN, TC kimlik no, GSM ve kart numarasını bulup kopyada maskeler.

**Başarı ölçütü:**

- Alpha'da bir `payment_log` kaydının Markdown kopyasında TCKN ve IBAN görünmez, XML yapısı okunur kalır.
- `coupon_log`, `tjk_webhook_log` ve `altenar_api_log` kopyalarındaki seri numaraları ve id'ler maskelenmez.

## 2. Kararlar

Kullanıcıyla 2026-10-12'de tek tek karara bağlandı:

| Konu | Karar |
|---|---|
| Kapsam | Yalnız "Markdown olarak kopyala" çıktısı. JSON görünümündeki "değeri kopyala", ekran, linkler ve diğer kopyalama seçenekleri değişmez. |
| Desenlerin tanımı | Eklentiye gömülü dört tür, ayarlarda her biri için açma/kapama. Kullanıcı regex'i yok. |
| TCKN | Checksum zorunlu. |
| GSM | `+90`, `90`, `0` önekli biçimler ve öneksiz `5xxxxxxxxx`. |
| Kart | Luhn, kart ağı öneki ve uzunluk birlikte: Visa, Mastercard, Amex, Troy. |
| IBAN | Yalnız `TR`, checksum yok. |
| Maskenin biçimi | Eşleşen parça `***` olur, alanın geri kalanı kalır. |
| Varsayılan | Dört tür de açık: yeni kurulumda ve sürüm 1/2'den çevrilen ayarlarda. |
| Sınır | Eşleşmenin hemen önünde ve arkasında harf ya da rakam olmaz. |
| Yaklaşım | A: yalnız değer desenleri. |
| Eklenti sürümü | 1.0.0'a dahil. Ayar şeması sürüm 3'e çıkar. |

Reddedilen yaklaşım (B): alan adı maskesini XML elemanlarının ve özniteliklerinin içine uzatmak. Böylece `*identitynumber*` deseni `<identitynumber>` elemanını da maskelerdi. Ad ve soyad gibi değer deseni olmayan bilgileri de korurdu. Buna karşılık regex'le XML okumanın sınır durumlarını (CDATA, öznitelik, isim alanı) getirir. Prod'da XML'de ad ya da e-posta olduğu görülürse kendi spec'iyle ele alınır.

## 3. Alpha ölçümü (2026-10-12)

Alpha Kibana'da (7.17.26) her indexin son 400 kaydı tarandı, `sms_log`'da 3000 kayıt. Yalnızca alan yolları, biçimler ve sayılar okundu. Hiçbir değer yazılmadı.

| Index | Alanın biçimi | Bulgu |
|---|---|---|
| `payment_log` | request/response SOAP XML | TCKN `<identitynumber>`, `<ns1:identitynumber>` ve `<itb:identitynumber>` elemanlarında: 315 değer, hepsinin checksum'u geçerli. Response'taki `<ns1:Id>` elemanı da TCKN taşıyor: 234 değerin 232'si geçerli. IBAN `<iban>`, `<ns1:iban>` ve `<itb:iban>` elemanlarında: 82 değer, 3'ü boşluklu. |
| `coupon_log` | XML | Dört türden hiçbiri yok. 14 haneli `ns1:serialNumber` değerleri 400 kaydın 68'inde Luhn'dan şans eseri geçiyor. Bunlar 6 ve 7 ile başlıyor. |
| `tjk_webhook_log` | XML | Dört türden hiçbiri yok. |
| `altenar_api_log` | XML, header JSON | `Value` özniteliklerinde 136 tane 11 haneli sayı var, 4'ü TCKN checksum'unu geçiyor. 9 ile başlayan 18 haneli id'ler Luhn'dan geçiyor (32 tane). |
| `sms_log` | `context.content` düz metin | Dört türden hiçbiri yok. Rakam olarak yalnızca 1 ve 4 haneli diziler var. Numara `context.number` alanında öneksiz `5xxxxxxxxx` biçiminde. |
| `withdraw_log` | request çoğunlukla JSON, 33'ü XML | TCKN alanlarının yaklaşık yarısı checksum'dan geçmiyor (test verisi). Örneğin `CitizenshipNumber`'da 61 geçerli, 60 geçersiz; `mernis`'te 17 geçerli, 24 geçersiz. IBAN alanlarının yaklaşık %12'si mod-97'den geçmiyor. |
| `iys_log` | GSM kendi alanlarında | `TransactionID` 6420 değer. 232'si 11 haneli, bunların 24'ü TCKN checksum'unu geçiyor. 32'si `5xxxxxxxxx` biçiminde. |

**Diğer bulgular:**

- Hiçbir yerde gerçek kart numarası yok. Sağlayıcının maskelediği `123456******1234` biçimi de yok.
- `traceparent` ve `x-instana-s` gibi başlıklarda hex dizilerin içinde rakam dizileri var. Sınır kuralı (§4.1) bunları dışarıda bırakır.

## 4. Tanıma kuralları

### 4.1 Genel

- Her tür önce bir aday regex'iyle aranır, aday sonra kodda doğrulanır (önek, uzunluk, checksum).
- **Sınır:** Eşleşmenin hemen önündeki ve hemen arkasındaki karakter harf (`\p{L}`) ya da rakam (`\p{N}`) olamaz. Metnin başı ve sonu sınır sayılır.
  - Eşleşir: `<iban>TR…</iban>`, `"TR…"`, `Value="…"`, `No: …`, `…'dir`.
  - Eşleşmez:
    - `a12345678901b` gibi hex trace id'lerinin içi;
    - daha uzun bir rakam dizisinin parçası;
    - `TCKN12345678901` gibi harfe yapışık değer.
- **Ayırıcı:** Yalnız tek bir boşluk (U+0020) ya da, türün izin verdiği yerde, tek bir tire. Sekme, satır sonu ve art arda iki ayırıcı adayı böler.
- **Değişim:** Doğrulanan her eşleşme, ayırıcıları ve önekleri dahil, `***` ile değişir.

### 4.2 Türler

| Tür | Ayar adı | Kural |
|---|---|---|
| IBAN | `iban` | `TR` (büyük/küçük harf fark etmez) + 24 hane. Biçim: `TR` + 2 hane, sonra beş adet 4'lü grup, sonra 2 hane. Her 4'lü grubun ve son 2 hanenin önünde tek boşluk olabilir. Checksum yok. |
| Kart | `card` | Ayırıcılar atıldıktan sonra şu ağlardan birine uymalı: Visa (`4` ile başlar, 16 hane), Mastercard (`51`–`55` ya da `2221`–`2720`, 16 hane), Troy (`9792`, 16 hane), Amex (`34` ya da `37`, 15 hane). Luhn zorunlu. Herhangi iki hane arasında tek boşluk ya da tire olabilir. `*`, `X` ya da `•` içeren, zaten maskelenmiş biçimler rakam dizisi olmadığı için eşleşmez. |
| TCKN | `tckn` | 11 hane, ilk hane 0 değil, ayırıcı yok. `t = ((h1+h3+h5+h7+h9)·7 − (h2+h4+h6+h8)) mod 10` (negatif olmayan mod) `h10`'a, `(h1+…+h10) mod 10` `h11`'e eşit olmalı. |
| GSM | `gsm` | İsteğe bağlı önek: `+90`, `90` ya da `0`, arkasında isteğe bağlı tek boşluk ya da tire. Sonra `5xx`; parantez içinde de yazılabilir: `(5xx)`. Sonra `xxx`, `xx`, `xx` grupları gelir, aralarında isteğe bağlı tek boşluk ya da tire olabilir. Öneksiz ve ayırıcısız `5xxxxxxxxx` de dahil. |

### 4.3 Sıra

Türler şu sırayla aranır: IBAN, kart, TCKN, GSM. Bir türün bulduğu parça `***` olduğu için sonrakilere görünmez. Böylece:

- Boşluklu bir IBAN'ın 4'lü grupları kart numarası sanılmaz.
- `05xxxxxxxxx` biçimindeki 11 haneli bir GSM, TCKN kuralına (ilk hane 0 değil) takılmadan GSM olarak bulunur.
- Kart numarasının bir parçası TCKN ya da GSM sanılmaz.

### 4.4 Kabul edilen sınırlar

- Checksum'dan geçmeyen TCKN maskelenmez (Alpha'daki test numaraları).
- 11 haneli bir id TCKN checksum'unu tesadüfen tutturursa maskelenir. Aynısı 5 ile başlayan 10 haneli bir id için de geçerli: GSM olarak maskelenir. Alpha'da bunun örnekleri iys `TransactionID` ve altenar `Value`'da görüldü.
- Harfe yapışık yazılmış değerler kaçar (§4.1).
- 2^53'ten büyük sayılar, ham logun JSON'u tarayıcıda okunurken hassasiyetini kaybeder. Sayı olarak saklanan 16 haneli bir kart numarası Luhn'dan geçmeyebilir. Metin olarak saklananlarda bu sorun yok.
- Yabancı IBAN'lar, Türkiye dışı telefonlar, ad, e-posta ve adres bu özelliğin kapsamında değildir. Alan adı maskesi bunlar için geçerli kalır.

## 5. Maskelemenin uygulanması

- Yalnızca "Markdown olarak kopyala" çıktısına uygulanır (`buildMarkdown`).
- Taranmayanlar: başlık satırı (`_index` ve zaman) ve sondaki Kibana linki.
- **Sıra:** Alan adı maskesi önce çalışır. Adı eşleşen bir alanın ya da JSON anahtarının değeri bütünüyle `***` olur ve değer deseni ona ayrıca uygulanmaz.
- **Değerin türüne göre:**
  - **JSON metni:** `parseJsonText` ile çözülür. Değer desenleri içindeki her metin ve sayı yaprağına uygulanır, metin sonra yeniden serileştirilir. Anahtar adları taranmaz.
  - **Metin:** JSON değilse metnin tamamı `maskText` ile taranır. XML, düz metin ve bozuk JSON bu yoldan geçer.
  - **Sayı:** Ondalık yazımı (`String(value)`) taranır. Herhangi bir eşleşme varsa değer `"***"` metni olur, yoksa sayı olarak kalır.
  - **Boolean ve `null`:** dokunulmaz.
  - **Dizi ve nesne:** her eleman aynı kurallarla işlenir. Bugünkü `maskValue` yürüyüşü korunur.
- Kapalı türler aranmaz. Liste boşsa davranış bugünküyle aynıdır.

## 6. Ayar modeli (schemaVersion 3)

```ts
type ValueMaskKind = "iban" | "tckn" | "gsm" | "card";
interface Config {
  schemaVersion: 3;
  environments: Environment[];       // değişmedi
  actions: Action[];                 // değişmedi
  copy: {
    markdownFields: string[];
    maskPatterns: string[];
    valueMasks: ValueMaskKind[];     // açık türler; boş liste hepsi kapalı
  };
}
```

- **Doğrulama:**
  - `valueMasks` sürüm 3'te zorunludur.
  - Listede dört ad dışında bir değer varsa ayar reddedilir; hata yolu `copy.valueMasks.N`.
  - Aynı adın iki kez yazılması kabul edilir ve zararsızdır.
- **Dönüşüm:**
  - Sürüm 1 ve 2 ayarlar `parseConfig` içinde sürüm 3'e çevrilir.
  - `copy` bir nesneyse `copy.valueMasks` dört türle doldurulur. Eski sürümlerde bu alan yoktu.
  - İçe aktarılan dosyalar da `chrome.storage`'da duran ayarlar da çevrilir, hiçbiri boş ayara düşmez.
- **Varsayılan:** `emptyConfig()` dört türü açık getirir: `["iban", "tckn", "gsm", "card"]`.
- **Eski derleme:** Sürüm 2'yi bekleyen bir derleme, sürüm 3 dosyasını reddeder. Bilinmeyen alanı sessizce atmaz.
- **Kayıt sırası:** Ayarlar sayfası türleri hep bu sırayla yazar: `iban`, `tckn`, `gsm`, `card`.

## 7. Ayarlar sayfası

"Kopyalama ve maskeleme" bölümünde, mevcut iki metin kutusunun altında bir `fieldset` durur. Başlığı "Değerin içinde maskele".

- **Onay kutuları:**
  - IBAN (TR)
  - TC kimlik no
  - GSM (TR)
  - Kart numarası (Visa, Mastercard, Amex, Troy)
- **Açıklama satırı:** "Alan adından bağımsız olarak her değerin içinde aranır. Yalnızca Markdown kopyasına uygulanır."
- **Kaydetme:** Kutular bölümün mevcut "Kaydet" düğmesiyle diğer iki alanla birlikte kaydedilir.
- **Kayıtlı değeri izleme:** İçe aktarmadan sonra kutular kayıtlı değeri izler. Başka bölümlerdeki bir kayıt, kaydedilmemiş işaretleri silmez. Metin kutuları bugün de böyle çalışıyor.
- **Metinler:** Yeni metinlerin her biri `MessageKey` birleşimine, `public/_locales/en/messages.json` ve `public/_locales/tr/messages.json` dosyalarına eklenir.

## 8. Güvenlik ve gizlilik

- Tarama tamamen yereldir ve yalnız panoya yazılacak metin üzerinde çalışır. İzinler ve manifest değişmez.
- Regex'lerin hepsi sabit ve doğrusaldır. İç içe niceleyici yoktur, bu yüzden büyük XML'lerde felaket boyutunda geri izleme (catastrophic backtracking) olmaz.
- README, maskelemenin en iyi çaba (best effort) olduğunu ve paylaşmadan önce kopyaya göz atılması gerektiğini söyler.

## 9. Test stratejisi

### 9.1 Birim testleri (Vitest, önce test)

Bütün test değerleri sentetiktir. Gerçek kişi ya da hesap verisi kullanılmaz.

- **TCKN:** checksum'u hesaplanmış uydurma numaralar, örneğin `10000000146`.
- **Kart:** ağların yaygın test numaraları, örneğin `4111 1111 1111 1111`.
- **IBAN:** `TR` + uydurma 24 hane.
- **GSM:** `555` ile başlayan uydurma numaralar.

**`value-mask` testleri:**

- **Bulunanlar:** Her tür XML elemanında, XML özniteliğinde, düz metinde, JSON metninin içinde ve metnin başında ya da sonunda bulunur. Ayırıcılı ve ayırıcısız biçimler denenir.
- **GSM biçimleri:** `+90`, `90`, `0` önekleri, öneksiz yazım ve `(5xx)`.
- **Maskelenmeyenler:**
  - checksum'u tutmayan TCKN;
  - `0` ile başlayan 11 hane (TCKN olarak);
  - Luhn'dan geçen ama kart öneki taşımayan 14 haneli (coupon) ve 18 haneli (altenar) sayılar;
  - Luhn'dan geçmeyen Visa;
  - zaten maskelenmiş kart;
  - harfe ya da rakama yapışık değerler;
  - 12 haneli ve `90` ile başlayıp `5` ile devam etmeyen bir sayı;
  - art arda iki boşluklu grup.
- **Sıra:** Boşluklu IBAN içindeki gruplar kart sayılmaz. `05…` GSM olarak maskelenir.
- **Kapalı tür:** dokunulmadan kalır. Boş liste metni değiştirmez.

**Diğer testler:**

- **`mask` (`maskValue`):**
  - Alan adı maskesi önceliklidir.
  - Sayı yaprağı eşleşince `"***"` olur, eşleşmeyince sayı kalır.
  - JSON metninin içindeki metinler maskelenir.
  - Diziler ve iç içe nesneler işlenir.
  - Boolean ve `null` dokunulmaz.
- **`markdown`:** XML alanında değerler maskelenir, etiketler kalır. Başlık satırı ve link taranmaz.
- **`config`:**
  - Sürüm 1 ve 2'nin dönüşümü dört türü açar.
  - Sürüm 3'te alan eksikse ya da bilinmeyen bir tür varsa ayar reddedilir.
  - Boş liste kabul edilir.
  - `emptyConfig` dört türü açık getirir.
  - `examples/kibanatool-settings.json` geçerlidir.
- **`options/model` (`withCopySettings`):** türleri sabit sırayla yazar.

### 9.2 Uçtan uca testler (Playwright, 7.17 / 8.19 / 9.5)

- `docker/seed.mjs`: `app-002` kaydına sentetik bir XML `context.request` alanı eklenir. İçinde birer TCKN, IBAN, GSM ve kart numarası olur.
  - `app-001` seçilmedi, çünkü `tests/fixtures/*` onun ekran yakalaması. Böylece fixture'ların yenilenmesi gerekmez.
  - Seed ile `tests/e2e` arasındaki sözleşme birlikte güncellenir.
- **`copy.spec`:** `app-002`'nin Markdown kopyasında dört değer yerine `***` vardır. XML etiketleri yerinde kalır, sentetik değerlerin hiçbiri metinde geçmez.
- **`options.spec`:** Bir türün işareti kaldırılıp kaydedilir. Kayıtlı ayarda o tür yoktur, diğer üçü vardır.

## 10. Teslim ve belgeler

- **Dal:** `plan-5-value-masks`, ana checkout'ta, worktree yok.
- **Örnek ayar:** `examples/kibanatool-settings.json` sürüm 3 olur ve `valueMasks` içerir.
- **README:** Maskeleme bölümü değer desenlerini, dört türün kurallarını kısaca ve "en iyi çaba" uyarısını anlatır.
- **CHANGELOG, 1.0.0 altında:**
  - Değere göre maskeleme için yeni bir madde eklenir.
  - "Settings files are version 2" cümlesi şöyle değişir: "version 3; settings from earlier builds (versions 1 and 2) are converted when loaded".
- **CLAUDE.md:** "Docs" satırına Plan 5 eklenir. Uygulama sırasında yeni bir tuzak çıkarsa "Traps" bölümüne de eklenir.
- **Doğrulama kaydı:** `docs/verification/2026-10-plan-5.md`. Otomatik kontrollerin yanında iki elle kontrol içerir:
  - **M1:** Kullanıcının Chrome'unda kayıtlı sürüm 2 ayarları, yükseltmeden sonra dört tür açık olarak durur.
  - **M2:** Alpha'da bir `payment_log` kaydının Markdown kopyasında TCKN ve IBAN `***` olur.

## 11. Kapsam dışı

- Alan adı maskesinin XML elemanlarına uzatılması (yaklaşım B).
- Ad, e-posta ve adres tanıma.
- Yabancı IBAN'lar ve Türkiye dışı telefon numaraları.
- Kullanıcının kendi regex'i.
- JSON görünümünde ve ekranda maskeleme, JSON görünümünün "değeri kopyala" çıktısı.
- Kısmi maskeleme, örneğin son 4 hanenin bırakılması.
