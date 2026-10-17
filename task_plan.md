# Current task: level mechanics

Latest fix: use depth-picked image boundaries for partial-occlusion perspective seams. Require sustained edge contact; reject hidden panels, corners and visible gaps. Tested with actual Scene matrices/raycasts and browser interaction, not only polygon fixtures.

Current bugfix: partially visible red/green/pink matching seams must count. Use visible face boundaries and ray-tested seam samples, not whole silhouettes/centre-only visibility. Confirm no double count of one cube's different faces; whole same-color connected group removed by click.

Current superseding scope: delete tunnel and grey wildcard mechanic, replace level3/test3 with fixed 2x3 perspective panel. Only visible projected edges aligned and touching link same colors; no overlap, player click required. Rotor pivot now centred on host face and footprint stays contained through all angles. Test7x7/main5x5 retained.

Newest requirement: test mode alone uses 7x7. Scale tunnel length, endpoints, gates and grey cubes; rotor keeps 2x3 and uses the smaller pitch. Normal progression remains 5x5.

Latest revision: level 1 ordinary, level 2 rotor, level 3 tunnel. Menu offers independent test entries. Rotor pauses 2.4s and turns 90 degrees over 0.8s; all six cubes contact shell at rest. Channel walls transparent and click-through. Touching wildcards form selectable groups, never automatically disappear.

See docs/superpowers/plans/2026-10-17-level-mechanics.md.

- Confirmed latest order: 1–4 are 5x5; level 2 black '?' coating, level 3 rotating 2x3 panel, level 4 XY cross tunnel. Max size 8. Reticle aligns current face arrow down and keeps zoom.
- Pending: size schedule from level 5 (asked asynchronously); default to 5 until configured.
- Implementation complete: 45 tests and browser checks passed. Publishing pending.
