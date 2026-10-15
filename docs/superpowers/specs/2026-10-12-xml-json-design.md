# XML'i JSON olarak gösterme ve kopyalama — Tasarım Dokümanı

- **Tarih:** 2026-10-12
- **Durum:** Onaylandı (kullanıcı, 2026-10-12)
- **Ana spec:** `2026-10-07-kibanatool-design.md`. Bu doküman oradaki §7.1 (alan düzleştirme), §7.2 (şablonlar), §7.4 (kopyalama), §7.5 (maskeleme) ve §7.6 (JSON görünümü) bölümlerini genişletir. Çelişen yerde bu doküman geçerlidir. Değere göre maskeleme `2026-10-12-value-masks-design.md`'dedir (Plan 5); bu doküman oradaki §5 uygulamasını değiştirir (§5.5).
- **Sürüm:** Eklentinin yayınlanmamış 1.0.0 sürümüne dahil edilir. Ayar şeması değişmez (`schemaVersion: 3`).

## 1. Amaç

`payment_log`, `coupon_log`, `tjk_webhook_log` ve `altenar_api_log`'daki `context.request`/`context.response` alanları XML metni. Kibana bunları tek satırlık, kaçışlı (`\"`) bir string olarak gösteriyor. Eklentinin JSON görünümü yalnızca JSON metnini açıyor. Logun tamamını JSON olarak kopyalamanın da bir yolu yok.

Bu özellik XML metnini JSON metni gibi bir yapıya çevirir:

- JSON görünümünde XML alanları ağaç olarak açılır.
- ⋯ menüsüne "JSON olarak kopyala" eklenir: logun içindeki XML ve JSON metinleri kaçışlı string olarak değil, iç içe JSON nesnesi olarak kopyalanır.
- Markdown kopyası, link şablonları ve koşullar da XML'in içine ulaşır.

**Başarı ölçütü:**

- Alpha'da bir `payment_log` kaydının JSON görünümünde `context.request` SOAP zarfı ağaç olarak açılır. "JSON olarak kopyala" çıktısında XML alanları iç içe nesnedir, TCKN ve IBAN `***` olur.
- `tjk_webhook_log` isteğindeki kaçışlı iç XML de nesneye açılır. `altenar_api_log`'daki attribute'lar `@` önekli anahtar olarak görünür.

## 2. Kararlar

Kullanıcıyla 2026-10-12'de tek tek karara bağlandı:

| Konu | Karar |
|---|---|
| JSON kopyası | ⋯ menüsüne yeni "JSON olarak kopyala" öğesi. Kibana'nın kendi JSON sekmesine dokunulmaz. |
| Namespace | Önek atılır (`soap:Envelope` → `Envelope`), `xmlns` bildirimleri atılır. |
| Attribute | `@` önekli anahtar (`@Id`). Attribute ile birlikte metin varsa metin `#text` anahtarına girer. |
| Değer türü | Hep metin (`"00"`, `"1500"`). Boş eleman `""`. |
| İç içe XML | Bir değerin metni XML ya da JSON ise o da açılır, en fazla 5 seviye. |
| Kopyanın kapsamı | `_index`, `_id` ve `_source`. |
| JSON metni | JSON kopyasında JSON metinleri de nesneye açılır. |
| Maskeleme | JSON kopyasında Markdown'daki gibi iki kat: alan adı desenleri ve değer desenleri. |
| Markdown | XML alanları da ```` ```json ```` bloğuna çevrilmiş olarak yazılır. |
| Ayrıştırıcı | `src/core/xml.ts`'te kendi küçük ayrıştırıcımız (yaklaşım A). |
| Alan yolu | XML, alan haritasına JSON metni gibi açılır. Şablonlar ve koşullar XML yollarını kullanabilir. |
| Ayar | Yok, dönüşüm hep açık. |
| Tekrar eden eleman | İki ve daha fazlaysa dizi, tekse değer. |
| `#text` ve şablonlar | Yer tutucu deseni `#` karakterini de kabul eder. |
| XML tanımı | Tek kök, baştan sona düzgün biçimli. `<?xml` bildirimi şart değil. |
| Sınırlar | Eleman derinliği en fazla 100. Boyut sınırı yok, ayrıştırıcı doğrusal. |
| Seed | e2e için app-002'ye sentetik bir XML yanıtı eklenir (§8.2). |
| Store listing | Bu özellik için EN ve TR birer cümle eklenir. |
| Eklenti sürümü | 1.0.0'a dahil. |

