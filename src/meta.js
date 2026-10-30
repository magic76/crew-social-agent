/** Official Graph API adapters. All URLs are constructed from validated IDs and allowlisted hosts. */
export class UpstreamError extends Error {
  constructor(status, description = 'External service failed') {
    super(description); this.name='UpstreamError'; this.status=status;
  }
}
const idOK = x => typeof x === 'string' && /^(?:\d{3,40})(?:_\d{3,40})?$/.test(x);
export function validId(value) { return idOK(value); }
const REQUEST_TIMEOUT = 12000;

async function graph(url, token, method='GET', body=null, fetcher=fetch) {
  const headers = {Authorization: `Bearer ${token}`, Accept:'application/json'};
  if (body) headers['Content-Type']='application/x-www-form-urlencoded';
  let response;
  try {
    response = await fetcher(url, {method,headers,body:body?new URLSearchParams(body):undefined,
      signal:AbortSignal.timeout(REQUEST_TIMEOUT), redirect:'error'});
  } catch { throw new UpstreamError(502, 'Meta connection failed or timed out'); }
  let parsed;
  try { parsed=await response.json(); }
  catch { throw new UpstreamError(502, 'Invalid Meta response'); }
  if (!response.ok || parsed?.error) {
    // Never include raw remote messages: they can contain identifiers or private data.
    const code=Number.isInteger(parsed?.error?.code)?`, code ${parsed.error.code}`:'';
    const error=new UpstreamError(response.status, `Meta API rejected request (HTTP ${response.status}${code})`);
    error.metaCode=Number.isInteger(parsed?.error?.code)?parsed.error.code:null;
    error.httpStatus=response.status;
    throw error;
  }
  return parsed;
}
const threadUrl = (path, params={}) => {
  const url = new URL(`https://graph.threads.net/v1.0/${path}`);
  Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,String(v)));
  return url.toString();
};
const facebookUrl = (path, params={}) => {
  const version=process.env.META_GRAPH_API_VERSION||'v26.0';
  if(!/^v\d+\.\d+$/.test(version))throw new UpstreamError(500,'Invalid META_GRAPH_API_VERSION');
  const url = new URL(`https://graph.facebook.com/${version}/${path}`);
  Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,String(v)));
  return url.toString();
};
const collect = response => Array.isArray(response?.data) ? response.data : [];

export function available(env) {
  return {
    threads: Boolean(env.THREADS_ACCESS_TOKEN),
    facebook: Boolean(env.FACEBOOK_PAGE_TOKEN && idOK(env.FACEBOOK_PAGE_ID))
  };
}
export async function refreshThreadsToken(accessToken,fetcher=fetch){
  if(typeof accessToken!=='string'||!accessToken)throw new UpstreamError(400,'Threads token is not configured');
  const url=new URL('https://graph.threads.net/refresh_access_token');
  url.searchParams.set('grant_type','th_refresh_token');
  url.searchParams.set('access_token',accessToken);
  let response;
  try{response=await fetcher(url.toString(),{method:'GET',headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(15000)});}
  catch{throw new UpstreamError(502,'Threads token refresh failed or timed out');}
  const json=await response.json().catch(()=>null);
  if(!response.ok||!json?.access_token||!Number.isFinite(Number(json.expires_in))||Number(json.expires_in)<=0)
    throw new UpstreamError(response.status||502,`Threads token refresh failed (HTTP ${response.status||502})`);
  return {accessToken:json.access_token,expiresIn:Number(json.expires_in)};
}
export async function listPosts(env, network, fetcher=fetch) {
  if (network === 'threads') {
    const res=await graph(threadUrl('me/threads',{fields:'id,text,permalink,timestamp',limit:30}),env.THREADS_ACCESS_TOKEN,'GET',null,fetcher);
    return collect(res).filter(x=>idOK(x.id)).map(x=>({id:x.id,text:x.text||'',url:x.permalink||'',timestamp:x.timestamp||'',network}));
  }
  if (network === 'facebook') {
    const res=await graph(facebookUrl(`${env.FACEBOOK_PAGE_ID}/posts`,{fields:'id,message,permalink_url,created_time',limit:30}),env.FACEBOOK_PAGE_TOKEN,'GET',null,fetcher);
    return collect(res).filter(x=>idOK(x.id)).map(x=>({id:x.id,text:x.message||'',url:x.permalink_url||'',timestamp:x.created_time||'',network}));
  }
  throw new UpstreamError(400,'Unsupported network');
}
export async function getPublishedPost(env,network,postId,fetcher=fetch){
  const posts=await listPosts(env,network,fetcher);
  return posts.find(post=>post.id===postId)||null;
}
export async function listComments(env,network,postId,fetcher=fetch) {
  if (!idOK(postId)) throw new UpstreamError(400,'Invalid post ID');
  if(network==='threads'){
    const res=await graph(threadUrl(`${postId}/conversation`,{fields:'id,text,username,timestamp,replied_to,is_reply',reverse:true,limit:100}),env.THREADS_ACCESS_TOKEN,'GET',null,fetcher);
    return collect(res).filter(x=>idOK(x.id)).map(x=>({id:x.id,postId,author:x.username||'Threads user',text:x.text||'',timestamp:x.timestamp||'',parentId:x.replied_to?.id||postId}));
  }
  if(network==='facebook'){
    const res=await graph(facebookUrl(`${postId}/comments`,{fields:'id,message,from,created_time,permalink_url,comments.limit(25){id,message,from,created_time}',filter:'stream',limit:100}),env.FACEBOOK_PAGE_TOKEN,'GET',null,fetcher);
    const normalize=(x,parentId)=>({id:x.id,postId,author:x.from?.name||'Facebook user',text:x.message||'',timestamp:x.created_time||'',parentId});
    return collect(res).flatMap(x=>idOK(x.id)?[normalize(x,postId),...collect(x.comments).filter(y=>idOK(y.id)).map(y=>normalize(y,x.id))]:[]);
  }
  throw new UpstreamError(400,'Unsupported network');
}
export async function sendReply(env,network,commentId,text,fetcher=fetch) {
  if(!idOK(commentId))throw new UpstreamError(400,'Invalid comment ID');
  if(network==='threads'){
    // Two-step publication. If creation succeeded but publication is ambiguous,
    // the local journal must retain a lock in needs_reconciliation state.
    const container=await graph(threadUrl('me/threads'),env.THREADS_ACCESS_TOKEN,'POST',
      {media_type:'TEXT',reply_to_id:commentId,text},fetcher);
    if(!idOK(container.id))throw new UpstreamError(502,'Threads returned no creation ID');
    const published=await graph(threadUrl('me/threads_publish'),env.THREADS_ACCESS_TOKEN,'POST',
      {creation_id:container.id},fetcher);
    if(!idOK(published.id))throw new UpstreamError(502,'Threads returned no published ID');
    return published.id;
  }
  if(network==='facebook'){
    const published=await graph(facebookUrl(`${commentId}/comments`),env.FACEBOOK_PAGE_TOKEN,'POST',{message:text},fetcher);
    if(!idOK(published.id))throw new UpstreamError(502,'Facebook returned no reply ID');
    return published.id;
  }
  throw new UpstreamError(400,'Unsupported network');
}

