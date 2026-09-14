import {readFile,writeFile,mkdir,copyFile,access} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const win=process.platform==='win32';
const pins=JSON.parse(await readFile('toolchain.lock.json','utf8'));
const javaVersion=spawnSync('java',['-version'],{encoding:'utf8',windowsHide:true});
if(javaVersion.status!==0||!`${javaVersion.stdout}${javaVersion.stderr}`.includes(pins.java))throw new Error(`Use pinned Java ${pins.java}`);
const exists=async p=>access(p).then(()=>true,()=>false);
async function run(command,args,options={}) {
  return new Promise((resolve,reject)=>{
    const p=spawn(command,args,{cwd:root,stdio:'inherit',windowsHide:true,...options});
    p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(new Error(`${command} exited ${code}`)));
  });
}
const npm=async args=>win?run('cmd.exe',['/d','/c','npm.cmd',...args]):run('npm',args);
async function setup(){
  if(process.versions.node!==pins.node) throw new Error(`Use pinned Node ${pins.node}; found ${process.versions.node}`);
  await mkdir('.runtime',{recursive:true});
  await mkdir('reports',{recursive:true});
  await mkdir('server-dev/plugins/WorldAgent',{recursive:true});
  for(const d of pins.downloads){
    await mkdir(path.dirname(d.path),{recursive:true});
    if(!await exists(d.path)){
      console.log(`Downloading ${d.path}`);
      const r=await fetch(d.url,{headers:{'User-Agent':'MinecraftWorldAgent/0.1 (https://github.com/PaperMC/Paper)'}});
      if(!r.ok) throw new Error(`Download ${r.status}: ${d.url}`);
      const data=Buffer.from(await r.arrayBuffer());
      if(createHash(d.algorithm).update(data).digest('hex')!==d.hash) throw new Error('Download checksum mismatch');
      await writeFile(d.path,data);
    }
    if(createHash(d.algorithm).update(await readFile(d.path)).digest('hex')!==d.hash) throw new Error(`Checksum mismatch: ${d.path}`);
  }
  if(!await exists('.tools/gradle-9.1.0/bin/gradle')){
    if(win) await run('powershell.exe',['-NoProfile','-Command',"Expand-Archive -LiteralPath '.tools/gradle-9.1.0-bin.zip' -DestinationPath '.tools' -Force"]);
    else await run('unzip',['-q','.tools/gradle-9.1.0-bin.zip','-d','.tools']);
  }
  if(!await exists('.runtime/token')) await writeFile('.runtime/token',randomBytes(32).toString('hex'),{mode:0o600});
  await copyFile('.runtime/token','server-dev/plugins/WorldAgent/token');
  await copyFile('config/policy.json','server-dev/plugins/WorldAgent/policy.json');
  await npm([await exists('package-lock.json')?'ci':'install','--ignore-scripts','--cache',path.join(root,'.tools/npm-cache')]);
  console.log('Setup complete. Review https://aka.ms/MinecraftEULA before starting with --accept-eula.');
}
async function deploy(){
  await npm(['run','build']);
  const args=['--no-daemon','--gradle-user-home',path.join(root,'.tools/gradle-home'),':apps:paper-plugin:build'];
  if(win) await run('cmd.exe',['/d','/c',path.join(root,'.tools/gradle-9.1.0/bin/gradle.bat'),...args]);
  else await run(path.join(root,'.tools/gradle-9.1.0/bin/gradle'),args);
  await copyFile('apps/paper-plugin/build/libs/world-agent-0.1.0.jar','server-dev/plugins/world-agent-0.1.0.jar');
  await copyFile('config/policy.json','server-dev/plugins/WorldAgent/policy.json');
  await copyFile('projects/abandoned-mine/map/world.json','server-dev/plugins/WorldAgent/world-model.json');
  await copyFile('projects/three-oh-seven/map/world.json','server-dev/plugins/WorldAgent/three-oh-seven-world.json');
  await copyFile('projects/abandoned-mine/dialogue/mara.json','server-dev/plugins/WorldAgent/dialogue.json');
  await run('jar',['--create','--file',path.join(root,'server-dev/plugins/WorldAgent/resource-pack.zip'),'--no-manifest','-C',path.join(root,'projects/abandoned-mine/resource-pack'),'.']);
  const pack=await readFile('server-dev/plugins/WorldAgent/resource-pack.zip');
  await writeFile('server-dev/plugins/WorldAgent/resource-pack.sha1',createHash('sha1').update(pack).digest('hex'));
}
async function start(){
  if(process.argv.includes('--accept-eula')) await writeFile('server-dev/eula.txt','eula=true\n');
  if(!await exists('server-dev/eula.txt')) throw new Error('Read https://aka.ms/MinecraftEULA and rerun with --accept-eula if you agree.');
  await run('java',['-Xms512M','-Xmx2G','-jar','paper.jar','--nogui'],{cwd:path.join(root,'server-dev')});
}
async function snapshot(){
  const name=`world-${new Date().toISOString().replaceAll(':','-')}.tar`;
  await run('java',['scripts/ArchiveWorld.java',name]);
}
try{
  const cmd=process.argv[2];
  if(cmd==='setup') await setup();
  else if(cmd==='deploy') await deploy();
  else if(cmd==='start') await start();
  else if(cmd==='dev'){await setup();await deploy();await start();}
  else if(cmd==='snapshot') await snapshot();
  else throw new Error('Use setup | deploy | start | dev | snapshot');
}catch(e){console.error(e.message);process.exitCode=1;}
