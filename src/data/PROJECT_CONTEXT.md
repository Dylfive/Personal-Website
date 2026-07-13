# Project Context: Personal Website (Dan's Portfolio)

**Repo:** https://github.com/Dylfive/Personal-Website  
**Branch:** `main`  
**Owner:** Dylfive

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5.5 |
| Build tool | Vite 6 |
| Styling | Tailwind CSS 3.4 |
| Routing | React Router DOM v7 |
| Animations | Framer Motion 12 |
| Icons | Lucide React |
| Utility | clsx, tailwind-merge |

This is a **fully static site** — no backend, no server-side rendering. All data is committed to the repo and bundled at build time.

---

## Known Repository Structure

```
/
├── public/
├── src/
│   └── data/
│       └── Album-Data.json        ← Primary album data store
├── fetch_covers.cjs               ← Node script: enriches Album-Data.json via iTunes API
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.app.json
└── tsconfig.json
```

**IMPORTANT:** Before writing any new code, read `src/data/Album-Data.json` to confirm the exact field names and data shape currently in use. The schema below is inferred — the actual file is the source of truth.

---

## Known Data Schema (Album-Data.json)

Inferred from `fetch_covers.cjs` and project context. The file is an array of album objects.

```typescript
interface AlbumEntry {
  Album: string;              // Album title
  Artist: string;             // Artist name
  Rating: number;             // User rating, 0.0–10.0 (1 decimal place)
  Year: number;               // Release year
  Genres: string[];           // Genre tags (exact format TBD — verify in file)
  Length: string | number;    // Album duration (format TBD — verify in file)
  CoverArt: string;           // URL to artwork (600x600 Apple CDN or "Not Found")
  AppleMusicLink: string;     // URL to Apple Music album page
  TrackCount: number;         // Number of tracks
  ExactReleaseDate: string;   // ISO 8601 date string (e.g. "1991-09-24")
}
```

Fields written by `fetch_covers.cjs`: `CoverArt`, `AppleMusicLink`, `TrackCount`, `ExactReleaseDate`.  
Fields expected to already exist in the file before enrichment: `Album`, `Artist`, `Rating`, `Year`, `Genres`, `Length`.

---

## iTunes Search API (Already Used in Project)

The project already calls the iTunes Search API in `fetch_covers.cjs`. The same API powers autocomplete in the new intake form.

**Endpoint:**
```
GET https://itunes.apple.com/search?term={query}&entity=album&limit={n}
```

**Key response fields per result:**
```json
{
  "artistName": "Radiohead",
  "collectionName": "OK Computer",
  "artworkUrl100": "https://...100x100bb.jpg",
  "collectionViewUrl": "https://music.apple.com/...",
  "trackCount": 12,
  "releaseDate": "1997-05-21T07:00:00Z"
}
```

**Notes:**
- Replace `100x100bb` with `600x600bb` in `artworkUrl100` to get high-res artwork (existing convention in project).
- CORS is supported — this API can be called directly from the browser.
- Debounce autocomplete requests at **400ms** to avoid rate limits.
- The existing `fetch_covers.cjs` script sleeps 2500ms between calls; the browser form can be more aggressive since it's user-paced.

---

## Coding Conventions (Inferred)

- All source files in `src/` use TypeScript (`.ts` / `.tsx`).
- Component files use PascalCase (e.g. `AlbumCard.tsx`).
- Data/utility files use kebab-case or existing naming convention — match what already exists.
- Tailwind utility classes for all styling; no separate CSS files for components.
- Use `clsx` and `tailwind-merge` (both in dependencies) for conditional class merging.
- Framer Motion available for transitions and animations if needed.
- Lucide React for any icons.
- React Router DOM v7 used for routing — use `<Route>` components, check `src/App.tsx` to see the existing router setup and match its pattern.

---

## Deployment Context

- Static site deployed as a SPA (single-page application).
- No existing backend or API routes.
- Any write operations require an external service or the GitHub Contents API.
- See `ALBUM_INTAKE_SPEC.md` for the recommended approach to handling writes.
