#!/usr/bin/env node
/**
 * Crew Social queue transport check. Pure Node 22, no network and NO posting.
 * Run after git pull: node scripts/check-social-queue.mjs
 */
import {readFile,readdir,mkdir,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {resolve,join,basename} from "node:path";
import {validateQueueEntry} from "../local-publisher/core.js";

const repo=resolve(fileURLToPath(new URL("..",import.meta.url)));
const queue=join(repo,"content","queue");
const out=resolve(process.env.SOCIAL_OUTBOX_DIR||join(repo,".local-social-outbox"));
let count=0;
for(const name of (await readdir(queue)).filter(x=>/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.json$/.test(x)).sort()){
  const entry=JSON.parse(await readFile(join(queue,name),"utf8"));
  if(entry.schema_version!==1||typeof entry.id!=="string"||!/^[a-z0-9-]{12,100}$/.test(entry.id))throw Error("Invalid manifest id: "+name);
  const rel=entry.image?.path;
  if(typeof rel!=="string"||!/^content\/queue\/assets\/[a-zA-Z0-9._-]+\.(?:webp|png|jpe?g)\.base64$/i.test(rel))throw Error("Unsafe image path: "+name);
  const b64=(await readFile(join(repo,rel),"utf8")).trim();
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(b64))throw Error("Invalid base64: "+name);
  const data=Buffer.from(b64,"base64");
  const checked=validateQueueEntry(entry,data,process.env);
  const sha=createHash("sha256").update(data).digest("hex");
  const folder=join(out,entry.id);
  await mkdir(folder,{recursive:true});
  await writeFile(join(folder,"post.json"),JSON.stringify(entry,null,2)+"\n");
  await writeFile(join(folder,basename(rel).replace(/\.base64$/,"")),data);
  console.log(JSON.stringify({id:entry.id,mode:entry.mode,platforms:entry.networks,imageBytes:data.length,imageWidth:checked.imageInfo.width,imageHeight:checked.imageInfo.height,sha256:sha,verified:true,publishAllowed:entry.safety?.publish_permitted===true&&entry.mode==="live"}));
  count++;
}
console.log("Queue items verified: "+count+"; no Meta posting attempted.");
