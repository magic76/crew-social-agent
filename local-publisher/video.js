import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {chmod,copyFile,mkdir,open,readFile,readdir,rename,stat,unlink,writeFile} from 'node:fs/promises';
import {basename,dirname,join,resolve,sep} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {available,inspectVideoPostStatus,listPosts,sendVideoPost} from '../src/meta.js';
import {inspectMp4} from './mp4.js';
import {isScheduleDue} from './core.js';

const FILE_RE=/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.json$/;
const VIDEO_RE=/^content\/video-handoffs\/assets\/[A-Za-z0-9._-]+\.mp4$/i;
const ID_RE=/^[a-z0-9][a-z0-9-]{11,99}$/;
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NETWORKS=['facebook','threads'];
const MAX_VIDEO_BYTES=1024*1024*1024;
const fail=message=>{throw new Error(message);};
const taskKey=(id,network)=>createHash('sha256').update(JSON.stringify([id,network])).digest('hex');
const taskPath=(stateDir,id,network)=>join(resolve(stateDir),'video-tasks',taskKey(id,network)+'.json');

async function ensureDir(path){await mkdir(path,{recursive:true,mode:0o700});}
async function hashFile(path){
  const hash=createHash('sha256');let bytes=0;
  for await(const chunk of createReadStream(path)){bytes+=chunk.length;if(bytes>MAX_VIDEO_BYTES)fail('VIDEO_TOO_LARGE');hash.update(chunk);}
  return {sha256:hash.digest('hex'),sizeBytes:bytes};
}
async function atomicJson(path,value){
  await ensureDir(dirname(path));
  const temp=path+'.'+randomUUID()+'.tmp';
  const handle=await open(temp,'wx',0o600);
  try{await handle.writeFile(JSON.stringify(value,null,2)+'\n');await handle.sync();}finally{await handle.close();}
  await rename(temp,path);
}
async function readJson(path){return JSON.parse(await readFile(path,'utf8'));}

function validateVideoUrl(value,env=process.env){
  if(typeof value!=='string'||value.length>2048)fail('A public HTTPS video URL is required');
  let url;try{url=new URL(value);}catch{fail('Invalid public video URL');}
  const host=url.hostname.toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||!host.includes('.')||host==='localhost'||
    host.endsWith('.local')||host.endsWith('.localhost')||/^[0-9.]+$/.test(host)||host.includes(':'))
    fail('Video URL must use a public HTTPS hostname without credentials, port, or fragment');
  const allowed=(env.SOCIAL_VIDEO_HOSTS||'raw.githubusercontent.com').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(!allowed.some(x=>host===x||host.endsWith('.'+x)))fail('Video host is not in SOCIAL_VIDEO_HOSTS');
  return url.toString();
}

function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
function validSchedule(value){
  if(!value||!validDate(value.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time||'')||typeof value.timezone!=='string')return false;
  try{new Intl.DateTimeFormat('en',{timeZone:value.timezone}).format();return true;}catch{return false;}
}

