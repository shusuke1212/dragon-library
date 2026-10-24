import{loadRegionPackage,clonePackageSection,packageStorageKey}from'./core/package-runtime.js';
import{renderTerrainBitmap}from'./core/terrain-engine.js';
import{evaluatePlacement,candidateCells,distanceKm,summarizePlacements}from'./core/placement-engine.js';
import{analyzeHintGraph}from'./core/hint-graph.js';

const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const canvas=$('#terrain'),ctx=canvas.getContext('2d'),terrainCanvas=document.createElement('canvas');
const packageData=await loadRegionPackage('./packages/white-bone.json'),defaults=clonePackageSection(packageData.fieldLayout),storageKey=packageStorageKey(packageData,'field-layout','v2');
let state=loadState()||clonePackageSection(defaults),selectedId=state.storyAreas[0]?.id||null,dragId=null,mapRect={x:0,y:0,size:0},terrainDirty=true,candidateCache=new Map();

function loadState(){try{const v=JSON.parse(localStorage.getItem(storageKey));if(!v?.storyAreas?.length)return null;const definitions=new Map(defaults.storyAreas.map(a=>[a.id,a]));v.storyAreas=v.storyAreas.map(a=>({...definitions.get(a.id),...a,placementRequirements:a.placementRequirements||definitions.get(a.id)?.placementRequirements||{}}));return v}catch{return null}}
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const ordered=()=>[...state.storyAreas].sort((a,b)=>a.order-b.order);
const areaById=id=>state.storyAreas.find(a=>a.id===id);
const flightSeconds=km=>km/state.cruiseSpeedKmh*3600;
function fmtTime(sec){const m=Math.floor(sec/60),s=Math.round(sec%60);return m?`${m}分${String(s).padStart(2,'0')}秒`:`${s}秒`}

function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.floor(r.width*dpr));canvas.height=Math.max(1,Math.floor(r.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);const size=Math.min(r.width,r.height)-24;mapRect={x:(r.width-size)/2,y:(r.height-size)/2,size};draw()}
new ResizeObserver(resize).observe(canvas);
function terrain(){if(terrainDirty){renderTerrainBitmap(terrainCanvas,packageData.regionRecipe,state.terrainSeed,220);terrainDirty=false;candidateCache.clear()}return terrainCanvas}
const toScreen=pos=>({x:mapRect.x+pos[0]/state.fieldSizeKm*mapRect.size,y:mapRect.y+(1-pos[1]/state.fieldSizeKm)*mapRect.size});
const toWorld=(x,y)=>[clamp((x-mapRect.x)/mapRect.size*state.fieldSizeKm,0,state.fieldSizeKm),clamp((1-(y-mapRect.y)/mapRect.size)*state.fieldSizeKm,0,state.fieldSizeKm)];
function candidateMap(area){const key=`${area.id}:${state.terrainSeed}:${state.fieldSizeKm}:${state.storyAreas.map(a=>a.positionKm.join(',')).join('|')}`;if(!candidateCache.has(key))candidateCache.set(key,candidateCells(area,state,packageData.regionRecipe,52));return candidateCache.get(key)}

