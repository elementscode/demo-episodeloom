import { sql } from "@elements/app";

/**
 * Rows for tests. Each test runs in a transaction, so nothing here lasts.
 * Emails are unique and test files run at once, so the address gets a random
 * suffix (owner@example.com becomes owner.1a2b3c4d@example.com).
 */
export function makeUser(email: string, name: string = "Test Host"): { id: string; name: string; email: string } {
  let [local, domain] = email.split("@");
  let unique = `${local}.${crypto.randomUUID().slice(0, 8)}@${domain}`;

  return sql<{ id: string; name: string; email: string }>(`
    insert into users (email, name, passwordHash)
         values (${unique}, ${name}, crypt('password123', genSalt('bf', 4)))
    returning id, name, email
  `).firstOrThrow();
}

export function makeFile(name: string, contentType: string, bytes: number[] = [1, 2, 3, 4]): string {
  let data = Buffer.from(bytes);

  return sql<{ id: string }>(`
    insert into files (name, contentType, size, data)
         values (${name}, ${contentType}, ${data.length}, ${data})
    returning id
  `).firstOrThrow().id;
}

export function makeShow(userId: string, slug: string, title: string = "Test Show"): string {
  let cover = makeFile(`${slug}.jpg`, "image/jpeg");

  return sql<{ id: string }>(`
    insert into shows (userId, slug, title, description, author, category, coverFileId)
         values (${userId}, ${slug}, ${title}, 'A show for tests.', 'Test Host', 'Arts > Food', ${cover})
    returning id
  `).firstOrThrow().id;
}

export function makeEpisode(showId: string, number: number, publishAt: Date = new Date(Date.now() - 60000)): string {
  let audio = makeFile(`episode-${number}.mp3`, "audio/mpeg", [9, 9, 9, 9, 9, 9]);

  return sql<{ id: string }>(`
    insert into episodes (showId, number, title, notes, audioFileId, durationSeconds, publishAt)
         values (${showId}, ${number}, ${"Episode " + number}, '**bold** notes', ${audio}, 125, ${publishAt})
    returning id
  `).firstOrThrow().id;
}
