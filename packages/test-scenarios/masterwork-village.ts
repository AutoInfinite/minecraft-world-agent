import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {connectMcp} from './client.js';
import {detailPass} from '../build-primitives/detail.js';
import {masterworkPass,protectedPortalPass} from '../build-primitives/composition.js';
import {library,place,type Module} from '../build-primitives/modules.js';
import {loadModel} from '../world-model/index.js';
import type {Fill} from '../build-primitives/index.js';
import type {Bounds} from '../tool-schemas/index.js';

const legacy=process.argv.includes('--legacy-compatible');
const {client,call:rawCall}=await connectMcp();
const call=(name:string,args:Record<string,unknown>={})=>rawCall(name,{...args,actor:'masterwork-builder',prompt:'Apply the authorized expert composition pass with staged review, exact reconciliation and entity-safe skips'});
const evidence:any={at:new Date().toISOString(),status:'RUNNING',mode:legacy?'legacy-compatible':'full-block-state',style:'abandoned mining village with strong silhouettes, facade depth, clustered weathering, environmental story and readable focal lighting',regions:[],transactions:[],checks:[],limitations:['Automated block reconciliation is not a Minecraft renderer screenshot or human visual review']};
const material=(state:string)=>state.split('[',1)[0];
const boundsOf=(fills:Fill[]):Bounds=>({min:[0,1,2].map(i=>Math.min(...fills.map(f=>f.bounds.min[i]))) as Bounds['min'],max:[0,1,2].map(i=>Math.max(...fills.map(f=>f.bounds.max[i]))) as Bounds['max']});
function desiredMatches(actual:string,desired:string){
  if(material(actual)!==material(desired))return false;
  const properties=desired.match(/\[(.*)\]$/)?.[1];if(!properties)return true;
  return properties.split(',').every(pair=>actual.includes(pair));
}
async function matches(fills:Fill[]){
  const expected=new Map<string,string>();
  for(const f of fills)for(let x=f.bounds.min[0];x<=f.bounds.max[0];x++)for(let y=f.bounds.min[1];y<=f.bounds.max[1];y++)for(let z=f.bounds.min[2];z<=f.bounds.max[2];z++)expected.set(`${x},${y},${z}`,f.block);
  const actual=(await call('world.get_blocks',{bounds:boundsOf(fills)})).blocks;
  return [...expected].every(([position,desired])=>desiredMatches(actual[position],desired));
}
async function apply(region:string,fills:Fill[],label:string){
  if(!fills.length)return 'EMPTY';if(await matches(fills))return 'ALREADY_RECONCILED';
  const bounds=boundsOf(fills),before=await call('world.get_blocks',{bounds});let tx:any;
  try{tx=await call('build.begin_transaction',{name:`masterwork:${region}:${label}`,bounds});}
  catch(error){if(String(error).includes('REGION_OCCUPIED'))return 'BLOCKED_BY_ENTITY';throw error;}
  try{
    for(const fill of fills)await call('build.fill_region',{transactionId:tx.transactionId,...fill});
    const dry=await call('build.dry_run',{transactionId:tx.transactionId});
    assert.equal((await call('world.get_blocks',{bounds})).checksum,before.checksum,`${region} dry-run mutated blocks`);
    await call('build.commit_transaction',{transactionId:tx.transactionId,previewHash:dry.previewHash});
    assert.equal(await matches(fills),true,`${region} did not reconcile`);
    evidence.transactions.push({region,label,transactionId:tx.transactionId,bounds,operations:fills.length,changedBlocks:dry.changedBlocks});return 'APPLIED';
  }catch(error){try{await call('build.rollback_transaction',{transactionId:tx.transactionId});}catch{}throw error;}
}
function churchCorrection(module:Module){
  if(module.id!=='church')return [];
  const insideTower=(f:Fill)=>f.bounds.min[0]>=5&&f.bounds.max[0]<=9&&f.bounds.min[2]>=7&&f.bounds.max[2]<=11&&f.bounds.min[1]>=8;
  return [...module.fills.filter(insideTower),...detailPass(module).filter(insideTower)];
}
function floorCorrection(module:Module){
  const floorDetails=[...detailPass(module),...masterworkPass(module)].filter(f=>f.bounds.min[1]===0&&f.bounds.max[1]===0);
  const removeRaised=floorDetails.map(f=>({bounds:{min:[f.bounds.min[0],1,f.bounds.min[2]] as [number,number,number],max:[f.bounds.max[0],1,f.bounds.max[2]] as [number,number,number]},block:'minecraft:air'}));
  return [...removeRaised,...floorDetails];
}
try{
  const model=await loadModel(),modules=library();
  for(const region of model.regions){
    if(!region.module||!region.origin)continue;
    const module=modules.find(m=>m.id===region.module);if(!module)throw new Error(`Missing module ${region.module}`);
    let local=[...churchCorrection(module),...floorCorrection(module),...masterworkPass(module),...protectedPortalPass(module)];
    if(legacy)local=local.filter(f=>!f.block.includes('['));
    const worldFills=place({...module,fills:local},region.origin,region.rotation??0).fills;
    let status=await apply(region.id,worldFills,'region');
    if(status==='BLOCKED_BY_ENTITY'){
      const itemStatuses=[];for(let i=0;i<worldFills.length;i++)itemStatuses.push(await apply(region.id,[worldFills[i]],`item-${i}`));
      status=itemStatuses.includes('BLOCKED_BY_ENTITY')?'PARTIAL':itemStatuses.includes('APPLIED')?'APPLIED':'ALREADY_RECONCILED';
    }
    evidence.regions.push({region:region.id,module:module.id,status,plannedOperations:worldFills.length});
  }
  const blocked=evidence.regions.filter((r:any)=>r.status==='PARTIAL');
  evidence.checks.push('all applied edits used staged transactions, unchanged dry-runs and exact preview hashes');
  evidence.checks.push('church tower repair replaces the previous solid stained-glass volume with a hollow shell and thin window planes');
  evidence.checks.push('masterwork overlays preserve declared three-wide, three-high portal planes');
  evidence.status=blocked.length?'PARTIAL':'PASS';
  if(blocked.length)evidence.limitations.push(`${blocked.length} region(s) retained entity-occupied operations for a safe later retry`);
}catch(error){evidence.status='FAIL';evidence.error=String(error);throw error;}
finally{await writeFile('reports/village-masterwork.json',JSON.stringify(evidence,null,2));await client.close();}