/** Publishing a new owner-authored post; imageUrl must point to a public HTTPS image. */
export async function sendPost(env,network,{text,imageUrl},fetcher=fetch){
  if(network==='threads'){
    const body={media_type:imageUrl?'IMAGE':'TEXT',text};
    if(imageUrl)body.image_url=imageUrl;
    const container=await graph(threadUrl('me/threads'),env.THREADS_ACCESS_TOKEN,'POST',body,fetcher);
    if(!idOK(container.id))throw new UpstreamError(502,'Threads returned no container ID');
    const published=await graph(threadUrl('me/threads_publish'),env.THREADS_ACCESS_TOKEN,'POST',
      {creation_id:container.id},fetcher);
    if(!idOK(published.id))throw new UpstreamError(502,'Threads returned no post ID');
    return published.id;
  }
  if(network==='facebook'){
    const path=imageUrl?`${env.FACEBOOK_PAGE_ID}/photos`:`${env.FACEBOOK_PAGE_ID}/feed`;
    const body=imageUrl?{url:imageUrl,caption:text}:{message:text};
    const published=await graph(facebookUrl(path),env.FACEBOOK_PAGE_TOKEN,'POST',body,fetcher);
    // Photo posts return id and (sometimes) post_id; both are useful for audit.
    const id=published.post_id||published.id;
    if(!idOK(id))throw new UpstreamError(502,'Facebook returned no post ID');
    return id;
  }
  throw new UpstreamError(400,'Unsupported network');
}

const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
const apiVersion = () => process.env.META_GRAPH_API_VERSION||'v26.0';
const completion = value => ['complete','completed','published','finished'].includes(String(value||'').toLowerCase());

async function threadsVideoStatus(env,containerId,fetcher){
  return graph(threadUrl(`${containerId}/`,{fields:'id,status,error_message'}),env.THREADS_ACCESS_TOKEN,'GET',null,fetcher);
}

async function facebookVideoStatus(env,videoId,fetcher){
  return graph(facebookUrl(`${videoId}`,{fields:'status,permalink_url'}),env.FACEBOOK_PAGE_TOKEN,'GET',null,fetcher);
}

