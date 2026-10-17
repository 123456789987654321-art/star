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
      const c = Math.cos(this.angle), s = -Math.sin(this.angle);
      // Orbit clockwise around the host face. At each stop the outer edge
      // is flush; pull inward slightly during turns to keep all corners inside.
      const ac=Math.abs(c),as=Math.abs(s),h=this.board.h;
      let radius=h-1.5*p;
      if(ac>1e-8)radius=Math.min(radius,(h-p*(1.5*ac+as))/ac);
      if(as>1e-8)radius=Math.min(radius,(h-p*(1.5*as+ac))/as);
      return [this.pivot[0], this.pivot[1] + c * (y+radius) - s * z, this.pivot[2] + s * (y+radius) + c * z];
    }
    basis() {
      const c = Math.cos(this.angle), s = -Math.sin(this.angle);
      return [0, -s, c, 0, c, s, -1, 0, 0];
    }
    neighbors(i) {
      const row = Math.floor(i / 2), col = i % 2, out = [];
      for (let j = 0; j < 6; j++) if (Math.abs(Math.floor(j / 2) - row) + Math.abs(j % 2 - col) === 1) out.push(j);
      return out;
    }
    contacts() {
      const contacts = [], p = this.board.pitch, h = p / 2;
      const c = Math.cos(this.angle), s = -Math.sin(this.angle);
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
    static edgesJoin(a,b) { return PerspectivePanel.seams(a,b).length > 0; }
    static seams(a,b) {
      const seams=[];
      if(a.length<3||b.length<3)return seams;
      const bounds=p=>[Math.min(...p.map(v=>v[0])),Math.max(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[1]))];
      const A=bounds(a),B=bounds(b);
      if(A[0]>B[1]+2||B[0]>A[1]+2||A[2]>B[3]+2||B[2]>A[3]+2)return seams;
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
          const low=Math.max(0,Math.min(along(r),along(s))),high=Math.min(len,Math.max(along(r),along(s)));
          const overlap=high-low;
          if(overlap<Math.max(3,Math.min(len,other)*0.20))continue;
          const acrossAt=t=>across(r)+(across(s)-across(r))*(t-along(r))/(along(s)-along(r));
          const tolerance=1.5;
          if(Math.max(Math.abs(acrossAt(low)),Math.abs(acrossAt(high)))>tolerance)continue;
          // The two silhouettes must lie on opposite sides, not overlap.
          if(Math.max(...b.map(across))>1e-5)continue;
          const inset=Math.min(1.5,overlap*0.12);
          for(const fraction of [0.25,0.5,0.75]) {
            const middle=low+overlap*fraction,gap=acrossAt(middle);
            seams.push({
              a:[p[0]+u[0]*middle+n[0]*inset,p[1]+u[1]*middle+n[1]*inset],
              b:[p[0]+u[0]*middle+n[0]*(gap-inset),p[1]+u[1]*middle+n[1]*(gap-inset)]
            });
          }
        }
      }
      return seams;
    }
    updateProjection(project, visible, eye, pickAt, includeMain = false) {
      const b=this.board,half=b.pitch/2;
      const cellKey=center=>center.map(v=>Math.round(v/b.pitch)).join(',');
      const occupied=new Set(b.cells.flatMap((_,id)=>b.color[id]>=0?[cellKey(b.cellCenter(id))]:[]));
      const neighbor=(center,axis,sign)=>{const p=center.slice();p[axis]+=sign*b.pitch;return occupied.has(cellKey(p));};
      const faces=(center,main=false)=>{
        const result=[];
        for(let axis=0;axis<3;axis++)for(const sign of [-1,1]) {
          if(eye&&(eye[axis]-center[axis]-sign*half)*sign<=0)continue;
          if(main&&neighbor(center,axis,sign))continue;
          const others=[0,1,2].filter(a=>a!==axis),points=[];
          for(const u of [-half,half])for(const v of [-half,half]) {
            const world=center.slice();world[axis]+=sign*half;world[others[0]]+=u;world[others[1]]+=v;
            const p=project(world);if(p&&p.every(Number.isFinite)){p.world=world;points.push(p);}
          }
          if(points.length===4) {
            const polygon=PerspectivePanel.hull(points);
            if(main)polygon.skipEdges=polygon.map((p,i)=>{
              const q=polygon[(i+1)%polygon.length];
              return others.some(a=>Math.abs(p.world[a]-q.world[a])<1e-8&&neighbor(center,a,Math.sign(p.world[a]-center[a])));
            });
            result.push(polygon);
          }
        }
        return result;
      };
      const surface=b.cells.map((_,id)=>b.color[id]>=0?faces(b.cellCenter(id),true):null);
      const links=[];
      if(pickAt) {
        // Occlusion cuts new visible boundaries into a face. Sample the final
        // depth-tested image on each side of an edge, not its uncut polygon.
        const panels=Array.from({length:6},(_,i)=>this.colors[i]>=0?faces(this.center(i)):[]);
        const bounds=shape=>[Math.min(...shape.map(p=>p[0])),Math.max(...shape.map(p=>p[0])),Math.min(...shape.map(p=>p[1])),Math.max(...shape.map(p=>p[1]))];
        const panelBounds=panels.flat().filter(s=>s.length>=3).map(bounds);
        const nearPanel=shape=>{const r=bounds(shape);return panelBounds.some(q=>r[0]<=q[1]+2&&q[0]<=r[1]+2&&r[2]<=q[3]+2&&q[2]<=r[3]+2);};
        const projectedBounds=[];
        surface.forEach((shapes,id)=>{if(shapes&&shapes.length)projectedBounds.push({id,rect:bounds(shapes.flat())});});
        panels.forEach((shapes,i)=>{if(shapes.length)projectedBounds.push({id:b.size+i,rect:bounds(shapes.flat())});});
        const cache=new Map(),found=new Set();
        const pick=p=>{
          const key=p.map(v=>v.toFixed(2)).join(',');
          if(!cache.has(key)) {
            const candidates=projectedBounds.filter(({rect:r})=>p[0]>=r[0]-0.01&&p[0]<=r[1]+0.01&&p[1]>=r[2]-0.01&&p[1]<=r[3]+0.01).map(v=>v.id);
            cache.set(key,pickAt(p,candidates));
          }
          return cache.get(key);
        };
        const scan=shape=>{
          if(shape.length<3||(!includeMain&&!nearPanel(shape)))return;
          for(let edge=0;edge<shape.length;edge++) {
            if(shape.skipEdges&&shape.skipEdges[edge])continue; // Shared physical edges are already Board neighbours.
            const a=shape[edge],z=shape[(edge+1)%shape.length],dx=z[0]-a[0],dy=z[1]-a[1],length=Math.hypot(dx,dy);
            if(length<4)continue;
            const inset=Math.min(1.25,length*0.06),nx=-dy/length*inset,ny=dx/length*inset;
            let previous='',run=0;
            for(let sample=1;sample<=9;sample++) {
              const t=sample/10,x=a[0]+dx*t,y=a[1]+dy*t;
              const first=pick([x+nx,y+ny]),second=pick([x-nx,y-ny]);
              const main=Math.min(first,second),extra=Math.max(first,second);
              const bodyPair=includeMain&&main!==extra&&extra<b.size&&b.color[extra]>=0;
              const panelPair=extra>=b.size&&extra<b.size+6&&this.colors[extra-b.size]>=0;
              const valid=main>=0&&main<b.size&&b.color[main]>=0&&(bodyPair||panelPair);
              const key=valid?main+','+extra:'';
              run=key&&key===previous?run+1:key?1:0;previous=key;
              if(run>=3&&length*(run-1)/10>=3)found.add(key);
            }
          }
        };
        panels.flat().forEach(scan);
        surface.forEach(shapes=>{if(shapes)shapes.forEach(scan);});
        this.links=Array.from(found,key=>key.split(',').map(Number));
        return;
      }
      for(let i=0;i<6;i++) {
        if(this.colors[i]<0)continue;
        const id=b.size+i,center=this.center(i),shapes=faces(center);
        for(let j=0;j<b.size;j++) {
          if(!surface[j])continue;
          const connected=shapes.some(shape=>surface[j].some(face=>PerspectivePanel.seams(shape,face).some(seam=>
            visible(id,center,seam.a)&&visible(j,b.cellCenter(j),seam.b))));
          if(connected)links.push([j,id]);
        }
      }
      this.links=links;
    }
  }
  g.PerspectivePanel = PerspectivePanel;
})(typeof window !== 'undefined' ? window : globalThis);
