// The panel (spec §7.6): a tree with collapse, search and copy for fields that hold JSON, XML (Plan 6 spec §5.3) or
// form text, and a text view for long or multi-line text (spec 002 FR-010 – FR-014).
import { Component, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  type JsonRow,
  type PanelField,
  copyableValue,
  isMultiLine,
  jsonRows,
  matchPaths,
  revealPath,
  textMatches,
  textSegments,
  visibleRows,
} from "../core/json-tree";
import { type MessageKey, t } from "../i18n";

type TreeField = Exclude<PanelField, { kind: "text" }>;
type TextField = Extract<PanelField, { kind: "text" }>;

export interface JsonViewProps {
  fields: PanelField[];
  onCopy: (text: string) => void;
  onClose: () => void;
}

export function JsonView({ fields, onCopy, onClose }: JsonViewProps) {
  // A single field opens directly; several start with the list (spec §7.6).
  const [selected, setSelected] = useState<PanelField | null>(fields.length === 1 ? (fields[0] ?? null) : null);
  return (
    <div className="kt-json">
      <div className="kt-json-head">
        {selected && fields.length > 1 && (
          <button type="button" onClick={() => setSelected(null)}>
            {t("jsonBack")}
          </button>
        )}
        <strong>{selected ? selected.path : t("jsonChooseField")}</strong>
        <button type="button" className="kt-json-close" onClick={onClose}>
          {t("jsonClose")}
        </button>
      </div>
      {selected ? (
        selected.kind === "text" ? (
          <TextBody key={selected.path} field={selected} onCopy={onCopy} />
        ) : (
          <JsonTree key={selected.path} field={selected} onCopy={onCopy} />
        )
      ) : (
        <ul className="kt-fields">
          {fields.map((field) => (
            <li key={field.path}>
              <button type="button" onClick={() => setSelected(field)}>
                {label(field)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Spec 002 FR-017: a failure inside the panel hides the panel for this log, not the bar. */
export class PanelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    console.debug("[kibanatool] panel failed:", error);
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

interface SearchBarProps {
  placeholder: MessageKey;
  query: string;
  count: number;
  current: number;
  onQuery: (query: string) => void;
  onCurrent: (current: number) => void;
}

/** The search row of the tree and the text view: one search, one count, ↑/↓ and Enter/Shift+Enter (spec 002 FR-012). */
function SearchBar({ placeholder, query, count, current, onQuery, onCurrent }: SearchBarProps) {
  function step(delta: number): void {
    if (count > 0) onCurrent((current + delta + count) % count);
  }

  const status = query.trim() === "" ? "" : count > 0 ? t("jsonMatchCount", String(current + 1), String(count)) : t("jsonNoMatches");
  return (
    <>
      <input
        type="search"
        value={query}
        placeholder={t(placeholder)}
        aria-label={t(placeholder)}
        onChange={(event) => {
          onQuery(event.target.value);
          onCurrent(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") step(event.shiftKey ? -1 : 1);
        }}
      />
      <span className="kt-muted" aria-live="polite">
        {status}
      </span>
      <button type="button" disabled={count === 0} aria-label={t("jsonPrevious")} title={t("jsonPrevious")} onClick={() => step(-1)}>
        ↑
      </button>
      <button type="button" disabled={count === 0} aria-label={t("jsonNext")} title={t("jsonNext")} onClick={() => step(1)}>
        ↓
      </button>
    </>
  );
}

function JsonTree({ field, onCopy }: { field: TreeField; onCopy: (text: string) => void }) {
  const rows = useMemo(() => jsonRows(field.value), [field]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(0);
  const matches = useMemo(() => matchPaths(rows, query), [rows, query]);
  const matched = useMemo(() => new Set(matches), [matches]);
  const active = matches[current];
  const listRef = useRef<HTMLDivElement>(null);

  // Moving to a match expands its ancestors once; the user can collapse them again.
  useEffect(() => {
    if (active !== undefined) setCollapsed((previous) => revealPath(previous, active));
  }, [active]);

  useEffect(() => {
    listRef.current?.querySelector("[data-active]")?.scrollIntoView({ block: "nearest" });
  }, [active, collapsed]);

  function toggle(path: string): void {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }

  return (
    <>
      <div className="kt-json-head">
        <SearchBar placeholder="jsonSearch" query={query} count={matches.length} current={current} onQuery={setQuery} onCurrent={setCurrent} />
      </div>
      <div className="kt-json-rows" ref={listRef}>
        {visibleRows(rows, collapsed).map((row) => (
          <div
            key={row.path}
            className={matched.has(row.path) ? "kt-row kt-match" : "kt-row"}
            data-active={row.path === active ? "" : undefined}
            style={{ paddingLeft: `${8 + row.depth * 14}px` }}
          >
            {row.container ? (
              <button
                type="button"
                className="kt-toggle"
                aria-expanded={!collapsed.has(row.path)}
                aria-label={t("jsonToggle")}
                onClick={() => toggle(row.path)}
              >
                {collapsed.has(row.path) ? "▸" : "▾"}
              </button>
            ) : (
              <span className="kt-toggle" />
            )}
            {row.key !== null && <span className="kt-key">{typeof row.key === "number" ? `[${row.key}]` : row.key}</span>}
            <span className={`kt-${kindOf(row)}`}>{display(row)}</span>
            <span className="kt-row-actions">
              <button type="button" onClick={() => onCopy(copyableValue(row))}>
                {t("jsonCopyValue")}
              </button>
              <button type="button" onClick={() => onCopy(`${field.path}${row.path}`)}>
                {t("jsonCopyPath")}
              </button>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Text as stored, as React text only (spec 002 FR-010). Multi-line text opens unwrapped so tables keep their columns,
 * single-line text wrapped (FR-011); copy gives the whole text, unmasked like the tree's "Copy value" (FR-013).
 */
function TextBody({ field, onCopy }: { field: TextField; onCopy: (text: string) => void }) {
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(0);
  const [wrap, setWrap] = useState(() => !isMultiLine(field.text));
  const matches = useMemo(() => textMatches(field.text, query), [field.text, query]);
  const segments = useMemo(() => textSegments(field.text, matches), [field.text, matches]);
  const textRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    textRef.current?.querySelector("[data-active]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current, matches]);

  return (
    <>
      <div className="kt-json-head">
        <SearchBar placeholder="textSearch" query={query} count={matches.length} current={current} onQuery={setQuery} onCurrent={setCurrent} />
        <button type="button" aria-pressed={wrap} onClick={() => setWrap(!wrap)}>
          {t("textWrap")}
        </button>
        <button type="button" onClick={() => onCopy(field.text)}>
          {t("jsonCopyValue")}
        </button>
      </div>
      <pre ref={textRef} className={wrap ? "kt-text kt-wrap" : "kt-text"} tabIndex={0} role="region" aria-label={field.path}>
        {segments.map((segment, index) =>
          segment.match === undefined ? (
            segment.text
          ) : (
            <mark key={index} data-active={segment.match === current ? "" : undefined}>
              {segment.text}
            </mark>
          ),
        )}
      </pre>
    </>
  );
}

/** The list entry: the path, tagged by kind; JSON is untagged (spec 002 FR-008). */
function label(field: PanelField): string {
  if (field.kind === "xml") return `${field.path} · XML`;
  if (field.kind === "form") return `${field.path} · ${t("panelKindForm")}`;
  if (field.kind === "text") return `${field.path} · ${t("panelKindText")}`;
  return field.path;
}

function kindOf(row: JsonRow): string {
  if (row.container) return "summary";
  return row.value === null ? "null" : typeof row.value;
}

/** Containers show their size; strings are quoted like JSON. */
function display(row: JsonRow): string {
  if (Array.isArray(row.value)) return `[${row.value.length}]`;
  if (row.container === "object") return `{${Object.keys(row.value as object).length}}`;
  return typeof row.value === "string" ? JSON.stringify(row.value) : String(row.value);
}
