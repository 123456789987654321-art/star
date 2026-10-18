# Level-mechanics findings

## Challenge redesign — 2026-10-18

- Implemented via ChallengeGeometry/ChallengeWorld/ChallengeProjection/ChallengeGame plus Scene polygon mesh/pick support. App delegates only challenge lifecycle; normal code path retained. Every stage uses its own score, target and phase; new progress key popstar3d.progress.challenge.v2.
- Root render cache keys include world transforms; moving slides clear projected links until settled. Physical connectivity + visible projected seam groups share unique IDs. Scene physics never uses perspective links.
- Live browser verification uses native Node CDP and hidden Edge, no runtime npm/Python dependencies. Python aliases unavailable; UI skill touch/focus guidance applied directly from read reference. Local sandbox renderer hung; elevated local browser validation succeeded.

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
