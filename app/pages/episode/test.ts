import { test, assert, equal, NotFoundError } from "@elements/app";
import { audioUrl, findPublishedEpisode, findShowById } from "#app/shared/services/podcasts";
import { makeEpisode, makeShow, makeUser } from "#app/shared/services/fixtures";

test("episode page", () => {
  let user = makeUser("episode@example.com");
  let showId = makeShow(user.id, "ep-show");
  let live = makeEpisode(showId, 1);
  makeEpisode(showId, 2, new Date(Date.now() + 86400000));

  test("a published episode is found by number", () => {
    let episode = findPublishedEpisode(showId, 1);
    equal(episode.id, live);
    equal(audioUrl(findShowById(showId), episode), `/audio/${live}/ep-show-1.mp3`);
  });

  test("a scheduled one is a 404 until it goes live", () => {
    let threw = false;

    try {
      findPublishedEpisode(showId, 2);
    } catch (err) {
      threw = true;
      assert(err instanceof NotFoundError, `got ${err}`);
    }

    assert(threw);
  });
});