/** Publish a public MP4 as a Threads VIDEO and Facebook Page Reel. */
export async function sendVideoPost(env,network,{text,videoUrl,title='',altText='',onProgress=async()=>{},pollAttempts=10,pollIntervalMs=30000},fetcher=fetch){
  if(typeof text!=='string'||!text.trim())throw new UpstreamError(400,'Video post text is required');
  if(typeof videoUrl!=='string'||!videoUrl.startsWith('https://'))throw new UpstreamError(400,'A public HTTPS video URL is required');
  if(network==='threads'){
    const container=await graph(threadUrl('me/threads'),env.THREADS_ACCESS_TOKEN,'POST',{
      media_type:'VIDEO',video_url:videoUrl,text:text.trim(),...(altText?{alt_text:altText}:{})
    },fetcher);
    if(!idOK(container.id))throw new UpstreamError(502,'Threads returned no video container ID');
    await onProgress({providerMediaId:container.id,stage:'container_created'});
    let ready=false;
    for(let attempt=0;attempt<pollAttempts;attempt++){
      if(attempt&&pollIntervalMs)await pause(pollIntervalMs);
      const status=await threadsVideoStatus(env,container.id,fetcher);
      const value=String(status.status||'').toUpperCase();
      if(value==='FINISHED'){ready=true;break;}
      if(value==='ERROR'||value==='EXPIRED')throw new UpstreamError(502,'Threads video container failed processing');
    }
    if(!ready)throw new UpstreamError(504,'Threads video processing was not confirmed; reconcile before retrying');
    await onProgress({providerMediaId:container.id,stage:'container_ready'});
    const published=await graph(threadUrl('me/threads_publish'),env.THREADS_ACCESS_TOKEN,'POST',
      {creation_id:container.id},fetcher);
    if(!idOK(published.id))throw new UpstreamError(502,'Threads returned no published video ID');
    return {id:published.id,mediaId:container.id,url:''};
  }
  if(network==='facebook'){
    if(!idOK(env.FACEBOOK_PAGE_ID))throw new UpstreamError(400,'Facebook Page ID is not configured');
    const started=await graph(facebookUrl(`${env.FACEBOOK_PAGE_ID}/video_reels`),env.FACEBOOK_PAGE_TOKEN,
      'POST',{upload_phase:'start'},fetcher);
    if(!idOK(started.video_id))throw new UpstreamError(502,'Facebook returned no Reel upload ID');
    await onProgress({providerMediaId:started.video_id,stage:'upload_session_created'});
    const version=apiVersion();
    let uploadUrl;
    try{uploadUrl=new URL(started.upload_url||`https://rupload.facebook.com/video-upload/${version}/${started.video_id}`);}
    catch{throw new UpstreamError(502,'Facebook returned an invalid Reel upload URL');}
    if(uploadUrl.protocol!=='https:'||uploadUrl.hostname!=='rupload.facebook.com'||
      !uploadUrl.pathname.includes('/video-upload/')||!uploadUrl.pathname.endsWith('/'+started.video_id))
      throw new UpstreamError(502,'Facebook returned an untrusted Reel upload URL');
    let uploaded;
    try{
      const response=await fetcher(uploadUrl.toString(),{method:'POST',redirect:'error',
        headers:{Authorization:`OAuth ${env.FACEBOOK_PAGE_TOKEN}`,file_url:videoUrl,Accept:'application/json'},
        signal:AbortSignal.timeout(120000)});
      uploaded=await response.json().catch(()=>null);
      if(!response.ok||uploaded?.success!==true)throw new UpstreamError(response.status||502,'Facebook Reel upload failed');
    }catch(error){
      if(error instanceof UpstreamError)throw error;
      throw new UpstreamError(502,'Facebook Reel upload failed or timed out');
    }
    await onProgress({providerMediaId:started.video_id,stage:'uploaded'});
    const finished=await graph(facebookUrl(`${env.FACEBOOK_PAGE_ID}/video_reels`),env.FACEBOOK_PAGE_TOKEN,
      'POST',{video_id:started.video_id,upload_phase:'finish',video_state:'PUBLISHED',description:text.trim(),...(title?{title}:{})},fetcher);
    if(finished.success!==true)throw new UpstreamError(502,'Facebook did not confirm Reel publication');
    await onProgress({providerMediaId:started.video_id,stage:'publish_requested'});
    let publishedStatus=null;
    for(let attempt=0;attempt<pollAttempts;attempt++){
      if(attempt&&pollIntervalMs)await pause(pollIntervalMs);
      publishedStatus=await facebookVideoStatus(env,started.video_id,fetcher);
      const status=publishedStatus.status||{};
      if(completion(status.publishing_phase?.status)||completion(status.video_status)){break;}
      if(['error','failed'].includes(String(status.video_status||'').toLowerCase()))
        throw new UpstreamError(502,'Facebook Reel processing failed');
      publishedStatus=null;
    }
    if(!publishedStatus)throw new UpstreamError(504,'Facebook Reel publication was not confirmed; reconcile before retrying');
    return {id:started.video_id,mediaId:started.video_id,url:publishedStatus.permalink_url||''};
  }
  throw new UpstreamError(400,'Unsupported network');
}

/** Inspect a previously started video operation; this never publishes or retries it. */
export async function inspectVideoPostStatus(env,network,mediaId,fetcher=fetch){
  if(!idOK(mediaId))throw new UpstreamError(400,'Invalid video media ID');
  if(network==='threads')return threadsVideoStatus(env,mediaId,fetcher);
  if(network==='facebook')return facebookVideoStatus(env,mediaId,fetcher);
  throw new UpstreamError(400,'Unsupported network');
}
