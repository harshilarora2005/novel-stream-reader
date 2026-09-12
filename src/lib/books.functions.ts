import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BookRow = {
  id: string;
  slug: string;
  title: string;
  author: string;
  cover_url: string | null;
  scraped_title: string | null;
  scraped_author: string | null;
  scraped_cover_url: string | null;
  series: string | null;
  volume: string | null;
  tags: string[];
  source_url: string;
  mode: string;
  next_url: string | null;
  updating: boolean;
  current_chapter: number;
  progress: number;
  scroll_pos: number;
  last_read_at: string | null;
};

export type ChapterRow = {
  id: string;
  n: number;
  title: string;
  words: number;
  url: string | null;
  flagged: boolean;
  read: boolean;
};

const prefsSchema = z.object({
  theme: z.string().optional(),
  autoNight: z.boolean().optional(),
  font: z.string().optional(),
  size: z.number().optional(),
  leading: z.number().optional(),
  width: z.number().optional(),
});

export type PrefsData = z.infer<typeof prefsSchema>;

const DELAY_MS = 450;

export const listBooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("books")
      .select("*")
      .order("last_read_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as BookRow[];
  });

export const getBook = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: book } = await context.supabase
      .from("books")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!book) return null;
    const { data: chapters } = await context.supabase
      .from("chapters")
      .select("id,n,title,words,url,flagged,read")
      .eq("book_id", book.id)
      .order("n");
    return {
      book: book as unknown as BookRow,
      chapters: (chapters ?? []) as unknown as ChapterRow[],
    };
  });

export const getChapter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bookId: string; n: number }) =>
    z.object({ bookId: z.string(), n: z.number() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("chapters")
      .select("id,n,title,content,words,flagged,url")
      .eq("book_id", data.bookId)
      .eq("n", data.n)
      .maybeSingle();
    return row ?? null;
  });

export const importUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { url: string }) => z.object({ url: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const {
      fetchPage,
      extractFromHtml,
      findChapterLinks,
      findNextLink,
      pageMeta,
      slugify,
      sleep,
    } = await import("./extract.server");

    const first = await fetchPage(data.url);
    const meta = pageMeta(first.html, first.finalUrl);
    const links = findChapterLinks(first.html, first.finalUrl);
    const selfExtract = extractFromHtml(first.html, first.finalUrl);
    // A table of contents has many chapter links and little prose of its own.
    const density = links.length ? selfExtract.words / links.length : Infinity;
    const isIndex = links.length >= 5 && density < 250;

    const targets: { url: string; title?: string }[] = [];
    let mode: "index" | "chapter" = "chapter";

    if (isIndex) {
      mode = "index";
      for (const l of links) targets.push(l);
    } else {
      targets.push({ url: first.finalUrl });
    }

    type Extracted = Awaited<ReturnType<typeof extractFromHtml>>;
    const collected: Extracted[] = [];
    let nextUrl: string | null = null;

    if (mode === "index") {
      collected.push(
        ...(await (async () => {
          const out: Extracted[] = [];
          for (const [i, t] of targets.entries()) {
            try {
              const page = i === 0 && t.url === first.finalUrl ? first : await fetchPage(t.url);
              const ex = extractFromHtml(page.html, t.url);
              if (t.title && t.title.length > 2) ex.title = t.title;
              if (ex.words > 60) out.push(ex);
            } catch {
              /* skip unreachable chapter */
            }
            await sleep(DELAY_MS);
          }
          return out;
        })()),
      );
    } else {
      collected.push(selfExtract);
      let cursor = findNextLink(first.html, first.finalUrl);
      const seen = new Set([first.finalUrl]);
      while (cursor && !seen.has(cursor)) {
        seen.add(cursor);
        await sleep(DELAY_MS);
        try {
          const page = await fetchPage(cursor);
          const ex = extractFromHtml(page.html, cursor);
          if (ex.words > 60) collected.push(ex);
          cursor = findNextLink(page.html, page.finalUrl);
        } catch {
          break;
        }
      }
      nextUrl = cursor;
    }

    if (collected.length === 0) {
      throw new Error("Nothing readable was found on that page.");
    }

    const bookTitle = (
      mode === "index" ? meta.title : meta.title.replace(/\s*[-–—|]\s*chapter.*$/i, "")
    ).trim();

    let slug = slugify(bookTitle);
    const { data: existing } = await context.supabase
      .from("books")
      .select("slug")
      .like("slug", `${slug}%`);
    if ((existing ?? []).some((b: { slug: string }) => b.slug === slug)) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const { data: inserted, error: insErr } = await context.supabase
      .from("books")
      .insert({
        user_id: context.userId,
        slug,
        title: bookTitle || "Untitled",
        author: meta.author,
        cover_url: meta.cover || null,
        scraped_title: bookTitle || "Untitled",
        scraped_author: meta.author,
        scraped_cover_url: meta.cover || null,
        source_url: first.finalUrl,
        mode,
        next_url: nextUrl,
        updating: mode === "chapter" && Boolean(nextUrl),
      })
      .select("id,slug")
      .single();
    if (insErr || !inserted) throw new Error(insErr?.message ?? "Could not save that book.");

    const rows = collected.map((c, i) => ({
      book_id: inserted.id,
      user_id: context.userId,
      n: i + 1,
      title: c.title || `Chapter ${i + 1}`,
      content: c.paragraphs.join("\n\n"),
      words: c.words,
      url: c.url,
      flagged: c.flagged,
    }));
    const { error: chErr } = await context.supabase.from("chapters").insert(rows);
    if (chErr) throw new Error(chErr.message);

    return { slug: inserted.slug, chapters: rows.length, mode };
  });

