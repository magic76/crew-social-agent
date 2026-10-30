import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {validateProject} from '../scripts/video-lab.mjs';

const fixture=resolve('video-lab/examples/permissions-101');

test('video starter is a valid sourced 24-second HTML composition',async()=>{
  const v=await validateProject(fixture);
  assert.equal(v.duration,24);
  assert.equal(v.width,1080);
  assert.equal(v.height,1920);
  assert.equal(v.fps,30);
  assert.equal(v.scenes,4);
});
test('missing sources, overlaps, and HTML timing conflicts fail validation',async()=>{
  const tmp=await mkdtemp(join(tmpdir(),'crew-video-test-'));
  try{
    const story=JSON.parse(await readFile(join(fixture,'story.json'),'utf8'));
    const html=await readFile(join(fixture,'index.html'),'utf8');
    const save=data=>writeFile(join(tmp,'story.json'),JSON.stringify(data));
    await writeFile(join(tmp,'index.html'),html);
    await save({...story,sources:[]});
    await assert.rejects(()=>validateProject(tmp),/Sources required/);
    await save({...story,scenes:story.scenes.map((s,i)=>i===1?{...s,start:8}:s)});
    await assert.rejects(()=>validateProject(tmp),/Gap or overlap/);
    await save(story);
    await writeFile(join(tmp,'index.html'),html.replace('data-duration="24"','data-duration="23"'));
    await assert.rejects(()=>validateProject(tmp),/HTML root missing data-duration/);
  }finally{await rm(tmp,{recursive:true,force:true});}
});
