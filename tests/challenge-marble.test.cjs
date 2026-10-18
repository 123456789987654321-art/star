const test=require('node:test'),assert=require('node:assert/strict');
require('../js/challenge-geometry.js');const World=require('../js/challenge-world.js');
const fresh=()=>new World(12,()=>.42);
test('long marble board uses closed triangular solids and only shared edges connect',()=>{
 const w=fresh();assert.ok(w.cells.length>=200);assert.ok(w.cells.every(c=>c.poly.vertices.length===6));
 const ys=w.cells.map(c=>c.center[1]);assert.ok(Math.max(...ys)-Math.min(...ys)>8);
 const edges=w.contacts();assert.ok(edges.some(([a,b])=>a===0&&b===1));
 const a=w.cells[0],b=w.cells.find(c=>c.grid[0]===1&&c.grid[1]===1&&c.grid[2]===0);
 assert.ok(!edges.some(e=>e.includes(a.id)&&e.includes(b.id)));
});
test('three random colored drops preserve board and double total only for matching bins',()=>{
 const w=fresh();w.cells.forEach(c=>c.color=-1);w.score=250;
 for(let i=0;i<3;i++){
  const m=w.marble;assert.equal(m.drops,i);assert.ok(w.bins.includes(m.color));assert.equal(m.released,false);
  w.action('release');m.position=[(i===1?0:m.color-2)*1.08,-5.1,0];
  if(i===1)m.position[0]=((m.color+1)%5-2)*1.08;
  w.update(.01);assert.equal(m.drops,i+1);assert.equal(w.score,[500,500,1000][i]);
  if(i<2)assert.equal(w.result,null);
 }
 assert.equal(w.result,'lose');assert.equal(w.phase,'finished');assert.equal(w.target,1500);
});
test('triangle edge and corner impacts score once until the ball separates',()=>{
 const w=fresh(),c=w.cells[0];w.cells=[c];c.color=0;
 const points=w._vertices(c).slice(0,3),a=points[0],b=points[1];
 const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),n=[dy/len,-dx/len];
 w.action('release');const m=w.marble;
 m.position=[mid[0]+n[0]*.125,mid[1]+n[1]*.125,0];m.velocity=[-n[0],-n[1],0];w.update(.001);
 assert.equal(w.score,100);assert.equal(m.collisionCount,1);
 for(let i=0;i<10;i++){m.position=[mid[0]+n[0]*.125,mid[1]+n[1]*.125,0];m.velocity=[-n[0],-n[1],0];w.update(.001);}
 assert.equal(w.score,100);
 m.position=[0,6,0];m.velocity=[0,0,0];w.update(.001);
 const center=c.center,nx=a[0]-center[0],ny=a[1]-center[1],norm=Math.hypot(nx,ny);
 m.position=[a[0]+nx/norm*.125,a[1]+ny/norm*.125,0];m.velocity=[-nx/norm,-ny/norm,0];w.update(.001);
 assert.equal(w.score,200);assert.equal(m.collisionCount,2);
});
test('an approaching ball scores on actual impact and resting contacts do not farm points',()=>{
 const w=fresh();w.action('release');
 for(let i=0;i<600;i++)w.update(.005);
 assert.ok(w.marble.collisionCount>0);assert.equal(w.score,w.marble.collisionCount*100);
 const count=w.marble.collisionCount;
 for(let i=0;i<600;i++)w.update(.005);
 assert.equal(w.marble.collisionCount,count);
});
