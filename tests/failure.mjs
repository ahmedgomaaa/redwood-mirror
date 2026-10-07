import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import {startServer,temporaryData,sleep} from './helpers.mjs';
import assert from 'node:assert/strict';
import path from 'node:path';
const secret=randomBytes(32).toString('hex');let server;
async function exitOf(env){const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4184',DATA_DIR:temporaryData(),...env},stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);const code=await Promise.race([new Promise(r=>child.once('exit',r)),sleep(5000).then(()=>{child.kill();throw Error('Expected startup to fail');})]);return {code,output};}
try{
 const missing=await exitOf({NODE_ENV:'production',PUBLIC_ORIGIN:'',MIRROR_ADMIN_TOKEN:''});assert.notEqual(missing.code,0);assert.match(missing.output,/Production requires/);
 const bad=await exitOf({NODE_ENV:'production',PUBLIC_ORIGIN:'http://example.test',MIRROR_ADMIN_TOKEN:secret});assert.notEqual(bad.code,0);
 server=await startServer({port:4184});const rival=await exitOf({DATA_DIR:server.dataDir,NODE_ENV:'development'});assert.notEqual(rival.code,0);assert.match(rival.output,/Another server owns/);
 const dir=server.dataDir;await server.stop();server=null;const db=new DatabaseSync(path.join(dir,'game.sqlite'));db.exec('UPDATE snapshot SET version=99');db.close();const incompatible=await exitOf({DATA_DIR:dir,NODE_ENV:'development'});assert.notEqual(incompatible.code,0);assert.match(incompatible.output,/Unsupported saved-state version/);
 const db2=new DatabaseSync(path.join(dir,'game.sqlite'));assert.equal(db2.prepare('SELECT version FROM snapshot').get().version,99);db2.close();
 console.log('PASS: production fail-closed configuration, single-writer lease and incompatible saved-state protection.');
}finally{await server?.stop();}