/** Fail-closed validation for the separate video-handoff contract. */
export async function validateVideoHandoff(entry,mediaPath,env=process.env){
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||entry.schema_version!==1||!ID_RE.test(entry.id||''))fail('Invalid video handoff id or schema');
  if(!['draft_handoff_only','ready_for_video_publisher','published'].includes(entry.status))fail('Invalid video handoff status');
  if(typeof entry.publish_permitted!=='boolean')fail('publish_permitted must be a boolean');
  if(!validDate(entry.created_date))fail('Invalid video handoff created_date');
  const networks=entry.platforms;
  if(!Array.isArray(networks)||!networks.length||new Set(networks).size!==networks.length||!networks.every(n=>NETWORKS.includes(n)))fail('Invalid video handoff platforms');
  if(entry.status==='ready_for_video_publisher'&&!validSchedule(entry.schedule))fail('Ready video handoffs require a valid schedule');
  if(entry.schedule&&!validSchedule(entry.schedule))fail('Invalid video handoff schedule');
  const media=entry.media;
  if(!media||media.type!=='video/mp4'||typeof media.path!=='string'||!VIDEO_RE.test(media.path))fail('Video handoff requires a safe MP4 media path');
  if(!/^[a-f0-9]{64}$/i.test(media.sha256||''))fail('Video handoff requires a SHA-256 digest');
  if(!Number.isSafeInteger(media.size_bytes)||media.size_bytes<32||media.size_bytes>MAX_VIDEO_BYTES)fail('Invalid video handoff file size');
  const publicUrl=validateVideoUrl(media.public_url,env);
  const info=await inspectMp4(mediaPath);
  const digest=await hashFile(mediaPath);
  if(digest.sizeBytes!==media.size_bytes||info.fileSize!==media.size_bytes)fail('VIDEO_SIZE_MISMATCH');
  if(digest.sha256.toLowerCase()!==media.sha256.toLowerCase())fail('VIDEO_SHA256_MISMATCH');
  if(info.width!==media.width||info.height!==media.height||Math.abs(info.fps-Number(media.fps))>0.5||Math.abs(info.durationSeconds-Number(media.duration_seconds))>0.5)
    fail('VIDEO_METADATA_MISMATCH');
  if(info.width<540||info.height<960||Math.abs(info.width/info.height-9/16)>0.002)fail('VIDEO_DIMENSIONS_UNSUPPORTED');
  if(!Number.isFinite(info.fps)||info.fps<23||info.fps>60)fail('VIDEO_FRAME_RATE_UNSUPPORTED');
  if(info.durationSeconds<4||info.durationSeconds>60)fail('VIDEO_DURATION_UNSUPPORTED_FOR_CROSSPOST');
  if(!['avc1','avc3','hvc1','hev1'].includes(info.videoCodec))fail('VIDEO_CODEC_UNSUPPORTED');
  if(typeof entry.posts!=='object'||!entry.posts)fail('Video handoff posts are required');
  const posts={};
  for(const network of networks){
    const post=entry.posts[network];
    const limit=network==='threads'?500:5000;
    if(!post||typeof post.text!=='string'||!post.text.trim()||post.text.trim().length>limit||!UUID_RE.test(post.requestId||''))
      fail(`Invalid ${network} video post text or requestId`);
    posts[network]={text:post.text.trim(),requestId:post.requestId};
  }
  return {entry,mediaInfo:info,videoPath:resolve(mediaPath),videoUrl:publicUrl,sha256:digest.sha256,networks,posts};
}

