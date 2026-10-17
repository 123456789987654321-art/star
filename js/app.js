/* 游戏流程 / 交互 / 动画编排 */
(function () {
  'use strict';

  const MX = window.MX, m4 = MX.m4, m3 = MX.m3, v3 = MX.v3;
  const clamp = MX.clamp;

  /* ---------- 配色：红 紫 绿 蓝 黄 粉 ---------- */
  const PALETTE = [
    { name: '红', rgb: [0.97, 0.24, 0.32] },
    { name: '紫', rgb: [0.64, 0.34, 0.99] },
    { name: '绿', rgb: [0.20, 0.85, 0.50] },
    { name: '蓝', rgb: [0.22, 0.58, 1.00] },
    { name: '黄', rgb: [1.00, 0.80, 0.22] },
    { name: '粉', rgb: [1.00, 0.44, 0.79] }
  ];
  const NC = PALETTE.length;
  const TILE_BEVEL = 1.0, TILE_STAR = 1.0;

  /* 星级：按第一关目标的倍数走，这样不同尺寸的立方体都合适 */
  const STAR_MULT = [1, 3, 6, 10, 15];

  /* ============================================================
     应用主体
     ============================================================ */
  const App = {
    /* --- 运行时数据 --- */
    state: 'menu',
    mode: 'normal',
    level: 1,
    N: 5,
    zoom: 0,
    score: 0,
    target: 0,
    timeLeft: 0,
    tilesAll: 0,
    board: null,
    scene: null,
    tiles: null,          // 按格 id 索引
    dying: [],            // 正在消散的方块
    renderList: [],
    hoverIds: null,
    hintIds: null,
    hintTime: 0,
    hintCamera: null,
    timer: null,          // 一次性延时 { t, fn }
    clock: 0,
    lastTickSec: -1,
    lastHudSec: -1,
    landSfxCd: 0,
    best: 0,
    newRecord: false,

    /* ---------- 启动 ---------- */
    boot() {
      const canvas = document.getElementById('gl');
      try {
        this.scene = new window.Scene(canvas);
      } catch (err) {
        const b = document.getElementById('bootErr');
        b.className = '';
        b.textContent = '启动失败：' + err.message;
        return;
      }
      this.buildSky();
      this.bindUI();
      this.bindInput();
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.best = this.loadBest();
      this.updateMenuBest();

      // 显卡上下文丢失（驱动重置 / 标签页休眠太久）时给个明确提示
      canvas.addEventListener('webglcontextlost', (ev) => {
        ev.preventDefault();
        const b = document.getElementById('bootErr');
        b.className = '';
        b.innerHTML = '图形上下文丢失了（通常是显卡驱动重置或标签页休眠太久）。<br>刷新页面就能接着玩。';
      });

      // 菜单里的展示立方体
      this.board = new window.Board(5);
      this.board.fillRandom(NC, Math.random);
      this.spawnTilesInstant();
      this.scene.dist = this.scene.fitDist * 1.55;   // 菜单里把展示立方体放远一点，别顶到字

      const loop = (now) => {
        this.frame(now);
        requestAnimationFrame(loop);
      };
      this.last = performance.now();
      requestAnimationFrame(loop);
      window.addEventListener('resize', () => {
        this.scene.resize();
        if (this.state !== 'menu') this.setZoom(this.zoom);
      });
      // 样式表如果加载得比脚本晚，首帧的 clientWidth 会是 canvas 默认尺寸，重新量一次
      window.addEventListener('load', () => this.scene.resize());
    },

    buildSky() {
      const sky = document.getElementById('sky');
      const n = Math.min(140, Math.floor(window.innerWidth / 8));
      let html = '';
      for (let i = 0; i < n; i++) {
        const s = (Math.random() * 2.1 + 0.7).toFixed(1);
        html += '<i style="left:' + (Math.random() * 100).toFixed(2) + '%;top:' +
          (Math.random() * 100).toFixed(2) + '%;width:' + s + 'px;height:' + s +
          'px;animation-delay:' + (Math.random() * 3.4).toFixed(2) + 's;opacity:.' +
          (30 + Math.floor(Math.random() * 55)) + '"></i>';
      }
      sky.innerHTML = html;
    },

    /* ---------- 最高分 ---------- */
    loadBest() {
      try {
        const v = parseInt(window.localStorage.getItem('popstar3d.best'), 10);
        return isFinite(v) && v > 0 ? v : 0;
      } catch (e) { return 0; }
    },
    saveBest(v) {
      try { window.localStorage.setItem('popstar3d.best', String(v)); } catch (e) { /* 本地文件可能不允许 */ }
    },
    trackBest() {
      if (this.score > this.best) {
        this.best = this.score;
        this.newRecord = true;
        this.saveBest(this.best);
        this.updateMenuBest();
      }
    },
    updateMenuBest() {
      const el = document.getElementById('menuBest');
      if (el) el.textContent = this.best;
    },

    /* ---------- 关卡参数 ---------- */
    cubeSizeFor(mode, level) {
      return clamp(level + 4, 5, 10);
    },
    targetFor(level, tiles) {
      // 沿用每块的目标分比例，按实际外壳块数缩放。
      const raw = (750 * level + 350 * level * (level - 1)) * (tiles / 150);
      return Math.round(raw / 100) * 100;
    },
    starSteps() {
      const base = this.targetFor(1, 98) || 500;
      return STAR_MULT.map((m) => Math.round(base * m / 100) * 100);
    },
    timeFor(level) {
      return 62 + Math.min(level - 1, 6) * 4;
    },

    /* ============================================================
       方块 / 棋盘
       ============================================================ */
    tileGeom() {
      const p = this.board.pitch;
      return { size: [p, p, p] };
    },

    /** 某格方块在世界空间中的中心 */
    centerOf(id) {
      return this.board.cellCenter(id);
    },

    makeTile(id, color) {
      const b = this.board;
      const f = b.faceOf(id);
      const geom = this.tileGeom();
      const basis = b.faceBasis(f);
      return {
        id,
        color,
        center: this.centerOf(id),
        homeBasis: basis,
        basis: basis.slice(),
        baseSize: geom.size.slice(),
        size: geom.size.slice(),
        model: m4.create(),
        alpha: 1,
        highlight: 0,
        hintGlow: 0,
        hintLift: 0,
        scaleMul: 1,
        squash: 0,
        anim: null,
        gone: false,
        spinAxis: v3.norm([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1])
      };
    },

    /** 立刻铺好（菜单展示用） */
    spawnTilesInstant() {
      const b = this.board;
      this.tiles = new Array(b.size).fill(null);
      this.tilesAll = b.size;
      for (let id = 0; id < b.size; id++) {
        if (b.color[id] >= 0) this.tiles[id] = this.makeTile(id, b.color[id]);
      }
    },

    /** 从天而降（开局动画） */
    spawnTilesFalling(fast) {
      const b = this.board;
      const k = fast ? 0.55 : 1;                 // 后续关卡节奏紧凑一点
      const waveStart = [0, 0.78, 1.52].map((s) => s * k);
      const waveOf = { 5: 0, 0: 1, 1: 1, 2: 1, 3: 1, 4: 2 };

      this.tiles = new Array(b.size).fill(null);
      this.tilesAll = b.size;
      this.dying.length = 0;

      for (let id = 0; id < b.size; id++) {
        if (b.color[id] < 0) continue;
        const f = b.faceOf(id);
        const t = this.makeTile(id, b.color[id]);
        const to = t.center.slice();
        // 从画面上方之外落下即可，太高的话大部分时间都在屏幕外，白等
        const drop = 9.5 + Math.random() * 3.5;
        t.center = [to[0] + (Math.random() - 0.5) * 1.1, to[1] + drop, to[2] + (Math.random() - 0.5) * 1.1];
        t.anim = {
          type: 'fall',
          t: 0,
          delay: waveStart[waveOf[f]] + Math.random() * 0.42 * k,
          dur: (0.58 + Math.random() * 0.12) * k,
          from: t.center.slice(),
          to,
          spinAxis: t.spinAxis,
          spin0: (Math.random() * 2 - 1) * 3.6,
          done: false
        };
        this.tiles[id] = t;
      }
      this.state = 'intro';
      // 最后一波最晚落地的时刻 = waveStart[2] + 随机延迟上限 + 最长下落时长
      this.introLeft = waveStart[2] + 0.42 * k + 0.70 * k + 0.28;
      window.Sfx.start();
    },

    /* ============================================================
       帧循环
       ============================================================ */
    frame(now) {
      // 上限 50ms：切标签页回来后不要一次跳太多；同时防止时间回退产生负的 dt
      const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      this.clock += dt;

      if (this.state === 'menu') {
        this.scene.yaw += dt * 0.24;
        this.scene.pitch = 0.30 + Math.sin(this.clock * 0.42) * 0.16;
      }
      if (this.state === 'menu') this.scene.dist = clamp(this.scene.dist, this.scene.fitDist * 0.6, this.scene.fitDist * 1.9);

      this.updateAnimations(dt);
      this.updateTimers(dt);
      this.updateHover(dt);
      this.updateHint(dt);
      this.scene.particles.update(dt);
      this.scene.updateCamera(dt);

      this.buildRenderList();
      this.render();
    },

    updateTimers(dt) {
      if (this.timer) {
        this.timer.t -= dt;
        if (this.timer.t <= 0) {
          const fn = this.timer.fn;
          this.timer = null;
          fn();
        }
      }
      if (this.state === 'intro') {
        this.introLeft -= dt;
        if (this.introLeft <= 0 && !this.introDone) {
          this.introDone = true;
          this.state = 'play';
          if (this.mode === 'challenge') this.timeLeft = this.timeFor(this.level);
          this.updateHud();
        }
      }
      if (this.state === 'play' && this.mode === 'challenge') {
        this.timeLeft -= dt;
        const sec = Math.ceil(this.timeLeft);
        if (sec !== this.lastTickSec) {
          this.lastTickSec = sec;
          if (sec <= 10 && sec > 0 && sec % 2 === 1) window.Sfx.tick();
        }
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.gameOver('时间到');
          return;
        }
        if (sec !== this.lastHudSec) { this.lastHudSec = sec; this.updateHud(); }
      }
      if (this.landSfxCd > 0) this.landSfxCd -= dt;
    },

    updateAnimations(dt) {
      // 存活方块
      if (this.tiles) {
        for (let i = 0; i < this.tiles.length; i++) {
          const t = this.tiles[i];
          if (t) this.stepTile(t, dt);
        }
      }
      // 消散中的方块
      for (let i = this.dying.length - 1; i >= 0; i--) {
        const t = this.dying[i];
        const a = t.anim;
        a.t += dt;
        const elapsed = a.t - (a.delay || 0);
        if (elapsed < 0) continue;
        const p = clamp(elapsed / a.dur, 0, 1);
        t.center = [
          a.from[0] + a.vel[0] * p * a.dur * 0.5,
          a.from[1] + a.vel[1] * p * a.dur * 0.5 - 1.6 * p * p,
          a.from[2] + a.vel[2] * p * a.dur * 0.5
        ];
        if (a.firework && !a.exploded && elapsed >= 0.28) {
          a.exploded = true;
          this.scene.particles.burst(t.center, PALETTE[t.color].rgb, a.sparks, {
            speed: 2.8, size: 0.075, life: 1.25, gravity: 1.2, drag: 0.65
          });
        }
        m3.rotateBasis(m3.fromAxisAngle(a.spinAxis[0], a.spinAxis[1], a.spinAxis[2], a.spin0 * p), t.homeBasis, t.basis);
        const s = p < 0.16 ? 1 + p / 0.16 * 0.28 : 1.28 * Math.pow(1 - (p - 0.16) / 0.84, 1.5);
        t.scaleMul = s;
        t.alpha = p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45;
        if (p >= 1) {
          t.gone = true;
          this.dying.splice(i, 1);
        }
      }
    },

    stepTile(t, dt) {
      if (t.squash > 0) t.squash *= Math.pow(0.0015, dt);
      if (t.squash < 0.002) t.squash = 0;

      const a = t.anim;
      if (!a) return;

      if (a.type === 'fall') {
        a.t += dt;
        const raw = a.t - a.delay;
        if (raw <= 0) { t.basis = t.homeBasis.slice(); return; }
        const p = clamp(raw / a.dur, 0, 1);
        const e = MX.easeInQuad(p);
        t.center = [
          a.from[0] + (a.to[0] - a.from[0]) * e,
          a.from[1] + (a.to[1] - a.from[1]) * e,
          a.from[2] + (a.to[2] - a.from[2]) * e
        ];
        // 翻滚：落地前转回正
        const ang = a.spin0 * (1 - e) * (1 - e);
        if (Math.abs(ang) > 0.001) {
          m3.rotateBasis(m3.fromAxisAngle(a.spinAxis[0], a.spinAxis[1], a.spinAxis[2], ang), t.homeBasis, t.basis);
        } else {
          t.basis = t.homeBasis.slice();
        }
        if (p >= 1) {
          t.center = a.to.slice();
          t.basis = t.homeBasis.slice();
          t.anim = null;
          t.squash = 1;
          if (this.landSfxCd <= 0) {
            this.landSfxCd = 0.055;
            window.Sfx.land(a.to[1] < -0.5);
          }
        }
        return;
      }

      if (a.type === 'slide') {
        a.t += dt;
        const p = clamp(a.t / a.dur, 0, 1);
        const e = a.vertical ? MX.easeInQuad(p) : MX.easeInOutCubic(p);
        t.center = [
          a.from[0] + (a.to[0] - a.from[0]) * e,
          a.from[1] + (a.to[1] - a.from[1]) * e,
          a.from[2] + (a.to[2] - a.from[2]) * e
        ];
        if (p >= 1) {
          t.center = a.to.slice();
          t.basis = t.homeBasis.slice();
          t.anim = null;
          t.squash = a.vertical ? 0.75 : 0.45;
        }
      }
    },

    /** 悬停高亮做呼吸动画 */
    updateHover(dt) {
      if (!this.tiles) return;
      const live = this.hoverIds;
      if (!live || !live.length) return;
      const pulse = 0.34 + 0.30 * Math.sin(this.clock * 7.0);
      for (let i = 0; i < live.length; i++) {
        const t = this.tiles[live[i]];
        if (t) { t.highlight = pulse; t.scaleMul = 1; }
      }
    },

    showHint() {
      if (this.state !== 'play') return;
      this.clearHint();
      this.clearHover();
      const seen = new Set();
      let best = null, anchor = -1, bestRank = -1, visible = false;
      for (let id = 0; id < this.board.size; id++) {
        if (seen.has(id) || this.board.colorOf(id) < 0) continue;
        const group = this.board.groupOf(id);
        group.forEach(member => seen.add(member));
        if (group.length < 2) continue;
        let front = -1;
        for (const member of group) {
          const tile = this.tiles[member];
          const point = this.scene.project(tile.center);
          if (!point) continue;
          const nx = point[0] / (this.scene.w / this.scene.dpr) * 2 - 1;
          const ny = 1 - point[1] / (this.scene.h / this.scene.dpr) * 2;
          if (Math.abs(nx) <= 1 && Math.abs(ny) <= 1 && this.scene.pick(nx, ny, this.renderList) === member) { front = member; break; }
        }
        const rank = (front >= 0 ? 10000 : 0) + group.length;
        if (rank > bestRank) { best = group; anchor = front >= 0 ? front : group[0]; bestRank = rank; visible = front >= 0; }
      }
      const status = document.getElementById('hintStatus');
      if (!best) { status.textContent = '当前没有可以消除的方块'; return; }
      this.hintIds = best;
      this.hintTime = 0;
      if (!visible) {
        const p = this.tiles[anchor].center;
        const yaw = Math.atan2(p[0], p[2]);
        const pitch = Math.atan2(p[1], Math.hypot(p[0], p[2]));
        this.hintCamera = { yaw, pitch, fromYaw: this.scene.yaw, fromPitch: this.scene.pitch };
      }
      status.textContent = '已标出 ' + best.length + ' 个同色方块，点击白色闪动的方块即可消除';
    },

    updateHint(dt) {
      if (!this.hintIds || this.state !== 'play') return;
      this.hintTime += dt;
      if (this.hintTime >= 3.5) { this.clearHint(); return; }
      if (this.hintCamera) {
        const c = this.hintCamera;
        const p = this.reduceMotion ? 1 : MX.easeInOutCubic(clamp(this.hintTime / 0.45, 0, 1));
        const delta = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
        this.scene.yaw = c.fromYaw + delta(c.yaw - c.fromYaw) * p;
        this.scene.pitch = c.fromPitch + delta(c.pitch - c.fromPitch) * p;
        if (p >= 1) this.hintCamera = null;
      }
      const bounce = this.reduceMotion ? 0 : Math.abs(Math.sin(this.hintTime * 7));
      for (const id of this.hintIds) {
        const tile = this.tiles[id];
        if (tile) { tile.hintGlow = 0.55 + bounce * 0.22; tile.hintLift = this.board.pitch * 0.2 * bounce; }
      }
    },

    clearHint() {
      if (this.hintIds && this.tiles) for (const id of this.hintIds) {
        const tile = this.tiles[id];
        if (tile) { tile.hintGlow = 0; tile.hintLift = 0; tile.renderCenter = null; }
      }
      this.hintIds = null;
      this.hintCamera = null;
    },

    clearHover() {
      if (this.hoverIds) {
        for (let i = 0; i < this.hoverIds.length; i++) {
          const t = this.tiles[this.hoverIds[i]];
          if (t) { t.highlight = 0; t.scaleMul = 1; }
        }
      }
      this.hoverIds = null;
      this.hideTip();
    },

    /* ============================================================
       渲染
       ============================================================ */
    buildRenderList() {
      const list = this.renderList;
      list.length = 0;
      const add = (t) => {
        const s = t.scaleMul;
        t.size[0] = t.baseSize[0] * s;
        t.size[1] = t.baseSize[1] * s;
        t.size[2] = t.baseSize[2] * s;
        const normal = this.board.faces[this.board.faceOf(t.id)].n;
        t.renderCenter = t.center.map((v, a) => v + normal[a] * (t.hintLift || 0));
        m4.fromBasisScale(t.model, t.basis, t.renderCenter, t.size);
        const k = 1 - 0.30 * t.squash;
        t.model[1] *= k; t.model[5] *= k; t.model[9] *= k;
        list.push(t);
      };
      if (this.tiles) for (let i = 0; i < this.tiles.length; i++) if (this.tiles[i]) add(this.tiles[i]);
      for (let i = 0; i < this.dying.length; i++) add(this.dying[i]);
    },

    render() {
      const sc = this.scene;
      sc.beginFrame();
      // 只绘制彩色方块外壳；消除后的空洞直接露出内部。
      const list = this.renderList;
      for (let i = 0; i < list.length; i++) {
        const t = list[i];
        if (t.alpha > 0.985) sc.drawBox(t.model, PALETTE[t.color].rgb, [TILE_BEVEL, TILE_STAR], t.highlight, 1, t.hintGlow);
      }
      for (let i = 0; i < list.length; i++) {
        const t = list[i];
        if (t.alpha <= 0.985) sc.drawBox(t.model, PALETTE[t.color].rgb, [TILE_BEVEL, TILE_STAR], t.highlight, t.alpha);
      }
      if (this.board && !['menu', 'intro', 'clear', 'over'].includes(this.state)) sc.drawDirectionArrows(this.board);
      sc.drawParticles();
    },

    /* ============================================================
       交互
       ============================================================ */
    setZoom(value) {
      this.zoom = clamp(value, 0, 1);
      this.scene.dist = this.scene.fitDist * 1.25 / (1 + 0.6 * this.zoom);
      const slider = document.getElementById('zoomSlider');
      slider.value = String(this.zoom * 100);
      slider.setAttribute('aria-valuetext', Math.round(100 + 60 * this.zoom) + '%');
    },

    setZoomFromDistance(distance) {
      this.setZoom((this.scene.fitDist * 1.25 / Math.max(distance, 0.001) - 1) / 0.6);
    },

    resetView() {
      this.scene.yaw = 0.62;
      this.scene.pitch = 0.42;
      this.setZoom(0);
    },

    bindInput() {
      const cv = document.getElementById('gl');
      const pts = new Map();
      let dragging = false, moved = 0, downT = 0, pinch = 0, lastX = 0, lastY = 0;

      const ndc = (e) => [
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1)
      ];
      const canPlay = () => this.state === 'play';

      cv.addEventListener('pointerdown', (e) => {
        this.hintCamera = null;
        cv.setPointerCapture(e.pointerId);
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 1) { dragging = false; moved = 0; downT = performance.now(); lastX = e.clientX; lastY = e.clientY; }
        if (pts.size === 2) {
          const a = [...pts.values()];
          pinch = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        }
        window.Sfx.init(); window.Sfx.resume();
      });

      cv.addEventListener('pointermove', (e) => {
        const p = pts.get(e.pointerId);

        // 未按下：鼠标悬停，预览可消除的组
        if (!p) {
          if (e.pointerType === 'mouse' && canPlay()) this.setHover(e);
          return;
        }
        p.x = e.clientX; p.y = e.clientY;

        if (pts.size >= 2) {
          const a = [...pts.values()];
          const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
          if (pinch > 0 && d > 0 && this.state !== 'menu') this.setZoomFromDistance(this.scene.dist * pinch / d);
          pinch = d;
          return;
        }

        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 7) {
          dragging = true;
          this.clearHover();
          this.scene.yaw -= dx * 0.0072;
          this.scene.pitch += dy * 0.0062;
        }
      });

      const endPointer = (e) => {
        const wasSingle = pts.size === 1;
        pts.delete(e.pointerId);
        if (!wasSingle) { pinch = 0; return; }
        const quick = performance.now() - downT < 480;
        if (!dragging && quick) this.click(e);
        moved = 0; dragging = false; pinch = 0;
      };
      cv.addEventListener('pointerup', endPointer);
      cv.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); pinch = 0; });

      cv.addEventListener('pointerleave', () => { if (this.state === 'play') this.clearHover(); });

      cv.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (this.state !== 'menu') this.setZoomFromDistance(this.scene.dist * Math.exp(e.deltaY * 0.0011));
      }, { passive: false });

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.onEsc();
        if (e.key === 'r' || e.key === 'R') { if (this.state === 'over') this.restart(); }
      });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.state === 'play') this.pause();
      });
    },

    setHover(e) {
      const id = this.scene.pick(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1),
        this.renderList
      );
      const prev = this.hoverIds;
      if (prev && prev.length && prev[0] === id) return;
      this.clearHover();
      if (id < 0) return;
      const grp = this.board.groupOf(id);
      this.hoverIds = grp.length >= 2 ? grp : null;
      if (!this.hoverIds) {
        const t = this.tiles[id];
        if (t) t.highlight = 0.1;
        this.hideTip();
      } else {
        this.showTip(e.clientX, e.clientY, grp.length);
      }
    },

    showTip(x, y, n) {
      const el = document.getElementById('tip');
      el.innerHTML = '<b>' + n + '</b> 块 · +' + (5 * n * n) + ' 分';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.classList.add('on');
    },

    hideTip() {
      const el = document.getElementById('tip');
      if (el) el.classList.remove('on');
    },

    click(e) {
      if (this.state !== 'play') return;
      const id = this.scene.pick(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1),
        this.renderList
      );
      if (id < 0) return;
      const grp = this.board.groupOf(id);
      if (grp.length < 2) {
        window.Sfx.invalid();
        const t = this.tiles[id];
        if (t) t.squash = 0.8;
        return;
      }
      this.pop(grp);
    },

    /* ============================================================
       消除 / 重力 / 结算
       ============================================================ */
    pop(group) {
      if (!group || group.length < 2) return;   // 单块不可消
      this.clearHint();
      this.state = 'busy';
      this.clearHover();
      const n = group.length;
      const gain = 5 * n * n;
      this.score += gain;
      this.trackBest();
      window.Sfx.pop(n);
      this.scene.addShake(Math.min(1.5, 0.22 + n * 0.055));
      if (this.mode === 'challenge') this.timeLeft = Math.min(999, this.timeLeft + n * 0.5);

      let cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < group.length; i++) {
        const id = group[i];
        const t = this.tiles[id];
        if (!t) continue;
        cx += t.center[0]; cy += t.center[1]; cz += t.center[2];

        const away = v3.norm(t.center);
        const dir = v3.norm(v3.add(away, [0, 0.55, 0]));
        const spd = 2.4 + Math.random() * 2.2;
        t.anim = {
          type: 'pop',
          t: 0, dur: 0.5 + Math.random() * 0.14,
          from: t.center.slice(),
          vel: v3.mul(dir, spd),
          spinAxis: t.spinAxis,
          spin0: (Math.random() * 2 - 1) * 5.5
        };
        t.highlight = 0;
        this.dying.push(t);
        this.tiles[id] = null;
        this.board.color[id] = -1;

        this.scene.particles.burst(t.center, PALETTE[t.color].rgb, n >= 10 ? 12 : 7, {
          speed: 2.4 + n * 0.14, size: 0.078, life: 0.6, gravity: 4.0
        });
      }
      cx /= group.length; cy /= group.length; cz /= group.length;
      this.toast([cx, cy + 0.55, cz], '+' + gain, n >= 8 ? '' : 'small');
      this.updateHud();

      this.timer = { t: 0.36, fn: () => this.settle() };
    },

    settle() {
      const moves = this.board.applyGravity();
      if (!moves.length) { this.afterSettle(); return; }
      this.state = 'busy';
      let maxDur = 0;
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        const t = this.tiles[m.from];
        if (!t) continue;
        this.tiles[m.from] = null;
        this.tiles[m.to] = t;
        t.id = m.to;
        const dur = 0.12 + 0.17 * Math.sqrt(m.dist);
        maxDur = Math.max(maxDur, dur);
        t.anim = {
          type: 'slide', t: 0, dur,
          from: t.center.slice(),
          to: this.centerOf(m.to),
          vertical: Math.abs(m.dy) > 0.22
        };
      }
      this.timer = { t: maxDur + 0.06, fn: () => this.afterSettle() };
    },

    afterSettle() {
      this.state = 'play';
      this.updateHud();
      if (!this.board.hasMoves()) this.levelClear();
    },

    levelClear() {
      this.clearHint();
      this.state = 'clear';
      this.clearHover();
      const remain = this.board.aliveCount();
      // 传统公式 (2000 - 20r²) 在 6 色下永远是 0（一局结束平均只剩 1/3 的孤块），
      // 这里改成按「剩余占比」给奖励：全清满额，剩到一半就是 0。
      const ratio = remain / this.tilesAll;
      const bonus = Math.max(0, Math.round(2200 * (1 - ratio / 0.5) * (this.tilesAll / 150) / 10) * 10);
      this.score += bonus;
      this.trackBest();
      this.levelScoreBonus = bonus;
      this.levelRemain = remain;
      window.Sfx.levelClear();
      this.scene.addShake(0.6);

      // 剩余孤块只参与收尾烟花，保留棋盘计数用于结算，不追加消除分。
      const leftovers = this.tiles.filter(Boolean);
      leftovers.forEach((tile, i) => {
        tile.anim = {
          type: 'pop', firework: true, exploded: false,
          t: 0, delay: i / Math.max(1, leftovers.length) * 0.65, dur: 1.05,
          from: tile.center.slice(),
          vel: v3.mul(v3.norm(v3.add(tile.center, [0, 0.8, 0])), 4.2),
          spinAxis: tile.spinAxis, spin0: 5 + Math.random() * 4,
          sparks: clamp(Math.floor(1100 / Math.max(1, leftovers.length)), 3, 36)
        };
        tile.highlight = 0;
        this.dying.push(tile);
        this.tiles[tile.id] = null;
      });

      for (let i = 0; i < 60; i++) {
        const c = PALETTE[(Math.random() * NC) | 0].rgb;
        this.scene.particles.spawn(
          [(Math.random() * 2 - 1) * 1.6, 1.4 + Math.random(), (Math.random() * 2 - 1) * 1.6],
          c, { speed: 3.4, size: 0.075, life: 1.1, gravity: 5.2 }
        );
      }
      this.updateHud();
      this.timer = { t: 2.5, fn: () => this.showClearPanel() };
    },

    showClearPanel() {
      const passed = this.score >= this.target;
      if (!passed) { this.gameOver('分数不足'); return; }
      const nextN = this.cubeSizeFor(this.mode, this.level + 1);
      const nextTiles = nextN ** 3 - (nextN - 2) ** 3;
      this.overlay(`
        <div class="ov-emoji">🎉</div>
        ${this.newRecord ? '<div class="ov-badge">新 纪 录</div>' : ''}
        <h2 class="ov-title win">第 ${this.level} 关通过</h2>
        <p class="ov-sub">立方体被清空，剩余 ${this.levelRemain} 块</p>
        <div class="ov-dots">${this.starDots()}</div>
        <div class="ov-rows">
          <div class="ov-row"><span>清空奖励</span><b class="green">+${this.levelScoreBonus}</b></div>
          <div class="ov-row"><span>本关目标</span><b>${this.target}</b></div>
          <div class="ov-row"><span>总分</span><b>${this.score}</b></div>
          <div class="ov-row big"><span>下一关目标</span><b class="gold">${this.targetFor(this.level + 1, nextTiles)}</b></div>
        </div>
        <div class="ov-actions">
          <button class="ov-btn" data-act="next">进入第 ${this.level + 1} 关</button>
          <button class="ov-btn plain" data-act="menu">返回菜单</button>
        </div>`);
    },

    gameOver(reason) {
      this.state = 'over';
      window.Sfx.gameOver();
      const remain = this.board ? this.board.aliveCount() : 0;
      this.overlay(`
        <div class="ov-emoji">💫</div>
        ${this.newRecord ? '<div class="ov-badge">新 纪 录</div>' : ''}
        <h2 class="ov-title lose">游戏结束</h2>
        <p class="ov-sub">${reason} · 目标 ${this.target}</p>
        <div class="ov-dots">${this.starDots()}</div>
        <div class="ov-rows">
          <div class="ov-row big"><span>最终得分</span><b class="gold">${this.score}</b></div>
          <div class="ov-row"><span>历史最高</span><b>${this.best}</b></div>
          <div class="ov-row"><span>到达关卡</span><b>第 ${this.level} 关</b></div>
          <div class="ov-row"><span>剩余方块</span><b>${remain}</b></div>
        </div>
        <div class="ov-actions">
          <button class="ov-btn" data-act="retry">再来一局</button>
          <button class="ov-btn plain" data-act="menu">返回菜单</button>
        </div>`);
    },

    starDots() {
      const steps = this.starSteps();
      let n = 0;
      for (let i = 0; i < steps.length; i++) if (this.score >= steps[i]) n++;
      let h = '';
      for (let i = 0; i < steps.length; i++) h += '<i class="' + (i < n ? 'on' : '') + '"></i>';
      return h;
    },

    /* ============================================================
       流程控制
       ============================================================ */
    startGame(mode) {
      this.mode = mode;
      this.level = 1;
      this.score = 0;
      this.newRecord = false;
      this.startLevel(true);
    },

    startLevel(first) {
      this.clearHint();
      const N = this.cubeSizeFor(this.mode, this.level);
      this.N = N;
      this.board = new window.Board(N);
      this.board.fillRandom(NC, Math.random);
      this.tilesAll = this.board.size;
      this.target = this.targetFor(this.level, this.board.size);
      this.dying.length = 0;
      this.clearHover();
      this.timer = null;
      this.introDone = false;
      this.lastTickSec = -1;
      this.scene.particles.clear();
      this.spawnTilesFalling(!first);
      this.hideOverlay();
      document.getElementById('menu').classList.add('hidden');
      document.getElementById('hud').classList.remove('hidden');
      this.setZoom(first ? 0 : this.zoom);
      this.scene.yaw = 0.62;
      this.scene.pitch = 0.42;
      this.showBanner();
      this.updateHud();
    },

    showBanner() {
      const b = document.getElementById('banner');
      b.innerHTML = '<div class="bn-lv">第 ' + this.level + ' 关</div>' +
        '<div class="bn-sub">目标 ' + this.target + ' 分' +
        (this.mode === 'challenge' ? ' · 限时' : '') + '</div>';
      b.classList.remove('show');
      void b.offsetWidth;          // 强制重排，让动画能重播
      b.classList.add('show');
    },

    restart() { this.startGame(this.mode); },

    toMenu() {
      this.clearHint();
      this.state = 'menu';
      this.timer = null;
      this.dying.length = 0;
      this.clearHover();
      document.getElementById('banner').classList.remove('show');
      this.hideOverlay();
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('menu').classList.remove('hidden');
      this.board = new window.Board(5);
      this.board.fillRandom(NC, Math.random);
      this.spawnTilesInstant();
      this.scene.particles.clear();
      this.scene.dist = this.scene.fitDist * 1.55;
      this.updateMenuBest();
      this.hideTip();
    },

    pause() {
      if (this.state !== 'play') return;
      this.state = 'paused';
      this.hideTip();
      this.overlay(`
        <div class="ov-emoji">⏸</div>
        <h2 class="ov-title">已暂停</h2>
        <p class="ov-sub">第 ${this.level} 关 · 得分 ${this.score}</p>
        <div class="ov-actions">
          <button class="ov-btn" data-act="resume">继续</button>
          <button class="ov-btn plain" data-act="restart">重新开始</button>
          <button class="ov-btn plain" data-act="menu">返回菜单</button>
        </div>`);
    },

    onEsc() {
      if (this.state === 'play') this.pause();
      else if (this.state === 'paused') this.resume();
      else if (this.state === 'over' || this.state === 'clear') this.toMenu();
    },

    resume() {
      this.hideOverlay();
      if (this.board && !this.introDone) this.state = 'intro';
      else this.state = 'play';
      this.last = performance.now();
    },

    /* ============================================================
       UI
       ============================================================ */
    bindUI() {
      const zoomSlider = document.getElementById('zoomSlider');
      zoomSlider.addEventListener('input', () => { this.clearHover(); this.setZoom(Number(zoomSlider.value) / 100); });
      zoomSlider.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          this.setZoom(this.zoom + (e.key === 'ArrowUp' ? 0.05 : -0.05));
        }
      });
      document.getElementById('btnResetView').addEventListener('click', () => { this.clearHover(); this.resetView(); });
      document.querySelectorAll('.mode-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          window.Sfx.init(); window.Sfx.resume();
          this.startGame(btn.dataset.mode);
        });
      });
      document.getElementById('btnHowto').addEventListener('click', () => this.showHelp(true));
      document.getElementById('btnHelp').addEventListener('click', () => this.showHelp());
      document.getElementById('btnHint').addEventListener('click', () => this.showHint());
      document.getElementById('btnMenu').addEventListener('click', () => this.toMenu());
      const sb = document.getElementById('btnSound');
      sb.addEventListener('click', () => {
        window.Sfx.init();
        window.Sfx.setOn(!window.Sfx.on);
        sb.classList.toggle('off', !window.Sfx.on);
      });

      const ov = document.getElementById('overlay');
      ov.addEventListener('click', (e) => {
        const act = e.target.dataset ? e.target.dataset.act : null;
        if (!act) return;
        if (act === 'next') {
          this.level++;
          this.startLevel(false);
        } else if (act === 'retry') this.restart();
        else if (act === 'menu') this.toMenu();
        else if (act === 'resume') this.resume();
        else if (act === 'helpClose') this.hideOverlay();
        else if (act === 'restart') this.restart();
      });
    },

    overlay(html) {
      document.getElementById('ovCard').innerHTML = html;
      document.getElementById('overlay').classList.remove('hidden');
    },

    hideOverlay() { document.getElementById('overlay').classList.add('hidden'); },

    showHelp(fromMenu) {
      // 从菜单打开时不能把 state 改成 play，所以两种入口给不同的关闭按钮
      if (!fromMenu && this.state === 'play') this.state = 'paused';
      this.overlay(`
        <h2 class="ov-title">玩法说明</h2>
        <p class="ov-sub">立方体版消灭星星</p>
        <div class="ov-help">
          <h4>怎么消</h4>
          <ul>
            <li>点一下<em>连在一起的同色方块</em>（至少 2 块）即可消除，得分 <em>5 × 块数²</em>。</li>
            <li>连在一起是指<em>贴着的一格之内</em>：同一面上下左右相邻，或者<em>翻过棱边</em>的相邻方块。</li>
          </ul>
          <h4>消完怎么掉</h4>
          <ul>
            <li>每一面按自己那一面的「下方」收拢：四个<em>侧面向下滑</em>，<em>顶面和底面朝前面滑</em>。</li>
            <li>所以整个立方体会慢慢往下沉、往前堆，最后越来越难找到 2 块同色。</li>
          </ul>
          <h4>怎么算过关</h4>
          <ul>
            <li>当六个面都找不出相邻同色时本关结束，按<em>剩余方块数</em>结算清空奖励。</li>
            <li>累计分数达到<em>目标分</em>才能进下一关，否则游戏结束。</li>
          </ul>
          <h4>操作</h4>
          <ul>
            <li>拖动 = 旋转视角；滚轮 / 双指 = 缩放；点击 = 消除；Esc = 暂停。</li>
          </ul>
        </div>
        <div class="ov-actions" style="margin-top:18px">
          <button class="ov-btn" data-act="${fromMenu ? 'helpClose' : 'resume'}">知道了</button>
        </div>`);
    },

    updateHud() {
      const $ = (id) => document.getElementById(id);
      $('hudMode').textContent = this.mode === 'normal' ? '普通模式' : '挑战模式';
      $('hudLevel').textContent = this.level;
      $('hudScore').textContent = this.score;
      $('hudTarget').textContent = this.target;
      $('hudRemain').textContent = this.board ? this.board.aliveCount() : 0;
      $('progFill').style.width = clamp((this.score / Math.max(1, this.target)) * 100, 0, 100).toFixed(1) + '%';

      const steps = this.starSteps();
      const stars = steps.map((s) => '<i class="' + (this.score >= s ? 'on' : '') + '">★</i>').join('');
      $('hudStars').innerHTML = stars;

      const box = $('hudTimerBox');
      if (this.mode === 'challenge') {
        box.classList.remove('hidden');
        const t = Math.max(0, this.timeLeft);
        $('timerNum').textContent = t < 9.95 ? t.toFixed(1) : Math.ceil(t);
        const full = this.timeFor(this.level);
        const f = $('timerFill');
        f.style.width = clamp((t / full) * 100, 0, 100).toFixed(1) + '%';
        f.classList.toggle('low', t <= 15);
      } else {
        box.classList.add('hidden');
      }
    },

    toast(world, text, cls) {
      const p = this.scene.project(world);
      if (!p) return;
      const el = document.createElement('div');
      el.className = 'toast ' + (cls || '');
      el.textContent = text;
      el.style.left = p[0] + 'px';
      el.style.top = p[1] + 'px';
      document.getElementById('toasts').appendChild(el);
      setTimeout(() => el.remove(), 1000);
    }
  };

  window.App = App;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => App.boot());
  else App.boot();
})();
