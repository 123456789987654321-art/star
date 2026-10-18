const test=require('node:test');
const assert=require('node:assert/strict');
require('../js/challenge-geometry.js');
const World=require('../js/challenge-world.js');

test('both targets use nonoverlapping solid cubes including the bullseye',()=>{
  const w=new World(10,()=>.2);
  for(const target of [0,1]){
    const cells=w.cells.filter(c=>c.targetIndex===target);
    assert.ok(cells.length>50);
    assert.ok(cells.some(c=>Math.hypot(c.center[0]-w.targetCenters[target][0],c.center[1])<1e-8));
    for(const c of cells){
      const spans=[0,1,2].map(axis=>Math.max(...c.poly.vertices.map(v=>v[axis]))-Math.min(...c.poly.vertices.map(v=>v[axis])));
      assert.equal(new Set(c.poly.vertices.map(v=>v.join(','))).size,8);
      assert.ok(c.poly.faces.every(f=>f.length===4));
      assert.ok(spans.every(s=>Math.abs(s-spans[0])<1e-8),'each block has equal width, height, and depth');
      assert.ok(Math.abs(c.volume-spans[0]**3)<1e-8);
      for(const other of cells.filter(other=>other.id>c.id)){
        assert.ok(c.center.some((v,axis)=>Math.abs(v-other.center[axis])>=spans[axis]-1e-8),'blocks do not overlap');
      }
    }
  }
  assert.equal(w.ammo.length,w.cells.filter(c=>c.hole).length);
  assert.ok([0,1].every(target=>w.cells.some(c=>c.targetIndex===target&&c.hole)));
});

test('ten target rings score the impact point and the projectile edge breaks ties upward',()=>{
  const shots=[[0,0,10],[.3,0,9],[.42,0,8],[.55,0,7],[.67,0,6],[.8,0,5],[.92,0,4],[1.05,0,3],[1.16,0,2],[1.16,.44,1],[.35,0,9],[.350001,0,8]];
  for(const target of [0,1])for(const [x,y,ring] of shots){
    const w=new World(10,()=>.2);
    for(const c of w.cells){c.color=1;c.hole=false;}
    w.action('aim',{x:w.targetCenters[target][0]+x,y});
    assert.notEqual(w.previewHit.id,null);
    assert.equal(w.previewHit.ring,ring);
    w.action('shoot');w.update(2);
    assert.equal(w.score,ring*10);
  }
});
