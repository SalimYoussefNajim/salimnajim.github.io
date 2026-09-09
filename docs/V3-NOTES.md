# V3 experience notes — 10 September 2026

This release introduces the mobile-focused V3 experience. The source and generated release are reviewed together; GitHub's deployment history identifies the current live revision.

## Design and structure

A restrained dark and titanium visual system, larger body type, generous spacing, and a focused navigation: Work, Aerospace, Ventures, Profile, and Contact. The homepage moves from a three-chapter introduction to concrete background, featured LUMOS work, connected interests, a personal portrait, and contact. A lighter selected-work section separates the narrative visually.

The inner pages use clear titles and labeled sections. LUMOS has local navigation for Overview, System, Role, and Further evaluation. Contact leads with the confirmed email address, email-app link, and clipboard action; drafting a longer message is an optional native disclosure. The social preview matches the new “Beyond one discipline.” identity.

## Architecture and motion

Astro generates static, accessible pages; TypeScript controls interactions; Three.js loads only for the two visual experiences. Shared typography and layout rules live in src/styles/global.css, navigation/metadata in src/layouts/Layout.astro, and confirmed facts in src/data/site.ts.

The new ExperienceScene.astro and experience-scene.ts implement an original ring instrument with three scroll compositions: assembled gyroscope, separated parts, and orbital instrument with unfolding arrays. The homepage controller in main.ts drives chapter copy independently, including when WebGL is unavailable.

The model uses no external downloads, a bounded render buffer, mobile DPR1, antialiasing, low-power rendering, and no idle animation loop. Its mobile geometry remains below 17,000 triangles in the measured harness. It suspends offscreen/background work and disposes resources. Reduced motion and short landscape layouts keep a static composition. Save-data, low-resource devices, missing observers and unavailable WebGL retain an original SVG; visitors can choose a still view.

The separate Aerospace turbine starts paused on phones. It accepts native page scrolling over the model, provides 44px rotation/separation/reset/motion controls, and fits the actual projected silhouette. Desktop mouse dragging remains available. These are implementation and harness results, not physical-device frame-rate measurements.

The mobile menu has a native details/navigation fallback until the scripted dialog is ready. Keyboard focus has a visible outline, including inset focus on the dark project image.

## Content boundaries

Personal facts remain limited to confirmed identity, Aerospace Engineering studies at Khalifa University, LUMOS team leadership and the stated concept/demonstration elements. Academic statistics and list claims are excluded. No active business, publication, revenue, customers or measured project outcome is invented.

LUMOS is a student concept with a wireless energy transfer demonstration. The diagrams and 3D objects are illustrative. No operational lighting installation or flight-qualified hardware is claimed.

The public address is salim.najim.06@gmail.com. Preparing a draft does not send email: the visitor reviews and sends in their email application. Editing the form invalidates a previously prepared link. Direct email remains available without JavaScript.

## Validation

- Astro check: 23 files, zero errors, warnings or hints. ESLint passed.
- Production build succeeded. The artifact checker passed 12 HTML documents and 392 internal references, including redirects, routes, assets, anchors, metadata, domain, contact identity and excluded claims. Total built artifact: approximately 1.04 MB.
- Final browser layout matrix: 9 routes at 10 viewport sizes (90 checks), all with the expected route/width, one H1, no horizontal overflow and no broken loaded images. Sizes: 320×640, 375×812, 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×1000, 1920×1080, 2560×1440.
- Visually reviewed phone and desktop compositions, the three changing objects, the selected-work section, mobile navigation, Contact, Aerospace and LUMOS.
- Browser interaction checks passed: chapter controls and still-image copy independence; mobile Menu Escape/focus restoration and desktop-resize unlock; actual copy-email success; encoded email draft and invalidation after edits; all five LUMOS stages and keyboard Home selection; turbine separation, rotation and reset.
- Short landscape (844×390) disables pinning and keeps all chapter content readable.
- Geometry/math and mocked renderer lifecycle harnesses cover mobile framing, scene transitions, static/reduced-motion behavior, observer and rendering fallbacks, passive touch policy, no idle rendering, cleanup, import races and back/forward restoration. These supplement browser checks rather than substitute for physical-device tests.
- No site JavaScript errors were observed. A nonfatal graphics-driver shader precision warning appeared during repeated viewport/model checks. The standard bundler advisory for the shared Three.js chunk exceeding 500 kB raw remains visible; Three is dynamically loaded and no warning limit was raised.

No Lighthouse score, field Core Web Vitals, physical-iPhone frame rate, or native Safari/WebKit result is claimed. Historical QA.md results describe V2.

## Release and maintenance

The existing GitHub Pages deployment remains main at repository root, with the existing custom domain, HTTPS setup, CNAME, ads.txt, legacy redirects and recoverable Git history. The quality workflow checks source and build and does not publish.

Build, preview, then run release:stage and check:site -- --release to verify that every generated root file and recorded SHA-256 match dist/. Review the branch checks before merging. Verify Pages completion and the live artifact afterward.

See DEPLOYMENT.md for staging and rollback, CONTENT.md for adding verified work, and README.md for development commands.
