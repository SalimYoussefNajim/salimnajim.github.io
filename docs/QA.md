# V2 validation — 9 September 2026

The redesign is prepared on `redesign-v2`. Production remains on `main` with GitHub Pages publishing `/ (root)` and HTTPS enforced.

## Completed

- Production static build passes. Astro/TypeScript: 0 errors, 0 warnings, 0 hints. ESLint passes.
- Automated artifact verification: 12 HTML files (9 designed pages plus 3 legacy redirects), 343 internal references, local assets, anchors, page metadata, sitemap, robots, manifest, CNAME and ads.txt.
- Production browser layout matrix: 9 pages × 10 viewport widths (320, 375, 390, 430, 768, 1024, 1280, 1440, 1920, 2560). One LUMOS title overflow at 320 was fixed and rechecked. No other horizontal overflow or missing images found.
- Visual review of home, profile, aerospace, ventures, LUMOS, contact and 404 at representative desktop/mobile sizes. Fullscreen mobile navigation opens, contains keyboard focus, closes with Escape and restores focus to its trigger.
- Real Three.js canvas renders. Stage separation, reset, rotation controls and pause state verified in browser. Spinner surface orientation corrected after visual review.
- Reduced-motion, hidden-document/offscreen suspension, DPR caps, failure fallback and resource cleanup reviewed in source. These are not device-lab benchmark results.
- LUMOS energy selection changes the announced panel. All five stage descriptions remain present without JavaScript; enhancement hides the inactive panels only after initialization.
- Contact required-field validation and prepared-email success state verified using test text. Correct `mailto:` recipient, encoded subject/body and visible fallback link verified. No email was sent.
- Independent source accessibility review corrected the light contact-panel focus contrast and homepage heading structure.
- User-confirmed email included. GPA, national rank and President’s List omitted per user instruction. No invented businesses, clients, revenue, testimonials, publications or project performance figures.
- npm installation audit reported zero vulnerabilities.
- Release staging validated in isolation for traversal, protected paths, modified generated files, stale output cleanup and Windows junctions; it preserves source and performs no deployment.

## Size and performance scope

The static artifact is approximately 0.93 MB total before HTTP compression. The lazy 3D module is approximately 548 KB minified / 136 KB gzip; it loads only for pages with the scene. The bundler reports its standard >500 KB chunk advisory. This is the isolated Three.js renderer, not the initial page shell. No model or texture downloads; the former 17.7 MB GLB is excluded.

Fonts are self-hosted Latin WOFF2 subsets. Portrait is local WebP. Normal content is static HTML, readable before JavaScript. Animations respect reduced motion; 3D stops offscreen.

No Lighthouse score, field Core Web Vitals, real-iPhone frame-rate result or native Safari validation is claimed. Review those on the deployed candidate and physical devices before claiming performance targets.

## Contact and content scope

Contact prepares a draft in the visitor’s email application. It does not send mail from a server. Direct email remains usable without JavaScript. A hosted submission service can be connected later if the owner chooses one; no backend credentials were available in this repository.

No active venture or book publication was confirmed. The Ventures page communicates the owner’s business perspective without listing fictional businesses. Detailed venture/book pages should be added only after confirmation.

## Historical infrastructure

Custom domain and AdSense publisher record are preserved. Ads are not loaded in the new public experience. The old AI service is untouched; its former frontend, unused stock imagery and oversized model remain recoverable from Git history at the original baseline `47e29dde7265286bafc1285e4f887a394149a588`. Legacy routes lead to the corresponding new public pages.
