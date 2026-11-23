#!/usr/bin/env python3
import math, os, glob, subprocess
from PIL import Image, ImageDraw, ImageFont
import numpy as np

OUT=os.environ.get("OUT","/tmp/koolo-render")
os.makedirs(OUT,exist_ok=True)
W,H,FPS,DUR=720,1280,20,21.5
SEG=DUR/8
WHITE=(249,248,244); GOLD=(245,196,115); MUTED=(172,183,204); SKY=(151,199,214)
def find_font(bold=False):
    pats=[
      "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc" if bold else "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
      "/usr/share/fonts/opentype/noto/NotoSansCJK-*.ttc",
      "/usr/share/fonts/truetype/noto/NotoSansCJK-*.ttc",
    ]
    for p in pats:
      if "*" in p:
        g=glob.glob(p)
        if g:return g[0]
      elif os.path.exists(p):return p
    return "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR=find_font(False); FB=find_font(True); cache={}
def font(n,b=True):
    k=(n,b)
    if k not in cache: cache[k]=ImageFont.truetype(FB if b else FR,n)
    return cache[k]
def clamp(x):return max(0,min(1,x))
def ease(x):x=clamp(x);return 1-(1-x)**3
def text(img,s,x,y,size=54,c=WHITE,b=True,a=1,anchor="la"):
    if a<=0:return
    d=ImageDraw.Draw(img,"RGBA"); col=(*c,int(255*clamp(a)))
    d.text((x,y),s,font=font(size,b),fill=col,anchor=anchor)
def rr(img,box,r,fill,outline=None,w=1):
    ImageDraw.Draw(img,"RGBA").rounded_rectangle(box,radius=r,fill=fill,outline=outline,width=w)
Y,X=np.mgrid[0:H,0:W]
v=(X-W/2)**2/(W*W)+(Y-H*.38)**2/(H*H)
stripe=((X+Y*.64)%13)<1.2
rng=np.random.default_rng(23)
noise=rng.normal(0,1.0,(H,W))
col=np.zeros((H,W,3),dtype=np.float32)
col[:,:,0]=13+np.maximum(0,5-v*15)+stripe*2+noise
col[:,:,1]=20+np.maximum(0,5-v*14)+stripe*2+noise
col[:,:,2]=37+np.maximum(0,12-v*19)+stripe*3+noise
col[Y>=1055]=[6,10,21]
BASE=Image.fromarray(np.clip(col,0,255).astype(np.uint8),"RGB").convert("RGBA")
def base(scene,t):
    im=BASE.copy(); d=ImageDraw.Draw(im,"RGBA")
    d.rectangle((0,0,10,1055),fill=(*GOLD,255)); d.rectangle((44,100,676,103),fill=(*GOLD,120))
    text(im,"KOOLO  /  EXPLAINED",46,61,18,GOLD,True); text(im,f"0{scene+1}  /  08",676,62,19,MUTED,True,anchor="ra")
    d.rectangle((0,1055,W,H),fill=(7,10,20,255))
    text(im,"KOOLO   •   AI CONVERSATION",45,1120,19,GOLD,True)
    text(im,"KOOLO.APP",45,1188,31,WHITE,True)
    text(im,"21.5-SECOND STORY",676,1188,17,MUTED,True,anchor="ra")
    d.rounded_rectangle((44,1232,676,1238),3,fill=(51,62,84,255))
    prog=(scene+t/SEG)/8
    d.rounded_rectangle((44,1232,int(44+632*prog),1238),3,fill=(*GOLD,255))
    return im
