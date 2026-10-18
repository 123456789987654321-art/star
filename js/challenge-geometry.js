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
    // Each surface triangle is a closed truncated wedge, never a flat decal.
    function cell(outer,inner,track) {
      if(Math.hypot(...cross(sub(outer[1],outer[0]),sub(outer[2],outer[0])))<1e-9)return;
      const verts=outer.concat(inner);
      const center=mul(verts.reduce(add,[0,0,0]),1/6);
      const vertices=verts.map(v=>sub(v,center));
      let faces=[[0,1,2],[3,5,4],[0,3,4,1],[1,4,5,2],[2,5,3,0]];
      for(const f of faces){
        const a=vertices[f[0]],b=vertices[f[1]],c=vertices[f[2]];
        if(dot(cross(sub(b,a),sub(c,a)),a)<0)f.reverse();
      }
      // Tube wedges can have a twisted side. Use the six-point convex hull
      // instead of passing a nonplanar quad to the triangle renderer/picker.
      if(faces.some(f=>{
        const a=vertices[f[0]],normal=cross(sub(vertices[f[1]],a),sub(vertices[f[2]],a));
        return vertices.some(p=>dot(normal,sub(p,a))>1e-9)||f.some(i=>Math.abs(dot(normal,sub(vertices[i],a)))>1e-9);
      })) {
        faces=hull(vertices);
      }
      cells.push({center,poly:{vertices,faces},track,order:0});
    }
    function tri(a,b,c,track,inner=p=>mul(p,.88)) {cell([a,b,c],[a,b,c].map(inner),track);}
    function quad(a,b,c,d,track,inner) {tri(a,b,c,track,inner);tri(a,c,d,track,inner);}
    function patch(a,b,c,label) {
      const p=(i,j)=>add(a,add(mul(sub(b,a),i/n),mul(sub(c,a),j/n)));
      const axis=Math.max(Math.abs(b[1]-a[1]),Math.abs(c[1]-a[1]))>1e-8?1:2;
      const alongI=Math.abs(b[axis]-a[axis])>Math.abs(c[axis]-a[axis]);
      for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){
        const track=label+':'+(alongI?j:i);
        tri(p(i,j),p(i+1,j),p(i,j+1),track);
        if(i+j<n-1)tri(p(i+1,j),p(i+1,j+1),p(i,j+1),track);
      }
    }
    function flatMesh(vertices,faces){
      faces.forEach((f,k)=>{
        if(f.length===3)patch(...f.map(i=>vertices[i]),'face'+k);
        else {
          const [a,b,c,d]=f.map(i=>vertices[i]);
          const axis=Math.max(Math.abs(b[1]-a[1]),Math.abs(d[1]-a[1]))>1e-8?1:2;
          const alongI=Math.abs(b[axis]-a[axis])>Math.abs(d[axis]-a[axis]);
          const p=(i,j)=>add(add(mul(a,(1-i/n)*(1-j/n)),mul(b,i/n*(1-j/n))),add(mul(c,i/n*j/n),mul(d,(1-i/n)*j/n)));
          for(let i=0;i<n;i++)for(let j=0;j<n;j++)quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),'face'+k+':'+(alongI?j:i));
        }
      });
    }
    if(name==='tetrahedron'){
      flatMesh([[0,s,0],[-s,-s,-s*.7],[s,-s,-s*.7],[0,-s,s]].map(p=>mul(p,.85)),[[0,1,2],[0,2,3],[0,3,1],[1,3,2]]);
    }else if(name==='box'||name==='frustum'){
      const top=name==='frustum'?.48:1;
      flatMesh([[-s,-s,-s],[s,-s,-s],[s,-s,s],[-s,-s,s],[-s*top,s,-s*top],[s*top,s,-s*top],[s*top,s,s*top],[-s*top,s,s*top]],[[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]]);
    }else if(name==='prism'){
      flatMesh([[-s,-s,-s],[s,-s,-s],[0,s,-s],[-s,-s,s],[s,-s,s],[0,s,s]],[[0,2,1],[3,4,5],[0,1,4,3],[1,2,5,4],[2,0,3,5]]);
    }else if(name==='sphere'){
      const m=n*3, rows=n*2;
      const p=(i,j)=>{const a=TAU*i/m,b=Math.PI*j/rows;return [s*Math.sin(b)*Math.cos(a),s*Math.cos(b),s*Math.sin(b)*Math.sin(a)];};
      for(let i=0;i<m;i++)for(let j=0;j<rows;j++)quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),'sphere:'+i);
    }else if(name==='torus'){
      const m=n*4,k=n*2,R=s*.68,r=s*.30;
      const p=(i,j,rad=r)=>{const a=TAU*i/m,b=TAU*j/k;return [(R+rad*Math.cos(b))*Math.cos(a),rad*Math.sin(b),(R+rad*Math.cos(b))*Math.sin(a)];};
      for(let i=0;i<m;i++)for(let j=0;j<k;j++){
        const inner=q=>{const a=Math.atan2(q[2],q[0]),core=[R*Math.cos(a),0,R*Math.sin(a)];return add(core,mul(sub(q,core),.72));};
        quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),'torus:'+i+':'+(Math.cos(TAU*(j+.5)/k)>=0?0:1),inner);
      }
    }else if(name==='cylinder'||name==='gear'){
      const gear=name==='gear',m=gear?Math.max(8,n*2)*4:n*4;
      const height=gear?s*.22:s, hole=gear?s*.26:0;
      const radius=i=>gear?s*(i%4===1||i%4===2?1:.84):s;
      const p=(i,r,y)=>[r*Math.cos(TAU*i/m),y,r*Math.sin(TAU*i/m)];
      for(let i=0;i<m;i++){
        const a=radius(i),b=radius((i+1)%m);
        const sides=gear?2:n;
        for(let j=0;j<sides;j++){
          const y=-height+2*height*j/sides,z=-height+2*height*(j+1)/sides;
          const inner=q=>{const r=Math.hypot(q[0],q[2]);return [q[0]*(1-s*.09/r),q[1],q[2]*(1-s*.09/r)];};
          quad(p(i,a,y),p(i+1,b,y),p(i+1,b,z),p(i,a,z),'side:'+i,inner);
          if(gear){const inward=q=>[q[0]*1.28,q[1],q[2]*1.28];quad(p(i,hole,y),p(i+1,hole,y),p(i+1,hole,z),p(i,hole,z),'hole:'+i,inward);}
        }
        for(const sign of [-1,1])for(let j=0;j<n;j++){
          const r0=hole+(a-hole)*j/n,r1=hole+(a-hole)*(j+1)/n;
          const t0=hole+(b-hole)*j/n,t1=hole+(b-hole)*(j+1)/n;
          const points=[p(i,r0,sign*height),p(i+1,t0,sign*height),p(i+1,t1,sign*height),p(i,r1,sign*height)];
          const column=Math.floor((points.reduce((sum,p)=>sum+p[0],0)/4+s)/(2*s)*n);
          quad(...points,'cap:'+sign+':'+column,q=>[q[0],q[1]-sign*s*.09,q[2]]);
        }
      }
    }else throw new Error('Unknown challenge geometry: '+name);
    const tracks=new Map();
    cells.forEach(c=>{if(!tracks.has(c.track))tracks.set(c.track,[]);tracks.get(c.track).push(c);});
    // The first slot is the downhill end. Horizontal surfaces drain toward +Z.
    tracks.forEach(list=>list.sort((a,b)=>a.center[1]-b.center[1]||b.center[2]-a.center[2]).forEach((c,i)=>c.order=i));
    return cells;
  }
  g.ChallengeGeometry={make,hull};
})(typeof window!=='undefined'?window:globalThis);
