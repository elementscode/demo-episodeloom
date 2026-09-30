import { Request, Response } from "@elements/app";
import {
  findPublishedEpisode,
  findShowBySlug,
  listPublishedEpisodes,
} from "#app/shared/services/podcasts";
import { renderNotes } from "#app/shared/services/markdown";
import html from "./template";

export default function route(req: Request, res: Response) {
  let show = findShowBySlug(String(req.params.slug));
  let episode = findPublishedEpisode(show.id, Number(req.params.number));
  let numbers = listPublishedEpisodes(show.id).map((e) => e.number);

  return new html({
    show,
    episode,
    notesHtml: renderNotes(episode.notes),
    previous: Math.max(...numbers.filter((n) => n < episode.number), 0),
    next: Math.min(...numbers.filter((n) => n > episode.number), Infinity),
  });
}
