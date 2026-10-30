import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {geminiWav} from '../scripts/video-voice.mjs';

test('Gemini 3.8 REST payload and decoded WAV are supported without real credentials', async()=>{
  const wav=Buffer.alloc(44);wav.write('RIFF',0);wav.write('WAVE',8);
  let request;
  const fetcher=async(url,init)=>{
    request={url,init};
    return new Response(JSON.stringify({steps:[{type:'model_output',content:[{type:'audio',data:wav.toString('base64')}]}]}),{status:200,headers:{'content-type':'application/json'}});
  };
  const got=await geminiWav('一個帳號，需要多少權限？',{apiKey:'MOCK_TEST_ONLY',model:'gemini-3.8-flash-tts',voice:'Kore',style:'Natural Taiwan Mandarin'},fetcher);
  assert.deepEqual(got,wav);
  const payload=JSON.parse(request.init.body);
  assert.equal(payload.model,'gemini-3.8-flash-tts');
  assert.deepEqual(payload.generation_config.speech_config,[{voice:'Kore'}]);
  assert.equal(payload.input[0].content[0].text,'一個帳號，需要多少權限？');
  assert.equal(payload.input[0].content[0].annotations[0].style,'Natural Taiwan Mandarin');
  assert.equal(request.init.headers['x-goog-api-key'],'MOCK_TEST_ONLY');
  assert.match(request.url,/generativelanguage\.googleapis\.com\/v1beta\/interactions/);
});

test('voice runner help and Node syntax pass',()=>{
  const check=spawnSync(process.execPath,['--check','scripts/video-voice.mjs'],{encoding:'utf8'});
  assert.equal(check.status,0,check.stderr);
  const help=spawnSync(process.execPath,['scripts/video-voice.mjs','--help'],{encoding:'utf8'});
  assert.equal(help.status,0,help.stderr);
  assert.match(help.stdout,/--provider=gemini/);
});