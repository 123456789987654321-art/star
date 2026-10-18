Latest revision: rotor levels now exclusively use physical contacts, including body matching and future-move checks. Normal/challenge each have a level picker with persisted cleared levels, locked grey buttons, and a separate continue entry. Replays restore entry scores; test mode excluded from progress. 65 tests and Edge menu clicks, persistence, mobile layout and rotor exclusion passed.

# Progress

## 2026-10-18 challenge redesign

- Completion verification:135/135 Node tests passed; real Edge runner results all12 GL0, errors=[], failed=[]; actual clicks on10 direct elimination levels, assembly via DOM completion, target hole fill then elimination, water completion persisted, marble success, restartzero, pausefreeze, normal regression,390px layout. Final screenshots verified visible crossed rings, clear water tank/pipe/gate/seal/outlet and all5 marble bins.
- Independent review resolved internal water gravity and seesaw moving-input issues. Geometry review verified convex planar cells, downhill tracks, ring true contacts and65 sampled gear phases without penetration. Post-removal seam cache and slider pause guard regressions included.
- Known deliberate limitation documented in README: assembly uses conservative convex support for complex ring interlocking arrangements; ordinary snapped joins work. Browser diagnostics/profile/screenshots ignored under .qa/.

- Actual twelve-level implementation now underway on user's explicit request. Geometry agent owns shape mesh/Scene draw-pick; World agent owns scenarios; projection agent implemented arbitrary-poly visible seams; root owns adapter/UI/App routing.
- First real Edge headless QA rendered all12, no runtime errors or GL errors; mobile390 no document overflow. Screenshots in ignored .qa/. Fixed browser runner sandbox renderer hang by permitted escalated local-browser run; used ephemeral HTTP port after old runner occupied8136.
- Review fixes in progress: shape gravity tracks, gear nonpenetration, torus contact patches convexity, assembly validation/snap, accurate projection cache invalidation. Current suite118 passing before further geometry tests.

- Latest scoring requirement implemented: challenge always starts at zero (selection, legacy replay/continue, next level, restart); clears store no carryover score. Challenge target uses local tile count, currently 500 for existing 5x5 levels. Normal cumulative scoring retained. Three regressions failed before fix; full suite passed 85/85 after fix. GitHub push remains pending exact destination approval following auto-review rejection.

- Follow-up: user requested GitHub upload and all challenge levels open for testing. Opened existing challenge levels 1–12, retained normal locks, used zero entry score for unplayed jump entries, capped picker and completion at 12. New geometry gameplay remains unimplemented design.
- Regression failed first because challenge level 2 was locked; after patch, node --test passed 83/83. Publishing target is current upstream star/main.

- Inspected README, Board, LevelProfile, challenge timer/progression hooks and existing planning records.
- Read using-superpowers, brainstorming and planning-with-files skills; plan resolver selected legacy root planning files.
- Wrote twelve-level design with implementation constraints and acceptance checks; requested fresh builder review.
- User answered level 8 flow: assemble without visible colors, randomize colors after completion, then eliminate assembled geometry. Incorporated in design.
- Builder check returned "nothing important left". Product implementation has not started; full design confirmation is next.

- Read current Board, App, Scene and tests; no product changes for mechanics yet.
- User clarified four-exit XY channel, third-level black '?' coating, and no matching before coating is revealed.
- Last published commit: 188f039 (camera-relative orbit).
# Completion update

- Fixed remaining oblique-view mismatch: actual depth-picked visible boundaries now include seams created by partial occlusion, rather than requiring both original polygon edges to coincide.
- Real Scene projection/raycast regression yaw -1.4, pitch .65 failed with old path and passed with new path; visible gap and fully hidden panel rejected. Browser group [218,133,219] actually clicked for 45 points. 60/60 tests; fresh review no important findings.

- Final review: fixed seam visibility cache retaining obsolete occlusion from disappearing tiles. Added failing regression, then keyed cache on fading tile positions/scale and removal. Final suite 57/57.

