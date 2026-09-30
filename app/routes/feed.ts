import { Request, Response, sql } from "@elements/app";
import {
  Episode,
  Show,
  audioUrl,
  coverUrl,
  episodeUrl,
  feedUrl,
  findShowBySlug,
  listPublishedEpisodes,
  notesSummary,
  showUrl,
} from "#app/shared/services/podcasts";
import { renderNotes } from "#app/shared/services/markdown";

function xml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(text: string): string {
  return `<![CDATA[${text.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

/** The absolute origin the request came in on, so feed urls work anywhere. */
export function originOf(req: Request): string {
  let proto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim() || "http";
  let host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost");

  return `${proto}://${host}`;
}

function categoryXml(category: string): string {
  let [parent, child] = category.split(" > ");

  if (!child) {
    return `<itunes:category text="${xml(parent)}"/>`;
  }

  return `<itunes:category text="${xml(parent)}"><itunes:category text="${xml(child)}"/></itunes:category>`;
}

function itemXml(origin: string, show: Show, episode: Episode, image: string): string {
  let notes = renderNotes(episode.notes);
  let link = origin + episodeUrl(show, episode);

  return `
    <item>
      <title>${xml(episode.title)}</title>
      <itunes:title>${xml(episode.title)}</itunes:title>
      <itunes:episode>${episode.number}</itunes:episode>
      <itunes:episodeType>full</itunes:episodeType>
      <guid isPermaLink="false">${episode.id}</guid>
      <link>${xml(link)}</link>
      <pubDate>${new Date(episode.publishAt).toUTCString()}</pubDate>
      <description>${cdata(notes)}</description>
      <content:encoded>${cdata(notes)}</content:encoded>
      <itunes:summary>${xml(notesSummary(episode.notes, 3900))}</itunes:summary>
      <enclosure url="${xml(origin + audioUrl(show, episode))}" length="${episode.audioSize}" type="${xml(episode.audioType)}"/>
      <itunes:duration>${episode.durationSeconds}</itunes:duration>
      <itunes:explicit>${show.explicit ? "true" : "false"}</itunes:explicit>${image ? `
      <itunes:image href="${xml(image)}"/>` : ""}
    </item>`;
}

export function renderFeed(origin: string, show: Show, episodes: Episode[], ownerEmail: string): string {
  let link = origin + showUrl(show);
  let self = origin + feedUrl(show);
  let image = coverUrl(show) ? origin + coverUrl(show) : "";
  let built = episodes.length ? new Date(episodes[0].publishAt) : new Date(show.updatedAt);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(show.title)}</title>
    <link>${xml(link)}</link>
    <atom:link href="${xml(self)}" rel="self" type="application/rss+xml"/>
    <language>${xml(show.language)}</language>
    <copyright>${xml(`© ${new Date().getFullYear()} ${show.author}`)}</copyright>
    <description>${cdata(show.description)}</description>
    <itunes:summary>${xml(show.description)}</itunes:summary>
    <itunes:author>${xml(show.author)}</itunes:author>
    <itunes:owner>
      <itunes:name>${xml(show.author)}</itunes:name>
      <itunes:email>${xml(ownerEmail)}</itunes:email>
    </itunes:owner>${image ? `
    <itunes:image href="${xml(image)}"/>
    <image>
      <url>${xml(image)}</url>
      <title>${xml(show.title)}</title>
      <link>${xml(link)}</link>
    </image>` : ""}
    ${categoryXml(show.category)}
    <itunes:explicit>${show.explicit ? "true" : "false"}</itunes:explicit>
    <itunes:type>episodic</itunes:type>
    <lastBuildDate>${built.toUTCString()}</lastBuildDate>
    <generator>episodeloom</generator>${episodes.map((e) => itemXml(origin, show, e, image)).join("")}
  </channel>
</rss>
`;
}

/** The public RSS feed podcast apps subscribe to. */
export default function serveFeed(req: Request, res: Response) {
  let show = findShowBySlug(String(req.params.slug));
  let episodes = listPublishedEpisodes(show.id);
  let owner = sql<{ email: string }>(`select email from users where id = ${show.userId}`).firstOrThrow();

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.end(renderFeed(originOf(req), show, episodes, owner.email));
}
