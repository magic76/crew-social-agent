import {readAction,prepareDraft,approvedReply,approvedPost} from './service.js';
import {handleMcp} from './mcp.js';
const SAFE = {'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:SAFE});
const respond=out=>reply(out,out?.status||200);
const secretReady=(env,name)=>typeof env[name]==='string'&&env[name].length>=32;
async function authenticated(request,env,secretName){
  if(!secretReady(env,secretName))return false;
  const raw=request.headers.get('authorization')||'';
  if(!raw.startsWith('Bearer ')||raw.length>300)return false;
  const hash=async x=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x)));
  const [a,b]=await Promise.all([hash(raw.slice(7)),hash(env[secretName])]);
  let different=0;for(let i=0;i<32;i++)different|=a[i]^b[i];
  return different===0;
}
async function parseBody(request){
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return null;
  if(Number(request.headers.get('content-length')||'0')>8192)return null;
  const data=await request.text();if(data.length>8192)return null;
  try {const obj=JSON.parse(data);return obj&&typeof obj==='object'&&!Array.isArray(obj)?obj:null;}catch{return null;}
}
function safeOrigin(request){
  const origin=request.headers.get('origin');
  return (!origin || origin===new URL(request.url).origin) && request.headers.get('sec-fetch-site')!=='cross-site';
}
async function handleApi(request,env){
  const path=new URL(request.url).pathname;
  if(path==='/api/status' && !secretReady(env,'SOCIAL_ADMIN_KEY'))return reply({error:'SOCIAL_ADMIN_KEY_REQUIRED'},503);
  if(!(await authenticated(request,env,'SOCIAL_ADMIN_KEY')))return reply({error:'UNAUTHORIZED'},401);
  if(request.method==='GET'){
    const actions={'/api/status':'status','/api/posts':'posts','/api/comments':'comments','/api/history':'history'};
    if(!actions[path])return reply({error:'NOT_FOUND'},404);
    return respond(await readAction(env,actions[path],Object.fromEntries(new URL(request.url).searchParams)));
  }
  if(request.method==='POST'){
    if(!safeOrigin(request))return reply({error:'ORIGIN_REJECTED'},403);
    const body=await parseBody(request);if(!body)return reply({error:'INVALID_JSON'},400);
    if(path==='/api/draft')return respond(await prepareDraft(env,body));
    if(path==='/api/reply')return respond(await approvedReply(env,body));
    if(path==='/api/publish')return respond(await approvedPost(env,body));
  }
  return reply({error:'NOT_FOUND'},404);
}
export default {
  async fetch(request,env){
    const path=new URL(request.url).pathname;
    if(!path.startsWith('/api/') && path!=='/mcp'){
      return env.ASSETS?.fetch(request)||new Response('Not Found',{status:404});
    }
    try{
      if(path==='/mcp'){
        if(!secretReady(env,'SOCIAL_AGENT_KEY'))return reply({error:'SOCIAL_AGENT_KEY_REQUIRED'},503);
        if(!(await authenticated(request,env,'SOCIAL_AGENT_KEY')))return reply({error:'UNAUTHORIZED'},401);
        if(!safeOrigin(request))return reply({error:'ORIGIN_REJECTED'},403);
        return await handleMcp(request,env,parseBody);
      }
      return await handleApi(request,env);
    }catch(e){
      // Never include upstream secrets, token values or third-party response bodies.
      return reply({error:e?.name==='UpstreamError'?'META_API_FAILED': e?.status===503?'NOT_CONFIGURED':'SERVICE_ERROR'},e?.status===503?503:502);
    }
  }
};