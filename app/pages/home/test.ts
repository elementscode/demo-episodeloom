import { test, equal } from "@elements/app";
import { listPublicShows } from "#app/shared/services/podcasts";
import { makeEpisode, makeShow, makeUser } from "#app/shared/services/fixtures";

test("home lists shows with a published episode", () => {
  let user = makeUser("home@example.com");
  let live = makeShow(user.id, "live-show", "Live Show");
  let soon = makeShow(user.id, "soon-show", "Soon Show");
  makeShow(user.id, "empty-show", "Empty Show");
  makeEpisode(live, 1);
  makeEpisode(soon, 1, new Date(Date.now() + 86400000));

  equal(listPublicShows().map((s) => s.slug), ["live-show"]);
});
