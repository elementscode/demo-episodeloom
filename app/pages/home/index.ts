import { Request, Response } from "@elements/app";
import { listPublicShows } from "#app/shared/services/podcasts";
import html from "./template";

export default function route(req: Request, res: Response) {
  return new html({ shows: listPublicShows() });
}
