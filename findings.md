# Level-mechanics findings

- Hollow shell Board has unique voxel cells and owner-face gravity. Even-size channels are not currently needed: level 2 is 5x5.
- Camera orbit tracks screen up in cube coordinates; gravity for tunnel = negative scene.up, projected onto its XY plane.
- Tile colors are 0..5. Reserve 6 for grey wildcard without adding it to random generation.
- Scene.pick accepts arbitrary boxes and nearest visible IDs, suitable for gates and tunnel walls if incorporated into the pick list.
- Existing hints/settlement must honor coatings and internal wildcard reserves.
