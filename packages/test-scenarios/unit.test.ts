import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {blockMaterial,blockStateSchema,boundsSchema,checkBounds,policySchema,schemas,volume} from '../tool-schemas/index.js';
import {room} from '../build-primitives/index.js';
import {library,place,transformBlockState,weighted} from '../build-primitives/modules.js';
import {detailPass} from '../build-primitives/detail.js';
import {composeModule} from '../build-primitives/composition.js';
import {organicPath} from '../build-primitives/landscape.js';
import {threeOhSevenBuild,THREE_OH_SEVEN_BOUNDS} from '../build-primitives/three-oh-seven.js';
import {threeOhSevenHeroArtPass,THREE_OH_SEVEN_INTERACTION_VOLUMES} from '../build-primitives/three-oh-seven-art.js';
import {modelSchema,validateModel,validateCatalog,SpatialIndex} from '../world-model/index.js';
const policy=policySchema.parse(JSON.parse(readFileSync('config/policy.json','utf8')));
test('inclusive bounds and protected boundary contact',()=>{
  assert.equal(volume({min:[0,100,0],max:[14,108,14]}),2025);
  assert.throws(()=>checkBounds(policy,{min:[29,100,30],max:[30,100,30]},true),/PROTECTED/);
  assert.doesNotThrow(()=>checkBounds(policy,{min:[29,100,30],max:[29,100,30]},true));
  assert.throws(()=>checkBounds(policy,{min:[0,96,0],max:[31,127,31]},true),/VOLUME/);
  assert.throws(()=>boundsSchema.parse({min:[5,100,0],max:[4,100,0]}));
  assert.throws(()=>checkBounds(policy,{min:[-1,100,0],max:[0,100,0]},true),/OUTSIDE/);
});
test('observer avatar schema only accepts canonical map identities and camera-shaped IDs',()=>{
  assert.deepEqual(schemas['observer.get_state'].parse({actor:'test',prompt:'inspect'}),{actor:'test',prompt:'inspect'});
  assert.equal(schemas['observer.place'].parse({actor:'test',prompt:'place',mapId:'three-oh-seven',cameraId:'three07-phone'}).cameraId,'three07-phone');
  assert.throws(()=>schemas['observer.place'].parse({actor:'test',prompt:'place',mapId:'other-map',cameraId:'x'}));
  assert.throws(()=>schemas['observer.place'].parse({actor:'test',prompt:'place',mapId:'three-oh-seven',cameraId:'camera with spaces'}));
});
test('creative detail passes are deterministic, bounded and materially varied',()=>{
  const detailed=library().filter(m=>detailPass(m).length>0);assert.equal(detailed.length,8);
  for(const module of detailed){
    assert.deepEqual(detailPass(module),detailPass(module));
    const enhanced={...module,fills:detailPass(module)};
    for(const rotation of [0,90,180,270] as const){
      const p=place(enhanced,[40,100,40],rotation);
      assert.ok(p.fills.length<=125,`${module.id} operation budget`);
      assert.ok(new Set(p.fills.map(f=>f.block)).size>=4,`${module.id} palette variety`);
      for(const f of p.fills)assert.ok(f.bounds.min.every((v,i)=>v>=p.bounds.min[i]&&f.bounds.max[i]<=p.bounds.max[i]),`${module.id} detail outside bounds`);
    }
  }
});
test('masterwork composition preserves portals and reports layered quality',()=>{
  for(const module of library()){
    const composed=composeModule(module,'masterwork');
    assert.deepEqual(composed,composeModule(module,'masterwork'));
    assert.ok(composed.fills.length<=128,`${module.id} operation budget`);
    assert.equal(composed.metrics.portalClear,true,`${module.id} portal clearance`);assert.equal(composed.metrics.reservedClear,true,`${module.id} reserved clearance`);
    assert.equal(composed.metrics.operations,composed.fills.length);
    for(const f of composed.fills){assert.doesNotThrow(()=>blockStateSchema.parse(f.block),`${module.id} block state ${f.block}`);assert.ok(policy.palette.includes(blockMaterial(f.block)),`${module.id} allowlisted ${f.block}`);}
    if(detailPass(module).length){
      assert.ok(composed.metrics.paletteSize>=5,`${module.id} palette hierarchy`);
      assert.ok(composed.layers.some(p=>p.layer==='clearance'),`${module.id} protected clearance layer`);
    }
  }
  const survivor=(seed:number)=>composeModule(library(seed).find(m=>m.id==='survivor-house')!,'masterwork').fills;
  assert.notDeepEqual(survivor(1),survivor(2),'different seeds must change contextual weathering');
});
test('block states rotate and mirror with structure geometry while NBT stays rejected',()=>{
  const stair='minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight]';
  assert.equal(transformBlockState(stair,90,false),'minecraft:dark_oak_stairs[facing=east,half=bottom,shape=straight]');
  assert.equal(transformBlockState('minecraft:spruce_trapdoor[facing=east,half=bottom,open=false]',0,true),'minecraft:spruce_trapdoor[facing=west,half=bottom,open=false]');
  assert.equal(transformBlockState('minecraft:stripped_spruce_log[axis=x]',90,false),'minecraft:stripped_spruce_log[axis=z]');
  assert.doesNotThrow(()=>blockStateSchema.parse(stair));
  assert.throws(()=>blockStateSchema.parse('minecraft:chest{Items:[]}'));
});
test('organic paths keep a continuous core while varying edges in clustered materials',()=>{
  const plan=organicPath([[10,100,10],[10,100,24],[18,100,24]],4,'village',42);
  assert.deepEqual(plan,organicPath([[10,100,10],[10,100,24],[18,100,24]],4,'village',42));
  assert.equal(plan.metrics.turns,1);assert.ok(plan.metrics.irregularEdgeBlocks>0);assert.ok(plan.metrics.palette.length>=3);assert.ok(plan.fills.length<=128);
  const state=new Map<string,string>();for(const f of plan.fills)for(let x=f.bounds.min[0];x<=f.bounds.max[0];x++)for(let z=f.bounds.min[2];z<=f.bounds.max[2];z++)state.set(`${x},${f.bounds.min[1]},${z}`,f.block);
  assert.equal([...state.keys()].filter(k=>k.endsWith(',100,10')).length,4,'even path width is exact at the endpoint');
  for(let z=10;z<=24;z++)assert.ok(state.has(`10,100,${z}`),`missing north/south core at ${z}`);
  for(let x=10;x<=18;x++)assert.ok(state.has(`${x},100,24`),`missing east/west core at ${x}`);
  assert.throws(()=>organicPath([[0,100,0],[0,103,1]],3,'village',1),/elevation/);
});
test('12 deterministic modules stay within transformed declared bounds',()=>{
  assert.equal(library().length,12);assert.deepEqual(library(),library());
  for(const module of library())for(const rotation of [0,90,180,270] as const)for(const mirror of [true,false]){
    const p=place(module,[40,100,40],rotation,mirror);assert.ok(volume(p.bounds)<=8192);
    for(const f of p.fills){assert.ok(f.bounds.min.every((v,i)=>v>=p.bounds.min[i]&&f.bounds.max[i]<=p.bounds.max[i]),`${module.id} ${rotation}`);}
  }
  const palette=[{block:'a',weight:1},{block:'b',weight:3}];assert.equal(weighted(42,'pillar',palette),weighted(42,'pillar',palette));assert.throws(()=>weighted(1,'x',[{block:'a',weight:0}]));
});
test('semantic graph detects broken/disconnected references; SQLite queries inclusive space',()=>{
  const model=modelSchema.parse(JSON.parse(readFileSync('projects/abandoned-mine/map/world.json','utf8')));
  assert.deepEqual(validateModel(model).errors,[]);assert.deepEqual(validateModel(model).warnings,[]);
  const index=new SpatialIndex(':memory:');index.rebuild(model);assert.equal(index.query({min:[110,101,80],max:[110,101,80]})[0].id,'village.square');index.close();
  const bad=structuredClone(model);bad.routes=[];assert.ok(validateModel(bad).errors.some(e=>e.includes('Disconnected')));
});
test('3:07 is an isolated, transaction-safe authored map plan',async()=>{
  const catalog=await validateCatalog();assert.deepEqual(catalog.errors,[]);assert.deepEqual(catalog.maps,['abandoned-mine','three-oh-seven']);
  const model=modelSchema.parse(JSON.parse(readFileSync('projects/three-oh-seven/map/world.json','utf8')));assert.deepEqual(validateModel(model).errors,[]);
  const batches=threeOhSevenBuild();assert.equal(batches.length,11);assert.ok(batches.reduce((n,b)=>n+b.fills.length,0)>=180);
  for(const batch of batches){
    assert.ok(volume(batch.bounds)<=8192,`${batch.id} transaction volume`);assert.ok(batch.fills.length<=128,`${batch.id} operation budget`);
    for(const fill of batch.fills){assert.ok(policy.palette.includes(blockMaterial(fill.block)),`${batch.id} allowlisted ${fill.block}`);for(let i=0;i<3;i++)assert.ok(fill.bounds.min[i]>=THREE_OH_SEVEN_BOUNDS.min[i]&&fill.bounds.max[i]<=THREE_OH_SEVEN_BOUNDS.max[i],`${batch.id} reserved bounds`);}
  }
});
test('3:07 hero art is deterministic, bounded and keeps interaction volumes clear',()=>{
  const pass=threeOhSevenHeroArtPass();assert.deepEqual(pass,threeOhSevenHeroArtPass());assert.equal(pass.length,3);
  for(const batch of pass){
    assert.ok(batch.fills.length<=128,`${batch.id} operation budget`);assert.ok(volume(batch.bounds)<=8192,`${batch.id} transaction volume`);
    for(const fill of batch.fills){
      assert.ok(policy.palette.includes(blockMaterial(fill.block)),`${batch.id} allowlisted ${fill.block}`);
      for(let i=0;i<3;i++)assert.ok(fill.bounds.min[i]>=THREE_OH_SEVEN_BOUNDS.min[i]&&fill.bounds.max[i]<=THREE_OH_SEVEN_BOUNDS.max[i],`${batch.id} reserved bounds`);
      for(const protectedBounds of THREE_OH_SEVEN_INTERACTION_VOLUMES)assert.ok(fill.bounds.min.some((v,i)=>v>protectedBounds.max[i]||fill.bounds.max[i]<protectedBounds.min[i]),`${batch.id} interaction overlap`);
    }
  }
});
test('room produces exact 824-block shell and two traversable three-wide entrances',()=>{
  const state=new Map<string,string>();
  for(const f of room([0,100,0]))for(let x=f.bounds.min[0];x<=f.bounds.max[0];x++)for(let y=f.bounds.min[1];y<=f.bounds.max[1];y++)for(let z=f.bounds.min[2];z<=f.bounds.max[2];z++)state.set(`${x},${y},${z}`,f.block);
  assert.equal([...state.values()].filter(b=>b!=='minecraft:air').length,824);
  for(const z of [0,14])for(let x=6;x<=8;x++)for(let y=101;y<=103;y++)assert.equal(state.get(`${x},${y},${z}`),'minecraft:air');
  assert.equal(state.get('7,100,7'),'minecraft:stone_bricks');
  assert.equal(state.get('7,108,7'),'minecraft:stone_bricks');
});
