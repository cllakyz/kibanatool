---
title: "ADR-0010: XML metnini DOMParser yerine src/core/xml.ts ile ayrıştırmak"
date: 2026-10-13
status: accepted
deciders: ["celal.akyuz"]
tags:
  - adr
  - architecture-layers
---

# ADR-0010: XML metnini DOMParser yerine src/core/xml.ts ile ayrıştırmak

## Durum

**Durum:** `accepted`
**Tarih:** 2026-10-13

## Bağlam ve Problem Tanımı

SOAP gövdeleri gibi XML tutan alanlar View panelinde, kopyalarda ve placeholder'larda JSON gibi okunmalı. Ayrıştırma bir iş kuralı olduğu için `src/core`'da olmalı; core tarayıcı API'si kullanamaz. Birim testlerinin DOM'u happy-dom, Chrome'un kabul ettiği CDATA ve tanımsız önekleri reddeder.

## Karar Etkenleri

- Constitution ilke I (core'da tarayıcı API'si yok)
- Test ortamı ile Chrome arasında aynı davranış
- Maskelerin XML içine ulaşabilmesi

## Değerlendirilen Seçenekler

1. `DOMParser`
2. Core'da kendi XML ayrıştırıcısı

## Karar Sonucu

Seçilen seçenek: **2 — `src/core/xml.ts`**. Değerler her zaman metindir; `@ad` anahtarları öznitelik, `#text` yanındaki metin; ad alanı önekleri düşürülür. Placeholder deseni `#`'e izin verir. Metin türü `parseStructured` (`src/core/fields.ts`) ilk karaktere göre seçer (`STRUCTURED_KINDS` = `json`, `xml`, `form`).

## Sonuçlar ve Etkiler

### Olumlu Etkiler

- Tarayıcısız ve deterministik test; Chrome ile happy-dom farkı yok.

### Olumsuz Etkiler / Ödünler

- Ayrıştırıcının bakımı projede; tam XML uyumluluğu hedeflenmez.

## İlgili Bağlantılar

- `src/core/xml.ts`, `src/core/fields.ts`, `tests/unit/core/xml.test.ts`
- `docs/superpowers/specs/2026-10-12-xml-json-design.md`
- Commit `3da5b47` (2026-10-13) feat: parse XML text into JSON; `3a053aa`, `16e5243`
- [ADR-0005](0005-layered-architecture-constitution.md)
