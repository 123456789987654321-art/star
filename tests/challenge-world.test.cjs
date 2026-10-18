const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('challenge world module exists',()=>assert.ok(fs.existsSync(require('node:path').join(__dirname,'../js/challenge-world.js'))));
function world(n,rng=()=>0.2){require('../js/challenge-geometry.js');const W=require('../js/challenge-world.js');return new W(n,rng);}

test('solid adjacency rejects diagonal edge contact but accepts a shared face',()=>{
  const w=world(1);
  // Explicit closed cubes isolate the rule from the tessellation of any level.
  const poly={vertices:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],faces:[[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]]};
  w.cells=[[0,0,0],[1,1,0],[1,0,0]].map((center,id)=>({id,center,color:3,component:0,poly}));
  const pairs=w.contacts().map(p=>p.join(':'));
  assert.ok(!pairs.includes('0:1'),'diagonal edge is not a shared face');
  assert.ok(pairs.includes('0:2'),'shared face remains connected');
  w.cells[1].component=1;w.revision++;w._contactCache=null;
  assert.ok(!w.contacts().some(([a,b])=>a===0&&b===1),'different components must not enable diagonal contact');
  w.level=12;w.revision++;w._contactCache=null;
  assert.ok(!w.contacts().some(([a,b])=>a===0&&b===1),'marble blocks also require face contact');
});
test('all twelve worlds start independent and expose real cells',()=>{for(let n=1;n<=12;n++){const w=world(n);assert.equal(w.score,0);assert.equal(w.result,null);if(n!==8)assert.ok(w.cells.length>10);assert.equal(new Set(w.cells.map(c=>c.id)).size,w.cells.length);}});

test('every challenge rejects vertex-only physical contact, including clipped blocks',()=>{
 const poly={vertices:[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],faces:[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]};
 for(let level=1;level<=12;level++){
  const w=world(level);
  w.cells=[[0,0,0],[1,1,1],[1,0,0]].map((center,id)=>({id,center,poly,color:0,component:id,clipped:true}));
  const pairs=w.contacts();
  assert.ok(!pairs.some(([a,b])=>a===0&&b===1),'level '+level+' corner');
  assert.ok(pairs.some(([a,b])=>a===0&&b===2),'level '+level+' face');
 }
});
test('removal scores unique cells and never awards removed slots again',()=>{const w=world(1),ids=w.cells.slice(0,3).map(c=>c.id);assert.equal(w.remove([...ids,ids[0]]).length,3);assert.equal(w.score,45);assert.equal(w.remaining(),w.cells.length-3);});
test('assembly consumes no random colors until completion and cannot reroll',()=>{let calls=0;const w=world(8,()=>{calls++;return .3;});w.action('add','box');w.action('add','box');assert.equal(calls,0);assert.ok(w.cells.every(c=>c.color===6));assert.equal(w.remove(w.cells.map(c=>c.id)).length,0);w.action('complete');assert.equal(w.phase,'play');assert.ok(calls>0);const colors=w.cells.map(c=>c.color);w.action('complete');assert.deepEqual(w.cells.map(c=>c.color),colors);});
test('water requires an open physical channel and intact seals',()=>{const w=world(4);w.update(1);assert.equal(w.water.progress,0);w.remove(w.cells.filter(c=>!c.seal).map(c=>c.id));for(let i=0;i<200;i++)w.update(.05);assert.equal(w.result,'win');const leaking=world(4);leaking.remove(leaking.cells.map(c=>c.id));for(let i=0;i<100;i++)leaking.update(.05);assert.equal(leaking.water.leaking,true);assert.notEqual(leaking.result,'win');});
test('gears lock removal while rotating but never remove automatically',()=>{const w=world(9),n=w.remaining();w.update(2.5);assert.equal(w.gears.moving,true);assert.equal(w.remove(w.cells.slice(0,3).map(c=>c.id)).length,0);assert.equal(w.remaining(),n);w.update(.8);assert.equal(w.gears.moving,false);});
test('shot follows preview, finite ammunition leads to elimination',()=>{const w=world(10),n=w.ammo.length;assert.ok(n>0);const expected=w.trajectory.at(-1).slice();w.action('shoot');for(let i=0;i<100;i++)w.update(.02);assert.ok(w.lastImpact.every((v,i)=>Math.abs(v-expected[i])<1e-6));for(let j=1;j<n;j++){w.action('shoot');for(let i=0;i<100;i++)w.update(.02);}assert.equal(w.ammo.length,0);assert.equal(w.phase,'play');});
test('seesaw starts balanced and responds to removed mass',()=>{const w=world(11);assert.equal(w.seesaw.angle,0);w.remove(w.cells.filter(c=>c.side==='left').slice(0,20).map(c=>c.id));w.update(.1);assert.notEqual(w.seesaw.angle,0);w.action('shift',{side:'left',delta:-100});assert.ok(w.seesaw.left>=.55);});
test('three marble drops through a cleared board land in the central bin',()=>{const w=world(12);w.remove(w.cells.map(c=>c.id));for(let drop=0;drop<3;drop++){w.action('release');for(let i=0;i<500&&w.marble.released;i++)w.update(.02);assert.equal(w.marble.lastBin,2);assert.equal(w.marble.drops,drop+1);if(drop<2)assert.equal(w.result,null);}assert.equal(w.result,'win');});

