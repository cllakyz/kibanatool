# Kural: Obsidian ikinci beyin

Kasa: `/Users/celal.akyuz/Documents/spine-os/second-brain/genel/kibanatool/` (pano `00-Index.md`, ADR indeksi `02-Decisions/ADR-Index.md`, şablonlar `00-Meta/Templates/`).

## Okuma

Bir göreve başlamadan önce `00-Index.md`'den ilgili notları ve kabul edilmiş (`accepted`) ADR'leri oku. Kasa ile depo (kod, `CLAUDE.md`, constitution) çelişirse depo esastır; kasadaki notu düzelt ve farkı günlüğe yaz.

## Kayıt akışı

Kullanıcı bir mimari karar, ürün kuralı, UI tercihi veya kısıt bildirdiğinde ("şöyle olsun", "bunu kural yap", "bundan sonra hep…") ayrı talimat beklemeden:

1. Son ADR numarasını `02-Decisions/ADR-Index.md`'den al; yenisi bir fazlası, 4 haneli.
2. `00-Meta/Templates/tpl-adr.md` şablonuyla `02-Decisions/ADR-XXXX-kisa-slug.md` yaz (frontmatter `title`, `date`, `status`, `deciders`, `tags`; bölümler şablondaki sırayla). Kanıtı (dosya, commit, ilgili ADR) `İlgili Bağlantılar`'a koy; doğrulanamayanı `> Doğrulanmadı:` ile işaretle.
3. `ADR-Index.md` tablosuna (No, Başlık, Durum, Tarih, Karar Sahibi) ve `00-Index.md` → Kararlar listesine ekle.
4. Karar bir ilkeyse `01-Architecture/AI-Engineering-Charter.md`'ye ekle.
5. `05-Daily-Logs/YYYY-MM-DD-<slug>.md` günlüğüne (`tpl-daily-worklog.md` biçimi; günün dosyası varsa ona ekle) not düş.

Var olan notları ezme, silme veya yeniden adlandırma; ekleme yap. Kasaya gizli değer (`.env`, `docker/.env.<major>`, token, parola) yazma.

## Hangi durumlar karar sayılır

- Ayar şeması (`src/core/config.ts`) veya kapalı değer kümesi (`as const` diziler: operatörler, maske türleri, yapılandırılmış metin türleri) değişikliği, `schemaVersion` artışı
- İzin, kimlik ve yetki kuralları: manifest izinleri, içerik betiği kaydı, Kibana'ya istek biçimi ve başlıkları
- Gizlilik ve maskeleme kuralları
- Yeni kütüphane, servis, Kibana API'si veya yayın/CI akışı seçimi
- Constitution'a istisna veya değişiklik
- Kullanıcının açıkça "kaydet" dediği her şey

Projede ödeme veya fiyatlandırma mantığı yoktur; eklenirse o da karar sayılır.

## Çelişki koruması

Yeni istek kabul edilmiş bir ADR ile çelişiyorsa kodu hemen değiştirme. Eski kararı `[[ADR-XXXX-…]]` bağlantısıyla hatırlat ve kullanıcıya sor: eskisi devredilsin (`superseded`) mi, yoksa bu bir istisna mı? Onay gelirse yeni ADR frontmatter'da `supersedes: ADR-XXXX` ile açılır, eskisinin `status` alanı ve `## Durum` satırı `superseded` olur ve iki indeks güncellenir. İstisnaysa istisna yeni bir ADR'de veya eski ADR'ye eklenen bir notta gerekçesiyle kaydedilir.
