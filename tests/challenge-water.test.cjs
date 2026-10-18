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
  for(const c of w.cells)for(let axis=0;axis<3;axis++){
    assert.ok(c.center[axis]-.2>=w.water.layout.tankMin[axis]-1e-8);
    assert.ok(c.center[axis]+.2<=w.water.layout.tankMax[axis]+1e-8);
  }
  for(const c of fillers)assert.equal(w.canRemoveCell(c.id),false);
  assert.deepEqual(w.remove(fillers.map(c=>c.id)),[]);
  assert.ok(fillers.every(c=>c.color===6));
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
  const w=world(),seal=w.cells.find(c=>c.seal);
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
