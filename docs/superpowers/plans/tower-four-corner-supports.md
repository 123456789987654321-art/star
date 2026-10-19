# Fourth challenge: six-floor tower

User clarification: this revises the existing fourth challenge, 高楼营救.

- Six floors, each 8 × 9 cells wide, with two independent cube layers above one complete removable colored plate.
- Four corner pillars per floor; interpret the requested 3 × 4 pillar as a 3 × 3 cross-section, four cells tall. Some pillars are immutable.
- Losing one corner, or two diagonal corners, leaves the floor level. Losing adjacent corners tilts it toward the unsupported side.
- Remaining pillar fragments stop a falling/tilting plate. Removing all pillars lets it settle on the floor below.
- Removing a full base plate releases its upper cubes and any supported person immediately.
- Keep rescue success/fall/crush outcomes, independent level score, entry help and free camera controls.

Implementation: tower model and focused physics tests; then browser integration, instructions and six-floor QA scenarios. Validate unit suite, desktop/mobile rendering, rescue and failure paths before publishing to the existing star/main remote.

Implemented with fixed 60 Hz simulation, spatial collision buckets, swept box collisions and cached settled structures. Individual upper cubes lose support independently. Floor tilt currently uses one axis, capped at 0.48 radians; contact with other tilted structures is conservative to prevent penetration.

Review caught and resolved unsupported upper cubes, three-corner loss, rotated pillar contact and excessive collision work. Browser checks cover six-floor geometry, adjacent loss, unchanged camera, immediate base release, safe descent, fatal fall and crushing; desktop and mobile screenshots checked.
