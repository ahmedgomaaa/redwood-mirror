import assert from 'node:assert/strict';
import {startServer,sleep} from './helpers.mjs';
let s=await startServer({port:4187}),controller=new AbortController();
try{
 const joined=await s.post('/api/join',{name:'CrashRecovery',room:'MIRROR',storyChoices:[1,1,1]});const r=await fetch(s.url+'/api/events?view=player',{headers:{Authorization:'Bearer '+joined.body.token},signal:controller.signal});const reader=r.body.getReader();(async()=>{try{while(!(await reader.read()).done){}}catch{}})();
 await s.post('/api/player',{speed:6,extracting:true},joined.body.token);await s.post('/api/admin',{action:'start'},s.key);await sleep(700);const before=await s.get();assert(before.players[0].quality>0);
 const dir=s.dataDir;await new Promise(resolve=>{s.child.once('exit',resolve);s.child.kill('SIGKILL');});controller.abort();
 await assert.rejects(()=>startServer({port:4187,dataDir:dir}),/Another server owns/);await sleep(31000);s=await startServer({port:4187,dataDir:dir});const after=await s.get();assert.equal(after.status,'paused');assert.equal(after.players[0].extracting,false);assert.equal(after.players[0].title,'Watchkeeper');assert(after.players[0].quality>=before.players[0].quality);assert.equal((await s.post('/api/player',{action:'resume'},joined.body.token)).status,200);
 const idle=await s.get();await sleep(500);assert.equal((await s.get()).remaining,idle.remaining);assert.equal((await s.get()).players[0].quality,idle.players[0].quality);console.log('PASS: abrupt process kill, stale-lease protection, WAL recovery, preserved locked identity and no offline penalties.');
}finally{controller.abort();await s.stop();}
