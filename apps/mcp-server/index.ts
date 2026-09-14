import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {schemas,type ToolName} from '../../packages/tool-schemas/index.js';
import {Bridge} from './bridge.js';
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {registerAuthoring} from './authoring.js';
const descriptions:Record<ToolName,string>={
  'gameplay.get_state':'Inspect persisted player progression and current boss phase.',
  'gameplay.run_self_test':'Test canonical Java progression and file persistence on the plugin. Does not simulate a real Minecraft player or test listeners.',
  'observer.get_state':'Read the visible server-side Codex Observer avatar. This avatar is not an authenticated Minecraft player and has no renderer.',
  'observer.place':'Move the server-side Codex Observer avatar to one canonical saved camera. It cannot use arbitrary coordinates or player commands.',
  'world.get_summary':'Read server versions and active build policy.',
  'world.get_blocks':'Read every block state in a bounded region, with SHA-256 checksum.',
  'world.get_entities':'Read bounded entities; no mutation.',
  'world.get_change_history':'List transaction status, bounds and changed-block counts.',
  'build.begin_transaction':'Capture an inert block baseline and begin a staged transaction. No world mutation.',
  'build.fill_region':'Stage an allowlisted block fill inside the transaction. No world mutation.',
  'build.replace_palette':'Stage an exact percentage of matching blocks selected deterministically by seed.',
  'build.dry_run':'Inspect staged bounds, actual changed-block estimate and palette; returns approval hash.',
  'build.commit_transaction':'Apply the exact reviewed previewHash. Requires approval for the interactive demo. Persists before-image first.',
  'build.rollback_transaction':'Cancel staged work or restore a committed before-image if the world has no conflicting edits.',
  'build.undo':'Undo a committed change using its transactionId, with conflict detection.',
  'snapshot.create':'Save an inert block-data snapshot. Rejects block entities and occupied regions.',
  'snapshot.stage_restore':'Prepare snapshot restoration as a new transaction; dry-run and commit still required.',
};
try{
  const bridge=await Bridge.connect();
  const server=new McpServer({name:'minecraft-world-agent',version:'0.1.0'});
  for(const name of Object.keys(schemas) as ToolName[]){
    server.registerTool(name,{description:descriptions[name],inputSchema:schemas[name],annotations:{readOnlyHint:name.startsWith('world.')||name==='observer.get_state',destructiveHint:name==='build.commit_transaction'||name==='build.undo'||name==='build.rollback_transaction',openWorldHint:false}},async (args:unknown):Promise<CallToolResult>=>{
      try{return {content:[{type:'text',text:JSON.stringify(await bridge.call(name,args))}]};}
      catch(e){return {isError:true,content:[{type:'text',text:e instanceof Error?e.message:String(e)}]};}
    });
  }
  registerAuthoring(server,bridge);
  await server.connect(new StdioServerTransport());
}catch(e){console.error(`World Agent startup: ${e instanceof Error?e.message:e}`);process.exitCode=1;}
