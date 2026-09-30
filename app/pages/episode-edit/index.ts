import { Request, Response, NotFoundError, redirect, session, sql } from "@elements/app";
import { Episode, findEpisodeById, findShowById } from "#app/shared/services/podcasts";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  let episode: Episode | null = req.params.id ? findEpisodeById(String(req.params.id)) : null;
  let show = findShowById(episode ? episode.showId : String(req.params.showId));

  if (show.userId !== session.getOrThrow("userId")) {
    throw new NotFoundError("show not found");
  }

  let next = sql<{ n: number }>(`select coalesce(max(number), 0) + 1 as n from episodes where showId = ${show.id}`).firstOrThrow().n;

  return new html({ show, episode, nextNumber: next });
}
