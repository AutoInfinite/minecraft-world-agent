import {connectMcp} from './client.js';
import {room} from '../build-primitives/index.js';
import {createInterface} from 'node:readline/promises';
const {client,call}=await connectMcp();
const bounds={min:[0,100,0],max:[14,108,14]};
let transactionId:string|undefined;
try{
  console.log(await call('world.get_blocks',{bounds,actor:'interactive-demo',prompt:'Inspect test.chamber before planning room'}));
  transactionId=(await call('build.begin_transaction',{name:'test.chamber demo',bounds})).transactionId;
  for(const f of room([0,100,0]))await call('build.fill_region',{transactionId,...f});
  const preview=await call('build.dry_run',{transactionId});console.log(preview);
  const rl=createInterface({input:process.stdin,output:process.stdout});
  const answer=await rl.question('Commit this exact preview? Type COMMIT: ');rl.close();
  if(answer!=='COMMIT'){console.log('Cancelled. World unchanged.');}
  else console.log(await call('build.commit_transaction',{transactionId,previewHash:preview.previewHash}));
}finally{if(transactionId)console.log(await call('build.rollback_transaction',{transactionId}));await client.close();}
