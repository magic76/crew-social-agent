import {createHash, randomUUID} from 'node:crypto';
import {mkdir, open, readFile, readdir, rename, unlink} from 'node:fs/promises';
import {dirname,join, resolve} from 'node:path';
import {inflateSync} from 'node:zlib';
import {available, listPosts, listComments, sendReply} from '../src/meta.js';
import {sendImagePost} from '../src/local.js';

export const NETWORKS = ['facebook', 'threads'];
export const DEFAULT_STATE_DIR = '.crew-social-agent';
const ID_RE = /^[a-z0-9][a-z0-9-]{11,99}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const FIRST_REPLY_REQUIRED_FROM = '2026-10-31';
const fail = message => { throw new Error(message); };

function uint24le(buf, offset) { return buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16); }
let pngCrcTable;
function pngCrc32(buf){
  if(!pngCrcTable)pngCrcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  let crc=0xffffffff;for(const byte of buf)crc=pngCrcTable[(crc^byte)&0xff]^(crc>>>8);return (crc^0xffffffff)>>>0;
}

function pngInfo(data){
  if(data.length<45||data.readUInt32BE(0)!==0x89504e47||data.toString('ascii',12,16)!=='IHDR')fail('Malformed PNG image');
  const width=data.readUInt32BE(16),height=data.readUInt32BE(20),bitDepth=data[24],colorType=data[25],interlace=data[28];
  const channels={0:1,2:3,3:1,4:2,6:4}[colorType],depths={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]}[colorType];
  if(!width||!height||width>20000||height>20000||width*height>100000000||!channels||!depths?.includes(bitDepth)||data[26]!==0||data[27]!==0||interlace!==0)fail('Unsupported or invalid PNG dimensions/encoding');
  let offset=8,seenHeader=false,seenData=false,ended=false,compressed=[];
  while(offset+12<=data.length){
    const length=data.readUInt32BE(offset),type=data.toString('ascii',offset+4,offset+8),end=offset+12+length;
    if(length>MAX_IMAGE_BYTES||end>data.length)fail('Truncated PNG chunk');
    const crc=data.readUInt32BE(offset+8+length),actual=pngCrc32(data.subarray(offset+4,offset+8+length));
    if(crc!==actual)fail('PNG chunk checksum mismatch');
    if(!seenHeader){if(type!=='IHDR'||length!==13)fail('PNG must start with IHDR');seenHeader=true;}
    if(seenData&&!['IDAT','IEND'].includes(type))fail('PNG IDAT chunks must be contiguous');
    if(type==='IDAT'){if(ended)fail('PNG image data appears after IEND');seenData=true;compressed.push(data.subarray(offset+8,offset+8+length));}
    if(type==='IEND'){if(length!==0||end!==data.length)fail('Invalid PNG end chunk');ended=true;break;}
    offset=end;
  }
  if(!seenHeader||!seenData||!ended)fail('PNG is incomplete');
  const expected=(Math.ceil(width*channels*bitDepth/8)+1)*height;
  if(expected>64*1024*1024)fail('PNG decoded data is too large');
  let decoded;try{decoded=inflateSync(Buffer.concat(compressed),{maxOutputLength:expected+1});}catch{fail('PNG compressed image data is damaged');}
  if(decoded.length!==expected)fail('PNG decoded dimensions do not match image data');
  return {format:'png',width,height};
}

