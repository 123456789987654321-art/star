# Level mechanics implementation plan

Latest scope: ordinary/rotor/tunnel are levels 1/2/3 and independently selectable test levels. Rotor must hold 2.4s and turn 90 degrees over 0.8s, all six cubes contacting at rest. Channel walls transparent and click-through. Internal wildcard contact creates a selectable group, never automatic removal. Future reachable contacts must prevent premature settlement. Verified with rule tests and Edge interaction.

Superseding revision: black coating cancelled by user. Level 2 is now ordinary 5x5; rotor stays level 3, tunnel stays level 4. Earlier coating requirements below are historical.

Goal: Add coatings, a rotating 2x3 panel and a four-exit cross tunnel. Latest user request orders them by difficulty: level 2 coating, level 3 rotor, level 4 tunnel. Levels 1–4 remain 5x5; maximum supported progression is 8x8. Later size progression remains unspecified, so unconfigured levels retain 5x5.

Architecture: Board owns wildcard matching and coated-piece state. A new LevelMechanics module owns explicit level profiles and tunnel movement. App coordinates transitions, render/picking and interaction; Scene renders markings and tunnel geometry.

Confirmed rules:
- Level 1 ordinary; level 2 black '?' coated pieces; level 3 steadily rotating 2x3 panel of six cubes with click-only elimination across actual contact; level 4 cross in XY plane with left/right/top/bottom exits and two grey '?' wildcards.
- Reticle aligns the most front-facing face to its arrow pointing screen-down, without changing zoom.
- Clicking a gate lowers it. Released wildcards move under screen-down gravity as the cube is rotated, remain inside when an outlet is occupied, and enter an empty shell slot then follow face gravity.
- A wildcard matches one chosen ordinary color, never merges different colors via a wildcard bridge.
- Coated pieces are not matchable until the slot immediately above them along the owning face's falling direction is empty; revelation is permanent and coating follows the piece during gravity.

Tasks:
- [x] Define profiles and test first-four sizes and max supported size.
- [x] Test and implement wildcard matching, coating release and movement with gravity.
- [x] Test tunnel gate, tilt, collisions, blocked exits and transfer to shell.
- [x] Integrate mechanics, question-mark shader, channel/gate picking and help text.
- [ ] Browser check levels 1–4, gate opening, wildcard transfer/match and coating revelation; full suite; publish and verify live assets.

Review focus: no unplayable premature settlement while tunnel blocks remain; two wildcard blocks cannot occupy one cell; hidden colors must not leak through hints or side faces; reset/menu cancels mechanics; mobile rotation keeps mechanics responsive.
