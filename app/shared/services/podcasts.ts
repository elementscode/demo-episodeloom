import { sql, NotFoundError } from "@elements/app";

export interface Show {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description: string;
  author: string;
  category: string;
  language: string;
  explicit: boolean;
  coverFileId: string | null;
  coverHash: string | null;
  applePodcastsUrl: string;
  spotifyUrl: string;
  updatedAt: Date;
}

export interface Episode {
  id: string;
  showId: string;
  number: number;
  title: string;
  notes: string;
  audioFileId: string;
  audioSize: number;
  audioType: string;
  durationSeconds: number;
  publishAt: Date;
}

/** Apple's category list. "Parent > Child" is a subcategory. */
export const CATEGORIES = [
  "Arts", "Arts > Books", "Arts > Design", "Arts > Food", "Arts > Performing Arts", "Arts > Visual Arts",
  "Business", "Business > Entrepreneurship", "Business > Investing", "Business > Management",
  "Comedy", "Comedy > Improv", "Comedy > Stand-Up",
  "Education", "Education > Language Learning", "Education > Self-Improvement",
  "Fiction", "Fiction > Drama", "Fiction > Science Fiction",
  "Health & Fitness", "Health & Fitness > Mental Health", "Health & Fitness > Nutrition",
  "History",
  "Kids & Family", "Kids & Family > Parenting",
  "Leisure", "Leisure > Crafts", "Leisure > Games", "Leisure > Hobbies",
  "Music", "Music > Music Commentary", "Music > Music Interviews",
  "News", "News > Business News", "News > Tech News",
  "Religion & Spirituality",
  "Science", "Science > Astronomy", "Science > Nature", "Science > Physics",
  "Society & Culture", "Society & Culture > Documentary", "Society & Culture > Personal Journals",
  "Sports", "Sports > Running", "Sports > Soccer",
  "Technology",
  "True Crime",
  "TV & Film", "TV & Film > Film Reviews",
];

const SHOW_COLUMNS = sql.raw(`
  s.id, s.userId, s.slug, s.title, s.description, s.author, s.category,
  s.language, s.explicit, s.coverFileId, f.hash as coverHash,
  s.applePodcastsUrl, s.spotifyUrl, s.updatedAt`);

const EPISODE_COLUMNS = sql.raw(`
  e.id, e.showId, e.number, e.title, e.notes, e.audioFileId,
  a.size as audioSize, a.contentType as audioType, e.durationSeconds, e.publishAt`);

export function coverUrl(show: { coverFileId: string | null; coverHash: string | null }): string {
  if (!show.coverFileId || !show.coverHash) {
    return "";
  }

  return `/covers/${show.coverFileId}/${show.coverHash.slice(0, 16)}.jpg`;
}

const AUDIO_EXTENSIONS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

export function audioExtension(contentType: string): string {
  return AUDIO_EXTENSIONS[contentType] ?? "mp3";
}

/** The enclosure url. Every request for it is counted as a download. */
export function audioUrl(show: { slug: string }, episode: Episode): string {
  return `/audio/${episode.id}/${show.slug}-${episode.number}.${audioExtension(episode.audioType)}`;
}

export function showUrl(show: { slug: string }): string {
  return `/shows/${show.slug}`;
}

export function episodeUrl(show: { slug: string }, episode: { number: number }): string {
  return `/shows/${show.slug}/${episode.number}`;
}

export function feedUrl(show: { slug: string }): string {
  return `/shows/${show.slug}/feed.xml`;
}

export function formatDuration(seconds: number): string {
  let h = Math.floor(seconds / 3600);
  let m = Math.floor((seconds % 3600) / 60);
  let s = seconds % 60;
  let mm = h ? String(m).padStart(2, "0") : String(m);

  return `${h ? h + ":" : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** Plain text for the feed summary and meta descriptions. */
export function notesSummary(markdown: string, length: number = 240): string {
  let lines = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .split("\n")
    .filter((line) => !/^[\s|:-]+$/.test(line))
    .map((line) => (/^\s*#+\s/.test(line) && !/[.!?:;]\s*$/.test(line) ? line.trimEnd() + ":" : line))
    .map((line) => line
      .replace(/^\s*(#+|>|[-*+]|\d+\.)\s+/, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_`]+/g, "")
      .replace(/^\s*\|\s*|\s*\|\s*$/g, "")
      .replace(/\s*\|\s*/g, ", ")
      .trim())
    .filter((line) => line);

  // Each line is its own sentence, so a list reads as one once flattened.
  let text = lines
    .map((line) => line.charAt(0).toUpperCase() + line.slice(1))
    .map((line) => (/[.!?:;…]$/.test(line) ? line : line + "."))
    .join(" ")
    .replace(/\s+/g, " ");

  return text.length > length ? text.slice(0, length - 1).trimEnd() + "…" : text;
}

