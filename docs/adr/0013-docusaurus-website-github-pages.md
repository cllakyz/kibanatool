---
title: "ADR-0013: Docusaurus web sitesi ayrı paket olarak website/'da, GitHub Pages'e sürüm etiketiyle yayın"
date: 2026-10-22
status: accepted
deciders: ["celal.akyuz"]
tags:
  - adr
  - website
  - release
---

# ADR-0013: Docusaurus web sitesi ayrı paket olarak website/'da, GitHub Pages'e sürüm etiketiyle yayın

## Durum

**Durum:** `accepted`
**Tarih:** 2026-10-22

## Bağlam ve Problem Tanımı

kibanatool'u hiç duymamış Web Store/GitHub ziyaretçisi için tanıtım sayfası ve iki dilde kullanım kılavuzu gerekiyordu; README kısalmalıydı. Docs, mağazadaki sürümle uyumlu olmalı.

## Karar Etkenleri

- İngilizce ve Türkçe tam içerik
- Eklenti paketine bağımlılık eklememek
- Dışarıya istek atmayan site (arama ve fontlar yerel)
- Docs'un mağazadaki sürümün önüne geçmemesi

## Değerlendirilen Seçenekler

1. Docs'u README'de tutmak
2. Docusaurus sitesi, `main`'e her push'ta yayın (ilk hali)
3. Docusaurus sitesi, `v*` etiketiyle veya elle yayın

## Karar Sonucu

Seçilen seçenek: **3**. Site `website/`'da kendi `package.json`'ıyla ayrı bir pakettir ve eklentinin `src/`'sini asla içe aktarmaz. `https://cllakyz.github.io/kibanatool/` adresinde (Türkçe `/tr/`). `.github/workflows/website.yml` `website/**` veya `CHANGELOG.md` değişen PR'larda build ve smoke test eder; `v*` etiketi push'lanınca (mağaza o sürümü yayımladıktan sonra) veya elle çalıştırılınca yayınlar. Push-to-main yayını 2026-10-22'de kullanıcı kararıyla (PR #18) etikete çevrildi.

## Sonuçlar ve Etkiler

### Olumlu Etkiler

- Site her zaman mağazadaki sürümün docs'unu gösterir; sürüm notları build anında `CHANGELOG.md`'den okunur.
- Docs sayfaları iki dilde birlikte eklenir (`website/tests/docs-parity.test.mjs`).

### Olumsuz Etkiler / Ödünler

- Elle yayın dalı olduğu gibi yayınlar; `main`'de mağazada olmayan bir özelliğin docs'u varken kullanılmamalı.
- Değişen eklenti UI metni iki dilde docs güncellemesi gerektirir.

## İlgili Bağlantılar

- `website/`, `website/docusaurus.config.ts`, `website/plugins/changelog.mjs`, `website/src/constants.ts`, `.github/workflows/website.yml`
- `docs/superpowers/specs/2026-10-21-website-design.md` §3 (K1–K12), §4; `docs/superpowers/plans/2026-10-22-plan-8-website.md`
- Commit'ler `090fff5`, `4da4bbf`, `fa2944d`, `9dafaaf`, `c34b79a` (2026-10-22); PR #18
