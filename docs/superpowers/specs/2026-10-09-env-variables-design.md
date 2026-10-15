# Ortam değişkenleri ve adla data view seçimi — Tasarım Dokümanı

- **Tarih:** 2026-10-09
- **Durum:** Kullanıcı incelemesi bekliyor
- **Ana spec:** `2026-10-07-kibanatool-design.md`. Bu doküman oradaki §7.2 (link aksiyonları), §7.3 (Discover aksiyonları), §8 (ayar modeli) ve §9 (ayarlar sayfası) bölümlerini genişletir. Çelişen yerde bu doküman geçerlidir.
- **Sürüm:** Eklentinin yayınlanmamış 1.0.0 sürümüne dahil edilir.

## 1. Amaç

Aynı buton setinin her ortamda (Alpha, Prod, sonradan eklenecekler) kopyalanmadan çalışması.

Bugün iki şey ortama özel:

- **Adresler:** Link aksiyonlarının adresleri, örneğin admin paneli, ortama göre değişiyor.
- **Data view kimlikleri:** Discover aksiyonlarının hedef data view kimlikleri her Kibana'da farklı.

Bu yüzden Alpha için hazırlanan 17 buton Prod'da kullanılamıyor.

Başarı ölçütü: Alpha ayar dosyasındaki butonlar ortamdan bağımsız hale gelir, ve yeni bir ortamı devreye almak şuna indirgenir:

1. Ortamı eklemek.
2. Değişken tablosunda o ortamın sütununu doldurmak.

## 2. Kararlar

Kullanıcıyla 2026-10-09'da tek tek karara bağlandı:

| Konu | Karar |
|---|---|
| Değişken yazımı | `{env.ad}`. `env.` öneki şablonda her zaman ortam değişkenidir; logdaki `env.*` alanlarına şablondan ulaşılamaz. |
| Değişkenin değeri | Link adresine olduğu gibi (kodlanmadan) eklenir. Değer kullanıcının kendi ayarından gelir, logdan gelmez. |
| Eksik değişken | Buton pasif görünür, üzerinde gerekçe yazar. Ayarlar sayfası da uyarır. |
| KQL'de değişken | Kullanılabilir. Alan değerleri gibi çift tırnak içine alınır. |
| Data view adının eşleşmesi | Discover'da görünen ad (`name`, 8.x/9.x) ya da index deseni (`title`, her sürüm) birebir tutarsa. |
| Ad bulunamazsa ya da birden fazla eşleşirse | İki durumda da buton pasif görünür ve gerekçesini yazar. |
| Ayar alanı | Discover aksiyonuna yeni `dataViewName` eklenir. `dataViewId` olduğu gibi kalır; ikisi birlikte dolu olamaz. |
| Adın girilmesi | Ayarlar sayfasında serbest metin. Ayarlar sayfası Kibana'ya bağlanmaz. |
| Adın çözülmesi | Discover'da, çubuk yüklenirken (yaklaşım A). |
| Ayar sürümü | `schemaVersion` 2'ye çıkar. Sürüm 1 ayarlar yüklenirken çevrilir. |
| Değişken düzenleme | Ayrı bir "Değişkenler" bölümünde tablo: satırlar değişken, sütunlar ortam. |
| Eklenti sürümü | 1.0.0'a dahil. |

Reddedilen yaklaşım (B): adları ayar kaydedilirken çözüp kimlikleri ortam başına saklamak. Ayarlar sayfasının Kibana'ya bağlanmasını gerektirir. Kibana'da data view değişince saklanan kimlik eskir. Kayıt anında space'e göre değişen sonuç da bilinemez.

## 3. Ayar modeli (schemaVersion 2)

```ts
interface Config {
  schemaVersion: 2;
  environments: Environment[];
  actions: Action[];
  copy: { markdownFields: string[]; maskPatterns: string[] };
}
interface Environment {
  id: string; name: string; kibanaUrl: string;
  variables: Record<string, string>;   // ad → değer; yalnızca boş olmayan değerler saklanır
}
interface DiscoverAction extends ActionBase {
  kind: "discover"; queryTemplate: string;
  dataViewId?: string;                 // mevcut: hedefin kimliği
  dataViewName?: string;               // yeni: hedefin adı ya da index deseni
  windowMinutes?: number;
}
// LinkAction, ActionBase ve Condition değişmez.
```