export function imageInfo(data) {
  if (!Buffer.isBuffer(data) || data.length < 24 || data.length > MAX_IMAGE_BYTES) fail('Image is missing, too small, or exceeds 15 MB');
  if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
    if(data.readUInt32LE(4)!==data.length-8)fail('WebP RIFF length is invalid');
    let offset=12,found=null,hasImage=false;
    while(offset<data.length){
      if(offset+8>data.length)fail('WebP chunk header is truncated');
      const type=data.toString('ascii',offset,offset+4),length=data.readUInt32LE(offset+4),end=offset+8+length;
      if(end>data.length)fail('WebP chunk data is truncated');
      if(type==='VP8X'&&length>=10)found={format:'webp',width:uint24le(data,offset+12)+1,height:uint24le(data,offset+15)+1};
      if(type==='VP8L'&&length>=5&&data[offset+8]===0x2f){
        const b1=data[offset+9],b2=data[offset+10],b3=data[offset+11],b4=data[offset+12];
        found={format:'webp',width:1+(((b2&0x3f)<<8)|b1),height:1+(((b4&0x0f)<<10)|(b3<<2)|((b2&0xc0)>>6))};hasImage=true;
      }
      if(type==='VP8 '&&length>=10&&data[offset+11]===0x9d&&data[offset+12]===0x01&&data[offset+13]===0x2a){
        found={format:'webp',width:data.readUInt16LE(offset+14)&0x3fff,height:data.readUInt16LE(offset+16)&0x3fff};hasImage=true;
      }
      offset=end+(length&1);
    }
    if(offset!==data.length||!found||!hasImage||!found.width||!found.height)fail('Unsupported, truncated, or image-free WebP');
    if(found.width>20000||found.height>20000||found.width*found.height>100000000)fail('WebP dimensions are too large');
    return found;
  }
  if (data.length>=8&&data.readUInt32BE(0)===0x89504e47)return pngInfo(data);
  if (data.length > 4 && data[0] === 0xff && data[1] === 0xd8) {
    if(data[data.length-2]!==0xff||data[data.length-1]!==0xd9)fail('JPEG image is missing its end marker');
    let i=2;
    while(i+9<data.length){
      if(data[i]!==0xff){i++;continue;}
      const marker=data[i+1];i+=2;
      if(marker===0xd8||marker===0xd9||(marker>=0xd0&&marker<=0xd7))continue;
      if(i+2>data.length)break;
      const length=data.readUInt16BE(i);
      if(length<2||i+length>data.length)break;
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
        const info={format:'jpeg',height:data.readUInt16BE(i+3),width:data.readUInt16BE(i+5)};
        if(!info.width||!info.height||info.width>20000||info.height>20000||info.width*info.height>100000000)fail('JPEG dimensions are invalid or too large');
        return info;
      }
      i+=length;
    }
  }
  fail('Image must be a valid WebP, PNG, or JPEG');
}

export function validatePublicImageUrl(value, env = process.env) {
  if (typeof value !== 'string' || value.length > 2048) fail('A public HTTPS image URL is required for live publishing');
  let u; try { u = new URL(value); } catch { fail('Invalid public image URL'); }
  const host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||!host.includes('.')||
    host==='localhost'||host.endsWith('.local')||host.endsWith('.localhost')||/^[0-9.]+$/.test(host)||host.includes(':'))
    fail('Image URL must use a public HTTPS hostname without credentials, port, or fragment');
  const allowed=(env.SOCIAL_IMAGE_HOSTS||'raw.githubusercontent.com').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(!allowed.some(x=>host===x||host.endsWith('.'+x))) fail('Image host is not in SOCIAL_IMAGE_HOSTS');
  return u.toString();
}

export async function verifyPublicImage(url,expectedBytes,fetcher=fetch){
  let response;
  try{response=await fetcher(url,{method:'GET',redirect:'error',headers:{Accept:'image/webp,image/png,image/jpeg'},signal:AbortSignal.timeout(20000)});}
  catch{fail('PUBLIC_IMAGE_UNAVAILABLE');}
  if(!response.ok)fail(`PUBLIC_IMAGE_HTTP_${response.status}`);
  const mime=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  if(!['image/webp','image/png','image/jpeg'].includes(mime))fail('PUBLIC_IMAGE_INVALID_CONTENT_TYPE');
  const declared=Number(response.headers.get('content-length')||0);
  if(declared>MAX_IMAGE_BYTES)fail('PUBLIC_IMAGE_TOO_LARGE');
  if(!response.body)fail('PUBLIC_IMAGE_EMPTY');
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_IMAGE_BYTES){await reader.cancel();fail('PUBLIC_IMAGE_TOO_LARGE');}chunks.push(Buffer.from(value));}
  }finally{reader.releaseLock?.();}
  const bytes=Buffer.concat(chunks,size);
  if(!size)fail('PUBLIC_IMAGE_EMPTY');
  if(createHash('sha256').update(bytes).digest('hex')!==createHash('sha256').update(expectedBytes).digest('hex'))fail('PUBLIC_IMAGE_SHA_MISMATCH');
  const info=imageInfo(bytes),expected=imageInfo(expectedBytes);
  if(info.format!==expected.format||info.width!==expected.width||info.height!==expected.height)fail('PUBLIC_IMAGE_METADATA_MISMATCH');
  return {bytes: size, ...info};
}

