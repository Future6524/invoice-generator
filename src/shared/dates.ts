// Invoice dates are calendar dates ("2024-03-05") with no time zone, so all
// date maths is done in UTC to stop a date shifting by a day near midnight.

const display = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** "2024-03-05" -> "Mar 5, 2024" */
export function formatDate(isoDate: string): string {
  return display.format(new Date(`${isoDate}T00:00:00Z`));
}

/** "2024-01-30" + 3 days -> "2024-02-02" */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Today's date where the user is, as YYYY-MM-DD. */
export function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
