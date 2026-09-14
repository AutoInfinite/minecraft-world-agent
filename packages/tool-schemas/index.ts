import {z} from 'zod';
export const coord=z.tuple([z.number().int().min(-30000000).max(30000000),z.number().int().min(-64).max(319),z.number().int().min(-30000000).max(30000000)]);
export const boundsSchema=z.object({min:coord,max:coord}).strict().refine(b=>b.min.every((v,i)=>v<=b.max[i]),'min must not exceed max');
export type Bounds=z.infer<typeof boundsSchema>;
export const volume=(b:Bounds)=>b.max.reduce((v,n,i)=>v*(n-b.min[i]+1),1);
export const contains=(outer:Bounds,inner:Bounds)=>inner.min.every((n,i)=>n>=outer.min[i]&&inner.max[i]<=outer.max[i]);
export const overlaps=(a:Bounds,b:Bounds)=>a.min.every((n,i)=>n<=b.max[i]&&a.max[i]>=b.min[i]);
const meta={requestId:z.uuid().optional(),actor:z.string().min(1).max(120),prompt:z.string().min(1).max(2000)};
const tx={transactionId:z.uuid()};
// NBT is intentionally excluded. Paper performs the authoritative property/value validation.
export const blockStateSchema=z.string().max(240).regex(/^minecraft:[a-z_]+(?:\[[a-z_]+=[a-z0-9_]+(?:,[a-z_]+=[a-z0-9_]+)*\])?$/);
const block=blockStateSchema;
export const blockMaterial=(state:string)=>state.split('[',1)[0];
export const schemas={
  'gameplay.get_state':z.object({...meta,playerId:z.uuid().optional()}).strict(),
  'gameplay.run_self_test':z.object({...meta}).strict(),
  'world.get_summary':z.object({...meta}).strict(),
  'world.get_blocks':z.object({...meta,bounds:boundsSchema}).strict(),
  'world.get_entities':z.object({...meta,bounds:boundsSchema}).strict(),
  'world.get_change_history':z.object({...meta}).strict(),
  'build.begin_transaction':z.object({...meta,name:z.string().min(1).max(120),bounds:boundsSchema}).strict(),
  'build.fill_region':z.object({...meta,...tx,bounds:boundsSchema,block}).strict(),
  'build.replace_palette':z.object({...meta,...tx,bounds:boundsSchema,from:block,to:block,percent:z.number().int().min(0).max(100),seed:z.number().int().min(-2147483648).max(2147483647)}).strict(),
  'build.dry_run':z.object({...meta,...tx}).strict(),
  'build.commit_transaction':z.object({...meta,...tx,previewHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
  'build.rollback_transaction':z.object({...meta,...tx}).strict(),
  'build.undo':z.object({...meta,...tx}).strict(),
  'snapshot.create':z.object({...meta,name:z.string().min(1).max(120),bounds:boundsSchema}).strict(),
  'snapshot.stage_restore':z.object({...meta,snapshotId:z.uuid()}).strict(),
};
export type ToolName=keyof typeof schemas;
export const policySchema=z.object({world:z.string(),port:z.number().int().min(1024).max(65535),maxVolume:z.number().int().min(1).max(8192),maxOperations:z.number().int().min(1).max(128),buildZone:boundsSchema,protectedRegions:z.array(boundsSchema),palette:z.array(block)}).strict();
export type Policy=z.infer<typeof policySchema>;
export function checkBounds(policy:Policy,bounds:Bounds,write:boolean){
  boundsSchema.parse(bounds);
  if(!contains(policy.buildZone,bounds))throw new Error('OUTSIDE_BUILD_ZONE');
  if(volume(bounds)>policy.maxVolume)throw new Error('VOLUME_LIMIT');
  if(write&&policy.protectedRegions.some(b=>overlaps(b,bounds)))throw new Error('PROTECTED_REGION');
}
