import { File, ForbiddenError, ValidationError, session, sql, tx } from "@elements/app";

export interface EpisodeForm {
  title: string;
  number: number;
  notes: string;
  publishAt: Date;
  durationSeconds: number;
  audio?: File;
}

export const AUDIO_TYPES = new Set(["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/aac"]);
export const MAX_AUDIO_MB = 40;

export function validateEpisode(form: EpisodeForm, creating: boolean): Record<string, string[]> {
  let errors: Record<string, string[]> = {};

  if (!form.title.trim()) {
    errors.title = ["Give the episode a title."];
  }

  if (!Number.isInteger(form.number) || form.number < 1) {
    errors.number = ["Episode numbers start at 1."];
  }

  if (!(form.publishAt instanceof Date) || isNaN(form.publishAt.getTime())) {
    errors.publishAt = ["Pick a date and time."];
  }

  if (form.audio) {
    if (!AUDIO_TYPES.has(form.audio.contentType)) {
      errors.audio = ["Upload an MP3 or M4A file."];
    } else if (form.audio.size > MAX_AUDIO_MB * 1024 * 1024) {
      errors.audio = [`Audio files can be up to ${MAX_AUDIO_MB} MB.`];
    }
  } else if (creating) {
    errors.audio = ["Add the episode's audio."];
  }

  return errors;
}

function ownerOf(showId: string): boolean {
  return !sql(`select 1 from shows where id = ${showId} and userId = ${session.getOrThrow("userId")}`).empty();
}

/**
 * Creates an episode on `showId` when `episodeId` is empty, otherwise updates
 * it. A publishAt in the future schedules it: the feed and show page leave it
 * out until then.
 * @rpc
 */
export function saveEpisode(showId: string, episodeId: string, form: EpisodeForm): string {
  session.isLoggedInOrThrow();

  if (episodeId) {
    showId = sql<{ showId: string }>(`select showId from episodes where id = ${episodeId}`).firstOrThrow("episode not found").showId;
  }

  if (!ownerOf(showId)) {
    throw new ForbiddenError("that show is not yours");
  }

  let errors = validateEpisode(form, !episodeId);

  let clash = !sql(`
    select 1 from episodes
     where showId = ${showId} and number = ${form.number} and id is distinct from ${episodeId || null}::uuid
  `).empty();

  if (clash) {
    errors.number = [`Episode ${form.number} already exists on this show.`];
  }

  if (Object.keys(errors).length) {
    throw new ValidationError(errors);
  }

  return tx(() => {
    let audioId: string | null = null;

    if (form.audio) {
      let type = form.audio.contentType === "audio/mp3" ? "audio/mpeg" : form.audio.contentType;

      audioId = sql<{ id: string }>(`
        insert into files (name, contentType, size, data)
             values (${form.audio.name}, ${type}, ${form.audio.size}, ${form.audio.data})
        returning id
      `).firstOrThrow().id;
    }

    let duration = Math.max(0, Math.round(form.durationSeconds || 0));

    if (!episodeId) {
      return sql<{ id: string }>(`
        insert into episodes (showId, number, title, notes, audioFileId, durationSeconds, publishAt)
             values (${showId}, ${form.number}, ${form.title.trim()}, ${form.notes}, ${audioId}, ${duration}, ${form.publishAt})
        returning id
      `).firstOrThrow().id;
    }

    let old = sql<{ audioFileId: string }>(`select audioFileId from episodes where id = ${episodeId}`).firstOrThrow();

    sql(`
      update episodes
         set number = ${form.number},
             title = ${form.title.trim()},
             notes = ${form.notes},
             audioFileId = coalesce(${audioId}::uuid, audioFileId),
             durationSeconds = case when ${audioId}::uuid is null then durationSeconds else ${duration} end,
             publishAt = ${form.publishAt}
       where id = ${episodeId}
    `);

    if (audioId) {
      sql(`delete from files where id = ${old.audioFileId}`);
    }

    return episodeId;
  });
}

/** @rpc */
export function deleteEpisode(episodeId: string) {
  session.isLoggedInOrThrow();

  let episode = sql<{ showId: string }>(`select showId from episodes where id = ${episodeId}`).firstOrThrow("episode not found");

  if (!ownerOf(episode.showId)) {
    throw new ForbiddenError("that show is not yours");
  }

  tx(() => {
    let gone = sql<{ audioFileId: string }>(`delete from episodes where id = ${episodeId} returning audioFileId`).firstOrThrow();
    sql(`delete from files where id = ${gone.audioFileId}`);
  });
}
