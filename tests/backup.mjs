import {spawnSync} from 'node:child_process';
import {readdirSync,copyFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {startServer,temporaryData,sleep} from './helpers.mjs';
let s=await startServer({port:4186});
try{
 const joined=await s.post('/api/join',{name:'Backup',room:'MIRROR',storyChoices:[0,0,0]});const working=temporaryData();const script=fileURLToPath(new URL('../scripts/backup.mjs',import.meta.url));
 const result=spawnSync(process.execPath,[script],{cwd:working,env:{...process.env,NODE_ENV:'development',DATA_DIR:s.dataDir},encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 const backup=path.join(working,'backups',readdirSync(path.join(working,'backups'))[0]);const db=new DatabaseSync(backup);assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');const state=JSON.parse(db.prepare('SELECT payload FROM snapshot').get().payload);assert.equal(state.players[0].assignedTitle,'Mastermind');db.close();
 await s.stop();const restored=temporaryData();copyFileSync(backup,path.join(restored,'game.sqlite'));await sleep(31000);s=await startServer({port:4186,dataDir:restored});assert.equal((await s.get()).players[0].title,'Mastermind');assert.equal((await s.post('/api/player',{action:'resume'},joined.body.token)).status,200);
 console.log('PASS: consistent SQLite backup, integrity check and restored locked identity/session.');
}finally{await s.stop();}
