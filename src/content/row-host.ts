// Keeps the row strip's one host in the active result row (spec 003 FR-006, FR-007, FR-014; research R9–R11).
import type { DocIdentity } from "../core/types";
import { type Rect, stripPosition } from "./rows";

export interface RowHostOptions {
  /** The ROW_HOST_TAG element; the caller created it, and its shadow root holds the strip. */
  host: HTMLElement;
  /** The result row containing `target`, or null. */
  rowOf: (target: Element) => Element | null;
  /** The row's identity, read fresh at every call: Kibana reuses rows for other logs (research R2). */
  identify: (row: Element) => DocIdentity | null;
  /** 7.17: the left edge of Kibana's own buttons in the row's last cell, which the strip must not cover (FR-007). */
  controlsLeft?: (row: Element) => number | undefined;
  render: (target: { row: Element; identity: DocIdentity } | null) => void;
}

export interface RowHost {
  /** Off: the host is detached, nothing is rendered and events are ignored (FR-014). On: it follows pointer and focus. */
  setActive(active: boolean): void;
  /** Called by every pass: re-identifies the active row, re-renders when its log changed, hides it once it is gone. */
  refresh(): void;
  destroy(): void;
}

const LOG = "[kibanatool]";

export function createRowHost(doc: Document, options: RowHostOptions): RowHost {
  const { host, rowOf, identify, controlsLeft, render } = options;
  const view = doc.defaultView;
  let active = false;
  let pointerRow: Element | null = null;
  let focusRow: Element | null = null;
  /** The row the strip follows, identified or not; null when there is none. */
  let current: Element | null = null;
  let shown: { row: Element; identity: DocIdentity } | null = null;
  /** Set by a scroll or resize: the strip is hidden until the next pointer event places it again. */
  let stale = false;

  const rowAt = (target: EventTarget | null): Element | null =>
    target !== null && (target as Node).nodeType === 1 ? rowOf(target as Element) : null;

  function hide(): void {
    if (shown === null && !host.isConnected) return;
    host.remove();
    shown = null;
    render(null);
  }

  /** Research R10: the host's anchor, measured against whatever containing block it ends up in. */
  function place(row: Element): void {
    host.style.cssText = "position: fixed; left: 0px; top: 0px; width: 0px; height: 0px; z-index: 999;";
    const origin = host.getBoundingClientRect();
    const position = stripPosition({
      row: row.getBoundingClientRect(),
      viewport: visibleArea(row),
      controlsLeft: controlsLeft?.(row),
      origin: { left: origin.left, top: origin.top },
    });
    if (position === null) {
      host.style.visibility = "hidden";
      return;
    }
    host.style.left = `${position.left}px`;
    host.style.top = `${position.top}px`;
  }

  /** The row's nearest scrolling ancestor, clipped to the window; the window when there is none. */
  function visibleArea(row: Element): Rect {
    const window: Rect = { left: 0, top: 0, right: view?.innerWidth ?? 0, bottom: view?.innerHeight ?? 0 };
    for (let element = row.parentElement; element; element = element.parentElement) {
      const style = view?.getComputedStyle(element);
      if (!style || !/(auto|scroll)/.test(`${style.overflowX} ${style.overflowY}`)) continue;
      const box = element.getBoundingClientRect();
      return {
        left: Math.max(box.left, window.left),
        top: Math.max(box.top, window.top),
        right: Math.min(box.right, window.right),
        bottom: Math.min(box.bottom, window.bottom),
      };
    }
    return window;
  }

  /** Moves the host only when it is not already the row's last child, so a pass never loops on its own move (R9). */
  function show(row: Element, identity: DocIdentity): void {
    if (host.parentElement !== row || row.lastElementChild !== host) row.append(host);
    place(row);
    if (shown?.row === row && sameIdentity(shown.identity, identity)) return;
    shown = { row, identity };
    render(shown);
  }

  function update(force = false): void {
    const next = pointerRow?.isConnected ? pointerRow : focusRow?.isConnected ? focusRow : null;
    if (next === current && !force) return;
    current = next;
    const identity = next === null ? null : identify(next);
    if (next === null || identity === null) {
      hide();
      return;
    }
    show(next, identity);
  }

  const guard =
    <E extends Event>(handle: (event: E) => void) =>
    (event: E): void => {
      try {
        handle(event);
      } catch (error) {
        console.debug(LOG, "row strip failed:", error);
      }
    };

  const onPointer = guard((event: Event) => {
    pointerRow = rowAt(event.target);
    update(stale);
    stale = false;
  });
  const onPointerLeave = guard(() => {
    pointerRow = null;
    update();
  });
  const onFocusIn = guard((event: Event) => {
    focusRow = rowAt(event.target);
    update();
  });
  const onFocusOut = guard((event: FocusEvent) => {
    focusRow = rowAt(event.relatedTarget);
    update();
  });
  const onScroll = guard(() => {
    if (shown === null) return;
    host.style.visibility = "hidden";
    stale = true;
  });

  function listen(on: boolean): void {
    const method = on ? "addEventListener" : "removeEventListener";
    doc[method]("pointerover", onPointer, true);
    doc[method]("pointermove", onPointer, true);
    doc[method]("focusin", onFocusIn, true);
    doc[method]("focusout", onFocusOut as EventListener, true);
    doc[method]("scroll", onScroll, true);
    doc.documentElement[method]("pointerleave", onPointerLeave);
    view?.[method]("resize", onScroll);
  }

  function setActive(on: boolean): void {
    if (on === active) return;
    active = on;
    listen(on);
    if (on) return;
    pointerRow = focusRow = current = null;
    stale = false;
    hide();
  }

  return {
    setActive,
    refresh() {
      try {
        if (!active || current === null) return;
        if (!current.isConnected) {
          current = null;
          hide();
          return;
        }
        const identity = identify(current);
        if (identity === null) hide();
        else show(current, identity);
      } catch (error) {
        console.debug(LOG, "row strip failed:", error);
      }
    },
    destroy() {
      setActive(false);
      host.remove();
    },
  };
}

function sameIdentity(a: DocIdentity, b: DocIdentity): boolean {
  return a.dataViewId === b.dataViewId && a.index === b.index && a.id === b.id;
}
