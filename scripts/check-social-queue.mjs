#!/usr/bin/env node
/**
 * Crew Social queue transport check. Pure Node 22, no network and NO posting.
 * Run after git pull: node scripts/check-social-queue.mjs
 */
import {readFile,readdir,mkdir,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {resolve,join,basename} from "node:path";

const repo=resolve(fileURLToPath(new URL("..",import.meta.url)));
const queue=join(repo,"content","queue");
const out=resolve(process.env.SOCIAL_OUTBOX_DIR||join(repo,".local-social-outbox"));
let count=0;
for(const name of (await readdir(queue)).filter(x=>/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.json$/.test(x)).sort()){
  const entry=JSON.parse(await readFile(join(queue,name),"utf8"));
  if(entry.schema_version!==1||typeof entry.id!=="string"||!/^[a-z0-9-]{12,100}$/.test(entry.id))throw Error("Invalid manifest id: "+name);
  if(!["dry_run","live"].includes(entry.mode)||!["ready_for_local_agent","draft"].includes(entry.status))throw Error("Invalid queue state: "+name);
  if(!Array.isArray(entry.networks)||!entry.networks.every(x=>["facebook","threads"].includes(x)))throw Error("Invalid target networks: "+name);
  for(const network of entry.networks){
    const post=entry.posts?.[network];
    if(typeof post?.text!=="string"||!post.text.trim()||post.text.length>(network==="threads"?500:5000))throw Error("Invalid post copy: "+name);
    if(!/^[a-f0-9-]{36}$/.test(post.requestId))throw Error("Invalid request ID: "+name);
  }
  const rel=entry.image?.path;
  if(typeof rel!=="string"||!/^content\/queue\/assets\/[a-zA-Z0-9-]+\.webp\.base64$/.test(rel))throw Error("Unsafe image path: "+name);
  const b64=(await readFile(join(repo,rel),"utf8")).trim();
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(b64))throw Error("Invalid base64: "+name);
  const data=Buffer.from(b64,"base64");
  if(data.toString("ascii",0,4)!=="RIFF"||data.toString("ascii",8,12)!=="WEBP")throw Error("Not WebP: "+name);
  const sha=createHash("sha256").update(data).digest("hex");
  if(sha!==entry.image.sha256)throw Error("Checksum mismatch: "+name);
  const folder=join(out,entry.id);
  await mkdir(folder,{recursive:true});
  await writeFile(join(folder,"post.json"),JSON.stringify(entry,null,2)+"\n");
  await writeFile(join(folder,basename(rel).replace(/\.base64$/,"")),data);
  console.log(JSON.stringify({id:entry.id,mode:entry.mode,platforms:entry.networks,imageBytes:data.length,verified:true,publishAllowed:entry.safety?.publish_permitted===true&&entry.mode==="live"}));
  count++;
}
console.log("Queue items verified: "+count+"; no Meta posting attempted.");
