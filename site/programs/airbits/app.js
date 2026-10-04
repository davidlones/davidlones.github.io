(() => {
"use strict";

const F0=1200, F1=2200, VERSION=1, MAX_CHUNK=192, MAX_FILE_BYTES=MAX_CHUNK*0xFFFF;
const PREAMBLE=new Uint8Array(24).fill(0x55);
const SYNC=new Uint8Array([0xD3,0x91,0xA7,0x5C]);
const TYPE_MANIFEST=1, TYPE_CHUNK=2, TYPE_TEXT=3, TYPE_END=4;
const $=id=>document.getElementById(id);

const ui={
 status:$("statusPill"), message:$("message"), file:$("fileInput"), fileMeta:$("fileMeta"),
 siteSearch:$("siteSearch"), siteSelect:$("siteFileSelect"), siteMeta:$("siteFileMeta"),
 baud:$("baud"), volume:$("volume"), send:$("sendBtn"), stop:$("stopSendBtn"),
 preview:$("previewBtn"), airtime:$("airtime"), txProgress:$("txProgress"), txLabel:$("txLabel"),
 listen:$("listenBtn"), clear:$("clearBtn"), received:$("received"),
 rxProgress:$("rxProgress"), rxLabel:$("rxLabel"), rxPercent:$("rxPercent"),
 downloadCard:$("downloadCard"), downloadName:$("downloadName"), downloadMeta:$("downloadMeta"),
 downloadLink:$("downloadLink"), log:$("log"), scope:$("scope")
};

let activeTab="textPane", sendAbort=false, audioCtx=null, txSource=null, mediaStream=null, analyser=null, processor=null;
let sampleChunks=[], listening=false, drawId=null, receivedFrames=new Map(), currentManifest=null, siteFiles=[], filteredSiteFiles=[];

document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{
 document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
 document.querySelectorAll(".tabpane").forEach(x=>x.classList.remove("active"));
 btn.classList.add("active"); activeTab=btn.dataset.tab; $(activeTab).classList.add("active"); updateEstimate();
}));

function status(s){ui.status.textContent=s}
function log(s){ui.log.textContent+=`[${new Date().toLocaleTimeString()}] ${s}\n`;ui.log.scrollTop=ui.log.scrollHeight}
function concat(...parts){const n=parts.reduce((a,b)=>a+b.length,0),o=new Uint8Array(n);let p=0;for(const x of parts){o.set(x,p);p+=x.length}return o}
function u16(n){return new Uint8Array([(n>>>8)&255,n&255])}
function u32(n){return new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255])}
function readU16(a,p){return (a[p]<<8)|a[p+1]}
function readU32(a,p){return ((a[p]*0x1000000)+(a[p+1]<<16)+(a[p+2]<<8)+a[p+3])>>>0}
function crc16(bytes){let c=0xFFFF;for(const b of bytes){c^=b<<8;for(let i=0;i<8;i++){c=(c&0x8000)?((c<<1)^0x1021):(c<<1);c&=0xFFFF}}return c}
function frame(type,seq,total,payload){
 const body=concat(new Uint8Array([VERSION,type]),u16(seq),u16(total),u16(payload.length),payload);
 const c=crc16(body);return concat(PREAMBLE,SYNC,body,u16(c));
}
function fmtBytes(n){if(n<1024)return `${n} B`;if(n<1048576)return `${(n/1024).toFixed(1)} KB`;return `${(n/1048576).toFixed(2)} MB`}
async function sha256(bytes){const d=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}
function secondsForBytes(n){return ((PREAMBLE.length+SYNC.length+12+n)*8)/Number(ui.baud.value)}
function formatTime(sec){if(!isFinite(sec))return "—";if(sec<60)return `${sec.toFixed(1)} s`;const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=Math.round(sec%60);return h?`${h}h ${m}m`:`${m}m ${s}s`}
function basename(path){return path.split("/").pop()||"site-file.bin"}
function selectedSiteFile(){return filteredSiteFiles[ui.siteSelect.selectedIndex]||null}
function fileTooLargeMessage(file){return `${file.name||file.path} is ${fmtBytes(file.size)}. AirBits can broadcast up to ${fmtBytes(MAX_FILE_BYTES)} per transfer.`}

