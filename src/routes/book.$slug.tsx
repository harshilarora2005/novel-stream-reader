import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import { useBook, removeChapter, updateBook, updateChapter } from "@/lib/store";

import { CoverPlate } from "@/components/CoverPlate";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/book/$slug")({
  head: () => ({
    meta: [
      { title: "Book details — Marginal" },
      {
        name: "description",
        content:
          "Edit title, author and cover, rename or remove chapters, and export to EPUB, PDF or Markdown.",
      },
      { property: "og:title", content: "Book details — Marginal" },
      { property: "og:description", content: "Your metadata, your chapter list, your exports." },
    ],
  }),
  component: BookDetail,
});

function BookDetail() {
  const { slug } = Route.useParams();
  const book = useBook(slug);
  const scraped = getBook(slug);
  const [confirm, setConfirm] = useState<number | null>(null);

  if (!book) throw notFound();

  return (
    <main className="min-h-screen bg-paper font-body text-ink">
      <div className="mx-auto max-w-[960px] px-5 py-8 sm:px-6 sm:py-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Link
            to="/"
            className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-tint"
          >
            ← Library
          </Link>
          <ThemeToggle />
        </div>

        <div className="mt-6 flex items-baseline justify-between border-t border-line pt-5">
          <h1 className="label text-tint">Book detail</h1>
          <span className="font-mono text-[10px] text-ink-soft">editing</span>
        </div>

        <div className="mt-5 grid gap-8 sm:grid-cols-[1fr_1.1fr]">
          <div className="flex gap-4">
            <CoverPlate className="size-24 shrink-0 rounded-lg sm:size-28" />
            <div className="min-w-0">
              <input
                value={book.title}
                onChange={(e) => updateBook(slug, { title: e.target.value })}
                className="w-full border-b border-transparent bg-transparent pb-1 font-display text-2xl outline-none focus:border-inkline"
              />
              <input
                value={book.author}
                onChange={(e) => updateBook(slug, { author: e.target.value })}
                className="mt-1 w-full border-b border-transparent bg-transparent text-sm text-ink-soft outline-none focus:border-inkline"
              />
              <p className="mt-3 font-mono text-[10px] text-ink-soft">
                {book.series ? `Series · ${book.series} · ${book.volume ?? ""}` : "No series"}
              </p>
              <p className="mt-1 truncate font-mono text-[10px] text-inkline">{book.source}</p>
              {scraped && (
                <button
                  onClick={() =>
                    updateBook(slug, { title: scraped.title, author: scraped.author })
                  }
                  className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-tint"
                >
                  <Undo2 className="size-3.5" /> Revert to scraped
                </button>
              )}

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
            <div className="mb-3 flex items-baseline justify-between">
              <p className="font-mono text-[10px] tracking-[0.2em] text-tint">CHAPTERS</p>
              <span className="font-mono text-[10px] text-ink-soft">{book.chapters.length}</span>
            </div>
            <div className="divide-y divide-line text-sm">
              {book.chapters.map((c) => (
                <div
                  key={c.n}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2.5"
                >
                  <input
                    value={c.title}
                    onChange={(e) => updateChapter(slug, c.n, { title: e.target.value })}
                    className="min-w-0 truncate border-b border-transparent bg-transparent outline-none focus:border-inkline"
                  />
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`font-mono text-[10px] ${
                        c.status === "reading"
                          ? "text-tint"
                          : c.status === "flagged"
                            ? "text-destructive"
                            : "text-ink-soft"
                      }`}
                    >
                      {c.status === "flagged" ? "check parse" : c.status}
                    </span>
                    {confirm === c.n ? (
                      <span className="flex items-center gap-1.5 font-mono text-[10px]">
                        <button
                          onClick={() => {
                            removeChapter(slug, c.n);
                            setConfirm(null);
                          }}
                          className="rounded bg-destructive px-2 py-1 text-destructive-foreground"
                        >
                          remove
                        </button>
                        <button onClick={() => setConfirm(null)} className="text-ink-soft">
                          cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirm(c.n)}
                        aria-label={`Remove ${c.title}`}
                        className="rounded-md p-1 text-ink-soft transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {book.chapters.length === 0 && (
                <p className="py-6 text-center font-mono text-[10px] text-ink-soft">
                  No chapters left in this book.
                </p>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
              <span className="font-mono text-[10px] text-ink-soft">Rename inline · trash to remove</span>
              <Link
                to="/read/$slug"
                params={{ slug: book.slug }}
                className="shrink-0 rounded-lg bg-ink px-4 py-2 text-xs font-medium text-paper transition-colors hover:bg-ink/80"
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
