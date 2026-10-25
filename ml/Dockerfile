FROM python:3.12-slim


COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv


# No UV_PROJECT_ENVIRONMENT here: it would also apply to `uv run --project pylaia`
# in transcription.py and run PyLaia in the wrong environment.
# Both environments stay in their default .venv folders instead.
ENV PATH="/app/.venv/bin:$PATH"


WORKDIR /app


# ML service and Kraken (Python 3.12)
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev

# PyLaia (Python 3.10, uv downloads it)
COPY pylaia/pyproject.toml pylaia/uv.lock ./pylaia/
RUN uv sync --locked --no-dev --project pylaia

# PyLaia needs two things the slim image does not include:
# libgomp (for torchaudio) and git (PyLaia crashes on import without it)
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 git \
    && rm -rf /var/lib/apt/lists/*

COPY . .

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
