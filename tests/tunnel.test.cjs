const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../js/board.js');
require('../js/mechanics.js');
function advance(tunnel, gravity, seconds = 3) {
  const arrivals = [];
  for (let i = 0; i < seconds * 60; i++) arrivals.push(...tunnel.update(1 / 60, gravity));
  return arrivals;
}
test('locked pieces remain still; opening gate permits tilt movement but occupied exits block escape', () => {
  const b = new Board(5); b.color.fill(0);
  const t = new CrossTunnel(b);
  advance(t, [-1, 0, 0]);
  assert.deepEqual(t.pieces[0].cell, [-1, 0]);
  t.openGate(0);
  assert.equal(advance(t, [-1, 0, 0]).length, 0);
  assert.equal(t.remaining(), 2);
  const outlet = t.exitId(-2, 0);
  b.remove([outlet]);
  const arrivals = advance(t, [-1, 0, 0]);
  assert.equal(arrivals.length, 1);
  assert.equal(arrivals[0].id, outlet);
  assert.equal(b.color[outlet], 6);
  assert.equal(t.remaining(), 1);
});
test('cross centre allows switching axis and two cubes never share a channel cell', () => {
  const b = new Board(5); b.color.fill(0);
  const t = new CrossTunnel(b);
  t.openGate(0); t.openGate(1);
  advance(t, [1, 0, 0], 1);
  assert.deepEqual(t.pieces[0].cell, [1, 0]);
  advance(t, [-1, -1, 0], 0.4);
  const occupied = t.pieces.filter(p => !p.exited).map(p => p.cell.join(','));
  assert.equal(new Set(occupied).size, occupied.length);
});
