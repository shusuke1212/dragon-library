const add=(a,b,s=1)=>({x:a.x+b.x*s,y:a.y+b.y*s,z:a.z+b.z*s});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const unit=a=>{const n=Math.hypot(a.x,a.y,a.z)||1;return{x:a.x/n,y:a.y/n,z:a.z/n}};
// Fixed-length two-bone leg, bent forward in the plane of its ankle target.
export function solveLegKnee(hip,ankle,forward,upper=.95,lower=1.30){
  const delta=sub(ankle,hip),actual=Math.hypot(delta.x,delta.y,delta.z),axis=unit(delta);
  const d=Math.max(Math.abs(upper-lower)+1e-6,Math.min(upper+lower-1e-6,actual));
  let bend=sub(forward,add({x:0,y:0,z:0},axis,dot(forward,axis)));
  if(Math.hypot(bend.x,bend.y,bend.z)<1e-6)bend=sub({x:0,y:1,z:0},add({x:0,y:0,z:0},axis,axis.y));
  bend=unit(bend);const along=(upper*upper-lower*lower+d*d)/(2*d),across=Math.sqrt(Math.max(0,upper*upper-along*along));
  return add(add(hip,axis,along),bend,across);
}
// Both feet share a horizontal plane; body pitch/breathing do not tilt them.
export function flatFootPose(flight,planeY,side,rest=0){
  const forward={x:Math.sin(flight.yaw),y:0,z:Math.cos(flight.yaw)},right={x:Math.cos(flight.yaw),y:0,z:-Math.sin(flight.yaw)};
  const at=(f,y,r)=>add(add({x:flight.x,y:planeY+y,z:flight.z},forward,f),right,side*r);
  const spread=.75+rest*.14,angle=side*(.18+rest*.16),toeForward=unit(add(forward,right,Math.tan(angle)));
  const toeRight={x:Math.cos(flight.yaw+angle),y:0,z:-Math.sin(flight.yaw+angle)};
  return{forward:toeForward,right:toeRight,ankle:at(-.56,.34,spread),toe:at(-.22,.10,spread),pad:at(-.20,.09,spread),heelToe:at(-.43,.055,spread+.12),outerToe:at(.25,.055,spread+.12)};
}
