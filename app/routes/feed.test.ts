import { test, assert, equal } from "@elements/app";
import { findShowById, listPublishedEpisodes } from "#app/shared/services/podcasts";
import { makeEpisode, makeShow, makeUser } from "#app/shared/services/fixtures";
import { renderFeed } from "./feed";

test("renderFeed", () => {
  let user = makeUser("feed@example.com");
  let showId = makeShow(user.id, "feed-show", "Salt & Smoke");
  let published = makeEpisode(showId, 1);
  makeEpisode(showId, 2, new Date(Date.now() + 86400000));

  let show = findShowById(showId);
  let episodes = listPublishedEpisodes(showId);
  let xml = renderFeed("https://loom.example", show, episodes, "feed@example.com");

  test("leaves scheduled episodes out", () => {
    equal(episodes.length, 1);
    equal((xml.match(/<item>/g) ?? []).length, 1);
  });

  test("escapes the title", () => {
    assert(xml.includes("<title>Salt &amp; Smoke</title>"), xml.slice(0, 400));
  });

  test("has what Apple and Spotify require", () => {
    assert(xml.includes('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"'));
    assert(xml.includes('<atom:link href="https://loom.example/shows/feed-show/feed.xml" rel="self"'));
    assert(xml.includes('<itunes:category text="Arts"><itunes:category text="Food"/></itunes:category>'));
    assert(xml.includes("<itunes:email>feed@example.com</itunes:email>"));
    assert(/<itunes:image href="https:\/\/loom\.example\/covers\/[^"]+\.jpg"\/>/.test(xml));
    assert(xml.includes("<itunes:explicit>false</itunes:explicit>"));
  });

  test("gives each item an enclosure with length and type", () => {
    assert(xml.includes(`<guid isPermaLink="false">${published}</guid>`));
    assert(xml.includes(`<enclosure url="https://loom.example/audio/${published}/feed-show-1.mp3" length="6" type="audio/mpeg"/>`), xml);
    assert(xml.includes("<itunes:duration>125</itunes:duration>"));
    assert(xml.includes("<![CDATA[<p><strong>bold</strong> notes</p>"));
  });
});
