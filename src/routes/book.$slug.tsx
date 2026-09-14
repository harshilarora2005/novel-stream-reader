import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  Download,
  GripVertical,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/book/$slug")({
  head: () => ({
    meta: [
      { title: "Manage your book — Marginal" },
      { name: "description", content: "Edit book details, organize chapters, and continue reading in Marginal." },
      { property: "og:title", content: "Manage your book — Marginal" },
      { property: "og:description", content: "A focused reading desk for your book and chapters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: BookDetail,
});

type DetailsDraft = {
  title: string;
  author: string;
  series: string;
  volume: string;
  cover: string;
  tags: string;
};

function BookDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busyExport, setBusyExport] = useState<string | null>(null);
  const [chapterUrl, setChapterUrl] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [draft, setDraft] = useState<DetailsDraft | null>(null);
  const [savedDraft, setSavedDraft] = useState<DetailsDraft | null>(null);

  const fetchBook = useServerFn(getBook);
  const saveMeta = useServerFn(updateBookMeta);
  const saveChapter = useServerFn(updateChapterMeta);
  const dropChapter = useServerFn(deleteChapter);
  const dropBook = useServerFn(deleteBook);
  const fetchExport = useServerFn(getBookForExport);
  const addChapter = useServerFn(addChapterUrl);
  const fetchMore = useServerFn(fetchMoreChapters);
  const shiftChapter = useServerFn(moveChapter);

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
    staleTime: 60_000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!q.data?.book) return;
    const b = q.data.book;
    const next = {
      title: b.title,
      author: b.author,
      series: b.series ?? "",
      volume: b.volume ?? "",
      cover: b.cover_url ?? "",
      tags: b.tags.join(", "),
    };
    setDraft(next);
    setSavedDraft(next);
  }, [q.dataUpdatedAt, slug]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["book", slug] });
  const detailsChanged = JSON.stringify(draft) !== JSON.stringify(savedDraft);

  const metaMutation = useMutation({
    mutationFn: (next: DetailsDraft) =>
      saveMeta({
        data: {
          slug,
          patch: {
            title: next.title.trim() || "Untitled",
            author: next.author.trim(),
            series: next.series.trim() || null,
            volume: next.volume.trim() || null,
            cover_url: next.cover.trim() || null,
            tags: next.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          },
        },
      }),
    onSuccess: async (_, next) => {
      setSavedDraft(next);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["book", slug] }),
        qc.invalidateQueries({ queryKey: ["books"] }),
      ]);
    },
  });

  const chapterMutation = useMutation({
    mutationFn: (v: { id: string; title?: string; read?: boolean }) => saveChapter({ data: v }),
    onSuccess: refresh,
  });
  const removeChapterMutation = useMutation({
    mutationFn: (id: string) => dropChapter({ data: { id } }),
    onSuccess: refresh,
  });
  const addChapterMutation = useMutation({
    mutationFn: (url: string) => addChapter({ data: { slug, url } }),
    onSuccess: async () => { setChapterUrl(""); await refresh(); },
  });
  const moreMutation = useMutation({
    mutationFn: () => fetchMore({ data: { slug } }),
    onSuccess: refresh,
  });
  const moveMutation = useMutation({
    mutationFn: (v: { id: string; target: number }) => shiftChapter({ data: v }),
    onSuccess: refresh,
  });
  const removeBookMutation = useMutation({
    mutationFn: () => dropBook({ data: { slug } }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["books"] }); navigate({ to: "/library" }); },
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
    } finally { setBusyExport(null); }
  }

  if (!ready || q.isLoading) return <main className="min-h-screen bg-paper" />;
  if (!q.data || !draft) return <main className="grid min-h-screen place-items-center bg-paper px-5 text-center"><div><p className="font-display text-2xl">That book isn't on your shelf</p><Link to="/library" className="mt-4 inline-block text-sm text-ink-soft underline">Back to library</Link></div></main>;

  const { book, chapters } = q.data;
  const totalWords = chapters.reduce((sum, chapter) => sum + chapter.words, 0);
  const progress = Math.max(0, Math.min(100, book.progress || 0));
  const readCount = chapters.filter((chapter) => chapter.read).length;
  const currentChapter = Math.min(Math.max(book.current_chapter || 1, 1), Math.max(chapters.length, 1));
  const filteredChapters = chapters.filter((chapter) => {
    const statusMatches = filter === "all" || (filter === "read" ? chapter.read : !chapter.read);
    return statusMatches && chapter.title.toLowerCase().includes(search.trim().toLowerCase());
  });

  const updateDraft = (key: keyof DetailsDraft, value: string) => setDraft((current) => current ? { ...current, [key]: value } : current);

  return (
    <main className="min-h-screen overflow-x-hidden bg-paper font-body text-ink lg:p-6">
      <div className="mx-auto min-h-screen w-full max-w-[1320px] overflow-hidden border-line bg-background lg:min-h-[calc(100vh-3rem)] lg:rounded-xl lg:border lg:shadow-[0_24px_70px_color-mix(in_oklab,var(--color-ink)_12%,transparent)]">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/library" className="flex min-w-0 items-center gap-2 text-xs font-bold text-ink-soft hover:text-ink"><ArrowLeft className="size-4 shrink-0" /> <span className="truncate">Back to library</span></Link>
          <ThemeToggle />
        </header>

        <div className="lg:grid lg:grid-cols-[minmax(300px,390px)_minmax(0,1fr)]">
          <aside className="relative overflow-hidden bg-ink text-paper lg:sticky lg:top-0 lg:h-[calc(100vh-3rem-57px)]">
            {book.cover_url && <img src={book.cover_url} alt="" aria-hidden="true" className="absolute inset-0 size-full scale-125 object-cover opacity-15 blur-3xl" />}
            <div className="relative grid gap-5 p-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center sm:p-8 lg:flex lg:h-full lg:flex-col lg:items-stretch lg:overflow-y-auto lg:p-10">
              <div className="mx-auto w-32 shrink-0 sm:mx-0 sm:w-40 lg:mx-auto lg:w-48">
                {book.cover_url ? <img src={book.cover_url} alt={`Cover of ${book.title}`} className="aspect-[2/3] w-full rounded-md object-cover shadow-2xl" /> : <CoverPlate className="aspect-[2/3] w-full rounded-md" />}
              </div>
              <div className="min-w-0 text-center sm:text-left lg:text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/60">Now reading</p>
                <h1 className="mt-2 break-words font-display text-2xl font-semibold leading-tight sm:text-3xl">{book.title}</h1>
                <p className="mt-1 truncate text-sm text-paper/65">{book.author || "Unknown author"}</p>
                <div className="mt-5 border-t border-paper/15 pt-4">
                  <div className="flex items-end justify-between gap-3 text-left"><span className="text-xs font-bold uppercase text-paper/55">Progress</span><span className="font-display text-2xl">{Math.round(progress)}%</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper/15"><div className="h-full rounded-full bg-pencil transition-[width]" style={{ width: `${progress}%` }} /></div>
                  <p className="mt-2 text-left text-xs text-paper/55">Chapter {currentChapter} of {chapters.length} · {readCount} read</p>
                </div>
                <Button asChild className="mt-5 h-11 w-full bg-pencil text-paper hover:bg-pencil/85"><Link to="/read/$slug" params={{ slug: book.slug }}><BookOpen />Continue reading</Link></Button>
              </div>
            </div>
          </aside>

          <section className="min-w-0 bg-paper px-4 py-6 sm:px-7 lg:max-h-[calc(100vh-3rem-57px)] lg:overflow-y-auto lg:px-10 lg:py-9">
            <section aria-labelledby="details-heading">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <div className="min-w-0"><p className="label text-tint">Book details</p><h2 id="details-heading" className="mt-2 font-display text-3xl font-semibold">Shape your edition</h2><p className="mt-1 text-sm text-ink-soft">{totalWords.toLocaleString()} words · edits stay private to your library</p></div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Button onClick={() => metaMutation.mutate(draft)} disabled={!detailsChanged || metaMutation.isPending} className="h-10"><Save />{metaMutation.isPending ? "Saving" : "Save details"}</Button>
                  <span className="text-[11px] text-ink-soft">{metaMutation.isSuccess && !detailsChanged ? "Saved" : detailsChanged ? "Unsaved changes" : "Up to date"}</span>
                </div>
              </div>

              <form onSubmit={(event) => { event.preventDefault(); if (detailsChanged) metaMutation.mutate(draft); }} className="mt-7 grid min-w-0 gap-4 sm:grid-cols-2">
                <Field label="Title" className="sm:col-span-2"><Input value={draft.title} onChange={(e) => updateDraft("title", e.target.value)} /></Field>
                <Field label="Author" className="sm:col-span-2"><Input value={draft.author} onChange={(e) => updateDraft("author", e.target.value)} /></Field>
                <Field label="Series"><Input value={draft.series} onChange={(e) => updateDraft("series", e.target.value)} placeholder="—" /></Field>
                <Field label="Volume"><Input value={draft.volume} onChange={(e) => updateDraft("volume", e.target.value)} placeholder="—" /></Field>
                <Field label="Cover link" className="sm:col-span-2"><Input value={draft.cover} onChange={(e) => updateDraft("cover", e.target.value)} placeholder="https://…" /></Field>
                <Field label="Tags" className="sm:col-span-2"><Input value={draft.tags} onChange={(e) => updateDraft("tags", e.target.value)} placeholder="fantasy, ongoing" /></Field>
              </form>

              <div className="mt-5 flex flex-wrap gap-2 border-b border-line pb-7">
                <Button variant="outline" size="sm" onClick={() => setDraft({ ...draft, title: book.scraped_title ?? book.title, author: book.scraped_author ?? book.author, cover: book.scraped_cover_url ?? "" })}><RotateCcw />Scraped details</Button>
                <Button variant="outline" size="sm" onClick={() => setConfirm(confirm === "book" ? null : "book")} className="text-destructive hover:text-destructive"><Trash2 />{confirm === "book" ? "Cancel" : "Delete book"}</Button>
                {confirm === "book" && <Button variant="destructive" size="sm" onClick={() => removeBookMutation.mutate()}>Confirm delete</Button>}
              </div>
            </section>

            <section className="py-7" aria-labelledby="exports-heading">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4"><div className="min-w-0"><p id="exports-heading" className="label text-tint">Export edition</p><p className="mt-1 text-sm text-ink-soft">Uses your saved title, author, and cover.</p></div><Download className="size-5 shrink-0 text-tint" /></div>
              <div className="mt-3 flex flex-wrap gap-2">{(["EPUB", "PDF", "Markdown", "Text"] as const).map((kind) => <Button key={kind} variant="outline" size="sm" disabled={busyExport !== null} onClick={() => void runExport(kind)}>{busyExport === kind && <Loader2 className="animate-spin" />}{kind}</Button>)}</div>
            </section>

            <section id="chapters" className="border-t border-line pt-7" aria-labelledby="chapters-heading">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3"><div className="min-w-0"><p className="label text-tint">Chapter ledger</p><h2 id="chapters-heading" className="mt-2 truncate font-display text-3xl font-semibold">{chapters.length} chapters</h2></div><span className="shrink-0 text-xs text-ink-soft">{filteredChapters.length} shown</span></div>

              <form onSubmit={(event) => { event.preventDefault(); const value = chapterUrl.trim(); if (value) addChapterMutation.mutate(value); }} className="mt-5 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input value={chapterUrl} onChange={(e) => setChapterUrl(e.target.value)} disabled={addChapterMutation.isPending} placeholder="Paste one chapter link…" className="min-w-0" />
                <Button disabled={addChapterMutation.isPending} className="w-full sm:w-auto">{addChapterMutation.isPending ? <Loader2 className="animate-spin" /> : <Plus />}Add chapter</Button>
              </form>
              {addChapterMutation.isError && <p className="mt-2 text-xs text-destructive">{(addChapterMutation.error as Error).message || "That chapter couldn't be read."}</p>}
              {book.next_url && <Button variant="outline" onClick={() => moreMutation.mutate()} disabled={moreMutation.isPending} className="mt-2 w-full">{moreMutation.isPending && <Loader2 className="animate-spin" />}{moreMutation.isPending ? "Following next chapters…" : "Fetch newer chapters"}</Button>}

              <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <label className="relative min-w-0"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chapters" className="min-w-0 pl-9" /></label>
                <div className="grid grid-cols-3 gap-1 rounded-md border border-line p-1">{(["all", "unread", "read"] as const).map((value) => <Button key={value} type="button" size="sm" variant={filter === value ? "secondary" : "ghost"} onClick={() => setFilter(value)} className="h-7 px-2 capitalize">{value}</Button>)}</div>
              </div>

              <div className="mt-4 divide-y divide-line border-y border-line">
                {filteredChapters.map((chapter) => (
                  <ChapterRow key={chapter.id} chapter={chapter} total={chapters.length} busy={moveMutation.isPending || chapterMutation.isPending} confirm={confirm} onConfirm={setConfirm} onSaveTitle={(title) => chapterMutation.mutate({ id: chapter.id, title })} onToggle={() => chapterMutation.mutate({ id: chapter.id, read: !chapter.read })} onMove={(target) => moveMutation.mutate({ id: chapter.id, target })} onRemove={() => { removeChapterMutation.mutate(chapter.id); setConfirm(null); }} />
                ))}
                {filteredChapters.length === 0 && <p className="py-10 text-center text-sm text-ink-soft">No chapters match this view.</p>}
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return <label className={`block min-w-0 ${className}`}><span className="mb-1.5 block text-xs font-bold text-ink-soft">{label}</span>{children}</label>;
}

