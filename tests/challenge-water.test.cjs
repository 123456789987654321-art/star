const test=require('node:test');
const assert=require('node:assert/strict');
require('../js/challenge-geometry.js');
const World=require('../js/challenge-world.js');
const world=()=>new World(4,()=>.2);
const advance=(w,seconds)=>{for(let t=0;t<seconds&&!w.result;t+=.05)w.update(.05);};

test('water barriers occupy the tank and immutable fillers cannot be removed',()=>{
  const w=world();
  assert.equal(w.water.capacity,100);
  assert.equal(w.water.amount,100);
  assert.equal(w.water.required,35);
  assert.ok(w.water.layout.pipePoints.at(-1)[1]>w.water.layout.fireCenter[1]+1.8,'outlet sits above the flame and to its side');
  assert.ok(w.water.layout.pipePoints.at(-1)[0]<w.water.layout.fireCenter[0]-1);
  const fillers=w.cells.filter(c=>c.immutable);
  assert.ok(fillers.length>0);
  for(const c of w.cells.filter(c=>!c.exterior))for(let axis=0;axis<3;axis++){
    assert.ok(c.center[axis]-.2>=w.water.layout.tankMin[axis]-1e-8);
    assert.ok(c.center[axis]+.2<=w.water.layout.tankMax[axis]+1e-8);
  }
  for(const c of fillers)assert.equal(w.canRemoveCell(c.id),false);
  assert.deepEqual(w.remove(fillers.map(c=>c.id)),[]);
  assert.ok(fillers.every(c=>c.color===6));
});

test('sloped barrier passes through opposite walls with two internal fixed edge fillers',()=>{
  const w=world(),slope=w.cells.filter(c=>c.barrier==='slope');
  assert.ok(slope.some(c=>c.center[0]-.2<w.water.layout.tankMin[0]));
  assert.ok(slope.some(c=>c.center[0]+.2>w.water.layout.tankMax[0]));
  const fixed=slope.filter(c=>c.immutable);
  assert.deepEqual([...new Set(fixed.map(c=>c.grid[2]))].sort(),[0,6]);
  const top=slope.flatMap(c=>w._vertices(c).filter((v,i)=>[2,3,6,7].includes(i)));
  const plane=top[0][1]-top[0][0]/3;
  assert.ok(top.every(v=>Math.abs(v[1]-v[0]/3-plane)<1e-8),'every block top lies in one sloping plane');
  for(const x of [0,6]){
    const join=slope.find(c=>c.grid[0]===x&&c.grid[2]===3);
    assert.equal(w.canRemoveCell(join.id),true);
    const outer=slope.find(c=>c.grid[0]===(x===0?-1:7)&&c.grid[2]===3&&c.sideSeal&&c.seal);
    assert.ok(outer);
    assert.ok(Math.abs((outer.center[1]-join.center[1])-(outer.center[0]-join.center[0])/3)<1e-8,'crossing follows one continuous slope');
  }
});

test('breaking either wall penetration leaks only after water reaches it',()=>{
  for(const x of [0,6]){
    const w=world(),seal=w.cells.find(c=>c.sideSeal&&c.grid[0]===(x===0?-1:7)&&c.grid[2]===3);
    assert.ok(seal,'each crossed wall needs a breakable seal');
    w.remove([seal.id]);w.update(.1);
    assert.equal(w.water.leaking,false);
    w.remove(w.cells.filter(c=>c.component===1).map(c=>c.id));w.update(.1);
    assert.equal(w.water.leaking,false,'remaining interior solid still seals the wall');
    const inner=w.cells.find(c=>c.barrier==='slope'&&c.grid[0]===x&&c.grid[2]===3);
    w.remove([inner.id]);w.update(.1);
    assert.equal(w.water.leaking,true);
    assert.deepEqual(w.water.leakPosition,seal.center);
    assert.ok(w.water.leaked>0);
    assert.ok(Math.abs(w.water.amount+w.water.used+w.water.leaked-100)<1e-8);
  }
});

test('intact barriers conserve water indefinitely and both barriers need an open route',()=>{
  const w=world();advance(w,20);
  assert.equal(w.water.amount,100);
  assert.equal(w.water.progress,0);
  // A missing lower barrier alone cannot reach water above the horizontal plate.
  w.remove(w.cells.filter(c=>c.component===0&&!c.seal).map(c=>c.id));
  advance(w,2);
  assert.equal(w.water.flowing,false);
  assert.equal(w.water.amount,100);
  while(w.water.gateMoving)w.update(.05);
  w.remove(w.cells.filter(c=>c.component===1).map(c=>c.id));
  advance(w,6);
  assert.equal(w.result,'win');
  assert.equal(w.water.used,35);
  assert.ok(Math.abs(w.water.amount-65)<1e-8);
  assert.equal(w.water.leaked,0);
});

test('isolated broken seals do not leak until a connected water route reaches them',()=>{
  const w=world(),seal=w.cells.find(c=>c.seal&&!c.sideSeal);
  w.remove([seal.id]);advance(w,2);
  assert.equal(w.water.leaking,false);
  assert.equal(w.water.amount,100);
  w.remove(w.cells.filter(c=>!c.seal).map(c=>c.id));
  w.update(.1);
  assert.equal(w.water.leaking,true);
  assert.deepEqual(w.water.leakPosition,seal.center);
  assert.ok(w.water.leaked>0);
  assert.ok(Math.abs(w.water.amount+w.water.used+w.water.leaked-100)<1e-8);
  advance(w,10);
  assert.equal(w.result,'lose');
  assert.ok(w.water.progress<1);
  assert.ok(w.water.amount<35-w.water.used);
});

test('small openings in both barriers connect through the tank while other blocks remain',()=>{
  const w=world();
  const upper=w.cells.find(c=>c.component===1&&c.grid[0]===1&&c.grid[2]===1);
  const lower=w.cells.find(c=>c.component===0&&!c.seal&&c.grid[0]===5&&c.grid[2]===5);
  w.remove([upper.id]);w.update(.1);
  assert.equal(w.water.flowing,false);
  assert.equal(w.water.amount,100);
  w.remove([lower.id]);w.update(.1);
  assert.equal(w.water.flowing,true);
  assert.ok(w.remaining()>60);
  assert.ok(w.water.used>0);
  assert.equal(w.water.leaked,0);
});

test('moving tank plate travels six cell widths and only pauses allow removal',()=>{
  const w=world(),plate=w.cells.filter(c=>c.component===1);
  assert.equal(plate.length,49);
  const before=plate[0].center.slice(),ids=plate.map(c=>c.id);
  w.update(2.8);
  assert.equal(w.water.gateMoving,true);
  assert.deepEqual(w.remove(ids),[]);
  assert.equal(plate[0].center[0],before[0]);
  assert.equal(plate[0].center[2],before[2]);
  assert.ok(plate[0].center[1]>before[1]);
  w.update(1.3);
  assert.equal(w.water.gateMoving,false);
  assert.ok(Math.abs(plate[0].center[1]-before[1]-2.4)<1e-8);
  assert.equal(w.remove(ids).length,49);
});
