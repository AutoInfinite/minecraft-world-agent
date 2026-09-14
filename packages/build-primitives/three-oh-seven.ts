import type {Fill} from './index.js';
import type {Bounds} from '../tool-schemas/index.js';

type Point=[number,number,number];
export type HorrorBuildBatch={id:string;purpose:string;fills:Fill[];bounds:Bounds};
const f=(min:Point,max:Point,block:string):Fill=>({bounds:{min,max},block});
const p=(x:number,y:number,z:number,block:string)=>f([x,y,z],[x,y,z],block);

function envelope(fills:Fill[]):Bounds{
  const min:Point=[Infinity,Infinity,Infinity],max:Point=[-Infinity,-Infinity,-Infinity];
  for(const fill of fills)for(let i=0;i<3;i++){min[i]=Math.min(min[i],fill.bounds.min[i]);max[i]=Math.max(max[i],fill.bounds.max[i]);}
  return {min,max};
}
function batch(id:string,purpose:string,fills:Fill[]):HorrorBuildBatch{return {id,purpose,fills,bounds:envelope(fills)};}
function volume(bounds:Bounds){return bounds.max.reduce((n,v,i)=>n*(v-bounds.min[i]+1),1);}

function apartmentLower():Fill[]{
  const r:Fill[]=[
    f([176,101,96],[176,109,126],'minecraft:cracked_stone_bricks'),
    f([198,101,96],[198,109,126],'minecraft:stone_bricks'),
    f([177,101,96],[197,109,96],'minecraft:polished_andesite'),
    f([177,101,126],[197,109,126],'minecraft:cracked_stone_bricks'),
    f([177,109,97],[197,109,125],'minecraft:stone_bricks'),
    f([177,101,97],[197,108,125],'minecraft:air'),
    f([184,101,97],[184,108,108],'minecraft:stone_bricks'),
    f([184,101,105],[184,103,107],'minecraft:air'),
    f([187,101,116],[197,106,116],'minecraft:mud_bricks'),
    f([191,101,116],[193,103,116],'minecraft:air'),
    f([198,101,110],[198,103,114],'minecraft:air'),
    f([193,101,126],[197,103,126],'minecraft:air'),
    f([177,101,100],[177,109,107],'minecraft:deepslate_bricks'),
    f([176,101,102],[176,109,105],'minecraft:polished_deepslate'),
    f([176,103,101],[176,105,104],'minecraft:gray_stained_glass'),
    f([198,103,99],[198,105,103],'minecraft:gray_stained_glass'),
    f([198,103,118],[198,105,122],'minecraft:gray_stained_glass'),
    f([181,101,120],[183,102,124],'minecraft:bookshelf'),
    p(186,101,102,'minecraft:lantern'),p(195,101,113,'minecraft:redstone_lamp'),
    f([178,109,103],[182,109,109],'minecraft:air'),
    f([178,110,103],[182,110,114],'minecraft:air')
  ];
  for(let i=0;i<10;i++)r.push(f([179,101+i,113-i],[181,101+i,113-i],'minecraft:stone_brick_stairs'));
  for(const z of [99,108,117,123])r.push(f([176,101,z],[176,108,z],'minecraft:polished_andesite'));
  return r;
}

