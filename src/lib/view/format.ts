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

/**
 * How long ago, for a list where the exact instant is not the point.
 *
 * A scenario list is read as "the one I was just looking at" versus "the one
 * from this morning"; a full timestamp on every row makes that comparison work
 * the reader has to do. Anything older than a day falls back to the date, where
 * "37시간 전" stops being easier than reading it.
 */
export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return "—";

  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  return formatDateTime(iso);
}