export function validateQueueEntry(entry, imageBytes, env = process.env) {
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||entry.schema_version!==1||!ID_RE.test(entry.id||'')) fail('Invalid queue item id or schema');
  if(!['draft','ready_for_local_agent'].includes(entry.status)||!['dry_run','live'].includes(entry.mode)) fail('Invalid queue status or mode');
  if(!Array.isArray(entry.networks)||!entry.networks.length||new Set(entry.networks).size!==entry.networks.length||!entry.networks.every(n=>NETWORKS.includes(n))) fail('Invalid queue networks');
  if(!validDate(entry.created_date)) fail('Invalid created_date');
  if(typeof entry.category!=='string'||!entry.category.trim()) fail('Queue category is required');
  if(entry.category.toLowerCase().includes('news') && (!entry.source||!entry.source.publisher||!entry.source.url||!validDate(entry.source.published_date)||!/^https:\/\//i.test(entry.source.url))) fail('News items require publisher, HTTPS source URL, and published_date');
  const references=[];
  if(entry.source!==undefined){
    const validSource=entry.source&&typeof entry.source==='object'&&typeof entry.source.publisher==='string'&&entry.source.publisher.trim()&&
      typeof entry.source.url==='string'&&/^https:\/\//i.test(entry.source.url)&&validDate(entry.source.published_date);
    if(!validSource&&(entry.category.toLowerCase().includes('news')||entry.created_date>=FIRST_REPLY_REQUIRED_FROM))
      fail('Source requires publisher, HTTPS URL, and published_date');
    if(validSource)references.push(entry.source.url);
  }
  if(entry.references!==undefined){
    if(!Array.isArray(entry.references)||!entry.references.length)fail('references must be a non-empty array when provided');
    for(const reference of entry.references){
      if(!reference||typeof reference!=='object'||typeof reference.publisher!=='string'||!reference.publisher.trim()||
        typeof reference.url!=='string'||!/^https:\/\//i.test(reference.url)||!validDate(reference.published_date))
        fail('Each reference requires publisher, HTTPS URL, and published_date');
      references.push(reference.url);
    }
  }
  const firstReplies={};
  if(entry.first_replies!==undefined&&(!entry.first_replies||typeof entry.first_replies!=='object'||Array.isArray(entry.first_replies)))
    fail('first_replies must be an object keyed by network');
  if(entry.first_replies){
    for(const network of Object.keys(entry.first_replies))if(!NETWORKS.includes(network)||!entry.networks.includes(network))fail('first_replies contains an unsupported network');
  }
  if(!entry.safety||typeof entry.safety.publish_permitted!=='boolean') fail('safety.publish_permitted must be a boolean');
  if(!validSchedule(entry.schedule)) fail('Schedule date, time, and timezone are required and must be valid');
  // Explicit image:null enables an intentional text-only post.
  // Other image objects still undergo the complete fail-closed validation.
  let info=null;
  if(entry.image===null){
    if(imageBytes!=null)fail('Text-only queue must not include image bytes');
  }else{
    const imagePath=entry.image?.path;
    if(typeof imagePath!=='string'||!/^content\/queue\/assets\/[A-Za-z0-9._-]+\.(?:webp|png|jpe?g)\.base64$/i.test(imagePath)) fail('Unsafe or unsupported image path');
    if(!Buffer.isBuffer(imageBytes)||imageBytes.length===0) fail('Queue image is missing');
    const digest=createHash('sha256').update(imageBytes).digest('hex');
    if(digest!==entry.image.sha256) fail('Queue image SHA-256 mismatch');
    info=imageInfo(imageBytes);
    if(entry.image.format&&entry.image.format.toLowerCase()!==info.format) fail('Queue image format mismatch');
    if(entry.image.width!==info.width||entry.image.height!==info.height) fail('Queue image dimensions do not match the decoded image');
  }
  const posts={};
  for(const network of entry.networks){
    const p=entry.posts?.[network];
    const limit=network==='threads'?500:5000;
    if(!p||typeof p.text!=='string'||!p.text.trim()||p.text.trim().length>limit) fail(`Invalid ${network} text`);
    if(!UUID_RE.test(p.requestId||'')) fail(`Invalid ${network} requestId`);
    posts[network]={text:p.text.trim(),requestId:p.requestId};
    const reply=entry.first_replies?.[network];
    if(reply!==undefined){
      const max=network==='threads'?500:1000;
      if(!reply||typeof reply!=='object'||typeof reply.text!=='string'||!reply.text.trim()||reply.text.trim().length>max)
        fail(`Invalid ${network} first reply text`);
      if(!UUID_V4_RE.test(reply.requestId||''))fail(`Invalid ${network} first reply requestId; UUID v4 is required`);
      const missing=Array.from(new Set(references)).filter(url=>!reply.text.includes(url));
      if(missing.length)fail(`${network} first reply must include every reference URL`);
      firstReplies[network]={text:reply.text.trim(),requestId:reply.requestId};
    }else if(references.length&&entry.created_date>=FIRST_REPLY_REQUIRED_FROM){
      fail(`${network} first reply is required when references are present`);
    }
  }
  const liveImageUrl=entry.image!==null&&entry.mode==='live'&&entry.safety.publish_permitted ? validatePublicImageUrl(entry.image.public_url,env) : null;
  return {entry,imageBytes,imageInfo:info,posts,firstReplies,liveImageUrl};
}

function validTimezone(tz){try{new Intl.DateTimeFormat('en',{timeZone:tz}).format();return true;}catch{return false;}}
function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
function validSchedule(s){return !!s&&validDate(s.date)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time||'')&&typeof s.timezone==='string'&&validTimezone(s.timezone);}

function keyOf(postId,network){return createHash('sha256').update(JSON.stringify([postId,network])).digest('hex');}
function taskPath(stateDir,postId,network){return join(resolve(stateDir),'tasks',keyOf(postId,network)+'.json');}
async function ensureDir(path){await mkdir(path,{recursive:true,mode:0o700});}
async function atomicJson(path,value){
  await ensureDir(dirname(path));
  const tmp=path+'.'+randomUUID()+'.tmp';
  const handle=await open(tmp,'wx',0o600);
  try{await handle.writeFile(JSON.stringify(value,null,2)+'\n');await handle.sync();}finally{await handle.close();}
  await rename(tmp,path);
  try{const dir=await open(dirname(path),'r');try{await dir.sync();}finally{await dir.close();}}catch{}
}
async function readJson(path){return JSON.parse(await readFile(path,'utf8'));}

export async function ensureTask(stateDir, entry, network) {
  const path=taskPath(stateDir,entry.id,network);
  await ensureDir(dirname(path));
  const now=new Date().toISOString();
  const firstReply=entry.first_replies?.[network];
  const initial={postId:entry.id,network,requestId:entry.posts[network].requestId,state:'pending',createdAt:now,
    schedule:entry.schedule||null,text:entry.posts[network].text,remoteId:null,publicUrl:null,attempts:0,
    firstReply:firstReply?{...firstReply,state:'pending',remoteId:null,attempts:0}:null};
  try {const h=await open(path,'wx',0o600);try{await h.writeFile(JSON.stringify(initial,null,2)+'\n');await h.sync();}finally{await h.close();}return initial;}
  catch(e){
    if(e.code!=='EEXIST')throw e;
    const current=await readJson(path);
    if(current.requestId!==initial.requestId)fail('Queue requestId changed for an existing post/network; create a new post id');
    if(firstReply){
      if(current.firstReply&&(current.firstReply.requestId!==firstReply.requestId||current.firstReply.text!==firstReply.text))
        fail('Queue first reply changed for an existing post/network; create a new post id');
      if(!current.firstReply)return updateTask(stateDir,current,{firstReply:initial.firstReply});
    }else if(current.firstReply?.state==='pending'){
      return updateTask(stateDir,current,{firstReply:{...current.firstReply,state:'skipped',lastError:'FIRST_REPLY_REMOVED_FROM_QUEUE'}});
    }
    return current;
  }
}

async function updateTask(stateDir,record,changes){
  const next={...record,...changes,updatedAt:new Date().toISOString()};
  await atomicJson(taskPath(stateDir,record.postId,record.network),next);
  return next;
}

export async function allTasks(stateDir=DEFAULT_STATE_DIR){
  const dir=join(resolve(stateDir),'tasks');let names;
  try{names=await readdir(dir);}catch(e){if(e.code==='ENOENT')return [];throw e;}
  return Promise.all(names.filter(x=>x.endsWith('.json')).map(x=>readJson(join(dir,x))));
}

function localTimeInstant(schedule, fallbackTimezone='Asia/Taipei'){
  if(!validSchedule(schedule))fail('Invalid schedule date, time, or timezone');
  const tz=schedule.timezone||fallbackTimezone;
  if(!validTimezone(tz))fail('Invalid IANA timezone');
  const [year,month,day]=schedule.date.split('-').map(Number),[hour,minute]=schedule.time.split(':').map(Number);
  const desired=Date.UTC(year,month-1,day,hour,minute,0);
  let guess=desired;
  for(let i=0;i<3;i++){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess));
    const v=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    const represented=Date.UTC(Number(v.year),Number(v.month)-1,Number(v.day),Number(v.hour),Number(v.minute),Number(v.second));
    guess+=desired-represented;
  }
  return guess;
}

