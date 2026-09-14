import {createHash} from 'node:crypto';
import type {Fill} from './index.js';
import {detailPass} from './detail.js';
import {fill,type Module} from './modules.js';

type Point=[number,number,number];
export type BuildQuality='shell'|'detailed'|'masterwork';
export type BuildLayer='structure'|'architecture'|'story'|'weathering'|'lighting'|'clearance';
export type LayerSummary={layer:BuildLayer;operations:number;purpose:string};
export type BuildMetrics={operations:number;paletteSize:number;orientedBlocks:number;detailBlocks:number;weatheredBlocks:number;lights:number;storyProps:number;portalClear:boolean;reservedClear:boolean};
export type ComposedModule=Module&{quality:BuildQuality;layers:LayerSummary[];metrics:BuildMetrics};

const point=(x:number,y:number,z:number,block:string):Fill=>fill([x,y,z],[x,y,z],block);
const baseMaterial=(block:string)=>block.split('[',1)[0];
const volume=(f:Fill)=>f.bounds.max.reduce((n,v,i)=>n*(v-f.bounds.min[i]+1),1);
const noise=(seed:number,key:string)=>createHash('sha256').update(`${seed}:${key}`).digest().readUInt32BE()/4294967296;

function roofCraft(module:Module,wallHeight:number):Fill[]{
  const [w,,d]=module.size,r:Fill[]=[];
  for(let i=0;i<Math.ceil(w/2);i++){
    const left=i,right=w-1-i,y=wallHeight+i;
    if(left===right)r.push(fill([left,y,0],[right,y,d-1],'minecraft:dark_oak_slab[type=top]'));
    else{
      r.push(fill([left,y,0],[left,y,d-1],'minecraft:dark_oak_stairs[facing=west,half=bottom,shape=straight]'));
      r.push(fill([right,y,0],[right,y,d-1],'minecraft:dark_oak_stairs[facing=east,half=bottom,shape=straight]'));
    }
  }
  const middle=Math.floor(w/2),top=wallHeight+Math.ceil(w/2)-1;
  r.push(fill([middle,wallHeight,0],[middle,top,0],'minecraft:stripped_spruce_log[axis=y]'));
  r.push(fill([middle,wallHeight,d-1],[middle,top,d-1],'minecraft:stripped_spruce_log[axis=y]'));
  return r;
}

function facadeCraft(module:Module,wallHeight:number):Fill[]{
  const [w,,d]=module.size,middle=Math.floor(w/2),r:Fill[]=[];
  // A recessed porch establishes depth without occupying the protected three-wide door.
  for(const x of [middle-3,middle+3])r.push(fill([x,1,1],[x,3,1],'minecraft:stripped_spruce_log[axis=y]'));
  r.push(fill([middle-3,4,0],[middle+3,4,2],'minecraft:dark_oak_slab[type=top]'));
  for(const x of [2,w-3]){
    r.push(point(x,2,0,'minecraft:spruce_trapdoor[facing=north,half=bottom,open=false,powered=false,waterlogged=false]'));
    r.push(point(x,3,0,'minecraft:gray_stained_glass'));
    r.push(point(x,4,0,'minecraft:dark_oak_stairs[facing=south,half=bottom,shape=straight]'));
  }
  r.push(point(middle-3,3,1,'minecraft:lantern[hanging=true,waterlogged=false]'));
  // A few explicit braces break the long box silhouette into readable bays.
  for(const z of [2,d-3])for(const x of [0,w-1])r.push(point(x,wallHeight-2,z,'minecraft:dark_oak_stairs[facing=north,half=top,shape=straight]'));
  return r;
}

function houseMasterwork(module:Module,wallHeight:number):Fill[]{
  const [w,,d]=module.size,r=[...roofCraft(module,wallHeight),...facadeCraft(module,wallHeight)],middle=Math.floor(w/2);
  if(module.id==='survivor-house'){
    r.push(fill([w-4,1,d-4],[w-2,1,d-2],'minecraft:spruce_slab[type=top]'),point(w-3,2,d-3,'minecraft:lantern[hanging=false,waterlogged=false]'),point(2,1,d-5,'minecraft:bookshelf'),point(3,1,d-5,'minecraft:crafting_table'));
  }else if(module.id==='blacksmith'){
    r.push(fill([1,1,d-5],[4,1,d-2],'minecraft:polished_deepslate'),fill([1,2,d-4],[3,2,d-2],'minecraft:magma_block'),fill([2,3,d-3],[2,wallHeight+4,d-3],'minecraft:cobbled_deepslate'),point(5,1,d-3,'minecraft:anvil'),fill([w-4,1,d-4],[w-2,2,d-2],'minecraft:hay_block'));
  }else if(module.id==='miner-house'){
    r.push(fill([1,1,d-3],[3,1,d-2],'minecraft:spruce_slab[type=top]'),point(2,2,d-2,'minecraft:cobweb'),point(w-3,1,3,'minecraft:crafting_table'));
  }
  r.push(fill([middle-1,1,0],[middle+1,3,1],'minecraft:air'));
  return r;
}

