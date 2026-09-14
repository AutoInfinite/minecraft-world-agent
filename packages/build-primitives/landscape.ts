import {createHash} from 'node:crypto';
import type {Fill} from './index.js';
import {fill} from './modules.js';

type Point=[number,number,number];
export type PathStyle='village'|'mine'|'ritual';
export type PathMetrics={length:number;turns:number;operations:number;palette:string[];width:number;irregularEdgeBlocks:number};
export type PathPlan={fills:Fill[];metrics:PathMetrics};

const hash=(seed:number,key:string)=>createHash('sha256').update(`${seed}:${key}`).digest().readUInt32BE()/4294967296;
const key=(p:Point)=>p.join(',');
function choose(style:PathStyle,edge:boolean,seed:number,x:number,z:number){
  const cluster=`${Math.floor(x/3)},${Math.floor(z/3)}`,n=hash(seed,cluster);
  if(style==='mine')return edge?(n<.55?'minecraft:gravel':'minecraft:cobbled_deepslate'):(n<.16?'minecraft:polished_deepslate':'minecraft:cobbled_deepslate');
  if(style==='ritual')return edge?(n<.6?'minecraft:blackstone':'minecraft:cracked_deepslate_bricks'):(n<.18?'minecraft:chiseled_deepslate':'minecraft:polished_deepslate');
  return edge?(n<.46?'minecraft:coarse_dirt':n<.78?'minecraft:gravel':'minecraft:rooted_dirt'):(n<.14?'minecraft:mossy_cobblestone':'minecraft:cobblestone');
}
function raster(a:Point,b:Point):Point[]{
  const steps=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]),Math.abs(b[2]-a[2]));
  return Array.from({length:steps+1},(_,i)=>a.map((v,j)=>Math.round(v+(b[j]-v)*(steps?i/steps:0))) as Point);
}
function rectangles(voxels:Map<string,string>):Fill[]{
  type Rect={x1:number;x2:number;y:number;z1:number;z2:number;block:string};
  const rows=new Map<string,{x1:number;x2:number;y:number;z:number;block:string}[]>();
  const cells=[...voxels].map(([position,block])=>({p:position.split(',').map(Number) as Point,block})).sort((a,b)=>a.p[1]-b.p[1]||a.p[2]-b.p[2]||a.p[0]-b.p[0]||a.block.localeCompare(b.block));
  for(const {p:[x,y,z],block} of cells){
    const rowKey=`${y},${z},${block}`,list=rows.get(rowKey)??[],last=list.at(-1);
    if(last&&last.x2===x-1)last.x2=x;else list.push({x1:x,x2:x,y,z,block});rows.set(rowKey,list);
  }
  const open=new Map<string,Rect>(),done:Rect[]=[];
  for(const row of [...rows.values()].flat().sort((a,b)=>a.y-b.y||a.z-b.z||a.x1-b.x1)){
    const runKey=`${row.y},${row.x1},${row.x2},${row.block}`,current=open.get(runKey);
    if(current&&current.z2===row.z-1)current.z2=row.z;
    else{if(current)done.push(current);open.set(runKey,{x1:row.x1,x2:row.x2,y:row.y,z1:row.z,z2:row.z,block:row.block});}
  }
  done.push(...open.values());
  return done.map(r=>fill([r.x1,r.y,r.z1],[r.x2,r.y,r.z2],r.block));
}

/** Deterministic variable-edge path with clustered material zones and guaranteed center continuity. */
export function organicPath(points:Point[],width=3,style:PathStyle='village',seed=20260914):PathPlan{
  if(points.length<2||points.length>32)throw new Error('Path requires 2-32 control points');
  if(!Number.isInteger(width)||width<2||width>5)throw new Error('Path width must be 2-5');
  for(let i=1;i<points.length;i++)if(Math.abs(points[i][1]-points[i-1][1])>Math.max(Math.abs(points[i][0]-points[i-1][0]),Math.abs(points[i][2]-points[i-1][2])))throw new Error('Path elevation cannot rise faster than one block per horizontal step');
  const voxels=new Map<string,string>(),radius=Math.floor(width/2),offsets=Array.from({length:width},(_,i)=>i-radius);let length=0,irregularEdgeBlocks=0;
  for(let segment=1;segment<points.length;segment++){
    const a=points[segment-1],b=points[segment],line=raster(a,b);length+=line.length-1;
    const dx=b[0]-a[0],dz=b[2]-a[2],alongX=Math.abs(dx)>=Math.abs(dz);
    for(let step=0;step<line.length;step++){
      const [x,y,z]=line[step],taper=segment===1&&step===0||segment===points.length-1&&step===line.length-1?0:hash(seed,`edge:${segment}:${Math.floor(step/2)}`)<.28?1:0;
      for(const offset of offsets){
        const edge=offset===offsets[0]||offset===offsets.at(-1);
        if(edge&&taper&&((offset<0)!==(hash(seed,`side:${segment}:${step}`)<.5))){irregularEdgeBlocks++;continue;}
        const p:Point=alongX?[x,y,z+offset]:[x+offset,y,z];voxels.set(key(p),choose(style,edge,seed,p[0],p[2]));
      }
      voxels.set(key([x,y,z]),choose(style,false,seed,x,z));
    }
  }
  const fills=rectangles(voxels);if(fills.length>128)throw new Error(`Path requires ${fills.length} operations; add control points or shorten it`);
  const directions=points.slice(1).map((p,i)=>[Math.sign(p[0]-points[i][0]),Math.sign(p[2]-points[i][2])].join(','));
  return {fills,metrics:{length,turns:directions.slice(1).filter((d,i)=>d!==directions[i]).length,operations:fills.length,palette:[...new Set(voxels.values())].sort(),width,irregularEdgeBlocks}};
}
