# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS deployed to GitHub Pages (an-rock.github.io). Data stored in `games.json` committed to repo. No build step.

## Users

Primary user: the site owner (LO). Personal use — a private curation tool for tracking and reviewing Roblox underrated games. No public accounts, no multi-user features. The admin panel is gated by device trust + credentials, only accessible on the owner's trusted device or the deployed GitHub Pages domain.

## Product Purpose

A personal list for tracking Roblox games the owner has played or plans to play. Each entry captures: title, cover image, description/review, status (played / plan to play), star rating (0–5), date added, and Roblox URL. The site renders these as a filterable, responsive grid of "sticky note" cards. Success means: the owner can quickly add games from their phone or desktop, filter to see what they've played vs. planned, and have the data persist in GitHub (source of truth) with localStorage backup.

## Positioning

Not a public review site, not a discovery engine. It's a personal "games journal" — the mechanism is a private-by-default CRUD interface backed by a flat JSON file in a Git repo. A neighboring product could not truthfully copy the "personal curation + Git-backed persistence + zero backend" combination.

## Operating Context

- Deployed at `an-rock.github.io` (GitHub Pages from `an-rock/r-games` repo, `main` branch)
- Data source: `games.json` at repo root
- Admin auth: obfuscated credentials in `script.js` + device trust (localStorage flag or hostname check)
- GitHub push: Personal Access Token (repo scope) stored in localStorage, pushes `games.json` updates via GitHub Contents API
- Import/export: manual JSON file download/upload for backup/migration
- Filtering: All / Played / Plan to Play / Favorites (favorite flag exists in schema but not yet wired in UI filter)
- Rating: 0–5 stars, displayed as ★/☆
- Cover images: hosted on Roblox CDN (`tr.rbxcdn.com`)

## Capabilities and Constraints

**Confirmed functionality:**
- View games grid with sticky-note card aesthetic (subtle rotation, cover background, tape decoration)
- Filter by status: All / Played / Plan to Play / Favorites
- Admin panel: add, edit, delete games (modal forms)
- Star rating (0–5) with visual stars
- Date added (defaults to today)
- Roblox URL link opens in new tab
- Light/dark mode via `prefers-color-scheme`
- Responsive: single column < 768px, grid ≥ 768px
- Toast notifications for actions
- Export/import `games.json`
- Push to GitHub (updates remote `games.json`)

**Technical constraints:**
- No build step, no framework — plain ES modules would require CORS/server, so single script.js with IIFE-style init
- GitHub Pages = static hosting only; no server-side logic
- GitHub Contents API rate limits apply on push
- Admin credentials obfuscated but not encrypted (client-side only)
- Device trust relies on localStorage + hostname check
- Favorites filter exists in nav but not implemented in render logic
- No search implemented (search input in header is decorative in current HTML)

**Terminology:**
- "Game" = a Roblox experience entry
- "Status" = played | plan-to-play (favorite is a boolean flag, not a status)
- "Cover" = Roblox thumbnail URL (450×270 180deg format)

**Explicitly undecided:**
- Whether to add search functionality
- Whether favorites should be a filter or a badge on cards
- Whether to add tags/genres/categories
- Whether to support multiple users or keep single-owner

## Brand Commitments

- Name: "My Roblox Games" (in `<title>`)
- Footer disclaimer: "Data in `games.json` — Not affiliated with Roblox Corporation"
- Visual identity: warm paper aesthetic (light), deep charcoal (dark), terracotta accent (#c85c3c / #e07a5a)
- Typography: Inter (UI), JetBrains Mono (code/meta), Source Code Pro + Verdana (loaded but not used in current CSS)
- No external analytics, tracking, or third-party scripts beyond Google Fonts and Roblox CDN

## Evidence on Hand

- `games.json`: 4 sample entries (Brookhaven, Adopt Me!, Blade Ball, DOORS) with real Roblox cover URLs and URLs
- Deployed at: `https://an-rock.github.io` (inferred from GitHub config)
- Repo: `an-rock/r-games` (public)
- Admin credentials: obfuscated in `script.js` (username: "adm", password: "||||||||||" — 10 pipes)
- GitHub PAT: stored in localStorage after first entry, not in repo

## Product Principles

1. **Personal first** — every feature serves the owner's workflow; no concession to hypothetical public users
2. **Data ownership** — source of truth lives in a Git repo the owner controls; localStorage is a cache, not the master
3. **Zero backend** — static hosting only; all "backend" ops (push, auth) happen client-side via GitHub API
4. **Refined minimalism** — sticky-note cards, subtle motion, warm palette; personality without clutter
5. **Resilient offline** — localStorage backup means the UI works even if GitHub is unreachable

## Accessibility & Inclusion

- Semantic HTML: `<article>` for cards, `<main>`, `<header>`, `<footer>`, `<nav>`, `<aside>`
- Focus-visible outlines on all interactive elements
- ARIA labels on icon-only buttons (edit, delete, admin)
- Color contrast: WCAG AA targeted in both themes (terracotta on white/charcoal)
- `prefers-color-scheme` respected; no forced theme toggle
- `prefers-reduced-motion` not yet handled (animations run regardless)