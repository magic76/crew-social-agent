import {createHash,randomUUID} from 'node:crypto';
import {mkdir,open,readFile,readdir,rename,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {available,listPosts,listComments,sendPost,sendReply,validId} from './meta.js';

export const DEFAULT_JOURNAL = '.crew-social/attempts';
const NETWORKS = ['facebook','threads'];
const allowed = n => NETWORKS.includes(n);
const fail = message => { throw Error(message); };

export function validateImageUrl(value) {
  if(typeof value!=='string' || value.length>2048) return fail('imageUrl must be a public HTTPS image URL');
  let u;
  try { u=new URL(value); } catch { return fail('Invalid imageUrl'); }
  const host=u.hostname.toLowerCase();
  if(u.protocol!=='https:' || u.username || u.password || u.port || u.hash ||
     !host.includes('.') || host==='localhost' || host.endsWith('.local') ||
     host.endsWith('.localhost') || /^[0-9.]+$/.test(host) || host.includes(':')) {
    return fail('imageUrl must be a public HTTPS hostname (no private IP/localhost)');
  }
  return u.toString();
}

export function validatePublish(payload) {
  if(!payload || typeof payload!=='object' || Array.isArray(payload)) return fail('Expected a JSON object');
  const network=payload.network??'both';
  if(network!=='both' && !allowed(network)) return fail('network must be both, facebook or threads');
  const networks=network==='both' ? NETWORKS : [network];
  const requestId=payload.requestId;
  if(typeof requestId!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId))
    return fail('requestId must be a stable UUID; reuse it on retries');
  const text={};
  for(const n of networks){
    const s=payload[n==='threads'?'threadsText':'facebookText'];
    if(typeof s!=='string' || !s.trim() || s.trim().length>(n==='threads'?500:5000))
      return fail(n+' text must contain 1–'+(n==='threads'?500:5000)+' characters');
    text[n]=s.trim();
  }
  return {networks,requestId,text,imageUrl:validateImageUrl(payload.imageUrl)};
}

export function validateReply(payload) {
  if(!payload || !allowed(payload.network) || !validId(payload.postId) || !validId(payload.commentId))
    return fail('Invalid reply network or post/comment ID');
  const text=payload.text;
  const max=payload.network==='threads'?500:1000;
  if(typeof text!=='string' || !text.trim() || text.trim().length>max)
    return fail('Reply text must contain 1–'+max+' characters');
  return {network:payload.network,postId:payload.postId,commentId:payload.commentId,text:text.trim()};
}

export async function reserve(dir,kind,network,key,details) {
  const root=resolve(dir);
  await mkdir(root,{recursive:true,mode:0o700});
  const name=createHash('sha256').update(JSON.stringify([kind,network,key])).digest('hex')+'.json';
  const path=join(root,name);
  const record={kind,network,key,details,state:'sending',createdAt:new Date().toISOString()};
  const handle=await open(path,'wx',0o600);
  try { await handle.writeFile(JSON.stringify(record)+'\n'); await handle.sync(); }
  finally { await handle.close(); }
  return {path,record};
}
export async function finish(entry,state,remoteId=null) {
  const next={...entry.record,state,remoteId,updatedAt:new Date().toISOString()};
  const temp=entry.path+'.'+randomUUID()+'.tmp';
  await writeFile(temp,JSON.stringify(next)+'\n',{flag:'wx',mode:0o600});
  await rename(temp,entry.path);
  return next;
}
export async function history(dir=DEFAULT_JOURNAL) {
  let paths;
  try {paths=await readdir(resolve(dir));}catch(e){if(e.code==='ENOENT')return [];throw e;}
  const entries=await Promise.all(paths.filter(p=>p.endsWith('.json')).map(async p=>
    JSON.parse(await readFile(join(resolve(dir),p),'utf8'))));
  return entries.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}

