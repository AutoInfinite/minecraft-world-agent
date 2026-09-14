import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {connectMcp} from './client.js';
import {library,place,type Module} from '../build-primitives/modules.js';
import {detailPass} from '../build-primitives/detail.js';
import {loadModel} from '../world-model/index.js';
import type {Fill} from '../build-primitives/index.js';

const {client,call:rawCall}=await connectMcp();
const call=(name:string,args:Record<string,unknown>={})=>rawCall(name,{...args,actor:'village-art-director',prompt:'Apply the authorized deterministic texture and architectural detail pass to the playable village'});
const evidence:any={at:new Date().toISOString(),status:'RUNNING',style:'abandoned mining village: layered stone foundations, exposed timber frames, readable silhouettes, practical interiors, warm wayfinding light, restrained decay',buildings:[],checks:[],limitations:['Automated block reconciliation is complete; renderer screenshots and human visual review remain separate']};

function material(state:string){return state.split('[')[0];}
function finalState(fills:Fill[]){
  const result=new Map<string,string>();
  for(const f of fills)for(let x=f.bounds.min[0];x<=f.bounds.max[0];x++)for(let y=f.bounds.min[1];y<=f.bounds.max[1];y++)for(let z=f.bounds.min[2];z<=f.bounds.max[2];z++)result.set(`${x},${y},${z}`,f.block);
  return result;
}
function textureRules(module:Module){
  const common=[{from:'minecraft:cobblestone',to:'minecraft:mossy_cobblestone',percent:9,seed:module.seed+11}];
  if(['miner-house','survivor-house','blacksmith','church'].includes(module.id))common.push({from:'minecraft:spruce_planks',to:'minecraft:dark_oak_planks',percent:12,seed:module.seed+23});
  if(['mine-tunnel','boss-chamber'].includes(module.id))common.push({from:'minecraft:deepslate_bricks',to:'minecraft:cracked_deepslate_bricks',percent:11,seed:module.seed+37});
  return common;
}

try{
  const model=await loadModel(),modules=library();
  await mkdir('projects/abandoned-mine/structures',{recursive:true});
  for(const region of model.regions){
    if(!region.module)continue;
    const module=modules.find(m=>m.id===region.module);if(!module)throw new Error(`Missing module ${region.module}`);
    const details=detailPass(module);if(!details.length)continue;
    const recipe={...module,fills:details};
    await writeFile(`projects/abandoned-mine/structures/${module.id}.detail.json`,JSON.stringify({schemaVersion:1,style:evidence.style,...recipe},null,2));
    const plan=place(recipe,region.origin!,region.rotation);
    const before=await call('world.get_blocks',{bounds:plan.bounds});
    const expected=finalState(plan.fills);
    if([...expected].every(([position,block])=>material(before.blocks[position])===block)){
      evidence.buildings.push({region:region.id,module:module.id,status:'ALREADY_RECONCILED',changedBlocks:0,detailOperations:plan.fills.length,texturePasses:[],detailPalette:[...new Set(plan.fills.map(f=>f.block))],bounds:plan.bounds,checksum:before.checksum});
      console.log(`PASS ${region.id}: existing detail reconciled`);continue;
    }
    const tx=await call('build.begin_transaction',{name:`detail:${region.id}`,bounds:plan.bounds});
    for(const rule of textureRules(module))await call('build.replace_palette',{transactionId:tx.transactionId,bounds:plan.bounds,...rule});
    for(const fill of plan.fills)await call('build.fill_region',{transactionId:tx.transactionId,...fill});
    const dry=await call('build.dry_run',{transactionId:tx.transactionId});
    assert.equal((await call('world.get_blocks',{bounds:plan.bounds})).checksum,before.checksum,`${region.id} dry-run mutated world`);
    await call('build.commit_transaction',{transactionId:tx.transactionId,previewHash:dry.previewHash});
    const after=await call('world.get_blocks',{bounds:plan.bounds});
    for(const [position,block] of expected)assert.equal(material(after.blocks[position]),block,`${region.id} ${position}`);
    const palette=[...new Set(plan.fills.map(f=>f.block))];assert.ok(palette.length>=4);
    evidence.buildings.push({region:region.id,module:module.id,transactionId:tx.transactionId,changedBlocks:dry.changedBlocks,detailOperations:plan.fills.length,texturePasses:textureRules(module),detailPalette:palette,bounds:plan.bounds,checksum:after.checksum});
    console.log(`PASS ${region.id}: ${dry.changedBlocks} changed blocks, ${palette.length} detail materials`);
  }
  const expectedCount=model.regions.filter(r=>r.module&&detailPass(modules.find(m=>m.id===r.module)!).length>0).length;
  assert.equal(evidence.buildings.length,expectedCount);
  evidence.checks.push(`${expectedCount} playable locations received module-specific architectural detail`);
  evidence.checks.push('every final detail coordinate reconciled against the live Paper world');
  evidence.checks.push('all edits used staged transactions, unchanged dry-runs and explicit preview hashes');
  evidence.libraryChecksum=createHash('sha256').update(JSON.stringify(modules.map(m=>({id:m.id,detail:detailPass(m)})))).digest('hex');
  evidence.status='PASS';
}catch(error){evidence.status='FAIL';evidence.error=String(error);throw error;}
finally{await writeFile('reports/village-polish.json',JSON.stringify(evidence,null,2));await client.close();}
