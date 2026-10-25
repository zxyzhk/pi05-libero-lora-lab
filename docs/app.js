"use strict";
const $ = selector => document.querySelector(selector);
const NS = "http://www.w3.org/2000/svg";
const suiteOrder = ["libero_spatial", "libero_object", "libero_goal", "libero_10"];
const suiteNames = {libero_spatial:{zh:"空间",en:"Spatial"},libero_object:{zh:"物体",en:"Object"},libero_goal:{zh:"目标",en:"Goal"},libero_10:{zh:"长程",en:"LIBERO-10"}};
const chartState = {metric:"loss", points:[]};
function node(tag, className, text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
function svgNode(tag, attrs={}, text){const n=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))n.setAttribute(key,value);if(text!==undefined)n.textContent=text;return n;}
function asset(path){if(typeof path!=="string"||path.startsWith("/")||path.includes("..")||path.includes("://"))throw Error("无效的相对资源路径");return "assets/"+path;}
function setText(selector,text){const n=$(selector);if(n)n.textContent=text;}
function fixed(value,digits=2){return Number(value).toFixed(digits);}

function videoFigure(item, hero){
  const figure=node("figure",hero?"video-panel":"");
  if(hero){const top=node("div","video-top");top.append(node("span","",item.title_zh),node("span","video-badge","LIBERO-10 · 成功回合"));figure.append(top);}
  const video=node("video","");video.controls=true;video.muted=true;video.loop=true;video.playsInline=true;
  video.preload=hero?"metadata":"none";video.poster=asset(item.poster);video.src=asset(item.src);
  video.dataset.autoplay="true";video.setAttribute("aria-label",item.title_zh+"，本次评测的真实成功回合节选");
  figure.append(video);
  const caption=node("figcaption","");
  if(hero){caption.append(node("span","success-dot"),node("span","","成功回合节选"),node("span","",item.steps+" 控制步 · "+item.duration_seconds+" s 录像"));}
  else{caption.append(node("span","",suiteNames[item.suite].en.toUpperCase()+" / TASK "+String(item.task_id).padStart(2,"0")),node("h3","",item.title_zh),node("p","",item.instruction_en),node("span","demo-meta","成功回合节选 · "+item.steps+" 控制步 · trial "+String(item.trial_index).padStart(2,"0")));}
  figure.append(caption);return figure;
}

function renderVideos(showcase){
  const videos=showcase.videos;
  if(!Array.isArray(videos)||videos.length!==8||videos.some(v=>v.outcome!=="success"))throw Error("成功示例数据不完整");
  const hero=videos.filter(v=>v.hero).sort((a,b)=>(a.hero_order||0)-(b.hero_order||0));
  if(hero.length!==2||hero[0].task_id!==4||hero[1].task_id!==7)throw Error("首页演示与登记任务不符");
  for(const video of hero)$("#hero-videos").append(videoFigure(video,true));
  for(const video of videos.filter(v=>!v.hero))$("#showcase-gallery").append(videoFigure(video,false));
  $("#replay-hero").addEventListener("click",()=>{document.querySelectorAll("#hero-videos video").forEach(v=>{v.currentTime=0;v.play().catch(()=>{});});});
  if(!matchMedia("(prefers-reduced-motion: reduce)").matches&&"IntersectionObserver" in window){
    const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&!document.hidden)entry.target.play().catch(()=>{});else entry.target.pause();}},{threshold:.35});
    document.querySelectorAll("video[data-autoplay]").forEach(v=>observer.observe(v));
  }
  document.addEventListener("visibilitychange",()=>{if(document.hidden)document.querySelectorAll("video").forEach(v=>v.pause());});
}

