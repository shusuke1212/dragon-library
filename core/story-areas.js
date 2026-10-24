import{buildRegionScene}from'./region-scenes.js?v=142';
import{groundFaceCollider}from'./story-collision.js?v=137';
import{buildStoryVillage}from'./story-village.js?v=122';
const S={stone:'#98988c',chalk:'#c6bc9d',bone:'#d0c5a7',shadow:'#a99c80',wood:'#5b4336',copper:'#567f77',cloth:'#a87247',paper:'#d5c8a5'};
export function buildStoryArea(area,heightAt,areas=[]){
  if(area.scene)return buildRegionScene(area,heightAt);
  if(area.id==='village')return buildStoryVillage(area,heightAt);
  const x=area.x,z=area.z,y=heightAt(x,z),faces=[],colliders=[],points=[],routes=[],radiusM=area.exploration?.radiusM||140;
  const face=(p,color=S.stone,material=0)=>faces.push({points:p.map(q=>({x:x+q[0],y:y+q[1],z:z+q[2]})),color,material,layer:'story'});
  const collider=(cx,cz,sx,sz)=>colliders.push({min:{x:x+cx-sx,z:z+cz-sz},max:{x:x+cx+sx,z:z+cz+sz}});
  function box(cx,cy,cz,sx,sy,sz,color=S.stone,material=0,solid=false){const p=[[cx-sx,cy-sy,cz-sz],[cx+sx,cy-sy,cz-sz],[cx+sx,cy+sy,cz-sz],[cx-sx,cy+sy,cz-sz],[cx-sx,cy-sy,cz+sz],[cx+sx,cy-sy,cz+sz],[cx+sx,cy+sy,cz+sz],[cx-sx,cy+sy,cz+sz]];for(const f of[[0,1,2,3],[1,5,6,2],[5,4,7,6],[4,0,3,7],[3,2,6,7],[4,5,1,0]])face(f.map(i=>p[i]),color,material);if(solid)collider(cx,cz,sx,sz);}
  function tube(path,radius,color=S.bone,material=8,sides=10){const rings=path.map((p,i)=>{const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],d=b.map((v,k)=>v-a[k]),len=Math.hypot(...d)||1,n=d.map(v=>v/len),s=Math.abs(n[1])<.9?[n[2],0,-n[0]]:[0,n[2],-n[1]],sl=Math.hypot(...s)||1,u=s.map(v=>v/sl),v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]],r=typeof radius==='function'?radius(i/(path.length-1)):radius;return Array.from({length:sides},(_,j)=>p.map((q,k)=>q+(u[k]*Math.cos(j*2*Math.PI/sides)+v[k]*Math.sin(j*2*Math.PI/sides))*r));});for(let i=0;i<rings.length-1;i++)for(let j=0;j<sides;j++)face([rings[i][j],rings[i][(j+1)%sides],rings[i+1][(j+1)%sides],rings[i+1][j]],color,material);face([...rings[0]].reverse(),color,material);face(rings.at(-1),color,material);}
  function ring(cx,cy,cz,rx,ry,r=.2,color=S.copper){const p=Array.from({length:49},(_,i)=>{const a=i*Math.PI/24;return[cx+Math.cos(a)*rx,cy+Math.sin(a)*ry,cz]});tube(p,r,color,6,8);}
  function pillar(cx,cz,height,r0,r1,color=S.stone,solid=true){const p=Array.from({length:13},(_,i)=>{const a=i*Math.PI/6;return[[cx+Math.cos(a)*r0,0,cz+Math.sin(a)*r0],[cx+Math.cos(a)*r1,height+(i%3-.8)*.35,cz+Math.sin(a)*r1]];});for(let i=0;i<12;i++)face([p[i][0],p[i+1][0],p[i+1][1],p[i][1]],color);face(p.slice(0,12).map(q=>q[1]),color);if(solid)collider(cx,cz,r0,r0);}
  function path(a,b,width=3,color='#b8ac90'){const dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz),rx=dz/d*width/2,rz=-dx/d*width/2;face([[a[0]-rx,.07,a[1]-rz],[b[0]-rx,.07,b[1]-rz],[b[0]+rx,.07,b[1]+rz],[a[0]+rx,.07,a[1]+rz]],color,4);}
  function shelter(cx,cz,w=5,d=4){box(cx,2,cz-d,w,2,.25,S.stone,0,true);box(cx-w,2,cz,.25,2,d,S.stone,0,true);box(cx+w,2,cz,.25,2,d,S.stone,0,true);const door=1.25;box(cx-(w+door)/2,2,cz+d,(w-door)/2,2,.25,S.stone,0,true);box(cx+(w+door)/2,2,cz+d,(w-door)/2,2,.25,S.stone,0,true);box(cx,3.5,cz+d,door,.5,.25,S.chalk);face([[cx-w-.4,4,cz-d-.4],[cx,5.3,cz-d-.4],[cx,5.3,cz+d+.4],[cx-w-.4,4,cz+d+.4]],S.wood,2);face([[cx,5.3,cz-d-.4],[cx+w+.4,4,cz-d-.4],[cx+w+.4,4,cz+d+.4],[cx,5.3,cz+d+.4]],S.wood,2);}
  function desk(cx,cz){box(cx,1,cz,1.25,.1,.65,S.wood,1,true);for(const dx of[-1,1])for(const dz of[-.5,.5])box(cx+dx,.48,cz+dz,.065,.48,.065,S.wood,1);box(cx-.2,1.13,cz,.23,.025,.17,S.paper,5);}
  function point(id,label,cx,cz,recordIds=[],observation=null,py=1.2){points.push({id,label,x:x+cx,z:z+cz,y:y+py,radiusM:2,recordIds,observation});}
  function plaque(cx,cz,h=1.65){box(cx,h/2,cz,1,h/2,.15,S.wood,1,true);for(let i=0;i<6;i++)box(cx-.05,h-.25-i*.16,cz+.155,.72-(i%2)*.16,.015,.01,S.paper,5);}
  function flag(cx,cz,height=8){box(cx,height/2,cz,.07,height/2,.07,S.wood,1,true);face([[cx,height-.2,cz],[cx+2,height-.4,cz+.1],[cx+1.65,height-2.7,cz+.3],[cx,height-2.1,cz]],S.cloth,3);}
  function apron(cx,cz){for(const a of[-1,1])for(const b of[-1,1])pillar(cx+a*13,cz+b*10,1.25,.25,.17,S.chalk);}
  function rubble(cx,cz,count=12){for(let i=0;i<count;i++){const a=i*2.399,r=2+(i%5)*1.25;box(cx+Math.cos(a)*r,.2+(i%3)*.12,cz+Math.sin(a)*r,.25+(i%3)*.22,.2+(i%3)*.12,.35+(i%2)*.16,S.stone,0,true);}}
  function terrace(r){const p=Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,rr=r*(.86+(i%3)*.05);return[Math.cos(a)*rr,.03,Math.sin(a)*rr]});face(p,'#8e8b79',4);}
  if(area.id==='entry'){
    terrace(82);apron(42,30);path([42,30],[0,15],4);path([0,15],[0,-60],7);
    // Two wind-cut gate pylons, a broken lintel and a slack closing chain.
    pillar(-15,0,30,2.5,1.25);pillar(15,0,25,2.5,1.2);
    tube([[-15,29,0],[-5,28.5,0],[0,27.8,0]],.9,S.chalk);tube([[15,24,0],[8,24.5,0]],.9,S.chalk);
    tube([[-15,4,0],[-8,2.8,1.1],[0,2.1,1.6],[8,2.7,1.1],[15,4,0]],.11,S.copper,6,6);
    shelter(-32,19,4,3.5);plaque(-5,12);flag(-33,23,7);rubble(14,-7,9);
    point('closed-route','封鎖札の追記',-5,13.4,[],{type:'航路の痕跡',text:'航路7-Bは六十七年前に閉鎖された。札の端に、合図鐘を鳴らさず観測塔へ進むよう追記されている。\n門を越えても、人の返事はない。風の中に途切れた信号だけが残る。'});
    points.at(-1).clue='欠けた輪を頂く塔を探そう。塔の橙色の風布の下に、観測士の記録室がある。';
    points.at(-1).lookTargetId='tower';
    routes.push([42,30],[8,18],[-5,13.4]);
  }else if(area.id==='tower'){
    terrace(100);apron(65,42);path([65,42],[23,17],4);path([23,17],[-20,20],3);
    // Open octagonal tower shell: broken high walls, no inaccessible record upstairs.
    for(let i=0;i<8;i++){const a=i*Math.PI/4,b=(i+1)*Math.PI/4,h=58+(i%3)*8,ra=11;const p=[Math.sin(a)*ra,Math.cos(a)*ra],q=[Math.sin(b)*ra,Math.cos(b)*ra];if(i!==0&&i!==7){face([[p[0],0,p[1]],[q[0],0,q[1]],[q[0],h,q[1]],[p[0],h+4,p[1]]],S.stone);tube([[p[0],0,p[1]],[p[0]*.95,h+4,p[1]*.95]],.5,S.chalk);const cx=(p[0]+q[0])/2,cz=(p[1]+q[1])/2;collider(cx,cz,Math.abs(p[0]-q[0])/2+.3,Math.abs(p[1]-q[1])/2+.3);}}
    ring(0,61,0,14,7,.65);tube([[0,67,0],[3,80,-2],[11,91,-8]],.3,S.copper,6);
    // Fallen observation crown; broken ribs still surround a lens and a hand-cranked receiver.
    for(let i=0;i<6;i++){const a=i*Math.PI/3;tube([[37+Math.cos(a)*9,0,-29+Math.sin(a)*9],[39+Math.cos(a)*6,9,-29+Math.sin(a)*6]],.32,S.copper,6);}
    ring(38,4,-29,8,4,.5);rubble(28,-24,20);shelter(23,8,5,4);desk(23,6.5);ring(26,1.4,5,1.15,1.15,.1);box(25.5,.9,5,.7,.12,.7,S.copper,6,true);
    plaque(-20,18,2.05);flag(-25,20,9);
    // The landing court points into the site; a sighting stand points out into the world.
    path([65,42],[52,48],3);path([23,17],[55,8],3);
    plaque(52,47,1.6);
    point('tower-arrival','着陸場の案内板',52,48.4,[],{type:'足場の痕跡',text:'観測台 ― 東側の銅の照準。\n記録室 ― 橙色の風布の下。\n\n案内板の文字は削れ、鐘の紐だけが切り取られている。風布の付いた小屋の扉は開いている。'});
    points.at(-1).clue='橙色の風布の下に開いた扉がある。まずは、観測士が何を残したのか確かめよう。';
    const ribs=areas.find(a=>a.id==='ribs'),bearing=ribs?Math.atan2(ribs.x-x,ribs.z-z):Math.PI/2,dx=Math.sin(bearing),dz=Math.cos(bearing),rx=Math.cos(bearing),rz=-Math.sin(bearing);
    box(55,.75,8,.28,.75,.28,S.stone,0,true);
    box(55,.9,8.6,1.3,.06,.4,S.wood,1);
    for(let i=0;i<7;i++){const cx=54+i*.32;face([[cx-.12,.965,8.78],[cx,.965,8.48],[cx+.12,.965,8.78],[cx+.075,.965,8.78],[cx,.965,8.56],[cx-.075,.965,8.78]],S.paper,5);}
    tube([[55-dx*1.6,1.65,8-dz*1.6],[55+dx*2.4,1.65,8+dz*2.4]],.14,S.copper,6,8);
    for(const along of[-1.3,2]){const cx=55+dx*along,cz=8+dz*along;for(let i=0;i<16;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8;face([[cx+rx*Math.cos(a)*.45,1.65+Math.sin(a)*.45,cz+rz*Math.cos(a)*.45],[cx+rx*Math.cos(b)*.45,1.65+Math.sin(b)*.45,cz+rz*Math.cos(b)*.45],[cx+rx*Math.cos(b)*.37,1.65+Math.sin(b)*.37,cz+rz*Math.cos(b)*.37],[cx+rx*Math.cos(a)*.37,1.65+Math.sin(a)*.37,cz+rz*Math.cos(a)*.37]],S.copper,6);}}
    point('tower-sighting','欠けた銅の照準',55,9.5,[],{type:'観測台の眺め',text:'照準は東寄りの谷へ向いたまま、錆で動かなくなっている。\n台座には七つの山形が刻まれ、最後の一つだけ長い。\n\n尾根が重なり、この高さから谷底は見通せない。照準の根元には「尾根を越え、七つの白い門を探す」と追記されている。'});
    points.at(-1).clue='東寄りの谷、七つの白いアーチ。相棒に乗り、照準の先の尾根より高く上がってから谷を見下ろそう。';
    points.at(-1).lookTargetId='ribs';
    point('route-warning','掲示板の航路追記',-20,19.4,['route-warning']);point('tower-log','観測士の机',22.8,7,['tower-log']);
    routes.push([65,42],[42,30],[23,17],[23,10],[22.8,8],[-20,21],[-20,19.4]);
  }else if(area.id==='ribs'){
    terrace(205);apron(-115,-145);path([-115,-145],[-45,-145],4);path([-45,-122],[-44,-70],3);
    // Seven genuinely thick arches, open for flight. Vertebrae follow the fallen spine.
    for(let rib=0;rib<7;rib++){const zz=(rib-3)*42,rx=83+(3-Math.abs(rib-3))*4,ry=112+(3-Math.abs(rib-3))*8,curve=Array.from({length:37},(_,j)=>{const a=j*Math.PI/36;return[Math.cos(a)*rx,Math.sin(a)*ry,zz+Math.sin(a)*5]});tube(curve,t=>2.2+1.2*Math.sin(t*Math.PI)**2,S.bone,8,10);collider(-rx,zz,3.5,3.5);collider(rx,zz,3.5,3.5);pillar(104,zz,4,3,2,S.shadow);}
    shelter(-45,-137,5,4);desk(-45,-138.5);box(-43.5,1.3,-139,.22,.2,.22,S.copper,6);rubble(-25,-143,8);
    // Weathered cloth depicts seven backs; only the leading figure bears a gold ring.
    const clothZ=-64;box(-45,2.8,clothZ,4.6,2.8,.25,S.stone,0,true);face([[-49,5.2,clothZ+.27],[-41,5.2,clothZ+.27],[-41.4,1.4,clothZ+.3],[-48.7,1.1,clothZ+.3]],S.cloth,3);
    for(let i=0;i<7;i++){const cx=-48.3+i*1.03;tube([[cx-.36,2.1,clothZ+.33],[cx-.25,3.25,clothZ+.35],[cx+.08,3.52,clothZ+.35],[cx+.36,2.4,clothZ+.35]],.105,S.bone,8,7);if(i===0)ring(cx+.06,3.4,clothZ+.42,.28,.32,.045,'#b69554');}
    for(let i=0;i<4;i++)flag(-50,-118+i*12,3.2);
    point('wind-banner','残された壁画と風布',-45,-62.65,['wind-banner'],null,2.2);point('field-note','調査小屋の観察記録',-45.2,-138,['field-note']);flag(-54,-132,9);
    routes.push([-115,-145],[-45,-145],[-45,-126],[-45,-135],[-45,-126],[-45,-75],[-45,-62.65]);
  }else if(area.id==='skull'){
    terrace(155);apron(100,65);path([100,65],[35,82],4);path([35,82],[5,108],3);path([5,108],[-58,90],3);path([-58,90],[-58,77],3);
    // Perforated cranial shell, with large eye sockets and an open nasal passage.
    const lat=22,lon=40,shell=(i,j)=>{const p=.10+i*(Math.PI-.18)/lat,a=j*2*Math.PI/lon;return[Math.sin(p)*Math.sin(a)*64,Math.max(.7,36+Math.cos(p)*43),-22+Math.sin(p)*Math.cos(a)*58];};
    for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){const a=(j+.5)*2*Math.PI/lon,p=.10+(i+.5)*(Math.PI-.18)/lat,eye=(Math.abs(a-.85)<.40||Math.abs(a-(2*Math.PI-.85))<.40)&&p>1.05&&p<1.82,nose=(a<.36||a>2*Math.PI-.36)&&p>1.27&&p<2.6,breakage=j>17&&j<23&&i>15;if(eye||nose||breakage)continue;face([shell(i,j),shell(i,j+1),shell(i+1,j+1),shell(i+1,j)],S.bone,8);faces.at(-1).normals=faces.at(-1).points.map(q=>{const n=[(q.x-x)/(64*64),(q.y-y-36)/(43*43),(q.z-z+22)/(58*58)],d=Math.hypot(...n);return n.map(v=>v/d);});}
    // The muzzle tapers into jointed nasal plates; lower jaws rest on the valley floor.
    for(const side of[-1,1]){tube([[side*54,7,-45],[side*59,4,-2],[side*46,2.3,44],[side*25,1.7,83],[side*12,2,92]],t=>4.8-2.3*t,S.bone,8,12);for(let i=0;i<8;i++){const zz=14+i*9,xx=side*(50-i*4.3);tube([[xx,4,zz],[xx-side*1.4,7.4,zz+.3],[xx-side*2,9.2,zz+.6]],t=>1.6*(1-t)+.12,S.shadow,8,8);}}
    tube([[0,72,-40],[0,68,0],[0,44,31],[0,34,63],[0,27,89]],t=>5.2-3.1*t,S.bone,8,12);
    for(const side of[-1,1])tube([[side*34,39,22],[side*23,33,58],[side*13,27,89]],2.8,S.bone,8,10);
    // The crown is broken, not a functioning cage. Its last fragments lie beside the jaw.
    ring(-58,3.0,74,7,2.4,.42,'#998257');tube([[-65,2.3,75],[-66,5,74],[-69,7,70]],.35,S.copper,6);box(-58,.3,74,1.8,.3,1.1,S.copper,6,true);rubble(58,38,15);
    point('crown-fragment','鳴風冠の残片',-58,76,[],{type:'装置と骨の痕跡',text:'金色の輪は、途中で折れている。骨のそばには銅の共鳴管が残り、取り付け具だけが同じ間隔で並んでいる。\n巨大な頭蓋を前にしても、イオラが最後に何を望んだのかは分からない。装置と骨の距離だけが、今もここに残っている。'});
    points.at(-1).clue='頭蓋の先の高台に、淡く光る風標が立っている。相棒に乗り、尾根の向こうで同じ光を探そう。';
    points.at(-1).lookTargetId='memorial';
    flag(-64,88,4);
    routes.push([100,65],[75,85],[35,82],[5,108],[-58,90],[-58,77]);
  }else if(area.id==='memorial'){
    terrace(83);apron(48,32);path([48,32],[0,8],3.2);
    // A restrained memorial. No triumphant statue, only a still-turning wind vane.
    pillar(0,0,30,2.1,.55,'#85877e');box(0,31,0,.13,2,.13,S.copper,6);box(0,32.6,.2,.34,.48,.34,'#adc9aa',7);ring(0,33,0,2.5,1.8,.14);tube([[-5,32.5,0],[5,32.5,0]],.12,S.copper,6);
    box(0,1,5,2.7,1,.65,S.stone,0,true);for(let row=0;row<9;row++)box(-.1,1.72-row*.13,5.66,1.8-(row%3)*.3,.017,.01,'#4e5651',5);
    const skull=areas.find(a=>a.id==='skull'),angle=skull?Math.atan2(skull.x-x,skull.z-z):Math.PI,dx=Math.sin(angle),dz=Math.cos(angle);
    for(let i=0;i<11;i++){const a=.3+i*.48,cx=Math.sin(a)*36,cz=Math.cos(a)*36;pillar(cx,cz,1.4+(i%3)*.28,.42,.24,S.shadow);tube([[cx,1.9,cz],[cx+dx*1.2,1.9,cz+dz*1.2]],.08,S.copper,6,6);}
    flag(-9,-9,5.5);point('memorial-inscription','風標の碑文',0,6.1,['memorial'],null,1.55);
    routes.push([48,32],[18,20],[0,6.1]);
  }
  for(const f of faces){if(![6,8].includes(f.material))continue;const hit=groundFaceCollider(f,y);if(hit)colliders.push(hit);}
  return{faces,colliders,points,center:{x,z},radiusM,speedMps:3.2,routes,areaId:area.id};
}
