# Focused recent reading and faster library browsing

## Changes

- Replace the current multi-card Continue Reading grid with the selected dual-book stack.
- Feature the most recently opened book with stronger hierarchy, progress, date, and a clear Resume reading action.
- Show only the second-most-recent book beneath it in a compact row; keep the total in-progress count visible without rendering every active book.
- Add a discreet link from Continue Reading to the full shelf.
- Add instant library search across title, author, series, and volume.
- Add sorting for recently read, recently added, title, and reading progress, with a clear empty result state.
- Keep the existing Plum Archive colors, typography, light/dark themes, and mobile-safe sizing.
- Also the cw in continue reading should be maybe the exisiitng cover art of book

## Technical details

- Derive the recent pair from `last_read_at`, limiting the rendered list to two books.
- Keep search and sort local to the already-cached library data so results update immediately without extra requests.
- Reuse semantic tokens and the existing design-system controls.

## Verification

- Check desktop and phone widths for overflow and readable long titles.
- Verify only two recent books appear, Resume opens the reader, and the full shelf remains accessible.
- Verify every search field, sort option, empty state, and cleared search.
- Confirm the project builds cleanly.