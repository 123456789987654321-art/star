const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = vm.createContext({ console, document: { readyState: 'loading', addEventListener() {} } });
context.window = context;
for (const file of ['mathx', 'board', 'mechanics', 'scene', 'app']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'), context);
}
const { App, Board, Scene } = context;
function bounds(t) {
  const half = [0, 1, 2].map(a => t.size.reduce((s, v, k) => s + Math.abs(t.basis[k * 3 + a]) * v / 2, 0));
  return { min: t.center.map((v, a) => v - half[a]), max: t.center.map((v, a) => v + half[a]) };
}
for (const N of [4, 5, 6, 7, 8, 9, 10]) {
  test(`N=${N}: shell consists of equal cubes, with shared edge and corner blocks`, () => {
    App.board = new Board(N);
    assert.equal(App.board.size, N ** 3 - (N - 2) ** 3);
    for (let id = 0; id < App.board.size; id++) {
      const tile = App.makeTile(id, 0);
      for (const side of tile.size) assert.ok(Math.abs(side - 2 / N) < 1e-9);
    }
  });
  test(`N=${N}: six surfaces cover edges and corners, with an empty interior and no overlapping blocks`, () => {
    App.board = new Board(N);
    const boxes = Array.from({ length: App.board.size }, (_, id) => bounds(App.makeTile(id, 0)));
    const contains = (b, p) => p.every((v, a) => v >= b.min[a] - 1e-9 && v <= b.max[a] + 1e-9);
    assert.ok(!boxes.some(b => contains(b, [0, 0, 0])), 'interior must be empty');
    for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
      for (let i = 0; i <= N * 4; i++) for (let j = 0; j <= N * 4; j++) {
        const p = [0, 0, 0];
        p[axis] = sign;
        p[(axis + 1) % 3] = -1 + i / (N * 2);
        p[(axis + 2) % 3] = -1 + j / (N * 2);
        assert.ok(boxes.some(b => contains(b, p)), `hole at ${p}`);
      }
    }
    for (let i = 0; i < boxes.length; i++) {
      assert.ok(boxes[i].min.every((v, a) => v >= -1 - 1e-9 && boxes[i].max[a] <= 1 + 1e-9));
      for (let j = i + 1; j < boxes.length; j++) {
        assert.ok(![0, 1, 2].every(a => Math.min(boxes[i].max[a], boxes[j].max[a]) - Math.max(boxes[i].min[a], boxes[j].min[a]) > 1e-9), `overlap ${i}/${j}`);
      }
    }
  });
}
test('picking through a removed front tile reaches the visible back tile', () => {
  App.board = new Board(5);
  const back = App.makeTile(App.board.id(2, 1, 2), 0);
  const front = App.makeTile(App.board.id(0, 1, 2), 0);
  const scene = Object.create(Scene.prototype);
  scene._ray = () => ({ o: [0, 0, 5], d: [0, 0, -1] });
  assert.equal(scene.pick(0, 0, [back, front]), front.id);
  assert.equal(scene.pick(0, 0, [back]), back.id);
  assert.equal(scene.pick(0, 0, []), -1);
});

test('connected groups match physical face contact, including shared corners', () => {
  const b = new Board(5);
  b.color.fill(0);
  assert.equal(b.groupOf(0).length, 98);
  for (let id = 0; id < b.size; id++) {
    const p = b.cellCenter(id);
    const expected = [];
    for (let other = 0; other < b.size; other++) {
      const q = b.cellCenter(other);
      const delta = p.map((v, a) => Math.abs(v - q[a]));
      if (delta.filter(v => v > 1e-8).length === 1 && Math.abs(delta.reduce((a, v) => a + v, 0) - b.pitch) < 1e-8) expected.push(other);
    }
    assert.deepEqual(Array.from(b.neighbors(id)).sort((a, b) => a - b), expected);
  }
});

test('gravity preserves blocks and keeps all destination cubes on the hollow shell', () => {
  App.board = new Board(5);
  const b = App.board;
  for (let id = 0; id < b.size; id++) b.color[id] = id % 3 === 0 ? -1 : id % 6;
  const before = Array.from(b.color).filter(c => c >= 0).sort();
  const moves = b.applyGravity();
  assert.ok(moves.length > 0);
  assert.deepEqual(Array.from(b.color).filter(c => c >= 0).sort(), before);
  for (const move of moves) {
    assert.equal(b.faceOf(move.from), b.faceOf(move.to));
    assert.ok(b.rowOf(move.to) > b.rowOf(move.from));
    const tile = App.makeTile(move.to, b.colorOf(move.to));
    assert.ok(tile.center.some(v => Math.abs(Math.abs(v) - 0.8) < 1e-8));
    assert.ok(tile.size.every(v => Math.abs(v - 0.4) < 1e-8));
  }
  assert.equal(b.applyGravity().length, 0);
});

test('six face arrows point in the same world direction as falling blocks', () => {
  const b = new Board(5);
  const scene = Object.create(Scene.prototype);
  scene.tmpM = context.MX.m4.create();
  const models = [];
  scene.drawBox = model => models.push(Array.from(model));
  scene.drawDirectionArrows(b);
  assert.equal(models.length, 6);
  models.forEach((m, f) => {
    const direction = b.faces[f].d;
    const length = Math.hypot(m[4], m[5], m[6]);
    for (let a = 0; a < 3; a++) assert.ok(Math.abs(-m[4 + a] / length - direction[a]) < 1e-6);
    const n = b.faces[f].n;
    assert.ok(m[12] * n[0] + m[13] * n[1] + m[14] * n[2] > 1);
  });
});

test('normal sizes grow every three levels while challenge keeps its existing sizes', () => {
  assert.deepEqual([1,3,4,6,7,9,10,12,13,15].map(level=>App.cubeSizeFor('normal',level)),[5,5,6,6,7,7,8,8,9,9]);
  for (const mode of ['challenge']) {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 20].map(level => App.cubeSizeFor(mode, level)), [5, 5, 5, 5, 5, 5, 5, 5]);
  }
});

test('unmatchable leftovers explode into fireworks without granting elimination points', () => {
  const b = new Board(5);
  const ids = [b.id(4, 0, 0), b.id(4, 4, 4), b.id(5, 2, 2)];
  ids.forEach((id, i) => { b.color[id] = i; });
  assert.equal(b.hasMoves(), false);
  App.board = b;
  App.spawnTilesInstant();
  App.score = 100;
  App.dying = [];
  App.trackBest = App.updateHud = App.clearHover = () => {};
  context.Sfx = { levelClear() {} };
  const bursts = [];
  App.scene = { addShake() {}, particles: { spawn() {}, burst: (...args) => bursts.push(args) } };
  App.levelClear();
  assert.equal(App.levelRemain, 3);
  assert.equal(App.score, 100 + App.levelScoreBonus);
  assert.equal(App.tiles.filter(Boolean).length, 0);
  assert.equal(App.dying.length, 3);
  for (let i = 0; i < 150; i++) App.updateAnimations(1 / 60);
  assert.equal(App.dying.length, 0);
  assert.equal(bursts.length, 3);
  assert.equal(App.board.aliveCount(), 3, 'settlement retains the original leftover count');
  assert.equal(App.score, 100 + App.levelScoreBonus);
  assert.ok(App.timer.t >= 2, 'settlement waits for the fireworks');
});
