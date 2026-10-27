import test from 'node:test';
import assert from 'node:assert/strict';
import {listPosts,listComments,sendReply,validId} from '../src/meta.js';
import {approvedReply,approvedPost,readAction,prepareDraft,validateReply} from '../src/service.js';
import worker from '../src/index.js';
import {TOOLS} from '../src/mcp.js';
import {readFileSync} from 'node:fs';
const env={SOCIAL_ADMIN_KEY:'very-long-high-entropy-test-secret-at-least-32-chars',
 SOCIAL_AGENT_KEY:'different-read-only-agent-secret-at-least-32-chars',
 THREADS_ACCESS_TOKEN:'fake-threads-token',FACEBOOK_PAGE_TOKEN:'fake-facebook-page-token',FACEBOOK_PAGE_ID:'123456789'};
const mock=(json,status=200)=>new Response(JSON.stringify(json),{status,headers:{'content-type':'application/json'}});
const graphMock=async(url,opts)=>{
  const u=new URL(url);
  assert.match(u.hostname,/^graph\.(facebook\.com|threads\.net)$/);
  assert.ok(opts.headers.Authorization.startsWith('Bearer fake-'));
  if(u.pathname.endsWith('/me/threads') && opts.method==='GET')return mock({data:[{id:'111111',text:'Demo post',timestamp:'2026-10-26'}]});
  if(u.pathname.endsWith('/111111/conversation'))return mock({data:[{id:'222222',text:'請問能用嗎？',username:'guest'}]});
  if(u.pathname.endsWith('/me/threads') && opts.method==='POST'){
    const params=new URLSearchParams(opts.body);assert.equal(params.get('reply_to_id'),'222222');return mock({id:'333333'});
  }
  if(u.pathname.endsWith('/me/threads_publish'))return mock({id:'444444'});
  if(u.pathname.endsWith('/123456789/posts'))return mock({data:[{id:'123456789_999999',message:'Hello'}]});
  if(u.pathname.endsWith('/123456789_999999/comments'))return mock({data:[{id:'555555',message:'Hi',from:{name:'Guest'}}]});
  if(u.pathname.endsWith('/555555/comments'))return mock({id:'666666'});
  throw Error('Unexpected mock route '+u.pathname);
};
function makeDB(){
  const map=new Map();return {map,prepare(sql){
    return {bind(...args){this.args=args;return this;},async run(){
      if(sql.includes('INSERT OR IGNORE')){const [n,id,post,content]=this.args,key=n+':'+id;
        if(map.has(key))return {meta:{changes:0}};
        map.set(key,{network:n,commentId:id,postId:post,content,state:'sending',remoteId:null});return {meta:{changes:1}};
      }
      if(sql.includes('UPDATE reply_audit')){
        const vals=this.args,key=vals.slice(-2).join(':');const row=map.get(key);
        if(row){row.state=sql.includes("state='published'")?'published':'needs_reconciliation';if(row.state==='published')row.remoteId=vals[0];}
        return {meta:{changes:1}};
      }
      throw Error('Unknown SQL');
    },async all(){return {results:[...map.values()]}}};
  }};
}
test('official API adapters limit requests to allowlisted hosts and normalize comments',async()=>{
  assert.equal(validId('12/evil'),false);
  const posts=await listPosts(env,'threads',graphMock);assert.equal(posts[0].id,'111111');
  const comments=await listComments(env,'threads',posts[0].id,graphMock);assert.equal(comments[0].id,'222222');
  const id=await sendReply(env,'threads','222222','謝謝留言',graphMock);assert.equal(id,'444444');
  assert.equal((await listPosts(env,'facebook',graphMock))[0].id,'123456789_999999');
  assert.equal((await listComments(env,'facebook','123456789_999999',graphMock))[0].author,'Guest');
  assert.equal(await sendReply(env,'facebook','555555','你好',graphMock),'666666');
});
test('only explicit approval can publish, duplicates blocked with D1 unique lock',async()=>{
  const db=makeDB(),e={...env,SOCIAL_DB:db};
  const target={network:'threads',postId:'111111',commentId:'222222',text:'你好'};
  assert.equal(validateReply(target),true);
  const refused=await approvedReply(e,target,graphMock);assert.equal(refused.status,403);assert.equal(db.map.size,0);
  const first=await approvedReply(e,{...target,confirmed:true},graphMock);
  assert.deepEqual(first,{published:true,remoteId:'444444'});
  const duplicate=await approvedReply(e,{...target,confirmed:true},graphMock);
  assert.deepEqual(duplicate,{error:'ALREADY_ATTEMPTED_CHECK_HISTORY',status:409});
  assert.equal(db.map.get('threads:222222').state,'published');
});
test('uncertain publishing result remains locked and cannot be retried',async()=>{
  const db=makeDB(),e={...env,SOCIAL_DB:db};
  let calls=0;
  const broken=async(url,options)=>{calls++;
    if(url.includes('/me/threads_publish'))throw Error('network lost');
    return graphMock(url,options);
  };
  const target={network:'threads',postId:'111111',commentId:'222222',text:'你好',confirmed:true};
  const first=await approvedReply(e,target,broken);
  assert.equal(first.error,'PUBLICATION_UNCERTAIN_CHECK_PLATFORM_BEFORE_RETRY');
  assert.equal(db.map.get('threads:222222').state,'needs_reconciliation');
  const count=calls;
  const twice=await approvedReply(e,target,broken);
  assert.equal(twice.status,409);assert.equal(calls,count+2); // Only rechecks post + comment, never POSTs again.
});
test('reply target must be owned and visible; invalid ids are rejected',async()=>{
  assert.equal((await readAction(env,'comments',{network:'threads',postId:'999999'},graphMock)).error,'POST_NOT_OWNED');
  assert.equal((await readAction(env,'comments',{network:'threads',postId:'../../foo'},graphMock)).error,'INVALID_POST_ID');
  assert.equal((await approvedReply({...env,SOCIAL_DB:makeDB()},{network:'threads',postId:'111111',commentId:'999999',text:'wrong',confirmed:true},graphMock)).error,'COMMENT_NOT_FOUND');
});
test('Worker API does not respond with private data without owner authentication',async()=>{
  const r=await worker.fetch(new Request('https://social.example/api/status'),env);
  assert.equal(r.status,401);
  const good=await worker.fetch(new Request('https://social.example/api/status',{headers:{authorization:'Bearer '+env.SOCIAL_ADMIN_KEY}}),env);
  assert.equal(good.status,200);const data=await good.json();assert.equal(data.networks.threads,true);
  assert.doesNotMatch(JSON.stringify(data),/fake-threads-token/);
  const noOrigin=await worker.fetch(new Request('https://social.example/api/reply',{method:'POST',headers:{authorization:'Bearer '+env.SOCIAL_ADMIN_KEY,'content-type':'application/json',origin:'https://attacker.example'},body:'{}'}),env);
  assert.equal(noOrigin.status,403);
});
test('MCP exposes read and draft only; no unapproved write tool',async()=>{
  assert.equal(TOOLS.some(t=>/publish|send|^social_reply$/.test(t.name)),false);
  const headers={authorization:'Bearer '+env.SOCIAL_AGENT_KEY,accept:'application/json, text/event-stream','content-type':'application/json'};
  const result=await worker.fetch(new Request('https://social.example/mcp',{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})}),env);
  assert.equal(result.status,200);
  const body=await result.json();assert.equal(body.result.tools.length,5);
  const blocked=await worker.fetch(new Request('https://social.example/api/status',{headers:{authorization:'Bearer '+env.SOCIAL_AGENT_KEY}}),env);
  assert.equal(blocked.status,401); // An AI Agent's MCP credential cannot invoke publishing routes.
});
test('Gemini draft is a suggestion and never publishes',async()=>{
  let n=0;
  const mockFetch=async(url,opts)=>{
    if(url.includes('generativelanguage.googleapis.com')){n++;assert.match(opts.body,/請問能用嗎/);return mock({candidates:[{content:{parts:[{text:'可以先探索網站，AI 對話需要 Gemini API Key。'}]}}]});}
    return graphMock(url,opts);
  };
  const result=await prepareDraft({...env,SOCIAL_GEMINI_KEY:'fake-gemini-key'},
    {network:'threads',postId:'111111',commentId:'222222'},mockFetch);
  assert.match(result.draft,/Gemini/);assert.equal(n,1);
});
test('HTML only includes local scripts and user data is rendered with textContent',()=>{
  const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(html,/script-src 'self'/);assert.match(html,/noindex,nofollow/);
  assert.match(js,/textContent/);assert.doesNotMatch(js,/localStorage|sessionStorage|innerHTML/);
});