function apartmentUpper():Fill[]{
  const r:Fill[]=[
    f([176,110,96],[198,110,126],'minecraft:stone_bricks'),
    f([176,111,96],[176,118,126],'minecraft:cracked_stone_bricks'),
    f([198,111,96],[198,118,126],'minecraft:stone_bricks'),
    f([177,111,96],[197,118,96],'minecraft:polished_andesite'),
    f([177,111,126],[197,118,126],'minecraft:cracked_stone_bricks'),
    f([177,118,97],[197,118,125],'minecraft:stone_bricks'),
    f([178,110,105],[182,110,113],'minecraft:air'),
    f([177,111,97],[197,117,125],'minecraft:air'),
    f([184,111,107],[197,116,107],'minecraft:mud_bricks'),
    f([190,111,107],[192,113,107],'minecraft:air'),
    f([184,111,108],[184,116,125],'minecraft:spruce_planks'),
    f([184,111,112],[184,113,114],'minecraft:air'),
    f([177,110,99],[197,110,104],'minecraft:polished_andesite'),
    f([178,110,103],[182,110,113],'minecraft:air'),
    f([179,110,104],[181,110,104],'minecraft:stone_brick_stairs'),
    f([198,112,99],[198,115,103],'minecraft:gray_stained_glass'),
    f([198,112,115],[198,115,123],'minecraft:gray_stained_glass'),
    f([176,112,99],[176,115,103],'minecraft:gray_stained_glass'),
    f([188,110,119],[193,110,124],'minecraft:dark_oak_planks'),
    f([189,111,121],[192,111,124],'minecraft:spruce_slab'),
    f([186,111,109],[189,113,109],'minecraft:bookshelf'),
    p(195,116,117,'minecraft:lantern'),p(181,115,101,'minecraft:redstone_lamp')
  ];
  for(const z of [99,108,117,123])r.push(f([176,111,z],[176,117,z],'minecraft:polished_andesite'),f([198,111,z],[198,117,z],'minecraft:polished_andesite'));
  for(const z of [100,116,122])r.push(f([199,111,z],[201,111,z+3],'minecraft:dark_oak_slab'),f([199,112,z],[201,113,z],'minecraft:iron_bars'));
  return r;
}

function apartmentRoof():Fill[]{
  return [
    f([176,119,96],[198,119,126],'minecraft:polished_deepslate'),
    f([176,120,96],[198,120,96],'minecraft:polished_andesite'),
    f([176,120,126],[198,120,126],'minecraft:polished_andesite'),
    f([176,120,97],[176,120,125],'minecraft:polished_andesite'),
    f([198,120,97],[198,120,125],'minecraft:polished_andesite'),
    f([177,120,99],[184,126,107],'minecraft:deepslate_bricks'),
    f([178,121,100],[183,125,106],'minecraft:air'),
    f([179,121,99],[182,124,99],'minecraft:gray_stained_glass'),
    f([185,120,102],[189,123,106],'minecraft:polished_andesite'),
    f([186,121,103],[188,122,105],'minecraft:air'),
    f([192,120,112],[196,121,116],'minecraft:blackstone'),
    f([193,122,113],[195,124,115],'minecraft:iron_bars'),
    f([179,127,102],[182,127,105],'minecraft:iron_bars'),
    p(181,126,103,'minecraft:redstone_lamp')
  ];
}

function groundAndRoad():Fill[]{
  const r:Fill[]=[
    f([176,99,88],[239,99,135],'minecraft:deepslate_bricks'),
    f([176,100,88],[239,100,135],'minecraft:stone_bricks'),
    f([198,100,104],[239,100,113],'minecraft:cobbled_deepslate'),
    f([198,100,101],[239,100,103],'minecraft:polished_andesite'),
    f([198,100,114],[239,100,117],'minecraft:polished_andesite'),
    f([199,100,105],[212,100,125],'minecraft:cracked_stone_bricks'),
    f([202,100,108],[209,100,121],'minecraft:mossy_cobblestone'),
    f([211,100,108],[236,100,109],'minecraft:polished_deepslate'),
    f([218,100,118],[238,100,134],'minecraft:coarse_dirt'),
    f([221,100,121],[235,100,132],'minecraft:rooted_dirt'),
    f([199,100,126],[217,100,132],'minecraft:gravel'),
    f([199,100,128],[217,100,130],'minecraft:cobbled_deepslate')
  ];
  for(let x=202;x<=236;x+=7)r.push(f([x,100,104],[x+2,100,113],'minecraft:cracked_deepslate_bricks'));
  return r;
}

function northBlock(x1:number,x2:number,height:number,accent:string):Fill[]{
  const front=101,back=88,mid=Math.floor((x1+x2)/2),r:Fill[]=[
    f([x1,101,back],[x2,height,back],'minecraft:deepslate_bricks'),
    f([x1,101,front],[x2,height,front],accent),
    f([x1,101,back],[x1,height,front],'minecraft:stone_bricks'),
    f([x2,101,back],[x2,height,front],'minecraft:cracked_stone_bricks'),
    f([x1,101,back],[x2,101,front],'minecraft:stone_bricks'),
    f([x1,height,back],[x2,height,front],'minecraft:dark_oak_planks'),
    f([mid-1,101,front],[mid+1,103,front],'minecraft:air')
  ];
  for(let x=x1+2;x<=x2-2;x+=5){r.push(f([x,104,front],[x+1,106,front],'minecraft:gray_stained_glass'));if(height>=114)r.push(f([x,110,front],[x+1,112,front],'minecraft:gray_stained_glass'));}
  for(const x of [x1,x2])r.push(f([x,101,front],[x,height,front],'minecraft:polished_andesite'));
  r.push(f([x1+2,107,front+1],[x1+6,107,front+2],'minecraft:dark_oak_slab'),p(mid,104,front,'minecraft:redstone_lamp'));
  return r;
}

