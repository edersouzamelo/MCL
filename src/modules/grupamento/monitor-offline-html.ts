type CapturedHtmlFrame = { html: string; label: string };

export function buildOfflineHtml(monitorId: number, frames: CapturedHtmlFrame[], delaySeconds: number) {
  const generatedAt = new Date().toISOString();
  const safeFrames = JSON.stringify(frames).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>MCL Monitor ${String(monitorId).padStart(2, "0")} Offline</title>
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#020617}
body{font-family:Arial,sans-serif}
#stage{position:fixed;inset:0;overflow:hidden;background:#020617}
#surface{position:absolute;left:50%;top:50%;width:1920px;height:1080px;transform-origin:center center;opacity:1;transition:opacity 320ms cubic-bezier(.22,1,.36,1);will-change:transform,opacity}
#surface>main{width:1920px!important;height:1080px!important;max-width:none!important;max-height:none!important}
@keyframes mclMonitorBarReveal{from{transform:scaleX(0)}to{transform:scaleX(1)}}
#surface .mcl-broadcast-bar{animation:mclMonitorBarReveal 1.2s cubic-bezier(.16,1,.3,1) both}
#controls{position:fixed;left:50%;top:18px;transform:translateX(-50%);display:flex;gap:4px;z-index:12;padding:4px 8px;border:1px solid rgba(125,211,252,.18);border-radius:999px;background:rgba(2,6,23,.72);backdrop-filter:blur(8px)}
#controls button{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:0;border-radius:999px;background:rgba(255,255,255,.06);color:#dbeafe;font:700 14px Arial,sans-serif;cursor:pointer}
#controls button[aria-pressed="true"]{background:rgba(56,189,248,.25)}
#controls button:hover{background:rgba(56,189,248,.14)}
#badge{position:fixed;right:10px;bottom:8px;padding:4px 7px;border-radius:5px;background:rgba(2,6,23,.68);color:rgba(255,255,255,.72);font:10px Arial,sans-serif;letter-spacing:.05em;z-index:10}
</style>
</head>
<body>
<div id="stage" aria-label="Exibição offline do MCL"><div id="surface"></div></div>
<div id="controls" aria-label="Controles da apresentação">
  <button id="prev" type="button" aria-label="Voltar quadro" title="Voltar quadro"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m19 20-9-8 9-8z"/><path d="M5 19V5"/></svg></button>
  <button id="pause" type="button" aria-label="Pausar apresentação" title="Pausar no quadro atual" aria-pressed="false"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg></button>
  <button id="play" type="button" aria-label="Reproduzir apresentação" title="Retomar do quadro atual" aria-pressed="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 3 14 9-14 9z"/></svg></button>
  <button id="stop" type="button" aria-label="Parar apresentação" title="Parar e voltar ao primeiro quadro" aria-pressed="false"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/></svg></button>
  <button id="nextBtn" type="button" aria-label="Avançar quadro" title="Avançar quadro"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 4 9 8-9 8z"/><path d="M19 5v14"/></svg></button>
</div>
<div id="badge">MCL OFFLINE · Monitor ${String(monitorId).padStart(2, "0")} · gerado ${generatedAt}</div>
<script>
const frames=${safeFrames};
const delay=${Math.max(5, delaySeconds) * 1000};
const stage=document.getElementById("stage");
const surface=document.getElementById("surface");
const prevButton=document.getElementById("prev");
const pauseButton=document.getElementById("pause");
const playButton=document.getElementById("play");
const stopButton=document.getElementById("stop");
const nextButton=document.getElementById("nextBtn");
let index=0;
let playing=true;
let timer=null;
let transition=null;
function fit(){
  const scale=Math.min(window.innerWidth/1920,window.innerHeight/1080);
  surface.style.transform="translate(-50%,-50%) scale("+scale+")";
}
function mount(frame){
  surface.innerHTML=frame.html;
  stage.setAttribute("aria-label",frame.label||"MCL");
}
function show(target){
  if(!frames.length)return;
  if(transition)clearTimeout(transition);
  index=(target+frames.length)%frames.length;
  surface.style.opacity="0";
  transition=setTimeout(()=>{
    mount(frames[index]);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{surface.style.opacity="1"}));
  },320);
}
function schedule(){
  if(timer)clearInterval(timer);
  if(playing&&frames.length>1)timer=setInterval(()=>show(index+1),delay);
}
prevButton.addEventListener("click",()=>{show(index-1);schedule()});
nextButton.addEventListener("click",()=>{show(index+1);schedule()});
function playback(value,stopped=false){
  playing=value;
  pauseButton.setAttribute("aria-pressed",String(!value&&!stopped));
  playButton.setAttribute("aria-pressed",String(value));
  stopButton.setAttribute("aria-pressed",String(stopped));
  schedule();
}
pauseButton.addEventListener("click",()=>playback(false));
playButton.addEventListener("click",()=>playback(true));
stopButton.addEventListener("click",()=>{playback(false,true);show(0)});
if(frames.length)mount(frames[0]);
fit();
window.addEventListener("resize",fit);
schedule();
</script>
</body>
</html>`;
}
