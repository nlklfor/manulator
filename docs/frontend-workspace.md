# Workspace page (frontend)

The workspace is the detail view of one manuscript page. It opens when a user clicks a page in the library (`/manuscript/<id>`). The scanned image is on the left, the transcription is on the right.

The page only displays and edits a transcription. Running the recognition (calling the backend and the models) is done by the AI/ML team, see [Handoff for the ML team](#handoff-for-the-ml-team).

## Files

| File                                                           | Purpose                                                                                       |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/app/(dashboard)/manuscript/[id]/page.tsx`                 | Route. Awaits `params` (a Promise in Next.js 15+) and renders `WorkspacePage`.                |
| `src/features/workspace/components/WorkspacePage.tsx`          | Top bar (breadcrumb, status, Re-transcribe, Export) and the two panels. Holds the `lines`.    |
| `src/features/workspace/components/ImageViewer.tsx`            | Left panel: zoom in/out, fit, drag to pan.                                                    |
| `src/features/workspace/components/TranscriptionPanel.tsx`     | Right panel: empty state with model picker, "transcribing" state, filter tabs.                |
| `src/features/workspace/components/TranscriptionLines.tsx`     | The editable list of lines (select, edit, keyboard navigation).                               |
| `src/features/workspace/types.ts`                              | `TranscriptionLine`, the shape of one line.                                                   |
| `src/features/upload-manuscript/context/LibraryContext.tsx`    | Shares the library state with every page through `useLibrary()`.                              |
| `src/app/providers.tsx`                                        | Client wrapper that mounts `LibraryProvider`. Used in the dashboard layout.                   |
| `src/features/upload-manuscript/components/ManuscriptCard.tsx` | The card image and name link to `/manuscript/<id>`. The delete button stays outside the link. |

## Shared library state

The library page and the workspace must read the same list of uploaded pages. Each call to `useFileSelection()` creates its own copy of the state, so components use `useLibrary()` instead. `LibraryProvider` is mounted through `providers.tsx` in `src/app/(dashboard)/layout.tsx`, so it lives for as long as the user is inside the dashboard: it survives navigation between the library and the workspace, it is not created on the sign-in pages (no requests before login), and it is discarded when the user leaves the dashboard (for example on logout).

The library lives in browser memory only. After a page refresh the workspace shows "Manuscript not found" until the backend can list the uploaded manuscripts (`GET /upload-manuscripts` does not exist yet).

## States of the right panel

The panel follows the status of the page (`LibraryEntry.status`):

1. `uploaded`: "Not transcribed yet", the **Recognition model** dropdown and the **Transcribe page** button.
2. `transcribing`: a spinner while the model works.
3. `transcribed` or `corrected`: the list of lines. Click a line to select it, click again or press Enter to edit, Enter saves, Esc cancels, arrow up/down move. Words with low confidence are underlined. The **Needs review** tab shows only lines that still have uncertain words. Saving a line sets the status to `corrected`.

**Re-transcribe** (top bar, only after a transcription) clears the lines and goes back to state 1.

## Handoff for the ML team

Everything the page needs from the transcription flow is in `handleTranscribe` in `WorkspacePage.tsx`. It is called with the id of the model chosen in the dropdown. Today it only sets the status to `transcribing`.

To connect the real flow:

1. Call the backend with the manuscript id (`entry.id`) and the model id. The backend already has `PUT /api/process-manuscripts/{id}` (Detect Lines step).
2. Map the result to a list of `TranscriptionLine`:
   ```ts
   interface TranscriptionLine {
     n: number; // line number, starting at 1
     text: string; // the transcribed text
     confidence: number; // 0-100 for the whole line
     lowConfWords: number[]; // indices of the words the model is unsure about
   }
   ```
3. Call `setLines(lines)` and `updateEntryStatus(entry.id, "transcribed")`. If it fails, set the status back to `uploaded`.

The model list (`HTR_MODELS` in `TranscriptionPanel.tsx`) is a placeholder. Replace it with the models the backend offers.

The `lines` are kept in the state of `WorkspacePage`, so they are lost when the user leaves the page. If they should survive navigation, move them into `LibraryContext`.

## Not done yet

- **Export:** the button is shown but disabled. There is no export dialog or download.
- **Persistence:** the library is not stored, see above.
- **PDF preview:** PDFs show a placeholder instead of the page.
