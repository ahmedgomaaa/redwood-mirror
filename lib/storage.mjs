import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export class Store{
 constructor(dir){
  mkdirSync(dir,{recursive:true,mode:0o700});this.db=new DatabaseSync(path.join(dir,'game.sqlite'));
  try{chmodSync(path.join(dir,'game.sqlite'),0o600);}catch{}
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS snapshot (id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL,payload TEXT NOT NULL,updated_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY,created_at INTEGER NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL); CREATE TABLE IF NOT EXISTS lease (id INTEGER PRIMARY KEY CHECK(id=1),owner TEXT NOT NULL,expires INTEGER NOT NULL);');
  this.owner=randomUUID();this.db.exec('BEGIN IMMEDIATE');try{const lease=this.db.prepare('SELECT * FROM lease WHERE id=1').get();if(lease&&lease.expires>Date.now())throw Error('Another server owns DATA_DIR. Use exactly one replica; after a crash wait 30 seconds.');this.db.prepare('INSERT INTO lease VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,expires=excluded.expires').run(this.owner,Date.now()+30000);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');this.db.close();throw e;}
  this.leaseTimer=setInterval(()=>{try{this.db.prepare('UPDATE lease SET expires=? WHERE id=1 AND owner=?').run(Date.now()+30000,this.owner);}catch{process.stderr.write('Storage lease renewal failed.\n');process.exit(1);}},5000);this.leaseTimer.unref();
 }
 meta(key,value){const old=this.db.prepare('SELECT value FROM metadata WHERE key=?').get(key);if(old)return old.value;this.db.prepare('INSERT INTO metadata VALUES(?,?)').run(key,value);return value;}
 load(){const row=this.db.prepare('SELECT version,payload FROM snapshot WHERE id=1').get();if(!row)return null;if(row.version!==1)throw Error('Unsupported saved-state version; do not overwrite the database.');return JSON.parse(row.payload);}
 save(state){try{this.db.prepare('INSERT INTO snapshot VALUES(1,1,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').run(JSON.stringify(state),Date.now());}catch(e){this.failed=true;throw e;}}
 audit(action,detail={}){try{this.db.prepare('INSERT INTO audit(created_at,action,detail) VALUES(?,?,?)').run(Date.now(),action,JSON.stringify(detail));}catch(e){this.failed=true;throw e;}}
 healthy(){if(this.failed)return false;try{return this.db.prepare('SELECT 1 AS ok').get().ok===1;}catch{return false;}}
 close(){clearInterval(this.leaseTimer);this.db.prepare('DELETE FROM lease WHERE id=1 AND owner=?').run(this.owner);this.db.close();}
}
