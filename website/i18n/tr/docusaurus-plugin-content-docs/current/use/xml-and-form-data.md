---
sidebar_position: 3
title: XML ve form verisi
description: XML metni ve URL kodlu form metni nasıl JSON olarak okunur.
---

# XML ve form verisi

SOAP istek ve yanıt gövdeleri gibi XML metni tutan alanlar JSON olarak okunur: JSON görünümünde, iki kopyada ve
yer tutucularda.

- Namespace önekleri atılır: `soap:Envelope`, `Envelope` olur.
- Bir attribute `@ad` olur; attribute'u olan bir elemanın metni de `#text` olur
  (`{context.request.Amount.#text}`).
- Birden fazla kez geçen bir eleman listeye dönüşür. Her değer metin olarak kalır, böylece `00` sıfırlarını korur.
- Bir değerin içine kaçışlı (escaped) yazılmış XML ya da JSON da beş seviye derinliğe kadar açılır. Kopyalarda
  daha derindeki her şey `***` ile değiştirilir.
- Bir eleman, yorum ya da CDATA bölümüyle bölünmüş metin bir boşlukla birleştirilir; böylece `ID<br/>10000000146`,
  `ID 10000000146` olarak okunur ve değeri yine maskelenir.
- HTML hata sayfası gibi düzgün biçimli (well-formed) olmayan XML metni olduğu gibi kalır.

`username=…&password=…&grant_type=…` gibi `&` ile birleştirilmiş iki ya da daha fazla çift içeren URL kodlu form
metni de aynı şekilde okunur ve JSON görünümünde "form" etiketiyle işaretlenir. Değerler çözülür (decode) ve metin
olarak kalır, tekrar eden bir anahtar listeye dönüşür, tek bir `key=value` ise metin olarak kalır. Maskeler
anahtarlarına da ulaşır; böylece `*password*` içindeki bir şifreyi gizler.

Bkz. [Yer tutucular ve koşullar](/docs/configure/placeholders-and-conditions) ve
[Kopyalama ve maskeleme](/docs/use/copy-and-masking).
