import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readdir,readFile,unlink,writeFile} from 'node:fs/promises';
import {basename,join,resolve} from 'node:path';
import {validateQueueEntry} from './core.js';

const execFileAsync=promisify(execFile);
const FILE_RE=/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.json$/;
const ASSET_RE=/^content\/queue\/assets\/[A-Za-z0-9._-]+\.(?:webp|png|jpe?g)\.base64$/i;

function safeBranch(branch){
  if(typeof branch!=='string'||! /^[A-Za-z0-9._/-]{1,120}$/.test(branch)||branch.includes('..')||branch.startsWith('-'))throw new Error('Invalid queue branch');
  return branch;
}

async function git(repoRoot,args,options={}){
  return execFileAsync('git',args,{cwd:repoRoot,encoding:'utf8',maxBuffer:32*1024*1024,timeout:120000,...options});
}

function decodeAsset(encoded){
  const value=encoded.trim();
  if(!value||value.length>Math.ceil(15*1024*1024*4/3)+8||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw new Error('Invalid or oversized Base64 queue image');
  const bytes=Buffer.from(value,'base64');
  if(bytes.toString('base64').replace(/=+$/,'')!==value.replace(/=+$/,''))throw new Error('Non-canonical Base64 image');
  return bytes;
}

async function makeItems(manifests,readAsset,env,stateDir){
  const items=[],errors=[];
  const cache=join(resolve(stateDir),'cache');
  await mkdir(cache,{recursive:true,mode:0o700});
  for(const [name,manifestText] of manifests){
    if(!FILE_RE.test(name))continue;
    let entry=null;
    try{
      entry=JSON.parse(manifestText);
      const textOnly=entry.image===null;
      const rel=textOnly?null:entry.image?.path;
      if(!textOnly&&(typeof rel!=='string'||!ASSET_RE.test(rel)))throw new Error('Unsafe or unsupported image path');
      const bytes=textOnly?null:decodeAsset(await readAsset(rel));
      validateQueueEntry(entry,bytes,env);
      await writeFile(join(cache,basename(name)),JSON.stringify(entry,null,2)+'\n',{mode:0o600});
      if(bytes)await writeFile(join(cache,`${entry.id}.${entry.image.format}`),bytes,{mode:0o600});
      items.push({entry,imageBytes:bytes,assetName:rel?basename(rel):null});
    }catch(e){
      errors.push({file:name,postId:typeof entry?.id==='string'?entry.id:null,networks:Array.isArray(entry?.networks)?entry.networks.filter(n=>n==='facebook'||n==='threads'):[],reason:String(e.message||'Queue validation failed').slice(0,240)});
    }
  }
  await writeFile(join(resolve(stateDir),'queue-errors.json'),JSON.stringify({recordedAt:new Date().toISOString(),errors},null,2)+'\n',{mode:0o600});
  return {items,errors};
}

export async function loadLocalQueue({repoRoot=process.cwd(),stateDir='.crew-social-agent',env=process.env}={}){
  const queue=join(resolve(repoRoot),'content','queue');
  const files=(await readdir(queue)).filter(x=>FILE_RE.test(x)).sort();
  const manifests=await Promise.all(files.map(async name=>[name,await readFile(join(queue,name),'utf8')]));
  return makeItems(manifests,async rel=>readFile(join(resolve(repoRoot),rel),'utf8'),env,stateDir);
}

export async function syncRemoteQueue({repoRoot=process.cwd(),branch='main',stateDir='.crew-social-agent',env=process.env}={}){
  safeBranch(branch);
  const target='refs/remotes/crew-social-agent/queue';
  try{await git(repoRoot,['fetch','--quiet','--no-tags','origin',`+refs/heads/${branch}:${target}`]);}
  catch{
    await mkdir(resolve(stateDir),{recursive:true,mode:0o700});
    await writeFile(join(resolve(stateDir),'sync-error.json'),JSON.stringify({recordedAt:new Date().toISOString(),reason:'GitHub queue sync failed; no posts were attempted.'},null,2)+'\n',{mode:0o600});
    throw new Error('GitHub queue sync failed. Check network access, repository access, and queue branch. No posts were attempted.');
  }
  const {stdout:commit}=await git(repoRoot,['rev-parse','--verify',`${target}^{commit}`]);
  const {stdout:tree}=await git(repoRoot,['ls-tree','-r','--name-only',target,'content/queue']);
  const paths=tree.split('\n').filter(Boolean);
  const manifests=[];
  for(const path of paths){
    if(path.startsWith('content/queue/')&&FILE_RE.test(path.slice('content/queue/'.length))){
      const {stdout}=await git(repoRoot,['show',`${target}:${path}`]);
      manifests.push([path.slice('content/queue/'.length),stdout]);
    }
  }
  const readAsset=async rel=>{
    if(!ASSET_RE.test(rel))throw new Error('Unsafe queue image path');
    const {stdout}=await git(repoRoot,['show',`${target}:${rel}`]);
    return stdout;
  };
  const {items,errors}=await makeItems(manifests,readAsset,env,stateDir);
  const syncedAt=new Date().toISOString();
  await mkdir(join(resolve(stateDir),'cache'),{recursive:true,mode:0o700});
  await writeFile(join(resolve(stateDir),'last-sync.json'),JSON.stringify({syncedAt,branch,commit:commit.trim(),items:items.length,queueErrors:errors.length})+'\n',{mode:0o600});
  await unlink(join(resolve(stateDir),'sync-error.json')).catch(()=>{});
  return {items,errors,syncedAt,branch,commit:commit.trim()};
}
