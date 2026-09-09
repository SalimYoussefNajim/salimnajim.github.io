# Salim Youssef Najim — V3 experience

An original static website for aerospace engineering, entrepreneurship and selected engineering work. V3 combines a scroll-led, three-part 3D introduction with direct page titles, clear reading structure and an email-first contact page. Built with Astro, TypeScript, CSS and Three.js; no application server or CMS is required.

## Architecture

| Route | Purpose |
| --- | --- |
| `/` | Three-chapter 3D introduction, identity, selected work and paths into the site |
| `/about/` | Profile, education, project leadership and business perspective |
| `/aerospace/` | Academic direction, technical interests and an interactive turbine study |
| `/projects/` | Selected engineering work |
| `/projects/lumos/` | LUMOS case study with local navigation, system stages, role and further evaluation |
| `/ventures/` | Entrepreneurship perspective; no unverified business listings |
| `/achievements/` | Education and project experience, linked from the footer as Milestones |
| `/contact/` | Direct email, copy-email feedback and an optional email-draft form |
| `/404.html` | Branded missing-page experience |

The homepage uses `ExperienceScene.astro` and `experience-scene.ts`: an original procedural instrument whose rings separate and reconfigure as the story progresses. Rendering responds to scroll and layout changes instead of running an idle animation loop. The scene has a still-image option, reduced-motion behavior, a lightweight SVG fallback and capped pixel density. Touch scroll remains native.

The Aerospace page retains a separate `Scene.astro` / `scene.ts` turbine study with explicit controls. Both scenes are illustrative visual work, not evidence of flight hardware or measured engineering results.

Normal content is static HTML. The contact form prepares a draft for the visitor’s email application; it does not send server-side email. The address remains usable without JavaScript. See [V3 design notes and current limits](docs/V3-NOTES.md).

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

Edit pages in `src/pages/`, shared UI in `src/components/` and `src/layouts/`, content in `src/data/site.ts`, and static media/legacy redirects in `public/`. `src/scripts/main.ts` coordinates navigation and page interactions. Each 3D scene has its own dynamically imported renderer. `dist/` is the generated build. Root HTML and `_astro/` are generated release output, not the source of truth.

## Prepare a release

```sh
npm run release:stage -- --dry-run
npm run release:stage
npm run check:site -- --release
```

These commands prepare local files and `.release-files.json` for review, then verify that they match the build. They do not deploy or run Git. Development is on `experience-v3`; GitHub Pages publishes `main` at repository root with the existing custom domain and HTTPS settings. The included GitHub workflow checks source and build only.

Read [deployment and rollback](docs/DEPLOYMENT.md) before publishing. Read [content boundaries](docs/CONTENT.md) before adding facts, ventures, achievements or contact services. [QA.md](docs/QA.md) contains the historical V2 validation record; those measurements are not V3 results. Record final V3 checks separately. The confirmed contact email is public; credentials do not belong in this repository.
