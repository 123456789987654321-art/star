const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/mathx.js');
require('../js/scene.js');
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
test('all eight shells have unique closed outward nonzero cells and ordered tracks',()=>{
  require('../js/challenge-geometry.js');
  for(const name of ['tetrahedron','cylinder','sphere','prism','frustum','torus','gear','box']){
    const cells=ChallengeGeometry.make(name,{resolution:4});
    assert.ok(cells.length>30,name);
    const centers=new Set(),slots=new Set();
    for(const c of cells){
      const key=c.center.map(v=>v.toFixed(7)).join(',');
      assert.ok(!centers.has(key),name+' unique center');centers.add(key);
      const slot=c.track+':'+c.order;assert.ok(!slots.has(slot));slots.add(slot);
      const edges=new Map();let volume=0;
      for(const f of c.poly.faces){
        const vs=f.map(i=>c.poly.vertices[i]);
        const n=cross(sub(vs[1],vs[0]),sub(vs[2],vs[0]));
        assert.ok(dot(n,vs[0])>1e-10,name+' outward winding');
        assert.ok(vs.every(p=>Math.abs(dot(n,sub(p,vs[0])))<1e-8),name+' planar faces');
        assert.ok(c.poly.vertices.every(p=>dot(n,sub(p,vs[0]))<1e-8),name+' convex cells');
        for(let i=1;i<vs.length-1;i++)volume+=dot(vs[0],cross(vs[i],vs[i+1]))/6;
        f.forEach((a,i)=>{const b=f[(i+1)%f.length],e=[a,b].sort((a,b)=>a-b).join(',');edges.set(e,(edges.get(e)||0)+1);});
      }
      assert.ok(volume>1e-8,name+' volume');
      assert.ok([...edges.values()].every(n=>n===2),name+' closed manifold');
    }
  }
});
test('holes remain empty in torus and gear while body is pickable',()=>{
  require('../js/challenge-geometry.js');
  const scene=Object.create(Scene.prototype);scene._ray=()=>({o:[0,5,0],d:[0,-1,0]});
  for(const name of ['torus','gear']){
    const cells=ChallengeGeometry.make(name).map((c,id)=>({...c,id}));
    assert.equal(scene.pick(0,0,cells),-1,name+' center hole');
    scene._ray=()=>({o:[1.3,5,0.01],d:[0,-1,0]});
    assert.notEqual(scene.pick(0,0,cells),-1,name+' body');
    scene._ray=()=>({o:[0,5,0],d:[0,-1,0]});
  }
});
test('poly picking rejects triangle bounding box false positive and keeps box picking',()=>{
  const poly={vertices:[[0,0,0],[1,0,0],[0,1,0]],faces:[[0,1,2]]};
  assert.equal(Scene.rayPoly([.8,.8,2],[0,0,-1],poly),Infinity);
  assert.equal(Scene.rayPoly([.2,.2,2],[0,0,-1],poly),2);
  const scene=Object.create(Scene.prototype);scene._ray=()=>({o:[0,0,5],d:[0,0,-1]});
  assert.equal(scene.pick(0,0,[{id:42,center:[0,0,0],basis:[1,0,0,0,1,0,0,0,1],size:[1,1,1]}]),42);
});
test('poly GPU buffers are cached and legacy box attributes are restored after each draw',()=>{
  let allocations=0,restores=0,draws=0;
  const gl={createBuffer:()=>++allocations,bindBuffer(){},bufferData(){},enableVertexAttribArray(){},vertexAttribPointer(){},uniformMatrix4fv(){},uniform3fv(){},uniform2f(){},uniform1f(){},depthMask(){},drawElements(){draws++;}};
  const scene=Object.create(Scene.prototype);scene.gl=gl;
  scene.tileLoc={aPos:0,aNormal:1,aUV:2,aOut:3};scene._bindBox=()=>restores++;
  const poly=ChallengeGeometry.make('tetrahedron',{resolution:2})[0].poly;
  scene.drawPoly([],poly,[.6,.6,.6]);scene.drawPoly([],poly,[.6,.6,.6]);
  assert.equal(allocations,5);assert.equal(restores,2);assert.equal(draws,2);
});
test('vertical face tracks extend downhill across the face instead of across horizontal rows',()=>{
  for(const name of ['box','frustum','prism']){
    const cells=ChallengeGeometry.make(name,{resolution:4}),tracks=new Map();
    for(const c of cells){if(!tracks.has(c.track))tracks.set(c.track,[]);tracks.get(c.track).push(c);}
    for(const face of name==='prism'?['face3','face4']:['face2','face3','face4','face5']){
      const spans=[...tracks].filter(([key])=>key.startsWith(face+':')).map(([,cs])=>Math.max(...cs.map(c=>c.center[1]))-Math.min(...cs.map(c=>c.center[1])));
      assert.ok(spans.every(span=>span>2),name+' '+face+' downward span');
    }
  }
});
test('hull helper repairs edited wedges with outward supporting faces',()=>{
  const vertices=[[-1,-1,-1],[1,-1,-1],[0,1,-1],[-.7,-.7,1],[.7,-.7,.8],[0,.7,1]];
  const faces=ChallengeGeometry.hull(vertices);assert.ok(faces.length>=5);
  for(const f of faces){const a=vertices[f[0]],n=cross(sub(vertices[f[1]],a),sub(vertices[f[2]],a));assert.ok(vertices.every(v=>dot(n,sub(v,a))<1e-8));}
});
test('actual world gear outlines remain disjoint through a complete counter-rotation step',()=>{
  require('../js/challenge-world.js');
  const w=new ChallengeWorld(9,()=>.1);
  const outlines=w.components.map(comp=>{
    const rays=new Map();
    for(const c of w.cells.filter(c=>c.component===comp.id))for(const v of c.poly.vertices){
      const p=v.map((x,i)=>x+c.local[i]),r=Math.hypot(p[0],p[2]),angle=Math.atan2(p[2],p[0]);
      const key=angle.toFixed(7);if(!rays.has(key)||r>rays.get(key).r)rays.set(key,{p,r,angle});
    }
    return [...rays.values()].sort((a,b)=>a.angle-b.angle).map(v=>v.p);
  });
  const range=(poly,z)=>{
    const xs=[];for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length];
      if(z<Math.min(a[1],b[1])-1e-9||z>Math.max(a[1],b[1])+1e-9)continue;
      if(Math.abs(a[1]-b[1])<1e-12)xs.push(a[0],b[0]);else xs.push(a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1]));
    }
    return xs.length?[Math.min(...xs),Math.max(...xs)]:null;
  };
  for(let step=0;step<=64;step++){
    w.time=2.4+.8*step/64-1e-8;w.update(1e-8);
    const polygons=outlines.map((points,i)=>points.map(p=>{const c=w.components[i],b=c.basis;return [c.position[0]+b[0]*p[0]+b[6]*p[2],c.position[2]+b[2]*p[0]+b[8]*p[2]];}));
    for(const z of polygons.flat().map(p=>p[1])){
      const a=range(polygons[0],z),b=range(polygons[1],z);
      if(a&&b)assert.ok(Math.min(a[1],b[1])-Math.max(a[0],b[0])<1e-7,'gear penetration at step '+step);
    }
  }
});
