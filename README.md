# Novel Nest

Book Reader — Project Spec

Last updated: September 10, 2026

Overview

A personal book reader website: give it a link, it extracts the actual novel content (stripping everything that isn't the story), builds a readable, customizable library out of it, and lets you export or read across devices. Designed to work with both fully-published novels (one link to a table of contents) and ongoing serialized web fiction (one link per chapter, including still-updating stories).

Core Concept

Paste a link. The extractor parses the page and keeps only what's actually copyable novel content — story text, not nav bars, ads, comments, sidebars, or site chrome.

Two link types are supported:

Index link — a table-of-contents page that links out to every chapter; adds the whole book in one go.

Per-chapter link — a single chapter page; the app follows "next chapter" links to pull in the rest as they're published.

The app auto-detects which of the two a given URL is, so there's one input box, not a mode picker.

Feature List

1. Content Ingestion & Extraction

Strip everything that isn't novel content: nav, ads, breadcrumbs, sidebars, author's notes, share buttons, comment sections

Readability-style extraction that works across differently-structured sites without hand-written per-site rules

Automatic "next chapter" link following for chapter-chain books

Auto-detection of index-mode vs. chapter-chain mode from a single URL

Politeness/rate-limiting so a full-novel crawl doesn't hammer the source site

Content quality checks — flag chapters that came back too short or garbled, so a bad parse doesn't silently corrupt the library

2. Library & Metadata Management

Auto-scraped metadata on import: title, author, cover image

Fully editable metadata — title, author, cover image, overridable at any time, with a "revert to scraped" option since the auto-scrape is sometimes wrong or missing

Per-chapter title editing (scraped chapter titles are often junk on web novel sites)

Series name + volume/book number field

Tag and group books by series

"Continue reading" shelf / library overview

3. Reader Experience

Multiple themes: light, dark, sepia/paper, plus a custom color picker

Auto dark mode based on system time

Font size, font family, line height, letter spacing, and margin/column width controls

Reading progress bar with resume-where-you-left-off

In-book search

Highlights and annotations with personal notes

Text-to-speech (read aloud)

Reading stats: words read, pace, streak, estimated time to finish

4. Accounts & Sync — Login/Signup

Sign up / log in (email + password, JWT-based, BCrypt-hashed — same pattern as the SettleUp project)

Guest / local-only mode — the app works with zero sign-up; an account is only needed the moment you want cross-device sync

Signing in ties the following to your account and keeps it synced across devices:

Saved chapter position / reading progress per book (the core ask — resume exactly where you left off on any device)

Reading stats

Your library (added books + your metadata edits)

Bookmarks, highlights, and notes

Theme/font/layout preferences

Subscribed books and notification settings

Access + refresh token pair, so mobile sessions don't force frequent re-login

Token storage appropriate to platform (httpOnly cookie on the web build; device Keychain once wrapped as a native/Capacitor app)

If ever published to the App Store with a social login option, Sign in with Apple would need to be offered alongside it (not a concern for a personal-device-only install)

5. Update Tracking & Notifications

Subscribe to ongoing/still-updating novels

Periodic re-check of the source for newly published chapters

Notify when a new chapter is found

Real push notifications become practical once wrapped as a native app (iOS Safari/PWA push is limited)

6. Export

EPUB

PDF

Plain text / Markdown

MOBI (via EPUB conversion) for older Kindles

Exports pull cover/title/author from your edited metadata automatically — no separate export settings to fill in twice

7. Mobile & Cross-Platform

Responsive, touch-first web UI: swipe gestures and tap zones for page/chapter navigation

Safe-area handling for the notch/Dynamic Island

Installable as a PWA (home-screen icon, closer to native feel)

Offline caching of downloaded chapters, so reading doesn't require a live connection

Upgrade path to a real app when ready: Capacitor wrap (fastest, wraps the existing React app) → React Native (better native feel, more rework) → full native SwiftUI (most work, best feel)

No paid Apple Developer account needed for a personal-device-only install — only required for public App Store distribution

8. AI/LLM-Assisted Extras

Auto-generated "previously on" recaps for long-running series

Running character/glossary tracker for casts too big to keep straight

Auto-translation for non-English sources

9. Image Handling

Download and properly embed inline illustrations in exports rather than dropping them

first present me designs of this ideas (name of this app is Marginal)

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://novel-stream-reader.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cf152f9a-4819-414a-b50b-0560a849f17b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
