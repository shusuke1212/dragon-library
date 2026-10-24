// Compact authored locations, built once and batched with the story meshes.
export function buildRegionScene(area,heightAt){
 const {x,z}=area,y=heightAt(x,z),cfg=area.scene,faces=[],colliders=[],points=[],theme=cfg.theme;
 const palette=cfg.palette||{},stone=palette.stone||'#8b9388',metal=palette.metal||'#819c9b',cloth=palette.cloth||'#bd8b58',wood=palette.wood||'#57483b',paper='#e4d6b9';
 const face=(p,color=stone,material=0)=>faces.push({points:p.map(q=>({x:x+q[0],y:y+q[1],z:z+q[2]})),color,material,layer:'story'});
 const hit=(cx,cz,sx,sz)=>colliders.push({min:{x:x+cx-sx,z:z+cz-sz},max:{x:x+cx+sx,z:z+cz+sz}});
 function box(cx,cy,cz,sx,sy,sz,color=stone,m=0,solid=false){const p=[[cx-sx,cy-sy,cz-sz],[cx+sx,cy-sy,cz-sz],[cx+sx,cy+sy,cz-sz],[cx-sx,cy+sy,cz-sz],[cx-sx,cy-sy,cz+sz],[cx+sx,cy-sy,cz+sz],[cx+sx,cy+sy,cz+sz],[cx-sx,cy+sy,cz+sz]];for(const f of[[0,1,2,3],[1,5,6,2],[5,4,7,6],[4,0,3,7],[3,2,6,7],[4,5,1,0]])face(f.map(i=>p[i]),color,m);if(solid)hit(cx,cz,sx,sz);}
 function column(cx,cz,h,r=1,color=stone){for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;face([[cx+Math.cos(a)*r,0,cz+Math.sin(a)*r],[cx+Math.cos(b)*r,0,cz+Math.sin(b)*r],[cx+Math.cos(b)*r*.85,h,cz+Math.sin(b)*r*.85],[cx+Math.cos(a)*r*.85,h,cz+Math.sin(a)*r*.85]],color);}hit(cx,cz,r,r);}
 function ring(cx,cy,cz,rx,ry,r=.5,color=metal,plane='vertical'){
  for(let i=0;i<40;i++){const a=i*Math.PI/20,b=(i+1)*Math.PI/20,p=(t,rr)=>plane==='vertical'?[cx+Math.cos(t)*(rx+rr),cy+Math.sin(t)*(ry+rr),cz]:[cx+Math.cos(t)*(rx+rr),cy,cz+Math.sin(t)*(ry+rr)];face([p(a,-r),p(a,r),p(b,r),p(b,-r)],color,6);}
 }
 function flag(cx,cz,h=7){box(cx,h/2,cz,.07,h/2,.07,wood,1,true);face([[cx,h,cz],[cx+2.1,h-.4,cz+.1],[cx+1.8,h-2.4,cz+.3],[cx,h-1.9,cz]],cloth,3);}
 function house(cx,cz,w=7,d=6){box(cx,2,cz-d,w,2,.25,stone,0,true);box(cx-w,2,cz,.25,2,d,stone,0,true);box(cx+w,2,cz,.25,2,d,stone,0,true);for(const side of[-1,1])box(cx+side*(w+1.4)/2,2,cz+d,(w-1.4)/2,2,.25,stone,0,true);box(cx,3.6,cz+d,1.4,.4,.25,wood,1);face([[cx-w-.5,4,cz-d-.5],[cx,6.2,cz-d-.5],[cx,6.2,cz+d+.5],[cx-w-.5,4,cz+d+.5]],wood,2);face([[cx,6.2,cz-d-.5],[cx+w+.5,4,cz-d-.5],[cx+w+.5,4,cz+d+.5],[cx,6.2,cz+d+.5]],wood,2);}
 function path(a,b,w=3){const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)||1,nx=dz/len*w/2,nz=-dx/len*w/2;face([[a[0]-nx,.10,a[1]-nz],[b[0]-nx,.10,b[1]-nz],[b[0]+nx,.10,b[1]+nz],[a[0]+nx,.10,a[1]+nz]],palette.path||'#a49d85',4);}
 function tree(cx,cz,h=22){column(cx,cz,h*.55,.65,wood);const r=h*.29;for(let k=0;k<3;k++)for(let i=0;i<10;i++){const a=i*Math.PI/5,b=(i+1)*Math.PI/5;face([[cx+Math.cos(a)*r*(1-k*.2),h*.28+k*h*.2,cz+Math.sin(a)*r*(1-k*.2)],[cx,h*(.7+k*.12),cz],[cx+Math.cos(b)*r*(1-k*.2),h*.28+k*h*.2,cz+Math.sin(b)*r*(1-k*.2)]],palette.foliage||'#486354',0);}}
 function pool(cx,cz,w=38,d=18){box(cx,.18,cz,w,.07,d,palette.water||'#4d868e',6);for(const side of[-1,1]){box(cx+side*w,.3,cz,.45,.3,d,stone,0,true);box(cx,.3,cz+side*d,w,.3,.45,stone,0,true);}hit(cx,cz,w,d);}
 function motif(cx,cz,scale=1){
  if(theme==='forest'){ring(cx,22*scale,cz,17*scale,17*scale,.65,metal);ring(cx,22*scale,cz,21*scale,21*scale,.65,metal,'horizontal');column(cx,cz,23*scale,1.5,stone);}
  else if(theme==='glass'){for(let i=-2;i<=2;i++){const px=cx+i*8,hh=(22-Math.abs(i)*5)*scale;const ps=[[px-3,0,cz-3],[px+3,0,cz-3],[px+3,0,cz+3],[px-3,0,cz+3]];for(let j=0;j<4;j++)face([ps[j],ps[(j+1)%4],[px+.8,hh,cz]],i%2?metal:'#b8c9bb',9);hit(px,cz,3,3);}}
  else if(theme==='clock'){ring(cx,24*scale,cz,20*scale,20*scale,2,metal);for(let i=0;i<12;i++){const a=i*Math.PI/6;box(cx+Math.cos(a)*20*scale,24*scale+Math.sin(a)*20*scale,cz,1.1,2.1,.7,wood,1);}box(cx,23*scale,cz,.55,14*scale,.5,metal,6);box(cx+8*scale,24*scale,cz,8*scale,.5,.5,metal,6);column(cx-16*scale,cz,24*scale,1.2);column(cx+16*scale,cz,24*scale,1.2);}
  else if(theme==='ember'){for(const side of[-1,1]){column(cx+side*13,cz,35*scale,3.5);box(cx+side*13,36*scale,cz,3.6,.7,3.6,metal,6);}ring(cx,13*scale,cz,10*scale,10*scale,1,metal);box(cx,3,cz,7,3,5,stone,0,true);face([[cx-3,4,cz+5.05],[cx+3,4,cz+5.05],[cx+3,1,cz+5.05],[cx-3,1,cz+5.05]],'#db895a',7);}
  else if(theme==='cloud'){for(let i=-2;i<=2;i++){column(cx+i*12,cz,10+Math.abs(i)*4,1.3);ring(cx+i*12,19+Math.abs(i)*4,cz,6,9,.65,metal);}tree(cx-25,cz-9,20);tree(cx+25,cz-9,20);}
  else if(theme==='snow'){for(const side of[-1,1]){column(cx+side*14,cz,27*scale,2.1);box(cx+side*14,28*scale,cz,3,1,3,metal,6);box(cx+side*14,29*scale,cz,1.2,.6,1.2,'#c1dce1',7);}for(let i=-2;i<=2;i++)box(cx+i*9,1.2,cz+12,2.3,.4,12,wood,1,true);}
  else if(theme==='rain'){for(let i=-2;i<=2;i++){column(cx+i*12,cz,24*scale,1.8);ring(cx+i*12,20*scale,cz,5,9,.7,metal);}box(cx,29*scale,cz,29,1.2,3,stone,0);pool(cx,cz-24,40,14);}
  else{pool(cx,cz-20,45,23);for(let i=-2;i<=2;i++){column(cx+i*15,cz-20,18+Math.abs(i)*4,2);box(cx+i*15,18+Math.abs(i)*4,cz-20,4,1,4,metal,6);}}
 }
 // Landing apron is the south-eastern court. Every clue is on a reachable ground-level stand.
 const floor=Array.from({length:16},(_,i)=>{const a=i*Math.PI/8;return[Math.cos(a)*150,.035,Math.sin(a)*150];});face(floor,palette.floor||'#929180',4);
 path([70,50],[0,24],4);for(const side of[-1,1])for(const zoff of[-1,1])box(70+side*12,.45,50+zoff*10,.6,.45,.6,stone,0,true);
 if(cfg.kind==='entry'){column(-12,-20,24,2);column(12,-20,18,2);flag(-13,3,8);}
 else if(cfg.kind==='beacon'){column(0,-35,68,4);ring(0,65,-35,10,5,.6,metal);box(0,69,-35,2,1.2,2,cloth,7);house(-28,-7,6,6);}
 else if(cfg.kind==='crossing'){motif(0,-55,.75);for(let i=-2;i<=2;i++)flag(-42,-24+i*10,4);}
 else if(cfg.kind==='village'){house(-28,-20);house(27,-27);house(-70,-45,6,5);house(62,-68,6,5);flag(-36,-10,11);ring(27,13,-27,4,4,.35,metal);}
 else if(cfg.kind==='center'){motif(0,-45,1.4);flag(-36,1,8);}
 else if(cfg.kind==='refuge'){house(0,-25,9,7);for(let i=0;i<5;i++)box(-25+i*4,.7,-24,1.3,.7,1.2,wood,1,true);flag(12,-18,7);}
 else if(cfg.kind==='final'){column(0,-23,25,1.4);ring(0,27,-23,4,4,.4,metal);box(0,28,-23,.8,.8,.8,cloth,7);}
 for(const [i,p]of cfg.points.entries()){
  const [px,pz]=p.offset;path([0,24],[px,pz+4],2.6);box(px,1,pz-1.5,1.1,.12,.65,wood,1,true);box(px,.5,pz-1.5,.12,.5,.12,wood,1);box(px,1.15,pz-1.45,.29,.025,.21,paper,5);flag(px-3,pz-3,4.5);
  points.push({...p,x:x+px,y:y+1.16,z:z+pz,radiusM:2});
 }
 if(theme==='forest'||theme==='cloud')for(let i=0;i<8;i++){const a=i*Math.PI/4,tx=Math.cos(a)*118,tz=-20+Math.sin(a)*95;if(Math.hypot(tx-70,tz-50)<40)continue;tree(tx,tz,19+i%3*3);}
 return{faces,colliders,points,center:{x,z},radiusM:area.exploration?.radiusM||210,speedMps:3.6,areaId:area.id};
}

