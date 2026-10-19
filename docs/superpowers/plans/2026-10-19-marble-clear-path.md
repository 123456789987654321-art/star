# Marble clear-path implementation plan

**Goal:** Make elimination control level 12 ball routes rather than accompany a freely traversable peg field.
**Architecture:** Keep the existing triangular collision integrator, fixed-speed drag launcher, scoring and persistent three-ball board. Replace isolated pegs with five full-width removable sawtooth barriers plus intervening guide wedges. Every wedge consists of two same-colored, shared-edge triangles; tips alone never connect. Clearing a pair creates a physical opening; intact barriers intentionally require player action.
**Tech stack:** Existing JavaScript/WebGL and node:test; headless Edge interaction QA.

- [x] Add regressions: intact gate blocks descent, opening a pair changes route, removing during flight releases ball, cleared openings persist across three drops, resting contact cannot farm points.
- [x] Replace level 12 layout in challenge-world.js with five gates and sparse guides. Preserve launch preview and all scoring.
- [x] Update level instructions/status and make Hint prefer nearby forward obstacles during flight. Keep white glow and focus mechanics.
- [x] Run unit suite and desktop/mobile browser checks, inspect screenshots and actual removal flow.
- [x] Independent review: no findings; additional 21-angle intact-gate simulation confirmed no bypass or resting-score farming. Commit/upload follows.

Verification: 216 Node tests passed; Edge report errors=[] and failed=[], including actual mouse/touch clearing during flight. Left/right openings at the same launch angle land in bins 1/3 respectively. Mobile screenshots inspected.
