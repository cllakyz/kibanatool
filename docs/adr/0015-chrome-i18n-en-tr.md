---
title: "ADR-0015: Arayüz dilleri İngilizce ve Türkçe, chrome.i18n ve public/_locales ile"
date: 2026-10-08
status: accepted
deciders: ["celal.akyuz"]
tags:
  - adr
  - i18n
---

# ADR-0015: Arayüz dilleri İngilizce ve Türkçe, chrome.i18n ve public/_locales ile

## Durum

**Durum:** `accepted`
**Tarih:** 2026-10-08

## Bağlam ve Problem Tanımı

Başlatan ekip Türkçe konuşuyor, Web Store kitlesi uluslararası. Dil tarayıcıdan seçilmeli; elle dil seçimi v1 kapsam dışı (spec §15).

## Karar Etkenleri

- Ek bağımlılık olmadan yerelleştirme
- İki dosyanın senkron kalması

## Değerlendirilen Seçenekler

1. `@wxt-dev/i18n` (tasarım şartnamesi §9'da yazılı)
2. Doğrudan `chrome.i18n` + `public/_locales/{en,tr}/messages.json`

## Karar Sonucu

Seçilen seçenek: **2** (kodda uygulanan). `src/i18n.ts` `browser.i18n.getMessage`'ı sarar; `MessageKey` İngilizce dosyadan türetilir, `tests/unit/i18n.test.ts` Türkçe dosyayı onunla senkron tutar. Manifest adı/açıklaması `__MSG_extName__`/`__MSG_extDescription__`, `default_locale: "en"`. Web sitesi ve örnek ayarlar da iki dilde.

## Sonuçlar ve Etkiler

### Olumlu Etkiler

- Ek paket yok; eksik çeviri testte yakalanır.

### Olumsuz Etkiler / Ödünler

- Her yeni UI metni iki dosyaya ve (kullanıcıya görünüyorsa) iki dilde docs'a eklenmeli.
- E2E testleri yerelleştirilmiş metin doğrulayamaz (macOS'ta Chromium dili OS'tan alır).

## Ek Kural (2026-10-26)

Kullanıcı kararı: **`chrome.i18n` (`browser.i18n` sarmalayıcısı `src/i18n.ts`) esastır.** Tasarım şartnamesindeki (§9) `@wxt-dev/i18n` ifadesi geçersizdir; `@wxt-dev/i18n` veya başka bir i18n kütüphanesine geçiş ancak yeni bir ADR ile yapılır. Tarih, `src/i18n.ts`'in eklendiği commit'tir.

## İlgili Bağlantılar

- `src/i18n.ts`, `public/_locales/en/messages.json`, `public/_locales/tr/messages.json`, `wxt.config.ts`, `tests/unit/i18n.test.ts`
- Commit `a3e0710` (2026-10-08) feat(content): render link action bars in Discover detail views
- [ADR-0013](0013-docusaurus-website-github-pages.md)