export function isScheduleDue(schedule, now=new Date(), fallbackTimezone='Asia/Taipei', maxLateMinutes=180){
  if(!schedule)return {state:'blocked',reason:'Schedule is missing'};
  const scheduled=localTimeInstant(schedule,fallbackTimezone), current=+new Date(now),late=current-scheduled;
  if(late<0)return {state:'waiting',scheduledAt:new Date(scheduled).toISOString()};
  if(late>maxLateMinutes*60000)return {state:'expired',scheduledAt:new Date(scheduled).toISOString(),lateMinutes:Math.floor(late/60000)};
  return {state:'due',scheduledAt:new Date(scheduled).toISOString(),lateMinutes:Math.floor(late/60000)};
}

export function nextSchedule(now=new Date(),{timezone='Asia/Taipei',slots=['12:00','19:00','21:00']}={}){
  if(!validTimezone(timezone))fail('Invalid IANA timezone');
  if(!Array.isArray(slots)||!slots.length||!slots.every(x=>/^([01]\d|2[0-3]):[0-5]\d$/.test(x)))fail('Schedule slots must use HH:mm');
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));
  let date=`${parts.year}-${parts.month}-${parts.day}`;
  for(const time of slots.slice().sort())if(isScheduleDue({date,time,timezone},now,timezone,0).state==='waiting')return {date,time,timezone};
  const next=new Date(+now+86400000),p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(next).map(x=>[x.type,x.value]));
  date=`${p.year}-${p.month}-${p.day}`;
  return {date,time:slots.slice().sort()[0]||'12:00',timezone};
}