function renderSiteFiles(){
 const q=ui.siteSearch.value.trim().toLowerCase();
 filteredSiteFiles=siteFiles.filter(f=>!q||f.path.toLowerCase().includes(q)).slice(0,500);
 ui.siteSelect.innerHTML="";
 for(const file of filteredSiteFiles){
   const option=document.createElement("option");
   option.textContent=`${file.path} · ${fmtBytes(file.size)}`;
   ui.siteSelect.appendChild(option);
 }
 if(filteredSiteFiles.length)ui.siteSelect.selectedIndex=0;
 const shown=filteredSiteFiles.length, total=siteFiles.length;
 ui.siteMeta.textContent=total?`${shown} of ${total} site files shown. ${shown?"":"Try another filter."}`:"No site files found.";
 updateEstimate();
}

async function loadSiteFiles(){
 try{
   const res=await fetch("site-files.json",{cache:"no-store"});
   if(!res.ok)throw new Error(`site-files.json returned ${res.status}`);
   const data=await res.json();
   siteFiles=(data.files||[]).sort((a,b)=>a.path.localeCompare(b.path));
   renderSiteFiles();
 }catch(e){
   ui.siteMeta.textContent="Site file index unavailable.";
   log(`Site file index failed: ${e.message}`);
 }
}

async function readSourceBytes(source){
 if(source.kind==="local"){
   if(source.file.size>MAX_FILE_BYTES)throw new Error(fileTooLargeMessage(source.file));
   return new Uint8Array(await source.file.arrayBuffer());
 }
 if(source.size>MAX_FILE_BYTES)throw new Error(fileTooLargeMessage(source));
 const res=await fetch(source.url,{cache:"no-store"});
 if(!res.ok)throw new Error(`Could not fetch ${source.path}: HTTP ${res.status}`);
 return new Uint8Array(await res.arrayBuffer());
}

function transmissionSource(){
 if(activeTab==="filePane"){
   const file=ui.file.files[0]; if(!file)throw new Error("Choose a local file first.");
   return {kind:"local",name:file.name,type:file.type||"application/octet-stream",size:file.size,file};
 }
 const file=selectedSiteFile(); if(!file)throw new Error("Choose a site file first.");
 return {kind:"site",name:basename(file.path),type:file.type||"application/octet-stream",size:file.size,path:file.path,url:file.url};
}

async function buildTransmission(){
 if(activeTab==="textPane"){
   const payload=new TextEncoder().encode(ui.message.value);
   return {label:"text message",frames:[frame(TYPE_TEXT,0,1,payload)],size:payload.length};
 }
 const source=transmissionSource();
 const bytes=await readSourceBytes(source);
 const total=Math.ceil(bytes.length/MAX_CHUNK);
 if(total>0xFFFF)throw new Error(fileTooLargeMessage(source));
 const manifestObj={name:source.name,type:source.type,size:bytes.length,total,sha256:await sha256(bytes),source:source.kind==="site"?source.path:undefined};
 const manifest=new TextEncoder().encode(JSON.stringify(manifestObj));
 const frames=[frame(TYPE_MANIFEST,0,total,manifest)];
 for(let i=0;i<total;i++)frames.push(frame(TYPE_CHUNK,i,total,bytes.slice(i*MAX_CHUNK,(i+1)*MAX_CHUNK)));
 frames.push(frame(TYPE_END,total,total,new TextEncoder().encode(manifestObj.sha256)));
 return {label:source.kind==="site"?source.path:source.name,frames,size:bytes.length};
}

