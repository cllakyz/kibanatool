// JSON view (spec §7.6): a tree with collapse, search and copy, for fields that hold JSON text.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type JsonField,
  type JsonRow,
  copyableValue,
  jsonRows,
  matchPaths,
  revealPath,
  visibleRows,
} from "../core/json-tree";
import { t } from "../i18n";

export interface JsonViewProps {
  fields: JsonField[];
  onCopy: (text: string) => void;
  onClose: () => void;
}

export function JsonView({ fields, onCopy, onClose }: JsonViewProps) {
  // A single field opens directly; several start with the list (spec §7.6).
  const [selected, setSelected] = useState<JsonField | null>(fields.length === 1 ? (fields[0] ?? null) : null);
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
        <JsonTree key={selected.path} field={selected} onCopy={onCopy} />
      ) : (
        <ul className="kt-fields">
          {fields.map((field) => (
            <li key={field.path}>
              <button type="button" onClick={() => setSelected(field)}>
                {field.path}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function JsonTree({ field, onCopy }: { field: JsonField; onCopy: (text: string) => void }) {
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

  function search(text: string): void {
    setQuery(text);
    setCurrent(0);
  }

  function step(delta: number): void {
    if (matches.length > 0) setCurrent((current + delta + matches.length) % matches.length);
  }

  function toggle(path: string): void {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }

  const status =
    query.trim() === ""
      ? ""
      : matches.length > 0
        ? t("jsonMatchCount", String(current + 1), String(matches.length))
        : t("jsonNoMatches");

  return (
    <>
      <div className="kt-json-head">
        <input
          type="search"
          value={query}
          placeholder={t("jsonSearch")}
          aria-label={t("jsonSearch")}
          onChange={(event) => search(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") step(event.shiftKey ? -1 : 1);
          }}
        />
        <span className="kt-muted" aria-live="polite">
          {status}
        </span>
        <button type="button" disabled={matches.length === 0} aria-label={t("jsonPrevious")} title={t("jsonPrevious")} onClick={() => step(-1)}>
          ↑
        </button>
        <button type="button" disabled={matches.length === 0} aria-label={t("jsonNext")} title={t("jsonNext")} onClick={() => step(1)}>
          ↓
        </button>
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
