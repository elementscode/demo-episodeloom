import { Request, Response } from "@elements/app";
import { findShowBySlug, listPublishedEpisodes } from "#app/shared/services/podcasts";
import { originOf } from "#app/routes/feed";
import html from "./template";

export default function route(req: Request, res: Response) {
  let show = findShowBySlug(String(req.params.slug));

  return new html({
    show,
    episodes: listPublishedEpisodes(show.id),
    origin: originOf(req),
  });
}
