// Private operator console: token only in JS memory, never cookies, URL or storage.
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const state={key:'',network:'threads',posts:[],currentPost:null,comments:[]};
  const node=(tag,className,text)=>{const x=document.createElement(tag);if(className)x.className=className;if(text!==undefined)x.textContent=text;return x;};
  const status=(message)=>{$('status').textContent=message;};
  const clear=(id)=>{$(id).replaceChildren();};
  async function api(path,body){
    if(!state.key)throw Error('請先輸入管理員金鑰');
    const response=await fetch('/api/'+path,{method:body?'POST':'GET',
      headers:{Authorization:'Bearer '+state.key,...(body?{'Content-Type':'application/json'}:{})},
      body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit'});
    let data;try{data=await response.json();}catch{throw Error('伺服器回應無效');}
    if(!response.ok)throw Error(data.error||'連線失敗');
    return data;
  }
  const placeholder=(id,msg)=>{$(id).replaceChildren(node('p','hint',msg));};
  const showError=e=>status('錯誤：'+e.message);
  function addButton(parent,label,onClick,css='secondary'){
    const btn=node('button',css,label);btn.type='button';btn.addEventListener('click',onClick);parent.append(btn);return btn;
  }
  async function loadPosts(){
    state.currentPost=null;state.comments=[];placeholder('posts','正在讀取貼文…');clear('comments');$('selected').textContent='先選擇一則貼文';
    try{
      const res=await api('posts?network='+state.network);state.posts=res.posts||[];
      clear('posts');if(!state.posts.length)placeholder('posts','沒有可讀取的近期貼文');
      state.posts.forEach(post=>{
        const box=node('div','entry'),p=node('p','',post.text||'（沒有文字的貼文）');box.append(p);
        box.append(node('small','',post.timestamp||''));
        if(post.url&&/^https:\/\//.test(post.url)){const a=node('a','', ' 開啟原貼文');a.href=post.url;a.target='_blank';a.rel='noopener noreferrer';box.append(a);}
        addButton(box,'查看留言',()=>selectPost(post));$('posts').append(box);
      });
    }catch(e){placeholder('posts','讀取失敗：'+e.message);showError(e)}
  }
  async function selectPost(post){
    state.currentPost=post;$('selected').textContent=(post.text||'（圖片貼文）').slice(0,130);
    placeholder('comments','正在讀取留言…');
    try{
      const res=await api('comments?network='+state.network+'&postId='+encodeURIComponent(post.id));state.comments=res.comments||[];
      clear('comments');if(!state.comments.length)placeholder('comments','這篇貼文目前沒有可讀取的留言');
      state.comments.forEach(comment=>drawComment(post,comment));
    }catch(e){placeholder('comments','讀取失敗：'+e.message);showError(e)}
  }
  function drawComment(post,comment){
    const box=node('div','entry');box.append(node('strong','',comment.author),node('p','',comment.text),node('small','',comment.timestamp||''));
    const label=node('label','draft-label','AI 回覆草稿（可自行修改）');const area=node('textarea');area.placeholder='輸入想回覆的內容，或點「AI 擬稿」';label.append(area);box.append(label);
    const action=node('div','actions');
    const draftBtn=addButton(action,'AI 擬稿',async()=>{
      draftBtn.disabled=true;try{const data=await api('draft',{network:state.network,postId:post.id,commentId:comment.id});area.value=data.draft;status('已產生草稿，請審核後再發布。');}catch(e){showError(e)}finally{draftBtn.disabled=false}
    });
    const sendBtn=addButton(action,'確認並回覆',async()=>{
      const text=area.value.trim();if(!text)return status('請先填寫回覆內容');
      if(!confirm(`確定公開回覆 ${comment.author} 的這則留言？\n\n${text}`))return;
      sendBtn.disabled=true;draftBtn.disabled=true;
      try{
        const result=await api('reply',{network:state.network,postId:post.id,commentId:comment.id,text,confirmed:true});
        status('已發布。回覆 ID：'+result.remoteId);sendBtn.textContent='已發布';
      }catch(e){showError(e);sendBtn.textContent='請查紀錄';}finally{draftBtn.disabled=false}
    },'');
    box.append(action);$('comments').append(box);
  }
  async function loadHistory(){
    placeholder('history','載入中…');try{
      const res=await api('history');clear('history');if(!res.replies.length)placeholder('history','目前沒有發布紀錄');
      res.replies.forEach(row=>{const box=node('div','entry');box.append(node('strong','',row.network+' · '+row.state),node('p','',row.content),node('small','',row.createdAt+' ｜ '+(row.remoteId||'尚無確認的遠端 ID')));$('history').append(box);});
    }catch(e){placeholder('history',e.message);showError(e)}
  }
  $('connect').addEventListener('click',async()=>{
    state.key=$('key').value.trim();$('key').value='';
    try{const x=await api('status');status('連線成功｜Threads '+(x.networks.threads?'已設定':'未設定')+'｜Facebook '+(x.networks.facebook?'已設定':'未設定')+'｜AI '+(x.ai?'可用':'未設定'));await loadPosts();}
    catch(e){state.key='';showError(e);placeholder('posts','尚未授權')}
  });
  $('forget').addEventListener('click',()=>{state.key='';state.posts=[];state.comments=[];state.currentPost=null;clear('history');clear('comments');placeholder('posts','已清除授權');status('授權已清除');});
  for(const network of ['threads','facebook'])$(network).addEventListener('click',()=>{
    state.network=network;
    for(const n of ['threads','facebook']){$(n).classList.toggle('active',n===network);$(n).setAttribute('aria-pressed',String(n===network));}
    if(state.key)void loadPosts();
  });
  $('refresh').addEventListener('click',()=>void loadPosts());
  $('historyButton').addEventListener('click',()=>void loadHistory());
  $('publish').addEventListener('click',async()=>{
    const text=$('postText').value.trim(),imageUrl=$('postImage').value.trim();
    if(!text)return status('請先輸入貼文內容');
    if(!confirm(`確定公開發布到 ${state.network}？\n\n${text}`))return;
    const btn=$('publish');btn.disabled=true;
    const requestId=crypto.randomUUID(); // One ID for this click: do not retry ambiguous sends.
    try{
      const result=await api('publish',{network:state.network,text,imageUrl,requestId,confirmed:true});
      status('新貼文發布成功：'+result.remoteId);$('postText').value='';$('postImage').value='';
      await loadPosts();
    }catch(e){showError(e);status('發布可能未完成，請先查平台與發布紀錄，不要重複按下發布。 '+e.message);}
    finally{btn.disabled=false;}
  });
})();