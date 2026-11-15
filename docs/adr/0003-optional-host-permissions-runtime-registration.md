---
title: "ADR-0003: Yalnızca isteğe bağlı host izinleri ve içerik betiğinin çalışma anında kaydı"
date: 2026-10-08
status: accepted
deciders: ["celal.akyuz"]
tags:
  - adr
  - permissions
  - privacy
---

# ADR-0003: Yalnızca isteğe bağlı host izinleri ve içerik betiğinin çalışma anında kaydı

## Durum

**Durum:** `accepted`
**Tarih:** 2026-10-08

## Bağlam ve Problem Tanımı

Kibana adresleri kullanıcıdan kullanıcıya değişir (alan adı, base path). Sabit `host_permissions` veya manifestte `content_scripts` her siteye erişim isteyip Web Store incelemesini zorlaştırır ve gereksiz yetki verir.

## Karar Etkenleri

- Web Store incelemesinden yalnızca isteğe bağlı host izinleriyle geçmek (spec §1.2)
- Eklentinin yalnızca kullanıcının eklediği Kibana'larda çalışması
- MV3 service worker yaşam döngüsünde kaydın tutarlı kalması

## Değerlendirilen Seçenekler

1. Manifestte `content_scripts` + geniş `host_permissions`
2. WXT `registration: 'runtime'` varsayılanı (adresleri zorunlu izne çevirir)
3. `permissions: ["storage", "scripting"]` + `optional_host_permissions`; ortam eklenince origin istenir, background `scripting.registerContentScripts` ile yalnızca izin verilen origin'lere kaydeder

## Karar Sonucu

Seçilen seçenek: **3**. Ayarlar sayfası ortam eklenince yalnızca o origin'i ister; `src/background/registration.ts` `kibana.js` (ve sonradan `kibana-bridge.js`, `world: "MAIN"`) betiklerini izin verilen origin'lere kaydeder ve kurulum, açılış, izin ve ayar değişikliklerinde tek seferde bir çalışmayla (`serialized`) yeniden eşitler.

## Sonuçlar ve Etkiler

### Olumlu Etkiler

- Minimum izin; kullanıcı her siteyi açıkça onaylar.
- `scripts/check-manifest.mjs` build'de `content_scripts`/`host_permissions` görürse veya betiklerden biri eksikse başarısız olur (G3).

### Olumsuz Etkiler / Ödünler

- Kayıt mantığı elle yazıldı ve test edilmeli (`tests/unit/background/registration.test.ts`); her betik kimliği ayrı kontrol edilir çünkü eski kurulumlarda yalnızca `kibana.js` vardır.
- Chrome izin istemi otomatikleştirilemediği için e2e kopyası origin'i `host_permissions`'ta listeler; istem elle doğrulanır.

## İlgili Bağlantılar

- `wxt.config.ts`, `entrypoints/background.ts`, `src/background/registration.ts`, `scripts/check-manifest.mjs`
- Spec §9; `tests/CLAUDE.md`
- Commit'ler `6441d9c`, `fde8808` (2026-10-08), `52b8487` (manifest kontrolü)
