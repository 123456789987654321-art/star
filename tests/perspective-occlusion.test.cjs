const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../js/mathx.js');require('../js/board.js');require('../js/scene.js');require('../js/mechanics.js');
function fixture(yaw,pitch) {
  const board=new Board(7);board.color.fill(0);
  const panel=new PerspectivePanel(board,()=>0),scene=Object.create(Scene.prototype);
  const cp=Math.cos(pitch),sp=Math.sin(pitch),distance=8;
  scene.eye=[distance*cp*Math.sin(yaw),distance*sp,distance*cp*Math.cos(yaw)];
  scene.up=[-sp*Math.sin(yaw),cp,-sp*Math.cos(yaw)];scene.w=1100;scene.h=850;scene.dpr=1;
  const proj=MX.m4.create(),view=MX.m4.create();scene.vp=MX.m4.create();scene.invVP=MX.m4.create();
  MX.m4.perspective(proj,Math.PI/4,1100/850,0.3,60);MX.m4.lookAt(view,scene.eye,[0,0,0],scene.up);
  MX.m4.multiply(scene.vp,proj,view);MX.m4.invert(scene.invVP,scene.vp);
  const tiles=board.cells.map((_,id)=>({id,center:board.cellCenter(id),basis:[1,0,0,0,1,0,0,0,1],size:[board.pitch,board.pitch,board.pitch]}));
  for(let i=0;i<6;i++)tiles.push({id:board.size+i,center:panel.center(i),basis:panel.basis(),size:[board.pitch,board.pitch,board.pitch]});
  const project=p=>scene.project(p);
  const pick=(p,candidates)=>scene.pick(p[0]/550-1,1-p[1]/425,candidates?tiles.filter(t=>candidates.includes(t.id)):tiles);
  const visible=(id,center,point)=>pick(point||project(center))===id;
  return {board,panel,scene,project,pick,visible};
}
test('oblique partial occlusion creates a visible cross-board seam',()=>{
  const f=fixture(-1.4,0.65);
  f.panel.updateProjection(f.project,f.visible,f.scene.eye,f.pick);
  assert.ok(f.panel.contacts().length>0);
});
test('an actual visible gap does not join the detached panel',()=>{
  const f=fixture(0.4,0.3);
  f.panel.updateProjection(f.project,f.visible,f.scene.eye,f.pick);
  assert.equal(f.panel.contacts().length,0);
});
test('a fully hidden panel is not a visible connection',()=>{
  const f=fixture(-Math.PI/2,0);
  f.panel.updateProjection(f.project,f.visible,f.scene.eye,f.pick);
  assert.equal(f.panel.contacts().length,0);
});
