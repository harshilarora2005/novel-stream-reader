export type Chapter = {
  n: number;
  title: string;
  status: "read" | "reading" | "new" | "flagged";
  words: number;
};

export type Book = {
  slug: string;
  title: string;
  author: string;
  series?: string;
  volume?: string;
  source: string;
  tags: string[];
  chapters: Chapter[];
  currentChapter: number;
  progress: number;
  lastRead: string;
  updating: boolean;
};

/** The library starts empty — books arrive by pasting a link. */
export const books: Book[] = [];

export function seriesGroups(list: Book[]) {
  const map = new Map<string, Book[]>();
  for (const b of list) {
    if (!b.series) continue;
    map.set(b.series, [...(map.get(b.series) ?? []), b]);
  }
  return [...map.entries()].map(([name, volumes]) => ({ name, volumes }));
}

export function collectTags(list: Book[]) {
  return [...new Set(list.flatMap((b) => b.tags))];
}
