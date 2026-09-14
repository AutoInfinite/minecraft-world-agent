import {createHash} from 'node:crypto';
import {room,type Fill} from './index.js';
import type {Bounds} from '../tool-schemas/index.js';
type Point=[number,number,number];
export type Module={id:string;size:Point;anchors:Record<string,Point>;fills:Fill[];seed:number};
export function weighted(seed:number,key:string,palette:{block:string;weight:number}[]){
  if(!palette.length||palette.some(p=>!Number.isFinite(p.weight)||p.weight<=0))throw new Error('Positive finite palette weights required');
  const sum=palette.reduce((n,p)=>n+p.weight,0);
  let pick=createHash('sha256').update(`${seed}:${key}`).digest().readUInt32BE()/4294967296*sum;
  for(const p of palette){pick-=p.weight;if(pick<0)return p.block;}return palette.at(-1)!.block;
}
export const fill=(min:Point,max:Point,block='minecraft:stone_bricks'):Fill=>({bounds:{min,max},block});
export const floor=(w:number,d:number,b='minecraft:cobblestone')=>[fill([0,0,0],[w-1,0,d-1],b)];
export const pillar=(height:number,b='minecraft:spruce_log')=>[fill([0,0,0],[0,height-1,0],b)];
export function arch(w:number,h:number,b='minecraft:stone_bricks'):Fill[]{return [fill([0,0,0],[1,h-2,1],b),fill([w-2,0,0],[w-1,h-2,1],b),fill([1,h-2,0],[w-2,h-1,1],b)];}
export function stairs(width:number,rise:number,b='minecraft:stone_bricks'):Fill[]{return Array.from({length:rise},(_,z)=>fill([0,0,z],[width-1,z,z],b));}
export function roof(w:number,d:number,y:number):Fill[]{return Array.from({length:Math.ceil(w/2)},(_,i)=>fill([i,y+i,0],[w-1-i,y+i,d-1],'minecraft:dark_oak_planks'));}
function offset(fills:Fill[],p:Point):Fill[]{return fills.map(f=>fill(f.bounds.min.map((n,i)=>n+p[i]) as Point,f.bounds.max.map((n,i)=>n+p[i]) as Point,f.block));}
function house(id:string,w:number,h:number,d:number,seed:number):Module{
  const fills=room([0,0,0],[w,h,d],'minecraft:spruce_planks');
  fills.push(...floor(w,d),...roof(w,d,h));
  for(const x of [0,w-1])for(const z of [0,d-1])fills.push(fill([x,1,z],[x,h-1,z],'minecraft:spruce_log'));
  for(const x of [0,w-1])fills.push(fill([x,3,3],[x,4,d-4],'minecraft:glass'));
  fills.push(fill([2,h-2,2],[2,h-2,2],'minecraft:sea_lantern'));
  return {id,size:[w,h+Math.ceil(w/2),d],anchors:{entrance:[Math.floor(w/2),1,0],exit:[Math.floor(w/2),1,d-1]},fills,seed};
}
export function library(seed=20260914):Module[]{
  const miner=house('miner-house',11,6,11,seed),survivor=house('survivor-house',15,7,15,seed),smith=house('blacksmith',15,7,15,seed);
  smith.fills.push(fill([3,1,3],[6,2,5],'minecraft:polished_andesite'),fill([3,3,3],[3,7,3],'minecraft:deepslate_bricks'));
  const church=house('church',15,8,19,seed);church.size=[15,20,19];church.fills.push(...offset(room([0,0,0],[5,12,5]),[5,8,7]),fill([6,1,13],[8,2,14],'minecraft:polished_andesite'));
  const square:Module={id:'square',size:[31,5,31],anchors:{north:[14,1,0],south:[11,1,30],west:[0,1,13],east:[30,1,13],hub:[13,1,13]},fills:floor(31,31),seed};
  for(let x=2;x<31;x+=7)for(let z=2;z<31;z+=7)square.fills.push(fill([x,0,z],[x,0,z],weighted(seed,`${x},${z}`,[{block:'minecraft:stone_bricks',weight:5},{block:'minecraft:mossy_cobblestone',weight:2}])));
  const well:Module={id:'dry-well',size:[5,5,5],anchors:{front:[2,1,0]},fills:[...floor(5,5),fill([0,1,0],[4,2,4]),fill([1,1,1],[3,2,3],'minecraft:air'),fill([0,3,2],[0,3,2],'minecraft:oak_log'),fill([4,3,2],[4,3,2],'minecraft:oak_log'),fill([0,4,2],[4,4,2],'minecraft:oak_log')],seed};
  const gate:Module={id:'village-gate',size:[15,10,15],anchors:{entrance:[7,1,14],exit:[7,1,0],spawn:[7,1,12]},fills:[...floor(15,15),...offset(arch(15,8),[0,1,7]),fill([1,8,7],[1,8,7],'minecraft:sea_lantern')],seed};
  const tunnel:Module={id:'mine-tunnel',size:[15,10,15],anchors:{entrance:[7,1,14],exit:[7,1,0],checkpoint:[7,1,11]},fills:room([0,0,0],[15,10,15],'minecraft:deepslate_bricks'),seed};
  tunnel.fills.push(...offset(arch(11,7,'minecraft:spruce_log'),[2,1,5]),fill([2,5,1],[2,5,1],'minecraft:sea_lantern'));
  const chamber:Module={id:'boss-chamber',size:[23,12,23],anchors:{entrance:[11,1,22],exit:[11,1,0],arena:[11,1,11]},fills:room([0,0,0],[23,12,23],'minecraft:deepslate_bricks'),seed};
  for(const x of [5,17])for(const z of [5,17])chamber.fills.push(fill([x,1,z],[x,6,z],'minecraft:polished_andesite'),fill([x,7,z],[x,7,z],'minecraft:sea_lantern'));
  const ruin=house('ruined-house',11,6,11,seed);ruin.fills.push(fill([0,2,2],[0,5,7],'minecraft:air'),fill([2,6,2],[6,10,8],'minecraft:air'));
  const bridge:Module={id:'timber-bridge',size:[5,3,15],anchors:{entrance:[2,1,0],exit:[2,1,14]},fills:[...floor(5,15,'minecraft:oak_planks'),fill([0,1,0],[0,2,14],'minecraft:oak_log'),fill([4,1,0],[4,2,14],'minecraft:oak_log')],seed};
  const landing:Module={id:'stair-landing',size:[5,9,6],anchors:{bottom:[2,1,0],top:[2,6,5]},fills:stairs(5,6),seed};
  return [miner,survivor,smith,church,square,well,gate,tunnel,chamber,ruin,bridge,landing];
}
export function transformPoint(p:Point,size:Point,rotation:0|90|180|270,mirror:boolean):Point{
  const x=mirror?size[0]-1-p[0]:p[0],y=p[1],z=p[2];
  switch(rotation){case 0:return [x,y,z];case 90:return [size[2]-1-z,y,x];case 180:return [size[0]-1-x,y,size[2]-1-z];case 270:return [z,y,size[0]-1-x];}
}
type Facing='north'|'east'|'south'|'west';
const facingVector:Record<Facing,[number,number]>={north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]};
const vectorFacing=new Map(Object.entries(facingVector).map(([f,v])=>[v.join(','),f as Facing]));
function transformFacing(facing:Facing,rotation:0|90|180|270,mirror:boolean):Facing{
  let [x,z]=facingVector[facing];if(mirror)x=-x;
  for(let degrees=0;degrees<rotation;degrees+=90)[x,z]=[-z,x];
  return vectorFacing.get(`${x},${z}`)!;
}
/** Rotate/mirror safe, NBT-free Bukkit block-data strings used by detailed recipes. */
export function transformBlockState(block:string,rotation:0|90|180|270,mirror:boolean):string{
  const match=/^(minecraft:[a-z_]+)(?:\[([a-z_]+=[a-z0-9_]+(?:,[a-z_]+=[a-z0-9_]+)*)\])?$/.exec(block);
  if(!match)throw new Error(`Invalid block state: ${block}`);
  if(!match[2])return block;
  const source=Object.fromEntries(match[2].split(',').map(part=>part.split('=',2))) as Record<string,string>;
  const target:Record<string,string>={};
  for(const [key,raw] of Object.entries(source)){
    let nextKey=key,value=raw;
    if((['north','east','south','west'] as string[]).includes(key))nextKey=transformFacing(key as Facing,rotation,mirror);
    if(key==='facing'&&(['north','east','south','west'] as string[]).includes(raw))value=transformFacing(raw as Facing,rotation,mirror);
    if(key==='axis'&&(raw==='x'||raw==='z')&&(rotation===90||rotation===270))value=raw==='x'?'z':'x';
    if(mirror&&(key==='hinge'||key==='shape')&&(raw.endsWith('_left')||raw.endsWith('_right')||raw==='left'||raw==='right'))value=raw.endsWith('_left')?raw.replace(/_left$/,'_right'):raw.endsWith('_right')?raw.replace(/_right$/,'_left'):raw==='left'?'right':'left';
    target[nextKey]=value;
  }
  return `${match[1]}[${Object.entries(target).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join(',')}]`;
}
export function place(module:Module,origin:Point,rotation:0|90|180|270=0,mirror=false):{bounds:Bounds;fills:Fill[];anchors:Record<string,Point>}{
  const moved=(p:Point)=>transformPoint(p,module.size,rotation,mirror).map((n,i)=>n+origin[i]) as Point;
  const size:Point=rotation===90||rotation===270?[module.size[2],module.size[1],module.size[0]]:module.size;
  return {bounds:{min:origin,max:size.map((n,i)=>origin[i]+n-1) as Point},fills:module.fills.map(f=>{const a=moved(f.bounds.min),b=moved(f.bounds.max);return fill(a.map((n,i)=>Math.min(n,b[i])) as Point,a.map((n,i)=>Math.max(n,b[i])) as Point,transformBlockState(f.block,rotation,mirror))}),anchors:Object.fromEntries(Object.entries(module.anchors).map(([id,p])=>[id,moved(p)]))};
}
