# Feature Spec: Album Intake Form

**Status:** Ready for implementation  
**Priority:** High  
**Depends on:** `PROJECT_CONTEXT.md`

---

## Overview

Build a mobile-optimized album intake form on the personal website that allows the owner to add new albums to the live database from their phone. The form is protected behind a 4-digit PIN gate. It uses the iTunes Search API to autocomplete album and artist information, and accepts a manual rating. On submission, the new entry is written to the data store.

This feature has a planned Phase 2 (AI enrichment) described at the end of this document. Phase 1 is the MVP scope.

---

## User Story

> As the site owner, I want to open a protected page on my phone, search for an album by name, select it from autocomplete results, assign a rating, and submit it to my live album database — without touching a computer.

---

## Phase 1 Scope (Implement Now)

### Route

Add a new protected route at `/intake` (or `/admin/intake` — check existing route structure in `src/App.tsx` and match the pattern).

The route renders either the PIN gate or the intake form depending on auth state. Auth state is stored in `sessionStorage` so the PIN is not re-required within the same browser session.

---

### PIN Gate

- Renders a 4-digit PIN entry UI before showing the form.
- The correct PIN is stored as an environment variable: `VITE_INTAKE_PIN`.
  - At build time, Vite injects this as `import.meta.env.VITE_INTAKE_PIN`.
  - **The agent must not hardcode any PIN value.** Add `VITE_INTAKE_PIN=` to `.env.local` (gitignored) and document that the user must set this.
- On correct PIN: store a flag in `sessionStorage` (e.g. `sessionStorage.setItem('intake_auth', '1')`) and show the form.
- On incorrect PIN: show an error message. Do not lock out after failed attempts (this is a personal tool, not a security-critical system).
- Auto-focus the PIN input on mount for fast phone use.
- Design: 4 individual single-digit inputs that auto-advance on each digit entry, similar to standard OTP inputs. Clear on incorrect attempt.

---

### Intake Form Fields

#### 1. Album Search / Autocomplete

- A single text input labeled "Search Album".
- As the user types (debounced 400ms), call:
  ```
  GET https://itunes.apple.com/search?term={encodeURIComponent(query)}&entity=album&limit=8
  ```
- Display results as a dropdown list below the input. Each result shows:
  - Small album artwork thumbnail (use `artworkUrl100` directly, not the 600px version, for the dropdown)
  - Album name (`collectionName`)
  - Artist name (`artistName`)
- When the user selects a result:
  - Populate the album name field (see below) with `collectionName`
  - Populate the artist name field (see below) with `artistName`
  - Store the full iTunes result object in component state for use at submission time
  - Store the artwork URL (replace `100x100bb` with `600x600bb`) for submission
  - Dismiss the dropdown
- If the query returns zero results, show a "No results found" message in the dropdown.
- Handle network errors gracefully with a brief error message.

#### 2. Album Name

- Text input, label "Album".
- Pre-populated from autocomplete selection but **editable** — the user should be able to correct the name if the iTunes result is slightly wrong.
- Required field.

#### 3. Artist Name

- Text input, label "Artist".
- Pre-populated from autocomplete selection but **editable**.
- Required field.

#### 4. Rating

- Number input (or custom stepper), label "Rating".
- Range: 0.0 to 10.0 inclusive.
- Step: 0.1 (allows one decimal place).
- Display the current value prominently near the input.
- Required field. Default value: leave empty (do not default to 0 — a 0 rating looks like an unrated entry).
- Validation: reject values outside [0.0, 10.0]. Reject more than 1 decimal place.

---

### Form Submission

On submit:
1. Validate all required fields.
2. Build the new album object. Fields the form populates directly:
   ```typescript
   {
     Album: string,         // from Album Name field
     Artist: string,        // from Artist Name field
     Rating: number,        // from Rating field
     CoverArt: string,      // 600x600 artwork URL from iTunes result (or "" if no iTunes match)
     AppleMusicLink: string,// collectionViewUrl from iTunes result (or "")
     TrackCount: number,    // from iTunes result (or 0)
     ExactReleaseDate: string, // from iTunes releaseDate, trimmed to "YYYY-MM-DD" (or "")
   }
   ```
