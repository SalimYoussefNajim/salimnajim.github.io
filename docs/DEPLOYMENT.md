# Static build and controlled release

The site is an Astro static build with TypeScript and responsive prerendered propulsion images. Astro produces deployable HTML, CSS, JavaScript, fonts, and images in `dist/`. GitHub Pages does not execute Astro source or a Node server. The hosting settings were confirmed in GitHub: publish from `main`, `/ (root)`, custom domain `salimyoussefnajim.com`, HTTPS enforced. Keep those settings for this release and recheck them before publishing.

V4 development happens on `experience-v4`. The included `quality.yml` workflow runs on pull requests, pushes to `experience-v4`, `experience-v3` and `redesign-v2`, and manual dispatch. It installs the lockfile, type-checks, lints, builds, and verifies `dist/`. It has read-only repository permissions and **does not deploy**.

## Local build

Use Node.js 24, npm 11.19.0 and the committed `package-lock.json`. Preserve optional dependencies for all platforms when regenerating the lockfile; an older npm modifying a populated Windows installation can drop entries required by Linux CI. Astro's installed package requires Node 22.12 or newer; use the same Node major as CI for reproducibility.

```sh
npm ci
npm run typecheck
npm run lint
npm run build
npm run check:site
npm run preview
```

Preview the generated site at the local URL printed by Astro. Root HTML and route folders are generated release output; edit their equivalents in `src/` or `public/`. Retired source and assets remain recoverable in Git history.

`check:site` examines the actual generated artifact: required pages, internal destinations and anchor IDs, CSS/image/font references, unique page metadata, canonical/social URLs, valid structured-data JSON, confirmed email, excluded academic claims, domain, advertising publisher record, sitemap, robots, manifest, and accessible document basics. It makes no network requests. It cannot prove browser behavior, external service availability, email delivery, accessibility conformance, or real-user performance.

## Review before release

- Preview every page and intentional legacy redirect, plus an unknown path for the branded 404. Confirm navigation, footer, visible email, contact draft/delivery behavior, and external links.
- Check widths 320, 375, 390, 430, 768, 1024, 1280, 1440, 1920 pixels and an ultrawide. Test touch, keyboard, focus, mobile menu close/escape behavior, no horizontal overflow, and readable layouts.
- Test reduced motion, failed image requests, rapid view changes, scroll progression, slow loading and the initial image with JavaScript disabled. Inspect browser console and network failures. Check an actual Safari/WebKit environment when available, and record if it was not tested.
- Measure the production build's performance and accessibility. Report measured results and limitations; do not present laboratory scores as Core Web Vitals from real visitors.
- Confirm the content boundaries in `CONTENT.md`, especially the owner's academic-statistics omission and the absence of invented businesses or publications.

## Keep the existing Pages destination

Prepare the release in an isolated checkout/release branch from current `main`, retaining source under `src/` and build configuration/scripts in the repository. Record the current production commit for rollback. Bring in the reviewed source commit, install the lockfile, build, and run all checks again against that exact release source.

Use the local staging command to copy the **contents** of verified `dist/` into the release checkout's root, so `index.html`, `about/index.html`, and `_astro/` become root-level release files:

```sh
npm run release:stage -- --dry-run
npm run release:stage
npm run check:site -- --release
```

The first command validates and reports proposed cleanup without changing files. The second prepares a local diff only: it performs no Git action, network request, merge, or deployment. Both run `check:site` first. The final read-only check verifies that every root release file and its manifest hash match the current `dist/`; this catches a stale or incomplete artifact before Pages publishes it. Do not stage while another process is rebuilding `dist/`.

The script records generated paths and SHA-256 digests in `.release-files.json`; commit that manifest with the release files. On later runs it only deletes obsolete individual files recorded there, after checking their contents have not been edited. It rejects traversal, absolute paths, case collisions, symlinks, and protected source/configuration paths, including `.git/`, `src/`, `scripts/`, `docs/`, `node_modules/`, `public/`, legacy asset directories, and package files. All validation finishes before the first copy or deletion. Unmanaged files are preserved; the first run may replace only the known old landing/legacy HTML and domain/publisher records, or files already byte-identical to the build. A conflicting unmanaged file or edited generated file stops staging for review. Do not manually add source files to the manifest to bypass that check.

`.nojekyll` is included so GitHub Pages serves `_astro/`; `CNAME` still contains only `salimyoussefnajim.com`. The source tree and build configuration remain available for future rebuilds.

Make this a single reviewable release commit. The build includes accessible, noindex legacy redirects: `/projects.html` → `/projects/`, `/salim.html` → `/about/`, and `/dashboard.html` → `/`. They retain working fallback links if automatic redirection is unavailable. Obsolete root `css/`, `js/`, and `assets/` are deliberately outside staging ownership; remove them explicitly only after confirming all new references resolve and useful originals are preserved in history. Never mirror/delete an entire checkout from `dist/`, because that would erase source and Git metadata.

Review the complete diff, the exact generated files, and Pages settings before merging the release into `main`. A merge/push to the configured production branch can publish immediately. Do not change DNS, the domain, hosting provider, repository history, or the Pages source setting as part of this release. No secrets are required for this static build.

After publication, verify the HTTPS custom domain, homepage, all major routes, nested project route, fonts/images/scripts, contact link, sitemap, robots, `ads.txt`, and unknown-route 404. Check that GitHub Pages reports a successful deployment. Keep the source revision and deployment outcome in the release notes.

## Rollback and later updates

If the release fails, revert the release commit on `main` to restore the prior published tree and let Pages republish it. Avoid a force push. Confirm recovery on the custom domain. Historical AI backend data/services were not changed by V2, and should not be deleted as part of a website rollback.

For later updates, edit `src/` and `public/`, rebuild, run the checks, preview, then use `release:stage` and review the output in another commit. Preserve `.release-files.json` so stale hashed assets can be removed safely. Never edit `_astro/` or generated root HTML as the long-term source of truth. If staging is interrupted, inspect the local diff and rerun after resolving any reported content conflicts; no production change occurs until the reviewed commit reaches `main`.

The publisher record in `ads.txt` is retained. That alone does not enable AdSense on the new pages; check the actual source before describing advertising or analytics as active. The contact email is public data. Do not commit email-provider API keys or access tokens if delivery infrastructure is added later.

Reference: [Astro's GitHub Pages deployment documentation](https://docs.astro.build/en/guides/deploy/github/). This repository deliberately keeps the existing branch/root publishing arrangement instead of enabling the guide's alternative automatic deployment workflow. CI action versions follow the maintained [checkout](https://github.com/actions/checkout) and [setup-node](https://github.com/actions/setup-node) actions.