test('new post publication requires approval and durable request id; supports public image URLs',async()=>{
  const attempts=new Map();
  const db={prepare(sql){return {
    bind(...args){this.args=args;return this;},
    async run(){
      if(sql.includes('INSERT OR IGNORE')){
        const [id,network,content,imageUrl]=this.args;
        if(attempts.has(id))return {meta:{changes:0}};
        attempts.set(id,{network,content,imageUrl,state:'sending'});return {meta:{changes:1}};
      }
      if(sql.includes('UPDATE post_audit')){const [remoteId,id]=this.args;attempts.get(id).remoteId=remoteId;attempts.get(id).state='published';return {meta:{changes:1}};}
      throw Error('unexpected SQL');
    }
  };}};
  const e={...env,SOCIAL_DB:db};
  const requestId='ea10b955-0242-4e5a-a4ea-1ae32ce6b541';
  const body={network:'facebook',text:'新貼文',requestId,imageUrl:'https://images.example.com/hello.jpg'};
  assert.equal((await approvedPost(e,body,async()=>{throw Error('should not call')})).status,403);
  assert.equal((await approvedPost(e,{...body,imageUrl:'http://evil.example/',confirmed:true})).error,'INVALID_IMAGE_URL');
  assert.equal(attempts.size,0);
  const fetcher=async (url,opts)=>{
    assert.match(url,/graph.facebook.com/);assert.match(url,/\/123456789\/photos$/);
    const form=new URLSearchParams(opts.body);
    assert.equal(form.get('url'),body.imageUrl);assert.equal(form.get('caption'),'新貼文');
    return mock({id:'121212',post_id:'123456789_131313'});
  };
  const result=await approvedPost(e,{...body,confirmed:true},fetcher);
  assert.deepEqual(result,{published:true,remoteId:'123456789_131313'});
  const again=await approvedPost(e,{...body,confirmed:true},()=>{throw Error('Duplicate network call')});
  assert.equal(again.status,409);
});