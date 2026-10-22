# kibanatool web sitesi: tasarım

- **Tarih:** 2026-10-21
- **Durum:** kullanıcı onayladı (2026-10-22)
- **Kapsam:** tanıtım sayfası, docs (kurulum ve kullanım), sürümler sayfası; İngilizce ve Türkçe

## 1. Amaç ve neden

1.0.0 Chrome Web Store incelemesinde. Store sayfasından ya da GitHub'dan gelen ve kibanatool'u hiç duymamış biri
bugün yalnızca uzun, İngilizce bir README buluyor. Site bu kişi için:

- **İlk dakikada:** aracın ne yaptığını görmeli, kendi Kibana sürümünün (7.17, 8.x, 9.x) desteklendiğini ve logunun
  dışarı gitmediğini anlamalı, tek tıkla store'dan kurabilmeli.
- **Sonra:** kurulumu ve kullanımı kendi dilinde (İngilizce ya da Türkçe), konu konu bulabilmeli.

## 2. Hedefler, hedef olmayanlar, anti-hedefler

**Hedefler**

- Tanıtım sayfası: özellikler, nasıl çalışır, ekran görüntüleri, kurulum, son sürüm.
- Docs: README'deki her konu kendi sayfasında, iki dilde tam içerikle.
- Sürümler sayfası: CHANGELOG'un kendisi.
- README kısalır, kullanım kılavuzu yalnızca docs'ta yaşar.

**Hedef olmayanlar**

- Blog, haber bülteni, sürüm başına ayrı docs, özel alan adı.
- CHANGELOG'un çevirisi.
- Gerçek eklentiyi sitede çalıştıran bir deneme alanı.

**Anti-hedefler** (çalışsa bile başarısızlık sayılır)

- Ziyaretçinin tarayıcısından üçüncü bir tarafa istek gitmesi: analytics, Google Fonts, Algolia, CDN'den script.
  Eklentinin gizlilik vaadiyle çelişir.
- Hazır SaaS şablonu görünümü: aynı kartlar, degrade süsler, her başlığın üstünde büyük harfli etiket.
- Docs ile README'nin ya da docs ile eklentinin arayüz metinlerinin birbirinden kopması.
- Gerçek veri içeren bir ekran görüntüsü ya da örnek.

## 3. Kullanıcının verdiği kararlar

