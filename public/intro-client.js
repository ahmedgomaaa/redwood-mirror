import {mountStory} from './story.js';
const root=document.getElementById('story'),form=document.getElementById('vn-enrol');
const event=await fetch('/api/config').then(r=>r.json());
const key='mirror-origin:'+event.eventId;
let saved;try{saved=JSON.parse(localStorage.getItem(key));}catch{}
let scene=saved?.scene||0,choices=saved?.choices||[],name=saved?.name||'',locked=!!saved?.locked,busy=false,token=localStorage.getItem('mirror-player-token')||'';
async function api(path,body){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error);return data;}
function save(){localStorage.setItem(key,JSON.stringify({scene,choices,name,locked}));}
let profile=null;if(token){try{profile=await api('/api/player',{action:'resume'});if(!profile.originPending){location.replace('/player');}else{name=profile.name;locked=false;if(scene===4)scene=3;}}catch{token='';localStorage.removeItem('mirror-player-token');name='';locked=false;scene=0;choices=[];}}
if(!token){name='';scene=0;choices=[];locked=false;}
if(event.inviteRequired)form.querySelector('label').insertAdjacentHTML('beforebegin','<label>One-use player pass from your host<input id="invite" maxlength="24" required autocomplete="off"></label>');
form.insertAdjacentHTML('beforeend','<div id="enrol-error" class="error" role="alert"></div>');
const stage=mountStory(root,{preview:true,choose(index,option){if(locked)return;choices[index-1]=option;save();stage.render(scene,name,choices,locked);},async action(action){
 if(busy)return;if(action==='skip'){location.href='/';return;}
 if(action==='next'&&scene===4){location.href='/player';return;}
 if(locked)return;busy=true;try{
  const next=Math.max(0,Math.min(4,scene+(action==='next'?1:-1)));
  if(next===4){try{await api('/api/origin-finish',{choices});}catch(e){const p=await api('/api/player',{action:'resume'});if(!p.titleLocked)throw e;}locked=true;}
  scene=next;save();stage.render(scene,name,choices,locked);
 }catch(e){stage.error(e.message);}finally{busy=false;}
}});
form.onsubmit=async e=>{e.preventDefault();if(name||busy)return;const candidate=document.getElementById('codename').value.trim();if(!candidate)return;busy=true;e.submitter.disabled=true;try{
 const joined=await api('/api/join',{room:event.room,name:candidate,invite:document.getElementById('invite')?.value,origin:true});token=joined.token;localStorage.setItem('mirror-player-token',token);name=candidate;save();form.hidden=true;root.hidden=false;stage.render(scene,name,choices,locked);
 }catch(err){document.getElementById('enrol-error').textContent=err.message;e.submitter.disabled=false;}finally{busy=false;}};
if(name){form.hidden=true;root.hidden=false;stage.render(scene,name,choices,locked);}
