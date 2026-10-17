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
