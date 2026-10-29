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
    throw new UpstreamError(502, `Meta API rejected request (${response.status})`);
  }
  return parsed;
}
const threadUrl = (path, params={}) => {
  const url = new URL(`https://graph.threads.net/v1.0/${path}`);
  Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,String(v)));
  return url.toString();
};
const facebookUrl = (path, params={}) => {
  const url = new URL(`https://graph.facebook.com/v24.0/${path}`);
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