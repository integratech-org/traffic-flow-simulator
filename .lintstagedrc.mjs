export default {
  "backend/**/*.py": [
    "uv run --project backend ruff check --fix",
    "uv run --project backend ruff format",
  ],
  "frontend/src/**/*.{ts,tsx,js}": [
    "bun --cwd frontend oxlint --fix",
    "bun --cwd frontend prettier --write --ignore-unknown",
  ],
};
