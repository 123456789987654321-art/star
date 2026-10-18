// Optional real WebGL integration checks. Run: node scripts/verify-challenge.cjs
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.qa');fs.mkdirSync(out,{recursive:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(req.url==='/'?'/index.html':req.url.split('?')[0]));if(!p.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(p,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(data);});});
let edge,ws,seq=0;const pending=new Map(),errors=[],debugPort=9237;
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},20000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value;};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 edge=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu-sandbox','--no-first-run','--remote-debugging-port='+debugPort,'--user-data-dir='+path.join(out,'edge-qa'),'--window-size=1280,900','about:blank'],{windowsHide:true,stdio:'ignore'});
 let pages;for(let i=0;i<50;i++){try{pages=await(await fetch('http://127.0.0.1:'+debugPort+'/json')).json();break;}catch(e){await delay(200);}}
 if(!pages)throw Error('Edge debug endpoint unavailable');
 ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));
 ws.addEventListener('message',e=>{const msg=JSON.parse(e.data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);if(msg.error)p.reject(Error(JSON.stringify(msg.error)));else p.resolve(msg.result);}else if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);});
 await call('Runtime.enable');await call('Page.enable');await call('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});await delay(1200);
 const results=[];
 await evaluate(`App.startSelectedLevel('challenge',2);window.qaEntryTime=App.challenge.world.time;`);await delay(200);
 results.push(await evaluate(`({entryPaused:App.state==='paused'&&App.challenge.world.time===qaEntryTime,entryAcknowledgePresent:[...document.querySelectorAll('#ovCard button')].some(b=>b.textContent==='我知道了')})`));
 fs.writeFileSync(path.join(out,'entry-instructions.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await evaluate(`window.qaEnter=level=>{App.startSelectedLevel('challenge',level);if(App.state!=='paused'||!document.getElementById('ovCard').textContent.includes('我知道了'))throw Error('Missing entry instructions '+level);document.querySelector('#overlay [data-act="resume"]').click();if(App.state!=='play')throw Error('Entry acknowledgement failed');};`);
 for(let level=1;level<=12;level++){
  await evaluate(`qaEnter(${level});App.challenge.intro=0;document.getElementById('banner').classList.remove('show');`);await delay(450);
  if(level===8){await evaluate(`App.challenge.action('add','prism');App.challenge.action('add','frustum');`);await delay(200);}
  results.push(await evaluate(`({level:App.level,phase:App.challenge.world.phase,cells:App.challenge.world.cells.length,score:App.score,target:App.target,gl:App.scene.gl.getError(),timerHidden:document.getElementById('hudTimerBox').classList.contains('hidden'),title:document.getElementById('hudMode').textContent,noViewToggle:!document.querySelector('[data-challenge="view"]'),simplePanelHidden:[8,10,11,12].includes(App.level)||document.getElementById('challengePanel').classList.contains('hidden')})`));
  const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'level-'+level+'.png'),Buffer.from(shot.data,'base64'));
  if(level===9)for(let wait=0;wait<40;wait++){if(await evaluate('App.challenge.world.canRemove()'))break;await delay(100);}
  if(![8,10].includes(level))results.push(await evaluate(`(()=>{const game=App.challenge;for(const t of game.tiles){const p=App.scene.project(t.center);if(!p||(!document.getElementById('challengePanel').classList.contains('hidden')&&p[1]>document.getElementById('challengePanel').getBoundingClientRect().top)||game.pick({clientX:p[0],clientY:p[1]})!==t.id||game.group(t.id).length<2)continue;const before=game.world.remaining();game.click({clientX:p[0],clientY:p[1]});return {clickedLevel:App.level,removed:before-game.world.remaining(),score:game.world.score};}return {clickedLevel:App.level,removed:0};})()`));
 }
 await evaluate(`qaEnter(8);App.challenge.intro=0;document.querySelector('[data-challenge="add"][data-value="prism"]').click();document.querySelector('[data-challenge="add"][data-value="frustum"]').click();`);await delay(250);
 results.push(await evaluate(`({assemblyNeutral:App.challenge.world.cells.every(c=>c.color===6),assemblyPending:App.challenge.world.assemblyPending,assemblyGlow:App.challenge.assembly.seams.length>0,modelThumbnails:document.querySelectorAll('.challenge-part svg').length===6})`));
 await evaluate(`window.qaAssemblyPoint=()=>{const g=App.challenge;for(const t of g.tiles.filter(t=>t.component===g.world.selected)){const p=App.scene.project(t.center);if(p&&p[1]<document.getElementById('challengePanel').getBoundingClientRect().top&&g.pick({clientX:p[0],clientY:p[1]})===t.id)return {x:p[0],y:p[1]};}throw Error('No visible selected assembly cell');};`);
 let assemblyPoint=await evaluate('qaAssemblyPoint()');
 for(let i=0;i<2;i++){await call('Input.dispatchMouseEvent',{type:'mousePressed',...assemblyPoint,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...assemblyPoint,button:'left',clickCount:1});}
 fs.writeFileSync(path.join(out,'assembly-glow.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 results.push(await evaluate(`(()=>{const g=App.challenge,confirmed=!g.world.assemblyPending;document.querySelector('[data-challenge="complete"]').click();return {desktopPlacementConfirmed:confirmed,assemblyCompleted:g.world.phase==='play',assigned:g.world.cells.every(c=>c.color>=0&&c.color<6)};})()`));
 await evaluate(`qaEnter(10);App.challenge.intro=0;window.qaAmmo=App.challenge.world.ammo.length;`);
 const throwPoint=await evaluate(`(()=>{const p=App.scene.project([-1.6,0,.09]);return {x:p[0],y:p[1]};})()`);
 await call('Input.dispatchMouseEvent',{type:'mousePressed',...throwPoint,button:'left',clickCount:1});await delay(400);
 results.push(await evaluate(`({throwCharging:App.challenge.thrower.charging,throwPowerIncreases:App.challenge.thrower.power>0,throwWaitsForRelease:App.challenge.world.ammo.length===qaAmmo})`));
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',...throwPoint,button:'left',clickCount:1});
 results.push(await evaluate(`({throwReleased:!App.challenge.thrower.charging,throwConsumesOne:App.challenge.world.ammo.length===qaAmmo-1})`));
 results.push(await evaluate(`(()=>{qaEnter(10);const g=App.challenge;g.intro=0;const hole=g.world.cells.find(c=>c.hole);g.action('aim',{x:hole.center[0],y:hole.center[1]});g.action('shoot');g.world.update(1.3);const filled=hole.color>=0;while(g.world.ammo.length){g.action('shoot');g.world.update(1.3);}return {targetHoleFilled:filled,targetElimination:g.world.phase==='play'};})()`));
 results.push(await evaluate(`(()=>{qaEnter(4);const g=App.challenge;g.intro=0;g.world.remove(g.world.cells.filter(c=>!c.seal).map(c=>c.id));for(let i=0;i<100;i++)g.world.update(.05);g.checkResult();return {waterWon:g.world.result==='win',waterPersisted:!!JSON.parse(localStorage.getItem('popstar3d.progress.challenge.v2')).cleared.hasOwnProperty('4')};})()`));
 await evaluate(`qaEnter(4);App.challenge.intro=0;App.challenge.world.remove(App.challenge.world.cells.filter(c=>!c.seal).map(c=>c.id));App.challenge.world.update(.6);App.challenge.syncHud();`);await delay(80);
 results.push(await evaluate(`({waterGaugeVisible:!document.getElementById('waterGauge').classList.contains('hidden'),waterDepletes:App.challenge.world.water.amount<100,waterJetVisible:App.challenge.world.waterVisuals.jet.alpha>0})`));
 fs.writeFileSync(path.join(out,'water-flow.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 results.push(await evaluate(`(()=>{qaEnter(12);const g=App.challenge;g.intro=0;g.world.cells.forEach(c=>c.color=-1);for(let drop=0;drop<3;drop++){g.controls();document.querySelector('[data-challenge="release"]').click();for(let i=0;i<2000&&g.world.marble.released;i++)g.world.update(.02);}g.checkResult();App.restart();return {restartZero:App.score===0&&App.challenge.world.score===0,marbleThreeDrops:g.world.marble.drops===3,marbleCenterScores:g.world.score===1500,marbleWon:g.world.result==='win'};})()`));
 await evaluate(`App.pause();window.qaPausedTime=App.challenge.world.time`);await delay(250);results.push(await evaluate(`({pauseFrozen:qaPausedTime===App.challenge.world.time})`));await evaluate('App.resume()');
 results.push(await evaluate(`(()=>{document.getElementById('btnMechanicInfo').click();const reopened=App.state==='paused'&&document.getElementById('ovCard').textContent.includes('我知道了');document.querySelector('#overlay [data-act="resume"]').click();return {infoReopens:reopened,infoDismissed:App.state==='play'&&document.getElementById('overlay').classList.contains('hidden')};})()`));
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await evaluate(`qaEnter(12);App.challenge.intro=0;document.getElementById('banner').classList.remove('show');`);await delay(350);
 fs.writeFileSync(path.join(out,'mobile-marble.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await evaluate(`qaEnter(4);App.challenge.intro=0;document.getElementById('banner').classList.remove('show');`);await delay(200);
 fs.writeFileSync(path.join(out,'mobile-water.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await evaluate(`qaEnter(8);App.challenge.intro=0;App.challenge.action('add','prism');App.challenge.action('add','frustum');document.getElementById('banner').classList.remove('show');`);await delay(350);
 assemblyPoint=await evaluate('qaAssemblyPoint()');
 await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...assemblyPoint,id:1}]});
 await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 results.push(await evaluate(`({touchPlacementConfirmed:!App.challenge.world.assemblyPending,modelTrayScrolls:document.querySelector('.challenge-parts').scrollWidth>document.querySelector('.challenge-parts').clientWidth})`));
 fs.writeFileSync(path.join(out,'mobile.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 results.push(await evaluate(`({mobileOverflow:document.documentElement.scrollWidth>innerWidth,paused:(App.pause(),App.state)})`));
 await evaluate(`App.toMenu();App.startSelectedLevel('normal',1)`);await delay(100);results.push(await evaluate(`({normalUnaffected:!App.challenge&&App.mode==='normal'&&document.getElementById('challengePanel').classList.contains('hidden'),normalGL:App.scene.gl.getError()})`));
 await evaluate(`document.getElementById('btnLevelSelect').click();`);
 results.push(await evaluate(`({normalReturnPicker:App.selectMode==='normal'&&!!document.querySelector('[data-act="selectLevel"]')})`));
 await evaluate(`App.toMenu();App.showHelp(true);document.getElementById('ovCard').scrollTop=10000;`);await delay(400);
 results.push(await evaluate(`(()=>{const b=document.getElementById('btnDialogBack'),r=b.getBoundingClientRect();return {helpBackVisible:!b.hidden&&r.top>=0&&r.bottom<innerHeight,removedTestMenu:!document.querySelector('.test-levels')};})()`));
 fs.writeFileSync(path.join(out,'mobile-help.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await evaluate(`document.getElementById('btnDialogBack').click();`);
 results.push(await evaluate(`({helpBackCloses:App.state==='menu'&&document.getElementById('overlay').classList.contains('hidden')&&document.getElementById('btnDialogBack').hidden})`));
 results.push(await evaluate(`(()=>{for(const score of [900,700,1100]){qaEnter(1);const g=App.challenge;g.world.score=score;g.world.result='win';g.checkResult();}document.getElementById('btnLevelSelect').click();const saved=JSON.parse(localStorage.getItem('popstar3d.progress.challenge.v2'));return {challengeReturnPicker:App.selectMode==='challenge',bestClearMax:saved.best[1]===1100,bestDisplayed:document.querySelector('[data-level="1"] .level-best').textContent==='历史最高分：1100'};})()`));
 await delay(400);fs.writeFileSync(path.join(out,'mobile-picker.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 for(const level of [11,12]){
  await evaluate(`qaEnter(${level});App.challenge.intro=0;document.getElementById('banner').classList.remove('show');`);await delay(200);
  results.push(await evaluate(`(()=>{const g=App.challenge,points=[...g.world.cells,...g.world.decorations].flatMap(c=>ChallengeProjection.worldVertices(c)).map(p=>App.scene.project(p)).filter(Boolean),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);const labels=[...document.querySelectorAll('#challengeLabels span')].map(e=>e.getBoundingClientRect()),panel=document.getElementById('challengePanel').getBoundingClientRect();return {cameraLevel:${level},modelCentered:Math.abs((Math.min(...xs)+Math.max(...xs))/2-innerWidth/2)<innerWidth*.04,modelVisible:Math.min(...xs)>0&&Math.max(...xs)<innerWidth&&Math.min(...ys)>0&&Math.max(...ys)<innerHeight,binLabelsClear:labels.every(r=>r.bottom<panel.top||r.top>panel.bottom),numericBins:g.level!==12||[...document.querySelectorAll('#challengeLabels span')].map(e=>e.textContent).join(',')==='100,300,500,300,100'};})()`));
  fs.writeFileSync(path.join(out,'mobile-level-'+level+'.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 }
 await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
 await evaluate(`qaEnter(4);App.challenge.intro=0;App.scene.yaw=-.65;App.scene.pitch=.35;document.getElementById('banner').classList.remove('show');`);await delay(200);
 results.push(await evaluate(`({visibleWater:App.challenge.world.waterVisuals.waterVolume.alpha>.6,waterRipples:App.challenge.world.waterVisuals.ripples.length>=3})`));
 fs.writeFileSync(path.join(out,'water-through-wall.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 results.push(await evaluate(`(()=>{const w=App.challenge.world,seal=w.cells.find(c=>c.sideSeal&&c.grid[0]===-1&&c.grid[2]===3),inner=w.cells.find(c=>c.barrier==='slope'&&c.grid[0]===0&&c.grid[2]===3);w.remove([seal.id,inner.id,...w.cells.filter(c=>c.component===1).map(c=>c.id)]);w.update(.1);return {sideWallLeaks:w.water.leaking&&w.water.leaked>0};})()`));
 await delay(100);fs.writeFileSync(path.join(out,'water-side-leak.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 const failed=results.filter(r=>r.gl||r.normalGL||r.mobileOverflow||(r.clickedLevel&&r.removed<2)||Object.entries(r).some(([k,v])=>typeof v==='boolean'&&k!=='mobileOverflow'&&!v));
 const report={results,errors,failed};fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));if(errors.length||failed.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(ws&&ws.readyState===1){await call('Browser.close').catch(()=>{});ws.close();}if(edge)edge.kill();server.close();});
