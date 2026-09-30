import { test, assert, equal, NotFoundError } from "@elements/app";
import { findShowBySlug, listPublishedEpisodes } from "#app/shared/services/podcasts";
import { makeEpisode, makeShow, makeUser } from "#app/shared/services/fixtures";

test("show page", () => {
  let user = makeUser("show@example.com");
  let showId = makeShow(user.id, "public-show");
  makeEpisode(showId, 1, new Date(Date.now() - 2 * 86400000));
  makeEpisode(showId, 2, new Date(Date.now() - 86400000));
  makeEpisode(showId, 3, new Date(Date.now() + 86400000));

  test("lists published episodes newest first", () => {
    equal(listPublishedEpisodes(showId).map((e) => e.number), [2, 1]);
  });

  test("finds the show by slug and carries its cover hash", () => {
    let show = findShowBySlug("public-show");
    equal(show.id, showId);
    assert(!!show.coverHash);
  });

  test("an unknown slug is a 404", () => {
    let threw = false;

    try {
      findShowBySlug("nope");
    } catch (err) {
      threw = true;
      assert(err instanceof NotFoundError, `got ${err}`);
    }

    assert(threw);
  });
});
