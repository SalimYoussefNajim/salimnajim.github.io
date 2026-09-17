# Original kinetic sculpture

The home-page object is an original illustrative gyroscope sculpture authored
with the geometry in `scripts/render-kinetic.py`. It is not a manufacturer's
product, a completed engineering project, or a representation of certified
hardware. No third-party model, photograph, material, texture, or HDRI is used.

Three nested annular gimbals articulate around coaxial pivots. The outer two
rings use satin aluminium with polished lands and engraved index marks. The
inner ring uses vermilion enamel; the central graphite flywheel is detailed on
both sides. Small bevels, physically lit metal and a fixed orthographic camera
make the sequence consistent as the page moves. The rings' different radii
provide clearance throughout their travel.

## Reproduction

Use Blender 4.5 LTS and the repository's existing `sharp` dependency:

```text
blender --background --python scripts/render-kinetic.py -- ../../work/kinetic-v5 900 96 36 0 35
node scripts/convert-kinetic.mjs ../../work/kinetic-v5
```

Rendering uses Cycles, 96 samples, denoising, the AgX view transform and four
studio area lights. A compatible GPU is selected when available; CPU rendering
remains supported. The intermediate PNGs and `.blend` file belong in scratch
storage, not the deployed site.

## Public asset contract

- `public/images/kinetic/frame-00.webp` to `frame-35.webp`: 36 transparent,
  900 × 900 frames, ordered by scroll progression. This is not a looping sequence.
- `public/images/kinetic/mobile-00.webp` to `mobile-35.webp`: the same poses at
  480 × 480, intended for smaller displays.
- `public/images/kinetic/poster-480.webp` and `poster-640.webp`: responsive
  initial stills. `frame-00.webp` is the corresponding 900-pixel still.
- `public/images/kinetic/manifest.json`: dimensions, frame sizes, total bytes,
  and transparent framing measurements.

The converter rejects source frames with less than 48 pixels of transparent
framing or a desktop sequence exceeding 2,000,000 bytes. All source frames are
decoded and checked before conversion. Desktop frame alpha is preserved at
full quality; mobile alpha is compressed at quality 95. The component should
retain only a small nearby-frame cache: a single decoded desktop frame uses
approximately 3.2 MB, compared with 0.92 MB for a mobile frame. Select a single
sequence for a device, preserve the initial still when motion is disabled, and
avoid fetching both full sequences.

The initial still is visually inspected along with contact sheets covering all
36 positions, against the site's warm paper background. The object is designed
to float; no ground-plane shadow is baked into the transparent image.

The delivered desktop sequence totals 1,882,678 bytes; the mobile sequence
totals 1,339,750 bytes. The smallest measured source margin is 92 pixels. All
74 delivered WebP images were fully decoded successfully with their alpha
channel intact. The 480- and 640-pixel posters are 46,368 and 66,294 bytes.
