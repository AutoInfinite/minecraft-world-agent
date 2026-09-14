import type {Bounds} from '../tool-schemas/index.js';
export type Fill={bounds:Bounds;block:string};
/** 15×9×15 inclusive shell, hollow interior, three-wide north/south entrances. */
export function room(origin:[number,number,number],size:[number,number,number]=[15,9,15],block='minecraft:stone_bricks'):Fill[]{
  if(size.some(n=>!Number.isInteger(n)||n<5))throw new Error('Room dimensions must be integers >=5');
  const [x,y,z]=origin,[w,h,d]=size;
  const box=(min:Bounds['min'],max:Bounds['max'],b=block):Fill=>({bounds:{min,max},block:b});
  const mid=x+Math.floor(w/2);
  return [box([x,y,z],[x+w-1,y+h-1,z+d-1]),box([x+1,y+1,z+1],[x+w-2,y+h-2,z+d-2],'minecraft:air'),box([mid-1,y+1,z],[mid+1,y+3,z],'minecraft:air'),box([mid-1,y+1,z+d-1],[mid+1,y+3,z+d-1],'minecraft:air')];
}
export function roomWalls(origin:[number,number,number],size:[number,number,number]=[15,9,15]):Bounds[]{
  const [x,y,z]=origin,[w,h,d]=size;
  return [{min:[x,y+1,z],max:[x+w-1,y+h-2,z]},{min:[x,y+1,z+d-1],max:[x+w-1,y+h-2,z+d-1]},{min:[x,y+1,z+1],max:[x,y+h-2,z+d-2]},{min:[x+w-1,y+1,z+1],max:[x+w-1,y+h-2,z+d-2]}];
}