async function threadsApi(token,path,{method='GET',form,fetcher=fetch}={}) {
  const res=await fetcher('https://graph.threads.net/v1.0/'+path,{
    method,headers:{Authorization:'Bearer '+token,Accept:'application/json',
      ...(form?{'Content-Type':'application/x-www-form-urlencoded'}:{})},
    body:form?new URLSearchParams(form):undefined,redirect:'error',signal:AbortSignal.timeout(20000)
  });
  const json=await res.json().catch(()=>null);
  if(!res.ok || !json || json.error) throw Error('Threads API request failed (HTTP '+res.status+')');
  return json;
}
export async function sendImagePost(env,network,{text,imageUrl},fetcher=fetch) {
  if(network==='facebook') return sendPost(env,'facebook',{text,imageUrl},fetcher);
  if(network!=='threads') return fail('Invalid network');
  const token=env.THREADS_ACCESS_TOKEN;
  const container=await threadsApi(token,'me/threads',{method:'POST',
    form:{media_type:'IMAGE',image_url:imageUrl,text},fetcher});
  if(!validId(container.id)) return fail('Threads media creation returned no ID');
  let ready=false;
  for(let i=0;i<15;i++){
    if(i)await new Promise(r=>setTimeout(r,2000));
    const s=await threadsApi(token,container.id+'?fields=id,status,error_message',{fetcher});
    if(s.status==='FINISHED'){ready=true;break;}
    if(s.status==='ERROR'||s.status==='EXPIRED')return fail('Threads media container failed');
  }
  if(!ready) return fail('Threads media not ready; verify before any retry');
  const post=await threadsApi(token,'me/threads_publish',{method:'POST',
    form:{creation_id:container.id},fetcher});
  if(!validId(post.id))return fail('Threads publish returned no post ID');
  return post.id;
}

export async function publish(env,payload,{dir=DEFAULT_JOURNAL,send=sendImagePost,fetcher=fetch}={}) {
  const p=validatePublish(payload), configured=available(env);
  for(const n of p.networks) if(!configured[n])return fail(n+' credentials are not configured');
  const results=[];
  for(const n of p.networks){
    let entry;
    try {entry=await reserve(dir,'post',n,p.requestId,{text:p.text[n],imageUrl:p.imageUrl});}
    catch(e) {
      if(e.code==='EEXIST'){results.push({network:n,state:'already_attempted',message:'Check history and platform; never auto-retry'});continue;}
      throw e;
    }
    try{
      const remoteId=await send(env,n,{text:p.text[n],imageUrl:p.imageUrl},fetcher);
      await finish(entry,'published',remoteId);
      results.push({network:n,state:'published',remoteId});
    }catch(e){
      await finish(entry,'needs_reconciliation').catch(()=>{});
      results.push({network:n,state:'needs_reconciliation',message:'Outcome unknown. Check platform before manual recovery'});
    }
  }
  return results;
}

export async function reply(env,payload,{dir=DEFAULT_JOURNAL,fetcher=fetch,send=sendReply}={}) {
  const p=validateReply(payload);
  if(!available(env)[p.network])return fail(p.network+' credentials are not configured');
  const posts=await listPosts(env,p.network,fetcher);
  if(!posts.some(x=>x.id===p.postId))return fail('POST_NOT_OWNED');
  const comments=await listComments(env,p.network,p.postId,fetcher);
  if(!comments.some(x=>x.id===p.commentId))return fail('COMMENT_NOT_FOUND');
  let entry;
  try{entry=await reserve(dir,'reply',p.network,p.commentId,{postId:p.postId,text:p.text});}
  catch(e){
    if(e.code==='EEXIST')return {network:p.network,state:'already_attempted',message:'Check history and platform'};
    throw e;
  }
  try{
    const remoteId=await send(env,p.network,p.commentId,p.text,fetcher);
    await finish(entry,'published',remoteId);
    return {network:p.network,state:'published',remoteId};
  }catch{
    await finish(entry,'needs_reconciliation').catch(()=>{});
    return {network:p.network,state:'needs_reconciliation',message:'Outcome unknown. Check platform before manual recovery'};
  }
}