function churchMasterwork(module:Module):Fill[]{
  const [w,,d]=module.size,r=[...roofCraft(module,8)],middle=Math.floor(w/2);
  for(const z of [3,7,11,15])for(const x of [0,w-1]){
    r.push(fill([x,1,z-1],[x,4,z+1],'minecraft:stone_brick_wall'));
    r.push(point(x,5,z,'minecraft:stone_brick_stairs[facing=north,half=bottom,shape=straight]'));
  }
  // Bellcote cap and narrow glass planes create a steep vertical landmark.
  r.push(fill([6,17,8],[8,17,10],'minecraft:polished_blackstone_bricks'));
  r.push(fill([6,18,9],[8,18,9],'minecraft:stone_brick_stairs[facing=north,half=bottom,shape=straight]'));
  r.push(point(7,19,9,'minecraft:stone_brick_wall'));
  r.push(point(4,1,4,'minecraft:cobweb'),point(10,1,13,'minecraft:soul_lantern[hanging=false,waterlogged=false]'));
  r.push(fill([middle-1,1,0],[middle+1,3,1],'minecraft:air'));
  return r;
}

function gateMasterwork():Fill[]{
  const r:Fill[]=[];
  for(const x of [1,13]){
    r.push(fill([x-1,1,5],[x+1,7,9],x===1?'minecraft:mossy_cobblestone':'minecraft:stone_bricks'));
    r.push(fill([x-1,8,5],[x+1,8,9],'minecraft:stone_brick_stairs[facing=north,half=bottom,shape=straight]'));
    for(const z of [5,9])r.push(point(x,9,z,'minecraft:stone_brick_wall'));
  }
  r.push(fill([3,8,7],[11,8,7],'minecraft:stripped_spruce_log[axis=x]'));
  r.push(fill([4,7,6],[10,7,8],'minecraft:dark_oak_slab[type=top]'));
  r.push(point(4,6,7,'minecraft:lantern[hanging=true,waterlogged=false]'),point(10,6,7,'minecraft:lantern[hanging=true,waterlogged=false]'));
  return r;
}

function squareMasterwork():Fill[]{
  const r:Fill[]=[];
  // Two unequal market remnants shape negative space while leaving all route mouths open.
  for(const [x1,z1,x2,z2] of [[5,7,10,12],[21,18,26,24]] as const){
    for(const x of [x1,x2])for(const z of [z1,z2])r.push(fill([x,1,z],[x,3,z],'minecraft:stripped_oak_log[axis=y]'));
    r.push(fill([x1,4,z1],[x2,4,z2],'minecraft:spruce_slab[type=top]'));
  }
  r.push(fill([12,0,13],[18,0,13],'minecraft:mossy_cobblestone'),fill([12,0,17],[18,0,17],'minecraft:cobblestone'));
  r.push(point(6,3,8,'minecraft:lantern[hanging=true,waterlogged=false]'),point(25,3,23,'minecraft:soul_lantern[hanging=true,waterlogged=false]'));
  r.push(fill([4,1,20],[7,1,23],'minecraft:rooted_dirt'),point(5,2,21,'minecraft:stripped_oak_log[axis=y]'),point(6,1,22,'minecraft:cobweb'));
  return r;
}

function tunnelMasterwork():Fill[]{
  const r:Fill[]=[];
  for(const z of [2,6,10,13]){
    r.push(point(1,1,z,'minecraft:cobbled_deepslate'),point(13,1,z,'minecraft:cobbled_deepslate'));
    r.push(point(3,7,z,'minecraft:spruce_trapdoor[facing=west,half=top,open=false,powered=false,waterlogged=false]'));
    r.push(point(11,7,z,'minecraft:spruce_trapdoor[facing=east,half=top,open=false,powered=false,waterlogged=false]'));
  }
  r.push(fill([5,0,3],[9,0,3],'minecraft:gravel'),fill([6,0,7],[8,0,8],'minecraft:polished_deepslate'),point(11,5,9,'minecraft:soul_lantern[hanging=true,waterlogged=false]'));
  return r;
}

