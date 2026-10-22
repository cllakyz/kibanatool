---
sidebar_position: 4
title: Metin görünümü
description: Konsol çıktısı ve stack trace gibi uzun ya da çok satırlı metinde Görüntüle panelinde arama yapın.
---

# Metin görünümü

**Görüntüle** paneli (bkz. [Görüntüle paneli](/docs/use/view-panel)), JSON, XML ya da form verisi olmayan metni de birden fazla satırı varsa ya da
en az 500 karakter uzunluğundaysa listeler: konsol çıktısı, stack trace ve uzun hata mesajları gibi. Token ve
header gibi daha kısa, tek satırlık değerler dışarıda kalır.

- Metin kaydedildiği gibi, eş aralıklı (monospace) bir yazı tipiyle gösterilir. Bir HTML sayfası kaynak kodu
  olarak görünür; içindeki hiçbir şey çalışmaz.
- Çok satırlı metin satırları kaydırılmadan açılır, böylece konsol tabloları sütunlarını korur; tek satırlık metin
  kaydırılmış açılır. **Satırları kaydır** ile ikisi de değiştirilebilir.
- Arama her eşleşmeyi işaretler, sayısını gösterir ve ↑/↓ ya da Enter ve Shift+Enter ile eşleşmeler arasında gezer.
- **Değeri kopyala** metnin tamamını olduğu gibi kopyalar. Ağaçtaki kopyalama butonları gibi bu da maskelenmez:
  bir logu paylaşmak için ⋯ menüsünü kullanın.
