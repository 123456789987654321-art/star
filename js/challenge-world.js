/* Independent untimed challenge rules. Cell centers are world-space; vertices are local. */
(function(root){
  'use strict';
  const PALETTE=[[.97,.24,.32],[.64,.34,.99],[.20,.85,.50],[.22,.58,1],[1,.80,.22],[1,.44,.79]];
  const I=[1,0,0,0,1,0,0,0,1], shapes=['tetrahedron','cylinder','sphere','prism','frustum','torus'];
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const mul=(m,p)=>[m[0]*p[0]+m[3]*p[1]+m[6]*p[2],m[1]*p[0]+m[4]*p[1]+m[7]*p[2],m[2]*p[0]+m[5]*p[1]+m[8]*p[2]];
  function rotation(axis,a){
    const c=Math.cos(a),s=Math.sin(a);
    return axis==='x'?[1,0,0,0,c,s,0,-s,c]:axis==='y'?[c,0,-s,0,1,0,s,0,c]:[c,s,0,-s,c,0,0,0,1];
  }
  function cube(x,y,z){
    return {
      vertices:[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]],faces:[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]
    };
  }
  class ChallengeWorld{
    constructor(level,rng=Math.random){
      this.level=Math.max(1,Math.min(12,level));
      this.rng=rng;
      this.cells=[];
      this.decorations=[];
      this.components=[];
      this.moves=[];
      this.phase='play';
      this.score=0;
      this.result=null;
      this.status='';
      this.bounds=3;
      this.time=0;
      this.nextId=0;
      this.revision=0;
      this.aimPlaneZ=.1;
      this.aim={
        x:-1.4,y:0
      };
      this.trajectory=[];
      this.history=[];
      this._build();
      this.target=(level===4||level===12)?500:Math.max(100,Math.round(this.cells.length*3/50)*50);
    }
    _cell(center,poly,component,extra={
    }){
      const c={
        id:this.nextId++,center:center.slice(),poly,basis:I.slice(),color:this.phase==='assemble'?6:Math.floor(this.rng()*6),component,track:'fixed',order:0,...extra
      };
      c.volume=Math.abs(poly.faces.reduce((sum,f)=>{
        const a=poly.vertices[f[0]];
        for(let i=1; i<f.length-1; i++){
          const b=poly.vertices[f[i]],d=poly.vertices[f[i+1]];
          sum+=(a[0]*(b[1]*d[2]-b[2]*d[1])+a[1]*(b[2]*d[0]-b[0]*d[2])+a[2]*(b[0]*d[1]-b[1]*d[0]))/6;
        }
        return sum;
      },0));
      this.cells.push(c);
      return c;
    }
    _shape(name,size=2,position=[0,0,0],basis=I,extra={
    }){
      const id=this.components.length?Math.max(...this.components.map(c=>c.id))+1:0;
      const component={
        id,name,position:position.slice(),basis:basis.slice()
      };
      this.components.push(component);
      const G=root.ChallengeGeometry;
      for(const slot of G.make(name,{
        size,resolution:[8,9,11].includes(this.level)?4:7
      })){
        const c=this._cell(add(position,mul(basis,slot.center)),slot.poly,id,{
          ...slot,...extra
        });
        c.center=add(position,mul(basis,slot.center));
        c.local=slot.center.slice();
        c.basis=basis.slice();
        c.track=id+':'+slot.track;
      }
      return id;
    }
    _box(center,half,rgb,alpha=1){
      const d={
        center:center.slice(),poly:cube(...half),basis:I.slice(),rgb,alpha
      };
      this.decorations.push(d);
      return d;
    }
    _decoShape(name,size,position,rgb,alpha=1){
      const out=[];
      for(const c of root.ChallengeGeometry.make(name,{
        size,resolution:2
      })){
        const d={
          center:add(position,c.center),local:c.center.slice(),poly:c.poly,basis:I.slice(),rgb,alpha
        };
        this.decorations.push(d);
        out.push(d);
      }
      return out;
    }
    _build(){
      const n=this.level;
      if([1,2,3,5,6].includes(n)){
        this._shape(({
          1:'tetrahedron',2:'cylinder',3:'sphere',5:'prism',6:'frustum'
        })[n]);
      }
      if(n===7){
        this._shape('torus',2.4);
        this._shape('torus',2.4*.38/.98,[0,0,0],rotation('x',Math.PI/2));
        for(const c of this.cells){
          c.poly={
            faces:c.poly.faces,vertices:c.poly.vertices.map((v,i)=>{
              if(i>=3)return v;
              const w=add(c.center,mul(c.basis,v));
              if(Math.abs(w[0])<.7||Math.abs(w[0])>1.12||Math.abs(w[1])>.38||Math.abs(w[2])>.38)return v;
              w[0]=Math.sign(w[0])*.912;
              const p=w.map((x,k)=>x-c.center[k]);
              return [c.basis[0]*p[0]+c.basis[1]*p[1]+c.basis[2]*p[2],c.basis[3]*p[0]+c.basis[4]*p[1]+c.basis[5]*p[2],c.basis[6]*p[0]+c.basis[7]*p[1]+c.basis[8]*p[2]];
            })
          };
          c.poly.faces=root.ChallengeGeometry.hull(c.poly.vertices);
        }
        this.bounds=3.1;
      }
      if(n===8){
        this.phase='assemble';
        this.selected=null;
        this.bounds=4;
      }
      if(n===4)this._waterBuild();
      if(n===9){
        this._shape('gear',1.65,[-1.520379194001562,0,0],rotation('y',.6391638727765171));
        this._shape('gear',1.65,[1.520379194001562,0,0],rotation('y',-.442814331927155));
        this.gears={
          moving:false,angle:0
        };
        this.bounds=3.5;
      }
      if(n===10)this._targetBuild();
      if(n===11){
        this.seesaw={
          angle:0,left:2.05,right:2.05
        };
        for(const side of ['left','right'])for(let j=0; j<3; j++)this._shape(['box','cylinder','prism'][j],.55,[(side==='left'?-1:1)*2.05,j*1.1+.55,0],I,{
          side
        });
        this.beam=this._box([0,-.15,0],[3.8,.12,.8],[.38,.48,.58]);
        this._box([0,-.65,0],[.25,.4,.5],[.38,.48,.58]);
        this.barriers=[this._box([-3.8,.5,0],[.07,.7,.8],[.6,.8,1],.22),this._box([3.8,.5,0],[.07,.7,.8],[.6,.8,1],.22)];
        this.bounds=4.6;
      }
      if(n===12)this._marbleBuild();
    }
    remaining(){
      return this.cells.reduce((n,c)=>n+(c.color>=0&&c.color<6),0);
    }
    canRemove(){
      return this.phase==='play'&&!this.result&&!(this.gears&&this.gears.moving)&&!(this.seesaw&&this.seesaw.moving);
    }
    canRemoveCell(id){
      const c=this.cells.find(c=>c.id===id);
      return !!c&&this.canRemove()&&!(this.level===4&&c.component===1&&this.water.gateMoving);
    }
    remove(ids){
      this.moves=[];
      if(!this.canRemove())return [];
      const removed=[];
      for(const id of new Set(ids)){
        const c=this.cells.find(c=>c.id===id);
        if(c&&c.color>=0&&c.color<6&&this.canRemoveCell(id)){
          c.color=-1;
          removed.push(id);
        }
      }
      if(!removed.length)return removed;
      this.score+=5*removed.length*removed.length;
      if(this.level!==12){
        const tracks=new Map();
        for(const c of this.cells){
          if(c.track==='fixed')continue;
          if(!tracks.has(c.track))tracks.set(c.track,[]);
          tracks.get(c.track).push(c);
        }
        for(const track of tracks.values()){
          track.sort((a,b)=>a.order-b.order);
          const live=track.filter(c=>c.color>=0).map(c=>({
            color:c.color,center:c.center.slice(),id:c.id
          }));
          track.forEach(c=>c.color=-1);
          live.forEach((v,i)=>{
            track[i].color=v.color;
            if(v.id!==track[i].id)this.moves.push({
              id:track[i].id,from:v.center,to:track[i].center.slice()
            });
          });
        }
      }
      this.revision++;
      this._contactCache=null;
      if(this.seesaw)this.seesaw.moving=true;
      return removed;
    }
    _vertices(c){
      return c.poly.vertices.map(v=>add(c.center,mul(c.basis||I,v)));
    }
    contacts(){
      if(this._contactCache&&this._contactRevision===this.revision)return this._contactCache;
      const vertices=new Map(),pairs=new Map();
      for(const c of this.cells){
        if(c.color<0)continue;
        for(const v of this._vertices(c)){
          const key=v.map(x=>Math.round(x*10000)).join(',');
          const entries=vertices.get(key)||[];
          for(const id of entries){
            if(id===c.id)continue;
            const k=id<c.id?id+':'+c.id:c.id+':'+id;
            pairs.set(k,(pairs.get(k)||0)+1);
          }
          entries.push(c.id);
          vertices.set(key,entries);
        }
      }
      this._contactCache=[...pairs].filter(p=>p[1]>=2).map(p=>p[0].split(':').map(Number));
      const keys=new Set(this._contactCache.map(p=>p.join(':')));
      for(const pair of this._faceContacts()){
        const key=pair.join(':');
        if(!keys.has(key)){
          this._contactCache.push(pair);
          keys.add(key);
        }
      }
      this._contactRevision=this.revision;
      return this._contactCache;
    }
    _faceContacts(){
      const bucket=new Map(),data=new Map(),candidates=new Set(),result=[];
      for(const c of this.cells){
        if(c.color<0)continue;
        const v=this._vertices(c),lo=[0,1,2].map(i=>Math.min(...v.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...v.map(p=>p[i])));
        data.set(c.id,{
          c,v,lo,hi
        });
        for(let x=Math.floor((lo[0]-.001)/.5); x<=Math.floor((hi[0]+.001)/.5); x++)for(let y=Math.floor((lo[1]-.001)/.5); y<=Math.floor((hi[1]+.001)/.5); y++)for(let z=Math.floor((lo[2]-.001)/.5); z<=Math.floor((hi[2]+.001)/.5); z++){
          const key=[x,y,z].join(','),list=bucket.get(key)||[];
          for(const id of list)if(data.get(id).c.component!==c.component||this.level===12||c.attached||data.get(id).c.attached)candidates.add(id+':'+c.id);
          list.push(c.id);
          bucket.set(key,list);
        }
      }
      const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
      const faceData=d=>d.faces||(d.faces=d.c.poly.faces.map(f=>{
        const p=f.map(i=>d.v[i]);
        let n=cross(sub(p[1],p[0]),sub(p[2],p[0])),len=Math.hypot(...n);
        if(len<1e-10)return null;
        n=n.map(v=>v/len);
        return {
          p,n
        };
      }).filter(Boolean));
      const overlap=(a,b,n)=>{
        const drop=n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs))),axes=[0,1,2].filter(i=>i!==drop),A=a.map(p=>axes.map(i=>p[i])),B=b.map(p=>axes.map(i=>p[i]));
        for(const poly of [A,B])for(let i=0; i<poly.length; i++){
          const p=poly[i],q=poly[(i+1)%poly.length],axis=[p[1]-q[1],q[0]-p[0]],len=Math.hypot(...axis);
          if(len<1e-9)continue;
          const pa=A.map(p=>dot(p,axis)),pb=B.map(p=>dot(p,axis));
          if(Math.min(Math.max(...pa),Math.max(...pb))-Math.max(Math.min(...pa),Math.min(...pb))<1e-7*len)return false;
        }
        return true;
      };
      for(const key of candidates){
        const [i,j]=key.split(':').map(Number),a=data.get(i),b=data.get(j);
        if([0,1,2].some(k=>a.hi[k]<b.lo[k]-1e-6||b.hi[k]<a.lo[k]-1e-6))continue;
        let touching=false;
        for(const f of faceData(a)){
          for(const g of faceData(b)){
            if(dot(f.n,g.n)>-.99999||Math.abs(dot(f.n,sub(g.p[0],f.p[0])))>1e-5)continue;
            if(overlap(f.p,g.p,f.n)){
              touching=true;
              break;
            }
          }
          if(touching)break;
        }
        if(!touching){
          for(const [source,dest] of [[a,b],[b,a]]){
            for(const f of faceData(source)){
              for(let k=0; k<f.p.length; k++){
                const p=f.p[k],q=f.p[(k+1)%f.p.length];
                if(Math.hypot(...sub(p,q))<1e-5)continue;
                for(const g of faceData(dest)){
                  if(Math.abs(dot(g.n,sub(p,g.p[0])))>1e-6||Math.abs(dot(g.n,sub(q,g.p[0])))>1e-6)continue;
                  const midpoint=p.map((v,k)=>(v+q[k])/2);
                  const inside=point=>g.p.every((v,k)=>dot(cross(sub(g.p[(k+1)%g.p.length],v),sub(point,v)),g.n)>=-1e-7);
                  if(inside(midpoint)&& (inside(p)||inside(q))){
                    touching=true;
                    break;
                  }
                }
                if(touching)break;
              }
              if(touching)break;
            }
            if(touching)break;
          }
        }
        if(touching)result.push([i,j]);
      }
      return result;
    }
    _transform(comp,position,basis){
      if(comp.position&&comp.basis&&position.every((v,i)=>Math.abs(v-comp.position[i])<1e-8)&&basis.every((v,i)=>Math.abs(v-comp.basis[i])<1e-8))return;
      comp.position=position.slice();
      comp.basis=basis.slice();
      for(const c of this.cells.filter(c=>c.component===comp.id)){
        c.center=add(position,mul(basis,c.local));
        c.basis=basis.slice();
      }
      this.revision++;
    }
    _snapshot(){
      this.history.push({
        components:this.components.map(c=>({
          ...c,position:c.position.slice(),basis:c.basis.slice()
        })),cells:this.cells.map(c=>({
          ...c,center:c.center.slice(),basis:c.basis.slice()
        }))
      });
    }
    action(name,value){
      if(this.result)return '本关已结束';
      if(this.level===8&&this.phase==='assemble')return this._assembly(name,value);
      if(name==='aim'&&this.level===10&&this.phase==='aim'){
        this.aim={
          x:Number(value.x)||0,y:Number(value.y)||0
        };
        this._preview();
        return '已更新落点';
      }
      if(name==='shoot'&&this.phase==='aim'&&!this.projectile&&this.ammo.length){
        const color=this.ammo.shift();
        this.projectile={
          time:0,color,path:this.trajectory.map(p=>p.slice()),hit:{
            ...this.previewHit
          }
        };
        return '投射中';
      }
      if(name==='shift'&&this.level===11){
        const side=value.side==='right'?'right':'left';
        this.seesaw[side]=Math.max(.55,Math.min(2.65,this.seesaw[side]+Number(value.delta)));
        this._seesawUpdate(.1);
        return '已移动集合体';
      }
      if(name==='release'&&this.level===12&&!this.marble.released){
        this.marble.released=true;
        return '弹珠已释放';
      }
      return '当前阶段无法执行';
    }
    _assembly(name,value){
      if(name==='add'){
        const shape=typeof value==='string'?value:value.shape;
        if(!shapes.includes(shape)&&shape!=='box')return '未知零件';
        if(this.components.some(c=>c.name===shape)&&shape!=='box')return '每种零件限用一个';
        this._snapshot();
        let x=0;
        if(this.components.length){
          const vs=this.cells.flatMap(c=>this._vertices(c));
          x=Math.max(...vs.map(v=>v[0]))+1;
        }
        this.selected=this._shape(shape,1,[x,0,0]);
        if(this.components.length>1){
          const comp=this.components.find(c=>c.id===this.selected),own=this.cells.filter(c=>c.component===comp.id).flatMap(c=>this._vertices(c)),previous=this.cells.filter(c=>c.component!==comp.id).flatMap(c=>this._vertices(c));
          const shift=Math.max(...previous.map(v=>v[0]))-Math.min(...own.map(v=>v[0]));
          this._transform(comp,[comp.position[0]+shift,0,0],comp.basis);
          this._snap(comp,this.components[this.components.length-2]);
        }
        this.bounds=Math.max(4,x+2);
        return '已添加零件，可移动旋转';
      }
      if(name==='select'){
        this.selected=Number(value);
        return '已选择零件';
      }
      if(name==='reset'){
        this._snapshot();
        this.cells=[];
        this.components=[];
        return '已重置';
      }
      if(name==='undo'){
        const old=this.history.pop();
        if(!old)return '没有可撤销操作';
        this.cells=old.cells;
        this.components=old.components;
        for(const c of this.components)this._transform(c,c.position,c.basis);
        return '已撤销';
      }
      const comp=this.components.find(c=>c.id===this.selected);
      if(name==='snap'&&comp){
        const target=this.components.find(c=>c.id!==comp.id&&(value===undefined||c.id===Number(value)))||this.components.find(c=>c.id!==comp.id);
        if(!target)return '请先添加另一个零件';
        this._snapshot();
        this._snap(comp,target);
        return '已吸附至相邻零件';
      }
      if(name==='remove-component'&&comp){
        this._snapshot();
        this.cells=this.cells.filter(c=>c.component!==comp.id);
        this.components=this.components.filter(c=>c!==comp);
        return '已移除零件';
      }
      if((name==='translate'||name==='rotate')&&comp){
        this._snapshot();
        const axis=value.axis||'x';
        if(name==='translate'){
          const pos=comp.position.slice();
          pos['xyz'.indexOf(axis)]+=Number(value.delta)||0;
          this._transform(comp,pos,comp.basis);
        }
        else{
          const r=rotation(axis,Number(value.angle)||0),b=[];
          for(let i=0; i<3; i++)b.push(...mul(r,comp.basis.slice(i*3,i*3+3)));
          this._transform(comp,comp.position,b);
        }
        return '已调整零件';
      }
      if(name==='complete'){
        if(this.components.length<2)return '至少添加两个零件';
        const validity=this._assemblyValid();
        if(validity)return validity;
        for(const c of this.cells)c.color=Math.floor(this.rng()*6);
        this.phase='play';
        this.target=Math.max(100,Math.round(this.cells.length*3/50)*50);
        this.revision++;
        return '拼接完成，开始消除';
      }
      return '选择零件后操作';
    }
    _snap(comp,target){
      const all=this.components;
      const own=this.cells.filter(c=>c.component===comp.id).flatMap(c=>this._vertices(c)),other=this.cells.filter(c=>c.component===target.id).flatMap(c=>this._vertices(c));
      let low=target.position[0],high=Math.max(...other.map(v=>v[0]))+Math.max(...own.map(v=>Math.abs(v[0]-comp.position[0])))+1;
      this.components=[target,comp];
      try{
        for(let i=0; i<28; i++){
          const mid=(low+high)/2;
          this._transform(comp,[mid,target.position[1],target.position[2]],comp.basis);
          if(this._assemblyValid().includes('穿透'))low=mid;
          else high=mid;
        }
        this._transform(comp,[high,target.position[1],target.position[2]],comp.basis);
      }
      finally{
        this.components=all;
      }
    }
    _assemblyValid(){
      const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
      const models=this.components.map(comp=>{
        const cells=this.cells.filter(c=>c.component===comp.id),verts=[],axes=new Map(),edges=new Map();
        const save=(map,v)=>{
          const len=Math.hypot(...v);
          if(len<1e-8)return;
          v=v.map(n=>n/len);
          if(v.find(n=>Math.abs(n)>1e-6)<0)v=v.map(n=>-n);
          map.set(v.map(n=>n.toFixed(5)).join(','),v);
        };
        for(const c of cells){
          const v=this._vertices(c).slice(0,3);
          verts.push(...v);
          save(axes,cross(sub(v[1],v[0]),sub(v[2],v[0])));
          for(let k=0; k<3; k++)save(edges,sub(v[(k+1)%3],v[k]));
        }
        return {
          comp,verts,axes:[...axes.values()],edges:[...edges.values()]
        };
      });
      const linked=new Map(models.map(m=>[m.comp.id,[]]));
      for(let i=0; i<models.length; i++)for(let j=i+1; j<models.length; j++){
        const a=models[i],b=models[j],axes=a.axes.concat(b.axes);
        if(a.edges.length*b.edges.length<1000)for(const e of a.edges)for(const f of b.edges){
          let n=cross(e,f),len=Math.hypot(...n);
          if(len>1e-8)axes.push(n.map(v=>v/len));
        }
        let penetration=Infinity;
        for(const axis of axes){
          const A=a.verts.map(v=>dot(v,axis)),B=b.verts.map(v=>dot(v,axis)),overlap=Math.min(Math.max(...A),Math.max(...B))-Math.max(Math.min(...A),Math.min(...B));
          penetration=Math.min(penetration,overlap);
          if(penetration<-.0001)break;
        }
        if(penetration>.0001)return '零件相互穿透，请移开后拼接';
        if(penetration>=-.0001){
          linked.get(a.comp.id).push(b.comp.id);
          linked.get(b.comp.id).push(a.comp.id);
        }
      }
      const seen=new Set(),queue=[models[0].comp.id];
      for(let i=0; i<queue.length; i++){
        const id=queue[i];
        if(seen.has(id))continue;
        seen.add(id);
        queue.push(...linked.get(id).filter(n=>!seen.has(n)));
      }
      return seen.size===models.length?'':'零件尚未连接，请使用吸附';
    }
    _waterBuild(){
      this.water={
        progress:0,leaking:false,flowing:false,gateMoving:false
      };
      this.bounds=7;
      const step=.36;
      for(let component=0; component<3; component++){
        this.components.push({
          id:component,name:['堵塞体','移动闸板','穿壁密封体'][component]
        });
        for(let x=0; x<(component===1?2:7); x++)for(let y=0; y<7; y++)for(let z=0; z<7; z++){
          const seal=component===2&&(y===0||y===6||z===0||z===6);
          const c=this._cell([(component-1)*3+(x-(component===1?.5:3))*step,(y-3)*step,(z-3)*step],cube(step/2,step/2,step/2),component,{
            seal,grid:[component*10+x+(component===1?3:1),y,z],track:seal?'fixed':'water:'+component+':'+x+':'+z,order:y
          });
          c.local=c.center.slice();
          if(seal)c.color=5;
        }
      }
      this._box([0,-1.32,0],[5.7,.06,1.32],[.55,.83,1],.28);
      this._box([0,1.32,0],[5.7,.06,1.32],[.55,.83,1],.23);
      this._box([0,0,-1.32],[5.7,1.32,.06],[.55,.83,1],.12);
      this._box([0,0,1.32],[5.7,1.32,.06],[.55,.83,1],.18);
      this._box([-5.7,2,0],[.8,1.1,1.1],[.3,.7,1],.4);
      // Bright structural edges keep the transparent plumbing legible on dark backgrounds.
      const frameColor=[.18,.82,1];
      for(const y of [-1.32,1.32])for(const z of [-1.32,1.32]){
        this._box([0,y,z],[5.7,.025,.025],frameColor,.85);
      }
      for(const x of [-5.7,-4.5,1.7,4.7,5.7]){
        for(const y of [-1.32,1.32])this._box([x,y,0],[.025,.025,1.32],frameColor,.8);
        for(const z of [-1.32,1.32])this._box([x,0,z],[.025,1.32,.025],frameColor,.8);
      }
      for(const y of [.9,3.1])for(const z of [-1.1,1.1]){
        this._box([-5.7,y,z],[.8,.03,.03],frameColor,.9);
      }
      for(const x of [-6.5,-4.9])for(const z of [-1.1,1.1]){
        this._box([x,2,z],[.03,1.1,.03],frameColor,.9);
      }
      for(const x of [-6.5,-4.9])for(const y of [.9,3.1]){
        this._box([x,y,0],[.03,.03,1.1],frameColor,.9);
      }
      this._box([-5.7,1.72,0],[.72,.74,1.02],[.06,.55,.95],.55);
      this._box([-5.7,2.47,0],[.73,.025,1.03],[.25,.87,1],.72);
      this.waterLabels=[
        {text:'水箱',center:[-5.7,3.65,0]},
        {text:'移动闸板',center:[0,3.2,0]},
        {text:'密封边框',center:[3,2.2,0]},
        {text:'出水口',center:[5.65,1.8,0]}
      ];
      this.waterVisual=this._box([-5.3,0,0],[.2,.3,.3],[.1,.65,1],.65);
      this.flames=[];
      for(let i=0; i<5; i++)this.flames.push(...this._decoShape('tetrahedron',.45+(i%2)*.2,[5.55+(i%3-1)*.25,-.65,(Math.floor(i/3)-.5)*.35],i%2?[1,.7,.06]:[1,.28,.025]));
      for(let i=0; i<3; i++){
        const log=this._box([5.6,-1.3,(i-1)*.27],[.7,.12,.13],[.35,.16,.06]);
        log.basis=rotation('y',(i-1)*.4);
      }
      this._box([-5.7,.6,0],[.25,.7,.25],[.5,.8,1],.2);
      this.leakStream=[];
      for(let i=0; i<9; i++)this.leakStream.push(this._box([3,-1.2-i*.15,0],[.09,.12,.09],[.12,.76,1],0));
      this.stream=[];
      for(let i=0; i<7; i++)this.stream.push(this._box([5+i*.1,-.15-i*i*.02,0],[.1,.075,.12],[.1,.7,1],0));
    }
    _waterUpdate(dt){
      const t=this.time%4;
      this.water.gateMoving=t>2.4;
      const offset=t<=2.4?0:Math.sin((t-2.4)/1.6*Math.PI)*1.5;
      for(const c of this.cells)if(c.component===1&&Math.abs(c.center[1]-c.local[1]-offset)>1e-8){
        c.center[1]=c.local[1]+offset;
        this.revision++;
      }
      const occupied=new Set();
      for(const c of this.cells)if(c.color>=0){
        const g=c.grid.slice();
        if(c.component===1)g[1]+=Math.round(offset/.36);
        if(g[1]>=0&&g[1]<7)occupied.add(g.join(','));
      }
      const queue=[],seen=new Set();
      for(let y=1; y<6; y++)for(let z=1; z<6; z++){
        queue.push([0,y,z]);
        seen.add([0,y,z].join(','));
      }
      let outlet=false,leak=false;
      for(let i=0; i<queue.length; i++){
        const [x,y,z]=queue[i];
        if(x===29)outlet=true;
        if(x>=21&&x<=27&&(y===0||y===6||z===0||z===6))leak=true;
        for(const d of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
          const a=[x+d[0],y+d[1],z+d[2]],k=a.join(',');
          if(a[0]<0||a[0]>29||a[1]<0||a[1]>6||a[2]<0||a[2]>6||seen.has(k)||occupied.has(k))continue;
          seen.add(k);
          queue.push(a);
        }
      }
      this.water.leaking=leak;
      const failedSeal=leak?this.cells.find(c=>c.seal&&c.color<0&&seen.has(c.grid.join(','))):null;
      this.water.leakPosition=failedSeal?failedSeal.center.slice():null;
      for(let i=0; i<this.leakStream.length; i++){
        const d=this.leakStream[i];
        d.alpha=failedSeal?.85:0;
        if(failedSeal){
          const p=failedSeal.center;
          const outward=[0,Math.sign(p[1]),Math.sign(p[2])],t=i*.13;
          d.center=[p[0]+.05*Math.sin(this.time*7+i),p[1]+outward[1]*t-.6*t*t,p[2]+outward[2]*t];
        }
      }
      this.water.flowing=outlet&&!leak;
      if(this.water.flowing)this.water.progress=Math.min(1,this.water.progress+dt/3);
      this.waterVisual.center=[this.water.flowing?4.8:-5.3,-.2,0];
      for(let i=0; i<this.flames.length; i++)this.flames[i].alpha=(1-this.water.progress)*(.75+.2*Math.sin(this.time*8+i));
      for(const d of this.stream)d.alpha=this.water.flowing?.75:0;
      this.status=leak?'密封破损漏水，请重试':this.water.flowing?'出水灭火 '+Math.round(this.water.progress*100)+'%':'消除内部堵塞，保留粉色密封边框';
      if(this.water.progress>=1){
        this.score+=500;
        this.result='win';
        this.phase='finished';
      }
    }
    _targetBuild(){
      this.phase='aim';
      this.bounds=4;
      this.ammo=[];
      this.targetCenters=[[-1.6,0,0],[1.6,0,0]];
      this.targetLabels=this.targetCenters.flatMap((c,target)=>Array.from({
        length:5
      },(_,i)=>({
        target,ring:5-i,score:(5-i)*10,center:[c[0],(i+.5)*.25,.12]
      })));
      for(let target=0; target<2; target++)for(let ring=0; ring<5; ring++){
        const segments=20;
        for(let s=0; s<segments; s++){
          const r0=ring*.25,r1=(ring+1)*.25,a=s*Math.PI*2/segments,b=(s+1)*Math.PI*2/segments;
          const points=[[r0*Math.cos(a),r0*Math.sin(a)],[r1*Math.cos(a),r1*Math.sin(a)],[r1*Math.cos(b),r1*Math.sin(b)],[r0*Math.cos(b),r0*Math.sin(b)]];
          const center=[this.targetCenters[target][0]+points.reduce((n,p)=>n+p[0],0)/4,points.reduce((n,p)=>n+p[1],0)/4,0];
          const vertices=[];
          for(const z of [-.09,.09])for(const p of points)vertices.push([p[0]+this.targetCenters[target][0]-center[0],p[1]-center[1],z]);
          const c=this._cell(center,{
            vertices,faces:[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]
          },target,{
            targetIndex:target,ring:5-ring,segment:s,track:'target:'+target+':'+Math.round(center[0]*4),order:center[1]
          });
          if((s+ring*3+target)%17===0){
            c.color=-1;
            c.hole=true;
            this.ammo.push(Math.floor(this.rng()*6));
          }
        }
      }
      this._preview();
    }
    _preview(){
      const start=[0,-1.7,4],end=[this.aim.x,this.aim.y,.09];
      this.aimPlaneZ=.09;
      const point=t=>[start[0]+(end[0]-start[0])*t,start[1]+(end[1]-start[1])*t+3*t*(1-t),start[2]+(end[2]-start[2])*t];
      let hit=null,stop=1;
      for(const c of this.cells){
        if(c.color<0&&!c.hole)continue;
        const verts=this._vertices(c),front=Math.max(...verts.map(v=>v[2])),t=(start[2]-front)/(start[2]-end[2]);
        if(t<0||t>stop+1e-8)continue;
        const p=point(t),face=verts.filter(v=>Math.abs(v[2]-front)<1e-6);
        let sign=0,inside=true;
        for(let i=0; i<face.length; i++){
          const a=face[i],b=face[(i+1)%face.length],cross=(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
          if(Math.abs(cross)<1e-8)continue;
          if(sign&&Math.sign(cross)!==sign){
            inside=false;
            break;
          }
          sign=Math.sign(cross);
        }
        if(inside&&face.length>=3){
          hit=c;
          stop=t;
        }
      }
      this.trajectory=[];
      for(let i=0; i<=60; i++)this.trajectory.push(point(stop*i/60));
      this.previewHit={
        id:hit?hit.id:null,ring:hit?hit.ring||0:0,duration:1.2*stop
      };
    }
    _shotUpdate(dt){
      const p=this.projectile;
      if(!p)return;
      p.time+=dt;
      const i=Math.min(60,Math.floor(p.time/p.hit.duration*60));
      if(!this.shotVisual)this.shotVisual=this._box(p.path[i],[.1,.1,.1],PALETTE[p.color]);
      this.shotVisual.center=p.path[i].slice();
      if(p.time>=p.hit.duration){
        this.lastImpact=p.path[60].slice();
        const c=this.cells.find(c=>c.id===p.hit.id);
        if(c){
          if(c.color<0){
            c.color=p.color;
            c.hole=false;
          }
          else{
            this.score+=p.hit.ring*10;
            this._cell([this.lastImpact[0],this.lastImpact[1],this.lastImpact[2]+.1],cube(.1,.1,.1),c.component,{
              color:p.color,ring:c.ring,targetIndex:c.targetIndex,attached:true
            });
          }
        }
        this.decorations=this.decorations.filter(d=>d!==this.shotVisual);
        this.shotVisual=null;
        this.projectile=null;
        this.revision++;
        this._preview();
        if(!this.ammo.length)this.phase='play';
      }
    }
    _seesawUpdate(dt){
      let left=0,right=0;
      for(const c of this.cells)if(c.color>=0){
        const mass=c.volume;
        if(c.side==='left')left+=mass;
        else right+=mass;
      }
      const torque=left*this.seesaw.left-right*this.seesaw.right;
      const target=Math.max(-.4,Math.min(.4,torque/(left+right+.001)));
      this.seesaw.angle+=(target-this.seesaw.angle)*Math.min(1,dt*6);
      this.seesaw.moving=Math.abs(target-this.seesaw.angle)>.0001;
      if(!this.seesaw.moving)this.seesaw.angle=target;
      const basis=rotation('z',this.seesaw.angle);
      for(const comp of this.components){
        const side=this.cells.find(c=>c.component===comp.id).side;
        const pos=[(side==='left'?-1:1)*this.seesaw[side],comp.position[1],0];
        const baseY=(comp.id%3)*1.1+.55;
        this._transform(comp,mul(basis,[pos[0],baseY,0]),basis);
      }
      this.beam.basis=basis;
      for(let i=0; i<2; i++){
        this.barriers[i].center=mul(basis,[i?3.8:-3.8,.5,0]);
        this.barriers[i].basis=basis;
      }
    }
    _marbleBuild(){
      this.bounds=4.6;
      for(let y=0; y<9; y++)for(let x=0; x<11; x++){
        const px=(x-5)*.49+(y%2?.16:0);
        this._cell([px,2-y*.5,0],cube(.245,.25,.18),0,{
          grid:[x,y]
        });
      }
      this.marble={
        position:[0,3.3,0],velocity:[0,0,0],released:false,bin:null
      };
      this.ballVisual=this._decoShape('sphere',.13,this.marble.position,[1,.95,.8]);
      this._box([-3.1,0,0],[.08,3.5,.3],[.5,.7,.8],.3);
      this._box([3.1,0,0],[.08,3.5,.3],[.5,.7,.8],.3);
      this.bins=[100,300,500,300,100];
      this.binPositions=this.bins.map((score,i)=>({
        score,center:[(i-2)*1.2,-3.65,0]
      }));
      for(let i=0; i<5; i++){
        this._box([(i-2)*1.2,-3.5,0],[.57,.1,.3],i===2?[.2,.9,.5]:[.4,.55,.7]);
        this._box([(i-2)*1.2-.6,-3.2,0],[.035,.3,.3],[.6,.8,1],.5);
      }
    }
    _marbleUpdate(dt){
      const m=this.marble;
      if(!m.released||m.bin!==null)return;
      const steps=Math.max(1,Math.ceil(dt/.008));
      for(let s=0; s<steps; s++){
        const h=dt/steps;
        m.velocity[1]-=7*h;
        m.position[0]+=m.velocity[0]*h;
        m.position[1]+=m.velocity[1]*h;
        for(const c of this.cells){
          if(c.color<0)continue;
          const dx=m.position[0]-c.center[0],dy=m.position[1]-c.center[1];
          const nearest=[Math.max(-.245,Math.min(.245,dx)),Math.max(-.25,Math.min(.25,dy))];
          let nx=dx-nearest[0],ny=dy-nearest[1],dist=Math.hypot(nx,ny);
          if(dist>=.13)continue;
          if(dist<1e-8){
            nx=0;
            ny=1;
            dist=1;
          }
          else{
            nx/=dist;
            ny/=dist;
          }
          const overlap=.13-(dist===1?0:dist);
          m.position[0]+=nx*overlap;
          m.position[1]+=ny*overlap;
          const dot=m.velocity[0]*nx+m.velocity[1]*ny;
          if(dot<0){
            m.velocity[0]-=1.45*dot*nx;
            m.velocity[1]-=1.45*dot*ny;
          }
          if(Math.abs(m.velocity[0])<.02)m.velocity[0]=(c.id%2?1:-1)*.08;
        }
        if(Math.abs(m.position[0])>2.95){
          m.position[0]=Math.sign(m.position[0])*2.95;
          m.velocity[0]*=-.7;
        }
        if(m.position[1]<-3.25){
          m.bin=Math.max(0,Math.min(4,Math.floor((m.position[0]+3)/1.2)));
          this.score+=this.bins[m.bin];
          this.result=m.bin===2?'win':'lose';
          this.phase='finished';
          break;
        }
      }
      for(const d of this.ballVisual)d.center=add(m.position,d.local);
    }
    update(dt){
      if(this.result||!(dt>0))return;
      dt=Math.min(dt,5);
      this.time+=dt;
      if(this.level===4)this._waterUpdate(dt);
      if(this.level===9){
        const cycle=Math.floor(this.time/3.2),part=this.time%3.2;
        this.gears.moving=part>=2.4;
        const amount=cycle+Math.max(0,(part-2.4)/.8);
        this.gears.angle=amount*Math.PI/4;
        for(let i=0; i<2; i++)this._transform(this.components[i],[(i?1:-1)*1.520379194001562,0,0],rotation('y',(i?-1:1)*this.gears.angle+(i?-.442814331927155:.6391638727765171)));
      }
      if(this.level===10)this._shotUpdate(dt);
      if(this.level===11)this._seesawUpdate(dt);
      if(this.level===12)this._marbleUpdate(dt);
    }
    finish(){
      if(this.result)return this.result;
      if(this.phase==='assemble'||this.phase==='aim')return null;
      if(this.level===4){
        if(this.water.progress<1)return null;
      }
      if(this.level===12){
        if(this.marble.bin===null)return null;
      }
      this.score+=Math.max(0,1000-this.remaining()*20);
      this.result=this.score>=this.target?'win':'lose';
      this.phase='finished';
      return this.result;
    }
    info(){
      if(this.level===4)return this.status||'疏通水管，保留粉色密封边框';
      if(this.phase==='assemble')return '添加至少两个中性零件，移动旋转后完成拼接';
      if(this.phase==='aim')return '调整抛物线落点并投射；剩余 '+this.ammo.length+' 块';
      if(this.level===9)return this.gears.moving?'齿轮转动中，请等待停靠':'齿轮停靠，可跨接触面消除';
      if(this.level===11&&this.seesaw.moving)return '跷跷板调整中，请等待平稳后消除';
      if(this.level===11)return '消除改变重量；移动左右集合体形成接触';
      if(this.level===12)return this.marble.released?'弹珠与剩余方块碰撞，可继续消除':'先挖通道，再释放弹珠；中央 500 分框为目标';
      return '消除相邻同色块；可旋转视角寻找可见接缝';
    }
  }
  root.ChallengeWorld=ChallengeWorld;
  if(typeof module!=='undefined'&&module.exports)module.exports=ChallengeWorld;
})(typeof globalThis!=='undefined'?globalThis:this);
