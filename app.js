import{loadRegionPackage}from'./core/package-runtime.js';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

const pkg = await loadRegionPackage('./packages/white-bone.json');
const state = {
  x: 430, y: 56, vx: 0, vy: 0, keys: new Set(), near: null,
  found: new Set(JSON.parse(localStorage.getItem(`found:${pkg.id}`) || '[]')),
  started: false, last: performance.now(), finished: false
};
const world = $('#world');
const dragon = $('#dragon');
const recordDialog = $('#recordDialog');
let activeRecord = null;

function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
function currentZone(){
  if(state.x>1450 && state.x<2550) return {name:'骨笛上昇流', x:22, y:-10, line:'肋骨が高く鳴っている。上の風は穏やかだ。'};
  if(state.x>3000 && state.x<4050) return {name:'峡谷横風', x:38, y:Math.sin(performance.now()/520)*16, line:'横風が強い。風鳶の傾きを見れば抜け道が分かる。'};
  if(state.x>5450 && state.x<6650) return {name:'頭蓋下降流', x:10, y:25, line:'相棒が翼を畳みかけた。眼窩から風が落ちてくる。'};
  return {name:'静穏域', x:4, y:0, line:'相棒が風の匂いを確かめている。'};
}

function chapterFor(x){
  if(x<1300) return '白い門'; if(x<2800) return '観測者の高さ'; if(x<4150) return '骨を渡る風';
  if(x<5450) return '音のない集落'; if(x<6550) return '頭蓋の内側'; return '声の抜け殻';
}

function setupLandmarks(){
  const positions = [
    [1200,28,'折れた観測塔'],[2500,58,'七連肋骨門'],[4480,33,'風待ち集落エルカ'],[5840,24,'イオラの頭蓋'],[6650,33,'無銘の風標']
  ];
  positions.forEach(([x,y,name])=>{
    const el=document.createElement('span'); el.className='landmark-label'; el.textContent=name;
    el.style.left=`${x}px`; el.style.top=`${y}%`; el.dataset.x=x; $('#landmarks').append(el);
  });
}

function updateNear(){
  let best=null, bestD=Infinity;
  pkg.records.forEach(r=>{
    const d=Math.hypot((state.x-r.x)/12,(state.y-r.y)*2.6);
    if(d<bestD){bestD=d;best=r;}
  });
  state.near=bestD<18?best:null;
  const button=$('#inspect');
  if(state.near){
    const locked=state.near.id==='memorial' && state.found.size<5;
    button.disabled=locked;
    button.textContent=locked?'風標はまだ沈黙している':state.found.has(state.near.id)?`再読する：${state.near.title}`:`調べる：${state.near.title}`;
    $('#companionText').textContent=locked?'相棒が首を振る。ここへ届くはずの音が、まだ足りない。':`相棒が${state.near.type}に気づいた。`;
  } else {
    button.disabled=true; button.textContent='近くに気配はない'; $('#companionText').textContent=currentZone().line;
  }
  $$('.landmark-label').forEach(el=>el.classList.toggle('near',Math.abs(+el.dataset.x-state.x)<750));
}

function tick(now){
  const dt=Math.min((now-state.last)/1000,.04); state.last=now;
  if(state.started && $('#game').classList.contains('active') && !recordDialog.open && !$('#endingDialog').open){
    const left=state.keys.has('left'), right=state.keys.has('right'), up=state.keys.has('up'), down=state.keys.has('down');
    const z=currentZone();
    const targetX=((right?1:0)-(left?1:0))*105 + z.x;
    const targetY=((down?1:0)-(up?1:0))*20 + z.y;
    state.vx += (targetX-state.vx)*Math.min(1,dt*3.7); state.vy += (targetY-state.vy)*Math.min(1,dt*3.7);
    state.x=clamp(state.x+state.vx*dt,180,7000); state.y=clamp(state.y+state.vy*dt,13,79);
    dragon.style.left=`${state.x}px`; dragon.style.top=`${state.y}%`;
    dragon.style.transform=`translate(-50%,-50%) rotate(${clamp(state.vy*.35,-12,12)}deg) scaleX(${state.vx<0?-1:1})`;
    const cam=clamp(state.x-innerWidth*.18,0,7200-innerWidth);
    world.style.transform=`translate3d(${-cam}px,0,0)`;
    $('#altitudeNeedle').style.top=`${state.y}%`; $('#mapDot').style.left=`${state.x/72}%`;
    $('#chapterLabel').textContent=chapterFor(state.x); updateNear();
  }
  requestAnimationFrame(tick);
}

