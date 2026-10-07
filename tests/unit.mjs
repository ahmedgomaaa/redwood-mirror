import assert from 'node:assert/strict';
import {queryRates} from '../public/game-rules.js';
import {titleFor,roles,scenes} from '../public/story.js';
import {Store} from '../lib/storage.mjs';
import {temporaryData} from './helpers.mjs';
for(let i=0;i<roles.length;i++)assert.equal(titleFor([i,i,i]),roles[i]);assert.equal(titleFor([0,1,2]),roles[2]);assert.equal(titleFor([]),'Operative');assert.equal(scenes.length,5);
const state={levels:[{speed:false,repetition:false},{speed:true,repetition:false},{speed:false,repetition:true},{speed:true,repetition:true}],level:0,pace:1,duration:180,detection:1};
assert.match(scenes[1].text,/save its answers, and train a smaller AI/,'briefing explains the actual mission');
assert.match(scenes[2].text,/“teacher” AI/);assert.match(scenes[2].text,/“student” AI/);assert.match(scenes[2].text,/Both are models/,'school metaphors must be explained as AI roles');
for(let level=0;level<4;level++)for(let speed=1;speed<=10;speed++)for(const spacing of [0,50,100])for(const variety of [0,50,100])for(const verification of [0,50,100]){
 const p={speed,spacing,variety,verification,solved:[1,2,3].filter(i=>i<=level),gain:0,bank:0,coverage:0},r=queryRates(p,{...state,level});for(const x of Object.values(r))assert(Number.isFinite(x));assert(r.gain>=0&&r.requests>=0);if(level===0)assert(r.suspicion<=0);
}
const p={speed:10,spacing:0,variety:25,verification:0,solved:[1],gain:0,bank:0,coverage:0};assert(queryRates(p,{...state,level:1}).suspicion>queryRates({...p,spacing:100},{...state,level:1}).suspicion);
const store=new Store(temporaryData());store.save({test:true});store.db.exec('PRAGMA query_only=ON');assert.throws(()=>store.save({test:false}));assert.equal(store.failed,true);assert.equal(store.healthy(),false);store.db.exec('PRAGMA query_only=OFF');store.close();
console.log('PASS: 1,080 tuning combinations, title rules, finite rates, progression invariants and fail-closed storage writes.');
