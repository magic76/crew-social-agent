import test from 'node:test';
import assert from 'node:assert/strict';
import {copyFile,mkdir,mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {sendVideoPost} from '../src/meta.js';
import {loadLocalVideoHandoffs,reconcileVideoHandoffs,runVideoHandoffs,syncRemoteVideoHandoffs,videoTasks} from '../local-publisher/video.js';

const root=process.cwd();
const tmp=()=>mkdtemp(join(tmpdir(),'crew-video-publisher-test-'));
const json=value=>new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});
const dueNow=new Date('2026-10-30T13:30:00Z');
const env=(mode='live')=>({SOCIAL_AGENT_MODE:mode,SOCIAL_TIMEZONE:'Asia/Taipei',SOCIAL_VIDEO_HOSTS:'raw.githubusercontent.com',
  THREADS_ACCESS_TOKEN:'threads-test',FACEBOOK_PAGE_TOKEN:'facebook-test',FACEBOOK_PAGE_ID:'123456789012345'});

async function loadedFixture(stateDir){
  const loaded=await loadLocalVideoHandoffs({repoRoot:root,stateDir,env:env()});
  assert.deepEqual(loaded.errors,[]);
  const items=loaded.items.filter(x=>x.entry.id==='crew-video-handoff-2026-10-30-permissions-101');
  assert.equal(items.length,1);
  return items[0];
}
function approved(item,platforms=item.networks){
  return {...item,networks:platforms,entry:{...item.entry,status:'ready_for_video_publisher',publish_permitted:true,
    platforms,schedule:{date:'2026-10-30',time:'21:00',timezone:'Asia/Taipei'}}};
}
const publicVideoFetcher=bytes=>async(url,options)=>{
  assert.equal(new URL(url).hostname,'raw.githubusercontent.com');
  assert.equal(options.redirect,'error');
  return new Response(bytes,{status:200,headers:{'content-type':'video/mp4','content-length':String(bytes.length)}});
};

