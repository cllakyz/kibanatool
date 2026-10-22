---
sidebar_position: 6
title: cURL olarak kopyala
description: Logun kaydettiği HTTP isteğini maskelenmiş bir cURL komutu olarak kopyalayın.
---

# cURL olarak kopyala

`context` altında ya da en üst seviyede bir `method` ve mutlak bir `http(s)` `url` ile HTTP isteği kaydeden bir
log, "cURL olarak kopyala" seçeneğini de alır: isteği yeniden gönderen bir bash ya da zsh komutu.

- `headers`, `body` ve `query` aynı yerden okunur. Her biri, Symfony istek loglarındaki gibi JSON metni olabilir.
- Sorgu URL'e eklenir, form gövdesi de PHP'nin okuduğu gibi `a[b]=c` biçiminde geri yazılır. Multipart alanları
  `--form-string` seçeneklerine dönüşür; yüklenen dosyalar logda olmadığından dışarıda kalır.
- Taşıma, proxy ve CDN header'ları çıkarılır: `host`, `content-length`, `connection`, `accept-encoding`,
  `forwarded`, `x-forwarded-*`, `x-real-ip`, `cf-*`, `cdn-loop`, `x-php-ob-level` ve `php-auth-*`.
  `accept-encoding` yerine `--compressed` eklenir.
- Komut diğer kopyalar gibi maskelenir (bkz. [Kopyalama ve maskeleme](/docs/use/copy-and-masking)); bu yüzden bir token `-H 'authorization: ***'` olarak görünür: çalıştırmadan önce
  kendinizinkini yazın. İsteğin içindeki JSON ve form metni içeriden maskelenir ve JSON ya da form metni olarak
  kalır; düz, HTML ve XML metni yalnızca değer maskeleri uygulanarak olduğu gibi kalır.
