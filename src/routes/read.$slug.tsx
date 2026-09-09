import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, List, Settings, Download, ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { useBook, removeChapter } from "@/lib/store";
import { fontStack, useSettings } from "@/lib/settings";
import { ReaderSettings } from "@/components/ReaderSettings";

export const Route = createFileRoute("/read/$slug")({
  head: () => ({
    meta: [
      { title: "Reading — Marginal" },
      {
        name: "description",
        content:
          "A distraction-free reading view with light, sepia, dark and night themes, adjustable type, chapter list and saved place.",
      },
      { property: "og:title", content: "Reading — Marginal" },
      {
        property: "og:description",
        content: "Set like a paperback: adjustable type, four themes, saved place.",
      },
    ],
  }),
  component: Reader,
});

const sample = [
  "The harbour had emptied hours before she got there, and the piers were bare enough that her own footsteps came back to her off the water. She had walked two days without looking behind her once.",
  "The ferryman kept his ledger the way he kept the tides — quietly, and without asking anyone to confirm them. He took her name, wrote it small, and pushed off.",
  "Somewhere past the second buoy the mainland stopped being a place and became a pale line, and she could not say exactly when the change had happened, only that it had.",
  "She counted the lanterns on the far shore instead. Nine of them, then eight, then nine again, which meant either the wind or someone walking, and she decided she preferred not to know which.",
  "By morning the water had gone the colour of worn pewter and the island had arranged itself out of the fog, one roof at a time, as though it had been waiting to be asked.",
];

function Reader() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const book = useBook(slug);
  const s = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const chapters = book?.chapters ?? [];

  useEffect(() => {
    const i = chapters.findIndex((c) => c.status === "reading");
    if (i >= 0) setIndex(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (index > chapters.length - 1) setIndex(Math.max(0, chapters.length - 1));
  }, [chapters.length, index]);

  const chapter = chapters[Math.min(index, chapters.length - 1)];
  const progress = chapters.length ? ((index + 1) / chapters.length) * 100 : 0;
  const body = useMemo(() => sample, []);

  if (!book) throw notFound();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header
        className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto grid max-w-[1100px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:px-6">
          <div className="flex items-center gap-1">
            <Link
              to="/book/$slug"
              params={{ slug: book.slug }}
              aria-label="Back to book"
              className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-paper-deep hover:text-ink"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <button
              onClick={() => setTocOpen(true)}
              aria-label="Chapters"
              className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-paper-deep hover:text-ink"
            >
              <List className="size-5" />
            </button>
          </div>
          <p className="truncate text-center text-sm font-medium">{book.title}</p>
          <div className="flex items-center gap-1">
            <button
              aria-label="Export"
              className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-paper-deep hover:text-ink"
            >
              <Download className="size-5" />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Reader settings"
              className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-paper-deep hover:text-ink"
            >
              <Settings className="size-5" />
            </button>
          </div>
        </div>
        <div className="h-0.5 w-full bg-ink/10">
          <div className="h-full bg-pencil transition-all" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {chapter ? (
        <article className="mx-auto animate-fade px-5 pb-24 pt-12 sm:px-8">
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
            Chapter {index + 1} of {chapters.length}
          </p>
          <h1 className="mx-auto mt-3 max-w-[24ch] text-balance text-center font-display text-3xl leading-tight tracking-tight sm:text-4xl">
            {chapter.title}
          </h1>
          <div className="mx-auto mt-6 h-px w-12 bg-inkline" />

          <div
            className="mx-auto mt-10"
            style={{
              fontFamily: fontStack(s.font),
              fontSize: `${s.size}px`,
              lineHeight: s.leading,
              maxWidth: `${s.width}ch`,
            }}
          >
            {body.map((p, i) => (
              <p key={i} className="mb-6 text-pretty">
                {p}
              </p>
            ))}
          </div>

          <nav className="mx-auto mt-14 grid max-w-[720px] grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-line pt-6">
            <button
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              className="flex items-center gap-1.5 justify-self-start rounded-lg border border-line px-3 py-2 text-sm text-ink-soft transition-colors hover:border-inkline hover:text-ink disabled:opacity-30"
            >
              <ChevronLeft className="size-4" /> Previous
            </button>
            <span className="font-mono text-[10px] text-ink-soft">
              {index + 1} / {chapters.length}
            </span>
            <button
              disabled={index >= chapters.length - 1}
              onClick={() => setIndex((i) => Math.min(chapters.length - 1, i + 1))}
              className="flex items-center gap-1.5 justify-self-end rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:border-inkline disabled:opacity-30"
            >
              Next <ChevronRight className="size-4" />
            </button>
          </nav>
        </article>
      ) : (
        <div className="mx-auto max-w-[420px] px-6 py-24 text-center">
          <p className="font-display text-2xl">No chapters left</p>
          <p className="mt-2 text-sm text-ink-soft">
            Every chapter in this book has been removed.
          </p>
          <button
            onClick={() => navigate({ to: "/book/$slug", params: { slug: book.slug } })}
            className="mt-5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper"
          >
            Back to book
          </button>
        </div>
      )}

      {/* Chapter list */}
      <div
        onClick={() => setTocOpen(false)}
        className={`fixed inset-0 z-40 bg-ink/40 transition-opacity ${
          tocOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-full max-w-[340px] flex-col border-r border-line bg-paper transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          tocOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-5 py-4">
          <h2 className="truncate font-display text-xl">Chapters</h2>
          <button
            onClick={() => setTocOpen(false)}
            aria-label="Close chapters"
            className="shrink-0 text-ink-soft hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {chapters.map((c, i) => (
            <div
              key={c.n}
              className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-3 py-2.5 ${
                i === index ? "bg-pencil-soft/50" : "hover:bg-paper-deep"
              }`}
            >
              <button
                onClick={() => {
                  setIndex(i);
                  setTocOpen(false);
                  window.scrollTo({ top: 0 });
                }}
                className="min-w-0 text-left"
              >
                <span className="block truncate text-sm">{c.title}</span>
                <span className="font-mono text-[10px] text-ink-soft">
                  {String(c.n).padStart(2, "0")} · {c.words.toLocaleString()} words
                </span>
              </button>
              <button
                onClick={() => removeChapter(book.slug, c.n)}
                aria-label={`Remove ${c.title}`}
                className="shrink-0 rounded-md p-1.5 text-ink-soft opacity-60 transition-colors hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <ReaderSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
