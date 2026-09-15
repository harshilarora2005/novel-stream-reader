import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const MAX_CHARS = 60_000;

export default defineTool({
  name: "read_chapter",
  title: "Read chapter",
  description: "Return the extracted text of one chapter of a book in the reader's library.",
  inputSchema: {
    slug: z.string().trim().min(1).describe("Book slug from list_books."),
    chapter: z.number().int().min(1).describe("Chapter number (1-based)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug, chapter }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data: book, error } = await supabase
      .from("books")
      .select("id,title")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!book) throw new ToolError(`No book with slug "${slug}"`);
    const { data: ch, error: chErr } = await supabase
      .from("chapters")
      .select("n,title,words,content")
      .eq("book_id", book.id)
      .eq("n", chapter)
      .maybeSingle();
    if (chErr) throw new ToolError(chErr.message);
    if (!ch) throw new ToolError(`Chapter ${chapter} not found in "${book.title}"`);
    const truncated = ch.content.length > MAX_CHARS;
    const text = truncated ? `${ch.content.slice(0, MAX_CHARS)}\n\n[truncated]` : ch.content;
    return {
      content: [{ type: "text", text: `# ${ch.title}\n\n${text}` }],
      structuredContent: { book: book.title, n: ch.n, title: ch.title, words: ch.words, truncated },
    };
  },
});
