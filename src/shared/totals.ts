export interface PricedLine {
  /** in hundredths: 1.5 hours is 150 */
  quantity: number;
  /** in cents */
  unitPrice: number;
}

export interface Totals {
  /** amount for each line, in cents, in the same order as the input */
  lineAmounts: number[];
  subtotal: number;
  tax: number;
  total: number;
}

/** Price of one line in cents, rounded half up to the nearest cent. */
export function lineAmount(line: PricedLine): number {
  return multiplyAndRound(line.quantity, line.unitPrice, 100);
}

/**
 * Totals for an invoice. Tax is charged once on the subtotal (not per line),
 * which is how most invoices and accounting tools calculate it.
 *
 * @param taxRate in basis points: 8.25% is 825
 */
export function calculateTotals(lines: PricedLine[], taxRate: number): Totals {
  const lineAmounts = lines.map(lineAmount);
  const subtotal = lineAmounts.reduce((sum, amount) => sum + amount, 0);
  const tax = multiplyAndRound(subtotal, taxRate, 10_000);
  return { lineAmounts, subtotal, tax, total: subtotal + tax };
}

/**
 * Returns a * b / divisor rounded half up. Uses BigInt for the product so
 * large invoices can't lose precision before the division.
 */
function multiplyAndRound(a: number, b: number, divisor: number): number {
  const product = BigInt(a) * BigInt(b);
  const d = BigInt(divisor);
  return Number((product * 2n + d) / (2n * d));
}
