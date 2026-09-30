import { test, assert, equal } from "@elements/app";
import { Show, formatDuration, notesSummary, subscribeLinks } from "./podcasts";
import { renderNotes } from "./markdown";
import { imageSize } from "./images";

test("formatDuration", () => {
  equal(formatDuration(9), "0:09");
  equal(formatDuration(125), "2:05");
  equal(formatDuration(3725), "1:02:05");
});

test("notesSummary strips markdown", () => {
  equal(notesSummary("## Steps\n\n1. **Brown** hard\n- a lacto-fermented [pickle](https://x.test)"), "Steps: Brown hard. A lacto-fermented pickle.");
  equal(notesSummary("abcdefghij", 5), "Abcd…");
});

test("renderNotes shows raw html as text", () => {
  let html = renderNotes("hi <script>alert(1)</script>");
  assert(!html.includes("<script>"), html);
  assert(html.includes("&lt;script&gt;"), html);
});

test("subscribeLinks", () => {
  let show = { slug: "demo", applePodcastsUrl: "", spotifyUrl: "" } as Show;

  test("falls back to the podcast: scheme without a directory link", () => {
    let links = subscribeLinks("https://loom.example", show);
    equal(links[0].href, "podcast://loom.example/shows/demo/feed.xml");
    equal(links.some((l) => l.id === "spotify"), false);
  });

  test("uses the directory links once set", () => {
    let links = subscribeLinks("https://loom.example", { ...show, applePodcastsUrl: "https://podcasts.apple.com/x", spotifyUrl: "https://open.spotify.com/show/y" });
    equal(links[0].href, "https://podcasts.apple.com/x");
    equal(links[1].href, "https://open.spotify.com/show/y");
  });
});

test("imageSize reads a png header", () => {
  let png = new Uint8Array(32);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  new DataView(png.buffer).setUint32(16, 1400);
  new DataView(png.buffer).setUint32(20, 1400);

  equal(imageSize(png), { width: 1400, height: 1400 });
  equal(imageSize(new Uint8Array([1, 2, 3])), null);
});
