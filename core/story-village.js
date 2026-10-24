// Human-scale remains of Elka. All offsets are metres; doors and paths are walkable.
const V=(x,y,z)=>({x,y,z});
export function buildStoryVillage(area,heightAt){
  const faces=[],colliders=[],points=[],x=area.x,z=area.z,y=heightAt(x,z),stone='#9b9788',chalk='#c4bc9c',wood='#594136',roof='#765342',metal='#547c78';
  const face=(p,color,material=0)=>faces.push({points:p.map(q=>V(x+q[0],y+q[1],z+q[2])),color,material,layer:'story'});
  function box(cx,cy,cz,sx,sy,sz,color,material=0,solid=false){const p=[[cx-sx,cy-sy,cz-sz],[cx+sx,cy-sy,cz-sz],[cx+sx,cy+sy,cz-sz],[cx-sx,cy+sy,cz-sz],[cx-sx,cy-sy,cz+sz],[cx+sx,cy-sy,cz+sz],[cx+sx,cy+sy,cz+sz],[cx-sx,cy+sy,cz+sz]];for(const f of[[0,1,2,3],[1,5,6,2],[5,4,7,6],[4,0,3,7],[3,2,6,7],[4,5,1,0]])face(f.map(i=>p[i]),color,material);if(solid)colliders.push({min:{x:x+cx-sx,z:z+cz-sz},max:{x:x+cx+sx,z:z+cz+sz}});}
  const wall=(cx,cz,sx,sz,h,color=stone)=>box(cx,h/2,cz,sx,h/2,sz,color,0,true);
  function house(cx,cz,w,d,h=3.8,ruined=false){
    wall(cx,cz-d,w,.28,h);wall(cx-w,cz,.28,d,h);wall(cx+w,cz,.28,d,h);
    const door=1.15;wall(cx-(w+door)/2,cz+d,(w-door)/2,.28,h);wall(cx+(w+door)/2,cz+d,(w-door)/2,.28,h);box(cx,h-.55,cz+d,door,.55,.28,chalk);
    box(cx-w-.02,1.8,cz-.5,.04,.65,.65,'#252e2d',1);box(cx+w+.02,1.8,cz+.6,.04,.65,.65,'#252e2d',1);
    for(const side of[-1,1])box(cx+side*door,1.25,cz+d+.32,.11,1.25,.15,wood,1);
    box(cx-door-.16,1.1,cz+d+1,.12,1.1,.72,wood,1,true); // the unlocked door rests against the jamb
    const e=.55,peak=h+1.9;
    face([[cx-w-e,h,cz-d-e],[cx+w+e,h,cz-d-e],[cx,peak,cz-d-e]],chalk);
    if(!ruined)face([[cx-w-e,h,cz+d+e],[cx+w+e,h,cz+d+e],[cx,peak,cz+d+e]],chalk);
    face([[cx-w-e,h,cz-d-e],[cx,peak,cz-d-e],[cx,peak,cz+d+e],[cx-w-e,h,cz+d+e]],roof,2);
    if(!ruined)face([[cx,peak,cz-d-e],[cx+w+e,h,cz-d-e],[cx+w+e,h,cz+d+e],[cx,peak,cz+d+e]],roof,2);
    else for(let i=0;i<3;i++)box(cx+1+i*1.4,h+.4,cz,.09,.09,d,wood,1);
    box(cx,h+1.55,cz-d+1,.45,1.05,.45,stone);
    // Low masonry courses and exposed timber make the shell readable at walking distance.
    for(const side of[-1,1]){box(cx+side*(w+.3),.25,cz,.05,.18,d,chalk);box(cx+side*(w+.31),h-.25,cz,.05,.09,d,wood,1);}
  }
  // A dry wind plaza and two branching streets; no building sits on the landing apron.
  face([[-105,.035,-55],[-78,.035,-85],[67,.035,-85],[105,.035,-50],[100,.035,68],[58,.035,95],[-67,.035,92],[-105,.035,40]],'#8b8876',4);
  for(let j=-3;j<=3;j++)for(let i=-4;i<=4;i++)box(i*2.6,.065,24+j*1.75,1.24,.035,.81,'#aaa38c',4);
  face([[23,.08,26],[68,.08,21],[72,.08,28],[24,.08,33]],'#c2b695',4);
  face([[-4,.08,21],[-28,.08,-13],[-22,.08,-17],[3,.08,19]],'#b5a88b',4);
  house(32,5,6,5);house(-20,-23,8,6.5,4.6);
  for(const [cx,cz,w,d,h,b]of[[-63,18,6,5,3.6,false],[-68,-27,7,5,3.4,true],[1,-60,6,5,3.6,true],[60,-48,5,5,3.5,false],[68,71,7,5,3.8,true],[-30,73,6,5,3.6,false]])house(cx,cz,w,d,h,b);
  // Haruna's windcloth: same motif as the cloud-whale banners, left outside an unlocked house.
  box(24.5,5.8,10,.09,5.8,.09,wood,1,true);
  face([[24.5,10.9,10],[27.1,10.4,10.25],[26.6,8.3,10.6],[24.5,8.8,10]],'#b9794d',3);
  face([[24.6,10.2,10.03],[26.8,9.8,10.3],[26.6,9.45,10.38],[24.6,9.85,10.03]],'#d7c69d',3);
  // Letter on a household desk, and the council's meeting table with a copper sound-ring model.
  box(33.4,1.0,7.4,1.0,.1,.7,wood,1,true);for(const a of[-1,1])for(const b of[-1,1])box(33.4+a*.8,.5,7.4+b*.5,.06,.5,.06,wood,1);
  box(33,1.12,7.7,.24,.025,.17,'#e1d2ae',5);box(34,1.2,7.1,.13,.1,.13,metal,6);
  points.push({id:'haruna-letter',label:'机に残された手紙',recordIds:['letter'],x:x+32.8,z:z+7.9,y:y+1.14,radiusM:2});
  box(-20,1.05,-21,2.2,.12,1.1,wood,1,true);for(const a of[-1,1])for(const b of[-1,1])box(-20+a*1.9,.5,-21+b*.8,.09,.5,.09,wood,1);
  for(let i=0;i<5;i++)box(-21+i*.38,1.21,-20.5,.17,.025,.22,'#d1c29e',5);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;box(-20+Math.cos(a)*.5,1.32,-21.4+Math.sin(a)*.5,.085,.12,.085,metal,6);}
  for(const cx of[-23.3,-16.7])for(const cz of[-23,-19]){box(cx,.6,cz,.45,.07,.45,wood,1,true);box(cx,.25,cz,.06,.25,.06,wood,1);}
  points.push({id:'council-record',label:'評議会の記録束',recordIds:['council'],x:x-20,z:z-20.1,y:y+1.25,radiusM:2});
  // A tall, silent wind mast silhouettes the village from the air.
  box(-20,11,-23,.14,11,.14,wood,1);for(let i=0;i<16;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8;face([[-20+Math.cos(a)*3,19+Math.sin(a)*3,-23],[-20+Math.cos(b)*3,19+Math.sin(b)*3,-23],[-20+Math.cos(b)*2.65,19+Math.sin(b)*2.65,-23],[-20+Math.cos(a)*2.65,19+Math.sin(a)*2.65,-23]],metal,6);}
  // Bone harbour bollards, slack mooring ropes, empty cargo and an abandoned well.
  for(const cx of[55,88])for(const cz of[12,48]){box(cx,1.15,cz,.35,1.15,.35,chalk,0,true);box(cx,2.3,cz,.7,.15,.7,chalk);}
  for(let i=0;i<8;i++){const a=i*Math.PI/4,b=(i+1)*Math.PI/4;face([[Math.cos(a)*2,.2,Math.sin(a)*2],[Math.cos(b)*2,.2,Math.sin(b)*2],[Math.cos(b)*2,1.05,Math.sin(b)*2],[Math.cos(a)*2,1.05,Math.sin(a)*2]],stone);}
  colliders.push({min:{x:x-2,z:z-2},max:{x:x+2,z:z+2}});
  for(let i=0;i<5;i++){box(51+i*1.8,.6,-8+(i%2)*1.7,.65,.6,.6,wood,1,true);box(51+i*1.8,.95,-8+(i%2)*1.7,.69,.06,.65,'#837154',1);}
  for(let i=0;i<18;i++){const px=-90+(i*47%180),pz=-72+(i*37%155);if(Math.hypot(px-70,pz-30)<20)continue;box(px,.18,pz,.25+(i%3)*.15,.18,.2,stone,0,true);}

  // Salvaged ribs form a wind shelter above the old loading court.
  for(let rib=0;rib<3;rib++){const zz=54+rib*6,pts=[];for(let j=0;j<=24;j++){const a=j*Math.PI/24;pts.push([Math.cos(a)*16,Math.sin(a)*17,zz]);}for(let j=0;j<24;j++){const a=pts[j],b=pts[j+1],t=j*Math.PI/24,u=(j+1)*Math.PI/24,r=.5+.18*Math.sin(t);for(let k=0;k<8;k++){const q=k*Math.PI/4,qq=(k+1)*Math.PI/4,offset=(p,t,q)=>[p[0]+Math.cos(t)*Math.cos(q)*r,p[1]+Math.sin(t)*Math.cos(q)*r,p[2]+Math.sin(q)*r];face([offset(a,t,q),offset(a,t,qq),offset(b,u,qq),offset(b,u,q)],chalk);}}for(const side of[-1,1])colliders.push({min:{x:x+side*16-.75,z:z+zz-.75},max:{x:x+side*16+.75,z:z+zz+.75}});}
  return{faces,colliders,points,center:{x,z},radiusM:145,speedMps:3.2};
}
export function nearestStoryPoint(walker,site){if(!walker.active||!site)return null;let best=null,distance=Infinity;for(const p of site.points){const d=Math.hypot(walker.x-p.x,walker.z-p.z);if(d<=p.radiusM&&d<distance){best=p;distance=d}}return best;}
export function canMountDragon(walker,dragon){return !walker.active||Math.hypot(walker.x-dragon.x,walker.z-dragon.z)<=6;}
