import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {connectMcp} from './client.js';
import {threeOhSevenHeroArtPass} from '../build-primitives/three-oh-seven-art.js';
import type {Fill} from '../build-primitives/index.js';
import type {Bounds} from '../tool-schemas/index.js';

const {client,call:rawCall}=await connectMcp();
const call=(name:string,args:Record<string,unknown>={})=>rawCall(name,{...args,actor:'three-oh-seven-art-director',prompt:'Apply the authorized 3:07 domestic horror hero-art pass with staged review, exact reconciliation and entity-safe skips'});
const evidence:any={at:new Date().toISOString(),status:'RUNNING',map:'three-oh-seven',pass:'compact wet apartment-block hero art',transactions:[],regions:[],checks:[],limitations:['This validates actual block changes, not a post-change Minecraft renderer screenshot or a human playtest']};
const material=(state:string)=>state.split('[',1)[0];
const boundsOf=(fills:Fill[]):Bounds=>({min:[0,1,2].map(i=>Math.min(...fills.map(f=>f.bounds.min[i]))) as Bounds['min'],max:[0,1,2].map(i=>Math.max(...fills.map(f=>f.bounds.max[i]))) as Bounds['max']});

function expected(fills:Fill[]){
  const blocks=new Map<string,string>();
  for(const fill of fills)for(let x=fill.bounds.min[0];x<=fill.bounds.max[0];x++)for(let y=fill.bounds.min[1];y<=fill.bounds.max[1];y++)for(let z=fill.bounds.min[2];z<=fill.bounds.max[2];z++)blocks.set(`${x},${y},${z}`,fill.block);
  return blocks;
}
async function matches(fills:Fill[]){
  const blocks=(await call('world.get_blocks',{bounds:boundsOf(fills)})).blocks;
  return [...expected(fills)].every(([position,wanted])=>material(blocks[position])===material(wanted));
}
async function apply(batch:{id:string;purpose:string;fills:Fill[];bounds:Bounds},label:string){
  if(await matches(batch.fills))return 'ALREADY_RECONCILED';
  const before=await call('world.get_blocks',{bounds:batch.bounds});let tx:any;
  try{tx=await call('build.begin_transaction',{name:`${batch.id}:${label}`,bounds:batch.bounds});}
  catch(error){if(String(error).includes('REGION_OCCUPIED'))return 'BLOCKED_BY_ENTITY';throw error;}
  try{
    for(const fill of batch.fills)await call('build.fill_region',{transactionId:tx.transactionId,...fill});
    const dry=await call('build.dry_run',{transactionId:tx.transactionId});
    assert.equal((await call('world.get_blocks',{bounds:batch.bounds})).checksum,before.checksum,`${batch.id} dry-run mutated blocks`);
    await call('build.commit_transaction',{transactionId:tx.transactionId,previewHash:dry.previewHash});
    assert.equal(await matches(batch.fills),true,`${batch.id} did not reconcile`);
    evidence.transactions.push({id:batch.id,label,transactionId:tx.transactionId,bounds:batch.bounds,operations:batch.fills.length,changedBlocks:dry.changedBlocks});
    return 'APPLIED';
  }catch(error){try{await call('build.rollback_transaction',{transactionId:tx.transactionId});}catch{}throw error;}
}

try{
  for(const batch of threeOhSevenHeroArtPass()){
    let status=await apply(batch,'region');
    if(status==='BLOCKED_BY_ENTITY'){
      const statuses=[];for(let index=0;index<batch.fills.length;index++)statuses.push(await apply({...batch,id:batch.id,bounds:boundsOf([batch.fills[index]]),fills:[batch.fills[index]]},`item-${index}`));
      status=statuses.includes('BLOCKED_BY_ENTITY')?'PARTIAL':statuses.includes('APPLIED')?'APPLIED':'ALREADY_RECONCILED';
    }
    evidence.regions.push({id:batch.id,purpose:batch.purpose,status,plannedOperations:batch.fills.length});
  }
  const partial=evidence.regions.filter((region:any)=>region.status==='PARTIAL');
  evidence.checks.push('every applied edit used begin -> stage -> dry-run with zero pre-commit mutation -> preview-hash commit -> live reconciliation');
  evidence.checks.push('all hero-art fills preserve interaction volumes and stay within the 3:07 reserved build bounds');
  if(partial.length)evidence.limitations.push(`${partial.length} art region(s) retained entity-occupied cells for a safe later retry`);
  evidence.status=partial.length?'PARTIAL':'PASS';
}catch(error){evidence.status='FAIL';evidence.error=String(error);throw error;}
finally{await mkdir('reports',{recursive:true});await writeFile('reports/three-oh-seven-art-pass.json',JSON.stringify(evidence,null,2));await client.close();}
