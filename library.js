import{loadRegionPackage}from'./core/package-runtime.js';
import{libraryProgress,libraryReading,libraryRecordPlace}from'./core/library-model.js?v=142';
import{escapeStoryText as esc}from'./core/story-journal.js?v=135';
const $=s=>document.querySelector(s);
let packages=[],selected=null,selection='cover',loading=false,moving=false;
let paperSound=true;try{paperSound=localStorage.getItem('library-paper-sound')!=='off';}catch{}
const status=pkg=>libraryProgress(pkg,localStorage);
const flightURL=pkg=>pkg.library?.exploreUrl||'blockout.html?v=142';
function shelfButton(id){return [...$('#regionBooks').querySelectorAll('[data-package]')].find(b=>b.dataset.package===id);}
function renderShelf(){
 const total=packages.reduce((n,p)=>n+status(p).count,0),finished=packages.filter(p=>status(p).complete).length;
 $('#shelfSummary').textContent=`${packages.length}地域・収蔵 ${total}点・完成 ${finished}冊`;
 $('#regionBooks').setAttribute('aria-busy',String(moving));
 $('#regionBooks').innerHTML=packages.map(pkg=>{const p=status(pkg),away=selected?.id===pkg.id,width=54+Math.round(36*p.count/Math.max(1,p.total));return `<button type="button" class="region-book shelf-book ${away?'is-away':''} ${p.complete?'is-complete':''}" data-package="${esc(pkg.id)}" style="--spine-width:${width}px" aria-label="${esc(pkg.title)}、収蔵${p.count}/${p.total}点、${away?'机で閲覧中':'本棚から取り出す'}" aria-pressed="${away}" ${moving?'disabled':''}><span class="shelf-gap" aria-hidden="true">閲覧中</span><span class="shelf-volume" aria-hidden="true"><span class="spine-mark">◇</span><span class="spine-title">${esc(pkg.title)}</span><span class="spine-bottom">${p.complete?'完':'記録集'}</span></span><span class="shelf-caption"><strong>${esc(pkg.title)}</strong><small>${away?'机で閲覧中':p.complete?'金装・完成本':`収蔵 ${p.count} / ${p.total}`}</small></span></button>`}).join('');
 if(typeof shelf!=='undefined')requestAnimationFrame(shelfArrows);
}

