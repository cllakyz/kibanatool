# Web sitesi doğrulaması (Plan 8)

- **Tarih:** 2026-10-22
- **Dal:** `website`, HEAD `ac4b366`
- **Spec:** `docs/superpowers/specs/2026-10-21-website-design.md`; plan `docs/superpowers/plans/2026-10-22-plan-8-website.md` (Task 8)
- **Araçlar:** Docusaurus 3.10.2, Playwright 1.64 (Chromium), Node v24 (CI'da 22). Elle kontroller uygulamanın tarayıcı
  panelinde, `npm --prefix website run serve` ile sunulan build'e karşı yapıldı.

## Otomatik kontroller

| Kontrol | Sonuç |
|---|---|
| `npm run typecheck`, `npm test` (kök) | Geçti; 583 test (45 dosya). Task 1'den önce 581'di; iki örnek dosyanın testi eklendi. |
| `npm run build`, `npm run check:manifest` | Geçti; eklentinin manifest'i değişmedi. |
| `npm --prefix website test` | 5 test geçti: CHANGELOG ayrıştırıcı (4) ve docs eşliği (1). |
| `npm --prefix website run build` | `en` ve `tr` build'i uyarısız; kırık link yok. |
| `npm --prefix website run smoke` | 7 test geçti: dış istek ve başarısız yanıt yok, JavaScript'siz demo, demo seçimi, sekmeler, linkler, 375px, Türkçe ana sayfa. |

## Elle kontroller

| # | Kontrol | Sonuç |
|---|---|---|
| M1 | 1280px ve 375px, açık ve koyu tema; ana sayfa ve docs | Geçti. Bölüm sırası ve zeminler spec §6.2'deki gibi. 375px'te `scrollWidth` 375: Türkçe "cURL olarak kopyala", "Example actions" ve "Releases" sayfaları. Releases'ta tek `<h1>`. 1280px ve koyu tema görüntüleri Task 3 ve 5'te alındı. |
| M2 | Türkçe karakterler | Geçti. `document.fonts.check('800 40px "Schibsted Grotesk"', 'İğşıçöü')` doğru; Schibsted Grotesk'in `latin-ext` dosyaları (400, 700, 800) Türkçe sayfada yükleniyor, yedek fonta düşmüyor. |
| M3 | Klavye | Geçti. Tab sırası: içeriğe atla, logo, Docs, Releases, arama, dil, GitHub, tema düğmesi, "Add to Chrome"; odak halkası görünür. Demo ve sekmelerin klavye davranışı smoke testinde. |
| M4 | Arama | Geçti. "masking" İngilizce sitede, "maskeleme" Türkçe sitede ilk sonuç olarak "Copy and masking" / "Kopyalama ve maskeleme" sayfasını buluyor; aramada dışarıya istek yok. |
| M5 | `prefers-reduced-motion: reduce` | Geçti. Build'deki CSS'te kural var: `transition: none` ve Infima'nın geçiş süreleri 0. |

## Karşıtlık (WCAG AA)

`src/theme.ts`'teki göreli parlaklık formülüyle:

| Çift | Açık | Koyu |
|---|---|---|
| Demoda işaretli satır: değer / işaret | 4.68:1 | 6.00:1 |
| Demoda işaretli satır: anahtar / işaret | 6.31:1 | 6.21:1 |
| İkincil metin / tonlu bölüm | 5.76:1 | 7.52:1 |
| Discover tonlu buton metni | 5.85:1 | 5.12:1 |
| Dolu buton metni | 5.41:1 | 7.40:1 |

Hepsi metin için 4.5:1'in üstünde. Task 3'ün gözden geçirmesinde düz demo butonunun hover rengi açık temada 4.36:1
çıkmıştı; `--kt-discover-text`'e çevrildi (5.85:1).

## Açık kalanlar

- ~~Store item ID'si~~: tamam (2026-10-22, final review). Store'daki 1.0.0 listesi
  `https://chromewebstore.google.com/detail/kibanatool/flgnjcjghmbcnfhilikbeddkhjiagodp`; `website/src/constants.ts`
  ve README bu adrese gidiyor.
- GitHub Pages'in "GitHub Actions" kaynağıyla açılması, `github-pages` environment'ına `v*` etiket kuralının
  eklenmesi ve merge'den sonra ilk yayının elle "Run workflow" ile yapılması (kullanıcı). Site 2026-10-22'den beri
  `main`'e push'ta değil, `v*` etiketinde ve elle yayınlanıyor.
- PR'ın `main`'e birleştirilmesi (kullanıcı).
