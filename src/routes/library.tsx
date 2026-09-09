import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { seriesGroups, collectTags } from "@/lib/library";
import { useLibrary } from "@/lib/store";
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
    ],
  }),
  ssr: false,
  component: Library,
});

function Library() {
  const books = useLibrary();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);

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

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  if (!ready) return <main className="min-h-screen bg-paper" />;

  const inProgress = books.filter((b) => b.progress > 0 && b.progress < 100);
  const series = seriesGroups(books);
  const tags = collectTags(books);

  return (
    <main className="min-h-screen bg-paper font-body text-ink">
      <section className="mx-auto max-w-[960px] px-5 pt-10 pb-8 sm:px-6 sm:pt-12">
        <div className="grid animate-fade-up grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <p className="label text-tint">Marginal</p>
            <h1 className="mt-2 text-balance font-display text-3xl tracking-tight sm:text-4xl md:text-5xl">
              A reading room, not a feed.
            </h1>
            <p className="mt-3 max-w-[46ch] text-pretty text-[15px] text-ink-soft">
              Paste a link. Marginal strips everything that isn't the story, then sets it exactly
              like a well-worn paperback you'd keep.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={signOut}
              className="rounded-lg border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft transition-colors hover:border-inkline hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-9 flex animate-fade-up items-center gap-3 rounded-xl border border-line bg-paper-deep px-4 py-3.5 [animation-delay:120ms]"
        >
          <span className="font-mono text-sm text-tint">⌘</span>
          <input
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-soft/60"
            placeholder="Paste a chapter or table-of-contents link…"
          />
          <span className="hidden font-mono text-[10px] tracking-[0.2em] text-inkline md:block">
            LINK
          </span>
          <button className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/80">
            Add
          </button>
        </form>
      </section>

      <section className="mx-auto max-w-[960px] px-6 py-10">
        <div className="flex items-baseline justify-between border-t border-line pt-5">
          <h2 className="label text-tint">(a) Continue reading</h2>
          <span className="font-mono text-[11px] text-ink-soft">
            {inProgress.length} in progress
          </span>
        </div>
        {inProgress.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-line px-5 py-10 text-center text-sm text-ink-soft">
            Nothing on the go yet. Paste a link above and your first book lands here.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {inProgress.map((b, i) => (
              <Link
                key={b.slug}
                to="/read/$slug"
                params={{ slug: b.slug }}
                className="animate-fade-up rounded-xl border border-line bg-paper-deep/40 p-4 transition-colors hover:border-inkline"
                style={{ animationDelay: `${160 + i * 70}ms` }}
              >
                <div className="flex gap-4">
                  <CoverPlate className="size-12 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg leading-tight">{b.title}</p>
                    <p className="truncate text-xs text-ink-soft">{b.author}</p>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink/10">
                      <div className="h-full bg-pencil" style={{ width: `${b.progress}%` }} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-ink-soft">
                  <span>
                    Ch. {b.currentChapter} · {b.progress}%
                  </span>
                  <span className="text-tint">{b.lastRead}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[960px] border-t border-line px-6 py-10">
        <div className="flex items-baseline justify-between">
          <h2 className="label text-tint">(b) The shelf</h2>
          <span className="font-mono text-[10px] text-ink-soft">{books.length} books</span>
        </div>

        {books.length === 0 ? (
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
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              {books.map((b, i) => (
                <Link
                  key={b.slug}
                  to="/book/$slug"
                  params={{ slug: b.slug }}
                  className="animate-fade-up rounded-xl border border-line bg-paper-deep/30 p-3 transition-colors hover:border-inkline"
                  style={{ animationDelay: `${180 + i * 70}ms` }}
                >
                  <CoverPlate className="aspect-[3/4] w-full" />
                  <p className="mt-3 font-display text-base leading-tight">{b.title}</p>
                  <p className="text-xs text-ink-soft">
                    {b.volume ? `${b.volume} · ` : ""}
                    {b.series ?? b.author}
                  </p>
                </Link>
              ))}
            </div>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] text-ink-soft">
                {tags.map((t) => (
                  <span key={t} className="rounded-full border border-line px-2.5 py-1">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <footer className="mx-auto max-w-[960px] border-t border-line px-6 py-8 font-mono text-[10px] text-ink-soft">
        Marginal · paste a link, keep the story
      </footer>
    </main>
  );
}
