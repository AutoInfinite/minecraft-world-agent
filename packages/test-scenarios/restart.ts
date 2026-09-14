import {connectMcp} from './client.js';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {client,call}=await connectMcp();
const bounds={min:[20,100,0],max:[22,102,2]};
try{
  if(process.argv[2]==='prepare'){
    const before=await call('world.get_blocks',{bounds});
    assert.ok(Object.values(before.blocks).every(b=>b==='minecraft:air'));
    const t=await call('build.begin_transaction',{name:'restart-fixture',bounds});
    await call('build.fill_region',{transactionId:t.transactionId,bounds,block:'minecraft:stone'});
    const p=await call('build.dry_run',{transactionId:t.transactionId});
    await call('build.commit_transaction',{transactionId:t.transactionId,previewHash:p.previewHash});
    await writeFile('.runtime/restart-test.json',JSON.stringify({transactionId:t.transactionId,before:before.blocks}));
    console.log('PASS prepared committed restart fixture');
  }else{
    const saved=JSON.parse(await readFile('.runtime/restart-test.json','utf8'));
    const current=await call('world.get_blocks',{bounds});assert.ok(Object.values(current.blocks).every(b=>b==='minecraft:stone'));
    await call('build.undo',{transactionId:saved.transactionId});assert.deepEqual((await call('world.get_blocks',{bounds})).blocks,saved.before);
    await writeFile('reports/restart.json',JSON.stringify({at:new Date().toISOString(),status:'PASS',checks:['committed blocks persisted across clean Paper restart','undo ledger survived restart','all 27 original block states restored through MCP']},null,2));
    console.log('PASS restart persistence and exact undo through MCP');
  }
}finally{await client.close();}
