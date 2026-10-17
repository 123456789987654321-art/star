/* 关卡配置与独立机关逻辑，不依赖 DOM/WebGL。 */
(function (g) {
  'use strict';
  const profiles = {
    1: { size: 5, kind: 'normal', title: '经典消除' },
    2: { size: 5, kind: 'coating', title: '黑膜谜块' },
    3: { size: 5, kind: 'rotor', title: '旋转方板' },
    4: { size: 5, kind: 'tunnel', title: '十字通道' }
  };
  g.LevelProfile = level => {
    const p = profiles[level] || { size: 5, kind: 'normal', title: '经典消除' };
    return { ...p, size: Math.min(8, p.size) };
  };

  class CrossTunnel {
    constructor(board) {
      this.board = board;
      this.gates = [{ open: false, progress: 0 }, { open: false, progress: 0 }];
      this.pieces = [[-1, 0], [0, 1]].map((cell, gate) => ({ cell, position: cell.slice(), gate, next: null, progress: 0, exited: false }));
    }
    remaining() { return this.pieces.filter(p => !p.exited).length; }
    openGate(index) {
      if (!this.gates[index] || this.gates[index].open) return false;
      this.gates[index].open = true;
      return true;
    }
    exitId(x, y) {
      const target = [x * this.board.pitch, y * this.board.pitch, 0];
      return this.board.cells.findIndex((_, id) => this.board.cellCenter(id).every((v, a) => Math.abs(v - target[a]) < 1e-6));
    }
    update(dt, gravity) {
      const arrivals = [];
      this.gates.forEach(gate => { if (gate.open) gate.progress = Math.min(1, gate.progress + dt * 3); });
      for (const piece of this.pieces) {
        if (piece.exited || this.gates[piece.gate].progress < 1) continue;
        if (!piece.next) {
          const candidates = [[1, 0], [-1, 0], [0, 1], [0, -1]]
            .map(d => ({ q: [piece.cell[0] + d[0], piece.cell[1] + d[1]], force: d[0] * gravity[0] + d[1] * gravity[1] }))
            .filter(c => c.force > 0.15 && Math.max(Math.abs(c.q[0]), Math.abs(c.q[1])) <= 2 && (c.q[0] === 0 || c.q[1] === 0))
            .sort((a, b) => b.force - a.force);
          for (const c of candidates) {
            const occupied = this.pieces.some(other => other !== piece && !other.exited &&
              [other.cell, other.next].some(p => p && p[0] === c.q[0] && p[1] === c.q[1]));
            if (occupied) continue;
            const exit = Math.max(Math.abs(c.q[0]), Math.abs(c.q[1])) === 2;
            const id = exit ? this.exitId(...c.q) : -1;
            if (exit && (id < 0 || this.board.color[id] >= 0)) continue;
            piece.next = c.q; piece.progress = 0;
            break;
          }
        }
        if (!piece.next) continue;
        piece.progress = Math.min(1, piece.progress + dt * 3.5);
        piece.position = piece.cell.map((v, a) => v + (piece.next[a] - v) * piece.progress);
        if (piece.progress < 1) continue;
        const exit = Math.max(...piece.next.map(Math.abs)) === 2;
        const id = exit ? this.exitId(...piece.next) : -1;
        if (exit && this.board.color[id] >= 0) {
          piece.position = piece.cell.slice(); piece.next = null; continue;
        }
        piece.cell = piece.next; piece.next = null;
        if (exit) {
          piece.exited = true;
          this.board.color[id] = 6;
          this.board.covered[id] = 0;
          arrivals.push({ id, piece });
        }
      }
      return arrivals;
    }
  }
  g.CrossTunnel = CrossTunnel;

  class Rotor {
    constructor(board, rnd = Math.random) {
      this.board = board;
      this.angle = 0;
      this.speed = 0.65;
      this.colors = Int8Array.from({ length: 6 }, () => (rnd() * 6) | 0);
      this.pivot = [board.h + board.pitch / 2, board.h + board.pitch * 2, board.pitch / 2];
    }
    update(dt) { this.angle = (this.angle + dt * this.speed) % (Math.PI * 2); }
    center(i) {
      const p = this.board.pitch, y = -(Math.floor(i / 2) + 0.5) * p, z = (i % 2 - 0.5) * p;
      const c = Math.cos(this.angle), s = Math.sin(this.angle);
      return [this.pivot[0], this.pivot[1] + c * y - s * z, this.pivot[2] + s * y + c * z];
    }
    basis() {
      const c = Math.cos(this.angle), s = Math.sin(this.angle);
      return [0, -s, c, 0, c, s, -1, 0, 0];
    }
    neighbors(i) {
      const row = Math.floor(i / 2), col = i % 2, out = [];
      for (let j = 0; j < 6; j++) if (Math.abs(Math.floor(j / 2) - row) + Math.abs(j % 2 - col) === 1) out.push(j);
      return out;
    }
    contacts() {
      const contacts = [], p = this.board.pitch, h = p / 2;
      const c = Math.cos(this.angle), s = Math.sin(this.angle);
      const axes = [[1, 0], [0, 1], [c, s], [-s, c]];
      for (let i = 0; i < 6; i++) {
        if (this.colors[i] < 0) continue;
        const a = this.center(i);
        for (let id = 0; id < this.board.size; id++) {
          if (this.board.color[id] < 0) continue;
          const b = this.board.cellCenter(id);
          if (Math.abs(a[0] - b[0] - p) > 1e-6) continue;
          const delta = [a[1] - b[1], a[2] - b[2]];
          const overlap = axes.every(axis => {
            const radiusA = h * (Math.abs(axis[0] * c + axis[1] * s) + Math.abs(-axis[0] * s + axis[1] * c));
            const radiusB = h * (Math.abs(axis[0]) + Math.abs(axis[1]));
            return Math.abs(delta[0] * axis[0] + delta[1] * axis[1]) < radiusA + radiusB - 0.02 * p;
          });
          if (overlap) contacts.push([id, this.board.size + i]);
        }
      }
      return contacts;
    }
    remaining() { return this.colors.filter(c => c >= 0).length; }
  }
  g.Rotor = Rotor;
})(typeof window !== 'undefined' ? window : globalThis);
