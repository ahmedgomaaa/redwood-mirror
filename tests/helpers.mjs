import {spawn} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export function temporaryData(){return mkdtempSync(path.join(tmpdir(),'redwood-test-'));}
export const browserOptions={headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:process.platform==='win32'?{channel:'msedge'}:{})};
export async function startServer({port=4180,dataDir=temporaryData(),env={}}={}){
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,NODE_ENV:'development',PORT:String(port),DATA_DIR:dataDir,HOST:'127.0.0.1',REQUIRE_INVITES:'false',...env},stdio:['ignore','pipe','pipe','ipc']});let output='',err='';child.stderr.on('data',d=>err+=d);
 const admin=await Promise.race([new Promise((resolve,reject)=>{child.stdout.on('data',d=>{output+=d;const m=output.match(/Admin: (http[^\r\n]+)/);if(m)resolve(m[1]);else if(env.NODE_ENV==='production'&&output.includes('Bound to '))resolve('http://localhost:'+port+'/admin#'+env.MIRROR_ADMIN_TOKEN);});child.once('exit',code=>reject(Error('Server exited '+code+': '+err)));child.once('error',reject);}),sleep(8000).then(()=>{throw Error('Server timeout: '+err);})]);
 const url='http://localhost:'+port,key=admin.split('#')[1];return {child,url,key,dataDir,admin,logs:()=>output+err,get:async()=>fetch(url+'/api/state').then(r=>r.json()),async post(endpoint,body,token=undefined,headers={}){const r=await fetch(url+endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...headers},body:JSON.stringify(body)});return {status:r.status,body:await r.json(),headers:r.headers};},async stop(){if(child.exitCode!==null)return;await new Promise(resolve=>{child.once('exit',resolve);if(child.connected)child.send({type:'shutdown'});else child.kill();});}};
}