test('MP4 handoff validation reports real file metadata and enforces the draft publication gate',async()=>{
  const dir=await tmp();
  try{
    const loaded=await loadedFixture(dir);
    const item={...loaded,entry:{...loaded.entry,status:'draft_handoff_only',publish_permitted:false}};
    assert.deepEqual({width:item.mediaInfo.width,height:item.mediaInfo.height,fps:item.mediaInfo.fps,duration:item.mediaInfo.durationSeconds,
      video:item.mediaInfo.videoCodec,audio:item.mediaInfo.audioCodec},
      {width:1080,height:1920,fps:30,duration:24,video:'avc1',audio:'mp4a'});
    assert.equal(item.entry.status,'draft_handoff_only');
    assert.equal(item.entry.publish_permitted,false);
    let sends=0,fetches=0;
    const result=await runVideoHandoffs({items:[item],stateDir:dir,env:env(),now:dueNow,
      send:async()=>{sends++;},fetcher:async()=>{fetches++;throw Error('draft must not fetch or publish');}});
    assert.equal(result[0].state,'not_ready');
    assert.equal(sends,0);assert.equal(fetches,0);
    assert.deepEqual(await videoTasks(dir),[]);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('GitHub video sync streams the manifest and MP4 into the private cache',async()=>{
  const dir=await tmp(),repo=join(dir,'repo'),remote=join(dir,'origin.git'),state=join(dir,'state');
  const git=(cwd,...args)=>execFileSync('git',args,{cwd,stdio:'ignore'});
  try{
    execFileSync('git',['init','--bare',remote],{stdio:'ignore'});
    await mkdir(repo,{recursive:true});
    git(repo,'init','-b','main');git(repo,'config','user.name','Local Test');git(repo,'config','user.email','test@example.invalid');
    const handoffs=join(repo,'content','video-handoffs'),assets=join(handoffs,'assets');await mkdir(assets,{recursive:true});
    await copyFile(join(root,'content/video-handoffs/2026-10-30-permissions-101.json'),join(handoffs,'2026-10-30-permissions-101.json'));
    await copyFile(join(root,'content/video-handoffs/assets/2026-10-30-permissions-101-gemini.mp4'),join(assets,'2026-10-30-permissions-101-gemini.mp4'));
    git(repo,'add','.');git(repo,'commit','-m','video handoff fixture');git(repo,'remote','add','origin',remote);git(repo,'push','-u','origin','main');
    const synced=await syncRemoteVideoHandoffs({repoRoot:repo,branch:'main',stateDir:state,env:{SOCIAL_VIDEO_HOSTS:'raw.githubusercontent.com'}});
    assert.equal(synced.items.length,1);assert.deepEqual(synced.errors,[]);
    assert.equal(synced.items[0].entry.id,'crew-video-handoff-2026-10-30-permissions-101');
    assert.equal(synced.items[0].mediaInfo.fileSize,1183609);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('video dry-run creates independent pending platform tasks and makes no API or media requests',async()=>{
  const dir=await tmp();
  try{
    const item=approved(await loadedFixture(dir));let sends=0,fetches=0;
    const results=await runVideoHandoffs({items:[item],stateDir:dir,env:env('dry_run'),now:dueNow,
      send:async()=>{sends++;},fetcher:async()=>{fetches++;}});
    assert.deepEqual(results.map(x=>x.state),['pending','pending']);
    assert.ok(results.every(x=>x.dryRun));
    assert.equal(sends,0);assert.equal(fetches,0);
    assert.deepEqual((await videoTasks(dir)).map(x=>x.network).sort(),['facebook','threads']);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('both platform tasks publish once after public video bytes match the handoff SHA',async()=>{
  const dir=await tmp();
  try{
    const item=approved(await loadedFixture(dir));
    const bytes=await readFile(item.videoPath);let sends=0,fetches=0;
    const send=async(_env,network,payload)=>{
      sends++;assert.equal(payload.videoUrl,item.videoUrl);assert.ok(payload.text);
      await payload.onProgress({providerMediaId:network==='facebook'?'777777777':'888888888',stage:'uploaded'});
      return {id:network==='facebook'?'777777777_999999999':'888888888',mediaId:network==='facebook'?'777777777':'666666666',url:`https://${network}.example/post`};
    };
    const fetcher=async(...args)=>{fetches++;return publicVideoFetcher(bytes)(...args);};
    const first=await runVideoHandoffs({items:[item],stateDir:dir,env:env(),now:dueNow,send,fetcher});
    assert.deepEqual(first.map(x=>x.state),['published','published']);
    assert.equal(sends,2);assert.equal(fetches,2);
    const second=await runVideoHandoffs({items:[item],stateDir:dir,env:env(),now:dueNow,send,fetcher});
    assert.deepEqual(second.map(x=>x.state),['published','published']);
    assert.equal(sends,2);
    const tasks=await videoTasks(dir);assert.ok(tasks.every(x=>x.state==='published'&&x.remoteMediaId));
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('public video hash mismatch blocks all Meta calls',async()=>{
  const dir=await tmp();
  try{
    const item=approved(await loadedFixture(dir));
    const bytes=await readFile(item.videoPath);bytes[100]^=0xff;let sends=0;
    const result=await runVideoHandoffs({items:[item],stateDir:dir,env:env(),now:dueNow,send:async()=>{sends++;return '123456';},fetcher:publicVideoFetcher(bytes)});
    assert.ok(result.every(x=>x.state==='blocked'&&x.reason==='PUBLIC_VIDEO_SHA256_MISMATCH'));
    assert.equal(sends,0);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('ambiguous video send is reconciled without automatic re-publish',async()=>{
  const dir=await tmp();
  try{
    const item=approved(await loadedFixture(dir),['threads']);let sends=0;
    const send=async(_env,_network,payload)=>{sends++;await payload.onProgress({providerMediaId:'123123123',stage:'container_created'});throw Error('Threads timed out after publish request');};
    const bytes=await readFile(item.videoPath);
    const first=await runVideoHandoffs({items:[item],stateDir:dir,env:env(),now:dueNow,send,fetcher:publicVideoFetcher(bytes)});
    assert.equal(first[0].state,'needs_reconciliation');
    const task=(await videoTasks(dir))[0];assert.equal(task.remoteMediaId,'123123123');
    const checks=await reconcileVideoHandoffs(dir,env(),{postId:item.entry.id,network:'threads',fetcher:async()=>json({id:'123123123',status:'FINISHED'})});
    assert.equal(checks[0].state,'needs_reconciliation');
    const again=await runVideoHandoffs({items:[item],stateDir:dir,env:env(),now:dueNow,send,fetcher:publicVideoFetcher(bytes)});
    assert.equal(again[0].state,'needs_reconciliation');assert.equal(sends,1);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('Threads video adapter creates a VIDEO container, waits, then publishes',async()=>{
  const calls=[],progress=[];
  const fetcher=async(url,options)=>{
    const u=new URL(url),form=options.body?new URLSearchParams(options.body):null;calls.push({u,options,form});
    if(u.pathname.endsWith('/me/threads'))return json({id:'123456789'});
    if(u.pathname.endsWith('/123456789/'))return json({id:'123456789',status:'FINISHED'});
    if(u.pathname.endsWith('/me/threads_publish'))return json({id:'987654321'});
    throw Error(`Unexpected Threads URL ${u.pathname}`);
  };
  const result=await sendVideoPost(env(),'threads',{text:'影片貼文',videoUrl:'https://raw.githubusercontent.com/magic76/crew-social-agent/main/test.mp4',pollAttempts:1,pollIntervalMs:0,
    onProgress:async x=>progress.push(x)},fetcher);
  assert.equal(result.id,'987654321');assert.equal(result.mediaId,'123456789');
  assert.equal(calls[0].form.get('media_type'),'VIDEO');assert.equal(calls[0].form.get('video_url'),'https://raw.githubusercontent.com/magic76/crew-social-agent/main/test.mp4');
  assert.deepEqual(progress.map(x=>x.stage),['container_created','container_ready']);
  assert.equal(calls[2].form.get('creation_id'),'123456789');
});

test('Facebook Page Reel adapter starts, uploads hosted MP4, finishes, and confirms publication',async()=>{
  const calls=[],progress=[];
  const fetcher=async(url,options)=>{
    const u=new URL(url);calls.push({u,options,form:options.body?new URLSearchParams(options.body):null});
    if(u.hostname==='rupload.facebook.com')return json({success:true});
    if(u.pathname.endsWith('/123456789012345/video_reels')&&calls.length===1)return json({video_id:'777777777',upload_url:'https://rupload.facebook.com/video-upload/v26.0/777777777'});
    if(u.pathname.endsWith('/123456789012345/video_reels'))return json({success:true});
    if(u.pathname.endsWith('/777777777'))return json({status:{publishing_phase:{status:'complete'}},permalink_url:'https://facebook.com/reel/777777777'});
    throw Error(`Unexpected Facebook URL ${u.pathname}`);
  };
  const result=await sendVideoPost(env(),'facebook',{text:'粉絲團影片貼文',title:'最小權限原則',videoUrl:'https://raw.githubusercontent.com/magic76/crew-social-agent/main/test.mp4',pollAttempts:1,pollIntervalMs:0,
    onProgress:async x=>progress.push(x)},fetcher);
  assert.equal(result.id,'777777777');assert.equal(result.url,'https://facebook.com/reel/777777777');
  assert.equal(calls.length,4);
  assert.equal(calls[1].options.headers.Authorization,'OAuth facebook-test');
  assert.equal(calls[1].options.headers.file_url,'https://raw.githubusercontent.com/magic76/crew-social-agent/main/test.mp4');
  assert.equal(calls[2].form.get('video_id'),'777777777');assert.equal(calls[2].form.get('video_state'),'PUBLISHED');
  assert.deepEqual(progress.map(x=>x.stage),['upload_session_created','uploaded','publish_requested']);
});