function renderContents(){
 const p=status(selected);$('#bookTitle').textContent=selected.title;
 $('#bookStatus').textContent=p.complete?'すべての記録が揃いました。地域の物語が読めます。':`収蔵 ${p.count} / ${p.total}点。残り${p.total-p.count}点で地域の物語がひらきます。`;
 $('#departRegion').href=flightURL(selected);$('#resumeJourney').href=flightURL(selected);
 $('#recordContents').innerHTML=selected.records.map((r,i)=>{const found=p.collected.has(r.id);return `<button type="button" data-record="${esc(r.id)}" ${found?'':'disabled'} aria-pressed="${selection===r.id}"><small>${String(i+1).padStart(2,'0')} / ${found?esc(r.type):'未収蔵'}</small>${found?esc(r.title):'まだ白紙の頁'}</button>`}).join('');
 $('#historyButton').disabled=!p.complete;$('#historyButton').setAttribute('aria-pressed',String(selection==='history'));
 $('#historyLock').textContent=p.complete?`${p.total}点の記録をつないだ、地域の歴史。`:`任意の記録も含め、全${p.total}点を集めると開きます。`;
}
function showPage(focus=false){
 if(!selected)return;
 const p=status(selected),reading=libraryReading(selected,p,selection);renderContents();
 if(!reading){selection='cover';$('#readingPage').innerHTML=`<span class="page-label">${esc(selected.title)} / 表紙</span><h3>${esc(selected.title)}</h3><p class="book-preface">${esc(selected.premise)}</p><p class="record-original">${p.count?'目次から、持ち帰った記録を選んでください。':'この本には、まだ記録がありません。\n相棒と旅に出て、各地に残る言葉を探してみましょう。'}\n\n${p.complete?'すべての頁が揃っています。\n「地域の物語」から、この土地の歴史を読み進められます。':'旅先で拾った言葉が、この本の頁になります。'}</p>`;return;}
 if(reading.kind==='record'){
  const r=reading.record,found=selected.records.filter(r=>p.collected.has(r.id)),i=found.findIndex(q=>q.id===r.id),prev=found[i-1],next=found[i+1];
  $('#readingPage').innerHTML=`<span class="page-label">${esc(r.type)} / 原文</span><h3>${esc(r.title)}</h3><p class="page-location">${esc(reading.place)}で採集</p><p class="record-original">${esc(r.snippet)}</p>${r.fieldClue?`<p class="field-clue">旅の手がかり<br>${esc(r.fieldClue)}</p>`:''}<nav class="page-bottom" aria-label="収蔵記録をめくる">${prev?`<button type="button" data-record="${esc(prev.id)}">← 前の記録</button>`:'<span></span>'}${next?`<button type="button" data-record="${esc(next.id)}">次の記録 →</button>`:p.complete?'<button type="button" data-history>地域の物語 →</button>':'<span></span>'}</nav>`;
 }else{
  const story=reading.story;
  $('#readingPage').innerHTML=`<span class="page-label">全記録収集 / 完成編</span><h3>${esc(story.title)}</h3><p class="book-preface">${esc(story.intro)}</p>${story.chapters.map((c,i)=>`<section class="history-chapter"><h4>${String(i+1).padStart(2,'0')}　${esc(c.title)}</h4><p>${esc(c.text)}</p><div class="source-links" aria-label="この章につながる記録">${(c.recordIds||[]).map(id=>{const r=selected.records.find(r=>r.id===id);return r?`<button type="button" data-record="${esc(id)}">${esc(r.title)}を読む</button>`:''}).join('')}</div></section>`).join('')}<p class="field-clue">${esc(story.afterword||'')}</p>`;
 }
 if(focus){$('#readingPage').focus({preventScroll:true});$('#readingPage').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});}
}
const reducedMotion=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
let paperAudio=null,paperNoise=null;
function bookSound(kind){
 if(!paperSound)return;
 try{
  paperAudio??=new(window.AudioContext||window.webkitAudioContext)();paperAudio.resume().catch(()=>{});
  const t=paperAudio.currentTime,gain=paperAudio.createGain();gain.connect(paperAudio.destination);
  if(kind==='place'){
   const tone=paperAudio.createOscillator();tone.type='sine';tone.frequency.setValueAtTime(115,t);tone.frequency.exponentialRampToValueAtTime(48,t+.12);gain.gain.setValueAtTime(.018,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.14);tone.connect(gain);tone.start(t);tone.stop(t+.15);tone.onended=()=>{tone.disconnect();gain.disconnect();};
  }else{
   if(!paperNoise){paperNoise=paperAudio.createBuffer(1,Math.floor(paperAudio.sampleRate*.24),paperAudio.sampleRate);const data=paperNoise.getChannelData(0);let v=0;for(let i=0;i<data.length;i++){v=(v+(Math.random()*2-1)*.15)*.8;data[i]=v;}}
   const noise=paperAudio.createBufferSource(),filter=paperAudio.createBiquadFilter();noise.buffer=paperNoise;filter.type='lowpass';filter.frequency.value=kind==='page'?1400:800;gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(.065,t+.035);gain.gain.exponentialRampToValueAtTime(.0001,t+.23);noise.connect(filter);filter.connect(gain);noise.start(t);noise.onended=()=>{noise.disconnect();filter.disconnect();gain.disconnect();};
  }
 }catch{}
}
async function animateElement(el,keyframes,options){if(reducedMotion())return;const animation=el.animate(keyframes,{fill:'forwards',...options});try{await animation.finished;}finally{animation.cancel();}}
function stageBook(pkg){
 const p=status(pkg),width=Math.min(275,innerWidth*.66,innerHeight*.48),height=width*1.42,book=$('#carriedBook'),cover=$('#carriedCover');
 book.style.width=width+'px';book.style.height=height+'px';book.classList.toggle('gold-edition',p.complete);
 cover.innerHTML=`<span class="cover-edition">${p.complete?'全記録収蔵・地域の物語':'旅の地域記録集'}</span><img src="${esc(pkg.library?.coverImage||'assets/bonewind-panorama.png')}" alt=""><strong>${esc(pkg.title)}</strong><small>風渡りの図書館</small>`;
 $('#bookStage').hidden=false;return{book,cover,width,height};
}
function stageTransform(rect,width,height,tilt=0){return `translate(${rect.left+rect.width/2-innerWidth/2}px,${rect.top+rect.height/2-innerHeight/2}px) rotate(${tilt}deg) scale(${Math.max(.08,rect.width/width)},${Math.max(.08,rect.height/height)})`;}
async function openBook(id){
 if(moving)return;
 const pkg=packages.find(p=>p.id===id);if(!pkg)return;
 if(selected?.id===id){$('#readingDesk').scrollIntoView({behavior:reducedMotion()?'instant':'smooth',block:'start'});return;}
 if(selected)await closeBook(false);
 shelfButton(id)?.scrollIntoView({behavior:'instant',block:'nearest',inline:'center'});
 const source=shelfButton(id).querySelector('.shelf-volume').getBoundingClientRect();moving=true;bookSound('pull');selected=pkg;selection='cover';renderShelf();$('#closeBook').disabled=true;$('#bookMotionStatus').textContent=`「${pkg.title}」を本棚から取り出しています。`;
 try{
  if(!reducedMotion()){
   const {book,cover,width,height}=stageBook(pkg),start=stageTransform(source,width,height,-2);
   await animateElement(book,[{transform:start,opacity:.7},{transform:'translate(0,0) rotate(-4deg) scale(1)',opacity:1}],{duration:520,easing:'cubic-bezier(.2,.7,.2,1)'});
   $('#readingDesk').hidden=false;showPage();$('#readingDesk').scrollIntoView({behavior:'instant',block:'start'});bookSound('place');
   const end={left:innerWidth/2-width/2,top:Math.min(140,innerHeight*.2),width,height};
   const resting=stageTransform(end,width,height,0);
   await animateElement(book,[{transform:'translate(0,0) rotate(-4deg) scale(1)'},{transform:resting}],{duration:120,easing:'ease-out'});book.style.transform=resting;
   await animateElement(cover,[{transform:'rotateY(0deg)'},{transform:'rotateY(-155deg)'}],{duration:360,easing:'ease-in-out'});
  }else{$('#readingDesk').hidden=false;showPage();$('#readingDesk').scrollIntoView({behavior:'instant',block:'start'});}
  $('#bookMotionStatus').textContent=`「${pkg.title}」を閲覧机で開きました。`;
 }catch(error){$('#readingDesk').hidden=false;showPage();console.warn('Book motion skipped',error);}
 finally{$('#bookStage').hidden=true;moving=false;$('#closeBook').disabled=false;renderShelf();$('#readingPage').focus({preventScroll:true});}
}
async function closeBook(focusShelf=true){
 if(moving||!selected)return;
 const pkg=selected;moving=true;$('#closeBook').disabled=true;$('#bookMotionStatus').textContent=`「${pkg.title}」を棚へ戻しています。`;bookSound('page');
 try{
  const motion=!reducedMotion()?stageBook(pkg):null;
  if(motion){motion.book.style.transform='translate(0,0) rotate(0deg) scale(1)';await animateElement(motion.cover,[{transform:'rotateY(-155deg)'},{transform:'rotateY(0deg)'}],{duration:240,easing:'ease-in-out'});}
  selected=null;selection='cover';$('#readingDesk').hidden=true;renderShelf();$('#bookshelf').scrollIntoView({behavior:'instant',block:'center'});shelfButton(pkg.id)?.scrollIntoView({behavior:'instant',block:'nearest',inline:'center'});
  if(motion){const slot=shelfButton(pkg.id).querySelector('.shelf-volume'),rect=slot.getBoundingClientRect();slot.style.opacity='0';try{await animateElement(motion.book,[{transform:'translate(0,0) rotate(-4deg) scale(1)',opacity:1},{transform:stageTransform(rect,motion.width,motion.height,0),opacity:1}],{duration:420,easing:'cubic-bezier(.5,0,.3,1)'});}finally{slot.style.opacity='';}}
  bookSound('place');$('#bookMotionStatus').textContent=`「${pkg.title}」を本棚へ戻しました。`;
 }catch(error){selected=null;$('#readingDesk').hidden=true;console.warn('Book return skipped',error);}
 finally{$('#bookStage').hidden=true;moving=false;renderShelf();if(focusShelf)shelfButton(pkg.id)?.focus({preventScroll:true});}
}

