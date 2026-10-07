import {cp,mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const stamp=new Date().toISOString().replace(/[:.]/g,'-');const target=path.resolve('release','redwood-mirror-'+stamp);
await mkdir(target,{recursive:true});
const files=['package.json','package-lock.json','server.mjs','AGENTS.md','README.md','DEPLOYMENT.md','MODEL_HANDOFF.md','GAME_SPEC.md','MICROSOFT_SSO.md','GAME-FIDELITY.json','SECURITY.md','TEST-REPORT.md','ART-PROMPTS.md','.gitignore','.dockerignore','.env.example','Dockerfile','compose.yaml','test.mjs','test-story.mjs'];
for(const name of files)await cp(name,path.join(target,name));for(const dir of ['lib','public','tests','scripts','deploy','.github'])await cp(dir,path.join(target,dir),{recursive:true});
const manifest=[];async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else{const bytes=await readFile(file);manifest.push({path:path.relative(target,file).replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}await walk(target);await writeFile(path.join(target,'release-manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),files:manifest},null,2)+'\n');console.log(target);
