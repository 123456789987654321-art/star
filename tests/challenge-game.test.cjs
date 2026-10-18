const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function fixture(){
  const ctx=vm.createContext({console,document:{getElementById:()=>null}});ctx.window=ctx;
  vm.runInContext(fs.readFileSync('js/challenge-game.js','utf8'),ctx);
  const game=Object.create(ctx.ChallengeGame.prototype);
  game.world={cells:[{id:0,color:2},{id:1,color:2},{id:2,color:2},{id:3,color:4}],contacts:()=>[[0,1]],canRemove:()=>true};
  game.viewLinks=[[1,2],[2,1],[2,3]];game.viewEnabled=true;
  return {game,ctx};
}
test('challenge groups join physical and perspective edges once and preserve colors',()=>{
  const {game}=fixture();assert.deepEqual(Array.from(game.group(0)).sort(),[0,1,2]);
  game.viewEnabled=false;assert.deepEqual(Array.from(game.group(0)).sort(),[0,1,2]);
  game.world.cells[1].color=-1;assert.deepEqual(Array.from(game.group(0)),[0]);
});
test('neutral assembly blocks and moving mechanisms cannot be eliminated',()=>{
  const {game}=fixture();game.world.cells[0].color=6;assert.equal(game.group(0).length,0);
  game.world.cells[0].color=2;game.world.canRemove=()=>false;assert.equal(game.group(0).length,0);
});
test('entry blocks fall along the owning surface direction',()=>{
  const {game}=fixture();game.intro=1.25;game.slides=new Map();
  const side=game.makeTile({id:0,center:[0,0,0],track:'0:face+x:depth0'});
  const top=game.makeTile({id:0,center:[0,0,0],track:'0:face+y:depth0'});
  assert.deepEqual(Array.from(side.center),[0,6,0]);
  assert.deepEqual(Array.from(top.center),[0,0,-6]);
});
test('paused challenge frame freezes model and introduction',()=>{
  const {game}=fixture();let updates=0;game.world.update=()=>updates++;
  game.app={state:'paused',scene:{updateCamera(){},particles:{update(){}}}};
  game.intro=1;game.render=game.syncHud=game.checkResult=()=>{};
  game.frame(.05);assert.equal(updates,0);assert.equal(game.intro,1);
});

