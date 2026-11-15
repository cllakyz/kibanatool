---
title: "ADR-0005: Katmanlı mimari ve testle zorlanan spec-kit constitution"
date: 2026-10-14
status: accepted
deciders: ["celal.akyuz"]
tags:
  - adr
  - architecture-layers
---

# ADR-0005: Katmanlı mimari ve testle zorlanan spec-kit constitution

## Durum

**Durum:** `accepted`
**Tarih:** 2026-10-14

## Bağlam ve Problem Tanımı

Kibana'nın URL ve API biçimleri 7.17, 8.x ve 9.x arasında değişir. 2026-10 mimari incelemesi kopya-yapıştır taramasında 0 klon bulduğu halde bir kuralın dört kopyası olduğunu ve birkaç bağımlılık sapmasını (D1–D13) ortaya çıkardı.

## Karar Etkenleri

- `src/core` kurallarının tarayıcısız test edilmesi
- Kibana yükseltmesinin bir kurala dokunmaması
- Kuralların kendiliğinden bozulmaması (otomatik kapı)

## Değerlendirilen Seçenekler

1. Kuralları yalnızca `CLAUDE.md`'de yazılı tutmak
2. Constitution (ilkeler I–V, kapılar G1–G4) + ilke I'i zorlayan birim testi

## Karar Sonucu

Seçilen seçenek: **2**. Katmanlar: `src/core` (saf mantık, tarayıcı API'si yok), `src/kibana` (Kibana I/O ve URL/durum), `src/adapters` (yalnızca DOM okur), `src/background`, paylaşılan kök modüller, `src/content`/`src/options` ve `entrypoints` (bileşim kökleri). İçe aktarma tablosu `.specify/memory/constitution.md`'de; `tests/unit/architecture.test.ts` her içe aktarmayı tabloya göre kontrol eder, `src/core`'da tarayıcı globallerini ve döngüleri reddeder. Constitution 2026-10-14'te 56e48a2 commit'indeki incelemeden onaylandı; D1–D13 kapatıldı, bugün açık sapma yok (v1.0.7).

## Sonuçlar ve Etkiler

### Olumlu Etkiler

- İlke I otomatik kapı (G2); `EXCEPTIONS` listesi yalnızca küçülür.
- Bileşim kökleri tüm tarayıcı bağımlılıklarını görünür tutar.

### Olumsuz Etkiler / Ödünler

- İlke II–V için otomatik kapı yok; inceleme kontrol eder.
- Yeni sapma ancak planın Complexity Tracking tablosunda gerekçelendirilip Known Deviations'a satır eklenerek kabul edilir.

## İlgili Bağlantılar

- `.specify/memory/constitution.md`, `tests/unit/architecture.test.ts`
- `docs/verification/2026-10-architecture-deviations.md`, `specs/001-fix-architecture-deviations/`
- Commit'ler `acfe36b` (2026-10-14, import tablosu testi), `7091dc6`, `2ded818`, `353b081`; PR #9 (`5deb7df`)
- [ADR-0016](0016-spec-kit-feature-workflow.md)
