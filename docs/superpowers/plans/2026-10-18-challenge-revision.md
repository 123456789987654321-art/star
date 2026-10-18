# Challenge revision — active implementation

User-authorized scope, including follow-up corrections:

- Replace the persistent instruction card with an entry dialog, “我知道了”, and reopening through “!”. Keep challenge perspective matching always enabled.
- Reject diagonal cube contact, including across separate components. Meshing gear teeth retain their specific edge-to-flank rule.
- Remove small triangular plates. Use solid cube grids for regular shapes and square targets; preserve gear outline using solid trapezoidal teeth. Cylinder caps become square grids with no overlapping side/cap skins.
- Keep per-surface gravity: side faces down, top/bottom forward, separate depth layers and disconnected lanes.
- Use two solid flat annular bands crossing perpendicularly; keep the central ring openings. Smaller ring diameter is 75% of the large ring and touches its inner surface.
- Rebuild the fire puzzle: two barriers inside the tank, immutable edge fillers, vulnerable outlet seals, moving horizontal plate ±3 cells. Empty circular pipeline runs vertical/slanted/horizontal to an outlet above and offset from the fire.
- Finite water with a right-side ruler and red line for remaining extinguishing requirement. Leaks waste water; useful flow alone extinguishes the fire. Procedural curved flames, logs, embers, water surface and stream.
- Assembly tray shows neutral miniatures of actual shapes with labels and horizontal scrolling. Shared-face white glow previews joins. Desktop second click and touch release confirm placement; final completion assigns colors.

Implementation and verification:

- Geometry, physical contacts, model rendering, water model and visuals, gauge, modal and assembly interaction are implemented in the working tree.
- Automated regressions cover shape solids, ring contact/no-overlap, face gravity, cube adjacency, water connectivity and mass conservation, immutable/moving blocks, gauge, pointer confirmation, and neutral colors.
- Real Edge verification checks all 12 levels, desktop/touch assembly, entry/reopened dialogs, water victory and meter, target shooting, marble, ordinary mode and mobile layout. Screenshots in ignored `.qa/`.
- Final review fixes: preserve undo confirmation state, invalidate restored contact caches, require positive-area contacts on completion, and align actual support faces when snapping all six shapes.
- Final verification: `node --test` passed 161/161; Edge browser checks passed all twelve levels, real mouse/touch placement, thumbnail tray scrolling, water flow/gauge/victory, modal reopening and ordinary mode, with no runtime or WebGL errors. `git diff --check` passed.
- Authorized GitHub publication is the remaining step.

Publication destination previously explicitly confirmed by the user: `star` remote, `main` branch (`123456789987654321-art/star`).

Continuation verification: 177/177 Node tests and full Edge suite passed. Browser checks now cover charge/release throwing and three-drop marble settlement. Git diff --check passed.
