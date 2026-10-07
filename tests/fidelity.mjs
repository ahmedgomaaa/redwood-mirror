import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifyFidelity} from '../scripts/verify-fidelity.mjs';
const dir=await mkdtemp(path.join(tmpdir(),'mirror-fidelity-'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const text=Buffer.from('alpha\r\nbeta\r\n'),binary=Buffer.from([0,13,10,255]);
const files=[{path:'source.js',kind:'text',bytes:text.length,sha256:sha(text),lfSha256:sha(Buffer.from('alpha\nbeta\n'))},{path:'asset.png',kind:'binary',bytes:binary.length,sha256:sha(binary)}];
async function manifest(entries=files){await writeFile(path.join(dir,'GAME-FIDELITY.json'),JSON.stringify({version:1,baselineCommit:'fixture',files:entries}));}
try{
 await writeFile(path.join(dir,'source.js'),text);await writeFile(path.join(dir,'asset.png'),binary);await manifest();assert.equal((await verifyFidelity(dir)).count,2);
 await writeFile(path.join(dir,'source.js'),'alpha\nbeta\n');assert.equal((await verifyFidelity(dir)).count,2);
 await writeFile(path.join(dir,'source.js'),'alpha\nbeta changed\n');await assert.rejects(verifyFidelity(dir),/MODIFIED source.js/);
 await writeFile(path.join(dir,'source.js'),text);await writeFile(path.join(dir,'asset.png'),Buffer.from([0,10,255]));await assert.rejects(verifyFidelity(dir),/MODIFIED asset.png/);
 await writeFile(path.join(dir,'asset.png'),binary);await rm(path.join(dir,'source.js'));await assert.rejects(verifyFidelity(dir),/MISSING source.js/);
 await manifest([{...files[0],path:'../outside'}]);await assert.rejects(verifyFidelity(dir),/Invalid/);
 await manifest([files[1],files[1]]);await assert.rejects(verifyFidelity(dir),/duplicate/);
 console.log('PASS: fidelity exact match, LF/CRLF, text/asset tamper, missing file, traversal and duplicate rejection.');
}finally{
 const relative=path.relative(path.resolve(tmpdir()),path.resolve(dir));assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative),'temporary cleanup must stay inside tmpdir');await rm(dir,{recursive:true,force:true});
}
