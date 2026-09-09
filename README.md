# Salim Youssef Najim — V2

An original static flagship for aerospace engineering, entrepreneurship, and selected projects. Built with Astro, TypeScript, clean CSS, and a progressively enhanced Three.js scene.

## Develop and verify

Use Node.js 24.

```sh
npm ci
npm run dev
```

```sh
npm run typecheck
npm run lint
npm run build
npm run check:site
npm run preview
```

Edit pages in `src/pages/`, shared UI in `src/components/` and `src/layouts/`, content in `src/data/site.ts`, and static media/legacy redirects in `public/`. `dist/` is the generated build. Production files at the repository root are generated release output once staged, not the source of truth.

## Prepare a release

```sh
npm run release:stage -- --dry-run
npm run release:stage
```

This prepares local files and `.release-files.json` for review. It does not deploy or run Git. GitHub Pages remains on `main` at repository root with the existing custom domain and HTTPS settings. The included GitHub workflow only checks the source and build.

Read [deployment and rollback](docs/DEPLOYMENT.md) before publishing. Read [content boundaries](docs/CONTENT.md) before adding facts, ventures, achievements, or contact services. The confirmed contact email is public; credentials do not belong in this repository.
