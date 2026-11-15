---
title: "ADR-0008: 7.17 satır kimliğini sayfa bağlamı betiğiyle React verisinden okumak"
date: 2026-10-16
status: accepted
deciders: ["celal.akyuz"]
tags:
  - adr
  - kibana-compat
  - permissions
---

# ADR-0008: 7.17 satır kimliğini sayfa bağlamı betiğiyle React verisinden okumak

## Durum

**Durum:** `accepted`
**Tarih:** 2026-10-16

## Bağlam ve Problem Tanımı

Satır butonları (spec-kit 003) sonuç satırında tek tıkla aksiyon çalıştırır. 8.x/9.x'te kapalı satırın kimliği seçim kutusunda vardır; 7.17'de kapalı satırda logu tanımlayan hiçbir link veya öznitelik yoktur. Tasarım şartnamesi §2 React iç verisini okumayı kırılgan diye reddetmişti.

## Karar Etkenleri

- 7.17 ekibin prod sürümü (7.17.29)
- Değerlerin DOM'dan okunmaması ilkesi
- İzole içerik betiği sayfa betiğinin expando'larını göremez
- Kibana arama/sıralama sonrası satır elemanlarını başka loglar için yeniden kullanır

## Değerlendirilen Seçenekler

1. Discover ağ yanıtlarını dinlemek (spec §2'de reddedildi; 7.17 sıkıştırıyor)
2. Discover aramasını yeniden çalıştırmak (KQL dönüşümü eklentide yok)
3. Satırları otomatik açmak (Kibana arayüzünü değiştirir)
4. `_id` sütunu (kullanıcı eklemeli, 7.17 sunmuyor)
5. `world: "MAIN"` sayfa bağlamı betiğiyle `__reactInternalInstance$…` → `memoizedProps.row` okumak

## Karar Sonucu

Seçilen seçenek: **5**, kullanıcı kararıyla (spec-kit 003 Clarifications; tasarım şartnamesi §2 ve §15'e 2026-10-16 notu düşüldü). `entrypoints/kibana-bridge.ts`, içerik betiği `kibanatool:identify-rows` olayını gönderene kadar boşta bekler; olay sırasında satırlara `data-kibanatool-index`/`-id` yazar (eşzamanlı çekme). Kimlik her geçişte ve her hover'da taze okunur, elemana önbelleklenmez.

## Sonuçlar ve Etkiler

### Olumlu Etkiler

- 7.17'de de satırdan tek tık.

### Olumsuz Etkiler / Ödünler

- Belgelenmemiş iç yapıya bağımlılık (React 16 anahtarı; React 17+ `__reactFiber$…` de kabul edilir).
- İkinci içerik betiği ve kaydı; köprü betiği `wxt/browser` veya eklenti API'si kullanamaz.
- `MutationObserver` `attributeFilter: ["href"]` kalmalı; genişletmek köprünün yazdığı özniteliklerle döngü yaratır.

## İlgili Bağlantılar

- `entrypoints/kibana-bridge.ts`, `src/adapters/legacy-rows.ts` (`reactRowHit`), `src/content/row-host.ts`
- `specs/003-row-actions/research.md` R1–R2, `specs/003-row-actions/spec.md`
- Commit `41d4c6c` (2026-10-17) feat: one-click action buttons on 7.17 result rows; `1fae909` (8.x/9.x)
- [ADR-0006](0006-version-adapters-per-kibana-ui.md)
