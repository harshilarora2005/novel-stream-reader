import { createFileRoute, Link } from "@tanstack/react-router";
import { books, shelfSeries, allTags } from "@/lib/library";
import { CoverPlate } from "@/components/CoverPlate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marginal — your reading room" },
      {
        name: "description",
        content:
          "Paste a novel link and Marginal builds a clean library: extracted chapters, editable covers and titles, progress that follows you.",
      },
      { property: "og:title", content: "Marginal — your reading room" },
      {
        property: "og:description",
        content: "A reading room, not a feed. Paste a link, keep the story.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="min-h-screen bg-paper font-body text-ink">
      <section className="mx-auto max-w-[960px] px-6 pt-12 pb-8">
        <div className="flex animate-fade-up items-end justify-between">
          <div>
            <p className="label text-tint">Marginal</p>
            <h1 className="mt-2 text-balance font-display text-4xl tracking-tight md:text-5xl">
              A reading room, not a feed.
            </h1>
            <p className="mt-3 max-w-[46ch] text-pretty text-[15px] text-ink-soft">
              Paste a link. Marginal strips everything that isn't the story, then sets it exactly
              like a well-worn paperback you'd keep.
            </p>
          </div>
          <div className="hidden text-right font-mono text-[11px] leading-relaxed text-tint sm:block">
            12 books
            <br />
            231 highlights
            <br />
            Day 41
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
          <span className="font-mono text-[11px] text-ink-soft">3 in progress</span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {books.map((b, i) => (
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
                  Ch. {b.currentChapter} / {b.currentChapter + 8} · {b.progress}%
                </span>
                <span className="text-tint">{b.lastRead}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[960px] border-t border-line px-6 py-10">
        <div className="flex items-baseline justify-between">
          <h2 className="label text-tint">(b) The shelf</h2>
          <div className="flex gap-2 font-mono text-[10px] text-ink-soft">
            <span className="rounded-full border border-inkline px-2.5 py-1 text-ink">All</span>
            <span className="rounded-full border border-line px-2.5 py-1">Series</span>
            <span className="rounded-full border border-line px-2.5 py-1">Tags</span>
          </div>
        </div>
        <p className="mt-4 font-mono text-[11px] text-ink-soft">
          Series · {shelfSeries.name} — {shelfSeries.volumes.length} volumes
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {shelfSeries.volumes.map((v, i) => (
            <Link
              key={v.slug}
              to="/book/$slug"
              params={{ slug: v.slug }}
              className="animate-fade-up rounded-xl border border-line bg-paper-deep/30 p-3 transition-colors hover:border-inkline"
              style={{ animationDelay: `${180 + i * 70}ms` }}
            >
              <CoverPlate className="aspect-[3/4] w-full" />
              <p className="mt-3 font-display text-base leading-tight">{v.title}</p>
              <p className="text-xs text-ink-soft">
                {v.volume} · {shelfSeries.name}
              </p>
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] text-ink-soft">
          {allTags.map((t) => (
            <span key={t} className="rounded-full border border-line px-2.5 py-1">
              {t}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[960px] border-t border-line px-6 py-10">
        <div className="flex items-baseline justify-between">
          <h2 className="label text-tint">(c) In the works</h2>
          <span className="font-mono text-[10px] text-ink-soft">roadmap</span>
        </div>
        <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {[
            ["Extraction", "Readability parsing, next-chapter following, index detection, polite crawl, quality flags."],
            ["Library", "Editable title, author, cover and chapter names, with revert-to-scraped. Series and tags."],
            ["Reader", "Themes, typography controls, in-book search, highlights, read-aloud, reading stats."],
            ["Sync", "Optional account. Guest mode by default; sign in to carry progress across devices."],
            ["Updates", "Subscribe to ongoing novels and get told when a new chapter lands."],
            ["Export", "EPUB, PDF, Markdown and MOBI, using your edited metadata and embedded illustrations."],
          ].map(([h, d]) => (
            <div key={h} className="border-t border-line pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-tint">{h}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-[960px] border-t border-line px-6 py-8 font-mono text-[10px] text-ink-soft">
        Marginal · paste a link, keep the story
      </footer>
    </main>
  );
}
