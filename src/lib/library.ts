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

export const books: Book[] = [
  {
    slug: "salt-and-static",
    title: "Salt & Static",
    author: "Meridian Press",
    series: "Meridian Press",
    volume: "Vol. I",
    source: "royalroad.com/fiction/salt-static",
    tags: ["sci-fi", "serialized"],
    currentChapter: 14,
    progress: 62,
    lastRead: "07d ago",
    updating: true,
    chapters: [
      { n: 1, title: "The Signal", status: "read", words: 3120 },
      { n: 12, title: "Static Hour", status: "read", words: 2840 },
      { n: 13, title: "The Salt Road", status: "read", words: 3410 },
      { n: 14, title: "Dead Air", status: "reading", words: 3980 },
      { n: 15, title: "The Relay", status: "new", words: 2610 },
      { n: 16, title: "untitled — short parse", status: "flagged", words: 210 },
    ],
  },
  {
    slug: "the-long-coast",
    title: "The Long Coast",
    author: "I. Okafor",
    tags: ["literary"],
    source: "scribblehub.com/series/long-coast",
    currentChapter: 5,
    progress: 31,
    lastRead: "2h ago",
    updating: false,
    chapters: [
      { n: 4, title: "Low Tide", status: "read", words: 2200 },
      { n: 5, title: "The Ferry House", status: "reading", words: 3050 },
      { n: 6, title: "Nightwatch", status: "new", words: 2760 },
    ],
  },
  {
    slug: "glasshouse",
    title: "Glasshouse",
    author: "S. Vane",
    tags: ["finished"],
    source: "archiveofourown.org/works/glasshouse",
    currentChapter: 19,
    progress: 88,
    lastRead: "yesterday",
    updating: false,
    chapters: [
      { n: 18, title: "The Orangery", status: "read", words: 2410 },
      { n: 19, title: "Cold Frame", status: "reading", words: 3320 },
      { n: 20, title: "What Grows Back", status: "new", words: 2980 },
    ],
  },
];

export const shelfSeries = {
  name: "Meridian Press",
  volumes: [
    { slug: "salt-and-static", title: "Salt & Static", volume: "Vol. I" },
    { slug: "violet-circuit", title: "Violet Circuit", volume: "Vol. II" },
    { slug: "the-last-broadcast", title: "The Last Broadcast", volume: "Vol. III" },
  ],
};

export const allTags = ["sci-fi", "literary", "serialized", "finished"];

export function getBook(slug: string): Book | undefined {
  return books.find((b) => b.slug === slug);
}
