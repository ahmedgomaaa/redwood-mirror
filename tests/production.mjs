import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {startServer} from './helpers.mjs';
const secret=randomBytes(32).toString('hex'),origin='https://game.example.test';
const s=await startServer({port:4185,env:{NODE_ENV:'production',PUBLIC_ORIGIN:origin,MIRROR_ADMIN_TOKEN:secret,REQUIRE_INVITES:'true',ALLOW_DEMO_BOTS:'false'}});
try{
 assert(!s.logs().includes(secret),'production log contains secret');assert.equal((await s.post('/api/admin',{action:'bots'},secret)).status,403);
 const invitations=await s.post('/api/admin',{action:'invites',count:1},secret,{Origin:origin});assert.equal(invitations.status,200);
 const joined=await s.post('/api/join',{name:'Production',room:'MIRROR',invite:invitations.body.codes[0],origin:true},undefined,{Origin:origin});assert.equal(joined.status,200);assert.match(joined.headers.get('set-cookie'),/Secure/);
 assert.equal((await s.post('/api/player',{action:'resume'},joined.body.token,{Origin:'http://game.example.test'})).status,403);
 assert.equal((await s.post('/api/origin-finish',{choices:[2,2,2]},joined.body.token,{Origin:origin})).status,200);assert.equal((await s.get()).players[0].title,'Vigilante Hacker');
 const health=await fetch(s.url+'/healthz');assert.equal(health.headers.get('strict-transport-security'),'max-age=31536000');assert(!JSON.stringify(await s.get()).includes(secret));
 console.log('PASS: production settings, secret-log redaction, origin matching, Secure cookies, invites and disabled demo bots. HTTPS termination itself remains a hosting acceptance check.');
}finally{await s.stop();}
