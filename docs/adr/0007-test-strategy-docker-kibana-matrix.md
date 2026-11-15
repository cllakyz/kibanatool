---
title: "ADR-0007: Vitest birim testleri + Docker'daki Kibana 7/8/9'a karşı Playwright e2e matrisi, CI yalnızca PR'larda"
date: 2026-10-08
status: accepted
deciders: ["celal.akyuz"]
tags:
  - adr
  - testing
  - ci
---

# ADR-0007: Vitest birim testleri + Docker'daki Kibana 7/8/9'a karşı Playwright e2e matrisi, CI yalnızca PR'larda

## Durum

**Durum:** `accepted`
**Tarih:** 2026-10-08

## Bağlam ve Problem Tanımı

Sürüm uyumluluğu ancak gerçek Kibana'larda doğrulanabilir; kullanılan Kibana API'si internal'dır ve haber verilmeden değişebilir.

## Karar Etkenleri

- Aynı ayarların 7.17, 8.x, 9.x'te aynı sonucu verdiğinin otomatik kanıtı
- Base path, space, Observability görünümü, salt-okur kullanıcı senaryoları
- Deterministik, yeniden çalıştırılabilir test verisi

## Değerlendirilen Seçenekler

1. Yalnızca birim testleri + elle doğrulama
2. Vitest (node, DOM testleri happy-dom) + Playwright, `docker/` altındaki Kibana 7.17.29 (`/kibana` base path), 8.19.23, 9.5.5 stack'lerine karşı

## Karar Sonucu

Seçilen seçenek: **2**. `./docker/up.sh 7|8|9` güvenliği açık, anonim tarayıcı girişli stack'i her seferinde aynı sentetik loglar, data view'lar, `test` space'i, 9.x'te `obs` space'i ve salt-okur `kt_reader` ile kurar. `.github/workflows/ci.yml` her `main` PR'ında birim kontrollerini (typecheck, test, build, check:manifest) ve ardından 7/8/9 e2e matrisini çalıştırır. 2026-10-17'de CI yalnızca `main`'e açılan PR'larda çalışacak şekilde daraltıldı.

## Sonuçlar ve Etkiler

### Olumlu Etkiler

- Internal API değişikliği PR aşamasında yakalanır.
- `docker/seed.mjs` ile `tests/e2e` arasında açık sözleşme.

### Olumsuz Etkiler / Ödünler

- `main`'e doğrudan push test edilmez.
- Üç stack aynı `localhost` `sid` çerezini paylaşır; bir tarayıcı oturumunda tek stack.
- Chrome izin istemi otomatikleştirilemez, elle doğrulanır.
- CI imaj önbelleği denendi ve kaldırıldı (çekmek daha hızlıydı).

## İlgili Bağlantılar

- `.github/workflows/ci.yml`, `docker/`, `playwright.config.ts`, `tests/e2e/`, `tests/CLAUDE.md`
- Spec §13
- Commit'ler `f35972e`, `aef9f7d`, `5b57322`, `9ceb78c` (2026-10-08); `96bc688`, `bbe6ff0`, `a3126de` (2026-10-17)
