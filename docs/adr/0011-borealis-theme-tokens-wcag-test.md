---
title: "ADR-0011: Tüm renkler src/theme.ts'de Borealis açık/koyu paletleri, WCAG kontrast testiyle"
date: 2026-10-09
status: accepted
deciders: ["celal.akyuz"]
tags:
  - adr
  - ui
---

# ADR-0011: Tüm renkler src/theme.ts'de Borealis açık/koyu paletleri, WCAG kontrast testiyle

## Durum

**Durum:** `accepted`
**Tarih:** 2026-10-09

## Bağlam ve Problem Tanımı

Çubuk Kibana'nın içinde görünür; 7.17, 8.x ve 9.x temayı farklı işaretler ve 9.x sisteme uyabilir. Ayarlar sayfası ve çubuk aynı görünmeli, okunabilirlik korunmalı.

## Karar Etkenleri

- Kibana 9 Borealis görünümüyle uyum
- Açık ve koyu tema
- Kontrastın gerilememesi

## Değerlendirilen Seçenekler

1. Bileşen başına sabit renkler
2. Tek modülde `--kt-*` özel özellikleri olarak iki palet + kontrast testi

## Karar Sonucu

Seçilen seçenek: **2**. `src/theme.ts` her rengi tutar; çubuğun shadow root'una ve ayarlar sayfasına `--kt-*` olarak verilir. `tests/unit/theme.test.ts` bir çift WCAG eşiğinin altına düşerse başarısız olur. Çubuk açık/koyuyu Kibana ayarından değil, host'unun arkasındaki ilk opak arka plandan (`themeBehind`) seçer. Araç çubuğu ikonu tarayıcının renk şemasını izler (`kibanatool:theme` mesajı → `action.setIcon`).

## Sonuçlar ve Etkiler

### Olumlu Etkiler

- Renk değişikliği tek yerde; kontrast otomatik kapıda.

### Olumsuz Etkiler / Ödünler

- Service worker `prefers-color-scheme` okuyamadığı için ikon teması sayfalardan mesajla bildirilir; manifest yalnızca açık seti tutar.

## İlgili Bağlantılar

- `src/theme.ts`, `src/toolbar-icon.ts`, `tests/unit/theme.test.ts`
- Commit'ler `6c4d936`, `5371436`, `5121986` (2026-10-09); PR #5 (`bbdeb2d`)
- [ADR-0012](0012-options-theme-in-localstorage.md)
