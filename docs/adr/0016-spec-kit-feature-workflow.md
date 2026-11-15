---
title: "ADR-0016: Yeni özellikler spec-kit akışıyla (specs/NNN-*), constitution kontrolüyle"
date: 2026-10-15
status: deprecated
deciders: ["celal.akyuz"]
tags:
  - adr
  - process
---

# ADR-0016: Yeni özellikler spec-kit akışıyla (specs/NNN-*), constitution kontrolüyle

## Durum

**Durum:** `deprecated` (2026-11-15)
**Tarih:** 2026-10-15

2026-11-15: spec-kit ve superpowers skill'leri artık kullanılmıyor (PR #19, `e7940d8`). `specs/` ve `docs/superpowers/` önceki özelliklerin kaydı olarak kalır; mimari kurallar `.specify/memory/constitution.md`'de geçerli.

## Bağlam ve Problem Tanımı

Plan 1–7 `docs/superpowers/` altında Türkçe tasarım şartnamesi + plan + doğrulama belgesiyle yürüdü. Mimari inceleme sonrası (constitution v1.0.0, 2026-10-14) özelliklerin aynı ilkelerle planlanıp denetlenmesi gerekiyordu.

## Karar Etkenleri

- Her planda ve incelemede constitution I–V ve G1–G4 kontrolü
- Belirsizliklerin koddan önce netleşmesi (clarify)
- İzlenebilir görev listesi

## Değerlendirilen Seçenekler

1. `docs/superpowers/` plan akışıyla devam
2. spec-kit: `spec.md` → `plan.md` (Constitution Check) → `tasks.md` → implement, `specs/NNN-<slug>/` altında

## Karar Sonucu

Seçilen seçenek: **2**. 001 (mimari sapmalar) ile 006 (tema anahtarı) arası özellikler bu akışla yapıldı; skill'ler `.claude/skills/speckit-*`'de. Website (Plan 8) yine `docs/superpowers/` plan biçimiyle yapıldı, yani iki biçim birlikte kullanılıyor. 2026-10-22'de `speckit-implement` skill'i `model: sonnet` ile çalışacak şekilde ayarlandı.

## Sonuçlar ve Etkiler

### Olumlu Etkiler

- Her özellikte research, data-model, contracts ve quickstart belgeleri.

### Olumsuz Etkiler / Ödünler

- Geçmiş işler için iki belge biçimi yan yana kalır (spec-kit ve `docs/superpowers/` planları); eski belgeler taşınmaz.

## Ek Kural (2026-10-26)

Kullanıcı kararı: **yeni özelliklerin tamamı, büyüklüğünden bağımsız, spec-kit akışıyla `specs/NNN-<slug>/` altında yapılır.** `docs/superpowers/` altına yeni plan veya şartname yazılmaz; oradaki belgeler (Plan 1–8) geçmiş kayıt olarak kalır ve kod yorumlarındaki `spec §…` atıfları geçerliliğini korur.

## İlgili Bağlantılar

- `.specify/`, `.claude/skills/speckit-*`, `specs/001-…` – `specs/006-…`, `CLAUDE.md` → Docs
- Commit'ler `006f75b` (2026-10-15) feat: Add speckit workflow…, `e19acd5` (2026-10-22)
- [ADR-0005](0005-layered-architecture-constitution.md)
