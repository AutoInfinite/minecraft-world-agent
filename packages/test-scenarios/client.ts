import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {root} from '../../apps/mcp-server/bridge.js';
import path from 'node:path';
export async function connectMcp(){
  const client=new Client({name:'world-agent-fixture',version:'0.1.0'});
  await client.connect(new StdioClientTransport({command:process.execPath,args:[path.join(root,'dist/apps/mcp-server/index.js')],cwd:root,stderr:'inherit'}));
  async function call(name:string,args:Record<string,unknown>={}){
    const r=await client.callTool({name,arguments:{actor:'fixture-suite',prompt:'Isolated fixture integration acceptance',...args}});
    const text=(r.content as any[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');
    if(r.isError)throw new Error(text);
    return JSON.parse(text);
  }
  return {client,call};
}