function normalizeKey(key){
  const m={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down'}; return m[key];
}
addEventListener('keydown',e=>{
  const k=normalizeKey(e.key); if(k){state.keys.add(k);e.preventDefault();}
  if(e.code==='Space' && state.near && !recordDialog.open){inspect();e.preventDefault();}
});
addEventListener('keyup',e=>{const k=normalizeKey(e.key);if(k)state.keys.delete(k)});
$$('[data-move]').forEach(b=>{
  const k=b.dataset.move; const on=e=>{e.preventDefault();state.keys.add(k)}; const off=e=>{e.preventDefault();state.keys.delete(k)};
  b.addEventListener('pointerdown',on); ['pointerup','pointercancel','pointerleave'].forEach(t=>b.addEventListener(t,off));
});

function inspect(){
  if(!state.near || (state.near.id==='memorial' && state.found.size<5)) return;
  activeRecord=state.near; $('#recordType').textContent=activeRecord.type; $('#recordTitle').textContent=activeRecord.title;
  $('#recordSnippet').textContent=activeRecord.snippet; $('#recordMeaning').textContent=activeRecord.meaning;
  $('#storeRecord').textContent=state.found.has(activeRecord.id)?'記録を閉じる':'図書館へ収蔵する'; recordDialog.showModal();
}
$('#inspect').addEventListener('click',inspect);
$('.dialog-x',recordDialog).addEventListener('click',()=>recordDialog.close());
$('#storeRecord').addEventListener('click',()=>{
  if(activeRecord && !state.found.has(activeRecord.id)){
    state.found.add(activeRecord.id); localStorage.setItem(`found:${pkg.id}`,JSON.stringify([...state.found])); updateProgress(); renderLibrary();
  }
  const isFinal=activeRecord?.id==='memorial'; recordDialog.close();
  if(isFinal && !state.finished){state.finished=true;setTimeout(()=>$('#endingDialog').showModal(),350)}
});

function updateProgress(){
  const n=state.found.size; $('#foundCount').textContent=`痕跡 ${n} / ${pkg.records.length}`; $('#progressBar').style.width=`${n/pkg.records.length*100}%`;
  $('#bookMeter').style.height=`${n/pkg.records.length*100}%`;
}

function renderLibrary(){
  const n=state.found.size;
  $('#libraryStatus').textContent=n===0?'まだ白紙の頁が多い。持ち帰った痕跡が、ここに一冊の記録を作る。':n===pkg.records.length?'地域記録集が完成した。答えと、答えないことの両方が綴じられている。':`${n}点の記録を収蔵。頁の間に、エルカの暮らしと過ちが見え始めた。`;
  $('#archiveCards').innerHTML=pkg.records.map(r=>`<article class="archive-card ${state.found.has(r.id)?'':'locked'}"><span class="eyebrow">${state.found.has(r.id)?r.type:'未収蔵'}</span><h3>${state.found.has(r.id)?r.title:'空白の頁'}</h3><p>${state.found.has(r.id)?r.meaning:'探索先に、まだ拾われていない声がある。'}</p></article>`).join('');
  const unlocked=pkg.discoveries.filter((_,i)=>n>=[2,4,6,7][i]);
  $('#exhibitCards').innerHTML=unlocked.length?unlocked.map(d=>`<article class="exhibit-card"><span class="eyebrow">${d.kind}</span><h3>${d.name}</h3><p>${d.libraryChange}</p></article>`).join(''):'<article class="exhibit-card"><h3>展示台は空いている</h3><p>最初の二つの痕跡を持ち帰ると、土地の品がここへ置かれる。</p></article>';
}

function list(items){return `<ul>${items.map(x=>`<li>${x}</li>`).join('')}</ul>`}
function card(n,title,body,wide=false){return `<article class="ledger-card ${wide?'wide':''}"><span class="eyebrow">成果物 ${String(n).padStart(2,'0')}</span><h2>${title}</h2>${body}</article>`}
function renderLedger(){
  const recordDetails=pkg.records.map(r=>`<details><summary>${r.title} <span class="tag">${r.type}</span></summary><p class="record-body">${r.snippet}</p><p><strong>読み取れること：</strong>${r.meaning}</p></details>`).join('');
  const chapters=`<div class="timeline">${pkg.chapters.map(c=>`<div class="timeline-row"><strong>${c.minutes}分</strong><b>${c.name}</b><span>${c.play}<br><small>${c.purpose}</small></span></div>`).join('')}</div>`;
  const landmarks=`<table class="data-table"><thead><tr><th>場所</th><th>役割</th><th>遠景の見え方</th></tr></thead><tbody>${pkg.landmarks.map(x=>`<tr><td>${x.name}</td><td>${x.role}</td><td>${x.sightline}</td></tr>`).join('')}</tbody></table>`;
  const points=`<table class="data-table"><thead><tr><th>探索点</th><th>手掛かり</th><th>区分</th></tr></thead><tbody>${pkg.records.map(x=>`<tr><td>${x.title}</td><td>${x.type}／ドラゴンの反応と残響音</td><td>${x.required?'本筋':'任意'}</td></tr>`).join('')}</tbody></table>`;
  const assets=Object.entries(pkg.assets).map(([k,v])=>`<h3>${{threeD:'3D',twoD:'2D',audio:'音声',vfx:'VFX'}[k]}</h3>${list(v)}`).join('');
  const template=Object.entries(pkg.template).map(([k,v])=>`<details><summary>${{identity:'A. 識別',promise:'B. 探索の約束',story:'C. 短編物語',space:'D. 空間',content:'E. 内容物',pacing:'F. 15分構成',production:'G. 制作',validation:'H. 検証'}[k]}</summary><p>${v}</p></details>`).join('');
  $('#ledgerContent').innerHTML=[
    card(1,'世界設定',`<p>${pkg.premise}</p><p>${pkg.visualTheme}</p><h3>この土地だけの歴史</h3>${list(pkg.history)}`,true),
    card(2,'10〜15分のゲーム進行',chapters,true),
    card(3,'マップ構造案',`<p>${pkg.map.shape}</p><h3>選べる三つの空路</h3>${list(pkg.map.routes.map(r=>`${r.name}｜危険 ${r.risk}｜${r.reward}（${r.cost}）`))}`),
    card(4,'主要ランドマーク',landmarks,true),
    card(5,'探索ポイント',points,true),
    card(6,'生態系・環境ギミック',`<h3>生態系</h3>${list(pkg.ecology.map(x=>`${x.name}：${x.behavior}`))}<h3>空の地形</h3>${list(pkg.environmentGimmicks.map(x=>`${x.name}：${x.effect}`))}`),
    card(7,'登場人物・過去の人物',list(pkg.people.map(x=>`${x.name}（${x.role}）— ${x.truth}`))),
    card(8,'地域で起きた出来事',`<p>原因は外部の黒幕ではなく、孤立した都市が生存のために選んだ技術利用です。</p>${list(pkg.history)}<p><strong>確定：</strong>装置が群れを混乱させ、住民は避難した。<br><strong>未確定：</strong>イオラが意図して街を庇ったか。</p>`,true),
    card(9,'読み物7本｜全文',recordDetails,true),
    card(10,'発見物・展示物',list(pkg.discoveries.map(x=>`${x.name}｜${x.kind}`))),
    card(11,'図書館へ帰還した時の変化',list(pkg.discoveries.map(x=>`${x.name}：${x.libraryChange}`))),
    card(12,'必要素材一覧',assets,true),
    card(13,'実装上必要なゲームシステム',list(pkg.systems.prototypeSpecific)),
    card(14,'再利用できる共通システム',list(pkg.systems.reusable)),
    card(15,'各パッケージ固有データ',`<h3>必須</h3>${list(pkg.packageFields.required)}<h3>条件付き</h3>${list(pkg.packageFields.conditional)}<h3>試作で追加された設計項目</h3>${list(pkg.packageFields.newlyIdentified)}<p><strong>今回は不要：</strong>${pkg.systems.notNeededYet.join('／')}</p>`,true),
    card(16,'探索パッケージ制作テンプレート',`<p>「設定集」ではなく「15分の好奇心の流れ」を先に埋めるテンプレートです。</p>${template}`,true)
  ].join('');
}

function showView(id){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  if(id==='library') renderLibrary(); if(id==='ledger') renderLedger();
  if(id==='game') setTimeout(()=>$('#viewport').focus(),0);
  if($('#endingDialog').open) $('#endingDialog').close();
}
$$('[data-open]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.open)));
$('#startGame').addEventListener('click',()=>{$('#introDialog').close();state.started=true;$('#viewport').focus()});
$('#continueExplore').addEventListener('click',()=>$('#endingDialog').close());

setupLandmarks(); updateProgress(); renderLibrary(); renderLedger(); $('#introDialog').showModal(); requestAnimationFrame(tick);
