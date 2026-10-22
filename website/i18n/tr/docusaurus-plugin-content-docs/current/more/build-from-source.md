---
sidebar_position: 2
title: Kaynaktan derleme
description: kibanatool'u kendiniz derleyin ve Chrome'a paketlenmemiş uzantı olarak yükleyin.
---

# Kaynaktan derleme

Gereksinimler: Node 22+ ve npm.

```bash
npm install
npm run build            # çıktı: .output/chrome-mv3
```

Ardından `chrome://extensions` sayfasını açın, **Geliştirici modu** anahtarını açın, **Paketlenmemiş öğe yükle**
(İngilizce Chrome'da **Load unpacked**) butonuna tıklayın ve `.output/chrome-mv3` klasörünü seçin.

Testler, Kibana geliştirme stack'leri ve sürüm adımları
[README'nin Development bölümünde](https://github.com/cllakyz/kibanatool/blob/main/README.md#development) (İngilizce).
