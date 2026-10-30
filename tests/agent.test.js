import test from 'node:test';
import assert from 'node:assert/strict';
import {createCipheriv,createHash,randomBytes} from 'node:crypto';
import {mkdtemp,mkdir,readdir,readFile,rm,stat,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {allTasks,ensureTask,retryAfterReconciliation,runQueue,setOverride,setPaused,validateQueueEntry} from '../local-publisher/core.js';
import {loadLocalQueue} from '../local-publisher/github.js';
import {loadAgentEnvironment,refreshThreadsIfNeeded,setThreadsExpiry} from '../local-publisher/credentials.js';

const tmp=()=>mkdtemp(join(tmpdir(),'crew-social-agent-test-'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function webp(width,height){
  const b=Buffer.alloc(30);b.write('RIFF',0);b.writeUInt32LE(22,4);b.write('WEBP',8);b.write('VP8 ',12);b.writeUInt32LE(10,16);
  b[23]=0x9d;b[24]=0x01;b[25]=0x2a;b.writeUInt16LE(width,26);b.writeUInt16LE(height,28);return b;
}
function scheduleAt(date){return {date:date.toISOString().slice(0,10),time:date.toISOString().slice(11,16),timezone:'UTC'};}
function fixture({id='crew-social-agent-test-post1',width=1200,height=1200,networks=['facebook','threads'],permitted=true,mode='live',schedule=new Date(Date.now()-60000)}={}){
  const imageBytes=webp(width,height);
  const entry={schema_version:1,id,created_date:new Date().toISOString().slice(0,10),title:'Agent test',category:'engineering',status:'ready_for_local_agent',mode,
    schedule:schedule instanceof Date?scheduleAt(schedule):schedule,networks,
    image:{format:'webp',path:'content/queue/assets/test.webp.base64',width,height,sha256:sha(imageBytes),public_url:'https://images.example.com/test.webp',alt:'Test image'},
    posts:{},safety:{publish_permitted:permitted}};
  for(const n of networks)entry.posts[n]={text:`${n} test post`,requestId:`11111111-1111-4111-8111-${n==='threads'?'111111111111':'222222222222'}`};
  return {entry,imageBytes};
}
const env=(mode='live')=>({SOCIAL_AGENT_MODE:mode,SOCIAL_TIMEZONE:'UTC',SOCIAL_IMAGE_HOSTS:'images.example.com',THREADS_ACCESS_TOKEN:'threads-test',FACEBOOK_PAGE_TOKEN:'facebook-test',FACEBOOK_PAGE_ID:'123456'});
const imageFetcher=bytes=>async url=>{
  assert.equal(new URL(url).hostname,'images.example.com');
  return new Response(bytes,{status:200,headers:{'content-type':'image/webp','content-length':String(bytes.length)}});
};

test('GitHub live queue remains pending in local dry-run mode and never calls Meta',async()=>{
  const dir=await tmp();
  try{
    const {items,errors}=await loadLocalQueue({repoRoot:process.cwd(),stateDir:join(dir,'state'),env:process.env});
    assert.deepEqual(errors,[]);
    assert.ok(items.length>=2);
    assert.ok(items.every(x=>x.imageBytes===null||Buffer.isBuffer(x.imageBytes)));
    let sends=0;
    const result=await runQueue({items,stateDir:join(dir,'state'),env:env('dry_run'),send:async()=>{sends++;throw Error('must not send');}});
    assert.equal(sends,0);
    assert.equal(result.length,items.reduce((n,x)=>n+x.entry.networks.length,0));
    assert.ok(result.every(x=>x.dryRun&&x.state==='pending'));
    const tasks=await allTasks(join(dir,'state'));
    assert.equal(tasks.length,result.length);
    assert.ok(tasks.every(x=>x.state==='pending'&&x.lastSimulationMode==='agent_dry_run'));
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('live publishing fails closed for safety flag, small/missing image URL, and missing credentials',async()=>{
  const dir=await tmp();let sends=0,fetches=0;
  const send=async()=>{sends++;return '123456';};
  try{
    const unsafe=fixture({id:'crew-social-agent-unsafe1',permitted:false});
    const small=fixture({id:'crew-social-agent-small1',width:256,height:256,networks:['threads']});
    const missingUrl=fixture({id:'crew-social-agent-no-url1',networks:['facebook']});delete missingUrl.entry.image.public_url;
    const missingCreds=fixture({id:'crew-social-agent-no-cred1',networks:['facebook']});
    const noToken={...env(),FACEBOOK_PAGE_TOKEN:''};
    const results=[];
    results.push(...await runQueue({items:[unsafe],stateDir:join(dir,'state'),env:env(),send}));
    results.push(...await runQueue({items:[small],stateDir:join(dir,'state'),env:env(),send}));
    results.push(...await runQueue({items:[missingUrl],stateDir:join(dir,'state'),env:env(),send}));
    results.push(...await runQueue({items:[missingCreds],stateDir:join(dir,'state'),env:noToken,send,fetcher:async()=>{fetches++;}}));
    assert.equal(sends,0);assert.equal(fetches,0);
    assert.ok(results.some(x=>x.reason==='PUBLISH_NOT_PERMITTED'));
    assert.ok(results.some(x=>x.reason==='IMAGE_RESOLUTION_BELOW_1080'));
    assert.ok(results.some(x=>String(x.reason).includes('public HTTPS image URL')));
    assert.ok(results.some(x=>x.reason==='CREDENTIALS_MISSING'));
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('public HTTPS image must exactly match the verified Queue asset',async()=>{
  const dir=await tmp(),item=fixture({networks:['facebook']});let sends=0;
  const different=webp(1200,1200);different[20]=1;
  try{
    const result=await runQueue({items:[item],stateDir:dir,env:env(),send:async()=>{sends++;return '1';},fetcher:imageFetcher(different)});
    assert.equal(result[0].state,'blocked');assert.equal(result[0].reason,'PUBLIC_IMAGE_SHA_MISMATCH');
    assert.equal(sends,0);assert.equal((await allTasks(dir))[0].state,'pending');
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('published Facebook is never resent when Threads is ambiguous; requestId cannot change',async()=>{
  const dir=await tmp(),item=fixture();let calls=[];
  const send=async(_env,network)=>{calls.push(network);if(network==='threads')throw Error('HTTP 429 rate limit');return '987654321';};
  const lookup=async(_env,network,id)=>({id,url:`https://www.${network}.com/${id}`,text:''});
  try{
    const first=await runQueue({items:[item],stateDir:dir,env:env(),send,lookup,fetcher:imageFetcher(item.imageBytes)});
    assert.deepEqual(first.map(x=>x.state),['published','needs_reconciliation']);
    assert.equal(first[0].publicUrl,'https://www.facebook.com/987654321');
    const second=await runQueue({items:[item],stateDir:dir,env:env(),send,lookup,fetcher:imageFetcher(item.imageBytes)});
    assert.ok(second.every(x=>['published','needs_reconciliation'].includes(x.state)));
    assert.deepEqual(calls,['facebook','threads']);
    const changed={entry:structuredClone(item.entry),imageBytes:item.imageBytes};changed.entry.posts.facebook.requestId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const third=await runQueue({items:[changed],stateDir:dir,env:env(),send,lookup,fetcher:imageFetcher(item.imageBytes)});
    assert.equal(third.find(x=>x.network==='facebook').state,'blocked');
    assert.deepEqual(calls,['facebook','threads']);
    const tasks=await allTasks(dir);
    assert.equal(tasks.find(x=>x.network==='facebook').state,'published');
    assert.equal(tasks.find(x=>x.network==='threads').state,'needs_reconciliation');
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('process restart converts an interrupted sending task to needs_reconciliation',async()=>{
  const dir=await tmp(),item=fixture({networks:['facebook']});let calls=0;
  try{
    await ensureTask(dir,item.entry,'facebook');
    const taskDir=join(dir,'tasks'),file=(await readdir(taskDir)).find(x=>x.endsWith('.json'));
    const record=JSON.parse(await readFile(join(taskDir,file),'utf8'));
    record.state='sending';record.startedAt=new Date().toISOString();
    await writeFile(join(taskDir,file),JSON.stringify(record));
    const results=await runQueue({items:[item],stateDir:dir,env:env(),send:async()=>{calls++;return '1';},fetcher:imageFetcher(item.imageBytes)});
    assert.equal(calls,0);
    assert.equal(results[0].state,'needs_reconciliation');
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('pause, skip, schedule override, and expired-item policy are durable',async()=>{
  const dir=await tmp(),item=fixture({networks:['facebook'],schedule:new Date(Date.now()+3600000)});let sends=0;
  const send=async()=>{sends++;return '333333';};
  try{
    await setPaused(dir,true);
    assert.equal((await runQueue({items:[item],stateDir:dir,env:env(),send}))[0].state,'paused');
    await setPaused(dir,false);
    assert.equal((await runQueue({items:[item],stateDir:dir,env:env(),send}))[0].reason,'NOT_DUE');
    await setOverride(dir,item.entry.id,'facebook',{schedule:scheduleAt(new Date(Date.now()-60000))});
    const bytesFetcher=imageFetcher(item.imageBytes);
    const published=await runQueue({items:[item],stateDir:dir,env:env(),send,lookup:async(_e,_n,id)=>({id,url:'https://facebook.com/p/1'}),fetcher:bytesFetcher});
    assert.equal(published[0].state,'published');assert.equal(sends,1);
    const expired=fixture({id:'crew-social-agent-expired1',networks:['facebook'],schedule:new Date(Date.now()-5*3600000)});
    const expiredResults=await runQueue({items:[expired],stateDir:dir,env:env(),send});
    assert.equal(expiredResults[0].state,'skipped_expired');
    await setOverride(dir,expired.entry.id,'facebook',{schedule:scheduleAt(new Date(Date.now()-60000))});
    const rescheduled=await runQueue({items:[expired],stateDir:dir,env:env(),send,lookup:async(_e,_n,id)=>({id,url:'https://facebook.com/p/2'}),fetcher:imageFetcher(expired.imageBytes)});
    assert.equal(rescheduled[0].state,'published');
    const skipped=fixture({id:'crew-social-agent-skipped1',networks:['facebook']});
    await setOverride(dir,skipped.entry.id,'facebook',{skip:true});
    assert.equal((await runQueue({items:[skipped],stateDir:dir,env:env(),send}))[0].state,'skipped');
    assert.equal(sends,2);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('bad queue image is recorded while a valid queue item remains usable',async()=>{
  const dir=await tmp(),repo=join(dir,'repo'),state=join(dir,'state');
  try{
    const queue=join(repo,'content','queue'),assets=join(queue,'assets');await mkdir(assets,{recursive:true});
    const source=join(process.cwd(),'content/queue/2026-10-30-android-studio-agents.json');
    const manifest=JSON.parse(await readFile(source,'utf8'));
    await writeFile(join(queue,'2026-10-30-android-studio-agents.json'),JSON.stringify(manifest));
    await writeFile(join(assets,'2026-10-30-android-studio-agent.webp.base64'),await readFile(join(process.cwd(),manifest.image.path)));
    const broken=structuredClone(manifest);broken.id='crew-social-agent-broken-image';broken.image.path='content/queue/assets/missing.webp.base64';
    await writeFile(join(queue,'2026-10-31-broken-image.json'),JSON.stringify(broken));
    const {items,errors}=await loadLocalQueue({repoRoot:repo,stateDir:state,env:process.env});
    assert.equal(items.length,1);assert.equal(errors.length,1);assert.equal(errors[0].postId,broken.id);
    const result=await runQueue({items,queueErrors:errors,stateDir:state,env:env('dry_run'),send:async()=>assert.fail('unexpected send')});
    assert.ok(result.some(x=>x.postId===broken.id&&x.state==='blocked'));
    assert.ok(result.some(x=>x.postId===manifest.id&&x.network==='facebook'&&x.dryRun));
    assert.ok((await readFile(join(state,'queue-errors.json'),'utf8')).includes(broken.id));
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('existing Pocket encrypted vault supplies selected Page and Threads credentials',async()=>{
  const dir=await tmp(),vaultDir=join(dir,'pocket-social');
  try{
    await mkdir(vaultDir,{mode:0o700});
    const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
    cipher.setAAD(Buffer.from('crew-pocket-social-v1'));
    const value={version:1,providers:{facebook:{selectedPageId:'123456789012345',pages:[{id:'123456789012345',accessToken:'page-secret-test'}]},threads:{accessToken:'threads-secret-test',expiresAt:Date.now()+86400000}}};
    const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
    await writeFile(join(vaultDir,'vault.key'),key,{mode:0o600});
    await writeFile(join(vaultDir,'accounts.enc'),JSON.stringify({version:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')}),{mode:0o600});
    const loaded=await loadAgentEnvironment({SOCIAL_AGENT_POCKET_VAULT_DIR:vaultDir},join(dir,'agent'));
    assert.equal(loaded.FACEBOOK_PAGE_ID,'123456789012345');assert.equal(loaded.FACEBOOK_PAGE_TOKEN,'page-secret-test');
    assert.equal(loaded.THREADS_ACCESS_TOKEN,'threads-secret-test');
    assert.match(loaded.SOCIAL_AGENT_CREDENTIAL_SOURCE,/facebook: pocket-vault/);
    assert.match(loaded.SOCIAL_AGENT_CREDENTIAL_SOURCE,/threads: pocket-vault/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('Threads token refresh persists rotated token only in encrypted local storage',async()=>{
  const dir=await tmp();
  try{
    const expiry=new Date(Date.now()+2*86400000).toISOString();
    await setThreadsExpiry(dir,expiry);
    let called=0;
    const fetcher=async url=>{
      called++;const u=new URL(url);assert.equal(u.hostname,'graph.threads.net');assert.equal(u.searchParams.get('grant_type'),'th_refresh_token');
      return new Response(JSON.stringify({access_token:'rotated-secret-test',expires_in:5184000}),{status:200,headers:{'content-type':'application/json'}});
    };
    const result=await refreshThreadsIfNeeded({THREADS_ACCESS_TOKEN:'old-secret-test'},dir,{fetcher});
    assert.equal(called,1);assert.equal(result.status.refreshed,true);assert.equal(result.status.expiresAt!==expiry,true);
    const loaded=await loadAgentEnvironment({},dir);
    assert.equal(loaded.THREADS_ACCESS_TOKEN,'rotated-secret-test');
    const stored=await readFile(join(dir,'credentials.enc'),'utf8');
    assert.ok(!stored.includes('rotated-secret-test'));
    assert.equal((await stat(join(dir,'credentials.enc'))).mode&0o777,0o600);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('manual retry requires explicit confirmation after reconciliation remains unresolved',async()=>{
  const dir=await tmp(),item=fixture({networks:['threads']});
  try{
    const first=await runQueue({items:[item],stateDir:dir,env:env(),send:async()=>{throw Error('Threads API request failed (HTTP 504)');},fetcher:imageFetcher(item.imageBytes)});
    assert.equal(first[0].state,'needs_reconciliation');
    await assert.rejects(()=>retryAfterReconciliation(dir,item.entry.id,'threads'),/requires confirmation/);
    const reset=await retryAfterReconciliation(dir,item.entry.id,'threads',{confirmedNotPublished:true});
    assert.equal(reset.state,'pending');assert.equal(reset.manualRetryCount,1);
    assert.equal((await allTasks(dir))[0].requestId,item.entry.posts.threads.requestId);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('queue validator rejects a public image whose bytes do not match manifest SHA',()=>{
  const item=fixture({networks:['threads']});
  const different=Buffer.from(item.imageBytes);different[20]=1;
  assert.throws(()=>validateQueueEntry(item.entry,different,env()),/SHA-256/);
  const noTimezone=structuredClone(item.entry);delete noTimezone.schedule.timezone;
  assert.throws(()=>validateQueueEntry(noTimezone,item.imageBytes,env()),/Schedule/);
});


test('intentional text-only Queue is accepted, cached, sent once to both platforms, and has no image fetch',async()=>{
  const root=await tmp(),dir=join(root,'state');
  const {entry}=fixture({id:'crew-social-agent-text-only1'});
  entry.image=null;
  try{
    await mkdir(join(root,'content','queue'),{recursive:true});
    await writeFile(join(root,'content','queue','2026-10-30-text-only.json'),JSON.stringify(entry));
    const {items,errors}=await loadLocalQueue({repoRoot:root,stateDir:dir,env:env()});
    assert.equal(errors.length,0);
    assert.equal(items.length,1);
    assert.equal(items[0].imageBytes,null);
    assert.equal(validateQueueEntry(entry,null,env()).imageInfo,null);
    let calls=0;
    const send=async(_env,network,payload)=>{calls++;assert.equal(payload.imageUrl,null);assert.equal(payload.text,entry.posts[network].text);return network==='facebook'?'111111':'222222';};
    const fetcher=async()=>{throw Error('Text-only queue must never fetch an image')};
    const first=await runQueue({items,stateDir:dir,env:env(),send,fetcher});
    assert.deepEqual(first.map(x=>x.state),['published','published']);
    assert.equal(calls,2);
    const second=await runQueue({items,stateDir:dir,env:env(),send,fetcher});
    assert.deepEqual(second.map(x=>x.state),['published','published']);
    assert.equal(calls,2);
    const unsafe=structuredClone(entry);delete unsafe.image;
    assert.throws(()=>validateQueueEntry(unsafe,null,env()),/Unsafe or unsupported image path/);
    const missingImage={...entry,image:{format:'webp',path:'content/queue/assets/not-found.webp.base64',width:1200,height:1200,sha256:sha(Buffer.from('missing'))}};
    assert.throws(()=>validateQueueEntry(missingImage,null,env()),/Queue image is missing/);
  }finally{await rm(root,{recursive:true,force:true});}
});
