# Completed-run records and remainder rewards

**Goal:** Save challenge records only after a completed run; audit ending checks in all 15 normal and 11 challenge levels; apply the exact shared remainder reward and explosion timing.
**Architecture:** Normal mode keeps target scoring and its animation system. Challenge world owns completion outcome/reward; ChallengeGame stages leftover explosions before result/save. Scene mechanics must settle before no-move conclusions. No intermediate/aborted/failed attempt may update challenge best.

- [x] Restore completion-only record updates; test exit, retry, scene failure and finished high-score cases.
- [x] Normal rewards: 0=2000, 1..12=(13-n)*100, >=13=0; <=13 staggered explosions, >13 simultaneous.
- [x] Challenge rewards use the same table, one-time only; stage explosions then settlement without extra matching points.
- [x] Audit ordinary, rotating-panel, perspective, geometry, tower, Rubik, gears, targets and seesaw termination; respect possible future moves.
- [x] Run Node and actual browser regressions and independent review.
- [ ] Publish to star/main.

User confirmed: future camera/mechanism moves keep a run alive even without a match in the current view. Free-camera challenge detection conservatively retains matching colors, rather than treating a finite camera sweep as proof of no future match. Fixed-view seesaw checks settled contacts; moving scenes wait for geometry to settle.
