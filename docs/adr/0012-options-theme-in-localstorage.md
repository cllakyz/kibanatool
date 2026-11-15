---
title: "ADR-0012: Ayarlar sayfasının tema seçimi localStorage'da, src/theme.ts üzerinden (constitution V istisnası)"
date: 2026-10-20
status: accepted
deciders: ["celal.akyuz"]
tags:
  - adr
  - ui
  - storage
---

# ADR-0012: Ayarlar sayfasının tema seçimi localStorage'da, src/theme.ts üzerinden (constitution V istisnası)

## Durum

**Durum:** `accepted`
**Tarih:** 2026-10-20

## Bağlam ve Problem Tanımı

Ayarlar sayfasına Sistem/Açık/Koyu tema seçimi eklendi (spec-kit 006). Seçim ilk kareden önce uygulanmalı, yoksa sayfa diğer temayla yanıp söner. Constitution V depolamanın `src/storage.ts`'den geçmesini ister; ancak bu yol head betiğine ayar şemasını ve zod'u paketliyordu (mağaza paketinde 3.6 kB yerine 97 kB).

## Karar Etkenleri

- İlk karede doğru tema (flash yok)
- Head betiğinin küçük kalması
- Constitution ile tutarlılık

## Değerlendirilen Seçenekler

1. Seçimi `chrome.storage`'da ayarlarla birlikte tutmak (`src/storage.ts`)
2. Eklentinin `localStorage`'ında `kibanatool.theme`, okuma/yazma `src/theme.ts`'de; constitution V'ye adlı istisna

## Karar Sonucu

Seçilen seçenek: **2**, kullanıcının daha küçük paketi istemesiyle (constitution Sync Impact Report, 2026-10-20). `options-theme.js` `<head>`'de klasik betik olarak paleti enjekte edip `html[data-theme]`'i ilk kareden önce ayarlar; asla `type="module"`, `defer` veya `async` yapılmaz. Seçim ayarlar dosyasına, dışa aktarmaya girmez; araç çubuğu ikonu, aksiyon çubuğu ve satır şeridi bu seçime bağlanmaz.

## Sonuçlar ve Etkiler

### Olumlu Etkiler

- Head betiği küçük; tema yanıp sönmesi yok.

### Olumsuz Etkiler / Ödünler

- Constitution V'de kalıcı ve adlı bir istisna (v1.0.7).
- Tema seçimi dışa/içe aktarmayla taşınmaz.

## İlgili Bağlantılar

- `src/theme.ts`, `entrypoints/options-theme.ts`, `entrypoints/options/ThemeSwitch.tsx`
- `.specify/memory/constitution.md` (v1.0.7, ilke V), `specs/006-theme-toggle/`
- Commit'ler `d411ce6`, `6ebe900` (2026-10-20)
- [ADR-0004](0004-local-storage-zod-schema-versioning.md), [ADR-0011](0011-borealis-theme-tokens-wcag-test.md)
