import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {connectMcp} from './client.js';
import {organicPath} from '../build-primitives/landscape.js';
import {composeModule} from '../build-primitives/composition.js';
import {library,place} from '../build-primitives/modules.js';

const {client,call:rawCall}=await connectMcp();
const call=(name:string,args:Record<string,unknown>={})=>rawCall(name,{...args,actor:'expert-builder-smoke',prompt:'Isolated live-world proof of staged expert builder tools with exact rollback'});
const evidence:any={at:new Date().toISOString(),status:'RUNNING',checks:[],limitations:['Uses an isolated fixture and proves tool behavior, not renderer-level visual quality']};
try{
  const catalog=await call('build.list_structures',{seed:20260914}),description=await call('build.describe_structure',{structureId:'church',seed:20260914,quality:'masterwork'});
  assert.equal(catalog.length,12);assert.equal(description.metrics.portalClear,true);assert.ok(description.metrics.orientedBlocks>0);assert.ok(description.layers.some((layer:any)=>layer.layer==='weathering'));
  evidence.catalog={count:catalog.length,church:description};evidence.checks.push('structure discovery exposes 12 recipes and preflight masterwork diagnostics without opening a transaction');
  const points:[[number,number,number],[number,number,number],[number,number,number]]=[[180,100,180],[180,100,192],[188,100,192]];
  const local=organicPath(points,4,'village',314159),bounds={min:[178,100,180] as [number,number,number],max:[188,100,194] as [number,number,number]};
  const before=await call('world.get_blocks',{bounds});
  const staged=await call('build.create_path',{points,width:4,style:'village',seed:314159});
  assert.equal(staged.metrics.operations,local.metrics.operations);assert.equal(staged.metrics.turns,1);assert.ok(staged.metrics.irregularEdgeBlocks>0);
  assert.equal((await call('world.get_blocks',{bounds})).checksum,before.checksum,'path staging mutated the world');
  await call('build.commit_transaction',{transactionId:staged.transactionId,previewHash:staged.previewHash});
  assert.notEqual((await call('world.get_blocks',{bounds})).checksum,before.checksum,'path commit changed nothing');
  await call('build.undo',{transactionId:staged.transactionId});
  assert.equal((await call('world.get_blocks',{bounds})).checksum,before.checksum,'path undo did not restore exact baseline');
  evidence.path={transactionId:staged.transactionId,bounds,metrics:staged.metrics,changedBlocks:staged.changedBlocks};
  evidence.checks.push('build.create_path staged an organic turning path without mutation, committed it, and restored the exact live-world checksum');
  const bridgeModule=composeModule(library(271828).find(m=>m.id==='timber-bridge')!,'shell'),structurePlan=place(bridgeModule,[200,100,200],90,true);
  const structureBefore=await call('world.get_blocks',{bounds:structurePlan.bounds});
  const structure=await call('build.place_structure',{structureId:'timber-bridge',origin:[200,100,200],rotation:90,mirror:true,seed:271828,quality:'shell'});
  assert.equal(structure.quality,'shell');assert.equal(structure.metrics.portalClear,true);
  assert.equal((await call('world.get_blocks',{bounds:structurePlan.bounds})).checksum,structureBefore.checksum,'structure staging mutated the world');
  await call('build.rollback_transaction',{transactionId:structure.transactionId});
  assert.equal((await call('world.get_blocks',{bounds:structurePlan.bounds})).checksum,structureBefore.checksum,'structure cancellation changed the world');
  evidence.structure={transactionId:structure.transactionId,metrics:structure.metrics,layers:structure.layers,status:'STAGED_THEN_CANCELLED'};
  evidence.checks.push('build.place_structure returned layered quality diagnostics and cancelled its reviewed dry-run without world mutation');
  evidence.status='PASS';
}catch(error){evidence.status='FAIL';evidence.error=String(error);throw error;}
finally{await writeFile('reports/expert-builder-smoke.json',JSON.stringify(evidence,null,2));await client.close();}
