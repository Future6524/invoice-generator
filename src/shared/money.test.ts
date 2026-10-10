import { describe, expect, it } from "vitest";
import { formatHundredths, formatMoney, formatTaxRate, parseHundredths } from "./money";

describe("parseHundredths", () => {
  it.each([
    ["12", 1200],
    ["12.5", 1250],
    ["12.50", 1250],
    ["12.", 1200],
    [".5", 50],
    ["0.05", 5],
    ["$1,250.75", 125075],
    ["  8.25 ", 825],
    ["0", 0],
  ])("reads %j as %i", (input, expected) => {
    expect(parseHundredths(input)).toBe(expected);
  });

  it.each(["", "abc", "-5", "1.234", "1.2.3", "12a", "1e5", "$", "99999999999999999"])(
    "rejects %j",
    (input) => {
      expect(parseHundredths(input)).toBeNull();
    },
  );
});

describe("formatting", () => {
  it("formats cents as dollars", () => {
    expect(formatMoney(125075)).toBe("$1,250.75");
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("drops trailing zeros from quantities", () => {
    expect(formatHundredths(150)).toBe("1.5");
    expect(formatHundredths(200)).toBe("2");
    expect(formatHundredths(125)).toBe("1.25");
  });

  it("formats basis points as a percentage", () => {
    expect(formatTaxRate(825)).toBe("8.25%");
    expect(formatTaxRate(0)).toBe("0%");
  });
});
