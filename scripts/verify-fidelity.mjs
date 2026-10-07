import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const project=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function verifyFidelity(root=project){
 const base=path.resolve(root),manifest=JSON.parse(await readFile(path.join(base,'GAME-FIDELITY.json'),'utf8'));
 if(manifest.version!==1||!Array.isArray(manifest.files)||!manifest.files.length)throw Error('Invalid fidelity manifest.');
 const seen=new Set(),failures=[];
 for(const entry of manifest.files){
  if(!entry||typeof entry.path!=='string'||!entry.path||entry.path.includes('\\')||entry.path.split('/').some(part=>!part||part==='.'||part==='..')||path.isAbsolute(entry.path)||seen.has(entry.path)||!/^[a-f0-9]{64}$/.test(entry.sha256)||!Number.isSafeInteger(entry.bytes)||entry.bytes<0||!['text','binary'].includes(entry.kind))throw Error('Invalid/duplicate fidelity entry.');
  seen.add(entry.path);const target=path.resolve(base,entry.path),relative=path.relative(base,target);
  if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Fidelity path escapes project.');
  try{
   const bytes=await readFile(target);if(digest(bytes)===entry.sha256&&bytes.length===entry.bytes)continue;
   if(entry.kind==='text'&&/^[a-f0-9]{64}$/.test(entry.lfSha256||'')&&digest(Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n')))==entry.lfSha256)continue;
   failures.push('MODIFIED '+entry.path);
  }catch(e){if(e.code==='ENOENT')failures.push('MISSING '+entry.path);else throw e;}
 }
 if(failures.length)throw Error('Fidelity FAILED; do not regenerate the baseline to hide changes:\n'+failures.join('\n'));
 return {count:manifest.files.length,baseline:manifest.baselineCommit};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv.length>3)throw Error('Usage: node scripts/verify-fidelity.mjs [project-root]');const result=await verifyFidelity(process.argv[2]||project);console.log(`PASS: ${result.count} protected files match original gameplay/assets (LF/CRLF equivalent text); baseline ${result.baseline}.`);}catch(e){console.error(e.message);process.exitCode=1;}
}
