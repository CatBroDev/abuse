/* Optional Old Games Archive host protocol v1, GPL-2.0-or-later, 2026. */
(() => {
  const query=new URLSearchParams(location.search);
  if(query.get('embedded')!=='1'||parent===window)return;
  let origin;
  try{
    origin=new URL(query.get('host')).origin;
    const u=new URL(origin);
    if(!['https://oldgamesarchive.org','https://preview.oldgamesarchive.org'].includes(origin)&&
      !(u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)))return;
  }catch{return;}
  document.documentElement.classList.add('embedded');
  const send=(type,extra={})=>parent.postMessage({source:'oldgames-native',version:1,type,...extra},origin);
  const keys={263:37,265:38,262:39,264:40,256:27,257:13,32:32,341:17,345:17,342:18,346:18,340:16,344:16,260:45,
    258:9,259:8,261:46,266:33,267:34,268:36,269:35,280:20,281:145,282:144,284:19,
    44:188,45:189,46:190,47:191,59:186,61:187,91:219,92:220,93:221,96:192,39:222,335:13};
  for(let n=65;n<=90;n++)keys[n]=n;
  for(let n=48;n<=57;n++)keys[n]=n;
  for(let n=0;n<12;n++)keys[290+n]=112+n;
  for(let n=0;n<10;n++)keys[320+n]=96+n;
  let ready=false,initialized=false,stopped=false,suspended=false,muted=true;
  const audio=()=>{
    Module._oga_audio_mute?.(muted||suspended?1:0);
    // Keep the mixer clock alive when muted so fades/cleanup can complete.
    // Resume Web Audio only in response to player interaction.
    if(!muted&&!suspended)
      Module.SDL2?.audioContext?.resume().catch(()=>{});
  };
  const pause=value=>{
    if(!ready||stopped)return;
    Module.browserInput.release();
    if(!initialized)return;
    const state=Module._oga_browser_state();
    if(value&&state===0&&!suspended){
      Module.browserInput.key(80,true);Module.browserInput.key(80,false);suspended=true;
    }else if(!value&&suspended){
      // Queue after P even if its keydown has not reached the next game tick.
      Module.browserInput.key(32,true);Module.browserInput.key(32,false);
      suspended=false;
    }
    audio();send(suspended?'paused':'running');
  };
  Module.onControlsReady=()=>{
    initialized=false;Module.gameInitialized=false;ready=true;audio();send('ready',{capabilities:{pointer:'absolute'}});
    send('storage',{state:Module.storageState});
    if(document.hidden)pause(true);
  };
  Module.onGameReady=()=>{initialized=true;Module.gameInitialized=true;if(document.hidden)pause(true);};
  Module.onStorageState=state=>send('storage',{state});
  const abort=Module.onAbort;
  Module.onAbort=reason=>{stopped=true;abort?.(reason);send('error');};
  Module.onExit=()=>{stopped=true;send('stopped');};
  addEventListener('message',event=>{
    const m=event.data;
    if(event.source!==parent||event.origin!==origin||!m||m.source!=='oldgames-player'||m.version!==1||!ready||stopped)return;
    if(m.type==='key'&&!suspended&&Number.isInteger(m.key)&&typeof m.down==='boolean'&&keys[m.key]!==undefined)
      Module.browserInput.key(keys[m.key],m.down,[344,345,346].includes(m.key)?2:m.key>=320&&m.key<=335?3:0);
    if(m.type==='pointer'&&!suspended&&[m.x,m.y,m.buttons].every(Number.isFinite))
      Module.browserInput.pointer({x:m.x,y:m.y,buttons:m.buttons});
    if(m.type==='release')Module.browserInput.release();
    if(m.type==='focus')Module.canvas.focus();
    if(m.type==='pause')pause(true);
    if(m.type==='resume'&&!document.hidden)pause(false);
    if(m.type==='dispose'){Module.browserInput.release();Module._oga_browser_stop();}
    if(m.type==='sound'&&typeof m.muted==='boolean'){muted=m.muted;audio();}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
})();
