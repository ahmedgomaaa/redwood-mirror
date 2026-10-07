import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {config} from '../lib/config.mjs';
const source=path.join(config.dataDir,'game.sqlite');if(!existsSync(source))throw Error('Start the game once before creating a backup.');const dir=path.resolve('backups');mkdirSync(dir,{recursive:true,mode:0o700});const filename=path.join(dir,'game-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');const db=new DatabaseSync(source);db.exec('PRAGMA busy_timeout=5000');db.prepare('VACUUM INTO ?').run(filename);db.close();console.log('Private backup saved: '+filename+' (contains session credentials; never upload).');
