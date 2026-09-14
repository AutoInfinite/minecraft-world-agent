import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {connectMcp} from './client.js';
import {loadModel,validateModel} from '../world-model/index.js';
import {THREE_OH_SEVEN_CHECKPOINTS} from '../build-primitives/three-oh-seven.js';

const {client,call}=await connectMcp();
const report:any={at:new Date().toISOString(),status:'RUNNING',map:'three-oh-seven',targetMinutes:10,manualPlaytest:'NOT_RUN',screenshots:'NOT_CAPTURED',checks:[],checkpointResults:[],profile:'actual block reads; full-block exterior BFS; authored stair-state continuity; no renderer or collision-shape simulation'};
const base=(state:string)=>state.split('[',1)[0],cells=new Map<string,string>(),key=(x:number,z:number)=>`${x},${z}`;
try{
  const model=await loadModel('three-oh-seven'),validation=validateModel(model);assert.deepEqual(validation.errors,[]);report.model={regions:model.regions.length,routes:model.routes.length,warnings:validation.warnings};
  for(const [x,y,z] of THREE_OH_SEVEN_CHECKPOINTS){
    const blocks=(await call('world.get_blocks',{bounds:{min:[x,y,z],max:[x,y+2,z]}})).blocks;
    const result={position:[x,y,z],floor:base(blocks[`${x},${y},${z}`]),feet:base(blocks[`${x},${y+1},${z}`]),head:base(blocks[`${x},${y+2},${z}`])};report.checkpointResults.push(result);
  }
  const failed=report.checkpointResults.filter((p:any)=>p.floor==='minecraft:air'||p.feet!=='minecraft:air'||p.head!=='minecraft:air');assert.deepEqual(failed,[],`blocked checkpoints: ${JSON.stringify(failed)}`);report.checks.push(`${THREE_OH_SEVEN_CHECKPOINTS.length} story checkpoints have footing and two-block clearance`);
  for(let x=176;x<=239;x+=16)for(let z=88;z<=135;z+=16){const maxX=Math.min(239,x+15),maxZ=Math.min(135,z+15),result=await call('world.get_blocks',{bounds:{min:[x,100,z],max:[maxX,102,maxZ]}});for(const [position,state] of Object.entries(result.blocks))cells.set(position,state as string);}
  const walkable=(x:number,z:number)=>base(cells.get(`${x},100,${z}`)??'minecraft:air')!=='minecraft:air'&&base(cells.get(`${x},101,${z}`)??'minecraft:air')==='minecraft:air'&&base(cells.get(`${x},102,${z}`)??'minecraft:air')==='minecraft:air';
  const start:[number,number]=[196,112],dist=new Map([[key(...start),0]]),queue=[start];
  for(let i=0;i<queue.length;i++){const [x,z]=queue[i];for(const [nx,nz] of [[x+1,z],[x-1,z],[x,z+1],[x,z-1]])if(nx>=176&&nx<=239&&nz>=88&&nz<=135&&walkable(nx,nz)&&!dist.has(key(nx,nz))){dist.set(key(nx,nz),dist.get(key(x,z))!+1);queue.push([nx,nz]);}}
  const exteriorTargets:Record<string,[number,number]>={courtyard:[205,112],street:[221,112],phone:[228,103],playground:[234,128],alley:[207,128],return:[196,124]};
  report.exteriorDistances={};for(const [id,point] of Object.entries(exteriorTargets)){assert.ok(dist.has(key(...point)),`unreachable exterior target ${id}`);report.exteriorDistances[id]=dist.get(key(...point));}report.checks.push('courtyard, street, phone, playground, alley and return door share one actual walkable exterior route');
  const stair=[];for(let i=0;i<10;i++){const x=180,y=101+i,z=113-i,blocks=(await call('world.get_blocks',{bounds:{min:[x,y,z],max:[x,y+2,z]}})).blocks;stair.push({position:[x,y,z],step:base(blocks[`${x},${y},${z}`]),above:base(blocks[`${x},${y+1},${z}`]),head:base(blocks[`${x},${y+2},${z}`])});}
  report.stair=stair;assert.ok(stair.every((s:any)=>s.step==='minecraft:stone_brick_stairs'),`missing stair states: ${JSON.stringify(stair.filter((s:any)=>s.step!=='minecraft:stone_brick_stairs'))}`);assert.ok(stair.every((s:any)=>s.above==='minecraft:air'&&s.head==='minecraft:air'),`blocked stair headroom: ${JSON.stringify(stair.filter((s:any)=>s.above!=='minecraft:air'||s.head!=='minecraft:air'))}`);report.checks.push('all ten stair elevations exist with two-block vertical clearance');
  report.runtime=await call('gameplay.get_state');report.status='PASS';console.log(`PASS 3:07 QA: ${model.regions.length} regions, ${THREE_OH_SEVEN_CHECKPOINTS.length} clear checkpoints, ${dist.size} walkable exterior cells`);
}catch(error){report.status='FAIL';report.error=String(error);throw error;}
finally{await writeFile('reports/three-oh-seven-qa.json',JSON.stringify(report,null,2));await client.close();}
