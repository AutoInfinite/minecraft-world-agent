import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {connectMcp} from './client.js';
import {library,place,type Module} from '../build-primitives/modules.js';
import {protectedPortalPass} from '../build-primitives/composition.js';
import {loadModel} from '../world-model/index.js';
import type {Fill} from '../build-primitives/index.js';

const {client,call:rawCall}=await connectMcp();
const call=(name:string,args:Record<string,unknown>={})=>rawCall(name,{...args,actor:'portal-safety-repair',prompt:'Restore required structure portals blocked by an earlier architectural detail pass'});
const evidence:any={at:new Date().toISOString(),status:'RUNNING',repairs:[],checks:[],limitations:['This pass repairs declared portal planes; it does not replace renderer or full collision QA']};
const material=(state:string)=>state.split('[',1)[0];
async function repair(regionId:string,module:Module,local:Fill,rotation:0|90|180|270,origin:[number,number,number]){
  const plan=place({...module,fills:[local]},origin,rotation),fill=plan.fills[0];
  const before=await call('world.get_blocks',{bounds:fill.bounds});
  if(Object.values(before.blocks).every((state:any)=>material(state)==='minecraft:air')){
    evidence.repairs.push({region:regionId,bounds:fill.bounds,status:'ALREADY_CLEAR',changedBlocks:0});return;
  }
  let tx:any;
  try{tx=await call('build.begin_transaction',{name:`portal:${regionId}`,bounds:fill.bounds});}
  catch(error){
    if(String(error).includes('REGION_OCCUPIED')){
      let changedBlocks=0,remainingBlockedCells=0;
      for(const [position,state] of Object.entries(before.blocks) as [string,string][]){
        if(material(state)==='minecraft:air')continue;
        const p=position.split(',').map(Number) as [number,number,number],bounds={min:p,max:p};let cellTx:any;
        try{cellTx=await call('build.begin_transaction',{name:`portal-cell:${regionId}`,bounds});}
        catch(cellError){if(String(cellError).includes('REGION_OCCUPIED')){remainingBlockedCells++;continue;}throw cellError;}
        const cellBefore=await call('world.get_blocks',{bounds});
        try{
          await call('build.fill_region',{transactionId:cellTx.transactionId,bounds,block:'minecraft:air'});
          const dry=await call('build.dry_run',{transactionId:cellTx.transactionId});
          assert.equal((await call('world.get_blocks',{bounds})).checksum,cellBefore.checksum,'cell dry-run changed live blocks');
          await call('build.commit_transaction',{transactionId:cellTx.transactionId,previewHash:dry.previewHash});
          assert.ok(Object.values((await call('world.get_blocks',{bounds})).blocks).every((value:any)=>material(value)==='minecraft:air'),'cell repair did not reconcile');changedBlocks+=dry.changedBlocks;
        }catch(cellError){try{await call('build.rollback_transaction',{transactionId:cellTx.transactionId});}catch{}throw cellError;}
      }
      remainingBlockedCells=Object.values((await call('world.get_blocks',{bounds:fill.bounds})).blocks).filter((state:any)=>material(state)!=='minecraft:air').length;
      evidence.repairs.push({region:regionId,bounds:fill.bounds,status:remainingBlockedCells?'PARTIAL_ENTITY_CLEARANCE':'REPAIRED_BY_CELLS',changedBlocks,remainingBlockedCells});return;
    }
    throw error;
  }
  try{
    await call('build.fill_region',{transactionId:tx.transactionId,...fill});
    const dry=await call('build.dry_run',{transactionId:tx.transactionId});
    assert.equal((await call('world.get_blocks',{bounds:fill.bounds})).checksum,before.checksum,'dry-run changed live blocks');
    await call('build.commit_transaction',{transactionId:tx.transactionId,previewHash:dry.previewHash});
    const after=await call('world.get_blocks',{bounds:fill.bounds});
    assert.ok(Object.values(after.blocks).every((state:any)=>material(state)==='minecraft:air'),`${regionId} portal remains blocked`);
    evidence.repairs.push({region:regionId,bounds:fill.bounds,status:'REPAIRED',transactionId:tx.transactionId,changedBlocks:dry.changedBlocks,checksum:after.checksum});
  }catch(error){try{await call('build.rollback_transaction',{transactionId:tx.transactionId});}catch{}throw error;}
}
try{
  const model=await loadModel(),modules=library();
  for(const region of model.regions){
    if(!region.module||!region.origin)continue;
    const module=modules.find(m=>m.id===region.module);if(!module)throw new Error(`Missing module ${region.module}`);
    for(const portal of protectedPortalPass(module))await repair(region.id,module,portal,region.rotation??0,region.origin);
  }
  assert.ok(evidence.repairs.length>0);
  const blocked=evidence.repairs.filter((r:any)=>r.remainingBlockedCells>0||r.status==='BLOCKED_BY_ENTITY');
  if(!blocked.length)evidence.checks.push('every declared entrance/exit plane is three blocks wide, three blocks high and air in the live Paper world');
  evidence.checks.push('each changed portal used an isolated staged transaction, unchanged dry-run and exact preview hash');
  evidence.status=blocked.length?'PARTIAL':'PASS';
  if(blocked.length)evidence.limitations.push(`${blocked.length} portal repair(s) safely skipped because a live entity occupied the exact block volume`);
}catch(error){evidence.status='FAIL';evidence.error=String(error);throw error;}
finally{await writeFile('reports/portal-repair.json',JSON.stringify(evidence,null,2));await client.close();}
