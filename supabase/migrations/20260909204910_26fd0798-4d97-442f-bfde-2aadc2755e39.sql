CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Unknown',
  cover_url TEXT,
  scraped_title TEXT,
  scraped_author TEXT,
  scraped_cover_url TEXT,
  series TEXT,
  volume TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source_url TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'chapter',
  next_url TEXT,
  updating BOOLEAN NOT NULL DEFAULT false,
  current_chapter INTEGER NOT NULL DEFAULT 1,
  progress INTEGER NOT NULL DEFAULT 0,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

CREATE TABLE public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  n INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  words INTEGER NOT NULL DEFAULT 0,
  url TEXT,
  flagged BOOLEAN NOT NULL DEFAULT false,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, n)
);

CREATE INDEX chapters_book_idx ON public.chapters (book_id, n);

CREATE TABLE public.reader_prefs (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapters TO authenticated;
GRANT ALL ON public.chapters TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reader_prefs TO authenticated;
GRANT ALL ON public.reader_prefs TO service_role;

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reader_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own books" ON public.books FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage their own chapters" ON public.chapters FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage their own prefs" ON public.reader_prefs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);