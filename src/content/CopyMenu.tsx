// The "⋯" copy menu of the action bar (spec §7.4), with the keyboard behaviour of a menu button.
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { t } from "../i18n";

export interface CopyItem {
  label: string;
  /** The text to copy, or null when it cannot be produced (the bar says why). */
  text: () => string | null;
}

export function CopyMenu({ items, onCopy }: { items: CopyItem[]; onCopy: (text: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Opening moves focus to the first item. A press anywhere else closes the menu; the bar lives in a
  // shadow root, so the check uses composedPath (the event target outside is the host element).
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const closeOutside = (event: PointerEvent): void => {
      if (rootRef.current && !event.composedPath().includes(rootRef.current)) setOpen(false);
    };
    window.addEventListener("pointerdown", closeOutside, true);
    return () => window.removeEventListener("pointerdown", closeOutside, true);
  }, [open]);

  function close(): void {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onListKey(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const current = buttons.indexOf(event.target as HTMLButtonElement);
    const targets: Record<string, number> = { ArrowDown: current + 1, ArrowUp: current - 1, Home: 0, End: buttons.length - 1 };
    const next = targets[event.key];
    if (next === undefined) return;
    event.preventDefault();
    buttons[(next + buttons.length) % buttons.length]?.focus();
  }

  return (
    <div
      className="kt-menu"
      ref={rootRef}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) close();
      }}
    >
      <button
        ref={triggerRef}
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
        <div className="kt-menu-list" role="menu" ref={listRef} onKeyDown={onListKey}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                close();
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
