import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {connectMcp} from './client.js';
import {library,place,fill,type Module} from '../build-primitives/modules.js';
import {loadModel,exportModel} from '../world-model/index.js';
import {type Fill} from '../build-primitives/index.js';
import type {Bounds} from '../tool-schemas/index.js';
const {client,call:rawCall}=await connectMcp();
const call=(name:string,args:Record<string,unknown>={})=>rawCall(name,{...args,actor:'village-builder',prompt:'Build authorized first mining-village geometry pass and reconcile every generated block'});
const evidence:any={at:new Date().toISOString(),status:'RUNNING',changes:[],checks:[],limitations:['No visual review or human playtest','Paths and structures are a first geometry pass; no organic surrounding terrain']};
function expected(fills:Fill[]){const states:Record<string,string>={};for(const f of fills)for(let x=f.bounds.min[0];x<=f.bounds.max[0];x++)for(let y=f.bounds.min[1];y<=f.bounds.max[1];y++)for(let z=f.bounds.min[2];z<=f.bounds.max[2];z++)states[`${x},${y},${z}`]=f.block;return states;}
function matches(block:string,material:string){return block.split('[')[0]===material;}
async function build(name:string,bounds:Bounds,fills:Fill[]){
  const before=await call('world.get_blocks',{bounds});const planned=expected(fills);
  if(Object.entries(planned).every(([p,m])=>matches(before.blocks[p],m))){console.log(`Already matches ${name}`);return;}
  if(Object.values(before.blocks).some(v=>v!=='minecraft:air'))throw new Error(`Region ${name} contains existing work; use recorded undo before rebuilding`);
  const tx=await call('build.begin_transaction',{name,bounds});
  for(const f of fills)await call('build.fill_region',{transactionId:tx.transactionId,...f});
  const dry=await call('build.dry_run',{transactionId:tx.transactionId});assert.equal((await call('world.get_blocks',{bounds})).checksum,before.checksum);
  await call('build.commit_transaction',{transactionId:tx.transactionId,previewHash:dry.previewHash});
  const after=await call('world.get_blocks',{bounds});for(const [p,m] of Object.entries(planned))assert.ok(matches(after.blocks[p],m),`${name}: ${p}`);
  evidence.changes.push({name,transactionId:tx.transactionId,changedBlocks:dry.changedBlocks,bounds,checksum:after.checksum});console.log(`PASS built and reconciled ${name}: ${dry.changedBlocks} blocks`);
}
try{
  const model=await loadModel();evidence.model=await exportModel();const modules=library();
  await mkdir('projects/abandoned-mine/structures',{recursive:true});
  for(const module of modules)await writeFile(`projects/abandoned-mine/structures/${module.id}.json`,JSON.stringify(module,null,2));
  // A real rotated/mirrored module is staged via the higher-level MCP tool, then undone.
  const testOrigin:[number,number,number]=[40,100,0],testModule=modules.find(m=>m.id==='timber-bridge')!;
  const testPlan=place(testModule,testOrigin,90,true),initial=await call('world.get_blocks',{bounds:testPlan.bounds});
  const p=await call('build.place_structure',{structureId:'timber-bridge',origin:testOrigin,rotation:90,mirror:true,seed:20260914});
  assert.equal((await call('world.get_blocks',{bounds:testPlan.bounds})).checksum,initial.checksum);
  await call('build.commit_transaction',{transactionId:p.transactionId,previewHash:p.previewHash});
  const actual=await call('world.get_blocks',{bounds:testPlan.bounds});for(const [k,v] of Object.entries(expected(testPlan.fills)))assert.ok(matches(actual.blocks[k],v));
  await call('build.undo',{transactionId:p.transactionId});assert.equal((await call('world.get_blocks',{bounds:testPlan.bounds})).checksum,initial.checksum);evidence.checks.push('rotated mirrored module through higher-level MCP, reconciliation and exact undo');
  for(const region of model.regions){if(!region.module)continue;const m=modules.find(m=>m.id===region.module)!;const plan=place(m,region.origin!,region.rotation);await build(region.id,plan.bounds,plan.fills);}
  // Build connector segments, including overlap with existing platforms, as guarded transactions.
  for(const route of model.routes)for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i];const bounds:Bounds={min:[Math.min(a[0],b[0])-2,100,Math.min(a[2],b[2])-2],max:[Math.max(a[0],b[0])+2,100,Math.max(a[2],b[2])+2]};
    const tx=await call('build.begin_transaction',{name:`route:${route.id}:${i}`,bounds});await call('build.fill_region',{transactionId:tx.transactionId,bounds,block:'minecraft:cobblestone'});const dry=await call('build.dry_run',{transactionId:tx.transactionId});await call('build.commit_transaction',{transactionId:tx.transactionId,previewHash:dry.previewHash});evidence.changes.push({name:`route:${route.id}:${i}`,transactionId:tx.transactionId,changedBlocks:dry.changedBlocks,bounds});
  }
  const well=place(modules.find(m=>m.id==='dry-well')!,[111,100,85]);
  const tx=await call('build.begin_transaction',{name:'square:dry-well',bounds:well.bounds});for(const f of well.fills)await call('build.fill_region',{transactionId:tx.transactionId,...f});const dry=await call('build.dry_run',{transactionId:tx.transactionId});await call('build.commit_transaction',{transactionId:tx.transactionId,previewHash:dry.previewHash});evidence.changes.push({name:'square:dry-well',transactionId:tx.transactionId,changedBlocks:dry.changedBlocks,bounds:well.bounds});
  const query=await call('map.query_regions',{bounds:{min:[110,101,80],max:[110,101,80]}});assert.equal(query[0].id,'village.square');
  assert.equal((await call('map.get_region',{regionId:'mine.entrance'})).role,'checkpoint');evidence.checks.push('MCP semantic lookup and SQLite spatial query match canonical IDs');
  // Sample every route center point with real two-block clearance and solid footing.
  for(const route of model.routes)for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i],steps=Math.max(...a.map((n,j)=>Math.abs(n-b[j])));
    for(let n=0;n<=steps;n++){
      const p=a.map((v,j)=>v+(b[j]-v)*(steps===0?0:n/steps)) as [number,number,number];const bnd:Bounds={min:p,max:[p[0],p[1]+2,p[2]]};const blocks=(await call('world.get_blocks',{bounds:bnd})).blocks;
      assert.notEqual(blocks[p.join(',')],'minecraft:air',`footing ${route.id} ${p}`);
      for(const dy of [1,2])assert.equal(blocks[`${p[0]},${p[1]+dy},${p[2]}`],'minecraft:air',`clearance ${route.id} ${p}`);
    }
  }evidence.checks.push('every route center has solid footing and two-block head clearance in actual world');
  evidence.moduleLibrary={count:modules.length,checksum:createHash('sha256').update(JSON.stringify(modules)).digest('hex')};evidence.status='PASS';
}catch(e){evidence.status='FAIL';evidence.error=String(e);throw e;}
finally{await writeFile('reports/village-build.json',JSON.stringify(evidence,null,2));await client.close();}
