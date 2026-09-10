# Propulsion study assets

These are original, procedurally authored 3D illustrations created for this website. They communicate an interest in aerospace systems; they are not a manufacturer model, a dimensionally validated design, a simulation, or evidence of a built or flight-ready engine. Do not describe them as a completed engineering project.

## Source and provenance

- Geometry, materials, lights and camera: [`scripts/render-propulsion.py`](../scripts/render-propulsion.py).
- Responsive image conversion: [`scripts/convert-propulsion.mjs`](../scripts/convert-propulsion.mjs).
- No stock model, texture, HDRI, manufacturer asset or external artwork is used.
- Blender **4.5.9 LTS**, portable Windows x64 package from the [official Blender release archive](https://download.blender.org/release/Blender4.5/).
- Package: `blender-4.5.9-windows-x64.zip`.
- Verified against the [official SHA256 file](https://download.blender.org/release/Blender4.5/blender-4.5.9.sha256): `41da973b9bf95bb312cbeff4d1982feb13259b43c821686b9bafea4dfe5477cf`.
- The portable renderer, intermediate PNGs and editable `.blend` scenes remain in the workspace scratch directory and are not included in the website release.

## Three views of one assembly

The same mesh assembly produces all three views. It includes a rolled intake lip, 22 curved fan blades, a seven-stage compressor, an annular combustor, turbine stages and a segmented exhaust nozzle.

- **Assembled:** complete exterior at a three-quarter viewing angle.
- **Exploded:** fan, compressor case, core, combustion section and nozzle separated in controlled positions.
- **Cutaway:** part of the nacelle and compressor shell is removed to reveal internal stages.

All views use the same orthographic viewing direction, satin titanium and dark alloy materials, softbox area lights, an AgX color transform and transparent backgrounds. The camera is centered using the actual mesh vertices and constrained to no more than 86% of image width or 81% of image height. These camera and lighting calculations happen during offline asset production, not on a visitor's device.

## Rendering and responsive output

Cycles rendered the source images at **1280 × 853**, **128 samples**, with denoising. The rendering machine exposed an NVIDIA GeForce RTX 5060 Laptop GPU through OptiX; the script falls back to CPU if a compatible GPU is unavailable. This describes asset production, not a requirement for viewing the website.

Sharp converts each RGBA PNG to two alpha WebPs using Lanczos3 resampling, quality 92 and alpha quality 100. Each visitor downloads the image size selected by the responsive viewer. The total below is the size of all six repository files, not a claim about first-page transfer size.

| View | 640 × 427 | 1280 × 853 |
| --- | ---: | ---: |
| Assembled | 45,726 bytes | 99,888 bytes |
| Exploded | 46,662 bytes | 103,930 bytes |
| Cutaway | 53,588 bytes | 118,722 bytes |
| **Total** | **145,976 bytes** | **322,540 bytes** |

The complete six-image set is **468,516 bytes**. All six files were decoded and inspected for dimensions, alpha and visible-content bounds. The 1280-pixel views retain at least 89 pixels of horizontal space and 99 pixels of vertical space between their nontransparent silhouettes and the frame. The 640-pixel versions retain at least 44 and 49 pixels respectively. No silhouette touches an image edge.

## Reproduce

From the repository root, using a locally available Blender 4.5.9 executable:

```powershell
$renderer = 'C:\path\to\blender.exe'
foreach ($view in @('assembled', 'exploded', 'cutaway')) {
  & $renderer --background --python scripts/render-propulsion.py -- $view 1280 128 work/propulsion-renders
  if ($LASTEXITCODE -ne 0) { throw "Render failed: $view" }
}
node scripts/convert-propulsion.mjs work/propulsion-renders
```

The renderer saves the corresponding `.blend` scene and PNG into `work/propulsion-renders`. The conversion script writes `public/images/propulsion-{assembled,exploded,cutaway}-{640,1280}.webp`. The build then copies the public assets into the static release. Minor differences between GPU/CPU render output may alter encoded file sizes.

The website displays these images with ordinary browser image rendering and lightweight transitions. They do not require a WebGL context or a continuously running 3D render loop. Browser behavior, keyboard operation, mobile layout and deployment verification are documented separately in `V4-NOTES.md`.
