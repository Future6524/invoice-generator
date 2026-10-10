import { describe, expect, it } from "vitest";
import { calculateTotals, lineAmount } from "./totals";

const dollars = (n: number) => Math.round(n * 100);

describe("lineAmount", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineAmount({ quantity: 300, unitPrice: dollars(25) })).toBe(dollars(75));
  });

  it("handles fractional quantities such as hours", () => {
    // 1.5 h x $80.00 = $120.00
    expect(lineAmount({ quantity: 150, unitPrice: dollars(80) })).toBe(dollars(120));
  });

  it("rounds half a cent up", () => {
    // 1.5 x $33.33 = $49.995 -> $50.00
    expect(lineAmount({ quantity: 150, unitPrice: 3333 })).toBe(5000);
  });

  it("rounds less than half a cent down", () => {
    // 0.33 x $10.01 = $3.3033 -> $3.30
    expect(lineAmount({ quantity: 33, unitPrice: 1001 })).toBe(330);
  });

  it("is zero for a free item", () => {
    expect(lineAmount({ quantity: 500, unitPrice: 0 })).toBe(0);
  });
});

describe("calculateTotals", () => {
  it("adds up lines and applies tax to the subtotal", () => {
    const totals = calculateTotals(
      [
        { quantity: 1000, unitPrice: dollars(85) }, // 10 h x $85 = $850
        { quantity: 100, unitPrice: dollars(150) }, // 1 x $150   = $150
      ],
      825, // 8.25%
    );
    expect(totals).toEqual({
      lineAmounts: [dollars(850), dollars(150)],
      subtotal: dollars(1000),
      tax: dollars(82.5),
      total: dollars(1082.5),
    });
  });

  it("rounds tax to the nearest cent", () => {
    // $10.05 x 8.25% = $0.829125 -> $0.83
    const totals = calculateTotals([{ quantity: 100, unitPrice: 1005 }], 825);
    expect(totals.tax).toBe(83);
    expect(totals.total).toBe(1088);
  });

  it("taxes the subtotal once instead of rounding tax on every line", () => {
    // Per line: 3 x round($0.10 x 5%) = 3 x 1c = 3c. On the subtotal: round($0.30 x 5%) = 2c.
    const lines = Array.from({ length: 3 }, () => ({ quantity: 100, unitPrice: 10 }));
    expect(calculateTotals(lines, 500).tax).toBe(2);
  });

  it("supports a 0% tax rate", () => {
    const totals = calculateTotals([{ quantity: 200, unitPrice: 4999 }], 0);
    expect(totals).toMatchObject({ subtotal: 9998, tax: 0, total: 9998 });
  });

  it("returns zeros for an invoice with no lines", () => {
    expect(calculateTotals([], 825)).toEqual({ lineAmounts: [], subtotal: 0, tax: 0, total: 0 });
  });

  it("stays exact for very large amounts", () => {
    // 10,000 units x $999,999.99 with 9.99% tax
    const totals = calculateTotals([{ quantity: 1_000_000, unitPrice: 99_999_999 }], 999);
    expect(totals.subtotal).toBe(999_999_990_000);
    expect(totals.tax).toBe(99_899_999_001);
    expect(totals.total).toBe(1_099_899_989_001);
  });
});
