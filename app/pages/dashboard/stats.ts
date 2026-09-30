import { DownloadDay } from "#app/shared/services/downloads";

export interface DayTotal {
  id: string;
  day: string;
  label: string;
  count: number;
}

export interface EpisodeTotals {
  today: number;
  week: number;
  month: number;
}

/** The last `n` days ending on `today`, oldest first, as YYYY-MM-DD. */
export function lastDays(today: string, n: number): string[] {
  let [y, m, d] = today.split("-").map(Number);
  let days: string[] = [];

  for (let i = n - 1; i >= 0; i--) {
    days.push(new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10));
  }

  return days;
}

export function dayLabel(day: string): string {
  let [y, m, d] = day.split("-").map(Number);

  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function dailyTotals(rows: Iterable<DownloadDay>, days: string[], showId: string = ""): DayTotal[] {
  let byDay = new Map<string, number>();

  for (let row of rows) {
    if (!showId || row.showId === showId) {
      byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.count);
    }
  }

  return days.map((day) => ({ id: day, day, label: dayLabel(day), count: byDay.get(day) ?? 0 }));
}

export function sumLast(totals: DayTotal[], n: number): number {
  return totals.slice(-n).reduce((sum, t) => sum + t.count, 0);
}

export function episodeTotals(rows: Iterable<DownloadDay>, days: string[]): Map<string, EpisodeTotals> {
  let today = days[days.length - 1];
  let weekStart = days[Math.max(0, days.length - 7)];
  let monthStart = days[0];
  let totals = new Map<string, EpisodeTotals>();

  for (let row of rows) {
    if (row.day < monthStart) {
      continue;
    }

    let t = totals.get(row.episodeId) ?? { today: 0, week: 0, month: 0 };
    t.month += row.count;

    if (row.day >= weekStart) {
      t.week += row.count;
    }

    if (row.day === today) {
      t.today += row.count;
    }

    totals.set(row.episodeId, t);
  }

  return totals;
}

/** A round axis maximum a little above the tallest bar. */
export function niceMax(value: number): number {
  if (value <= 0) {
    return 10;
  }

  let step = Math.pow(10, Math.floor(Math.log10(value)));

  for (let m of [1, 2, 2.5, 5, 10]) {
    if (m * step >= value) {
      return m * step;
    }
  }

  return 10 * step;
}
