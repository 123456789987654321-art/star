const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
  const ctx=vm.createContext({console,innerWidth:800,innerHeight:800});ctx.window=ctx;
  for(const name of ['mathx','scene','challenge-geometry','challenge-world','challenge-assembly'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),ctx);
  const world=new ctx.ChallengeWorld(8,()=>.2),scene=Object.create(ctx.Scene.prototype),m=ctx.MX.m4;
  Object.assign(scene,{eye:[0,0,8],target:[0,0,0],up:[0,1,0],w:800,h:800,dpr:1});
  const p=m.create(),v=m.create();m.perspective(p,Math.PI/4,1,.3,60);m.lookAt(v,scene.eye,scene.target,scene.up);scene.vp=m.create();scene.invVP=m.create();m.multiply(scene.vp,p,v);m.invert(scene.invVP,scene.vp);
  const draws=[];scene.drawBox=(...args)=>draws.push(args);
  const game={world,app:{scene,state:'play',toast(){}},elapsed:0,intro:0,refit(){},controls(){},syncHud(){}};
  const assembly=new ctx.ChallengeAssembly(game);
  const add=(name='box')=>{world.action('add',name);assembly.afterAction('add');};
  const point=(component,pointerType='mouse')=>{const q=scene.project(component.position);return {clientX:q[0],clientY:q[1],pointerType,pointerId:1,button:0};};
  return {world,assembly,add,point,scene,draws};
}
test('pending added part cannot complete until desktop second click confirms its contact',()=>{
  const {world:w,assembly:a,add,point,draws}=fixture();add();add();
  assert.equal(w.assemblyPending,true);w.action('complete');assert.equal(w.phase,'assemble');
  a.afterAction('complete');assert.equal(w.assemblyPending,true);
  const e=point(w.components[1]);assert.equal(a.pointerDown(e),true);a.pointerUp(e);
  assert.ok(a.active);assert.equal(w.assemblyPending,true);
  a.render();assert.ok(a.seams.length>0);assert.ok(draws.length>0);assert.ok(w.cells.every(c=>c.color===6));
  a.pointerDown(e);assert.equal(w.assemblyPending,false);assert.equal(a.active,null);
  w.action('complete');assert.equal(w.phase,'play');
});
test('corner-only or penetrating placements cannot confirm and produce no false face glow',()=>{
  const {world:w,assembly:a,add}=fixture();add();add();
  const c=w.components[1];w._transform(c,[2,2,0],c.basis);a.afterAction('translate');
  assert.equal(a.seams.length,0);assert.equal(a.confirm(),false);
  w._transform(c,[.2,0,0],c.basis);a.afterAction('translate');
  assert.equal(a.seams.length,0);assert.equal(a.confirm(),false);assert.equal(w.assemblyPending,true);
});
test('hover moves a whole desktop part, blank drag remains camera input and cancel restores it',()=>{
  const {world:w,assembly:a,add,point}=fixture();add();add();
  assert.equal(a.pointerDown({clientX:5,clientY:5,pointerType:'mouse',button:0}),false);
  const c=w.components[1],original=Array.from(c.position),e=point(c),history=w.history.length;
  a.pointerDown(e);a.pointerUp(e);a.pointerMove({...e,clientX:e.clientX+150});
  assert.ok(Math.abs(c.position[0]-original[0])>.5);
  assert.equal(w.history.length,history);
  a.cancel();assert.deepEqual(Array.from(c.position),original);
});
test('touch release confirms contacts and reverts detached placement without coloring parts',()=>{
  const {world:w,assembly:a,add,point}=fixture();add();add();
  let e=point(w.components[1],'touch');a.pointerDown(e);a.pointerUp(e);
  assert.equal(w.assemblyPending,false);
  const original=Array.from(w.components[1].position);e=point(w.components[1],'touch');
  a.pointerDown(e);a.pointerMove({...e,clientX:e.clientX+200});a.pointerUp({...e,clientX:e.clientX+200});
  assert.deepEqual(Array.from(w.components[1].position),original);
  assert.equal(w.assemblyPending,false);assert.ok(w.cells.every(c=>c.color===6));
});
test('undo cannot turn corner-only contact into a confirmed completed assembly',()=>{
  const {world:w,assembly:a,add}=fixture();add();add();assert.equal(a.confirm(),true);
  const c=w.components[1];w._transform(c,[2,2,0],c.basis);
  w.action('translate',{axis:'x',delta:.25});a.afterAction('translate');
  w.action('undo');a.afterAction('undo');
  assert.equal(a.valid(),false);assert.equal(a.seams.length,0);
  assert.equal(w.assemblyPending,true);
  // The model must independently enforce face contact, even without the UI.
  w.assemblyPending=false;w.action('complete');
  assert.equal(w.phase,'assemble');assert.ok(w.cells.every(c=>c.color===6));
});
test('undo restores confirmed placement and reset removes cached contact outlines',()=>{
  const {world:w,assembly:a,add}=fixture();add();add();assert.equal(a.confirm(),true);
  w.action('translate',{axis:'x',delta:3});a.afterAction('translate');
  w.action('undo');a.afterAction('undo');
  assert.equal(w.assemblyPending,false);assert.ok(a.seams.length>0);
  const revision=w.revision;w.action('reset');a.afterAction('reset');
  assert.ok(w.revision>revision);assert.equal(a.seams.length,0);
});
test('all six distinct shapes snap through real faces and confirm without deformation or early color',()=>{
  const {world:w,assembly:a,add}=fixture();
  for(const name of ['tetrahedron','cylinder','sphere','prism','frustum','torus']){
    add(name);
    const comp=w.components.at(-1),cells=w.cells.filter(c=>c.component===comp.id);
    const shape=cells.map(c=>JSON.stringify(c.poly));
    assert.equal(a.confirm(),true,name+' has a connected placement');
    assert.deepEqual(cells.map(c=>JSON.stringify(c.poly)),shape);
    assert.ok(w.cells.every(c=>c.color===6));
    if(w.components.length>1)assert.ok(a.seams.some(s=>s.components.includes(comp.id)),name+' has positive-area contact');
  }
  w.action('complete');assert.equal(w.phase,'play');
});
