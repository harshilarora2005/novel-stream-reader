import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Trash2,
  Loader2,
  CheckCircle2,
  Circle,
  ChevronUp,
  ChevronDown,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getBook,
  updateBookMeta,
  updateChapterMeta,
  deleteChapter,
  deleteBook,
  getBookForExport,
  addChapterUrl,
  fetchMoreChapters,
  moveChapter,
} from "@/lib/books.functions";
import { exportEpub, exportMarkdown, exportPdf, exportText } from "@/lib/export";
import { supabase } from "@/integrations/supabase/client";
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
  ssr: false,
  component: BookDetail,
});

function BookDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busyExport, setBusyExport] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const fetchBook = useServerFn(getBook);
  const saveMeta = useServerFn(updateBookMeta);
  const saveChapter = useServerFn(updateChapterMeta);
  const dropChapter = useServerFn(deleteChapter);
  const dropBook = useServerFn(deleteBook);
  const fetchExport = useServerFn(getBookForExport);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/", replace: true });
      else setReady(true);
    });
  }, [navigate]);

  const q = useQuery({
    queryKey: ["book", slug],
    queryFn: () => fetchBook({ data: { slug } }),
    enabled: ready,
  });

  const metaMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => saveMeta({ data: { slug, patch } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["books"] });
    },
  });

  const chapterMutation = useMutation({
    mutationFn: (v: { id: string; title?: string; read?: boolean }) => saveChapter({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["book", slug] }),
  });

  const removeChapterMutation = useMutation({
    mutationFn: (id: string) => dropChapter({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["book", slug] }),
  });

  const removeBookMutation = useMutation({
    mutationFn: () => dropBook({ data: { slug } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["books"] });
      navigate({ to: "/library" });
    },
  });

  async function runExport(kind: "EPUB" | "PDF" | "Markdown" | "Text") {
    setBusyExport(kind);
    try {
      const { book: b, chapters: cs } = await fetchExport({ data: { slug } });
      const payload = { ...b, cover_url: b.cover_url };
      if (kind === "EPUB") await exportEpub(payload, cs);
      if (kind === "Markdown") exportMarkdown(payload, cs);
      if (kind === "Text") exportText(payload, cs);
      if (kind === "PDF") exportPdf(payload, cs);
    } finally {
      setBusyExport(null);
    }
  }

  if (!ready || q.isLoading) return <main className="min-h-screen bg-paper" />;

  const data = q.data;
  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper text-center font-body text-ink">
        <div>
          <p className="font-display text-2xl">That book isn't on your shelf</p>
          <Link to="/library" className="mt-4 inline-block text-sm text-ink-soft underline">
            Back to library
          </Link>
        </div>
      </main>
    );
  }

  const { book, chapters } = data;
  const totalWords = chapters.reduce((a, c) => a + c.words, 0);

  return (
    <main className="min-h-screen bg-paper font-body text-ink">
      <div className="mx-auto max-w-[960px] px-5 py-8 sm:px-6 sm:py-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Link
            to="/library"
            className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-tint"
          >
            ← Library
          </Link>
          <ThemeToggle />
        </div>

        <div className="mt-6 flex items-baseline justify-between border-t border-line pt-5">
          <h1 className="label text-tint">Book detail</h1>
          <span className="font-mono text-[10px] text-ink-soft">
            {totalWords.toLocaleString()} words
          </span>
        </div>

        <div className="mt-5 grid gap-8 sm:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="flex gap-4">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={`Cover of ${book.title}`}
                  className="size-24 shrink-0 rounded-lg object-cover sm:size-28"
                />
              ) : (
                <CoverPlate className="size-24 shrink-0 rounded-lg sm:size-28" />
              )}
              <div className="min-w-0">
                <input
                  defaultValue={book.title}
                  onBlur={(e) => metaMutation.mutate({ title: e.target.value })}
                  className="w-full border-b border-transparent bg-transparent pb-1 font-display text-2xl outline-none focus:border-inkline"
                />
                <input
                  defaultValue={book.author}
                  onBlur={(e) => metaMutation.mutate({ author: e.target.value })}
                  className="mt-1 w-full border-b border-transparent bg-transparent text-sm text-ink-soft outline-none focus:border-inkline"
                />
                <p className="mt-3 truncate font-mono text-[10px] text-inkline">
                  {book.source_url}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="font-mono text-[10px] tracking-[0.2em] text-tint">SERIES</span>
                <input
                  defaultValue={book.series ?? ""}
                  onBlur={(e) => metaMutation.mutate({ series: e.target.value || null })}
                  placeholder="—"
                  className="mt-1 w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-inkline"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] tracking-[0.2em] text-tint">VOLUME</span>
                <input
                  defaultValue={book.volume ?? ""}
                  onBlur={(e) => metaMutation.mutate({ volume: e.target.value || null })}
                  placeholder="—"
                  className="mt-1 w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-inkline"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="font-mono text-[10px] tracking-[0.2em] text-tint">COVER LINK</span>
                <input
                  defaultValue={book.cover_url ?? ""}
                  onBlur={(e) => metaMutation.mutate({ cover_url: e.target.value || null })}
                  placeholder="https://…"
                  className="mt-1 w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-inkline"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="font-mono text-[10px] tracking-[0.2em] text-tint">TAGS</span>
                <input
                  defaultValue={book.tags.join(", ")}
                  onBlur={(e) =>
                    metaMutation.mutate({
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="fantasy, ongoing"
                  className="mt-1 w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-inkline"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() =>
                  metaMutation.mutate({
                    title: book.scraped_title ?? book.title,
                    author: book.scraped_author ?? book.author,
                    cover_url: book.scraped_cover_url,
                  })
                }
                className="rounded-lg border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft hover:border-inkline hover:text-ink"
              >
                Revert to scraped
              </button>
              <button
                onClick={() => {
                  if (confirm === "book") removeBookMutation.mutate();
                  else setConfirm("book");
                }}
                className="rounded-lg border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-destructive hover:bg-destructive/10"
              >
                {confirm === "book" ? "Tap again to delete book" : "Delete book"}
              </button>
            </div>

            <div className="mt-5 border-t border-line pt-4">
              <p className="font-mono text-[10px] tracking-[0.2em] text-tint">EXPORT</p>
              <div className="mt-2 flex flex-wrap gap-2 font-mono text-[10px]">
                {(["EPUB", "PDF", "Markdown", "Text"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => void runExport(f)}
                    disabled={busyExport !== null}
                    className="flex items-center gap-1.5 rounded border border-line px-2.5 py-1.5 text-ink-soft transition-colors hover:border-inkline hover:text-ink disabled:opacity-50"
                  >
                    {busyExport === f && <Loader2 className="size-3 animate-spin" />}
                    {f}
                  </button>
                ))}
              </div>
              <p className="mt-2 font-mono text-[10px] text-ink-soft">
                EPUB works on older Kindles once converted to MOBI. Exports use your edited title,
                author and cover.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-paper-deep/30 p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <p className="font-mono text-[10px] tracking-[0.2em] text-tint">CHAPTERS</p>
              <span className="font-mono text-[10px] text-ink-soft">{chapters.length}</span>
            </div>
            <div className="max-h-[60vh] divide-y divide-line overflow-y-auto text-sm">
              {chapters.map((c) => (
                <div
                  key={c.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2.5"
                >
                  <input
                    defaultValue={c.title}
                    onBlur={(e) => chapterMutation.mutate({ id: c.id, title: e.target.value })}
                    className="min-w-0 truncate border-b border-transparent bg-transparent outline-none focus:border-inkline"
                  />
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => chapterMutation.mutate({ id: c.id, read: !c.read })}
                      aria-label={c.read ? `Mark ${c.title} unread` : `Mark ${c.title} read`}
                      title={c.read ? "Mark unread" : "Mark read"}
                      className={`rounded-md p-1 transition-colors hover:bg-paper-deep ${
                        c.read ? "text-pencil" : "text-ink-soft opacity-60 hover:opacity-100"
                      }`}
                    >
                      {c.read ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                    </button>
                    <span
                      className={`font-mono text-[10px] ${
                        c.flagged ? "text-destructive" : "text-ink-soft"
                      }`}
                    >
                      {c.flagged ? "check parse" : `${c.words.toLocaleString()}w`}
                    </span>
                    {confirm === c.id ? (
                      <span className="flex items-center gap-1.5 font-mono text-[10px]">
                        <button
                          onClick={() => {
                            removeChapterMutation.mutate(c.id);
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
                        onClick={() => setConfirm(c.id)}
                        aria-label={`Remove ${c.title}`}
                        className="rounded-md p-1 text-ink-soft transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {chapters.length === 0 && (
                <p className="py-6 text-center font-mono text-[10px] text-ink-soft">
                  No chapters left in this book.
                </p>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
              <span className="font-mono text-[10px] text-ink-soft">
                Rename inline · trash to remove
              </span>
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
