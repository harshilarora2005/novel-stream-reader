import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getBook, books } from "@/lib/library";

export const Route = createFileRoute("/read/$slug")({
  head: () => ({
    meta: [
      { title: "Reading — Marginal" },
      {
        name: "description",
        content:
          "A quiet reading view: paper, sepia and night themes, adjustable type, margin notes and progress that remembers your place.",
      },
      { property: "og:title", content: "Reading — Marginal" },
      {
        property: "og:description",
        content: "Set like a paperback: adjustable type, margin notes, saved place.",
      },
    ],
  }),
  component: Reader,
});

const paragraphs = [
  "The harbour had emptied hours before she got there, and the piers were bare enough that her own footsteps came back to her off the water. She had walked two days without looking behind her once.",
  "The ferryman kept his ledger the way he kept the tides — quietly, and without asking anyone to confirm them. He took her name, wrote it small, and pushed off.",
  "Somewhere past the second buoy the mainland stopped being a place and became a pale line, and Sefira found she could not say exactly when the change had happened, only that it had.",
  "She counted the lanterns on the far shore instead. Nine of them, then eight, then nine again, which meant either the wind or someone walking, and she decided she preferred not to know which.",
];

const themes = ["paper", "sepia", "night"] as const;

function Reader() {
  const { slug } = Route.useParams();
  const book = getBook(slug) ?? books[0];
  if (!book) throw notFound();

  const [theme, setTheme] = useState<(typeof themes)[number]>("paper");
  const [size, setSize] = useState(19);
  const [leading, setLeading] = useState(1.8);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "sepia");
    if (theme === "night") root.classList.add("dark");
    if (theme === "sepia") root.classList.add("sepia");
    return () => root.classList.remove("dark", "sepia");
  }, [theme]);

  const chapter = book.chapters.find((c) => c.status === "reading") ?? book.chapters[0]!;

  return (
    <main className="min-h-screen bg-paper font-body text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-[960px] items-center justify-between gap-4 px-6 py-3">
          <Link
            to="/book/$slug"
            params={{ slug: book.slug }}
            className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-tint"
          >
            ← {book.title}
          </Link>
          <span className="font-mono text-[10px] text-ink-soft">
            Ch. {chapter.n} · {book.progress}%
          </span>
        </div>
        <div className="h-0.5 w-full bg-ink/10">
          <div className="h-full bg-pencil" style={{ width: `${book.progress}%` }} />
        </div>
      </header>

      <div className="mx-auto grid max-w-[960px] gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_240px]">
        <article className="min-w-0 animate-fade">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-tint">
            Chapter {chapter.n}
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">
            {chapter.title}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {book.author}
            {book.series ? ` · ${book.series} ${book.volume ?? ""}` : ""}
          </p>

          <div
            className="mt-9 max-w-[68ch] font-reading"
            style={{ fontSize: `${size}px`, lineHeight: leading }}
          >
            {paragraphs.map((p, i) => (
              <p key={i} className="mb-6 text-pretty">
                {i === 1 ? <span className="hl">{p}</span> : p}
              </p>
            ))}
          </div>

          <div className="mt-10 flex items-center justify-between border-t border-line pt-6 text-sm">
            <button className="text-ink-soft transition-colors hover:text-ink">
              ← Chapter {chapter.n - 1}
            </button>
            <button className="font-medium transition-colors hover:text-tint">
              Chapter {chapter.n + 1} →
            </button>
          </div>
        </article>

        <aside className="space-y-8">
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-tint">Theme</p>
            <div className="flex gap-2 font-mono text-[10px]">
              {themes.map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded-full border px-2.5 py-1 capitalize ${
                    theme === t ? "border-inkline text-ink" : "border-line text-ink-soft"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-tint">Type</p>
            <label className="flex items-center justify-between font-mono text-[10px] text-ink-soft">
              <span>Size</span>
              <span>{size}px</span>
            </label>
            <input
              type="range"
              min={15}
              max={26}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="mt-2 w-full accent-pencil"
            />
            <label className="mt-4 flex items-center justify-between font-mono text-[10px] text-ink-soft">
              <span>Line height</span>
              <span>{leading.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min={1.4}
              max={2.2}
              step={0.05}
              value={leading}
              onChange={(e) => setLeading(Number(e.target.value))}
              className="mt-2 w-full accent-pencil"
            />
          </div>

          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-tint">
              Margin notes
            </p>
            <div className="rounded-xl border border-line bg-paper-deep/30 p-3">
              <p className="font-display text-[13px] italic leading-relaxed">
                The ledger and the tides — same image as the prologue.
              </p>
              <p className="mt-2 font-mono text-[10px] text-ink-soft">2h ago</p>
            </div>
          </div>

          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-tint">
              Session
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["128k", "words"],
                ["9", "streak"],
                ["4.2h", "left"],
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="font-display text-xl">{v}</p>
                  <p className="font-mono text-[10px] text-ink-soft">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
