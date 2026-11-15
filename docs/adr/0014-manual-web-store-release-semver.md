---
title: "ADR-0014: Chrome Web Store'a wxt zip ile elle yayın, semver ve CHANGELOG"
date: 2026-10-08
status: accepted
deciders: ["celal.akyuz"]
tags:
  - adr
  - release
---

# ADR-0014: Chrome Web Store'a wxt zip ile elle yayın, semver ve CHANGELOG

## Durum

**Durum:** `accepted`
**Tarih:** 2026-10-08

## Bağlam ve Problem Tanımı

Eklenti Chrome Web Store üzerinden dağıtılır. Mağaza incelemesi ve listeleme metinleri elle yönetilir; otomatik mağaza yayını v1 kapsam dışıdır (spec §15).

## Karar Etkenleri

- Basit ve denetlenebilir yayın
- Sürüm geçmişinin kullanıcıya görünmesi (site de CHANGELOG'u okur)

## Değerlendirilen Seçenekler

1. CI'dan otomatik mağaza yayını
2. `npm run zip` ile paket, mağazaya elle yükleme; semver, Keep a Changelog biçiminde `CHANGELOG.md`

## Karar Sonucu

Seçilen seçenek: **2**. `npm run zip` → `.output/kibanatool-<version>-chrome.zip` mağazaya elle yüklenir; mağaza sürümü yayımlayınca `v<version>` etiketi push'lanır (bu siteyi de yayınlar). 1.0.0 2026-10-20 tarihli ilk genel sürümdür; mağaza listesi 2026-10-22'de README'ye bağlandı. Listeleme metinleri `docs/store-listing.md`'de.

## Sonuçlar ve Etkiler

### Olumlu Etkiler

- Mağaza kimlik bilgisi CI'da tutulmaz.

### Olumsuz Etkiler / Ödünler

- Yayın elle yapılır; etiketin mağaza onayından sonra push'lanması insan disiplinine bağlı.

## İlgili Bağlantılar

- `package.json` (`zip`, `icons`), `CHANGELOG.md`, `docs/store-listing.md`, `README.md` → Release
- Spec §14
- Commit'ler `107a5ab`, `e25f87a` (2026-10-08), `d5d3281`, `384d9d8` (2026-10-20), `dc84363` (2026-10-22)
- [ADR-0013](0013-docusaurus-website-github-pages.md)
