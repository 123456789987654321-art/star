const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function fixture() {
  const ctx = vm.createContext({document:{readyState:'loading',addEventListener(){},getElementById(){return {classList:{remove(){}},textContent:''};}}});
  ctx.window=ctx;
  for(const file of ['mathx','board','mechanics','app']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file+'.js'),'utf8'),ctx);
  const a=ctx.App; a.board=new ctx.Board(5); a.board.color.fill(-1);
  a.scene={up:[1,0,0],addShake(){},particles:{burst(){}}};
  a.trackBest=a.updateHud=a.toast=()=>{};
  ctx.Sfx={pop(){}};
  return {a,ctx};
}
test('contact group removes both rotor and shell blocks only after player pop',()=>{
  const {a,ctx}=fixture();a.board.color.fill(1);a.rotor=new ctx.Rotor(a.board,()=>0);
  const [main,external]=a.rotor.contacts()[0];
  a.board.color.fill(-1);a.board.color[main]=0;
  a.rotor.colors.fill(-1);a.rotor.colors[external-a.board.size]=0;
  a.spawnTilesInstant();
  const tile=a.makeTile(main,0);tile.id=external;tile.external=true;tile.center=a.rotor.center(external-a.board.size);a.tiles[external]=tile;
  a.state='play';a.score=0;
  const group=a.groupAt(main);assert.equal(group.length,2);
  assert.equal(a.remainingCount(),2);
  a.pop(group);
  assert.equal(a.remainingCount(),0);assert.equal(a.score,20);assert.equal(a.dying.length,2);
  a.rotor.angle=Math.PI;assert.equal(a.rotor.contacts().length,0);
});
test('tunnel arrival creates a normal surface tile, falls, and remains matchable',()=>{
  const {a,ctx}=fixture();a.tunnel=new ctx.CrossTunnel(a.board);a.spawnTilesInstant();a.state='play';
  a.tunnel.openGate(0);
  for(let i=0;i<100&&a.state==='play';i++) a.updateMechanics(0.02);
  assert.equal(a.tunnel.pieces[0].exited,true);
  assert.equal(a.board.aliveCount(),1);assert.equal(a.remainingCount(),2);
  const id=a.board.color.indexOf(6);
  assert.ok(a.tiles[id]);assert.equal(a.tiles[id].color,6);
  assert.equal(a.board.faceOf(id),3);
  assert.equal(a.board.rowOf(id),a.board.layouts[3].rows-1);
  const neighbor=a.board.neighbors(id)[0];a.board.color[neighbor]=2;
  assert.ok(a.groupAt(neighbor).includes(id));
});

test('a wildcard still inside the channel can be clicked with a touching colored cube',()=>{
  const {a,ctx}=fixture();a.tunnel=new ctx.CrossTunnel(a.board);
  const outlet=a.tunnel.exitId(-2,0);a.board.color[outlet]=3;
  a.spawnTilesInstant();a.syncTunnelTiles();a.state='play';a.score=0;
  const wild=a.board.size;
  assert.equal(a.tunnel.pieces[0].exited,false);
  for (let frame=0; frame<120; frame++) a.updateMechanics(1/60);
  assert.equal(a.tunnel.pieces[0].exited,false,'contact alone never eliminates a wildcard');
  assert.equal(a.board.color[outlet],3);assert.equal(a.score,0);
  assert.deepEqual(Array.from(a.groupAt(outlet)).sort((x,y)=>x-y),[outlet,wild].sort((x,y)=>x-y));
  assert.ok(a.groupAt(wild).includes(outlet));
  a.pop(a.groupAt(wild));
  assert.equal(a.tunnel.pieces[0].exited,true);
  assert.equal(a.board.color[outlet],-1);assert.equal(a.remainingCount(),1);
  assert.equal(a.score,20);
});

test('transparent channel walls do not intercept clicks',()=>{
  const {a,ctx}=fixture();a.tunnel=new ctx.CrossTunnel(a.board);a.spawnTilesInstant();a.state='play';a.syncTunnelTiles();a.buildRenderList();
  const walls=a.renderList.filter(t=>t.id===-10);
  assert.ok(walls.length>0);assert.ok(walls.every(t=>t.alpha<0.3&&t.pickThrough));
});

test('a wildcard at the cross centre keeps the level alive until it can reach an occupied exit',()=>{
  const {a,ctx}=fixture();a.tunnel=new ctx.CrossTunnel(a.board);
  a.board.color.forEach((_,id)=>{a.board.color[id]=a.board.cellCenter(id).reduce((sum,v)=>sum+Math.round((v+1)/a.board.pitch-0.5),0)%6;});
  a.tunnel.pieces[0].cell=[0,0];a.tunnel.pieces[0].position=[0,0];a.tunnel.pieces[1].exited=true;
  a.tunnel.openGate(0);
  assert.equal(a.board.hasMoves(),false);
  assert.equal(a.groupAt(a.board.size).length,1);
  assert.equal(a.hasPotentialMoves(),true);
  for(let i=0;i<50;i++)a.tunnel.update(0.02,[-1,0,0]);
  assert.ok(a.groupAt(a.board.size).length>=2);
});
