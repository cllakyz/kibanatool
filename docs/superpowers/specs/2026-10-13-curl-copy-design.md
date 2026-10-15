# İsteği cURL komutu olarak kopyalama — Tasarım Dokümanı

- **Tarih:** 2026-10-13
- **Durum:** Onaylandı (kullanıcı, 2026-10-13)
- **Ana spec:** `2026-10-07-kibanatool-design.md`. Bu doküman oradaki §7.4 (kopyalama) ve §7.5 (maskeleme) bölümlerini genişletir. "JSON olarak kopyala" `2026-10-12-xml-json-design.md` §6'dadır (Plan 6); cURL aynı maskeleme kurallarını kullanır ama metinleri açmaz (§5.6). Çelişen yerde bu doküman geçerlidir.
- **Sürüm:** Eklentinin yayınlanmamış 1.0.0 sürümüne dahil edilir. Ayar şeması değişmez (`schemaVersion: 3`).

## 1. Amaç

`player_action_log` (API) ve `user_action_log` (backoffice) her HTTP isteğinin method'unu, URL'sini, header'larını, body'sini ve query'sini tutuyor. Bir isteği yeniden çalıştırmak için bunları elle bir araya getirmek gerekiyor: header'lar ve body kaçışlı JSON metni, query URL'den ayrı, form body'leri JSON'a çevrilmiş.

Bu özellik ⋯ menüsüne "cURL olarak kopyala" ekler. Kopyalanan komut isteği tekrar gönderir. Hassas header'lar ve değerler diğer kopyalardaki kurallarla `***` olur; kullanıcı kendi token'ını yazıp çalıştırır.

**Başarı ölçütü:**

- Alpha'da bir `player_action_log` GET kaydından kopyalanan komutta `authorization` ve `platform-token` `***` olur, proxy header'ları yoktur. Kullanıcı kendi token'ını yazınca istek aynı yanıtı verir.
- Alpha'da bir `user_action_log` form POST'undan kopyalanan komutta body `searchForm[email]=…` biçimindedir, `cookie` ve `_token` `***` olur.
- Method ve URL'si olmayan loglarda menüde öğe görünmez.

## 2. Kararlar

Kullanıcıyla 2026-10-13'te tek tek karara bağlandı:

