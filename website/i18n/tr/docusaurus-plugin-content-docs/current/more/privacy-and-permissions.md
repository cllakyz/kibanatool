---
sidebar_position: 1
title: Gizlilik ve izinler
description: kibanatool'un neyi gönderdiği, neyi sakladığı, Chrome'dan ne istediği ve neden.
---

# Gizlilik ve izinler

kibanatool yalnızca eklediğiniz Kibana adresleriyle, sizin oturumunuzla konuşur ve ayarlarını tarayıcınızda
tutar. Telemetri ve üçüncü taraf servis yoktur. Politikanın tamamı
[PRIVACY.md](https://github.com/cllakyz/kibanatool/blob/main/PRIVACY.md) dosyasında (İngilizce).

- **Ayarlar.** Kibana adresleriniz, aksiyonlarınız ve kopyalama ayarlarınız yalnızca tarayıcınızda
  (`chrome.storage.local`) saklanır. Bilgisayarınızdan yalnızca siz onları bir dosyaya dışa aktarırsanız çıkar.
- **Ağ.** Eklenti, açtığınız logu ve onun data view'ını okumak için yalnızca eklediğiniz Kibana adresleriyle,
  kendi Kibana oturumunuzla konuşur. Sonuç satırlarında gösterilecek aksiyonlar işaretlediyseniz ekrandaki
  satırların loglarını da okur ve bunları yalnızca sayfa açıkken bellekte tutar. Bu istekler tarayıcınızdan
  Kibana'nıza gider.
- **Linkler.** Butonlar, kendi aksiyon şablonlarınızın oluşturduğu adresi yalnızca siz tıkladığınızda yeni sekmede açar.
- **Pano.** Eklenti panoya yalnızca bir kopyalama komutu seçtiğinizde yazar. Panoyu asla okumaz.
- **Telemetri, analitik, reklam ya da uzaktan kod yok.**

## İzinler

- `storage`: kullanıcının ayarlarını (Kibana adresleri, aksiyonlar, kopyalama ayarları) yerel olarak tutar.
- `scripting`: her site için bir content script tanımlamak yerine, eklentinin script'ini yalnızca kullanıcının
  eklediği Kibana adreslerinde kaydeder (`chrome.scripting.registerContentScripts`). Aynı adreslerde, Kibana
  sayfasının kendi bağlamında çalışan ve yalnızca Discover sonuç satırlarının index'ini ve id'sini okuyan küçük
  bir script de kaydeder (Kibana 7.17 bunları yalnızca sayfa verisinde tutar); böylece kullanıcının seçtiği
  aksiyonlar satırlarda gösterilebilir. Bu script'in eklenti API'sine erişimi yoktur, hiçbir şey göndermez ve
  eklentinin kendi script'i isteyene kadar boşta bekler.
- Host izinleri (isteğe bağlı, `http://*/*` ve `https://*/*`): kullanıcının eklediği her Kibana adresi için
  çalışma anında, her seferinde tek bir origin olarak istenir. O Kibana'da çalışmak ve açılan logu Kibana'nın
  kendi API'si üzerinden kullanıcının oturumuyla okumak için gereklidir. Başka hiçbir site için istenmez.

Her adrese erişim, adresi eklediğinizde istenir; bu erişimi istediğiniz zaman `chrome://extensions` sayfasından
kaldırabilirsiniz.

Sorular: <https://github.com/cllakyz/kibanatool/issues>
