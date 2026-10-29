import {createDecipheriv,createCipheriv,createHash,randomBytes} from 'node:crypto';
import {chmod,mkdir,open,readFile,rename} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {available,refreshThreadsToken} from '../src/meta.js';

const pocketAad=Buffer.from('crew-pocket-social-v1');
const localAad=Buffer.from('crew-social-agent-credentials-v1');
const contextKey=Symbol('credential-context');
const credentialPath=stateDir=>join(resolve(stateDir),'credentials.enc');
const keyPath=stateDir=>join(resolve(stateDir),'credentials.key');
const sha=value=>createHash('sha256').update(value).digest('hex');

function expandPath(value){
  const input=String(value||'').trim();
  if(!input||/^(?:off|none|disabled)$/i.test(input))return '';
  if(input==='~')return homedir();
  if(input.startsWith('~/'))return join(homedir(),input.slice(2));
  return resolve(input);
}

async function readPocketCredentials(baseEnv){
  const directory=expandPath(baseEnv.SOCIAL_AGENT_POCKET_VAULT_DIR);
  if(!directory)return {};
  const vaultPath=join(directory,'accounts.enc'),keyPath=join(directory,'vault.key');
  let encrypted,key;
  try{[encrypted,key]=await Promise.all([readFile(vaultPath,'utf8'),readFile(keyPath)]);}
  catch(error){if(error.code==='ENOENT')return {};throw new Error('Cannot read the configured Pocket social credential vault.');}
  try{
    await chmod(directory,0o700);
    await chmod(vaultPath,0o600);
    await chmod(keyPath,0o600);
  }catch{}
  try{
    const record=JSON.parse(encrypted);
    if(record.version!==1||key.length!==32)throw new Error('invalid vault');
    const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(record.iv,'base64'));
    decipher.setAAD(pocketAad);decipher.setAuthTag(Buffer.from(record.tag,'base64'));
    const value=JSON.parse(Buffer.concat([decipher.update(Buffer.from(record.data,'base64')),decipher.final()]).toString('utf8'));
    if(value.version!==1||!value.providers||typeof value.providers!=='object')return {};
    const out={};
    const facebook=value.providers.facebook||{};
    const page=Array.isArray(facebook.pages)?facebook.pages.find(x=>String(x.id||'')===String(facebook.selectedPageId||'')):null;
    if(page?.accessToken&&/^\d{3,40}$/.test(String(page.id||''))){
      out.FACEBOOK_PAGE_ID=String(page.id);
      out.FACEBOOK_PAGE_TOKEN=String(page.accessToken);
    }
    const threads=value.providers.threads||{};
    if(threads.accessToken){
      out.THREADS_ACCESS_TOKEN=String(threads.accessToken);
      const expiry=Number(threads.expiresAt||0);
      if(Number.isFinite(expiry)&&expiry>0)out.THREADS_TOKEN_EXPIRES_AT=new Date(expiry).toISOString();
    }
    if(out.FACEBOOK_PAGE_TOKEN||out.THREADS_ACCESS_TOKEN)out.SOCIAL_AGENT_CREDENTIAL_SOURCE='pocket-vault';
    return out;
  }catch{
    throw new Error('Cannot unlock the configured Pocket social credential vault.');
  }
}

async function createKey(stateDir){
  await mkdir(resolve(stateDir),{recursive:true,mode:0o700});
  await chmod(resolve(stateDir),0o700).catch(()=>{});
  try{
    const key=await readFile(keyPath(stateDir));
    if(key.length!==32)throw new Error('Local credential encryption key has invalid length.');
    await chmod(keyPath(stateDir),0o600).catch(()=>{});
    return key;
  }catch(error){
    if(error.code!=='ENOENT')throw error;
  }
  const key=randomBytes(32);
  try{await open(keyPath(stateDir),'wx',0o600).then(async handle=>{try{await handle.writeFile(key);await handle.sync();}finally{await handle.close();}});}
  catch(error){if(error.code!=='EEXIST')throw error;return createKey(stateDir);}
  return key;
}

async function readStored(stateDir){
  let contents;
  try{contents=await readFile(credentialPath(stateDir),'utf8');}
  catch(error){if(error.code==='ENOENT')return {};throw error;}
  await chmod(credentialPath(stateDir),0o600).catch(()=>{});
  const key=await readFile(keyPath(stateDir)).catch(error=>{if(error.code==='ENOENT')throw new Error('Local credentials are encrypted but their key is missing.');throw error;});
  if(key.length!==32)throw new Error('Local credential encryption key has invalid length.');
  await chmod(keyPath(stateDir),0o600).catch(()=>{});
  try{
    const record=JSON.parse(contents);
    if(record.version!==1)throw new Error('invalid record');
    const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(record.iv,'base64'));
    decipher.setAAD(localAad);decipher.setAuthTag(Buffer.from(record.tag,'base64'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(record.data,'base64')),decipher.final()]).toString('utf8'));
  }catch{throw new Error('Cannot decrypt local Agent credentials.');}
}

