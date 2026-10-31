const rtf = new Intl.RelativeTimeFormat("de", { numeric: "auto" });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function timeAgo(date: Date | string): string {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "gerade eben";
}

export function TimeAgo({ date }: { date: Date | string }) {
  const d = new Date(date);
  return (
    <time dateTime={d.toISOString()} title={d.toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}>
      {timeAgo(d)}
    </time>
  );
}
