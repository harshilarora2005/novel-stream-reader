import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_book",
  title: "Get book",
  description:
    "Get one book by slug with its chapter list (numbers, titles, word counts, read state). Chapter text is not included.",
  inputSchema: { slug: z.string().trim().min(1).describe("Book slug from list_books.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data: book, error } = await supabase
      .from("books")
      .select(
        "id,slug,title,author,series,volume,tags,cover_url,progress,current_chapter,scroll_pos,last_read_at,source_url",
      )
      .eq("slug", slug)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!book) return { content: [{ type: "text", text: `No book with slug "${slug}"` }], isError: true };
    const { data: chapters, error: chErr } = await supabase
      .from("chapters")
      .select("id,n,title,words,read,flagged")
      .eq("book_id", book.id)
      .order("n");
    if (chErr) return { content: [{ type: "text", text: chErr.message }], isError: true };
    const payload = { book, chapters: chapters ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
