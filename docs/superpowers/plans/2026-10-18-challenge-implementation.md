# Twelve challenge levels implementation plan

> Use subagent-driven-development and dispatching-parallel-agents for disjoint geometry and mechanics modules; root owns integration.

**Goal:** Implement all twelve requested challenge levels as playable untimed geometry/scenario games, unlocked, independently scored.
**Architecture:** Existing normal App remains intact. A ChallengeGame adapter owns challenge input/update/render and delegates to ChallengeWorld (rules), ChallengeGeometry (closed polyhedral cells), and Scene's extended polyhedral drawing/picking.
**Tech Stack:** Existing JavaScript/WebGL, no runtime dependency. Node tests and browser validation.
**Spec:** ../specs/2026-10-18-challenge-design.md; user's final request authorizes implementation now.

## Global constraints
- No challenge timer; every entry starts at zero; twelve unlocked levels; normal mode unchanged.
- Geometry must be real mesh geometry with matching picking, not decorative masks.
- All challenge levels support physical and visible projected-edge matching.
- Assembly remains neutral until completion, then random colors and elimination.
- Preserve prior GitHub destination star/main; complete implementation/validation before publishing.

## Shared interfaces
- `ChallengeGeometry.make(name, options={})` returns cells `{center:[x,y,z], poly:{vertices:[[x,y,z]], faces:[[index]]}, track:string, order:number}`. Vertices are relative to cell center. Options `size` default 2, `resolution` default 7. Names tetrahedron,cylinder,sphere,prism,frustum,torus,gear,box. `poly` closed convex cell (curved surfaces tessellated). Helpers transform and mesh optional.
- Scene `drawPoly(model,poly,color,highlight=0,alpha=1,hint=0)` and `Scene.pick` supports tiles with `.poly`; tile center/renderCenter, basis, size default identity scaling. Geometry does not modify App.
- `new ChallengeWorld(level,rng=Math.random)` owns `cells` (stable numeric id,color -1 removed/0..5 visible/6 neutral,center,poly,track,order,component), `decorations` (same geometry, rgb, alpha, no picking), `phase` (assemble/aim/play/finished), `status`, `target`, `score`, `result` (null/win/lose), `bounds` approximate radius.
- World `update(dt)` updates animations/mechanics (caller freezes when paused); `remove(ids)` returns actual removed IDs, awards 5*n*n and applies shape surface gravity; `contacts()` returns physical adjacent ID pairs; `action(name,value)` drives scene controls and returns feedback; `info()` returns instruction string; `remaining()` counts live cells; `finish()` evaluates current score/scene condition; `canRemove()` permits phase-safe input. Geometry dependency is browser global or Node global.
- For aiming `world.aim={x,y}` and `world.trajectory` array of world points. `action('aim',{x,y})`, `action('shoot')`; preview and actual collide identically. Assembly actions add shape, select component, translate axis/delta, rotate axis/angle, undo, complete. Seesaw action shift `{side,delta}`; marble release.

## Tasks
- [x] Geometry/render agent: write failing geometric/picking tests, implement eight shape generators and mesh render/pick support. Verify closed nonzero cells, silhouette, precise hole picking and legacy renderer tests.
- [x] World agent: write failing model/scenario tests, implement all levels and stage transitions; water leak/connectivity/fire, assembly neutrality, meshing gears, target trajectory/scoring, seesaw tilt/contact, marble collisions/bins. Verify with deterministic seeds.
- [x] Root integration: ChallengeGame adapter, accurate projected seams, DOM controls, camera gestures, local score and progress, no timers, 12 correct picker titles. Test real App routing and phase changes.
- [x] Review and browser QA: all twelve render and accept controls; resize/touch/pause/retry, WebGL errors; full Node suite, independent review and fix; documentation.
- [ ] Commit and push to authorized star/main after final visual pass.

## Review focus
- Legacy saved challenge totals must not affect new entries (adapter tests).
- Pause and browser resumption must not advance water/gears/projectiles/marble (world adapter dt tests).
- Transparent containers must not intercept cell picking; poly holes must stay clickable (geometry tests/browser).
- Initial uncolored assembly cannot be eliminated or rerolled after completion (world tests).
- Motion and camera changes invalidate seam links, and hidden geometry cannot create matches (projection tests/browser).

## Rulings
- Work in current user workspace to keep changes visible; no unrelated project changes. User explicitly requested actual implementation after prior planning stall, so continue without another plan approval round.
- Current artifacts and defaults are implementation guidance; original user geometry and mechanics requirements take priority.
