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
test('a perspective seam removes same-colored shell and fixed panel blocks only on click',()=>{
  const {a,ctx}=fixture();a.rotor=new ctx.PerspectivePanel(a.board,()=>0);
  a.board.color[0]=2;a.rotor.colors.fill(-1);a.rotor.colors[0]=2;
  a.spawnTilesInstant();const external=a.board.size;
  const tile=a.makeTile(0,2);tile.id=external;tile.external=true;tile.center=a.rotor.center(0);a.tiles[external]=tile;
  a.state='play';a.score=0;
  assert.equal(a.groupAt(0).length,1);
  assert.equal(a.hasPotentialMoves(),true,'another viewpoint can create a match');
  a.rotor.links=[[0,external]];
  assert.equal(a.groupAt(0).length,2);assert.equal(a.remainingCount(),2);assert.equal(a.score,0);
  a.pop(a.groupAt(0));assert.equal(a.remainingCount(),0);assert.equal(a.score,20);
});
