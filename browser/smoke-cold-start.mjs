// Bounded sequential launches. Each independent browser is muted and closed.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const lab=path.resolve(import.meta.dirname,'..');
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const build=path.join(lab,'build',process.argv[2] || 'web');
const evidence=path.join(lab,'build',process.argv[3] || 'smoke-evidence');
const mode=process.argv[4] || 'default';
const attempts=Number(process.argv[5] || 3);
if(!Number.isInteger(attempts)||attempts<1||attempts>12)throw Error('Invalid attempt limit');
await fs.mkdir(evidence);
const result={build:path.basename(build),mode,muted:true,attempts:[],startedAt:new Date().toISOString()};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/favicon.ico'){res.writeHead(204).end();return;}
  const file=path.resolve(build,'.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(build+path.sep))throw Error('Invalid path');
  const bytes=await fs.readFile(file);
  res.writeHead(200,{'Content-Type':{'.js':'text/javascript','.html':'text/html','.wasm':'application/wasm'}[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Robots-Tag':'noindex'}).end(bytes);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 for(let i=0;i<attempts;i++){
  let browser;
  const run={attempt:i+1,errors:[],logs:[]};
  try{
   browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio',...(mode==='baseline'?['--js-flags=--liftoff-only']:mode==='optimized'?['--js-flags=--no-liftoff']:[])]});
   const page=await browser.newPage();
   await page.addInitScript(()=>{
    Error.stackTraceLimit=80;
    addEventListener('error',()=>{window.startupError=true;});
    addEventListener('unhandledrejection',()=>{window.startupError=true;});
    // Install fixture readiness even in standalone mode, where the host bridge
    // is deliberately inactive. No modification of game state.
    Object.defineProperty(window,'Module',{configurable:true,get(){return this.__module;},set(m){
     this.__module=m;m.onControlsReady=()=>{m.controlsReady=true;};m.onGameReady=()=>{m.gameInitialized=true;};
    }});
   });
   page.on('pageerror',e=>run.errors.push(e.stack||String(e)));
   page.on('console',m=>{if(m.type()==='error'||m.text().includes('Sound:'))run.logs.push(m.text());});
   await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'commit',timeout:10000});
   await page.waitForFunction(()=>Module.controlsReady || Module.ABORT || window.startupError,null,{timeout:18000});
   await page.waitForTimeout(100);
   run.passed=await page.evaluate(()=>!!Module.controlsReady);
   run.depth=await page.evaluate(()=>typeof Module._oga_lisp_depth==='function'?{current:Module._oga_lisp_depth(0),peak:Module._oga_lisp_depth(1)}:null);
  }catch(error){
   run.passed=false;run.errors.push(String(error));
   const page=browser?.contexts()[0]?.pages()[0];
   run.depth=await page?.evaluate(()=>typeof Module?._oga_lisp_depth==='function'?{current:Module._oga_lisp_depth(0),peak:Module._oga_lisp_depth(1)}:null).catch(()=>null);
  }finally{await browser?.close();run.browserClosed=true;}
  run.passed=run.passed&&run.errors.length===0;
  result.attempts.push(run);
  console.log(JSON.stringify({...run,logs:undefined,errors:run.errors.map(x=>x.slice(0,500))}));
 }
}finally{
 server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 result.endedAt=new Date().toISOString();result.browserAndServerClosed=true;
 result.passed=result.attempts.length===attempts&&result.attempts.every(x=>x.passed);
 await fs.writeFile(path.join(evidence,'result.json'),JSON.stringify(result,null,2)+'\n');
}
if(!result.passed)process.exitCode=1;
