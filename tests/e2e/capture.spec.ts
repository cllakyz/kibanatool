// Refreshes tests/fixtures/ from the running stack (spec §13.1). Run once per stack:
//   KT_STACK=7 KT_CAPTURE=1 npm run e2e -- capture
import { mkdirSync, writeFileSync } from "node:fs";
import type { DocIdentity } from "../../src/core/types";
import { test } from "./fixtures";
import { type DiscoverTarget, openDoc, prefixOf } from "./kibana";
import { stack } from "./stack";

test.skip(!process.env.KT_CAPTURE, "set KT_CAPTURE=1 to refresh tests/fixtures");

/** From Elasticsearch, not from the page: the fixture test checks the adapters against it. */
async function ecsIdentity(traceId: string, dataViewId: string): Promise<DocIdentity> {
  const response = await fetch(`${stack.es}/logs-kibanatool-default/_search`, {
    method: "POST",
    headers: { authorization: stack.elasticAuth, "content-type": "application/json" },
    body: JSON.stringify({ size: 1, query: { match: { "trace.id": traceId } } }),
  });
  const hit = (await response.json()).hits.hits[0];
  return { dataViewId, index: hit._index, id: hit._id };
}

const cases: Array<{ name: string; target: DiscoverTarget; identity: () => Promise<DocIdentity> }> = [
  {
    name: `${stack.version}-app-log`,
    target: { dataViewId: "app-log", query: 'extra.uid:"uid-001"' },
    identity: async () => ({ dataViewId: "app-log", index: "app_log", id: "app-001" }),
  },
];
if (stack.major === 9) {
  cases.push({
    name: `${stack.version}-obs-log-overview`,
    target: { space: "obs", dataViewId: "obs-logs", query: 'trace.id:"trace-0001"' },
    identity: () => ecsIdentity("trace-0001", "obs-logs"),
  });
}

for (const { name, target, identity } of cases) {
  test(`capture ${name}`, async ({ context, configure }) => {
    await configure();
    const { page, detail } = await openDoc(context, target);
    // Without the extension's own element. A legacy <tr> needs its table, or HTML parsing drops it.
    const html = await detail.evaluate((element) => {
      const copy = element.cloneNode(true) as Element;
      for (const host of copy.querySelectorAll("kibanatool-bar")) host.remove();
      return copy.tagName === "TR" ? `<table><tbody>${copy.outerHTML}</tbody></table>` : copy.outerHTML;
    });
    const url = new URL(page.url());
    const fixture = {
      pathname: url.pathname,
      hash: url.hash,
      prefix: prefixOf(target.space),
      identity: await identity(),
      html: html.replace(/<svg[\s\S]*?<\/svg>/g, "<svg></svg>"), // icons only; keeps the files small
    };
    mkdirSync("tests/fixtures", { recursive: true });
    writeFileSync(`tests/fixtures/${name}.json`, `${JSON.stringify(fixture, null, 2)}\n`);
  });
}
