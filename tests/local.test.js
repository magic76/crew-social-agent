import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateImageUrl,validatePublish,validateReply,publish,reply,history,sendImagePost} from '../src/local.js';
const env={THREADS_ACCESS_TOKEN:'threads-test',FACEBOOK_PAGE_TOKEN:'facebook-test',FACEBOOK_PAGE_ID:'123456'};
const id='f5e863ce-31b4-4d7c-ac21-b192d3f3a707';
const draft={network:'both',requestId:id,threadsText:'Threads 內容',facebookText:'Facebook 內容',imageUrl:'https://images.example.com/post.jpg'};
const tmp=()=>mkdtemp(join(tmpdir(),'crew-social-test-'));
const response=x=>new Response(JSON.stringify(x),{status:200,headers:{'content-type':'application/json'}});

test('rejects unsafe URLs, invalid payloads and oversized text',()=>{
  assert.equal(validatePublish(draft).networks.length,2);
  for(const u of ['http://example.com/a.png','https://localhost/a.jpg','https://192.168.1.7/a.png','https://127.0.0.1/a.png','https://example.com:8443/a.png','https://example.com/a.png#fragment'])
    assert.throws(()=>validateImageUrl(u));
  assert.throws(()=>validatePublish({...draft,requestId:undefined}));
  assert.throws(()=>validatePublish({...draft,threadsText:'x'.repeat(501)}));
  assert.throws(()=>validateReply({network:'threads',postId:'bad',commentId:'333',text:'hi'}));
});
test('journal blocks duplicate publishing independently per platform',async()=>{
  const dir=await tmp();let calls=0;
  try{
    const send=async(_env,network)=>{calls++;return network==='threads'?'222222':'111111';};
    const first=await publish(env,draft,{dir,send});
    assert.deepEqual(first.map(x=>x.state),['published','published']);
    assert.equal(calls,2);
    const second=await publish(env,draft,{dir,send});
    assert.deepEqual(second.map(x=>x.state),['already_attempted','already_attempted']);
    assert.equal(calls,2);
    assert.equal((await history(dir)).length,2);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('uncertain network failures never automatically retry and are journaled',async()=>{
  const dir=await tmp();let calls=0;
  try{
    const send=async()=>{calls++;throw Error('timeout');};
    const first=await publish(env,{...draft,network:'threads'}, {dir,send});
    assert.equal(first[0].state,'needs_reconciliation');
    const second=await publish(env,{...draft,network:'threads'},{dir,send});
    assert.equal(second[0].state,'already_attempted');
    assert.equal(calls,1);
    assert.equal((await history(dir))[0].state,'needs_reconciliation');
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('reply checks ownership, then blocks duplicate comment responses',async()=>{
  const dir=await tmp();let calls=0;
  const fetcher=async(url)=>{
    const path=new URL(url).pathname;
    if(path.endsWith('/me/threads'))return response({data:[{id:'111111',text:'post'}]});
    if(path.endsWith('/111111/conversation'))return response({data:[{id:'222222',text:'comment'}]});
    throw Error('Unexpected route '+path);
  };
  const send=async()=>{calls++;return '333333';};
  try{
    const p={network:'threads',postId:'111111',commentId:'222222',text:'你好'};
    assert.equal((await reply(env,p,{dir,fetcher,send})).state,'published');
    assert.equal((await reply(env,p,{dir,fetcher,send})).state,'already_attempted');
    assert.equal(calls,1);
    await assert.rejects(()=>reply(env,{...p,postId:'999999'},{dir,fetcher,send}),/POST_NOT_OWNED/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('Threads images await media status before publishing',async()=>{
  const seen=[];
  const fetcher=async(url,opts)=>{
    const path=new URL(url).pathname;seen.push(path);
    if(path.endsWith('/me/threads'))return response({id:'111111'});
    if(path.endsWith('/111111'))return response({status:'FINISHED'});
    if(path.endsWith('/me/threads_publish'))return response({id:'222222'});
    throw Error('Unexpected route '+path);
  };
  assert.equal(await sendImagePost(env,'threads',{text:'hello',imageUrl:draft.imageUrl},fetcher),'222222');
  assert.deepEqual(seen,['/v1.0/me/threads','/v1.0/111111','/v1.0/me/threads_publish']);
});
