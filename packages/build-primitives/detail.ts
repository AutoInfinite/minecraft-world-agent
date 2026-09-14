import type {Fill} from './index.js';
import {fill,type Module} from './modules.js';

const point=(x:number,y:number,z:number,block:string):Fill=>fill([x,y,z],[x,y,z],block);
const beamFrame=(w:number,h:number,d:number):Fill[]=>{
  const r:Fill[]=[];
  const entrance=Math.floor(w/2);
  for(const x of [0,entrance,w-1])for(const z of [0,d-1])if(x!==entrance)r.push(fill([x,1,z],[x,h-1,z],'minecraft:stripped_spruce_log[axis=y]'));
  for(const z of [0,Math.floor(d/2),d-1])for(const x of [0,w-1])r.push(fill([x,1,z],[x,h-1,z],'minecraft:stripped_spruce_log'));
  r.push(fill([0,4,0],[w-1,4,0],'minecraft:dark_oak_planks'),fill([0,4,d-1],[w-1,4,d-1],'minecraft:dark_oak_planks'));
  return r;
};
const foundation=(w:number,d:number):Fill[]=>{
  const entrance=Math.floor(w/2);
  return [
    fill([0,1,0],[entrance-2,1,0],'minecraft:mossy_cobblestone'),fill([entrance+2,1,0],[w-1,1,0],'minecraft:mossy_cobblestone'),
    fill([0,1,d-1],[entrance-2,1,d-1],'minecraft:cobblestone'),fill([entrance+2,1,d-1],[w-1,1,d-1],'minecraft:cobblestone'),
    fill([0,1,1],[0,1,d-2],'minecraft:cobblestone'),fill([w-1,1,1],[w-1,1,d-2],'minecraft:mossy_cobblestone')
  ];
};
function houseDetail(module:Module,wallHeight:number):Fill[]{
  const [w,,d]=module.size,r=[...foundation(w,d),...beamFrame(w,wallHeight,d)];
  // Deep window frames and shutters turn flat wall openings into readable façades.
  for(const z of [3,d-4])for(const x of [0,w-1]){
    r.push(fill([x,2,z-1],[x,5,z-1],'minecraft:dark_oak_planks'),fill([x,2,z+1],[x,5,z+1],'minecraft:dark_oak_planks'));
  }
  r.push(fill([2,1,d-3],[2,3,d-3],'minecraft:bookshelf'),fill([3,1,d-3],[4,1,d-3],'minecraft:dark_oak_slab'),point(4,1,3,'minecraft:crafting_table'));
  return r;
}
export function detailPass(module:Module):Fill[]{
  const [w,,d]=module.size;
  switch(module.id){
    case 'miner-house': return [...houseDetail(module,6),fill([1,6,1],[1,10,1],'minecraft:cobblestone_wall'),point(2,2,0,'minecraft:oak_trapdoor'),point(8,5,10,'minecraft:cobweb')];
    case 'survivor-house': return [...houseDetail(module,7),fill([2,7,2],[2,13,2],'minecraft:stone_brick_wall'),point(2,6,2,'minecraft:lantern'),fill([10,1,12],[12,1,12],'minecraft:spruce_slab'),point(11,2,12,'minecraft:gray_stained_glass'),point(1,5,13,'minecraft:cobweb')];
    case 'blacksmith': return [...houseDetail(module,7),fill([2,1,2],[6,1,6],'minecraft:polished_deepslate'),fill([3,2,3],[5,2,5],'minecraft:magma_block'),fill([2,3,2],[6,3,2],'minecraft:iron_bars'),point(7,1,5,'minecraft:anvil'),fill([3,4,3],[3,11,3],'minecraft:cobbled_deepslate'),point(9,2,11,'minecraft:iron_bars'),point(9,1,11,'minecraft:lantern'),fill([11,1,2],[13,1,4],'minecraft:hay_block')];
    case 'church': {
      const entrance=Math.floor(w/2),r=[...houseDetail(module,8),fill([0,1,0],[entrance-2,2,0],'minecraft:tuff_bricks'),fill([entrance+2,1,0],[w-1,2,0],'minecraft:tuff_bricks'),fill([0,1,d-1],[entrance-2,2,d-1],'minecraft:mud_bricks'),fill([entrance+2,1,d-1],[w-1,2,d-1],'minecraft:mud_bricks')];
      for(const z of [3,7,11,15])r.push(fill([3,1,z],[5,1,z],'minecraft:dark_oak_stairs'),fill([9,1,z],[11,1,z],'minecraft:dark_oak_stairs'));
      r.push(fill([6,1,14],[8,2,16],'minecraft:polished_blackstone_bricks'),point(7,3,15,'minecraft:soul_lantern'),fill([6,11,7],[8,15,7],'minecraft:purple_stained_glass'),fill([6,11,11],[8,15,11],'minecraft:purple_stained_glass'),fill([5,8,7],[5,18,7],'minecraft:stone_brick_wall'),fill([9,8,11],[9,18,11],'minecraft:stone_brick_wall'),point(7,18,9,'minecraft:sea_lantern'),point(2,6,17,'minecraft:cobweb'));
      return r;
    }
    case 'village-gate': return [fill([0,1,6],[2,6,8],'minecraft:stone_bricks'),fill([12,1,6],[14,6,8],'minecraft:mossy_cobblestone'),fill([2,7,7],[12,8,7],'minecraft:tuff_bricks'),fill([1,1,5],[1,5,5],'minecraft:stripped_spruce_log'),fill([13,1,9],[13,5,9],'minecraft:stripped_spruce_log'),point(3,6,7,'minecraft:lantern'),point(11,6,7,'minecraft:lantern'),fill([5,0,12],[9,0,12],'minecraft:coarse_dirt')];
    case 'mine-tunnel': {
      const r:Fill[]=[];for(const z of [1,5,9,13]){r.push(fill([2,1,z],[2,7,z],'minecraft:stripped_spruce_log'),fill([12,1,z],[12,7,z],'minecraft:stripped_spruce_log'),fill([2,7,z],[12,7,z],'minecraft:stripped_spruce_log'));}
      r.push(fill([1,0,1],[3,0,3],'minecraft:gravel'),point(11,6,5,'minecraft:soul_lantern'),point(3,5,10,'minecraft:cobweb'),fill([6,0,8],[8,0,10],'minecraft:cobbled_deepslate'));return r;
    }
    case 'boss-chamber': {
      const r:Fill[]=[fill([2,0,2],[20,0,2],'minecraft:polished_deepslate'),fill([2,0,20],[20,0,20],'minecraft:polished_deepslate'),fill([2,0,3],[2,0,19],'minecraft:polished_deepslate'),fill([20,0,3],[20,0,19],'minecraft:polished_deepslate'),fill([10,0,3],[12,0,19],'minecraft:chiseled_deepslate'),fill([3,0,10],[19,0,12],'minecraft:chiseled_deepslate')];
      for(const x of [4,11,18])for(const z of [4,11,18])r.push(point(x,0,z,(x+z)%2?'minecraft:gilded_blackstone':'minecraft:polished_blackstone_bricks'));
      for(const x of [1,21])for(const z of [5,11,17])r.push(fill([x,1,z],[x,8,z],'minecraft:cracked_deepslate_bricks'));
      r.push(point(11,9,11,'minecraft:sea_lantern'),point(5,7,5,'minecraft:soul_lantern'),point(17,7,17,'minecraft:soul_lantern'));return r;
    }
    case 'square': {
      const r:Fill[]=[];for(let x=2;x<29;x+=4){r.push(point(x,1,2,'minecraft:cobblestone_wall'),point(x,1,28,'minecraft:mossy_cobblestone_wall'));}
      for(let z=4;z<27;z+=6){r.push(point(2,1,z,'minecraft:lantern'),point(28,1,z,'minecraft:lantern'));}
      r.push(fill([5,0,5],[8,0,8],'minecraft:coarse_dirt'),fill([22,0,21],[25,0,24],'minecraft:rooted_dirt'),fill([7,2,7],[7,3,7],'minecraft:stripped_oak_log'),fill([24,2,23],[24,4,23],'minecraft:stripped_oak_log'),point(15,1,6,'minecraft:target'),point(17,1,24,'minecraft:hay_block'));return r;
    }
    default:return [];
  }
}