function renderResults(summary){
  const aggregate=summary.aggregate;
  if(aggregate.episodes!==400||aggregate.successes!==371)throw Error("汇总结果不是已核验的400回合");
  setText("#lead-success",fixed(aggregate.success_rate*100)+"%");setText("#headline-success",fixed(aggregate.success_rate*100)+"%");
  setText("#headline-count",aggregate.successes+" / "+aggregate.episodes+" 次成功");setText("#overall-score",aggregate.successes+" / "+aggregate.episodes);
  setText("#overall-ci",aggregate.wilson95.map(v=>fixed(v*100)+"%").join("–"));
  for(const id of suiteOrder){const result=summary.suites.find(s=>s.suite===id);if(!result||result.episodes!==100)throw Error("套件结果不完整");
    const row=node("div","bar-row"),label=node("span","bar-label"),track=node("div","bar-track"),bar=node("div","bar"+(id==="libero_10"?" light":""));
    label.append(node("b","",suiteNames[id].zh+" / "+(id==="libero_10"?"Long":suiteNames[id].en)),node("small","",result.successes+" / "+result.episodes));
    bar.style.width=(result.success_rate*100)+"%";track.append(bar);track.setAttribute("role","img");track.setAttribute("aria-label",suiteNames[id].zh+"套件成功率"+fixed(result.success_rate*100,0)+"%");
    row.append(label,track,node("strong","",fixed(result.success_rate*100,0)+"%"));$("#suite-bars").append(row);
  }
}

function renderHeatmap(payload){
  const tasks=payload.tasks;if(!Array.isArray(tasks)||tasks.length!==40)throw Error("任务明细不完整");
  const grid=$("#task-heatmap");grid.append(node("span","heat-col","Task"));for(let task=0;task<10;task++)grid.append(node("span","heat-col",task));
  const info=$("#heatmap-info");
  for(const id of suiteOrder){grid.append(node("span","heat-label",id==="libero_10"?"Long":suiteNames[id].en));
    for(let task=0;task<10;task++){const result=tasks.find(t=>t.suite===id&&t.task_id===task);if(!result||result.episodes!==10)throw Error("任务回合数不完整");
      const cell=node("a","heat-cell",result.successes);cell.href="technical.html?suite="+encodeURIComponent(id)+"#tasks";
      const ratio=result.successes/10,color=[238,245,255].map((v,i)=>Math.round(v+([37,99,235][i]-v)*ratio));cell.style.backgroundColor="rgb("+color.join(",")+")";cell.style.color=ratio>=.7?"#fff":"#284773";
      const label=suiteNames[id].zh+" Task "+String(task).padStart(2,"0")+" · "+result.successes+"/10";
      cell.title=label+"\n"+result.instruction_en;cell.setAttribute("aria-label",label+"，"+result.instruction_en+"。查看完整套件。");
      const describe=()=>{info.replaceChildren(node("b","",label),node("p","",result.instruction_en));};cell.addEventListener("mouseenter",describe);cell.addEventListener("focus",describe);grid.append(cell);
    }
  }
}

