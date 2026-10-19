# Challenge eight: rotating elimination cube

Replace free assembly with a three-by-three Rubik-style body. Each of the nine panels on each of six faces has 5×5 independently colored solid cubes (1,350 playable slots). Dark recessed body seams separate panels. Every face displays its fixed gravity direction. White controls at the outer edges rotate each macro row/column one quarter-turn in either direction; blank-space dragging still rotates the view.

User confirmed individual cubes fall across panel grooves, stopping at the current face's outer edge. Rotation moves existing colors and holes between faces, preserves score and count, locks input during animation, then applies face gravity. Gravity arrows remain tied to world face orientations (vertical sides down, top/bottom toward +Z, matching normal mode).

## Data contract and work
1. Model: new `js/challenge-rubik.js`, integration in challenge-world. Expose `ChallengeRubik.build/update/turn/settle/info`, `world.rubik.faces` (n,d,r vectors), `.turn` active animation/null. Cells carry `rubikFace`, `rubikRow`, `rubikCol` (0..14), `cubie` integer xyz (-1..1), fixed home centers and face bases. `world.action('turn',{axis:0..2,layer:-1..1,direction:-1|1})`. Update animates real cell geometry and dark body pieces; exact quarter-turn permutation on completion. Removal and turn completion use the same 15-slot gravity columns, never cross faces. Moves feed existing slide animation. Model tests cover occupancy, exact/inverse/four turns, holes, axis coverage, gravity across seams, pause boundaries, score independence.
2. UI: `ChallengeRubikControls` in a separate file; integrate ChallengeGame, app pointers, index loading and naming. White screen-projected, depth-visible edge controls with touch targets, six face arrows. No assembly tray. Rotation input consumed before camera/elimination; pause/intro/active-turn/settling guards. Camera fitting includes cube body and controls. UI tests replace assembly-specific tests and assert rotation/pointer behavior.
3. Root integration: browser QA replaces assembly scenarios with mouse/touch slice turns and cube screenshots, removes obsolete assembly assumptions in other tests/docs. Review, full Node suite and desktop/mobile WebGL QA; publish to authorized star/main.

Implementation choices: fixed 90-degree turns, roughly half-second animation; face gravity is fixed to the six resting world faces. Existing matching still requires visible shared edges; grooves do not create hidden matching links. All twelve challenges remain unlocked and start at zero.

## User additions during implementation
- Level 7: equal-size perpendicular rings with connected intersections and broad quadrilateral blocks, no tiny triangular strips.
- Level 3: retain a round sphere, with broad quadrilateral colored patches rather than independent thin/triangular fragments.
- Level 6: taper solid quadrilateral blocks with the frustum outline; remove skinny color strips.
- Level 10: fix sling band/pouch depth and loaded cube intersection with the handle; pull toward viewer, launch from actual loaded cube.
- Level 11: default front-facing horizontal composition, camera pan only (no orbit/roll), retain zoom and reset; remove bottom shift control panel.
- Level 12: upward-pointing obstacles with matching pairs and ball clearance, visible direction-adjustable launcher, preserve three launches and current scoring.
- Global zoom: map the full slider travel to effective zoom bounds; no plateau after halfway, while keeping full geometry visible at maximum.

Mobile Rubik controls show the most front-facing face's twelve edge arrows to avoid overlap; orbit exposes another face's controls. All six face gravity indicators remain attached to their faces. Dark Rubik bodies occlude rear-face selection and matching through holes.
