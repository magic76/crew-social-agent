import {available,listPosts,listComments,sendReply,sendPost,validId} from './meta.js';
import {draftReply} from './draft.js';
export const NETWORKS=new Set(['threads','facebook']);
const failure=(error,status=400)=>({error,status});
export function validateTarget(body){
  return !!body && NETWORKS.has(body.network)&&validId(body.postId)&&validId(body.commentId);
}
export function validateReply(body){
  const max=body.network==='threads'?500:1000;
  return validateTarget(body)&&typeof body.text==='string'&&body.text.trim().length>=1&&body.text.trim().length<=max;
}
export async function withTarget(env,body,fetcher){
  if(!validateTarget(body))return failure('INVALID_TARGET');
  if(!available(env)[body.network])return failure('NETWORK_NOT_CONFIGURED',503);
  const posts=await listPosts(env,body.network,fetcher);
  const post=posts.find(p=>p.id===body.postId);
  if(!post)return failure('POST_NOT_OWNED',403);
  const comments=await listComments(env,body.network,body.postId,fetcher);
  const comment=comments.find(c=>c.id===body.commentId);
  if(!comment)return failure('COMMENT_NOT_FOUND',404);
  if(!comment.text.trim())return failure('EMPTY_COMMENT',422);
  return {post,comment};
}
export async function prepareDraft(env,body,fetcher=fetch){
  const target=await withTarget(env,body,fetcher);
  if(target.error)return target;
  const instructions=typeof body.instructions==='string'?body.instructions:'';
  if(instructions.length>400)return failure('INVALID_INSTRUCTIONS');
  return {draft:await draftReply(env,{...target,instructions},fetcher)};
}
export async function approvedReply(env,body,fetcher=fetch){
  if(!validateReply(body))return failure('INVALID_REPLY');
  if(body.confirmed!==true)return failure('EXPLICIT_APPROVAL_REQUIRED',403);
  if(!env.SOCIAL_DB)return failure('SOCIAL_DB_REQUIRED',503);
  const target=await withTarget(env,body,fetcher);
  if(target.error)return target;
  const {network,postId,commentId}=body,content=body.text.trim();
  // The unique index is a once-only durable lock, including on network failures.
  // Retrying an uncertain remote write could duplicate a public reply.
  const statement=await env.SOCIAL_DB.prepare(`INSERT OR IGNORE INTO reply_audit
    (network,comment_id,post_id,content,state) VALUES (?,?,?,?, 'sending')`)
    .bind(network,commentId,postId,content).run();
  if(!statement.meta?.changes)return failure('ALREADY_ATTEMPTED_CHECK_HISTORY',409);
  try {
    const remoteId=await sendReply(env,network,commentId,content,fetcher);
    await env.SOCIAL_DB.prepare(`UPDATE reply_audit SET state='published',remote_id=?,updated_at=datetime('now')
      WHERE network=? AND comment_id=?`).bind(remoteId,network,commentId).run();
    return {published:true,remoteId};
  } catch {
    await env.SOCIAL_DB.prepare(`UPDATE reply_audit SET state='needs_reconciliation',updated_at=datetime('now')
      WHERE network=? AND comment_id=?`).bind(network,commentId).run().catch(()=>{});
    return failure('PUBLICATION_UNCERTAIN_CHECK_PLATFORM_BEFORE_RETRY',502);
  }
}
export async function history(env){
  if(!env.SOCIAL_DB)return failure('SOCIAL_DB_REQUIRED',503);
  const rows=await env.SOCIAL_DB.prepare(`SELECT network,post_id AS postId,comment_id AS commentId,
    content,state,remote_id AS remoteId,created_at AS createdAt,updated_at AS updatedAt
    FROM reply_audit ORDER BY created_at DESC LIMIT 100`).all();
  const posts=await env.SOCIAL_DB.prepare(`SELECT request_id AS requestId,network,
    content,image_url AS imageUrl,state,remote_id AS remoteId,created_at AS createdAt,
    updated_at AS updatedAt FROM post_audit ORDER BY created_at DESC LIMIT 100`).all();
  return {replies:rows.results||[],posts:posts.results||[]};
}
export async function readAction(env,action,args={},fetcher=fetch){
  if(action==='status')return {networks:available(env),database:!!env.SOCIAL_DB,ai:!!env.SOCIAL_GEMINI_KEY};
  if(action==='history')return history(env);
  if(!NETWORKS.has(args.network)||!available(env)[args.network])return failure('NETWORK_NOT_CONFIGURED',503);
  if(action==='posts')return {posts:await listPosts(env,args.network,fetcher)};
  if(action==='comments'){
    if(!validId(args.postId))return failure('INVALID_POST_ID');
    const posts=await listPosts(env,args.network,fetcher);
    if(!posts.some(p=>p.id===args.postId))return failure('POST_NOT_OWNED',403);
    return {comments:await listComments(env,args.network,args.postId,fetcher)};
  }
  return failure('UNKNOWN_ACTION');
}

export async function approvedPost(env,body,fetcher=fetch){
  if(!NETWORKS.has(body?.network)||!available(env)[body.network])return failure('NETWORK_NOT_CONFIGURED',503);
  if(body.confirmed!==true)return failure('EXPLICIT_APPROVAL_REQUIRED',403);
  if(!env.SOCIAL_DB)return failure('SOCIAL_DB_REQUIRED',503);
  const text=typeof body.text==='string'?body.text.trim():'';
  const max=body.network==='threads'?500:5000;
  if(!text||text.length>max)return failure('INVALID_POST_TEXT');
  let imageUrl='';
  if(body.imageUrl!==undefined&&body.imageUrl!==''){
    if(typeof body.imageUrl!=='string'||body.imageUrl.length>2048)return failure('INVALID_IMAGE_URL');
    try{
      const url=new URL(body.imageUrl);
      if(url.protocol!=='https:'||!url.hostname.includes('.')||url.username||url.password||url.port||url.hash)
        return failure('INVALID_IMAGE_URL');
      // Never publish assets from loopback or private-only hosts.
      if(/^(localhost|.*\.localhost|.*\.local|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1)/i.test(url.hostname))return failure('INVALID_IMAGE_URL');
      imageUrl=url.toString();
    }catch{return failure('INVALID_IMAGE_URL');}
  }
  // Request id protects against re-delivery of an identical operator action.
  const requestId=body.requestId;
  if(typeof requestId!=='string'||!/^[a-f0-9-]{36}$/i.test(requestId))return failure('INVALID_REQUEST_ID');
  const reserved=await env.SOCIAL_DB.prepare(`INSERT OR IGNORE INTO post_audit
    (request_id,network,content,image_url,state) VALUES (?,?,?,?, 'sending')`)
    .bind(requestId,body.network,text,imageUrl).run();
  if(!reserved.meta?.changes)return failure('ALREADY_ATTEMPTED_CHECK_HISTORY',409);
  try{
    const remoteId=await sendPost(env,body.network,{text,imageUrl},fetcher);
    await env.SOCIAL_DB.prepare(`UPDATE post_audit SET state='published',remote_id=?,updated_at=datetime('now')
      WHERE request_id=?`).bind(remoteId,requestId).run();
    return {published:true,remoteId};
  }catch{
    await env.SOCIAL_DB.prepare(`UPDATE post_audit SET state='needs_reconciliation',updated_at=datetime('now')
      WHERE request_id=?`).bind(requestId).run().catch(()=>{});
    return failure('PUBLICATION_UNCERTAIN_CHECK_PLATFORM_BEFORE_RETRY',502);
  }
}