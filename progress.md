# Progress

- Read current Board, App, Scene and tests; no product changes for mechanics yet.
- User clarified four-exit XY channel, third-level black '?' coating, and no matching before coating is revealed.
- Last published commit: 188f039 (camera-relative orbit).
# Completion update

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

