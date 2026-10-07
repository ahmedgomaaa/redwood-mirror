export const securityHeaders={'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
export function bearer(req){return (req.headers.authorization||'').replace(/^Bearer /,'');}
export function cookieToken(req){return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('mirror-player='))?.slice(14)||'';}
export function playerCookie(token,secure){return `mirror-player=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secure?'; Secure':''}`;}
export class Limiter{
 constructor(){this.buckets=new Map();this.timer=setInterval(()=>{const now=Date.now();for(const [k,v]of this.buckets)if(v.until<=now)this.buckets.delete(k);},60000);this.timer.unref();}
 allow(key,max,window=60000){const now=Date.now();let b=this.buckets.get(key);if(!b||b.until<=now){if(this.buckets.size>=10000)return false;b={count:0,until:now+window};this.buckets.set(key,b);}return ++b.count<=max;}
 close(){clearInterval(this.timer);}
}
