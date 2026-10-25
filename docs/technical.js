"use strict";
const $=s=>document.querySelector(s);
const suites={libero_spatial:"Spatial",libero_object:"Object",libero_goal:"Goal",libero_10:"LIBERO-10"};
const pct=(n,d=0)=>(n*100).toFixed(d)+"%";
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const asset=path=>"assets/"+path;
let summary,tasks,episodes,page=0;
const perPage=12;
function renderTasks(){
 const chosen=$("#task-suite").value,selected=tasks.filter(t=>chosen==="all"||t.suite===chosen),body=$("#task-rows");body.replaceChildren();
 for(const t of selected){const tr=node("tr"),identity=node("td","",suites[t.suite]);identity.append(node("span","task-id","TASK "+String(t.task_id).padStart(2,"0")));const language=node("td","",t.instruction_en),count=node("td","task-score",t.successes+" / "+t.episodes),rate=node("td","",pct(t.success_rate)),ci=node("td","task-ci",t.wilson95.map(x=>pct(x,1)).join("–")),watchCell=node("td"),watch=node("button","watch-task","看 10 回合 ↗");watch.type="button";watch.setAttribute("aria-label","观看"+suites[t.suite]+"任务"+t.task_id+"的10回合");watch.addEventListener("click",()=>{$("#gallery-suite").value=t.suite;$("#gallery-task").value=String(t.task_id);$("#gallery-outcome").value="all";page=0;renderGallery();$("#gallery").scrollIntoView({behavior:"smooth",block:"start"});});watchCell.append(watch);tr.append(identity,language,count,rate,ci,watchCell);body.append(tr);}
 $("#task-count").textContent=selected.length+" 个任务 · "+selected.reduce((a,t)=>a+t.episodes,0)+" 回合";
}
function selectedEpisodes(){const suite=$("#gallery-suite").value,task=$("#gallery-task").value,outcome=$("#gallery-outcome").value;return episodes.filter(e=>(suite==="all"||e.suite===suite)&&(task==="all"||e.task_id===Number(task))&&(outcome==="all"||(outcome==="success")===e.success));}
function renderGallery(){
 const selected=selectedEpisodes(),pages=Math.max(1,Math.ceil(selected.length/perPage));page=Math.min(Math.max(page,0),pages-1);const grid=$("#episode-grid");grid.replaceChildren();
 for(const e of selected.slice(page*perPage,(page+1)*perPage)){const figure=node("figure","episode-card"),video=node("video");video.controls=true;video.muted=true;video.playsInline=true;video.preload="none";if(e.video.poster)video.poster=asset(e.video.poster);video.src=asset(e.video.src);video.setAttribute("aria-label",suites[e.suite]+"任务"+e.task_id+"第"+e.trial_index+"回合，"+(e.success?"成功":"未完成"));const caption=node("figcaption"),identity=node("div","episode-identity");identity.append(node("span","",suites[e.suite]+" · "+String(e.task_id).padStart(2,"0")+" / "+String(e.trial_index).padStart(2,"0")),node("span","episode-outcome"+(e.success?"":" incomplete"),e.success?"任务完成":"未完成"));const title=node("h3","",e.instruction_en),meta=node("div","episode-meta"),download=node("a","","原始录像 ↓");download.href=asset(e.video.src);download.download="";meta.append(node("span","",e.control_steps+" 控制步"),node("span","",e.video.playback_seconds.toFixed(1)+" s 回放"),download);caption.append(identity,title,meta);figure.append(video,caption);grid.append(figure);}
 if(!selected.length)grid.append(node("p","empty-gallery","当前筛选没有匹配回合。"));$("#gallery-count").textContent=selected.length+" 个回合";$("#page-label").textContent=(page+1)+" / "+pages;$("#page-prev").disabled=page===0;$("#page-next").disabled=page===pages-1;
}
const ns="http://www.w3.org/2000/svg";
function svgNode(tag,attributes,text){const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attributes))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
function renderTiming(){
 const whole=summary.timing.full_controller_wall_seconds;$("#evaluation-total").textContent=Math.floor(whole/60)+"m "+(whole%60).toFixed(2)+"s";
 const valid=episodes.map(e=>e.observed_timing).filter(t=>t.observation_batch_size===1).map(t=>t.episode_wall_seconds_observed_interval).filter(Number.isFinite).sort((a,b)=>a-b);
 if(!valid.length)throw Error("缺少实际观察计时");const q=p=>{const x=(valid.length-1)*p,lo=Math.floor(x),hi=Math.ceil(x);return valid[lo]+(valid[hi]-valid[lo])*(x-lo);};$("#interval-mean").textContent=(valid.reduce((a,b)=>a+b,0)/valid.length).toFixed(2)+" s";$("#interval-p50").textContent=q(.5).toFixed(2)+" s";$("#interval-p95").textContent=q(.95).toFixed(2)+" s";
 const max=Math.max(...summary.suites.map(s=>s.evaluation_seconds));for(const s of summary.suites){const row=node("div","suite-time-row"),track=node("div","track"),fill=node("div","fill");fill.style.width=s.evaluation_seconds/max*100+"%";track.append(fill);row.append(node("span","",suites[s.suite]),track,node("b","",(s.evaluation_seconds/60).toFixed(2)+" min"));$("#suite-time-bars").append(row);}
 const bins=[0,3,6,9,12,15,20,30,Infinity],counts=bins.slice(0,-1).map((lo,i)=>valid.filter(x=>x>=lo&&x<bins[i+1]).length),peak=Math.max(...counts),svg=$("#timing-histogram"),W=920,H=240,left=44,right=15,top=22,bottom=37,cw=(W-left-right)/counts.length,plotH=H-top-bottom;svg.replaceChildren();svg.append(svgNode("title",{},"400回合完成观察间隔分布"));
 for(let i=0;i<=3;i++){const y=top+plotH-i/3*plotH;svg.append(svgNode("line",{x1:left,y1:y,x2:W-right,y2:y,stroke:"#e5edf7"}),svgNode("text",{x:left-10,y:y+4,fill:"#8291a7","font-size":11,"text-anchor":"end"},Math.round(peak*i/3)));}
 counts.forEach((n,i)=>{const x=left+i*cw+cw*.12,h=n/peak*plotH,y=top+plotH-h,bar=svgNode("rect",{x,y,width:cw*.76,height:Math.max(0,h),rx:4,fill:i<5?"#5086e4":"#a7c3ef"});bar.append(svgNode("title",{},n+" 个回合"));const label=i===counts.length-1?"30+":bins[i]+"–"+bins[i+1];svg.append(bar,svgNode("text",{x:x+cw*.38,y:Math.max(top-4,y-8),fill:"#395a8c","font-size":12,"text-anchor":"middle"},n),svgNode("text",{x:x+cw*.38,y:H-12,fill:"#6c7e98","font-size":11,"text-anchor":"middle"},label));});
}
async function init(){try{
 const result=await Promise.all(["summary","tasks","episodes"].map(async name=>{const response=await fetch(asset(name+".json"));if(!response.ok)throw Error(name+"数据加载失败");return response.json();}));summary=result[0];tasks=result[1].tasks;episodes=result[2].episodes;if(summary.aggregate.episodes!==400||tasks.length!==40||episodes.length!==400)throw Error("评测数据不完整");
 const query=new URLSearchParams(location.search),initial=query.get("suite");if(initial&&Object.hasOwn(suites,initial)){$("#task-suite").value=initial;$("#gallery-suite").value=initial;}
 for(let i=0;i<10;i++){const option=node("option","","任务 "+String(i).padStart(2,"0"));option.value=String(i);$("#gallery-task").append(option);}$("#task-suite").addEventListener("change",renderTasks);for(const id of ["gallery-suite","gallery-task","gallery-outcome"])$("#"+id).addEventListener("change",()=>{page=0;renderGallery();});$("#page-prev").addEventListener("click",()=>{page--;renderGallery();});$("#page-next").addEventListener("click",()=>{page++;renderGallery();});renderTasks();renderGallery();renderTiming();document.documentElement.dataset.reportReady="true";
 }catch(error){$("#data-message").hidden=false;$("#data-message").textContent="实验数据暂时未能加载，请刷新页面或从GitHub仓库读取。";console.error(error);}}
init();