function updateEstimate(){
 if(activeTab==="textPane"){
   const n=new TextEncoder().encode(ui.message.value).length;
   ui.airtime.textContent=formatTime(secondsForBytes(n));
 }else if(activeTab==="filePane"){
   const f=ui.file.files[0];
   if(!f){ui.airtime.textContent="—";return}
   const total=Math.ceil(f.size/MAX_CHUNK);
   const rough=f.size+total*(PREAMBLE.length+SYNC.length+12)+600;
   ui.airtime.textContent=formatTime((rough*8)/Number(ui.baud.value));
 }else{
   const f=selectedSiteFile();
   if(!f){ui.airtime.textContent="—";return}
   const total=Math.ceil(f.size/MAX_CHUNK);
   const rough=f.size+total*(PREAMBLE.length+SYNC.length+12)+600;
   ui.airtime.textContent=f.size>MAX_FILE_BYTES?`Too large (${fmtBytes(f.size)})`:formatTime((rough*8)/Number(ui.baud.value));
   ui.siteMeta.textContent=`${f.path} · ${fmtBytes(f.size)} · ${f.type||"unknown type"}`;
 }
}

async function getAudio(){
 if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
 await audioCtx.resume();return audioCtx;
}

function synthFrame(bytes,ac){
 const baud=Number(ui.baud.value),rate=ac.sampleRate,spb=Math.max(1,Math.round(rate/baud));
 const buffer=ac.createBuffer(1,bytes.length*8*spb,rate),data=buffer.getChannelData(0);
 const volume=Number(ui.volume.value),ramp=Math.max(1,Math.min(Math.floor(spb*.15),Math.round(rate*.001)));
 let p=0,phase=0;
 for(const byte of bytes){
   for(let bit=7;bit>=0;bit--){
     const freq=(byte>>bit)&1?F1:F0,inc=2*Math.PI*freq/rate;
     for(let i=0;i<spb;i++){
       let env=1;
       if(i<ramp)env=i/ramp;else if(i>=spb-ramp)env=(spb-i-1)/ramp;
       data[p++]=Math.sin(phase)*volume*env;
       phase+=inc;if(phase>Math.PI*2)phase-=Math.PI*2;
     }
   }
 }
 return buffer;
}

async function playFrame(bytes,onProgress){
 if(sendAbort)return false;
 const ac=await getAudio(),buffer=synthFrame(bytes,ac),source=ac.createBufferSource();
 source.buffer=buffer;source.connect(ac.destination);txSource=source;
 await new Promise((resolve,reject)=>{
   let settled=false,timer=null,lastProgress=0,startAt=ac.currentTime+0.03;
   const finish=()=>{if(settled)return;settled=true;clearInterval(timer);if(txSource===source)txSource=null;onProgress(sendAbort?lastProgress:1);resolve()};
   source.onended=finish;
   timer=setInterval(()=>{
     const elapsed=Math.max(0,ac.currentTime-startAt);
     lastProgress=Math.min(1,elapsed/buffer.duration);
     onProgress(lastProgress);
     if(sendAbort){try{source.stop()}catch{}}
   },100);
   try{source.start(startAt)}catch(e){clearInterval(timer);reject(e)}
 });
 return !sendAbort;
}