| # | Konu | Karar |
|---|---|---|
| K1 | Hedef kitle | Web Store'dan ya da GitHub'dan gelen, kibanatool'u hiç duymamış biri |
| K2 | Araç | Docusaurus |
| K3 | Dil | İngilizce ve Türkçe |
| K4 | Sürüm notları | CHANGELOG'daki İngilizce metin, iki dilde de olduğu gibi |
| K5 | Görsel referans | [eightshift.com](https://eightshift.com) ([kaynak](https://github.com/infinum/eightshift-docs)): düzeni ve sadeliği; Infinum'un kırmızısı değil |
| K6 | Renkler | kibanatool'un kendi mavisi: ikon ve Borealis teması (`src/theme.ts`) |
| K7 | Hero | B: sağda bir logun ham alanları ve onlardan oluşan butonlar; butona gelince kullandığı alanlar işaretlenir, gideceği yer görünür |
| K8 | Docs kapsamı | README'deki her konu docs sayfalarına bölünür, İngilizce ve Türkçe tam içerikle |
| K9 | README | Kısalır: ne olduğu, kurulum, docs linki, Development bölümü. Kullanım anlatımı docs'a taşınır |
| K10 | Yayın | Site store onayından sonra yayına çıkar; "Add to Chrome" doğrudan store sayfasına gider. Store item ID'sini kullanıcı verecek |
| K11 | Sayfa düzeni | §6 ve §7'deki tanıtım sayfası sırası ve docs düzeni, mockup üzerinde "yanlış ya da eksik yok" diye onaylandı. Mockup beyin fırtınası sırasında atılmak üzere yapıldı, repoda yok; tarifin tamamı §6 ve §7, markup'ı taşınmaz |
| K12 | Türkçe örnek ayarlar | `examples/kibanatool-settings.tr.json` eklenir: aynı aksiyonlar Türkçe etiketlerle (Türkçe ekran görüntülerindeki gibi: "Admin'de kullanıcı", "Bu kullanıcının logları", "Tüm loglarda bu kullanıcı", "±5 dakika"; Sentry ve Jira aynı). `tests/unit/examples.test.ts` iki dosyayı da kontrol eder. Türkçe docs ve Türkçe tanıtım sayfası bu dosyayı gösterir |

## 4. Benim kararlarım (itiraz edilebilir)

Kullanıcı bunları mockup'ta ya da sohbette gördü ama ayrıca onaylamadı.

- **Yer:** repoda `website/` klasörü. Kendi `package.json`'ı ve `package-lock.json`'ı var, npm ve Node 22 kullanır.
  Eklentinin `package.json`'ına hiçbir bağımlılık eklenmez.
- **Docusaurus:** 3.10 (2026-10'da son sürüm 3.10.2), `preset-classic`. Blog kapalı, tek docs sürümü. Sayfalar ve
  bileşenler TypeScript (TSX). Hazır tema paketi yok (Eightshift'in `@infinum/docusaurus-theme`'i de yok): görünüm
  Infima değişkenleri ve sitenin kendi CSS'iyle verilir.
- **Adres:** GitHub Pages, `https://cllakyz.github.io/kibanatool/` (`baseUrl: /kibanatool/`). Türkçe sürüm
  `/kibanatool/tr/` altında.
- **Yayın akışı:** yeni bir `.github/workflows/website.yml`.
  - `pull_request` (main'e, yalnızca `website/**` ya da `CHANGELOG.md` değişince): siteyi build eder. Kırık link
    build'i düşürür (`onBrokenLinks: "throw"`).
  - `push` (`v*` etiketi) ve `workflow_dispatch`: build eder ve `actions/deploy-pages` ile yayınlar. 2026-10-22
    (kullanıcı kararı, PR #18): önceden main'e her push'ta yayınlıyordu; o zaman `main`'e giren bir özellik docs'ta
    store'daki sürümden önce görünürdü. Etiket, sürüm store'a çıkınca push'lanıyor, yani site store'daki sürümün
    docs'unu gösterir. Bir docs düzeltmesi elle "Run workflow" ile yayınlanır.
  - `ci.yml` bilerek yalnızca PR'larda çalışıyor; bu ayrı bir yayın workflow'u yalnızca siteyi yayınlar, eklentiyi
    test etmez.
- **Arama:** `@easyops-cn/docusaurus-search-local`, `language: ["en", "tr"]`. Dizin build sırasında üretilir, aramada
  dışarıya istek gitmez.
- **Fontlar:** başlık ve gövde için Schibsted Grotesk, log ve kod için Roboto Mono. `@fontsource/schibsted-grotesk` ve
  `@fontsource/roboto-mono` paketleriyle siteyle birlikte sunulur; Google Fonts'a istek gitmez.
- **Koyu tema:** Docusaurus'un düğmesi açık; varsayılan olarak sistemi izler (`respectPrefersColorScheme: true`).
  Koyu palet Borealis'in koyu paleti.
- **Docs menüsü:** §7'deki dört grup ve sayfa adları.
- **Türkçe dil:** "siz" diliyle, store'daki Türkçe açıklama gibi. Arayüz adları
  `public/_locales/tr/messages.json`'daki metinlerle birebir aynı (örn. "Görüntüle", "cURL olarak kopyala",
  "Kopyalama ve maskeleme", "Dışa ve içe aktarma").
- **Hero demosu:** veriler sitenin içinde sabit duran sentetik bir örnek. Site `src/` altındaki eklenti kodunu
  import etmez.
- **Ekran görüntüleri:** `.output/store-screenshots/` altındaki 10 PNG (gitignored),
  `website/static/img/screenshots/{en,tr}/` altına kopyalanır ve commit edilir. Hepsi seed'deki sentetik verilerden.
- **Gizlilik linki:** footer'daki "Privacy policy", GitHub'daki `PRIVACY.md`'ye gider. Store'daki gizlilik URL'si
  değişmez.
- **Store listing:** `docs/store-listing.md` ve store açıklamaları değişmez. Site adresi yalnızca README'ye ve repo'nun
  GitHub "Website" alanına girer; bu alanı kullanıcı elle doldurur.
- **CHANGELOG:** site eklentinin bir sürümü olmadığı için CHANGELOG'a girmez.
- **Teslim:** tek branch (`website`), tek PR. Push ve PR'dan önce kullanıcıya sorulur.
- **Logo:** iki temada da `assets/icon.svg` (beyaz zemin üstünde mavi işaret). `assets/icon-dark.svg` koyu tarayıcı
  araç çubuğu için yapılmış limon yeşili bir işaret; sitenin mavisine (K6) uymaz.
- **Kurulum sırası (onaylı metinde düzeltme):** mockup'taki "önce adresi ekle, sonra örnek ayarları içe aktar"
  sırası çalışmaz, çünkü içe aktarma mevcut bütün ayarların yerine geçer ve eklenen adres kaybolur. Sıra: store'dan
  kur; ayarları açıp örnek ayar dosyasını kaydet (tarayıcıda ham JSON olarak açılır: sağ tık, "Bağlantıyı farklı
  kaydet") ve "Export and import"ta içe aktar; "Environments"ta kendi Kibana'nı bir adla "Add and grant access" ile
  ekle; "Variables"ta kendi ortamının sütununa `adminUrl` ve `jiraUrl` yazıp kaydet; örnekteki "Production" ortamını
  kaldır (değişkenler ortamların içinde durur: önce kaldırılırsa satırları kaybolur); Kibana sekmesini yenileyip bir
  log aç. §6.2'deki Install bölümü, "First setup" sayfası ve README buna göre yazılır. (2026-10-22, final review:
  the address cannot be edited. Bir ortam satırında yalnızca "Remove" ve, erişim eksikse, "Grant access" vardır.)
- **Demo logu:** "⋯" satırı cURL'ü vaat ettiği için loga `context.method` ve `context.url` eklendi; eklenti "Copy as
  cURL"u yalnızca ikisi olan loglarda gösterir.

## 5. Görsel sistem

### 5.1 Renkler

`src/theme.ts`'teki Borealis paletinden. Site bu dosyayı import etmez, değerleri kendi CSS'ine yazar.

| Rol | Açık | Koyu | Nerede |
|---|---|---|---|
| Metin | `#1d2a3e` | `#cad3e2` | başlık ve gövde |
| İkincil metin | `#516381` | `#98a8c3` | açıklamalar, altyazılar |
| Sayfa | `#ffffff` | `#050f21` | ana zemin |
| Tonlu bölüm | `#f6f9fc` | `#0b1628` | sırayla gelen bölümlerin zemini (Eightshift'teki gibi beyazla değişir) |
| Yüzey | `#ffffff` | `#111c2c` | hero demosu, ekran görüntüsü çerçevesi, sürüm kutusu |
| Çizgi | `#e3e8f2` | `#2b394f` | kenarlıklar, ayırıcılar |
| Birincil | `#0b64dd` (hover `#1750ba`) | `#61a2ff` (hover `#85b7ff`) | dolu butonlar, linkler, odak halkası |
| Birincil üstü metin | `#ffffff` | `#050f21` | dolu butonun metni |
| Discover tonu | `#d9e8ff`, metni `#1750ba` | `#0d2f5e`, metni `#61a2ff` | ikincil butonlar, docs menüsünde açık sayfa |
| Log anahtarı | `#6b3c9f` | `#c5a5fa` | hero demosunda alan adları |
| Log değeri | `#047471` | `#16c5c0` | hero demosunda değerler |
| İşaret | `#fde9b5` | `#3d3014` | demoda butonun kullandığı alan |
| İkon mavisi | `#236a9e` | `#236a9e` | yalnızca logo (`assets/icon.svg`, iki temada da) |

Buton dili eklentiden gelir: dolu mavi buton eklentideki link aksiyonu gibi, açık mavi buton Discover aksiyonu
gibi. Sitede de birincil eylem dolu ("Add to Chrome"), ikincil eylem açık mavi ("Read the docs").

Bütün metin çiftleri iki temada da WCAG AA'yı sağlar: metin 4.5:1, odak halkası ve kenarlıklar 3:1. Eklentinin
`tests/unit/theme.test.ts`'i aynı değerleri zaten ölçüyor; sitede yeni bir çift kullanılırsa build öncesi elle ölçülür.

### 5.2 Yazı

- **Schibsted Grotesk:** hero başlığı 800 ağırlık, yaklaşık 56px, satır aralığı 1.02, harf aralığı -0.035em. Bölüm
  başlıkları 800, yaklaşık 36px. Alt başlıklar 700, yaklaşık 19px. Gövde 400, 16–18px, satır aralığı 1.55.
- **Roboto Mono:** yalnızca gerçek log içeriği ve kod: hero demosundaki alanlar, `{user_id}` gibi yer tutucular,
  kod blokları. Küçük etiketler için kullanılmaz.
- Gövde satırı en fazla yaklaşık 70 karakter. Başlıklarda tek kelimeyi renklendirmek ya da italik yapmak yok,
  büyük harfli etiket yok, link ve buton metninin sonunda "→" yok.

### 5.3 İlkeler

- **Cesaret tek yerde:** hero demosu. Geri kalan her şey sakin: düz zeminler, ince çizgiler, gölge yalnızca demoda
  ve ekran görüntüsü çerçevesinde.
- **Numara yalnızca sıra için:** "How it works" ve "Install" adımları gerçekten sıralı, numaralı. Özellikler değil.
- **Kendiliğinden hareket yok:** giriş animasyonu, kaydırınca beliren bölüm yok. Hareket yalnızca kullanıcının
  eylemine cevap verir (demodaki işaret, sekme değişimi) ve `prefers-reduced-motion`'da kapanır.
- **Gerçek içerik:** her metin README, CHANGELOG ve store açıklamasından gelir; yer tutucu metin yok.

## 6. Tanıtım sayfası

### 6.1 Navbar (her sayfada)

```
[ikon] kibanatool   Docs   Releases                 [Search]  English▾  ◐  GitHub
```

Logo `assets/icon.svg`, iki temada da. Dil menüsü Docusaurus'un `localeDropdown`'ı.

### 6.2 Bölümler, yukarıdan aşağıya

Zemin beyaz ve tonlu sırayla değişir. İngilizce metinler aşağıda; Türkçeleri builder yazar (§4 dil kuralı).

```
┌──────────────────────────────────────────────────────────────┐
│ 1 HERO (beyaz)                                               │
│  Büyük başlık               │  ┌ demo ────────────────────┐  │
│  açıklama                   │  │ [User in admin][Sentry]  │  │
│  [Add to Chrome][Read docs] │  │ [This user's logs][±5]   │  │
│  Kibana 7.17, 8.x and 9.x…  │  │ datetime   2026-01-15 …  │  │
│                             │  │ user_id    4821  ◄ işaret│  │
│                             │  │ → https://admin…/4821    │  │
├──────────────────────────────────────────────────────────────┤
│ 2 SEE IT IN KIBANA (tonlu)  başlık, alt cümle, 5 sekme,      │
│   büyük ekran görüntüsü, tek cümlelik açıklama               │
├──────────────────────────────────────────────────────────────┤
│ 3 WHAT IT ADDS (beyaz)  başlık solda │ 6 özellik, 2 sütun    │
├──────────────────────────────────────────────────────────────┤
│ 4 HOW IT WORKS (tonlu)  1 ── 2 ── 3  üç sütun                 │
├──────────────────────────────────────────────────────────────┤
│ 5 PRIVACY (beyaz)  başlık solda │ 4 madde + sürüm etiketleri │
├──────────────────────────────────────────────────────────────┤
│ 6 INSTALL (tonlu)  başlık solda │ 3 numaralı adım            │
├──────────────────────────────────────────────────────────────┤
│ 7 RELEASES (beyaz)  başlık solda │ son sürüm kutusu          │
├──────────────────────────────────────────────────────────────┤
│ FOOTER                                                       │
└──────────────────────────────────────────────────────────────┘
```

Masaüstünde içerik genişliği yaklaşık 1120px, sola hizalı. "Başlık solda" bölümlerinde sol sütun yaklaşık 300px.

**1. Hero**

- Başlık: "One-click actions for the log you open in Kibana"
- Açıklama: "kibanatool reads the raw fields of the log you open in Discover and turns them into buttons: your admin
  panel, Jira, Sentry, related logs, a masked copy to share."
- Butonlar: "Add to Chrome" (dolu, store sayfası, yeni sekme değil), "Read the docs" (açık mavi, Introduction).
- Alt satır: "Kibana 7.17, 8.x and 9.x. Free and open source."
- **Demo** (sağda, gölgeli bir yüzey):
  - Üstte eklentinin buton çubuğu gibi bir sıra: link aksiyonları dolu mavi (User in admin, Sentry), Discover
    aksiyonları açık mavi (This user's logs, ±5 minutes), sonra çerçevesiz "View" ve "⋯".
  - Altında logun ham alanları, Roboto Mono, anahtar ve değer iki sütun: `datetime 2026-01-15 12:39:00`,
    `level_name ERROR`, `message Coupon not applied`, `user_id 4821`, `context.method POST`,
    `context.url https://api.example.com/v1/coupons`, `context.body {"amount":40,"currency":"TRY"}`,
    `context.headers {"authorization":"Bearer …"}`.
  - En altta sonuç satırı.
  - Bir butonun üzerine gelince, ona odaklanınca ya da dokununca: kullandığı alanların satırı sarıyla işaretlenir,
    sonuç satırı butonun yaptığını gösterir:

    | Buton | İşaretlenen alanlar | Sonuç satırı |
    |---|---|---|
    | User in admin | `user_id` | `https://admin.example.com/users/4821`, altında "from {env.adminUrl}/users/{user_id}" |
    | Sentry | `level_name`, `message` | `https://acme.sentry.io/issues/?query=Coupon%20not%20applied`, altında "shown only when level_name is ERROR" |
    | This user's logs | `user_id` | `user_id:"4821"` in Discover, new tab |
    | ±5 minutes | `datetime` | 12:34 to 12:44 in Discover, every log around this one |
    | View | `context.body` | context.body as a searchable JSON tree |
    | ⋯ | `context.method`, `context.url`, `context.headers` | Copy as Markdown, JSON or cURL, with `authorization: ***` masked |

  - Varsayılan seçili buton "User in admin": sayfa JavaScript'siz, dokunmatik ekranda ya da hiç etkileşim olmadan
    da dolu görünür.
  - Butonlar gerçek `<button>`; Tab ile gezilir, odak halkası görünür. Sonuç satırı `aria-live="polite"`.
    Demo butonları bir yere gitmez.
  - Türkçe sitede buton ve sonuç metinleri Türkçe, log değerleri aynı.

**2. See it in Kibana**

- Başlık: "See it in Kibana". Alt cümle: "Kibana 9.5 with synthetic logs. The same buttons work on 7.17 and 8.x."
- Beş sekme (ARIA tabs: ok tuşlarıyla gezilir), her biri bir ekran görüntüsü ve tek cümlelik açıklama gösterir.
  Görüntüler o dilin (`en` ya da `tr`) kopyası.

  | Sekme | Görüntü | Açıklama |
  |---|---|---|
  | Action bar | `1-bar` | The action bar above the log you open: link actions in blue, Discover actions in light blue, then View and the copy menu. |
  | Row buttons | `2-rows` | Actions marked Show in row appear on the result row you point at, so one click runs them without opening the log. |
  | View panel | `3-view` | View opens JSON, XML and form text as a tree you can search, and long or multi-line text with its line breaks kept. |
  | Copy menu | `4-copy` | Copy the log as Markdown or JSON, or the request it records as a cURL command, with tokens and passwords masked. |
  | Options page | `5-options` | Environments, variables, actions, masking and export, each on its own tab of the options page. |

- Her görüntünün `alt` metni açıklamayla aynı; ilk görüntü hemen, diğerleri tembel yüklenir.

**3. What it adds to Discover**

- Solda başlık "What it adds to Discover" ve "Everything is built from the log's raw fields, read from your Kibana,
  never from what the screen shows."
- Sağda iki sütun, ikon yok, kart yok:
  - **Links to your other tools:** Open your admin panel, Sentry or Jira with a value from the log, like `{user_id}`.
  - **Related logs:** The same user's logs, every log ±5 minutes around this one, or the same query in another data view.
  - **Buttons on result rows:** Point at a row and click, without opening the log.
  - **Readable request bodies:** JSON, XML and form text as a searchable tree. Stack traces and console output with their line breaks.
  - **Copies that are safe to share:** Markdown, JSON or cURL, with passwords, tokens, IBANs and card numbers masked.
  - **One setup for every Kibana:** Variables like `{env.adminUrl}` take each environment's own value.

**4. How it works**

Üç numaralı sütun; numara büyük ve mavi, üstünde koyu bir çizgi:

1. **Add your Kibana:** Enter its address on the options page. Chrome asks for access to that site only; kibanatool runs nowhere else.
2. **Describe your actions:** A label and a template, such as `{env.adminUrl}/users/{user_id}`. Or import the example settings and edit them.
3. **Open a log:** kibanatool reads the log's raw fields through Kibana's own API, with your session, and builds the buttons.

**5. Your logs stay in your Kibana**

- Solda başlık. Sağda iki sütun, dört madde:
  - **No data leaves your browser:** No telemetry, no third-party service. It talks only to the Kibana addresses you add.
  - **Settings stay on this device:** Kept in Chrome's local storage. Export them to a file to share with your team.
  - **Access one site at a time:** No access to any site until you add it, and you can remove it any time.
  - **Open source:** MIT licensed. Read every line on GitHub.
- Altında üç düz etiket: "Kibana 7.17", "Kibana 8.x", "Kibana 9.x".

**6. Install**

- Solda başlık "Install" ve "Two minutes, with the example settings."
- Sağda üç numaralı adım:
  1. **Add kibanatool from the Chrome Web Store** ve "Add to Chrome" butonu.
  2. **Import the example actions:** Click the toolbar icon to open the options. Save `kibanatool-settings.json` (right-click, Save link as) and load it under Export and import.
  3. **Point it at your Kibana:** On Environments, enter a name and your Kibana's address and click Add and grant access. Under Variables, fill in adminUrl and jiraUrl in its column and click Save. Then remove the example environment, reload your Kibana tab and open a log.
  (2026-10-22, final review: the address cannot be edited)
- Altında: "Prefer to build it yourself?" ve "Build from source" linki (docs).
- `kibanatool-settings.json` linki GitHub'daki `examples/kibanatool-settings.json`'ın ham dosyasına gider; Türkçe
  sitede `examples/kibanatool-settings.tr.json`'a (K12).

**7. Releases**

- Solda başlık. Sağda bir kutu: büyük sürüm numarası, tarih, sağda "All releases" linki (sürümler sayfası). Altında
  o sürümün CHANGELOG'daki ilk cümlesi.
- Sürüm, tarih ve ilk cümle build sırasında `CHANGELOG.md`'den okunur; elle yazılmaz.

**Footer:** "MIT License" (GitHub'daki LICENSE), "Privacy policy" (GitHub'daki PRIVACY.md), "GitHub", sağda "Inspired by
graytool for Graylog" (graytool'a link).

### 6.3 Dar ekran

Docusaurus'un 996px kırılımının altında: hero, demo başlığın altına iner; "başlık solda" bölümleri tek sütun olur;
"How it works" adımları alt alta dizilir; sekmeler yatay kayar; yan boşluk 16px; yatay sayfa kaydırması olmaz.

## 7. Docs

### 7.1 Düzen

Docusaurus'un standart docs düzeni: solda menü, ortada makale (en fazla yaklaşık 760px), sağda "On this page".
Makalenin üstünde breadcrumb, altında "Edit this page" (GitHub'da `website/` içindeki dosya) ve önceki/sonraki
linkleri. Menüde açık sayfa Discover tonuyla (`#d9e8ff` zemin, `#1750ba` kalın metin) işaretlenir. Notlar
Docusaurus admonition'ları, birincil mavinin tonlarıyla.

### 7.2 Sayfalar ve kaynakları

Her sayfa README'nin ilgili bölümünden (ya da belirtilen dosyadan) gelir; içerik kısaltılmaz, bölünür. İngilizce
metin README'deki gibi kalır, yalnızca sayfaya bölünürken gereken bağlantı cümleleri eklenir.

| Grup | Sayfa | Kaynak |
|---|---|---|
| Getting started | Introduction | README giriş paragrafı ve "What it does" |
| | Install | "Set up" 1. adım (store ve paketlenmemiş yükleme) |
| | First setup | "Set up" 2–6. adımlar, tek akış olarak |
| Configure | Environments | "Set up" 3. adım; Chrome'un site izni |
| | Variables | "Set up" 4. adım ve `{env.name}` maddesi |
| | Actions | "Set up" 5. adım, "Show in row", Discover aksiyonunun hedef data view'ı |
| | Placeholders and conditions | "Placeholders and conditions" |
| | Example actions | "Example actions" tablosu ve `examples/kibanatool-settings.json` (Türkçe sayfada `.tr.json` ve Türkçe etiketler) |
| Use | Action bar and row buttons | "What it does" ve row buttons paragrafı (7.17'deki sayfa içi script dahil) |
| | View panel | "What it does" içindeki View maddesi, JSON ağacı |
| | XML and form data | "XML and form data" |
| | Text view | "Text view" |
| | Copy and masking | "Copy and masking" |
| | Copy as cURL | "Copy as cURL" |
| More | Privacy and permissions | "Privacy", `PRIVACY.md`'nin özeti ve `docs/store-listing.md`'deki izin gerekçeleri |
| | Build from source | README "Development"ın build kısmı: `npm install`, `npm run build`, `.output/chrome-mv3`'ü paketlenmemiş yükleme |

Türkçe sayfalar `website/i18n/tr/docusaurus-plugin-content-docs/current/` altında, aynı dosya adlarıyla.

### 7.3 Sürümler sayfası

`/releases` (Türkçede `/tr/releases`): `CHANGELOG.md`'nin içeriği, olduğu gibi. Tek kaynak repo kökündeki
`CHANGELOG.md`; elle kopyası tutulmaz. Türkçe sitede de İngilizce metin görünür (K4); sayfa başlığı ve giriş cümlesi
çevrilir.

## 8. README'nin yeni hali

Kalanlar: başlık ve iki cümlelik tanım, sitenin adresi, kısa kurulum (store linki; örnek ayarları içe aktarma;
kendi Kibana'nı ekleyip değişkenleri doldurma ve örnek ortamı kaldırma; üç madde, §4'teki kurulum sırasıyla), "Documentation" linki (İngilizce ve Türkçe), "Privacy" (iki cümle ve PRIVACY.md), "Development"
bölümünün tamamı, "Credits", "License". "What it does"tan "Copy as cURL"a kadar her şey docs'a taşınır.

`CLAUDE.md`'ye eklenecekler: `website/` komutları (`npm --prefix website …`), "kullanım kılavuzu docs'ta, README kısa"
kuralı ve "eklentinin arayüz metni değişince iki dildeki docs da güncellenir" kuralı.

## 9. Kısıtlar

- `website/` dışındaki tek kod değişikliği K12: yeni Türkçe örnek dosyası ve iki dosyayı da kontrol eden
  `tests/unit/examples.test.ts`. İki dosyanın aksiyonları etiketler dışında aynı kalır; test bunu da kontrol eder.
- Eklentinin build'i, testleri, `typecheck`'i ve manifest kontrolü değişmeden geçer. Kökteki `npm run typecheck`
  `.wxt/tsconfig.json` üzerinden `../**/*`'ı kapsıyor; `website/` kök `tsconfig.json`'da dışarıda bırakılır
  (`.wxt`'nin `exclude` listesi de yeniden yazılarak, çünkü `exclude` birleşmez, ezilir).
- Sitenin çalışırken yaptığı her istek kendi adresine gider. Build çıktısında harici bir script, font ya da stil
  adresi olmamalı; yalnızca link (`<a href>`) olarak dış adres olabilir. Bu, build'den sonra çıktı taranarak
  kontrol edilir.
- WCAG AA renk karşıtlığı iki temada; görünür klavye odağı; `prefers-reduced-motion` desteği.
- Kırık link build'i düşürür.
- Ekran görüntüleri ve örnekler yalnızca sentetik veri.
- Store adresi tek bir yerde tutulan bir sabittir (`website/src/constants.ts`). 2026-10-22: liste 1.0.0 ile yayında,
  adres `https://chromewebstore.google.com/detail/kibanatool/flgnjcjghmbcnfhilikbeddkhjiagodp`. Site, store
  onayından sonra yayına çıkar: kullanıcı repo ayarlarında Pages'i "GitHub Actions" kaynağıyla açar ve PR onaydan
  sonra birleştirilir. Etiketten yayın için `github-pages` environment'ının "Deployment branches and tags" kuralına
  `v*` etiketi eklenir; ilk yayın merge'den sonra elle "Run workflow" ile yapılır.

## 10. Builder'a kalanlar

- Bileşen yapısı, CSS'in ayrıntıları, Infima değişkenlerinin eşlenmesi.
- `CHANGELOG.md`'nin nasıl okunacağı: MDX import (`@site/../CHANGELOG.md`) çalışıyorsa o, çalışmıyorsa küçük bir
  yerel Docusaurus eklentisi. Son sürüm kutusu için de aynı yol.
- Favicon (`public/icon/32.png` ya da `assets/icon.svg`), Open Graph görseli, sitemap.
- Docs sayfalarının dosya adları ve URL'leri (örn. `/docs/getting-started/first-setup`).
- Türkçe metinlerin kendisi, §4'teki dil kuralına uyarak.
- Türkçe örnek dosyasında ortam adı ("Production") çevrilir mi: builder'a kalmış.

## 11. Açık

- ~~Store item ID'si (kullanıcı verecek).~~ 2026-10-22: liste yayında,
  `https://chromewebstore.google.com/detail/kibanatool/flgnjcjghmbcnfhilikbeddkhjiagodp`.
