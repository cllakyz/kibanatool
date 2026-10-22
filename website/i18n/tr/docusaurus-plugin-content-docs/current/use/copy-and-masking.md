---
sidebar_position: 5
title: Kopyalama ve maskeleme
description: Logu, hassas alanları ve değerleri maskelenmiş olarak Markdown ya da JSON şeklinde kopyalayın.
---

# Kopyalama ve maskeleme

Bu sayfa, aksiyon çubuğundaki **⋯** menüsünün (Kopyalama seçenekleri) iki kopyasını anlatır: **Markdown olarak
kopyala** ve **JSON olarak kopyala**. **cURL olarak kopyala**'nın [kendi sayfası](/docs/use/copy-as-curl) var.

"JSON olarak kopyala", logun `_index`, `_id` ve `_source` alanlarını, içindeki JSON ve XML metni açılmış olarak
kopyalar.

İki kopya da yolu **Kopyalama ve maskeleme** sekmesindeki **Maskelenecek alanlar** listesinden bir desenle
eşleşen her alanı maskeler (varsayılan olarak `*authorization*`, `*password*`, `*token*`, `*secret*`, `*cookie*`
ve Symfony'nin `Authorization`'dan kopyaladığı Basic-auth kullanıcı adı ve şifresi için `*php-auth-*`); JSON, XML
ve form metninin içindeki anahtarlar da buna dahil.

Yolu eşleşen bir alan, içindeki her şeyle birlikte maskelenir: bir nesne, bir liste ya da bir XML elemanı tek bir
`***` olur. Bir header listesi ya da `<Token Type="…" Value="…"/>` elemanı için istediğiniz budur. Ama adında bu
kelime geçiyor diye bir sarmalayıcıyı da gizler, örneğin `GetTokenRequest` gibi bir SOAP operasyonunu.

Böyle bir sarmalayıcıyı okunur tutmak için deseni silmek yerine daraltın. `*token`, `platform-token`,
`ConfirmationToken` ve `_token` gibi "token" ile biten adlarla eşleşir, ama `GetTokenRequest` ile eşleşmez. Daha
dar her desen, kapsamdan vererek okunurluk kazanır:

- `*token`, `tokenValue` gibi bir adı kaçırır;
- `*.token` yalnızca adı tam olarak `token` olanlarla eşleşir; bu yüzden `platform-token` ya da `refreshToken`
  düz metin olarak kalır.

Maskeler ayrıca her değerin içine de bakar (alan adının ulaşamadığı düz metin gövdeler gibi) ve aşağıdakilerin
her birini `***` ile değiştirir. Her tür **Değerin içinde maskele** altından kapatılabilir:

- **IBAN (TR):** `TR` ve 24 haneden oluşan IBAN'lar; bitişik ya da alışılmış dörtlü gruplar halinde.
- **TC kimlik no:** kontrol haneleri geçerli 11 haneli TC kimlik numaraları (TCKN).
- **GSM (TR):** başında `+90`, `90` ya da `0` olan ya da olmayan, `5xx xxx xx xx` biçimindeki cep telefonu
  numaraları.
- **Kart numarası (Visa, Mastercard, Amex, Troy):** Luhn kontrol hanesi geçerli kart numaraları.

Bir harfe ya da başka bir rakama bitişik bir sayıya dokunulmaz; böylece daha uzun kodların içindeki kimlikler
etkilenmez. Maskeleme yalnızca kopyaladığınız metne uygulanır; ekran ve link şablonlarınız değişmez. Maskeleme
elden geldiğince yapılır, garanti değildir: kopyayı paylaşmadan önce okuyun.

Logun kaydettiği istek bir komut olarak da kopyalanabilir: bkz. [cURL olarak kopyala](/docs/use/copy-as-curl).
