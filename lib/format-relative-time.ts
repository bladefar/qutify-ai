/** Simple relative time for server-rendered lists. */
export function formatRelativeTime(iso: string) {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const seconds = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);

  const intervals: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, secondsInUnit] of intervals) {
    const value = Math.round(seconds / secondsInUnit);
    if (Math.abs(value) >= 1) return rtf.format(value, unit);
  }

  return rtf.format(seconds, "second");
}
