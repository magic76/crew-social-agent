import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,copyFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {buildStyle} from '../scripts/video-style.mjs';
import {validateProject} from '../scripts/video-lab.mjs';
const sample=resolve('content/video-style/samples');
async function fixture(){
 const dir=await mkdtemp(join(tmpdir(),'crew-style-'));
 const story=JSON.parse(await readFile(join(sample,'story.json'),'utf8'));
 story.font='font.otf';story.audio='voice.wav';story.captions=[{start:0.12,end:2.5,text:'測 AI，先開一間假公司？'}];
 await copyFile(join(sample,'assets/crew-font.otf'),join(dir,'font.otf'));
 await copyFile(join(sample,'assets/narration.wav'),join(dir,'voice.wav'));
 await writeFile(join(dir,'story.json'),JSON.stringify(story));
 return {dir,story};
}
test('style composes a valid deterministic project with local assets and exact captions',async()=>{
 const {dir}=await fixture();
 try{
  await buildStyle(dir);
  assert.equal((await validateProject(dir)).fps,30);
  const html=await readFile(join(dir,'index.html'),'utf8');
  assert.match(html,/window\.__timelines\["main"\]=timeline/);
  assert.match(html,/paused:true/);
  assert.match(html,/"start":0\.12,"end":2\.5,"text":"測 AI，先開一間假公司？"/);
  const dependencies=[...html.matchAll(/(?:src=["']|url\(['"]?)([^"')]+)/g)].map(x=>x[1]);
  assert.ok(dependencies.length>=3);
  for(const path of dependencies){assert.ok(path.startsWith('assets/'),path);assert.ok((await stat(join(dir,path))).size>0);}
  assert.match(html,/id="narration"/);
  assert.match(html,/bottom:230px/);
  assert.match(html,/font-size:44px/);
  assert.doesNotMatch(html,/setTimeout|requestAnimationFrame|fetch\(/);
  await assert.rejects(buildStyle(dir),/already exists/);
  assert.equal(await readFile(join(dir,'index.html'),'utf8'),html);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('style requires an explicit font rather than silently using a topic-specific subset',async()=>{
 const {dir,story}=await fixture();
 try{delete story.font;await writeFile(join(dir,'story.json'),JSON.stringify(story));await assert.rejects(buildStyle(dir),/doc.font is required/);await assert.rejects(stat(join(dir,'index.html')),e=>e.code==='ENOENT');}
 finally{await rm(dir,{recursive:true,force:true});}
});
