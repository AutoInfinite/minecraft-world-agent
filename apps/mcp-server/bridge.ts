import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {schemas,policySchema,checkBounds,contains,blockMaterial,type ToolName,type Bounds,type Policy} from '../../packages/tool-schemas/index.js';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
export class Bridge {
  constructor(readonly policy:Policy,private token:string){}
  static async connect(){return new Bridge(policySchema.parse(JSON.parse(await readFile(path.join(root,'config/policy.json'),'utf8'))),(await readFile(path.join(root,'.runtime/token'),'utf8')).trim());}
  private async rpc(tool:string,args:unknown,actor:string,prompt:string,requestId:string):Promise<any>{
    const body=JSON.stringify({requestId,actor,prompt,tool,args});
    for(let attempt=0;attempt<2;attempt++){
      try{
        const response=await fetch(`http://127.0.0.1:${this.policy.port}/rpc`,{method:'POST',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},body,signal:AbortSignal.timeout(35000)});
        const result=await response.json() as any;
        if(response.status===504&&attempt===0)continue;
        if(!response.ok||!result.ok)throw new Error(result.error??`Bridge HTTP ${response.status}`);
        return result;
      }catch(e){
        if(e instanceof TypeError || (e instanceof Error&&e.name==='TimeoutError')){
          if(attempt===0)continue;
          throw new Error(`SERVER_UNAVAILABLE_OR_OUTCOME_UNKNOWN: start the local Paper server; retry requestId ${requestId} with identical arguments. ${e.message}`);
        }throw e;
      }
    }throw new Error('Bridge retry exhausted');
  }
  async call(name:ToolName,input:unknown):Promise<any>{
    const parsed=schemas[name].parse(input) as any;
    const {requestId=randomUUID(),actor,prompt,...args}=parsed;
    const write=!name.startsWith('world.');
    if(args.bounds)checkBounds(this.policy,args.bounds,write);
    for(const state of [args.block,args.from,args.to].filter(Boolean))if(!this.policy.palette.includes(blockMaterial(state)))throw new Error('BLOCK_NOT_ALLOWED');
    if(args.transactionId||args.snapshotId){
      const history=await this.rpc('world.get_change_history',{},actor,prompt,randomUUID());
      const transaction=args.transactionId?history.changes.find((t:any)=>t.transactionId===args.transactionId):history.snapshots.find((s:any)=>s.snapshotId===args.snapshotId);
      if(!transaction)throw new Error('UNKNOWN_TRANSACTION');
      checkBounds(this.policy,transaction.bounds as Bounds,true);
      if(args.bounds&&!contains(transaction.bounds,args.bounds))throw new Error('OUTSIDE_TRANSACTION');
      if((name==='build.fill_region'||name==='build.replace_palette')&&transaction.operations>=this.policy.maxOperations)throw new Error('OPERATION_LIMIT');
    }
    return this.rpc(name,args,actor,prompt,requestId);
  }
}
