import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const excluded=new Set(['node_modules','data','backups','release','.git']);let count=0;
async function walk(dir='.'){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  if(excluded.has(entry.name)||entry.name.endsWith('.log')||entry.name.endsWith('.zip')||(entry.name.startsWith('.env')&&entry.name!=='.env.example'))continue;
  const file=path.join(dir,entry.name);if(entry.isDirectory()){await walk(file);continue;}
  if(!/\.(?:mjs|js|json|md|html|ya?ml|example)$/.test(entry.name))continue;
  const text=await readFile(file,'utf8');
  if(/C:[\\/]+Users[\\/]/i.test(text))throw Error('Machine-specific path in release: '+file);
  if(/admin#[a-f0-9]{32,}/i.test(text))throw Error('Embedded private host credential: '+file);
  if(/(?:sk-proj-|ghp_)[A-Za-z0-9_-]{20,}/.test(text))throw Error('Possible API secret: '+file);
  count++;
 }
}
await walk();console.log('PASS: '+count+' source/config/documentation files checked; no hard-coded user paths or host keys. Exclude data, .env, logs and backups when publishing.');