3. Fields left for Phase 2 AI enrichment (set placeholder values):
   ```typescript
   {
     Year: 0,              // placeholder — will be filled by AI agent in Phase 2
     Genres: [],           // placeholder — will be filled by AI agent in Phase 2
     Length: "",           // placeholder — will be filled by AI agent in Phase 2
   }
   ```
   **Verify these placeholder values against the actual Album-Data.json schema** — use values that won't break existing rendering code (e.g. check how `Year` and `Genres` are used in the UI).
4. Send the new entry to the data store (see **Data Persistence** section below).
5. On success: show a success message, clear the form, and keep the user on the page (do not redirect).
6. On failure: show an error message with the reason.

---

### Data Persistence

**DECISION POINT — The owner must choose one approach before implementation. The recommended option is flagged.**

#### Option A: Supabase (RECOMMENDED for new implementations)

Supabase provides a hosted PostgreSQL database with a REST API and JS client library.

- Install: `npm install @supabase/supabase-js`
- Create a Supabase project, create a table called `albums` with columns matching `AlbumEntry`.
- Store credentials in `.env.local`:
  ```
  VITE_SUPABASE_URL=https://xxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGci...
  ```
- On form submit, call `supabase.from('albums').insert([newAlbum])`.
- The existing `Album-Data.json` would need a one-time migration into Supabase (out of scope for this ticket — create the table and handle migration separately).
- The existing music section of the site would need to be updated to read from Supabase instead of the JSON file (out of scope for this ticket — flag this as a follow-up).

**Supabase free tier supports this use case. Row-Level Security (RLS) can be configured so only authenticated users can write, but since this app has no auth system beyond the PIN, disabling RLS or using a service role key in a Netlify/Vercel serverless function is fine for a personal project.**

---

#### Option B: GitHub Contents API (Zero New Infrastructure)

Uses the GitHub REST API to read, update, and commit `src/data/Album-Data.json` directly from the browser. Keeps data in the same place it already lives.

- Requires a GitHub Personal Access Token (PAT) with `contents: write` permission for the repo.
- Store the token in `.env.local`:
  ```
  VITE_GITHUB_TOKEN=ghp_...
  VITE_GITHUB_REPO=Dylfive/Personal-Website
  VITE_GITHUB_FILE_PATH=src/data/Album-Data.json
  VITE_GITHUB_BRANCH=main
  ```
- **WARNING:** Storing a GitHub PAT in a Vite env variable means it is bundled into the static site JS and is visible to anyone who inspects the build. This is acceptable only for a private personal tool where the risk is understood. Mitigate by using a fine-grained PAT scoped only to this repo and this file.
- Implementation pattern:
  ```
  GET https://api.github.com/repos/{repo}/contents/{path}
  → returns { content: base64, sha: string }

  PUT https://api.github.com/repos/{repo}/contents/{path}
  → body: { message, content: base64(updatedJSON), sha }
  ```
- On form submit: fetch current file → decode base64 → parse JSON → push new entry → re-encode → PUT back.
- Each submission creates a Git commit with the new album in the message.

---

#### Option C: Serverless Function (Best Security, More Setup)

Deploy a Netlify or Vercel function that accepts a POST request containing the new album, then writes to Supabase or GitHub on the server side — keeping credentials off the client entirely.

- Most secure option.
- Requires deploying to Netlify/Vercel (check if the site is already deployed there).
- Out of scope to specify fully here; use Option A or B first.

---

**If the owner has not chosen, implement Option B (GitHub Contents API) as it requires no new services and keeps data in the existing JSON file. Add a TODO comment at the top of the write utility noting that Supabase (Option A) is the recommended upgrade path.**

---

## File Structure for New Code

Create the following files (paths relative to `src/`):

```
src/
├── pages/
│   └── IntakePage.tsx          ← Page component; handles PIN gate vs form rendering
├── components/
│   └── intake/
│       ├── PinGate.tsx          ← 4-digit PIN entry UI
│       ├── AlbumIntakeForm.tsx  ← Main form component
│       ├── AlbumSearchInput.tsx ← iTunes autocomplete input + dropdown
│       └── RatingInput.tsx      ← Rating input with display
├── hooks/
│   └── useItunesSearch.ts      ← Debounced iTunes API search hook
├── lib/
│   └── albumStore.ts           ← Data persistence utility (GitHub API or Supabase)
└── types/
    └── album.ts                ← AlbumEntry interface (if not already defined)
```

