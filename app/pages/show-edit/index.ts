import { Request, Response, NotFoundError, redirect, session, sql } from "@elements/app";
import { Show, findShowById } from "#app/shared/services/podcasts";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  let show: Show | null = null;

  if (req.params.id) {
    show = findShowById(String(req.params.id));

    if (show.userId !== session.getOrThrow("userId")) {
      throw new NotFoundError("show not found");
    }
  }

  let me = sql<{ name: string }>(`select name from users where id = ${session.getOrThrow("userId")}`).firstOrThrow();

  return new html({ show, defaultAuthor: me.name });
}