- **Değişken adı:** `^[A-Za-z0-9_-]+$` kalıbına uyar. Değer boş olmayan bir metindir. Boş değer saklanmaz ve "tanımsız" sayılır.
- **Doğrulama kuralları.** Ana spec §8'deki kurallara şunlar eklenir:
  - `dataViewId` ile `dataViewName` aynı aksiyonda birlikte dolu olamaz. `dataViewName` doluysa boş olmayan bir metindir.
  - `urlTemplate` ya `http://` / `https://` ile başlar ya da ilk karakterinden itibaren bütün yolları `env.` ile başlayan bir yer tutucuyla başlar. Örnekler:
    - `{env.adminUrl}/players/{player_id}` geçerlidir.
    - `{env.a|env.b}/x` geçerlidir.
    - `{context.host|env.h}/x` geçersizdir, çünkü baştaki değer bir log alanından gelebilir ve kodlanır.
  - Değişken adları yukarıdaki kalıba uyar.
- **Sürüm 1'den çevirme.** `parseConfig`, `schemaVersion: 1` olan bir girdiyi kabul eder:
  - Her ortama `variables: {}` eklenir ve sürüm 2'ye yükseltilir. Ardından sürüm 2 kurallarıyla doğrulanır.
  - Çevirme `parseConfig` içinde yapılır. Böylece hem içe aktarılan dosyalar hem de `chrome.storage.local`'da duran sürüm 1 ayarlar (`storage.ts` yüklerken `parseConfig` kullanır) kaybolmadan çevrilir.
  - Sürüm 1 bir ayar, depoya ancak bir sonraki kayıtta sürüm 2 olarak yazılır.
  - 2'den büyük bir sürüm reddedilir.
- **Dışa aktarma:** Dosya her zaman sürüm 2 olarak yazılır. Eklentinin eski bir sürümü bu dosyayı açıkça reddeder; alanları sessizce atmaz.

## 4. Şablon kuralları

Ana spec §7.2 ve §7.3'e eklenenler:

- **Yer tutucu kalıbı değişmez:** `{yol|yedek…}`. `env.` ile başlayan bir yol, açık ortamın `variables` kaydında `env.` sonrası adla aranır. Diğer yollar log alanı olarak aranır.
- **Yedek sırası:** Yollar soldan sağa denenir. İlk değeri olan yol kullanılır, bu bir değişken ya da bir alan olabilir.
- **Kodlama:**
  - Link adresinde değer bir değişkenden geldiyse olduğu gibi eklenir. Bir alandan geldiyse `encodeURIComponent` ile kodlanır.
  - KQL'de her ikisi de §7.3'teki gibi çift tırnak içine alınır ve kaçış karakterleriyle yazılır.
- **Yer tutucunun türü:** İçinde en az bir log alanı yolu bulunan yer tutucu "alan yer tutucusu" sayılır. Bütün yolları `env.` olan yer tutucu "değişken yer tutucusu" sayılır.

## 5. Discover'daki davranış

### 5.1 Değişkenler

İçerik betiği açık ortamı bugün zaten buluyor (`activeEnvironment`). Bu ortamın kaydı, yani adı ve `variables` alanı, buton çubuğuna verilir.

### 5.2 Data view listesi

- **İstemci:** Kibana istemcisine `listDataViews(): Promise<{ id: string; title: string; name?: string }[]>` eklenir.
  - 8.x/9.x: `GET <önek>/api/data_views` → `data_view[]` (`id`, `title`, `name`).
  - Bu çağrı 404 dönerse (7.17): `GET <önek>/api/saved_objects/_find?type=index-pattern&fields=title&per_page=10000` → `saved_objects[]` (`id`, `attributes.title`). 7.17'de görünen ad yoktur.
  - Hata sınıfları mevcut istemciyle aynıdır: `forbidden`, `incompatible`, `server`, `network`.