function chamberMasterwork():Fill[]{
  const r:Fill[]=[];
  for(const x of [3,19])for(const z of [4,10,16]){
    r.push(fill([x,1,z],[x,5,z],'minecraft:cracked_deepslate_bricks'));
    r.push(point(x,6,z,'minecraft:polished_blackstone_bricks'));
  }
  // Contrasting perimeter bands teach the arena's west/east phase split without covering its central seal.
  r.push(fill([3,0,4],[8,0,8],'minecraft:polished_deepslate'),fill([14,0,14],[19,0,18],'minecraft:blackstone'));
  r.push(fill([9,1,8],[13,2,8],'minecraft:chiseled_deepslate'),fill([9,1,14],[13,2,14],'minecraft:chiseled_deepslate'));
  for(const p of [[4,8,4],[18,8,18],[4,7,18],[18,7,4]] as Point[])r.push(point(...p,'minecraft:soul_lantern[hanging=true,waterlogged=false]'));
  return r;
}

export function masterworkPass(module:Module):Fill[]{
  switch(module.id){
    case 'miner-house':return houseMasterwork(module,6);
    case 'survivor-house':case 'blacksmith':return houseMasterwork(module,7);
    case 'church':return churchMasterwork(module);
    case 'village-gate':return gateMasterwork();
    case 'square':return squareMasterwork();
    case 'mine-tunnel':return tunnelMasterwork();
    case 'boss-chamber':return chamberMasterwork();
    default:return [];
  }
}

function contextualWeathering(module:Module,fills:Fill[]):Fill[]{
  const state=finalState(fills),replacements:Record<string,string>={
    'minecraft:cobblestone':'minecraft:mossy_cobblestone','minecraft:stone_bricks':'minecraft:cracked_stone_bricks',
    'minecraft:deepslate_bricks':'minecraft:cracked_deepslate_bricks','minecraft:spruce_planks':'minecraft:dark_oak_planks'
  },candidates:{p:Point;to:string;score:number}[]=[];
  for(const [position,block] of state){
    const from=baseMaterial(block),to=replacements[from];if(!to)continue;
    const p=position.split(',').map(Number) as Point,[x,y,z]=p;
    const exposed=[[1,0,0],[-1,0,0],[0,1,0],[0,0,1],[0,0,-1]].some(d=>baseMaterial(state.get(`${x+d[0]},${y+d[1]},${z+d[2]}`)??'minecraft:air')==='minecraft:air');
    if(!exposed)continue;
    const damp=y<=2||z===0||x===0,cluster=noise(module.seed,`cluster:${Math.floor(x/3)},${Math.floor(y/2)},${Math.floor(z/3)}`);
    if(damp&&cluster<.42)candidates.push({p,to,score:noise(module.seed,`weather:${position}`)});
  }
  return candidates.sort((a,b)=>a.score-b.score).slice(0,10).map(({p,to})=>point(...p,to));
}

export function protectedPortalPass(module:Module):Fill[]{
  const r:Fill[]=[];
  for(const [name,[x,y,z]] of Object.entries(module.anchors)){
    if(name==='spawn'||name==='checkpoint'||name==='hub'||name==='arena'){r.push(fill([Math.max(0,x-1),y,Math.max(0,z-1)],[Math.min(module.size[0]-1,x+1),Math.min(module.size[1]-1,y+2),Math.min(module.size[2]-1,z+1)],'minecraft:air'));continue;}
    if(name==='bottom'||name==='top'){r.push(fill([x,y,z],[x,Math.min(module.size[1]-1,y+2),z],'minecraft:air'));continue;}
    if(name!=='entrance'&&name!=='exit')continue;
    if(z===0||z===module.size[2]-1)r.push(fill([Math.max(0,x-1),y,z],[Math.min(module.size[0]-1,x+1),Math.min(module.size[1]-1,y+2),z],'minecraft:air'));
    else if(x===0||x===module.size[0]-1)r.push(fill([x,y,Math.max(0,z-1)],[x,Math.min(module.size[1]-1,y+2),Math.min(module.size[2]-1,z+1)],'minecraft:air'));
  }
  const routeAnchor=module.anchors.checkpoint??module.anchors.arena;
  if(routeAnchor)for(const name of ['entrance','exit']){
    const edge=module.anchors[name];if(!edge)continue;
    if(edge[0]===routeAnchor[0])r.push(fill([Math.max(0,edge[0]-1),edge[1],Math.min(edge[2],routeAnchor[2])],[Math.min(module.size[0]-1,edge[0]+1),Math.min(module.size[1]-1,edge[1]+2),Math.max(edge[2],routeAnchor[2])],'minecraft:air'));
    else if(edge[2]===routeAnchor[2])r.push(fill([Math.min(edge[0],routeAnchor[0]),edge[1],Math.max(0,edge[2]-1)],[Math.max(edge[0],routeAnchor[0]),Math.min(module.size[1]-1,edge[1]+2),Math.min(module.size[2]-1,edge[2]+1)],'minecraft:air'));
  }
  return r;
}

