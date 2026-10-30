#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';
import {allTasks,nextSchedule,reconcile,retryAfterReconciliation,runQueue,setOverride,setPaused} from '../local-publisher/core.js';
import {loadLocalQueue,syncRemoteQueue} from '../local-publisher/github.js';
import {loadAgentEnvironment,refreshThreadsIfNeeded,setThreadsExpiry} from '../local-publisher/credentials.js';
import {loadLocalVideoHandoffs,reconcileVideoHandoffs,retryVideoAfterReconciliation,runVideoHandoffs,syncRemoteVideoHandoffs,videoTasks} from '../local-publisher/video.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const stateDir=resolve(process.env.SOCIAL_AGENT_STATE_DIR||join(root,'.crew-social-agent'));
const branch=process.env.SOCIAL_QUEUE_BRANCH||'main';
const timezone=process.env.SOCIAL_TIMEZONE||'Asia/Taipei';
const usage=`Crew Social local publisher (Meta API is called only when both local and queue modes are live)

  node --env-file=.env scripts/social-agent.mjs sync
  node --env-file=.env scripts/social-agent.mjs run-once [--offline]
  node --env-file=.env scripts/social-agent.mjs daemon
  node --env-file=.env scripts/social-agent.mjs status
  node --env-file=.env scripts/social-agent.mjs show <post-id>
  node --env-file=.env scripts/social-agent.mjs show-video <handoff-id>
  node --env-file=.env scripts/social-agent.mjs pause | resume
  node --env-file=.env scripts/social-agent.mjs skip <post-id> <facebook|threads>
  node --env-file=.env scripts/social-agent.mjs reschedule <post-id> <YYYY-MM-DD> <HH:mm> [facebook|threads]
  node --env-file=.env scripts/social-agent.mjs reconcile [post-id] [facebook|threads]
  node --env-file=.env scripts/social-agent.mjs reconcile-video [handoff-id] [facebook|threads]
  node --env-file=.env scripts/social-agent.mjs retry <post-id> <facebook|threads> --confirm-not-published
  node --env-file=.env scripts/social-agent.mjs retry-video <handoff-id> <facebook|threads> --confirm-not-published
  node --env-file=.env scripts/social-agent.mjs token-expiry threads <ISO-datetime>
  node --env-file=.env scripts/social-agent.mjs refresh-threads
  node --env-file=.env scripts/social-agent.mjs history
`;
const networks=['facebook','threads'];
const out=value=>console.log(JSON.stringify(value,null,2));
const dateInZone=(value,tz)=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value).map(x=>[x.type,x.value]));
const isoDate=parts=>`${parts.year}-${parts.month}-${parts.day}`;