- **Önek:** `<önek>` space'i de içerdiği için liste yalnızca açık space'in data view'larını getirir.
- **Ne zaman çekilir:** Liste yalnızca açık ortamın etkin aksiyonlarından en az biri `dataViewName` kullanıyorsa çekilir.
- **Önbellek:** Sayfa boyunca istemci başına bir kez çekilir. Başarısız bir çağrı önbellekten düşer ve bir sonraki çubukta yeniden denenir.
- **Eşleşme:** Bir data view'ın `name` ya da `title` değeri, butondaki `dataViewName` ile büyük/küçük harf dahil birebir aynıysa eşleşmiş sayılır. Farklı kimliklerdeki eşleşmeler sayılır:
  - Sıfır eşleşme: "bulunamadı".
  - Bir eşleşme: o data view'ın kimliği kullanılır.
  - Birden fazla eşleşme: "belirsiz".
- **Zaman alanı:** Ad çözüldükten sonra hedefin zaman alanı bugünkü `getDataView(id)` ile okunur (`bar-data.ts`).

### 5.3 Buton durumu

Bir buton şu kontroller sırayla uygulanarak üç durumdan birine girer: gizli, pasif (gri, üzerinde gerekçe yazar) ya da etkin.

1. **Gizli:**
   - aksiyon kapalıysa,
   - koşulları sağlanmıyorsa,
   - ya da bir **alan yer tutucusunun** hiçbir yolunda değer yoksa. Değişkenli bir yedek de değer vermiyorsa bu durum da buraya girer.

   Böylece butonun ilgisiz olduğu loglarda pasif butonlar birikmez.
2. **Pasif, "tanımsız değişken":** Bir **değişken yer tutucusunun** hiçbir değişkeni açık ortamda tanımlı değilse.
   - Gerekçe: "‹ortam› ortamında ‹ad› tanımlı değil". Yer tutucu birden fazla değişken içeriyorsa ilk ad yazılır.
3. **Pasif, "geçersiz değişken":** Link şablonu bir değişkenle başlıyorsa ve gelen değer `http://` ya da `https://` ile başlamıyorsa.
   - Gerekçe: "‹ortam› ortamında ‹ad› bir http(s) adresi değil".
4. **Gizli, "geçersiz adres":** Çözülmüş link adresi geçerli bir `http(s)` adresi değilse. Bu bugünkü kuraldır.
5. **Yalnızca Discover aksiyonlarında, `dataViewName` doluysa:**
   - Liste alınamadıysa pasif: "Data view listesi alınamadı".
   - Ad bulunamadıysa pasif: "‹ad› adlı data view bu space'te yok".
   - Ad belirsizse pasif: "‹ad› adıyla ‹n› data view eşleşti".
6. **Yalnızca Discover aksiyonlarında, zaman penceresi:** Bugünkü pasif durum (`noTime`) aynen korunur.

`LinkButton` türü de `DiscoverButton` gibi bir pasif varyant kazanır: `{ id, label, disabled, detail }`. Burada `disabled` gerekçenin türüdür, `detail` ise metne giren ad, ortam ve sayı bilgisidir. Pasif butonlar Discover butonlarının bugünkü pasif görünümünü kullanır.

### 5.4 Hata yönetimi

- Liste çağrısı başarısız olursa ya da beklenmedik bir yanıt gelirse yalnızca `dataViewName` kullanan butonlar pasif olur. Çubuğun geri kalanı ve Kibana etkilenmez.
- Hata yalnızca `console.debug("[kibanatool]", …)` ile yazılır, ana spec §10'daki kurala uygun olarak.

## 6. Ayarlar sayfası

- **Değişkenler bölümü.** Ortamlar ile Aksiyonlar bölümlerinin arasında yer alır:
  - Tabloda satırlar değişken adlarıdır (bütün ortamlardaki adların birleşimi), sütunlar ortamlardır. Her hücre metin girişidir. Boş hücre o ortamda tanımsız demektir ve uyarı işaretiyle gösterilir.
  - **Değişken ekle:** Ad girilir. Kalıba uymayan ya da zaten var olan ad reddedilir.
  - **Satırı sil:** Değişken bütün ortamlardan silinir.
  - **Adı değiştir:** Ad bütün ortamlarda değişir. O adı kullanan şablonlar kendiliğinden güncellenmez; uyarı olarak görünürler.
  - **Kaydet:** Tablonun tamamı tek seferde kaydedilir. Doğrulama hataları bugünkü geri bildirim düzeniyle gösterilir.
  - Hiç ortam yoksa bölümde "Önce bir ortam ekleyin" notu görünür.
  - Girilen ad ve değerlerin başındaki ve sonundaki boşluklar kırpılır. `dataViewName` girişi için de aynısı geçerlidir.
