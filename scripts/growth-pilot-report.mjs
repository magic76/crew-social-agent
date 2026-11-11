import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {resolve} from "node:path";

export function parseCsv(source){
 const rows=[];let row=[],field="",quoted=false;
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(quoted){
   if(c==='"'&&source[i+1]==='"'){field+='"';i++;}
   else if(c==='"')quoted=false;
   else field+=c;
  }else if(c==='"'){
   if(field)throw Error("Unexpected quote in CSV field");
   quoted=true;
  }else if(c===','){row.push(field);field="";}
  else if(c==='\n'){
   row.push(field.replace(/\r$/,""));field="";
   if(row.some(v=>v!==""))rows.push(row);
   row=[];
  }else if(c!=='\r'){field+=c;}
 }
 if(quoted)throw Error("Unclosed quoted CSV field");
 if(field||row.length){row.push(field);if(row.some(v=>v!==""))rows.push(row);}
 if(!rows.length)throw Error("CSV header is missing");
 const header=rows.shift().map(s=>s.replace(/^\uFEFF/,""));
 const needed=["date","content_id","platform","topic_class","media_type","product_mentioned","published_at","remote_url","non_follower_reach","comments","shares","new_followers","website_clicks","data_source","observed_at","status"];
 for(const name of needed)if(!header.includes(name))throw Error("Missing CSV header: "+name);
 return rows.map((fields,i)=>{
  if(fields.length!==header.length)throw Error("CSV row "+(i+2)+" has "+fields.length+" fields, expected "+header.length);
  return Object.fromEntries(header.map((name,j)=>[name,fields[j]]));
 });
}

export function renderPilotReport(source){
 const rows=parseCsv(source);
 const verified=rows.filter(r=>r.status.trim().toLowerCase()==="published"&&r.published_at.trim()&&r.remote_url.trim());
 const keys=new Set();
 for(const row of verified){
  const mention=(row.product_mentioned||"").trim().toLowerCase();
  if(mention&&!["true","false"].includes(mention))throw Error("Invalid product_mentioned for "+row.content_id);
 }
 for(const row of verified){
  const key=row.platform+"/"+row.content_id;
  if(keys.has(key))throw Error("Duplicated published record: "+key);
  keys.add(key);
 }
 const fmt=(v)=>v===null?"待取得":String(v);
 const numeric=(r,key)=>{
  const raw=r[key]?.trim();
  if(!raw||!r.data_source?.trim()||!r.observed_at?.trim())return null;
  if(!/^\d+(?:\.\d+)?$/.test(raw))throw Error("Invalid "+key+" for "+r.content_id);
  const n=Number(raw);
  if(!Number.isFinite(n))throw Error("Invalid numeric value");
  return n;
 };
 const metrics=["non_follower_reach","comments","shares","new_followers","website_clicks"];
 const summary=(subset,key)=>{
  const values=subset.map(r=>numeric(r,key)).filter(v=>v!==null);
  if(!values.length)return "待取得 (0/"+subset.length+")";
  return (values.length+"/"+subset.length)+" 篇，"+fmt(Math.min(...values))+"–"+fmt(Math.max(...values));
 };
 const platforms=["facebook","threads"];
 let out="# Crew Lab SI 內容成效實驗｜資料核實報告\n\n";
 out+="資料範圍：CSV 中實際記錄的觀測資料；此工具**不連接 Meta、Search Console、GA4 或 Cloudflare**。\n\n";
 out+="- CSV 紀錄："+rows.length+" 筆；有明確 `published`、發文時間及遠端連結："+verified.length+" 筆；待確認："+(rows.length-verified.length)+" 筆。\n";
 out+="- 每一列代表一則貼文在一個平台的觀測；FB 與 Threads 不合併成獨立題材篇數。\n";
 out+="- 數值欄位需同時具有 `data_source` 與 `observed_at` 才視為可驗證；下表是每篇的觀測值範圍，**不是因果提升或轉換率**。\n\n";
 out+="| 平台 | 已確認發文 | 非粉絲觸及 | 留言 | 分享 | 新追蹤 | 網站點擊 |\n| --- | ---: | --- | --- | --- | --- | --- |\n";
 for(const platform of platforms){
  const found=verified.filter(r=>r.platform.trim().toLowerCase()===platform);
  out+="| "+platform+" | "+found.length+" | "+metrics.map(m=>summary(found,m)).join(" | ")+" |\n";
 }
 out+="\n## 題材與媒體分布（只統計已確認發文）\n\n";
 if(!verified.length)out+="目前沒有符合驗證條件的發文紀錄。**不得推論觸及、流量、貼文表現或成長。**\n";
 else{
  out+="| 平台 | 題材 | 媒體 | 篇數 | 網站點擊（觀測範圍） |\n| --- | --- | --- | ---: | --- |\n";
  const groups=new Map();
  for(const r of verified){
   const key=[r.platform.trim().toLowerCase(),r.topic_class.trim()||"未分類",r.media_type.trim()||"未知"].join(" / ");
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(r);
  }
  for(const [key,group] of [...groups.entries()].sort(([a],[b])=>a.localeCompare(b))){
   const [platform,topic,media]=key.split(" / ");
   out+="| "+[platform,topic,media,group.length,summary(group,"website_clicks")].join(" | ")+" |\n";
  }
 }
 out+="\n## 正文網站／產品提及與實際流量（只統計已確認發文）\n\n";
 const knownMentions=verified.filter(r=>["true","false"].includes((r.product_mentioned||"").trim().toLowerCase()));
 const unknownMentions=verified.length-knownMentions.length;
 if(!knownMentions.length)out+="目前沒有可用的提及標記；歷史或空白標記維持未知，不當成未提及。\n";
 else{
  out+="| 平台 | 正文／產品連結提及 | 篇數 | 非粉絲觸及 | 新追蹤 | 網站點擊 |\n| --- | --- | ---: | --- | --- | --- |\n";
  for(const platform of platforms){
   for(const value of ["true","false"]){
    const group=knownMentions.filter(r=>r.platform.trim().toLowerCase()===platform&&(r.product_mentioned||"").trim().toLowerCase()===value);
    if(group.length)out+="| "+platform+" | "+(value==="true"?"有":"沒有")+" | "+group.length+" | "+summary(group,"non_follower_reach")+" | "+summary(group,"new_followers")+" | "+summary(group,"website_clicks")+" |\n";
   }
  }
  out+="\n可分類 "+knownMentions.length+"/"+verified.length+" 篇；提及狀態未知 "+unknownMentions+" 篇。這是平台內的描述性對照，不代表提及造成觸及或點擊變化。\n";
 }
 out+="\n## 尚未直接取得的資料\n\n";
 out+="- Search Console：自然曝光、自然點擊、索引狀態 — **待匯出／授權**。\n";
 out+="- GA4：UTM source/medium/campaign、session 與同工作階段有效產品互動 — **待匯出／授權**。\n";
 out+="- Cloudflare：匿名使用事件與有效互動 — **待匯出／授權**；不可與 GA4 session 或 Meta 觸及相除。\n";
 out+="- Meta Insights：若上述 CSV 留白，代表指標**未取得**；不能把缺漏當成 0。\n\n";
 out+="請只比較同平台、相近貼文齡、題材及發布時段的真實觀測，不以少量案例宣稱因果成長。\n";
 return out;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const input=process.argv[2]||"content/experiments/2026-11-05-to-18/metrics.csv";
 try{process.stdout.write(renderPilotReport(readFileSync(input,"utf8")));}
 catch(error){console.error("Growth report error: "+error.message);process.exitCode=1;}
}
