import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {connectMcp} from './client.js';
import {loadModel} from '../world-model/index.js';
const {client,call}=await connectMcp();
const report:any={at:new Date().toISOString(),status:'RUNNING',profile:'standing player; four-neighbor walking; solid full blocks, two-air-block clearance; no jump/collision-shape simulation',checks:[],distances:{},manualPlaytest:'NOT_RUN',screenshots:'NOT_CAPTURED'};
const cells=new Map<string,string>();
const key=(x:number,z:number)=>`${x},${z}`;
try{
  const model=await loadModel();
  for(let x=64;x<=159;x+=16)for(let z=0;z<=143;z+=16){
    const result=await call('world.get_blocks',{bounds:{min:[x,100,z],max:[x+15,102,z+15]}});
    for(const [p,s] of Object.entries(result.blocks))cells.set(p,s as string);
  }
  const walkable=(x:number,z:number)=>{const floor=cells.get(`${x},100,${z}`);return !!floor&&floor!=='minecraft:air'&&cells.get(`${x},101,${z}`)==='minecraft:air'&&cells.get(`${x},102,${z}`)==='minecraft:air';};
  function bfs(start:[number,number],blocked?:string){
    const region=model.regions.find(r=>r.id===blocked);
    const denied=(x:number,z:number)=>region&&x>=region.bounds.min[0]&&x<=region.bounds.max[0]&&z>=region.bounds.min[2]&&z<=region.bounds.max[2];
    const dist=new Map([[key(...start),0]]),queue=[start];
    for(let i=0;i<queue.length;i++){const [x,z]=queue[i];for(const [nx,nz] of [[x+1,z],[x-1,z],[x,z+1],[x,z-1]])if(walkable(nx,nz)&&!denied(nx,nz)&&!dist.has(key(nx,nz))){dist.set(key(nx,nz),dist.get(key(x,z))!+1);queue.push([nx,nz]);}}
    return dist;
  }
  assert.ok(walkable(107,130));assert.ok(walkable(109,37));report.checks.push('start spawn and checkpoint have solid footing and two-block clearance');
  const reachable=bfs([107,130]);
  const targets:Record<string,[number,number]>={'village.gate':[107,130],'village.square':[109,83],'village.survivor_house':[80,83],'village.blacksmith':[139,83],'village.church':[75,111],'mine.road':[110,55],'mine.entrance':[109,33],'mine.chamber':[109,13]};
  for(const [id,p] of Object.entries(targets)){assert.ok(reachable.has(key(...p)),`Unreachable ${id}`);report.distances[id]=reachable.get(key(...p));}report.checks.push('all eight canonical locations reachable on actual world geometry');
  for(const region of ['mine.road','mine.entrance'])assert.ok(!bfs([107,130],region).has(key(109,13)),`Mandatory trigger bypass ${region}`);report.checks.push('road and mine entrance are mandatory on the walking path to the boss');
  report.checkpointToBoss=bfs([109,37]).get(key(109,13));assert.ok(report.checkpointToBoss<=80);report.checks.push('checkpoint to boss walk is at most 80 blocks');
  report.canonicalProgression=await call('gameplay.run_self_test');assert.equal(report.canonicalProgression.status,'PASS');
  report.runtime=await call('gameplay.get_state');report.status='PASS';
  const scale=4,svgRegions=model.regions.map(r=>`<rect x="${r.bounds.min[0]*scale}" y="${r.bounds.min[2]*scale}" width="${(r.bounds.max[0]-r.bounds.min[0]+1)*scale}" height="${(r.bounds.max[2]-r.bounds.min[2]+1)*scale}" fill="#203b3a" stroke="#79b4a8"/><text x="${r.bounds.min[0]*scale+3}" y="${r.bounds.min[2]*scale+14}" fill="#e1eeee" font-size="9">${r.id}</text>`).join('');
  const paths=model.routes.map(r=>`<polyline points="${r.points.map(p=>`${p[0]*scale},${p[2]*scale}`).join(' ')}" fill="none" stroke="#e4ae65" stroke-width="3"/>`).join('');
  await writeFile('reports/village-qa.html',`<!doctype html><html lang="hr"><meta charset="utf-8"><title>The Village Below — QA</title><style>body{background:#101917;color:#e1eeee;font:16px system-ui;max-width:1040px;margin:40px auto;padding:0 24px}h1{font-size:36px}svg{width:100%;max-height:650px}small{color:#a4b7af}li{margin:10px 0}</style><h1>The Village Below</h1><p>Stvarna geometrijska provjera: ${report.status}. Osam lokacija je povezano. Checkpoint → boss: ${report.checkpointToBoss} blokova.</p><small>Semantički tlocrt; ovo nije Minecraft screenshot. Ručni playtest i vizualni pregled nisu provedeni.</small><svg viewBox="240 0 400 560">${svgRegions}${paths}</svg><ul>${report.checks.map((c:string)=>`<li>${c}</li>`).join('')}</ul><p>Profil: ${report.profile}</p></html>`);
  console.log(`PASS village QA: 8 reachable locations; mandatory route triggers; checkpoint to boss ${report.checkpointToBoss} blocks`);
}catch(e){report.status='FAIL';report.error=String(e);throw e;}
finally{await writeFile('reports/village-qa.json',JSON.stringify(report,null,2));await client.close();}