test('assembly rejects detached parts and undo restores deleted components',()=>{const w=world(8);w.action('add','box');w.action('add','box');w.action('translate',{axis:'x',delta:4});w.action('complete');assert.equal(w.phase,'assemble');w.action('undo');w.action('remove-component');assert.equal(w.components.length,1);w.action('undo');assert.equal(w.components.length,2);assert.ok(w.cells.some(c=>c.component===1));w.action('complete');assert.equal(w.phase,'play');});
test('assembly rejects intersecting parts',()=>{const w=world(8);w.action('add','box');w.action('add','box');w.action('translate',{axis:'x',delta:-1});w.action('complete');assert.equal(w.phase,'assemble');});
test('marble collides with remaining physical blocks',()=>{const w=world(12);w.action('release');for(let i=0;i<70;i++)w.update(.01);assert.ok(w.marble.position[1]>2.2);assert.equal(w.result,null);});
test('target preview uses polygon boundary and fills the indicated missing slot',()=>{const w=world(10),hole=w.cells.find(c=>c.hole);w.action('aim',{x:hole.center[0],y:hole.center[1]});assert.equal(w.previewHit.id,hole.id);const score=w.score;w.action('shoot');w.update(2);assert.ok(hole.color>=0);assert.equal(w.score,score);});
test('target collision follows the smooth polygon perimeter',()=>{const w=world(10);const a=Math.PI/20;w.action('aim',{x:-1.6+1.245*Math.cos(a),y:1.245*Math.sin(a)});assert.notEqual(w.previewHit.id,null);w.action('aim',{x:-1.6+1.251*Math.cos(a),y:1.251*Math.sin(a)});assert.equal(w.previewHit.id,null);});
test('physical contacts do not contain a cell paired with itself',()=>{const w=world(10);assert.ok(w.contacts().every(([a,b])=>a!==b));});
test('seesaw stacked solids share real face contacts despite different tessellation',()=>{const w=world(11);assert.ok(w.contacts().some(([a,b])=>w.cells[a].component!==w.cells[b].component));});
test('seesaw can bring opposing assemblies into physical contact',()=>{const w=world(11);w.action('shift',{side:'left',delta:-10});w.action('shift',{side:'right',delta:-10});for(let i=0;i<100;i++)w.update(.1);assert.ok(w.contacts().some(([a,b])=>w.cells[a].side!==w.cells[b].side));});

