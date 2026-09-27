This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Frontend source code lives in `src/`. Use the following guide when adding files:

| Path                                 | Put this here                                                                                                                                                                      |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`                           | Next.js App Router routes and route-level files such as `page.tsx`, `layout.tsx`, `loading.tsx`, and `error.tsx`. Keep pages focused on composing the relevant feature components. |
| `src/app/(public)/`                  | Routes and layouts for pages available outside the authenticated dashboard. Parentheses make this a route group and do not appear in the URL.                                      |
| `src/app/(dashboard)/`               | Routes and layouts for the authenticated dashboard area. This is also a route group and does not appear in the URL.                                                                |
| `src/app/api/`                       | Next.js Route Handlers, when the frontend needs server-side endpoints. Keep the main application API in the Python backend unless an endpoint specifically belongs in Next.js.     |
| `src/features/<feature>/`            | Code owned by one product feature, for example `upload-image` or `auth`. Prefer keeping feature code together rather than splitting it into global folders.                        |
| `src/features/<feature>/api/`        | Feature-specific API calls and request/response handling. Put shared API configuration in `src/lib/api/`.                                                                          |
| `src/features/<feature>/components/` | Components used only by that feature.                                                                                                                                              |
| `src/features/<feature>/hooks/`      | Hooks used only by that feature.                                                                                                                                                   |
| `src/features/<feature>/types/`      | Types used only by that feature.                                                                                                                                                   |
| `src/components/ui/`                 | Reusable, feature-independent UI primitives.                                                                                                                                       |
| `src/components/layout/`             | Shared application shell components such as navigation, headers, or sidebars.                                                                                                      |
| `src/hooks/`                         | Hooks genuinely shared by multiple features. Keep feature-only hooks in their feature folder.                                                                                      |
| `src/lib/api/`                       | Shared API client, transport, and configuration.                                                                                                                                   |
| `src/lib/constants/`                 | Constants shared across the application. Feature-specific constants belong in the feature folder.                                                                                  |
| `src/lib/helpers/`                   | Small, general-purpose helpers shared across features. Feature-specific helpers belong in the feature folder.                                                                      |
| `src/types/`                         | Types shared across features. Keep feature-only types local to their feature.                                                                                                      |
| `public/`                            | Static files served directly, such as images and icons. Reference these by their path from the site root.                                                                          |

Add code to a feature folder first when it has a clear feature owner. Move it into a shared folder only when multiple parts of the application use it. Route groups can have their own `layout.tsx`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
