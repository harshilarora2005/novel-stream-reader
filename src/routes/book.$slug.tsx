import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getBook, books } from "@/lib/library";
import { CoverPlate } from "@/components/CoverPlate";

export const Route = createFileRoute("/book/$slug")({
  head: () => ({
    meta: [
      { title: "Book details — Marginal" },
      {
        name: "description",
        content:
          "Edit title, author and cover, rename chapters, subscribe for new chapters, and export to EPUB, PDF or Markdown.",
      },
      { property: "og:title", content: "Book details — Marginal" },
      {
        property: "og:description",
        content: "Your metadata, your chapter names, your exports.",
      },
    ],
  }),
  component: BookDetail,
});

function BookDetail() {
  const { slug } = Route.useParams();
  const book = getBook(slug) ?? books[0];
  if (!book) throw notFound();

  return (
    <main className="min-h-screen bg-paper font-body text-ink">
      <div className="mx-auto max-w-[960px] px-6 py-10">
        <Link to="/" className="font-mono text-[10px] uppercase tracking-[0.2em] text-tint">
          ← Library
        </Link>

        <div className="mt-6 flex items-baseline justify-between border-t border-line pt-5">
          <h1 className="label text-tint">Book detail</h1>
          <span className="font-mono text-[10px] text-ink-soft">editing</span>
        </div>

        <div className="mt-5 grid gap-8 sm:grid-cols-[1fr_1.1fr]">
          <div className="flex gap-4">
            <CoverPlate className="size-28 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <input
                defaultValue={book.title}
                className="w-full border-b border-transparent bg-transparent pb-1 font-display text-2xl outline-none focus:border-inkline"
              />
              <input
                defaultValue={book.author}
                className="mt-1 w-full border-b border-transparent bg-transparent text-sm text-ink-soft outline-none focus:border-inkline"
              />
              <p className="mt-3 font-mono text-[10px] text-ink-soft">
                {book.series ? `Series · ${book.series} · ${book.volume ?? ""}` : "No series"}
              </p>
              <p className="mt-1 font-mono text-[10px] text-inkline">{book.source}</p>
              <button className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-tint underline underline-offset-4">
                Revert to scraped
              </button>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-line py-1 pl-3 pr-1">
                <span className="font-mono text-[10px] text-ink-soft">
                  {book.updating ? "updating" : "complete"}
                </span>
                <span className="relative h-4 w-8 rounded-full bg-pencil">
                  <span className="absolute right-0.5 top-0.5 size-3 animate-pulse-soft rounded-full bg-paper" />
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 font-mono text-[10px]">
                {["EPUB", "PDF", "Markdown", "MOBI"].map((f) => (
                  <span key={f} className="rounded border border-line px-2 py-1 text-ink-soft">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-paper-deep/30 p-4">
            <p className="mb-3 font-mono text-[10px] tracking-[0.2em] text-tint">CHAPTERS</p>
            <div className="divide-y divide-line text-sm">
              {book.chapters.map((c) => (
                <div key={c.n} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate">
                    {String(c.n).padStart(2, "0")} · {c.title}
                  </span>
                  <span
                    className={`shrink-0 font-mono text-[10px] ${
                      c.status === "reading"
                        ? "text-tint"
                        : c.status === "flagged"
                          ? "text-destructive"
                          : "text-ink-soft"
                    }`}
                  >
                    {c.status === "flagged" ? "check parse" : c.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <span className="font-mono text-[10px] text-ink-soft">Rename any chapter inline</span>
              <Link
                to="/read/$slug"
                params={{ slug: book.slug }}
                className="rounded-lg bg-ink px-4 py-2 text-xs font-medium text-paper transition-colors hover:bg-ink/80"
              >
                Resume
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