async function writeStored(stateDir,value){
  const directory=resolve(stateDir);await mkdir(directory,{recursive:true,mode:0o700});await chmod(directory,0o700).catch(()=>{});
  const key=await createKey(stateDir),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(localAad);
  const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  const contents=JSON.stringify({version:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')})+'\n';
  const path=credentialPath(stateDir),temporaryPath=path+'.'+randomBytes(6).toString('hex')+'.tmp';
  const handle=await open(temporaryPath,'wx',0o600);
  try{await handle.writeFile(contents);await handle.sync();}finally{await handle.close();}
  await rename(temporaryPath,path);await chmod(path,0o600).catch(()=>{});
  try{const dirHandle=await open(dirname(path),'r');try{await dirHandle.sync();}finally{await dirHandle.close();}}catch{}
}

export async function loadAgentEnvironment(baseEnv=process.env,stateDir='.crew-social-agent'){
  const [stored,pocket]=await Promise.all([readStored(stateDir),readPocketCredentials(baseEnv)]);
  const env={...pocket,...baseEnv};
  for(const key of ['THREADS_ACCESS_TOKEN','THREADS_TOKEN_EXPIRES_AT','FACEBOOK_PAGE_TOKEN','FACEBOOK_PAGE_ID']){
    if(!baseEnv[key]&&pocket[key])env[key]=pocket[key];
  }

  const sourceToken=baseEnv.THREADS_ACCESS_TOKEN||pocket.THREADS_ACCESS_TOKEN||'';
  const source=baseEnv.THREADS_ACCESS_TOKEN?'environment':pocket.THREADS_ACCESS_TOKEN?'pocket-vault':'stored';
  const fingerprint=sourceToken?sha(sourceToken):'';
  const storedMatches=!sourceToken||stored.threadsAccessToken===sourceToken||
    (stored.threadsSource===source&&stored.threadsSourceFingerprint===fingerprint);
  if(stored.threadsAccessToken&&storedMatches){
    env.THREADS_ACCESS_TOKEN=stored.threadsAccessToken;
    env.THREADS_TOKEN_EXPIRES_AT=stored.threadsExpiresAt||env.THREADS_TOKEN_EXPIRES_AT||'';
  }else if(!env.THREADS_TOKEN_EXPIRES_AT&&stored.threadsExpiresAt&&
      (!stored.threadsSourceFingerprint||stored.threadsSource===source&&stored.threadsSourceFingerprint===fingerprint)){
    env.THREADS_TOKEN_EXPIRES_AT=stored.threadsExpiresAt;
  }

  const finalSource=stored.threadsAccessToken&&storedMatches?(stored.threadsSource||source):source;
  const finalFingerprint=stored.threadsAccessToken&&storedMatches?(stored.threadsSourceFingerprint||fingerprint):fingerprint;
  Object.defineProperty(env,contextKey,{value:{threadsSource:finalSource,threadsSourceFingerprint:finalFingerprint},enumerable:false});
  env.SOCIAL_AGENT_CREDENTIAL_SOURCE=[env.FACEBOOK_PAGE_TOKEN?'facebook: '+(baseEnv.FACEBOOK_PAGE_TOKEN?'environment':pocket.FACEBOOK_PAGE_TOKEN?'pocket-vault':'environment'):null,
    env.THREADS_ACCESS_TOKEN?'threads: '+finalSource:null].filter(Boolean).join(', ')||'none';
  return env;
}

export async function setThreadsExpiry(stateDir,expiresAt,baseEnv=process.env){
  const value=Date.parse(expiresAt);
  if(!Number.isFinite(value)||value<=Date.now())throw new Error('Expiry must be a future ISO date/time');
  const env=await loadAgentEnvironment(baseEnv,stateDir),stored=await readStored(stateDir),context=env[contextKey]||{};
  await writeStored(stateDir,{...stored,threadsExpiresAt:new Date(value).toISOString(),
    threadsSource:context.threadsSource||'environment',threadsSourceFingerprint:context.threadsSourceFingerprint||''});
  return new Date(value).toISOString();
}

export async function refreshThreadsIfNeeded(baseEnv=process.env,stateDir='.crew-social-agent',{fetcher=fetch,now=new Date(),force=false}={}){
  const env=await loadAgentEnvironment(baseEnv,stateDir),context=env[contextKey]||{};
  const status={configured:available(env).threads,expiresAt:env.THREADS_TOKEN_EXPIRES_AT||null,refreshed:false,refreshBlocked:false,credentialSource:context.threadsSource||'none'};
  if(!env.THREADS_ACCESS_TOKEN){if(force){status.refreshBlocked=true;status.reason='CREDENTIALS_MISSING';}return {env,status};}
  const expiry=Date.parse(env.THREADS_TOKEN_EXPIRES_AT||''),remaining=expiry-Number(now);
  if(!env.THREADS_TOKEN_EXPIRES_AT||!Number.isFinite(expiry)){
    if(!force){status.expiryUnknown=true;return {env,status};}
  }else if(remaining<=0){status.refreshBlocked=true;status.reason='THREADS_TOKEN_EXPIRED_CANNOT_REFRESH';env.THREADS_REFRESH_BLOCKED=true;return {env,status};}
  else if(!force&&remaining>7*86400000)return {env,status};
  try{
    const refreshed=await refreshThreadsToken(env.THREADS_ACCESS_TOKEN,fetcher);
    const threadsExpiresAt=new Date(Number(now)+refreshed.expiresIn*1000).toISOString();
    const stored=await readStored(stateDir);
    await writeStored(stateDir,{...stored,threadsAccessToken:refreshed.accessToken,threadsExpiresAt,
      threadsSource:context.threadsSource||'environment',threadsSourceFingerprint:context.threadsSourceFingerprint||sha(env.THREADS_ACCESS_TOKEN)});
    env.THREADS_ACCESS_TOKEN=refreshed.accessToken;env.THREADS_TOKEN_EXPIRES_AT=threadsExpiresAt;
    delete env.THREADS_REFRESH_BLOCKED;
    status.expiresAt=threadsExpiresAt;status.refreshed=true;
  }catch{
    status.refreshBlocked=true;status.reason='THREADS_TOKEN_REFRESH_FAILED';env.THREADS_REFRESH_BLOCKED=true;
  }
  return {env,status};
}
