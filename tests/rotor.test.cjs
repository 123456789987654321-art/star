const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../js/board.js');
require('../js/mechanics.js');
test('2x3 rotor stays outside the shell and contacts only while its blade reaches the side', () => {
  const b = new Board(5); b.color.fill(0);
  const rotor = new Rotor(b, () => 0);
  assert.equal(rotor.colors.length, 6);
  assert.ok(rotor.contacts().length > 0);
  for (let i = 0; i < 6; i++) assert.ok(rotor.center(i)[0] - b.pitch / 2 >= 1 - 1e-8);
  rotor.angle = Math.PI;
  assert.equal(rotor.contacts().length, 0);
  assert.equal(rotor.remaining(), 6, 'rotation does not automatically eliminate blocks');
});

test('all six rotor cubes contact the shell at a resting position', () => {
  for (const size of [5,7]) {
    const b = new Board(size); b.color.fill(0);
    const r = new Rotor(b, () => 0);
    assert.equal(new Set(r.contacts().map(pair => pair[1])).size, 6);
    for (const [main, external] of r.contacts()) assert.ok(Math.abs(r.center(external-b.size)[0]-b.cellCenter(main)[0]-b.pitch)<1e-8);
  }
});

test('rotor holds for 2.4 seconds then turns a quarter turn over 0.8 seconds', () => {
  const r = new Rotor(new Board(5));
  r.update(2); assert.equal(r.angle, 0);
  r.update(0.8); assert.ok(Math.abs(r.angle - Math.PI / 4) < 1e-8);
  r.update(0.4); assert.ok(Math.abs(r.angle - Math.PI / 2) < 1e-8);
  r.update(2); assert.ok(Math.abs(r.angle - Math.PI / 2) < 1e-8);
});
