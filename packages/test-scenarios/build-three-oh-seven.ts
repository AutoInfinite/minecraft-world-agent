import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {connectMcp} from './client.js';
import {THREE_OH_SEVEN_CHECKPOINTS,threeOhSevenBuild} from '../build-primitives/three-oh-seven.js';
import type {Fill} from '../build-primitives/index.js';

const {client,call:rawCall}=await connectMcp();
const call=(name:string,args:Record<string,unknown>={})=>rawCall(name,{...args,actor:'three-oh-seven-builder',prompt:'Build the user-authorized 3:07 ten-minute horror test map in its reserved empty soundstage'});
const evidence:any={
  at:new Date().toISOString(),status:'RUNNING',map:'three-oh-seven',title:'3:07',targetMinutes:10,
  transactions:[],checks:[],limitations:['No renderer screenshots','Duration and scare timing require a human playthrough','The running server must be restarted normally before /threeam uses the new runtime']
};
const material=(state:string)=>state.split('[',1)[0];
function expected(fills:Fill[]){
  const states:Record<string,string>={};
  for(const fill of fills)for(let x=fill.bounds.min[0];x<=fill.bounds.max[0];x++)for(let y=fill.bounds.min[1];y<=fill.bounds.max[1];y++)for(let z=fill.bounds.min[2];z<=fill.bounds.max[2];z++)states[`${x},${y},${z}`]=fill.block;
  return states;
}

try{
  const batches=threeOhSevenBuild();
  evidence.plan={batches:batches.length,operations:batches.reduce((n,b)=>n+b.fills.length,0),reservedBounds:{min:[176,99,88],max:[239,127,135]}};
  for(const batch of batches){
    const before=await call('world.get_blocks',{bounds:batch.bounds}),planned=expected(batch.fills);
    const tx=await call('build.begin_transaction',{name:batch.id,bounds:batch.bounds});
    let committed=false;
    try{
      for(const fill of batch.fills)await call('build.fill_region',{transactionId:tx.transactionId,...fill});
      const dry=await call('build.dry_run',{transactionId:tx.transactionId});
      assert.equal((await call('world.get_blocks',{bounds:batch.bounds})).checksum,before.checksum,`${batch.id} changed before commit`);
      await call('build.commit_transaction',{transactionId:tx.transactionId,previewHash:dry.previewHash});committed=true;
      const after=await call('world.get_blocks',{bounds:batch.bounds});
      for(const [position,wanted] of Object.entries(planned))assert.equal(material(after.blocks[position]),material(wanted),`${batch.id} ${position}`);
      evidence.transactions.push({id:batch.id,purpose:batch.purpose,transactionId:tx.transactionId,bounds:batch.bounds,operations:batch.fills.length,changedBlocks:dry.changedBlocks,beforeChecksum:before.checksum,afterChecksum:after.checksum});
      console.log(`PASS ${batch.id}: ${dry.changedBlocks} changed blocks in ${batch.fills.length} operations`);
    }catch(error){
      if(!committed)try{await call('build.rollback_transaction',{transactionId:tx.transactionId});}catch{}
      throw error;
    }
  }
  for(const [x,y,z] of THREE_OH_SEVEN_CHECKPOINTS){
    const bounds={min:[x,y,z] as [number,number,number],max:[x,y+2,z] as [number,number,number]},blocks=(await call('world.get_blocks',{bounds})).blocks;
    assert.notEqual(material(blocks[`${x},${y},${z}`]),'minecraft:air',`missing footing ${x},${y},${z}`);
    assert.equal(material(blocks[`${x},${y+1},${z}`]),'minecraft:air',`blocked feet ${x},${y+1},${z}`);
    assert.equal(material(blocks[`${x},${y+2},${z}`]),'minecraft:air',`blocked head ${x},${y+2},${z}`);
  }
  evidence.checks.push(`${THREE_OH_SEVEN_CHECKPOINTS.length} authored route checkpoints have solid footing and two-block clearance in the actual world`);
  const entities:any[]=[];
  for(let x=176;x<=239;x+=16)for(let z=88;z<=135;z+=16){const tile=await call('world.get_entities',{bounds:{min:[x,99,z],max:[Math.min(239,x+15),127,Math.min(135,z+15)]}});entities.push(...(tile.entities??tile));}
  evidence.postBuildEntities=entities;evidence.checks.push('all batches used begin -> stage -> dry-run -> explicit preview-hash commit -> live block reconciliation');
  evidence.status='PASS';
}catch(error){evidence.status='FAIL';evidence.error=String(error);throw error;}
finally{await mkdir('reports',{recursive:true});await writeFile('reports/three-oh-seven-build.json',JSON.stringify(evidence,null,2));await client.close();}
