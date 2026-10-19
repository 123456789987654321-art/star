## Active request — 2026-10-18 challenge redesign

Latest user explicitly requests implementing all 12 levels now. Execution plan: docs/superpowers/plans/2026-10-18-challenge-implementation.md. Implementation complete: geometry, World, projection and adapter; all12 browser entries and real clicks validated, no GL/JS errors.135 Node tests pass; independent review findings fixed. True gear/ring contact, downhill tracks, assembly snap, water seals, target collision, seesaw stops and marble channel verified. Final local commit/upload to authorized star/main in progress. Previous design approval gate superseded by explicit implementation request.

- Replace timed challenge with twelve geometric/scenario levels; perspective matching in every challenge level.
- Design: docs/superpowers/specs/2026-10-18-challenge-design.md.
- User clarified level 8: neutral hidden colors while assembling; assign random colors only on completion, then eliminate assembled model.
- Current phase: all twelve gameplay implementations verified; commit/upload pending.
- Design builder review and final code review completed; final code findings resolved.

## Previous scope

Latest scope: main-body perspective pairing in ALL formal and test levels. Unique block IDs; visible depth-picked seams; physical adjacency retained. Main5/test7 unchanged. Global scan skips internal faces and physically shared edges. Review regression retains rotating panel as an occluder.

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

## Active correction — visible water and through-wall sloped barrier
User supplied screenshots: water must be visible; slope must pass through opposite tank faces, with two internal immutable side fillers and breakable wall penetrations. Plan: add regressions, extend slope and model side leaks, strengthen water surface/volume, run Node and real-browser visual verification. Existing star/main publication destination retained.

## Scope addition — clipped boundary blocks for levels 1–8
User explicitly allows partly cut solid blocks to make outlines continuous. Keep interior cube grids, clip boundary cubes against planes/curved polygon approximations, preserve solid picking/contacts and ring holes. Apply to first eight levels and assembly thumbnails only; later levels retain their geometry. Water slope becomes continuous, with wall penetration and immutable edge fillers. Validate convex closed nonzero cells, shape boundaries, contact/no-overlap, full tests, browser screenshots.

## Additional user requirements during implementation
- Level10 slow uniform repeating charge 0→100→0, four seconds each direction; clipped round target rims.
- Levels11/12 close centered default view, desktop and phone.
- Level12 visible shell/frame; fixed additive slot scores100,300,500,300,100 replacing same-color doubling.
- Return-to-picker HUD button; right-side return button attached to help dialog; remove menu test section.
- Challenge picker historical best clear score per level, max-only updates; current attempt always starts0.
- Scenario agent owns world and tests; UI agent owns app/game/index/style and UI tests; root owns geometry, water visual, browser checks and integration.

Implementation complete for all listed screenshot corrections and follow-ups.187 Node tests and extended real Edge checks passed; independent review no blockers. Final commit/upload next.

## Active zoom limit correction
User requests max zoom across ALL levels fit full main geometry inside viewport with small margin; slider, wheel and pinch share cap; recompute on rotation/resize. Automatically upload verified fixes to star/main per explicit user authorization. Implement shared Scene camera limit based on live geometry bounds and actual camera target; preserve normal/challenge paths. Verify desktop/mobile all12 and normal15 including rotation.

Zoom correction complete:189 tests, all54 desktop/mobile maximum-zoom cases and visual QA passed. Automatic upload authorized.

## Active: separate challenge 4 and challenge 10 replacements
- Confirmed: level4 replaces water with a tower rescue. Paired colored slabs/columns are removable; fixed gray solids remain; excessive fall or crushing loses, safe ground arrival wins.
- Confirmed: level10 stays a separate target level, switches to drag-back slingshot, with exactly5 holes on EACH target and10 shots total. No timed charging.
- Core modules and integration complete. Final190 Node tests passed; real Edge QA errors=[]/failed=[], including independent tower win/fall/crush and actual slingshot pointer drag. Desktop sling and mobile tower screenshots visually checked; independent review no blockers. Ready for automatic upload.

## Fourth challenge: six-floor, four-corner tower revision
- User confirmed this changes the existing fourth challenge, 高楼营救.
- Six 8×9 floors, each with two independent cube layers above one complete support plate; four 3×3×4 corner pillars, with varying immutable pillars.
- Single/diagonal loss stays level; same-side or three-corner loss tilts; stumps catch plates and missing pillars allow collapse onto lower floors. Removing a base immediately releases cubes and the person.
- Implemented and reviewed; all 194 tests passed, including 12 tower regressions. Final desktop/mobile browser report has no errors or failed checks. Automatic star/main upload follows.

## Challenge revision batch complete
- Replaced level 8 assembly with rotating Rubik faces and cross-groove microcube gravity.
- Revised sphere, frustum and crossed rings to broad quadrilateral surfaces.
- Corrected sling depth, restricted seesaw camera to translation, and added pointed marble obstacles with aimable launcher.
- Mapped the full zoom slider to its effective range; stabilized resting and sling cameras.
- Final verification: 212/212 Node tests passed; real Edge desktop/mobile report errors=[] and failed=[]. Independent review completed. Publish to star/main authorized.
