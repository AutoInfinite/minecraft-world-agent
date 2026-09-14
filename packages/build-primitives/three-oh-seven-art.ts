import type {Fill} from './index.js';
import type {Bounds} from '../tool-schemas/index.js';
import {THREE_OH_SEVEN_BOUNDS} from './three-oh-seven.js';

type Point=[number,number,number];
export type HorrorArtBatch={id:string;purpose:string;fills:Fill[];bounds:Bounds};
const f=(min:Point,max:Point,block:string):Fill=>({bounds:{min,max},block});
const p=(x:number,y:number,z:number,block:string)=>f([x,y,z],[x,y,z],block);

function envelope(fills:Fill[]):Bounds{
  const min:Point=[Infinity,Infinity,Infinity],max:Point=[-Infinity,-Infinity,-Infinity];
  for(const fill of fills)for(let i=0;i<3;i++){min[i]=Math.min(min[i],fill.bounds.min[i]);max[i]=Math.max(max[i],fill.bounds.max[i]);}
  return {min,max};
}
function volume(bounds:Bounds){return bounds.max.reduce((n,v,i)=>n*(v-bounds.min[i]+1),1);}
function batch(id:string,purpose:string,fills:Fill[]):HorrorArtBatch{return {id,purpose,fills,bounds:envelope(fills)};}
function overlaps(a:Bounds,b:Bounds){return a.min.every((v,i)=>v<=b.max[i]&&a.max[i]>=b.min[i]);}

/** Coordinates used by physical interaction entities. Hero art may not replace their footing or display volume. */
export const THREE_OH_SEVEN_INTERACTION_VOLUMES:Bounds[]=[
  {min:[195,110,117],max:[195,113,117]}, {min:[205,100,116],max:[205,103,116]},
  {min:[228,100,103],max:[228,103,103]}, {min:[230,100,128],max:[230,103,128]},
  {min:[196,100,124],max:[196,103,124]}, {min:[190,110,121],max:[190,113,121]}
];

function bedroom():Fill[]{return [
  f([185,111,108],[185,116,111],'minecraft:bookshelf'),
  f([186,111,118],[187,113,119],'minecraft:bookshelf'),
  f([186,111,123],[187,113,124],'minecraft:bookshelf'),
  f([188,111,125],[193,113,125],'minecraft:dark_oak_planks'),
  f([188,114,125],[193,114,125],'minecraft:dark_oak_slab'),
  f([188,110,118],[193,110,118],'minecraft:spruce_planks'),
  f([186,114,118],[187,114,118],'minecraft:dark_oak_slab'),
  p(186,115,118,'minecraft:lantern'),p(193,115,125,'minecraft:redstone_lamp'),
  f([195,111,108],[196,113,108],'minecraft:gray_stained_glass'),
  f([195,114,108],[196,114,108],'minecraft:dark_oak_slab')
];}

function stairwell():Fill[]{return [
  f([177,101,108],[178,108,108],'minecraft:deepslate_bricks'),
  f([182,101,108],[183,105,108],'minecraft:cracked_stone_bricks'),
  f([177,103,109],[177,105,110],'minecraft:gray_stained_glass'),
  f([182,102,109],[182,105,110],'minecraft:iron_bars'),
  f([177,101,111],[177,103,112],'minecraft:dark_oak_planks'),
  f([182,101,112],[183,103,112],'minecraft:dark_oak_planks'),
  f([177,101,115],[179,101,115],'minecraft:polished_andesite'),
  f([182,101,114],[183,101,114],'minecraft:polished_andesite'),
  f([177,104,104],[178,104,104],'minecraft:dark_oak_slab'),
  p(183,104,111,'minecraft:redstone_lamp'),p(178,106,108,'minecraft:lantern')
];}

function courtyard():Fill[]{return [
  f([200,100,106],[200,100,124],'minecraft:polished_deepslate'),
  f([202,100,122],[207,100,124],'minecraft:blackstone'),
  f([202,101,121],[204,102,122],'minecraft:polished_blackstone_bricks'),
  f([205,101,122],[207,102,123],'minecraft:polished_blackstone_bricks'),
  f([202,101,106],[202,104,106],'minecraft:stripped_spruce_log'),
  f([210,101,106],[210,104,106],'minecraft:stripped_spruce_log'),
  f([203,104,106],[209,104,106],'minecraft:iron_bars'),
  f([204,103,106],[206,103,106],'minecraft:gray_stained_glass'),
  f([207,105,119],[211,105,119],'minecraft:air'),
  f([208,100,118],[211,100,121],'minecraft:moss_block'),
  p(202,103,121,'minecraft:lantern'),p(210,104,106,'minecraft:redstone_lamp')
];}

export function threeOhSevenHeroArtPass():HorrorArtBatch[]{
  const batches=[
    batch('307-art-bedroom','turn apartment 307 into a compact domestic room with one warm focal light',bedroom()),
    batch('307-art-stairwell','give the stairwell landings, door rhythm and constrained service detail without touching the stairs',stairwell()),
    batch('307-art-courtyard','replace random courtyard clutter with drainage, bins and a laundry-service story',courtyard())
  ];
  for(const item of batches){
    if(item.fills.length>128)throw new Error(`${item.id} operations exceed 128`);
    if(volume(item.bounds)>8192)throw new Error(`${item.id} volume exceeds 8192`);
    for(const fill of item.fills){
      for(let i=0;i<3;i++)if(fill.bounds.min[i]<THREE_OH_SEVEN_BOUNDS.min[i]||fill.bounds.max[i]>THREE_OH_SEVEN_BOUNDS.max[i])throw new Error(`${item.id} escapes reserved map bounds`);
      if(THREE_OH_SEVEN_INTERACTION_VOLUMES.some(protectedBounds=>overlaps(fill.bounds,protectedBounds)))throw new Error(`${item.id} overlaps an interaction volume`);
    }
  }
  return batches;
}
