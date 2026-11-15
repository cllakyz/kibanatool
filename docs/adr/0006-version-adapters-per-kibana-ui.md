---
title: "ADR-0006: Kibana arayüzü başına sayfa adaptörleri (7.17 legacy-table, 8.x/9.x data-grid)"
date: 2026-10-08
status: accepted
deciders: ["celal.akyuz"]
tags:
  - adr
  - kibana-compat
---

# ADR-0006: Kibana arayüzü başına sayfa adaptörleri (7.17 legacy-table, 8.x/9.x data-grid)

## Durum

**Durum:** `accepted`
**Tarih:** 2026-10-08

## Bağlam ve Problem Tanımı

7.17 klasik `docTable` ve satır altında `docTableDetailsRow` kullanır; 8.x/9.x sanallaştırılmış EuiDataGrid ve `docViewerFlyout` yan paneli kullanır. 9.5 Observability "Log overview" sekmesinde `tableDocViewRow-_id-value` yoktur. Sayfada sürüm bilgisi yoktur.

## Karar Etkenleri

- Tek ayar setiyle üç sürümde aynı sonuç
- Sürüm farklarının iş kurallarına sızmaması
- Fixture ile birim test edilebilirlik

## Değerlendirilen Seçenekler

1. Sürüm numarasını okuyup dallanmak
2. DOM'dan görünüm tipini algılayan (`detect`) ve ortak sözleşme (`DocIdentity`, mount noktası) üreten adaptörler

## Karar Sonucu

Seçilen seçenek: **2**. `src/adapters/detect.ts` görünümü algılar; `legacy-table`/`legacy-rows` 7.17'yi, `data-grid`/`grid-rows` 8.x/9.x'i okur. Adaptörler yalnızca DOM okur (değer değil, kimlik). 9.x Observability için kimlik `DISCOVER_SINGLE_DOC_LOCATOR` linkindeki `lz` parametresinden `decompressFromBase64` ile çözülür (URI-safe çözücü bozar). 8.x/9.x satır kimliği `dscGridSelectDoc-<index>::<id>::<routing>`.

## Sonuçlar ve Etkiler

### Olumlu Etkiler

- Adaptörler sürüm başına yakalanmış fixture'larla test edilir (`tests/fixtures/`, `tests/unit/adapters/`).

### Olumsuz Etkiler / Ödünler

- Kibana yükseltmesinden sonra fixture'lar yeniden yakalanmalı (`KT_CAPTURE=1`).
- 7.17'de yeni tablo modu desteklenmez (spec §12).

## İlgili Bağlantılar

- `src/adapters/*`, `src/kibana/locator.ts`
- Spec §3, §5
- Commit `0278fa6` (2026-10-08) feat(adapters): find open detail views on 7.17 tables and 8.x/9.x flyouts; `ca7097c` (fixture'lar)
- [ADR-0002](0002-raw-doc-from-kibana-internal-api.md), [ADR-0008](0008-page-context-bridge-for-717-row-identity.md)
