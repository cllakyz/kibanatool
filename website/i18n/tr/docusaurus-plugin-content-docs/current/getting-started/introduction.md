---
sidebar_position: 1
title: Giriş
description: kibanatool, Kibana Discover'da açtığınız loga, o logun ham alanlarından üretilen aksiyon butonları ekler.
---

# Giriş

Kibana Discover'da logla çalışmayı hızlandıran bir Chrome eklentisi. Açtığınız loga, o logun ham alanlarından
üretilen bir sıra aksiyon butonu ekler. Kibana 7.17, 8.x ve 9.x'te çalışır.

Graylog için yazılan [graytool](https://github.com/bozkurtemre/graytool)'dan esinlenildi.

## Ne yapar

Discover'da bir log açtığınızda (7.17'de genişletilmiş satır, 8.x/9.x'te doküman paneli), kibanatool logun
üstünde bir çubuk gösterir. Çubukta şunlar bulunur:

- Logdaki bir değerle başka bir sisteme geçen **link aksiyonları**, örn. `https://admin.example.com/users/{user_id}`.
  Bkz. [Aksiyonlar](/docs/configure/actions).
- İlgili logları yeni sekmede açan **Discover aksiyonları**: aynı kullanıcının logları ya da bu logun ±5 dakika çevresindeki her şey.
- **Görüntüle**: istek gövdesi gibi JSON, XML ya da form metni tutan alanları içinde arama yapıp kopyalayabileceğiniz
  bir ağaç olarak, konsol çıktısı ya da stack trace gibi uzun veya çok satırlı metni de içinde arama
  yapabileceğiniz metin olarak gösterir. Bkz. [Görüntüle paneli](/docs/use/view-panel).
- **⋯**: logu hassas alanları ve değerleri maskelenmiş Markdown ya da JSON olarak, kaydettiği isteği cURL komutu olarak, logun linkini ya da zaman aralığı sabitlenmiş mevcut görünümü kopyalar.
  Bkz. [Kopyalama ve maskeleme](/docs/use/copy-and-masking).

**Satırda göster** ile işaretlediğiniz aksiyonlar sonuç satırlarının kendisinde de görünür: bir satırın üzerine
gelin ya da klavye odağını satıra taşıyın, aksiyonlar satırın sağ ucunda belirir; böylece logu açmadan tek tıkla
çalıştırırsınız. Bkz. [Aksiyon çubuğu ve satır butonları](/docs/use/action-bar-and-row-buttons).

Denemeye hazır mısınız? [Eklentiyi kurun](/docs/getting-started/install), ardından [ilk kurulum](/docs/getting-started/first-setup) adımlarını izleyin.
