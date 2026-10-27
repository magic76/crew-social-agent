/** Stateless Streamable HTTP MCP endpoint, deliberately read/draft only.
 * Public mutations need a real human click in the admin console (/api/reply).
 * No tool can silently approve or send a public comment.
 */
import {readAction,prepareDraft} from './service.js';
const tool=(name,description,properties,required=[])=>({name,description,inputSchema:{type:'object',properties,required,additionalProperties:false}});
const word={type:'string'};
export const TOOLS=[
  tool('social_status','Check configured networks (never returns credentials).',{}),
  tool('social_list_posts','List recent posts owned by the authorized Facebook Page or Threads account.',{network:{type:'string',enum:['threads','facebook']}},['network']),
  tool('social_list_comments','List comments for a post owned by this account.',{network:{type:'string',enum:['threads','facebook']},postId:word},['network','postId']),
  tool('social_draft_reply','Create a draft for an exact comment, never publish. Ask the owner to approve via the dashboard.',{network:{type:'string',enum:['threads','facebook']},postId:word,commentId:word,instructions:word},['network','postId','commentId']),
  tool('social_reply_history','Review the reply audit trail. This is not a new publication command.',{})
];
const result=(id,payload)=>new Response(JSON.stringify({jsonrpc:'2.0',id,result:payload}),{
  headers:{'content-type':'application/json','cache-control':'no-store','mcp-protocol-version':'2025-03-26'}
});
const failure=(id,code,message)=>new Response(JSON.stringify({jsonrpc:'2.0',id,error:{code,message}}),{
  headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function handleMcp(request,env,parseBody){
  if(request.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST','cache-control':'no-store'}});
  const accept=request.headers.get('accept')||'';
  if(!accept.includes('application/json')||!accept.includes('text/event-stream'))
    return new Response('Accept application/json and text/event-stream',{status:406});
  const body=await parseBody(request);
  if(!body||body.jsonrpc!=='2.0'||typeof body.method!=='string')return failure(null,-32600,'Invalid request');
  if(body.method==='notifications/initialized')return new Response(null,{status:202});
  if(body.id===undefined||body.id===null)return failure(null,-32600,'Missing request ID');
  if(body.method==='initialize')return result(body.id,{protocolVersion:'2025-03-26',capabilities:{tools:{listChanged:false}},serverInfo:{name:'crew-social-agent',version:'0.1.0'}});
  if(body.method==='ping')return result(body.id,{});
  if(body.method==='tools/list')return result(body.id,{tools:TOOLS});
  if(body.method!=='tools/call')return failure(body.id,-32601,'Method not found');
  const name=body.params?.name,args=body.params?.arguments||{};
  if(!TOOLS.some(x=>x.name===name))return failure(body.id,-32602,'Unknown tool');
  let output;
  if(name==='social_status')output=await readAction(env,'status');
  if(name==='social_list_posts')output=await readAction(env,'posts',args);
  if(name==='social_list_comments')output=await readAction(env,'comments',args);
  if(name==='social_reply_history')output=await readAction(env,'history');
  if(name==='social_draft_reply')output=await prepareDraft(env,args);
  return result(body.id,{content:[{type:'text',text:JSON.stringify(output)}],isError:!!output?.error});
}