// The Kibana stack an e2e run targets: KT_STACK=7|8|9, started with ./docker/up.sh <major>.
import { readFileSync } from "node:fs";

const STACKS = {
  "7": { major: 7, version: "7.17.29", es: "http://localhost:17200", kibana: "http://localhost:17601/kibana" },
  "8": { major: 8, version: "8.19.23", es: "http://localhost:18200", kibana: "http://localhost:18601" },
  "9": { major: 9, version: "9.5.5", es: "http://localhost:19200", kibana: "http://localhost:19601" },
} as const;

/** The extension copy that global-setup.ts prepares. */
export const EXTENSION_DIR = ".output/e2e-extension";

function readSecrets(major: string): Record<string, string> {
  const text = readFileSync(`docker/.env.${major}`, "utf8");
  return Object.fromEntries(
    text.split("\n").flatMap((line) => {
      const at = line.indexOf("=");
      return at > 0 ? [[line.slice(0, at), line.slice(at + 1)]] : [];
    }),
  );
}

function basicAuth(user: string, password: string | undefined): string {
  if (!password) throw new Error(`No password for ${user} in docker/.env.*; run ./docker/up.sh first`);
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function currentStack() {
  const key = process.env.KT_STACK;
  if (key !== "7" && key !== "8" && key !== "9") throw new Error(`Set KT_STACK to 7, 8 or 9 (got "${key ?? ""}")`);
  const target = STACKS[key];
  const secrets = readSecrets(key);
  return {
    ...target,
    origin: new URL(target.kibana).origin,
    // Authorization header values; never log them.
    elasticAuth: basicAuth("elastic", secrets.ELASTIC_PASSWORD),
    readerAuth: basicAuth("kt_reader", secrets.READER_PASSWORD),
  };
}

export const stack = currentStack();
