import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_book_details",
  title: "Update book details",
  description: "Edit a book's title, author, series, volume, cover link or tags.",
  inputSchema: {
    slug: z.string().trim().min(1).describe("Book slug from list_books."),
    title: z.string().trim().min(1).optional(),
    author: z.string().trim().optional(),
    series: z.string().trim().optional(),
    volume: z.string().trim().optional(),
    cover_url: z.string().url().optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ slug, ...patch }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
    if (entries.length === 0) throw new ToolError("Provide at least one field to update.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("books")
      .update(Object.fromEntries(entries))
      .eq("slug", slug)
      .select("slug,title,author,series,volume,tags,cover_url");
    if (error) throw new ToolError(error.message);
    if (!data || data.length === 0) throw new ToolError(`No book with slug "${slug}"`);
    return {
      content: [{ type: "text", text: JSON.stringify(data[0]) }],
      structuredContent: { book: data[0] },
    };
  },
});
