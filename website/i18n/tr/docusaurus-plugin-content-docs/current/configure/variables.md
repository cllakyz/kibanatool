---
sidebar_position: 2
title: Değişkenler
description: Ortama göre değişen değerleri tanımlayın ve şablonlarda {env.ad} olarak kullanın.
---

# Değişkenler

**Değişkenler** sekmesinde, admin panelinizin adresi gibi ortama göre değişen değerleri ekleyin. Her satır bir
değişken, her sütun bir ortamdır; şablonlarda `{env.ad}` olarak kullanın.

`{env.ad}`, içinde bulunduğunuz ortamın bir değişkenidir, örn. `{env.adminUrl}/users/{user_id}`.
Linklere olduğu gibi girer, KQL'de bir alan değeri gibi tırnaklanır. Değeri bir `http(s)` adresiyse link
onunla başlayabilir. Ortam bu değişkeni tanımlamıyorsa buton gri ve pasif görünür, ipucu metni de nedenini söyler.

Bkz. [Yer tutucular ve koşullar](/docs/configure/placeholders-and-conditions).
