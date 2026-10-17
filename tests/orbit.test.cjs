const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../js/mathx.js');
require('../js/scene.js');

test('vertical orbit crosses both poles with a continuous upright camera basis', () => {
  const scene = Object.create(globalThis.Scene.prototype);
  Object.assign(scene, { time: 0, shakeT: 0, dist: 7, yaw: 0.62, target: [0, 0, 0] });
  let previousUp;
  for (let i = 0; i <= 360; i++) {
    scene.pitch = i * Math.PI / 180;
    scene.updateCamera(0);
    assert.ok(scene.up, 'camera must have an up direction that can cross the poles');
    assert.ok(scene.eye.every(Number.isFinite));
    assert.ok(Math.abs(globalThis.MX.v3.dot(scene.eye, scene.up)) < 1e-8);
    assert.ok(Math.abs(Math.hypot(...scene.up) - 1) < 1e-8);
    if (previousUp) assert.ok(globalThis.MX.v3.dot(previousUp, scene.up) > 0.99);
    previousUp = scene.up;
    const view = globalThis.MX.m4.create();
    globalThis.MX.m4.lookAt(view, scene.eye, scene.target, scene.up);
    assert.ok(Array.from(view).every(Number.isFinite));
  }
});