test('assembly snap connects rotated components using separating axes',()=>{const w=world(8);w.action('add','box');w.action('add','sphere');w.action('rotate',{axis:'z',angle:.37});w.action('translate',{axis:'x',delta:2});w.action('snap');w.action('complete');assert.equal(w.phase,'play');});
test('gears and crossed rings provide real cross-component physical contacts',()=>{for(const n of [7,9]){const w=world(n);assert.ok(w.contacts().some(([a,b])=>w.cells[a].component!==w.cells[b].component));}});
test('marble starts with physically adjacent removable same-color blocks',()=>{const w=world(12);assert.ok(w.contacts().some(([a,b])=>w.cells[a].color===w.cells[b].color));});
test('a narrow cleared triangle channel lets all three balls pass while other blocks remain',()=>{const w=world(12);const ids=w.cells.filter(c=>c.grid[0]===3||c.grid[0]===4).map(c=>c.id);w.remove(ids);assert.ok(w.remaining()>150);for(let drop=0;drop<3;drop++){w.action('release');for(let i=0;i<500&&w.marble.released;i++)w.update(.02);assert.equal(w.marble.lastBin,2);assert.equal(w.marble.drops,drop+1);}assert.equal(w.result,'win');});
test('shot block touches target and later shots stack on actual impact surface',()=>{const w=world(10),c=w.cells.find(c=>c.color>=0&&c.ring===10);w.action('aim',{x:c.center[0],y:c.center[1]});w.action('shoot');w.update(2);const added=w.cells.at(-1);assert.ok(Math.abs(added.center[2]-.19)<1e-8);assert.ok(w.contacts().some(pair=>pair.includes(added.id)&&pair.includes(c.id)));const first=added.id;w.action('shoot');w.update(2);assert.ok(w.cells.at(-1).center[2]>.19);assert.ok(w.contacts().some(pair=>pair.includes(first)&&pair.includes(w.cells.at(-1).id)));});
test('damaged reachable seal records the exact leak origin',()=>{const w=world(4);w.remove(w.cells.map(c=>c.id));w.update(.1);assert.equal(w.water.leaking,true);assert.ok(w.water.leakPosition);assert.ok(w.cells.some(c=>c.seal&&c.color<0&&c.center.every((v,i)=>v===w.water.leakPosition[i])));});
test('water barrier openings stay fixed without moving seals or wall fillers',()=>{const w=world(4);const fixed=w.cells.filter(c=>c.seal||c.immutable).map(c=>({id:c.id,center:c.center.slice(),color:c.color}));const block=w.cells.find(c=>c.component===0&&!c.seal&&!c.immutable);w.remove([block.id]);assert.equal(block.color,-1);assert.equal(w.moves.length,0);for(const saved of fixed){const current=w.cells.find(c=>c.id===saved.id);assert.deepEqual(current.center,saved.center);assert.equal(current.color,saved.color);}});
test('resting mechanisms preserve cached contact revision and seesaw stays playable while tilting',()=>{const gear=world(9),revision=gear.revision;gear.update(.1);gear.update(.1);assert.equal(gear.revision,revision);const w=world(11),rest=w.revision;w.update(.1);assert.equal(w.revision,rest);w.remove(w.cells.filter(c=>c.side==='left').slice(0,20).map(c=>c.id));w.update(.05);assert.equal(w.canRemove(),true);assert.ok(w.info().length>0);for(let i=0;i<400;i++)w.update(.1);assert.equal(w.canRemove(),true);const settled=w.revision;w.update(.1);assert.equal(w.revision,settled);});
test('water upper gate is fixed, one cube thick and spans the full tank section',()=>{const w=world(4),gate=w.cells.filter(c=>c.component===1);assert.equal(new Set(gate.map(c=>c.grid[0])).size,7);assert.equal(new Set(gate.map(c=>c.grid[1])).size,1);assert.equal(new Set(gate.map(c=>c.grid[2])).size,7);const before=gate[0].center[1];w.update(2.6);assert.equal(w.water.gateMoving,false);assert.equal(gate[0].center[1],before);});
