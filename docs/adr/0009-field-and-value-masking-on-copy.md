---
title: "ADR-0009: Kopyalarda alan adı maskeleri ve değer içi maskeler (IBAN, TCKN, GSM, kart)"
date: 2026-10-08
status: accepted
deciders: ["celal.akyuz"]
tags:
  - adr
  - privacy
---

# ADR-0009: Kopyalarda alan adı maskeleri ve değer içi maskeler (IBAN, TCKN, GSM, kart)

## Durum

**Durum:** `accepted`
**Tarih:** 2026-10-08 (değer maskeleri 2026-10-12)

## Bağlam ve Problem Tanımı

Loglar paylaşılmak üzere Markdown, JSON veya cURL olarak kopyalanır. Hassas veri yalnızca adı belli alanlarda değil, XML veya düz metin gövdelerinin içinde de bulunur.

## Karar Etkenleri

- Paylaşılan kopyada hassas veri sızmaması
- Yanlış pozitifi azaltmak (sağlama toplamları)
- cURL kopyasının isteği olduğu gibi yeniden gönderebilmesi

## Değerlendirilen Seçenekler

1. Yalnızca alan adı desenleriyle maskeleme
2. Alan adı desenleri + değer içinde tür bazlı tarama (açılıp kapatılabilir)

## Karar Sonucu

Seçilen seçenek: **2**. Alan adı maskeleri (`copy.maskPatterns`, `src/core/mask.ts`) XML eleman adlarına ve form anahtarlarına da ulaşır. Değer maskeleri (`VALUE_MASK_KINDS` = `iban`, `tckn` (geçerli sağlama), `gsm`, `card` (Visa/Mastercard/Amex/Troy, geçerli Luhn)) `src/core/value-mask.ts`'de, her biri kapatılabilir, varsayılan dördü açık. Kopyalar önce `expandStructured`, sonra `maskValue` çalıştırır; 5 seviyelik genişletme sınırını aşan yapılandırılmış metin bütün olarak maskelenir. cURL kopyası bilinçli istisna: JSON ve form metnini içeriden maskeleyip metin olarak geri yazar, diğer metinlere yalnızca değer maskelerini uygular.

## Sonuçlar ve Etkiler

### Olumlu Etkiler

- XML/SOAP ve form gövdelerindeki parola ve kişisel veri kopyada maskeli.

### Olumsuz Etkiler / Ödünler

- `maskValue` ile cURL'ün `maskKeepingText`'i bilinçli olarak farklı; constitution II istisnası, şartname bölümüne atıf zorunlu.
- Ekranda maskeleme yok (yalnızca kopyalarda).

## İlgili Bağlantılar

- `src/core/mask.ts`, `src/core/value-mask.ts`, `src/core/json-copy.ts`, `src/core/markdown.ts`, `src/core/curl.ts`
- `docs/superpowers/specs/2026-10-12-value-masks-design.md`, `2026-10-13-curl-copy-design.md`; spec §7.5
- Commit'ler `0455533` (2026-10-08), `4952ff5`, `143ad44`, `b9d8737` (2026-10-12), `86117dd` (2026-10-13, php-auth başlıkları)
