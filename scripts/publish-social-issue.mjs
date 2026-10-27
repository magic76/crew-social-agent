// Direct Threads/Facebook publication from an explicitly approved owner-created GitHub issue.
// Uses Meta's official APIs, not Metricool. Never retries uncertain publications.
import { sendPost } from '../src/meta.js';

const THREADS_GRAPH = 'https://graph.threads.net/v1.0';
const MARK = 'crew-social-publish';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function validatePayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Issue body must be a JSON object');
  const threadsText = String(value.threadsText ?? '').trim();
  const facebookText = String(value.facebookText ?? '').trim();
  if (!threadsText || threadsText.length > 500) throw Error('threadsText must contain 1–500 characters');
  if (!facebookText || facebookText.length > 5000) throw Error('facebookText must contain 1–5000 characters');
  if (typeof value.imageUrl !== 'string') throw Error('imageUrl is required; text-only publishing is disabled');
  let url;
  try { url = new URL(value.imageUrl); } catch { throw Error('Invalid image URL'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password ||
      /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1)/i.test(url.hostname) ||
      url.hostname.endsWith('.local')) throw Error('imageUrl must be public HTTPS');
  return {threadsText, facebookText, imageUrl:url.toString()};
}

function requireEnv(env) {
  for (const k of ['GITHUB_TOKEN','GITHUB_REPOSITORY','GITHUB_REPOSITORY_OWNER','SOCIAL_ISSUE_NUMBER',
                   'THREADS_ACCESS_TOKEN','FACEBOOK_PAGE_TOKEN','FACEBOOK_PAGE_ID']) {
    if (!env[k]) throw Error('Missing required configuration: ' + k);
  }
  if (!/^\d+$/.test(env.SOCIAL_ISSUE_NUMBER) || !/^\d+$/.test(env.FACEBOOK_PAGE_ID)) {
    throw Error('Invalid issue number or Facebook Page ID');
  }
}

async function githubApi(env,path,{method='GET',body}={}) {
  const response=await fetch('https://api.github.com/repos/'+env.GITHUB_REPOSITORY+path, {
    method,headers:{
      Authorization:'Bearer '+env.GITHUB_TOKEN,
      Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28',
      ...(body?{'Content-Type':'application/json'}:{})
    },
    body:body?JSON.stringify(body):undefined,
    signal:AbortSignal.timeout(20000)
  });
  if(!response.ok) throw Error('GitHub API '+method+' failed: HTTP '+response.status);
  return response.json();
}

async function threadsApi(env,path,{method='GET',body}={}) {
  const response=await fetch(THREADS_GRAPH+'/'+path,{
    method,
    headers:{Authorization:'Bearer '+env.THREADS_ACCESS_TOKEN,
      ...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},
    body:body?new URLSearchParams(body):undefined,
    signal:AbortSignal.timeout(20000)
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok || !result || result.error) {
    throw Error('Threads API rejected '+method+' '+path.split('?')[0]+': HTTP '+response.status);
  }
  return result;
}

async function publishThreads(env,{threadsText,imageUrl}) {
  const c=await threadsApi(env,'me/threads',{method:'POST',
    body:{media_type:'IMAGE',image_url:imageUrl,text:threadsText}});
  if(!/^\d+$/.test(c.id??'')) throw Error('Threads did not return a container ID');
  let ready=false;
  for(let i=0;i<15;i++){
    if(i) await sleep(2000);
    const status=await threadsApi(env,c.id+'?fields=id,status,error_message');
    if(status.status==='FINISHED'){ready=true;break;}
    if(status.status==='ERROR' || status.status==='EXPIRED') throw Error('Threads media container failed');
  }
  if(!ready) throw Error('Threads media not ready; check manually before retrying');
  const p=await threadsApi(env,'me/threads_publish',{method:'POST',body:{creation_id:c.id}});
  if(!/^\d+$/.test(p.id??'')) throw Error('Threads returned no published post ID');
  let url=null;
  try {
    const detail=await threadsApi(env,p.id+'?fields=id,permalink');
    url=detail.permalink??null;
  }catch{ /* Successful publish ID is sufficient; permalink lookup is best-effort. */ }
  return {id:p.id,url};
}

async function main() {
  const env=process.env;
  requireEnv(env);
  const issueNo=env.SOCIAL_ISSUE_NUMBER;
  const issue=await githubApi(env,'/issues/'+issueNo);
  if(issue.state!=='open' || issue.user?.login!==env.GITHUB_REPOSITORY_OWNER ||
     !issue.labels?.some(l=>l.name==='social-publish')){
    throw Error('Only open, repository-owner-authored, social-publish-labelled issues can publish');
  }
  const p=validatePayload(JSON.parse(issue.body??''));
  const comments=await githubApi(env,'/issues/'+issueNo+'/comments?per_page=100');
  let failed=false;
  for(const network of ['facebook','threads']) {
    const marker='<!-- '+MARK+':'+network+':attempted -->';
    if(comments.some(c=>c.body?.includes(marker))) {
      console.log(network+': prior attempt found; refusing to retry');
      continue;
    }
    // A durable pre-send journal is critical: no automatic retries if Meta returns an ambiguous result.
    await githubApi(env,'/issues/'+issueNo+'/comments',{method:'POST',body:{body:marker+'\n'+network+': attempt started; do not rerun without manual reconciliation.'}});
    try {
      const result=network==='threads'
        ?await publishThreads(env,p)
        :{id:await sendPost(env,'facebook',{text:p.facebookText,imageUrl:p.imageUrl})};
      const details=result.url?'\n'+result.url:'';
      await githubApi(env,'/issues/'+issueNo+'/comments',{method:'POST',body:{body:
        '<!-- '+MARK+':'+network+':success -->\n'+network+': PUBLISHED, ID '+result.id+details}});
      console.log(network+': published '+result.id);
    }catch(err) {
      failed=true;
      await githubApi(env,'/issues/'+issueNo+'/comments',{method:'POST',body:{body:
        '<!-- '+MARK+':'+network+':uncertain -->\n'+network+': failed or outcome uncertain ('+
        String(err.message).slice(0,180)+'). Confirm on the platform before any manual retry.'}});
      console.error(network+': publication failed or uncertain');
    }
  }
  if(failed) process.exitCode=1;
}

if (process.argv[1]?.endsWith('publish-social-issue.mjs')) {
  main().catch(error => {console.error(error.message);process.exitCode=1;});
}
