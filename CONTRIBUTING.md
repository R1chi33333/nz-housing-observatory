# Contributing

Thanks for your interest. This project is small and contributions are welcome.

## Setup

```bash
npm ci
npm test
npm run dev
```

`npm run pipeline` rebuilds `public/data/` from the open source datasets.

## Rules

- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`). Releases are cut automatically from commit messages.
- `npm run lint`, `npm run typecheck` and `npm test` must pass before a PR.
- Every pipeline transformation ships with tests; document cleaning decisions in code comments.
- Only open, freely downloadable datasets. No scraping behind logins, no API keys.
- No emoji anywhere: code, comments, docs, commit messages.
