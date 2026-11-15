---
title: "ADR-0002: Ham logu Kibana'nın internal search API'sinden çekmek; değerleri asla DOM'dan okumamak"
date: 2026-10-07
status: accepted
deciders: ["celal.akyuz"]
tags:
  - adr
  - kibana-compat
---

# ADR-0002: Ham logu Kibana'nın internal search API'sinden çekmek; değerleri asla DOM'dan okumamak

## Durum

**Durum:** `accepted`
**Tarih:** 2026-10-07

## Bağlam ve Problem Tanımı

Butonlar logun alanlarından üretilir. 8.x/9.x ekranda değerleri biçimlendirilmiş gösterir ve alan tablosu sanallaştırılmıştır; ekrandan okunan değer yanlış veya eksik olabilir. Aynı yöntemin 7.17, 8.x ve 9.x'te çalışması gerekir.

## Karar Etkenleri

- Ham (biçimlendirilmemiş) değer
- Dört sürümde (7.17, 8.15, 8.19, 9.5) tek istek
- Kibana'nın iç React yapısına dokunmamak, sayfanın `fetch`'ine müdahale etmemek (mağaza incelemesi)

## Değerlendirilen Seçenekler

1. Değerleri DOM'dan okumak
2. Discover'ın ağ yanıtlarını dinlemek (7.17/8.15'te sıkıştırılmış `bsearch`, 9.5'te `search/ese`; eşleştirme sıraya dayanıyor)
3. React iç verisini okumak
4. Detay görünümünden yalnızca kimliği (`_index`, `_id`) alıp ham logu Kibana API'sinden çekmek

## Karar Sonucu

Seçilen seçenek: **4 — kimlik DOM'dan, ham log `POST <prefix>/internal/search/es` ile**. Bu istek 7.17/8.15/8.19/9.5'te doğrulandı ve kullanıcının Kibana yetkileri aynen geçerli. Sürüm farkları istemcide: tüm sürümlerde `kbn-xsrf`, 9.x'te `x-elastic-internal-origin: Kibana`, 7.17'de `params.body` biçimi; data view için `/api/data_views` 7.17'de 404 verince `/api/index_patterns`.

## Sonuçlar ve Etkiler

### Olumlu Etkiler

- Şablon ve koşullar gerçek değerlerle çalışır; Discover sütun seçiminden bağımsız.

### Olumsuz Etkiler / Ödünler

- Internal API, Elastic tarafından haber verilmeden değişebilir; bu yüzden e2e matrisi her PR'da çalışır ([ADR-0007](0007-test-strategy-docker-kibana-matrix.md)).
- `/api/index_patterns` deprecated; yalnızca yedek.
- 7.17 kapalı satırları için kimlik yine de React verisinden okunmak zorunda kaldı ([ADR-0008](0008-page-context-bridge-for-717-row-identity.md)).

## İlgili Bağlantılar

- `src/kibana/client.ts`, `src/kibana/prefix.ts`
- `docs/superpowers/specs/2026-10-07-kibanatool-design.md` §2, §3, §6.2, §12
- Commit `624bef6` (2026-10-07) feat(kibana): fetch raw docs and data views with typed errors and caching
- `CLAUDE.md` → Traps
