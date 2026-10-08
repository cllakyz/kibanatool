# Chrome Web Store listing

Texts and answers for the store submission. The package is `npm run zip` → `.output/kibanatool-<version>-chrome.zip`,
uploaded by hand in the developer dashboard.

## Store listing

- **Name:** kibanatool (from `__MSG_extName__`)
- **Summary:** comes from `extDescription` in `public/_locales/<lang>/messages.json` (max. 132 characters).
- **Category:** Developer Tools
- **Languages:** English (default), Turkish
- **Icon:** `public/icon/128.png`
- **Screenshots:** at least one, 1280×800. Take them from a dev stack (synthetic data only): `./docker/up.sh 9`,
  load `.output/chrome-mv3`, import `examples/kibanatool-settings.json` with the Kibana address changed to
  `http://localhost:19601`, open a log, show the bar, the JSON view and the copy menu.
- **Small promo tile (440×280):** only if the dashboard requires it; same design as the icon.

### Description (English)

kibanatool adds a row of action buttons to the log you open in Kibana Discover, built from that log's raw fields.
It works on Kibana 7.17, 8.x and 9.x.

- Jump to your admin panel, Sentry, Jira or any other tool with a value from the log.
- Open related logs in a new tab: the same user's logs, or everything ±5 minutes around this log.
- Read fields that hold JSON text as a searchable tree.
- Copy the log as Markdown with passwords, tokens and other sensitive fields masked, copy a link to the log,
  or copy the current view with its time range fixed.

You choose which Kibana addresses it runs on. It talks only to your Kibana, with your own session, and keeps
its settings in your browser. Open source: https://github.com/cllakyz/kibanatool

### Açıklama (Türkçe)

kibanatool, Kibana Discover'da açtığınız loga, o logun ham alanlarından üretilen bir sıra aksiyon butonu ekler.
Kibana 7.17, 8.x ve 9.x'te çalışır.

- Logdaki bir değerle admin panelinize, Sentry'ye, Jira'ya ya da başka bir araca tek tıkla geçin.
- İlgili logları yeni sekmede açın: aynı kullanıcının logları ya da bu logun ±5 dakika çevresi.
- JSON metni tutan alanları aranabilir bir ağaç olarak okuyun.
- Logu şifre, token ve diğer hassas alanları maskelenmiş Markdown olarak kopyalayın, logun linkini ya da
  zamanı sabitlenmiş mevcut görünümü kopyalayın.

Hangi Kibana adreslerinde çalışacağını siz seçersiniz. Yalnızca kendi Kibana'nızla, kendi oturumunuzla konuşur,
ayarlarını tarayıcınızda tutar. Açık kaynak: https://github.com/cllakyz/kibanatool

## Privacy practices

- **Single purpose:** Adds action buttons to the log the user opens in Kibana Discover, built from that log's fields.
- **Permission justifications:**
  - `storage`: keeps the user's settings (Kibana addresses, actions, copy settings) locally.
  - `scripting`: registers the extension's script only on the Kibana addresses the user added
    (`chrome.scripting.registerContentScripts`), instead of declaring a content script for every site.
  - Host permissions (optional, `http://*/*` and `https://*/*`): requested at runtime for each Kibana address
    the user adds, one origin at a time. Needed to run on that Kibana and to read the opened log through
    Kibana's own API with the user's session. Never requested for any other site.
- **Remote code:** No. All code is in the package.
- **Data usage:** The extension does not collect or transmit any user data. Certify all three statements
  (no selling, no use unrelated to the single purpose, no use for creditworthiness or lending).
- **Privacy policy URL:** https://github.com/cllakyz/kibanatool/blob/main/PRIVACY.md
