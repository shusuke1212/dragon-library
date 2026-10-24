import{groundRestPose}from'./rest-pose.js?v=118';
// Seat-mounted eye position uses the same body basis as the companion mesh.
export function riderCameraPose(flight,landing,behavior,profile,view={yaw:0,height:0}){
  const unit=(a,f)=>{const n=Math.hypot(...a);return n>.0001?a.map(x=>x/n):f};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const combine=(a,b,x,y)=>a.map((v,i)=>v*x+b[i]*y);
  const supported=flight.acroLoop||flight.hovering||['approaching','settling','descending','landed','waking','takingoff'].includes(landing.phase);
  const forward=supported?[Math.sin(flight.yaw),0,Math.cos(flight.yaw)]:unit([flight.vx,flight.vy,flight.vz],[Math.sin(flight.yaw),0,Math.cos(flight.yaw)]);
  const right=unit([forward[2],0,-forward[0]],[1,0,0]),baseUp=unit(cross(forward,right),[0,1,0]);
  const pose=groundRestPose(flight,landing,behavior,profile),ca=Math.cos(pose.angle),sa=Math.sin(pose.angle),fwd=combine(forward,baseUp,ca,sa),bodyUp=combine(baseUp,forward,ca,-sa),up=combine(bodyUp,right,Math.cos(flight.roll),Math.sin(flight.roll));
  const bodyRight=combine(right,bodyUp,Math.cos(flight.roll),-Math.sin(flight.roll));
  const offset=combine(fwd,up,profile.riderSeatForwardM+.1,profile.riderEyeHeightM??2.12);
  // Look around in the saddle's own frame, including its full bank angle.
  const localYaw=view.yaw||0,localPitch=Math.max(-1.2,Math.min(1.2,-.12+(view.height||0)*.8)),lookForward=combine(fwd,bodyRight,Math.cos(localYaw),Math.sin(localYaw)),direction=unit(combine(lookForward,up,Math.cos(localPitch),Math.sin(localPitch)),fwd),cameraUp=combine(up,lookForward,Math.cos(localPitch),-Math.sin(localPitch));
  const yaw=Math.atan2(direction[0],direction[2]),pitch=Math.atan2(direction[1],Math.hypot(direction[0],direction[2])),levelRight=[Math.cos(yaw),0,-Math.sin(yaw)],levelUp=unit(cross(direction,levelRight),up),dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0),roll=Math.atan2(-dot(cameraUp,levelRight),dot(cameraUp,levelUp));
  return {x:flight.x+offset[0],y:pose.centerY+offset[1],z:flight.z+offset[2],yaw,pitch,roll,mode:'rider'};
}
