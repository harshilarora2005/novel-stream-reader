import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

export type ExtractedChapter = {
  title: string;
  paragraphs: string[];
  words: number;
  url: string;
  flagged: boolean;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export async function fetchPage(url: string): Promise<{ html: string; finalUrl: string }> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Could not load that page (${res.status}).`);
  const html = await res.text();
  return { html, finalUrl: res.url || url };
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function absolute(href: string, base: string) {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

const JUNK = [
  /^(share|tweet|facebook|comments?|advertisement|report chapter|bookmark)/i,
  /(read|support) (this )?(novel|chapter) (on|at)/i,
  /^(previous|next) chapter/i,
  /^translator('s)? note/i,
  /^author('s)? note/i,
];

function cleanParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 1)
    .filter((l) => !JUNK.some((re) => re.test(l)));
}

export function extractFromHtml(html: string, url: string): ExtractedChapter {
  const { document } = parseHTML(html);
  document
    .querySelectorAll("script,style,nav,header,footer,aside,form,iframe,noscript")
    .forEach((el) => el.remove());

  let title = "";
  let paragraphs: string[] = [];

  try {
    const article = new Readability(document as unknown as Document, {
      charThreshold: 200,
    }).parse();
    if (article) {
      title = (article.title ?? "").trim();
      paragraphs = cleanParagraphs(article.textContent ?? "");
    }
  } catch {
    /* fall through to heuristic */
  }

  if (paragraphs.join(" ").length < 400) {
    const nodes = [...document.querySelectorAll("p")]
      .map((p) => (p.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter((t) => t.length > 1);
    const fallback = cleanParagraphs(nodes.join("\n"));
    if (fallback.join(" ").length > paragraphs.join(" ").length) paragraphs = fallback;
  }

  if (!title) {
    const h = document.querySelector("h1,h2");
    title = (h?.textContent ?? document.title ?? "Chapter").replace(/\s+/g, " ").trim();
  }

  const words = paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  return { title: title.slice(0, 200) || "Chapter", paragraphs, words, url, flagged: words < 250 };
}

export function pageMeta(html: string, url: string) {
  const { document } = parseHTML(html);
  const meta = (sel: string, attr = "content") =>
    document.querySelector(sel)?.getAttribute(attr)?.trim() || "";

  const title =
    meta('meta[property="og:title"]') ||
    (document.querySelector("h1")?.textContent ?? "").replace(/\s+/g, " ").trim() ||
    (document.title ?? "").replace(/\s+/g, " ").trim() ||
    new URL(url).hostname;

  const author =
    meta('meta[name="author"]') ||
    meta('meta[property="book:author"]') ||
    (
      document.querySelector(
        '[itemprop="author"],.author,.author-name,.novel-author,a[href*="author"]',
      )?.textContent ?? ""
    )
      .replace(/\s+/g, " ")
      .trim() ||
    "Unknown";

  const cover =
    meta('meta[property="og:image"]') ||
    absolute(document.querySelector(".cover img,.novel-cover img,img")?.getAttribute("src") ?? "", url) ||
    "";

  return { title: title.slice(0, 200), author: author.slice(0, 120), cover };
}

const CHAPTERISH = /(chapter|chap[\s._-]?\d|\bch[\s._-]?\d|episode|part[\s._-]?\d|\/c\d+|\-\d+\/?$)/i;

export function findChapterLinks(html: string, base: string) {
  const { document } = parseHTML(html);
  const host = new URL(base).hostname;
  const out: { url: string; title: string }[] = [];
  const seen = new Set<string>();

  for (const a of [...document.querySelectorAll("a[href]")]) {
    const href = a.getAttribute("href") ?? "";
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
    const abs = absolute(href, base);
    if (!abs) continue;
    let u: URL;
    try {
      u = new URL(abs);
    } catch {
      continue;
    }
    if (u.hostname !== host) continue;
    const text = (a.textContent ?? "").replace(/\s+/g, " ").trim();
    const clean = abs.split("#")[0]!;
    if (seen.has(clean)) continue;
    if (!CHAPTERISH.test(text) && !CHAPTERISH.test(u.pathname)) continue;
    if (/next|previous|prev|latest|last chapter|first chapter/i.test(text) && text.length < 20)
      continue;
    seen.add(clean);
    out.push({ url: clean, title: text || "Chapter" });
  }
  return out;
}

export function findNextLink(html: string, base: string): string | null {
  const { document } = parseHTML(html);
  const rel = document.querySelector('a[rel="next"]')?.getAttribute("href");
  if (rel) return absolute(rel, base);
  for (const a of [...document.querySelectorAll("a[href]")]) {
    const text = (a.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    const cls = `${a.getAttribute("class") ?? ""} ${a.getAttribute("id") ?? ""}`.toLowerCase();
    if (
      /^(next|next chapter|next ›|next »|»|›|continue)$/.test(text) ||
      /\bnext[\s-]?(chapter|chap|page)\b/.test(text) ||
      /next[-_]?chap|nextchap|btn-next|next-page/.test(cls)
    ) {
      const href = a.getAttribute("href") ?? "";
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
      const abs = absolute(href, base);
      if (abs && abs.split("#")[0] !== base.split("#")[0]) return abs.split("#")[0]!;
    }
  }
  return null;
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "book"
  );
}
