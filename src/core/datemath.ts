// Kibana date math for "copy view with fixed time" (spec §7.4):
// "now", "now±N<unit>" and an optional "/<unit>" rounding; absolute dates pass through.
// ponytail: rounding uses the browser time zone and Sunday-first weeks (Kibana's defaults);
// the dateFormat:tz / dateFormat:dow advanced settings are not read.

type Unit = "s" | "m" | "h" | "d" | "w" | "M" | "y";

const EXPRESSION = /^now(?:([+-])(\d+)([smhdwMy]))?(?:\/([smhdwMy]))?$/;

/** ISO date for `expression`, or null when it is unsupported. `roundUp` rounds to the end of the unit (for `to`). */
export function resolveDatemath(expression: string, now: Date, roundUp: boolean): string | null {
  const text = expression.trim();
  const match = EXPRESSION.exec(text);
  if (!match) return text.startsWith("now") || Number.isNaN(Date.parse(text)) ? null : text;
  const [, sign, amount, unit, roundUnit] = match;
  const date = new Date(now.getTime());
  if (sign && amount && unit) add(date, (sign === "-" ? -1 : 1) * Number(amount), unit as Unit);
  if (roundUnit) roundTo(date, roundUnit as Unit, roundUp);
  return date.toISOString();
}

const UNIT_MS: Partial<Record<Unit, number>> = { s: 1000, m: 60_000, h: 3_600_000 };

function add(date: Date, amount: number, unit: Unit): void {
  // Like Kibana (moment): s, m and h are absolute time, so a DST change does not shift them; d, w, M and y are calendar units.
  const ms = UNIT_MS[unit];
  if (ms !== undefined) {
    date.setTime(date.getTime() + amount * ms);
    return;
  }
  switch (unit) {
    case "d":
      date.setDate(date.getDate() + amount);
      break;
    case "w":
      date.setDate(date.getDate() + 7 * amount);
      break;
    case "M":
      addMonths(date, amount);
      break;
    case "y":
      addMonths(date, 12 * amount);
      break;
  }
}

/** Like Kibana (moment): 31 March minus a month is 28/29 February, not 2/3 March. */
function addMonths(date: Date, amount: number): void {
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
}

function roundTo(date: Date, unit: Unit, roundUp: boolean): void {
  startOf(date, unit);
  if (!roundUp) return;
  add(date, 1, unit);
  date.setMilliseconds(date.getMilliseconds() - 1);
}

function startOf(date: Date, unit: Unit): void {
  switch (unit) {
    case "y":
      date.setMonth(0, 1);
      date.setHours(0, 0, 0, 0);
      break;
    case "M":
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      break;
    case "w":
      date.setDate(date.getDate() - date.getDay());
      date.setHours(0, 0, 0, 0);
      break;
    case "d":
      date.setHours(0, 0, 0, 0);
      break;
    case "h":
      date.setMinutes(0, 0, 0);
      break;
    case "m":
      date.setSeconds(0, 0);
      break;
    case "s":
      date.setMilliseconds(0);
      break;
  }
}
