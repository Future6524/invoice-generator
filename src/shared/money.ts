// Amounts are stored as whole numbers so that adding them up never produces
// floating point noise like 0.30000000000000004:
//   money      -> cents             ($12.50  -> 1250)
//   quantities -> hundredths        (1.5 hrs -> 150)
//   tax rates  -> basis points      (8.25%   -> 825)

/**
 * Reads a decimal typed by a person ("1,250.5", "$40", "8.25") as a whole
 * number scaled by 100. Returns null if the text isn't a plain non-negative
 * number with at most two decimal places.
 */
export function parseHundredths(input: string): number | null {
  const text = input.trim().replace(/^\$/, "").replace(/,/g, "");
  const match = /^(\d+)(?:\.(\d{0,2}))?$|^\.(\d{1,2})$/.exec(text);
  if (!match) return null;
  const whole = match[1] ?? "0";
  const fraction = (match[2] ?? match[3] ?? "").padEnd(2, "0");
  const value = Number(whole) * 100 + Number(fraction);
  return Number.isSafeInteger(value) ? value : null;
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatMoney(cents: number): string {
  return usd.format(cents / 100);
}

/** 150 -> "1.5", 200 -> "2", 125 -> "1.25" */
export function formatHundredths(value: number): string {
  return (value / 100).toFixed(2).replace(/\.?0+$/, "");
}

export function formatTaxRate(basisPoints: number): string {
  return `${formatHundredths(basisPoints)}%`;
}
