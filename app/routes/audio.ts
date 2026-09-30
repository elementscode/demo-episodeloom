import { Request, Response, NotFoundError, session, sql } from "@elements/app";
import { isCountable, recordDownload } from "#app/shared/services/downloads";

interface AudioMeta {
  fileId: string;
  contentType: string;
  size: number;
  published: boolean;
  ownerId: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseRange(header: string | undefined, size: number): { start: number; end: number } | null | "invalid" {
  if (!header) {
    return null;
  }

  let match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) {
    return "invalid";
  }

  let start: number;
  let end: number;

  if (match[1] === "") {
    // A suffix range: the last N bytes.
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }

  if (start > end || start >= size) {
    return "invalid";
  }

  return { start, end };
}

function visitorKey(req: Request): string {
  let forwarded = String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim();
  let ip = forwarded || req.socket.remoteAddress || "";

  return `${ip}|${req.headers["user-agent"] ?? ""}`;
}

/**
 * The enclosure url podcast apps download from. It answers range requests,
 * which Apple Podcasts requires, and counts each listener once a day.
 */
export default function serveAudio(req: Request, res: Response) {
  let episodeId = String(req.params.id);

  if (!UUID.test(episodeId)) {
    throw new NotFoundError("episode not found");
  }

  let meta = sql<AudioMeta>(`
    select f.id as fileId, f.contentType, f.size, e.publishAt <= now() as published, s.userId as ownerId
      from episodes e
      join files f on f.id = e.audioFileId
      join shows s on s.id = e.showId
     where e.id = ${episodeId}
  `).first();

  let isOwner = !!meta && session.get("userId") === meta.ownerId;

  if (!meta || (!meta.published && !isOwner)) {
    throw new NotFoundError("episode not found");
  }

  let rangeHeader = req.headers.range;
  let range = parseRange(rangeHeader, meta.size);

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", meta.contentType);
  res.setHeader("Cache-Control", "private, max-age=3600");

  if (range === "invalid") {
    res.status(416);
    res.setHeader("Content-Range", `bytes */${meta.size}`);
    res.end();
    return;
  }

  let start = range ? range.start : 0;
  let end = range ? range.end : meta.size - 1;

  res.setHeader("Content-Length", String(end - start + 1));

  if (range) {
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${meta.size}`);
  }

  if (!isOwner && isCountable(req.method ?? "GET", rangeHeader)) {
    recordDownload(episodeId, visitorKey(req));
  }

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  let chunk = sql<{ data: Buffer }>(`
    select substring(data from ${start + 1} for ${end - start + 1}) as data
      from files
     where id = ${meta.fileId}
  `).firstOrThrow();

  res.end(chunk.data);
}