def scene(im,i,t):
    d=ImageDraw.Draw(im,"RGBA"); e=ease((t-.10)/.45)
    if i==0:
      text(im,"TECH  /  LANGUAGE",52,180,24,GOLD); text(im,"AI",28,520,245,WHITE,True,e,anchor="lm")
      d.line((60,654,660,654),fill=(*GOLD,180),width=3)
      text(im,"都這麼聰明了",60,745,67,WHITE,True,ease((t-.45)/.45))
      text(im,"人類卻還卡在第一句？",60,845,39,MUTED,True,ease((t-.9)/.4))
    elif i==1:
      text(im,"THE QUESTION",52,180,25,GOLD); text(im,"?",438,410,430,(56,69,95),True,.3,anchor="mm")
      text(im,"為什麼",52,390,98,WHITE,True,e)
      text(im,"英文",52,535,130,GOLD,True,ease((t-.35)/.45))
      text(im,"還是說不出口？",52,700,70,WHITE,True,ease((t-.7)/.45))
      rr(im,(50,865,666,950),18,(32,43,62,255),(*GOLD,155),2); text(im,"學了好多年   /   開口還是很難",73,906,33,MUTED)
    elif i==2:
      text(im,"MYTH  01",52,180,25,GOLD); text(im,"不是你",50,330,82,WHITE); text(im,"單字背太少",50,455,86,WHITE)
      for j,s in enumerate(["VOCABULARY","GRAMMAR","REVIEW"]):
        a=ease((t-.35-j*.15)/.35); y=630+j*96
        rr(im,(50,y,660,y+75),16,(37,48,66,int(255*a)),(*SKY,int(110*a)),2); text(im,s,78,y+37,31,MUTED,True,a,anchor="lm")
      text(im,"真正缺的，不在這裡",50,970,31,GOLD,True,ease((t-1.45)/.4))
    elif i==3:
      text(im,"THE REAL BOTTLENECK",52,180,24,GOLD); text(im,"真正少的是",50,330,62,WHITE)
      text(im,"開口",45,520,140,GOLD,True,e,anchor="lm"); text(im,"的時間",46,665,96,WHITE,True,ease((t-.4)/.4),anchor="lm")
      text(im,"SPEAKING TIME",52,830,24,MUTED)
      for k in range(28):
        x=65+k*20; h=(12+80*(math.sin(k*.7+.7)**2))*ease((t-.8-k*.02)/.35)
        d.rounded_rectangle((x,925-h/2,x+11,925+h/2),5,fill=(*GOLD,210))
    elif i==4:
      text(im,"INPUT   VS   PRACTICE",52,180,24,GOLD); text(im,"兩件不同的事",53,330,66,WHITE)
      rr(im,(51,445,669,625),22,(25,36,55,255),(90,105,126,160),2); text(im,"看影片",170,535,62,MUTED,anchor="lm"); text(im,"輸入",548,535,40,MUTED,anchor="lm")
      rr(im,(51,665,669,855),22,(37,47,60,255),(*GOLD,255),3); text(im,"開口對話",170,760,60,WHITE,anchor="lm"); text(im,"練習",548,760,40,GOLD,anchor="lm")
      text(im,"關鍵不是再看一遍，而是說一遍。",52,950,29,MUTED)
    elif i==5:
      text(im,"SO I BUILT IT",52,180,25,GOLD); text(im,"所以，我做了",49,350,62,WHITE)
      text(im,"Koolo",30,570,145,GOLD,True,e,anchor="lm"); text(im,"酷囉",54,705,78,WHITE,True,ease((t-.35)/.4),anchor="lm")
      d.line((54,790,650,790),fill=(*GOLD,200),width=4); text(im,"一個可以開口練習的地方",53,875,44,WHITE)
    elif i==6:
      text(im,"CONVERSATION STARTS HERE",50,180,22,GOLD); text(im,"跟 Zoe 聊聊",51,330,82,WHITE)
      rr(im,(50,430,669,925),28,(20,31,49,255),(*SKY,90),2)
      rr(im,(70,455,649,520),18,(36,51,72,255)); d.ellipse((92,467,132,507),fill=(*GOLD,255)); text(im,"Zoe",148,487,31,WHITE,anchor="lm")
      rr(im,(82,565,605,660),20,(50,65,82,255)); text(im,"Hi! How was your day?",101,612,28,WHITE,anchor="lm")
      rr(im,(138,695,633,790),20,(128,92,51,255)); text(im,"Pretty good!",160,742,33,WHITE,anchor="lm")
      text(im,"不怕說錯，先敢開口。",51,970,35,GOLD)
    else:
      text(im,"YOUR NEXT FIRST SENTENCE",52,180,22,GOLD); text(im,"不用下載",47,365,80,WHITE)
      text(im,"打開網站",47,485,80,WHITE); text(im,"就開始聊",47,610,90,GOLD)
      rr(im,(50,755,669,890),24,(226,179,103,255)); text(im,"koolo.app",359,825,64,(13,20,35),True,1,"mm")
      text(im,"AI 朋友   •   語言練習   •   免費體驗",360,955,27,MUTED,True,1,"mm")
    return im.convert("RGB")
cmd=["ffmpeg","-hide_banner","-loglevel","error","-y","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","-","-an","-c:v","libx264","-preset","veryfast","-crf","20","-pix_fmt","yuv420p","-movflags","+faststart",os.path.join(OUT,"visual.mp4")]
p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for n in range(int(FPS*DUR)):
    sec=n/FPS; i=min(7,int(sec/SEG)); t=sec-i*SEG
    p.stdin.write(scene(base(i,t),i,t).tobytes())
p.stdin.close()
if p.wait()!=0: raise SystemExit("ffmpeg render failed")
print(os.path.join(OUT,"visual.mp4"))
