# kibanatool — Tasarım Dokümanı (v1)

- **Tarih:** 2026-10-07
- **Durum:** İnceleme bekliyor
- **İlham:** [graytool](https://github.com/bozkurtemre/graytool) (MIT), Graylog için benzer bir Chrome eklentisi

## 1. Amaç

kibanatool, Kibana Discover'da logla çalışmayı hızlandıran açık kaynak bir Chrome eklentisidir. Chrome Web Store'da yayınlanacaktır. Çözdüğü dört sorun şunlardır:

1. **Logdan başka sisteme geçmek.** Kullanıcı ID'sini kopyalayıp admin paneline, Sentry'ye ya da Jira'ya elle taşımak yerine tek tık.
2. **Log içeriğini okumak.** JSON metni olarak saklanan alanları (örn. `context.body`) okunabilir bir ağaç olarak görmek.
3. **Bir olayı uçtan uca takip etmek.** Bir değerle (örn. `user_id`) ilgili logları ya da logun ±N dakika çevresini yeni sekmede açmak.
4. **Logu paylaşmak.** Logu hassas alanları maskelenmiş Markdown olarak kopyalamak ve zamanı kaymayan link vermek.

### 1.1 Hedef kitle ve ortamlar

- Kibana **7.17**, **8.x** ve **9.x** kullanan geliştiriciler.
- Projeyi başlatan ekibin prod ortamı Kibana 7.17.29'dur. Logları Monolog formatındadır, alanlar ayrı ayrıdır ve request/trace ID yoktur. 8.x ve 9.x desteği Web Store kullanıcıları içindir ve Docker'daki test ortamlarıyla doğrulanır.
- Yalnızca Chrome (ve Chromium tabanlı tarayıcılar). Yalnızca **Discover** sayfası.

### 1.2 Başarı ölçütleri

- Aynı ayarlar 7.17, 8.x ve 9.x'te aynı sonucu verir. Bunu her sürüm için otomatik uçtan uca testler doğrular.
- Bir logdan ilgili sisteme ya da ilgili loglara geçiş **satırı açtıktan sonra tek tık** olur. v1'de toplam iki tık kabul edilmiştir.
- Eklenti hata verdiğinde Kibana arayüzü bozulmaz.
- Web Store incelemesinden yalnızca isteğe bağlı host izinleriyle geçer.

## 2. Ana kararlar

| Karar | Seçim | Gerekçe |
|---|---|---|
| Ham logu alma | **Detay görünümünden kimlik, Kibana API'sinden ham log** (A yaklaşımı) | Kibana'nın iç React yapısına dokunmaz. Ekrandaki değerler biçimlendirilmiş olabileceği için ham değer API'den alınır. Tek bir istek dört sürümde de çalışıyor. |
| Proje temeli | Sıfırdan yeni proje | Graytool Graylog'un sayfa yapısına bağlı ve testsiz. Küçük saf fonksiyonlar MIT atfıyla uyarlanır. |
| Teknoloji | WXT + React + TypeScript (strict) | WXT aktif geliştiriliyor (0.21.x). Shadow DOM içinde arayüz ve dinamik içerik betiği kaydını destekliyor. |
| Test | Vitest (birim) + Playwright (uçtan uca, Docker'daki Kibana'lara karşı) | Sürüm uyumluluğu ancak gerçek Kibana'larda doğrulanabilir. |

Reddedilen yaklaşımlar:
- **React iç verisini okumak:** belgelenmemiş iç yapıya bağımlı ve kırılgan.
- **Discover'ın ağ yanıtlarını dinlemek:** 7.17 ve 8.15'te yanıtlar sıkıştırılmış `bsearch`, 9.5'te `search/ese`. Satırları loglarla eşleştirmek sıraya dayanıyor. Sayfanın `fetch` fonksiyonuna müdahale etmek mağaza incelemesinde hassas.
- **Graytool'u fork'lamak veya ona katkı vermek.**

## 3. Doğrulanmış Kibana davranışları (2026-10-07 denemesi)

Kullanılan ortamlar: 7.17.29 (ekibin yerel ortamı), 8.15.3, 8.19.23 ve 9.5.5. Son üçü Docker'da güvenlik açık olarak kuruldu.

| | 7.17.29 | 8.15.3 / 8.19.23 | 9.5.5 |
|---|---|---|---|
| Discover tablosu | Klasik `docTable` | Sanallaştırılmış EuiDataGrid | EuiDataGrid + Discover sekmeleri (`_tab` URL parametresi) |
| Kapalı satırda kimlik | Yok | `data-test-subj="dscGridSelectDoc-<_index>::<_id>::"` | Aynı |
| Detay görünümü | Satırın altında açılan `docTableDetailsRow` > `kbnDocViewer` | Yan panel `docViewerFlyout` > `kbnDocViewer` + `docViewerFlyoutActions` | Aynı |
| Alan satırları | `tableDocViewRow-<alan>-value` | Aynı; alan tablosu da sanallaştırılmış | Aynı |
| Ekrandaki değerler | Ham göründü (ama alan formatları uygulanabilir) | Tarihler biçimlendirilmiş | Biçimlendirilmiş |
| `/internal/search/es` (§6.2'deki istek) | ✓ (`params.body` biçimi zorunlu) | ✓ | ✓ (`x-elastic-internal-origin` başlığı zorunlu) |
| `/api/data_views/data_view/<id>` | ✗ (404) | ✓ | ✓ |
| `/api/index_patterns/index_pattern/<id>` | ✓ | ✓ | ✓ |
| Yeni sekmede `_a=(index:'<dv>',query:…)` + sabit `_g.time` | ✓ | ✓ (`dataSource` biçimine çevrilir) | ✓ (aynı sekmede hash değişikliğiyle data view **değişmez**) |
| Tek log rotası `#/doc/<dv>/<_index>?id=<_id>` | ✓ | 8.19'da ✓ | ✓ |
| Sayfada sürüm bilgisi | Yok (`/api/status`) | Yok | Yok |

**Observability görünümü (9.5, space `solution: oblt`, ECS loglar):** Yan panel "Log overview" sekmesiyle açılır, bu yüzden `tableDocViewRow-_id-value` DOM'da **yoktur**. Panel başlığındaki `DISCOVER_SINGLE_DOC_LOCATOR` linki ise her durumda vardır. Bu linkteki `lz` parametresi, lz-string `compressToBase64` ile sıkıştırılmış şu JSON'dur: `{index: <dataViewId>, rowIndex: <_index>, rowId: <_id>, referrer}`. `URLSearchParams` ile okunur, `decompressFromBase64` ile çözülür. URI-safe çözücü (`decompressFromEncodedURIComponent`) bozuk sonuç verir.

## 4. Mimari

```
Satırı/paneli aç → adaptör kimliği okur → istemci ham logu ve zaman alanını çeker
→ çekirdek alanları açar, koşulları ve şablonları değerlendirir → aksiyon çubuğu görünür
→ tık: link yeni sekmede açılır / Markdown panoya kopyalanır
```

### 4.1 Bileşenler

| Birim | Sorumluluk | Bağımlılık |
|---|---|---|
| `entrypoints/background.ts` | İzin isteme/kaldırma ve içerik betiğinin kaydı (§9) | `chrome.permissions`, `chrome.scripting`, ayar deposu |
| `entrypoints/kibana.content/` | Discover sayfasında adaptörü başlatır, aksiyon çubuğunu Shadow DOM içinde mount eder | adaptörler, Kibana istemcisi, çekirdek, UI |
| `src/adapters/` | `detect`, `legacy-table` (7.17) ve `data-grid` (8.x/9.x). Detay görünümünü bulur, `DocIdentity` üretir, mount noktasını verir | Yalnızca DOM |
| `src/kibana/` | `client` (log, data view, status), `url` (rison ile Discover linkleri), `locator` (`lz` çözücü), `prefix` | `fetch`, `rison-node`, `lz-string` |
| `src/core/` | Saf mantık: `flatten`, `template`, `conditions`, `kql`, `datemath`, `mask`, `markdown`, `config` (şema ve doğrulama) | Tarayıcı API'si yok |
| `entrypoints/options/` | Ayarlar sayfası (React) | Çekirdek, ayar deposu |
| `src/storage.ts` | `chrome.storage.local` sarmalayıcı. Depolamaya tek erişim noktası. | `chrome.storage` |

### 4.2 Klasör yapısı

```
entrypoints/  background.ts · kibana.content/ (index.ts + ui/) · options/
src/core/      flatten · template · conditions · kql · datemath · mask · markdown · config
src/kibana/    client · url · locator · prefix
src/adapters/  detect · legacy-table · data-grid
src/storage.ts
tests/unit · tests/e2e · tests/fixtures (sürüm başına kaydedilmiş HTML)
docker/        compose (7.17.29, 8.19.23, 9.5.5) + seed (Monolog ve ECS sentetik loglar)
```

## 5. Sayfa adaptörleri

### 5.1 Ortak sözleşme

```ts
interface DocIdentity { dataViewId: string; index: string; id: string }
interface DetailView { identity: DocIdentity | null; mountPoint: Element }
interface Adapter {
  matches(root: Document): boolean;
  // Her detay görünümü açıldığında ya da paneldeki log değiştiğinde (önceki/sonraki) çağrılır
  observe(onChange: (views: DetailView[]) => void): () => void;
}
```

- İçerik betiği yalnızca yolunda `/app/discover` olan sayfalarda devreye girer.
- **ES|QL modunda** (`_a.dataSource.type` değeri `esql` ise ya da `_a.query.esql` varsa) adaptör pasif kalır.
- Adaptör seçimi **sürüm numarasına değil, sayfada bulunan öğelere** göre yapılır. `docViewerFlyout` görülürse `data-grid`, `docTableDetailsRow` görülürse `legacy-table` kullanılır.
- Gözlem, debounce'lu bir `MutationObserver` ile yapılır. Kibana yeniden çizip eklentinin host elemanını silerse eleman yeniden eklenir.

### 5.2 `legacy-table` (7.17)

- **Detay görünümü:** `[data-test-subj="docTableDetailsRow"]` içindeki `[data-test-subj="kbnDocViewer"]`. Sayfada aynı anda birden fazla açık satır olabilir, her biri ayrı bir `DetailView` olur.
- **Kimlik:**
  1. Birincil kaynak: "View single document" linki `#/doc/<dataViewId>/<index>?id=<id>`.
  2. Yedek kaynak: `tableDocViewRow-_id-value` ve `tableDocViewRow-_index-value`. Data view kimliği bu durumda URL'deki `_a.index` değerinden alınır.
- **Mount noktası:** `kbnDocViewer` elemanından hemen önce.
- **Desteklenmeyen durum:** 7.17'de `doc_table:legacy=false` ayarıyla yeni tablo açılmışsa v1 bunu desteklemez.

### 5.3 `data-grid` (8.x, 9.x)

- **Detay görünümü:** `[data-test-subj="docViewerFlyout"]`.
- **Kimlik:**
  1. Birincil kaynak: `docViewerFlyoutActions` içindeki `a[href*="DISCOVER_SINGLE_DOC_LOCATOR"]` linkinin `lz` parametresi çözülür (`{index, rowIndex, rowId}`).
  2. Yedek kaynak: `tableDocViewRow-_id-value`, `tableDocViewRow-_index-value` ve URL'deki `_a.dataSource.dataViewId`.
- **Önceki/sonraki gezinmesi:** Paneldeki locator linkinin `href` değeri değişince kimlik yeniden üretilir.
- **Mount noktası:** `docViewerFlyoutActions` elemanından hemen sonra.

## 6. Kibana istemcisi

### 6.1 Önek

İstek öneki, `location.pathname` içinde `/app/`'ten önceki kısımdır. Örnekler: `""`, `/kibana`, `/s/test`, `/kibana/s/test`. Data view'lar space'e özel olduğu için bu önek her istekte kullanılır.

### 6.2 Ham log

```
POST <önek>/internal/search/es
kbn-xsrf: kibanatool
x-elastic-internal-origin: Kibana
content-type: application/json
credentials: same-origin

{"params":{"index":"<_index>","body":{"size":1,"query":{"ids":{"values":["<_id>"]}}}}}
```

- Yanıttaki `rawResponse.hits.hits[0]` kullanılır. Sonuç yoksa "log bulunamadı" gösterilir.
- Sonuçlar sayfa ömrü boyunca `<_index>/<_id>` anahtarıyla önbelleğe alınır.

### 6.3 Data view

- Önce `GET <önek>/api/data_views/data_view/<id>` denenir. 404 dönerse `GET <önek>/api/index_patterns/index_pattern/<id>` çağrılır (7.17 için).
- Bu çağrıdan `title` ve `timeFieldName` alınır. Sonuç önbelleğe alınır.

### 6.4 Sürüm

`GET <önek>/api/status` → `version.number`. Yalnızca hata mesajlarında kullanılır, adaptör seçimini etkilemez.

## 7. Özellikler

### 7.1 Alan haritası

Ham logdan `Record<string, unknown>` üretilir:

- `_source` nokta yollarıyla düzleştirilir. `{"log":{"level":"x"}}` ve `{"log.level":"x"}` aynı yolu (`log.level`) üretir.
- `_id` ve `_index` haritaya eklenir. Zaman alanının değeri kendi adıyla (örn. `@timestamp`, `datetime`) zaten bulunur.
- Değeri `{` ya da `[` ile başlayıp geçerli JSON olarak çözülen metinler açılır ve aynı yolun altına eklenir (örn. `context.body.amount`). Ham metin de kendi yolunda kalır. En fazla 5 seviye derinliğe inilir.
- İlkel değer dizileri (`["a","b"]`) metne çevrilirken `,` ile birleştirilir. Nesne dizilerinin içine v1'de inilmez, bunlar JSON metni olarak kalır.
- `undefined`, `null` ve boş metin "değer yok" sayılır.

### 7.2 Link aksiyonları

- **Şablon:** `https://admin.example.com/users/{user_id|context.user_id}`.
  - Yer tutucu biçimi `{yol}` ya da `{yol|yedek1|yedek2}`. Yol karakterleri: harf, rakam, `_ . @ -`.
  - İlk değeri olan yol kullanılır ve değer `encodeURIComponent` ile kodlanır.
  - Hiçbir yolda değer yoksa buton gösterilmez.
- **Koşullar:**
  - Operatörler: `exists`, `equals`, `notEquals`, `contains`, `startsWith`. Hepsi sağlanmalıdır (AND).
  - Karşılaştırma metin olarak ve büyük/küçük harfe duyarlı yapılır.
  - Koşul sağlanmazsa buton gösterilmez.
- **Şema kısıtı:** Şablon `http://` ya da `https://` ile başlamalıdır. Başka şemalar ayar doğrulamasında reddedilir.
- Link her zaman yeni sekmede, `noopener,noreferrer` ile açılır.

### 7.3 Discover aksiyonları

- **Alanlar:** `queryTemplate` (KQL), `dataViewId` (verilmezse mevcut data view kullanılır), `windowMinutes` (verilmezse zaman penceresi uygulanmaz).
- **KQL'de yer tutucu:** Değer çift tırnak içine alınır, `\` ve `"` kaçış karakteriyle yazılır. Örnek: `user_id:{user_id}` → `user_id:"12345"`. Yedek yol ve koşul kuralları link aksiyonlarıyla aynıdır: değeri bulunamayan bir yer tutucu varsa ya da koşul sağlanmazsa aksiyon gösterilmez.
- **Zaman penceresi:** Hedef data view'ın `timeFieldName` alanından alınan log zamanı `t` olsun. Pencere `from = t − N dk` ve `to = t + N dk` olarak, sabit ISO tarihlerle `_g.time` içine yazılır.
  - Hedef data view'da zaman alanı yoksa ya da logda o alanın değeri yoksa mevcut URL'deki `_g.time` korunur.
  - `queryTemplate` boş ve `windowMinutes` tanımlı bir aksiyon bu durumda pasif görünür, üzerinde gerekçe ipucu olur.
- **URL:** `<önek>/app/discover#/?_g=(time:(from:'…',to:'…'))&_a=(index:'<dv>',query:(language:kuery,query:'<kql>'))`. Rison kodlaması `rison-node` ile yapılır. Link **her zaman yeni sekmede** açılır.

### 7.4 Kopyalama ve paylaşma

Kopyalama işlemleri aksiyon çubuğundaki "⋯" menüsündedir.

- **Markdown olarak kopyala.** Biçim:
  ~~~
  **<_index>** · <zaman alanının ham değeri>
  - `alan`: değer
  - `çok satırlı veya JSON alan`:
    ```json
    …
    ```
  [Kibana'da aç](<tek log linki>)
  ~~~
  - `copy.markdownFields` boşsa `_source`'un düzleştirilmiş bütün yaprak alanları alfabetik sırayla kopyalanır. Doluysa yalnızca listedeki alanlar, listedeki sırayla kopyalanır.
  - JSON metni olan alanlar açılmış alt alanlarıyla değil, biçimlendirilmiş tek bir `json` kod bloğu olarak yazılır. Çok satırlı metinler de kod bloğuna girer.
  - Biçim GitHub, Jira Cloud ve Slack'e yapıştırılmak üzere düz Markdown'dır. Jira Server wiki biçimi kapsam dışıdır.
- **Logun linkini kopyala:** `<origin><önek>/app/discover#/doc/<dv>/<_index>?id=<_id>`.
- **Görünümü sabit zamanla kopyala:** Mevcut URL'deki `_g.time` göreli ise `datemath` ile o anki sabit ISO tarihlere çevrilir.
  - Desteklenen ifadeler: `now`, `now±N(s|m|h|d|w|M|y)` ve isteğe bağlı `/birim` yuvarlaması.
  - Desteklenmeyen bir ifadede kopyalama yapılmaz, "çevrilemedi" uyarısı gösterilir.
- **Panoya yazma:** Önce `navigator.clipboard.writeText` denenir. Güvenli olmayan `http` bağlamında `execCommand('copy')` yöntemine düşülür.

### 7.5 Maskeleme

- **Desenler:** `copy.maskPatterns`. Varsayılan liste: `*authorization*`, `*password*`, `*token*`, `*secret*`, `*cookie*`.
  - `*` herhangi bir karakter dizisi anlamına gelir.
  - Desen alanın tam nokta yoluyla, büyük/küçük harfe duyarsız olarak eşleştirilir.
- Eşleşen alanların değeri **kopyalanan çıktıda** `***` olur. JSON metinlerinin içindeki eşleşen anahtarlar da maskelenir, metin sonra yeniden serileştirilir.
- v1'de maskeleme yalnızca kopyalama çıktısına uygulanır. Ekranda gösterim ve link şablonları etkilenmez.

### 7.6 JSON görünümü

- Aksiyon çubuğundaki "JSON" butonu yalnızca logda JSON metni olan alan varsa görünür. Tek alan varsa doğrudan açılır, birden fazlaysa liste gösterilir.
- **Özellikler:** ağaç görünümü, aç/kapa, arama (eşleşmeyi vurgulama ve aralarında gezinme), değeri kopyalama, yolu kopyalama.
- "Bu değerle filtrele" özelliği yoktur. Gerçek alanlarda Kibana bunu zaten yapıyor. JSON metninin içindeki anahtarlar ise index'lenmemiştir.

### 7.7 Aksiyon çubuğu

- Detay görünümünün üstünde tek satırlık bir çubuktur. Sırasıyla link aksiyonları, Discover aksiyonları, "JSON" ve "⋯" menüsü bulunur.
- Log yüklenirken kısa bir durum metni gösterilir. Hata olursa §10'daki mesajlar gösterilir.
- Çubuk React ile yazılır, Shadow DOM içinde çalışır (WXT `createShadowRootUi`), stilleri sade CSS'tir.

## 8. Ayar modeli

```ts
interface Config {
  schemaVersion: 1;
  environments: Environment[];
  actions: Action[];
  copy: { markdownFields: string[]; maskPatterns: string[] };
}
interface Environment { id: string; name: string; kibanaUrl: string } // örn. https://example.com/kibana
interface ActionBase {
  id: string; label: string; enabled: boolean;
  environmentIds: string[];      // boş = tüm ortamlar
  conditions: Condition[];
}
interface LinkAction extends ActionBase { kind: "link"; urlTemplate: string }
interface DiscoverAction extends ActionBase {
  kind: "discover"; queryTemplate: string; dataViewId?: string; windowMinutes?: number;
}
type Action = LinkAction | DiscoverAction;
interface Condition {
  field: string; op: "exists" | "equals" | "notEquals" | "contains" | "startsWith"; value?: string;
}
```

- **Depolama:** `chrome.storage.local`, tek anahtar (`kibanatool.config`). Chrome sync'in öğe başına 8 KB sınırı olduğu için v1'de sync kullanılmaz.
- **Etkin ortam:** `kibanaUrl` değeri `location.href`'in başı olan ortamdır. Birden fazla ortam eşleşirse en uzun önek kazanır. Hiçbiri eşleşmezse eklenti devreye girmez.
- **Doğrulama:** Şema kontrolü `zod` ile yapılır. Ek kurallar:
  - `urlTemplate` yalnızca `http(s)` olabilir.
  - Kimlikler benzersiz olmalıdır.
  - `windowMinutes` 1 ile 1440 arasında bir tam sayı olmalıdır.
  - `kibanaUrl` geçerli bir `http(s)` URL'i olmalıdır.
- **Dışa/içe aktarma:** Ayarlar JSON dosyası olarak dışa aktarılır. İçe aktarmada önce doğrulama yapılır, sonra önizleme gösterilir (kaç ortam ve kaç aksiyon geleceği). Kullanıcı onaylarsa mevcut ayarların **yerine geçer**. Doğrulamayı geçemeyen dosya alan bazında hata listesiyle reddedilir.
- `schemaVersion` gelecekteki ayar taşımaları (migration) için tutulur.

## 9. Ayarlar sayfası ve izinler

- **Bölümler:**
  - **Ortamlar:** Ortam eklenince `chrome.permissions.request({ origins: ["<origin>/*"] })` çağrılır. İzin reddedilirse ortam "izin bekliyor" olarak işaretlenir.
  - **Aksiyonlar:** Liste ve düzenleyici. Düzenleyicide canlı önizleme vardır: yapıştırılan örnek log JSON'u üzerinde şablon ve koşulların sonucu gösterilir.
  - **Kopyalama ve maskeleme.**
  - **Dışa/İçe aktarma.**
- **Manifest izinleri:**
  - `permissions: ["storage", "scripting"]`
  - `optional_host_permissions: ["http://*/*", "https://*/*"]`
- **İçerik betiği kaydı (background):**
  - İzin verilen origin'ler için `chrome.scripting.registerContentScripts({ id: "kibanatool", matches, js, persistAcrossSessions: true })` çağrılır.
  - İzin listesi değiştiğinde (`permissions.onAdded` / `onRemoved`) ve ayarlar değiştiğinde kayıt güncellenir.
  - WXT'nin `registration: 'runtime'` varsayılanı kullanılmaz, çünkü bu ayar adresleri zorunlu izne çevirir.
- **Dil:** `@wxt-dev/i18n` ile tarayıcının dili kullanılır (TR ve EN).

## 10. Hata yönetimi

- **İçerik betiği Kibana'yı bozmamalı.** Adaptör, gözlemci ve mount kodu hata yakalamayla sarılıdır. Kimlik okunamazsa çubuk gösterilmez, konsola yalnızca `[kibanatool]` ön ekli bir debug mesajı yazılır.
- **API hatalarında çubuktaki mesajlar:**

| Durum | Mesaj |
|---|---|
| 401 / 403 | "Bu logu okuma yetkin yok" |
| Sonuç yok | "Log bulunamadı" |
| 400 / 404 (endpoint) | "Bu Kibana sürümüyle uyumsuz olabilir (sürüm: X)". Sürüm `/api/status`'tan okunur. |
| Ağ hatası | "Kibana'ya ulaşılamadı" |

- **Ayar okunamazsa ya da bozuksa** varsayılan boş ayar kullanılır. Ayarlar sayfası bu durumda bir uyarı gösterir.

## 11. Güvenlik ve gizlilik

- **Ağ trafiği:** Eklentinin tek ağ trafiği kullanıcının kendi Kibana'sına kendi oturumuyla yapılan istekler (same-origin) ve kullanıcının tıkladığı linklerdir. Telemetri ve üçüncü taraf istek yoktur.
- **Değerlerin gösterimi:** Log değerleri HTML olarak işlenmez. React kaçışı kullanılır, `innerHTML` kullanılmaz.
- **Girdi güvenliği:** URL değerleri `encodeURIComponent` ile kodlanır. KQL değerlerinde özel karakterler kaçış karakteriyle zararsız hale getirilir. Şablonlarda yalnızca `http(s)` kabul edilir. İçe aktarılan ayar şemaya göre doğrulanır.
- **Gizlilik politikası:** "Veri tarayıcıdan çıkmaz" ilkesini açıklar ve repoda yayınlanır.

## 12. Bilinen riskler ve doğrulanmamış noktalar

1. **`/internal/search/es` ve `x-elastic-internal-origin`.** Kibana'nın kendi arayüzü de bu çağrıyı aynen bu şekilde yapar ve kullanıcının yetkileri aynen geçerlidir. Ama bu bir internal API'dir ve Elastic haber vermeden değiştirebilir. Uçtan uca matris bu yüzden her PR'da çalışır.
2. **`/api/index_patterns` kullanımdan kaldırılmış (deprecated) bir API'dir.** Yalnızca `/api/data_views` 404 döndüğünde kullanılır.
3. **Locator `lz` biçimi** internal bir detaydır. Çözülemezse alan satırlarındaki yedek kaynağa düşülür.
4. **Doğrulanmamış noktalar.** Bunlar uçtan uca testlere senaryo olarak eklenir:
   - alt yol (`/kibana`) ve space (`/s/test`)
   - yalnızca okuma yetkili kullanıcı
   - 8.15'te tek log rotası
5. **7.17'de yeni tablo modu** v1'de desteklenmez.

## 13. Test stratejisi

### 13.1 Birim testleri (Vitest, TDD)

- **`src/core/*`:** düzleştirme (noktalı anahtarlar, JSON metinleri, derinlik sınırı), şablonlar (yedek yollar, eksik değer, kodlama), koşullar, KQL kaçışı, datemath, maskeleme (iç içe JSON dahil), Markdown, ayar doğrulama.
- **`src/kibana/*`:** önek çıkarma, URL üretme (rison), locator `lz` çözme, istemci (sahte `fetch`; 400/403/404 ve data view yedeği dahil).
- **`src/adapters/*`:** `tests/fixtures/` altındaki 7.17, 8.19 ve 9.5 HTML örnekleri üzerinde (happy-dom). 9.5 için Observability "Log overview" örneği dahil.

### 13.2 Uçtan uca testler (Playwright)

- Eklenti yüklü Chromium kullanılır (`launchPersistentContext` + `--load-extension`).
- `docker/` altında 7.17.29, 8.19.23 ve 9.5.5 çalışır. Hepsinde güvenlik açıktır, tarayıcı anonim auth sağlayıcısıyla şifresiz girer. Sentetik Monolog ve ECS logları yüklenir. Monolog verisi zaman alanı olmayan bir `*_log` data view'ı da içerir.
- **Senaryolar (her sürümde):**
  1. Satırı/paneli aç → çubuk görünür.
  2. Link aksiyonunun ürettiği URL doğru.
  3. Discover aksiyonu yeni sekmede doğru data view, sorgu ve zaman aralığıyla açılır.
  4. Zaman alanı olmayan data view'da doğru davranır.
  5. Kopyalanan Markdown maskeli.
  6. JSON görünümü açılır.
  7. Panelde önceki/sonraki logda çubuk güncellenir.
- **Ek senaryolar:**
  - 9.5 Observability görünümü
  - `/s/test` space'i
  - alt yolda (`server.basePath`) çalışan Kibana
  - yalnızca okuma yetkili kullanıcı
- **HTML örnekleri:** Uçtan uca ortamdan bir betikle yakalanıp `tests/fixtures/`'a kaydedilir. Yalnızca sentetik veri içerir.

### 13.3 CI (GitHub Actions)

- Her PR'da lint, tip kontrolü ve birim testleri çalışır.
- Ardından 3 sürümlük uçtan uca matris çalışır.

## 14. Yayın

- Paket `wxt zip` ile çıkarılır ve Chrome Web Store'a elle yüklenir. Sürümler semver ile numaralanır, `CHANGELOG.md` tutulur.
- MIT lisansı kullanılır. README'de graytool'dan uyarlanan parçalar (şablon çözme, koşul değerlendirme, nesne düzleştirme) için atıf yapılır.
- README'de örnek aksiyonlar yer alır: admin paneli, Sentry araması, Jira araması, "bu kullanıcının logları", "±5 dakika".

## 15. Kapsam dışı (v1 sonrası adaylar)

- **Kapalı satırda butonlar** (8.x/9.x'te `dscGridSelectDoc` kimliğiyle mümkün).
- **Stack trace'ten koda gitme** (PhpStorm/VS Code/GitHub linkleri ve yol eşleme). v1 sonrasında ilk sıradaki aday.
- Ortam şeridi, satır renklendirme, ekranda maskeleme modu, sorgu şablonları, düz metinden alan çıkarma.
- Firefox desteği, Chrome sync, elle dil seçimi, Jira Server wiki biçimi, ES|QL modu, Dashboard panelleri, 7.17'de yeni tablo modu, otomatik mağaza yayını.