ui.send.addEventListener("click",async()=>{
 try{
   sendAbort=false;ui.send.disabled=true;ui.stop.disabled=false;status("Preparing");
   const tx=await buildTransmission(),totalBytes=tx.frames.reduce((n,f)=>n+f.length,0);
   log(`Prepared ${tx.label}, ${fmtBytes(tx.size)}, ${tx.frames.length} frame(s).`);
   ui.txLabel.textContent=`Broadcasting ${tx.label}`;
   status("Transmitting");
   let sentBytes=0;
   for(let i=0;i<tx.frames.length&&!sendAbort;i++){
     const current=tx.frames[i];
     const completed=await playFrame(current,p=>{
       const overall=(sentBytes+(current.length*p))/totalBytes;
       ui.txProgress.value=overall;
       ui.txLabel.textContent=`Broadcasting ${Math.round(overall*100)}% · frame ${i+1}/${tx.frames.length}`;
     });
     if(!completed)break;
     sentBytes+=current.length;
   }
   status(sendAbort?"Stopped":"Complete");ui.txLabel.textContent=sendAbort?"Transmission stopped":"Transmission complete";
 }catch(e){status("Error");log(e.message);alert(e.message)}
 finally{ui.send.disabled=false;ui.stop.disabled=true}
});
ui.stop.addEventListener("click",()=>{sendAbort=true;if(txSource){try{txSource.stop()}catch{}}});
ui.preview.addEventListener("click",async()=>{sendAbort=false;await playFrame(concat(PREAMBLE,SYNC),p=>ui.txProgress.value=p)});
ui.file.addEventListener("change",()=>{const f=ui.file.files[0];ui.fileMeta.textContent=f?`${f.name} · ${fmtBytes(f.size)} · ${f.type||"unknown type"}`:"No file selected.";updateEstimate()});
ui.siteSearch.addEventListener("input",renderSiteFiles);ui.siteSelect.addEventListener("change",updateEstimate);
ui.message.addEventListener("input",updateEstimate);ui.baud.addEventListener("change",updateEstimate);

function goertzel(samples,start,len,freq,rate){
 const k=Math.round(.5+(len*freq/rate)),w=2*Math.PI*k/len,coeff=2*Math.cos(w);let q0=0,q1=0,q2=0;
 for(let i=0;i<len;i++){q0=coeff*q1-q2+samples[start+i];q2=q1;q1=q0}
 return q1*q1+q2*q2-coeff*q1*q2;
}
function flatten(chunks){const n=chunks.reduce((a,b)=>a+b.length,0),o=new Float32Array(n);let p=0;for(const c of chunks){o.set(c,p);p+=c.length}return o}
function bitsToBytes(bits){const n=Math.floor(bits.length/8),o=new Uint8Array(n);for(let i=0;i<n;i++){let v=0;for(let j=0;j<8;j++)v=(v<<1)|bits[i*8+j];o[i]=v}return o}
function findSync(bytes){for(let i=0;i<=bytes.length-SYNC.length;i++){let ok=true;for(let j=0;j<SYNC.length;j++)if(bytes[i+j]!==SYNC[j]){ok=false;break}if(ok)return i}return -1}
async function processFrame(type,seq,total,payload){
 if(type===TYPE_TEXT){ui.received.value=new TextDecoder().decode(payload);log("Text message received.");return}
 if(type===TYPE_MANIFEST){
   currentManifest=JSON.parse(new TextDecoder().decode(payload));receivedFrames=new Map();
   ui.rxLabel.textContent=`Receiving ${currentManifest.name}`;log(`Manifest: ${currentManifest.name}, ${fmtBytes(currentManifest.size)}, ${currentManifest.total} chunks.`);return;
 }
 if(type===TYPE_CHUNK){
   receivedFrames.set(seq,payload);const p=currentManifest?receivedFrames.size/currentManifest.total:0;
   ui.rxProgress.value=p;ui.rxPercent.textContent=`${Math.round(p*100)}%`;return;
 }
 if(type===TYPE_END&&currentManifest){
   if(receivedFrames.size!==currentManifest.total){log(`Incomplete: ${receivedFrames.size}/${currentManifest.total} chunks.`);return}
   const ordered=[];for(let i=0;i<currentManifest.total;i++)ordered.push(receivedFrames.get(i));
   const data=concat(...ordered).slice(0,currentManifest.size),hash=await sha256(data);
   if(hash!==currentManifest.sha256){log("Whole-file SHA-256 check failed.");return}
   const blob=new Blob([data],{type:currentManifest.type}),url=URL.createObjectURL(blob);
   ui.downloadLink.href=url;ui.downloadLink.download=currentManifest.name;ui.downloadName.textContent=currentManifest.name;
   ui.downloadMeta.textContent=`${fmtBytes(data.length)} · verified SHA-256`;ui.downloadCard.classList.remove("hidden");
   ui.rxProgress.value=1;ui.rxPercent.textContent="100%";ui.rxLabel.textContent="File complete";status("Received");log("File verified and ready to save.");
 }
}

