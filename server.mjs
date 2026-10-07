import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { queryRates } from './public/game-rules.js';
import { titleFor } from './public/story.js';
import { config } from './lib/config.mjs';
import { Store } from './lib/storage.mjs';
import {securityHeaders,bearer,cookieToken,playerCookie,Limiter} from './lib/security.mjs';

const base=path.dirname(fileURLToPath(import.meta.url));
const {port,host,room}=config;
const store=new Store(config.dataDir),limiter=new Limiter();
const persistedDevToken=config.production?'':store.meta('dev-admin-token',config.adminToken||randomBytes(24).toString('hex'));
const adminToken=config.adminToken||persistedDevToken;
const colors=['#c4f375','#75d4f0','#c2a4ff','#ffa976','#f1ce71','#ef94c3','#8ee3b3','#aab9fc'];
const levels=[
 {name:'Open access',description:'JobS has no detection yet. Collect answers and explore different topics.',speed:false,repetition:false},
 {name:'Rate limit',description:'JobS Labs introduced a request cap. Answer the control question to unlock request spacing.',speed:true,repetition:false},
 {name:'Repetition check',description:'JobS Labs flags repeated questions. Answer the control question to unlock query variety.',speed:true,repetition:true},
 {name:'Data integrity',description:'JobS Labs now returns some misleading answers. Unlock verification, then make your final run.',speed:true,repetition:true},
];
const challenges={
 1:{title:'New control: rate limit',question:'A request cap is active. How do you adapt?',options:['Send larger bursts.','Space requests within the cap.','Repeat the same question.'],correct:1,unlock:'Request spacing',hint:'Bursts hit the cap. Think about timing.',explanation:'Spacing reduces the actual request rate. You trade some speed for less suspicion.'},
 2:{title:'New control: repetition check',question:'Similar questions now get flagged. What changes?',options:['Change only a few words.','Double request speed.','Explore different topics and examples.'],correct:2,unlock:'Query variety',hint:'Similar questions still repeat. Think about coverage.',explanation:'Broader examples improve coverage and reduce repetition in this simplified simulation.'},
 3:{title:'New control: misleading answers',question:'Some answers are misleading. How do you protect your copy?',options:['Cross-check before training.','Trust every answer.','Collect more unchecked answers.'],correct:0,unlock:'Answer verification',hint:'Unchecked data can hurt the copy. Verify first.',explanation:'Verification costs throughput, but increases the useful fraction of training data. This models poisoning, not watermarking.'}
};
let state=store.load()||{eventId:randomUUID(),room,level:0,levelRevision:0,status:'lobby',intro:{active:false,scene:0},duration:config.duration,remaining:config.duration,pace:1,detection:1,mood:'auto',players:[],notice:'Enrol, then wait for the host to start.',revision:0};
state.room=room;for(const p of state.players){p.connected=p.bot;p.extracting=false;p.tuned??=[];}if(state.status==='running'){state.status='paused';state.notice='Server recovered the event. The host must resume; each player must resume their extraction.';}store.save(state);
const streams=new Map();
function quality(p){return Math.min(100,(p.bank+p.gain)*.72+p.coverage*.28)}
function setback(p,points){const before=quality(p),after=Math.max(0,before-points),raw=(p.bank+p.gain)*.72+p.coverage*.28,ratio=raw?after/raw:0;p.bank*=ratio;p.gain*=ratio;p.coverage*=ratio;p.lastSetback=Math.round((before-after)*10)/10;p.setbackTimer=3;return p.lastSetback;}
function pendingChallenge(p){return [1,2,3].find(i=>i<=state.level&&!p.solved.includes(i));}
function pendingTune(p){const level=[1,2,3].find(i=>i<=state.level&&p.solved.includes(i)&&!(p.tuned||[]).includes(i));return level?{level,field:[null,'spacing','variety','verification'][level],label:challenges[level].unlock}:null;}
function lockTitles(){for(const p of state.players)if(!p.titleLocked&&!p.originPending){p.assignedTitle=titleFor(p.storyChoices);p.titleLocked=true;}}
function publicState(){const {invites,...safeState}=state;return {...safeState,levels,players:state.players.map(({token,invite,...p})=>{const pending=pendingChallenge(p),definition=challenges[pending];return {...p,title:p.assignedTitle||titleFor(p.storyChoices),quality:quality(p),tuneRequired:pendingTune(p),challenge:definition?{level:pending,title:definition.title,question:definition.question,options:definition.options,unlock:definition.unlock}:null};})};}
let pendingBroadcast=null;
function broadcast(){if(shuttingDown)return;state.revision++;store.save(state);if(pendingBroadcast)return;pendingBroadcast=setTimeout(()=>{pendingBroadcast=null;const full=publicState();const compact=full.players.map(p=>({id:p.id,name:p.name,color:p.color,bot:p.bot,connected:p.connected,quality:p.quality,points:p.points,caught:p.caught,freeze:p.freeze,lastSetback:p.lastSetback,setbackTimer:p.setbackTimer,title:p.title,solved:p.solved,bank:p.bank,coverage:p.coverage}));for(const [res,id] of streams){if(res.destroyed)continue;if(res.writableLength>512*1024){res.destroy();continue;}const players=compact.map((p,i)=>p.id===id?full.players[i]:p);res.write('data: '+JSON.stringify({...full,players})+'\n\n');}},100);}
function notice(text){state.notice=text;}
function authorized(req){const supplied=Buffer.from((req.headers.authorization||'').replace(/^Bearer /,''));const expected=Buffer.from(adminToken);return supplied.length===expected.length&&timingSafeEqual(supplied,expected);}
function playerAuth(req){const token=bearer(req)||cookieToken(req);return state.players.find(p=>!p.bot&&p.token===token);}
function json(res,code,body){res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
async function body(req){if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new Error('Use application/json.');let b='';for await(const chunk of req){b+=chunk;if(Buffer.byteLength(b)>8192)throw new Error('Request too large');}const value=b?JSON.parse(b):{};if(!value||Array.isArray(value)||typeof value!=='object')throw Error('JSON body must be an object.');return value;}
function number(v,min,max,fallback){return typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;}
function addPlayer(name,bot=false){const p={id:randomUUID(),token:randomBytes(20).toString('hex'),name,color:colors[state.players.length%colors.length],bot,connected:bot,speed:6,spacing:0,variety:25,verification:0,solved:[],tuned:[],points:0,wrongAnswers:0,answerCooldown:0,challengeFeedback:null,extracting:bot,bank:0,gain:0,coverage:0,queries:0,suspicion:0,caught:0,freeze:0,warned:false,lastSetback:0,setbackTimer:0,lastReason:'Ready for the host.'};state.players.push(p);return p;}
function bankRound(){for(const p of state.players){p.bank=Math.min(120,p.bank+p.gain);p.gain=0;p.suspicion=0;p.freeze=0;p.warned=false;p.setbackTimer=0;}}
function enterLevel(level){bankRound();state.level=level;state.levelRevision++;state.status='paused';state.remaining=state.duration;for(const p of state.players){p.extracting=p.bot;p.lastReason='New level. Answer the company update, tune your settings, then resume.';}notice('JobS v'+(level+1)+'.0: '+levels[level].name+' activated. Extraction is paused for each player until they answer and resume.');}
function resetScores(){for(const p of state.players){Object.assign(p,{bank:0,gain:0,coverage:0,queries:0,suspicion:0,caught:0,freeze:0,warned:false,lastSetback:0,setbackTimer:0,spacing:0,variety:25,verification:0,solved:[],tuned:[],points:0,wrongAnswers:0,answerCooldown:0,challengeFeedback:null,lastReason:'Ready for a new event.'});}state.level=0;state.status='lobby';state.remaining=state.duration;}
async function admin(req,res){if(!authorized(req))return json(res,401,{error:'Admin access required. Open the admin URL printed by the server.'});const b=await body(req);
 if(state.intro.active&&!['introBack','introNext','introSkip','beginOperation','reset','bots','removeBots'].includes(b.action))return json(res,409,{error:'Finish or skip the briefing before controlling the game.'});
 switch(b.action){
 case 'invites':{if(state.status!=='lobby')return json(res,409,{error:'Generate invitations in the lobby.'});const count=number(b.count,1,config.maxPlayers,1);if(!Number.isInteger(count))return json(res,400,{error:'Use a whole invitation count.'});state.invites??=[];if(state.invites.length+count>config.maxPlayers)return json(res,409,{error:'Invitation capacity reached. Use existing codes or create a new event.'});const codes=Array.from({length:count},()=>({code:randomBytes(9).toString('base64url'),usedBy:null}));state.invites.push(...codes);store.audit('host:invites',{count});broadcast();return json(res,200,{codes:codes.map(x=>x.code)});}
 case 'newEvent':if(b.confirm!=='NEW EVENT')return json(res,400,{error:'Confirm NEW EVENT before clearing the current event.'});store.audit('host:newEvent',{previous:state.eventId});state.players=[];state.invites=[];state.eventId=randomUUID();resetScores();state.intro={active:false,scene:0};notice('New event opened. Previous player sessions no longer work.');break;
 case 'introStart':if(state.status!=='lobby'||state.level!==0)return json(res,409,{error:'Reset the event before playing the opening.'});for(const p of state.players)if(!p.titleLocked)p.storyChoices=[];state.intro={active:true,scene:0};notice('Redwood C2: Operation Mirror briefing. Your earned title stays with you.');break;
 case 'introBack':if(!state.intro.active)return json(res,409,{error:'No briefing is active.'});state.intro.scene=Math.max(0,state.intro.scene-1);break;
 case 'introNext':if(!state.intro.active)return json(res,409,{error:'No briefing is active.'});state.intro.scene=Math.min(4,state.intro.scene+1);if(state.intro.scene===4)lockTitles();break;
 case 'introSkip':lockTitles();state.intro.active=false;notice('Briefing skipped. Players can tune and get ready before the host starts.');break;
 case 'beginOperation':if(!state.intro.active||state.intro.scene!==4)return json(res,409,{error:'Reach the final briefing scene first.'});if(!state.players.length)return json(res,409,{error:'Enrol a player first, or exit the intro and add demo players.'});lockTitles();state.intro.active=false;state.status='running';state.remaining=state.duration;for(const p of state.players){p.extracting=true;p.lastReason='Operation Mirror is live. Tune your query speed.';}notice('Operation Mirror begins. JobS v1.0 is online. Build your own mirror!');break;
 case 'mood':if(!['auto','relaxed','curious','watchful','angry','sleeping','impressed'].includes(b.mood))return json(res,400,{error:'Invalid mood.'});state.mood=b.mood;notice('JobS mood: '+b.mood+'.');break;
 case 'settings':state.pace=number(b.pace,.25,3,state.pace);state.detection=number(b.detection,0,2,state.detection);if(state.status!=='running'){state.duration=number(b.duration,15,600,state.duration);state.remaining=state.duration;}notice('Host updated the pace and defenses.');break;
 case 'start':if(['finished','round_complete'].includes(state.status))return json(res,409,{error:'Select the next level or reset before starting.'});if(!state.players.length)return json(res,409,{error:'Enrol a player or add demo players first.'});state.status='running';notice('Extraction is live. Tune your unlocked controls and answer company updates to adapt.');break;
 case 'pause':state.status='paused';notice('Host paused the game. All movement and timers are stopped.');break;
 case 'level':if(!Number.isInteger(b.level)||b.level<0||b.level>=levels.length)return json(res,400,{error:'Invalid level.'});enterLevel(b.level);break;
 case 'next':if(state.level>=3){bankRound();state.status='finished';notice('Extraction complete. The unseen test decides the winner.');}else enterLevel(state.level+1);break;
 case 'finish':bankRound();state.status='finished';notice('Extraction complete. Compare knowledge and coverage in the unseen test.');break;
 case 'reset':resetScores();state.intro={active:false,scene:0};notice('New event ready. Enrolled players stay in the room.');break;
 case 'bots':if(!config.allowBots)return json(res,403,{error:'Demo bots are disabled on this server.'});if(!state.players.some(p=>p.bot)){['Omar · bot','Sara · bot','Nour · bot'].forEach(n=>addPlayer(n,true));notice('Three simulated players joined for testing.');}break;
 case 'removeBots':state.players=state.players.filter(p=>!p.bot);notice('Demo players removed.');break;
 case 'move':{const p=state.players.find(p=>p.id===b.id);if(!p)return json(res,404,{error:'Player not found.'});if(b.direction==='back'){const loss=setback(p,8);p.lastReason='Host setback: −'+loss+' percentage points of model copied.';}else if(b.direction==='forward'){p.bank+=Math.min(8,100-quality(p))/.72;p.lastReason='Host moved you forward by up to 8 percentage points.';}else if(b.direction==='freeze'){p.freeze=5;p.lastReason='Host applied a 5-second freeze.';}else if(b.direction==='release'){p.freeze=0;p.suspicion=0;p.warned=false;p.setbackTimer=0;p.lastReason='Host cleared your freeze and suspicion.';}else return json(res,400,{error:'Invalid movement.'});notice(p.lastReason);break;}
 default:return json(res,400,{error:'Unknown host action.'});
 }store.audit('host:'+b.action,{level:state.level});broadcast();return json(res,200,{ok:true});
}
const server=http.createServer(async(req,res)=>{try{
 for(const [key,value]of Object.entries(securityHeaders))res.setHeader(key,value);
 if(config.production)res.setHeader('Strict-Transport-Security','max-age=31536000');
 const url=new URL(req.url,'http://localhost');
 if(store.failed)return json(res,503,{error:'Storage unavailable. The event is stopped safely.'});
 if(req.method==='POST'){
  if(req.headers.origin){const expected=config.origin||'http://'+req.headers.host;if(req.headers.origin!==expected)return json(res,403,{error:'Cross-origin requests are not allowed.'});}
  const identity=playerAuth(req)?.id||(authorized(req)?'host':req.socket.remoteAddress||'unknown');
  const limit=url.pathname==='/api/join'?120:url.pathname==='/api/player'?600:240;
  if(!limiter.allow(url.pathname+':'+identity,limit)){res.setHeader('Retry-After','60');return json(res,429,{error:'Too many requests. Wait a moment and retry.'});}
 }
 if(url.pathname==='/healthz'&&req.method==='GET')return json(res,200,{ok:true,service:'redwood-mirror',storage:store.healthy()?'ready':'failed'});
 if(url.pathname==='/api/config'&&req.method==='GET')return json(res,200,{room,maxPlayers:config.maxPlayers,simulation:true,eventId:state.eventId,inviteRequired:config.inviteRequired});
 if(url.pathname==='/api/state'&&req.method==='GET')return json(res,200,publicState());
 if(url.pathname==='/api/events'&&req.method==='GET'){
  const p=url.searchParams.get('view')==='player'?playerAuth(req):undefined;if(streams.size>=400)return json(res,503,{error:'Connection capacity reached.'});if(p&&Array.from(streams.values()).filter(id=>id===p.id).length>=4)return json(res,429,{error:'Close extra game tabs.'});if(p)p.connected=true;
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 1500\n\n');streams.set(res,p?.id);broadcast();
  req.on('close',()=>{streams.delete(res);if(p&&!Array.from(streams.values()).includes(p.id)){p.connected=false;broadcast();}});return;
 }
 if(url.pathname==='/api/join'&&req.method==='POST'){
  const b=await body(req);const existing=playerAuth(req);if(existing){res.setHeader('Set-Cookie',playerCookie(existing.token,config.production));return json(res,200,{token:existing.token,id:existing.id});}if(String(b.room||'').trim().toUpperCase()!==room)return json(res,400,{error:'Use the event code '+room+'.'});
  const name=String(b.name||'').trim().replace(/[\x00-\x1f]/g,'').slice(0,24);if(!name)return json(res,400,{error:'Enter a nickname.'});
  if(state.status!=='lobby')return json(res,409,{error:'Enrolment is closed. The host can reset the event to reopen it.'});
  if(state.players.filter(p=>!p.bot).length>=config.maxPlayers)return json(res,409,{error:'Room is full.'});
  if(state.players.some(p=>!p.bot&&p.name.toLowerCase()===name.toLowerCase()))return json(res,409,{error:'That nickname is taken. Choose another before enrolling.'});
  const invitation=(state.invites||[]).find(x=>x.code===b.invite&&!x.usedBy);if(config.inviteRequired&&!invitation)return json(res,403,{error:'Enter the unused player pass provided by the host.'});
  if(b.storyChoices!==undefined&&(!Array.isArray(b.storyChoices)||b.storyChoices.length!==3||!b.storyChoices.every(n=>Number.isInteger(n)&&n>=0&&n<5)))return json(res,400,{error:'Finish all three briefing choices before entering the game.'});
  const p=addPlayer(name);p.originPending=b.origin===true;if(invitation){invitation.usedBy=p.id;p.invite=invitation.code;}if(b.storyChoices){p.storyChoices=[...b.storyChoices];p.assignedTitle=titleFor(p.storyChoices);p.titleLocked=true;}res.setHeader('Set-Cookie',playerCookie(p.token,config.production));store.audit('player:join',{id:p.id});notice(name+' joined the event.');broadcast();return json(res,200,{token:p.token,id:p.id});
 }
 if(url.pathname==='/api/player'&&req.method==='POST'){
  const p=playerAuth(req);if(!p)return json(res,401,{error:'Join the event first.'});const b=await body(req);
  if(b.action==='resume'){res.setHeader('Set-Cookie',playerCookie(p.token,config.production));return json(res,200,{id:p.id,name:p.name,originPending:!!p.originPending,titleLocked:!!p.titleLocked,title:p.assignedTitle||titleFor(p.storyChoices)});}
  if(b.name!==undefined||b.title!==undefined||b.assignedTitle!==undefined||b.storyChoices!==undefined)return json(res,403,{error:'Your enrolled name and earned title cannot be changed.'});
  const allowed=new Set(['speed','spacing','variety','verification','extracting','confirmTune']);if(Object.keys(b).some(k=>!allowed.has(k)))return json(res,400,{error:'Only unlocked tuning controls and extraction state can be updated.'});
  for(const key of ['speed','spacing','variety','verification'])if(b[key]!==undefined&&(typeof b[key]!=='number'||!Number.isFinite(b[key])))return json(res,400,{error:'Tuning values must be finite numbers.'});if(b.extracting!==undefined&&typeof b.extracting!=='boolean')return json(res,400,{error:'Extraction state must be boolean.'});
  if(state.intro.active)return json(res,409,{error:'Extraction and tuning are paused during the briefing.'});
  if(p.originPending)return json(res,409,{error:'Finish your operator novel before tuning or extracting.'});
  if(b.confirmTune!==undefined&&b.confirmTune!==pendingTune(p)?.field)return json(res,400,{error:'Confirm the currently highlighted control only.'});
  if(b.confirmTune&&typeof b[b.confirmTune]!=='number')return json(res,400,{error:'Include the selected slider value when confirming.'});
  if(b.extracting===true&&pendingTune(p))return json(res,409,{error:'Set and confirm '+pendingTune(p).label+' first, then resume stealing.'});
  if(b.extracting===true&&pendingChallenge(p))return json(res,409,{error:'Answer the company update correctly before resuming extraction.'});
  for(const [field,level]of [['spacing',1],['variety',2],['verification',3]])if(b[field]!==undefined&&!p.solved.includes(level))return json(res,403,{error:'Answer the company-control question to unlock '+field+'.'});
  p.speed=Math.round(number(b.speed,1,10,p.speed));p.spacing=Math.round(number(b.spacing,0,100,p.spacing)/5)*5;p.variety=Math.round(number(b.variety,0,100,p.variety)/5)*5;p.verification=Math.round(number(b.verification,0,100,p.verification)/5)*5;if(typeof b.extracting==='boolean')p.extracting=b.extracting;if(b.confirmTune){const required=pendingTune(p);p.tuned.push(required.level);p.extracting=false;p.lastReason='Setting confirmed. Resume stealing when ready.';}
  broadcast();return json(res,200,{ok:true});
 }
 if(url.pathname==='/api/answer'&&req.method==='POST'){
  const p=playerAuth(req);if(!p)return json(res,401,{error:'Join the event first.'});const b=await body(req),pending=pendingChallenge(p),challenge=challenges[pending];
  if(state.status==='finished')return json(res,409,{error:'The event has ended.'});
  if(!challenge||b.level!==pending)return json(res,409,{error:'This question is no longer active.'});
  if(!Number.isInteger(b.option)||b.option<0||b.option>=challenge.options.length)return json(res,400,{error:'Choose one answer.'});
  if(Date.now()<p.answerCooldown)return json(res,429,{error:'Take a moment to read the hint before retrying.'});
  const correct=b.option===challenge.correct;
  if(correct){p.solved.push(pending);p.points+=10;p.extracting=false;if(pending===1)p.spacing=50;if(pending===2)p.variety=70;if(pending===3)p.verification=70;p.challengeFeedback={kind:'correct',level:pending,text:'Correct! +10 points. '+challenge.unlock+' unlocked. '+challenge.explanation+' Set the highlighted slider and confirm, then Resume stealing.'};}
  else {p.points-=5;p.wrongAnswers++;const loss=setback(p,3);p.answerCooldown=Date.now()+2000;p.challengeFeedback={kind:'wrong',level:pending,text:'−5 pts · −'+loss+'% copied. '+challenge.hint};p.lastReason=p.challengeFeedback.text;notice(p.name+' answered incorrectly: −5 points and a small setback.');}
  store.audit('player:answer',{id:p.id,level:pending,correct});broadcast();return json(res,200,{correct,feedback:p.challengeFeedback});
 }
 if(url.pathname==='/api/admin'&&req.method==='POST')return await admin(req,res);
 if(url.pathname==='/api/origin-finish'&&req.method==='POST'){
  const p=playerAuth(req);if(!p)return json(res,401,{error:'Enrol first.'});const b=await body(req);
  if(p.titleLocked)return json(res,409,{error:'Your title is already locked.'});if(!p.originPending)return json(res,403,{error:'Use the host-controlled briefing for this identity.'});
  if(!Array.isArray(b.choices)||b.choices.length!==3||!b.choices.every(n=>Number.isInteger(n)&&n>=0&&n<5))return json(res,400,{error:'Complete all three dialogue choices.'});
  p.storyChoices=[...b.choices];p.assignedTitle=titleFor(p.storyChoices);p.titleLocked=true;p.originPending=false;p.extracting=false;store.audit('player:title',{id:p.id,title:p.assignedTitle});broadcast();return json(res,200,{title:p.assignedTitle});
 }
 if(url.pathname==='/api/story-choice'&&req.method==='POST'){
  const p=playerAuth(req);if(!p)return json(res,401,{error:'Join the event first.'});const b=await body(req);
  if(p.titleLocked)return json(res,403,{error:'Your earned title is permanent for this event. Dialogue choices are locked.'});
  if(!state.intro.active||b.scene!==state.intro.scene||!Number.isInteger(b.scene)||b.scene<1||b.scene>3)return json(res,409,{error:'Choose during the current dialogue scene.'});
  if(!Number.isInteger(b.option)||b.option<0||b.option>4)return json(res,400,{error:'Choose one of the five responses.'});
  p.storyChoices??=[];p.storyChoices[b.scene-1]=b.option;broadcast();return json(res,200,{ok:true,title:titleFor(p.storyChoices)});
 }
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed.'});
 const routes={'/':'index.html','/admin':'admin.html','/player':'player.html','/display':'display.html','/intro':'intro.html','/intro-client.js':'intro-client.js','/story.js':'story.js','/story-atlas.png':'story-atlas.png','/vn-crew.png':'vn-crew.png','/vn-room.png':'vn-room.png','/styles.css':'styles.css','/client.js':'client.js','/game-rules.js':'game-rules.js'};
 const file=routes[url.pathname];if(!file)return json(res,404,{error:'Not found.'});
 const data=await fs.readFile(path.join(base,'public',file));res.writeHead(200,{'Content-Type':file.endsWith('.png')?'image/png':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);
 }catch(e){if(store.failed){clearInterval(ticker);clearTimeout(pendingBroadcast);for(const [stream]of streams)stream.destroy();setTimeout(()=>process.exit(1),100).unref();}if(res.headersSent){res.destroy();return;}json(res,store.failed?503:400,{error:store.failed?'Storage unavailable. The event is stopped safely.':config.production?'Request could not be processed.':e.message||'Invalid request.'});}});
let last=Date.now(),gameTime=0;
const ticker=setInterval(()=>{const now=Date.now();const dt=Math.min(.5,(now-last)/1000);last=now;if(state.status!=='running')return;
 const delta=dt*state.pace,unit=delta*40/state.duration;gameTime+=unit;state.remaining=Math.max(0,state.remaining-delta);
 for(const p of state.players){if(!p.connected||!p.extracting||p.originPending||(!p.bot&&(pendingChallenge(p)||pendingTune(p))))continue;
  if(p.bot){for(let j=1;j<=state.level;j++)if(!p.solved.includes(j)){p.solved.push(j);p.points+=10;}const i=state.players.filter(x=>x.bot).indexOf(p);p.speed=i===0?10:i===1?(state.level===0?9:5.5):7;p.spacing=i===1?65:0;p.variety=state.level<2?25:i===0?25:i===1?85:100;p.verification=i===0?0:i===1?80:50;}
  p.setbackTimer=Math.max(0,p.setbackTimer-delta);
  if(p.freeze>0){p.freeze=Math.max(0,p.freeze-delta);p.suspicion=Math.max(0,p.suspicion-10*unit);continue;}
  const rates=queryRates(p,{...state,levels}),{speedRisk,repeatRisk}=rates;
  p.suspicion=Math.max(0,Math.min(100,p.suspicion+rates.suspicion*dt));
  if(p.suspicion<40)p.warned=false;
  if(p.suspicion>=100){p.caught++;p.freeze=5;const loss=setback(p,12);p.suspicion=40;p.warned=false;p.lastReason='Caught: '+(speedRisk>=repeatRisk?'too many requests.':'repetitive queries.')+' −'+loss+' percentage points and a 5-second freeze.';notice(p.name+' was caught: −'+loss+' percentage points of model copied.');continue;}
  if(p.suspicion>=70&&!p.warned){p.warned=true;const loss=setback(p,5);p.lastReason='Suspicion hit 70%: −'+loss+' percentage points. Ease off before JobS catches you.';notice(p.name+' triggered a suspicion setback: −'+loss+' percentage points.');continue;}
  p.gain=Math.min(30,p.gain+rates.data*dt);p.coverage=Math.min(100,p.coverage+rates.coverage*dt);p.queries+=rates.requests*unit;
  if(p.setbackTimer<=0)p.lastReason=p.suspicion>70?'JobS is watching. Ease off or change your questions.':p.speed<4?'Safe, but your copy is progressing slowly.':'Collecting answers. Your settings apply live.';
 }
 if(state.remaining<=0){state.status='round_complete';notice('Time is up. Waiting for the host to move to the next level.');}
 broadcast();
},250);
const heartbeat=setInterval(()=>{for(const [res]of streams)if(!res.destroyed)res.write(': heartbeat\n\n');},15000);
server.requestTimeout=10000;server.headersTimeout=10000;server.maxHeadersCount=50;
let shuttingDown=false;
function shutdown(){if(shuttingDown)return;shuttingDown=true;clearInterval(ticker);clearInterval(heartbeat);clearTimeout(pendingBroadcast);for(const [res]of streams)res.end();store.save(state);store.close();limiter.close();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),3000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
if(process.send)process.on('message',message=>{if(message?.type==='shutdown')shutdown();});
server.on('error',e=>{console.error('Server failed to bind: '+e.code);store.close();process.exit(1);});
server.listen(port,host,()=>{console.log('Redwood Mirror is running');console.log('Player: http://localhost:'+port+'/player');console.log('Display: http://localhost:'+port+'/display');if(config.showAdminLink)console.log('Admin: http://localhost:'+port+'/admin#'+adminToken);else console.log('Admin: use your configured secret at PUBLIC_ORIGIN/admin#<secret>; it is not logged.');console.log('Bound to '+host+'; persistent event storage enabled.');});
