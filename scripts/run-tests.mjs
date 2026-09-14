import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
await mkdir('reports',{recursive:true});
if(process.argv.includes('--accept-eula'))await writeFile('server-dev/eula.txt','eula=true\n');
const token=(await readFile('.runtime/token','utf8')).trim();
let activeToken=token;
let server;
async function ready(){
  try{const r=await fetch('http://127.0.0.1:38765/rpc',{method:'POST',headers:{Authorization:`Bearer ${activeToken}`,'Content-Type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID(),actor:'test-harness',prompt:'Wait for bridge readiness',tool:'world.get_summary',args:{}}),signal:AbortSignal.timeout(2000)});return r.ok&&(await r.json()).ok;}catch{return false;}
}
async function start(label,exportDirectory){
  if(await ready())throw new Error('A server is already running. Stop it before the managed integration suite.');
  console.log(`Starting real Paper server (${label})`);
  const log=createWriteStream(`reports/server-${label}.log`);
  server=exportDirectory?spawn(process.execPath,['start.mjs','--accept-eula'],{cwd:exportDirectory,windowsHide:true,stdio:['pipe','pipe','pipe']}):spawn('java',['-Xms512M','-Xmx2G','-jar','paper.jar','--nogui'],{cwd:path.join(root,'server-dev'),windowsHide:true,stdio:['pipe','pipe','pipe']});
  server.stdout.pipe(log,{end:false});server.stderr.pipe(log,{end:false});server.once('exit',()=>log.end());
  let failure;server.on('error',e=>failure=e);
  for(let i=0;i<180;i++){
    if(failure)throw failure;if(server.exitCode!==null)throw new Error(`Paper exited ${server.exitCode}. See reports/server-${label}.log`);
    if(exportDirectory)try{activeToken=(await readFile(path.join(exportDirectory,'plugins/WorldAgent/token'),'utf8')).trim();}catch{}
    if(await ready()){console.log('Paper and authenticated WorldEdit bridge are ready');return;}
    await new Promise(r=>setTimeout(r,1000));
  }throw new Error('Paper startup timed out; see server log');
}
async function stop(){
  if(!server||server.exitCode!==null)return;
  console.log('Saving and stopping Paper cleanly');
  const done=new Promise(r=>server.once('exit',r));
  server.stdin.write('stop\n');
  await Promise.race([done,new Promise((_,reject)=>{const t=setTimeout(()=>reject(new Error('Server did not stop within 45 seconds; inspect before proceeding')),45000);t.unref();})]);
}
async function run(file,args=[]){
  await new Promise((resolve,reject)=>{const p=spawn(process.execPath,[file,...args],{cwd:root,stdio:'inherit',windowsHide:true});p.on('error',reject);p.on('exit',c=>c===0?resolve():reject(new Error(`${file} exited ${c}`)));});
}
try{
  if(process.argv.includes('--verify-export')){
    const manifest=JSON.parse(await readFile('reports/export.json','utf8'));
    const stage=manifest.zip.slice(0,-4);
    await start('archive-lock');
    const lockCheck=await new Promise((resolve,reject)=>{const p=spawn('java',['scripts/ArchiveWorld.java','must-not-copy-live-world.tar'],{cwd:root,windowsHide:true,stdio:'pipe'});let output='';p.stderr.on('data',b=>output+=b);p.on('error',reject);p.on('exit',code=>resolve({code,output}));});
    if(lockCheck.code===0)throw new Error('Snapshot unexpectedly accepted a running world');
    await stop();
    await start('export',stage);
    const response=await fetch('http://127.0.0.1:38765/rpc',{method:'POST',headers:{Authorization:`Bearer ${activeToken}`,'Content-Type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID(),actor:'package-check',prompt:'Verify exported actual world',tool:'world.get_blocks',args:{bounds:{min:[107,100,130],max:[107,102,130]}}})});
    const blocks=await response.json();if(!blocks.ok||blocks.blocks['107,100,130']!=='minecraft:cobblestone'||blocks.blocks['107,101,130']!=='minecraft:air')throw new Error('Exported world spawn mismatch');
    await stop();
    await run('dist/packages/test-scenarios/unavailable.js');
    await writeFile('reports/package-validation.json',JSON.stringify({at:new Date().toISOString(),status:'PASS',checks:['live world archive rejected by session lock','prototype starts with fresh generated token','exported Paper + WorldEdit + gameplay plugin initialize','actual exported spawn floor and clearance match','clean shutdown','MCP unavailable error after stop']},null,2));
    console.log('PASS locked snapshot safety, exported server startup, world contents and unavailable error');
  }else{
  await start('integration');await run('dist/packages/test-scenarios/integration.js');
  await run('dist/packages/test-scenarios/restart.js',['prepare']);await stop();
  await start('restart');await run('dist/packages/test-scenarios/restart.js',['verify']);
  if(process.argv.includes('--build-village'))await run('dist/packages/test-scenarios/build-village.js');
  if(process.argv.includes('--village-qa')||process.argv.includes('--build-village'))await run('dist/packages/test-scenarios/village-qa.js');
  }
}catch(e){console.error(e);process.exitCode=1;}
finally{await stop();}
