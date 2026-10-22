import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { translate } from "@docusaurus/Translate";
import useBaseUrl from "@docusaurus/useBaseUrl";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import styles from "./styles.module.css";

interface Shot {
  key: string;
  label: string;
  caption: string;
}

// Spec §6.2 screenshot table, in tab order.
function shots(): Shot[] {
  return [
    {
      key: "1-bar",
      label: translate({ id: "home.shots.bar.label", message: "Action bar" }),
      caption: translate({
        id: "home.shots.bar.caption",
        message:
          "The action bar above the log you open: link actions in blue, Discover actions in light blue, then View and the copy menu.",
      }),
    },
    {
      key: "2-rows",
      label: translate({ id: "home.shots.rows.label", message: "Row buttons" }),
      caption: translate({
        id: "home.shots.rows.caption",
        message:
          "Actions marked Show in row appear on the result row you point at, so one click runs them without opening the log.",
      }),
    },
    {
      key: "3-view",
      label: translate({ id: "home.shots.view.label", message: "View panel" }),
      caption: translate({
        id: "home.shots.view.caption",
        message:
          "View opens JSON, XML and form text as a tree you can search, and long or multi-line text with its line breaks kept.",
      }),
    },
    {
      key: "4-copy",
      label: translate({ id: "home.shots.copy.label", message: "Copy menu" }),
      caption: translate({
        id: "home.shots.copy.caption",
        message:
          "Copy the log as Markdown or JSON, or the request it records as a cURL command, with tokens and passwords masked.",
      }),
    },
    {
      key: "5-options",
      label: translate({ id: "home.shots.options.label", message: "Options page" }),
      caption: translate({
        id: "home.shots.options.caption",
        message: "Environments, variables, actions, masking and export, each on its own tab of the options page.",
      }),
    },
  ];
}

export default function ScreenshotTabs(): ReactNode {
  const list = shots();
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const { currentLocale } = useDocusaurusContext().i18n;
  const shot = list[selected]!;
  const src = useBaseUrl(`/img/screenshots/${currentLocale}/${shot.key}.png`);

  function choose(index: number) {
    setSelected(index);
    tabs.current[index]?.focus();
  }

  function onKeyDown(event: KeyboardEvent) {
    const n = list.length;
    const moves: Record<string, number> = { ArrowRight: (selected + 1) % n, ArrowLeft: (selected + n - 1) % n, Home: 0, End: n - 1 };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    choose(next);
  }

  return (
    <div>
      <div
        className={styles.tablist}
        role="tablist"
        aria-label={translate({ id: "home.shots.label", message: "Screenshots" })}
        onKeyDown={onKeyDown}
      >
        {list.map((s, i) => (
          <button
            key={s.key}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            id={`shot-tab-${s.key}`}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={i === selected}
            aria-controls="shot-panel"
            tabIndex={i === selected ? 0 : -1}
            onClick={() => setSelected(i)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div id="shot-panel" className={styles.panel} role="tabpanel" aria-labelledby={`shot-tab-${shot.key}`} tabIndex={0}>
        <img
          className={styles.image}
          src={src}
          width={1280}
          height={800}
          alt={shot.caption}
          loading={selected === 0 ? "eager" : "lazy"}
        />
        <p className={styles.caption}>{shot.caption}</p>
      </div>
    </div>
  );
}
