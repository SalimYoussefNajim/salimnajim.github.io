# Content and factual boundaries

The owner confirmed the public address **salim.najim.06@gmail.com** during the V2 build. It belongs in `src/data/site.ts`, visible on the contact page and linked with `mailto:`. The GitHub destination is `https://github.com/SalimYoussefNajim`. Do not derive additional social profiles from this username.

## Approved material

| Material | Source and permitted scope |
| --- | --- |
| Salim Youssef Najim | Owner's brief and repository identity. |
| Aerospace Engineering at Khalifa University | Explicitly stated by the owner. Describe current study; do not infer a degree, graduation date, internship, or employment. |
| Engineering, entrepreneurship, and creating | The owner's stated positioning. This is not evidence of operating a specific business. |
| LUMOS | Owner's description: led a student team on an SDG 7-oriented decentralized urban lighting concept. |
| LUMOS system elements | Vehicle airflow, vertical-axis wind turbines, energy storage, wireless transfer demonstration, fluorescent illumination, and automatic light sensing. Describe as concept/demonstration; no invented efficiency, wattage, cost, test result, deployment, or commercial readiness. |
| Portrait | Existing `assets/salim-photo.png`, already used as the owner's portrait. Optimize the supplied photograph without changing identity. |
| Public email | Directly confirmed by the owner during this task, not inferred from commit metadata. |

## Explicit omissions

The owner explicitly forbade publication of academic GPA, rankings, or academic lists. **Do not publish GPA/CGPA, 3.94, national rank, or President's List**, including in metadata, structured data, images, captions, or alternative text. The site verifier catches common textual instances, and visual review must cover any artwork. Keep these out even if supporting records become available unless the owner later changes the instruction.

No currently active business, customers, revenue, partnerships, funding, commercial outcome, or book/publication has been verified. The ventures page may explain the owner's approach to entrepreneurship without inventing venture entries. `ventures` stays empty until an actual business and its status are confirmed. Do not create business detail routes or a book/writing route simply to fill navigation.

The former site mentions Tesla Coil City, NeuroLens AR, and Najim's Production. Its illustrations and brand mockup do not establish project implementation, business ownership, or current operation. They are not proof of a LUMOS prototype. Historical source and assets remain recoverable in Git.

## Updating the site

Shared identity, navigation, project entries, ventures, and milestones live in `src/data/site.ts`. Page composition is in `src/pages/`; shared layout, navigation, metadata, and footer are in `src/layouts/Layout.astro`.

For a project, obtain its real name, status, dates if relevant, role, accurate system description, outcomes, and rights-cleared visuals. Use a working detail route, update the project data and sitemap, and add that route to `scripts/check-site.mjs`. Clearly distinguish concepts, prototypes, tests, and deployments.

For a venture, first confirm its name, current operating status, what it sells or does, who it serves, the owner's role, and a real destination. Only include supported metrics. Add the data and detail page together. Keep internal verification notes in documentation, not visitor-facing labels.

Use the original procedural 3D scene and engineering diagrams as illustrative work. They do not represent an actual aircraft, production system, measured orbit, or photographed prototype unless specifically documented. Decorative technical markings must not imply fake engineering measurements.

## Contact and services

The original repository had no contact form backend. Its Render API served an unrelated account/AI product. Never point the new contact form to that service or reuse its authentication token.

If the contact interface prepares an email, say that it opens the visitor's email application and requires them to send it. A prepared draft is not a delivered message. If server delivery is later added, keep provider credentials server-side, implement validation, spam/rate controls, and truthful success/error states, then verify actual delivery. Do not add a pretend success response.

The existing AdSense publisher is `pub-6974115975105547`; `ads.txt` is preserved. Retaining that record does not mean advertising or analytics are active on V2. Any runtime tracker added later needs an intentional product decision and an accurate description of its behavior.

## Asset provenance

Do not reuse the old 17.68 MB `Rocket_Engine.glb`, Getty-named image, Icons8 logos, or hotlinked textures without sufficient rights information. The old parallax file credits `@coding.stella` in its title; it is not original V2 artwork. Keep third-party licenses with any newly introduced fonts, libraries, or media.
