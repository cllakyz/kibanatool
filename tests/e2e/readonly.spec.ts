import { expect, test } from "./fixtures";
import { barLinks, openDoc, prefixOf } from "./kibana";
import { stack } from "./stack";

// The trace would record the Authorization header.
test.use({ recordTrace: false });

test("a user with read-only privileges gets the bar", async ({ context, configure }) => {
  await configure();
  // Kibana's HTTP authentication takes this header instead of the anonymous session.
  await context.setExtraHTTPHeaders({ authorization: stack.readerAuth });
  const { page, detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-001"' });
  const me = await page.evaluate(async (prefix) => {
    const response = await fetch(`${prefix}/internal/security/me`, { headers: { "x-elastic-internal-origin": "Kibana" } });
    return response.json();
  }, prefixOf());
  expect(me).toMatchObject({ username: "kt_reader", roles: ["kt_reader"] }); // no anonymous superuser on top
  expect((await barLinks(detail)).User).toBe("https://admin.example.com/users/100001");
});
