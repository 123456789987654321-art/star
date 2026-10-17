const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = vm.createContext({ console, document: { readyState: 'loading', addEventListener() {} } });
context.window = context;
for (const file of ['mathx', 'board', 'scene', 'app']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'), context);
}
const { App, Board, Scene } = context;
function bounds(t) {
  const half = [0, 1, 2].map(a => t.size.reduce((s, v, k) => s + Math.abs(t.basis[k * 3 + a]) * v / 2, 0));
  return { min: t.center.map((v, a) => v - half[a]), max: t.center.map((v, a) => v + half[a]) };
}
for (const N of [4, 5, 6, 7]) {
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
  const back = App.makeTile(App.board.id(2, 2, 2), 0);
  const front = App.makeTile(App.board.id(0, 2, 2), 0);
  const scene = Object.create(Scene.prototype);
  scene._ray = () => ({ o: [0, 0, 5], d: [0, 0, -1] });
  assert.equal(scene.pick(0, 0, [back, front]), front.id);
  assert.equal(scene.pick(0, 0, [back]), back.id);
  assert.equal(scene.pick(0, 0, []), -1);
});
