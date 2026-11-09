import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseCsv,renderPilotReport} from "../scripts/growth-pilot-report.mjs";

const original=readFileSync(new URL("../content/experiments/2026-11-05-to-18/metrics.csv",import.meta.url),"utf8");
const header=original.split("\n")[0]+"\n";
const row=(values={})=>{
 const fields={
  date:"2026-11-09",content_id:"post-01",platform:"threads",topic_class:"development",
  copy_length_band:"short",media_type:"text",scheduled_at:"",
  published_at:"2026-11-09T10:00:00+08:00",remote_url:"https://example.org/post",
  non_follower_reach:"300",comments:"2",shares:"1",new_followers:"0",website_clicks:"9",
  followers_per_1000_non_follower_reach:"",data_source:"Meta Insights",
  observed_at:"2026-11-10T10:00:00+08:00",post_age_hours:"24",status:"published",notes:"",
  ...values
 };
 return header.trim().split(",").map(key=>'"'+String(fields[key]??"").replaceAll('"','""')+'"').join(",")+"\n";
};

test("blank real pilot CSV never produces invented growth",()=>{
 const report=renderPilotReport(original);
 assert.match(report,/CSV 紀錄：0 筆/);
 assert.match(report,/目前沒有符合驗證條件/);
 assert.match(report,/待匯出／授權/);
});

test("report includes only confirmed published rows and separately reports missing metrics",()=>{
 const report=renderPilotReport(header+
  row()+row({content_id:"post-02",platform:"facebook",data_source:"",observed_at:"",non_follower_reach:"0"})+
  row({content_id:"post-03",status:"pending_local_publisher",remote_url:"",published_at:""}));
 assert.match(report,/CSV 紀錄：3 筆/);
 assert.match(report,/待確認：1 筆/);
 assert.match(report,/threads \| 1 \| 1\/1 篇，300–300/);
 assert.match(report,/facebook \| 1 \| 待取得 \(0\/1\)/);
 assert.doesNotMatch(report,/非粉絲觸及.*?0–0/);
});

test("quoted comma/newline fields parse without dropping post identity",()=>{
 const rows=parseCsv(header+row({notes:"actual, observed\nnot fabricated"}));
 assert.equal(rows[0].notes,"actual, observed\nnot fabricated");
 assert.equal(rows[0].content_id,"post-01");
});

test("duplicate published platform/content rows fail closed",()=>{
 assert.throws(()=>renderPilotReport(header+row()+row()),/Duplicated published record/);
});

test("non-numeric sourced metrics fail rather than being treated as zero",()=>{
 assert.throws(()=>renderPilotReport(header+row({website_clicks:"twelve"})),/Invalid website_clicks/);
});
