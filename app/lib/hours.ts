import { formatClock } from "./format";
import type { PickupConfig, StoreHour, TodayInfo } from "./types";
import { VENUE_TIMEZONE } from "./venue";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Wall-clock parts in the venue's timezone, whatever the device timezone is. */
export function venueParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: VENUE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** YYYY-MM-DD in the venue's timezone. */
export function venueDate(now = new Date()) {
  const p = venueParts(now);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** "Fri 26 Sep" for a YYYY-MM-DD, stable in any device timezone. */
export function dayLabel(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

function toMinutes(time: string | null | undefined) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
}

/**
 * The instant at which the venue's clock reads `minutes` past midnight today.
 * Trading hours never straddle the 2-3am daylight-saving change, so one offset
 * for the day is exact for every slot we generate.
 */
function venueInstantToday(minutes: number, now: Date) {
  const p = venueParts(now);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offset = wallAsUtc - Math.floor(now.getTime() / 1000) * 1000;
  return new Date(Date.UTC(p.year, p.month - 1, p.day, Math.floor(minutes / 60), minutes % 60) - offset);
}

/**
 * Today's pickup slots, every interval from the later of opening and now plus
 * the lead time, up to closing. Lead time and interval are admin settings; the
 * backend enforces the same rules on POST /api/orders, so this list is a
 * convenience rather than the guardrail. Uses today's resolved hours, so a
 * special day's hours apply automatically.
 */
export function pickupSlots(today: TodayInfo | null, pickup: PickupConfig | null, now = new Date()) {
  if (!today?.is_open) return [];
  const open = toMinutes(today.open_time);
  const close = toMinutes(today.close_time);
  if (open == null || close == null) return [];

  const lead = Math.max(0, Number(pickup?.lead_minutes ?? 20));
  const interval = Math.max(5, Number(pickup?.interval_minutes ?? 15)) || 15;
  const p = venueParts(now);
  const nowMinutes = p.hour * 60 + p.minute + (p.second > 0 ? 1 : 0);

  let start = Math.max(open, nowMinutes + lead);
  const remainder = start % interval;
  if (remainder) start += interval - remainder;

  const slots: Date[] = [];
  for (let minutes = start; minutes <= close; minutes += interval) {
    slots.push(venueInstantToday(minutes, now));
  }
  return slots;
}

export type HoursRow = { days: string; hours: string };

/** Collapse the weekly hours into rows like "Monday to Thursday: 3:00 pm to 9:00 pm". */
export function summariseHours(storeHours: StoreHour[] | null | undefined): HoursRow[] {
  if (!storeHours?.length) return [];
  const byDay = new Map(storeHours.map((row) => [row.day_of_week, row]));
  const describe = (row: StoreHour | undefined) =>
    row?.is_open && row.open_time && row.close_time
      ? `${formatClock(row.open_time)} to ${formatClock(row.close_time)}`
      : "Closed";

  const rows: Array<{ first: number; last: number; hours: string }> = [];
  for (const day of WEEK_ORDER) {
    const hours = describe(byDay.get(day));
    const previous = rows[rows.length - 1];
    if (previous && previous.hours === hours) previous.last = day;
    else rows.push({ first: day, last: day, hours });
  }

  return rows.map(({ first, last, hours }) => {
    if (first === last) return { days: DAY_NAMES[first], hours };
    const span = WEEK_ORDER.indexOf(last) - WEEK_ORDER.indexOf(first);
    const joiner = span === 1 ? " and " : " to ";
    return { days: `${DAY_NAMES[first]}${joiner}${DAY_NAMES[last]}`, hours };
  });
}

/** One-line status for the service bar and hero. */
export function statusLabel(today: TodayInfo | null, ordersPaused: boolean, storeHours: StoreHour[] | null) {
  if (!today) return null;
  if (today.is_open_now) {
    const closes = formatClock(today.close_time);
    if (ordersPaused) return { open: true, label: "Open now · online orders paused" };
    return { open: true, label: closes ? `Open now, closes ${closes}` : "Open now" };
  }

  const nowMinutes = (() => {
    const p = venueParts();
    return p.hour * 60 + p.minute;
  })();
  const opensAt = toMinutes(today.open_time);
  if (today.is_open && opensAt != null && nowMinutes < opensAt) {
    return { open: false, label: `Closed now, opens ${formatClock(today.open_time)}` };
  }

  // Closed for the rest of today: find the next trading day.
  if (storeHours?.length) {
    const todayIndex = new Date(`${venueDate()}T12:00:00Z`).getUTCDay();
    for (let offset = 1; offset <= 7; offset += 1) {
      const day = (todayIndex + offset) % 7;
      const row = storeHours.find((entry) => entry.day_of_week === day);
      if (row?.is_open && row.open_time) {
        const when = offset === 1 ? "tomorrow" : DAY_NAMES[day];
        return { open: false, label: `Closed now, opens ${when} ${formatClock(row.open_time)}` };
      }
    }
  }
  return { open: false, label: today.is_special_day && today.label ? `Closed today · ${today.label}` : "Closed now" };
}