export function isPublished(episode: { publishAt: Date }, now: Date = new Date()): boolean {
  return new Date(episode.publishAt).getTime() <= now.getTime();
}

export function listPublicShows(): Show[] {
  return sql<Show>(`
    select ${SHOW_COLUMNS}
      from shows s
      left join files f on f.id = s.coverFileId
     where exists (select 1 from episodes e where e.showId = s.id and e.publishAt <= now())
     order by s.title
  `).all();
}

export function findShowBySlug(slug: string): Show {
  let show = sql<Show>(`
    select ${SHOW_COLUMNS}
      from shows s
      left join files f on f.id = s.coverFileId
     where s.slug = ${slug}
  `).first();

  if (!show) {
    throw new NotFoundError(`no show at ${slug}`);
  }

  return show;
}

export function findShowById(id: string): Show {
  let show = sql<Show>(`
    select ${SHOW_COLUMNS}
      from shows s
      left join files f on f.id = s.coverFileId
     where s.id = ${id}
  `).first();

  if (!show) {
    throw new NotFoundError("show not found");
  }

  return show;
}

export function listShowsForUser(userId: string): Show[] {
  return sql<Show>(`
    select ${SHOW_COLUMNS}
      from shows s
      left join files f on f.id = s.coverFileId
     where s.userId = ${userId}
     order by s.createdAt
  `).all();
}

export function listPublishedEpisodes(showId: string): Episode[] {
  return sql<Episode>(`
    select ${EPISODE_COLUMNS}
      from episodes e
      join files a on a.id = e.audioFileId
     where e.showId = ${showId} and e.publishAt <= now()
     order by e.publishAt desc, e.number desc
  `).all();
}

export function listAllEpisodes(showId: string): Episode[] {
  return sql<Episode>(`
    select ${EPISODE_COLUMNS}
      from episodes e
      join files a on a.id = e.audioFileId
     where e.showId = ${showId}
     order by e.publishAt desc, e.number desc
  `).all();
}

export function findPublishedEpisode(showId: string, number: number): Episode {
  let episode = sql<Episode>(`
    select ${EPISODE_COLUMNS}
      from episodes e
      join files a on a.id = e.audioFileId
     where e.showId = ${showId} and e.number = ${number} and e.publishAt <= now()
  `).first();

  if (!episode) {
    throw new NotFoundError("episode not found");
  }

  return episode;
}

export function findEpisodeById(id: string): Episode {
  let episode = sql<Episode>(`
    select ${EPISODE_COLUMNS}
      from episodes e
      join files a on a.id = e.audioFileId
     where e.id = ${id}
  `).first();

  if (!episode) {
    throw new NotFoundError("episode not found");
  }

  return episode;
}

export interface SubscribeLink {
  id: string;
  label: string;
  href: string;
}

/**
 * Where a listener can follow the show. Apple Podcasts and Spotify use the
 * show's directory pages once the podcaster has them; until then Apple's
 * podcast: scheme subscribes straight from the feed.
 */
export function subscribeLinks(origin: string, show: Show): SubscribeLink[] {
  let feed = origin + feedUrl(show);
  let bare = feed.replace(/^https?:\/\//, "");
  let links: SubscribeLink[] = [
    { id: "apple", label: "Apple Podcasts", href: show.applePodcastsUrl || `podcast://${bare}` },
  ];

  if (show.spotifyUrl) {
    links.push({ id: "spotify", label: "Spotify", href: show.spotifyUrl });
  }

  links.push(
    { id: "overcast", label: "Overcast", href: `overcast://x-callback-url/add?url=${encodeURIComponent(feed)}` },
    { id: "pocketcasts", label: "Pocket Casts", href: `pktc://subscribe/${bare}` },
  );

  return links;
}
