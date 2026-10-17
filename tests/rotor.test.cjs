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
  rotor.update(0.5);
  assert.ok(Math.abs(rotor.angle - Math.PI - 0.325) < 1e-9);
  assert.equal(rotor.remaining(), 6, 'rotation does not automatically eliminate blocks');
});
