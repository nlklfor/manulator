# Manulator Backend

FastAPI backend for Manulator. Python 3.12+, managed with [uv](https://docs.astral.sh/uv/).

Dependencies are declared in `pyproject.toml`, and the exact versions are locked in `uv.lock`.
There is no `requirements.txt`.

## Setup (first time)

### 1. Install uv

```bash
# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Then **restart your terminal**. In VS Code, restart the whole editor, otherwise the new
`PATH` is not picked up. Check it with `uv --version`.

### 2. Install dependencies

Run everything from the `backend/` folder:

```bash
cd backend
uv sync
```

This creates `.venv/`, downloads Python 3.12 if needed, and installs the exact versions from
`uv.lock` (dev tools included). Run it again whenever someone changes the dependencies.

You don't need to activate the venv, because `uv run <command>` uses it automatically.

## Run the server

```bash
uv run uvicorn app.main:app --reload
```

| URL                                | What                                      |
| ---------------------------------- | ----------------------------------------- |
| http://localhost:8000              | API                                       |
| http://localhost:8000/docs         | Interactive API docs (try endpoints here) |
| http://localhost:8000/openapi.json | OpenAPI schema (Postman: Import → Link)   |

`--reload` restarts the server automatically when you save a file.

## Run tests

```bash
uv run pytest
```

## Lint and format

```bash
uv run ruff check .      # find problems
uv run ruff format .     # format code
```

CI runs the same checks (`ruff check`, `ruff format --check`, `pytest`) on every pull request and push to `dev` and `main`.

## Adding a dependency

```bash
uv add <package>          # runtime dependency
uv add --dev <package>    # dev-only (tests, linters)
```

This updates both `pyproject.toml` and `uv.lock`. Commit both files.

## Project structure

```
backend/
├── app/
│   ├── main.py          # Creates the app, CORS, registers routers
│   ├── config.py        # All settings (upload folder, limits, CORS origins)
│   ├── routers/         # API endpoints (URLs), one file per resource
│   ├── schemas/         # Request/response shapes (Pydantic models)
│   └── services/        # Business logic (the actual work)
├── tests/               # pytest tests, one file per router
├── uploads/             # Uploaded files (git-ignored)
├── test_main.http       # Example requests for the IDE HTTP client
├── pyproject.toml       # Dependencies + pytest and ruff config
└── uv.lock              # Locked dependency versions (do not edit by hand)
```

A request flows **router → service → schema**: the router receives it, the service does
the work, and the schema defines the JSON that is returned.

## Endpoints

| Method | Path                      | Description                                       |
| ------ | ------------------------- | ------------------------------------------------- |
| `GET`  | `/`                       | Welcome message                                   |
| `GET`  | `/api/health`             | Health check                                      |
| `POST` | `/api/auth/register`      | Register an account with Supabase Auth            |
| `POST` | `/api/auth/logout`        | End the Supabase session of the bearer token      |
| `POST` | `/api/upload-manuscripts` | Upload a manuscript (JPEG, PNG or PDF, max 20 MB) |

Registration expects a JSON body with `email`, `display name` and `password`. It returns `201` when
Supabase accepts the request, `409` when Supabase reports that the email is already
registered, and `400` for invalid registration data. Email confirmation follows the
Supabase project settings; registration does not create an application session.

Upload expects `multipart/form-data` with the file in a field named `file`. It returns
`201` on success, `415` for an unsupported type and `413` if the file is too large.

## Adding a new API

Example: a new `greet` API.

1. `app/schemas/greet.py`: what the API returns
2. `app/services/greet.py`: the logic
3. `app/routers/greet.py`: the URL, which calls the service
4. `app/main.py`: register it with `app.include_router(greet.router, prefix="/api")`
5. `tests/test_greet.py`: tests for it

## Configuration

Settings live in `app/config.py`. Override any of them with an environment variable or
a `backend/.env` file (read from the folder you start the server in), for example:

```
MAX_UPLOAD_MB=50
CORS_ORIGINS=["http://localhost:3000"]
```
