const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
require('../js/challenge-geometry.js');
const World=require('../js/challenge-world.js');
const path=require('node:path').join(__dirname,'../js/challenge-tower.js');
if(fs.existsSync(path))require(path);
function fresh(){
  assert.ok(global.ChallengeTower,'tower mechanics module must exist');
  const w=new World(1,()=>.2);
  w.cells=[];w.decorations=[];w.components=[];w.nextId=0;w.score=0;w.level=4;
  ChallengeTower.build(w);return w;
}
function remove(w,ids){const removed=w.remove(ids);ChallengeTower.afterRemove(w,removed);return removed;}
function advance(w,seconds,dt=1/60){for(let t=0;t<seconds-1e-9;t+=dt)ChallengeTower.update(w,Math.min(dt,seconds-t));}
test('tower contains real paired floors, supports and immutable structural solids',()=>{
  const w=fresh();assert.equal(w.tower.floors.length,5);
  for(const ids of w.tower.floors){assert.equal(ids.length,2);const pair=ids.map(id=>w.cells.find(c=>c.id===id));assert.equal(pair[0].color,pair[1].color);assert.ok(w.contacts().some(e=>e.includes(ids[0])&&e.includes(ids[1])));}
  const fixed=w.cells.filter(c=>c.immutable);assert.ok(fixed.length>=3);
  assert.ok(fixed.every(c=>!w.canRemoveCell(c.id)));assert.deepEqual(remove(w,fixed.map(c=>c.id)),[]);
  assert.ok(w.tower.personVisuals.length>=5);assert.equal(w.tower.person.alive,true);
  for(const d of w.tower.personVisuals){
    const upper=d.center[1]+Math.max(...d.poly.vertices.map(v=>v[1]));
    assert.ok(upper<=w.tower.person.y+w.tower.person.height+1e-8,'collision height includes the helmet');
  }
});
test('removing floors from top to bottom safely brings the person to ground',()=>{
  const w=fresh();
  for(const ids of [...w.tower.floors].reverse()){
    assert.deepEqual(remove(w,ids),ids);advance(w,1.5);
    assert.notEqual(w.result,'lose');
  }
  assert.equal(w.result,'win');assert.equal(w.phase,'finished');
  assert.ok(Math.abs(w.tower.person.y-w.tower.groundY)<1e-8);assert.ok(w.score>=500);
});
test('clearing all floors before landing produces a fatal tall fall',()=>{
  const w=fresh();remove(w,w.tower.floors.flat());advance(w,4);
  assert.equal(w.result,'lose');assert.equal(w.tower.failure,'fall');
});
test('removing the high beam supports drops a real solid onto the person',()=>{
  const w=fresh();remove(w,w.tower.roofSupports.flat());advance(w,2);
  assert.equal(w.result,'lose');assert.equal(w.tower.failure,'crush');
});
test('removing a floor support lowers its platform and carries the person without penetration',()=>{
  const w=fresh(),p=w.tower.person,initial=p.y;
  remove(w,w.tower.floorSupports.at(-1).flat());advance(w,1.5);
  assert.ok(p.y<initial-.5);assert.equal(w.result,null);assert.equal(p.alive,true);
  const floor=w.cells.find(c=>c.id===w.tower.floors.at(-1)[0]);
  assert.ok(Math.abs(p.y-(floor.center[1]+floor.towerHalf[1]))<1e-8);
});
test('fixed gravity steps preserve trajectory and outcomes at coarse and fine frame intervals',()=>{
  const a=fresh(),b=fresh();remove(a,a.tower.floors.at(-1));remove(b,b.tower.floors.at(-1));
  advance(a,.4,1/20);advance(b,.4,1/120);
  assert.ok(Math.abs(a.tower.person.y-b.tower.person.y)<1e-8);
  advance(a,1.6,.2);advance(b,1.6,1/120);
  assert.ok(Math.abs(a.tower.person.y-b.tower.person.y)<1e-8);
  assert.equal(a.result,b.result);
  const before=a.tower.person.y;ChallengeTower.update(a,0);assert.equal(a.tower.person.y,before);
});
test('riding a platform through a multi-floor collapse does not reset the fatal drop',()=>{
  const w=fresh();remove(w,w.tower.floorSupports.flat(2));advance(w,5);
  assert.equal(w.result,'lose');assert.equal(w.tower.failure,'fall');
});
test('all remaining tower solids stay disjoint during a support collapse',()=>{
  const w=fresh();remove(w,w.tower.floorSupports.at(-1).flat());
  for(let i=0;i<160;i++){
    ChallengeTower.update(w,1/120);
    const cells=w.cells.filter(c=>c.color>=0);
    for(let a=0;a<cells.length;a++)for(let b=a+1;b<cells.length;b++){
      const x=cells[a],y=cells[b];
      assert.ok([0,1,2].some(axis=>Math.abs(x.center[axis]-y.center[axis])>=x.towerHalf[axis]+y.towerHalf[axis]-1e-7),'solid bodies must not interpenetrate');
    }
  }
});
