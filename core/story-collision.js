// Clip visible bone surfaces to a walker's body band before projecting to the ground.
// A tall sloping face must not block its entire footprint at ankle height.
function clipHeight(points,height,above){
  const result=[];
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],insideA=above?a.y>=height:a.y<=height,insideB=above?b.y>=height:b.y<=height;
    if(insideA)result.push(a);
    if(insideA!==insideB){const t=(height-a.y)/(b.y-a.y);result.push({x:a.x+(b.x-a.x)*t,y:height,z:a.z+(b.z-a.z)*t});}
  }
  return result;
}
export function groundFaceCollider(face,groundY){
  const points=clipHeight(clipHeight(face.points,groundY+.35,true),groundY+1.9,false);
  if(points.length<2)return null;
  const polygon=points.map(p=>({x:p.x,z:p.z}));
  return{min:{x:Math.min(...polygon.map(p=>p.x)),z:Math.min(...polygon.map(p=>p.z))},max:{x:Math.max(...polygon.map(p=>p.x)),z:Math.max(...polygon.map(p=>p.z))},polygon};
}
export function blocksGroundPoint(point,collider,radius=.25){
  const {min,max,polygon}=collider;
  if(point.x<min.x-radius||point.x>max.x+radius||point.z<min.z-radius||point.z>max.z+radius)return false;
  if(!polygon)return true;
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[j],b=polygon[i],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/length)):0;
    if((point.x-a.x-dx*t)**2+(point.z-a.z-dz*t)**2<=radius*radius)return true;
    if((a.z>point.z)!==(b.z>point.z)&&point.x<(b.x-a.x)*(point.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
  }
  return inside;
}
