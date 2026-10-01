![Episodeloom, a podcast hosting app built with Elements: the public page for The Slow Kitchen, with its cover art, subscribe links, RSS feed url and the episode list.](https://elements.dev/demos/01a0f402-15b7-7df5-9113-ec79d4c3f787/poster?v=173588b542a3)

# Episodeloom

> A demo app built with [Elements](https://elements.dev).

Shows with cover art, episodes with audio and markdown notes, an RSS feed for podcast apps, public player pages, and live download counts.

**Demo:** [Episodeloom](https://elements.dev/demos/01a0f402-15b7-7df5-9113-ec79d4c3f787)

## Agent specs

What one run of the prompt below took, from an empty Elements project to this
app.

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 21 min
- **Cost:** $6.77 at API rates, September 2026

## Get started

```bash
elements create episodeloom -scaffold=elementscode/demo-episodeloom
```

## How it's built

Episodeloom needed podcaster accounts, cover and audio uploads, an RSS feed per show, download counting from the audio url, and a dashboard that counts as people listen. Each of those is a part of Elements, so the agent spent its 21 minutes on podcasting itself.

### What Elements gave the app

- **Live download counts.** `downloadDays` is a LiveTable in `app/shared/services/downloads.ts`, partitioned by podcaster. The audio route writes counts in plain SQL, and a trigger in the schema migration notifies the table's pinned channel, so the dashboard's numbers rise as listeners download.
- **Audio served by one route.** `app/routes/audio.ts` answers range requests the way podcast apps expect, and `recordDownload` counts each listener once per episode per day, however many ranges their app asks for.
- **File uploads as form fields.** `saveEpisode` in `app/pages/episode-edit/services.ts` takes the audio as a `File`, and the show editor takes the cover the same way. Both are stored in the database and served from their own routes.
- **A feed in one route.** `app/routes/feed.ts` builds each show's RSS at `/shows/:slug/feed.xml`, with the tags podcast directories read. An episode with a future `publishAt` joins the feed and the show page when its time comes.
- **Sessions.** `app/shared/services/auth.ts` holds sign up and sign in as `@rpc` functions, and each editor checks that the show belongs to the signed-in podcaster.
- **Data from SQL files.** Three migrations define the schema and seed two podcasters, two shows with cover art, six short spoken episodes each, scheduled episodes, and a month of download counts. The project server applied each one as soon as it was saved.

### What the project server gave the agent

The project server runs alongside the agent and answers as soon as a file is saved: it type-checks the templates, TypeScript and SQL, applies migrations and reruns the tests, so every question came back right away and the agent kept building.

### What shipped

The app type-checks with zero errors and all 41 tests pass. Every page was checked on desktop and phone before publishing, both feeds parse as valid XML, and a play in the browser showed up on the open dashboard live.

Start in `app/routes/audio.ts`.

## Seed data and demo accounts

The seed creates two podcasters, each with one show. Both shows have cover art
the app drew, six short published episodes with spoken audio and markdown show
notes, one episode scheduled for later in the week, and a month of daily
download counts. Both passwords are `podcast123`, and the sign-in page lists
the accounts.

| Email                | Show             |
| -------------------- | ---------------- |
| maya@episodeloom.dev | The Slow Kitchen |
| theo@episodeloom.dev | Signal & Noise   |

Public pages need no account:

- `/` lists the shows.
- `/shows/<slug>` is a show page with subscribe links and the episode list.
- `/shows/<slug>/<number>` is an episode page with a player and show notes.
- `/shows/<slug>/feed.xml` is the RSS feed, with the iTunes tags podcast
  directories require.

Audio is stored in Postgres, which suits short episodes. Podcast directories
want the feed and audio on HTTPS, so a real show needs a domain with HTTPS.

## The prompt

```text
Build a podcast hosting app named episodeloom.

PODCASTER (accounts)
- Create a show: title, description, cover art, category, author.
- Publish episodes: title, show notes (markdown), audio file upload, episode
  number, publish now or scheduled.
- Each show has a public RSS feed that podcast apps can subscribe to, valid
  for Apple Podcasts and Spotify.
- Downloads per episode per day, counted from the audio url.

LISTENER (public)
- A show page with cover, description, subscribe links and the episode list.
- An episode page with a player and show notes.

Seed two podcasters, two shows with cover art and six short episodes each, and
a month of download counts. Show the seeded logins on the sign-in page.

Download counts update on the dashboard in real time.
```

## License

MIT. See [LICENSE](LICENSE).