Check whether `src/pages/`, `src/components/`, `src/hooks/`, `src/lib/`, and `src/types/` directories already exist and follow the existing folder structure rather than creating new top-level directories if the project uses a different convention.

---

## Routing Integration

Add the `/intake` route to the existing router in `src/App.tsx`. No layout wrapper is required unless one is already used globally — check the existing route definitions.

```tsx
<Route path="/intake" element={<IntakePage />} />
```

The route does not need to be linked from the main navigation (it's a private tool), but it must be reachable by direct URL.

---

## Design Requirements

- **Mobile-first.** The form will primarily be used on a phone. Design for a narrow viewport (~390px). Large tap targets, generous padding.
- Match the existing site's visual style. Read the existing component files and Tailwind config to understand the color palette and typography.
- The PIN gate and form should be visually clean and minimal — this is a utility screen, not a showpiece.
- Show a loading spinner or disabled state while the iTunes API is being called.
- Show a loading/submitting state while the form is being submitted.

---

## Acceptance Criteria

- [ ] `/intake` is a valid route reachable by direct URL.
- [ ] Visiting `/intake` without a session shows the PIN gate.
- [ ] Entering the correct PIN (from `VITE_INTAKE_PIN`) reveals the form. Session persists within the tab.
- [ ] Entering an incorrect PIN shows an error and clears the inputs.
- [ ] Typing in the album search field triggers an iTunes API call (after 400ms debounce) and shows a dropdown of results.
- [ ] Selecting a result populates Album Name, Artist Name, and stores artwork/metadata.
- [ ] Album Name and Artist Name fields are editable after autocomplete.
- [ ] Rating field accepts values from 0.0 to 10.0 in 0.1 increments only.
- [ ] Rating field rejects values outside that range.
- [ ] Submitting the form with any required field empty shows a validation error.
- [ ] A valid submission writes the new album to the data store and shows a success message.
- [ ] The form clears after a successful submission.
- [ ] A failed submission shows an error message and does not clear the form.
- [ ] The page is usable on a 390px-wide viewport without horizontal scrolling.
- [ ] `VITE_INTAKE_PIN` is documented in a `.env.example` file at the repo root.
- [ ] `.env.local` is listed in `.gitignore` (verify it already is).

---

## Out of Scope (Phase 2 — Document, Do Not Implement)

The following is planned but not part of this implementation. Leave stub comments or TODOs where relevant.

**AI Enrichment Flow:**
After the user submits the form, an AI agent will:
1. Receive the album name and artist.
2. Research the album (year, genres, total length).
3. Show the user a confirmation/review screen with the AI-filled data before writing to the database.
4. The user confirms or edits, then the record is committed.

This means the current submission flow (write immediately on submit) may need to be refactored in Phase 2 into a two-step "draft → confirm → commit" pattern. Design the data flow in `albumStore.ts` with this in mind — consider separating the "prepare entry" step from the "write entry" step so Phase 2 can insert a review step between them.

---

## Environment Variables Reference

| Variable | Purpose | Required |
|---|---|---|
| `VITE_INTAKE_PIN` | 4-digit PIN for the intake form | Yes |
| `VITE_GITHUB_TOKEN` | GitHub PAT (Option B only) | If using Option B |
| `VITE_GITHUB_REPO` | `owner/repo` (Option B only) | If using Option B |
| `VITE_GITHUB_FILE_PATH` | Path to Album-Data.json (Option B only) | If using Option B |
| `VITE_GITHUB_BRANCH` | Target branch (Option B only) | If using Option B |
| `VITE_SUPABASE_URL` | Supabase project URL (Option A only) | If using Option A |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (Option A only) | If using Option A |

Create a `.env.example` file at the repo root with all variables listed (values left blank) so the owner knows what to configure.

---

## Agent Checklist (Run in This Order)

1. Read `src/data/Album-Data.json` to confirm the exact field names and value formats in use.
2. Read `src/App.tsx` to understand the existing router setup and route structure.
3. Read at least one existing page component to understand layout patterns and class conventions.
4. Read `tailwind.config.js` for any custom colors, fonts, or spacing.
5. Ask the owner which data persistence option (A, B, or C) to use — or default to Option B per the spec.
6. Implement PIN gate, intake form, and data persistence layer.
7. Register the new route in `src/App.tsx`.
8. Create `.env.example`.
9. Verify `.env.local` is in `.gitignore`.
10. Run `npm run build` and confirm no TypeScript errors.
