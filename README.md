![Podcast hosting with an RSS feed, built by Claude Code on Elements: the public page for The Slow Kitchen, with its cover art, subscribe links, RSS feed url and the episode list.](https://elements.dev/demos/01a0f402-15b7-7df5-9113-ec79d4c3f787/poster?v=173588b542a3)

# Podcast hosting with an RSS feed, built by Claude Code on Elements

> Episodeloom is a full-stack app built with Claude Code on Elements.

Shows with cover art, episodes with audio and markdown notes, an RSS feed for podcast apps, public player pages, and live download counts.

[Run this app on your machine](https://elements.dev/demos/01a0f402-15b7-7df5-9113-ec79d4c3f787). Use this demo as inspiration, or as the starting point for your own app. Your agent creates a new app with this one as the scaffold, and you prompt it to add whatever features you want.

## How it's built

Episodeloom needed podcaster accounts, cover and audio uploads, an RSS feed per show, download counting from the audio url, and a dashboard that counts as people listen. Each of those is a part of Elements, so the agent spent its 21 minutes on podcasting itself.

- **Live download counts.** Downloads per episode per day are a LiveTable, one view per podcaster. The audio url records each download in plain SQL and a database trigger broadcasts it, so the dashboard's numbers rise as people listen.

- **Audio that counts listens.** The audio url answers the range requests podcast apps make and counts each listener once per episode per day, however many pieces of the file their app asks for.

- **Cover and audio uploads.** The show and episode editors send cover art and audio as file fields to `@rpc` functions, which store them for the public pages and the feed.

- **An RSS feed per show.** One route builds each show's feed with the tags podcast directories read. An episode scheduled for later joins the feed and the show page when its time comes.

- **Sessions.** Podcasters sign up and sign in, and each editor checks that the show belongs to the signed-in podcaster.

- **Data from SQL files.** Migrations define the schema and seed two podcasters, two shows with cover art, six short spoken episodes each, scheduled episodes and a month of download counts. The project server applied each one as soon as it was saved.

## Why Elements

Elements is an integrated full-stack app framework and a project server. The project server checks the agent's work as it builds: it type-checks the server and browser code, analyzes the program, applies migrations and runs the tests, then reports the results to the agent. A security mistake, such as calling a server-only function from the browser, is a compile error. The agent reads the report and fixes its own mistakes before it tells you a feature is done. The same checks run on every feature you ask for next.
