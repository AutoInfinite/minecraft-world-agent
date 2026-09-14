import {z} from 'zod';
import {DatabaseSync} from 'node:sqlite';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {boundsSchema,coord,overlaps,type Bounds} from '../tool-schemas/index.js';
import {root} from '../../apps/mcp-server/bridge.js';
const id=z.string().regex(/^[a-z][a-z0-9._-]*$/);
const catalogSchema=z.object({schemaVersion:z.literal(1),maps:z.array(z.object({id, title:z.string(),project:id,authoringBounds:boundsSchema}).strict())}).strict();
const region=z.object({id,role:z.string(),bounds:boundsSchema,module:id.optional(),origin:coord.optional(),rotation:z.union([z.literal(0),z.literal(90),z.literal(180),z.literal(270)]).optional(),tags:z.array(z.string()),storyBeats:z.array(id)}).strict();
export const modelSchema=z.object({id,title:z.string(),schemaVersion:z.literal(1),start:id,ending:id,regions:z.array(region),routes:z.array(z.object({id,from:id,to:id,type:z.enum(['main','optional']),bidirectional:z.boolean(),points:z.array(coord).min(2)}).strict()),landmarks:z.array(z.object({id,region:id,position:coord}).strict()),cameras:z.array(z.object({id,region:id,position:coord,yaw:z.number(),pitch:z.number().min(-90).max(90),fov:z.number().min(30).max(110),hud:z.boolean(),time:z.number().int().min(0).max(23999),weather:z.enum(['clear','rain','thunder'])}).strict()),storyBeats:z.array(id)}).strict();
export type Model=z.infer<typeof modelSchema>;
export type MapCatalog=z.infer<typeof catalogSchema>;
export async function loadCatalog(){return catalogSchema.parse(JSON.parse(await readFile(path.join(root,'projects/maps.json'),'utf8')));}
export async function loadModel(mapId='abandoned-mine'){
  const catalog=await loadCatalog(),entry=catalog.maps.find(map=>map.id===mapId);if(!entry)throw new Error(`Unknown map ${mapId}`);
  const projects=path.resolve(root,'projects'),filename=path.resolve(projects,entry.project,'map','world.json');
  if(!filename.startsWith(projects+path.sep))throw new Error('Map path escapes projects directory');
  const model=modelSchema.parse(JSON.parse(await readFile(filename,'utf8')));if(model.id!==entry.id)throw new Error(`Map ID mismatch for ${entry.id}`);return model;
}
export async function validateCatalog(){
  const catalog=await loadCatalog(),errors:string[]=[];
  if(new Set(catalog.maps.map(map=>map.id)).size!==catalog.maps.length)errors.push('Duplicate map ID');
  for(const entry of catalog.maps){const model=await loadModel(entry.id),validation=validateModel(model);errors.push(...validation.errors.map(error=>`${entry.id}: ${error}`));for(const region of model.regions)for(let i=0;i<3;i++)if(region.bounds.min[i]<entry.authoringBounds.min[i]||region.bounds.max[i]>entry.authoringBounds.max[i])errors.push(`${entry.id}: region ${region.id} escapes authoring bounds`);}
  for(let i=0;i<catalog.maps.length;i++)for(let j=i+1;j<catalog.maps.length;j++)if(overlaps(catalog.maps[i].authoringBounds,catalog.maps[j].authoringBounds))errors.push(`Map authoring bounds overlap: ${catalog.maps[i].id} / ${catalog.maps[j].id}`);
  return {errors,maps:catalog.maps.map(map=>map.id)};
}
export function validateModel(model:Model){
  const errors:string[]=[],warnings:string[]=[];const ids=new Set(model.regions.map(r=>r.id));
  if(ids.size!==model.regions.length)errors.push('Duplicate region ID');
  if(!ids.has(model.start)||!ids.has(model.ending))errors.push('Missing start or ending');
  for(const r of model.routes){if(!ids.has(r.from)||!ids.has(r.to))errors.push(`Broken route ${r.id}`);for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i];if(a.filter((n,j)=>n!==b[j]).length>1)errors.push(`Route ${r.id} has a diagonal segment`);}}
  for(const item of [...model.landmarks,...model.cameras])if(!ids.has(item.region))errors.push(`Broken region reference ${item.id}`);
  for(const r of model.regions)for(const b of r.storyBeats)if(!model.storyBeats.includes(b))errors.push(`Unknown story beat ${b}`);
  const seen=new Set([model.start]);let changed=true;
  while(changed){changed=false;for(const r of model.routes){if(seen.has(r.from)&&!seen.has(r.to)){seen.add(r.to);changed=true;}if(r.bidirectional&&seen.has(r.to)&&!seen.has(r.from)){seen.add(r.from);changed=true;}}}
  for(const r of model.regions){if(!seen.has(r.id))errors.push(`Disconnected region ${r.id}`);if(r.id!==model.ending&&!model.routes.some(e=>e.from===r.id||(e.to===r.id&&e.bidirectional)))errors.push(`Non-ending dead end ${r.id}`);}
  for(let i=0;i<model.regions.length;i++)for(let j=i+1;j<model.regions.length;j++)if(overlaps(model.regions[i].bounds,model.regions[j].bounds))warnings.push(`Overlap: ${model.regions[i].id} / ${model.regions[j].id}`);
  return {errors,warnings,reachable:[...seen]};
}
export class SpatialIndex {
  private db:DatabaseSync;
  constructor(filename:string){this.db=new DatabaseSync(filename);this.db.exec('CREATE TABLE IF NOT EXISTS regions (rowid INTEGER PRIMARY KEY, id TEXT UNIQUE, json TEXT); CREATE VIRTUAL TABLE IF NOT EXISTS spatial USING rtree(rowid,minX,maxX,minY,maxY,minZ,maxZ);');}
  rebuild(model:Model){
    this.db.exec('BEGIN; DELETE FROM spatial; DELETE FROM regions;');
    try{model.regions.forEach((r,i)=>{this.db.prepare('INSERT INTO regions VALUES (?,?,?)').run(i+1,r.id,JSON.stringify(r));this.db.prepare('INSERT INTO spatial VALUES (?,?,?,?,?,?,?)').run(i+1,r.bounds.min[0],r.bounds.max[0],r.bounds.min[1],r.bounds.max[1],r.bounds.min[2],r.bounds.max[2]);});this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}
  }
  query(b:Bounds){return this.db.prepare('SELECT regions.json FROM regions JOIN spatial USING(rowid) WHERE minX<=? AND maxX>=? AND minY<=? AND maxY>=? AND minZ<=? AND maxZ>=?').all(b.max[0],b.min[0],b.max[1],b.min[1],b.max[2],b.min[2]).map(r=>JSON.parse(r.json as string));}
  close(){this.db.close();}
}
export async function exportModel(mapId='abandoned-mine'){
  const model=await loadModel(mapId),validation=validateModel(model);if(validation.errors.length)throw new Error(validation.errors.join('\n'));
  await mkdir(path.join(root,'.runtime'),{recursive:true});const suffix=mapId==='abandoned-mine'?'':`.${mapId}`,index=new SpatialIndex(path.join(root,`.runtime/world-model${suffix}.db`));index.rebuild(model);index.close();
  await mkdir(path.join(root,'reports'),{recursive:true});
  await writeFile(path.join(root,`reports/world-model${suffix}.md`),`# ${model.title}\n\n${model.regions.length} locations; ${model.routes.length} routes; ${validation.errors.length} errors; ${validation.warnings.length} warnings.\n\n| Location | Role | Story |\n|---|---|---|\n${model.regions.map(r=>`| ${r.id} | ${r.role} | ${r.storyBeats.join(', ')} |`).join('\n')}\n\n\`\`\`mermaid\ngraph TD\n${model.routes.map(r=>`  ${r.from.replaceAll('.','_')} ${r.bidirectional?'<-->':'-->'} ${r.to.replaceAll('.','_')}`).join('\n')}\n\`\`\`\n`);
  return validation;
}
