import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('video voice CLI parses and shows instructions without API keys',()=>{
  const result=spawnSync(process.execPath,['scripts/video-voice.mjs','--help'],{encoding:'utf8'});
  assert.equal(result.status,0);
  assert.match(result.stdout,/provider=gemini/);
});
test('video voice CLI syntax is valid',()=>{
  const result=spawnSync(process.execPath,['--check','scripts/video-voice.mjs'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});
