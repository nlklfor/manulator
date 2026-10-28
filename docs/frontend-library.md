# Library folders

The sidebar groups the user's manuscripts into folders by **document type**. Nothing new is stored: the
type is the existing `manuscripts.document_type` (set in the upload form, changed in the edit form).

## How the folders work

- **Library** (top row of the sidebar) is the "All" folder. It shows every manuscript and the total.
- Below it, **Document types** has one row per folder that contains at least one manuscript, with its
  colour and number of pages. Empty folders are not shown.
- The folders are the suggestions of the upload form (`DOCUMENT_TYPES` in
  `constants/documentTypes.ts`). Anything a user typed themselves (for example "Sermon") is listed in
  **Other**. The match ignores capitalisation, so "charter" counts as "Charter".
- Clicking a folder opens the library with the address `/?type=Charter`. The open folder is therefore
  kept on reload, with the back button, and in shared links. An unknown `?type=` is ignored and
  shows everything.
- In a folder, the sort, the status filter and the name search work as usual, only on that folder's
  pages.
- Every manuscript card shows its document type exactly as typed, with the colour of its folder.

## Where the code is

| What | Where |
| --- | --- |
| Folder names, colours, grouping | `features/upload-manuscript/constants/folders.ts` |
| Sidebar rows and counts | `components/layout/Sidebar.tsx` |
| Filtering and the page title | `features/upload-manuscript/components/UploadPageCard.tsx` |
| Label on the card | `features/upload-manuscript/components/ManuscriptCard.tsx` |

`useSearchParams()` is used in the sidebar and the library page, so both are wrapped in `<Suspense>`
(`(dashboard)/layout.tsx` and `(dashboard)/page.tsx`). Without it, `next build` fails.

## Adding a document type

Add the name to `DOCUMENT_TYPES` and its colour to `FOLDER_COLORS` (`constants/folders.ts`). A type
without a colour uses the colour of "Other".

## Not done yet

- The search page and the workspace do not filter by folder; clicking a folder from there opens the
  library.
- The mobile design (`Mobile · Library`) has no folder list yet.
