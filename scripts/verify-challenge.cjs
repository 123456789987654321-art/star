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
 for(let level=1;level<=12;level++){
  await evaluate(`App.startSelectedLevel('challenge',${level});App.challenge.intro=0;document.getElementById('banner').classList.remove('show');`);await delay(450);
  if(level===8){await evaluate(`App.challenge.action('add','prism');App.challenge.action('add','frustum');`);await delay(200);}
  results.push(await evaluate(`({level:App.level,phase:App.challenge.world.phase,cells:App.challenge.world.cells.length,score:App.score,target:App.target,gl:App.scene.gl.getError(),timerHidden:document.getElementById('hudTimerBox').classList.contains('hidden'),title:document.getElementById('challengeTitle').textContent})`));
  const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'level-'+level+'.png'),Buffer.from(shot.data,'base64'));
  if(![8,10].includes(level))results.push(await evaluate(`(()=>{const game=App.challenge;for(const t of game.tiles){const p=App.scene.project(t.center);if(!p||p[1]>document.getElementById('challengePanel').getBoundingClientRect().top||game.pick({clientX:p[0],clientY:p[1]})!==t.id||game.group(t.id).length<2)continue;const before=game.world.remaining();game.click({clientX:p[0],clientY:p[1]});return {clickedLevel:App.level,removed:before-game.world.remaining(),score:game.world.score};}return {clickedLevel:App.level,removed:0};})()`));
 }
 results.push(await evaluate(`(()=>{App.startSelectedLevel('challenge',8);const g=App.challenge;g.intro=0;document.querySelector('[data-challenge="add"][data-value="prism"]').click();document.querySelector('[data-challenge="add"][data-value="frustum"]').click();const neutral=g.world.cells.every(c=>c.color===6);document.querySelector('[data-challenge="complete"]').click();return {assemblyNeutral:neutral,assemblyCompleted:g.world.phase==='play',assigned:g.world.cells.every(c=>c.color>=0&&c.color<6)};})()`));
 results.push(await evaluate(`(()=>{App.startSelectedLevel('challenge',10);const g=App.challenge;g.intro=0;const hole=g.world.cells.find(c=>c.hole);g.action('aim',{x:hole.center[0],y:hole.center[1]});document.querySelector('[data-challenge="shoot"]').click();g.world.update(1.3);const filled=hole.color>=0;while(g.world.ammo.length){g.action('shoot');g.world.update(1.3);}return {targetHoleFilled:filled,targetElimination:g.world.phase==='play'};})()`));
 results.push(await evaluate(`(()=>{App.startSelectedLevel('challenge',4);const g=App.challenge;g.intro=0;g.world.remove(g.world.cells.filter(c=>!c.seal).map(c=>c.id));for(let i=0;i<100;i++)g.world.update(.05);g.checkResult();return {waterWon:g.world.result==='win',waterPersisted:!!JSON.parse(localStorage.getItem('popstar3d.progress.challenge.v2')).cleared.hasOwnProperty('4')};})()`));
 results.push(await evaluate(`(()=>{App.startSelectedLevel('challenge',12);const g=App.challenge;g.intro=0;g.world.remove(g.world.cells.map(c=>c.id));document.querySelector('[data-challenge="release"]').click();for(let i=0;i<200&&!g.world.result;i++)g.world.update(.02);g.checkResult();App.restart();return {restartZero:App.score===0&&App.challenge.world.score===0,marbleWon:g.world.result==='win'};})()`));
 await evaluate(`App.pause();window.qaPausedTime=App.challenge.world.time`);await delay(250);results.push(await evaluate(`({pauseFrozen:qaPausedTime===App.challenge.world.time})`));await evaluate('App.resume()');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await evaluate(`App.startSelectedLevel('challenge',12);App.challenge.intro=0;document.getElementById('banner').classList.remove('show');`);await delay(350);
 fs.writeFileSync(path.join(out,'mobile-marble.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await evaluate(`App.startSelectedLevel('challenge',8);App.challenge.intro=0;App.challenge.action('add','prism');document.getElementById('banner').classList.remove('show');`);await delay(350);
 fs.writeFileSync(path.join(out,'mobile.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 results.push(await evaluate(`({mobileOverflow:document.documentElement.scrollWidth>innerWidth,paused:(App.pause(),App.state)})`));
 await evaluate(`App.toMenu();App.startSelectedLevel('normal',1)`);await delay(100);results.push(await evaluate(`({normalUnaffected:!App.challenge&&App.mode==='normal'&&document.getElementById('challengePanel').classList.contains('hidden'),normalGL:App.scene.gl.getError()})`));
 const failed=results.filter(r=>r.gl||r.normalGL||r.mobileOverflow||(r.clickedLevel&&r.removed<2)||Object.entries(r).some(([k,v])=>typeof v==='boolean'&&k!=='mobileOverflow'&&!v));
 const report={results,errors,failed};fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));if(errors.length||failed.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(ws&&ws.readyState===1){await call('Browser.close').catch(()=>{});ws.close();}if(edge)edge.kill();server.close();});
