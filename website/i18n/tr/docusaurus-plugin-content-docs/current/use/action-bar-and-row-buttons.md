---
sidebar_position: 1
title: Aksiyon çubuğu ve satır butonları
description: Açık logun üstündeki çubuk ve sonuç satırlarındaki tek tıklık butonlar.
---

# Aksiyon çubuğu ve satır butonları

Discover'da bir log açtığınızda (7.17'de genişletilmiş satır, 8.x/9.x'te doküman paneli), kibanatool logun
üstünde bir çubuk gösterir: link ve Discover aksiyonlarınız, [Görüntüle paneli](/docs/use/view-panel) ve **⋯**
kopyalama menüsü (bkz. [Kopyalama ve maskeleme](/docs/use/copy-and-masking)).

**Satırda göster** ile işaretlediğiniz aksiyonlar sonuç satırlarının kendisinde de görünür: bir satırın üzerine
gelin ya da klavye odağını satıra taşıyın, aksiyonlar satırın sağ ucunda belirir; böylece logu açmadan tek tıkla
çalıştırırsınız. Çubukta her aksiyon, Görüntüle paneli ve kopyalama menüsü yine durur. Daraltılmış satırlarında
log kimliği bulunmayan 7.17'de, Kibana sayfasının kendi bağlamında çalışan küçük bir script her satırın index'ini
ve id'sini Kibana'nın sayfa verisinden okur; bunu yalnızca işaretli bir aksiyon varken yapar.

Aksiyonları [Aksiyonlar](/docs/configure/actions) ayarlarında **Satırda göster** ile işaretleyin.
