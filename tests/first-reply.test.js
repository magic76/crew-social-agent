import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {allTasks,runQueue,validateQueueEntry} from '../local-publisher/core.js';

const sourceUrl='https://example.com/agent-study';
const postId='crew-lab-20261031-agent-study';
const item={
  entry:{
    schema_version:1,id:postId,created_date:'2026-10-31',title:'Agent study',category:'ai-research',
    status:'ready_for_local_agent',mode:'live',schedule:{date:'2026-10-31',time:'12:00',timezone:'Asia/Taipei'},
    networks:['threads'],source:{publisher:'Example Lab',published_date:'2026-10-30',url:sourceUrl},image:null,
    posts:{threads:{text:'A sourced post.',requestId:'9a000000-0000-4000-8000-000000000001'}},
    first_replies:{threads:{text:`參考來源：Example Lab\n${sourceUrl}`,requestId:'9a000000-0000-4000-8000-000000000002'}},
    safety:{publish_permitted:true}
  },imageBytes:null
};
const now=new Date('2026-10-31T04:00:00.000Z');
const env={SOCIAL_AGENT_MODE:'live',THREADS_ACCESS_TOKEN:'test-token'};

test('source-backed entries require a first reply containing every source URL',()=>{
  assert.doesNotThrow(()=>validateQueueEntry(item.entry,null,env));
  const missing={...item.entry,first_replies:undefined};
  assert.throws(()=>validateQueueEntry(missing,null,env),/first reply is required/);
  const wrong={...item.entry,first_replies:{threads:{text:'參考來源：https://example.com/other',requestId:'9a000000-0000-4000-8000-000000000002'}}};
  assert.throws(()=>validateQueueEntry(wrong,null,env),/must include every reference URL/);
  const legacy={...item.entry,created_date:'2026-10-30',first_replies:undefined};
  assert.doesNotThrow(()=>validateQueueEntry(legacy,null,env));
});

test('publisher posts a sourced first reply after the main post',async t=>{
  const stateDir=await mkdtemp(join(tmpdir(),'crew-social-first-reply-'));
  t.after(()=>rm(stateDir,{recursive:true,force:true}));
  const sent=[];
  const result=await runQueue({
    items:[item],stateDir,env,now,
    send:async()=>({id:'123456789'}),
    lookup:async()=>({url:'https://threads.net/@crew/post/123456789'}),
    lookupFirstReplies:async()=>[],
    sendFirstReply:async(_env,network,parentId,text)=>{sent.push({network,parentId,text});return '123456790';}
  });
  assert.equal(result[0].state,'published');
  assert.equal(result[0].firstReplyState,'published');
  assert.deepEqual(sent,[{network:'threads',parentId:'123456789',text:item.entry.first_replies.threads.text}]);
  const [task]=await allTasks(stateDir);
  assert.equal(task.state,'published');
  assert.equal(task.firstReply.state,'published');
  assert.equal(task.firstReply.remoteId,'123456790');
});

test('ambiguous first reply is reconciled by reading comments and never resent',async t=>{
  const stateDir=await mkdtemp(join(tmpdir(),'crew-social-first-reply-'));
  t.after(()=>rm(stateDir,{recursive:true,force:true}));
  let sendCount=0,lookups=0;
  const common={items:[item],stateDir,env,now,send:async()=>({id:'123456789'}),lookup:async()=>({url:''})};
  const first=await runQueue({...common,lookupFirstReplies:async()=>[],sendFirstReply:async()=>{sendCount++;throw new Error('network timeout');}});
  assert.equal(first[0].firstReplyState,'needs_reconciliation');
  const second=await runQueue({...common,
    lookupFirstReplies:async(_env,_network,parentId)=>{lookups++;assert.equal(parentId,'123456789');return [{id:'123456790',postId:parentId,parentId,text:item.entry.first_replies.threads.text}];},
    sendFirstReply:async()=>{sendCount++;return 'unexpected';}
  });
  assert.equal(second[0].firstReplyState,'published');
  assert.equal(second[0].firstReplyRemoteId,'123456790');
  assert.equal(sendCount,1);
  assert.equal(lookups,1);
});
