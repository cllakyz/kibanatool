---
title: "ADR-0001: WXT + React + TypeScript (strict) ile Chrome MV3 eklentisi"
date: 2026-10-07
status: accepted
deciders: ["celal.akyuz"]
tags:
  - adr
  - architecture-layers
---

# ADR-0001: WXT + React + TypeScript (strict) ile Chrome MV3 eklentisi

## Durum

**Durum:** `accepted`
**Tarih:** 2026-10-07

## Bağlam ve Problem Tanımı

Kibana Discover için açık kaynak, Chrome Web Store'da yayımlanacak bir eklenti gerekiyordu. İlham kaynağı graytool (Graylog) Graylog'un sayfa yapısına bağlı ve testsizdi; Shadow DOM içinde arayüz ve dinamik içerik betiği kaydı gerekiyordu.

## Karar Etkenleri

- Manifest V3 ve Web Store uyumu
- Shadow DOM içinde izole arayüz (Kibana stilleriyle çakışmama)
- İçerik betiğini çalışma anında kaydetme desteği
- Tip güvenliği ve test edilebilirlik

## Değerlendirilen Seçenekler

1. graytool'u fork'lamak veya ona katkı vermek
2. Sıfırdan WXT + React + TypeScript (strict)

## Karar Sonucu

Seçilen seçenek: **sıfırdan WXT + React + TypeScript (strict) projesi**. WXT aktif geliştiriliyor, Shadow DOM içinde arayüzü ve dinamik içerik betiği kaydını destekliyor; graytool'un küçük saf fonksiyonları (şablon, koşul, düzleştirme) MIT atfıyla uyarlandı. Bugün: WXT 0.21, React 19, TypeScript 5.9 strict.

## Sonuçlar ve Etkiler

### Olumlu Etkiler

- `wxt build` / `wxt zip` ile tek komutla paket; `.wxt/tsconfig.json` `postinstall`'da üretilir.
- React bileşenleri happy-dom ile birim test edilebiliyor.

### Olumsuz Etkiler / Ödünler

- WXT'nin `registration: 'runtime'` varsayılanı kullanılamaz (adresleri zorunlu izne çevirir); kayıt elle yapılır ([ADR-0003](0003-optional-host-permissions-runtime-registration.md)).
- Not: tasarım şartnamesi §9 `@wxt-dev/i18n` diyordu; kod doğrudan `chrome.i18n` kullanıyor ([ADR-0015](0015-chrome-i18n-en-tr.md)).

## İlgili Bağlantılar

- `package.json`, `wxt.config.ts`, `tsconfig.json`
- `docs/superpowers/specs/2026-10-07-kibanatool-design.md` §2
- Commit `52b8487` (2026-10-07) chore: scaffold WXT extension with manifest permission check
- README "Credits" bölümü (graytool atfı)
