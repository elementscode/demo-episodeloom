import { test, equal, session, sql } from "@elements/app";
import { downloadDays, isCountable, recordDownload } from "./downloads";
import { makeEpisode, makeShow, makeUser } from "./fixtures";

test("isCountable", () => {
  test("a whole-file GET counts", () => {
    equal(isCountable("GET", undefined), true);
  });

  test("a range from the first byte counts", () => {
    equal(isCountable("GET", "bytes=0-"), true);
    equal(isCountable("GET", "bytes=0-65535"), true);
  });

  test("a two-byte probe does not", () => {
    equal(isCountable("GET", "bytes=0-1"), false);
  });

  test("a later range and a HEAD do not", () => {
    equal(isCountable("GET", "bytes=5000-9999"), false);
    equal(isCountable("HEAD", undefined), false);
  });
});

test("recordDownload", () => {
  let owner = makeUser("owner@example.com");
  let show = makeShow(owner.id, "counted");
  let episode = makeEpisode(show, 1);

  function today(): number {
    return sql<{ count: number }>(`
      select coalesce(sum(count), 0)::int as count from downloadDays
       where episodeId = ${episode} and day = current_date
    `).firstOrThrow().count;
  }

  test("counts a visitor once a day", () => {
    equal(recordDownload(episode, "1.2.3.4|Podcasts/1"), true);
    equal(recordDownload(episode, "1.2.3.4|Podcasts/1"), false);
    equal(today(), 1);
  });

  test("counts each visitor", () => {
    recordDownload(episode, "1.2.3.4|Podcasts/1");
    recordDownload(episode, "5.6.7.8|Overcast/2");
    equal(today(), 2);
  });

  test("lands in the owner's live partition", () => {
    recordDownload(episode, "9.9.9.9|Spotify/1");
    session.login({ userId: owner.id, userName: owner.name });

    let rows = [...downloadDays.view({ userId: owner.id })];
    equal(rows.length, 1);
    equal(rows[0].episodeId, episode);
    equal(rows[0].count, 1);
    equal(rows[0].day.length, 10);
  });
});
