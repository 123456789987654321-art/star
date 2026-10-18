/* Closed surface cells shared by challenge rendering, collision and matching. */
(function (g) {
  'use strict';
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const mul=(a,s)=>a.map(v=>v*s);
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const TAU=Math.PI*2;

  function hull(vertices) {
        const hull=new Map();
        for(let i=0;i<vertices.length;i++)for(let j=i+1;j<vertices.length;j++)for(let k=j+1;k<vertices.length;k++){
          const a=vertices[i];let normal=cross(sub(vertices[j],a),sub(vertices[k],a));
          const length=Math.hypot(...normal);if(length<1e-10)continue;
          normal=mul(normal,1/length);
          const ds=vertices.map(p=>dot(normal,sub(p,a)));
          if(ds.some(d=>d>1e-8)&&ds.some(d=>d< -1e-8))continue;
          if(ds.some(d=>d>1e-8))normal=mul(normal,-1);
          const ids=ds.map((d,index)=>Math.abs(d)<1e-8?index:-1).filter(index=>index>=0);
          const key=ids.join(',');if(hull.has(key))continue;
          const midpoint=mul(ids.map(index=>vertices[index]).reduce(add,[0,0,0]),1/ids.length);
          const u=sub(a,midpoint),v=cross(normal,u);
          ids.sort((x,y)=>{
            const px=sub(vertices[x],midpoint),py=sub(vertices[y],midpoint);
            return Math.atan2(dot(px,v),dot(px,u))-Math.atan2(dot(py,v),dot(py,u));
          });
          hull.set(key,ids);
        }
        return [...hull.values()];
  }

  function make(name, options={}) {
    const s=options.size===undefined?2:options.size;
    const n=Math.max(2,Math.min(16,Math.round(options.resolution||7)));
    const cells=[];
    // Solid grid pieces share only complete square faces. No independent cap
    // skin overlaps the side wall, and no radial fan is needed at the poles.
    if(name!=='gear'){
      const ring=name==='torus';
      const count=ring?Math.max(16,Math.ceil(n*2/4)*4):Math.max(7,n);
      const extent=s,step=2*extent/count,half=step/2;
      const poly={vertices:[[-half,-half,-half],[half,-half,-half],[half,half,-half],[-half,half,-half],[-half,-half,half],[half,-half,half],[half,half,half],[-half,half,half]],faces:[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]};
      const inside=(x,y,z)=>{
        if(name==='box')return true;
        if(name==='cylinder')return x*x+z*z<=s*s;
        if(name==='sphere')return x*x+y*y+z*z<=s*s;
        if(name==='frustum'){const width=s*(.74-.26*y/s);return Math.abs(x)<=width&&Math.abs(z)<=width;}
        if(name==='prism')return Math.abs(x)<=(s-y)/2;
        if(name==='tetrahedron'){
          const t=(s-y)/(2*s),z0=-s*.7*t,z1=s*t;
          return z>=z0&&z<=z1&&Math.abs(x)<=(z1-z)/1.7;
        }
        // A solid flat annular band, not a hollow tube or a round doughnut.
        // Identical footprints at every height fill its rectangular section.
        if(ring){const radius=Math.hypot(x,z);return radius>=s*.72&&radius<=s&&Math.abs(y)<=s*.13;}
        throw new Error('Unknown challenge geometry: '+name);
      };
      const occupied=new Map();
      for(let x=0;x<count;x++)for(let z=0;z<count;z++){
        for(let y=0;y<count;y++){
          const center=[x,y,z].map(i=>-extent+(i+.5)*step);
          if(inside(...center)){
            const c={center,poly,track:'',order:0};
            cells.push(c);occupied.set([x,y,z].join(','),{c,grid:[x,y,z]});
          }
        }
      }
      // Each corner cube belongs to exactly one nearest surface, with a stable
      // tie break. Interior depth layers remain separate; no duplicate skins.
      const lanes=new Map();
      for(const {c,grid} of occupied.values()){
        let owner=null;
        for(const axis of [0,1,2])for(const sign of [-1,1]){
          let depth=0,p=grid.slice();p[axis]+=sign;
          while(occupied.has(p.join(','))){depth++;p[axis]+=sign;}
          if(!owner||depth<owner.depth)owner={axis,sign,depth};
        }
        const fallAxis=owner.axis===1?2:1;
        const fixedAxis=[0,1,2].find(axis=>axis!==owner.axis&&axis!==fallAxis);
        // Include the actual plane as well as depth: curved stair steps at the
        // same depth can have different surface coordinates.
        const key='face'+(owner.sign>0?'+':'-')+'xyz'[owner.axis]+':depth'+owner.depth+':plane'+grid[owner.axis]+':column'+grid[fixedAxis];
        if(!lanes.has(key))lanes.set(key,[]);
        lanes.get(key).push({c,position:grid[fallAxis],direction:fallAxis===2?-1:1});
      }
      for(const [key,lane] of lanes){
        lane.sort((a,b)=>a.direction*(a.position-b.position));
        let segment=0,order=0;
        lane.forEach((entry,i)=>{
          if(i&&Math.abs(entry.position-lane[i-1].position)!==1){segment++;order=0;}
          entry.c.track=key+':segment'+segment;entry.c.order=order++;
        });
      }
      return cells;
    }
    // One closed trapezoidal prism per radial/height slot. These pieces tile
    // the complete toothed ring; caps and outer walls belong to the same solid.
    const m=Math.max(8,n*2)*4,height=s*.22,hole=s*.26;
    const radius=i=>s*(i%4===1||i%4===2?1:.84);
    const point=(i,r,y)=>[r*Math.cos(TAU*i/m),y,r*Math.sin(TAU*i/m)];
    for(let i=0;i<m;i++)for(let j=0;j<n;j++)for(let k=0;k<2;k++){
      const a=radius(i),b=radius((i+1)%m);
      const r0=hole+(a-hole)*j/n,r1=hole+(a-hole)*(j+1)/n;
      const t0=hole+(b-hole)*j/n,t1=hole+(b-hole)*(j+1)/n;
      const bottom=-height+k*height,top=bottom+height;
      const vertices=[point(i,r0,bottom),point(i+1,t0,bottom),point(i+1,t1,bottom),point(i,r1,bottom),point(i,r0,top),point(i+1,t0,top),point(i+1,t1,top),point(i,r1,top)];
      const center=mul(vertices.reduce(add,[0,0,0]),1/8);
      const local=vertices.map(v=>sub(v,center));
      cells.push({center,poly:{vertices:local,faces:hull(local)},track:'tooth:'+i+':'+j,order:k});
    }
    return cells;
  }
  g.ChallengeGeometry={make,hull};
})(typeof window!=='undefined'?window:globalThis);