- Fixed omitted partial-view matches: camera-facing face polygons replace full-cube silhouettes, with ray picks just inside each visible seam instead of requiring visible block centres. Partial shared edges count; corner-only and overlap still rejected.
- Added red/green/pink three-block group regressions. 56 tests passed; Edge actual click removed exactly three blocks for 45 points, WebGL error 0.

- Replaced tunnel class, application paths and obsolete tests with fixed perspective panel, visible convex-hull edge contacts and cached view checks.
- Centred rotor pivot and geometry; complete revolution containment regression passes at 5 and 7.
- Review caught shallow silhouette overlap accepted as seam. Added failing regression, then separated pixel alignment allowance from numerical overlap rejection.

- Test-only 7x7: generalized tunnel bounds and geometry by board pitch, moved initial wildcards to inner arm ends; added four-outlet and exit regression. Rotor contact tested at sizes 5 and 7.

- Latest revision: levels 1/2/3 normal/rotor/tunnel, three independent test buttons; score isolation and same-level restart verified in Edge.
- Rotor pivot lowered: all six cubes contact at rest. Step cycle 2.4s hold + 0.8s quarter turn.
- Channel transparency and click-through; internal wildcards participate in contact groups and only pop on click.
- Final review found premature settlement for a wildcard at the centre with occupied outlets. Regression failed first, then passed after retaining future reachable moves.
- Browser verified test entries, stepped rotor, transparent walls, actual wildcard click, mobile buttons; WebGL error 0, no runtime exceptions.

- User cancelled black coating: removed its level assignment and creation path; level 2 is ordinary 5x5. Rotor and tunnel stay in levels 3 and 4.

- Latest difficulty order and arrow-down reticle implemented.
- 45/45 tests passed, including rotor group removal and tunnel arrival into surface gravity.
- Edge checks: six-face reticle, coating render, rotor motion/contact, gate mouse click, wildcard exit; GL error 0, no runtime errors.
- Fresh review: no blockers. Minor deferred: dying tiles read coating from reused board slots, briefly changing their appearance during elimination.
- Ruling: later levels remain 5x5 pending user schedule (cost: no automatic growth yet).


## Continuation verification — 2026-10-18
- Fresh node --test: 177/177 passed. Browser suite passed all twelve levels, mouse charging/release, three-drop marble settlement, assembly desktop/touch, water, mobile and normal mode; no JS/WebGL errors.
- Updated stale browser checks to current charge/release throwing and three-drop scoring, including control refresh between simulated drops. Production code unchanged during continuation.
- Publication prepared for previously authorized star/main.

## User screenshot corrections — 2026-10-18
- Implemented visible water and continuous through-wall slope with immutable inner edge fillers and functional side leaks.
- First eight shapes and assembly miniatures now use clipped closed boundary solids; round target rim likewise. Broad ring contact flats retain no-overlap face contact. Added exact planar-body-volume tests.
- Charge repeats 0→100→0 at four seconds per leg. Seesaw and marble center/fill viewport. Marble shell/frame strengthened and bins add100/300/500/300/100.
- Return-to-picker HUD, help return outside scrolling content, removed menu test section. Challenge best-clear map persists max-only scores separately from zero-start attempts.
- Fresh final Node suite187/187 passed; full extended Edge suite errors=[], failed=[] covering real clicks/touch, mobile layout, score persistence, navigation and side leaks. Screenshots visually inspected. Independent review found no critical/important blockers.
- Publication preparation pending.

## Global maximum zoom correction
- Shared Scene camera-distance clamp fits transformed model bounds into viewport with4% edges; challenge panels reserve their occupied bottom area. Normal and challenge rendering both use it, covering slider/wheel/pinch, rotations and resize.
- Fresh full suite189/189 passed. Extended real Edge QA tested all15 normal and12 challenge levels at1280x900 and390x844 with max zoom plus rotation:54 cases all fit, no GL/JS errors. Screenshot confirmed marble bins above bottom panel. Independent review found no important blockers.
- User explicitly authorized automatic uploads to star/main for verified future changes.
