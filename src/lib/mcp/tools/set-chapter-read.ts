import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "set_chapter_read",
  title: "Mark chapters read or unread",
  description: "Mark a range of chapters in a book as read or unread.",
  inputSchema: {
    slug: z.string().trim().min(1).describe("Book slug from list_books."),
    from: z.number().int().min(1).describe("First chapter number in the range."),
    to: z.number().int().min(1).optional().describe("Last chapter number (defaults to `from`)."),
    read: z.boolean().describe("True marks read, false marks unread."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ slug, from, to, read }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const end = to ?? from;
    if (end < from) throw new ToolError("`to` must be greater than or equal to `from`.");
    const supabase = supabaseForUser(ctx);
    const { data: book, error } = await supabase
      .from("books")
      .select("id,title")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!book) throw new ToolError(`No book with slug "${slug}"`);
    const { data, error: upErr } = await supabase
      .from("chapters")
      .update({ read })
      .eq("book_id", book.id)
      .gte("n", from)
      .lte("n", end)
      .select("n");
    if (upErr) throw new ToolError(upErr.message);
    const updated = data?.length ?? 0;
    return {
      content: [
        { type: "text", text: `${updated} chapter(s) of "${book.title}" marked ${read ? "read" : "unread"}.` },
      ],
      structuredContent: { updated, read },
    };
  },
});
