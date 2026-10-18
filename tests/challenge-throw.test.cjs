const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
  const ctx=vm.createContext({console,innerWidth:800,innerHeight:800});ctx.window=ctx;
  for(const name of ['mathx','scene','challenge-geometry','challenge-world','challenge-throw'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),ctx);
  const world=new ctx.ChallengeWorld(10,()=>.2),scene=Object.create(ctx.Scene.prototype),m=ctx.MX.m4;
  Object.assign(scene,{eye:[0,0,8],target:[0,0,0],up:[0,1,0],w:800,h:800,dpr:1});
  const p=m.create(),v=m.create();m.perspective(p,Math.PI/4,1,.3,60);m.lookAt(v,scene.eye,scene.target,scene.up);scene.vp=m.create();scene.invVP=m.create();m.multiply(scene.vp,p,v);m.invert(scene.invVP,scene.vp);
  const game={world,app:{scene,state:'play'},intro:0},thrower=new ctx.ChallengeThrow(game);
  const point=scene.project([-1.6,0,.09]),e={clientX:point[0],clientY:point[1],pointerType:'mouse',pointerId:1,button:0};
  return {world,game,thrower,e};
}
test('holding changes landing distance and releasing launches exactly the preview once',()=>{
  const {world:w,thrower:t,e}=fixture(),ammo=w.ammo.length;
  assert.equal(t.pointerDown(e),true);t.frame(.2);
  const short=w.trajectory.at(-1).slice();t.frame(1);
  const long=w.trajectory.at(-1).slice();
  assert.ok(Math.hypot(long[0],long[1]+1.7)>Math.hypot(short[0],short[1]+1.7)+2);
  assert.equal(w.ammo.length,ammo);assert.equal(w.projectile,undefined);
  const preview=Array.from(w.trajectory,p=>Array.from(p));
  assert.equal(t.pointerUp(e),true);assert.equal(w.ammo.length,ammo-1);
  assert.deepEqual(Array.from(w.projectile.path,p=>Array.from(p)),preview);
  t.pointerUp(e);assert.equal(w.ammo.length,ammo-1);
  w.update(2);assert.deepEqual(Array.from(w.lastImpact),Array.from(long));
});
test('cursor movement changes charged direction, maximum charge does not auto-fire, and pause cancels',()=>{
  const {world:w,game,thrower:t,e}=fixture(),ammo=w.ammo.length;
  t.pointerDown(e);t.frame(5);assert.equal(t.power,1);assert.equal(t.charging,true);assert.equal(w.ammo.length,ammo);
  const before=w.trajectory.at(-1)[0];t.pointerMove({...e,clientX:e.clientX+400});
  assert.ok(w.trajectory.at(-1)[0]>before);
  game.app.state='paused';t.frame(.1);assert.equal(t.charging,false);t.pointerUp(e);assert.equal(w.ammo.length,ammo);
});
test('right mouse leaves camera input free and a second touch cancels charging without shooting',()=>{
  const {world:w,thrower:t,e}=fixture(),ammo=w.ammo.length;
  assert.equal(t.pointerDown({...e,button:2}),false);
  assert.equal(t.pointerDown({...e,pointerType:'touch'}),true);t.frame(.3);
  assert.equal(t.pointerDown({...e,pointerType:'touch',pointerId:2}),false);
  assert.equal(t.charging,false);t.pointerUp({...e,pointerType:'touch'});assert.equal(w.ammo.length,ammo);
});
test('touch release fires one charged block and right-button release cannot fire a left-button charge',()=>{
  const {world:w,thrower:t,e}=fixture(),ammo=w.ammo.length;
  t.pointerDown(e);t.frame(.3);
  assert.equal(t.pointerUp({...e,button:2}),false);assert.equal(w.ammo.length,ammo);t.cancel();
  const touch={...e,pointerType:'touch'};t.pointerDown(touch);t.frame(.5);t.pointerUp(touch);
  assert.equal(w.ammo.length,ammo-1);assert.equal(t.charging,false);
});
