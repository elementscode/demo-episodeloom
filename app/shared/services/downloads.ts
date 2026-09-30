import { LiveTable, ForbiddenError, sql, tx } from "@elements/app";

/** Downloads for one episode on one day. `day` is YYYY-MM-DD, the server's date. */
export interface DownloadDay {
  id: string;
  userId: string;
  showId: string;
  episodeId: string;
  day: string;
  count: number;
}

export const WINDOW_DAYS = 30;

// The audio route writes counts with plain sql, and a trigger on downloadDays
// notifies the table's channel, so each count reaches the owner's dashboard.
export let downloadDays: LiveTable<DownloadDay> = new LiveTable<DownloadDay>({
  select: ({ userId }) => sql<DownloadDay>(`
    select id, userId, showId, episodeId, to_char(day, 'YYYY-MM-DD') as day, count
      from downloadDays
     where userId = ${userId}
       and day > current_date - ${WINDOW_DAYS}::integer
  `),

  insert: () => {
    throw new ForbiddenError();
  },

  update: () => {
    throw new ForbiddenError();
  },

  delete: () => {
    throw new ForbiddenError();
  },
});

/**
 * Counts one download of an episode. A visitor is counted once per episode
 * per day, however many range requests their app makes for the file.
 * Returns whether this request was a new download.
 */
export function recordDownload(episodeId: string, visitor: string): boolean {
  return tx(() => {
    let hit = sql<{ id: string }>(`
      insert into downloadHits (episodeId, day, visitor)
           values (${episodeId}, current_date, encode(sha256(convert_to(${visitor}, 'UTF8')), 'hex'))
      on conflict do nothing
      returning id
    `).first();

    if (!hit) {
      return false;
    }

    sql(`
      insert into downloadDays (userId, showId, episodeId, day, count)
           select s.userId, s.id, e.id, current_date, 1
             from episodes e
             join shows s on s.id = e.showId
            where e.id = ${episodeId}
      on conflict (episodeId, day) do update set count = downloadDays.count + 1
    `);

    return true;
  });
}

/**
 * Whether a request for the audio is a listen worth counting. A request with
 * no range is a whole-file download. A range request counts only when it
 * starts at the first byte and asks for more than a probe: players fetch
 * `bytes=0-1` first to learn the length.
 */
export function isCountable(method: string, range: string | undefined): boolean {
  if (method !== "GET") {
    return false;
  }

  if (!range) {
    return true;
  }

  let match = /^bytes=(\d+)-(\d*)$/.exec(range.trim());
  if (!match || match[1] !== "0") {
    return false;
  }

  return match[2] === "" || Number(match[2]) >= 1024;
}
