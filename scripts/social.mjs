#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {available,listPosts,listComments} from '../src/meta.js';
import {validatePublish,validateReply,publish,reply,history} from '../src/local.js';

function usage(){
  console.log('Usage: node --env-file=.env scripts/social.mjs <command> [args]\n'+
    '  status\n  posts <threads|facebook>\n  comments <threads|facebook> <postId>\n'+
    '  publish <payload.json> [--execute]\n  reply <payload.json> [--execute]\n  history');
}
async function main(){
  const [command,...args]=process.argv.slice(2), env=process.env;
  if(command==='help'||!command){usage();return;}
  let result;
  if(command==='status')result={networks:available(env),journal:'.crew-social/attempts'};
  else if(command==='posts'){
    if(!['threads','facebook'].includes(args[0])||args.length!==1)throw Error('posts needs a network');
    if(!available(env)[args[0]])throw Error('Missing '+args[0]+' credential');
    result=await listPosts(env,args[0]);
  }else if(command==='comments'){
    if(!['threads','facebook'].includes(args[0])||!args[1]||args.length!==2)throw Error('comments needs network postId');
    if(!available(env)[args[0]])throw Error('Missing '+args[0]+' credential');
    result=await listComments(env,args[0],args[1]);
  }else if(command==='history'){
    result=await history();
  }else if(command==='publish'||command==='reply'){
    if(!args[0]||args.length>2||(args.length===2&&args[1]!=='--execute'))throw Error('Expected payload.json [--execute]');
    const data=JSON.parse(await readFile(args[0],'utf8'));
    const validated=command==='publish'?validatePublish(data):validateReply(data);
    if(args[1]!=='--execute'){
      result={dryRun:true,validated,message:'No API publication occurred. Add --execute to publish'};
    }else {
      result=command==='publish'?await publish(env,data):await reply(env,data);
      const items=Array.isArray(result)?result:[result];
      if(items.some(x=>x.state!=='published'))process.exitCode=1;
    }
  }else throw Error('Unknown command: '+command);
  console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error('Crew Social Agent:',e.message);process.exitCode=1;});
