import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_books",
  title: "List books",
  description:
    "List the signed-in reader's library with title, author, series, progress and the chapter they are on.",
  inputSchema: {
    query: z.string().trim().optional().describe("Optional text filter on title, author or series."),
    limit: z.number().int().min(1).max(100).optional().describe("Max books to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("books")
      .select("slug,title,author,series,volume,tags,progress,current_chapter,last_read_at,source_url")
      .order("last_read_at", { ascending: false, nullsFirst: false })
      .limit(limit ?? 25);
    if (query) q = q.or(`title.ilike.%${query}%,author.ilike.%${query}%,series.ilike.%${query}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { books: data ?? [] },
    };
  },
});
