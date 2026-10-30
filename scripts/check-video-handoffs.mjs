#!/usr/bin/env node
/** Local video handoff integrity check. No network access and no Meta posting. */
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';
import {loadLocalVideoHandoffs} from '../local-publisher/video.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const stateDir=resolve(process.env.SOCIAL_VIDEO_OUTBOX_DIR||join(root,'.crew-social-agent','video-check'));
const {items,errors}=await loadLocalVideoHandoffs({repoRoot:root,stateDir,env:process.env});
for(const item of items)console.log(JSON.stringify({id:item.entry.id,status:item.entry.status,platforms:item.networks,
  bytes:item.mediaInfo.fileSize,width:item.mediaInfo.width,height:item.mediaInfo.height,fps:item.mediaInfo.fps,
  durationSeconds:item.mediaInfo.durationSeconds,videoCodec:item.mediaInfo.videoCodec,audioCodec:item.mediaInfo.audioCodec,
  sha256:item.sha256,verified:true,publishPermitted:item.entry.publish_permitted}));
for(const error of errors)console.log(JSON.stringify({id:error.postId,file:error.file,verified:false,reason:error.reason}));
console.log(`Video handoffs verified: ${items.length}; invalid: ${errors.length}; no Meta posting attempted.`);
if(errors.length)process.exitCode=1;
