import { test, assert, equal, session, sql, ForbiddenError, ValidationError } from "@elements/app";
import { listPublishedEpisodes } from "#app/shared/services/podcasts";
import { makeEpisode, makeShow, makeUser } from "#app/shared/services/fixtures";
import { EpisodeForm, deleteEpisode, saveEpisode } from "./services";

function form(overrides: Partial<EpisodeForm> = {}): EpisodeForm {
  return {
    title: "Edited",
    number: 1,
    notes: "notes",
    publishAt: new Date(Date.now() - 1000),
    durationSeconds: 0,
    ...overrides,
  };
}

test("episode editor", () => {
  let owner = makeUser("owner@example.com");
  let other = makeUser("other@example.com");
  let showId = makeShow(owner.id, "episodic");
  let first = makeEpisode(showId, 1);
  makeEpisode(showId, 2);

  test("scheduling takes an episode out of the feed until its time", () => {
    session.login({ userId: owner.id, userName: owner.name });
    saveEpisode(showId, first, form({ publishAt: new Date(Date.now() + 3 * 86400000) }));

    equal(listPublishedEpisodes(showId).map((e) => e.number), [2]);
  });

  test("an episode number is used once per show", () => {
    session.login({ userId: owner.id, userName: owner.name });
    let threw = false;

    try {
      saveEpisode(showId, first, form({ number: 2 }));
    } catch (err: any) {
      threw = true;
      assert(err instanceof ValidationError, `got ${err}`);
      assert(!!err.errors?.number, JSON.stringify(err.errors));
    }

    assert(threw);
  });

  test("a new episode needs audio", () => {
    session.login({ userId: owner.id, userName: owner.name });
    let threw = false;

    try {
      saveEpisode(showId, "", form({ number: 3 }));
    } catch (err: any) {
      threw = true;
      assert(!!err.errors?.audio, `got ${err}`);
    }

    assert(threw);
  });

  test("only the owner can edit or delete", () => {
    session.login({ userId: other.id, userName: other.name });
    let refused = 0;

    for (let attempt of [() => saveEpisode(showId, first, form()), () => deleteEpisode(first)]) {
      try {
        attempt();
      } catch (err) {
        assert(err instanceof ForbiddenError, `got ${err}`);
        refused++;
      }
    }

    equal(refused, 2);
  });

  test("deleting removes the episode and its audio", () => {
    session.login({ userId: owner.id, userName: owner.name });
    let audio = sql<{ audioFileId: string }>(`select audioFileId from episodes where id = ${first}`).firstOrThrow().audioFileId;

    deleteEpisode(first);

    equal(sql(`select 1 from episodes where id = ${first}`).empty(), true);
    equal(sql(`select 1 from files where id = ${audio}`).empty(), true);
  });
});
