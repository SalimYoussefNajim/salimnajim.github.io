# Salim Youssef Najim — V4

A static personal website for aerospace engineering, business perspective and selected engineering work. V4 puts identity, Work and Contact actions at the beginning of a normal-flow homepage. An original propulsion study uses three studio-rendered images, so the visual experience does not require browser WebGL. Built with Astro, TypeScript and CSS; no application server or CMS is required.

V4 validation and publication are pending. See [V4 notes](docs/V4-NOTES.md) for the architecture, maintenance details and release checklist. Earlier QA records describe earlier releases.

## Architecture

| Route | Purpose |
| --- | --- |
| `/` | Identity and direct actions, bounded propulsion study, selected work and background |
| `/about/` | Profile, education, project leadership and business perspective |
| `/aerospace/` | Academic direction, technical interests and the propulsion study |
| `/projects/` | Selected engineering work |
| `/projects/lumos/` | LUMOS case study with local navigation, native stage accordions, role and further evaluation |
| `/ventures/` | Entrepreneurship perspective; no unverified business listings |
| `/achievements/` | Education and project experience, linked from the footer as Milestones |
| `/contact/` | Direct email, copy-email feedback and an optional email-draft form |
| `/404.html` | Branded missing-page experience |

The homepage and Aerospace page share `ProductStudy.astro` and `product-study.ts`. The Assembled, Exploded and Cutaway views are original Blender renders delivered as responsive WebP images. The next image is loaded and decoded before the visible image changes. Named controls work with touch and keyboard; passive scrolling can change the view until a visitor makes a manual selection. Reduced motion disables automatic switching and fades. The initial image is ordinary HTML and remains available without JavaScript.

The study illustrates engineering geometry; it does not document student-built hardware, a manufacturer’s product or measured engineering results. Normal content remains static HTML. The contact form prepares a draft for the visitor’s email application; it does not send server-side email. Direct email remains usable without JavaScript.

## Develop and verify

Use Node.js 24 and npm 11.19.0, matching the release check environment. Regenerate the lockfile with that npm version in a clean directory so optional dependencies for other platforms remain recorded.

```sh
npm ci
npm run dev
```

```sh
npm run typecheck
npm run lint
npm run check:viewer
npm run build
npm run check:site
npm run preview
```

Edit pages in `src/pages/`, shared UI in `src/components/` and `src/layouts/`, content in `src/data/site.ts`, and static media/legacy redirects in `public/`. `src/scripts/main.ts` coordinates shared navigation and reveals; `src/scripts/product-study.ts` owns image-view interactions. Blender is an asset-authoring tool, not a dependency of the website build. `dist/` is the generated build. Root HTML and `_astro/` are generated release output, not the source of truth.

## Prepare a release

```sh
npm run release:stage -- --dry-run
npm run release:stage
npm run check:site -- --release
```

These commands prepare local files and `.release-files.json` for review, then verify that they match the build. They do not deploy or run Git. V4 development is on `experience-v4`; GitHub Pages publishes `main` at repository root with the existing custom domain and HTTPS settings. The included GitHub workflow checks source and build only.

Read [deployment and rollback mechanics](docs/DEPLOYMENT.md) before publishing and use the current [V4 validation checklist](docs/V4-NOTES.md). Read [content boundaries](docs/CONTENT.md) before adding facts, ventures, achievements or contact services. No GPA, rank, academic-list claims or unverified achievements are included. [QA.md](docs/QA.md) and [V3-NOTES.md](docs/V3-NOTES.md) are historical records, not V4 results. The confirmed contact email is public; credentials do not belong in this repository.
