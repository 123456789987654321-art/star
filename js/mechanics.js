/* 关卡配置与独立机关逻辑，不依赖 DOM/WebGL。 */
(function (g) {
  'use strict';
  const profiles = {
    1: { size: 5, kind: 'normal', title: '经典消除' },
    2: { size: 5, kind: 'rotor', title: '旋转方板' },
    3: { size: 5, kind: 'perspective', title: '视角拼接' }
  };
  g.LevelProfile = level => {
    const p = profiles[level] || { size: 5, kind: 'normal', title: '经典消除' };
    return { ...p, size: Math.min(8, p.size) };
  };

  class Rotor {
    constructor(board, rnd = Math.random) {
      this.board = board;
      this.angle = 0;
      this.elapsed = 0;
      this.holdDuration = 2.4;
      this.turnDuration = 0.8;
      this.colors = Int8Array.from({ length: 6 }, () => (rnd() * 6) | 0);
      this.pivot = [board.h + board.pitch / 2, 0, 0];
    }
    update(dt) {
      const cycle = this.holdDuration + this.turnDuration;
      this.elapsed = (this.elapsed + Math.max(0, dt)) % (cycle * 4);
      const step = Math.floor(this.elapsed / cycle);
      const phase = this.elapsed - step * cycle;
      const t = Math.max(0, Math.min(1, (phase - this.holdDuration) / this.turnDuration));
      const eased = t * t * (3 - 2 * t);
      this.angle = (step + eased) * Math.PI / 2;
    }
    center(i) {
      const p = this.board.pitch, y = (1 - Math.floor(i / 2)) * p, z = (i % 2 - 0.5) * p;
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
  class PerspectivePanel extends Rotor {
    constructor(board, rnd = Math.random) {
      super(board, rnd);
      this.projected = true;
      this.links = [];
    }
    update() {} // The panel stays in world space; only the player's view moves.
    center(i) {
      const p = this.board.pitch;
      return [this.board.h + p/2 + 1.2 + (i%2)*p, (1-Math.floor(i/2))*p, -0.8];
    }
    basis() { return [1,0,0,0,1,0,0,0,1]; }
    contacts() { return this.links; }
    static hull(points) {
      const sorted = points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
      const cross = (a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
      const half = list => { const out=[]; for(const p of list) { while(out.length>1&&cross(out[out.length-2],out[out.length-1],p)<=0)out.pop();out.push(p); }out.pop();return out; };
      return half(sorted).concat(half(sorted.slice().reverse()));
    }
    static edgesJoin(a,b) {
      if(a.length<3||b.length<3)return false;
      for(let i=0;i<a.length;i++) {
        const p=a[i],q=a[(i+1)%a.length],len=Math.hypot(q[0]-p[0],q[1]-p[1]);
        if(len<3)continue;
        const u=[(q[0]-p[0])/len,(q[1]-p[1])/len],n=[-u[1],u[0]];
        const along=v=>(v[0]-p[0])*u[0]+(v[1]-p[1])*u[1];
        const across=v=>(v[0]-p[0])*n[0]+(v[1]-p[1])*n[1];
        for(let j=0;j<b.length;j++) {
          const r=b[j],s=b[(j+1)%b.length],other=Math.hypot(s[0]-r[0],s[1]-r[1]);
          if(other<3)continue;
          // Clockwise hulls must have opposing parallel edges at a seam.
          if(((s[0]-r[0])*u[0]+(s[1]-r[1])*u[1])/other> -0.985)continue;
          const tolerance=1.5; // Small pixel allowance for hand-controlled alignment.
          if(Math.max(Math.abs(across(r)),Math.abs(across(s)))>tolerance)continue;
          const overlap=Math.min(len,Math.max(along(r),along(s)))-Math.max(0,Math.min(along(r),along(s)));
          if(overlap<Math.min(len,other)*0.65)continue;
          // The two silhouettes must lie on opposite sides, not overlap.
          if(Math.max(...b.map(across))>1e-5)continue;
          return true;
        }
      }
      return false;
    }
    updateProjection(project, visible) {
      const b=this.board,half=b.pitch/2;
      const polygon=center=>{
        const points=[];
        for(const x of [-half,half])for(const y of [-half,half])for(const z of [-half,half]) {
          const p=project([center[0]+x,center[1]+y,center[2]+z]);
          if(!p||!p.every(Number.isFinite))return [];
          points.push(p);
        }
        return PerspectivePanel.hull(points);
      };
      const surface=b.cells.map((_,id)=>b.color[id]>=0?polygon(b.cellCenter(id)):null);
      const links=[],seen=new Map();
      const canSee=(id,center)=>{if(!seen.has(id))seen.set(id,visible(id,center));return seen.get(id);};
      for(let i=0;i<6;i++) {
        if(this.colors[i]<0)continue;
        const id=b.size+i,center=this.center(i),shape=polygon(center);
        if(!canSee(id,center))continue;
        for(let j=0;j<b.size;j++)if(surface[j]&&PerspectivePanel.edgesJoin(shape,surface[j])&&canSee(j,b.cellCenter(j)))links.push([j,id]);
      }
      this.links=links;
    }
  }
  g.PerspectivePanel = PerspectivePanel;
})(typeof window !== 'undefined' ? window : globalThis);