function drawChart(){
  const points=chartState.points;if(!points.length)return;
  const metric=chartState.metric,names={loss:"训练 loss",grad_norm:"梯度范数"},svg=$("#training-chart"),wrap=$("#chart-wrap");
  const W=Math.max(260,wrap.clientWidth),compact=W<430,H=compact?255:300,L=45,R=13,T=31,B=36,pw=W-L-R,ph=H-T-B;
  const values=points.map(p=>p[metric]),range=Math.max(...values)-Math.min(...values)||1;
  const min=Math.max(0,Math.min(...values)-range*.1),max=Math.max(...values)+range*.12;
  const x=value=>L+value/9000*pw,y=value=>T+(1-(value-min)/(max-min))*ph;
  svg.setAttribute("viewBox",`0 0 ${W} ${H}`);svg.replaceChildren(svgNode("title",{id:"curve-title"},names[metric]+"真实日志曲线"),svgNode("desc",{id:"curve-desc"},"90个日志采样点，2501次更新后恢复，最后点为8901次更新。"));
  for(let i=0;i<=4;i++){const value=min+(max-min)*i/4,yy=y(value);svg.append(svgNode("line",{x1:L,y1:yy,x2:W-R,y2:yy,class:"svg-grid"}),svgNode("text",{x:L-8,y:yy+3,"text-anchor":"end",fill:"#8191a7"},fixed(value,3)));}
  for(const value of(compact?[0,3000,6000,9000]:[0,1500,3000,4500,6000,7500,9000]))svg.append(svgNode("text",{x:x(value),y:H-10,"text-anchor":"middle",fill:"#8191a7"},value===0?"0":value/1000+"k"));
  const resume=x(2501);svg.append(svgNode("line",{x1:resume,y1:T,x2:resume,y2:H-B,class:"svg-resume"}),svgNode("text",{x:resume+6,y:17,fill:"#7890b2"},"恢复 · 2,501"));
  const path=data=>data.map((p,i)=>(i?"L":"M")+x(p.updates).toFixed(2)+","+y(p[metric]).toFixed(2)).join(" ");
  svg.append(svgNode("path",{d:path(points),class:"svg-raw"}));
  if($("#smooth").checked){const smooth=points.map((p,i)=>({...p,[metric]:points.slice(Math.max(0,i-4),i+1).reduce((sum,q)=>sum+q[metric],0)/Math.min(i+1,5)}));svg.append(svgNode("path",{d:path(smooth),class:"svg-smooth"}));}
  const cursor=svgNode("g",{visibility:"hidden"}),line=svgNode("line",{y1:T,y2:H-B,stroke:"#8ba6ce","stroke-width":1,"stroke-dasharray":"3 4"}),dot=svgNode("circle",{r:4,fill:"#2563eb",stroke:"white","stroke-width":2});cursor.append(line,dot);svg.append(cursor);
  const overlay=svgNode("rect",{x:L,y:T,width:pw,height:ph,fill:"transparent",stroke:"none",tabindex:0,"aria-label":"训练曲线。左右方向键选择日志采样点。"});svg.append(overlay);let selected=points.length-1;
  function show(p){const xx=x(p.updates),yy=y(p[metric]);cursor.setAttribute("visibility","visible");line.setAttribute("x1",xx);line.setAttribute("x2",xx);dot.setAttribute("cx",xx);dot.setAttribute("cy",yy);const tip=$("#chart-tooltip");tip.replaceChildren(node("b","",p.updates.toLocaleString()+" 次更新"),document.createTextNode(names[metric]+" "+fixed(p[metric],4)));tip.hidden=false;tip.style.left=Math.max(4,Math.min(W-148,xx+10))+"px";tip.style.top=Math.max(0,yy-58)+"px";}
  const hide=()=>{cursor.setAttribute("visibility","hidden");$("#chart-tooltip").hidden=true;};
  overlay.addEventListener("pointermove",event=>{const rect=svg.getBoundingClientRect(),value=((event.clientX-rect.left)/rect.width*W-L)/pw*9000;selected=points.reduce((best,p,i)=>Math.abs(p.updates-value)<Math.abs(points[best].updates-value)?i:best,0);show(points[selected]);});
  overlay.addEventListener("pointerleave",hide);overlay.addEventListener("blur",hide);overlay.addEventListener("focus",()=>show(points[selected]));overlay.addEventListener("keydown",event=>{if(!["ArrowLeft","ArrowRight"].includes(event.key))return;event.preventDefault();selected=Math.max(0,Math.min(points.length-1,selected+(event.key==="ArrowLeft"?-1:1)));show(points[selected]);});
}

async function init(){
  try{
    const [summary,training,tasks,showcase]=await Promise.all(["summary","training","tasks","showcase"].map(async name=>{const response=await fetch("assets/"+name+".json");if(!response.ok)throw Error("项目数据暂不可用");return response.json();}));
    if(!Array.isArray(training.points)||training.points.length!==90)throw Error("训练曲线数据不完整");
    chartState.points=training.points;
    renderVideos(showcase);renderResults(summary);renderHeatmap(tasks);drawChart();
    document.querySelectorAll("[data-metric]").forEach(button=>button.addEventListener("click",()=>{chartState.metric=button.dataset.metric;document.querySelectorAll("[data-metric]").forEach(b=>{const selected=b===button;b.classList.toggle("selected",selected);b.setAttribute("aria-pressed",String(selected));});drawChart();}));
    $("#smooth").addEventListener("change",drawChart);let resizeFrame;window.addEventListener("resize",()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(drawChart);});
    document.documentElement.dataset.reportReady="true";
  }catch(error){const message=$("#data-message");message.textContent="交互数据暂时未能加载；可先查看实验报告与完整评测页。";message.hidden=false;console.error(error);}
}
init();
