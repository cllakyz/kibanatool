// The page's theme choice: System, Light or Dark, stored on this device apart from the settings (spec 006
// FR-001–FR-005). Native radios give one tab stop, arrow keys that select, and "selected" announcements.
import { type ReactNode, useState } from "react";
import { type MessageKey, t } from "../../src/i18n";
import { loadThemeChoice, saveThemeChoice } from "../../src/storage";
import { THEME_CHOICES, type ThemeChoice, applyTheme } from "../../src/theme";

const NAMES = { system: "optionsThemeSystem", light: "optionsThemeLight", dark: "optionsThemeDark" } satisfies Record<ThemeChoice, MessageKey>;

const icon = (children: ReactNode) => (
  <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const ICONS: Record<ThemeChoice, ReactNode> = {
  system: icon(
    <>
      <rect x="1.75" y="2.75" width="12.5" height="8.5" rx="1.5" />
      <path d="M5.5 14h5M8 11.25V14" />
    </>,
  ),
  light: icon(
    <>
      <circle cx="8" cy="8" r="2.75" />
      <path d="M8 1.25v1.5M8 13.25v1.5M1.25 8h1.5M13.25 8h1.5M3.2 3.2l1.06 1.06M11.74 11.74l1.06 1.06M3.2 12.8l1.06-1.06M11.74 4.26l1.06-1.06" />
    </>,
  ),
  dark: icon(<path d="M13.5 9.6A5.75 5.75 0 0 1 6.4 2.5a5.75 5.75 0 1 0 7.1 7.1z" />),
};

export function ThemeSwitch() {
  const [choice, setChoice] = useState(() => loadThemeChoice(localStorage));

  function choose(next: ThemeChoice): void {
    setChoice(next);
    applyTheme(document.documentElement, next, window.matchMedia("(prefers-color-scheme: dark)").matches);
    saveThemeChoice(localStorage, next);
  }

  return (
    <div className="theme-switch" role="radiogroup" aria-label={t("optionsTheme")}>
      {THEME_CHOICES.map((value) => (
        <label key={value} title={t(NAMES[value])}>
          <input type="radio" name="theme" value={value} checked={choice === value} onChange={() => choose(value)} aria-label={t(NAMES[value])} />
          {ICONS[value]}
        </label>
      ))}
    </div>
  );
}
