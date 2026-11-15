---
title: "ADR-0004: Ayarlar chrome.storage.local'da tek anahtar, zod doğrulaması ve schemaVersion dönüşümü"
date: 2026-10-07
status: accepted
deciders: ["celal.akyuz"]
tags:
  - adr
  - storage
  - privacy
---

# ADR-0004: Ayarlar chrome.storage.local'da tek anahtar, zod doğrulaması ve schemaVersion dönüşümü

## Durum

**Durum:** `accepted`
**Tarih:** 2026-10-07

## Bağlam ve Problem Tanımı

Eklentinin tek kalıcı verisi kullanıcı ayarlarıdır (ortamlar, aksiyonlar, kopyalama/maskeleme). Ayarlar elle yazılmış dosyadan içe aktarılabilir, eski sürümlerden gelebilir veya bozulabilir; bozuk ayar Kibana'yı veya eklentiyi kırmamalı. Gizlilik ilkesi gereği veri tarayıcıdan çıkmamalı.

## Karar Etkenleri

- Yerel depolama, telemetri yok
- Chrome sync'in öğe başına 8 KB sınırı
- Yükleme ve kaydetmede aynı doğrulama
- MV3 CSP eval'i yasaklar

## Değerlendirilen Seçenekler

1. `chrome.storage.sync`
2. `chrome.storage.local`, tek anahtar, zod şeması, sürüm alanıyla dönüşüm

## Karar Sonucu

Seçilen seçenek: **2**. Ayarlar `chrome.storage.local`'da `kibanatool.config` anahtarında; erişimin tek noktası `src/storage.ts`. Şema `src/core/config.ts`'de zod ile, `z.config({ jitless: true })` ile (CSP). Doğrulama hem yüklemede hem kaydetmede yapılır; reddedilen kayıt boş ayara döner. Şema değişikliği `schemaVersion`'ı artırır ve eski girdi `parseConfig` içinde dönüştürülür (bugün sürüm 4; 1–3 dönüştürülür).

## Sonuçlar ve Etkiler

### Olumlu Etkiler

- Bozuk ayar eklentiyi kırmaz; içe aktarma alan bazında hata verir.
- Bilinmeyen `environmentIds` reddedilmez, onarılır.

### Olumsuz Etkiler / Ödünler

- Cihazlar arası eşitleme yok (v1 kapsam dışı).
- Eksik bir dönüşüm, kayıtlı ayarları sessizce boş ayara çevirir; her şema değişikliğinde dönüşüm ve test zorunlu.

## İlgili Bağlantılar

- `src/core/config.ts`, `src/storage.ts`, `tests/unit/core/config.test.ts`, `tests/unit/storage.test.ts`
- Spec §8; `docs/superpowers/specs/2026-10-09-env-variables-design.md` (sürüm 2), `2026-10-12-value-masks-design.md` (sürüm 3)
- Commit'ler `053a851` (2026-10-07, config schema), `790a049` (jitless), `b85f805` (v2), `e1b218e` (v3)
