const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const shell = fs.readFileSync(process.env.SHELL_SOURCE || 'site/index.html','utf8');
const start = shell.indexOf('  async function playAssistantBuiltInAudio(');
const end = shell.indexOf('\n  async function advanceAssistantBuiltInPlaylist', start);
async function fixture() {
  let resolveUnlock, playCalls = 0;
  const unlocking = new Promise(r => resolveUnlock=r);
  const state = {musicScreensaverForcedActive:true,musicScreensaverAudioAttempt:0};
  const audio = {pause(){},play(){playCalls++;return Promise.resolve();}};
  const sandbox = {assistantState:state,assistantAudio:audio,
    assistantVisualizer:{unlock:()=>unlocking,getAudioState:()=> 'running'},
    ASSISTANT_DEFAULT_AUDIO_PLAYLIST:[{url:'/audio/hold-a.mp3',name:'Hold A'}],
    assistantUserlineEl:{},assistantMessageEl:{},navigator:{},setTimeout,clearTimeout,
    unlockAssistantAudio:()=>unlocking,
    stopAssistantPlayback(){},revokeAssistantLocalAudioUrl(){},syncAssistantPlaybackUi(){},
    setScreensaverAudioPending(v){state.musicScreensaverPendingAutostart=v;},
    setAssistantMusicScreensaver(v){state.active=v;},setAssistantStatus(v){state.status=v;},
  };
  const play = vm.runInNewContext('('+shell.slice(start,end)+')',sandbox);
  const done=play({autostartedByLatch:true});
  assert.equal(playCalls,1,'play must be called synchronously before audio context resume resolves');
  assert.equal(state.musicScreensaverPendingAutostart,true,'retry remains available while context is suspended');
  resolveUnlock(true);await done;
  assert.equal(state.musicScreensaverPendingAutostart,false);
  assert.equal(state.active,true);
}
fixture().then(()=>console.log('PASS: hold play starts within gesture while context unlock is unresolved; pending state clears on success')).catch(e=>{console.error(e);process.exit(1)});

// Run the actual orb click handler to distinguish sound retry from full exit.
const clickStart = shell.indexOf("    assistantAvatar?.addEventListener('click', async () => {");
const clickEnd = shell.indexOf("    assistantAvatar?.addEventListener('pointerdown'", clickStart);
const orbState = {musicScreensaverForcedActive:true,musicScreensaverActive:true,musicScreensaverMediaActive:true,musicScreensaverPendingAutostart:false};
let handler, dismisses=0, retries=0, toggles=0;
vm.runInNewContext(shell.slice(clickStart,clickEnd), {
  assistantState:orbState, assistantAvatar:{addEventListener(_,fn){handler=fn;}},
  maybeAutostartLatchedScreensaverAudio(){retries++;},
  dismissLatchedAssistantScreensaver(){dismisses++;orbState.musicScreensaverForcedActive=false;orbState.musicScreensaverActive=false;},
  toggleAssistantPlayback(){toggles++;},setAssistantStatus(){},
  stopAssistantPlayback(){orbState.musicScreensaverActive=false;}
});
(async()=>{
 await handler(); assert.equal(dismisses,1);assert.equal(toggles,0);assert.equal(orbState.musicScreensaverActive,false);
 Object.assign(orbState,{musicScreensaverForcedActive:true,musicScreensaverActive:true,musicScreensaverMediaActive:false,musicScreensaverPendingAutostart:true});
 await handler();assert.equal(retries,1);assert.equal(dismisses,1);assert.equal(orbState.musicScreensaverActive,true);
 console.log('PASS: playing orb tap exits the latch; pending orb tap still retries sound');
})().catch(e=>{console.error(e);process.exit(1)});
