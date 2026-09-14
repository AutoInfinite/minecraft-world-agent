import {z} from 'zod';
import {randomUUID,createHash} from 'node:crypto';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {Bridge,root} from './bridge.js';
import {library,place} from '../../packages/build-primitives/modules.js';
import {composeModule} from '../../packages/build-primitives/composition.js';
import {organicPath} from '../../packages/build-primitives/landscape.js';
import {boundsSchema,coord,checkBounds} from '../../packages/tool-schemas/index.js';
import {loadModel,validateModel,SpatialIndex} from '../../packages/world-model/index.js';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
const meta={actor:z.string().min(1).max(120),prompt:z.string().min(1).max(2000)};
const result=(data:unknown)=>({content:[{type:'text' as const,text:JSON.stringify(data)}]});
const error=(e:unknown)=>({isError:true,...result({error:e instanceof Error?e.message:String(e)})});
function childId(parent:string,label:string){const h=createHash('sha256').update(`${parent}:${label}`).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
export function registerAuthoring(server:McpServer,bridge:Bridge){
  server.registerTool('art.get_direction',{description:'Return the compact, persistent art-direction card for a map or one semantic region. Use this before an art pass to avoid re-sending visual briefs.',inputSchema:z.object({...meta,mapId:z.literal('three-oh-seven').default('three-oh-seven'),regionId:z.enum(['apartment.bedroom','apartment.stairwell','courtyard']).optional()}).strict(),annotations:{readOnlyHint:true}},async a=>{
    try{
      const direction=JSON.parse(await readFile(path.join(root,'projects','three-oh-seven','art-direction.json'),'utf8'));
      const region=a.regionId?{[a.regionId]:direction.regions[a.regionId]}:direction.regions;
      return result({mapId:direction.mapId,northStar:direction.northStar,visualPromise:direction.visualPromise,avoid:direction.avoid,reviewOrder:direction.reviewOrder,regions:region});
    }catch(e){return error(e);}
  });
  server.registerTool('build.list_structures',{description:'List reusable structure recipes with dimensions, anchors and masterwork quality metrics.',inputSchema:z.object({...meta,seed:z.number().int().default(20260914)}).strict(),annotations:{readOnlyHint:true}},async a=>{
    try{return result(library(a.seed).map(module=>{const composed=composeModule(module,'masterwork');return {id:module.id,size:module.size,anchors:module.anchors,metrics:composed.metrics};}));}catch(e){return error(e);}
  });
  server.registerTool('build.describe_structure',{description:'Inspect one composed structure before staging it, including ordered passes, exact palette and portal diagnostics.',inputSchema:z.object({...meta,structureId:z.string(),seed:z.number().int().default(20260914),quality:z.enum(['shell','detailed','masterwork']).default('masterwork')}).strict(),annotations:{readOnlyHint:true}},async a=>{
    try{const module=library(a.seed).find(m=>m.id===a.structureId);if(!module)throw new Error('UNKNOWN_STRUCTURE');const composed=composeModule(module,a.quality);return result({id:module.id,size:module.size,anchors:module.anchors,quality:a.quality,layers:composed.layers,metrics:composed.metrics,palette:[...new Set(composed.fills.map(f=>f.block.split('[',1)[0]))].sort()});}catch(e){return error(e);}
  });
  server.registerTool('build.place_structure',{description:'Stage a deterministic composed module with protected portals, layered architecture, exact block-state transforms and quality metrics. Returns a dry-run; never commits automatically.',inputSchema:z.object({...meta,requestId:z.uuid().optional(),structureId:z.string(),origin:coord,rotation:z.union([z.literal(0),z.literal(90),z.literal(180),z.literal(270)]).default(0),mirror:z.boolean().default(false),seed:z.number().int().default(20260914),quality:z.enum(['shell','detailed','masterwork']).default('masterwork')}).strict()},async a=>{
    let transactionId:string|undefined,requestId=a.requestId??randomUUID();
    try{
      const module=library(a.seed).find(m=>m.id===a.structureId);if(!module)throw new Error('UNKNOWN_STRUCTURE');
      const composed=composeModule(module,a.quality),plan=place(composed,a.origin,a.rotation,a.mirror);checkBounds(bridge.policy,plan.bounds,true);
      if(plan.fills.length>bridge.policy.maxOperations)throw new Error('OPERATION_LIMIT');
      const context={actor:a.actor,prompt:a.prompt};
      const tx=await bridge.call('build.begin_transaction',{...context,requestId:childId(requestId,'begin'),name:a.structureId,bounds:plan.bounds});
      transactionId=tx.transactionId;
      for(let i=0;i<plan.fills.length;i++)await bridge.call('build.fill_region',{...context,...plan.fills[i],transactionId:tx.transactionId,requestId:childId(requestId,`fill-${i}`)});
      const preview=await bridge.call('build.dry_run',{...context,transactionId:tx.transactionId,requestId:childId(requestId,'preview')});
      return result({...preview,anchors:plan.anchors,structureId:a.structureId,seed:a.seed,quality:a.quality,layers:composed.layers,metrics:composed.metrics,requestId});
    }catch(e){
      if(transactionId)try{await bridge.call('build.rollback_transaction',{actor:a.actor,prompt:`Cancel incomplete staging for ${a.structureId}`,transactionId,requestId:childId(requestId,'cancel')});}catch{}
      return error(e);
    }
  });
  server.registerTool('build.create_path',{description:'Stage a deterministic variable-edge path with clustered material zones, center continuity and path-quality metrics. Returns a dry-run; never commits automatically.',inputSchema:z.object({...meta,requestId:z.uuid().optional(),points:z.array(coord).min(2).max(32),width:z.number().int().min(2).max(5).default(3),style:z.enum(['village','mine','ritual']).default('village'),seed:z.number().int().default(20260914)}).strict()},async a=>{
    let transactionId:string|undefined,requestId=a.requestId??randomUUID();
    try{
      const pathPlan=organicPath(a.points,a.width,a.style,a.seed),mins=[Infinity,Infinity,Infinity],maxes=[-Infinity,-Infinity,-Infinity];
      for(const f of pathPlan.fills)for(let i=0;i<3;i++){mins[i]=Math.min(mins[i],f.bounds.min[i]);maxes[i]=Math.max(maxes[i],f.bounds.max[i]);}
      const bounds={min:mins as [number,number,number],max:maxes as [number,number,number]};checkBounds(bridge.policy,bounds,true);
      const context={actor:a.actor,prompt:a.prompt},tx=await bridge.call('build.begin_transaction',{...context,requestId:childId(requestId,'begin'),name:`${a.style}-path`,bounds});transactionId=tx.transactionId;
      for(let i=0;i<pathPlan.fills.length;i++)await bridge.call('build.fill_region',{...context,...pathPlan.fills[i],transactionId,requestId:childId(requestId,`fill-${i}`)});
      const preview=await bridge.call('build.dry_run',{...context,transactionId,requestId:childId(requestId,'preview')});
      return result({...preview,metrics:pathPlan.metrics,requestId});
    }catch(e){
      if(transactionId)try{await bridge.call('build.rollback_transaction',{actor:a.actor,prompt:'Cancel incomplete organic path staging',transactionId,requestId:childId(requestId,'cancel')});}catch{}
      return error(e);
    }
  });
  server.registerTool('map.get_region',{description:'Read a canonical semantic location, role, bounds, routes and story beats.',inputSchema:z.object({...meta,mapId:z.string().default('abandoned-mine'),regionId:z.string()}).strict(),annotations:{readOnlyHint:true}},async a=>{try{const m=await loadModel(a.mapId),r=m.regions.find(r=>r.id===a.regionId);if(!r)throw new Error('UNKNOWN_REGION');return result({mapId:a.mapId,...r,routes:m.routes.filter(e=>e.from===r.id||e.to===r.id)});}catch(e){return error(e);}});
  server.registerTool('map.get_gameplay_graph',{description:'Read a canonical map graph with overlap, disconnection and dead-end validation.',inputSchema:z.object({...meta,mapId:z.string().default('abandoned-mine')}).strict(),annotations:{readOnlyHint:true}},async a=>{try{const m=await loadModel(a.mapId);return result({mapId:a.mapId,regions:m.regions,routes:m.routes,validation:validateModel(m)});}catch(e){return error(e);}});
  server.registerTool('map.query_regions',{description:'Query canonical regions for one map by inclusive 3D overlap using its rebuildable SQLite R-tree.',inputSchema:z.object({...meta,mapId:z.string().default('abandoned-mine'),bounds:boundsSchema}).strict(),annotations:{readOnlyHint:true}},async a=>{try{const m=await loadModel(a.mapId);const db=new SpatialIndex(path.join(root,`.runtime/world-model.${a.mapId}.db`));try{db.rebuild(m);return result(db.query(a.bounds));}finally{db.close();}}catch(e){return error(e);}});
}
