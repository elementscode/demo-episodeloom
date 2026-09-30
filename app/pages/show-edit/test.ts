import { test, assert, equal, session, sql, ForbiddenError, ValidationError } from "@elements/app";
import { makeShow, makeUser } from "#app/shared/services/fixtures";
import { ShowForm, saveShow, slugify, validateShow } from "./services";

function form(overrides: Partial<ShowForm> = {}): ShowForm {
  return {
    title: "Renamed",
    description: "New words.",
    author: "Maya",
    category: "Technology",
    language: "en",
    explicit: false,
    applePodcastsUrl: "",
    spotifyUrl: "",
    ...overrides,
  };
}

test("show editor", () => {
  let owner = makeUser("owner@example.com");
  let other = makeUser("other@example.com");
  let showId = makeShow(owner.id, "editable");

  test("slugify", () => {
    equal(slugify("Signal & Noise!"), "signal-and-noise");
    equal(slugify("???"), "show");
  });

  test("validateShow names each bad field", () => {
    let errors = validateShow(form({ title: " ", category: "Nope", spotifyUrl: "spotify.com/x" }), true);
    equal(Object.keys(errors).sort(), ["category", "cover", "spotifyUrl", "title"]);
  });

  test("the owner can save changes", () => {
    session.login({ userId: owner.id, userName: owner.name });
    saveShow(showId, form());

    let row = sql<{ title: string; category: string; coverFileId: string | null }>(`select title, category, coverFileId from shows where id = ${showId}`).firstOrThrow();
    equal(row.title, "Renamed");
    equal(row.category, "Technology");
    assert(row.coverFileId !== null, "the cover stays when none is uploaded");
  });

  test("someone else cannot", () => {
    session.login({ userId: other.id, userName: other.name });
    let threw = false;

    try {
      saveShow(showId, form());
    } catch (err) {
      threw = true;
      assert(err instanceof ForbiddenError, `got ${err}`);
    }

    assert(threw);
  });

  test("a new show needs cover art", () => {
    session.login({ userId: owner.id, userName: owner.name });
    let threw = false;

    try {
      saveShow("", form());
    } catch (err: any) {
      threw = true;
      assert(err instanceof ValidationError, `got ${err}`);
      assert(!!err.errors?.cover, JSON.stringify(err.errors));
    }

    assert(threw);
  });
});