- **Aksiyon düzenleyici:**
  - **"Hedef data view":** Discover aksiyonlarında "ad / kimlik" seçimi ve bir metin girişi bulunur. Varsayılan seçim ad. `dataViewId` kullanan mevcut aksiyonlar düzenlenmek üzere açıldığında kimlik seçili gelir. Giriş boşsa açık data view kullanılır, bugünkü gibi.
  - **URL alanının açıklaması:** `{env.ad}` yazımını da anlatır.
- **Uyarılar:**
  - **Kaynak:** `variableWarnings(config, action)` uyarıları yalnızca ayarlara bakarak hesaplar. Aksiyonun geçerli olduğu her ortam için (`environmentIds` boşsa hepsi) iki tür uyarı üretir:
    - Değişken yer tutucularında tanımsız olan değişkenler.
    - Değeri `http(s)` ile başlamayan, şablonun başındaki değişken.
  - **Gösterim:** Aksiyon listesinde ve düzenleyicide "‹ortam›: ‹ad› tanımlı değil" biçiminde görünür.
  - Ayarlar sayfası Kibana'ya bağlanmadığı için data view adları burada doğrulanmaz.
- **Önizleme:**
  - Düzenleyicinin önizleme bölümüne "önizleme ortamı" seçimi eklenir. Seçenekler aksiyonun geçerli olduğu ortamlardır; varsayılan ilk ortamdır.
  - Önizleme o ortamın değişkenleriyle yapılır ve tanımsız ya da geçersiz değişkeni gerekçesiyle gösterir.
  - `dataViewName` doluysa önizleme sorgunun yanında "‹ad› — Discover'da çözülür" notunu gösterir.
- **Dışa/içe aktarma:**
  - Dışa aktarılan dosya sürüm 2'dir.
  - Sürüm 1 bir dosya içe aktarılırken çevrilir (§3).
  - İçe aktarma önizlemesi değişmez.
- **Dil:** Bütün yeni metinler `src/i18n.ts` içindeki `MessageKey` birleşimine ve `public/_locales/{en,tr}/messages.json` dosyalarına eklenir.

## 7. Güvenlik ve gizlilik

- **Değişkenler:** Değerleri kullanıcının kendi ayarlarında durur ve yalnızca `chrome.storage.local`'a yazılır. Logdan gelen hiçbir değer kodlanmadan adrese girmez. Kodlanmadan eklenen tek şey değişkenlerdir.
- **İstek ve izinler:** Liste çağrısı da diğer çağrılar gibi kullanıcının oturumuyla, açık Kibana'nın kendi origin'ine yapılır. Yeni bir izin gerekmez.

## 8. Test stratejisi

### 8.1 Birim testleri (Vitest, önce test)

- **Şablon:**
  - `{env.…}` yer tutucuları.
  - Değişkenle alanın birlikte kullanıldığı yedek yollar.
  - Değişkenin kodlanmadan, alanın kodlanarak eklenmesi.
  - KQL'de değişkenin tırnaklanması.
  - Alan ve değişken yer tutucusunun ayrımı.
- **Ayar:**
  - Sürüm 2 şeması.
  - Sürüm 1'den 2'ye çevirme, hem dosya hem depodan yükleme için.
  - 2'den büyük sürümün reddedilmesi.
  - `dataViewId` ile `dataViewName`'in birlikte dolu olması.
  - Değişken adı kalıbı.
  - Yeni `urlTemplate` başlangıç kuralı.
- **Buton durumu:**
  - §5.3'teki sıralama.
  - Her pasif gerekçe.
  - Alan eksikken pasif değil gizli olma.
- **Ad çözme:**
  - Sıfır, bir ve birden fazla eşleşme.
  - `name` ile ve `title` ile eşleşme.
  - Liste hatası.
- **İstemci:**
  - 8.x/9.x yanıtı.
  - 7.17'de 404 sonrası geri dönüş.
  - Hata sınıfları.
  - Önbellek ve başarısızlıkta önbellekten düşme.
