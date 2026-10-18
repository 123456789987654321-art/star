# Level-mechanics findings

## Challenge redesign — 2026-10-18

- Existing challenge is timed in app update, intro, scoring, HUD and banners; LevelProfile falls back to 5x5 cube.
- Board assumes six rectangular face layouts; shape support needs explicit geometry, topology, surface gravity and picking changes.
- Challenge picker currently expands beyond 12; progress keys share legacy timed-challenge semantics and need a new version.
- Clean tracked diff at initial inspection. No AGENTS.md found by rg --files in workspace.
- Full proposed design saved under docs/superpowers/specs/2026-10-18-challenge-design.md; suggestions distinguished from user requirements.

- Hollow shell Board has unique voxel cells and owner-face gravity. Even-size channels are not currently needed: level 2 is 5x5.
- Camera orbit tracks screen up in cube coordinates; gravity for tunnel = negative scene.up, projected onto its XY plane.
- Tile colors are 0..5. Reserve 6 for grey wildcard without adding it to random generation.
- Scene.pick accepts arbitrary boxes and nearest visible IDs, suitable for gates and tunnel walls if incorporated into the pick list.
- Existing hints/settlement must honor coatings and internal wildcard reserves.
