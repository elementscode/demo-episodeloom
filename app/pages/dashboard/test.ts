import { test, equal } from "@elements/app";
import { DownloadDay } from "#app/shared/services/downloads";
import { dailyTotals, episodeTotals, lastDays, niceMax, sumLast } from "./stats";

function row(episodeId: string, showId: string, day: string, count: number): DownloadDay {
  return { id: `${episodeId}-${day}`, userId: "u", showId, episodeId, day, count };
}

test("dashboard stats", () => {
  let days = lastDays("2026-03-02", 3);
  let rows = [
    row("e1", "s1", "2026-02-28", 5),
    row("e1", "s1", "2026-03-02", 2),
    row("e2", "s2", "2026-03-02", 7),
    row("e2", "s2", "2026-01-01", 99),
  ];

  test("lastDays crosses a month end", () => {
    equal(days, ["2026-02-28", "2026-03-01", "2026-03-02"]);
  });

  test("dailyTotals fills empty days and filters by show", () => {
    equal(dailyTotals(rows, days).map((t) => t.count), [5, 0, 9]);
    equal(dailyTotals(rows, days, "s2").map((t) => t.count), [0, 0, 7]);
    equal(sumLast(dailyTotals(rows, days), 2), 9);
  });

  test("episodeTotals ignores days outside the window", () => {
    let totals = episodeTotals(rows, days);
    equal(totals.get("e1"), { today: 2, week: 7, month: 7 });
    equal(totals.get("e2"), { today: 7, week: 7, month: 7 });
  });

  test("niceMax rounds up", () => {
    equal(niceMax(0), 10);
    equal(niceMax(412), 500);
    equal(niceMax(1017), 2000);
    equal(niceMax(180), 200);
  });
});