- **Ayarlar sayfası:**
  - Tablo işlemleri: ekleme, silme, ad değiştirme, boş hücre.
  - `variableWarnings`.
  - Ortama göre önizleme.

### 8.2 Uçtan uca testler (Playwright, 7.17 / 8.19 / 9.5)

- **Seed:** 8.x ve 9.x'e yeni bir data view eklenir. Görünen adı index deseninden farklıdır ve index deseni var olan bir data view'ınkiyle aynıdır. Böylece görünen adla eşleşme ve belirsizlik test edilebilir.
  - `docker/seed.mjs` ile `tests/e2e` birlikte değişir, ana CLAUDE.md'deki sözleşme kuralı geçerlidir.
  - Değişikliğin var olan testleri bozmaması gerekir; var olan testler data view'ları kimlikle açıyor.
- **Senaryolar:**
  - `dataViewName` ile hedeflenen Discover butonu doğru data view'ı açar. `test` space'inde aynı ad oradaki data view'a çözülür.
  - Tanımsız değişkende link butonu pasif olur ve gerekçe gösterir.
  - Bilinmeyen adda buton pasif olur. Yalnızca 8.x/9.x'te: belirsiz adda buton pasif olur.
  - Ayarlar sayfasında değişken tablosu düzenlenir ve aksiyon uyarısı görünür.
  - Sürüm 1 bir dosya içe aktarılır ve sürüm 2 olarak saklanır.

## 9. Teslim ve belgeler

- **Belgeler:**
  - README: değişken ve `dataViewName` örnekleri.
  - `examples/kibanatool-settings.json`: sürüm 2'ye geçer, en az bir `{env.…}` ve bir `dataViewName` örneği içerir. `tests/unit/examples.test.ts` bu dosyayı doğrulamaya devam eder.
  - CHANGELOG'daki 1.0.0 başlığına eklenir.
- **CLAUDE.md:** "Traps" listesine iki satır eklenir:
  - `env.` ile başlayan yer tutucu yolları log alanı değil, ortam değişkenidir. Değeri link adresine kodlanmadan eklenir.
  - Ayar sürümü değişince çevirme `parseConfig` içinde yapılır. Yapılmazsa `storage.ts` depodaki eski ayarı boş ayara çevirir.
- **Alpha ayar dosyası:** Uygulamadan sonra `~/Downloads/kibanatool-alpha.json` yeni biçime çevrilir. Dosya repoya girmez.
  - Admin ve ödeme adresleri `{env.adminUrl}` ve `{env.paymentUrl}` olur.
  - Data view kimlikleri adlarla değişir.
  - Alpha'nın değişken değerlerini kullanıcı girer.
- **Bu spec:** `docs/superpowers/` altında yerelde kalır, commit edilmez.

## 10. Kapsam dışı

- Değişkenlerin şu yerlerde kullanılması:
  - koşul değerleri,
  - buton etiketi,
  - maskeleme desenleri,
  - Markdown alanları,
  - `dataViewName` içi.
- Bütün ortamlara tek seferde uygulanan ortak ya da varsayılan değişkenler.
- Ayarlar sayfasında data view adının Kibana'ya sorularak doğrulanması ya da listeden seçilmesi.
- Değişken adı değişince şablonların otomatik güncellenmesi.

## 11. Doğrulanmış ve doğrulanmamış noktalar

- **Doğrulanmış (2026-10-09):**
  - Yerel stack'lerde:
    - `GET /api/data_views` 8.19.23 ve 9.5.5'te `data_view[]` olarak `id`, `title` ve `name` döndürüyor.
    - Aynı çağrı 7.17.29'da 404 döndürüyor.
    - `api/saved_objects/_find?type=index-pattern` üç sürümde de çalışıyor. 7.17'de `name` gelmiyor.
    - `/s/<space>/` öneki yalnızca o space'in data view'larını getiriyor.
  - Alpha'da (7.17.26): `_find` 23 data view döndürdü.
- **Doğrulanmamış:**
  - Bir space'te 10000'den fazla data view olması. Sınır olarak kabul edildi.
  - `_find`'in gelecekteki 7.17 dışı sürümlerde kaldırılması. Yalnızca 404 sonrası geri dönüşte kullanılıyor.
