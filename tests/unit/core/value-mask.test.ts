import { describe, expect, it } from "vitest";
import { MASK, VALUE_MASK_KINDS, maskText } from "../../../src/core/value-mask";

// Synthetic values only (Plan 5 spec §9.1): the ID numbers' checksums were computed for these tests, and the
// card numbers are the networks' well-known test numbers.
const TCKN = "10000000146";
const TCKN_2 = "20000000046";
const IBAN = "TR000000000000000000000001";
const IBAN_SPACED = "TR00 0000 0000 0000 0000 0000 01";
const all = [...VALUE_MASK_KINDS];
const mask = (text: string): string => maskText(text, all);

/** Appends the Luhn check digit to a body of digits, so a test can build a card number with a chosen prefix. */
function withCheckDigit(body: string): string {
  let sum = 0;
  [...body].reverse().forEach((char, index) => {
    const value = Number(char) * (index % 2 === 0 ? 2 : 1);
    sum += value > 9 ? value - 9 : value;
  });
  return body + String((10 - (sum % 10)) % 10);
}

describe("maskText: IBAN", () => {
  it("masks a TR IBAN, compact or in groups of four, in either case", () => {
    expect(mask(`<iban>${IBAN}</iban>`)).toBe("<iban>***</iban>");
    expect(mask(`IBAN: ${IBAN_SPACED}.`)).toBe("IBAN: ***.");
    expect(mask("iban tr000000000000000000000001")).toBe("iban ***");
  });

  it("leaves other countries and other lengths alone", () => {
    expect(mask("DE00000000000000000000")).toBe("DE00000000000000000000");
    expect(mask("TR00000000000000000000000")).toBe("TR00000000000000000000000"); // 23 digits
  });

  it("does not join groups across two spaces", () => {
    const text = "TR00  0000 0000 0000 0000 0000 01";
    expect(mask(text)).toBe(text); // no IBAN match, and no other kind matches inside it either
  });
});

describe("maskText: card numbers", () => {
  it("masks Visa, Mastercard, Amex and Troy numbers that pass Luhn, with or without separators", () => {
    expect(mask("4111 1111 1111 1111 / 4111-1111-1111-1111 / 4111111111111111")).toBe("*** / *** / ***");
    expect(mask("mc 5555555555554444, 2221000000000009")).toBe("mc ***, ***");
    expect(mask("amex 3782 822463 10005")).toBe("amex ***");
    expect(mask("troy 9792000000000003")).toBe("troy ***");
  });

  it("leaves numbers without a card network prefix alone, even when they pass Luhn", () => {
    // Like the 14-digit coupon serial numbers and the 18-digit ids seen in Alpha (spec §3).
    expect(mask("<ns1:serialNumber>70000000000120</ns1:serialNumber>")).toBe("<ns1:serialNumber>70000000000120</ns1:serialNumber>");
    expect(mask('Value="900000000000000126"')).toBe('Value="900000000000000126"');
  });

  it("leaves a number that fails Luhn and an already masked number alone", () => {
    expect(mask("4111111111111112")).toBe("4111111111111112");
    expect(mask("411111******1111")).toBe("411111******1111");
  });

  it("does not join groups across two separators in a row", () => {
    expect(mask("4111  1111 1111 1111")).toBe("4111  1111 1111 1111");
  });

  it("masks a card that follows another group of digits", () => {
    expect(mask("2024 4111 1111 1111 1111")).toBe("2024 ***");
    expect(mask("MCC 5411 4111-1111-1111-1111.")).toBe("MCC 5411 ***.");
    expect(mask("Kart: 0000 4111 1111 1111 1111")).toBe("Kart: 0000 ***");
    expect(mask("1234 5678 4111 1111 1111 1111 x")).toBe("1234 5678 *** x");
  });

  it("keeps to the network ranges at their edges", () => {
    const card = (prefix: string): string => withCheckDigit(prefix.padEnd(15, "0"));
    expect(mask(card("2220"))).toBe(card("2220")); // Mastercard 2-series starts at 2221
    expect(mask(card("2221"))).toBe(MASK);
    expect(mask(card("2720"))).toBe(MASK); // and ends at 2720
    expect(mask(card("2721"))).toBe(card("2721"));
    expect(mask(card("5600"))).toBe(card("5600")); // 51-55 only
    const amex = (prefix: string): string => withCheckDigit(prefix.padEnd(14, "0")); // 15 digits: only 34 and 37
    expect(mask(amex("35"))).toBe(amex("35"));
    expect(mask(amex("34"))).toBe(MASK);
  });
});

describe("maskText: TCKN", () => {
  it("masks an 11-digit number with a valid checksum", () => {
    expect(mask(`<ns1:identitynumber>${TCKN}</ns1:identitynumber>`)).toBe("<ns1:identitynumber>***</ns1:identitynumber>");
    expect(mask(`Value="${TCKN}" ${TCKN_2}`)).toBe('Value="***" ***');
  });

  it("leaves a bad checksum and a leading zero alone", () => {
    expect(mask("10000000147")).toBe("10000000147");
    expect(mask("01234567890")).toBe("01234567890");
  });
});

describe("maskText: GSM", () => {
  it("masks Turkish mobile numbers with +90, 90, 0 or no prefix", () => {
    expect(mask("+90 555 000 00 00, 0555-000-00-00, 905550000000, (555) 000 00 00, 5550000000")).toBe("***, ***, ***, ***, ***");
    expect(mask("0 (555) 000 0000")).toBe(MASK);
    expect(mask("05550000000")).toBe(MASK);
  });

  it("leaves a 12-digit number that starts with 90 but not 905 alone", () => {
    expect(mask("901234567890")).toBe("901234567890");
  });
});

describe("maskText: boundaries (spec §4.1)", () => {
  it("never matches next to a letter or a digit", () => {
    for (const text of [`a${TCKN}b`, "x5550000000", `TCKN${TCKN}`, `1${TCKN}0`, `ş${TCKN}ğ`]) expect(mask(text)).toBe(text);
  });

  it("leaves hex trace ids alone", () => {
    const trace = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    expect(mask(trace)).toBe(trace);
  });

  it("matches at the start and at the end of the text", () => {
    expect(mask(TCKN)).toBe(MASK);
    expect(mask(`${IBAN} ${TCKN}`)).toBe("*** ***");
  });
});

describe("maskText: order and kinds", () => {
  it("masks a spaced IBAN whole, so its groups are not taken for a card number", () => {
    expect(mask("TR12 4111 1111 1111 1111 0000 00")).toBe(MASK);
  });

  it("looks only for the kinds that are on", () => {
    expect(maskText(`${TCKN} 5550000000 ${IBAN} 4111111111111111`, ["tckn"])).toBe(`*** 5550000000 ${IBAN} 4111111111111111`);
    expect(maskText(`${TCKN} 5550000000`, [])).toBe(`${TCKN} 5550000000`);
  });

  it("lists the kinds in the order the options page saves them", () => {
    expect(VALUE_MASK_KINDS).toEqual(["iban", "tckn", "gsm", "card"]);
  });
});

describe("maskText: a large body", () => {
  it("scans 1 MB of XML with many digit runs in well under a second", () => {
    // Plan 5 Review Focus 2: request/response bodies can be large; no pattern may backtrack badly.
    const body = `<a>1234567890123 9876543210 ${"x".repeat(40)}</a>`.repeat(15_000);
    const started = performance.now();
    expect(maskText(body, all)).toBe(body);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