async function decodeCaptured(){
 const samples=flatten(sampleChunks),rate=audioCtx.sampleRate,baud=Number(ui.baud.value),spb=Math.round(rate/baud);
 log(`Decoding ${(samples.length/rate).toFixed(1)} seconds at ${rate} Hz.`);
 let best=null;
 for(let offset=0;offset<spb;offset+=Math.max(1,Math.floor(spb/12))){
   const bits=[];for(let p=offset;p+spb<=samples.length;p+=spb)bits.push(goertzel(samples,p,spb,F1,rate)>goertzel(samples,p,spb,F0,rate)?1:0);
   const bytes=bitsToBytes(bits),idx=findSync(bytes);if(idx>=0){best={bytes,idx};break}
 }
 if(!best){log("No sync word found. Try higher volume, less distance, or 50 baud.");return}
 let p=best.idx+SYNC.length;
 while(p+10<=best.bytes.length){
   const version=best.bytes[p],type=best.bytes[p+1],seq=readU16(best.bytes,p+2),total=readU16(best.bytes,p+4),len=readU16(best.bytes,p+6);
   if(version!==VERSION||p+10+len>best.bytes.length)break;
   const body=best.bytes.slice(p,p+8+len),payload=best.bytes.slice(p+8,p+8+len),got=readU16(best.bytes,p+8+len);
   if(crc16(body)===got)await processFrame(type,seq,total,payload);else log(`CRC failure on frame ${seq}.`);
   p+=10+len;
   const next=findSync(best.bytes.slice(p));if(next<0)break;p+=next+SYNC.length;
 }
}

function draw(){
 if(!analyser)return;const data=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(data);
 const c=ui.scope.getContext("2d"),w=ui.scope.width,h=ui.scope.height;c.clearRect(0,0,w,h);c.beginPath();
 for(let i=0;i<data.length;i++){const x=i/(data.length-1)*w,y=data[i]/255*h;i?c.lineTo(x,y):c.moveTo(x,y)}
 c.strokeStyle="#7dd3fc";c.lineWidth=2;c.stroke();drawId=requestAnimationFrame(draw);
}

ui.listen.addEventListener("click",async()=>{
 if(!listening){
   try{
     const ac=await getAudio();mediaStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
     const src=ac.createMediaStreamSource(mediaStream);analyser=ac.createAnalyser();analyser.fftSize=2048;src.connect(analyser);
     processor=ac.createScriptProcessor(4096,1,1);sampleChunks=[];processor.onaudioprocess=e=>sampleChunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
     src.connect(processor);processor.connect(ac.destination);listening=true;ui.listen.textContent="Stop and decode";status("Listening");draw();log("Microphone capture started.");
   }catch(e){log(e.message);alert("Microphone access failed. This requires HTTPS or localhost.")}
 }else{
   listening=false;ui.listen.textContent="Start listening";mediaStream?.getTracks().forEach(t=>t.stop());processor?.disconnect();cancelAnimationFrame(drawId);status("Decoding");await decodeCaptured();status("Idle");
 }
});

ui.clear.addEventListener("click",()=>{
 ui.received.value="";ui.log.textContent="";ui.rxProgress.value=0;ui.rxPercent.textContent="0%";ui.rxLabel.textContent="Waiting for transmission";
 ui.downloadCard.classList.add("hidden");receivedFrames=new Map();currentManifest=null;
});
loadSiteFiles();
updateEstimate();
})();
