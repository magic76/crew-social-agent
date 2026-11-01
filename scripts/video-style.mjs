#!/usr/bin/env node
// Crew Cloud motion-card theme. Additive: does not modify Queue, handoffs or voice jobs.
import {readFile,writeFile,copyFile,mkdir,stat} from 'node:fs/promises';
import {resolve,relative,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=(dir,p)=>relative(dir,join(root,p)).split('\\').join('/');
function chunks(text){
  const out=[];let line='';
  for(const c of text){line+=c;if(line.length>=17||/[，。！？；]/.test(c)){if(line.trim())out.push(line);line='';}}
  if(line.trim())out.push(line);return out;
}
function icon(type){
 const shapes={lock:'<rect x="42" y="65" width="76" height="65" rx="18"/><path d="M57 65V45a23 23 0 0 1 46 0v20"/><circle cx="80" cy="94" r="4"/><path d="M80 98v12"/>',company:'<rect x="35" y="26" width="90" height="110" rx="16"/><path d="M56 49h8m30 0h8M56 73h8m30 0h8M56 97h8m30 0h8M72 136v-21h16v21"/>',tasks:'<rect x="35" y="24" width="90" height="112" rx="16"/><path d="m50 54 7 7 12-15m8 9h27M50 82l7 7 12-15m8 9h27M50 110l7 7 12-15m8 9h27"/>',verify:'<path d="M80 21 128 42v38c0 33-48 59-48 59S32 113 32 80V42Z"/><path d="m56 79 18 18 32-38"/>',repeat:'<path d="M126 59A53 53 0 1 0 128 99M126 25v35H91"/>'};
 return `<svg viewBox="0 0 160 160" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${shapes[type]||shapes.tasks}</svg>`;
}
export async function buildStyleProject(folder){
 const dir=resolve(folder),doc=JSON.parse(await readFile(join(dir,'story.json'),'utf8'));
 if(doc.video?.width!==1080||doc.video?.height!==1920||doc.video?.fps!==30)throw Error('Crew style requires 1080×1920 at 30fps');
 if(await stat(join(dir,'index.html')).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;}))throw Error('index.html already exists; remove it explicitly before rebuilding');
 await mkdir(join(dir,'assets'),{recursive:true});
 const copy=async(from,to)=>{if(resolve(from)!==resolve(to))await copyFile(from,to);};
 await copy(join(root,'video-lab/examples/2026-11-01-synthetic-enterprise-evals/assets/gsap.min.js'),join(dir,'assets/gsap.min.js'));
 if(!doc.font||typeof doc.font!=='string')throw Error('doc.font is required: provide a Traditional Chinese font covering every script glyph');
 const font=resolve(dir,doc.font);
 await copy(font,join(dir,'assets/crew-font.otf'));
 if(doc.audio)await copy(resolve(dir,doc.audio),join(dir,'assets/narration.wav'));
 const poses=['surprise','think','wave','think','thumbs-up'];
 const types=['lock','company','tasks','verify','repeat'];
 const mascot=await Promise.all(doc.scenes.map((s,i)=>readFile(join(root,'content/video-style/mascot',(s.pose||poses[i%poses.length])+'.svg'),'utf8')));
 const cues=[];
 const scenes=doc.scenes.map((s,i)=>{
  const items=s.items||String(s.body||s.visual||'').split(/[、×｜|]/).map(x=>x.trim()).filter(Boolean).slice(0,3);
  const text=chunks(s.narration);let offset=s.start+0.12;const span=(s.duration-0.3)/text.length;
  for(const line of text){cues.push({start:offset,end:offset+span,text:line});offset+=span;}
  return `<section id="${esc(s.id)}" class="clip" data-start="${s.start}" data-duration="${s.duration}" data-track-index="${i}"><div class="scene-content"><div class="eyebrow">CREW LAB SI <span>${String(i+1).padStart(2,'0')} / ${String(doc.scenes.length).padStart(2,'0')}</span></div><h1>${(s.titleLines||[s.title]).map(line=>Array.from(line).reduce((a,c,i)=>a+(i===10?"<br>":"")+esc(c),"")).join("<br>")}</h1><div class="diagram"><div class="icon-tile">${icon(s.visualType||types[i%types.length])}</div><div class="item-stack">${items.map((x,j)=>`<div class="item"><b>${String(j+1).padStart(2,'0')}</b><span>${esc(x)}</span><i>✓</i></div>`).join('')}</div></div><div class="mascot" data-mascot="crew-cloud" aria-label="Crew Cloud">${mascot[i].replace(/id="([^"]+)"/g,(_,id)=>`id="${s.id}-${id}"`).replace(/aria-labelledby="([^"]+)"/g,(_,id)=>`aria-labelledby="${id.split(/\s+/).map(x=>s.id+"-"+x).join(" ")}"`)}</div><div class="footer-note">${esc(s.note||'概念示意 · Crew Lab SI')}</div></div></section>`;
 }).join('\n');
 const captionCues=doc.captions||cues;
 const html=`<!doctype html><html lang="zh-TW"><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>
 @font-face{font-family:CrewTC;src:url('assets/crew-font.otf')}*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#f5f4ef;color:#18191b;font-family:CrewTC,sans-serif}#main{position:relative;width:1080px;height:1920px;overflow:hidden;background:#f5f4ef}.glow{position:absolute;width:900px;height:900px;border-radius:50%;filter:blur(90px);opacity:.35;pointer-events:none}.blue{background:#a5cbff;left:-400px;top:100px}.purple{background:#cfc0fa;right:-400px;top:550px}.orange{background:#ffd7b3;left:0;bottom:-500px}.clip{position:absolute;inset:0;opacity:0}.scene-content{position:absolute;inset:0;padding:130px 86px}.eyebrow{font-size:28px;font-weight:700;letter-spacing:4px;color:#53555c;display:flex;justify-content:space-between}.eyebrow span{letter-spacing:2px;color:#767982}h1{font-size:76px;line-height:1.3;letter-spacing:-2px;font-weight:800;max-width:900px;margin:65px 0 52px;min-height:205px}.diagram{position:relative;background:rgba(255,255,255,.87);border:2px solid #fff;border-radius:48px;box-shadow:0 25px 85px #474c6912;padding:50px;min-height:550px;display:flex;flex-direction:column;align-items:center;gap:30px}.icon-tile{width:175px;height:175px;border-radius:40px;display:grid;place-items:center;background:#eaf0ff;color:#5874b1;box-shadow:0 12px 30px #486cb918}.icon-tile svg{width:140px;height:140px}.item-stack{width:100%;display:flex;flex-direction:column;gap:18px}.item{background:#f5f6f9;border:1px solid #eceef2;min-height:80px;display:flex;align-items:center;padding:18px 25px;gap:24px;border-radius:24px;font-size:33px}.item b{font-size:28px;color:#818a9c}.item span{flex:1}.item i{font-style:normal;color:#748ab5;font-size:28px}.mascot{position:absolute;width:340px;height:340px;right:90px;bottom:365px;transform-origin:center}.mascot svg{width:100%;height:100%;overflow:visible}.mascot .eye{transform-box:fill-box;transform-origin:center}.footer-note{position:absolute;left:90px;bottom:405px;font-size:28px;color:#5b5e66;max-width:440px}.caption{position:absolute;left:90px;right:90px;bottom:230px;min-height:125px;padding:30px 32px;display:grid;place-items:center;text-align:center;font-size:44px;line-height:1.4;font-weight:600;border:2px solid #fff;background:#ffffffed;border-radius:44px;box-shadow:0 14px 50px #333c551a;opacity:0;z-index:50}.progress{position:absolute;left:90px;bottom:174px;width:900px;height:5px;background:#25272b;border-radius:5px;transform-origin:left;z-index:60}
 </style><script src="assets/gsap.min.js"></script></head><body><main id="main" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${doc.video.duration}"><div data-layout-allow-overflow class="glow blue"></div><div data-layout-allow-overflow class="glow purple"></div><div data-layout-allow-overflow class="glow orange"></div>${scenes}${captionCues.map((c,i)=>`<div class="caption" id="caption-${i}">${esc(c.text)}</div>`).join('')}<div class="progress"></div>${doc.audio?`<audio id="narration" data-start="0" data-volume="1" src="assets/narration.wav"></audio>`:''}</main><script>
 const timeline=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};window.__timelines["main"]=timeline;
 const scenes=${JSON.stringify(doc.scenes.map(s=>({id:s.id,start:s.start,duration:s.duration})))};
 scenes.forEach((s,i)=>{const q='#'+s.id,enter=Math.max(0,s.start-.5);timeline.set(q,{opacity:1},enter).fromTo(q+' .scene-content',{y:i===0?0:36,opacity:i===0?1:0,scale:i===0?1:.975},{y:0,opacity:1,scale:1,duration:.6,ease:'power3.out'},enter);timeline.fromTo(q+' .item',{y:30,opacity:0},{y:0,opacity:1,stagger:.16,duration:.55,ease:'power3.out'},s.start+.3);if(i<scenes.length-1)timeline.to(q,{opacity:0,y:-20,duration:.5,ease:'power2.inOut'},s.start+s.duration-.5);
 for(let t=s.start;t+1.6<=s.start+s.duration;t+=1.6){timeline.to(q+' .mascot',{y:-10,duration:.8,ease:'sine.inOut'},t).to(q+' .mascot',{y:0,duration:.8,ease:'sine.inOut'},t+.8);timeline.to(q+' .eye',{scaleY:.1,duration:.09},t+.7).to(q+' .eye',{scaleY:1,duration:.12},t+.79);timeline.to(q+' .icon-tile',{y:-5,duration:.8,ease:'sine.inOut'},t).to(q+' .icon-tile',{y:0,duration:.8,ease:'sine.inOut'},t+.8);}
 });
 const cues=${JSON.stringify(captionCues)};cues.forEach((c,i)=>{timeline.set('#caption-'+i,{opacity:1},c.start).set('#caption-'+i,{opacity:0},c.end)});timeline.fromTo('.progress',{scaleX:0},{scaleX:1,duration:${doc.video.duration},ease:'none'},0);timeline.to('.blue',{x:60,y:30,duration:${doc.video.duration},ease:'none'},0);timeline.to('.purple',{x:-40,y:-60,duration:${doc.video.duration},ease:'none'},0);
 </script></body></html>`;
 await writeFile(join(dir,'index.html'),html,{flag:'wx'});
 return {folder:dir,style:'crew-motion-cards-v1',scenes:doc.scenes.length,captions:captionCues.length};
}
export const buildStyle=buildStyleProject;
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(!process.argv[2]){console.error('Usage: node scripts/video-style.mjs PROJECT');process.exitCode=1;}else buildStyleProject(process.argv[2]).then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error(e.message);process.exitCode=1});}