async function streamGitBlob(repoRoot,ref,repoPath,outputPath){
  await ensureDir(dirname(outputPath));
  const temp=outputPath+'.'+randomUUID()+'.tmp';
  const child=spawn('git',['show',`${ref}:${repoPath}`],{cwd:repoRoot,stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.setEncoding('utf8');child.stderr.on('data',chunk=>{if(stderr.length<4096)stderr+=chunk;});
  const exit=new Promise(resolveExit=>{child.once('error',error=>resolveExit({code:null,error}));child.once('close',code=>resolveExit({code,error:null}));});
  let bytes=0;
  const meter=new Transform({transform(chunk,encoding,callback){bytes+=chunk.length;if(bytes>MAX_VIDEO_BYTES){callback(new Error('Video asset exceeds 1 GB'));return;}callback(null,chunk);}});
  try{
    await pipeline(child.stdout,meter,createWriteStream(temp,{flags:'wx',mode:0o600}));
    const {code,error:processError}=await exit;
    if(processError)throw processError;
    if(code!==0)throw new Error(stderr.trim()||`git show failed (${code})`);
    if(!bytes)throw new Error('GitHub video asset is empty');
    await rename(temp,outputPath);
    return bytes;
  }catch(error){child.kill();await unlink(temp).catch(()=>{});throw error;}
}

async function makeHandoffItems(manifestEntries,assetReader,env,stateDir){
  const items=[],errors=[];
  const cache=join(resolve(stateDir),'video-cache');
  await ensureDir(cache);
  for(const [name,text] of manifestEntries){
    if(!FILE_RE.test(name))continue;
    let entry=null;
    try{
      entry=JSON.parse(text);
      if(!ID_RE.test(entry?.id||''))throw new Error('Invalid video handoff id');
      if(typeof entry.media?.path!=='string'||!VIDEO_RE.test(entry.media.path))throw new Error('Unsafe video asset path');
      const mediaFile=join(cache,`${entry.id}.mp4`);
      await assetReader(entry.media.path,mediaFile);
      const checked=await validateVideoHandoff(entry,mediaFile,env);
      const cacheManifest=join(cache,basename(name));
      await writeFile(cacheManifest,JSON.stringify(entry,null,2)+'\n',{mode:0o600});
      items.push({...checked,manifestPath:cacheManifest,assetName:basename(entry.media.path)});
    }catch(error){errors.push({file:name,postId:typeof entry?.id==='string'?entry.id:null,reason:String(error.message||'Video handoff validation failed').slice(0,220)});}
  }
  await writeFile(join(resolve(stateDir),'video-queue-errors.json'),JSON.stringify({recordedAt:new Date().toISOString(),errors},null,2)+'\n',{mode:0o600});
  return {items,errors};
}

export async function loadLocalVideoHandoffs({repoRoot=process.cwd(),stateDir='.crew-social-agent',env=process.env}={}){
  const dir=join(resolve(repoRoot),'content','video-handoffs');
  const files=(await readdir(dir)).filter(x=>FILE_RE.test(x)).sort();
  const manifests=await Promise.all(files.map(async name=>[name,await readFile(join(dir,name),'utf8')]));
  const cache=join(resolve(stateDir),'video-cache');
  return makeHandoffItems(manifests,async(rel,outputPath)=>{
    const path=resolve(repoRoot,rel);
    if(!path.startsWith(resolve(repoRoot)+sep))fail('Video asset escaped repository root');
    const bytes=await stat(path);if(bytes.size>MAX_VIDEO_BYTES)fail('Video asset exceeds 1 GB');
    await ensureDir(cache);
    await copyFile(path,outputPath);
    await chmod(outputPath,0o600);
  },env,stateDir);
}

export async function syncRemoteVideoHandoffs({repoRoot=process.cwd(),branch='main',stateDir='.crew-social-agent',env=process.env}={}){
  if(typeof branch!=='string'||!/^[A-Za-z0-9._/-]{1,120}$/.test(branch)||branch.includes('..')||branch.startsWith('-'))fail('Invalid video queue branch');
  const ref='refs/remotes/crew-social-agent/video-handoffs';
  await new Promise((resolveFetch,reject)=>{
    const child=spawn('git',['fetch','--quiet','--no-tags','origin',`+refs/heads/${branch}:${ref}`],{cwd:repoRoot,stdio:['ignore','ignore','pipe']});
    let err='';child.stderr.setEncoding('utf8');child.stderr.on('data',x=>{if(err.length<4096)err+=x;});
    child.once('error',reject);child.once('close',code=>code===0?resolveFetch():reject(new Error(err.trim()||'fetch failed')));
  }).catch(async()=>{
    await ensureDir(resolve(stateDir));
    await writeFile(join(resolve(stateDir),'video-sync-error.json'),JSON.stringify({recordedAt:new Date().toISOString(),reason:'GitHub video handoff sync failed; no video posts were attempted.'},null,2)+'\n',{mode:0o600});
    throw new Error('GitHub video handoff sync failed. No video posts were attempted.');
  });
  const execGit=(args)=>new Promise((resolveExec,reject)=>{
    const child=spawn('git',args,{cwd:repoRoot,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',x=>{if(stdout.length<8*1024*1024)stdout+=x;});child.stderr.on('data',x=>{if(stderr.length<4096)stderr+=x;});
    child.once('error',reject);child.once('close',code=>code===0?resolveExec(stdout):reject(new Error(stderr.trim()||`git command failed (${code})`)));
  });
  const commit=(await execGit(['rev-parse','--verify',`${ref}^{commit}`])).trim();
  const tree=await execGit(['ls-tree','-r','--name-only',ref,'content/video-handoffs']);
  const paths=tree.split('\n').filter(Boolean);
  const manifests=[];
  for(const path of paths){
    const relative=path.slice('content/video-handoffs/'.length);
    if(path.startsWith('content/video-handoffs/')&&FILE_RE.test(relative))manifests.push([relative,await execGit(['show',`${ref}:${path}`])]);
  }
  const cache=join(resolve(stateDir),'video-cache');await ensureDir(cache);
  const {items,errors}=await makeHandoffItems(manifests,async(rel,outputPath)=>{
    if(!VIDEO_RE.test(rel))fail('Unsafe video asset path');
    await streamGitBlob(repoRoot,ref,rel,outputPath);
  },env,stateDir);
  const syncedAt=new Date().toISOString();
  await writeFile(join(resolve(stateDir),'last-video-sync.json'),JSON.stringify({syncedAt,branch,commit,items:items.length,errors:errors.length})+'\n',{mode:0o600});
  await unlink(join(resolve(stateDir),'video-sync-error.json')).catch(()=>{});
  return {items,errors,syncedAt,branch,commit};
}

async function readTask(path){try{return await readJson(path);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
async function writeTask(stateDir,record,changes){
  const next={...record,...changes,updatedAt:new Date().toISOString()};
  await atomicJson(taskPath(stateDir,record.postId,record.network),next);
  return next;
}
async function ensureTask(stateDir,checked,network){
  const path=taskPath(stateDir,checked.entry.id,network);await ensureDir(dirname(path));
  const initial={postId:checked.entry.id,network,requestId:checked.posts[network].requestId,state:'pending',
    createdAt:new Date().toISOString(),schedule:checked.entry.schedule,text:checked.posts[network].text,
    mediaSha256:checked.sha256,mediaInfo:checked.mediaInfo,remoteMediaId:null,remoteId:null,publicUrl:null,attempts:0};
  try{const handle=await open(path,'wx',0o600);try{await handle.writeFile(JSON.stringify(initial,null,2)+'\n');await handle.sync();}finally{await handle.close();}return initial;}
  catch(error){if(error.code!=='EEXIST')throw error;const prior=await readJson(path);if(prior.requestId!==initial.requestId)fail('Video requestId changed for an existing post/platform; create a new handoff id');return prior;}
}

async function acquireLock(stateDir){
  const path=join(resolve(stateDir),'video-agent.lock');await ensureDir(dirname(path));
  try{const handle=await open(path,'wx',0o600);await handle.writeFile(JSON.stringify({pid:process.pid,createdAt:new Date().toISOString()}));await handle.sync();await handle.close();return async()=>unlink(path).catch(()=>{});}
  catch(error){if(error.code!=='EEXIST')throw error;let active=true;try{const old=await readJson(path);process.kill(old.pid,0);}catch(e){if(e.code==='ESRCH'||e.code==='ENOENT')active=false;}if(active)fail('Another local video publisher process is active');await unlink(path).catch(()=>{});return acquireLock(stateDir);}
}
async function isPaused(stateDir){try{return (await readJson(join(resolve(stateDir),'paused.json'))).paused===true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
async function listVideoTasks(stateDir){
  const dir=join(resolve(stateDir),'video-tasks');let names;try{names=await readdir(dir);}catch(e){if(e.code==='ENOENT')return [];throw e;}
  return Promise.all(names.filter(x=>x.endsWith('.json')).map(x=>readJson(join(dir,x))));
}
function errorReason(error){
  const message=String(error?.message||error||'Unknown error');
  if(/credentials are not configured/i.test(message))return 'CREDENTIALS_MISSING';
  if(/401|190|token.*expir/i.test(message))return 'TOKEN_EXPIRED_OR_INVALID';
  if(/403|permission|code (?:10|200|1349245)\b/i.test(message))return 'PERMISSION_OR_ROLE_MISSING';
  if(/429|rate limit|code (?:4|17|32|613)\b/i.test(message))return 'RATE_LIMITED';
  return message.slice(0,220);
}

export async function verifyPublicVideo(checked,fetcher=fetch){
  let response;
  try{response=await fetcher(checked.videoUrl,{method:'GET',redirect:'error',headers:{Accept:'video/mp4'},signal:AbortSignal.timeout(300000)});}
  catch{fail('PUBLIC_VIDEO_UNAVAILABLE');}
  if(!response.ok)fail(`PUBLIC_VIDEO_HTTP_${response.status}`);
  const contentType=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  // GitHub raw currently serves MP4 blobs as application/octet-stream. The
  // manifest, MP4 parser and full SHA comparison still verify the actual bytes.
  if(!['video/mp4','application/octet-stream'].includes(contentType))fail('PUBLIC_VIDEO_INVALID_CONTENT_TYPE');
  const declared=Number(response.headers.get('content-length')||0);
  if(declared&&declared!==checked.mediaInfo.fileSize)fail('PUBLIC_VIDEO_SIZE_MISMATCH');
  if(declared>MAX_VIDEO_BYTES||!response.body)fail('PUBLIC_VIDEO_EMPTY_OR_TOO_LARGE');
  const reader=response.body.getReader(),hash=createHash('sha256');let total=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>MAX_VIDEO_BYTES){await reader.cancel();fail('PUBLIC_VIDEO_TOO_LARGE');}hash.update(value);}}
  finally{reader.releaseLock?.();}
  if(total!==checked.mediaInfo.fileSize)fail('PUBLIC_VIDEO_SIZE_MISMATCH');
  if(hash.digest('hex')!==checked.sha256)fail('PUBLIC_VIDEO_SHA256_MISMATCH');
  return {bytes:total,sha256:checked.sha256};
}

export async function runVideoHandoffs({items=[],errors=[],stateDir='.crew-social-agent',env=process.env,now=new Date(),send=sendVideoPost,fetcher=fetch,timezone=env.SOCIAL_TIMEZONE||'Asia/Taipei'}={}){
  const release=await acquireLock(stateDir);
  try{
    const results=errors.map(error=>({postId:error.postId||null,state:'blocked',reason:error.reason}));
    for(const task of await listVideoTasks(stateDir))if(task.state==='sending')
      await writeTask(stateDir,task,{state:'needs_reconciliation',lastError:'PROCESS_RESTARTED_DURING_SEND',reconciliationRequired:true});
    const paused=await isPaused(stateDir),late=Number(env.SOCIAL_MAX_LATE_MINUTES||180);
    for(const item of items){
      let checked;
      try{checked=await validateVideoHandoff(item.entry,item.videoPath,env);}catch(error){results.push({postId:item.entry?.id||null,state:'blocked',reason:errorReason(error)});continue;}
      const {entry}=checked;
      if(entry.status!=='ready_for_video_publisher'){
        results.push({postId:entry.id,state:'not_ready',status:entry.status,publishPermitted:entry.publish_permitted,reason:'VIDEO_HANDOFF_NOT_READY'});continue;
      }
      if(entry.publish_permitted!==true){results.push({postId:entry.id,state:'blocked',reason:'PUBLISH_NOT_PERMITTED'});continue;}
      for(const network of checked.networks){
        let task;
        try{task=await ensureTask(stateDir,checked,network);}catch(error){results.push({postId:entry.id,network,state:'blocked',reason:errorReason(error)});continue;}
        if(['published','skipped','skipped_expired','needs_reconciliation'].includes(task.state)){
          results.push({postId:entry.id,network,state:task.state,remoteId:task.remoteId||undefined});continue;
        }
        if(paused){results.push({postId:entry.id,network,state:'paused'});continue;}
        if(env.SOCIAL_AGENT_MODE!=='live'){
          task=await writeTask(stateDir,task,{lastSimulationAt:new Date(now).toISOString(),lastSimulationMode:'agent_dry_run'});
          results.push({postId:entry.id,network,state:'pending',dryRun:true,reason:'AGENT_MODE_DRY_RUN'});continue;
        }
        if(!entry.schedule){results.push({postId:entry.id,network,state:'blocked',reason:'SCHEDULE_MISSING'});continue;}
        const timing=isScheduleDue(entry.schedule,now,timezone,late);
        if(timing.state==='waiting'){results.push({postId:entry.id,network,state:'pending',reason:'NOT_DUE',scheduledAt:timing.scheduledAt});continue;}
        if(timing.state==='expired'){
          task=await writeTask(stateDir,task,{state:'skipped_expired',lastError:'SCHEDULE_EXPIRED'});
          results.push({postId:entry.id,network,state:'skipped_expired',lateMinutes:timing.lateMinutes});continue;
        }
        if(!available(env)[network]){results.push({postId:entry.id,network,state:'blocked',reason:'CREDENTIALS_MISSING'});continue;}
        try{await verifyPublicVideo(checked,fetcher);}catch(error){results.push({postId:entry.id,network,state:'blocked',reason:errorReason(error)});continue;}
        task=await writeTask(stateDir,task,{state:'sending',startedAt:new Date(now).toISOString(),attempts:(task.attempts||0)+1,lastError:null});
        try{
          const sent=await send(env,network,{text:checked.posts[network].text,videoUrl:checked.videoUrl,title:entry.title||'',altText:entry.media.alt_text||'',
            onProgress:async progress=>{task=await writeTask(stateDir,task,{remoteMediaId:progress.providerMediaId,uploadStage:progress.stage});}},fetcher);
          task=await writeTask(stateDir,task,{state:'published',remoteId:sent.id||sent,remoteMediaId:sent.mediaId||task.remoteMediaId,
            publicUrl:sent.url||null,publishedAt:new Date().toISOString(),reconciliationRequired:false,
            lastError:sent.url?null:'PUBLISHED_URL_LOOKUP_UNAVAILABLE'});
          results.push({postId:entry.id,network,state:'published',remoteId:task.remoteId,publicUrl:task.publicUrl});
        }catch(error){
          task=await writeTask(stateDir,task,{state:'needs_reconciliation',reconciliationRequired:true,lastError:errorReason(error)});
          results.push({postId:entry.id,network,state:'needs_reconciliation',reason:task.lastError});
        }
      }
    }
    await atomicJson(join(resolve(stateDir),'last-video-run.json'),{finishedAt:new Date().toISOString(),results:results.map(({postId,network,state,reason})=>({postId,network,state,reason}))});
    return results;
  }finally{await release();}
}

export async function videoTasks(stateDir='.crew-social-agent'){return listVideoTasks(stateDir);}

export async function reconcileVideoHandoffs(stateDir='.crew-social-agent',env=process.env,{postId,network,fetcher=fetch}={}){
  const candidates=(await listVideoTasks(stateDir)).filter(task=>task.state==='needs_reconciliation'&&(!postId||task.postId===postId)&&(!network||task.network===network));
  const results=[];
  for(const task of candidates){
    if(!task.remoteMediaId){results.push({postId:task.postId,network:task.network,state:task.state,reason:'REMOTE_MEDIA_ID_MISSING; MANUAL_CHECK_REQUIRED'});continue;}
    if(!available(env)[task.network]){results.push({postId:task.postId,network:task.network,state:task.state,reason:'CREDENTIALS_MISSING'});continue;}
    try{
      const status=await inspectVideoPostStatus(env,task.network,task.remoteMediaId,fetcher);
      const values=task.network==='threads'?[String(status.status||'').toLowerCase()]:
        [String(status.status?.publishing_phase?.status||'').toLowerCase(),String(status.status?.video_status||'').toLowerCase()];
      const value=values.find(x=>x)||'unknown';
      const complete=values.some(x=>task.network==='threads'?x==='published':['complete','completed','published','finished'].includes(x));
      if(complete){
        let remoteId=task.network==='facebook'?task.remoteMediaId:null;
        let publicUrl=status.permalink_url||null;
        if(task.network==='threads'){
          try{
            const began=Date.parse(task.startedAt||task.updatedAt||task.createdAt)-5*60*1000;
            const matches=(await listPosts(env,'threads',fetcher)).filter(post=>post.text===task.text&&(!post.timestamp||Date.parse(post.timestamp)>=began));
            if(matches.length===1){remoteId=matches[0].id;publicUrl=matches[0].url||publicUrl;}
          }catch{}
        }
        const updated=await writeTask(stateDir,task,{state:'published',remoteId,publicUrl,publishedAt:new Date().toISOString(),reconciliationRequired:false,
          lastError:remoteId&&publicUrl?null:'PUBLISHED_ID_OR_URL_LOOKUP_UNAVAILABLE',providerStatus:value});
        results.push({postId:task.postId,network:task.network,state:updated.state,remoteId:updated.remoteId,publicUrl:updated.publicUrl});
      }else results.push({postId:task.postId,network:task.network,state:task.state,providerStatus:value||'unknown',reason:'NOT_RETRYING_AUTOMATICALLY'});
    }catch(error){results.push({postId:task.postId,network:task.network,state:task.state,reason:errorReason(error)});}
  }
  return results;
}

export async function retryVideoAfterReconciliation(stateDir,postId,network,{confirmedNotPublished=false}={}){
  if(!ID_RE.test(postId||'')||!NETWORKS.includes(network))fail('Invalid video handoff ID or network');
  if(confirmedNotPublished!==true)fail('Manual retry requires confirmation that the Reel/video is not live on Meta');
  const path=taskPath(stateDir,postId,network),task=await readTask(path);
  if(!task||task.state!=='needs_reconciliation'||task.remoteId)fail('Only an unresolved video task without a remote post ID can be retried');
  return writeTask(stateDir,task,{state:'pending',reconciliationRequired:false,manualRetryAt:new Date().toISOString(),manualRetryCount:(task.manualRetryCount||0)+1,lastError:'MANUAL_RETRY_AFTER_REMOTE_CHECK'});
}

export {validateVideoUrl};