function southGarages():Fill[]{
  const r:Fill[]=[
    f([199,101,131],[217,109,135],'minecraft:deepslate_bricks'),
    f([199,101,131],[217,106,131],'minecraft:polished_andesite'),
    f([200,101,131],[203,104,131],'minecraft:blackstone'),
    f([206,101,131],[210,105,131],'minecraft:blackstone'),
    f([213,101,131],[216,103,131],'minecraft:blackstone'),
    f([198,101,126],[198,109,135],'minecraft:cracked_stone_bricks'),
    f([199,109,130],[217,109,135],'minecraft:dark_oak_slab'),
    f([203,101,126],[203,106,130],'minecraft:mud_bricks'),
    f([211,101,126],[211,107,130],'minecraft:stone_bricks'),
    p(204,105,129,'minecraft:lantern'),p(213,106,129,'minecraft:redstone_lamp')
  ];
  return r;
}

function eastBackdrop():Fill[]{
  const r:Fill[]=[
    f([239,101,102],[239,120,135],'minecraft:deepslate_bricks'),
    f([236,101,103],[238,115,117],'minecraft:stone_bricks'),
    f([234,101,103],[235,111,117],'minecraft:cracked_stone_bricks'),
    f([232,101,114],[238,108,117],'minecraft:mud_bricks'),
    f([232,101,114],[234,103,114],'minecraft:air'),
    f([236,104,103],[238,106,103],'minecraft:gray_stained_glass'),
    f([236,110,103],[238,112,103],'minecraft:gray_stained_glass'),
    f([239,101,119],[239,120,119],'minecraft:polished_andesite'),
    f([239,101,128],[239,120,128],'minecraft:polished_andesite'),
    p(235,109,115,'minecraft:lantern')
  ];
  for(const z of [105,112,122,132])r.push(f([239,104,z],[239,106,z+2],'minecraft:gray_stained_glass'));
  r.push(f([232,101,104],[235,103,118],'minecraft:air'));
  return r;
}

function courtyard():Fill[]{
  return [
    f([201,101,106],[201,106,106],'minecraft:stripped_spruce_log'),
    f([201,106,106],[208,106,106],'minecraft:iron_bars'),
    p(205,105,106,'minecraft:lantern'),
    f([203,101,119],[208,101,123],'minecraft:polished_deepslate'),
    f([204,102,120],[207,103,122],'minecraft:blackstone'),
    f([210,101,106],[212,102,109],'minecraft:hay_block'),
    f([208,101,118],[211,101,121],'minecraft:moss_block'),
    f([209,102,119],[209,107,119],'minecraft:stripped_oak_log'),
    f([207,105,119],[211,105,119],'minecraft:cobweb'),
    f([199,101,105],[199,104,125],'minecraft:cobblestone_wall'),
    f([199,101,110],[199,103,114],'minecraft:air'),
    p(205,101,116,'minecraft:target')
  ];
}

function playground():Fill[]{
  const r:Fill[]=[
    f([218,101,118],[238,102,118],'minecraft:cobblestone_wall'),
    f([218,101,134],[238,102,134],'minecraft:cobblestone_wall'),
    f([238,101,119],[238,102,133],'minecraft:cobblestone_wall'),
    f([218,101,119],[218,102,125],'minecraft:cobblestone_wall'),
    f([218,101,131],[218,102,133],'minecraft:cobblestone_wall'),
    f([226,101,124],[226,107,124],'minecraft:iron_bars'),
    f([234,101,124],[234,107,124],'minecraft:iron_bars'),
    f([226,107,124],[234,107,124],'minecraft:iron_bars'),
    f([229,103,124],[229,106,124],'minecraft:iron_bars'),
    f([232,103,124],[232,106,124],'minecraft:iron_bars'),
    f([228,102,124],[230,102,126],'minecraft:dark_oak_slab'),
    f([231,102,124],[233,102,126],'minecraft:dark_oak_slab'),
    f([221,101,128],[225,101,132],'minecraft:coarse_dirt'),
    f([220,101,120],[220,107,120],'minecraft:stripped_spruce_log'),
    f([220,107,120],[223,107,120],'minecraft:iron_bars'),
    p(220,106,120,'minecraft:lantern'),p(230,101,128,'minecraft:target')
  ];
  return r;
}

