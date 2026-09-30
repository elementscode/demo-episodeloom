import { Request, Response, NotFoundError, sql } from "@elements/app";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const YEAR = 31536000;

/** Cover art. The url carries the start of the hash, so it caches forever. */
export default function serveCover(req: Request, res: Response) {
  let id = String(req.params.id);
  let hash = String(req.params.file).replace(/\.jpg$/, "");

  if (!UUID.test(id)) {
    throw new NotFoundError("cover not found");
  }

  let file = sql<{ contentType: string; hash: string; data: Buffer }>(`
    select contentType, hash, data from files where id = ${id}
  `).first();

  if (!file || !file.hash.startsWith(hash) || hash.length < 16 || !IMAGE_TYPES.has(file.contentType)) {
    throw new NotFoundError("cover not found");
  }

  res.setHeader("Content-Type", file.contentType);
  res.setHeader("Cache-Control", `public, max-age=${YEAR}, immutable`);

  return file.data;
}