// Browser boundaries only: DOM nodes and drawing calls are inert; scene matrices,
// ray picks, projection, world rules, ChallengeGame and App run their real code.
function integrated(level=1,acknowledge=true){
  const nodes=new Map();
  const node=()=>({classList:{add(){},remove(){},toggle(){}},style:{},dataset:{},innerHTML:'',textContent:'',setAttribute(){},appendChild(){},remove(){}});
  const document={readyState:'loading',addEventListener(){},body:node(),createElement:node,getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);}};
  const ctx=vm.createContext({console,document,innerWidth:800,innerHeight:800,performance:{now:()=>0},setTimeout(){},localStorage:{getItem(){return null;},setItem(){}}});ctx.window=ctx;
  for(const file of ['mathx','board','mechanics','scene','challenge-geometry','challenge-world','challenge-projection','challenge-thumbnails','challenge-assembly','challenge-throw','challenge-game','app'])vm.runInContext(fs.readFileSync('js/'+file+'.js','utf8'),ctx);
  ctx.Sfx={start(){},pop(){},invalid(){},levelClear(){},gameOver(){}};
  const app=ctx.App,scene=Object.create(ctx.Scene.prototype);
  Object.assign(scene,{w:800,h:800,dpr:1,fov:Math.PI/4,aspect:1,time:0,shakeT:0,target:[0,0,0],vp:ctx.MX.m4.create(),invVP:ctx.MX.m4.create(),particles:{clear(){},update(){},burst(){}},drawPoly(){},drawBox(){},drawParticles(){}});
  scene.beginFrame=function(){const p=ctx.MX.m4.create(),v=ctx.MX.m4.create();ctx.MX.m4.perspective(p,this.fov,1,.3,60);ctx.MX.m4.lookAt(v,this.eye,this.target,this.up);ctx.MX.m4.multiply(this.vp,p,v);ctx.MX.m4.invert(this.invVP,this.vp);};
  app.scene=scene;app.reduceMotion=true;app.last=0;
  app.startSelectedLevel('challenge',level);
  if(acknowledge)app.resume();
  return {app,game:app.challenge,scene,ctx,nodes};
}
test('every challenge opens a paused instruction dialog and help can reopen it',()=>{
  for(let level=1;level<=12;level++){
    const {app,game,nodes}=integrated(level,false);
    assert.equal(app.state,'paused');assert.match(nodes.get('ovCard').innerHTML,/我知道了/);
    const time=game.world.time;game.frame(.05);assert.equal(game.world.time,time);
    assert.doesNotMatch(nodes.get('challengeControls').innerHTML,/data-challenge="view"/);
    if(![8,10,11,12].includes(level))assert.equal(nodes.get('challengeControls').innerHTML,'');
    app.resume();assert.equal(app.state,'play');app.showMechanicIntro();assert.equal(app.state,'paused');
  }
});
function seamFixture(){
  const f=integrated(),w=f.game.world;
  const face=(id,x,z)=>({id,component:id,color:2,center:[x,0,z],basis:[1,0,0,0,1,0,0,0,1],track:'fixed',volume:1,poly:{vertices:[[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0]],faces:[[0,1,2,3]]}});
  w.cells=[face(0,0,0),face(1,1,1)];w.revision++;w._contactCache=null;
  f.scene.yaw=0;f.scene.pitch=0;f.scene.dist=10;f.game.focus=null;
  f.game.frame(.01);f.game.frame(.13);
  assert.deepEqual(JSON.parse(JSON.stringify(f.game.viewLinks)),[[0,1]],'fixture has a real depth-visible seam');
  return f;
}
test('camera movement immediately removes old projected links and rebuilds after settling',()=>{
  const {game,scene}=seamFixture();game.hover=[0,1];game.hint=[0,1];
  scene.yaw=.12;game.frame(.01);
  assert.equal(game.viewLinks.length,0);assert.equal(game.hover.length,0);assert.equal(game.hint.length,0);
  assert.deepEqual(Array.from(game.group(0)),[0]);
  game.frame(.13);assert.equal(game.viewLinks.length,1);
});
test('geometry position and basis changes invalidate projected links before another click',()=>{
  const {game}=seamFixture();game.world.cells[1].center[0]=5;game.frame(.01);
  assert.equal(game.viewLinks.length,0);game.frame(.13);assert.equal(game.viewLinks.length,0);
  game.world.cells[1].center[0]=1;game.frame(.01);game.frame(.13);assert.equal(game.viewLinks.length,1);
  game.world.cells[1].basis=[0,1,0,-1,0,0,0,0,1];game.frame(.01);
  assert.equal(game.viewLinks.length,0);
});
test('slides suppress view matching and rebuild using settled rendered geometry',()=>{
  const {game}=seamFixture();game.slides.set(1,{from:[5,0,1],time:0});
  game.frame(.1);assert.equal(game.viewLinks.length,0);
  game.frame(.1);assert.equal(game.viewLinks.length,0);
  game.frame(.09);game.frame(.13);
  assert.equal(game.slides.size,0);assert.equal(game.viewLinks.length,1);
  assert.deepEqual(Array.from(game.tiles.find(t=>t.id===1).renderCenter),[1,0,1]);
});
test('aim sliders preserve aim while paused or introducing and update during play',()=>{
  const {app,game,nodes}=integrated(10),panel=nodes.get('challengePanel');
  const input={target:{dataset:{aim:'x'},value:'2.5'}},initial=game.world.aim.x;
  app.state='paused';panel.oninput(input);assert.equal(game.world.aim.x,initial);
  app.state='play';game.intro=.5;panel.oninput(input);assert.equal(game.world.aim.x,initial);
  game.intro=0;panel.oninput(input);assert.equal(game.world.aim.x,2.5);
});
test('App starts a real challenge, advances its frame and removes the clicked projected group',()=>{
  const {app,game,scene,ctx}=seamFixture();
  assert.ok(game instanceof ctx.ChallengeGame);assert.ok(game.world instanceof ctx.ChallengeWorld);
  const before=game.world.time;app.last=0;app.frame(50);assert.ok(game.world.time>before);
  const p=scene.project([-.5,0,0]);app.click({clientX:p[0],clientY:p[1]});
  assert.equal(game.world.remaining(),0);assert.equal(app.score,20);assert.equal(game.world.score,20);
});

test('an emptied challenge automatically settles after its last move',()=>{
  const {app,game}=integrated(1);
  game.world.remove(game.world.cells.map(c=>c.id));
  game.frame(.05);
  assert.equal(game.world.result,'win');assert.equal(app.state,'clear');
});

test('water gauge tracks remaining supply and the remaining fire requirement',()=>{
  const {game,nodes}=integrated(4);
  Object.assign(game.world.water,{capacity:100,amount:70,required:35,progress:.4,leaking:true});game.syncHud();
  assert.equal(nodes.get('waterGaugeFill').style.height,'70%');
  assert.equal(nodes.get('waterGaugeLine').style.bottom,'21%');
  assert.match(nodes.get('waterGaugeState').textContent,/漏水/);
  game.world.water.amount=15;game.syncHud();
  assert.match(nodes.get('waterGaugeState').textContent,/不足/);
});