async function readOverride(stateDir,postId,network){
  const path=join(resolve(stateDir),'overrides',keyOf(postId,network)+'.json');
  try{return await readJson(path);}catch(e){if(e.code==='ENOENT')return {};throw e;}
}
export async function setOverride(stateDir,postId,network,override){
  if(!ID_RE.test(postId)||!NETWORKS.includes(network))fail('Invalid post id or network');
  if(override.schedule&&!validSchedule(override.schedule))fail('Invalid reschedule date, time, or timezone');
  if(override.skip!==undefined&&typeof override.skip!=='boolean')fail('skip override must be boolean');
  const path=join(resolve(stateDir),'overrides',keyOf(postId,network)+'.json');
  await atomicJson(path,{postId,network,...override,updatedAt:new Date().toISOString()});
  if(override.schedule){
    const existing=taskPath(stateDir,postId,network);
    try{const task=await readJson(existing);if(task.state==='skipped_expired')await updateTask(stateDir,task,{state:'pending',schedule:override.schedule,lastError:null,reconciliationRequired:false});}
    catch(e){if(e.code!=='ENOENT')throw e;}
  }
}

export async function retryAfterReconciliation(stateDir,postId,network,{confirmedNotPublished=false}={}){
  if(!ID_RE.test(postId||'')||!NETWORKS.includes(network))fail('Invalid post id or network');
  if(confirmedNotPublished!==true)fail('Manual retry requires confirmation that the post is not live on Meta');
  let task;
  try{task=await readJson(taskPath(stateDir,postId,network));}catch(e){if(e.code==='ENOENT')fail('Local task not found');throw e;}
  if(task.state!=='needs_reconciliation'||task.remoteId)fail('Only an unresolved task with no remote ID can be retried');
  return updateTask(stateDir,task,{state:'pending',reconciliationRequired:false,
    manualRetryAt:new Date().toISOString(),manualRetryCount:(task.manualRetryCount||0)+1,
    lastError:'MANUAL_RETRY_AFTER_REMOTE_CHECK'});
}

