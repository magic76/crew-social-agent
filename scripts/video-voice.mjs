#!/usr/bin/env node
/** Crew Video Lab: voice narration per storyboard scene.
 * Gemini 3.8 TTS is the production provider, local eSpeak is a fallback test voice.
 * Output MP4 retains the original video frames, has narrated AAC and an SRT track.
 * Node 22+, ffmpeg/ffprobe. Never commits secrets or audio.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const fail=msg=>{throw new Error(msg)};
const pad=n=>String(n).padStart(2,'0');
function timecode(t){const h=Math.floor(t/3600),m=Math.floor(t/60)%60,s=t%60;return `${pad(h)}:${pad(m)}:${pad(Math.floor(s))},${String(Math.round((s%1)*1000)).padStart(3,'0')}`;}
function probe(file){const r=spawnSync('ffprobe',['-v','error','-show_entries','format=duration,size:stream=codec_type,width,height','-of','json',file],{encoding:'utf8'});if(r.status!==0)fail('ffprobe failed for '+basename(file));return JSON.parse(r.stdout);}
function run(name,args){const p=spawnSync(name,args,{stdio:'inherit'});if(p.error||p.status!==0)fail(name+' failed');}
function opts(argv){const o={project:argv[0]||'video-lab/examples/permissions-101',provider:'gemini',voice:'Kore',model:'gemini-3.8-flash-tts',out:'',video:'',offset:0.45};for(const arg of argv.slice(1)){const m=/^--([a-z-]+)=(.*)$/.exec(arg);if(!m||!(m[1] in o))fail('Unrecognized argument '+arg);o[m[1]]=m[1]==='offset'?Number(m[2]):m[2];}return o;}
async function geminiWav(text,config){
 const apiKey=process.env.GEMINI_API_KEY;
 if(!apiKey)fail('GEMINI_API_KEY is missing; do not put it in GitHub or source files');
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),120000);
 let res;try{
  res=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{
   method:'POST',headers:{'content-type':'application/json','x-goog-api-key':apiKey},signal:controller.signal,
   body:JSON.stringify({model:config.model,input:[{type:'user_input',content:[{
    type:'text',text,annotations:[{type:'speech_metadata',style:'Calm, warm educational narration. Speak in natural Taiwan Mandarin (zh-TW), clearly and a little briskly, without adding any words.'}]
   }]}],response_format:{type:'audio'},generation_config:{speech_config:[{voice:config.voice,language:'zh-TW'}]}})
  });
 }finally{clearTimeout(timeout)}
 if(!res.ok)fail('Gemini TTS request failed HTTP '+res.status+' (response body suppressed to avoid leaking credentials)');
 const json=await res.json();
 const chunks=[];
 for(const step of json.steps||[])if(step.type==='model_output')for(const block of step.content||[])if(block.type==='audio'&&block.data)chunks.push(block.data);
 if(!chunks.length)fail('Gemini TTS returned no audio in steps[].content[]');
 const data=Buffer.from(chunks.at(-1),'base64');
 if(data.length<44||data.toString('ascii',0,4)!=='RIFF'||data.toString('ascii',8,12)!=='WAVE')fail('Gemini TTS response is not a valid WAV container');
 return data;
}
async function main(){
 const args=process.argv.slice(2);if(args.includes('--help')){console.log('node scripts/video-voice.mjs PROJECT [--provider=gemini|espeak] [--voice=Kore] [--video=FILE] [--out=FILE]');return;}
 const o=opts(args),project=resolve(o.project),story=JSON.parse(await readFile(join(project,'story.json'),'utf8'));
 const video=resolve(o.video||join(project,'original.mp4'));
 const output=resolve(o.out||join(project,'narrated.mp4'));
 if(!['gemini','espeak'].includes(o.provider))fail('provider must be gemini or espeak');
 const duration=Number(story.video?.duration),media=probe(video);
 const hasOriginalAudio=media.streams.some(s=>s.codec_type==='audio');
 if(!Number.isFinite(duration)||duration<=0||Math.abs(Number(media.format.duration)-duration)>.2)fail('Video duration differs from storyboard duration');
 const sceneFolder=join(project,'generated-voice');await mkdir(sceneFolder,{recursive:true});
 const sounds=[],lines=[];const retime=[];
 for(let i=0;i<story.scenes.length;i++){
  const scene=story.scenes[i],text=scene.narration?.trim();if(!text)fail('Scene has no narration: '+scene.id);
  const path=join(sceneFolder,`scene-${pad(i+1)}.wav`);
  if(o.provider==='gemini')await writeFile(path,await geminiWav(text,o));
  else run('espeak',['-v','zh','-s','160','-p','52','-a','145','-w',path,text]);
  const len=Number(probe(path).format.duration),start=Number(scene.start)+o.offset,remaining=Number(scene.duration)-o.offset-.12;
  if(len>remaining){retime.push({id:scene.id,available:remaining,audioSeconds:len,recommendedSceneDuration:Math.ceil((len+o.offset+.12)*10)/10});}
  else {sounds.push({path,start,len});lines.push(`${i+1}\n${timecode(start)} --> ${timecode(start+len)}\n${text}\n`);}
 }
 if(retime.length){const target=join(sceneFolder,'retime-required.json');await writeFile(target,JSON.stringify({message:'Narration is longer than its scene. Retime and re-render the HTML video before muxing. No audio was truncated.',scenes:retime},null,2)+'\n');fail('Narration does not fit. See '+target);}
 const captions=join(sceneFolder,'narration.srt');await writeFile(captions,lines.join('\n')+'\n');
 const inputs=['-i',video];for(const item of sounds)inputs.push('-i',item.path);inputs.push('-i',captions);
 const filters=[];for(let i=0;i<sounds.length;i++){
  filters.push(`[${i+1}:a]aresample=48000,adelay=${Math.round(sounds[i].start*1000)}:all=1,volume=1.65[v${i}]`);
 }
 const voiced=sounds.map((_,i)=>`[v${i}]`).join('');
 filters.push(`${voiced}amix=inputs=${sounds.length}:normalize=0:duration=longest[voice]`);
 filters.push(hasOriginalAudio?'[0:a]volume=0.16[bg]':'anullsrc=r=48000:cl=mono,atrim=duration='+duration+'[bg]');
 filters.push('[bg][voice]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.92[a]');
 run('ffmpeg',['-hide_banner','-loglevel','error','-y',...inputs,'-filter_complex',filters.join(';'),'-map','0:v:0','-map','[a]','-map',`${sounds.length+1}:s:0`,'-c:v','copy','-c:a','aac','-b:a','192k','-c:s','mov_text','-metadata:s:s:0','language=zho','-movflags','+faststart','-t',String(duration),output]);
 const metadata=probe(output);if(Math.abs(Number(metadata.format.duration)-duration)>.2||!metadata.streams.some(s=>s.codec_type==='audio'))fail('Invalid rendered narrated MP4');
 console.log(JSON.stringify({status:'rendered',provider:o.provider,output,duration,subtitles:captions,voice:o.voice,sceneCount:sounds.length},null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error('Crew video-voice:',e.message);process.exitCode=1;});