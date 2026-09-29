# Manulator Backend

FastAPI backend for Manulator. Requires **Python 3.12+**.

## Setup (first time)

Run these from the `backend/` folder.

```bash
cd backend

# 1. Create a virtual environment
python3 -m venv .venv

# 2. Activate it
source .venv/bin/activate        # macOS / Linux
.venv\Scripts\activate           # Windows

# 3. Install dependencies
pip install -r requirements.txt
```

After this, you only need to **activate** the venv (step 2) each time you open a new terminal.
To leave the venv, run `deactivate`.

## Run the server

```bash
uvicorn app.main:app --reload
```

| URL | What |
| --- | --- |
| http://localhost:8000 | API |
| http://localhost:8000/docs | Interactive API docs (try endpoints here) |

`--reload` restarts the server automatically when you save a file.

## Run tests

```bash
pytest
```

## Lint and format

```bash
ruff check .      # find problems
ruff format .     # format code
```

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
├── requirements.txt     # Dependencies
└── pyproject.toml       # pytest and ruff config
```

A request flows **router → service → schema**: the router receives it, the service does
the work, and the schema defines the JSON that is returned.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Welcome message |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/upload-manuscripts` | Upload a manuscript (JPEG, PNG or PDF, max 20 MB) |

## Adding a new API

Example: a new `greet` API.

1. `app/schemas/greet.py`: what the API returns
2. `app/services/greet.py`: the logic
3. `app/routers/greet.py`: the URL, which calls the service
4. `app/main.py`: register it with `app.include_router(greet.router, prefix="/api")`


## Configuration

Settings live in `app/config.py`. Override any of them with an environment variable or
a `backend/.env` file, for example:

```
MAX_UPLOAD_MB=50
CORS_ORIGINS=["http://localhost:3000"]
```
