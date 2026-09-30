import { File, ForbiddenError, ValidationError, session, sql, tx } from "@elements/app";
import { CATEGORIES } from "#app/shared/services/podcasts";
import { imageSize } from "#app/shared/services/images";

export interface ShowForm {
  title: string;
  description: string;
  author: string;
  category: string;
  language: string;
  explicit: boolean;
  applePodcastsUrl: string;
  spotifyUrl: string;
  cover?: File;
}

export const COVER_TYPES = new Set(["image/jpeg", "image/png"]);
export const MIN_COVER = 1400;
export const MAX_COVER = 3000;

export function slugify(title: string): string {
  let slug = title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return slug || "show";
}

function uniqueSlug(title: string): string {
  let base = slugify(title);
  let slug = base;

  for (let n = 2; !sql(`select 1 from shows where slug = ${slug}`).empty(); n++) {
    slug = `${base}-${n}`;
  }

  return slug;
}

/** Every rule a show must pass, as a message per field. */
export function validateShow(form: ShowForm, creating: boolean): Record<string, string[]> {
  let errors: Record<string, string[]> = {};

  if (!form.title.trim()) {
    errors.title = ["Give the show a title."];
  }

  if (!form.description.trim()) {
    errors.description = ["Describe the show in a sentence or two."];
  } else if (form.description.length > 4000) {
    errors.description = ["Keep the description under 4,000 characters."];
  }

  if (!form.author.trim()) {
    errors.author = ["Name the host or author."];
  }

  if (!CATEGORIES.includes(form.category)) {
    errors.category = ["Pick a category."];
  }

  for (let key of ["applePodcastsUrl", "spotifyUrl"] as const) {
    let url = form[key].trim();

    if (url && !/^https:\/\/\S+$/.test(url)) {
      errors[key] = ["Paste the full https:// link."];
    }
  }

  if (form.cover) {
    let size = imageSize(form.cover.data);

    if (!COVER_TYPES.has(form.cover.contentType)) {
      errors.cover = ["Cover art must be a JPEG or PNG."];
    } else if (!size || size.width !== size.height || size.width < MIN_COVER || size.width > MAX_COVER) {
      errors.cover = [`Cover art must be square, between ${MIN_COVER} and ${MAX_COVER} pixels.`];
    }
  } else if (creating) {
    errors.cover = ["Add cover art. Podcast apps require it."];
  }

  return errors;
}

function ownShowOrThrow(showId: string) {
  let owned = !sql(`select 1 from shows where id = ${showId} and userId = ${session.getOrThrow("userId")}`).empty();

  if (!owned) {
    throw new ForbiddenError("that show is not yours");
  }
}

/**
 * Creates a show when `showId` is empty, otherwise updates it. Returns the id.
 * @rpc
 */
export function saveShow(showId: string, form: ShowForm): string {
  session.isLoggedInOrThrow();

  let errors = validateShow(form, !showId);
  if (Object.keys(errors).length) {
    throw new ValidationError(errors);
  }

  if (showId) {
    ownShowOrThrow(showId);
  }

  return tx(() => {
    let coverId: string | null = null;

    if (form.cover) {
      coverId = sql<{ id: string }>(`
        insert into files (name, contentType, size, data)
             values (${form.cover.name}, ${form.cover.contentType}, ${form.cover.size}, ${form.cover.data})
        returning id
      `).firstOrThrow().id;
    }

    if (!showId) {
      return sql<{ id: string }>(`
        insert into shows (userId, slug, title, description, author, category, language, explicit,
                           coverFileId, applePodcastsUrl, spotifyUrl)
             values (${session.getOrThrow("userId")}, ${uniqueSlug(form.title)}, ${form.title.trim()},
                     ${form.description.trim()}, ${form.author.trim()}, ${form.category}, ${form.language || "en"},
                     ${form.explicit}, ${coverId}, ${form.applePodcastsUrl.trim()}, ${form.spotifyUrl.trim()})
        returning id
      `).firstOrThrow().id;
    }

    let old = sql<{ coverFileId: string | null }>(`select coverFileId from shows where id = ${showId}`).firstOrThrow();

    sql(`
      update shows
         set title = ${form.title.trim()},
             description = ${form.description.trim()},
             author = ${form.author.trim()},
             category = ${form.category},
             language = ${form.language || "en"},
             explicit = ${form.explicit},
             coverFileId = coalesce(${coverId}::uuid, coverFileId),
             applePodcastsUrl = ${form.applePodcastsUrl.trim()},
             spotifyUrl = ${form.spotifyUrl.trim()}
       where id = ${showId}
    `);

    if (coverId && old.coverFileId) {
      sql(`delete from files where id = ${old.coverFileId}`);
    }

    return showId;
  });
}