async function readLastSync(){try{return JSON.parse(await readFile(join(stateDir,'last-sync.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
async function queueItems(offline=false,env=process.env){
  if(offline)return loadLocalQueue({repoRoot:root,stateDir,env});
  return syncRemoteQueue({repoRoot:root,branch,stateDir,env});
}
async function videoHandoffItems(offline=false,env=process.env){
  if(offline)return loadLocalVideoHandoffs({repoRoot:root,stateDir,env});
  return syncRemoteVideoHandoffs({repoRoot:root,branch,stateDir,env});
}
async function oneCycle(offline=false){
  let env=await loadAgentEnvironment(process.env,stateDir);
  const {items,errors}=await queueItems(offline,env);
  let videos={items:[],errors:[]},videoSyncError=null;
  try{videos=await videoHandoffItems(offline,env);}catch(error){videoSyncError=error.message;}
  let tokenStatus=null;
  const hasAuthorizedThreads=(items.some(x=>x.entry.mode==='live'&&x.entry.safety?.publish_permitted===true&&x.entry.networks.includes('threads'))||
    videos.items.some(x=>x.entry.status==='ready_for_video_publisher'&&x.entry.publish_permitted===true&&x.networks.includes('threads')));
  if(env.SOCIAL_AGENT_MODE==='live'&&hasAuthorizedThreads){
    const checked=await refreshThreadsIfNeeded(env,stateDir);env=checked.env;tokenStatus=checked.status;
  }
  const results=await runQueue({items,queueErrors:errors,stateDir,env,timezone});
  const videoResults=videoSyncError?[{state:'sync_error',reason:videoSyncError}]:await runVideoHandoffs({items:videos.items,errors:videos.errors,stateDir,env,timezone});
  out({queueItems:items.length,queueErrors:errors.length,videoHandoffs:videos.items.length,videoErrors:videos.errors.length,videoSyncError,
    agentMode:env.SOCIAL_AGENT_MODE||'dry_run',threadsToken:tokenStatus,results,videoResults});
}
async function status(){
  const tasks=await allTasks(stateDir);
  const videoTaskList=await videoTasks(stateDir);
  const date=isoDate(dateInZone(new Date(),timezone));
  const today=tasks.filter(t=>t.state==='published'&&t.publishedAt&&isoDate(dateInZone(new Date(t.publishedAt),timezone))===date);
  let paused=false;try{paused=JSON.parse(await readFile(join(stateDir,'paused.json'),'utf8')).paused===true;}catch(e){if(e.code!=='ENOENT')throw e;}
  const counts={};for(const t of tasks)counts[t.state]=(counts[t.state]||0)+1;
  const env=await loadAgentEnvironment(process.env,stateDir);
  let queueErrors=[];try{queueErrors=JSON.parse(await readFile(join(stateDir,'queue-errors.json'),'utf8')).errors||[];}catch(e){if(e.code!=='ENOENT')throw e;}
  let syncError=null;try{syncError=JSON.parse(await readFile(join(stateDir,'sync-error.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  let lastVideoSync=null;try{lastVideoSync=JSON.parse(await readFile(join(stateDir,'last-video-sync.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  let videoSyncError=null;try{videoSyncError=JSON.parse(await readFile(join(stateDir,'video-sync-error.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  let videoQueueErrors=[];try{videoQueueErrors=JSON.parse(await readFile(join(stateDir,'video-queue-errors.json'),'utf8')).errors||[];}catch(e){if(e.code!=='ENOENT')throw e;}
  const videoCounts={};for(const task of videoTaskList)videoCounts[task.state]=(videoCounts[task.state]||0)+1;
  out({mode:process.env.SOCIAL_AGENT_MODE||'dry_run',paused,queueBranch:branch,timezone,credentials:{facebook:!!env.FACEBOOK_PAGE_TOKEN&&!!env.FACEBOOK_PAGE_ID,threads:!!env.THREADS_ACCESS_TOKEN,source:env.SOCIAL_AGENT_CREDENTIAL_SOURCE||'none',threadsExpiry:env.THREADS_TOKEN_EXPIRES_AT||null,threadsExpiryUnknown:!!env.THREADS_ACCESS_TOKEN&&!env.THREADS_TOKEN_EXPIRES_AT},taskCount:tasks.length,todayPublished:today.length,counts,lastSync:await readLastSync(),syncError,queueErrors,tasks:tasks.map(({postId,network,state,schedule,remoteId,publicUrl,publishedAt,lastError})=>({postId,network,state,schedule,remoteId,publicUrl,publishedAt,lastError})),videoTaskCount:videoTaskList.length,videoCounts,lastVideoSync,videoSyncError,videoQueueErrors,videoTasks:videoTaskList.map(({postId,network,state,schedule,remoteId,remoteMediaId,publicUrl,publishedAt,lastError})=>({postId,network,state,schedule,remoteId,remoteMediaId,publicUrl,publishedAt,lastError}))});
}
async function show(postId){
  let items;
  try{items=(await queueItems(false,process.env)).items;}catch{items=(await queueItems(true,process.env)).items;}
  const found=items.find(x=>x.entry.id===postId);
  if(!found)throw new Error('Queue item not found. Run sync first.');
  out({id:found.entry.id,title:found.entry.title,mode:found.entry.mode,status:found.entry.status,schedule:found.entry.schedule,networks:found.entry.networks,posts:Object.fromEntries(found.entry.networks.map(n=>[n,found.entry.posts[n].text])),image:found.entry.image?{...found.entry.image,previewPath:join(stateDir,'cache',`${found.entry.id}.${found.entry.image.format}`)}:null,safety:found.entry.safety});
}
async function showVideo(handoffId){
  let items;try{items=(await videoHandoffItems(false,process.env)).items;}catch{items=(await videoHandoffItems(true,process.env)).items;}
  const found=items.find(x=>x.entry.id===handoffId);
  if(!found)throw new Error('Video handoff not found. Run sync first.');
  out({id:found.entry.id,title:found.entry.title,status:found.entry.status,publishPermitted:found.entry.publish_permitted,
    schedule:found.entry.schedule,platforms:found.networks,posts:Object.fromEntries(found.networks.map(n=>[n,found.posts[n].text])),
    media:{...found.mediaInfo,sha256:found.sha256,publicUrl:found.videoUrl,previewPath:found.videoPath}});
}

async function main(){
  const [command,...args]=process.argv.slice(2);
  if(!command||command==='help'||command==='--help'){console.log(usage);return;}
  if(command==='sync'){
    const {items,errors,syncedAt,branch:usedBranch,commit}=await syncRemoteQueue({repoRoot:root,branch,stateDir,env:process.env});
    let videos;try{videos=await syncRemoteVideoHandoffs({repoRoot:root,branch,stateDir,env:process.env});}catch(error){videos={items:[],errors:[],syncError:error.message};}
    out({syncedAt,branch:usedBranch,commit,items:items.map(({entry,imageBytes})=>({id:entry.id,mode:entry.mode,networks:entry.networks,imageBytes:imageBytes?.length??0,sha256:entry.image?.sha256??null,publishPermitted:entry.safety.publish_permitted})),queueErrors:errors,
      videoSync:{syncedAt:videos.syncedAt||null,commit:videos.commit||null,items:videos.items.map(x=>({id:x.entry.id,status:x.entry.status,platforms:x.networks,bytes:x.mediaInfo.fileSize,sha256:x.sha256,publishPermitted:x.entry.publish_permitted})),errors:videos.errors,syncError:videos.syncError||null}});return;
  }
  if(command==='run-once'){
    if(args.length>1||(args.length===1&&args[0]!=='--offline'))throw new Error('run-once accepts only [--offline]');
    await oneCycle(args[0]==='--offline');return;
  }
  if(command==='daemon'){
    if(args.length)throw new Error('daemon takes no arguments');
    const interval=Math.max(60000,Number(process.env.SOCIAL_POLL_INTERVAL_MS||1800000));
    console.log(`Local publisher running; poll interval ${interval} ms, mode ${process.env.SOCIAL_AGENT_MODE||'dry_run'}. Ctrl-C stops it.`);
    let stopped=false;process.once('SIGINT',()=>{stopped=true;});process.once('SIGTERM',()=>{stopped=true;});
    while(!stopped){try{await oneCycle(false);}catch(e){console.error('Social agent cycle failed:',e.message);}if(!stopped)await new Promise(r=>setTimeout(r,interval));}
    return;
  }
  if(command==='status'){if(args.length)throw new Error('status takes no arguments');await status();return;}
  if(command==='show'){if(args.length!==1)throw new Error('show needs a post id');await show(args[0]);return;}
  if(command==='show-video'){if(args.length!==1)throw new Error('show-video needs a video handoff id');await showVideo(args[0]);return;}
  if(command==='pause'||command==='resume'){
    if(args.length)throw new Error(`${command} takes no arguments`);
    await setPaused(stateDir,command==='pause');out({paused:command==='pause'});return;
  }
  if(command==='skip'){
    if(args.length!==2||!networks.includes(args[1]))throw new Error('skip needs a post id and network');
    await setOverride(stateDir,args[0],args[1],{skip:true});out({postId:args[0],network:args[1],skip:true});return;
  }
  if(command==='reschedule'){
    if(args.length<3||args.length>4||(args[3]&&!networks.includes(args[3])))throw new Error('reschedule needs post-id YYYY-MM-DD HH:mm [network]');
    const [,date,time,network]=args;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('Invalid date or time');
    const targets=network?[network]:networks;
    for(const n of targets)await setOverride(stateDir,args[0],n,{schedule:{date,time,timezone}});
    out({postId:args[0],networks:targets,schedule:{date,time,timezone}});return;
  }
  if(command==='reconcile'){
    if(args.length>2||(args[1]&&!networks.includes(args[1])))throw new Error('reconcile accepts [post-id] [network]');
    out(await reconcile(stateDir,await loadAgentEnvironment(process.env,stateDir),{postId:args[0],network:args[1]}));return;
  }
  if(command==='reconcile-video'){
    if(args.length>2||(args[1]&&!networks.includes(args[1])))throw new Error('reconcile-video accepts [handoff-id] [network]');
    out(await reconcileVideoHandoffs(stateDir,await loadAgentEnvironment(process.env,stateDir),{postId:args[0],network:args[1]}));return;
  }
  if(command==='retry'){
    if(args.length!==3||!networks.includes(args[1])||args[2]!=='--confirm-not-published')throw new Error('retry needs post-id network --confirm-not-published');
    const task=await retryAfterReconciliation(stateDir,args[0],args[1],{confirmedNotPublished:true});
    out({postId:task.postId,network:task.network,state:task.state,manualRetryCount:task.manualRetryCount});return;
  }
  if(command==='retry-video'){
    if(args.length!==3||!networks.includes(args[1])||args[2]!=='--confirm-not-published')throw new Error('retry-video needs handoff-id network --confirm-not-published');
    const task=await retryVideoAfterReconciliation(stateDir,args[0],args[1],{confirmedNotPublished:true});
    out({postId:task.postId,network:task.network,state:task.state,manualRetryCount:task.manualRetryCount});return;
  }
  if(command==='token-expiry'){
    if(args.length!==2||args[0]!=='threads')throw new Error('token-expiry needs threads and an ISO datetime');
    out({network:'threads',expiresAt:await setThreadsExpiry(stateDir,args[1])});return;
  }
  if(command==='refresh-threads'){
    if(args.length)throw new Error('refresh-threads takes no arguments');
    const {env,status}=await refreshThreadsIfNeeded(process.env,stateDir,{force:true});
    out({network:'threads',...status});
    if(status.refreshBlocked)process.exitCode=1;
    return;
  }
  if(command==='history'){if(args.length)throw new Error('history takes no arguments');out(await allTasks(stateDir));return;}
  if(command==='next-slot'){
    if(args.length)throw new Error('next-slot takes no arguments');
    const slots=(process.env.SOCIAL_DAILY_SLOTS||'12:00,19:00,21:00').split(',').map(x=>x.trim());
    out(nextSchedule(new Date(),{timezone,slots}));return;
  }
  throw new Error(`Unknown command: ${command}\n${usage}`);
}

main().catch(e=>{console.error('Crew Social local publisher:',e.message);process.exitCode=1;});
