# Atmospheric book screen overhaul

## Changes
- Rebuild the book screen as an atmospheric Reading Desk: a sticky plum identity panel on desktop and editorial single-column flow on phones.
- Add a prominent Continue reading action with accurate chapter and progress context.
- Replace auto-saving book fields with a draft form, explicit Save details button, and clear changed/saving/saved feedback so stale values are not mistaken for saved data.
- Keep title, author, series, volume, cover link, and tags editable without mobile overflow.
- Add chapter search and compact status filters for large books.
- Replace repeated arrow taps with a direct “move to chapter position” action while retaining read/unread and delete controls.
- Make chapter titles responsive, editable, and contained at narrow widths; keep add/fetch chapter controls usable on phones.
- Apply the selected Plum Archive palette and Lora/Nunito Sans typography while preserving existing light/dark behavior.

## Technical details
- Extend the existing chapter move action to accept a target position and safely reorder the affected range under the current unique ordering rule.
- Keep the current book, chapter, export, delete, and reader actions; invalidate and refresh cached book/library data after mutations.
- Use semantic design tokens and responsive min-width/grid constraints throughout.

## Verification
- Check desktop and phone layouts with a real long-title, 269-chapter book.
- Verify save feedback, search/filtering, direct reorder, read/unread, add chapter, and Continue reading.
- Confirm no horizontal overflow and a clean build.
