import { useState, type ReactNode } from "react";
import clsx from "clsx";
import Translate, { translate } from "@docusaurus/Translate";
import styles from "./styles.module.css";

// A synthetic log, fixed here (spec §4 "Hero demosu"); values are never translated.
const FIELDS: readonly (readonly [string, string])[] = [
  ["datetime", "2026-01-15 12:39:00"],
  ["level_name", "ERROR"],
  ["message", "Coupon not applied"],
  ["user_id", "4821"],
  ["context.method", "POST"],
  ["context.url", "https://api.example.com/v1/coupons"],
  ["context.body", '{"amount":40,"currency":"TRY"}'],
  ["context.headers", '{"authorization":"Bearer …"}'],
];

type DemoKind = "link" | "discover" | "plain";
interface DemoAction {
  id: string;
  kind: DemoKind;
  label: string;
  /** Shown instead of the label, which stays the accessible name. */
  glyph?: string;
  fields: readonly string[];
  result: string;
  note: ReactNode;
}

// Spec §6.2 button table, in bar order.
function demoActions(): DemoAction[] {
  return [
    {
      id: "admin-user",
      kind: "link",
      label: translate({ id: "home.demo.admin-user.label", message: "User in admin" }),
      fields: ["user_id"],
      result: "https://admin.example.com/users/4821",
      note: (
        <Translate id="home.demo.admin-user.note" values={{ template: <code>{"{env.adminUrl}/users/{user_id}"}</code> }}>
          {"from {template}"}
        </Translate>
      ),
    },
    {
      id: "sentry",
      kind: "link",
      label: translate({ id: "home.demo.sentry.label", message: "Sentry" }),
      fields: ["level_name", "message"],
      result: "https://acme.sentry.io/issues/?query=Coupon%20not%20applied",
      note: (
        <Translate id="home.demo.sentry.note" values={{ field: <code>level_name</code>, value: <code>ERROR</code> }}>
          {"shown only when {field} is {value}"}
        </Translate>
      ),
    },
    {
      id: "user-logs",
      kind: "discover",
      label: translate({ id: "home.demo.user-logs.label", message: "This user's logs" }),
      fields: ["user_id"],
      result: 'user_id:"4821"',
      note: <Translate id="home.demo.user-logs.note">in Discover, new tab</Translate>,
    },
    {
      id: "around",
      kind: "discover",
      label: translate({ id: "home.demo.around.label", message: "±5 minutes" }),
      fields: ["datetime"],
      result: translate({ id: "home.demo.around.result", message: "12:34 to 12:44" }),
      note: <Translate id="home.demo.around.note">in Discover, every log around this one</Translate>,
    },
    {
      id: "view",
      kind: "plain",
      label: translate({ id: "home.demo.view.label", message: "View" }),
      fields: ["context.body"],
      result: "context.body",
      note: <Translate id="home.demo.view.note">as a searchable JSON tree</Translate>,
    },
    {
      id: "copy",
      kind: "plain",
      label: translate({ id: "home.demo.copy.label", message: "Copy menu" }),
      glyph: "⋯",
      fields: ["context.method", "context.url", "context.headers"],
      result: "authorization: ***",
      note: <Translate id="home.demo.copy.note">masked in Copy as Markdown, JSON or cURL</Translate>,
    },
  ];
}

export default function HeroDemo(): ReactNode {
  const actions = demoActions();
  const [selected, setSelected] = useState("admin-user");
  const active = actions.find((a) => a.id === selected) ?? actions[0];

  return (
    <div
      className={styles.demo}
      data-testid="hero-demo"
      role="group"
      aria-label={translate({ id: "home.demo.label", message: "kibanatool's buttons on an example log" })}
    >
      <div className={styles.bar}>
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            className={clsx(styles.button, styles[a.kind], a.glyph && styles.glyph)}
            aria-pressed={a.id === active.id}
            aria-label={a.glyph ? a.label : undefined}
            onMouseEnter={() => setSelected(a.id)}
            onFocus={() => setSelected(a.id)}
            onClick={() => setSelected(a.id)}
          >
            {a.glyph ?? a.label}
          </button>
        ))}
      </div>
      <dl className={styles.fields}>
        {FIELDS.map(([key, value]) => {
          const marked = active.fields.includes(key);
          return (
            <div key={key} className={clsx(styles.field, marked && styles.marked)} data-field={key} data-marked={String(marked)}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          );
        })}
      </dl>
      <div className={styles.result} role="status" aria-live="polite">
        <p className={styles.resultValue}>{active.result}</p>
        <p className={styles.note}>{active.note}</p>
      </div>
    </div>
  );
}