| Konu | Karar |
|---|---|
| Görünüm | ⋯ menüsünde yeni öğe; yalnızca uygun logda (§4) görünür. |
| Alanlar | Sabit adlar, ayar yok: önce `context.` öneki, sonra kök. |
| Maske biçimi | `***`, diğer kopyalarla aynı: `-H 'authorization: ***'`. |
| Body ve query maskesi | Diğer kopyalarla aynı kurallar: alan adı desenleri ve değer içi maskeler. |
| URL maskesi | Değer içi maskeler URL'ye de uygulanır (diğer kopyalar `context.url`'yi zaten böyle maskeliyor). |
| Atılan header'lar | Sabit taşıma/proxy listesi (§5.4). `accept-encoding` yerine `--compressed`. Son incelemeden sonra (2026-10-13) Symfony'nin `php-auth-*` header'ları da listeye girdi. |
| Varsayılan desenler | Son incelemeden sonra (2026-10-13) `DEFAULT_MASK_PATTERNS`'a `*php-auth-*` eklendi; üç kopyada da geçerli. Yalnız yeni kurulumlar ve boş ayarlar alır, kayıtlı ayarlar dönüştürülmez. `*email*` eklenmedi. |
| Form body | İçerik türüne göre: JSON, form-urlencoded, multipart ayrı yazılır (§5.5). |
| Kabuk | bash/zsh, çok satırlı (Chrome'un "Copy as cURL (bash)" biçimi). |
| Menü sırası | Markdown, JSON, **cURL**, log linki, sabit görünüm. |
| Yaklaşım | A, plan yazılırken uyarlandı: istek parçaları kendi yollarıyla, diğer kopyalarla aynı kurallarla maskelenir; içlerindeki metinler metin kalır (§5.6, §7). |
| İç metin | Metin metin kalır (plan yazılırken, 2026-10-13): JSON metni içinde maskelenip JSON metni olarak, HTML/XML metni olduğu gibi, yalnız değer içi maskelerle yazılır. |
| Seed | `app_log`'a Symfony biçiminde iki log (§8.2). |
| Eklenti sürümü | 1.0.0'a dahil. |
| Belgeler | README, CHANGELOG ve store listing (EN ve TR). |

**Reddedilen yaklaşımlar:**

- **A'nın ilk hali: "JSON olarak kopyala"nın açılmış, maskeli kaynağından okumak.** Plan yazılırken görüldü: o yol değerlerin içindeki JSON ve HTML/XML metinlerini de nesneye açar, böylece komut sunucuya orijinalinden farklı veri gönderir (§3). Kullanıcı "metin metin kalsın" dedi; parçalar artık kendi yollarıyla maskelenir (§5.6).
- **İç metinleri `***` yapmak.** En basit ve en güvenli yol, ama kampanya, sözleşme ve bahis tipi ayarı istekleri bu haliyle tekrar çalıştırılamaz.
- **Ayarlarda alan yolları.** `schemaVersion` 4, dönüştürme ve seçenekler sayfası gerektirir. Bugünkü iki log için gereksiz; başka bir log biçimi çıkarsa sonra eklenir.
- **Windows kabukları.** PowerShell ve cmd tırnaklaması ayrı kod ve test ister; ekip bash/zsh kullanıyor.

## 3. Ölçüm (2026-10-13)

Logları yazan kod: `api/src/EventListener/PlayerActionListener.php` ve `admin/src/EventListener/UserActionListener.php` (Bitalih). Alpha Kibana'da (7.17.26) iki indexin son 500 kaydı tarandı; yalnızca alan adları, header adları ve sayılar okundu, hiçbir değer yazılmadı.

- **Alanlar:** `context.method`, `context.url` (şema + host + yol; query hiç yok), `context.headers`, `context.body`, `context.query`. Son üçü JSON metni.
- **Header'lar:** Symfony `headers->all()`: küçük harfli ad → dizi. 500 + 500 kayıtta her dizi tek elemanlı.
- **Body:** `json_encode($request->getPayload()->all())`. Boşsa `[]`. Form body'leri de JSON'a çevrilmiş halde; iç içe alanlar (`searchForm[email]`) nesne olarak duruyor.
- **Query:** `json_encode($request->query->all())`. Boşsa `[]`. İç içe değerler var (`user_action_log`'da 138 kaydın 126 değeri nesne).

| | player_action_log | user_action_log |
|---|---|---|
| Method | GET 415, POST 83, DELETE 2 | GET 295, POST 205 |
| POST içerik türü | JSON 83 | form-urlencoded 147, JSON 45, multipart 8, yok 5 |
| Hassas header | `authorization` (500), `platform-token` (500), `cookie` (1) | `cookie` (500) |
| Proxy/CDN header'ı | `cf-*`, `cdn-loop`, `x-forwarded-for/proto`, `ssl`, `client-source-port`, `x-client-source-port`, `x-php-ob-level`, `host`, `connection`, `content-length` | `x-forwarded-*`, `x-real-ip`, `cf-*` (139), `ssl`, `x-php-ob-level`, `host`, `content-length` |
| URL şeması | https 500, tek host | https 453, http 47 (`x-forwarded-proto` ile aynı), 4 host |

URL'ler header'larla tutarlı; URL olduğu gibi kullanılabilir.

**Parçaların içindeki metinler** (plan yazılırken, iki indexin son 2000 kaydı, yalnızca alan adları ve sayılar):

- `cf-visitor` header'ı JSON metni: `player_action_log`'da her kayıtta, `user_action_log`'da 927 kayıtta. Atılan header'lardan (§5.4).
- `user_action_log` form body'lerinde HTML metni (`campaign.rules`, `campaign.shortDescription`, `contract.text`, `important_notification.content`, `author_comment_manage.content`; yaklaşık 26 değerin çoğu geçerli XML) ve JSON metni (`bet_type_config.statusMap`, `calcParams`, `attributeSchema`, `items`, `dynamic_setting.odd_boost_tiers`; 15 değer).

## 4. Algılama ve okuma

**Önek:** Önce `context.`, sonra kök (`""`) denenir. Bir önekte `method` ve `url` ikisi de varsa o önek kullanılır; `headers`, `body` ve `query` aynı önekten okunur ve üçü de isteğe bağlıdır.

**Uygun log:** `method` boş olmayan bir metin ve `url` `http:` ya da `https:` şemalı geçerli bir adres. Uygunluk **ham** `_source`'tan belirlenir; komut maskeli kaynaktan yazılır (§5.6). Göreli URL'ler (`/v1/coupons`) uygun değildir, çünkü yeniden çalıştırılamaz.

**Okuma kuralları** (§5.6'ya göre maskelenmiş parçalarda):

- **Header'lar:** nesne olmalı (alanın kendi JSON metni açılmış olur). Değer metin ya da sayıysa tek `-H`; dizi ise her metin/sayı eleman için ayrı `-H`. `null` ve boş dizi atlanır. Nesne değilse header yazılmaz.
- **Body:** `undefined`, `null`, `""`, `[]` ve `{}` "body yok" sayılır.
- **Query:** nesne olmalı; boşsa ya da nesne değilse eklenmez.

**Bilinen eksik:** Kök düzeyde noktalı anahtarlar (`{"context.url": …}`) okunmaz; JSON kopyasındaki park edilmiş durumla aynı.

## 5. Komutun yazılışı (`src/core/curl.ts`)

### 5.1 Düzen ve tırnaklama

- Her argüman tek tırnak içinde: `'…'`. İçerideki `'` karakteri `'\''` olur. Başka kaçış yok; satır sonları tırnak içinde olduğu gibi kalır.
- İlk satır `curl '<url>'`, sonraki her seçenek iki boşlukla girintili ayrı bir satırda. Son satır hariç her satır ` \` ile biter.
- Sıra: URL, `--globoff`, `-X`, `-H`'ler (logdaki sırayla), body seçenekleri, `--compressed`.

### 5.2 Method

Method büyük harfe çevrilir. `-X '<METHOD>'` yalnızca curl'ün kendi tahmini yanlış olacaksa yazılır: body'siz GET ve body'li POST'ta yazılmaz; diğer her durumda (DELETE, PUT, PATCH, body'siz POST, body'li GET …) yazılır.

### 5.3 URL ve query

- Query, PHP `http_build_query` kurallarıyla kodlanır: iç içe nesne `a[b]=c`, dizi `a[0]=x&a[1]=y`, `true` → `1`, `false` → `0`, `null` ve boş nesne/dizi atlanır, sayı metne çevrilir. Anahtar parçaları ve değerler `encodeURIComponent` ile kodlanır; köşeli parantezler kodlanmaz.
- Kodlanan query URL'ye `?` ile, URL'de zaten `?` varsa `&` ile eklenir.
- Son URL `[`, `]`, `{` ya da `}` içeriyorsa `--globoff` eklenir (curl bunları aralık olarak okur).

### 5.4 Header'lar

Şu header'lar atılır (ad büyük-küçük harf duyarsız):

- `host`, `content-length`, `connection`, `accept-encoding`
- `forwarded`, `x-forwarded-*`, `x-real-ip`
- `cf-*`, `cdn-loop`, `x-php-ob-level`
- `php-auth-*`: Symfony, Basic ya da Digest `Authorization` gördüğünde `headers->all()` çıktısına `php-auth-user`, `php-auth-pw` ve `php-auth-digest` ekler. Bunları sunucu üretir, istemci göndermez; `php-auth-pw` ayrıca şifrenin açık halidir.

Logda `accept-encoding` varsa komuta `--compressed` eklenir. Body `--form-string` ile yazıldığında `content-type` de atılır (§5.5). Diğer header'lar (`ssl`, `client-source-port`, `traceparent`, `sec-*` …) kalır. Ad logdaki gibi yazılır: `-H '<ad>: <değer>'`.

### 5.5 Body

İçerik türü `content-type` header'ının ilk değerinden okunur: `;` öncesi, kırpılmış, küçük harf.

| İçerik türü | Body nesne/dizi | Body metin |
|---|---|---|
| `application/json` ya da `…+json` | `--data-raw '<tek satır JSON>'` | `--data-raw '<metin>'` |
| `application/x-www-form-urlencoded` | `--data-raw '<§5.3 kodlaması>'` | `--data-raw '<metin>'` |
| `multipart/form-data` | Her yaprak için `--form-string '<ad>=<değer>'` (ad §5.3'teki gibi `a[b]`, kodlanmaz); `content-type` header'ı atılır | `--data-raw '<metin>'` |
| Diğer ya da yok | `--data-raw '<tek satır JSON>'` | `--data-raw '<metin>'` |

- Multipart'ta `-F` değil `--form-string` kullanılır: `-F` `@` ya da `<` ile başlayan değeri dosya sanır. Logda dosya bulunmadığı için dosyalar komutta da yer almaz.
- **Metin body:** JSON olmayan body (düz metin, XML, HTML) olduğu gibi gider; yalnız değer içi maskeler uygulanır (§5.6).

### 5.6 Maskeleme

Kurallar diğer kopyalarla aynıdır: `copy.maskPatterns` alan adı desenleri ve `copy.valueMasks` değer içi maskeler (IBAN, TCKN, GSM, kart). Fark şu: cURL metinleri açıp nesne olarak göndermez, isteği orijinali gibi yazar.

- **Yollar** JSON kopyasıyla aynıdır: `<önek>.method`, `<önek>.url`, `<önek>.headers.<ad>`, `<önek>.body.<anahtar>…`, `<önek>.query.<anahtar>…`. Bu yüzden `context.headers.authorization`, `context.headers.cookie`, `context.headers.platform-token`, `context.body.password`, `context.body._token` varsayılan desenlerle `***` olur.
- **Parçanın kendisi:** `headers`, `body` ya da `query` alanı JSON metniyse bir kez açılır; komut onu yapı olarak okur (§4, §5.5).
- **Parçanın içindeki JSON metni** (`{` ya da `[` ile başlayan, geçerli JSON nesnesi/dizisi): açılır, içindeki anahtarlar aynı desenlerle ve değer içi maskelerle maskelenir, sonra yine JSON metni olarak (`JSON.stringify`, tek satır) yazılır. Biçim farkı (boşluk, `\/` kaçışı) anlamı değiştirmez. En fazla 5 metin iç içe açılır; daha derindeki JSON metni tamamen `***` olur (Plan 6 §5.5 ile aynı).
- **Diğer her metin** (düz metin, HTML, XML; parçanın kendisi dahil): olduğu gibi kalır, yalnız değer içi maskeler uygulanır. Alan adı desenleri HTML/XML'in içine ulaşmaz.
- **Sayılar:** değer içi maskeyle eşleşen sayı `***` olur (`maskValue` ile aynı).
- **Method ve URL:** düz metin gibi; desenle eşleşirse `***`, değilse değer içi maskeler.
- Maskelenen dizi değerli bir header tek satır olur: `-H 'cookie: ***'`.
- `***` form ve query içinde kodlanmadan kalır (`encodeURIComponent` `*`'ı kodlamaz).
- Bir desen bir parçanın tamamını maskelerse: URL `curl '***'` olur; header'lar `***` metni olur ve yazılmaz; body `--data-raw '***'` olur.
- `_index` ve `_id` komuta girmez.

### 5.7 Örnek

`user_action_log`'daki bir form POST'u (değerler uydurma):

```bash
curl 'https://backoffice.example.com/player/search?page=2&filter[status]=active' \
  --globoff \
  -H 'user-agent: Mozilla/5.0' \
  -H 'accept: text/html' \
  -H 'content-type: application/x-www-form-urlencoded' \
  -H 'cookie: ***' \
  -H 'origin: https://backoffice.example.com' \
  --data-raw 'searchForm[email]=dev%40example.com&searchForm[phone]=***&_token=***' \
  --compressed
```

## 6. Arayüz ve metinler

- Yeni metin anahtarı `menuCopyCurl`: EN "Copy as cURL", TR "cURL olarak kopyala". İki locale dosyasına da eklenir.
- `ActionBar`: uygunluk logla birlikte bir kez hesaplanır (`useMemo`); uygunsa öğe JSON öğesinin hemen altına eklenir. Komut tıklamada üretilir.
- Bildirimler mevcutlarla aynı: başarıda "Kopyalandı", komut üretilirken hata olursa "Kopyalanamadı" (`onFail`).

## 7. Kod yapısı

- **`src/core/curl.ts`** (yeni, tarayıcı API'si yok):
  - `requestPrefix(source): "context" | "" | undefined` — §4'teki uygunluk; `undefined` uygun değil demek.
  - `buildCurl(hit, maskPatterns, valueMasks): string | undefined` — §5; uygun değilse `undefined`.
  - Yardımcılar dosyanın içinde kalır: §5.6 maskelemesi (`maskMatcher`, `maskValue`, `maskText` ve `parseStructuredText` üzerine), tek tırnaklama, `http_build_query` kodlaması, multipart yaprakları, header süzgeci.
- `src/core/json-copy.ts` değişmez.
- `src/content/ActionBar.tsx`: menü öğesi.
- Locale dosyaları: `menuCopyCurl`.

## 8. Testler

### 8.1 Birim testler (`tests/unit/core/curl.test.ts`)

- Tırnaklama: `'` içeren değer; çok satırlı body.
- Method: body'siz GET ve body'li POST'ta `-X` yok; DELETE, body'siz POST ve body'li GET'te var; küçük harfli method.
- Header'lar: atılan liste (büyük harfli adlar dahil), `x-forwarded-*` ve `cf-*` önekleri, dizi değerli header'da her eleman, `--compressed`, nesne olmayan header alanı.
- Body: JSON, `+json`, form (iç içe nesne ve dizi, `true`/`false`/`null`), multipart (`--form-string`, `content-type` atılır, `@` ile başlayan değer), türü bilinmeyen nesne, düz metin, XML body (metin olarak, değer içi maskelerle), `[]`/`{}`/boş body.
- İç metinler: form alanındaki JSON metni içinde maskelenip JSON metni olarak gider; form alanındaki HTML metni olduğu gibi gider, içindeki TCKN maskelenir; 5 seviyeden derin JSON metni `***`.
- Query: iç içe kodlama, URL'de `?` varken `&`, `--globoff`.
- Maskeleme: `authorization`, `cookie`, `platform-token`, body'deki şifre ve `_token`, URL yolundaki TCKN, query'deki IBAN, body'deki GSM, tamamı maskelenen URL.
- Uygunluk: `context.` önceliği, kök önek, method yok, göreli URL, `http(s)` dışı şema, `_source` yok.

### 8.2 Seed (`docker/seed.mjs`)

`app_log`'a Symfony biçiminde iki log eklenir. Mevcut `app_log` loglarının URL'leri göreli olduğu için onlarda öğe görünmez.

- **Form POST:** mutlak `https://` URL, dizi değerli header'lar (`host`, `user-agent`, `accept`, `accept-encoding`, `content-type: application/x-www-form-urlencoded`, `content-length`, `cookie`, `x-forwarded-for`, `x-forwarded-proto`, `cf-ray`, `x-php-ob-level`, `origin`), iç içe form body'si (`searchForm[email]`, sentetik GSM'li `searchForm[phone]`, `_token`) ve iç içe query.
- **JSON POST:** `authorization`, `platform-token` ve JSON metni olan `cf-visitor` header'ları; şifre alanları, `'` içeren bir değer ve içinde JSON metni olan bir alan taşıyan JSON body.

Kullanıcı kimlikleri ve zamanlar mevcut testlerin sayımlarını ve sıralamalarını bozmayacak biçimde seçilir. Tüm değerler uydurmadır.

### 8.3 E2E (Kibana 7.17, 8.19, 9.5)

- `copy.spec`: iki seed logunun cURL kopyası beklenen metinle birebir karşılaştırılır. Mevcut klavye testi app-001'de menünün 4 öğe olduğunu zaten kontrol eder; yani istek kaydetmeyen logda öğe görünmez.
- Menü öğelerine indeksle erişilmeye devam edilir (plan yazılırken düzeltildi): e2e yerelleştirilmiş metni doğrulamaz, öğe adları ise yerelleştirilmiş. `copyFromMenu` 0–4 kabul eder; istek kaydeden logda cURL 2. sıradadır ve log linki 3'e kayar, bunu da bir test kontrol eder.

### 8.4 Elle kontrol (kullanıcı, Alpha, gerçek veri)

- **M1:** Bir `player_action_log` GET kaydının cURL kopyası alınır; kullanıcı kendi token'ını yazıp çalıştırır ve yanıtı kontrol eder.
- **M2:** Bir `user_action_log` form POST'unun cURL kopyası alınır; maskeler ve form kodlaması gözle kontrol edilir. POST çalıştırılmaz (yan etkisi olabilir).

Sonuçlar `docs/verification/2026-10-plan-7.md`'ye yazılır.

## 9. Belgeler

- README: "Copy and masking" altına cURL bölümü (alanlar, atılan header'lar, maskeleme, multipart'ta dosyaların olmaması).
- CHANGELOG: 1.0.0 bölümüne bir madde.
- `docs/store-listing.md`: EN ve TR birer madde.
- CLAUDE.md: core katman satırına `curl.ts`, Docs satırına Plan 7.

## 10. Kapsam dışı

- Windows kabukları (PowerShell, cmd).
- Alan yolu ayarı; `context.` ve kök dışındaki log biçimleri.
- Yanıt (`context.response`).
- Dosya yüklemeleri (logda yok).
- İsteği başka bir ortama yönlendirme (`{env.…}` ile host değiştirme).
- Maskesiz kopya.