function phoneAndStreet():Fill[]{
  return [
    f([226,100,101],[230,100,105],'minecraft:polished_deepslate'),
    f([227,101,101],[229,101,105],'minecraft:air'),
    f([226,102,101],[226,106,105],'minecraft:iron_bars'),
    f([230,102,101],[230,106,105],'minecraft:iron_bars'),
    f([227,106,101],[229,106,105],'minecraft:dark_oak_slab'),
    f([228,102,101],[228,104,101],'minecraft:redstone_lamp'),
    f([214,101,114],[222,101,117],'minecraft:polished_andesite'),
    f([214,102,117],[222,105,117],'minecraft:gray_stained_glass'),
    f([214,105,114],[222,105,117],'minecraft:dark_oak_slab'),
    f([215,102,114],[215,104,114],'minecraft:iron_bars'),
    f([221,102,114],[221,104,114],'minecraft:iron_bars'),
    p(218,104,116,'minecraft:redstone_lamp'),
    f([207,101,102],[207,107,102],'minecraft:polished_andesite'),
    p(207,106,102,'minecraft:lantern'),
    f([223,101,115],[223,108,115],'minecraft:polished_andesite'),
    p(223,107,115,'minecraft:lantern')
  ];
}

export const THREE_OH_SEVEN_BOUNDS:Bounds={min:[176,99,88],max:[239,127,135]};
export const THREE_OH_SEVEN_CHECKPOINTS:Point[]=[
  [195,110,121],[192,110,102],[181,110,102],[183,100,113],[196,100,112],
  [205,100,112],[221,100,112],[228,100,103],[234,100,112],[234,100,128],
  [207,100,128],[196,100,124]
];

export function threeOhSevenBuild():HorrorBuildBatch[]{
  const batches=[
    batch('307-platform','two-layer floating soundstage with a continuous safe floor',groundAndRoad()),
    batch('307-apartment-lower','recessed lobby, back entrance and long single-flight stair',apartmentLower()),
    batch('307-apartment-upper','apartment 307, corridor, balconies and warm bedroom focal point',apartmentUpper()),
    batch('307-apartment-roof','dominant stair-tower silhouette, roof tanks and antenna',apartmentRoof()),
    batch('307-north-block-a','first irregular residential facade and deep doorway',northBlock(202,220,115,'minecraft:mud_bricks')),
    batch('307-north-block-b','taller offset facade that closes the street canyon',northBlock(221,239,118,'minecraft:stone_bricks')),
    batch('307-south-garages','compressed alley, uneven garage doors and low roofline',southGarages()),
    batch('307-east-backdrop','layered end-of-street silhouette and dark recesses',eastBackdrop()),
    batch('307-courtyard','laundry, bins, dead tree, wet patch and the red rabbit clue',courtyard()),
    batch('307-playground','asymmetric fenced playground with two empty swings',playground()),
    batch('307-phone-street','payphone, bus shelter and sparse pools of light',phoneAndStreet())
  ];
  for(const b of batches){
    if(volume(b.bounds)>8192)throw new Error(`${b.id} volume ${volume(b.bounds)} exceeds 8192`);
    if(b.fills.length>128)throw new Error(`${b.id} operations ${b.fills.length} exceeds 128`);
    for(const fill of b.fills)for(let i=0;i<3;i++)if(fill.bounds.min[i]<THREE_OH_SEVEN_BOUNDS.min[i]||fill.bounds.max[i]>THREE_OH_SEVEN_BOUNDS.max[i])throw new Error(`${b.id} escapes reserved map bounds`);
  }
  return batches;
}