/** Append one chapter from a single chapter link. */
export const addChapterUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; url: string }) =>
    z.object({ slug: z.string(), url: z.string().url() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { fetchPage, extractFromHtml, findNextLink } = await import("./extract.server");

    const { data: book } = await context.supabase
      .from("books")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!book) throw new Error("Book not found.");

    const { data: existing } = await context.supabase
      .from("chapters")
      .select("n,url")
      .eq("book_id", book.id)
      .order("n", { ascending: false });
    const rows = existing ?? [];
    if (rows.some((c: { url: string | null }) => c.url === data.url)) {
      throw new Error("That chapter is already in this book.");
    }

    const page = await fetchPage(data.url);
    const ex = extractFromHtml(page.html, page.finalUrl);
    if (ex.words < 60) throw new Error("Nothing readable was found on that page.");

    const n = (rows[0]?.n ?? 0) + 1;
    const { error } = await context.supabase.from("chapters").insert({
      book_id: book.id,
      user_id: context.userId,
      n,
      title: ex.title || `Chapter ${n}`,
      content: ex.paragraphs.join("\n\n"),
      words: ex.words,
      url: page.finalUrl,
      flagged: ex.flagged,
    });
    if (error) throw new Error(error.message);

    const next = findNextLink(page.html, page.finalUrl);
    await context.supabase
      .from("books")
      .update({ next_url: next, updating: Boolean(next) } as never)
      .eq("id", book.id);

    return { added: 1, title: ex.title, next: Boolean(next) };
  });

