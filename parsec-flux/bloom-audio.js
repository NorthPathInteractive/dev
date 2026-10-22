/* Sample instruments for all Flux worlds; 16-beat progressions at 80 BPM. */
const FLUX_WORLDS = [
 {sample:'bloom',root:48,triad:[0,4,7],cut:2600,wet:.24,chords:[[48,55,59,64,74],[45,52,55,60,71],[41,53,57,64,67],[43,55,59,64,69]]},
 {sample:'prism',root:50,triad:[0,4,7],cut:3800,wet:.32,chords:[[50,57,61,66,80],[52,59,62,68,78],[47,54,57,62,73],[50,57,61,66,80]]},
 {sample:'undertow',root:45,triad:[0,3,7],cut:1250,wet:.38,chords:[[45,52,55,60,71],[41,53,57,64,67],[38,50,53,60,64],[40,52,55,62,67]]},
 {sample:'halo',root:53,triad:[0,4,7],cut:2900,wet:.42,chords:[[41,53,57,64,67],[38,50,53,60,64],[46,53,57,62,72],[48,55,58,64,74]]},
 {sample:'nightglass',root:40,triad:[0,3,7],cut:1850,wet:.34,chords:[[40,52,55,62,66],[36,48,52,59,62],[43,55,59,62,69],[38,50,54,61,64]]},
 {sample:'tension',root:43,triad:[0,4,7],cut:3200,wet:.27,chords:[[43,55,59,65,69],[48,55,59,64,74],[45,52,55,60,71],[38,50,54,60,64]]},
 {sample:'abyss',root:47,triad:[0,3,6],cut:1050,wet:.43,chords:[[35,47,53,57,62],[40,52,55,62,66],[45,52,55,60,71],[38,50,53,60,64]]},
 {sample:'radiance',root:48,triad:[0,4,7],cut:4400,wet:.45,chords:[[48,55,59,64,78],[50,57,60,66,76],[40,52,55,62,66],[48,55,59,64,78]]}
];
const fluxHz = midi => 440*2**((midi-69)/12);
class FluxAudio {
 constructor(ctx,master){
  this.ctx=ctx;this.master=master;this.buffers=new Map();this.worldNodes=[];this.pads=[];this.harmony=[];this.effects=[];
  this.voice=null;this.musicTimer=null;this.world=null;this.fanfareNodes=[];
  this.worldGain=ctx.createGain();this.worldGain.connect(master);
 }
 async load(){
  const names=[...FLUX_WORLDS.map(w=>w.sample+'-pad-c3'),'bloom-glass-c5','bloom-heartbeat',
   ...Array.from({length:8},(_,i)=>'world-'+(i+1)),'one-life','two-lives','game-over'];
  await Promise.all(names.map(async name=>{
   if(this.buffers.has(name))return;
   const response=await fetch('audio/'+name+'.mp3?v=0.7.0');
   if(!response.ok)throw new Error('Audio unavailable: '+name);
   this.buffers.set(name,await this.ctx.decodeAudioData(await response.arrayBuffer()));
  }));
 }
 source(name,gain,target=this.worldGain,rate=1,loop=false){
  const o=this.ctx.createBufferSource(),g=this.ctx.createGain();
  o.buffer=this.buffers.get(name);o.playbackRate.value=rate;o.loop=loop;
  if(loop){o.loopStart=0;o.loopEnd=12}
  g.gain.value=gain;o.connect(g);g.connect(target);
  const node={o,g};
  o.onended=()=>{o.disconnect();g.disconnect();this.worldNodes=this.worldNodes.filter(n=>n!==node)};
  return node;
 }
 startWorld(index,notes){
  this.stopWorld();this.world=FLUX_WORLDS[index];this.notes=notes;
  this.worldGain.gain.cancelScheduledValues(this.ctx.currentTime);this.worldGain.gain.value=1;
  const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=this.world.cut;filter.Q.value=.55;
  const delay=this.ctx.createDelay(2),wet=this.ctx.createGain(),feedback=this.ctx.createGain();
  delay.delayTime.value=.5625;wet.gain.value=this.world.wet;feedback.gain.value=.28;
  filter.connect(this.worldGain);filter.connect(delay);delay.connect(wet);wet.connect(this.worldGain);delay.connect(feedback);feedback.connect(delay);
  this.padBus=filter;this.effects=[filter,delay,wet,feedback];
  this.epoch=this.ctx.currentTime;this.phrase=-1;this.advanceHarmony();this.addPad(0);
  if(index===0){const pulse=this.source('bloom-heartbeat',.15,this.worldGain,1,true);pulse.o.start();this.worldNodes.push(pulse)}
  // The audio clock keeps 16-beat boundaries stable when the audio context suspends.
  this.musicTimer=setInterval(()=>this.advanceHarmony(),100);
 }
 advanceHarmony(){
  if(!this.world)return;
  const secondsPerPhrase=16*60/80;
  const phrase=Math.floor((this.ctx.currentTime-this.epoch+.15)/secondsPerPhrase);
  if(phrase===this.phrase)return;
  this.phrase=phrase;
  const at=Math.max(this.ctx.currentTime,this.epoch+phrase*secondsPerPhrase);
  this.harmony.forEach(n=>this.fadeOut(n,at,1.7));
  this.harmony=this.world.chords[phrase%4].map((m,i)=>this.pad(fluxHz(m),i===0?.08:.055,at,2));
  this.harmony.push(this.pad(fluxHz(this.world.chords[phrase%4][0]-12),.12,at,2));
 }
 pad(frequency,gain,at=this.ctx.currentTime,attack=1.8){
  const n=this.source(this.world.sample+'-pad-c3',0,this.padBus,frequency/130.8128,true);
  n.g.gain.setValueAtTime(0,at);n.g.gain.linearRampToValueAtTime(gain,at+attack);
  n.o.start(at);this.worldNodes.push(n);return n;
 }
 fadeOut(node,at,duration){
  if(node.g.gain.cancelAndHoldAtTime)node.g.gain.cancelAndHoldAtTime(at);
  else{node.g.gain.cancelScheduledValues(at);node.g.gain.setValueAtTime(node.g.gain.value,at)}
  node.g.gain.linearRampToValueAtTime(0,at+duration);try{node.o.stop(at+duration+.02)}catch{}
 }
 addPad(index){this.pads.push(this.pad(this.notes[index],.20))}
 resetChord(){this.pads.splice(1).forEach(n=>this.fadeOut(n,this.ctx.currentTime,.65))}
 glass(frequency,duration,panStart=0,panEnd=panStart,target=this.master){
  const node=this.source('bloom-glass-c5',0,target,frequency/523.251),pan=this.ctx.createStereoPanner(),now=this.ctx.currentTime;
  node.g.disconnect();node.g.connect(pan);pan.connect(target);
  pan.pan.setValueAtTime(panStart,now);pan.pan.linearRampToValueAtTime(panEnd,now+duration);
  node.g.gain.setValueAtTime(.28,now);node.g.gain.linearRampToValueAtTime(.65,now+duration/2);node.g.gain.linearRampToValueAtTime(0,now+duration);
  node.o.start();node.o.stop(now+duration+.02);
  node.o.onended=()=>{node.o.disconnect();node.g.disconnect();pan.disconnect()};return node;
 }
 completion(){
  clearInterval(this.musicTimer);this.musicTimer=null;
  const now=this.ctx.currentTime;
  this.worldGain.gain.cancelScheduledValues(now);this.worldGain.gain.setTargetAtTime(.40,now,.08);
  // Seven ascending triad inversions, with the final chord ringing to three seconds.
  const hits=[0,.29,.58,.96,1.25,1.54,2.02];
  const root=this.world.root<45?this.world.root+12:this.world.root;
  this.fanfareNodes=[];
  let finish;
  const finished=new Promise(resolve=>{finish=resolve});
  hits.forEach((offset,hit)=>{
   for(let voice=0;voice<3;voice++){
    const degree=hit+voice,midi=root+this.world.triad[degree%3]+12*Math.floor(degree/3);
    const start=now+offset+voice*.009,end=now+(hit===6?3:offset+.41);
    const n=this.source('bloom-glass-c5',0,this.master,fluxHz(midi)/523.251);
    if(hit===6&&voice===2)n.o.onended=()=>{n.o.disconnect();n.g.disconnect();finish()};
    n.g.gain.setValueAtTime(0,start);n.g.gain.linearRampToValueAtTime(hit===6?.17:.14,start+.018);n.g.gain.exponentialRampToValueAtTime(.0001,end);
    n.o.start(start);n.o.stop(end);this.fanfareNodes.push(n);
   }
  });return finished;
 }
 async announce(name){
  if(this.voice){try{this.voice.o.stop()}catch{}}
  const node=this.source(name,.85,this.master);this.voice=node;this.worldGain.gain.setTargetAtTime(.26,this.ctx.currentTime,.035);
  return new Promise(resolve=>{
   node.o.onended=()=>{
    node.o.disconnect();node.g.disconnect();
    if(this.voice===node){this.voice=null;this.worldGain.gain.setTargetAtTime(1,this.ctx.currentTime,.2)}
    resolve();
   };node.o.start();
  });
 }
 lifePulses(count){
  const now=this.ctx.currentTime;
  for(let i=0;i<count;i++){
   const n=this.source('bloom-glass-c5',.5,this.master,count===1?.5:1);
   n.o.start(now+i*.29);n.o.stop(now+i*.29+.22);n.g.gain.setValueAtTime(.5,now+i*.29);n.g.gain.exponentialRampToValueAtTime(.001,now+i*.29+.21);
  }
 }
 stopWorld(){
  clearInterval(this.musicTimer);this.musicTimer=null;
  [...this.worldNodes,...this.fanfareNodes].forEach(n=>{try{n.o.stop()}catch{}});
  this.effects.forEach(n=>n.disconnect());
  this.worldNodes=[];this.pads=[];this.harmony=[];this.effects=[];this.fanfareNodes=[];this.world=null;
 }
}
