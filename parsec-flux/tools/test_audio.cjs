/* Deterministic audio-clock integration checks; no browser or packages required. */
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
let now=0,serial=0,events=new Map(),sources=[],fetches=0;
const later=(fn,ms=0,interval=0)=>{const id=++serial;events.set(id,{fn,at:now+ms,interval});return id};
function param(value=0){return {value,history:[],setValueAtTime(v,t){this.value=v;this.history.push([t,v])},linearRampToValueAtTime(v,t){this.value=v;this.history.push([t,v])},exponentialRampToValueAtTime(v,t){this.value=v;this.history.push([t,v])},setTargetAtTime(v,t){this.value=v;this.history.push([t,v])},cancelScheduledValues(){},cancelAndHoldAtTime(){}}}
class AudioNode {
 constructor(){for(const k of ['gain','frequency','detune','pan','Q','delayTime','threshold','knee','ratio','attack','release'])this[k]=param();this.playbackRate=param(1);this.handlers={};this.stopped=false}
 connect(){}disconnect(){}addEventListener(k,f){this.handlers[k]=f}
 start(at=now/1000){this.startTime=at;sources.push(this);if(this.buffer&&!this.loop)this.endId=later(()=>this.end(),Math.max(0,(at-now/1000+this.buffer.duration/this.playbackRate.value)*1000))}
 stop(at=now/1000){if(this.stopped)return;events.delete(this.endId);this.stopTime=at;this.endId=later(()=>this.end(),Math.max(0,(at-now/1000)*1000))}
 end(){if(this.stopped)return;this.stopped=true;this.onended?.();this.handlers.ended?.()}
}
class AudioContext {
 constructor(){this.sampleRate=32000;this.state='running';this.destination=new AudioNode()}
 get currentTime(){return now/1000}
 createGain(){return new AudioNode()}createBiquadFilter(){return new AudioNode()}createDelay(){return new AudioNode()}
 createStereoPanner(){return new AudioNode()}createBufferSource(){return new AudioNode()}createOscillator(){return new AudioNode()}createDynamicsCompressor(){return new AudioNode()}
 async decodeAudioData(buffer){const name=Buffer.from(buffer).toString();return {name,duration:/pad-c3|bloom-glass|heartbeat/.test(name)?12:2}}
 async resume(){this.state='running'}
}
const elements=new Map();
function el(id){if(!elements.has(id))elements.set(id,{value:100,style:{},classList:{add(){},remove(){}},handlers:{},focus(){},addEventListener(k,f){this.handlers[k]=f},textContent:''});return elements.get(id)}
const sandbox=vm.createContext({console,window:{AudioContext},document:{getElementById:el},performance:{now:()=>now},localStorage:{getItem:()=>100,setItem(){}},
 setTimeout:(f,ms)=>later(f,ms),clearTimeout:id=>events.delete(id),setInterval:(f,ms)=>later(f,ms,ms),clearInterval:id=>events.delete(id),
 fetch:async url=>{fetches++;assert(fs.existsSync(path.join(root,url.split('?')[0])));return {ok:true,arrayBuffer:async()=>Buffer.from(url.split('/').pop().split('.mp3')[0])}}
});
vm.runInContext(fs.readFileSync(path.join(root,'bloom-audio.js'),'utf8')+'\nglobalThis.Engine=FluxAudio;globalThis.worlds=FLUX_WORLDS;',sandbox);
let inline=fs.readFileSync(path.join(root,'index.html'),'utf8').split('<script>')[1].split('</script>')[0];
inline=inline.replace('})();','globalThis.game={tap,miss,gameOver,get state(){return {running,paused,score,lives,level,step,hazard,sampleAudio,jumpStarted}},levels};})();');
vm.runInContext(inline,sandbox);
async function flush(){for(let i=0;i<30;i++)await Promise.resolve()}
async function advance(ms){
 const end=now+ms;await flush();
 for(;;){const next=[...events].filter(([,e])=>e.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;
  const [id,e]=next;events.delete(id);now=e.at;if(e.interval)events.set(id,{...e,at:now+e.interval});e.fn();await flush();
 }now=end;await flush();
}
(async()=>{
 const engine=new sandbox.Engine(new AudioContext(),new AudioNode());await engine.load();assert.equal(fetches,21);
 for(let i=0;i<8;i++){
  const notes=sandbox.game.levels[i].notes;engine.startWorld(i,notes);
  assert.equal(engine.world,sandbox.worlds[i]);assert.equal(engine.pads.length,1);assert.equal(engine.harmony.length,6);
  const epoch=now,first=engine.harmony[0];await advance(11800);assert.equal(engine.harmony[0],first);
  await advance(100);assert.notEqual(engine.harmony[0],first);assert.equal(engine.harmony[0].o.startTime,(epoch+12000)/1000);
  await advance(12100);assert.equal(engine.phrase,2);await advance(12000);assert.equal(engine.phrase,3);await advance(12000);assert.equal(engine.phrase,4);
  engine.addPad(1);engine.addPad(2);assert.equal(engine.pads.length,3);engine.resetChord();assert.equal(engine.pads.length,1);
  const start=now;let finished=false;engine.completion().then(()=>{finished=true});
  assert.equal(engine.fanfareNodes.length,21);
  for(let hit=1;hit<7;hit++)assert(engine.fanfareNodes[hit*3].o.playbackRate.value>engine.fanfareNodes[(hit-1)*3].o.playbackRate.value);
  assert.equal(Math.max(...engine.fanfareNodes.map(n=>n.o.stopTime)),start/1000+3);
  await advance(2999);assert(!finished);await advance(1);assert(finished);
  engine.stopWorld();assert.equal(engine.musicTimer,null);assert.equal(engine.worldNodes.length,0);
 }
 const game=sandbox.game;game.tap();game.tap();await flush();assert(game.state.paused);await advance(3001);assert(game.state.running);
 for(let world=0;world<8;world++){
  assert.equal(game.state.level,world);
  for(let tone=0;tone<3;tone++){
   const hazard=game.state.hazard;assert(hazard&&!hazard.hit);await advance(hazard.center-now-420);game.tap();
   const started=game.state.jumpStarted;await advance(150);game.tap();assert.equal(game.state.jumpStarted,started);
   assert.equal(game.state.step,tone);await advance(270);assert.equal(game.state.step,tone+1);
   if(tone<2)await advance(901);
  }
  assert(game.state.paused);assert(!game.state.running);assert.equal(game.state.sampleAudio.fanfareNodes.length,21);
  const score=game.state.score;game.tap();assert.equal(game.state.score,score);
  await advance(2999);assert.equal(game.state.level,world);await advance(2);assert.equal(game.state.level,(world+1)%8);assert(game.state.paused);
  await advance(2001);assert(game.state.running);assert(!game.state.paused);
 }
 // Early jump lands before the sound arrives: one collision, one lost life.
 let hazard=game.state.hazard;game.tap();await advance(hazard.center-now);assert.equal(game.state.lives,2);
 await advance(2700);assert.equal(game.state.step,0);assert(!game.state.paused);
 // A jump only 40 ms before arrival is still too low to clear it.
 hazard=game.state.hazard;await advance(hazard.center-now-40);game.tap();await advance(40);
 assert.equal(game.state.lives,1);await advance(700);assert.equal(game.state.sampleAudio.voice.o.buffer.name,'one-life');
 await advance(2000);
 // No jump also collides; taps during the announcement cannot save it.
 hazard=game.state.hazard;await advance(hazard.center-now);assert.equal(game.state.lives,0);
 game.tap();await advance(2700);assert(!game.state.running);assert.equal(game.state.sampleAudio.musicTimer,null);
 game.tap();await advance(3001);assert(game.state.running);
 // Real input handlers: held keys, secondary pointers, and repeated taps.
 const stage=el('stage'),key=stage.handlers.keydown,pointer=stage.handlers.pointerdown;
 key({key:' ',repeat:true,preventDefault(){}});assert.equal(game.state.jumpStarted,-Infinity);
 pointer({isPrimary:false,button:0});assert.equal(game.state.jumpStarted,-Infinity);
 pointer({isPrimary:true,button:0,preventDefault(){}});assert(Number.isFinite(game.state.jumpStarted));
 game.gameOver();assert.equal(game.state.jumpStarted,-Infinity);
 assert.equal([...events.values()].filter(e=>e.interval).length,0);
 console.log('PASS: all 8 sample pads, 16-beat progression timing and wrap, chord reset, 21 rising fanfare voices / 3 seconds, all 8 world transitions, timed jumps, early/late/no-jump collisions, anti-spam, touch/held-key input, announcements, life cues, game-over cleanup and restart.');
})().catch(error=>{console.error(error);process.exitCode=1});
