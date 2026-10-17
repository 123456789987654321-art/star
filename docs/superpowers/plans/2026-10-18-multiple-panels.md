# Multiple panel progression implementation plan

**Goal:** Normal campaign sizes 5/6/7/8/9 use 1/2/3/4/5 panels, all 2x3. Challenge and independent test entries retain their prior configuration.

**Confirmed design:** Rotors 1-4 share +X host face, phase offsets top/right/bottom/left, rotating clockwise with the existing hold/turn cycle. At size9 panel5 orbits the four adjacent faces (+Y,-Z,-Y,+Z), pausing against each. Perspective panels are fixed outside distinct faces. All physical rotors require actual contact; perspective panels use visible seams. Normal campaign retains existing progression and scoring rules.

**Architecture:** Extend Rotor/PerspectivePanel with a panelCount argument, flat unique IDs and per-piece basis. Use oriented-cube contact tests for physical contacts on all host orientations. Generalize application and projection loops to colors.length, keeping each panel's grid adjacency separate.

## Tasks
- [x] Add regression tests for counts, distinct-face placement, shared-host stops, pairwise nonpenetration, fifth orbit and grid alignment.
- [x] Implement geometry and physical contacts; preserve old 5x5 behavior.
- [x] Generalize perspective picking and app rendering, hints, pop/counting and future-move checks.
- [x] Verify all sizes and multi-panel eliminations, full suite, desktop/mobile browser rendering, and fresh review.
- [ ] Update docs and publish verified changes to star/main; check Render scripts.

## Review focus
- Adjacent rotors must not overlap during movement or at stops.
- IDs from different panels must not become grid neighbors accidentally.
- Ring panel should not penetrate the body and must contact all four side faces.
- Hints, remaining counts and settlement must include panels after the first six cubes.
- Fifth perspective panel remains clickable and uses actual visible seams.

## Implementation rulings and verification
- Multiple host panels retain a rigid relative layout during turns, allowing temporary corner overhang rather than compressing plates into each other; stop footprints remain grid-aligned. Single-panel 5x5 behavior retained. Explained to user during work.
- Review found same-panel nonadjacent color potential-move false positives and ring edge-only contacts. Both received failing regressions, then fixes.
- Latest user steering: visual pairing is exclusive to perspective levels. Ordinary and rotor levels now ignore projected links and settle based on physical combinations. Applies to formal/test modes.
- 83 tests passed. Browser checked all expanded level tile counts, mobile/desktop rendering, fifth-panel raycast click, and normal/rotor projection exclusion. Synthetic CDP pointer sequence did not invoke click in this harness; raycast click entry was verified directly. No input-handler changes were made.
