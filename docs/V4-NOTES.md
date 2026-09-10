# V4 architecture and release notes — 10 September 2026

Status at release preparation: implementation, source checks, viewer state checks and production artifact checks passed. Browser visual inspection was blocked by automatic approval review and is not claimed. Publication is verified separately against the deployed revision.

## Design and content

The homepage returns to normal document flow: personal identity and Work/Contact actions, a bounded propulsion study, selected LUMOS work, background and contact. The former introduction, pinned across 2.7–3 viewport heights, is removed. Visitors can reach the work without completing an animation.

The Aerospace page shares the new visual component. LUMOS presents each of its five system explanations immediately below its native disclosure label. The first stage is open initially; the named details group keeps one stage open in supporting browsers, while other browsers can leave multiple stages open. This interaction needs no JavaScript. The Ventures page replaces its repeated process diagram with a concise practical perspective and a direct LUMOS case-study link.

Confirmed facts remain limited to Salim Youssef Najim’s identity, Aerospace Engineering studies at Khalifa University, LUMOS team leadership and its stated concept/demonstration elements. GPA, rank, academic-list claims and unverified achievements remain excluded. No active businesses, publications, customers or measured project outcomes are invented.

## Visual architecture

`src/components/ProductStudy.astro` and `src/scripts/product-study.ts` replace the browser-rendered model on the V4 pages. The visual is an original illustrative turbine/propulsion model authored in Blender and rendered offline with Cycles in three compositions: Assembled, Exploded and Cutaway. These are fixed studio views; the website does not expose arbitrary 3D rotation.

The image contract is `public/images/propulsion-{assembled,exploded,cutaway}-{640,1280}.webp`. Responsive `srcset` and `sizes` let the browser choose an appropriate source. The first image has explicit dimensions and can receive loading priority. Alternate views preload when the study is nearby and its first image has loaded.

Before switching, the controller loads and decodes the requested image. The existing view stays visible until the replacement is ready; failed requests retain the current view and show error feedback. Request tracking prevents a slow earlier selection from replacing a more recent one. Arrow keys, Home and End complement the named 44px-high buttons.

Passive scrolling changes views only while the study is visible and until the visitor selects a view manually. There is no scroll pinning, pointer capture, continuous rendering loop or WebGL context. Reduced motion disables automatic switching and crossfades. Page exit cancels listeners and queued work; a restored page remounts the controller. Without JavaScript, the initial image remains visible and navigation/content remain usable.

The renderings illustrate geometry and are not evidence of flight-qualified hardware or a physical LUMOS prototype. Blender is used only when regenerating artwork. Building and hosting the site require the committed image assets, not Blender or a GPU renderer.

## Maintenance

- Page content: `src/pages/`; confirmed identity and links: `src/data/site.ts`.
- Shared layout and typography: `src/layouts/Layout.astro` and `src/styles/global.css`.
- Image controls and alt text: `ProductStudy.astro` and `product-study.ts`; keep view order and filenames aligned.
- Original Blender geometry and rendering source: `scripts/render-propulsion.py`; authoring and provenance: [PROPULSION-ASSETS.md](PROPULSION-ASSETS.md).
- LUMOS stage copy: the `steps` array in `src/pages/projects/lumos.astro`.
- Contact: direct public email plus optional draft preparation. Preparing a draft does not send it.

Replace all required image variants together when updating the model. Keep framing consistent among views and confirm each exported WebP decodes. Source changes belong under `src/` or `public/`; root HTML, `_astro/`, `dist/` and `.release-files.json` are generated release artifacts.

## Validation and publication

Verified for V4 during release preparation:

- Astro/TypeScript: 21 files, zero errors, warnings or hints; ESLint passed.
- `npm run check:viewer`: 30 state checks covering decoded-image readiness, failed requests, rapid selection races, keyboard controls, manual preference, reduced motion, cleanup, missing observers and initial-image retry.
- Production build: 9 generated routes plus 3 legacy redirect documents. Site verification passed 396 internal references, metadata, contact identity, domain, sitemap and excluded academic claims.
- All six WebPs fully decode with transparency at their specified dimensions and remain below 300 KB each. Every silhouette has at least 42 pixels of transparent margin. Home and Aerospace have all three named view controls and no canvas or legacy scene markup.
- Assembled, exploded and cutaway source images and the social card were visually inspected as local assets. This does not establish the finished browser layout.
- The generated viewer script is 5,290 bytes before transfer compression. This is an artifact measurement, not a device-performance score.

Browser inspection of the website was blocked by automatic permission review after a timeout and its permitted retry. No alternate browser route was used. Live browser layout, touch behavior, mobile menu/contact interactions, actual Safari/physical phones and Lighthouse/Core Web Vitals remain unverified for this revision. Historical V2/V3 browser results do not apply to V4.

Release staging verifies the root files against every `dist/` hash. GitHub's quality workflow reruns type checking, lint, the viewer harness, the build and artifact checks on the release branch. Deployment and custom-domain file hashes are recorded separately after publication; this source document does not claim deployment in advance.

Use Node.js 24 and the committed lockfile. Run the verification commands in README, preview the build, then `npm run release:stage` and `npm run check:site -- --release`. Preserve the existing `main`/repository-root Pages destination, custom domain, HTTPS settings, `CNAME`, `ads.txt` and redirects. After the reviewed release reaches `main`, verify Pages completion and the live files. Roll back by reverting the release commit rather than rewriting history; see [deployment mechanics](DEPLOYMENT.md).