export function buildRegionScenery(pkg,heightAt){
 const theme=pkg.fieldLayout.storyAreas[0]?.scene?.theme;if(!['forest','cloud'].includes(theme))return[];
 const faces=[],seed=pkg.fieldLayout.terrainSeed,field=pkg.fieldLayout.fieldSizeKm*1000,areas=pkg.fieldLayout.storyAreas,grid=theme==='forest'?17:11;
 const emit=(points,color)=>faces.push({points:points.map(([x,y,z])=>({x,y,z})),color,material:0,layer:'story'});
 for(let iz=0;iz<grid;iz++)for(let ix=0;ix<grid;ix++)for(let n=0;n<3;n++){
  const hash=k=>{const t=Math.sin(ix*127.1+iz*311.7+n*37.9+seed*.73+k)*43758.5453;return t-Math.floor(t);},x=(ix+.2+hash(1)*.6)*field/grid+(n-1)*37,z=(iz+.2+hash(2)*.6)*field/grid+(n-1)*43;
  if(areas.some(a=>Math.hypot(x-a.positionKm[0]*1000,z-a.positionKm[1]*1000)<420))continue;
  const y=heightAt(x,z),h=12+hash(3)*7,r=h*.34,green=theme==='forest'?'#365a43':'#749766';
  emit([[x-.5,y,z],[x+.5,y,z],[x+.5,y+h*.65,z],[x-.5,y+h*.65,z]],'#584a35');
  for(let layer=0;layer<2;layer++)for(let k=0;k<7;k++){const a=k*Math.PI*2/7,b=(k+1)*Math.PI*2/7,rr=r*(1-layer*.3);emit([[x+Math.cos(a)*rr,y+h*(.25+layer*.3),z+Math.sin(a)*rr],[x,y+h*(.75+layer*.25),z],[x+Math.cos(b)*rr,y+h*(.25+layer*.3),z+Math.sin(b)*rr]],green);}
 }
 return faces;
}