function finalState(fills:Fill[]){
  const state=new Map<string,string>();
  for(const f of fills)for(let x=f.bounds.min[0];x<=f.bounds.max[0];x++)for(let y=f.bounds.min[1];y<=f.bounds.max[1];y++)for(let z=f.bounds.min[2];z<=f.bounds.max[2];z++)state.set(`${x},${y},${z}`,f.block);
  return state;
}
function portalsAreClear(module:Module,fills:Fill[]){
  const state=finalState(fills);
  return Object.entries(module.anchors).filter(([name])=>name==='entrance'||name==='exit').every(([,p])=>{
    const [x,y,z]=p;
    const points:Point[]=(z===0||z===module.size[2]-1)?[-1,0,1].flatMap(dx=>[0,1,2].map(dy=>[x+dx,y+dy,z] as Point)):[-1,0,1].flatMap(dz=>[0,1,2].map(dy=>[x,y+dy,z+dz] as Point));
    return points.every(q=>baseMaterial(state.get(q.join(','))??'minecraft:air')==='minecraft:air');
  });
}
function reservedVolumesAreClear(module:Module,fills:Fill[]){
  const state=finalState(fills);
  return protectedPortalPass(module).every(f=>{for(let x=f.bounds.min[0];x<=f.bounds.max[0];x++)for(let y=f.bounds.min[1];y<=f.bounds.max[1];y++)for(let z=f.bounds.min[2];z<=f.bounds.max[2];z++)if(baseMaterial(state.get(`${x},${y},${z}`)??'minecraft:air')!=='minecraft:air')return false;return true;});
}

export function composeModule(module:Module,quality:BuildQuality='masterwork'):ComposedModule{
  const architecture=quality==='shell'?[]:detailPass(module);
  const story=quality==='masterwork'?masterworkPass(module):[];
  const weathering=quality==='masterwork'?contextualWeathering(module,[...module.fills,...architecture,...story]):[];
  const clearance=protectedPortalPass(module);
  const fills=[...module.fills,...architecture,...story,...weathering,...clearance];
  if(fills.length>128)throw new Error(`${module.id} exceeds the 128-operation safety budget`);
  for(const f of fills)if(f.bounds.min.some((v,i)=>v<0||f.bounds.max[i]>=module.size[i]))throw new Error(`${module.id} has detail outside declared bounds`);
  const palette=new Set(fills.filter(f=>baseMaterial(f.block)!=='minecraft:air').map(f=>baseMaterial(f.block)));
  const storyMaterials=new Set(['minecraft:bookshelf','minecraft:crafting_table','minecraft:anvil','minecraft:hay_block','minecraft:target','minecraft:cobweb','minecraft:magma_block']);
  const metrics:BuildMetrics={
    operations:fills.length,paletteSize:palette.size,orientedBlocks:fills.filter(f=>f.block.includes('[')).reduce((n,f)=>n+volume(f),0),
    detailBlocks:[...architecture,...story].reduce((n,f)=>n+volume(f),0),weatheredBlocks:weathering.reduce((n,f)=>n+volume(f),0),lights:fills.filter(f=>baseMaterial(f.block).includes('lantern')).reduce((n,f)=>n+volume(f),0),
    storyProps:fills.filter(f=>storyMaterials.has(baseMaterial(f.block))).reduce((n,f)=>n+volume(f),0),portalClear:portalsAreClear(module,fills),reservedClear:reservedVolumesAreClear(module,fills)
  };
  if(!metrics.portalClear||!metrics.reservedClear)throw new Error(`${module.id} blocks required traversal clearance`);
  const layers:LayerSummary[]=[
    {layer:'structure',operations:module.fills.length,purpose:'primary massing and weather shell'},
    {layer:'architecture',operations:architecture.length,purpose:'foundation, framing, facade rhythm and interiors'},
    {layer:'story',operations:story.length,purpose:'silhouette, depth, focal hierarchy and environmental story'},
    {layer:'weathering',operations:weathering.length,purpose:'clustered damp, exposed-edge and structural-stress aging'},
    {layer:'lighting',operations:fills.filter(f=>baseMaterial(f.block).includes('lantern')).length,purpose:'concealed warm guidance and restrained soul accents'},
    {layer:'clearance',operations:clearance.length,purpose:'protected traversal portals applied last'}
  ];
  return {...module,fills,quality,layers,metrics};
}
