const test=require('node:test');
const assert=require('node:assert/strict');
require('../js/challenge-geometry.js');
const absolute=c=>c.poly.vertices.map(p=>p.map((v,i)=>v+c.center[i]));
test('main geometric challenges contain solid cube interiors and disjoint grid cells',()=>{
  for(const name of ['tetrahedron','cylinder','sphere','prism','frustum','torus','box']){
    const cells=ChallengeGeometry.make(name,{resolution:7});
    const cubes=cells.filter(c=>c.poly.vertices.length===8&&c.poly.faces.length===6&&c.poly.faces.every(f=>f.length===4)&&[0,1,2].every(i=>new Set(c.poly.vertices.map(v=>v[i].toFixed(7))).size===2));
    assert.ok(cubes.length>=5,name+' has cube interiors');
    assert.equal(cubes.length,cells.length,name+' consists entirely of cubes');
    const bounds=cells.map(c=>[0,1,2].map(i=>[Math.min(...absolute(c).map(v=>v[i])),Math.max(...absolute(c).map(v=>v[i]))]));
    for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++)assert.ok(bounds[i].some((b,k)=>Math.min(b[1],bounds[j][k][1])-Math.max(b[0],bounds[j][k][0])<1e-8),name+' cells occupy distinct grid slots');
  }
});
test('cylinder cap is a square grid, not radial triangles',()=>{
  const cells=ChallengeGeometry.make('cylinder',{resolution:7});let squares=0;
  for(const c of cells)for(const face of c.poly.faces){
    const points=face.map(i=>absolute(c)[i]);
    if(points.every(p=>Math.abs(p[1]-2)<1e-8)){
      if(points.length===4)squares++;
      assert.ok(Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0]))<=4/7+1e-8);
      assert.ok(Math.max(...points.map(p=>p[2]))-Math.min(...points.map(p=>p[2]))<=4/7+1e-8);
    }
  }
  assert.ok(squares>=20,'cap has broad square tiling');
});
test('gear cells are six-sided solid prisms with no triangle skins',()=>{
  for(const c of ChallengeGeometry.make('gear')){
    assert.equal(c.poly.vertices.length,8);
    assert.equal(c.poly.faces.length,6);
    assert.ok(c.poly.faces.every(f=>f.length===4));
  }
});
test('surface gravity never jumps over empty space or changes surface depth',()=>{
  for(const name of ['tetrahedron','cylinder','sphere','prism','frustum','torus','box']){
    const cells=ChallengeGeometry.make(name),tracks=new Map();
    for(const c of cells){if(!tracks.has(c.track))tracks.set(c.track,[]);tracks.get(c.track).push(c);}
    let transitions=0;
    for(const [track,lane] of tracks){
      assert.match(track,/^face[+-][xyz]:depth\d+:plane\d+:column\d+:segment\d+$/);
      lane.sort((a,b)=>a.order-b.order);
      const axis=track.startsWith('face+y:')||track.startsWith('face-y:')?2:1;
      const size=Math.max(...lane[0].poly.vertices.map(v=>v[axis]))-Math.min(...lane[0].poly.vertices.map(v=>v[axis]));
      for(let i=1;i<lane.length;i++){
        transitions++;
        assert.equal(lane[i].order,lane[i-1].order+1);
        assert.ok(Math.abs((lane[i].center[axis]-lane[i-1].center[axis])*(axis===2?-1:1)-size)<1e-8);
        for(let k=0;k<3;k++)if(k!==axis)assert.equal(lane[i].center[k],lane[i-1].center[k]);
      }
    }
    assert.ok(transitions>0,name+' exercises actual gravity lanes');
  }
});
test('perpendicular cube rings touch without overlapping solid volume',()=>{
  require('../js/challenge-world.js');
  const world=new ChallengeWorld(7,()=>.1);
  const spans=world.components.map(comp=>{
    const vertices=world.cells.filter(c=>c.component===comp.id).flatMap(c=>world._vertices(c));
    return Math.max(...vertices.map(p=>p[0]))-Math.min(...vertices.map(p=>p[0]));
  });
  assert.ok(spans[1]/spans[0]>=.70,'inner ring is nearly the diameter of the outer opening');
  const bounds=world.cells.map(c=>{
    const points=world._vertices(c);
    return [0,1,2].map(i=>[Math.min(...points.map(p=>p[i])),Math.max(...points.map(p=>p[i]))]);
  });
  for(let i=0;i<world.cells.length;i++)for(let j=i+1;j<world.cells.length;j++){
    if(world.cells[i].component===world.cells[j].component)continue;
    assert.ok(bounds[i].some((b,k)=>Math.min(b[1],bounds[j][k][1])-Math.max(b[0],bounds[j][k][0])<1e-8));
  }
  assert.ok(world.contacts().some(([a,b])=>world.cells[a].component!==world.cells[b].component));
});
test('annular bands have a rectangular solid cross-section and a large central opening',()=>{
  for(const resolution of [4,7]){
    const cells=ChallengeGeometry.make('torus',{size:2,resolution}),layers=new Map();
    for(const c of cells){const y=c.center[1].toFixed(7);if(!layers.has(y))layers.set(y,new Set());layers.get(y).add([c.center[0],c.center[2]].join(','));}
    assert.ok(layers.size>=2,'solid thickness includes multiple cube layers');
    const footprints=[...layers.values()];
    for(const footprint of footprints)assert.deepEqual(footprint,footprints[0],'every height layer has the same annular footprint');
    assert.ok(cells.every(c=>Math.hypot(c.center[0],c.center[2])>=1.44));
    assert.ok(cells.every(c=>Math.abs(c.center[1])<=.26));
  }
});