async function loadLibrary(){
 if(loading)return;loading=true;$('#loadError').hidden=true;
 try{const response=await fetch('./packages/catalog.json?v=142');if(!response.ok)throw Error('catalog');const catalog=await response.json();packages=await Promise.all(catalog.packages.map(entry=>loadRegionPackage('./packages/'+entry.path+'?v=142')));renderShelf();if(packages.length){$('#resumeJourney').href=flightURL(packages[0]);}}
 catch(error){$('#shelfSummary').textContent='本棚を開けませんでした';$('#loadError').hidden=false;console.warn('Library could not load',error);}finally{loading=false;}
}
$('#regionBooks').addEventListener('click',e=>{const b=e.target.closest('[data-package]');if(b)openBook(b.dataset.package);});
$('#readingDesk').addEventListener('click',e=>{const b=e.target.closest('[data-record],[data-history]');if(b){selection=b.hasAttribute('data-history')?'history':b.dataset.record;showPage(true);}});
$('#historyButton').addEventListener('click',()=>{if(selected&&status(selected).complete){selection='history';showPage(true);}});
$('#closeBook').addEventListener('click',()=>closeBook());
addEventListener('keydown',e=>{if(e.key==='Escape'&&selected&&!moving){e.preventDefault();closeBook();}});
const soundButton=$('#togglePaperSound');function soundLabel(){soundButton.textContent=paperSound?'紙音：入':'紙音：切';soundButton.setAttribute('aria-pressed',String(paperSound));}soundLabel();soundButton.addEventListener('click',()=>{paperSound=!paperSound;soundLabel();try{localStorage.setItem('library-paper-sound',paperSound?'on':'off');}catch{}});
$('#retryLoad').addEventListener('click',loadLibrary);
function refresh(){if(!packages.length||moving)return;renderShelf();if(selected)showPage();}
addEventListener('storage',refresh);addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
const shelf=$('#regionBooks');function shelfArrows(){$('#shelfPrevious').disabled=shelf.scrollLeft<3;$('#shelfNext').disabled=shelf.scrollLeft+shelf.clientWidth>=shelf.scrollWidth-3;}
$('#shelfPrevious').addEventListener('click',()=>shelf.scrollBy({left:-Math.max(220,shelf.clientWidth*.65),behavior:reducedMotion()?'instant':'smooth'}));$('#shelfNext').addEventListener('click',()=>shelf.scrollBy({left:Math.max(220,shelf.clientWidth*.65),behavior:reducedMotion()?'instant':'smooth'}));shelf.addEventListener('scroll',shelfArrows,{passive:true});addEventListener('resize',shelfArrows);
loadLibrary().then(shelfArrows);
