import { Request, Response, redirect, session, sql } from "@elements/app";
import { listAllEpisodes, listShowsForUser } from "#app/shared/services/podcasts";
import { downloadDays } from "#app/shared/services/downloads";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  let userId = session.getOrThrow("userId");
  let shows = listShowsForUser(userId);
  let today = sql<{ today: string }>(`select to_char(current_date, 'YYYY-MM-DD') as today`).firstOrThrow().today;

  return new html({
    shows,
    episodes: shows.flatMap((show) => listAllEpisodes(show.id)),
    downloads: downloadDays.view({ userId }),
    today,
  });
}
