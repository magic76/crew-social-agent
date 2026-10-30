#!/usr/bin/env node
import {readFile,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const fail=msg=>{throw Error(msg)};
const near=(a,b)=>Math.abs(a-b)<0.001;
export async function validateProject(dir){
  dir=resolve(dir);
  const doc=JSON.parse(await readFile(join(dir,'story.json'),'utf8'));
  const html=await readFile(join(dir,'index.html'),'utf8');
  const v=doc.video;
  if(doc.version!==1||!(/^[a-z][a-z0-9-]{4,79}$/.test(doc.id||''))||doc.language!=='zh-TW')fail('Invalid story header');
  if(!v||v.width!==1080||v.height!==1920||![24,30,60].includes(v.fps)||!(v.duration>=5&&v.duration<=180))fail('Invalid 1080x1920 video dimensions, duration or fps');
  if(!Array.isArray(doc.sources)||!doc.sources.length)fail('Sources required');
  for(const source of doc.sources){if(!source.title||!source.publisher||!source.url||new URL(source.url).protocol!=='https:')fail('Invalid source');}
  if(!Array.isArray(doc.scenes)||doc.scenes.length<2||doc.scenes.length>12)fail('Expected 2–12 scenes');
  let t=0;const ids=new Set();
  for(const scene of doc.scenes){
    if(!/^[a-z][a-z0-9-]{3,39}$/.test(scene.id||'')||ids.has(scene.id))fail('Duplicate or invalid scene id');ids.add(scene.id);
    if(!near(scene.start,t)||!(scene.duration>0))fail('Gap or overlap at '+scene.id);
    if(!scene.title?.trim()||!scene.narration?.trim())fail('Missing scene title or narration');
    const clip=html.match(new RegExp('<section[^>]*id="'+scene.id+'"[^>]*>','i'))?.[0];
    if(!clip||!clip.includes('class="clip"')||!clip.includes('data-start="'+scene.start+'"')||!clip.includes('data-duration="'+scene.duration+'"'))fail('HTML clip differs from storyboard: '+scene.id);
    t+=scene.duration;
  }
  if(!near(t,v.duration))fail('Scene durations do not sum to video duration');
  for(const [attr,value] of [['data-width',v.width],['data-height',v.height],['data-duration',v.duration]])if(!html.includes(attr+'="'+value+'"'))fail('HTML root missing '+attr);
  if(!html.includes('data-composition-id="main"')||!html.includes('window.__timelines["main"]')||!html.includes('paused:true'))fail('Missing seek-safe HyperFrames GSAP timeline');
  return {dir,id:doc.id,width:v.width,height:v.height,duration:v.duration,fps:v.fps,scenes:doc.scenes.length,sources:doc.sources.length};
}
async function main(){
  const action=process.argv[2]||'help';
  const folder=resolve(process.argv[3]||'video-lab/examples/permissions-101');
  if(action==='help'){console.log('Usage: node scripts/video-lab.mjs validate|check|preview|render [folder]');return;}
  if(!['validate','check','preview','render'].includes(action))fail('Unknown command');
  const verified=await validateProject(folder);console.log(JSON.stringify({story:'valid',...verified},null,2));
  if(action==='validate')return;
  function run(...args){const result=spawnSync('npx',['--yes','hyperframes',...args],{cwd:folder,stdio:'inherit'});if(result.error||result.status!==0)fail('HyperFrames '+args[0]+' failed');}
  if(action==='check'||action==='render')run('check');
  if(action==='preview')run('preview');
  if(action==='render'){
    run('render','--composition','index.html','--output','output.mp4');
    const file=await stat(join(folder,'output.mp4'));
    if(!file.isFile()||file.size<1024)fail('Missing or empty output.mp4');
    console.log('MP4 created. Still inspect ffprobe metadata, keyframes, subtitles and audio before publication.');
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error('Video Lab:',e.message);process.exitCode=1});
