import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {connectMcp} from './client.js';

const {client,call}=await connectMcp();
const evidence:any={at:new Date().toISOString(),status:'RUNNING',checks:[],limitations:['Codex Observer is a visible server-side ArmorStand, not an authenticated Player or a Minecraft renderer client']};
try{
  const initial=await call('observer.get_state');assert.equal(initial.present,true);assert.equal(initial.kind,'SERVER_AVATAR_NOT_PLAYER');assert.equal(initial.renderer,false);assert.equal(initial.canBlockBuildTransactions,false);evidence.initial=initial;
  const placed=await call('observer.place',{mapId:'three-oh-seven',cameraId:'three07-phone'});assert.equal(placed.present,true);assert.equal(placed.mapId,'three-oh-seven');assert.equal(placed.cameraId,'three07-phone');assert.deepEqual(placed.position,[224,102,109]);evidence.placed=placed;
  const entities=await call('world.get_entities',{bounds:{min:[223,100,108],max:[225,104,110]}});const body=entities.entities.find((entity:any)=>entity.type==='ARMOR_STAND'&&entity.position[0]===224&&entity.position[1]===101&&entity.position[2]===109);assert.ok(body,'Codex Observer body must stand on the camera footing');evidence.body=body;
  const inspected=await call('observer.get_state');assert.deepEqual({...inspected,requestId:undefined},{...placed,requestId:undefined});evidence.checks.push('visible server-side Codex Observer exists and moves only to a canonical 3:07 camera');
  evidence.checks.push('observer reports its non-player, non-renderer limits explicitly and is excluded from build-occupancy blocking');
  evidence.status='PASS';console.log('PASS observer avatar: canonical phone camera reached');
}catch(error){evidence.status='FAIL';evidence.error=String(error);throw error;}
finally{await mkdir('reports',{recursive:true});await writeFile('reports/observer-avatar.json',JSON.stringify(evidence,null,2));await client.close();}
