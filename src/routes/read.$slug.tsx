import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  List,
  Settings,
  Search,
  Volume2,
  Square,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
} from "lucide-react";
import {
  getBook,
  getChapter,
  deleteChapter,
  updateBookMeta,
  updateChapterMeta,
} from "@/lib/books.functions";
import { supabase } from "@/integrations/supabase/client";
import { fontStack, useSettings } from "@/lib/settings";
import { ReaderSettings } from "@/components/ReaderSettings";

export const Route = createFileRoute("/read/$slug")({
  head: () => ({
    meta: [
      { title: "Reading — Marginal" },
      {
        name: "description",
        content:
          "A distraction-free reading view with light, sepia, dark and night themes, adjustable type, chapter list, in-book search, read aloud and saved place.",
      },
      { property: "og:title", content: "Reading — Marginal" },
      {
        property: "og:description",
        content: "Set like a paperback: adjustable type, four themes, saved place.",
      },
    ],
  }),
  ssr: false,
  component: Reader,
});

function Reader() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const s = useSettings();
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const started = useRef(false);

  const fetchBook = useServerFn(getBook);
  const fetchChapter = useServerFn(getChapter);
  const dropChapter = useServerFn(deleteChapter);
  const saveMeta = useServerFn(updateBookMeta);
  const markChapter = useServerFn(updateChapterMeta);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/", replace: true });
      else setReady(true);
    });
  }, [navigate]);

  const bookQuery = useQuery({
    queryKey: ["book", slug],
    queryFn: () => fetchBook({ data: { slug } }),
    enabled: ready,
  });

  const book = bookQuery.data?.book;
  const chapters = useMemo(() => bookQuery.data?.chapters ?? [], [bookQuery.data]);

  // Resume where the reader left off, once.
  useEffect(() => {
    if (!book || started.current || chapters.length === 0) return;
    started.current = true;
    const i = chapters.findIndex((c) => c.n === book.current_chapter);
    setIndex(i >= 0 ? i : 0);
  }, [book, chapters]);

  const current = chapters[Math.min(index, chapters.length - 1)];

  const chapterQuery = useQuery({
    queryKey: ["chapter", book?.id, current?.n],
    queryFn: () => fetchChapter({ data: { bookId: book!.id, n: current!.n } }),
    enabled: Boolean(book && current),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // Warm the neighbouring chapters so turning the page is instant.
  useEffect(() => {
    if (!book || chapters.length === 0) return;
    const neighbours = [chapters[index + 1], chapters[index - 1]].filter(Boolean);
    for (const c of neighbours) {
      void qc.prefetchQuery({
        queryKey: ["chapter", book.id, c!.n],
        queryFn: () => fetchChapter({ data: { bookId: book.id, n: c!.n } }),
        staleTime: 30 * 60 * 1000,
      });
    }
  }, [book, chapters, index, qc, fetchChapter]);

  const paragraphs = useMemo(
    () =>
      (chapterQuery.data?.content ?? "")
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean),
    [chapterQuery.data],
  );

  // Save reading position — forward only, so re-reading an earlier chapter
  // never moves your saved place backwards. The ref tracks the furthest
  // chapter reached this session, since the cached book row can be stale.
  const furthest = useRef(0);
  useEffect(() => {
    if (book) furthest.current = Math.max(furthest.current, book.current_chapter);
  }, [book]);
  useEffect(() => {
    if (!book || !current) return;
    const t = setTimeout(() => {
      void markChapter({ data: { id: current.id, read: true } }).catch(() => {});
      if (current.n < furthest.current) return;
      furthest.current = current.n;
      const pct = chapters.length ? Math.round(((index + 1) / chapters.length) * 100) : 0;
      void saveMeta({
        data: {
          slug,
          patch: {
            current_chapter: current.n,
            progress: Math.max(pct, book.progress),
            last_read_at: new Date().toISOString(),
          },
        },
      })
        .then(() => qc.invalidateQueries({ queryKey: ["books"] }))
        .catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [book, current, index, chapters.length, slug, saveMeta, markChapter, qc]);

  // Stop speech whenever the chapter changes or the view unmounts.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  function toggleSpeech() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(paragraphs.join("\n\n"));
    utter.onend = () => setSpeaking(false);
    utter.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  }

  function go(next: number) {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setIndex(next);
    window.scrollTo({ top: 0 });
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return chapters.filter((c) => c.title.toLowerCase().includes(q)).slice(0, 30);
  }, [query, chapters]);

  // Swipe between chapters on touch devices.
  const touchX = useRef(0);

  if (!ready || bookQuery.isLoading) return <div className="min-h-screen bg-paper" />;

  if (!book) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper text-center text-ink">
        <div>
          <p className="font-display text-2xl">That book isn't on your shelf</p>
          <Link to="/library" className="mt-4 inline-block text-sm text-ink-soft underline">
            Back to library
          </Link>
        </div>
      </div>
    );
  }

  const progress = chapters.length ? ((index + 1) / chapters.length) * 100 : 0;

  return (
    <div
      className="min-h-screen bg-paper text-ink"
      onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? 0)}
      onTouchEnd={(e) => {
        const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
        if (Math.abs(dx) < 70) return;
        if (dx < 0 && index < chapters.length - 1) go(index + 1);
        if (dx > 0 && index > 0) go(index - 1);
      }}
    >
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
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search in book"
              className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-paper-deep hover:text-ink"
            >
              <Search className="size-5" />
            </button>
            <button
              onClick={toggleSpeech}
              aria-label={speaking ? "Stop reading aloud" : "Read aloud"}
              className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-paper-deep hover:text-ink"
            >
              {speaking ? <Square className="size-4" /> : <Volume2 className="size-5" />}
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
        {searchOpen && (
          <div className="mx-auto max-w-[1100px] px-3 pb-3 sm:px-6">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chapter titles…"
              className="w-full rounded-lg border border-line bg-paper-deep px-3 py-2 text-sm outline-none"
            />
            {matches.length > 0 && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-line">
                {matches.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      go(chapters.findIndex((c) => c.id === m.id));
                      setSearchOpen(false);
                    }}
                    className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-paper-deep"
                  >
                    {m.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="h-0.5 w-full bg-ink/10">
          <div className="h-full bg-pencil transition-all" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {current ? (
        <article className="mx-auto animate-fade px-5 pb-24 pt-12 sm:px-8">
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
            Chapter {index + 1} of {chapters.length}
          </p>
          <h1 className="mx-auto mt-3 max-w-[24ch] text-balance text-center font-display text-3xl leading-tight tracking-tight sm:text-4xl">
            {current.title}
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
            {chapterQuery.isLoading ? (
              <p className="text-center font-mono text-[11px] text-ink-soft">Opening chapter…</p>
            ) : paragraphs.length === 0 ? (
              <p className="text-center font-mono text-[11px] text-destructive">
                This chapter came back empty — the source page may have blocked the reader.
              </p>
            ) : (
              paragraphs.map((p, i) => (
                <p key={i} className="mb-6 text-pretty">
                  {p}
                </p>
              ))
            )}
          </div>

          <nav className="mx-auto mt-14 grid max-w-[720px] grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-line pt-6">
            <button
              disabled={index === 0}
              onClick={() => go(index - 1)}
              className="flex items-center gap-1.5 justify-self-start rounded-lg border border-line px-3 py-2 text-sm text-ink-soft transition-colors hover:border-inkline hover:text-ink disabled:opacity-30"
            >
              <ChevronLeft className="size-4" /> Previous
            </button>
            <span className="font-mono text-[10px] text-ink-soft">
              {index + 1} / {chapters.length}
            </span>
            <button
              disabled={index >= chapters.length - 1}
              onClick={() => go(index + 1)}
              className="flex items-center gap-1.5 justify-self-end rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:border-inkline disabled:opacity-30"
            >
              Next <ChevronRight className="size-4" />
            </button>
          </nav>
        </article>
      ) : (
        <div className="mx-auto max-w-[420px] px-6 py-24 text-center">
          <p className="font-display text-2xl">No chapters left</p>
          <p className="mt-2 text-sm text-ink-soft">Every chapter in this book has been removed.</p>
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
              key={c.id}
              className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-3 py-2.5 ${
                i === index ? "bg-pencil-soft/50" : "hover:bg-paper-deep"
              }`}
            >
              <button
                onClick={() => {
                  go(i);
                  setTocOpen(false);
                }}
                className="min-w-0 text-left"
              >
                <span className="block truncate text-sm">{c.title}</span>
                <span className="font-mono text-[10px] text-ink-soft">
                  {String(c.n).padStart(2, "0")} · {c.words.toLocaleString()} words
                  {c.flagged ? " · check parse" : ""}
                </span>
              </button>
              <button
                onClick={async () => {
                  await dropChapter({ data: { id: c.id } });
                  await qc.invalidateQueries({ queryKey: ["book", slug] });
                }}
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
