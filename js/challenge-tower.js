/* A small rigid-platform tower puzzle. Y is vertical; simulation uses fixed steps. */
(function(root){
  'use strict';
  const STEP=1/120,EPS=1e-7,GRAVITY=8;
  const cube=h=>({vertices:[[-h[0],-h[1],-h[2]],[h[0],-h[1],-h[2]],[h[0],h[1],-h[2]],[-h[0],h[1],-h[2]],[-h[0],-h[1],h[2]],[h[0],-h[1],h[2]],[h[0],h[1],h[2]],[-h[0],h[1],h[2]]],faces:[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]});
  const bottom=c=>c.center[1]-c.towerHalf[1],top=c=>c.center[1]+c.towerHalf[1];
  const overlap=(a,b)=>[0,2].every(i=>Math.abs(a.center[i]-b.center[i])<a.towerHalf[i]+b.towerHalf[i]-EPS);
  const underPerson=(c,p)=>Math.abs(c.center[0]-p.x)<c.towerHalf[0]+p.radius-EPS&&Math.abs(c.center[2]-p.z)<c.towerHalf[2]+p.radius-EPS;
  function build(w){
    w.bounds=6;w.phase='play';w.target=500;
    const t=w.tower={groundY:-4,safeDrop:1.65,floors:[],floorSupports:[],roofSupports:[],bodies:[],personVisuals:[],accumulator:0,settled:0,failure:null};
    w.components.push({id:0,name:'高楼结构'});
    const body=()=>{const b={id:t.bodies.length,cells:[],velocity:0,delta:0};t.bodies.push(b);return b;};
    const block=(center,half,color,role,b=null)=>{
      const c=w._cell(center,cube(half),0,{color,immutable:color===6,track:'fixed',towerHalf:half.slice(),towerRole:role,towerBody:b?b.id:null});
      if(b)b.cells.push(c);return c.id;
    };
    block([0,-4.18,0],[2.5,.18,1.05],6,'ground');
    for(const x of [-1.75,1.75])block([x,-.1,0],[.12,3.9,.5],6,'fixed-frame');
    for(let level=0;level<5;level++){
      const height=-2.6+level*1.4,columns=[];
      for(const x of [-1.25,1.25]){
        const b=body(),ids=[];
        for(const z of [-.3,.3])ids.push(block([x,height-.8,z],[.14,.6,.3],(level+2)%6,'column',b));
        columns.push(ids);
      }
      t.floorSupports.push(columns);
      const b=body(),ids=[];
      for(const x of [-.75,.75])ids.push(block([x,height-.1,0],[.75,.1,.6],level%6,'floor',b));
      t.floors.push(ids);
    }
    // A separately supported overhead beam is a deliberate crushing hazard.
    for(const x of [-1.75,1.75]){
      const b=body(),ids=[];
      for(const z of [-.25,.25])ids.push(block([x,4.1,z],[.16,.3,.25],5,'roof-support',b));
      t.roofSupports.push(ids);
    }
    const roof=body();
    for(const x of [-.95,.95])block([x,4.55,0],[.95,.15,.6],4,'roof',roof);
    t.person={x:0,y:3,z:0,radius:.13,height:.96,velocity:0,fallStart:3,supportId:t.floors.at(-1)[0],alive:true};
    // Bright jacket, helmet, contrasting face and separate limbs stay legible.
    const part=(offset,half,rgb)=>{
      const before=w.decorations.length;w._box([offset[0],3+offset[1],offset[2]],half,rgb,1);
      const d=w.decorations[before];d.towerOffset=offset;t.personVisuals.push(d);
    };
    part([0,.49,0],[.17,.21,.12],[1,.7,.08]);
    part([0,.78,0],[.15,.13,.14],[1,.83,.65]);
    part([0,.91,0],[.18,.05,.17],[1,.93,.2]);
    for(const x of [-.1,.1])part([x,.14,0],[.065,.14,.095],[.18,.3,.45]);
    for(const x of [-.23,.23])part([x,.47,0],[.055,.19,.07],[1,.83,.65]);
    for(const x of [-.055,.055])part([x,.8,.145],[.018,.022,.012],[.08,.1,.15]);
    w._box([0,-4.39,0],[2.9,.03,1.35],[.16,.27,.32],1);
    w.status='从顶层逐层拆除楼板，让小人安全下楼；小心头顶横梁';
  }
  function finish(w,failure){
    const t=w.tower;if(w.result)return;
    t.failure=failure;t.person.alive=!failure;w.result=failure?'lose':'win';w.phase='finished';
    if(!failure)w.score+=500;
    w.status=failure==='crush'?'倒塌的构件砸中了小人，请重试':failure==='fall'?'落差太高，小人摔伤了，请逐层下楼':'小人安全抵达地面！';
  }
  function land(w){
    const p=w.tower.person;
    if(p.fallStart-p.y>w.tower.safeDrop+EPS)finish(w,'fall');
    p.velocity=0;p.fallStart=p.y;
  }
  function step(w){
    const t=w.tower,p=t.person,live=w.cells.filter(c=>c.color>=0&&c.towerHalf),oldY=p.y,oldHead=p.y+p.height;
    const oldBottom=new Map(live.map(c=>[c.id,bottom(c)]));
    let support=live.find(c=>c.id===p.supportId&&underPerson(c,p)&&Math.abs(top(c)-p.y)<1e-5);
    if(!support)support=live.find(c=>underPerson(c,p)&&Math.abs(top(c)-p.y)<1e-5);
    const ordered=t.bodies.filter(b=>b.cells.some(c=>c.color>=0)).sort((a,b)=>Math.min(...a.cells.filter(c=>c.color>=0).map(bottom))-Math.min(...b.cells.filter(c=>c.color>=0).map(bottom)));
    let moved=false;
    for(const b of ordered){
      const cells=b.cells.filter(c=>c.color>=0);b.velocity-=GRAVITY*STEP;
      const wanted=b.velocity*STEP;let delta=wanted;
      for(const c of cells)for(const other of live){
        if(other.towerBody===b.id||!overlap(c,other)||top(other)>bottom(c)+EPS)continue;
        delta=Math.max(delta,top(other)-bottom(c));
      }
      b.delta=delta;
      if(delta>wanted+EPS)b.velocity=0;
      if(Math.abs(delta)>EPS){for(const c of cells)c.center[1]+=delta;moved=true;}
    }
    if(support&&support.towerBody!==null){
      const b=t.bodies[support.towerBody];p.y=top(support);p.velocity=b.velocity;
      if(!b.velocity)land(w);
      p.supportId=support.id;
    }else if(support){p.supportId=support.id;land(w);}
    else{
      p.supportId=null;p.velocity-=GRAVITY*STEP;
      let next=p.y+p.velocity*STEP,landing=null;
      for(const c of live)if(underPerson(c,p)&&top(c)<=oldY+EPS&&top(c)>=next-EPS){
        if(!landing||top(c)>top(landing)){landing=c;next=top(c);}
      }
      p.y=next;
      if(landing){p.supportId=landing.id;land(w);}
    }
    // Relative swept vertical collision catches fast beams before they tunnel.
    for(const c of live){
      if(c.towerBody===null||!underPerson(c,p))continue;
      if(oldBottom.get(c.id)>=oldHead-EPS&&bottom(c)<p.y+p.height-EPS&&bottom(c)<oldBottom.get(c.id)-EPS){finish(w,'crush');break;}
    }
    if(p.y<t.groundY-EPS)finish(w,'fall');
    if(!w.result&&Math.abs(p.y-t.groundY)<EPS&&ordered.every(b=>Math.abs(b.velocity)<EPS)){
      t.settled+=STEP;if(t.settled>=.2)finish(w,null);
    }else t.settled=0;
    if(moved){w.revision++;w._contactCache=null;}
    for(const d of t.personVisuals)d.center=[p.x+d.towerOffset[0],p.y+d.towerOffset[1],p.z+d.towerOffset[2]];
    if(!w.result)w.status='距地面 '+Math.max(0,p.y-t.groundY).toFixed(1)+' 米 · 单次安全落差 ≤ '+t.safeDrop+' 米';
  }
  function update(w,dt){
    if(!w.tower||w.result||!(dt>0))return;
    w.tower.accumulator+=dt;
    while(w.tower.accumulator>=STEP-1e-10&&!w.result){w.tower.accumulator-=STEP;step(w);}
  }
  function afterRemove(w,ids){
    if(!ids.length||!w.tower||w.result)return;
    w.tower.settled=0;w.status='支撑已改变，注意小人的落点和头顶构件';
  }
  function info(){return '让小人安全抵达地面。相邻同色楼板或楼柱可以配对消除，灰色框架不可拆。逐层下落最安全；连续拆空多层会摔伤，头顶构件掉落会砸伤。';}
  root.ChallengeTower={build,update,afterRemove,info};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.ChallengeTower;
})(typeof globalThis!=='undefined'?globalThis:this);
