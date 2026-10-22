import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import { themes } from "prism-react-renderer";
import changelog from "./plugins/changelog.mjs";
import { REPO_URL } from "./src/constants";

const config: Config = {
  title: "kibanatool",
  tagline: "Turn the open Kibana log into one-click actions: links, Discover searches, copy and view.",
  favicon: "img/favicon.png",
  url: "https://cllakyz.github.io",
  baseUrl: "/kibanatool/",
  onBrokenLinks: "throw",
  markdown: { format: "detect", hooks: { onBrokenMarkdownLinks: "throw" } },
  i18n: { defaultLocale: "en", locales: ["en", "tr"] },
  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "docs",
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/cllakyz/kibanatool/edit/main/website/",
          editLocalizedFiles: true,
        },
        blog: false,
        theme: {
          customCss: [
            require.resolve("@fontsource/schibsted-grotesk/400.css"),
            require.resolve("@fontsource/schibsted-grotesk/700.css"),
            require.resolve("@fontsource/schibsted-grotesk/800.css"),
            require.resolve("@fontsource/roboto-mono/400.css"),
            require.resolve("@fontsource/roboto-mono/500.css"),
            "./src/css/custom.css",
          ],
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [changelog],
  themes: [
    [
      "@easyops-cn/docusaurus-search-local",
      { hashed: true, language: ["en", "tr"], docsRouteBasePath: "docs", indexBlog: false, indexPages: false },
    ],
  ],
  themeConfig: {
    image: "img/screenshots/en/1-bar.png",
    colorMode: { respectPrefersColorScheme: true },
    navbar: {
      title: "kibanatool",
      logo: { alt: "kibanatool", src: "img/icon.svg" },
      items: [
        { type: "docSidebar", sidebarId: "docs", position: "left", label: "Docs" },
        { to: "/releases", position: "left", label: "Releases" },
        { type: "search", position: "right" },
        { type: "localeDropdown", position: "right" },
        { href: REPO_URL, position: "right", label: "GitHub" },
      ],
    },
    footer: {
      style: "light",
      links: [
        {
          title: "kibanatool",
          items: [
            { label: "MIT License", href: `${REPO_URL}/blob/main/LICENSE` },
            { label: "Privacy policy", href: `${REPO_URL}/blob/main/PRIVACY.md` },
            { label: "GitHub", href: REPO_URL },
          ],
        },
      ],
      copyright: 'Inspired by <a href="https://github.com/bozkurtemre/graytool">graytool</a> for Graylog',
    },
    prism: { theme: themes.github, darkTheme: themes.vsDark },
  } satisfies Preset.ThemeConfig,
};
export default config;
