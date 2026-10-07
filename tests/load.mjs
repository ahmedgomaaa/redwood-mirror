import assert from 'node:assert/strict';
import {startServer,sleep} from './helpers.mjs';
const s=await startServer({port:4182}),controllers=[],readers=[];let bytes=0,frames=0;
try{
 const players=[];for(let i=0;i<100;i++){const joined=await s.post('/api/join',{name:'Player'+i,room:'MIRROR'});assert.equal(joined.status,200);players.push(joined);}
 assert.equal((await s.post('/api/join',{name:'Overflow',room:'MIRROR'})).status,409);
 await Promise.all(players.map(async p=>{const controller=new AbortController();controllers.push(controller);const response=await fetch(s.url+'/api/events?view=player',{headers:{Cookie:p.headers.get('set-cookie').split(';')[0]},signal:controller.signal});assert.equal(response.status,200);const reader=response.body.getReader();readers.push((async()=>{try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;frames+=(new TextDecoder().decode(value).match(/data: /g)||[]).length;}}catch(e){if(e.name!=='AbortError')throw e;}})());}));
 await Promise.all(players.map(p=>s.post('/api/player',{speed:6,extracting:true},p.body.token)));await s.post('/api/admin',{action:'start'},s.key);
 const latencies=[];for(let i=0;i<30;i++){const start=performance.now();const response=await fetch(s.url+'/healthz');assert.equal(response.status,200);latencies.push(performance.now()-start);await sleep(100);}
 const snapshot=await s.get();assert.equal(snapshot.players.length,100);assert(snapshot.players.every(p=>p.queries>0&&p.quality>0));assert(frames>=300);latencies.sort((a,b)=>a-b);const p95=latencies[Math.floor(latencies.length*.95)];assert(p95<1000,'health p95 exceeded 1s');
 console.log(JSON.stringify({test:'100 simultaneous live player streams',pass:true,healthP95ms:Math.round(p95),framesReceived:frames,totalReceivedMB:Math.round(bytes/1048576*10)/10,playersProgressing:snapshot.players.filter(p=>p.quality>0).length}));
}finally{controllers.forEach(c=>c.abort());await Promise.all(readers);await s.stop();}
