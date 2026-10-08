// The "⋯" copy menu of the action bar (spec §7.4).
import { useState } from "react";
import { t } from "../i18n";

export interface CopyItem {
  label: string;
  /** The text to copy, or null when it cannot be produced (the bar says why). */
  text: () => string | null;
}

export function CopyMenu({ items, onCopy }: { items: CopyItem[]; onCopy: (text: string | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="kt-menu"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        className="kt-ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("menuLabel")}
        title={t("menuLabel")}
        onClick={() => setOpen(!open)}
      >
        ⋯
      </button>
      {open && (
        <div className="kt-menu-list" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                let text: string | null;
                try {
                  text = item.text();
                } catch (error) {
                  console.debug("[kibanatool] copy text failed:", error);
                  text = null;
                }
                onCopy(text);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
