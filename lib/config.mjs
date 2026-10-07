import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function integer(key,fallback,min,max){const n=Number(process.env[key]??fallback);if(!Number.isInteger(n)||n<min||n>max)throw Error(`${key} must be an integer between ${min} and ${max}.`);return n;}
const production=process.env.NODE_ENV==='production';
const origin=process.env.PUBLIC_ORIGIN||'';
if(origin){const u=new URL(origin);if(!['http:','https:'].includes(u.protocol)||u.origin!==origin)throw Error('PUBLIC_ORIGIN must be an origin without a trailing slash or path.');}
if(production&&(!origin.startsWith('https://')||(process.env.MIRROR_ADMIN_TOKEN||'').length<32))throw Error('Production requires HTTPS PUBLIC_ORIGIN and MIRROR_ADMIN_TOKEN of at least 32 characters.');
const room=(process.env.ROOM_CODE||'MIRROR').toUpperCase();if(!/^[A-Z0-9]{3,12}$/.test(room))throw Error('ROOM_CODE must contain 3–12 letters/digits.');
export const config=Object.freeze({root,production,origin,room,port:integer('PORT',4173,1,65535),host:process.env.HOST||'127.0.0.1',dataDir:path.resolve(process.env.DATA_DIR||path.join(root,'data')),duration:integer('ROUND_SECONDS',180,15,600),maxPlayers:integer('MAX_PLAYERS',100,1,100),adminToken:process.env.MIRROR_ADMIN_TOKEN||'',showAdminLink:!production,allowBots:process.env.ALLOW_DEMO_BOTS!=='false',inviteRequired:process.env.REQUIRE_INVITES?process.env.REQUIRE_INVITES==='true':production});