function ChapterRow({ chapter, total, busy, confirm, onConfirm, onSaveTitle, onToggle, onMove, onRemove }: {
  chapter: { id: string; n: number; title: string; words: number; flagged: boolean; read: boolean };
  total: number;
  busy: boolean;
  confirm: string | null;
  onConfirm: (id: string | null) => void;
  onSaveTitle: (title: string) => void;
  onToggle: () => void;
  onMove: (target: number) => void;
  onRemove: () => void;
}) {
  const [position, setPosition] = useState(String(chapter.n));
  useEffect(() => setPosition(String(chapter.n)), [chapter.n]);
  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 py-3 sm:gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-paper-deep font-mono text-[10px] text-ink-soft">{chapter.n}</span>
      <div className="min-w-0">
        <input defaultValue={chapter.title} onBlur={(e) => { if (e.target.value !== chapter.title) onSaveTitle(e.target.value); }} className="block w-full min-w-0 truncate border-b border-transparent bg-transparent text-sm font-semibold outline-none focus:border-inkline" />
        <p className={`mt-1 truncate text-[11px] ${chapter.flagged ? "text-destructive" : "text-ink-soft"}`}>{chapter.flagged ? "Check extraction" : `${chapter.words.toLocaleString()} words`} · {chapter.read ? "Read" : "Unread"}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <div className="hidden items-center gap-1 sm:flex" title="Move to position"><GripVertical className="size-3.5 text-ink-soft" /><Input aria-label={`Position for ${chapter.title}`} type="number" min={1} max={total} value={position} onChange={(e) => setPosition(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onMove(Number(position)); } }} className="h-8 w-14 px-1 text-center text-xs" /><Button type="button" variant="ghost" size="icon" disabled={busy || Number(position) === chapter.n} onClick={() => onMove(Number(position))} className="size-8" title="Move chapter"><Check /></Button></div>
        <Button type="button" variant="ghost" size="icon" onClick={onToggle} className={`size-8 ${chapter.read ? "text-tint" : "text-ink-soft"}`} title={chapter.read ? "Mark unread" : "Mark read"}>{chapter.read ? <CheckCircle2 /> : <Circle />}</Button>
        {confirm === chapter.id ? <div className="flex items-center gap-1"><Button type="button" variant="destructive" size="sm" onClick={onRemove} className="h-8 px-2">Remove</Button><Button type="button" variant="ghost" size="sm" onClick={() => onConfirm(null)} className="h-8 px-2">Cancel</Button></div> : <Button type="button" variant="ghost" size="icon" onClick={() => onConfirm(chapter.id)} className="size-8 text-ink-soft hover:text-destructive" title="Remove chapter"><Trash2 /></Button>}
      </div>
      <div className="col-start-2 col-end-4 flex items-center gap-2 sm:hidden"><span className="text-[11px] text-ink-soft">Move to</span><Input aria-label={`Position for ${chapter.title}`} type="number" min={1} max={total} value={position} onChange={(e) => setPosition(e.target.value)} className="h-8 w-16 px-2 text-xs" /><Button type="button" variant="outline" size="sm" disabled={busy || Number(position) === chapter.n} onClick={() => onMove(Number(position))} className="h-8">Move</Button></div>
    </div>
  );
}