# Sharing (frontend)

A user can send another user a **copy** of a manuscript, by typing their username or by creating a
link that works for 24 hours. The copy appears in the other user's library with a
"Shared by @username" badge. The backend does the copying (see `backend/README.md`, Sharing).

## Files

| File                                                        | Purpose                                                                                                                                                              |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/sharing/api/shareWithUser.ts`                 | `POST /api/upload-manuscripts/{id}/share`                                                                                                                            |
| `src/features/sharing/api/shareLinks.ts`                    | Create, list, revoke, preview and accept share links                                                                                                                 |
| `src/features/sharing/components/ShareDialog.tsx`           | Native `<dialog>` (like `EditManuscriptDialog`) with the tabs "Username" and "Link" (`Segmented`). Escape closes it.                                                 |
| `src/features/sharing/components/ShareUsernameTab.tsx`      | Username field and Send. Errors under the field: 404 "No user with this username", 400 "You can't share with yourself", 409 "Wait until transcription has finished". |
| `src/features/sharing/components/ShareLinkTab.tsx`          | "Create link", the link with Copy ("Copied ✓" for 2 s) and "Expires in 24 h", and the active links with Revoke.                                                      |
| `src/features/sharing/components/ShareLinkPreview.tsx`      | The `/share/<token>` page: title, document type, pages, "Shared by", and "Add to my library".                                                                        |
| `src/features/sharing/components/SharedByBadge.tsx`         | "Shared by @username" on library cards.                                                                                                                              |
| `src/app/(dashboard)/share/[token]/page.tsx`                | Route of a share link.                                                                                                                                               |
| `src/features/auth/username.ts`                             | Username rules (3–30 characters, `a-z`, `0-9`, `_`), shared by registration and the profile page.                                                                    |
| `src/features/profile/components/UsernameCard.tsx`          | Shows and changes the username on the profile page.                                                                                                                  |
| `src/features/profile/components/MissingUsernameBanner.tsx` | Asks accounts without a username to choose one.                                                                                                                      |
| `src/lib/auth/redirect.ts`                                  | `?next=` after login (see below).                                                                                                                                    |

## Where it shows

- **Workspace:** a **Share** button in the top bar, next to Translate and Export. Disabled while the page is still uploading. Sharing by username shows the toast "Sent to @bob".
- **Library:** received copies show "Shared by @username"; the user's own manuscripts show nothing. The **Shared with me** chip works together with the search, the folders and the status filter.
- **Registration:** a Username field with its rules shown below it, like the password requirements. A taken name shows "Username already taken".
- **Profile:** the username can be changed; a taken name shows "Username already taken" and keeps the old one. The profile menu shows `@username` below the name.

## Share links

- The link url is only shown right after creating it: the backend stores just a hash of the token, so the list of active links has expiry and use count, but no url.
- Expired, revoked, deleted and unknown links all show "This link is no longer available" (the backend gives the same 404 for all of them, agreed in #216).
- The owner opening their own link sees "This is your manuscript" and no Add button.
- "Add to my library" makes the copy, loads the library again (`reloadLibrary()` in `useFileSelection`) and opens the copy in the workspace.

## Login and back to the link

`src/proxy.ts` sends logged-out visitors to `/auth?next=<the page they wanted>`, and `useLoginForm` opens that page after login. `safeNextPath` only allows paths inside the app (starting with one `/`), so a link can't send people to another site.
