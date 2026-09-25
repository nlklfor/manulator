# manulator

Upload a historical manuscript, get it recognized and translated.

Team project for the Advanced Software Engineering course (Swiss Joint Master of Computer Science).

## Tech stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL
- **ML:** PyTorch, handwritten text recognition models

## Project structure

```
frontend/   Next.js app
backend/    FastAPI app
ml/         models and experiments
doc/        project documentation
```

## Getting started (frontend)

Requirements: Git and Node.js 20.9 or newer.

```bash
git clone https://github.com/nlklfor/manulator.git
cd manulator/frontend
npm install      # also sets up the git hooks (Husky)
npm run dev      # http://localhost:3000
```

## Workflow

### Branches

- `main`: stable version, updated at the end of each sprint
- `dev`: integration branch, all pull requests go here
- one branch per task, created from `dev`: `feature/12-upload-page`, `fix/18-zoom-bug`, `docs/...`, `chore/...`

Open a pull request into `dev`. It needs a green CI check and one approval before merging.

### Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org): `<type>: <short description>`

| Type       | Use for                          | Example                               |
| ---------- | -------------------------------- | ------------------------------------- |
| `feat`     | a new feature                    | `feat: add page upload form`          |
| `fix`      | a bug fix                        | `fix: correct zoom reset in viewer`   |
| `docs`     | documentation                    | `docs: add architecture diagram`      |
| `style`    | formatting only                  | `style: format viewer component`      |
| `refactor` | code change without new behavior | `refactor: split viewer into parts`   |
| `test`     | tests                            | `test: add upload form tests`         |
| `chore`    | setup, config, dependencies      | `chore: add husky and commitlint`     |

### Automatic checks

- **On every commit (Husky):** ESLint and Prettier check the frontend, and commitlint checks the commit message. If something fails, the commit is stopped. Fix formatting with `npm run format`.
- **On every pull request (GitHub Actions):** the same lint and format checks, plus a production build.
