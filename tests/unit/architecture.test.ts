// Enforces the constitution's import table (Principle I, Gate G2): which layer may import which,
// no browser globals in src/core, and no import cycles under src/.
import { readFileSync, readdirSync } from "node:fs";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

type Group = "core" | "kibana" | "adapters" | "background" | "root" | "content" | "options";

const RULES: Record<Group, { groups: readonly Group[] | "any"; npm: readonly string[] | "any" }> = {
  core: { groups: ["core"], npm: ["zod"] },
  kibana: { groups: ["core", "kibana"], npm: "any" },
  adapters: { groups: ["adapters", "kibana", "core"], npm: [] },
  background: { groups: ["background", "core"], npm: [] },
  root: { groups: ["core", "root"], npm: ["wxt/browser"] },
  content: { groups: "any", npm: "any" },
  options: { groups: "any", npm: "any" },
};

/** Imports from outside src/ that one file may make. */
const FILE_RULES: Readonly<Record<string, readonly string[]>> = {
  "src/i18n.ts": ["public/_locales/en/messages.json"],
};

const GLOBALS = new Set(["window", "document", "location", "navigator", "fetch", "chrome", "browser"]);

/** The open Principle I rows of the constitution's Known Deviations; the list only shrinks. */
const EXCEPTIONS: { from: string; to: string }[] = [];

/** "src/core/x.ts" → "core"; a file directly in src/ → "root"; anything else has no group. */
function groupOf(path: string): Group | undefined {
  const match = /^src\/(?:(core|kibana|adapters|background|content|options)\/|[^/]+$)/.exec(path);
  if (!match) return undefined;
  return (match[1] as Group | undefined) ?? "root";
}

function resolve(files: ReadonlyMap<string, string>, from: string, specifier: string): string {
  const base = posix.join(posix.dirname(from), specifier);
  return ["", ".ts", ".tsx", "/index.ts", "/index.tsx"].map((suffix) => base + suffix).find((path) => files.has(path)) ?? base;
}

/** A name that only labels something (property access or assignment, declaration, parameter) is not a reference. */
function isReference(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (ts.isShorthandPropertyAssignment(parent)) return true;
  return !("name" in parent && parent.name === node);
}

function browserGlobals(path: string, text: string): string[] {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && GLOBALS.has(node.text) && isReference(node)) found.push(`${path} uses the browser global ${node.text}`);
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS));
  return found;
}

/** Each back edge of a depth-first search is one cycle. */
function cycles(edges: ReadonlyMap<string, readonly string[]>): string[] {
  const found: string[] = [];
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const visit = (path: string): void => {
    state.set(path, "visiting");
    stack.push(path);
    for (const next of edges.get(path) ?? []) {
      if (state.get(next) === "visiting") found.push(`import cycle: ${[...stack.slice(stack.indexOf(next)), next].join(" → ")}`);
      else if (!state.has(next) && edges.has(next)) visit(next);
    }
    stack.pop();
    state.set(path, "done");
  };
  for (const path of edges.keys()) if (!state.has(path)) visit(path);
  return found;
}

/** Every import (type-only, re-export and dynamic included) checked against the table. */
function check(files: ReadonlyMap<string, string>): string[] {
  const violations: string[] = [];
  const edges = new Map<string, string[]>();
  for (const [path, text] of files) {
    const group = groupOf(path);
    if (!group) {
      violations.push(`${path} is in no group of the import table`);
      continue;
    }
    const rule = RULES[group];
    const targets: string[] = [];
    for (const { fileName: specifier } of ts.preProcessFile(text, true, true).importedFiles) {
      if (!specifier.startsWith(".")) {
        if (rule.npm === "any" || rule.npm.some((name) => specifier === name || specifier.startsWith(`${name}/`))) continue;
        const allowed = rule.npm.length === 0 ? "no npm packages" : `only ${rule.npm.join(", ")}`;
        violations.push(`${path} imports ${specifier} (${group} may import ${allowed})`);
        continue;
      }
      const target = resolve(files, path, specifier);
      if (!target.startsWith("src/")) {
        if (!FILE_RULES[path]?.includes(target)) violations.push(`${path} imports ${specifier} (outside src/)`);
        continue;
      }
      targets.push(target);
      const targetGroup = groupOf(target);
      if (!targetGroup) violations.push(`${path} imports ${specifier} (no group)`);
      else if (rule.groups !== "any" && !rule.groups.includes(targetGroup)) {
        violations.push(`${path} imports ${specifier} (${group} may not import ${targetGroup})`);
      }
    }
    edges.set(path, targets);
    if (group === "core") violations.push(...browserGlobals(path, text));
  }
  return [...violations, ...cycles(edges)];
}

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** Every .ts/.tsx under src/ except ambient declarations, keyed by repo-relative path. */
function readTree(): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")) files.set(path, readFileSync(join(ROOT, path), "utf8"));
    }
  };
  walk("src");
  return files;
}

const isException = (violation: string, { from, to }: { from: string; to: string }): boolean =>
  violation.startsWith(`${from} imports ${to} `);

describe("the import table (constitution Principle I)", () => {
  const violations = check(readTree());

  it("holds for src/, apart from the listed exceptions", () => {
    expect(violations.filter((violation) => !EXCEPTIONS.some((exception) => isException(violation, exception)))).toEqual([]);
  });

  it("lists no exception that is already fixed", () => {
    for (const exception of EXCEPTIONS) {
      const open = violations.some((violation) => isException(violation, exception));
      expect(open, `${exception.from} → ${exception.to} is fixed: remove it from EXCEPTIONS`).toBe(true);
    }
  });
});

describe("check", () => {
  const tree = (entries: Record<string, string>) => new Map(Object.entries(entries));

  it("reports an outer layer imported by core", () => {
    const files = tree({ "src/core/a.ts": 'import { b } from "../kibana/b";', "src/kibana/b.ts": "export const b = 1;" });
    expect(check(files)).toEqual(["src/core/a.ts imports ../kibana/b (core may not import kibana)"]);
  });

  it("counts a type-only import", () => {
    const files = tree({ "src/core/a.ts": 'import type { C } from "../content/c";', "src/content/c.ts": "export type C = 1;" });
    expect(check(files)).toEqual(["src/core/a.ts imports ../content/c (core may not import content)"]);
  });

  it("counts a re-export", () => {
    const files = tree({ "src/core/a.ts": 'export { d } from "../options/d";', "src/options/d.ts": "export const d = 1;" });
    expect(check(files)).toEqual(["src/core/a.ts imports ../options/d (core may not import options)"]);
  });

  it("reports a browser global in core", () => {
    expect(check(tree({ "src/core/a.ts": "export const here = () => location.href;" }))).toEqual([
      "src/core/a.ts uses the browser global location",
    ]);
  });

  it("reports an import cycle", () => {
    const files = tree({
      "src/core/e.ts": 'import { f } from "./f";\nexport const e = 1;',
      "src/core/f.ts": 'import { e } from "./e";\nexport const f = 1;',
    });
    expect(check(files)).toEqual(["import cycle: src/core/e.ts → src/core/f.ts → src/core/e.ts"]);
  });

  it("reports an npm package the group may not use", () => {
    expect(check(tree({ "src/core/a.ts": 'import { useState } from "react";' }))).toEqual([
      "src/core/a.ts imports react (core may import only zod)",
    ]);
  });

  it("ignores property names, comments and strings", () => {
    const text = '// the browser time zone\nconst o = { location: 1, window: "window" };\nexport const n = o.location;';
    expect(check(tree({ "src/core/a.ts": text }))).toEqual([]);
  });
});