async function readPaused(stateDir){try{return (await readJson(join(resolve(stateDir),'paused.json'))).paused===true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
export async function setPaused(stateDir,paused){await atomicJson(join(resolve(stateDir),'paused.json'),{paused:!!paused,updatedAt:new Date().toISOString()});}

async function lock(stateDir){
  const path=join(resolve(stateDir),'agent.lock');await ensureDir(dirname(path));
  const content={pid:process.pid,createdAt:new Date().toISOString()};
  try{const h=await open(path,'wx',0o600);await h.writeFile(JSON.stringify(content));await h.sync();await h.close();return async()=>unlink(path).catch(()=>{});}
  catch(e){
    if(e.code!=='EEXIST')throw e;
    let active=true;try{const old=await readJson(path);process.kill(old.pid,0);}catch(x){if(x.code==='ESRCH')active=false;else if(x.code==='ENOENT')active=false;}
    if(active)fail('Another local publisher process is active');
    await unlink(path).catch(()=>{});
    return lock(stateDir);
  }
}

async function recoverInterrupted(stateDir){
  for(const t of await allTasks(stateDir)){
    if(t.state==='sending')await updateTask(stateDir,t,{state:'needs_reconciliation',lastError:'PROCESS_RESTARTED_DURING_SEND',reconciliationRequired:true});
    else if(t.firstReply?.state==='sending')await updateTask(stateDir,t,{firstReply:{...t.firstReply,state:'needs_reconciliation',lastError:'PROCESS_RESTARTED_DURING_FIRST_REPLY',reconciliationRequired:true}});
  }
}

function diagnostic(error){
  const msg=String(error?.message||error||'Unknown error');
  if(/credentials are not configured/i.test(msg))return 'CREDENTIALS_MISSING';
  if(/401|190|token.*expir/i.test(msg))return 'TOKEN_EXPIRED_OR_INVALID';
  if(/403|permission|code (?:10|200|1349245)\b/i.test(msg))return 'PERMISSION_OR_ROLE_MISSING';
  if(/429|rate limit|too many|code (?:4|17|32|613)\b/i.test(msg))return 'RATE_LIMITED';
  if(/HTTP 400\b/i.test(msg))return 'META_REQUEST_REJECTED: '+msg.slice(0,180);
  return msg.slice(0,240);
}

async function publishFirstReply(task,{stateDir,env,now,fetcher,sendFirstReply,lookupFirstReplies}){
  const reply=task.firstReply;
  if(!reply||reply.state==='published'||reply.state==='skipped_expired'||reply.state==='skipped')
    return {task,state:reply?.state||'not_configured',remoteId:reply?.remoteId||null};
  if(!task.remoteId)return {task,state:'blocked',reason:'PARENT_POST_ID_MISSING'};
  const startedAt=Date.parse(reply.startedAt||reply.createdAt||task.publishedAt||task.createdAt)-5*60*1000;
  try{
    const comments=await lookupFirstReplies(env,task.network,task.remoteId,fetcher);
    const matches=comments.filter(comment=>comment.parentId===task.remoteId&&String(comment.text||'').trim()===reply.text&&
      (!comment.timestamp||Date.parse(comment.timestamp)>=startedAt));
    if(matches.length===1){
      const next={...reply,state:'published',remoteId:matches[0].id,publishedAt:matches[0].timestamp||new Date(now).toISOString(),reconciliationRequired:false,lastError:null};
      const updated=await updateTask(stateDir,task,{firstReply:next});
      return {task:updated,state:'published',remoteId:next.remoteId,reconciled:true};
    }
    if(matches.length>1){
      const next={...reply,state:'needs_reconciliation',reconciliationRequired:true,lastError:'MULTIPLE_FIRST_REPLY_MATCHES'};
      const updated=await updateTask(stateDir,task,{firstReply:next});
      return {task:updated,state:next.state,reason:next.lastError,matches:matches.length};
    }
    if(reply.state==='needs_reconciliation')
      return {task,state:'needs_reconciliation',reason:'NO_FIRST_REPLY_MATCH; NOT_RETRYING',matches:0};
  }catch(error){
    if(reply.state==='needs_reconciliation')return {task,state:'needs_reconciliation',reason:diagnostic(error)};
    const next={...reply,state:'needs_reconciliation',reconciliationRequired:true,lastError:diagnostic(error)};
    const updated=await updateTask(stateDir,task,{firstReply:next});
    return {task:updated,state:next.state,reason:next.lastError};
  }
  const sending={...reply,state:'sending',startedAt:new Date(now).toISOString(),attempts:(reply.attempts||0)+1,lastError:null};
  let updated=await updateTask(stateDir,task,{firstReply:sending});
  try{
    const remoteId=await sendFirstReply(env,task.network,task.remoteId,reply.text,fetcher);
    const published={...sending,state:'published',remoteId,publishedAt:new Date().toISOString(),reconciliationRequired:false,lastError:null};
    updated=await updateTask(stateDir,updated,{firstReply:published});
    return {task:updated,state:'published',remoteId};
  }catch(error){
    const unresolved={...sending,state:'needs_reconciliation',reconciliationRequired:true,lastError:diagnostic(error)};
    updated=await updateTask(stateDir,updated,{firstReply:unresolved});
    return {task:updated,state:unresolved.state,reason:unresolved.lastError};
  }
}

export async function runQueue({items,queueErrors=[],stateDir=DEFAULT_STATE_DIR,env=process.env,now=new Date(),send=sendImagePost,lookup=lookupPublished,sendFirstReply=sendReply,lookupFirstReplies=listComments,fetcher=fetch,timezone=env.SOCIAL_TIMEZONE||'Asia/Taipei'}={}){
  const release=await lock(stateDir);
  try{
    await recoverInterrupted(stateDir);
    const results=queueErrors.map(e=>({postId:e.postId||null,file:e.file,state:'blocked',reason:e.reason,networks:e.networks||[]}));
    const paused=await readPaused(stateDir);
    const late=Number(env.SOCIAL_MAX_LATE_MINUTES||180);
    for(const {entry,imageBytes} of items){
      let checked;
      try{checked=validateQueueEntry(entry,imageBytes,env);}catch(e){results.push({postId:entry?.id||null,state:'blocked',reason:diagnostic(e)});continue;}
      if(entry.status!=='ready_for_local_agent'){
        results.push({postId:entry.id,state:'not_ready'});continue;
      }
      for(const network of entry.networks){
        let task;
        try{task=await ensureTask(stateDir,entry,network);}catch(e){results.push({postId:entry.id,network,state:'blocked',reason:diagnostic(e)});continue;}
        if(task.state==='published'){
          if(task.firstReply&&task.firstReply.state!=='published'&&task.firstReply.state!=='skipped'&&task.firstReply.state!=='skipped_expired'){
            const override=await readOverride(stateDir,entry.id,network);
            if(paused){results.push({postId:entry.id,network,state:'published',firstReplyState:'paused'});continue;}
            if(entry.status!=='ready_for_local_agent'||entry.mode!=='live'||env.SOCIAL_AGENT_MODE!=='live'||entry.safety.publish_permitted!==true){
              results.push({postId:entry.id,network,state:'published',firstReplyState:'pending',firstReplyReason:'LIVE_PUBLISH_NOT_PERMITTED'});continue;
            }
            if(task.firstReply.state==='pending'){
              const timing=isScheduleDue(override.schedule||entry.schedule||task.schedule,now,timezone,late);
              if(timing.state==='waiting'){results.push({postId:entry.id,network,state:'published',firstReplyState:'pending',firstReplyReason:'NOT_DUE',scheduledAt:timing.scheduledAt});continue;}
              if(timing.state==='expired'){
                const skipped={...task.firstReply,state:'skipped_expired',lastError:'FIRST_REPLY_SCHEDULE_EXPIRED'};
                task=await updateTask(stateDir,task,{firstReply:skipped});
                results.push({postId:entry.id,network,state:'published',firstReplyState:'skipped_expired'});continue;
              }
            }
            const first=await publishFirstReply(task,{stateDir,env,now,fetcher,sendFirstReply,lookupFirstReplies});
            task=first.task;
            results.push({postId:entry.id,network,state:'published',remoteId:task.remoteId,publicUrl:task.publicUrl||null,firstReplyState:first.state,firstReplyRemoteId:first.remoteId||undefined,firstReplyReason:first.reason});
            continue;
          }
          results.push({postId:entry.id,network,state:'published',remoteId:task.remoteId,publicUrl:task.publicUrl||null,firstReplyState:task.firstReply?.state||'not_configured'});
          continue;
        }
        if(task.state==='skipped'||task.state==='skipped_expired'||task.state==='needs_reconciliation'){
          results.push({postId:entry.id,network,state:task.state,remoteId:task.remoteId||undefined});continue;
        }
        const override=await readOverride(stateDir,entry.id,network);
        if(override.skip){task=await updateTask(stateDir,task,{state:'skipped',lastError:'SKIPPED_BY_LOCAL_OPERATOR'});results.push({postId:entry.id,network,state:'skipped'});continue;}
        if(paused){results.push({postId:entry.id,network,state:'paused'});continue;}
        if(entry.mode!=='live'||env.SOCIAL_AGENT_MODE!=='live'){
          task=await updateTask(stateDir,task,{lastSimulationAt:new Date(now).toISOString(),lastSimulationMode:entry.mode==='dry_run'?'queue_dry_run':'agent_dry_run'});
          results.push({postId:entry.id,network,state:'pending',dryRun:true,reason:entry.mode!=='live'?'QUEUE_MODE_DRY_RUN':'AGENT_MODE_DRY_RUN'});continue;
        }
        if(entry.safety.publish_permitted!==true){results.push({postId:entry.id,network,state:'blocked',reason:'PUBLISH_NOT_PERMITTED'});continue;}
        if(!entry.schedule){results.push({postId:entry.id,network,state:'blocked',reason:'SCHEDULE_MISSING'});continue;}
        const schedule=override.schedule||entry.schedule;
        const timing=isScheduleDue(schedule,now,timezone,late);
        if(timing.state==='waiting'){results.push({postId:entry.id,network,state:'pending',reason:'NOT_DUE',scheduledAt:timing.scheduledAt});continue;}
        if(timing.state==='expired'){
          task=await updateTask(stateDir,task,{state:'skipped_expired',lastError:'SCHEDULE_EXPIRED',schedule});
          results.push({postId:entry.id,network,state:'skipped_expired',lateMinutes:timing.lateMinutes});continue;
        }
        if(checked.imageInfo&&Math.min(checked.imageInfo.width,checked.imageInfo.height)<1080){results.push({postId:entry.id,network,state:'blocked',reason:'IMAGE_RESOLUTION_BELOW_1080'});continue;}
        let imageUrl=null;
        if(checked.imageInfo){
          try{imageUrl=validatePublicImageUrl(entry.image.public_url,env);}catch(e){results.push({postId:entry.id,network,state:'blocked',reason:diagnostic(e)});continue;}
        }
        if(network==='threads'&&env.THREADS_REFRESH_BLOCKED){results.push({postId:entry.id,network,state:'blocked',reason:env.THREADS_REFRESH_BLOCKED===true?'THREADS_TOKEN_REFRESH_FAILED':env.THREADS_REFRESH_BLOCKED});continue;}
        if(!available(env)[network]){results.push({postId:entry.id,network,state:'blocked',reason:'CREDENTIALS_MISSING'});continue;}
        if(imageUrl)try{await verifyPublicImage(imageUrl,imageBytes,fetcher);}catch(e){results.push({postId:entry.id,network,state:'blocked',reason:diagnostic(e)});continue;}
        task=await updateTask(stateDir,task,{state:'sending',startedAt:new Date(now).toISOString(),attempts:(task.attempts||0)+1,lastError:null,schedule});
        try{
          const sent=await send(env,network,{text:checked.posts[network].text,imageUrl,altText:entry.image?.alt||''},fetcher);
          const remoteId=typeof sent==='string'?sent:sent.id;
          let postUrl=typeof sent==='object'?sent.url||'': '';
          if(!postUrl&&remoteId){try{postUrl=(await lookup(env,network,remoteId,fetcher))?.url||'';}catch{}}
          task=await updateTask(stateDir,task,{state:'published',remoteId,publicUrl:postUrl||null,publishedAt:new Date().toISOString(),reconciliationRequired:false,lastError:postUrl?null:'PUBLISHED_URL_LOOKUP_UNAVAILABLE'});
          if(task.firstReply){
            const first=await publishFirstReply(task,{stateDir,env,now,fetcher,sendFirstReply,lookupFirstReplies});
            task=first.task;
            results.push({postId:entry.id,network,state:'published',remoteId,publicUrl:postUrl||null,firstReplyState:first.state,firstReplyRemoteId:first.remoteId||undefined,firstReplyReason:first.reason});
          }else results.push({postId:entry.id,network,state:'published',remoteId,publicUrl:postUrl||null});
        }catch(e){
          task=await updateTask(stateDir,task,{state:'needs_reconciliation',reconciliationRequired:true,lastError:diagnostic(e)});
          results.push({postId:entry.id,network,state:'needs_reconciliation',reason:diagnostic(e)});
        }
      }
    }
    await atomicJson(join(resolve(stateDir),'last-run.json'),{finishedAt:new Date().toISOString(),resultCount:results.length,results:results.map(({postId,network,state,reason,firstReplyState,firstReplyReason})=>({postId,network,state,reason,firstReplyState,firstReplyReason}))});
    return results;
  }finally{await release();}
}

export async function lookupPublished(env,network,remoteId,fetcher=fetch){
  const posts=await listPosts(env,network,fetcher);
  return posts.find(p=>p.id===remoteId)||null;
}

export async function reconcile(stateDir=DEFAULT_STATE_DIR,env=process.env,{postId,network,fetcher=fetch}={}){
  const tasks=(await allTasks(stateDir)).filter(t=>t.state==='needs_reconciliation'&&(!postId||t.postId===postId)&&(!network||t.network===network));
  const results=[];
  for(const task of tasks){
    if(!available(env)[task.network]){results.push({postId:task.postId,network:task.network,state:task.state,reason:'CREDENTIALS_MISSING'});continue;}
    try{
      const posts=await listPosts(env,task.network,fetcher);
      const began=Date.parse(task.startedAt||task.updatedAt||task.createdAt)-5*60*1000;
      const matches=posts.filter(p=>p.text===task.text&&(!p.timestamp||Date.parse(p.timestamp)>=began));
      if(matches.length===1){
        const updated=await updateTask(stateDir,task,{state:'published',remoteId:matches[0].id,publicUrl:matches[0].url||null,publishedAt:matches[0].timestamp||new Date().toISOString(),reconciliationRequired:false,lastError:null});
        results.push({postId:task.postId,network:task.network,state:updated.state,remoteId:updated.remoteId,publicUrl:updated.publicUrl});
      }else results.push({postId:task.postId,network:task.network,state:'needs_reconciliation',matches:matches.length,reason:matches.length?'MULTIPLE_REMOTE_MATCHES':'NO_REMOTE_MATCH; NOT_RETRYING'});
    }catch(e){results.push({postId:task.postId,network:task.network,state:'needs_reconciliation',reason:diagnostic(e)});}
  }
  return results;
}

export async function simulateDryRun({items,stateDir=DEFAULT_STATE_DIR,now=new Date(),env={SOCIAL_AGENT_MODE:'dry_run'}}={}){
  return runQueue({items,stateDir,now,env,send:async()=>fail('Dry run attempted a Meta send')});
}

export function taskIdentity(postId,network){return `${postId}:${network}`;}
