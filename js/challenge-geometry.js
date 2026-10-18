/* Closed surface cells shared by challenge rendering, collision and matching. */
(function (g) {
  'use strict';
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const mul=(a,s)=>a.map(v=>v*s);
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const TAU=Math.PI*2;

  // Clip a closed convex solid, retaining actual volume and a shared cap.
  function clip(poly,n,d){
    if(!poly)return null;
    const distances=poly.vertices.map(p=>dot(n,p)-d);
    if(distances.every(v=>v<=1e-9))return poly;
    if(distances.every(v=>v>=-1e-9))return null;
    const polygons=[],cap=[];
    for(const face of poly.faces){
      const points=[];
      for(let j=0;j<face.length;j++){
        const i=face[j],k=face[(j+1)%face.length],a=poly.vertices[i],b=poly.vertices[k],da=distances[i],db=distances[k];
        if(da<=1e-9)points.push(a);
        if((da< -1e-9&&db>1e-9)||(da>1e-9&&db< -1e-9)){
          const p=add(a,mul(sub(b,a),da/(da-db)));points.push(p);cap.push(p);
        }else if(Math.abs(da)<=1e-9)cap.push(a);
      }
      if(points.length>=3)polygons.push(points);
    }
    const unique=cap.filter((p,i)=>!cap.slice(0,i).some(q=>Math.hypot(...sub(p,q))<1e-8));
    if(unique.length>=3){
      const mid=mul(unique.reduce(add,[0,0,0]),1/unique.length),u=sub(unique[0],mid),v=cross(n,u);
      unique.sort((a,b)=>Math.atan2(dot(sub(a,mid),v),dot(sub(a,mid),u))-Math.atan2(dot(sub(b,mid),v),dot(sub(b,mid),u)));
      polygons.push(unique);
    }
    const vertices=[],faces=[];
    for(let points of polygons){
      points=points.filter((p,i)=>!points.slice(0,i).some(q=>Math.hypot(...sub(p,q))<1e-8));
      // Remove collinear vertices so every renderer triangle has a normal.
      let changed=true;
      while(changed&&points.length>2){changed=false;for(let i=0;i<points.length;i++)if(Math.hypot(...cross(sub(points[i],points[(i+points.length-1)%points.length]),sub(points[(i+1)%points.length],points[i])))<1e-10){points.splice(i,1);changed=true;break;}}
      if(points.length<3)continue;
      faces.push(points.map(p=>{let i=vertices.findIndex(q=>Math.hypot(...sub(p,q))<1e-8);if(i<0){i=vertices.length;vertices.push(p);}return i;}));
    }
    return faces.length>=4?{vertices,faces}:null;
  }

  function planesFor(name,s){
    const planes=[];
    if(name==='prism')planes.push([[1,.5,0],s/2],[[-1,.5,0],s/2]);
    if(name==='frustum')for(const axis of [0,2])for(const sign of [-1,1]){const n=[0,.26,0];n[axis]=sign;planes.push([n,.74*s]);}
    if(name==='tetrahedron')planes.push([[0,.35,-1],.35*s],[[1,.5/1.7,1/1.7],s*.5/1.7],[[-1,.5/1.7,1/1.7],s*.5/1.7]);
    if(name==='cylinder'||name==='torus')for(let i=0;i<32;i++){const a=TAU*i/32;planes.push([[Math.cos(a),0,Math.sin(a)],s]);}
    if(name==='sphere')for(let j=0;j<=12;j++)for(let i=0;i<(j===0||j===12?1:24);i++){const p=Math.PI*j/12,a=TAU*i/24;planes.push([[Math.sin(p)*Math.cos(a),Math.cos(p),Math.sin(p)*Math.sin(a)],s]);}
    if(name==='torus')planes.push([[0,1,0],s*.125],[[0,-1,0],s*.125]);
    return planes;
  }

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
      // Broad axial inner flats give the perpendicular ring a real contact
      // patch across its thickness, instead of intersecting curved corners.
      const planes=options.smooth?planesFor(name,s):[],hole=ring&&options.smooth?Array.from({length:32},(_,i)=>[[Math.cos(TAU*i/32),0,Math.sin(TAU*i/32)],s*.75]).filter(([n])=>Math.abs(n[0])<.92||Math.abs(n[2])<1e-8):[];
      for(let x=0;x<count;x++)for(let z=0;z<count;z++){
        for(let y=0;y<count;y++){
          const center=[x,y,z].map(i=>-extent+(i+.5)*step);
          if(options.smooth){
            let solid=poly;
            for(const [normal,d] of planes){solid=clip(solid,normal,d-dot(normal,center));if(!solid)break;}
            if(!solid)continue;
            let pieces=[solid];
            if(hole.length){
              pieces=[];let remainder=solid;
              for(const [normal,d] of hole){
                if(!remainder)break;
                const outside=clip(remainder,mul(normal,-1),dot(normal,center)-d);
                if(outside)pieces.push(outside);
                remainder=clip(remainder,normal,d-dot(normal,center));
              }
            }
            for(let part=0;part<pieces.length;part++){
              const shape=pieces[part],shift=mul(shape.vertices.reduce(add,[0,0,0]),1/shape.vertices.length);
              const c={center:add(center,shift),poly:{vertices:shape.vertices.map(p=>sub(p,shift)),faces:shape.faces},clipped:shape!==poly,gridCenter:center.slice(),gridStep:step,part,track:'',order:0};
              cells.push(c);occupied.set([x,y,z].join(',')+(part?':'+part:''),{c,grid:[x,y,z]});
            }
          }else if(inside(...center)){
            const c={center,poly,track:'',order:0};cells.push(c);occupied.set([x,y,z].join(','),{c,grid:[x,y,z]});
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
        const key='face'+(owner.sign>0?'+':'-')+'xyz'[owner.axis]+':depth'+owner.depth+':plane'+grid[owner.axis]+':column'+grid[fixedAxis]+(c.part?':part'+c.part:'');
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
  g.ChallengeGeometry={make,hull,clip};
})(typeof window!=='undefined'?window:globalThis);
