/**
 * Display formatting.
 *
 * Times are rendered in Asia/Seoul explicitly rather than the runtime's local
 * zone. These pages render on the server now, so "local" would be whatever the
 * host is set to, and a cutoff shown an hour off is worse than one shown as a
 * raw timestamp. The snapshot declares Asia/Seoul; this honours it.
 */
const SEOUL = "Asia/Seoul";

const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: SEOUL,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateTimeFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: SEOUL,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? "—" : timeFormat.format(at);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? "—" : `${dateTimeFormat.format(at)} KST`;
}

/** Tonnes, one decimal only when it carries information. */
export function formatTonnes(kg: number | null | undefined): string {
  if (kg === null || kg === undefined) return "—";
  const t = kg / 1000;
  return `${Number.isInteger(t) ? t : t.toFixed(1)}t`;
}

export function formatMm(mm: number | null | undefined): string {
  return mm === null || mm === undefined ? "—" : `${mm.toLocaleString("ko-KR")}mm`;
}
