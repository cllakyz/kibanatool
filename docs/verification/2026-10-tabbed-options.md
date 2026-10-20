# Sekmeli seçenekler sayfası doğrulaması (spec-kit 005)

- **Tarih:** 2026-10-20
- **Dal:** `005-tabbed-options`, HEAD `15cb29a` (kayıt commit'inden önceki HEAD)
- **Spec:** `specs/005-tabbed-options/` (doğrulama adımları `quickstart.md`'de)
- **Tasarım:** claude.ai Design System "kibanatool options" (https://claude.ai/artifact/3tM377bw1BM4dB5Nq3dFop)
- **Kibana:** 9.5.5 (`http://localhost:19601`). Seed bu özellikte değişmedi.
- **Araçlar:** Playwright 1.64.0, Chromium (Playwright'ın kendi sürümü), Node v24.21.0. macOS dili `tr-TR`, bu yüzden
  Chromium arayüzü Türkçe.

## Otomatik kontroller

| Kontrol | Sonuç |
|---|---|
| `npx vitest run` | 571 test geçti (45 dosya). Başlangıçta 565 test vardı; 3 yeni kontrast çifti × 2 tema. |
| `npm run typecheck`, `npm run build`, `npm run check:manifest` | Üçü de geçti. Manifest değişmedi. |
| Token kontrolü | `options.css`'teki 37 `var(--kt-…)` adının hepsi `src/theme.ts`'te ya da font değişkenlerinde tanımlı. |
| E2E `options` (9.5) | 10 test geçti: 8 eski test sekmelere göre uyarlandı, 2 yeni test (sekmeler; diyalog). |
| E2E 9.5, tamamı | 41 geçti, 5 atlandı, 1.2 dk. Atlananlar önceki özelliklerdekiyle aynı. |
| E2E 7.17 ve 8.19 | Yerelde koşulmadı; PR'da CI matrisi koşar (G4). |

Diyalog testindeki "Geri" kontrolünün gerçekten bir şey yakaladığı denendi. `hashchange` dinleyicisi geçici olarak
kapatılınca test kırıldı: Geri'den sonra modal açık kaldı. Dinleyici geri konunca test geçti.

İnceleme bir boşluk daha buldu. Hatalı bir kayıttan sonra Geri'ye basılınca diyalog kapanıyordu, ama hata bölümde
kalıyordu; Aksiyonlar'a dönen kullanıcı nedeni görünmeyen bir hata görüyordu. Diyalog testine bu adım eklendi ve
test önce kırıldı. `hashchange` artık İptal ile aynı yolu (`cancel`) kullanıyor, hatayı da temizliyor; test geçti.

Kaydet'ten sonra odağın açan butona dönmesini kontrol eden adım, uygulama sırasında bir hata buldu. Odak
`useLayoutEffect` temizliğinde geri veriliyordu. Bu temizlik diyalog sayfadan kalkmadan çalıştığı için sayfa hâlâ
inertti ve `focus()` etkisiz kalıyordu. Odak artık pasif bir effect'in temizliğinde geri veriliyor (research R2).

## Görsel kontrol (quickstart.md)

`examples/kibanatool-settings.json` yüklendi. Bir aksiyon kapatıldı, bir ikinci aksiyon "Satırda göster" yapıldı.
Ekran görüntüleri scratchpad'deki bir Playwright betiğiyle alındı ve repoya eklenmedi.

| # | Kontrol | Sonuç |
|---|---|---|
| G1 | 1000px'te, Türkçe beş sekme adının hepsi sığıyor: bar kaymıyor (`scrollWidth` = `clientWidth` = 639 px). Açık ve koyu temada aynı (SC-002). | Geçti |
| G2 | Açık sekmenin etiketi mavi ve altı mavi çizgili; `h1` onun adını taşıyor. Beş sekmenin hepsi, iki temada. | Geçti |
| G3 | İşaret açık temada açık, koyu temada koyu ikon (FR-007). | Geçti |
| G4 | Ortamlar: sayı rozeti; adres ikinci satırda; izin durumu ve butonlar sağda; ekleme formu panelin altında. | Geçti |
| G5 | Değişkenler: "Değişken ekle" başlıkta, "Kaydet" alt şeritte. | Geçti |
| G6 | Aksiyonlar: tür rozeti her satırda; "Satırda göster" yalnızca işaretli iki aksiyonda; "Kapalı" durumu; şablon satırı (Discover'da sorgu ya da "(boş sorgu)" ve zaman aralığı). Liste boşken kesik çizgili tek satır. | Geçti |
| G7 | Diyalog: arka plan karartılıyor; başlıkta etiket, tür rozeti ve ×; gövde kayıyor, başlık ve alt şerit yerinde kalıyor; açık temada gölge var. | Geçti |
| G8 | Kopyalama ve maskeleme: etiket sütunu solda; 004 notu maske alanının altında; "Kaydet" alt şeritte. Kayıttan sonra not şeridin solunda görünüyor. | Geçti |
| G9 | Dışa ve içe aktarma: iki satır, yardım metinleri solda. | Geçti |
| G10 | 700px: Kopyalama alanları tek sütuna iniyor, sekmeler yana kayıyor ve alt satıra geçmiyor. | Geçti |
| G11 | Diyalogda hatalı kayıt (`not a url`): hata diyaloğun içinde görünüyor, bölümde görünmüyor. İptal'den sonra hata kayboluyor ve odak "Link aksiyonu ekle"ye dönüyor (FR-017, FR-018). | Geçti |

Not: ilk ekran görüntülerinde bar bir önceki sekmeyi işaretli gösteriyordu. Ölçümle bunun, sekmelerin 120 ms'lik
renk geçişinin ortasında çekilmiş görüntü olduğu anlaşıldı (500 ms sonra doğru sekme işaretli). Görüntüler
`animations: "disabled"` ile yeniden çekildi; ürün hatası değil.

## Elle yapılacak kontroller

2026-10-20: kullanıcı M1 ve M4'ü main'deki `3762da8`'den derlenen `.output/chrome-mv3` ile elle yaptı; ikisi de geçti. M3, spec 006'nın
M2'siyle geçti (2026-10-20): sayfa Sistem seçiliyken macOS'un açık/koyu değişikliğini izliyor
(`docs/verification/2026-10-theme-switch.md`). M2 açık.

| # | Kontrol | Sonuç |
|---|---|---|
| M1 | Klavye: sayfanın başından Tab ile marka, beş sekme ve içerik sırayla geliyor, her birinde odak halkası var. Aksiyonlar'da Düzenle'ye Enter; Tab diyaloğun içinde kalıyor; Escape kapatıyor ve odak Düzenle'de (SC-006, FR-005). | Geçti (kullanıcı, 2026-10-20) |
| M2 | Ekran okuyucu: VoiceOver açık sekmeyi "geçerli sayfa" olarak, barı da adıyla okuyor (FR-005). | Açık (kullanıcı) |
| M3 | Tema: sayfa açıkken macOS açık ve koyu arasında değiştirilince renkler ve işaret değişiyor (FR-007, SC-005). | Geçti (kullanıcı, 2026-10-20; spec 006 M2 ile, Sistem seçiliyken) |
| M4 | Akışlar: ortam ekleyip izin verme, değişken düzenleme, aksiyon ekleme, düzenleme ve silme, kopyalama ayarlarını kaydetme, dışa aktarma, örnek dosyayı içe aktarma (FR-019, SC-003). | Geçti (kullanıcı, 2026-10-20) |