function draw(){
  if(!canvas.width)return;const r=canvas.getBoundingClientRect();ctx.clearRect(0,0,r.width,r.height);ctx.fillStyle='#172934';ctx.fillRect(0,0,r.width,r.height);ctx.drawImage(terrain(),mapRect.x,mapRect.y,mapRect.size,mapRect.size);
  const selected=areaById(selectedId);if(selected){const c=candidateMap(selected),cell=mapRect.size/c.grid;for(const p of c.cells){ctx.fillStyle=p.score===1?'rgba(118,217,174,.25)':'rgba(240,195,125,.12)';ctx.fillRect(mapRect.x+p.x*cell,mapRect.y+(c.grid-1-p.y)*cell,cell+1,cell+1)}}
  const gridKm=state.fieldSizeKm<=20?2:state.fieldSizeKm<=40?5:10;ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;ctx.font='10px system-ui';ctx.fillStyle='rgba(238,242,239,.58)';
  for(let km=0;km<=state.fieldSizeKm;km+=gridKm){const q=km/state.fieldSizeKm*mapRect.size;ctx.beginPath();ctx.moveTo(mapRect.x+q,mapRect.y);ctx.lineTo(mapRect.x+q,mapRect.y+mapRect.size);ctx.moveTo(mapRect.x,mapRect.y+mapRect.size-q);ctx.lineTo(mapRect.x+mapRect.size,mapRect.y+mapRect.size-q);ctx.stroke();if(km<state.fieldSizeKm)ctx.fillText(`${km}`,mapRect.x+q+3,mapRect.y+mapRect.size-5)}
  const arr=ordered();ctx.strokeStyle='rgba(139,219,234,.88)';ctx.lineWidth=3;ctx.setLineDash([8,7]);ctx.beginPath();arr.forEach((a,i)=>{const p=toScreen(a.positionKm);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.stroke();ctx.setLineDash([]);
  arr.forEach((a,i)=>{const p=toScreen(a.positionKm),chosen=a.id===selectedId,fit=evaluatePlacement(a,a.positionKm,state,packageData.regionRecipe);ctx.beginPath();ctx.arc(p.x,p.y,chosen?13:10,0,Math.PI*2);ctx.fillStyle=fit.ok?(chosen?'#fff':'#d99947'):'#d96f5f';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle=chosen?'#d99947':'#f2ead8';ctx.stroke();ctx.fillStyle=chosen?'#17232a':'#111820';ctx.font='700 11px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),p.x,p.y+.5);ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='600 12px system-ui';const tw=ctx.measureText(a.name).width,lx=clamp(p.x+15,mapRect.x+4,mapRect.x+mapRect.size-tw-12),ly=clamp(p.y-12,mapRect.y+15,mapRect.y+mapRect.size-6);ctx.fillStyle='rgba(7,18,26,.78)';ctx.fillRect(lx-4,ly-12,tw+8,17);ctx.fillStyle='#edf2ef';ctx.fillText(a.name,lx,ly)});
  ctx.strokeStyle='rgba(234,218,189,.5)';ctx.lineWidth=1;ctx.strokeRect(mapRect.x+.5,mapRect.y+.5,mapRect.size-1,mapRect.size-1);
}

function renderPlacement(selected){
  const box=$('#placementList');if(!selected){box.innerHTML='<p>物語エリアを選択してください。</p>';return}
  const result=evaluatePlacement(selected,selected.positionKm,state,packageData.regionRecipe);
  box.innerHTML=`<p class="area-history">${selected.historicalRole||'歴史上の役割は未設定'}</p>`+result.checks.map(c=>`<div class="placement-row"><b class="${c.ok?'ok':'ng'}">${c.ok?'適合':'不整合'}</b><span>${c.label}</span><small>必要条件：${c.expected}</small></div>`).join('')+(result.checks.length?'':'<div class="placement-row"><span>配置条件は未設定</span><small>追加エリアなので、地形との関係を後から定義します。</small></div>');
}
function renderHints(){
  const graph=analyzeHintGraph(state.storyAreas,packageData.storyModel.hintLinks,'entry');$('#hintSummary').textContent=graph.healthy?'すべての物語エリアへ、少なくとも一つのヒント経路があります。':'ヒントから到達できない物語エリアがあります。';
  const selected=selectedId,links=packageData.storyModel.hintLinks.filter(h=>h.from===selected||h.to===selected);$('#hintList').innerHTML=links.map(h=>{const from=areaById(h.from)?.name||h.from,to=areaById(h.to)?.name||h.to;return`<div class="hint-row"><em>${h.mode}</em><span>${from} → ${to}</span><small>${h.clue}</small></div>`}).join('')||'<div class="hint-row"><span>この地点のヒントは未設定</span></div>';
}
function renderUI(){
  const arr=ordered(),placements=summarizePlacements(state,packageData.regionRecipe),placementMap=new Map(placements.map(p=>[p.area.id,p.result])),list=$('#areaList');list.innerHTML='';
  arr.forEach((a,i)=>{const node=$('#areaTemplate').content.firstElementChild.cloneNode(true),fit=placementMap.get(a.id);node.dataset.id=a.id;node.classList.toggle('selected',a.id===selectedId);$('.order',node).textContent=i+1;$('.name',node).textContent=a.name;$('.coords',node).textContent=`東 ${a.positionKm[0].toFixed(1)} km　北 ${a.positionKm[1].toFixed(1)} km`;const badge=$('.fit',node);badge.textContent=fit.ok?'適合':`${Math.round(fit.score*100)}%`;badge.className=`fit ${fit.ok?'good':'warn'}`;$('.select-area',node).addEventListener('click',()=>selectArea(a.id));$$('[data-dir]',node).forEach(b=>b.addEventListener('click',()=>moveOrder(a.id,+b.dataset.dir)));list.append(node)});
  let total=0;$('#legList').innerHTML='';for(let i=0;i<arr.length-1;i++){const km=distanceKm(arr[i].positionKm,arr[i+1].positionKm),sec=flightSeconds(km);total+=km;const cls=sec<60?'short':sec>120?'long':'good',label=cls==='short'?'近い':cls==='long'?'遠い':'適正';$('#legList').insertAdjacentHTML('beforeend',`<div class="leg"><div><span>${i+1}. ${arr[i].name} → ${arr[i+1].name}</span><small>${km.toFixed(1)} km ／ ${fmtTime(sec)}</small></div><b class="${cls}">${label}</b></div>`)}
  $('#fieldStat').textContent=`${state.fieldSizeKm}×${state.fieldSizeKm} km`;$('#distanceStat').textContent=`${total.toFixed(1)} km`;$('#timeStat').textContent=fmtTime(flightSeconds(total));$('#fieldSize').value=state.fieldSizeKm;$('#cruiseSpeed').value=state.cruiseSpeedKmh;
  const selected=areaById(selectedId),fit=selected&&placementMap.get(selectedId);$('.selection-bar strong').textContent=selected?selected.name:'—';$('.selection-bar small').textContent=selected?`東 ${selected.positionKm[0].toFixed(1)}km・北 ${selected.positionKm[1].toFixed(1)}km｜地形適合 ${Math.round(fit.score*100)}%`:'地図上の点または右の一覧を選択';renderPlacement(selected);renderHints();draw();
}
function selectArea(id){selectedId=id;renderUI()}
function moveOrder(id,dir){const arr=ordered(),i=arr.findIndex(a=>a.id===id),j=clamp(i+dir,0,arr.length-1);if(i===j)return;[arr[i].order,arr[j].order]=[arr[j].order,arr[i].order];ordered().forEach((a,k)=>a.order=k+1);renderUI()}
function hitTest(x,y){let best=null,distance=22;for(const a of state.storyAreas){const p=toScreen(a.positionKm),d=Math.hypot(x-p.x,y-p.y);if(d<distance){distance=d;best=a}}return best}

canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect(),a=hitTest(e.clientX-r.left,e.clientY-r.top);if(!a)return;dragId=a.id;selectedId=a.id;canvas.setPointerCapture(e.pointerId);renderUI()});
canvas.addEventListener('pointermove',e=>{if(!dragId)return;const r=canvas.getBoundingClientRect(),a=areaById(dragId);a.positionKm=toWorld(e.clientX-r.left,e.clientY-r.top);candidateCache.clear();draw();const fit=evaluatePlacement(a,a.positionKm,state,packageData.regionRecipe);$('.selection-bar small').textContent=`東 ${a.positionKm[0].toFixed(1)}km・北 ${a.positionKm[1].toFixed(1)}km｜地形適合 ${Math.round(fit.score*100)}%`});
canvas.addEventListener('pointerup',()=>{if(dragId){dragId=null;renderUI()}});canvas.addEventListener('pointercancel',()=>dragId=null);
$('#fieldSize').addEventListener('change',e=>{const next=+e.target.value,factor=next/state.fieldSizeKm;state.storyAreas.forEach(a=>a.positionKm=a.positionKm.map(v=>v*factor));state.fieldSizeKm=next;terrainDirty=true;renderUI()});
$('#cruiseSpeed').addEventListener('change',e=>{state.cruiseSpeedKmh=clamp(+e.target.value||240,80,500);renderUI()});
$('#reroll').addEventListener('click',()=>{state.terrainSeed=Math.floor(Math.random()*900000)+100000;terrainDirty=true;renderUI()});
$('#reset').addEventListener('click',()=>{state=clonePackageSection(defaults);selectedId=state.storyAreas[0].id;terrainDirty=true;renderUI()});
$('#addArea').addEventListener('click',()=>{const n=state.storyAreas.length+1,id=`story-area-${Date.now()}`;state.storyAreas.push({id,name:`新しい物語エリア ${n}`,order:n,positionKm:[state.fieldSizeKm*.5+(Math.random()-.5)*3,state.fieldSizeKm*.5+(Math.random()-.5)*3],functionalType:'undecided',historicalRole:'未設定',placementRequirements:{}});selectedId=id;renderUI()});
$('#saveLocal').addEventListener('click',()=>{localStorage.setItem(storageKey,JSON.stringify(state));$('#saveNote').textContent='保存しました。この端末で次回も復元されます。'});
$('#exportJson').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${packageData.id}_field_layout.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});

renderUI();