**Reddedilen yaklaşımlar:**

- **B: Tarayıcının `DOMParser`'ı.** Daha az kod. Ama `src/core`'a tarayıcı API'si girer, birim testler happy-dom'la koşar. happy-dom CDATA'yı Chrome'dan farklı işliyor (hata sayıyor) ve namespace öneki bildirilmemiş XML parçalarını reddediyor (seed'deki `PAYMENT_XML` böyle).
- **C: `fast-xml-parser` bağımlılığı.** Pakete 30–40 KB ekler; ihtiyacımız küçük bir alt küme.
- **Kibana'nın JSON sekmesindeki kopyala butonunu değiştirmek.** Üç sürümde farklı bileşen; Kibana'nın arayüzüne müdahale etmek "Kibana'yı asla bozma" kuralına ters.

Plan 5 spec §2'de reddedilen "alan adı maskesini XML'in içine uzatmak" yaklaşımı, regex'le XML okumanın sınır durumları yüzünden reddedilmişti. Bu doküman XML'i gerçek bir ayrıştırıcıyla yapıya çevirdiği için alan adı desenleri XML eleman adlarına artık kendiliğinden ulaşır (§5.5).

## 3. Alpha ölçümü (2026-10-12)

Alpha Kibana'da (7.17.26) her indexin son 300 kaydı tarandı. Yalnızca alan yolları, biçimler ve sayılar okundu. Hiçbir değer yazılmadı.

| Index | Alan | Bulgu |
|---|---|---|
| `payment_log` | request, response | SOAP zarfı. Namespace önekli elemanlar (istekte 8 farklı önek), `xmlns` dışında attribute yok. Response'ların 299/300'ünde başında sıfır olan sayısal değerler var. 1 kayıtta tekrar eden kardeş eleman. En derin 7 seviye, en büyük ~1,1 KB. |
| `coupon_log` | request, response | SOAP, attribute yok. |
| `tjk_webhook_log` | request | SOAP. 300/300 kayıtta bir elemanın metni kaçışlı (`&lt;?xml…`) ikinci bir XML belgesi; iç belge 2 seviye, önek ve attribute yok. |
| `altenar_api_log` | request, response | SOAP ve namespace yok. Her kayıtta attribute var (eleman başına en çok 2), hepsi alt elemanı olan ya da yalnız attribute'tan oluşan elemanlarda. Attribute ile alt eleman adları çakışmıyor. İstekte `<?xml` bildirimi yok. En derin 8 seviye, en büyük ~2,1 KB. |
| `withdraw_log` | request, response | 5–6 kayıt SOAP; 1 response HTML hata sayfası (geçerli XML değil). |

Hiçbir yerde CDATA, karışık içerik, attribute ile metni birlikte taşıyan eleman, JSON metninin içine gömülü XML ya da önünde düz metin olan XML yok. `iys_log`, `sms_log`, `filebeat-*` ve `race_log*`'ta XML yok.

## 4. XML'in tanınması ve çevrilmesi (`src/core/xml.ts`)

Saf mantık; tarayıcı API'si kullanmaz. Dışa açılan tek fonksiyon:

```ts
/** `text` düzgün biçimli tek kökü olan bir XML belgesiyse `{ <kökün yerel adı>: değer }`, değilse undefined. */
export function parseXml(text: string): Record<string, unknown> | undefined;
```

### 4.1 Ne zaman XML sayılır

- Kırpılmış (`trim`) metin `<` ile başlar ve baştan sona tek bir kök eleman olarak düzgün biçimlidir.
- Kökün önünde ve arkasında yalnız `<?xml…?>` bildirimi, başka `<?…?>` işleme talimatları, yorumlar (`<!-- … -->`) ve boşluk olabilir.
- Aşağıdakilerden biri varsa XML sayılmaz, metin olduğu gibi kalır:
  - DOCTYPE (`<!DOCTYPE …>`).
  - Beş hazır entity (`&amp; &lt; &gt; &quot; &apos;`) ve sayısal entity (`&#65;`, `&#x41;`, geçerli bir Unicode kod noktası) dışında bir `&…;`, ya da `;` ile bitmeyen bir `&`.
  - Kapanmayan, uyuşmayan ya da fazladan kapanan etiket.
  - Tırnaksız attribute değeri, attribute değerinde `<`, aynı elemanda aynı nitelikli adla iki attribute.
  - Kökün dışında boşluk olmayan metin, birden çok kök, kökün dışında CDATA.
  - Geçersiz eleman ya da attribute adı: ad harf, `_` ya da `:` ile başlar; harf, rakam, `-`, `.`, `_`, `:` ile devam eder (Unicode harfler dahil). Önek atıldıktan sonra kalan ad da harf ya da `_` ile başlamalıdır; boş kalan (`<a:>`) ya da rakamla başlayan (`<a:1>`) ad geçersizdir, çünkü JS nesneleri sayıya benzeyen anahtarları öne alır (kullanıcı onayı, 2026-10-13, plan incelemesi).
  - 100 seviyeden derin eleman iç içeliği.
- Namespace önekinin bildirilmiş olması gerekmez (`<ns1:a>` bildirimsiz de olur), çünkü önekler atılır.

### 4.2 Çevirme kuralları

- **Sonuç:** `{ "<kökün yerel adı>": <kökün değeri> }`.
- **Adlar:** Eleman ve attribute adlarında son `:`'ye kadar olan önek atılır (`soap:Envelope` → `Envelope`, `xsi:nil` → `@nil`). `xmlns` ve `xmlns:*` attribute'ları atılır.
- **Alt elemanı ve attribute'u olmayan eleman:** metnine dönüşür. Entity'ler çözülür, CDATA bölümleri metne katılır, boşluklar olduğu gibi kalır. Boş eleman (`<a/>`, `<a></a>`) `""` olur. Bir alt eleman, yorum ya da CDATA ile bölünen metnin birleşmesi için aşağıdaki "Metin parçalarının sınırı" kuralına bakın.
- **Diğer elemanlar nesneye dönüşür.** Anahtar sırası:
  1. `@<ad>`: attribute'lar, belgedeki sırayla. Değerde entity'ler çözülür, boşluk normalleştirmesi yapılmaz.
  2. Alt elemanlar, adlarının ilk göründüğü sırayla.
  3. `#text`: yalnız boşluktan oluşmayan bir metin varsa.
     - Alt elemanı yoksa (yalnız attribute'u var): elemanın metni olduğu gibi.
     - Alt elemanı varsa (karma içerik): yalnız boşluktan oluşan metin parçaları atılır, kalanlar sırayla birleştirilir.
- **Metin parçalarının sınırı:** Bir elemanın metni bir alt eleman, yorum, CDATA ya da işleme talimatıyla bölünmüşse parçalar birleştirilirken, iki tarafta da boşluk olmayan bir karakter varsa araya tek boşluk girer: `<p>Kimlik<br/>10000000146</p>` → `"Kimlik 10000000146"`. Böylece değer maskeleri sayının sınırını görmeye devam eder (son incelemenin bulgusu üzerine kullanıcı kararı, 2026-10-13).
- **Tekrar:** Aynı anahtara ikinci bir değer düştüğünde (aynı adlı kardeş elemanlar ya da önek atılınca aynı ada düşen attribute'lar) anahtarın değeri belge sırasıyla bir diziye dönüşür. Anahtarın nesnedeki yeri ilk göründüğü yerdir.
- **Değer türü:** Bütün değerler metindir. Sayı, boolean ya da `null` tahmini yapılmaz.
- **Atılanlar:** yorumlar, `<?…?>` talimatları, `<?xml` bildirimi.

### 4.3 Sınırlar ve güvenlik

- Ayrıştırıcı özyineleme kullanmaz (açık bir yığınla çalışır) ve doğrusaldır: 1 MB'lık bir XML bir saniyenin çok altında çevrilir. Boyut sınırı yoktur.
- Eleman derinliği 100'ü aşarsa XML sayılmaz (§4.1), çünkü JSON görünümü, düzleştirme ve maskeleme sonucu özyinelemeyle dolaşır.
- Dış entity, DTD ya da entity genişletmesi yoktur, bu yüzden XXE ve entity bombası mümkün değildir.
- Eleman ya da attribute adı `__proto__` veya `constructor` olsa bile sonuçtaki nesnenin kendi anahtarı olur; hiçbir nesnenin prototipi değişmez.
- `parseXml` hata fırlatmaz; ayrıştırılamayan her metin için `undefined` döner.

### 4.4 Örnek

```xml
<Bets><Bet Id="7" Type="S"><Sel>A</Sel></Bet><Bet Id="8" Type="S"/><Amount currency="TRY">150</Amount></Bets>
```

```json
{ "Bets": { "Bet": [ { "@Id": "7", "@Type": "S", "Sel": "A" }, { "@Id": "8", "@Type": "S" } ], "Amount": { "@currency": "TRY", "#text": "150" } } }
```

## 5. Uygulama: yapılı metin

### 5.1 Tek giriş noktası (`src/core/fields.ts`)

- `parseJsonText` yerine `parseStructuredText(text)` gelir: metin JSON nesnesi ya da dizisiyse onu (bugünkü kural), değilse `parseXml(text)` sonucunu döner. İkisi de değilse `undefined`. Bugünkü dört kullanıcısı (`flattenInto`, `json-tree.jsonTextFields`, `markdown.fieldLines`, `mask.maskValue`) buna geçer.
- Yeni `expandStructured(value)`: bir değerin içindeki yapılı metinleri iç içe açar. Nesne ve dizileri dolaşır; `parseStructuredText`'in tanıdığı her string yaprağın yerine ayrıştırılmış değeri koyar ve onun içinde de devam eder. Açma derinliği bugünkü `MAX_JSON_DEPTH` (5) ile sınırlıdır: bir değerin içinde art arda en fazla 5 metin ayrıştırılır, daha derindeki metin string kalır.

### 5.2 Alan haritası ve şablonlar

- `flattenInto` yapılı metni `parseStructuredText` ile açar. XML de JSON metni gibi alt yollara düzleşir:
  - `context.request.Envelope.Body.pay.identitynumber`
  - attribute: `….Bet.@Id`
  - metin: `….Amount.#text`
- Diziler bugünkü gibi yaprak kalır: tekrar eden elemanın içi adreslenemez, `{….Bet}` dizinin `formatValue` çıktısını verir.
- Link şablonları, Discover sorgu şablonları, koşullar, Markdown alan listesi (`copy.markdownFields`) ve ayarlar sayfasındaki önizleme (`src/options/preview.ts`) bu yolları kendiliğinden kullanır.
- `src/core/template.ts`'teki yer tutucu deseni `#` karakterini de kabul eder: `/\{([A-Za-z0-9_.@#-]+(?:\|[A-Za-z0-9_.@#-]+)*)\}/g`.

### 5.3 JSON görünümü

- `jsonTextFields`, metni JSON ya da XML olan `_source` alanlarını listeler. Her alan kaynağını taşır: `{ path, value, source: "json" | "xml" }`. `value`, `expandStructured` ile tamamen açılmış değerdir.
- "JSON" butonu logda JSON ya da XML metni olan bir alan varsa görünür (bugünkü kural, XML eklenmiş haliyle).
- Alan listesinde XML'den gelen alanın yanında `XML` etiketi görünür: `context.request · XML`. Etiket iki dilde de aynıdır, i18n anahtarı yoktur.
- **Davranış değişikliği:** JSON metninin içindeki JSON metni bugün ağaçta string olarak görünüyor; artık o da alt ağaç olarak açılır.
- **"Yolu kopyala":** `@` ya da `#` ile başlayıp devamı tanımlayıcı olan anahtarlar nokta ile yazılır (`.@Id`, `.#text`). Kural `^[@#]?[A-Za-z_$][\w$]*$`. Diğer anahtarlar bugünkü gibi köşeli parantezle yazılır. Böylece kopyalanan yol şablona doğrudan yapıştırılabilir.

### 5.4 Markdown kopyası

- Ham metni JSON ya da XML olan alan ve nesne içeren dizi (bugünkü kural) ```` ```json ```` bloğuna yazılır. Bloktaki değer `expandStructured` ile açılmış, sonra maskelenmiş değerdir (§5.5).
- Bloğun içindeki iç içe yapılı metinler de açılır. Bugün JSON içindeki JSON metni blokta kaçışlı string olarak kalıyor; bu değişir.
- **Alan listesi** (`copy.markdownFields`): Listedeki bir yolun herhangi bir üst yolu bir desene uyuyorsa o yol da `***` olur (JSON kopyasıyla aynı). JSON ya da XML metninin içindeki bir elemanın yolu listelenirse altındaki en dıştaki yollar yazılır; onların altındaki JSON ya da XML metni tek blok kalır (son incelemenin bulguları üzerine kullanıcı kararı, 2026-10-13).
- Başlık satırı ve link değişmez.

### 5.5 Maskeleme (`src/core/mask.ts`)

- Kopyalar (Markdown ve JSON) önce değeri `expandStructured` ile açar, sonra `maskValue` ile açılmış yapı üzerinde maskeler.
- `maskValue`'nun string dalı, açma sınırının (5) ötesinde hâlâ metin olarak kalan JSON ya da XML'i bütünüyle `***` yapar; diğer metinlere yalnız `maskText` uygular. Böylece maskeler sınırda durmaz ve kopya büyümez (son incelemenin bulgusu üzerine kullanıcı kararı, 2026-10-13; uygulamanın ilk halindeki "ayrıştır ve JSON metni olarak geri yaz" kuralının yerini aldı).
- Alan adı desenleri yapının içindeki yollarla eşleştirilir (bugün JSON metni için olduğu gibi `<alan yolu>.<anahtar>`). Böylece XML eleman adlarına da ulaşır: `*iban*` → `context.request.Envelope.Body.pay.iban` → `***`. Attribute yolu `….Bet.@Id`'dir.
- Değer desenleri (Plan 5) metin, attribute ve `#text` yapraklarını tarar. Eşleşen sayı `"***"` olur (bugünkü kural).

## 6. "JSON olarak kopyala"

- ⋯ menüsünün sırası: "Markdown olarak kopyala", **"JSON olarak kopyala"**, "Logun linkini kopyala", "Görünümü sabit zamanla kopyala".
- Yeni saf fonksiyon, yeni dosya `src/core/json-copy.ts`:

  ```ts
  export function buildJson(hit: RawHit, maskPatterns: string[], valueMasks: readonly ValueMaskKind[]): string;
  ```

- **Çıktı:** `JSON.stringify({ _index, _id, _source }, null, 2)`.
  - `_source` alanları logdaki sırasıyla yazılır, sıralanmaz. `_source` yoksa `{}` yazılır. Hit'in diğer anahtarları (`_version`, `fields` vb.) yazılmaz.
  - `_source`'un her üst düzey alanı `expandStructured` ile açılır, sonra `maskValue(<alan adı>, …)` ile maskelenir: alan adı desenleri `_source` yollarıyla eşleşir, değer desenleri her metin ve sayı yaprağını tarar.
  - `_index` ve `_id` maskelenmez ve taranmaz (Markdown'daki başlık ve link gibi).
- `copy.markdownFields` bu kopyayı etkilemez; her zaman `_source`'un tamamı kopyalanır.
- Hata olursa `CopyMenu` bugünkü gibi yakalar, "Kopyalanamadı" bildirimi gösterilir, Kibana etkilenmez.

## 7. Arayüz metinleri

| Anahtar | EN | TR |
|---|---|---|
| `menuCopyJson` | Copy as JSON | JSON olarak kopyala |

Anahtar iki `messages.json`'a eklenir. `MessageKey` `en/messages.json`'dan türetildiği için `src/i18n.ts` değişmez; `tests/unit/i18n.test.ts` Türkçenin eşit kaldığını denetler.

## 8. Testler

### 8.1 Birim testler

- **`tests/unit/core/xml.test.ts` (yeni):**
  - §4.2'deki her kural: önek atma, `xmlns` atma, `@attr`, `#text` (attribute + metin ve karma içerik), tekrar eden eleman ve önekten sonra çakışan attribute → dizi, boş eleman, beş entity ve sayısal entity, CDATA, yorum ve `<?…?>` atma, `<?xml` bildirimi olan ve olmayan belge, boşlukların korunması.
  - Metin kalması gerekenler (`undefined`): DOCTYPE, tanımsız entity ve çıplak `&`, uyuşmayan, kapanmayan ve fazladan kapanan etiket, tırnaksız attribute, kök dışında metin, iki kök, HTML hata sayfası, `<a:>`, 101 seviye iç içelik (100 seviye geçerli).
  - `__proto__` ve `constructor` adlı eleman ve attribute: kendi anahtar olur, prototip değişmez.
  - 1 MB'lık XML bir saniyenin çok altında çevrilir.
- **Değişen testler:**
  - `fields.test.ts`: `parseStructuredText`; alan haritasında XML yolları, `@` ve `#text` yolları; `expandStructured` ile XML içinde XML ve JSON; 5 seviye sınırı.
  - `template.test.ts`: `{….#text}` yer tutucusu.
  - `json-tree.test.ts`: XML alanı `source: "xml"` ile listelenir; iç içe açma; `.@Id` ve `.#text` yolları.
  - `markdown.test.ts`: XML alanı json bloğuna çevrilir; XML eleman adı alan adı deseniyle maskelenir. `markdown.test.ts:126`'daki "XML etiketleri korunur" beklentisi kasıtlı olarak json bloğuna döner.
  - `mask.test.ts`: maskeleme açılmış yapı üzerinde çalışır.
- **`tests/unit/core/json-copy.test.ts` (yeni):** çıktının biçimi ve girintisi, `_source` sırası, XML ve JSON metninin açılması, iki kat maskeleme, `_index`/`_id`'ye dokunulmaması, `_source` olmayan hit.

### 8.2 Seed (`docker/seed.mjs`)

app-002'ye sentetik bir `context.response` eklenir. Seed ile `tests/e2e` birlikte değişir:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Result code="00">
      <Bet Id="7" Type="S"><Sel>A</Sel></Bet>
      <Bet Id="8" Type="S"/>
      <Amount currency="TRY">150</Amount>
      <Payload>&lt;?xml version="1.0"?&gt;&lt;race&gt;&lt;runId&gt;42&lt;/runId&gt;&lt;/race&gt;</Payload>
    </Result>
  </soap:Body>
</soap:Envelope>
```

Beklenen dönüşüm:

```json
{ "Envelope": { "Body": { "Result": {
  "@code": "00",
  "Bet": [ { "@Id": "7", "@Type": "S", "Sel": "A" }, { "@Id": "8", "@Type": "S" } ],
  "Amount": { "@currency": "TRY", "#text": "150" },
  "Payload": { "race": { "runId": "42" } }
} } } }
```

Kapsadığı kurallar: `xmlns` bildirimi ve önek atma, attribute, tekrar eden eleman → dizi, yalnız attribute'tan oluşan eleman, `#text`, kaçışlı iç içe XML. Değerlerin hiçbiri değer desenlerine takılmaz. `PAYMENT_XML` (`context.request`) değişmez.

### 8.3 E2E (Kibana 7.17, 8.19, 9.5)

- **`copy.spec.ts`:**
  - app-002'nin Markdown beklentisi: `context.request` artık maskelenmiş değerleriyle bir json bloğu; `context.response` §8.2'deki yapının json bloğu.
  - Yeni senaryo "JSON olarak kopyala": app-002'nin çıktısı ayrıştırılır; `_index`, `_id`, `_source.context.request` (dört değer `***`, `amount` `"150"`) ve `_source.context.response` (§8.2) birebir karşılaştırılır.
- **`json.spec.ts`:** app-002'de alan listesinde `context.request · XML` ve `context.response · XML` görünür; `context.response` açılınca ağaçta `runId` bulunur.
- **Menü sırası:** yeni öğe 2. sıraya girdiği için `copyFromMenu(…, 1)` (log linki) 2'ye, `copyFromMenu(…, 2)` (sabit zamanlı görünüm) 3'e kayar: `copy.spec.ts` (satır 38 ve 47) ve `spaces.spec.ts` (satır 13).

### 8.4 Elle kontrol (kullanıcı, Alpha, gerçek veri)

- **M1:** `payment_log`, `tjk_webhook_log` ve `altenar_api_log` kayıtlarında JSON görünümü XML alanlarını ağaç olarak açar; tjk'daki iç XML de açılır, altenar'da `@` attribute'ları görünür.
- **M2:** Bir `payment_log` kaydında "JSON olarak kopyala" ve "Markdown olarak kopyala": XML iç içe nesne olarak gelir, TCKN ve IBAN `***` olur.

## 9. Belgeler

- **README:** JSON görünümü XML'i de açar; ⋯ menüsünde "JSON olarak kopyala"; şablonlarda XML yolları (`@`, `#text`); maskeleme XML eleman adlarına da ulaşır.
- **CHANGELOG** (1.0.0): XML'i JSON olarak gösterme ve kopyalama.
- **CLAUDE.md:** `src/core/` satırında düzleştirme "JSON ve XML metnini de açar", `xml.ts` eklenir. Tuzaklara: yer tutucu deseni `#` içerir; XML değerleri hep metindir.
- **`docs/store-listing.md`:** EN ve TR açıklamaya birer madde, örn. EN "Read XML request and response bodies as a JSON tree too, and copy the whole log as JSON with XML and JSON text expanded." TR "XML istek ve yanıt gövdelerini de JSON ağacı olarak okuyun, logun tamamını XML ve JSON metinleri açılmış halde JSON olarak kopyalayın."
- **`docs/verification/2026-10-plan-6.md`:** doğrulama kaydı.

## 10. Kapsam dışı

- Kibana'nın kendi JSON sekmesi, dokümanı ve tablosu.
- Önünde düz metin olan XML (`Request: <…>`) ve HTML.
- Değerlerin sayı, boolean ya da `null` türüne çevrilmesi.
- JSON'dan XML'e çevirme, "XML olarak kopyala".
- Dönüşümü kapatan bir ayar.
- Şablonlarda dizi elemanlarını adreslemek (`Bet[0]`).
- Attribute değerlerinde XML'in boşluk normalleştirmesi.