/** Follow the stored "next chapter" link to pull in newly published chapters. */
export const fetchMoreChapters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; limit?: number }) =>
    z.object({ slug: z.string(), limit: z.number().min(1).max(50).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { fetchPage, extractFromHtml, findNextLink, sleep } = await import("./extract.server");

    const { data: book } = await context.supabase
      .from("books")
      .select("id,next_url")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!book) throw new Error("Book not found.");
    if (!book.next_url) return { added: 0, next: false };

    const { data: existing } = await context.supabase
      .from("chapters")
      .select("n,url")
      .eq("book_id", book.id)
      .order("n", { ascending: false });
    const rows = existing ?? [];
    const seen = new Set(
      rows.map((c: { url: string | null }) => c.url).filter(Boolean) as string[],
    );
    let n = (rows[0]?.n ?? 0) + 1;

    let cursor: string | null = book.next_url;
    let added = 0;
    const limit = data.limit ?? 25;

    while (cursor && !seen.has(cursor) && added < limit) {
      seen.add(cursor);
      try {
        const page = await fetchPage(cursor);
        const ex = extractFromHtml(page.html, page.finalUrl);
        if (ex.words > 60) {
          const { error } = await context.supabase.from("chapters").insert({
            book_id: book.id,
            user_id: context.userId,
            n,
            title: ex.title || `Chapter ${n}`,
            content: ex.paragraphs.join("\n\n"),
            words: ex.words,
            url: page.finalUrl,
            flagged: ex.flagged,
          });
          if (error) throw new Error(error.message);
          n += 1;
          added += 1;
        }
        cursor = findNextLink(page.html, page.finalUrl);
      } catch {
        break;
      }
      await sleep(DELAY_MS);
    }

    await context.supabase
      .from("books")
      .update({ next_url: cursor, updating: Boolean(cursor) } as never)
      .eq("id", book.id);

    return { added, next: Boolean(cursor) };
  });

/** Swap a chapter with its neighbour, keeping the unique ordering intact. */
export const moveChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; direction: "up" | "down" }) =>
    z.object({ id: z.string(), direction: z.enum(["up", "down"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: chapter } = await context.supabase
      .from("chapters")
      .select("id,book_id,n")
      .eq("id", data.id)
      .maybeSingle();
    if (!chapter) throw new Error("Chapter not found.");

    const up = data.direction === "up";
    const { data: neighbours } = await context.supabase
      .from("chapters")
      .select("id,n")
      .eq("book_id", chapter.book_id)
      [up ? "lt" : "gt"]("n", chapter.n)
      .order("n", { ascending: !up })
      .limit(1);
    const other = (neighbours ?? [])[0];
    if (!other) return { ok: true, moved: false };

    // Park one row on a free negative slot so the (book_id, n) pair stays unique.
    await context.supabase.from("chapters").update({ n: -1 } as never).eq("id", chapter.id);
    await context.supabase.from("chapters").update({ n: chapter.n } as never).eq("id", other.id);
    await context.supabase.from("chapters").update({ n: other.n } as never).eq("id", chapter.id);
    return { ok: true, moved: true };
  });

export const updateBookMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; patch: Record<string, unknown> }) =>
    z
      .object({
        slug: z.string(),
        patch: z.object({
          title: z.string().optional(),
          author: z.string().optional(),
          cover_url: z.string().nullable().optional(),
          series: z.string().nullable().optional(),
          volume: z.string().nullable().optional(),
          tags: z.array(z.string()).optional(),
          current_chapter: z.number().optional(),
          progress: z.number().optional(),
          scroll_pos: z.number().optional(),
          last_read_at: z.string().nullable().optional(),
        }),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("books")
      .update({ ...data.patch, updated_at: new Date().toISOString() } as never)
      .eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("books").delete().eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateChapterMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; title?: string; read?: boolean }) =>
    z.object({ id: z.string(), title: z.string().optional(), read: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch['title'] = data.title;
    if (data.read !== undefined) patch['read'] = data.read;
    const { error } = await context.supabase
      .from("chapters")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("chapters").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getBookForExport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: book } = await context.supabase
      .from("books")
      .select("id,title,author,cover_url,slug")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!book) throw new Error("Book not found.");
    const { data: chapters } = await context.supabase
      .from("chapters")
      .select("n,title,content")
      .eq("book_id", book.id)
      .order("n");
    return { book, chapters: chapters ?? [] };
  });

export const getPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("reader_prefs")
      .select("data")
      .eq("user_id", context.userId)
      .maybeSingle();
    return (data?.data ?? null) as PrefsData | null;
  });

export const savePrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { data: PrefsData }) => z.object({ data: prefsSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reader_prefs")
      .upsert({
        user_id: context.userId,
        data: data.data as never,
        updated_at: new Date().toISOString(),
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
