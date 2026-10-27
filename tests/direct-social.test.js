import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePayload} from '../scripts/publish-social-issue.mjs';

const good={threadsText:'今天用 AI 練口說，結果比想像中好玩',facebookText:'最近用 AI 練英文，真的蠻有趣的。',imageUrl:'https://www.3sssi.com/assets/crew.png'};
test('requires distinct Threads and Facebook text with HTTPS image',()=>{
  assert.deepEqual(validatePayload(good),good);
  for(const bad of [
    {...good,imageUrl:undefined},
    {...good,imageUrl:'http://example.com/x.jpg'},
    {...good,imageUrl:'https://localhost/x.jpg'},
    {...good,imageUrl:'https://127.0.0.1/x.jpg'},
    {...good,threadsText:''},
    {...good,threadsText:'x'.repeat(501)},
    {...good,facebookText:''},
  ]) assert.throws(()=>validatePayload(bad));
});
