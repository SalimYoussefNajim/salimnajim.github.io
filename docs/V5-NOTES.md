# V5 — Engineering, books and ideas

A complete editorial redesign inspired by the owner's Awwwards 3D and Dribbble references. The design uses warm paper, vermilion, large typography, original physical forms and a clear Work / Books / Profile / Contact hierarchy. No third-party design assets were copied.

## Interaction and rendering

The new homepage has an original articulated gyroscope rendered in Blender. Desktop and mobile receive separate 36-frame WebP sequences. On sufficiently large viewports, a native sticky cover keeps the whole object visible through its scroll progression; narrow/short viewports remain in ordinary document flow. Only nearby frames are requested, up to four at once, with six retained decoded images. There is no WebGL dependency, idle rendering loop, scroll hijacking, autoplay media or loading gate. The server-rendered poster and content remain readable without JavaScript. Native range, horizontal drag and ordinary scrolling control the sculpture. Manual control takes precedence; reduced motion and data-saving preferences avoid automatic animation. Errors keep the current valid image.

Aerospace retains its three original, fully framed propulsion illustrations and explicit view buttons. The books use real cover artwork with CSS perspective and page edges.

## Content

The owner authorized reading KDP for website content. Eleven live titles and their available formats were confirmed on 18 September 2026. The public catalogue contains only book metadata and cover artwork. Private account, payment, sales and login information are not part of the site. See BOOKS.md for source details. No prices, ratings, sales counts, unverified qualifications or academic statistics are added.

## Validation

- Existing propulsion viewer: 61 behavior checks.
- New kinetic viewer: 63 behavior checks.
- Static artifact checks cover metadata, local links, anchors, contact identity, sitemap, custom domain, exclusions, image decoding, dimensions, framing and size budgets.
- Typecheck, lint and production build pass. The built artifact contains 13 HTML files; the checker verifies 437 local references, 74 kinetic images, eleven book covers and 29 edition links.
- Browser layout checks pass across 320–1920 px for the homepage, 320/768/1440 px for seven supporting pages, and phone/tablet/desktop sizes for the book library. No horizontal overflow or broken rendered images was observed.
- Browser interactions verified: mobile menu and Escape, contact draft preparation, LUMOS section navigation/disclosures, kinetic keyboard controls and fully framed desktop scroll progression, book subject filters and filtered-out anchor recovery. Final production-preview warning/error logs were empty.
- Release publication is performed through a reviewed GitHub pull request, followed by an exact deployed-artifact comparison. Deployment evidence is retained outside the public site.

Physical phones and native Safari are not available in this environment. Responsive browser testing does not establish real-device frame rate or field Core Web Vitals.
