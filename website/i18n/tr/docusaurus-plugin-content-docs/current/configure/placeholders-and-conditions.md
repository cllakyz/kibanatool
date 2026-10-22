---
sidebar_position: 4
title: Yer tutucular ve koşullar
description: Yer tutucular ({alan}, {a|b|c}, {env.ad}) ve buton koşulları nasıl çalışır.
---

# Yer tutucular ve koşullar

- `{alan}` ham logun bir alanıdır. İç içe alanlar noktayla yazılır (`context.user_id`); JSON, XML ya da form
  metni tutan alanların içi de okunabilir (`context.body.amount`, `context.request.Envelope.Body.Id`; bkz.
  [XML ve form verisi](/docs/use/xml-and-form-data)).
- `{a|b|c}` değeri olan ilk alanı kullanır. Hiçbirinin değeri yoksa buton gizlenir.
- `{env.ad}` içinde bulunduğunuz ortamın bir değişkenidir (bkz. [Değişkenler](/docs/configure/variables)), örn. `{env.adminUrl}/users/{user_id}`.
  Linklere olduğu gibi girer, KQL'de bir alan değeri gibi tırnaklanır. Değeri bir `http(s)` adresiyse link
  onunla başlayabilir. Ortam bu değişkeni tanımlamıyorsa buton gri ve pasif görünür, ipucu metni de nedenini söyler.
- Bir Discover aksiyonu açık logun data view'ını ya da **Hedef data view** alanındakini açar: o anki space'te
  aranan bir görünen ad ya da index deseni (örn. `*_log`) veya bir kimlik (ID). Bu adla hiçbir data view
  eşleşmezse ya da birden fazlası eşleşirse buton gri ve pasif görünür.
- Alan değerleri linklerde URL kodlamasından (URL-encode) geçer, Discover sorgularında KQL için tırnaklanır.
- **Koşullar** (`exists`, `equals`, `notEquals`, `contains`, `startsWith`; ayarlar sayfasında var, eşittir,
  eşit değildir, içerir, ile başlar): butonun görünmesi için hepsi sağlanmalı.
