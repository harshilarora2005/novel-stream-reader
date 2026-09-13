import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { listBooks, importUrl, type BookRow } from "@/lib/books.functions";
import { supabase } from "@/integrations/supabase/client";
import { CoverPlate } from "@/components/CoverPlate";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Your library — Marginal" },
      {
        name: "description",
        content:
          "Paste a novel link and Marginal builds a clean library: extracted chapters, editable covers and titles, progress that follows you.",
      },
      { property: "og:title", content: "Your library — Marginal" },
      {
        property: "og:description",
        content: "A reading room, not a feed. Paste a link, keep the story.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: Library,
});

function seriesGroups(list: BookRow[]) {
  const map = new Map<string, BookRow[]>();
  for (const b of list) {
    if (!b.series) continue;
    map.set(b.series, [...(map.get(b.series) ?? []), b]);
  }
  return [...map.entries()].map(([name, volumes]) => ({ name, volumes }));
}

function Library() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [url, setUrl] = useState("");
  const fetchBooks = useServerFn(listBooks);
  const runImport = useServerFn(importUrl);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/", replace: true });
      else setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const booksQuery = useQuery({
    queryKey: ["books"],
    queryFn: () => fetchBooks(),
    enabled: ready,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const importer = useMutation({
    mutationFn: (link: string) => runImport({ data: { url: link } }),
    onSuccess: async (res) => {
      setUrl("");
      await queryClient.invalidateQueries({ queryKey: ["books"] });
      navigate({ to: "/book/$slug", params: { slug: res.slug } });
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  if (!ready) return <main className="min-h-screen bg-paper" />;

  const books = booksQuery.data ?? [];
  // Anything you've opened belongs here, newest first — even a book you just
  // started or one you've finished but might revisit.
  const inProgress = books
    .filter((b) => b.last_read_at !== null || b.current_chapter > 0)
    .sort((a, b) => (b.last_read_at ?? "").localeCompare(a.last_read_at ?? ""))
    .slice(0, 6);
  const series = seriesGroups(books);

  const safeProgress = (progress: number) =>
    Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0;

  return (
    <main className="min-h-screen bg-paper font-body text-ink">
      <section className="mx-auto max-w-[960px] px-5 pt-7 pb-8 sm:px-6 sm:pt-12">
        <div className="animate-fade-up">
          <div className="flex items-center justify-between gap-3">
            <p className="label min-w-0 text-tint">Marginal</p>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <button
                onClick={signOut}
                className="rounded-lg border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft transition-colors hover:border-inkline hover:text-ink"
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="mt-5 max-w-[16ch] text-balance font-display text-4xl tracking-tight sm:mt-3 sm:text-4xl md:text-5xl">
              A reading room, not a feed.
            </h1>
            <p className="mt-3 max-w-[46ch] text-pretty text-[15px] text-ink-soft">
              Paste a link. Marginal strips everything that isn't the story, then sets it exactly
              like a well-worn paperback you'd keep.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = url.trim();
            if (v) importer.mutate(v);
          }}
          className="mt-8 grid animate-fade-up grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-line bg-paper-deep p-2 [animation-delay:120ms] sm:mt-9 sm:gap-3 sm:px-4 sm:py-3.5"
        >
          <div className="flex min-w-0 items-center gap-2 pl-2 sm:gap-3 sm:pl-0">
            <span className="shrink-0 font-mono text-sm text-tint">⌘</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={importer.isPending}
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-soft/60 sm:text-[15px]"
              placeholder="Paste a novel or chapter link…"
            />
          </div>
          <span className="hidden font-mono text-[10px] tracking-[0.2em] text-inkline md:block">
            LINK
          </span>
          <button
            disabled={importer.isPending}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/80 disabled:opacity-60 sm:px-5"
          >
            {importer.isPending && <Loader2 className="size-4 animate-spin" />}
            {importer.isPending ? "Reading…" : "Add"}
          </button>
        </form>
        {importer.isPending && (
          <p className="mt-2 font-mono text-[11px] text-ink-soft">
            Fetching chapters politely, one at a time. Long books can take a minute.
          </p>
        )}
        {importer.isError && (
          <p className="mt-2 text-sm text-destructive">
            {(importer.error as Error).message || "That link couldn't be read."}
          </p>
        )}
      </section>

      <section className="mx-auto max-w-[960px] px-5 py-8 sm:px-6 sm:py-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-t border-line pt-5">
          <h2 className="label min-w-0 text-tint">(a) Continue reading</h2>
          <span className="shrink-0 font-mono text-[10px] text-ink-soft sm:text-[11px]">
            {inProgress.length} in progress
          </span>
        </div>
        {inProgress.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-line px-5 py-10 text-center text-sm text-ink-soft">
            Nothing on the go yet. Paste a link above and your first book lands here.
          </p>
        ) : (
          <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-3">
            {inProgress.map((b, i) => (
              <Link
                key={b.slug}
                to="/read/$slug"
                params={{ slug: b.slug }}
                className="min-w-0 max-w-full overflow-hidden animate-fade-up rounded-xl border border-line bg-paper-deep/40 p-4 transition-colors hover:border-inkline"
                style={{ animationDelay: `${160 + i * 70}ms` }}
              >
                 <div className="flex min-w-0 gap-4">
                  <CoverPlate className="size-12 shrink-0" />
                   <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg leading-tight">{b.title}</p>
                    <p className="truncate text-xs text-ink-soft">{b.author}</p>
                     <div className="mt-3 h-1 max-w-full overflow-hidden rounded-full bg-ink/10">
                       <div className="h-full bg-pencil" style={{ width: `${safeProgress(b.progress)}%` }} />
                    </div>
                  </div>
                </div>
                 <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 font-mono text-[10px] text-ink-soft">
                   <span className="min-w-0 truncate">
                    Ch. {b.current_chapter} · {b.progress}%
                  </span>
                   <span className="shrink-0 whitespace-nowrap text-tint">
                    {b.last_read_at ? new Date(b.last_read_at).toLocaleDateString() : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[960px] border-t border-line px-5 py-8 sm:px-6 sm:py-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
          <h2 className="label min-w-0 text-tint">(b) The shelf</h2>
          <span className="shrink-0 font-mono text-[10px] text-ink-soft">{books.length} books</span>
        </div>

        {booksQuery.isLoading ? (
          <p className="mt-5 text-center font-mono text-[11px] text-ink-soft">Loading your shelf…</p>
        ) : books.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-line px-5 py-10 text-center text-sm text-ink-soft">
            Your shelf is empty. Everything you add lives here — grouped by series, sorted by you.
          </p>
        ) : (
          <>
            {series.map((s) => (
              <div key={s.name} className="mt-6">
                <p className="font-mono text-[11px] text-ink-soft">
                  Series · {s.name} — {s.volumes.length} volumes
                </p>
              </div>
            ))}
            <div className="mt-4 grid gap-4 sm:mt-3 sm:grid-cols-3">
              {books.map((b, i) => (
                <Link
                  key={b.slug}
                  to="/book/$slug"
                  params={{ slug: b.slug }}
                  className="grid animate-fade-up grid-cols-[88px_minmax(0,1fr)] gap-4 rounded-xl border border-line bg-paper-deep/30 p-3 transition-colors hover:border-inkline sm:block"
                  style={{ animationDelay: `${180 + i * 70}ms` }}
                >
                  {b.cover_url ? (
                    <img
                      src={b.cover_url}
                      alt={`Cover of ${b.title}`}
                      loading="lazy"
                      className="aspect-[3/4] w-[88px] rounded-md object-cover sm:w-full"
                    />
                  ) : (
                    <CoverPlate className="aspect-[3/4] w-[88px] sm:w-full" />
                  )}
                  <div className="min-w-0 self-center sm:mt-3">
                    <p className="text-pretty font-display text-lg leading-tight sm:text-base">{b.title}</p>
                    <p className="mt-1 truncate text-xs text-ink-soft">
                      {b.volume ? `${b.volume} · ` : ""}
                      {b.series ?? b.author}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      <footer className="mx-auto max-w-[960px] border-t border-line px-6 py-8 font-mono text-[10px] text-ink-soft">
        Marginal · paste a link, keep the story
      </footer>
    </main>
  );
}
