/* START geometric synthesis. Formula verified against TART simulation/antennas.py
   and imaging/calibration.py; independently implemented, tested with analytic sources. */
(function(root){
const RAD=Math.PI/180;
function direction(el,az){return [Math.sin(az*RAD)*Math.cos(el*RAD),Math.cos(az*RAD)*Math.cos(el*RAD),Math.sin(el*RAD)];}
function project(el,az,size=480){const s=direction(el,az),r=size*.43;return {x:size/2+s[0]*r,y:size/2-s[1]*r,visible:el>=0};}
function prepare(rows,positions,frequency,calibration,apply=true){
 const valid=rows.filter(v=>[positions?.[v.i],positions?.[v.j]].every(p=>Array.isArray(p)&&p.length>=3&&p.slice(0,3).every(Number.isFinite)));
 if(!valid.length||!Number.isFinite(frequency)||frequency<=0)return {rows:[],baselines:[],mode:'unavailable',signature:'none'};
 const g=calibration?.gain,p=calibration?.phase_offset;
 const calibrated=apply&&valid.every(v=>[v.i,v.j].every(i=>Number.isFinite(g?.[i])&&g[i]>=0&&Number.isFinite(p?.[i])));
 const flags=new Set((calibration?.flagged_baselines||[]).map(b=>b.slice().sort((a,b)=>a-b).join(',')));
 const processed=valid.filter(v=>!flags.has([v.i,v.j].sort((a,b)=>a-b).join(','))&&(!calibrated||(g[v.i]>0&&g[v.j]>0))).map(v=>{if(!calibrated)return {...v};const a=g[v.i]*g[v.j],phase=p[v.i]-p[v.j];return {...v,re:a*(v.re*Math.cos(phase)+v.im*Math.sin(phase)),im:a*(v.im*Math.cos(phase)-v.re*Math.sin(phase))};});
 const k=2*Math.PI*frequency/299792458;
 const baselines=processed.map(v=>({...v,x:(positions[v.i][0]-positions[v.j][0])*k,y:(positions[v.i][1]-positions[v.j][1])*k,z:(positions[v.i][2]-positions[v.j][2])*k}));
 return {rows:processed,baselines,mode:calibrated?'gain-phase':'raw',signature:JSON.stringify([calibrated?calibration:null,positions,frequency,processed.map(v=>[v.i,v.j])])};
}
function response(baselines,el,az){if(el<0||!baselines.length)return null;const s=direction(el,az);let sum=0,norm=0;for(const b of baselines){const phase=b.x*s[0]+b.y*s[1]+b.z*s[2];sum+=b.re*Math.cos(phase)+b.im*Math.sin(phase);norm+=Math.hypot(b.re,b.im);}return norm>0?{mean:sum/baselines.length,relative:sum/norm}:null;}
const api={direction,project,prepare,response};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StartScience=api;
})(typeof window!=='undefined'?window:globalThis);
